import { db,normalizeDomain } from '../../utils/store.mjs'
export default defineEventHandler(event=>{
  let domain
  try {domain=normalizeDomain(getQuery(event).domain)} catch {throw createError({statusCode:403})}
  const row=db().prepare('SELECT s.id FROM sites s JOIN domains d ON d.site_id=s.id WHERE d.hostname=? AND d.verified=1 AND s.published IS NOT NULL AND s.archived=0').get(domain)
  if(!row) throw createError({statusCode:403})
  return 'allowed'
})
