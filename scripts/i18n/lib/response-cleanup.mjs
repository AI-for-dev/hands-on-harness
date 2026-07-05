// Filet de sécurité indépendant du modèle : certains modèles locaux,
// notamment les plus petits, n'obéissent pas toujours à la consigne
// "réponds uniquement avec le Markdown traduit" et enrobent leur réponse
// dans un unique bloc de code, parfois précédé d'une phrase d'introduction
// ("Voici la traduction :"). On ne désenveloppe que si la fence couvre
// (quasi) toute la réponse, pour ne jamais toucher un vrai bloc de code
// qui ferait partie du contenu traduit.
export function cleanupTranslationResponse(raw) {
  const text = raw.trim()
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
