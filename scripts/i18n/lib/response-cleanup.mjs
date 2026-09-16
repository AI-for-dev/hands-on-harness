// Model-agnostic safety net: some local models, the smaller ones especially,
// do not always obey "answer with the translated Markdown only" and wrap their
// answer in a single code block, sometimes preceded by an introductory sentence
// ("Here is the translation:"). We only unwrap when the fence covers (almost)
// the entire answer, so as never to touch a real code block that is part of the
// translated content.
// A code block marker alone on its line must stay that way: the model sometimes
// aligns that line with the indentation of the neighbouring paragraph, and the
// block restored in its place then ends up shifted - an indented fence is not
// the same thing in Markdown. The repair is mechanical, hence preferable to
// another call: we put the marker back alone on its line. The block's own
// indentation is part of the protected block and comes back with it.
function unindentMarkerLines(text) {
  return text.replaceAll(/^[ \t]+(%%%PROTECTED_\d+%%%)[ \t]*$/gm, '$1')
}

export function cleanupTranslationResponse(raw) {
  const text = unindentMarkerLines(raw.trim())
  const lines = text.split('\n')

  const openIdx = lines.findIndex((line) => /^```[\w-]*\s*$/.test(line.trim()))
  if (openIdx === -1) return text

  let closeIdx = -1
  for (let i = lines.length - 1; i > openIdx; i--) {
    if (lines[i].trim() === '```') {
      closeIdx = i
      break
    }
  }
  if (closeIdx === -1) return text

  const preamble = lines.slice(0, openIdx).join('\n').trim()
  const trailer = lines.slice(closeIdx + 1).join('\n').trim()
  const MAX_PREAMBLE_LENGTH = 200
  if (preamble.length > MAX_PREAMBLE_LENGTH || trailer.length > 0) return text

  return lines.slice(openIdx + 1, closeIdx).join('\n')
}

// A `:::` container often spans several segments: the one that opens it carries
// no closing fence, which invites the model to add one, shutting the box several
// paragraphs early. Observed on "::: info Exercice (en salle)", where the
// exercise lost its starting-point file. The repair is mechanical, hence
// preferable to another call: we drop the fence the source did not have. Only a
// trailing one is dropped, and only when the count is off by exactly one, so a
// container the source really closes is never touched.
export function dropAddedContainerFence(sourceSegment, translatedSegment) {
  const fences = (text) => (text.match(/^:::/gm) ?? []).length
  if (fences(translatedSegment) !== fences(sourceSegment) + 1) return translatedSegment

  const lines = translatedSegment.split('\n')
  if (lines.at(-1).trim() !== ':::') return translatedSegment
  return lines.slice(0, -1).join('\n').trimEnd()
}
