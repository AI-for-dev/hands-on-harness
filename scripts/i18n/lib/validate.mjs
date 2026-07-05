// Filet de sécurité contre la perte de contenu par le modèle (constaté en
// pratique : un petit modèle local peut fusionner deux paragraphes et faire
// disparaître une phrase entière, y compris une référence [n]). On compare
// des signaux structurels simples entre le texte protégé envoyé au modèle
// et la traduction reçue — pas une vérification sémantique, juste de quoi
// détecter qu'"il manque un morceau".
function countMatches(text, re) {
  return (text.match(re) ?? []).length
}

function countHeadingLines(text) {
  return text.split('\n').filter((line) => /^#{1,6}\s/.test(line)).length
}

export function diffSignals(sourceText, translatedText) {
  const issues = []

  const sourceRefs = countMatches(sourceText, /\[\d+\]/g)
  const translatedRefs = countMatches(translatedText, /\[\d+\]/g)
  if (sourceRefs !== translatedRefs) {
    issues.push(`références [n] : ${sourceRefs} dans la source, ${translatedRefs} dans la traduction`)
  }

  const sourceHeadings = countHeadingLines(sourceText)
  const translatedHeadings = countHeadingLines(translatedText)
  if (sourceHeadings !== translatedHeadings) {
    issues.push(`titres Markdown : ${sourceHeadings} dans la source, ${translatedHeadings} dans la traduction`)
  }

  return issues
}
