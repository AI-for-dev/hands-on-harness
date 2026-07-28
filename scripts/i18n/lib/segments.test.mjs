import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  splitBody,
  joinSegments,
  isPassthrough,
  buildChunks,
  structuralSignature
} from './segments.mjs'

test('splits on blank lines and rebuilds identically', () => {
  const body = '# Titre\n\nUn paragraphe.\n\n## Sous-titre\n\nUn autre paragraphe.\n'
  const { segments, separators } = splitBody(body)
  assert.deepEqual(segments, ['# Titre', 'Un paragraphe.', '## Sous-titre', 'Un autre paragraphe.'])
  assert.equal(joinSegments(segments, separators) + '\n', body)
})

test('does not cut a code block containing a blank line', () => {
  const body = 'Avant.\n\n```bash\npi --help\n\npi --version\n```\n\nAprès.\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 3)
  assert.equal(segments[1], '```bash\npi --help\n\npi --version\n```')
})

test('does not cut a code block nested in a longer fence', () => {
  const body = 'Avant.\n\n````md\n```js\nconst a = 1\n\nconst b = 2\n```\n````\n\nAprès.\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 3)
  assert.equal(segments[1], '````md\n```js\nconst a = 1\n\nconst b = 2\n```\n````')
})

test('preserves spacing of more than one blank line', () => {
  const { segments, separators } = splitBody('A\n\n\n\nB')
  assert.deepEqual(segments, ['A', 'B'])
  assert.equal(joinSegments(segments, separators), 'A\n\n\n\nB')
})

test('ignores edge whitespace and lines made of spaces', () => {
  const { segments } = splitBody('\n\nA\n   \nB\n\n')
  assert.deepEqual(segments, ['A', 'B'])
})

test('an empty body produces no segment', () => {
  assert.deepEqual(splitBody('').segments, [])
  assert.deepEqual(splitBody('\n\n').segments, [])
})

test('a ::: container and a table stay single segments', () => {
  const body = '::: tip Objectifs\n- un\n- deux\n:::\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 2)
  assert.equal(structuralSignature(segments[0]), 'container')
  assert.equal(structuralSignature(segments[1]), 'table')
})

test('isPassthrough only keeps what has no text to translate', () => {
  assert.equal(isPassthrough('```bash\nls -la\n```'), true)
  assert.equal(isPassthrough('---'), true)
  assert.equal(isPassthrough('Un paragraphe.'), false)
  assert.equal(isPassthrough('![Schéma](./figures/neon.png)'), false)
  assert.equal(isPassthrough('Voir :\n\n```bash\nls\n```'), false)
})

// Segments long enough that a single one passes the context threshold, so chunk
// growth does not blur what these cases check.
const LONG = Array.from({ length: 8 }, (_, i) => `Paragraphe ${i} `.repeat(40))

test('buildChunks with nothing to translate produces no call', () => {
  assert.deepEqual(buildChunks(LONG, []), [])
})

test('buildChunks groups contiguous segments into a single chunk', () => {
  assert.deepEqual(buildChunks(LONG, [0, 1, 2]), [{ start: 0, end: 2, keep: [0, 1, 2] }])
})

test('buildChunks separates two distant segments', () => {
  const chunks = buildChunks(LONG, [0, 5])
  assert.equal(chunks.length, 2)
  assert.deepEqual(chunks[0].keep, [0])
  assert.deepEqual(chunks[1].keep, [5])
})

test('buildChunks absorbs a short gap as context', () => {
  const segments = ['Un titre court', 'Court', 'Aussi court', 'Encore court']
  const chunks = buildChunks(segments, [0, 3], { minChars: 10 })
  assert.deepEqual(chunks, [{ start: 0, end: 3, keep: [0, 3] }])
})

test('buildChunks pads an isolated segment with its neighbours', () => {
  const segments = ['# Titre', 'Court.', 'Voisin.', 'Autre voisin.', 'Fin.']
  const chunks = buildChunks(segments, [1], { minChars: 30, maxGapChars: 0 })
  assert.equal(chunks.length, 1)
  assert.deepEqual(chunks[0].keep, [1], 'only the segment to translate is kept')
  assert.ok(chunks[0].start < 1 && chunks[0].end > 1, 'context on both sides')
})

test('buildChunks does not count a code block as useful context', () => {
  const segments = ['```bash\n' + 'ls -la\n'.repeat(40) + '```', 'Court.', 'Voisin.', 'Autre.']
  const chunks = buildChunks(segments, [1], { minChars: 30, maxGapChars: 0 })
  assert.equal(chunks[0].end > 1, true, 'the code block was not enough to pad the chunk')
})

test('buildChunks merges chunks that overlap after growth', () => {
  const segments = ['A.', 'B.', 'C.', 'D.', 'E.']
  const chunks = buildChunks(segments, [0, 4], { minChars: 1000, maxGapChars: 0 })
  assert.deepEqual(chunks, [{ start: 0, end: 4, keep: [0, 4] }])
})

test('buildChunks never goes outside the document bounds', () => {
  const segments = ['Seul segment, court.']
  assert.deepEqual(buildChunks(segments, [0], { minChars: 1000 }), [
    { start: 0, end: 0, keep: [0] }
  ])
})

test('structuralSignature distinguishes heading levels', () => {
  assert.equal(structuralSignature('# A'), 'h1')
  assert.equal(structuralSignature('### A'), 'h3')
  assert.equal(structuralSignature('- a\n- b'), 'list')
  assert.equal(structuralSignature('1. a'), 'list')
  assert.equal(structuralSignature('> a'), 'quote')
  assert.equal(structuralSignature('Un paragraphe.'), 'p')
  assert.equal(structuralSignature('#hashtag'), 'p')
})

test('buildChunks slices an over-long chunk', () => {
  const segments = Array.from({ length: 10 }, (_, i) => `Paragraphe ${i}. `.repeat(30))
  const perSegment = segments[0].length
  const chunks = buildChunks(segments, segments.map((_, i) => i), {
    minChars: 100,
    maxChars: perSegment * 3
  })

  assert.ok(chunks.length >= 3, `expected several slices, got ${chunks.length}`)
  // Exact coverage: every segment to translate in exactly one slice.
  assert.deepEqual(
    chunks.flatMap((chunk) => chunk.keep),
    segments.map((_, i) => i)
  )
  for (const chunk of chunks) {
    const size = chunk.keep.reduce((total, i) => total + segments[i].length, 0)
    assert.ok(size <= perSegment * 4, `slice too large: ${size}`)
  }
})

test('buildChunks does not leave a thin final slice', () => {
  const long = 'Paragraphe long. '.repeat(30)
  const segments = [long, long, long, 'Court.']
  const chunks = buildChunks(segments, [0, 1, 2, 3], { minChars: 200, maxChars: long.length * 1.5 })
  const last = chunks[chunks.length - 1]
  assert.ok(last.keep.length > 1, 'the short segment was folded into the previous slice')
})

test('buildChunks never returns a chunk with no segment to translate', () => {
  const segments = Array.from({ length: 12 }, (_, i) => `Paragraphe ${i}. `.repeat(30))
  for (const chunk of buildChunks(segments, [0, 11], { maxChars: 500 })) {
    assert.ok(chunk.keep.length > 0)
  }
})

test('preserves the indentation of blocks inside a list item', () => {
  // Real case from the course: a list item whose continuation paragraphs and
  // code block are indented by four spaces.
  const body =
    '- Lister les outils\n\n' +
    '    Pour obtenir la liste, tapez\n\n' +
    '    ```\n    /tools\n    ```\n\n' +
    '    Vous devriez voir read, bash, edit, write.\n'
  const { segments, separators } = splitBody(body)

  assert.equal(segments.length, 4)
  assert.equal(segments[1], '    Pour obtenir la liste, tapez')
  assert.equal(segments[2], '    ```\n    /tools\n    ```')
  assert.equal(isPassthrough(segments[2]), true, 'an indented code block stays protected')
  assert.equal(joinSegments(segments, separators) + '\n', body)
})

test('protects an indented code block like a top-level one', () => {
  const body = 'Avant.\n\n    ```bash\n    ls -la\n\n    pwd\n    ```\n\nAprès.\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 3, 'the blank line inside the indented block does not cut it')
  assert.equal(segments[1], '    ```bash\n    ls -la\n\n    pwd\n    ```')
})

test('separators come out without trailing whitespace', () => {
  const { segments, separators } = splitBody('Un paragraphe.\n   \nUn autre.\n')
  assert.deepEqual(segments, ['Un paragraphe.', 'Un autre.'])
  assert.deepEqual(separators, ['\n\n'], 'the line of spaces becomes an empty line')
  assert.equal(joinSegments(segments, separators), 'Un paragraphe.\n\nUn autre.')
})
