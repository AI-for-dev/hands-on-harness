import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseQuoteFence, asBlockquote, originalQuotes } from './quotes.mjs'
import { splitBody } from './segments.mjs'

const PAGE = `Linus Torvalds a écrit :

> L'IA est un outil.
>
> Linus Torvalds, [message](https://example.org)

\`\`\`quote en
AI is a tool.

Linus Torvalds, [message](https://example.org)
\`\`\`

Suite du texte.`

test('parseQuoteFence reads the language and the original text', () => {
  assert.deepEqual(parseQuoteFence('```quote en\nAI is a tool.\n```'), { lang: 'en', original: 'AI is a tool.' })
  assert.deepEqual(parseQuoteFence('~~~~quote es\nuno\n\ndos\n~~~~'), { lang: 'es', original: 'uno\n\ndos' })
})

test('parseQuoteFence ignores any other segment', () => {
  assert.equal(parseQuoteFence('```js\nconst a = 1\n```'), null)
  assert.equal(parseQuoteFence('> une citation'), null)
  assert.equal(parseQuoteFence('```quote\nsans langue\n```'), null)
})

test('asBlockquote prefixes every line, blank ones included', () => {
  assert.equal(asBlockquote('AI is a tool.\n\nLinus'), '> AI is a tool.\n>\n> Linus')
})

test('originalQuotes replaces the translated quote in the language of the original', () => {
  const { segments } = splitBody(PAGE)
  const substitutions = originalQuotes(segments, 'en')
  assert.deepEqual([...substitutions], [[1, '> AI is a tool.\n>\n> Linus Torvalds, [message](https://example.org)']])
})

test('originalQuotes leaves the other languages to the model', () => {
  const { segments } = splitBody(PAGE)
  assert.equal(originalQuotes(segments, 'es').size, 0)
})

test('originalQuotes refuses an original that follows no quote', () => {
  const { segments } = splitBody('Un paragraphe.\n\n```quote en\nAI is a tool.\n```')
  assert.throws(() => originalQuotes(segments, 'en'), /must directly follow the translated quote/)
})

test('originalQuotes refuses an original glued to its quote without a blank line', () => {
  const { segments } = splitBody('> L\'IA est un outil.\n```quote en\nAI is a tool.\n```')
  assert.throws(() => originalQuotes(segments, 'en'), /blank line/)
})
