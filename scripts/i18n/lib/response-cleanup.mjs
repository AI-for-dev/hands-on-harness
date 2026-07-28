// Filet de sécurité indépendant du modèle : certains modèles locaux,
// notamment les plus petits, n'obéissent pas toujours à la consigne
// "réponds uniquement avec le Markdown traduit" et enrobent leur réponse
// dans un unique bloc de code, parfois précédé d'une phrase d'introduction
// ("Voici la traduction :"). On ne désenveloppe que si la fence couvre
// (quasi) toute la réponse, pour ne jamais toucher un vrai bloc de code
// qui ferait partie du contenu traduit.
// Un marqueur de bloc de code seul sur sa ligne doit le rester : le modèle
// aligne parfois cette ligne sur l'indentation du paragraphe voisin, et le bloc
// restauré à sa place se retrouve alors décalé - une fence indentée n'est plus
// la même chose en Markdown. La réparation est mécanique, donc préférable à un
// nouvel appel : on remet le marqueur seul sur sa ligne. L'indentation propre
// au bloc, elle, fait partie du bloc protégé et est restituée avec lui.
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
