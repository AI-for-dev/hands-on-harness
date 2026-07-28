// Index des segments déjà traduits (i18n/segments.json).
//
// On n'y stocke pas les traductions elles-mêmes : elles vivent déjà dans
// content/<lang>/. On ne garde qu'une paire d'empreintes par segment, dans
// l'ordre du fichier :
//
//   "<empreinte du segment source>:<empreinte du segment traduit>"
//
// Relire l'index consiste donc à redécouper le fichier traduit existant et à
// vérifier, segment par segment, que son empreinte est bien celle enregistrée.
// Deux conséquences voulues :
//
// - aucune duplication du texte traduit dans le dépôt (pas de cache qui
//   doublerait content/en + content/es et polluerait les diffs) ;
// - un index périmé ou une traduction retouchée à la main ne peut pas
//   produire une réutilisation erronée : la vérification échoue et le
//   segment concerné est simplement retraduit.
//
// Chaque entrée retient aussi les règles de traduction (`rules` : empreinte du
// prompt, du glossaire et du guide de style) sous lesquelles elle a été
// produite. Modifier ces règles invalide toutes les traductions, comme
// documenté dans i18n/README.md - mais l'index sait encore, dans ce cas, quelle
// traduction correspondait au texte source : c'est ce qui permet de la
// conserver plutôt que de livrer une traduction manifestement dégradée.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { sha256 } from './hash.mjs'
import { structuralSignature } from './segments.mjs'

// 64 bits d'empreinte : largement assez pour quelques milliers de segments,
// et un index qui reste lisible à l'œil.
const HASH_LENGTH = 16

export function segmentHash(text) {
  return sha256(text).slice(0, HASH_LENGTH)
}

export function loadSegmentIndex(indexPath) {
  if (!existsSync(indexPath)) return {}
  return JSON.parse(readFileSync(indexPath, 'utf8'))
}

// Écrit l'index avec des clés triées : l'ordre ne doit pas dépendre de
// l'ordre de parcours du disque, sinon le fichier généré produit des diffs
// fantômes d'une machine à l'autre. Ne réécrit rien si le contenu est
// inchangé, pour que le fichier n'apparaisse pas modifié après un run qui
// n'a rien traduit.
export function saveSegmentIndex(indexPath, index) {
  const sorted = {}
  for (const relPath of Object.keys(index).sort()) {
    sorted[relPath] = {}
    for (const lang of Object.keys(index[relPath]).sort()) {
      sorted[relPath][lang] = index[relPath][lang]
    }
  }
  const serialized = JSON.stringify(sorted, null, 2) + '\n'
  if (existsSync(indexPath) && readFileSync(indexPath, 'utf8') === serialized) return
  writeFileSync(indexPath, serialized, 'utf8')
}

export function getIndexEntry(index, relPath, lang) {
  return index[relPath]?.[lang]
}

export function setIndexEntry(index, relPath, lang, entry) {
  index[relPath] ??= {}
  index[relPath][lang] = entry
}

// Oublie les pages dont le fichier source a disparu : sans ça, l'index (comme
// le manifeste) continue à décrire des traductions orphelines.
export function pruneByRelPath(state, keepRelPaths) {
  let pruned = 0
  for (const relPath of Object.keys(state)) {
    if (keepRelPaths.has(relPath)) continue
    delete state[relPath]
    pruned += 1
  }
  return pruned
}

export function buildBodyPairs(sourceSegments, translatedSegments) {
  return sourceSegments.map(
    (segment, i) => `${segmentHash(segment)}:${segmentHash(translatedSegments[i])}`
  )
}

// Les deux tables dont a besoin une traduction incrémentale, pour le corps
// comme pour le front-matter :
//
// - `current` : ce qui est réutilisable tel quel, c'est-à-dire traduit sous les
//   règles de traduction en vigueur. Vide si les règles ont changé, ce qui
//   force la retraduction de tout le corpus (comportement documenté).
// - `previous` : ce qui a été traduit sous d'autres règles. Ce n'est plus la
//   référence, mais ça reste une traduction correcte du même texte source :
//   c'est la réserve dans laquelle puiser quand une nouvelle traduction est
//   jugée dégradée par les contrôles d'intégrité.
export function bodyReuse(entry, rulesId, existingTargetSegments) {
  const previous = reusableBodyTranslations(entry?.body, existingTargetSegments)
  return { current: entry?.rules === rulesId ? previous : new Map(), previous }
}

export function frontmatterReuse(entry, rulesId, existingTargetStrings) {
  const previous = reusableFrontmatterTranslations(entry?.frontmatter, existingTargetStrings)
  return { current: entry?.rules === rulesId ? previous : new Map(), previous }
}

// Reconstruit la table "empreinte source -> texte déjà traduit" à partir de
// l'index et du fichier traduit existant. Toute paire dont l'empreinte cible
// ne correspond plus au fichier est ignorée (segment retraduit).
export function reusableBodyTranslations(pairs, existingTargetSegments) {
  const reusable = new Map()
  if (!Array.isArray(pairs) || pairs.length !== existingTargetSegments.length) return reusable

  pairs.forEach((pair, i) => {
    const [src, tgt] = pair.split(':')
    const translated = existingTargetSegments[i]
    if (tgt && src && segmentHash(translated) === tgt) reusable.set(src, translated)
  })
  return reusable
}

// Adopte une traduction produite avant l'existence de l'index (ou retouchée à
// la main) : la source et sa traduction sont connues à jour, il suffit de les
// apparier segment par segment. On refuse l'appariement au moindre doute -
// nombre de segments différent, ou structure qui ne correspond pas - car un
// alignement décalé ferait réutiliser la traduction du paragraphe voisin.
export function adoptBodyPairs(sourceSegments, translatedSegments) {
  if (sourceSegments.length !== translatedSegments.length) return null
  for (let i = 0; i < sourceSegments.length; i++) {
    if (structuralSignature(sourceSegments[i]) !== structuralSignature(translatedSegments[i])) {
      return null
    }
  }
  return buildBodyPairs(sourceSegments, translatedSegments)
}

export function buildFrontmatterPairs(sourceStrings, translatedStrings) {
  const pairs = {}
  for (const [key, source] of Object.entries(sourceStrings)) {
    const translated = translatedStrings[key]
    if (typeof translated !== 'string') continue
    pairs[key] = `${segmentHash(source)}:${segmentHash(translated)}`
  }
  return pairs
}

// Même principe que pour le corps, mais l'alignement se fait par chemin YAML
// (`hero.name`, ...) plutôt que par position.
export function reusableFrontmatterTranslations(pairs, existingTargetStrings) {
  const reusable = new Map()
  if (!pairs) return reusable

  for (const [key, pair] of Object.entries(pairs)) {
    const [src, tgt] = pair.split(':')
    const translated = existingTargetStrings[key]
    if (typeof translated !== 'string') continue
    if (tgt && src && segmentHash(translated) === tgt) reusable.set(src, translated)
  }
  return reusable
}
