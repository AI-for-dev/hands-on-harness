import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  segmentHash,
  bodyReuse,
  frontmatterReuse,
  buildBodyPairs,
  adoptBodyPairs,
  reusableBodyTranslations,
  buildFrontmatterPairs,
  reusableFrontmatterTranslations,
  pruneByRelPath
} from './segment-index.mjs'

test('an unchanged translation is reusable', () => {
  const source = ['# Titre', 'Un paragraphe.']
  const translated = ['# Title', 'A paragraph.']
  const pairs = buildBodyPairs(source, translated)

  const reusable = reusableBodyTranslations(pairs, translated)
  assert.equal(reusable.get(segmentHash('# Titre')), '# Title')
  assert.equal(reusable.get(segmentHash('Un paragraphe.')), 'A paragraph.')
})

test('an edited source segment is no longer reusable', () => {
  const pairs = buildBodyPairs(['A'], ['A translated'])
  const reusable = reusableBodyTranslations(pairs, ['A translated'])
  assert.equal(reusable.has(segmentHash('A modifié')), false)
})

test('changing the translation rules invalidates every reuse', () => {
  const entry = { rules: 'regles-v1', body: buildBodyPairs(['A'], ['A translated']) }

  const same = bodyReuse(entry, 'regles-v1', ['A translated'])
  assert.equal(same.current.get(segmentHash('A')), 'A translated')

  const changed = bodyReuse(entry, 'regles-v2', ['A translated'])
  assert.equal(changed.current.size, 0, 'nothing reusable as is any more')
  assert.equal(
    changed.previous.get(segmentHash('A')),
    'A translated',
    'but the previous translation is still available in reserve'
  )
})

test('an index without the page or without rules reuses nothing', () => {
  assert.equal(bodyReuse(undefined, 'regles-v1', ['A tr']).current.size, 0)
  assert.equal(bodyReuse({ body: [] }, 'regles-v1', []).current.size, 0)
  assert.equal(frontmatterReuse(undefined, 'regles-v1', {}).current.size, 0)
})

test('a hand-edited translation is not reused by mistake', () => {
  const pairs = buildBodyPairs(['A'], ['A translated'])
  const reusable = reusableBodyTranslations(pairs, ['A retouché à la main'])
  assert.equal(reusable.size, 0)
})

test('an index misaligned with the target file is ignored entirely', () => {
  const pairs = buildBodyPairs(['A', 'B'], ['A tr', 'B tr'])
  assert.equal(reusableBodyTranslations(pairs, ['A tr']).size, 0)
  assert.equal(reusableBodyTranslations(undefined, ['A tr']).size, 0)
})

test('adoption of an existing aligned translation', () => {
  const source = ['# Titre', 'Un paragraphe.', '```bash\nls\n```']
  const translated = ['# Title', 'A paragraph.', '```bash\nls\n```']
  const pairs = adoptBodyPairs(source, translated)
  assert.deepEqual(pairs, buildBodyPairs(source, translated))
})

test('adoption refused when the structure does not match', () => {
  // Two segments on each side, but a heading facing a paragraph: the alignment
  // has shifted, and reusing these pairs would produce nonsense.
  assert.equal(adoptBodyPairs(['# Titre', 'Texte.'], ['Text.', '# Title']), null)
  // A code block must be identical to the character.
  assert.equal(adoptBodyPairs(['```\nls\n```'], ['```\ndir\n```']), null)
  // Differing segment count.
  assert.equal(adoptBodyPairs(['A', 'B'], ['A tr']), null)
})

test('front-matter: reuse by YAML path', () => {
  const sourceStrings = { 'hero.name': 'Bonjour', 'hero.tagline': 'Une formation' }
  const translatedStrings = { 'hero.name': 'Hello', 'hero.tagline': 'A course' }
  const pairs = buildFrontmatterPairs(sourceStrings, translatedStrings)

  const reusable = reusableFrontmatterTranslations(pairs, translatedStrings)
  assert.equal(reusable.get(segmentHash('Bonjour')), 'Hello')

  const edited = { ...translatedStrings, 'hero.name': 'Hi' }
  assert.equal(reusableFrontmatterTranslations(pairs, edited).size, 1)
})

test('front-matter: the rules also gate reuse', () => {
  const entry = {
    rules: 'regles-v1',
    frontmatter: buildFrontmatterPairs({ title: 'Bonjour' }, { title: 'Hello' })
  }
  assert.equal(frontmatterReuse(entry, 'regles-v1', { title: 'Hello' }).current.size, 1)
  assert.equal(frontmatterReuse(entry, 'regles-v2', { title: 'Hello' }).current.size, 0)
})

test('pruneByRelPath forgets the pages with no source', () => {
  const state = { 'a.md': { en: {} }, 'b.md': { en: {} } }
  assert.equal(pruneByRelPath(state, new Set(['a.md'])), 1)
  assert.deepEqual(Object.keys(state), ['a.md'])
})
