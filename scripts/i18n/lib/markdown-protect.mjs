// Protège les blocs de code (```/~~~) pour qu'un LLM ne les traduise ni ne
// les altère : on les remplace par un jeton opaque avant l'appel au modèle,
// puis on les restitue tels quels après traduction.
//
// La capture `{3,}` (au lieu de `` ``` `` figé) et le backreference \1 sont
// importants pour les fences imbriquées : un exemple qui montre comment
// écrire un bloc ```js s'enrobe souvent dans une fence à 4 backticks
// (````md ... ````). Sans capturer la longueur exacte de l'ouvrant, la
// fermeture la plus proche (les 3 backticks internes) serait prise à tort
// pour la fin du bloc protégé.
const FENCE_RE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm

export function protectCodeBlocks(markdown) {
  const blocks = []
  const protectedMd = markdown.replace(FENCE_RE, (match) => {
    blocks.push(match)
    return `%%%PROTECTED_${blocks.length - 1}%%%`
  })
  return { protectedMd, blocks }
}

export function restoreCodeBlocks(translatedMd, blocks) {
  let result = translatedMd
  blocks.forEach((block, i) => {
    result = result.split(`%%%PROTECTED_${i}%%%`).join(block)
  })
  return result
}
