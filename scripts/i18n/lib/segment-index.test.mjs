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

test('une traduction inchangée est réutilisable', () => {
  const source = ['# Titre', 'Un paragraphe.']
  const translated = ['# Title', 'A paragraph.']
  const pairs = buildBodyPairs(source, translated)

  const reusable = reusableBodyTranslations(pairs, translated)
  assert.equal(reusable.get(segmentHash('# Titre')), '# Title')
  assert.equal(reusable.get(segmentHash('Un paragraphe.')), 'A paragraph.')
})

test('un segment source modifié n’est plus réutilisable', () => {
  const pairs = buildBodyPairs(['A'], ['A translated'])
  const reusable = reusableBodyTranslations(pairs, ['A translated'])
  assert.equal(reusable.has(segmentHash('A modifié')), false)
})

test('changer les règles de traduction invalide toute réutilisation', () => {
  const entry = { rules: 'regles-v1', body: buildBodyPairs(['A'], ['A translated']) }

  const same = bodyReuse(entry, 'regles-v1', ['A translated'])
  assert.equal(same.current.get(segmentHash('A')), 'A translated')

  const changed = bodyReuse(entry, 'regles-v2', ['A translated'])
  assert.equal(changed.current.size, 0, 'plus rien de réutilisable tel quel')
  assert.equal(
    changed.previous.get(segmentHash('A')),
    'A translated',
    'mais la traduction précédente reste disponible en réserve'
  )
})

test('un index sans page ou sans règles ne réutilise rien', () => {
  assert.equal(bodyReuse(undefined, 'regles-v1', ['A tr']).current.size, 0)
  assert.equal(bodyReuse({ body: [] }, 'regles-v1', []).current.size, 0)
  assert.equal(frontmatterReuse(undefined, 'regles-v1', {}).current.size, 0)
})

test('une traduction retouchée à la main n’est pas réutilisée à tort', () => {
  const pairs = buildBodyPairs(['A'], ['A translated'])
  const reusable = reusableBodyTranslations(pairs, ['A retouché à la main'])
  assert.equal(reusable.size, 0)
})

test('un index désaligné du fichier cible est entièrement ignoré', () => {
  const pairs = buildBodyPairs(['A', 'B'], ['A tr', 'B tr'])
  assert.equal(reusableBodyTranslations(pairs, ['A tr']).size, 0)
  assert.equal(reusableBodyTranslations(undefined, ['A tr']).size, 0)
})

test('adoption d’une traduction existante alignée', () => {
  const source = ['# Titre', 'Un paragraphe.', '```bash\nls\n```']
  const translated = ['# Title', 'A paragraph.', '```bash\nls\n```']
  const pairs = adoptBodyPairs(source, translated)
  assert.deepEqual(pairs, buildBodyPairs(source, translated))
})

test('adoption refusée si la structure ne correspond pas', () => {
  // Deux segments de part et d'autre, mais un titre en face d'un paragraphe :
  // l'alignement a glissé, réutiliser ces paires produirait des contresens.
  assert.equal(adoptBodyPairs(['# Titre', 'Texte.'], ['Text.', '# Title']), null)
  // Un bloc de code doit être identique au caractère près.
  assert.equal(adoptBodyPairs(['```\nls\n```'], ['```\ndir\n```']), null)
  // Nombre de segments différent.
  assert.equal(adoptBodyPairs(['A', 'B'], ['A tr']), null)
})

test('front-matter : réutilisation par chemin YAML', () => {
  const sourceStrings = { 'hero.name': 'Bonjour', 'hero.tagline': 'Une formation' }
  const translatedStrings = { 'hero.name': 'Hello', 'hero.tagline': 'A course' }
  const pairs = buildFrontmatterPairs(sourceStrings, translatedStrings)

  const reusable = reusableFrontmatterTranslations(pairs, translatedStrings)
  assert.equal(reusable.get(segmentHash('Bonjour')), 'Hello')

  const edited = { ...translatedStrings, 'hero.name': 'Hi' }
  assert.equal(reusableFrontmatterTranslations(pairs, edited).size, 1)
})

test('front-matter : les règles conditionnent aussi la réutilisation', () => {
  const entry = {
    rules: 'regles-v1',
    frontmatter: buildFrontmatterPairs({ title: 'Bonjour' }, { title: 'Hello' })
  }
  assert.equal(frontmatterReuse(entry, 'regles-v1', { title: 'Hello' }).current.size, 1)
  assert.equal(frontmatterReuse(entry, 'regles-v2', { title: 'Hello' }).current.size, 0)
})

test('pruneByRelPath oublie les pages sans source', () => {
  const state = { 'a.md': { en: {} }, 'b.md': { en: {} } }
  assert.equal(pruneByRelPath(state, new Set(['a.md'])), 1)
  assert.deepEqual(Object.keys(state), ['a.md'])
})
