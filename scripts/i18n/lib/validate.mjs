// Safety net against content loss by the model (observed in practice: a small
// local model can merge two paragraphs and make a whole sentence disappear,
// along with its [n] reference). We compare simple structural signals between
// the protected text sent to the model and the translation received, not a
// semantic check, just enough to detect that "a piece is missing".
function countMatches(text, re) {
  return (text.match(re) ?? []).length
}

function countHeadingLines(text) {
  return text.split('\n').filter((line) => /^#{1,6}\s/.test(line)).length
}

// A translation does not change order of magnitude in length. A massive gap
// signals drift, not a translation: observed in practice on a short isolated
// segment, a model can invent a whole paragraph ("The final part of this course
// is dedicated to...") instead of translating the sentence it was given.
const MAX_LENGTH_RATIO = 2
const LENGTH_RATIO_FLOOR = 0.4
// Below this number of characters the ratio is meaningless: a two-word heading
// can legitimately double in length from one language to the next.
const MIN_LENGTH_FOR_RATIO = 25

function lengthIssue(sourceText, translatedText) {
  const source = sourceText.trim().length
  const translated = translatedText.trim().length
  if (source < MIN_LENGTH_FOR_RATIO) return null

  const ratio = translated / source
  if (ratio <= MAX_LENGTH_RATIO && ratio >= LENGTH_RATIO_FLOOR) return null
  return `length: ${source} characters in the source, ${translated} in the translation`
}

// Code blocks are replaced by markers before the model call: the translation
// must return exactly the same ones, neither one fewer (a lost code block) nor
// one more (an invented marker, also observed in practice).
function protectedTokenIssue(sourceText, translatedText) {
  const tokensOf = (text) => (text.match(/%%%PROTECTED_\d+%%%/g) ?? []).sort().join(',')
  const source = tokensOf(sourceText)
  const translated = tokensOf(translatedText)
  if (source === translated) return null
  return `code block markers: "${source}" in the source, "${translated}" in the translation`
}

export function diffSignals(sourceText, translatedText) {
  const issues = []

  const length = lengthIssue(sourceText, translatedText)
  if (length) issues.push(length)

  const tokens = protectedTokenIssue(sourceText, translatedText)
  if (tokens) issues.push(tokens)

  const sourceRefs = countMatches(sourceText, /\[\d+\]/g)
  const translatedRefs = countMatches(translatedText, /\[\d+\]/g)
  if (sourceRefs !== translatedRefs) {
    issues.push(`[n] references: ${sourceRefs} in the source, ${translatedRefs} in the translation`)
  }

  const sourceHeadings = countHeadingLines(sourceText)
  const translatedHeadings = countHeadingLines(translatedText)
  if (sourceHeadings !== translatedHeadings) {
    issues.push(`Markdown headings: ${sourceHeadings} in the source, ${translatedHeadings} in the translation`)
  }

  return issues
}
