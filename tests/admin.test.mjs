import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import sharp from 'sharp';
import {request as httpRequest} from 'node:http';
const origin='http://127.0.0.1:43129',password='integration-test-password-7f21';
let server,folder,cookie='',logs='';
const seed=JSON.parse(await readFile(new URL('../public/app-content.json',import.meta.url),'utf8'));
async function start(){
 server=spawn(process.execPath,['.output/server/index.mjs'],{cwd:resolve('.'),env:{...process.env,PORT:'43129',HOST:'127.0.0.1',NUXT_DATA_DIR:folder,NUXT_ADMIN_PASSWORD:password,NUXT_ADMIN_HOST:''},stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',chunk=>logs+=chunk);server.stderr.on('data',chunk=>logs+=chunk);
 for(let i=0;i<100;i++){try{const r=await fetch(origin+'/api/public/host');if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}
 throw new Error('Server failed: '+logs);
}
async function stop(){if(server&&server.exitCode===null){server.kill();await once(server,'exit')}}
async function request(path,{method='GET',body,auth=true,headers={}}={}){
 const payload=body?JSON.stringify(body):undefined;
 return await new Promise((resolve,reject)=>{const req=httpRequest(origin+path,{method,headers:{...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{}),...(method!=='GET'?{Origin:origin}:{}),...(auth&&cookie?{Cookie:cookie}:{}),...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const raw=Buffer.concat(chunks).toString();let data;try{data=JSON.parse(raw)}catch{data=raw}const h=new Headers();for(const [key,value]of Object.entries(res.headers))if(value)h.set(key,Array.isArray(value)?value.join(','):value);resolve({status:res.statusCode,data,headers:h})})});req.on('error',reject);req.end(payload)});
}
before(async()=>{folder=await mkdtemp(join(tmpdir(),'site-studio-test-'));await start()});
after(async()=>{await stop();await rm(folder,{recursive:true,force:true})});
test('Admin workflow, authorization, isolation, uploads, domains and persistence',async t=>{
 let site,copy,asset;
 await t.test('private endpoints require authentication and same-origin login',async()=>{
  assert.equal((await request('/api/admin/sites')).status,401);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{password},headers:{Origin:'https://foreign.example'}})).status,403);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{password:'wrong'}})).status,401);
  const r=await request('/api/admin/login',{method:'POST',body:{password}});assert.equal(r.status,200,JSON.stringify(r.data));cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/i);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/i);
 });
 await t.test('create draft, reject duplicate slug and hide unpublished content',async()=>{
  const body={title:'Test site',slug:'test-app',content:seed};const r=await request('/api/admin/sites',{method:'POST',body});assert.equal(r.status,200,JSON.stringify(r.data));site=r.data;
  assert.equal((await request('/api/admin/sites',{method:'POST',body})).status,409);
  assert.equal((await request('/api/public/sites/test-app',{auth:false})).status,404);
  assert.equal((await request('/api/admin/sites',{method:'POST',body,headers:{Origin:'https://foreign.example'}})).status,403);
  assert.equal((await request('/api/admin/sites',{method:'POST',body:{payload:'x'.repeat(1024*1024+1)}})).status,413);
 });
 await t.test('validate content and prevent stale writes',async()=>{
  const invalid={...site,content:{...seed,playStoreUrl:'https://evil.example'}};
  assert.equal((await request('/api/admin/sites/'+site.id,{method:'PUT',body:invalid})).status,400);
  const saved=await request('/api/admin/sites/'+site.id,{method:'PUT',body:{...site,content:{...seed,name:'First version'}}});assert.equal(saved.status,200,JSON.stringify(saved.data));
  assert.equal((await request('/api/admin/sites/'+site.id,{method:'PUT',body:site})).status,409);site=saved.data;
 });
 await t.test('publish snapshot, keep draft changes private, duplicate independently',async()=>{
  const r=await request('/api/admin/sites/'+site.id+'/publish',{method:'POST',body:{version:site.version}});assert.equal(r.status,200);site=r.data;
  assert.equal((await request('/api/public/sites/test-app',{auth:false})).data.content.name,'First version');
  site=(await request('/api/admin/sites/'+site.id,{method:'PUT',body:{...site,content:{...site.content,name:'Unpublished draft'}}})).data;
  assert.equal((await request('/api/public/sites/test-app',{auth:false})).data.content.name,'First version');
  copy=(await request('/api/admin/sites/'+site.id+'/duplicate',{method:'POST'})).data;assert.equal(copy.status,'draft');assert.equal(copy.content.name,'Unpublished draft');assert.notEqual(copy.slug,site.slug);assert.deepEqual(copy.domains,[]);
 });
 await t.test('uploads are re-encoded, served, and persist in site content',async()=>{
  const image=await sharp({create:{width:24,height:24,channels:3,background:'#4285f4'}}).png().toBuffer();
  const form=new FormData();form.append('file',new Blob([image],{type:'image/png'}),'test.png');
  const r=await fetch(origin+'/api/admin/upload',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:form});assert.equal(r.status,200);asset=(await r.json()).url;
  const downloaded=await fetch(origin+asset);assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('content-type'),'image/webp');
  const bad=new FormData();bad.append('file',new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'],{type:'image/svg+xml'}),'bad.svg');
  assert.equal((await fetch(origin+'/api/admin/upload',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:bad})).status,400);
  site=(await request('/api/admin/sites/'+site.id,{method:'PUT',body:{...site,content:{...site.content,icon:asset,screenshots:[],reviews:[]}}})).data;
  assert.equal(site.content.screenshots.length,0);
 });
 await t.test('domain uniqueness, pending DNS, tenant isolation and TLS allowlist',async()=>{
  let r=await request('/api/admin/sites/'+site.id+'/domains',{method:'POST',body:{hostname:'demo.example.com'}});assert.equal(r.status,200);assert.equal(r.data.domains[0].verified,0);
  assert.equal((await request('/api/admin/sites/'+copy.id+'/domains',{method:'POST',body:{hostname:'demo.example.com'}})).status,409);
  assert.equal((await request('/api/tls/allow?domain=demo.example.com',{auth:false})).status,403);
  assert.equal((await request('/api/admin/sites/'+site.id+'/domains/verify',{method:'POST',body:{hostname:'demo.example.com'}})).status,409);
  const sql=new DatabaseSync(join(folder,'sites.sqlite'));sql.prepare('UPDATE domains SET verified=1 WHERE hostname=?').run('demo.example.com');sql.close();
  assert.equal((await request('/api/tls/allow?domain=demo.example.com',{auth:false})).status,200);
  assert.equal((await request('/api/public/host',{headers:{Host:'demo.example.com'},auth:false})).data.content.name,'First version');
  assert.equal((await request('/api/public/host',{headers:{Host:'unknown.example.com'},auth:false})).status,404);
  assert.equal((await request('/api/admin/sites',{headers:{Host:'demo.example.com'}})).status,404);
  const page=await request('/',{headers:{Host:'demo.example.com'},auth:false});assert.equal(page.status,200);assert.match(page.data,/First version/);
 });
 await t.test('database, sessions and uploaded images survive restart',async()=>{
  await stop();await start();const r=await request('/api/admin/sites/'+site.id);assert.equal(r.status,200);assert.equal(r.data.content.icon,asset);assert.equal((await fetch(origin+asset)).status,200);
 });
 await t.test('unpublish and archive revoke public access and TLS authorization',async()=>{
  const r=await request('/api/admin/sites/'+site.id+'/unpublish',{method:'POST',body:{version:site.version}});assert.equal(r.status,200);
  assert.equal((await request('/api/public/sites/test-app',{auth:false})).status,404);assert.equal((await request('/api/tls/allow?domain=demo.example.com',{auth:false})).status,403);
  assert.equal((await request('/api/admin/sites/'+site.id,{method:'DELETE'})).status,200);assert.equal((await request('/api/admin/sites/'+site.id)).status,404);
  await request('/api/admin/logout',{method:'POST'});assert.equal((await request('/api/admin/sites')).status,401);
  assert.equal((await request('/api/admin/upload',{method:'POST',body:{file:'no'},auth:false})).status,401);
 });
});
