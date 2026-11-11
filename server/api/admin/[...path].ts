import { resolve4, resolve6 } from 'node:dns/promises'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { db, dataDir, parse, siteSchema, contentSchema, getSite, viewSite, createSite, normalizeDomain } from '../../utils/store.mjs'
import { requireAdmin, guardHost, guardOrigin, checkPassword, login, logout } from '../../utils/auth.mjs'
import seed from '../../../public/app-content.json'
import { assertBodySize } from '../../utils/body.mjs'

const attempts = new Map<string,{count:number,until:number}>()
export default defineEventHandler(async event => {
  setHeader(event,'Cache-Control','no-store')
  const path=(getRouterParam(event,'path')||'').split('/').filter(Boolean)
  const method=event.method
  if(path[0]==='login' && method==='POST') {
    guardHost(event); guardOrigin(event)
    const ip=getRequestIP(event,{xForwardedFor:false})||'unknown'
    const previous=attempts.get(ip)
    if(previous && previous.until>Date.now() && previous.count>=10) throw createError({statusCode:429,statusMessage:'Слишком много попыток. Повторите через 15 минут.'})
    await assertBodySize(event,4096)
    const body=await readBody(event)
    if(!checkPassword(body?.password)) {
      if(attempts.size>1000) for(const [key,value] of attempts) if(value.until<Date.now()) attempts.delete(key)
      attempts.set(ip,{count:previous&&previous.until>Date.now()?previous.count+1:1,until:Date.now()+15*60*1000})
      throw createError({statusCode:401,statusMessage:'Неверный пароль'})
    }
    attempts.delete(ip); login(event); return {ok:true}
  }
  requireAdmin(event)
  if(path[0]==='session' && method==='GET') return {ok:true,serverIp:process.env.NUXT_SERVER_IP||'',adminHost:process.env.NUXT_ADMIN_HOST||'',template:seed}
  if(path[0]==='logout' && method==='POST') {logout(event); return {ok:true}}
  if(path[0]==='upload' && method==='POST') {
    await assertBodySize(event,11*1024*1024)
    const files=await readMultipartFormData(event)
    const file=files?.find(f=>f.name==='file')
    if(!file || !file.data.length || file.data.length>10*1024*1024) throw createError({statusCode:400,statusMessage:'Загрузите изображение до 10 МБ'})
    let buffer
    try { const image=sharp(file.data,{limitInputPixels:30_000_000,animated:false}); const metadata=await image.metadata();if(!['png','jpeg','webp'].includes(metadata.format||''))throw new Error('Unsupported image');buffer=await image.rotate().resize({width:2000,height:3000,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer() }
    catch {throw createError({statusCode:400,statusMessage:'Не удалось прочитать изображение. Используйте PNG, JPEG или WebP.'})}
    const filename=`${randomUUID()}.webp`
    await mkdir(resolve(dataDir(),'uploads'),{recursive:true}); await writeFile(resolve(dataDir(),'uploads',filename),buffer)
    db().prepare('INSERT INTO uploads VALUES (?,?)').run(filename,new Date().toISOString())
    return {url:`/media/${filename}`}
  }
  if(path[0]!=='sites') throw createError({statusCode:404})
  try {
    if(path.length===1) {
      if(method==='GET') return db().prepare('SELECT * FROM sites WHERE archived=0 ORDER BY updated_at DESC').all().map(viewSite)
      if(method==='POST') {await assertBodySize(event,1024*1024);return createSite(parse(siteSchema,await readBody(event)))}
    }
    const site=getSite(path[1]); if(!site) throw createError({statusCode:404,statusMessage:'Сайт не найден'})
    if(path.length===2) {
      if(method==='GET') return viewSite(site)
      if(method==='PUT') {
        await assertBodySize(event,1024*1024)
        const input=parse(siteSchema,await readBody(event))
        const result=db().prepare('UPDATE sites SET title=?,slug=?,draft=?,updated_at=?,version=version+1 WHERE id=? AND version=?').run(input.title,input.slug,JSON.stringify(input.content),new Date().toISOString(),site.id,input.version||0)
        if(!result.changes) throw createError({statusCode:409,statusMessage:'Сайт изменён в другом окне. Обновите страницу перед сохранением.'})
        return viewSite(getSite(site.id))
      }
      if(method==='DELETE') {
        db().exec('BEGIN'); try {db().prepare('DELETE FROM domains WHERE site_id=?').run(site.id);db().prepare('UPDATE sites SET archived=1,published=NULL,version=version+1 WHERE id=?').run(site.id);db().exec('COMMIT')}catch(e){db().exec('ROLLBACK');throw e}
        return {ok:true}
      }
    }
    if(path[2]==='duplicate'&&method==='POST') return createSite({title:`${site.title} — копия`.slice(0,100),slug:`${site.slug.slice(0,45)}-${randomUUID().slice(0,8)}`,content:JSON.parse(site.draft)})
    if(['publish','unpublish'].includes(path[2])&&method==='POST') {
      await assertBodySize(event,4096); const body=await readBody(event)
      if(body?.version!==site.version) throw createError({statusCode:409,statusMessage:'Сначала сохраните актуальную версию сайта'})
      if(path[2]==='publish') parse(contentSchema,JSON.parse(site.draft))
      db().prepare('UPDATE sites SET published=?,published_at=?,version=version+1 WHERE id=?').run(path[2]==='publish'?site.draft:null,path[2]==='publish'?new Date().toISOString():null,site.id)
      return viewSite(getSite(site.id))
    }
    if(path[2]==='domains') {
      await assertBodySize(event,4096); const body=await readBody(event); const domain=normalizeDomain(body?.hostname)
      if(domain===(process.env.NUXT_ADMIN_HOST||'').toLowerCase()) throw createError({statusCode:400,statusMessage:'Домен админки нельзя привязать к сайту'})
      if(path[3]==='verify' && method==='POST') {
        const existing=db().prepare('SELECT * FROM domains WHERE hostname=? AND site_id=?').get(domain,site.id)
        if(!existing) throw createError({statusCode:404,statusMessage:'Сначала добавьте домен'})
        const expected=process.env.NUXT_SERVER_IP
        if(!expected) throw createError({statusCode:409,statusMessage:'Сервер ещё не подключён. Проверка DNS станет доступна после установки на VPS.'})
        const records=(await Promise.allSettled([resolve4(domain),resolve6(domain)])).flatMap(r=>r.status==='fulfilled'?r.value:[])
        const verified=records.length>0&&records.every(ip=>ip===expected)
        db().prepare('UPDATE domains SET verified=?,verified_at=? WHERE hostname=? AND site_id=?').run(verified?1:0,verified?new Date().toISOString():null,domain,site.id)
        return {verified,records,expected}
      }
      if(method==='POST') {db().prepare('INSERT INTO domains (hostname,site_id) VALUES (?,?)').run(domain,site.id);return viewSite(getSite(site.id))}
      if(method==='DELETE') {db().prepare('DELETE FROM domains WHERE hostname=? AND site_id=?').run(domain,site.id);return viewSite(getSite(site.id))}
    }
    throw createError({statusCode:404})
  } catch(error:any) {
    if(error.message?.includes('UNIQUE constraint')) throw createError({statusCode:409,statusMessage:'Этот адрес или домен уже используется'})
    if(error.statusCode===400) throw createError({statusCode:400,statusMessage:'Проверьте поля',data:{message:error.message}})
    throw error
  }
})
