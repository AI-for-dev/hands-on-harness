import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  splitBody,
  joinSegments,
  isPassthrough,
  buildChunks,
  structuralSignature
} from './segments.mjs'

test('découpe sur les lignes vides et reconstruit à l’identique', () => {
  const body = '# Titre\n\nUn paragraphe.\n\n## Sous-titre\n\nUn autre paragraphe.\n'
  const { segments, separators } = splitBody(body)
  assert.deepEqual(segments, ['# Titre', 'Un paragraphe.', '## Sous-titre', 'Un autre paragraphe.'])
  assert.equal(joinSegments(segments, separators) + '\n', body)
})

test('ne coupe pas un bloc de code contenant une ligne vide', () => {
  const body = 'Avant.\n\n```bash\npi --help\n\npi --version\n```\n\nAprès.\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 3)
  assert.equal(segments[1], '```bash\npi --help\n\npi --version\n```')
})

test('ne coupe pas un bloc de code imbriqué dans une fence plus longue', () => {
  const body = 'Avant.\n\n````md\n```js\nconst a = 1\n\nconst b = 2\n```\n````\n\nAprès.\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 3)
  assert.equal(segments[1], '````md\n```js\nconst a = 1\n\nconst b = 2\n```\n````')
})

test('préserve un espacement de plus d’une ligne vide', () => {
  const { segments, separators } = splitBody('A\n\n\n\nB')
  assert.deepEqual(segments, ['A', 'B'])
  assert.equal(joinSegments(segments, separators), 'A\n\n\n\nB')
})

test('ignore les blancs de bord et les lignes composées d’espaces', () => {
  const { segments } = splitBody('\n\nA\n   \nB\n\n')
  assert.deepEqual(segments, ['A', 'B'])
})

test('un corps vide ne produit aucun segment', () => {
  assert.deepEqual(splitBody('').segments, [])
  assert.deepEqual(splitBody('\n\n').segments, [])
})

test('conteneur ::: et tableau restent des segments uniques', () => {
  const body = '::: tip Objectifs\n- un\n- deux\n:::\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 2)
  assert.equal(structuralSignature(segments[0]), 'container')
  assert.equal(structuralSignature(segments[1]), 'table')
})

test('isPassthrough ne retient que ce qui n’a aucun texte à traduire', () => {
  assert.equal(isPassthrough('```bash\nls -la\n```'), true)
  assert.equal(isPassthrough('---'), true)
  assert.equal(isPassthrough('Un paragraphe.'), false)
  assert.equal(isPassthrough('![Schéma](./figures/neon.png)'), false)
  assert.equal(isPassthrough('Voir :\n\n```bash\nls\n```'), false)
})

// Segments assez longs pour qu'un seul dépasse le seuil de contexte : la
// croissance des morceaux ne brouille pas ce que ces cas vérifient.
const LONG = Array.from({ length: 8 }, (_, i) => `Paragraphe ${i} `.repeat(40))

test('buildChunks sans rien à traduire ne produit aucun appel', () => {
  assert.deepEqual(buildChunks(LONG, []), [])
})

test('buildChunks regroupe les segments contigus en un seul morceau', () => {
  assert.deepEqual(buildChunks(LONG, [0, 1, 2]), [{ start: 0, end: 2, keep: [0, 1, 2] }])
})

test('buildChunks sépare deux segments éloignés', () => {
  const chunks = buildChunks(LONG, [0, 5])
  assert.equal(chunks.length, 2)
  assert.deepEqual(chunks[0].keep, [0])
  assert.deepEqual(chunks[1].keep, [5])
})

test('buildChunks absorbe un écart court comme contexte', () => {
  const segments = ['Un titre court', 'Court', 'Aussi court', 'Encore court']
  const chunks = buildChunks(segments, [0, 3], { minChars: 10 })
  assert.deepEqual(chunks, [{ start: 0, end: 3, keep: [0, 3] }])
})

test('buildChunks étoffe un segment isolé avec ses voisins', () => {
  const segments = ['# Titre', 'Court.', 'Voisin.', 'Autre voisin.', 'Fin.']
  const chunks = buildChunks(segments, [1], { minChars: 30, maxGapChars: 0 })
  assert.equal(chunks.length, 1)
  assert.deepEqual(chunks[0].keep, [1], 'seul le segment à traduire est retenu')
  assert.ok(chunks[0].start < 1 && chunks[0].end > 1, 'du contexte de part et d’autre')
})

test('buildChunks ne compte pas un bloc de code comme du contexte utile', () => {
  const segments = ['```bash\n' + 'ls -la\n'.repeat(40) + '```', 'Court.', 'Voisin.', 'Autre.']
  const chunks = buildChunks(segments, [1], { minChars: 30, maxGapChars: 0 })
  assert.equal(chunks[0].end > 1, true, 'le bloc de code n’a pas suffi à étoffer le morceau')
})

test('buildChunks fusionne les morceaux qui se recouvrent après croissance', () => {
  const segments = ['A.', 'B.', 'C.', 'D.', 'E.']
  const chunks = buildChunks(segments, [0, 4], { minChars: 1000, maxGapChars: 0 })
  assert.deepEqual(chunks, [{ start: 0, end: 4, keep: [0, 4] }])
})

test('buildChunks ne sort jamais des bornes du document', () => {
  const segments = ['Seul segment, court.']
  assert.deepEqual(buildChunks(segments, [0], { minChars: 1000 }), [
    { start: 0, end: 0, keep: [0] }
  ])
})

test('structuralSignature distingue les niveaux de titre', () => {
  assert.equal(structuralSignature('# A'), 'h1')
  assert.equal(structuralSignature('### A'), 'h3')
  assert.equal(structuralSignature('- a\n- b'), 'list')
  assert.equal(structuralSignature('1. a'), 'list')
  assert.equal(structuralSignature('> a'), 'quote')
  assert.equal(structuralSignature('Un paragraphe.'), 'p')
  assert.equal(structuralSignature('#hashtag'), 'p')
})

test('buildChunks découpe un morceau trop long en tranches', () => {
  const segments = Array.from({ length: 10 }, (_, i) => `Paragraphe ${i}. `.repeat(30))
  const perSegment = segments[0].length
  const chunks = buildChunks(segments, segments.map((_, i) => i), {
    minChars: 100,
    maxChars: perSegment * 3
  })

  assert.ok(chunks.length >= 3, `attendu plusieurs tranches, obtenu ${chunks.length}`)
  // Couverture exacte : chaque segment à traduire dans exactement une tranche.
  assert.deepEqual(
    chunks.flatMap((chunk) => chunk.keep),
    segments.map((_, i) => i)
  )
  for (const chunk of chunks) {
    const size = chunk.keep.reduce((total, i) => total + segments[i].length, 0)
    assert.ok(size <= perSegment * 4, `tranche trop grosse : ${size}`)
  }
})

test('buildChunks ne laisse pas une tranche finale maigre', () => {
  const long = 'Paragraphe long. '.repeat(30)
  const segments = [long, long, long, 'Court.']
  const chunks = buildChunks(segments, [0, 1, 2, 3], { minChars: 200, maxChars: long.length * 1.5 })
  const last = chunks[chunks.length - 1]
  assert.ok(last.keep.length > 1, 'le segment court a été reversé dans la tranche précédente')
})

test('buildChunks ne rend jamais de morceau sans segment à traduire', () => {
  const segments = Array.from({ length: 12 }, (_, i) => `Paragraphe ${i}. `.repeat(30))
  for (const chunk of buildChunks(segments, [0, 11], { maxChars: 500 })) {
    assert.ok(chunk.keep.length > 0)
  }
})

test('préserve l’indentation des blocs d’une liste', () => {
  // Cas réel du cours : un élément de liste dont les paragraphes de
  // continuation et le bloc de code sont indentés de quatre espaces.
  const body =
    '- Lister les outils\n\n' +
    '    Pour obtenir la liste, tapez\n\n' +
    '    ```\n    /tools\n    ```\n\n' +
    '    Vous devriez voir read, bash, edit, write.\n'
  const { segments, separators } = splitBody(body)

  assert.equal(segments.length, 4)
  assert.equal(segments[1], '    Pour obtenir la liste, tapez')
  assert.equal(segments[2], '    ```\n    /tools\n    ```')
  assert.equal(isPassthrough(segments[2]), true, 'un bloc de code indenté reste protégé')
  assert.equal(joinSegments(segments, separators) + '\n', body)
})

test('protège un bloc de code indenté comme un bloc de premier niveau', () => {
  const body = 'Avant.\n\n    ```bash\n    ls -la\n\n    pwd\n    ```\n\nAprès.\n'
  const { segments } = splitBody(body)
  assert.equal(segments.length, 3, 'la ligne vide dans le bloc indenté ne le coupe pas')
  assert.equal(segments[1], '    ```bash\n    ls -la\n\n    pwd\n    ```')
})

test('les séparateurs sortent sans blanc de fin de ligne', () => {
  const { segments, separators } = splitBody('Un paragraphe.\n   \nUn autre.\n')
  assert.deepEqual(segments, ['Un paragraphe.', 'Un autre.'])
  assert.deepEqual(separators, ['\n\n'], 'la ligne d’espaces devient une ligne vide')
  assert.equal(joinSegments(segments, separators), 'Un paragraphe.\n\nUn autre.')
})
