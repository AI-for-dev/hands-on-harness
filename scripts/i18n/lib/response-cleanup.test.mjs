import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cleanupTranslationResponse } from './response-cleanup.mjs'

test('laisse une réponse propre intacte', () => {
  const text = '# Title\n\nA paragraph.'
  assert.equal(cleanupTranslationResponse(text), text)
})

test('désenveloppe une réponse entièrement mise dans un bloc de code', () => {
  const raw = 'Here is the translation:\n```markdown\n# Title\n\nA paragraph.\n```'
  assert.equal(cleanupTranslationResponse(raw), '# Title\n\nA paragraph.')
})

test('ne touche pas un vrai bloc de code faisant partie du contenu', () => {
  const raw = 'Run this:\n\n```bash\nls -la\n```\n\nThen check the output, which should list every file.'
  assert.equal(cleanupTranslationResponse(raw), raw)
})

test('remet un marqueur de bloc de code seul sur sa ligne', () => {
  const raw = 'To get the list, type\n\n    %%%PROTECTED_0%%%\n\nYou should see four tools.'
  assert.equal(
    cleanupTranslationResponse(raw),
    'To get the list, type\n\n%%%PROTECTED_0%%%\n\nYou should see four tools.'
  )
})

test('ne déplace pas un marqueur inséré dans une phrase', () => {
  const raw = 'See the block %%%PROTECTED_0%%% above.'
  assert.equal(cleanupTranslationResponse(raw), raw)
})
