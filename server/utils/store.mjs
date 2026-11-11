import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
let connection;
export function dataDir() { return resolve(process.env.NUXT_DATA_DIR || './data'); }
export function db() {
  if (connection) return connection;
  mkdirSync(dataDir(), {recursive:true});
  connection = new DatabaseSync(resolve(dataDir(), 'sites.sqlite'));
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS sites (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, draft TEXT NOT NULL, published TEXT, updated_at TEXT NOT NULL, published_at TEXT, version INTEGER NOT NULL DEFAULT 1, archived INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS domains (hostname TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES sites(id), verified INTEGER NOT NULL DEFAULT 0, verified_at TEXT);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, password_fingerprint TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (filename TEXT PRIMARY KEY, created_at TEXT NOT NULL);
  `);
  return connection;
}
const text = (max=200) => z.string().trim().max(max);
const image = z.string().max(2000).refine(v => /^\/(assets|media)\/[a-zA-Z0-9._-]+$/.test(v) || /^https:\/\/[^\s]+$/.test(v), 'Укажите HTTPS-адрес изображения или загрузите файл');
const rating = z.string().regex(/^[0-5]([.,]\d)?$/, 'Рейтинг от 0 до 5').refine(v=>Number(v.replace(',','.'))<=5);
export const contentSchema = z.object({
  playStoreUrl: z.url().refine(v=>{ const u=new URL(v); return u.protocol==='https:' && u.hostname==='play.google.com' && u.pathname==='/store/apps/details' && !!u.searchParams.get('id') }, 'Нужна ссылка на приложение в Google Play'),
  icon:image, name:text(100).min(1), developer:text().min(1), notice:text(), rating, reviewCount:text(60), downloads:text(60), age:text(20),
  screenshots:z.array(z.object({src:image,alt:text()})).max(30),
  description:text(20000), updatedAt:text(80), category:text(80), ranking:text(250),
  ratingDistribution:z.array(z.number().min(0).max(100)).length(5),
  reviews:z.array(z.object({id:text(100).min(1),name:text(160).min(1),avatar:image,rating:z.number().int().min(0).max(5),date:text(100),text:text(10000),helpfulCount:text(50)})).max(100).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'ID отзывов должны быть уникальными')
});
export const siteSchema = z.object({title:text(100).min(1),slug:z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/, 'Адрес: латинские буквы, цифры и дефис'),content:contentSchema,version:z.number().int().optional()});
export function parse(schema, data) { const parsed=schema.safeParse(data); if(!parsed.success){ const error=new Error(parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')); error.statusCode=400; throw error; } return parsed.data; }
export function getSite(id) { return db().prepare('SELECT * FROM sites WHERE id=? AND archived=0').get(id); }
export function viewSite(row) { return {id:row.id,title:row.title,slug:row.slug,content:JSON.parse(row.draft),version:row.version,updatedAt:row.updated_at,publishedAt:row.published_at,status:row.published?'published':'draft',hasChanges:!!row.published&&row.draft!==row.published,domains:db().prepare('SELECT hostname,verified,verified_at FROM domains WHERE site_id=?').all(row.id)}; }
export function createSite(input) { const id=randomUUID(); db().prepare('INSERT INTO sites (id,slug,title,draft,updated_at) VALUES (?,?,?,?,?)').run(id,input.slug,input.title,JSON.stringify(input.content),new Date().toISOString()); return viewSite(getSite(id)); }
export function normalizeDomain(value) {
  if(typeof value!=='string') throw Object.assign(new Error('Введите домен без https:// и пути'),{statusCode:400});
  const hostname=value.trim().toLowerCase().replace(/\.$/,'');
  if(hostname.length>253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) throw Object.assign(new Error('Введите домен латиницей без https:// и пути'),{statusCode:400});
  return hostname;
}
