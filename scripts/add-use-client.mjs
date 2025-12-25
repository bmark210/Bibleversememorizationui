import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const TARGET_DIRS = [
  path.join(repoRoot, 'src', 'app'),
]

const EXCLUDE_FILES = new Set([
  path.join(repoRoot, 'src', 'app', 'layout.tsx'), // пусть остаётся серверным
])

const shouldProcessFile = (filePath) => {
  if (!filePath.endsWith('.tsx')) return false
  if (EXCLUDE_FILES.has(filePath)) return false
  return true
}

const walk = (dir, out) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(p, out)
      continue
    }
    if (entry.isFile() && shouldProcessFile(p)) out.push(p)
  }
}

const ensureUseClient = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8')
  const trimmedStart = raw.trimStart()
  if (trimmedStart.startsWith("'use client'") || trimmedStart.startsWith('"use client"')) {
    return false
  }
  const updated = `'use client'\n\n${raw}`
  fs.writeFileSync(filePath, updated, 'utf8')
  return true
}

const files = []
for (const dir of TARGET_DIRS) walk(dir, files)

let changed = 0
for (const file of files) {
  if (ensureUseClient(file)) changed++
}

console.log(`Added 'use client' to ${changed} file(s).`)


