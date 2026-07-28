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

// Une traduction ne change pas d'ordre de grandeur en longueur. Un écart
// massif signale une dérive, pas une traduction : constaté en pratique sur un
// segment isolé et court, un modèle peut inventer un paragraphe entier
// ("La dernière partie de ce cours est consacrée au...") au lieu de traduire
// la phrase qu'on lui a donnée.
const MAX_LENGTH_RATIO = 2
const LENGTH_RATIO_FLOOR = 0.4
// En dessous de ce nombre de caractères, le ratio n'a pas de sens : un titre de
// deux mots peut légitimement doubler de longueur d'une langue à l'autre.
const MIN_LENGTH_FOR_RATIO = 25

function lengthIssue(sourceText, translatedText) {
  const source = sourceText.trim().length
  const translated = translatedText.trim().length
  if (source < MIN_LENGTH_FOR_RATIO) return null

  const ratio = translated / source
  if (ratio <= MAX_LENGTH_RATIO && ratio >= LENGTH_RATIO_FLOOR) return null
  return `longueur : ${source} caractères dans la source, ${translated} dans la traduction`
}

// Les blocs de code sont remplacés par des marqueurs avant l'appel au modèle :
// la traduction doit rendre exactement les mêmes, ni un de moins (bloc de code
// perdu), ni un de plus (marqueur inventé, également constaté en pratique).
function protectedTokenIssue(sourceText, translatedText) {
  const tokensOf = (text) => (text.match(/%%%PROTECTED_\d+%%%/g) ?? []).sort().join(',')
  const source = tokensOf(sourceText)
  const translated = tokensOf(translatedText)
  if (source === translated) return null
  return `marqueurs de bloc de code : "${source}" dans la source, "${translated}" dans la traduction`
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
    issues.push(`références [n] : ${sourceRefs} dans la source, ${translatedRefs} dans la traduction`)
  }

  const sourceHeadings = countHeadingLines(sourceText)
  const translatedHeadings = countHeadingLines(translatedText)
  if (sourceHeadings !== translatedHeadings) {
    issues.push(`titres Markdown : ${sourceHeadings} dans la source, ${translatedHeadings} dans la traduction`)
  }

  return issues
}
