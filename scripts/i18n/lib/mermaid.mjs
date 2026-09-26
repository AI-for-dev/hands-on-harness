// Translates the labels of Mermaid diagrams, and nothing else.
//
// A Mermaid block is a code block, so markdown-protect.mjs hides it from the
// model like any other: right for code, wrong for a diagram whose boxes and
// arrows carry French prose. Handing the whole block to the model would put the
// diagram's syntax at its mercy, so the split is done by our code instead: the
// labels are extracted here, the model translates them as a JSON object of
// strings, and they are put back in place. The skeleton of the diagram (ids,
// arrows, directives, line order) is never seen by the model, so it cannot be
// broken.
//
// Only flowcharts (`flowchart` / `graph`) are parsed, the only kind the course
// uses. Any other diagram is left as is rather than half understood.

const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})mermaid[ \t]*\n([\s\S]*?)^\1\2[ \t]*$/gm

// Node shapes, longest opener first: `([` must win over `(`, `[[` over `[`.
const SHAPES = [
  ['([', '])'],
  ['[[', ']]'],
  ['[(', ')]'],
  ['((', '))'],
  ['{{', '}}'],
  ['[/', '/]'],
  ['[\\', '\\]'],
  ['[', ']'],
  ['(', ')'],
  ['{', '}'],
  ['>', ']']
]

// Edge labels written inline: `-- text -->`, `== text ==>`, `-. text .->`.
const INLINE_EDGE_RE = /(--|==|-\.)[ \t]+(.+?)[ \t]+(-->|---|==>|===|\.->|\.-)/y
// Edge labels written between pipes, after an arrow: `-->|text|`.
const PIPE_EDGE_RE = /\|("?)(.+?)\1\|/y
const ID_RE = /[A-Za-z_][\w-]*/y

const DIRECTIVE_RE = /^\s*(%%|classDef\b|class\b|style\b|linkStyle\b|click\b|direction\b|end\s*$)/

// Characters that end an unquoted label early, or that Mermaid reads as syntax.
const UNSAFE_UNQUOTED_RE = /[[\](){}|"<>]/

export function containsMermaid(markdown) {
  FENCE_RE.lastIndex = 0
  return FENCE_RE.test(markdown)
}

// Returns the label spans of one diagram body (the text between the fences):
// `[{ start, end, text, quoted }]`, offsets in the body. A diagram that is not a
// flowchart has none.
export function extractLabels(diagram) {
  const firstLine = diagram.split('\n').find((line) => line.trim() !== '') ?? ''
  if (!/^\s*(flowchart|graph)\b/.test(firstLine)) return []

  const spans = []
  let offset = 0
  for (const line of diagram.split('\n')) {
    if (line !== firstLine && !DIRECTIVE_RE.test(line)) spans.push(...lineLabels(line, offset))
    offset += line.length + 1
  }
  return spans
}

function lineLabels(line, offset) {
  const spans = []
  let i = 0
  while (i < line.length) {
    const edge = matchAt(INLINE_EDGE_RE, line, i)
    if (edge) {
      const textStart = i + edge[0].indexOf(edge[2], edge[1].length)
      const quoted = edge[2].length > 1 && edge[2].startsWith('"') && edge[2].endsWith('"')
      const inner = quoted ? [textStart + 1, textStart + edge[2].length - 1] : [textStart, textStart + edge[2].length]
      spans.push(labelSpan(line, offset, inner[0], inner[1], quoted))
      i += edge[0].length
      continue
    }
    const pipe = matchAt(PIPE_EDGE_RE, line, i)
    if (pipe && /[-=.>ox]$/.test(line.slice(0, i).trimEnd())) {
      const textStart = i + 1 + pipe[1].length
      spans.push(labelSpan(line, offset, textStart, textStart + pipe[2].length, pipe[1] === '"'))
      i += pipe[0].length
      continue
    }
    const id = matchAt(ID_RE, line, i)
    if (id && (i === 0 || !/[\w-]/.test(line[i - 1]))) {
      const node = nodeLabel(line, i + id[0].length)
      if (node) {
        spans.push(labelSpan(line, offset, node.start, node.end, node.quoted))
        i = node.after
        continue
      }
      i += id[0].length
      continue
    }
    i += 1
  }
  return spans.filter((span) => span.text.trim() !== '')
}

function matchAt(re, text, index) {
  re.lastIndex = index
  return re.exec(text)
}

function nodeLabel(line, at) {
  for (const [open, close] of SHAPES) {
    if (!line.startsWith(open, at)) continue
    const start = at + open.length
    if (line[start] === '"') {
      const endQuote = line.indexOf('"', start + 1)
      if (endQuote !== -1 && line.startsWith(close, endQuote + 1)) {
        return { start: start + 1, end: endQuote, quoted: true, after: endQuote + 1 + close.length }
      }
    }
    const end = line.indexOf(close, start)
    if (end === -1) return null
    return { start, end, quoted: false, after: end + close.length }
  }
  return null
}

function labelSpan(line, offset, start, end, quoted = false) {
  return { start: offset + start, end: offset + end, text: line.slice(start, end), quoted }
}

// A label worth translating holds prose. A single lowercase token (`explorer`,
// `planner`, `npm`) reads as an identifier - an agent's name, a command - and
// stays as written, as do labels with no letter at all (`#2`).
export function isTranslatable(text) {
  const trimmed = text.trim()
  if (!/\p{L}/u.test(trimmed)) return false
  return !/^[a-z][a-z0-9_.-]*$/.test(trimmed)
}

// Puts translated labels back into a diagram body. `translations` maps a label's
// index in `spans` to its new text; a missing index keeps the source label.
export function applyLabels(diagram, spans, translations) {
  let result = ''
  let cursor = 0
  spans.forEach((span, index) => {
    result += diagram.slice(cursor, span.start)
    const translated = translations.get(index)
    result += translated === undefined ? span.text : renderLabel(translated, span)
    cursor = span.end
  })
  return result + diagram.slice(cursor)
}

// A translation may bring a character the unquoted source never had (a bracket,
// a quote): Mermaid would read it as syntax. Such a label is quoted, with
// Mermaid's own escape for an inner quote. An already quoted source stays
// quoted, its quotes being outside the span.
function renderLabel(text, span) {
  const clean = text.replaceAll(/\s*\n\s*/g, ' ').trim()
  if (span.quoted) return clean.replaceAll('"', '#quot;')
  if (!UNSAFE_UNQUOTED_RE.test(clean)) return clean
  return `"${clean.replaceAll('"', '#quot;')}"`
}

// A translated label is refused when it is empty, spans several lines, or
// changes order of magnitude in length: the diagram keeps the source label
// rather than a box the model filled with something else.
export function labelIssue(source, translated) {
  if (typeof translated !== 'string' || translated.trim() === '') return 'empty label'
  if (/\n/.test(translated.trim())) return 'label on several lines'
  const ratio = translated.trim().length / source.trim().length
  if (source.trim().length >= 12 && (ratio > 2.5 || ratio < 0.3)) {
    return `label length: "${source}" became "${translated}"`
  }
  return null
}

// Translates the labels of every Mermaid block of `markdown`, leaving the rest
// untouched. `translateStrings(object)` receives `{ "1": "texte", ... }` and
// returns the same keys translated. Returns `{ text, issues }`.
export async function translateMermaidBlocks(markdown, translateStrings) {
  const blocks = []
  FENCE_RE.lastIndex = 0
  for (const match of markdown.matchAll(FENCE_RE)) blocks.push(match)
  if (blocks.length === 0) return { text: markdown, issues: [] }

  const issues = []
  let result = ''
  let cursor = 0
  for (const match of blocks) {
    const [whole, , , diagram] = match
    const bodyStart = match.index + whole.indexOf(diagram)
    const spans = extractLabels(diagram)
    const wanted = spans.map((span, index) => [index, span]).filter(([, span]) => isTranslatable(span.text))

    const translations = new Map()
    if (wanted.length > 0) {
      const request = Object.fromEntries(wanted.map(([index, span]) => [String(index + 1), span.text.trim()]))
      const answer = await translateStrings(request)
      for (const [index, span] of wanted) {
        const translated = answer?.[String(index + 1)]
        const issue = labelIssue(span.text, translated)
        if (issue) issues.push(`mermaid: ${issue}`)
        else translations.set(index, translated)
      }
    }

    result += markdown.slice(cursor, bodyStart) + applyLabels(diagram, spans, translations)
    cursor = bodyStart + diagram.length
  }
  return { text: result + markdown.slice(cursor), issues }
}

// The diagram with its translatable labels blanked: what a source diagram and
// its translation must share. Used as the structural signature of a segment
// holding a diagram, so that the segment index still pairs them.
export function mermaidSkeleton(markdown) {
  FENCE_RE.lastIndex = 0
  return markdown.replaceAll(FENCE_RE, (whole, indent, fence, diagram) => {
    const spans = extractLabels(diagram)
    const blanked = new Map(spans.flatMap((span, index) => (isTranslatable(span.text) ? [[index, '…']] : [])))
    const skeleton = applyLabels(diagram, spans, blanked).replaceAll('"…"', '…')
    return whole.replace(diagram, () => skeleton)
  })
}
