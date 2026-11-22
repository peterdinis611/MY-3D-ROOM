#!/usr/bin/env node
/**
 * Rozdelí src/app.js na src/chunks/*.js (export default string).
 * Runtime Vite používa priamo src/app.js (?raw) – chunky sú na prehľadnosť.
 * Použitie: npm run split
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const appPath = path.join(root, 'src/app.js')
const chunksDir = path.join(root, 'src/chunks')

const app = fs.readFileSync(appPath, 'utf8')
const parts = app.split(/\n\/\* (\d{2}-[^*]+) \*\/\n/).filter(Boolean)

const chunks = []
if (!parts[0]?.startsWith('01-')) {
  const preamble = parts.shift()?.trim()
  if (preamble) chunks.push({ name: '00-preamble', body: preamble })
}
for (let i = 0; i < parts.length; i += 2) {
  chunks.push({ name: parts[i], body: (parts[i + 1] || '').trim() })
}

fs.mkdirSync(chunksDir, { recursive: true })
for (const f of fs.readdirSync(chunksDir)) {
  if (f.endsWith('.js')) fs.unlinkSync(path.join(chunksDir, f))
}

for (const { name, body } of chunks) {
  const base = name.replace(/\.js$/i, '')
  const file = `${base}.js`
  fs.writeFileSync(
    path.join(chunksDir, file),
    `/** ${name} */\nexport default ${JSON.stringify(body)};\n`
  )
}

console.log(`OK: ${chunks.length} chunks → src/chunks/ (runtime používa src/app.js)`)
