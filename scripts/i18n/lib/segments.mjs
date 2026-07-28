// Splits a Markdown body into independently translatable segments (a Markdown
// "block": paragraph, heading, list, table, code block, ::: container...). This
// is the caching unit of the translation: when a French page moves, only the
// segments that actually changed go back to the LLM.
//
// Important invariant: code blocks are protected BEFORE splitting. Without
// that, a code block containing a blank line (very common) would be cut into
// two segments, and half a code block would be sent to the model.
import { protectCodeBlocks, restoreCodeBlocks } from './markdown-protect.mjs'

// Markdown block separator = one or more blank lines (a "blank" line may
// contain spaces or tabs).
const SEPARATOR_RE = /(\n(?:[ \t]*\n)+)/

const DEFAULT_SEPARATOR = '\n\n'

// Splits `body` into { segments, separators } such that
// joinSegments(segments, separators) rebuilds the body, up to the normalisation
// of edge whitespace. separators[i] is what separates segments[i] from
// segments[i + 1], which keeps the spacing the source intended (one blank line,
// two, ...) rather than reinventing it when rebuilding.
export function splitBody(body) {
  const { protectedMd, blocks } = protectCodeBlocks(body)

  // We normalise the document's edge whitespace, never a block's indentation: a
  // bullet list indents its continuation paragraphs, and unindenting the first
  // line of a block is enough to change the Markdown (a list `- ` becoming a
  // paragraph, a list fence moving back to top level...).
  const parts = protectedMd.replace(/^(?:[ \t]*\n)+/, '').split(SEPARATOR_RE)

  const segments = []
  const separators = []
  let pendingSeparator = null

  // parts alternates content / separator (split's capturing group): even
  // indices are content, odd ones are separators.
  for (let i = 0; i < parts.length; i += 2) {
    const text = parts[i].replace(/\s+$/, '')
    if (text.trim() === '') continue
    if (segments.length > 0) separators.push(normalizeSeparator(pendingSeparator))
    segments.push(restoreCodeBlocks(text, blocks))
    pendingSeparator = parts[i + 1] ?? null
  }

  return { segments, separators }
}

// The number of blank lines is preserved, but not the spaces they contain: the
// translated file must not inherit trailing whitespace from the source,
// otherwise the trailing-whitespace pre-commit hook fixes it right after it is
// generated.
function normalizeSeparator(separator) {
  if (!separator) return DEFAULT_SEPARATOR
  return separator.replaceAll(/[ \t]+$/gm, '')
}

export function joinSegments(segments, separators) {
  return segments
    .map((segment, i) => (i === 0 ? segment : (separators[i - 1] ?? DEFAULT_SEPARATOR) + segment))
    .join('')
}

// A segment is "copied as is" when it contains no letter outside code blocks: a
// lone code block, a `---` horizontal rule, a line of badges... Nothing to
// translate, hence no model call.
export function isPassthrough(segment) {
  const { protectedMd } = protectCodeBlocks(segment)
  const withoutTokens = protectedMd.replaceAll(/%%%PROTECTED_\d+%%%/g, '')
  return !/\p{L}/u.test(withoutTokens)
}

// Structural signature of a segment, used to check that an existing translation
// really lines up segment by segment with its source (see
// scripts/i18n/lib/segment-index.mjs). A heading stays a heading, a table stays
// a table, a code block stays identical to the character: when that does not
// hold, the alignment has shifted and must absolutely not be used to reuse
// translations.
export function structuralSignature(segment) {
  if (isPassthrough(segment)) return `raw:${segment}`

  const firstLine = segment.split('\n', 1)[0]
  const headingMatch = firstLine.match(/^(#{1,6})\s/)
  if (headingMatch) return `h${headingMatch[1].length}`
  if (/^:::/.test(firstLine)) return 'container'
  if (/^\s*\|/.test(firstLine)) return 'table'
  if (/^\s*([-*+]|\d+[.)])\s/.test(firstLine)) return 'list'
  if (/^>/.test(firstLine)) return 'quote'
  return 'p'
}

// A chunk is a contiguous range of segments [start, end] sent to the model in a
// single call. It holds the segments of the range that must be translated
// (`keep`) and, around them, neighbouring already translated segments whose
// translation will be discarded: they are there only to provide context.
//
// That context is not a luxury. Tested for real with qwen-3.6-35b-instruct:
// sent alone, "Dernier paragraphe, après un filet horizontal." comes back
// translated as... "Bonjour". A short isolated fragment falls outside the regime
// where a model translates correctly; two paragraphs around it are enough to
// bring it back in. Incidentally, two nearby edits cost less as one call than as
// two.
// At the other end, too large a chunk is just as bad as too short a fragment:
// sent in one go, a whole page (~9,000 characters) sent qwen-3.6-35b-instruct
// into endless generation, up to the backend safety cutoff, three attempts in a
// row. Chunks of a few thousand characters stay in a regime where the model
// holds the instruction - and they go out in parallel, so it is also faster.
const DEFAULT_MIN_CHUNK_CHARS = 400
const DEFAULT_MAX_CHUNK_CHARS = 3000
const DEFAULT_MAX_GAP_CHARS = 600
const DEFAULT_MAX_CONTEXT_SEGMENTS = 6

export function buildChunks(segments, indicesToTranslate, options = {}) {
  const {
    minChars = DEFAULT_MIN_CHUNK_CHARS,
    maxChars = DEFAULT_MAX_CHUNK_CHARS,
    maxGapChars = DEFAULT_MAX_GAP_CHARS,
    maxContextSegments = DEFAULT_MAX_CONTEXT_SEGMENTS
  } = options
  if (indicesToTranslate.length === 0) return []

  const pending = new Set(indicesToTranslate)

  // Two segments to translate separated by little text fit in a single call:
  // what separates them goes along as context rather than splitting.
  const ranges = []
  for (const index of indicesToTranslate) {
    const last = ranges[ranges.length - 1]
    const gap = last ? charsBetween(segments, last.end, index) : Infinity
    if (last && gap <= maxGapChars) last.end = index
    else ranges.push({ start: index, end: index })
  }

  for (const range of ranges) growRange(range, segments, minChars, maxContextSegments)

  // Growth can make two neighbouring ranges overlap: sending them separately
  // would translate the same segments twice.
  const merged = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end + 1) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }

  return merged
    .flatMap((range) => splitOversized(range, segments, maxChars, minChars))
    .map(({ start, end }) => ({
      start,
      end,
      keep: rangeIndices(start, end).filter((index) => pending.has(index))
    }))
    .filter((chunk) => chunk.keep.length > 0)
}

// Splits an over-long range into successive slices. Filling is greedy; a final
// slice that would be too thin is folded back into the previous one, even if
// that overshoots maxChars a little - a slightly large chunk beats an isolated
// two-line fragment.
function splitOversized(range, segments, maxChars, minChars) {
  if (translatableChars(range, segments) <= maxChars) return [range]

  const slices = []
  let current = { start: range.start, end: range.start }
  for (let index = range.start + 1; index <= range.end; index++) {
    const grown = { start: current.start, end: index }
    if (translatableChars(grown, segments) > maxChars && translatableChars(current, segments) > 0) {
      slices.push(current)
      current = { start: index, end: index }
    } else {
      current = grown
    }
  }
  slices.push(current)

  const last = slices[slices.length - 1]
  if (slices.length > 1 && translatableChars(last, segments) < minChars) {
    slices.pop()
    slices[slices.length - 1].end = last.end
  }
  return slices
}

function rangeIndices(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function charsBetween(segments, from, to) {
  return rangeIndices(from + 1, to - 1).reduce((total, i) => total + segments[i].length, 0)
}

// Length of the actually translatable text of a range: a large code block
// brings no writing context, so it must not make the chunk look substantial
// enough.
function translatableChars(range, segments) {
  return rangeIndices(range.start, range.end)
    .filter((i) => !isPassthrough(segments[i]))
    .reduce((total, i) => total + segments[i].length, 0)
}

function growRange(range, segments, minChars, maxContextSegments) {
  let added = 0
  while (
    translatableChars(range, segments) < minChars &&
    added < maxContextSegments &&
    (range.start > 0 || range.end < segments.length - 1)
  ) {
    // We extend upstream first: to translate a paragraph, what comes before it
    // (section heading, introductory sentence) carries the most useful
    // context.
    if (range.start > 0) {
      range.start -= 1
      added += 1
    }
    if (translatableChars(range, segments) >= minChars || added >= maxContextSegments) break
    if (range.end < segments.length - 1) {
      range.end += 1
      added += 1
    }
  }
}
