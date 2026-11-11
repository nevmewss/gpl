import { spawnSync } from 'node:child_process';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'generate'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NUXT_APP_BASE_URL: '/gpl/' }
});
if (result.status !== 0) process.exit(result.status || 1);
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await cp(new URL('../.output/public/', import.meta.url), new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/.nojekyll', import.meta.url), '');
console.log('GitHub Pages build ready in docs/. Commit and push docs/ with the source changes.');
