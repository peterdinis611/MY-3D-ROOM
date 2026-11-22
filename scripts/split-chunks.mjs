#!/usr/bin/env node
/**
 * Rozdelí src/app.js na src/chunks/*.js (export default string)
 * a zostaví importy v src/main.js.
 * Použitie: node scripts/split-chunks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appPath = path.join(root, 'src/app.js');
const chunksDir = path.join(root, 'src/chunks');
const mainPath = path.join(root, 'src/main.js');

const app = fs.readFileSync(appPath, 'utf8');
const parts = app.split(/\n\/\* (\d{2}-[^*]+) \*\/\n/).filter(Boolean);

const chunks = [];
if (!parts[0]?.startsWith('01-')) {
  const preamble = parts.shift()?.trim();
  if (preamble) chunks.push({ name: '00-preamble', body: preamble });
}
for (let i = 0; i < parts.length; i += 2) {
  chunks.push({ name: parts[i], body: (parts[i + 1] || '').trim() });
}

fs.mkdirSync(chunksDir, { recursive: true });
for (const f of fs.readdirSync(chunksDir)) {
  if (f.endsWith('.js')) fs.unlinkSync(path.join(chunksDir, f));
}

const imports = [];
const list = [];
for (const { name, body } of chunks) {
  const file = `${name}.js`;
  fs.writeFileSync(
    path.join(chunksDir, file),
  `/** ${name} */\nexport default ${JSON.stringify(body)};\n`,
  );
  const id = name.replace(/[^a-zA-Z0-9]/g, '_');
  imports.push(`import _${id} from './chunks/${file}';`);
  list.push(`_${id}`);
}

const main = `import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

window.addEventListener('error', (e) => {
  const h = document.getElementById('hint');
  if (h) h.textContent = 'Chyba: ' + (e.error?.message || e.message);
  console.error(e.error || e);
});
window.addEventListener('unhandledrejection', (e) => {
  const h = document.getElementById('hint');
  if (h) h.textContent = 'Chyba: ' + (e.reason?.message || e.reason);
  console.error(e.reason);
});

${imports.join('\n')}

const __sources = [${list.join(', ')}];
const __code = __sources.join('\\n\\n');
const __run = new Function('THREE', 'OrbitControls', __code);
__run(THREE, OrbitControls);
`;

fs.writeFileSync(mainPath, main);
console.log(`OK: ${chunks.length} chunks → src/chunks/`);