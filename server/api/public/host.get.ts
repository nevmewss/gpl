import { db } from '../../utils/store.mjs'
import { host,isAdminHost } from '../../utils/auth.mjs'
export default defineEventHandler(event=>{
  setHeader(event,'Cache-Control','no-store')
  if(isAdminHost(event)) return {content:null}
  const row=db().prepare('SELECT s.published FROM sites s JOIN domains d ON d.site_id=s.id WHERE d.hostname=? AND d.verified=1 AND s.archived=0 AND s.published IS NOT NULL').get(host(event))
  if(!row) throw createError({statusCode:404,statusMessage:'Сайт не опубликован'})
  return {content:JSON.parse(row.published as string)}
})
