import { db } from '../../../utils/store.mjs'
import { guardHost } from '../../../utils/auth.mjs'
export default defineEventHandler(event=>{
  guardHost(event)
  setHeader(event,'Cache-Control','no-store')
  const row=db().prepare('SELECT published FROM sites WHERE slug=? AND archived=0 AND published IS NOT NULL').get(getRouterParam(event,'slug'))
  if(!row) throw createError({statusCode:404,statusMessage:'Сайт не опубликован'})
  return {content:JSON.parse(row.published as string)}
})
