#!/usr/bin/env node
// Traduit les fichiers Markdown source (langue = config.sourceLang) vers les
// langues cibles, en ne retraduisant que ce qui a changé.
//
// "Changé" = le contenu source, le prompt système, le glossaire ou le guide
// de style a changé depuis la dernière traduction connue (voir manifest.json
// et lib/config.mjs). Chaque traduction est tracée avec le modèle qui l'a
// produite, pour audit en cas de dérive entre modèles.
//
// Usage :
//   node scripts/i18n/translate.mjs [--lang=en,es] [--dry-run] [--force]

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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

const MAX_TRANSLATION_ATTEMPTS = 2

const MANIFEST_PATH = path.join(I18N_DIR, 'manifest.json')

function parseArgs(argv) {
  const args = { langs: null, dryRun: false, force: false }
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--force') args.force = true
    else if (arg.startsWith('--lang=')) args.langs = arg.slice('--lang='.length).split(',')
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

async function translateFrontmatter(frontmatter, ctx, langLabel, langCode) {
  const strings = collectTranslatableStrings(frontmatter, ctx.config.frontMatterSkipKeys)
  if (Object.keys(strings).length === 0) return frontmatter

  const systemPrompt = ctx.renderFrontmatterPrompt(langLabel, langCode)
  const raw = await translateText(ctx.config, systemPrompt, JSON.stringify(strings, null, 2))

  let translated
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    translated = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch (err) {
    throw new Error(`Réponse JSON invalide du modèle pour le front-matter: ${err.message}\n---\n${raw}`)
  }

  return applyTranslatedStrings(frontmatter, translated)
}

async function translateBody(body, ctx, langLabel, langCode) {
  // Un corps vide (page uniquement composée de front-matter, par exemple)
  // n'a rien à traduire : l'envoyer quand même à un petit modèle local
  // l'amène régulièrement à halluciner du contenu à partir de son propre
  // prompt système plutôt que de renvoyer une réponse vide.
  if (body.trim() === '') return { text: body, issues: [] }

  const { protectedMd, blocks } = protectCodeBlocks(body)
  const systemPrompt = ctx.renderSystemPrompt(langLabel, langCode)

  // Un modèle (surtout un petit modèle local) peut parfois fusionner deux
  // paragraphes et faire disparaître une phrase entière au passage. On
  // retente une fois si les signaux structurels ne correspondent pas entre
  // la source et la traduction, plutôt que de livrer silencieusement un
  // texte tronqué.
  let translatedProtected = ''
  let issues = []
  for (let attempt = 1; attempt <= MAX_TRANSLATION_ATTEMPTS; attempt++) {
    const rawResponse = await translateText(ctx.config, systemPrompt, protectedMd)
    translatedProtected = cleanupTranslationResponse(rawResponse)
    issues = diffSignals(protectedMd, translatedProtected)
    if (issues.length === 0) break
  }

  return { text: restoreCodeBlocks(translatedProtected, blocks), issues }
}

async function translateFile(sourcePath, relPath, ctx, lang) {
  const fileContent = readFileSync(sourcePath, 'utf8')
  const { frontmatter, body } = splitFrontmatter(fileContent)

  const { text: translatedBody, issues } = await translateBody(body, ctx, lang.label, lang.code)
  let output = translatedBody
  if (frontmatter) {
    const translatedFrontmatter = await translateFrontmatter(frontmatter, ctx, lang.label, lang.code)
    output = serializeFrontmatter(translatedFrontmatter) + '\n' + translatedBody
  }

  const targetPath = path.join(ctx.config.contentDir, lang.code, relPath)
  const targetFullPath = path.join(ROOT_DIR, targetPath)
  mkdirSync(path.dirname(targetFullPath), { recursive: true })
  writeFileSync(targetFullPath, output, 'utf8')
  return { targetPath, issues }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const ctx = loadI18nContext()
  const { config } = ctx

  const targetLangs = config.targetLangs.filter(
    (lang) => !args.langs || args.langs.includes(lang.code)
  )
  if (targetLangs.length === 0) {
    throw new Error(`Aucune langue cible ne correspond à --lang=${args.langs?.join(',')}`)
  }

  const contentDirFull = path.join(ROOT_DIR, config.contentDir)
  const targetLangCodes = config.targetLangs.map((l) => l.code)
  const sourceFiles = walkMarkdownFiles(contentDirFull, targetLangCodes)

  const manifest = loadManifest(MANIFEST_PATH)
  const model = currentModelId(config)

  let translatedCount = 0
  let upToDateCount = 0

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
        continue
      }

      if (args.dryRun) {
        translatedCount += 1
        console.log(`~ à traduire [${lang.code}] ${relPath}`)
        continue
      }

      console.log(`> traduction [${lang.code}] ${relPath} (${model})...`)
      const { targetPath, issues } = await translateFile(sourceFile, relPath, ctx, lang)
      setEntry(manifest, relPath, lang.code, {
        unitHash,
        model,
        translatedAt: new Date().toISOString(),
        ...(issues.length > 0 ? { needsReview: true, issues } : {})
      })
      saveManifest(MANIFEST_PATH, manifest)
      translatedCount += 1
      console.log(`  ✓ écrit -> ${targetPath}`)
      if (issues.length > 0) {
        console.warn(`  ⚠ à relire manuellement (${issues.join(' ; ')})`)
      }
    }
  }

  const verb = args.dryRun ? 'à traduire' : 'traduits'
  console.log(`\n${translatedCount} fichier(s) ${verb}, ${upToDateCount} déjà à jour.`)
}

main().catch((err) => {
  console.error(`\nErreur: ${err.message}`)
  process.exit(1)
})
