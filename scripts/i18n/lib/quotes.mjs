// Keeps a quotation's original wording in the language it was written in.
//
// A course page may quote someone in another language, translated by hand in
// the French source. Left to the pipeline, the page in the quote's own language
// would carry the model's translation of that French translation, presented as
// the author's words. So the source holds the original too, in a code block
// placed right after the translated quote:
//
//   > L'IA est un outil, tout comme d'autres outils que nous utilisons.
//
//   ```quote en
//   AI is a tool, just like other tools we use.
//   ```
//
// Being a code block, the original never reaches the model. In the translation
// into its own language, the translated quote is replaced by the original,
// verbatim; the other languages translate the quote like any paragraph. The
// site shows the block as a collapsible "original text" and hides it on the
// page in its own language (see .vitepress/config.mts).

const QUOTE_FENCE_RE = /^(`{3,}|~{3,})quote[ \t]+([a-z]{2,3}(?:-[A-Za-z]+)?)[ \t]*\n([\s\S]*?)\n\1[ \t]*$/
const CONTAINS_QUOTE_FENCE_RE = /^[ \t]*(`{3,}|~{3,})quote[ \t]/m

// `{ lang, original }` when the segment is a quote block, null otherwise.
export function parseQuoteFence(segment) {
  const match = segment.match(QUOTE_FENCE_RE)
  return match ? { lang: match[2], original: match[3] } : null
}

export function asBlockquote(text) {
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? '>' : `> ${line}`))
    .join('\n')
}

// Maps the index of each translated quote to its original, for the quotes whose
// original is written in `langCode`. A quote block that does not stand right
// after a quote is an authoring mistake, reported rather than guessed at: the
// translated page would otherwise show the model's translation as the author's
// words.
export function originalQuotes(segments, langCode) {
  const substitutions = new Map()
  for (const [i, segment] of segments.entries()) {
    const quote = parseQuoteFence(segment)
    if (!quote) {
      if (CONTAINS_QUOTE_FENCE_RE.test(segment)) {
        throw new Error(`A \`quote\` block must be separated from the text around it by a blank line: "${segment.slice(0, 60)}..."`)
      }
      continue
    }
    if (i === 0 || !segments[i - 1].startsWith('>')) {
      throw new Error(`A \`quote ${quote.lang}\` block must directly follow the translated quote (a > blockquote)`)
    }
    if (quote.lang === langCode) substitutions.set(i - 1, asBlockquote(quote.original))
  }
  return substitutions
}
