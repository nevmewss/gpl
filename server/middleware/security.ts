import { guardHost } from '../utils/auth.mjs'
export default defineEventHandler(event=>{
  setHeader(event,'X-Content-Type-Options','nosniff')
  setHeader(event,'Referrer-Policy','strict-origin-when-cross-origin')
  if(event.path.startsWith('/admin')||event.path.startsWith('/preview')) {guardHost(event);setHeader(event,'Cache-Control','no-store');setHeader(event,'X-Frame-Options','SAMEORIGIN')}
})
