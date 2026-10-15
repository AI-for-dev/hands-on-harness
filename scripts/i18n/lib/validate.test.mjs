import assert from 'node:assert/strict'
import { test } from 'node:test'

import { diffSignals, isUntranslated } from './validate.mjs'

const SOURCE = 'Un paragraphe de longueur raisonnable, avec une référence [1] à conserver.'

test('a faithful translation reports nothing', () => {
  assert.deepEqual(diffSignals(SOURCE, 'A reasonably long paragraph, with a reference [1] to keep.'), [])
})

test('a lost reference is reported', () => {
  const issues = diffSignals(SOURCE, 'A reasonably long paragraph, with a reference to keep.')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /references/)
})

test('a vanished heading is reported', () => {
  const source = '## Un titre\n\nUn paragraphe qui doit rester un paragraphe distinct du titre.'
  const issues = diffSignals(source, 'A heading\n\nA paragraph that must stay a paragraph, separate from it.')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /headings/)
})

test('an invented paragraph is caught by length', () => {
  const source = 'Dernier paragraphe, après un filet horizontal, assez long pour être mesuré.'
  const hallucinated =
    'The final section of this course is dedicated to production deployment. ' +
    'We will explore how to package your agent, integrate it into a CI/CD pipeline, ' +
    'and monitor its performance in a live environment, step by step.'
  const issues = diffSignals(source, hallucinated)
  assert.equal(issues.length, 1)
  assert.match(issues[0], /length/)
})

test('a very short text escapes the length check', () => {
  assert.deepEqual(diffSignals('OK', 'De acuerdo, entendido'), [])
})

test('an added ::: closing fence is reported', () => {
  const source = '::: info Exercice (en salle)\nÉcrivez la règle en partant de vos propres exécutions.'
  const issues = diffSignals(source, '::: info Exercise (in class)\nWrite the rule from your own runs.\n:::')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /::: delimiters/)
})

test('an invented code block marker is reported', () => {
  const source = 'Le bloc ci-dessus ne doit jamais être traduit, il contient une ligne vide.'
  const issues = diffSignals(source, '%%%PROTECTED_1%%%')
  assert.equal(issues.some((issue) => /code block markers/.test(issue)), true)
})

test('a lost code block marker is reported', () => {
  const source = 'Voici la commande à lancer dans un terminal :\n\n%%%PROTECTED_0%%%'
  const issues = diffSignals(source, 'Here is the command to run in a terminal:')
  assert.equal(issues.some((issue) => /code block markers/.test(issue)), true)
})

// Observed with opencode-go/deepseek-v4.1-flash: the model sometimes hands back
// the French paragraph unchanged, which passes every structural check.
const ECHOED = "L'extension enregistre trois handlers qui partagent deux variables, `codeChanged` et `retries`."

test('a French paragraph returned unchanged is reported', () => {
  const issues = diffSignals(ECHOED, ECHOED)
  assert.equal(issues.length, 1)
  assert.match(issues[0], /untranslated/)
})

test('an echo is detected despite surrounding whitespace', () => {
  assert.equal(isUntranslated(ECHOED, `  ${ECHOED}\n`), true)
})

test('a translated paragraph is not an echo', () => {
  const translated = 'The extension registers three handlers that share two variables, `codeChanged` and `retries`.'
  assert.equal(isUntranslated(ECHOED, translated), false)
})

test('text that stays the same in every language is not an echo', () => {
  for (const text of [
    '# Hands-on Harness',
    '### Version 1',
    '![](/figures/pi.png)',
    'https://docs.docker.com/ai/sandboxes/install/',
    '[karpathy]: https://www.youtube.com/watch?v=zjkBMFhNj_g',
    '- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]\n' +
      '- Addy Osmani, [Agent Harness Engineering][osmani-harness]'
  ]) {
    assert.equal(isUntranslated(text, text), false, text)
  }
})

test('French words inside code, link targets or markers do not count', () => {
  const text = 'Voir [`le-script-de-la-page`](https://example.org/le/la/les/des) %%%PROTECTED_0%%%'
  assert.equal(isUntranslated(text, text), false)
})
