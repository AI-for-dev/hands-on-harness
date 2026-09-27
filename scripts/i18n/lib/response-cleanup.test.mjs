import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cleanupTranslationResponse, dropAddedContainerFence, restoreFirstLineIndent } from './response-cleanup.mjs'

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

test('a ::: fence the source did not have is dropped', () => {
  const source = '::: info Exercice (en salle)\nÉcrivez la règle en partant de vos propres exécutions.'
  const translated = '::: info Exercise (in class)\nWrite the rule from your own runs.\n:::'
  assert.equal(
    dropAddedContainerFence(source, translated),
    '::: info Exercise (in class)\nWrite the rule from your own runs.'
  )
})

test('a container the source really closes is left alone', () => {
  const source = '::: tip Objectifs\nMesurer ce que fait le modèle.\n:::'
  const translated = '::: tip Goals\nMeasure what the model does.\n:::'
  assert.equal(dropAddedContainerFence(source, translated), translated)
})

test('a fence added elsewhere than at the end is left to the checks', () => {
  const source = 'Un paragraphe sans conteneur.'
  const translated = ':::\nA paragraph with no container.'
  assert.equal(dropAddedContainerFence(source, translated), translated)
})

test('keeps the indentation of the first line', () => {
  const raw = '    ::: info Exercise (in class)\n    Trigger each tool.\n    :::\n\n- Your session tree'
  assert.equal(cleanupTranslationResponse(raw), raw)
})

test('an indented container the source really closes is left alone', () => {
  const source = '    ::: info Exercice (en salle)\n    Déclenchez chaque outil.\n    :::'
  const translated = '    ::: info Exercise (in class)\n    Trigger each tool.\n    :::'
  assert.equal(dropAddedContainerFence(source, translated), translated)
})

test('an indented ::: fence the source did not have is dropped', () => {
  const source = '    ::: info Exercice (en salle)\n    Installez l\'extension'
  const translated = '    ::: info Exercise (in class)\n    Install the extension\n    :::'
  assert.equal(
    dropAddedContainerFence(source, translated),
    '    ::: info Exercise (in class)\n    Install the extension'
  )
})

test('puts back the first-line indentation the model dropped', () => {
  const source = '    ::: info Exercice (en salle)\n    Déclenchez chaque outil.\n    :::'
  const translated = '::: info Exercise (in class)\n    Trigger each tool.\n    :::'
  assert.equal(
    restoreFirstLineIndent(source, translated),
    '    ::: info Exercise (in class)\n    Trigger each tool.\n    :::'
  )
})

test('leaves a translation that kept its first-line indentation alone', () => {
  const source = '    Vous devriez voir les outils.'
  const translated = '    You should see the tools.'
  assert.equal(restoreFirstLineIndent(source, translated), translated)
})

test('does not indent a segment the source does not indent', () => {
  const source = '## Les extensions'
  const translated = '## Extensions'
  assert.equal(restoreFirstLineIndent(source, translated), translated)
})
