import assert from 'node:assert/strict'
import { test } from 'node:test'

import { protectCodeBlocks, restoreCodeBlocks } from './markdown-protect.mjs'

test('protects a VitePress snippet import and restores it verbatim', () => {
  const md = 'Le fichier :\n\n<<<@/../scripts/briques/skills/playtest/SKILL.md{md}\n\nSuite.'
  const { protectedMd, blocks } = protectCodeBlocks(md)
  assert.equal(protectedMd, 'Le fichier :\n\n%%%PROTECTED_0%%%\n\nSuite.')
  assert.deepEqual(blocks, ['<<<@/../scripts/briques/skills/playtest/SKILL.md{md}'])
  assert.equal(restoreCodeBlocks(protectedMd, blocks), md)
})

test('leaves a snippet line shown inside a code block to that block', () => {
  const md = '```md\n<<<@/snippets/a.js{2}\n```\n\n<<<@/snippets/b.js'
  const { protectedMd, blocks } = protectCodeBlocks(md)
  assert.equal(protectedMd, '%%%PROTECTED_0%%%\n\n%%%PROTECTED_1%%%')
  assert.deepEqual(blocks, ['```md\n<<<@/snippets/a.js{2}\n```', '<<<@/snippets/b.js'])
})

test('does not protect a sentence that merely contains <<<', () => {
  const md = "L'opérateur <<< décale les bits vers la gauche."
  assert.equal(protectCodeBlocks(md).protectedMd, md)
})
