import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, cp, access, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(process.env.NUXT_DATA_DIR||'./data');
const output=resolve('backups',new Date().toISOString().replace(/[:.]/g,'-'));
await access(resolve(root,'sites.sqlite'));
await mkdir(output,{recursive:true});
// Copy files before taking the database snapshot. New uploads during backup may
// be referenced by the snapshot, so copy again afterwards (uploads are immutable).
await cp(resolve(root,'uploads'),resolve(output,'uploads'),{recursive:true}).catch(e=>{if(e.code!=='ENOENT')throw e});
const db=new DatabaseSync(resolve(root,'sites.sqlite'));
await backup(db,resolve(output,'sites.sqlite'));db.close();
await cp(resolve(root,'uploads'),resolve(output,'uploads'),{recursive:true}).catch(e=>{if(e.code!=='ENOENT')throw e});
await writeFile(resolve(output,'restore.txt'),'Stop the application. Replace data/sites.sqlite and data/uploads with this backup. Remove old sites.sqlite-wal and sites.sqlite-shm only while the application is stopped. Start the application. Keep the .env password separately.');
console.log(output);
