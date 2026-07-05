import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export function loadManifest(manifestPath) {
  if (!existsSync(manifestPath)) return {}
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

export function saveManifest(manifestPath, manifest) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
}

export function getEntry(manifest, relPath, lang) {
  return manifest[relPath]?.[lang]
}

export function setEntry(manifest, relPath, lang, entry) {
  manifest[relPath] ??= {}
  manifest[relPath][lang] = entry
}
