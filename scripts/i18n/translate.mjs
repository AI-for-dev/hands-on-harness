#!/usr/bin/env node
// Translates the source Markdown files (language = config.sourceLang) into the
// target languages, retranslating only what changed.
//
// The granularity is the Markdown segment (paragraph, heading, list, table, code
// block...), not the file: editing one sentence in a chapter only sends the
// paragraph concerned to the model, not the whole chapter. See lib/segments.mjs
// (splitting) and lib/segment-index.mjs (index of the segments already
// translated, i18n/segments.json).
//
// "Changed" = the segment content, the system prompt, the glossary or the style
// guide changed since the last known translation (see manifest.json and
// lib/config.mjs). Every translation is traced with the model that produced it,
// for auditing when models drift apart.
//
// Usage:
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

// Three attempts, not two: measured on this corpus, a short fragment goes off
// the rails about one time in five with a model this size, and the failure is
// independent from one attempt to the next. The extra attempts only cost
// anything on the fragments that fail.
const MAX_TRANSLATION_ATTEMPTS = 3
// Size of the "narrow" chunk tried as a last resort (the segment plus one
// neighbour on each side), when a segment resists the framing of the full
// chunk.
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
    else throw new Error(`Unknown argument: ${arg}`)
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
      // We never descend into the target language directories: they are
      // generated destinations, not sources.
      if (targetLangCodes.includes(topSegment)) continue
      files.push(...walkMarkdownFiles(fullPath, targetLangCodes, base))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }
  return files
}

// --- translating a chunk of contiguous segments ---------------------------

// A chunk goes to the model in a single call, its segments separated by a blank
// line. The answer is re-split on blank lines: it must return exactly as many
// blocks as were sent, otherwise there is no telling which translation goes with
// which segment.
//
// `keep` lists the indices (relative to the chunk) whose translation we actually
// want; the other segments were only sent as context. The integrity checks
// therefore only cover the segments kept, so a page is not flagged "to review"
// because of a discarded context segment.
async function translateChunkOnce(sourceSegments, keep, ctx, lang) {
  const chunkText = joinSegments(sourceSegments, [])
  const { protectedMd, blocks } = protectCodeBlocks(chunkText)
  const systemPrompt = ctx.renderSystemPrompt(lang.label, lang.code)

  const raw = await translateText(ctx.config, systemPrompt, protectedMd)
  const cleaned = cleanupTranslationResponse(raw)
  const returned = splitBody(cleaned).segments

  // An empty answer is never a valid translation: keeping it as a candidate
  // would silently erase a paragraph.
  if (returned.length === 0) {
    return { candidates: new Map(), issues: ['empty answer from the model'] }
  }

  if (returned.length !== sourceSegments.length) {
    const alignment = `blocks: ${sourceSegments.length} sent, ${returned.length} returned`
    if (sourceSegments.length > 1) return { candidates: new Map(), issues: [alignment] }

    // A single segment: the whole answer is its most plausible translation, even
    // when badly split. We keep it as a candidate, measured like the others.
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

// Translates a chunk and returns, for each segment asked for, the best
// translation obtained: `{ text, issues }`, where an empty `issues` means "passed
// every check".
//
// A model (a small local one especially) can merge two paragraphs and make a
// whole sentence disappear along the way, or return an unrelated fragment of an
// answer. So we retry, asking again only for the segments not yet validated;
// then we fall back segment by segment, which leaves the model far less room to
// drift.
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
      // A failing call (unreachable model, runaway generation getting cut off)
      // must not take the whole run down with it: we retry, and only give up
      // after the last attempt.
      lastError = err
      console.warn(`  ⚠ attempt ${attempt}/${MAX_TRANSLATION_ATTEMPTS} failed: ${err.message}`)
      continue
    }

    const stillPending = []
    for (const index of pending) {
      const candidate = outcome.candidates.get(index)
      if (!candidate) {
        stillPending.push(index)
        continue
      }
      // A candidate already kept is only replaced by a better one.
      const previous = best.get(index)
      if (!previous || previous.issues.length > 0) best.set(index, candidate)
      if (candidate.issues.length > 0) stillPending.push(index)
    }
    pending = stillPending
  }

  if (pending.length === 0) return best

  // Last resort for a segment that resists: ask again within a narrow chunk, it
  // and its immediate neighbours. Retrying the same chunk only rolls the same
  // die; changing the framing changes the odds. Measured on this corpus:
  // paragraphs that fail every time inside a 3,000-character chunk pass inside a
  // three-block chunk.
  if (sourceSegments.length > NARROW_CHUNK_SEGMENTS) {
    for (const index of pending) {
      const start = Math.max(0, index - 1)
      const end = Math.min(sourceSegments.length - 1, index + 1)
      let narrow
      try {
        narrow = await translateChunkOnce(sourceSegments.slice(start, end + 1), [index - start], ctx, lang)
      } catch (err) {
        console.warn(`  ⚠ narrow chunk failed: ${err.message}`)
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

  // Segments for which we have nothing at all, to be distinguished from those
  // with an imperfect translation: the latter is arbitrated higher up (against
  // the previous translation) and reported, whereas nothing at all cannot be
  // salvaged and forces another request.
  const empty = pending.filter((index) => !best.has(index))
  if (empty.length === 0) return best

  const fragment = `"${sourceSegments[empty[0]].slice(0, 60)}..."`

  // A single-segment chunk cannot be subdivided any further: this is the only
  // place where we give up, which also bounds the recursion below.
  if (sourceSegments.length === 1) {
    const cause = lastError ? `: ${lastError.message}` : ''
    throw new Error(
      `No usable translation for fragment ${fragment} after ` +
        `${MAX_TRANSLATION_ATTEMPTS} attempts${cause}`
    )
  }

  // The model returned nothing usable for these segments within the full chunk:
  // we take them one by one. A shorter input makes it drift far less, and it is
  // also what saves a chunk where a single paragraph triggers a runaway
  // generation.
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
    throw new Error(`Invalid JSON answer from the model for the front-matter: ${err.message}\n---\n${raw}`)
  }
}

// --- planning -------------------------------------------------------------

// Establishes, without calling the model, the list of what actually has to be
// translated: this is the plan --dry-run displays, and the one a normal run
// executes. Reusable translations are read back from the existing target file
// and validated by fingerprint (see lib/segment-index.mjs).
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
  // Two uses of the same table. Under the current translation rules, a known
  // translation is reused as is (no model call). Under different rules it is no
  // longer authoritative, but it remains a correct translation of the same text:
  // we keep it in reserve, so as not to replace a readable paragraph with a
  // translation the integrity checks judge degraded.
  const { current, previous: previousBody } = bodyReuse(indexEntry, ctx.rulesId, existingSegments)
  const reusableBody = force ? new Map() : current

  const translations = new Array(segments.length).fill(null)
  const pending = []
  let passthroughCount = 0
  for (const [i, segment] of segments.entries()) {
    if (isPassthrough(segment)) {
      // Code block, horizontal rule...: copied as is, never sent to the model,
      // even when a neighbouring chunk carries it along as context.
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
    // Only the segments to translate are kept: the rest of the chunk was there
    // for context only, and its cached translation remains the reference.
    for (const segmentIndex of chunk.keep) {
      const candidate = result.get(segmentIndex - chunk.start)
      if (!candidate) {
        throw new Error(`No translation returned for segment ${segmentIndex} of ${plan.targetFullPath}`)
      }
      if (candidate.issues.length === 0) {
        plan.translations[segmentIndex] = candidate.text
        continue
      }

      // Dubious translation. Rather than overwriting a readable translation with
      // a visibly degraded answer (observed: a whole paragraph replaced by
      // "Bonjour"), we keep the previous one when it exists, and flag the page
      // for review either way.
      const previous = plan.previousBody.get(segmentHash(plan.segments[segmentIndex]))
      plan.translations[segmentIndex] = previous ?? candidate.text
      const kept = previous
        ? ' (previous translation kept)'
        : ' (dubious translation shipped as is)'
      issues.push(...candidate.issues.map((issue) => issue + kept))
    }
  }

  // Guard: a segment without a translation would be serialised as "null" in the
  // target file. Better to fail loudly.
  const missing = plan.translations.findIndex((text) => typeof text !== 'string')
  if (missing !== -1) {
    throw new Error(`Segment ${missing} has no translation after the plan ran`)
  }

  if (Object.keys(plan.frontmatterPending).length > 0) {
    const translated = await translateFrontmatterStrings(plan.frontmatterPending, ctx, lang)
    for (const key of Object.keys(plan.frontmatterPending)) {
      if (typeof translated[key] !== 'string') {
        issues.push(`front-matter: key "${key}" missing from the model answer`)
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

  // End-to-end integrity check, on the file finally written: the per-chunk
  // checks cannot see a page missing a whole segment. We compare the protected
  // texts, so as not to mistake the `#` of a shell script for Markdown
  // headings.
  issues.push(
    ...diffSignals(protectCodeBlocks(plan.body).protectedMd, protectCodeBlocks(translatedBody).protectedMd)
  )

  return { issues: [...new Set(issues)], translatedBody }
}

// --- main loop ------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const ctx = loadI18nContext()
  const { config } = ctx
  const concurrency = config.concurrency ?? DEFAULT_CONCURRENCY

  const targetLangs = config.targetLangs.filter(
    (lang) => !args.langs || args.langs.includes(lang.code)
  )
  if (targetLangs.length === 0) {
    throw new Error(`No target language matches --lang=${args.langs?.join(',')}`)
  }

  const contentDirFull = path.join(ROOT_DIR, config.contentDir)
  const targetLangCodes = config.targetLangs.map((l) => l.code)
  const allSourceFiles = walkMarkdownFiles(contentDirFull, targetLangCodes)

  // --file=... restricts the run to a few pages (paths relative to content/):
  // useful to redo a page flagged needsReview without rerunning the whole
  // corpus.
  const sourceFiles = args.files
    ? allSourceFiles.filter((file) => args.files.includes(path.relative(contentDirFull, file)))
    : allSourceFiles
  if (sourceFiles.length === 0) {
    throw new Error(`No source page matches --file=${args.files?.join(',')}`)
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
        console.log(`= up to date [${lang.code}] ${relPath}`)
        // An up-to-date page whose segments are not known yet (missing index, or
        // translation edited since) is paired now: it is free, and it is what
        // will make its next edit incremental.
        adoptExistingTranslation(relPath, sourceContent, targetFullPath, ctx, lang, segmentIndex)
        continue
      }

      const plan = planFile(sourceFile, relPath, ctx, lang, segmentIndex, args.force)
      const total = plan.segments.length
      const pendingFrontmatter = Object.keys(plan.frontmatterPending).length

      if (args.dryRun) {
        translatedCount += 1
        console.log(
          `~ to translate [${lang.code}] ${relPath} ` +
            `(${plan.pendingCount}/${total} segment(s)${pendingFrontmatter > 0 ? `, ${pendingFrontmatter} front-matter key(s)` : ''})`
        )
        continue
      }

      console.log(
        `> translating [${lang.code}] ${relPath}: ${plan.pendingCount}/${total} segment(s) ` +
          `in ${plan.chunks.length} call(s) (${model})...`
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
        `  ✓ written -> ${path.relative(ROOT_DIR, plan.targetFullPath)}` +
          (plan.cachedCount > 0 ? ` (${plan.cachedCount} segment(s) reused)` : '')
      )
      if (issues.length > 0) {
        console.warn(`  ⚠ needs a human review (${issues.join(' ; ')})`)
      }
    }
  }

  if (!args.dryRun) {
    // Every existing page, not only those of this run: with --file=..., pruning
    // on the subset would erase everything else.
    const knownRelPaths = new Set(allSourceFiles.map((file) => path.relative(contentDirFull, file)))
    const prunedFromIndex = pruneByRelPath(segmentIndex, knownRelPaths)
    const prunedFromManifest = pruneByRelPath(manifest, knownRelPaths)
    saveSegmentIndex(SEGMENT_INDEX_PATH, segmentIndex)
    saveManifest(MANIFEST_PATH, manifest)
    if (prunedFromManifest > 0 || prunedFromIndex > 0) {
      console.log(
        `\n${prunedFromManifest} page(s) with no source dropped from the manifest ` +
          `(their already translated files are to be deleted by hand under ` +
          `${config.targetLangs.map((l) => `${config.contentDir}/${l.code}/`).join(', ')}).`
      )
    }
  }

  const verb = args.dryRun ? 'to translate' : 'translated'
  console.log(`\n${translatedCount} file(s) ${verb}, ${upToDateCount} already up to date.`)
  if (!args.dryRun && translatedCount > 0) {
    console.log(
      `${translatedSegments} segment(s) sent to the model, ${reusedSegments} reused with no call.`
    )
  }

  const needsReviewCount = Object.values(manifest)
    .flatMap((byLang) => Object.values(byLang))
    .filter((entry) => entry.needsReview).length

  if (needsReviewCount > 0) {
    console.warn(
      `\n⚠ ${needsReviewCount} translation(s) flagged needsReview in i18n/manifest.json ` +
        `(grep needsReview i18n/manifest.json to list them).`
    )
  }

  // Used by the "i18n-translations-up-to-date" pre-commit hook: a dry run that
  // finds work to do, or a translation already delivered but never reviewed,
  // must block the commit rather than let it through silently. `process.exit` is
  // explicit (rather than `process.exitCode`) so as not to depend on any subtlety
  // of the event loop on the caller's side (pre-commit, CI, etc.).
  if (args.dryRun && (translatedCount > 0 || needsReviewCount > 0)) {
    process.exit(1)
  }
}

// Pairs an already up-to-date translation with its source to feed the segment
// index, when the index does not know it yet (repository that had no index yet,
// translation hand-edited since).
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
  console.error(`\nError: ${err.message}`)
  process.exit(1)
})
