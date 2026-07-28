import assert from 'node:assert/strict'
import { test } from 'node:test'

import { diffSignals } from './validate.mjs'

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
