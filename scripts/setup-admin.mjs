import { randomBytes } from 'node:crypto';
import { existsSync,writeFileSync } from 'node:fs';
if(existsSync('.env')){console.log('.env already exists. Existing configuration was not changed.');process.exit(0)}
writeFileSync('.env',`NUXT_ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\nNUXT_DATA_DIR=./data\nNUXT_ADMIN_HOST=\nNUXT_SERVER_IP=\n`,{mode:0o600,flag:'wx'});
console.log('Admin password saved in local .env (NUXT_ADMIN_PASSWORD). This file is excluded from Git. Run npm run dev and open http://127.0.0.1:3000/admin');
