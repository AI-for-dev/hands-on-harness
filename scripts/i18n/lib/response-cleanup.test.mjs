import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cleanupTranslationResponse } from './response-cleanup.mjs'

test('leaves a clean answer untouched', () => {
  const text = '# Title\n\nA paragraph.'
  assert.equal(cleanupTranslationResponse(text), text)
})

test('unwraps an answer entirely put inside a code block', () => {
  const raw = 'Here is the translation:\n```markdown\n# Title\n\nA paragraph.\n```'
  assert.equal(cleanupTranslationResponse(raw), '# Title\n\nA paragraph.')
})

test('does not touch a real code block that is part of the content', () => {
  const raw = 'Run this:\n\n```bash\nls -la\n```\n\nThen check the output, which should list every file.'
  assert.equal(cleanupTranslationResponse(raw), raw)
})

test('puts a code block marker back alone on its line', () => {
  const raw = 'To get the list, type\n\n    %%%PROTECTED_0%%%\n\nYou should see four tools.'
  assert.equal(
    cleanupTranslationResponse(raw),
    'To get the list, type\n\n%%%PROTECTED_0%%%\n\nYou should see four tools.'
  )
})

test('does not move a marker embedded in a sentence', () => {
  const raw = 'See the block %%%PROTECTED_0%%% above.'
  assert.equal(cleanupTranslationResponse(raw), raw)
})
