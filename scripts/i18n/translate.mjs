#!/usr/bin/env node
// Traduit les fichiers Markdown source (langue = config.sourceLang) vers les
// langues cibles, en ne retraduisant que ce qui a changé.
//
// La granularité est le segment Markdown (paragraphe, titre, liste, tableau,
// bloc de code...), pas le fichier : modifier une phrase dans un chapitre ne
// renvoie au modèle que le paragraphe concerné, pas le chapitre entier. Voir
// lib/segments.mjs (découpage) et lib/segment-index.mjs (index des segments
// déjà traduits, i18n/segments.json).
//
// "Changé" = le contenu du segment, le prompt système, le glossaire ou le
// guide de style a changé depuis la dernière traduction connue (voir
// manifest.json et lib/config.mjs). Chaque traduction est tracée avec le
// modèle qui l'a produite, pour audit en cas de dérive entre modèles.
//
// Usage :
//   node scripts/i18n/translate.mjs [--lang=en,es] [--file=index.md] [--dry-run] [--force]

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { ROOT_DIR, I18N_DIR, loadI18nContext } from './lib/config.mjs'
import { sha256 } from './lib/hash.mjs'
import { protectCodeBlocks, restoreCodeBlocks } from './lib/markdown-protect.mjs'
import {
  splitFrontmatter,
  collectTranslatableStrings,
  applyTranslatedStrings,
  serializeFrontmatter
} from './lib/frontmatter.mjs'
import { translateText, currentModelId } from './lib/backends.mjs'
import { cleanupTranslationResponse } from './lib/response-cleanup.mjs'
import { diffSignals } from './lib/validate.mjs'
import { loadManifest, saveManifest, getEntry, setEntry } from './lib/manifest.mjs'
import { splitBody, joinSegments, isPassthrough, buildChunks } from './lib/segments.mjs'
import { mapWithConcurrency } from './lib/pool.mjs'
import {
  loadSegmentIndex,
  saveSegmentIndex,
  getIndexEntry,
  setIndexEntry,
  pruneByRelPath,
  segmentHash,
  buildBodyPairs,
  adoptBodyPairs,
  bodyReuse,
  buildFrontmatterPairs,
  frontmatterReuse
} from './lib/segment-index.mjs'

// Trois tentatives, et non deux : mesuré sur ce corpus, un fragment court part
// en vrille environ une fois sur cinq avec un modèle de cette taille, et
// l'échec est indépendant d'une tentative à l'autre. Les tentatives
// supplémentaires ne coûtent que sur les fragments qui échouent.
const MAX_TRANSLATION_ATTEMPTS = 3
// Taille du morceau "resserré" tenté en dernier recours (segment + un voisin
// de chaque côté), quand un segment résiste au cadrage du morceau complet.
const NARROW_CHUNK_SEGMENTS = 3
const DEFAULT_CONCURRENCY = 4

const MANIFEST_PATH = path.join(I18N_DIR, 'manifest.json')
const SEGMENT_INDEX_PATH = path.join(I18N_DIR, 'segments.json')

function parseArgs(argv) {
  const args = { langs: null, files: null, dryRun: false, force: false }
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--force') args.force = true
    else if (arg.startsWith('--lang=')) args.langs = arg.slice('--lang='.length).split(',')
    else if (arg.startsWith('--file=')) args.files = arg.slice('--file='.length).split(',')
    else throw new Error(`Argument inconnu: ${arg}`)
  }
  return args
}

function walkMarkdownFiles(dir, targetLangCodes, base = dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relFromBase = path.relative(base, fullPath)
    const topSegment = relFromBase.split(path.sep)[0]
    if (entry.isDirectory()) {
      // On ne redescend jamais dans les dossiers de langues cibles : ce
      // sont des destinations générées, pas des sources.
      if (targetLangCodes.includes(topSegment)) continue
      files.push(...walkMarkdownFiles(fullPath, targetLangCodes, base))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  return files
}

// --- traduction d'un morceau de segments contigus ------------------------

// Un morceau part au modèle en un seul appel, ses segments séparés par une
// ligne vide. La réponse est redécoupée sur les lignes vides : elle doit
// rendre exactement autant de blocs qu'on en a envoyé, sinon on ne sait pas
// quelle traduction correspond à quel segment.
//
// `keep` liste les indices (relatifs au morceau) dont on veut réellement la
// traduction ; les autres segments n'ont été envoyés que comme contexte. Les
// contrôles d'intégrité ne portent donc que sur les segments retenus, pour ne
// pas marquer une page "à relire" à cause d'un segment de contexte jeté.
async function translateChunkOnce(sourceSegments, keep, ctx, lang) {
  const chunkText = joinSegments(sourceSegments, [])
  const { protectedMd, blocks } = protectCodeBlocks(chunkText)
  const systemPrompt = ctx.renderSystemPrompt(lang.label, lang.code)

  const raw = await translateText(ctx.config, systemPrompt, protectedMd)
  const cleaned = cleanupTranslationResponse(raw)
  const returned = splitBody(cleaned).segments

  // Une réponse vide n'est jamais une traduction valable : la garder comme
  // candidate reviendrait à effacer silencieusement un paragraphe.
  if (returned.length === 0) {
    return { candidates: new Map(), issues: ['réponse vide du modèle'] }
  }

  if (returned.length !== sourceSegments.length) {
    const alignment = `découpage : ${sourceSegments.length} bloc(s) envoyé(s), ${returned.length} reçu(s)`
    if (sourceSegments.length > 1) return { candidates: new Map(), issues: [alignment] }

    // Un segment unique : la réponse entière est sa traduction la plus
    // plausible, même mal découpée. On la garde comme candidate, mesurée
    // comme les autres.
    return {
      candidates: new Map([
        [0, { text: restoreCodeBlocks(cleaned, blocks), issues: [alignment, ...diffSignals(protectedMd, cleaned)] }]
      ]),
      issues: [alignment]
    }
  }

  const protectedSegments = splitBody(protectedMd).segments
  const candidates = new Map()
  for (const index of keep) {
    candidates.set(index, {
      text: restoreCodeBlocks(returned[index], blocks),
      issues: diffSignals(protectedSegments[index], returned[index])
    })
  }
  return { candidates, issues: [] }
}

// Traduit un morceau et renvoie, pour chaque segment demandé, la meilleure
// traduction obtenue : `{ text, issues }`, où `issues` vide signifie "a passé
// tous les contrôles".
//
// Un modèle (surtout un petit modèle local) peut fusionner deux paragraphes et
// faire disparaître une phrase entière au passage, ou rendre un fragment de
// réponse sans rapport. On retente donc, en ne redemandant que les segments
// encore non validés ; puis on reprend segment par segment, ce qui laisse
// beaucoup moins de latitude au modèle pour dériver.
async function translateChunk(sourceSegments, keep, ctx, lang) {
  const best = new Map()
  let pending = [...keep]
  let lastError = null

  for (let attempt = 1; attempt <= MAX_TRANSLATION_ATTEMPTS && pending.length > 0; attempt++) {
    let outcome
    try {
      outcome = await translateChunkOnce(sourceSegments, pending, ctx, lang)
      lastError = null
    } catch (err) {
      // Un appel qui échoue (modèle injoignable, génération qui s'emballe et se
      // fait couper) ne doit pas emporter tout le run : on retente, et on ne
      // renonce qu'après la dernière tentative.
      lastError = err
      console.warn(`  ⚠ tentative ${attempt}/${MAX_TRANSLATION_ATTEMPTS} échouée : ${err.message}`)
      continue
    }

    const stillPending = []
    for (const index of pending) {
      const candidate = outcome.candidates.get(index)
      if (!candidate) {
        stillPending.push(index)
        continue
      }
      // On ne remplace une candidate déjà retenue que par une meilleure.
      const previous = best.get(index)
      if (!previous || previous.issues.length > 0) best.set(index, candidate)
      if (candidate.issues.length > 0) stillPending.push(index)
    }
    pending = stillPending
  }

  if (pending.length === 0) return best

  // Dernier recours pour un segment qui résiste : le redemander dans un
  // morceau resserré, lui et ses voisins immédiats. Retenter le même morceau
  // ne fait que retirer le même dé ; changer le cadrage change la donne.
  // Mesuré sur ce corpus : des paragraphes qui échouent à chaque fois dans un
  // morceau de 3 000 caractères passent dans un morceau de trois blocs.
  if (sourceSegments.length > NARROW_CHUNK_SEGMENTS) {
    for (const index of pending) {
      const start = Math.max(0, index - 1)
      const end = Math.min(sourceSegments.length - 1, index + 1)
      let narrow
      try {
        narrow = await translateChunkOnce(sourceSegments.slice(start, end + 1), [index - start], ctx, lang)
      } catch (err) {
        console.warn(`  ⚠ morceau resserré échoué : ${err.message}`)
        continue
      }
      const candidate = narrow.candidates.get(index - start)
      if (candidate && (candidate.issues.length === 0 || !best.has(index))) {
        best.set(index, candidate)
      }
    }
    pending = pending.filter((index) => best.get(index)?.issues.length !== 0)
    if (pending.length === 0) return best
  }

  // Segments pour lesquels on n'a rien du tout, à distinguer de ceux dont on a
  // une traduction imparfaite : celle-là sera arbitrée plus haut (contre la
  // traduction précédente) et signalée, alors que rien du tout ne se rattrape
  // pas et impose de redemander.
  const empty = pending.filter((index) => !best.has(index))
  if (empty.length === 0) return best

  const fragment = `« ${sourceSegments[empty[0]].slice(0, 60)}... »`

  // Un morceau d'un seul segment ne peut plus se subdiviser : c'est le seul
  // endroit où l'on renonce, ce qui borne aussi la récursion ci-dessous.
  if (sourceSegments.length === 1) {
    const cause = lastError ? ` : ${lastError.message}` : ''
    throw new Error(
      `Aucune traduction exploitable pour le fragment ${fragment} après ` +
        `${MAX_TRANSLATION_ATTEMPTS} tentatives${cause}`
    )
  }

  // Le modèle n'a rien rendu d'utilisable pour ces segments dans le morceau
  // complet : on les reprend un par un. Une entrée plus courte le fait
  // beaucoup moins dériver - et c'est aussi ce qui sauve un morceau dont un
  // seul paragraphe déclenche une génération qui s'emballe.
  for (const index of empty) {
    const single = await translateChunk([sourceSegments[index]], [0], ctx, lang)
    const candidate = single.get(0)
    if (candidate) best.set(index, candidate)
  }
  return best
}

// --- front-matter --------------------------------------------------------

async function translateFrontmatterStrings(strings, ctx, lang) {
  const systemPrompt = ctx.renderFrontmatterPrompt(lang.label, lang.code)
  const raw = await translateText(ctx.config, systemPrompt, JSON.stringify(strings, null, 2))

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch (err) {
    throw new Error(`Réponse JSON invalide du modèle pour le front-matter: ${err.message}\n---\n${raw}`)
  }
}

// --- planification -------------------------------------------------------

// Établit, sans appeler le modèle, la liste de ce qui doit réellement être
// traduit : c'est ce plan que --dry-run affiche, et c'est lui qu'exécute un
// run normal. Les traductions réutilisables sont relues depuis le fichier
// cible existant, validées par empreinte (voir lib/segment-index.mjs).
function planFile(sourceFile, relPath, ctx, lang, segmentIndex, force) {
  const source = readFileSync(sourceFile, 'utf8')
  const { frontmatter, body } = splitFrontmatter(source)
  const { segments, separators } = splitBody(body)

  const targetFullPath = path.join(ROOT_DIR, ctx.config.contentDir, lang.code, relPath)
  const existingTarget = existsSync(targetFullPath) ? readFileSync(targetFullPath, 'utf8') : null
  const existing = existingTarget
    ? splitFrontmatter(existingTarget)
    : { frontmatter: null, body: '' }
  const existingSegments = existingTarget ? splitBody(existing.body).segments : []

  const indexEntry = getIndexEntry(segmentIndex, relPath, lang.code)
  // Deux usages de la même table. Sous les règles de traduction courantes, une
  // traduction connue est réutilisée telle quelle (aucun appel au modèle). Sous
  // des règles différentes, elle ne fait plus autorité, mais elle reste une
  // traduction correcte du même texte : on la garde en réserve, pour ne pas
  // remplacer un paragraphe lisible par une traduction que les contrôles
  // d'intégrité jugent dégradée.
  const { current, previous: previousBody } = bodyReuse(indexEntry, ctx.rulesId, existingSegments)
  const reusableBody = force ? new Map() : current

  const translations = new Array(segments.length).fill(null)
  const pending = []
  let passthroughCount = 0
  for (const [i, segment] of segments.entries()) {
    if (isPassthrough(segment)) {
      // Bloc de code, filet horizontal... : recopié tel quel, jamais envoyé au
      // modèle, même quand un morceau voisin l'embarque comme contexte.
      translations[i] = segment
      passthroughCount += 1
      continue
    }
    const cached = reusableBody.get(segmentHash(segment))
    if (cached !== undefined) translations[i] = cached
    else pending.push(i)
  }

  const frontmatterStrings = frontmatter
    ? collectTranslatableStrings(frontmatter, ctx.config.frontMatterSkipKeys)
    : {}
  const existingFrontmatterStrings = existing.frontmatter
    ? collectTranslatableStrings(existing.frontmatter, ctx.config.frontMatterSkipKeys)
    : {}
  const reusableFrontmatter = force
    ? new Map()
    : frontmatterReuse(indexEntry, ctx.rulesId, existingFrontmatterStrings).current

  const frontmatterTranslations = {}
  const frontmatterPending = {}
  for (const [key, text] of Object.entries(frontmatterStrings)) {
    const cached = reusableFrontmatter.get(segmentHash(text))
    if (cached !== undefined) frontmatterTranslations[key] = cached
    else frontmatterPending[key] = text
  }

  return {
    targetFullPath,
    frontmatter,
    body,
    segments,
    separators,
    translations,
    previousBody,
    chunks: buildChunks(segments, pending),
    pendingCount: pending.length,
    passthroughCount,
    cachedCount: segments.length - pending.length - passthroughCount,
    frontmatterStrings,
    frontmatterTranslations,
    frontmatterPending
  }
}

async function executePlan(plan, ctx, lang, concurrency) {
  const issues = []

  const chunkResults = await mapWithConcurrency(plan.chunks, concurrency, (chunk) =>
    translateChunk(
      plan.segments.slice(chunk.start, chunk.end + 1),
      chunk.keep.map((index) => index - chunk.start),
      ctx,
      lang
    )
  )
  for (const [chunkIndex, chunk] of plan.chunks.entries()) {
    const result = chunkResults[chunkIndex]
    // Seuls les segments à traduire sont retenus : le reste du morceau n'était
    // là que pour le contexte, et sa traduction en cache reste la référence.
    for (const segmentIndex of chunk.keep) {
      const candidate = result.get(segmentIndex - chunk.start)
      if (!candidate) {
        throw new Error(`Aucune traduction rendue pour le segment ${segmentIndex} de ${plan.targetFullPath}`)
      }
      if (candidate.issues.length === 0) {
        plan.translations[segmentIndex] = candidate.text
        continue
      }

      // Traduction douteuse. Plutôt que d'écraser une traduction lisible par
      // une réponse manifestement dégradée (constaté : un paragraphe entier
      // remplacé par "Bonjour"), on garde la précédente quand elle existe, et
      // on marque la page à relire dans les deux cas.
      const previous = plan.previousBody.get(segmentHash(plan.segments[segmentIndex]))
      plan.translations[segmentIndex] = previous ?? candidate.text
      const kept = previous
        ? ' (traduction précédente conservée)'
        : ' (traduction douteuse livrée telle quelle)'
      issues.push(...candidate.issues.map((issue) => issue + kept))
    }
  }

  // Garde-fou : un segment sans traduction serait sérialisé en "null" dans le
  // fichier cible. Mieux vaut échouer bruyamment.
  const missing = plan.translations.findIndex((text) => typeof text !== 'string')
  if (missing !== -1) {
    throw new Error(`Segment ${missing} sans traduction après exécution du plan`)
  }

  if (Object.keys(plan.frontmatterPending).length > 0) {
    const translated = await translateFrontmatterStrings(plan.frontmatterPending, ctx, lang)
    for (const key of Object.keys(plan.frontmatterPending)) {
      if (typeof translated[key] !== 'string') {
        issues.push(`front-matter : clé "${key}" absente de la réponse du modèle`)
        continue
      }
      plan.frontmatterTranslations[key] = translated[key]
    }
  }

  const translatedBody = joinSegments(plan.translations, plan.separators)
  let output = translatedBody === '' ? '' : translatedBody + '\n'
  if (plan.frontmatter) {
    const translatedFrontmatter = applyTranslatedStrings(
      plan.frontmatter,
      plan.frontmatterTranslations
    )
    output = serializeFrontmatter(translatedFrontmatter) + '\n' + output
  }

  mkdirSync(path.dirname(plan.targetFullPath), { recursive: true })
  writeFileSync(plan.targetFullPath, output, 'utf8')

  // Contrôle d'intégrité de bout en bout, sur le fichier finalement écrit :
  // les contrôles par morceau ne voient pas une page dont il manquerait un
  // segment entier. On compare les textes protégés, pour ne pas prendre les
  // `#` d'un script shell pour des titres Markdown.
  issues.push(
    ...diffSignals(protectCodeBlocks(plan.body).protectedMd, protectCodeBlocks(translatedBody).protectedMd)
  )

  return { issues: [...new Set(issues)], translatedBody }
}

// --- boucle principale ---------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const ctx = loadI18nContext()
  const { config } = ctx
  const concurrency = config.concurrency ?? DEFAULT_CONCURRENCY

  const targetLangs = config.targetLangs.filter(
    (lang) => !args.langs || args.langs.includes(lang.code)
  )
  if (targetLangs.length === 0) {
    throw new Error(`Aucune langue cible ne correspond à --lang=${args.langs?.join(',')}`)
  }

  const contentDirFull = path.join(ROOT_DIR, config.contentDir)
  const targetLangCodes = config.targetLangs.map((l) => l.code)
  const allSourceFiles = walkMarkdownFiles(contentDirFull, targetLangCodes)

  // --file=... restreint le run à quelques pages (chemins relatifs à
  // content/) : utile pour reprendre une page marquée needsReview sans
  // relancer tout le corpus.
  const sourceFiles = args.files
    ? allSourceFiles.filter((file) => args.files.includes(path.relative(contentDirFull, file)))
    : allSourceFiles
  if (sourceFiles.length === 0) {
    throw new Error(`Aucune page source ne correspond à --file=${args.files?.join(',')}`)
  }

  const manifest = loadManifest(MANIFEST_PATH)
  const segmentIndex = loadSegmentIndex(SEGMENT_INDEX_PATH)
  const model = currentModelId(config)

  let translatedCount = 0
  let upToDateCount = 0
  let translatedSegments = 0
  let reusedSegments = 0

  for (const sourceFile of sourceFiles) {
    const relPath = path.relative(contentDirFull, sourceFile)
    const sourceContent = readFileSync(sourceFile, 'utf8')
    const unitHash = sha256(ctx.rulesHash + ':' + sha256(sourceContent))

    for (const lang of targetLangs) {
      const entry = getEntry(manifest, relPath, lang.code)
      const targetFullPath = path.join(ROOT_DIR, config.contentDir, lang.code, relPath)
      const needsTranslation =
        args.force || !entry || entry.unitHash !== unitHash || !existsSync(targetFullPath)

      if (!needsTranslation) {
        upToDateCount += 1
        console.log(`= à jour   [${lang.code}] ${relPath}`)
        // Une page à jour dont on ne connaît pas encore les segments (index
        // absent, ou traduction retouchée depuis) est appariée maintenant :
        // c'est gratuit, et c'est ce qui rendra sa prochaine modification
        // incrémentale.
        adoptExistingTranslation(relPath, sourceContent, targetFullPath, ctx, lang, segmentIndex)
        continue
      }

      const plan = planFile(sourceFile, relPath, ctx, lang, segmentIndex, args.force)
      const total = plan.segments.length
      const pendingFrontmatter = Object.keys(plan.frontmatterPending).length

      if (args.dryRun) {
        translatedCount += 1
        console.log(
          `~ à traduire [${lang.code}] ${relPath} ` +
            `(${plan.pendingCount}/${total} segment(s)${pendingFrontmatter > 0 ? `, ${pendingFrontmatter} clé(s) de front-matter` : ''})`
        )
        continue
      }

      console.log(
        `> traduction [${lang.code}] ${relPath} : ${plan.pendingCount}/${total} segment(s) ` +
          `en ${plan.chunks.length} appel(s) (${model})...`
      )
      const { issues } = await executePlan(plan, ctx, lang, concurrency)

      setEntry(manifest, relPath, lang.code, {
        unitHash,
        model,
        translatedAt: new Date().toISOString(),
        ...(issues.length > 0 ? { needsReview: true, issues } : {})
      })
      setIndexEntry(segmentIndex, relPath, lang.code, {
        rules: ctx.rulesId,
        body: buildBodyPairs(plan.segments, plan.translations),
        ...(Object.keys(plan.frontmatterStrings).length > 0
          ? {
              frontmatter: buildFrontmatterPairs(
                plan.frontmatterStrings,
                plan.frontmatterTranslations
              )
            }
          : {})
      })
      saveManifest(MANIFEST_PATH, manifest)
      saveSegmentIndex(SEGMENT_INDEX_PATH, segmentIndex)

      translatedCount += 1
      translatedSegments += plan.pendingCount
      reusedSegments += plan.cachedCount
      console.log(
        `  ✓ écrit -> ${path.relative(ROOT_DIR, plan.targetFullPath)}` +
          (plan.cachedCount > 0 ? ` (${plan.cachedCount} segment(s) réutilisé(s))` : '')
      )
      if (issues.length > 0) {
        console.warn(`  ⚠ à relire manuellement (${issues.join(' ; ')})`)
      }
    }
  }

  if (!args.dryRun) {
    // Toutes les pages existantes, pas seulement celles du run : avec
    // --file=..., élaguer sur le sous-ensemble effacerait tout le reste.
    const knownRelPaths = new Set(allSourceFiles.map((file) => path.relative(contentDirFull, file)))
    const prunedFromIndex = pruneByRelPath(segmentIndex, knownRelPaths)
    const prunedFromManifest = pruneByRelPath(manifest, knownRelPaths)
    saveSegmentIndex(SEGMENT_INDEX_PATH, segmentIndex)
    saveManifest(MANIFEST_PATH, manifest)
    if (prunedFromManifest > 0 || prunedFromIndex > 0) {
      console.log(
        `\n${prunedFromManifest} page(s) sans source oubliée(s) du manifeste ` +
          `(les fichiers déjà traduits correspondants sont à supprimer à la main dans ` +
          `${config.targetLangs.map((l) => `${config.contentDir}/${l.code}/`).join(', ')}).`
      )
    }
  }

  const verb = args.dryRun ? 'à traduire' : 'traduits'
  console.log(`\n${translatedCount} fichier(s) ${verb}, ${upToDateCount} déjà à jour.`)
  if (!args.dryRun && translatedCount > 0) {
    console.log(
      `${translatedSegments} segment(s) envoyé(s) au modèle, ${reusedSegments} réutilisé(s) sans appel.`
    )
  }

  const needsReviewCount = Object.values(manifest)
    .flatMap((byLang) => Object.values(byLang))
    .filter((entry) => entry.needsReview).length

  if (needsReviewCount > 0) {
    console.warn(
      `\n⚠ ${needsReviewCount} traduction(s) marquée(s) needsReview dans i18n/manifest.json ` +
        `(grep needsReview i18n/manifest.json pour les lister).`
    )
  }

  // Utilisé par le hook pre-commit "i18n-translations-up-to-date" : un
  // dry-run qui trouve du travail à faire, ou une traduction déjà livrée
  // mais jamais relue, doit bloquer le commit plutôt que de le laisser
  // passer silencieusement. `process.exit` explicite (plutôt que
  // `process.exitCode`) pour ne dépendre d'aucune subtilité de la boucle
  // d'événements côté appelant (pre-commit, CI, etc.).
  if (args.dryRun && (translatedCount > 0 || needsReviewCount > 0)) {
    process.exit(1)
  }
}

// Apparie une traduction déjà à jour avec sa source pour alimenter l'index
// des segments, quand celui-ci ne la connaît pas encore (dépôt qui n'avait
// pas encore d'index, traduction retouchée à la main depuis).
function adoptExistingTranslation(relPath, sourceContent, targetFullPath, ctx, lang, segmentIndex) {
  const { frontmatter, body } = splitFrontmatter(sourceContent)
  const target = splitFrontmatter(readFileSync(targetFullPath, 'utf8'))

  const pairs = adoptBodyPairs(splitBody(body).segments, splitBody(target.body).segments)
  if (!pairs) return

  const frontmatterStrings = frontmatter
    ? collectTranslatableStrings(frontmatter, ctx.config.frontMatterSkipKeys)
    : {}
  const targetFrontmatterStrings = target.frontmatter
    ? collectTranslatableStrings(target.frontmatter, ctx.config.frontMatterSkipKeys)
    : {}

  setIndexEntry(segmentIndex, relPath, lang.code, {
    rules: ctx.rulesId,
    body: pairs,
    ...(Object.keys(frontmatterStrings).length > 0
      ? { frontmatter: buildFrontmatterPairs(frontmatterStrings, targetFrontmatterStrings) }
      : {})
  })
}

main().catch((err) => {
  console.error(`\nErreur: ${err.message}`)
  process.exit(1)
})
