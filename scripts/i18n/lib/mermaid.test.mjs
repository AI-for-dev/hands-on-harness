import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyLabels,
  containsMermaid,
  extractLabels,
  isTranslatable,
  labelIssue,
  mermaidSkeleton,
  translateMermaidBlocks
} from './mermaid.mjs'

const DIAGRAM = `flowchart TD
    T([ticket #2]) --> E[explorer]
    E -- note d'impact --> L([vous relisez la note])
    R --> V{verdict}
    V -- "APPROVED, pas suivant" --> C
    C -->|rapport et diff| N
    classDef done fill:#fff
`

const labelsOf = (diagram) => extractLabels(diagram).map((span) => span.text)

test('extractLabels: node shapes, inline edges, quoted edges and pipes', () => {
  assert.deepEqual(labelsOf(DIAGRAM), [
    'ticket #2',
    'explorer',
    "note d'impact",
    'vous relisez la note',
    'verdict',
    'APPROVED, pas suivant',
    'rapport et diff'
  ])
})

test('extractLabels: a diagram that is not a flowchart has no label', () => {
  assert.deepEqual(extractLabels('sequenceDiagram\n  A->>B: bonjour\n'), [])
})

test('extractLabels: directives are left alone', () => {
  assert.deepEqual(labelsOf('graph LR\n  %% un commentaire [pas un label]\n  A[Début] --> B\n'), ['Début'])
})

test('isTranslatable: prose yes, identifiers and labels with no letter no', () => {
  assert.equal(isTranslatable('vous relisez la note'), true)
  assert.equal(isTranslatable('APPROVED, pas suivant'), true)
  assert.equal(isTranslatable('explorer'), false)
  assert.equal(isTranslatable('npm'), false)
  assert.equal(isTranslatable('#2'), false)
})

test('applyLabels: the skeleton is untouched, only the labels change', () => {
  const spans = extractLabels(DIAGRAM)
  const out = applyLabels(DIAGRAM, spans, new Map([[3, 'you reread the note'], [2, 'impact note']]))
  assert.match(out, /L\(\[you reread the note\]\)/)
  assert.match(out, /E -- impact note --> L/)
  assert.match(out, /E\[explorer\]/)
  assert.match(out, /classDef done fill:#fff/)
})

test('applyLabels: a translation bringing syntax characters is quoted', () => {
  const diagram = 'flowchart TD\n  A[Tests (rouges)] --> B\n'
  const spans = extractLabels(diagram)
  assert.equal(spans[0].text, 'Tests (rouges)')
  const out = applyLabels('flowchart TD\n  A[x] --> B\n', extractLabels('flowchart TD\n  A[x] --> B\n'), new Map([[0, 'Tests [red] "now"']]))
  assert.match(out, /A\["Tests \[red\] #quot;now#quot;"\]/)
})

test('applyLabels: an already quoted label keeps its quotes', () => {
  const diagram = 'flowchart TD\n  V -- "oui, suivant" --> C\n'
  const out = applyLabels(diagram, extractLabels(diagram), new Map([[0, 'yes, next']]))
  assert.match(out, /V -- "yes, next" --> C/)
})

test('labelIssue: empty, multi-line and runaway labels are refused', () => {
  assert.equal(labelIssue('verdict', 'verdict'), null)
  assert.match(labelIssue('verdict', ''), /empty/)
  assert.match(labelIssue('verdict', 'a\nb'), /several lines/)
  assert.match(labelIssue('vous relisez la note', 'you reread the note, then you decide what to do next with the planner'), /length/)
})

test('translateMermaidBlocks: labels go to the model as JSON, the rest stays byte for byte', async () => {
  const markdown = `Avant.\n\n\`\`\`mermaid\n${DIAGRAM}\`\`\`\n\n\`\`\`bash\necho "pas un diagramme [x]"\n\`\`\`\n`
  const asked = []
  const { text, issues } = await translateMermaidBlocks(markdown, async (strings) => {
    asked.push(strings)
    return Object.fromEntries(Object.entries(strings).map(([key, value]) => [key, `EN(${value})`]))
  })
  assert.deepEqual(issues, [])
  assert.equal(asked.length, 1)
  assert.deepEqual(Object.values(asked[0]), ['ticket #2', "note d'impact", 'vous relisez la note', 'APPROVED, pas suivant', 'rapport et diff'].filter(isTranslatable))
  assert.match(text, /L\(\["EN\(vous relisez la note\)"\]\)/)
  assert.match(text, /E\[explorer\]/)
  assert.ok(text.startsWith('Avant.\n\n```mermaid\nflowchart TD\n'))
  assert.ok(text.endsWith('```bash\necho "pas un diagramme [x]"\n```\n'))
})

test('translateMermaidBlocks: a refused label keeps the source and is reported', async () => {
  const markdown = '```mermaid\nflowchart TD\n  A[Début du run] --> B[Fin du run]\n```'
  const { text, issues } = await translateMermaidBlocks(markdown, async () => ({ 1: '', 2: 'End of the run' }))
  assert.match(text, /A\[Début du run\]/)
  assert.match(text, /B\[End of the run\]/)
  assert.equal(issues.length, 1)
})

test('mermaidSkeleton: a diagram and its translation share one skeleton', async () => {
  const markdown = `\`\`\`mermaid\n${DIAGRAM}\`\`\``
  const { text } = await translateMermaidBlocks(markdown, async (strings) =>
    Object.fromEntries(Object.keys(strings).map((key) => [key, `traduit (${key})`]))
  )
  assert.notEqual(text, markdown)
  assert.equal(mermaidSkeleton(text), mermaidSkeleton(markdown))
})

test('containsMermaid', () => {
  assert.equal(containsMermaid('```mermaid\nflowchart TD\n```'), true)
  assert.equal(containsMermaid('```js\nconst a = 1\n```'), false)
})
