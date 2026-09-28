import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export function loadManifest(manifestPath) {
  if (!existsSync(manifestPath)) return {}
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

// Writes nothing when the content is unchanged: a run that translates nothing
// must not make the manifest look modified.
export function saveManifest(manifestPath, manifest) {
  const serialized = JSON.stringify(manifest, null, 2) + '\n'
  if (existsSync(manifestPath) && readFileSync(manifestPath, 'utf8') === serialized) return
  writeFileSync(manifestPath, serialized, 'utf8')
}

export function getEntry(manifest, relPath, lang) {
  return manifest[relPath]?.[lang]
}

export function setEntry(manifest, relPath, lang, entry) {
  manifest[relPath] ??= {}
  manifest[relPath][lang] = entry
}
