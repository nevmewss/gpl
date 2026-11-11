import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { getCookie, setCookie, deleteCookie, getHeader, createError, getRequestURL } from 'h3';
import { db } from './store.mjs';
const cookie='site_admin';
export const hash = value => createHash('sha256').update(value).digest('hex');
export function password() { return process.env.NUXT_ADMIN_PASSWORD || ''; }
export function host(event) { return (getHeader(event,'host')||'').split(':')[0].toLowerCase(); }
export function isAdminHost(event) {
  const configured=process.env.NUXT_ADMIN_HOST?.toLowerCase();
  return configured ? host(event)===configured : ['localhost','127.0.0.1','[::1]'].includes(host(event));
}
export function guardHost(event) { if(!isAdminHost(event)) throw createError({statusCode:404,statusMessage:'Not found'}); }
export function guardOrigin(event) {
  const origin=getHeader(event,'origin');
  if(!origin) throw createError({statusCode:403,statusMessage:'Отсутствует Origin'});
  let allowed=false;
  try { const u=new URL(origin); allowed=['http:','https:'].includes(u.protocol) && u.host===getHeader(event,'host'); } catch {}
  if(!allowed) throw createError({statusCode:403,statusMessage:'Недопустимый источник запроса'});
}
export function requireAdmin(event) {
  guardHost(event);
  const token=getCookie(event,cookie);
  const session=token && db().prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(hash(token),Date.now());
  if(!session || !password() || session.password_fingerprint!==hash(password())) throw createError({statusCode:401,statusMessage:'Войдите в админку'});
  if(!['GET','HEAD'].includes(event.method)) guardOrigin(event);
}
export function checkPassword(candidate) {
  const expected=password();
  if(expected.length<12) throw createError({statusCode:503,statusMessage:'Сначала выполните npm run setup:admin'});
  return typeof candidate==='string' && timingSafeEqual(Buffer.from(hash(candidate)),Buffer.from(hash(expected)));
}
export function login(event) {
  db().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  const token=randomBytes(32).toString('hex');
  db().prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),Date.now()+12*60*60*1000,hash(password()));
  const secure=!!process.env.NUXT_ADMIN_HOST || getRequestURL(event).protocol==='https:';
  setCookie(event,cookie,token,{httpOnly:true,sameSite:'strict',secure,path:'/',maxAge:12*60*60});
}
export function logout(event) { const token=getCookie(event,cookie); if(token) db().prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token)); deleteCookie(event,cookie,{path:'/'}); }
