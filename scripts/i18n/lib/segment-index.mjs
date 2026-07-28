// Index of the segments already translated (i18n/segments.json).
//
// The translations themselves are not stored here: they already live in
// content/<lang>/. All we keep is one pair of fingerprints per segment, in file
// order:
//
//   "<source segment fingerprint>:<translated segment fingerprint>"
//
// Reading the index back therefore means re-splitting the existing translated
// file and checking, segment by segment, that its fingerprint is the recorded
// one. Two intended consequences:
//
// - no duplication of translated text in the repository (no cache doubling
//   content/en + content/es and polluting diffs);
// - a stale index, or a hand-edited translation, cannot produce a wrong reuse:
//   verification fails and the segment concerned is simply retranslated.
//
// Each entry also records the translation rules (`rules`: fingerprint of the
// prompt, the glossary and the style guide) it was produced under. Changing
// those rules invalidates every translation, as documented in i18n/README.md,
// but in that case the index still knows which translation matched the source
// text: that is what makes it possible to keep it rather than ship a visibly
// degraded translation.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { sha256 } from './hash.mjs'
import { structuralSignature } from './segments.mjs'

// 64 bits of fingerprint: plenty for a few thousand segments, and an index that
// stays readable by eye.
const HASH_LENGTH = 16

export function segmentHash(text) {
  return sha256(text).slice(0, HASH_LENGTH)
}

export function loadSegmentIndex(indexPath) {
  if (!existsSync(indexPath)) return {}
  return JSON.parse(readFileSync(indexPath, 'utf8'))
}

// Writes the index with sorted keys: the order must not depend on the order the
// disk is walked in, otherwise the generated file produces phantom diffs from
// one machine to the next. Writes nothing when the content is unchanged, so the
// file does not look modified after a run that translated nothing.
export function saveSegmentIndex(indexPath, index) {
  const sorted = {}
  for (const relPath of Object.keys(index).sort()) {
    sorted[relPath] = {}
    for (const lang of Object.keys(index[relPath]).sort()) {
      sorted[relPath][lang] = index[relPath][lang]
    }
  }
  const serialized = JSON.stringify(sorted, null, 2) + '\n'
  if (existsSync(indexPath) && readFileSync(indexPath, 'utf8') === serialized) return
  writeFileSync(indexPath, serialized, 'utf8')
}

export function getIndexEntry(index, relPath, lang) {
  return index[relPath]?.[lang]
}

export function setIndexEntry(index, relPath, lang, entry) {
  index[relPath] ??= {}
  index[relPath][lang] = entry
}

// Forgets the pages whose source file is gone: without this, the index (like the
// manifest) keeps describing orphan translations.
export function pruneByRelPath(state, keepRelPaths) {
  let pruned = 0
  for (const relPath of Object.keys(state)) {
    if (keepRelPaths.has(relPath)) continue
    delete state[relPath]
    pruned += 1
  }
  return pruned
}

export function buildBodyPairs(sourceSegments, translatedSegments) {
  return sourceSegments.map(
    (segment, i) => `${segmentHash(segment)}:${segmentHash(translatedSegments[i])}`
  )
}

// The two tables an incremental translation needs, for the body as well as for
// the front-matter:
//
// - `current`: what is reusable as is, meaning translated under the translation
//   rules in force. Empty when the rules have changed, which forces the whole
//   corpus to be retranslated (documented behaviour).
// - `previous`: what was translated under other rules. No longer the reference,
//   but still a correct translation of the same source text: the reserve to draw
//   from when a new translation is judged degraded by the integrity checks.
export function bodyReuse(entry, rulesId, existingTargetSegments) {
  const previous = reusableBodyTranslations(entry?.body, existingTargetSegments)
  return { current: entry?.rules === rulesId ? previous : new Map(), previous }
}

export function frontmatterReuse(entry, rulesId, existingTargetStrings) {
  const previous = reusableFrontmatterTranslations(entry?.frontmatter, existingTargetStrings)
  return { current: entry?.rules === rulesId ? previous : new Map(), previous }
}

// Rebuilds the "source fingerprint -> already translated text" table from the
// index and the existing translated file. Any pair whose target fingerprint no
// longer matches the file is ignored (that segment gets retranslated).
export function reusableBodyTranslations(pairs, existingTargetSegments) {
  const reusable = new Map()
  if (!Array.isArray(pairs) || pairs.length !== existingTargetSegments.length) return reusable

  pairs.forEach((pair, i) => {
    const [src, tgt] = pair.split(':')
    const translated = existingTargetSegments[i]
    if (tgt && src && segmentHash(translated) === tgt) reusable.set(src, translated)
  })
  return reusable
}

// Adopts a translation produced before the index existed (or hand-edited since):
// the source and its translation are known to be up to date, so all that is
// needed is to pair them segment by segment. Pairing is refused at the slightest
// doubt, a differing segment count or a structure that does not match, because a
// shifted alignment would reuse the neighbouring paragraph's translation.
export function adoptBodyPairs(sourceSegments, translatedSegments) {
  if (sourceSegments.length !== translatedSegments.length) return null
  for (let i = 0; i < sourceSegments.length; i++) {
    if (structuralSignature(sourceSegments[i]) !== structuralSignature(translatedSegments[i])) {
      return null
    }
  }
  return buildBodyPairs(sourceSegments, translatedSegments)
}

export function buildFrontmatterPairs(sourceStrings, translatedStrings) {
  const pairs = {}
  for (const [key, source] of Object.entries(sourceStrings)) {
    const translated = translatedStrings[key]
    if (typeof translated !== 'string') continue
    pairs[key] = `${segmentHash(source)}:${segmentHash(translated)}`
  }
  return pairs
}

// Same principle as for the body, but alignment is by YAML path (`hero.name`,
// ...) rather than by position.
export function reusableFrontmatterTranslations(pairs, existingTargetStrings) {
  const reusable = new Map()
  if (!pairs) return reusable

  for (const [key, pair] of Object.entries(pairs)) {
    const [src, tgt] = pair.split(':')
    const translated = existingTargetStrings[key]
    if (typeof translated !== 'string') continue
    if (tgt && src && segmentHash(translated) === tgt) reusable.set(src, translated)
  }
  return reusable
}
