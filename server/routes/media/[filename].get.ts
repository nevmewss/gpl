import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { dataDir } from '../../utils/store.mjs'
export default defineEventHandler(async event=>{
  const filename=getRouterParam(event,'filename')||''
  if(!/^[0-9a-f-]{36}\.webp$/.test(filename)) throw createError({statusCode:404})
  try {const data=await readFile(resolve(dataDir(),'uploads',filename));setHeader(event,'Content-Type','image/webp');setHeader(event,'X-Content-Type-Options','nosniff');setHeader(event,'Cache-Control','public,max-age=31536000,immutable');return data}
  catch {throw createError({statusCode:404})}
})
