// Découpe un corps Markdown en segments traduisibles indépendamment (un
// "bloc" Markdown : paragraphe, titre, liste, tableau, bloc de code,
// conteneur ::: ...). C'est l'unité de cache de la traduction : quand une
// page française bouge, seuls les segments réellement modifiés repartent
// vers le LLM.
//
// Invariant important : les blocs de code sont protégés AVANT le découpage.
// Sans ça, un bloc de code contenant une ligne vide (très fréquent) serait
// coupé en deux segments, et un demi-bloc de code partirait au modèle.
import { protectCodeBlocks, restoreCodeBlocks } from './markdown-protect.mjs'

// Séparateur de blocs Markdown = une ou plusieurs lignes vides (une ligne
// "vide" pouvant contenir des espaces ou des tabulations).
const SEPARATOR_RE = /(\n(?:[ \t]*\n)+)/

const DEFAULT_SEPARATOR = '\n\n'

// Découpe `body` en { segments, separators } tel que
// joinSegments(segments, separators) reconstruit le corps, à la
// normalisation des blancs de bord près (espaces en début/fin de segment).
// separators[i] est ce qui sépare segments[i] de segments[i + 1], ce qui
// permet de conserver l'espacement voulu par la source (une ligne vide,
// deux, ...) plutôt que de le réinventer à la reconstruction.
export function splitBody(body) {
  const { protectedMd, blocks } = protectCodeBlocks(body)

  // On normalise les blancs de bord du document, jamais l'indentation d'un
  // bloc : une liste à puces indente ses paragraphes de continuation, et
  // désindenter la première ligne d'un bloc suffit à changer le Markdown
  // (un `- ` de liste qui devient un paragraphe, une fence de liste qui
  // remonte au premier niveau...).
  const parts = protectedMd.replace(/^(?:[ \t]*\n)+/, '').split(SEPARATOR_RE)

  const segments = []
  const separators = []
  let pendingSeparator = null

  // parts alterne contenu / séparateur (le groupe capturant de split) :
  // les index pairs sont du contenu, les impairs des séparateurs.
  for (let i = 0; i < parts.length; i += 2) {
    const text = parts[i].replace(/\s+$/, '')
    if (text.trim() === '') continue
    if (segments.length > 0) separators.push(normalizeSeparator(pendingSeparator))
    segments.push(restoreCodeBlocks(text, blocks))
    pendingSeparator = parts[i + 1] ?? null
  }

  return { segments, separators }
}

// Le nombre de lignes vides est conservé, mais pas les espaces qu'elles
// contiennent : le fichier traduit ne doit pas hériter d'un blanc de fin de
// ligne présent dans la source, sinon le hook pre-commit trailing-whitespace
// le corrige juste après sa génération.
function normalizeSeparator(separator) {
  if (!separator) return DEFAULT_SEPARATOR
  return separator.replaceAll(/[ \t]+$/gm, '')
}

export function joinSegments(segments, separators) {
  return segments
    .map((segment, i) => (i === 0 ? segment : (separators[i - 1] ?? DEFAULT_SEPARATOR) + segment))
    .join('')
}

// Un segment est "recopiable tel quel" s'il ne contient aucune lettre en
// dehors des blocs de code : bloc de code seul, filet horizontal `---`,
// ligne de badges... Rien à traduire, donc aucun appel au modèle.
export function isPassthrough(segment) {
  const { protectedMd } = protectCodeBlocks(segment)
  const withoutTokens = protectedMd.replaceAll(/%%%PROTECTED_\d+%%%/g, '')
  return !/\p{L}/u.test(withoutTokens)
}

// Signature structurelle d'un segment, utilisée pour vérifier qu'une
// traduction existante s'aligne bien segment par segment sur sa source (voir
// scripts/i18n/lib/segment-index.mjs). Un titre reste un titre, un tableau
// reste un tableau, un bloc de code reste identique au caractère près : si ce
// n'est pas le cas, c'est que l'alignement a glissé et qu'il ne faut surtout
// pas s'en servir pour réutiliser des traductions.
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

// Un morceau est un intervalle contigu de segments [start, end] envoyé au
// modèle en un seul appel. Il contient les segments à traduire de
// l'intervalle (`keep`) et, autour d'eux, des segments voisins déjà traduits
// dont la traduction sera jetée : ils ne sont là que pour donner du contexte.
//
// Ce contexte n'est pas un luxe. Testé en conditions réelles avec
// qwen-3.6-35b-instruct : envoyé seul, "Dernier paragraphe, après un filet
// horizontal." revient traduit par... "Bonjour". Un fragment court et isolé
// sort du régime dans lequel un modèle traduit correctement ; deux
// paragraphes autour suffisent à le ramener dedans. Accessoirement, deux
// modifications proches coûtent moins cher en un appel qu'en deux.
// À l'autre bout, un morceau trop gros est tout aussi mauvais qu'un fragment
// trop court : envoyée d'un coup, une page entière (~9 000 caractères) a fait
// partir qwen-3.6-35b-instruct en génération infinie, jusqu'à la coupure de
// sécurité côté backend, trois tentatives de suite. Des morceaux de quelques
// milliers de caractères restent dans un régime où le modèle tient la
// consigne - et ils partent en parallèle, donc c'est aussi plus rapide.
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

  // Deux segments à traduire séparés par peu de texte tiennent dans un seul
  // appel : ce qui les sépare part comme contexte plutôt que de couper.
  const ranges = []
  for (const index of indicesToTranslate) {
    const last = ranges[ranges.length - 1]
    const gap = last ? charsBetween(segments, last.end, index) : Infinity
    if (last && gap <= maxGapChars) last.end = index
    else ranges.push({ start: index, end: index })
  }

  for (const range of ranges) growRange(range, segments, minChars, maxContextSegments)

  // La croissance peut faire se recouvrir deux intervalles voisins : les
  // envoyer séparément ferait traduire deux fois les mêmes segments.
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

// Découpe un intervalle trop long en tranches successives. Le remplissage est
// glouton ; une dernière tranche qui serait trop maigre est reversée dans la
// précédente, quitte à dépasser un peu maxChars - mieux vaut un morceau un peu
// gros qu'un fragment isolé de deux lignes.
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

// Longueur du texte réellement traduisible d'un intervalle : un gros bloc de
// code n'apporte aucun contexte de rédaction, il ne doit donc pas faire croire
// que le morceau est assez étoffé.
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
    // On étend d'abord vers l'amont : pour traduire un paragraphe, ce qui le
    // précède (titre de section, phrase d'introduction) porte le contexte le
    // plus utile.
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
