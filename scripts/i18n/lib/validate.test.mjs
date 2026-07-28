import assert from 'node:assert/strict'
import { test } from 'node:test'

import { diffSignals } from './validate.mjs'

const SOURCE = 'Un paragraphe de longueur raisonnable, avec une référence [1] à conserver.'

test('une traduction fidèle ne signale rien', () => {
  assert.deepEqual(diffSignals(SOURCE, 'A reasonably long paragraph, with a reference [1] to keep.'), [])
})

test('une référence perdue est signalée', () => {
  const issues = diffSignals(SOURCE, 'A reasonably long paragraph, with a reference to keep.')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /références/)
})

test('un titre disparu est signalé', () => {
  const source = '## Un titre\n\nUn paragraphe qui doit rester un paragraphe distinct du titre.'
  const issues = diffSignals(source, 'A heading\n\nA paragraph that must stay a paragraph, separate from it.')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /titres/)
})

test('un paragraphe inventé est signalé par la longueur', () => {
  const source = 'Dernier paragraphe, après un filet horizontal, assez long pour être mesuré.'
  const hallucinated =
    'The final section of this course is dedicated to production deployment. ' +
    'We will explore how to package your agent, integrate it into a CI/CD pipeline, ' +
    'and monitor its performance in a live environment, step by step.'
  const issues = diffSignals(source, hallucinated)
  assert.equal(issues.length, 1)
  assert.match(issues[0], /longueur/)
})

test('un texte très court échappe au contrôle de longueur', () => {
  assert.deepEqual(diffSignals('OK', 'De acuerdo, entendido'), [])
})

test('un marqueur de bloc de code inventé est signalé', () => {
  const source = 'Le bloc ci-dessus ne doit jamais être traduit, il contient une ligne vide.'
  const issues = diffSignals(source, '%%%PROTECTED_1%%%')
  assert.equal(issues.some((issue) => /marqueurs de bloc de code/.test(issue)), true)
})

test('un marqueur de bloc de code perdu est signalé', () => {
  const source = 'Voici la commande à lancer dans un terminal :\n\n%%%PROTECTED_0%%%'
  const issues = diffSignals(source, 'Here is the command to run in a terminal:')
  assert.equal(issues.some((issue) => /marqueurs de bloc de code/.test(issue)), true)
})
