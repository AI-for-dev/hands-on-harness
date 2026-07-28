// Protège les blocs de code (```/~~~) pour qu'un LLM ne les traduise ni ne
// les altère : on les remplace par un jeton opaque avant l'appel au modèle,
// puis on les restitue tels quels après traduction.
//
// La capture `{3,}` (au lieu de `` ``` `` figé) et le backreference \2 sont
// importants pour les fences imbriquées : un exemple qui montre comment
// écrire un bloc ```js s'enrobe souvent dans une fence à 4 backticks
// (````md ... ````). Sans capturer la longueur exacte de l'ouvrant, la
// fermeture la plus proche (les 3 backticks internes) serait prise à tort
// pour la fin du bloc protégé.
//
// L'indentation de l'ouvrant est capturée (\1) et exigée sur le fermant : un
// bloc de code dans un élément de liste est indenté de deux ou quatre espaces,
// et ce cas est fréquent dans le cours. Sans lui, ces blocs partaient au
// modèle comme du texte ordinaire - avec le résultat attendu : des commandes
// (`/tools`, `\resume`) « traduites ».
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm

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
