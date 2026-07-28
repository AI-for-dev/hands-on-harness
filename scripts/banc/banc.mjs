#!/usr/bin/env node
// Banc de mesure du module 2.1 - « Le contexte et la fenêtre ».
//
// Rejoue la même tâche sur une matrice de configurations, plusieurs fois
// chacune, et agrège coût, tokens et notation. Zéro dépendance, Node >= 20.
//
//   node banc.mjs --dry-run     estime le coût sans rien lancer
//   node banc.mjs               lance la matrice
//   REPEATS=1 node banc.mjs     surcharge le nombre de répétitions
//   ONLY=base,+rtk node banc.mjs   ne relance que ces cellules
//
// Le seul endroit à réécrire pour un autre dépôt que NÉON est la fonction
// `noter()`, tout en bas.

import { spawn, execFile } from 'node:child_process'
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

// ─── Configuration ───────────────────────────────────────────────────────────

const REPO        = process.env.NEON     ?? '../neon'
const PROVIDER    = process.env.PROVIDER ?? 'opencode-go'
const REPEATS     = Number(process.env.REPEATS ?? 3)
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4)
const TIMEOUT_MS  = Number(process.env.TIMEOUT_MS ?? 6 * 60_000)
const ATTEMPTS    = 2
const WORKDIR     = join(tmpdir(), 'banc-contexte')

// Profil de référence, mesuré en juillet 2026, servant à l'estimation de coût
// avant lancement. À réajuster si vos runs s'en écartent nettement.
const REF_TOKENS = { input: 20_000, output: 9_000 }

const PROMPT_VAGUE = 'La collision scanne toutes les briques a chaque frame et '
  + 'son code est mele a la boucle de rendu. Corrige ca.'

const PROMPT_CADRE = 'La collision scanne toutes les briques a chaque frame et '
  + 'son code est mele a la boucle de rendu (issue #2). Sors la detection de '
  + 'collision de la boucle de rendu ET arrete de scanner toutes les briques. '
  + 'Ne modifie que game/neon.js, ne touche pas aux tests, ne traite aucune '
  + 'autre issue. Tu as fini quand npm test passe et que les fonctions deja '
  + 'exportees ont gardé leur nom et leur signature.'

const AGENTS_MD = `# NÉON

- Une tâche = un ticket. Ne traite pas d'autre issue en passant.
- Ne renomme ni ne supprime un export de \`game/neon.js\` : les tests en dépendent.
- Zéro dépendance : aucun paquet, aucun CDN.
- Les tests se lancent avec \`npm test\`.
`

const SYSTEM_MIN = `You are a coding assistant working in the current directory.
Use the available tools (read, write, edit, bash) to inspect and modify files.
Answer in the language of the user.
`

// La matrice. Une cellule = une configuration. `base` est la référence dont
// toutes les autres ne diffèrent que par une variable, sauf la dernière qui
// les cumule (c'est la moitié « bien outillée » du 2x2, dont `pro` est la
// moitié « mal outillée »).
const TOUTES_LES_CELLULES = [
  { nom: 'base',          modele: 'deepseek-v4-flash' },
  { nom: '+thinking',     modele: 'deepseek-v4-flash', thinking: 'high' },
  { nom: '+prompt cadré', modele: 'deepseek-v4-flash', prompt: PROMPT_CADRE },
  { nom: '+AGENTS.md',    modele: 'deepseek-v4-flash', agents: AGENTS_MD },
  { nom: '-prompt sys.',  modele: 'deepseek-v4-flash', system: SYSTEM_MIN },
  { nom: '+rtk',          modele: 'deepseek-v4-flash', extension: 'npm:pi-rtk-optimizer' },
  { nom: 'pro (négligé)', modele: 'deepseek-v4-pro' },
  { nom: 'flash (soigné)', modele: 'deepseek-v4-flash', thinking: 'high',
    prompt: PROMPT_CADRE, agents: AGENTS_MD },
]

const filtre = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const CELLS = filtre.length
  ? TOUTES_LES_CELLULES.filter((c) => filtre.includes(c.nom))
  : TOUTES_LES_CELLULES

// ─── Estimation de coût ──────────────────────────────────────────────────────

function tarifs(modele) {
  const f = join(homedir(), '.pi', 'agent', 'models-store.json')
  if (!existsSync(f)) return null
  const store = JSON.parse(readFileSync(f, 'utf8'))
  for (const p of Object.values(store)) {
    const m = (p.models ?? []).find((m) => m.id === modele)
    if (m?.cost) return m.cost
  }
  return null
}

function estimation() {
  let total = 0
  const lignes = []
  for (const c of CELLS) {
    const t = tarifs(c.modele)
    const u = t
      ? (REF_TOKENS.input * t.input + REF_TOKENS.output * t.output) / 1e6 * REPEATS
      : null
    if (u !== null) total += u
    lignes.push(`  ${c.nom.padEnd(16)} ${c.modele.padEnd(20)} `
      + (u === null ? 'tarif inconnu' : `~${u.toFixed(4)} $`))
  }
  return { lignes, total }
}

// ─── Exécution ───────────────────────────────────────────────────────────────

function preparer(id, cell) {
  const dir = join(WORKDIR, id)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  cpSync(REPO, dir, { recursive: true })
  if (cell.agents) writeFileSync(join(dir, 'AGENTS.md'), cell.agents)
  if (cell.system) {
    mkdirSync(join(dir, '.pi'), { recursive: true })
    writeFileSync(join(dir, '.pi', 'SYSTEM.md'), cell.system)
  }
  return dir
}

function args(cell) {
  const a = ['-p', '--mode', 'json', '--provider', PROVIDER, '--model', cell.modele,
    '--no-session', '-a', '-ns', '-np', '-ne']
  // Les fichiers de contexte ne sont chargés que si la cellule en fournit un,
  // pour qu'un AGENTS.md personnel resté dans un répertoire parent ne vienne
  // pas polluer la mesure.
  if (!cell.agents) a.push('-nc')
  if (cell.thinking) a.push('--thinking', cell.thinking)
  if (cell.extension) a.push('-e', cell.extension)
  a.push(cell.prompt ?? PROMPT_VAGUE)
  return a
}

function lancerPi(dir, cell) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    // L'entrée standard doit être fermée : avec un tuyau ouvert, `pi -p`
    // attend indéfiniment de quoi lire et le run se fige sans rien émettre.
    const child = spawn('pi', args(cell), { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const minuteur = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS)
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code, signal) => {
      clearTimeout(minuteur)
      resolve({ out, err, code, signal, duree: Math.round((Date.now() - t0) / 1000) })
    })
    child.on('error', (e) => {
      clearTimeout(minuteur)
      resolve({ out: '', err: String(e), code: -1, signal: null, duree: 0 })
    })
  })
}

function depouiller(flux) {
  const u = { input: 0, output: 0, cacheRead: 0, cout: 0 }
  let tours = 0
  for (const ligne of flux.split('\n')) {
    if (!ligne.startsWith('{')) continue
    let e
    try { e = JSON.parse(ligne) } catch { continue }
    if (e.type !== 'message_end') continue
    const usage = e.message?.usage
    if (!usage) continue
    tours += 1
    u.input += usage.input ?? 0
    u.output += usage.output ?? 0
    u.cacheRead += usage.cacheRead ?? 0
    u.cout += usage.cost?.total ?? 0
  }
  return { ...u, tours }
}

// Un run figé sans un octet de sortie est un incident observé en pratique :
// on retente une fois avant de renoncer, plutôt que d'empoisonner la cellule.
async function unRun(id, cell) {
  for (let essai = 1; essai <= ATTEMPTS; essai++) {
    const dir = preparer(id, cell)
    const r = await lancerPi(dir, cell)
    const mesure = depouiller(r.out)
    if (mesure.tours > 0) return { ...mesure, duree: r.duree, dir, essais: essai }
    console.error(`  ! ${id} : aucune mesure (code=${r.code} signal=${r.signal}), `
      + `essai ${essai}/${ATTEMPTS}${r.err ? ` - ${r.err.trim().split('\n')[0]}` : ''}`)
  }
  return null
}

async function pool(taches, largeur) {
  const resultats = new Array(taches.length)
  let curseur = 0
  const ouvriers = Array.from({ length: Math.min(largeur, taches.length) }, async () => {
    while (curseur < taches.length) {
      const i = curseur++
      resultats[i] = await taches[i]()
    }
  })
  await Promise.all(ouvriers)
  return resultats
}

// ─── Agrégation ──────────────────────────────────────────────────────────────

const mediane = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

function tableau(resultats) {
  const l = []
  l.push('')
  l.push('| cellule | n | coût min | coût médian | coût max | étendue | tours méd. | tests | API | périmètre | perf* |')
  l.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const { cell, runs } of resultats) {
    const ok = runs.filter(Boolean)
    if (!ok.length) { l.push(`| ${cell.nom} | 0 | - | - | - | - | - | - | - | - | - |`); continue }
    const couts = ok.map((r) => r.cout)
    const min = Math.min(...couts), max = Math.max(...couts)
    const compte = (clef) => `${ok.filter((r) => r.note[clef]).length}/${ok.length}`
    l.push(`| ${cell.nom} | ${ok.length} | ${min.toFixed(4)} $ | ${mediane(couts).toFixed(4)} $ `
      + `| ${max.toFixed(4)} $ | x${(max / (min || max)).toFixed(2)} `
      + `| ${mediane(ok.map((r) => r.tours))} `
      + `| ${compte('tests')} | ${compte('apiStable')} | ${compte('perimetre')} | ${compte('perf')} |`)
  }
  l.push('')
  l.push('* La colonne « perf » est une approximation par motif, pas une vérité.')
  l.push('  Relisez les diffs qu\'elle classe comme traités avant de vous y fier.')
  return l.join('\n')
}

// ─── Notation ────────────────────────────────────────────────────────────────
// LE SEUL ENDROIT À RÉÉCRIRE POUR UN AUTRE DÉPÔT.
//
// Les trois premiers critères sont mécaniques et fiables : les tests passent ou
// non, un export a disparu ou non, un fichier hors périmètre a été touché ou
// non.
//
// Le quatrième est celui qui décide si le ticket est vraiment traité, et il
// n'est mécanique qu'en apparence. `perfTraitee()` cherche un calcul d'indices
// de grille, qui est la façon dont on attend que la collision cesse de
// parcourir toutes les briques. Cette approximation a deux défauts connus,
// rencontrés en préparant le module :
//
//   1. elle a d'abord classé comme « non traité » un diff qui faisait pourtant
//      le bon calcul, parce qu'il nommait ses bornes autrement ;
//   2. elle ne sait pas juger une solution d'une autre forme, comme la liste
//      des briques encore vivantes, qui allège le cas courant sans rien changer
//      au pire cas et qui demande donc un avis plutôt qu'un test.
//
// Autrement dit, un motif textuel répond à « ce diff ressemble-t-il à la
// solution attendue » quand la question posée est « ce diff résout-il le
// problème ». C'est précisément l'écart que le LLM-juge du module 3.2 vient
// combler, et la raison pour laquelle cette colonne est marquée d'une étoile
// dans le tableau.

const exportsDe = (fichier) =>
  new Set([...readFileSync(fichier, 'utf8')
    .matchAll(/^export\s+(?:function|const|class|let)\s+(\w+)/gm)].map((m) => m[1]))

function commande(cmd, cmdArgs, cwd) {
  return new Promise((resolve) => {
    execFile(cmd, cmdArgs, { cwd, timeout: 60_000 }, (err) => resolve(!err))
  })
}

function git(args, cwd) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, maxBuffer: 8 << 20 }, (err, stdout) => resolve(err ? '' : stdout))
  })
}

// Approximation, voir l'avertissement ci-dessus. On cherche un bornage
// d'indices de grille sur les constantes de briques, ce qui est la signature
// du seul type de solution que nous savons reconnaître sans lire le code.
function perfTraitee(diff) {
  const ajouts = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
  const indices = ajouts.filter((l) =>
    /Math\.(floor|max|min)\(.*(BRICK_W|BRICK_H|BRICK_COLS|BRICK_ROWS)/.test(l)).length
  return indices >= 2
}

async function noter(dir) {
  const avant = exportsDe(join(REPO, 'game/neon.js'))
  const apres = exportsDe(join(dir, 'game/neon.js'))
  const tests = await commande('npm', ['test'], dir)
  const touches = (await git(['diff', '--name-only'], dir)).split('\n').filter(Boolean)
  const diff = await git(['diff', '--', 'game/neon.js'], dir)

  return {
    tests,
    // Ajouter un export est permis, en retirer ou en renommer un ne l'est pas.
    apiStable: [...avant].every((nom) => apres.has(nom)),
    perimetre: touches.length > 0 && touches.every((f) => f === 'game/neon.js'),
    perf: perfTraitee(diff),
    touches,
  }
}

// ─── Programme principal ─────────────────────────────────────────────────────

const { lignes, total } = estimation()
console.log(`\nMatrice : ${CELLS.length} cellules x ${REPEATS} répétitions `
  + `= ${CELLS.length * REPEATS} runs\n`)
console.log(lignes.join('\n'))
console.log(`\n  Coût estimé : ~${total.toFixed(3)} $ `
  + `(profil de référence ${REF_TOKENS.input} in / ${REF_TOKENS.output} out par run)\n`)

if (process.argv.includes('--dry-run')) process.exit(0)

const taches = []
for (const cell of CELLS) {
  for (let i = 0; i < REPEATS; i++) {
    const id = `${cell.nom.replace(/[^a-z0-9]+/gi, '-')}-${i}`
    taches.push(async () => {
      const r = await unRun(id, cell)
      if (!r) return { cell, run: null }
      r.note = await noter(r.dir)
      console.log(`  ${id.padEnd(24)} ${r.duree}s  ${r.cout.toFixed(4)} $  `
        + `${r.tours} tours  ${r.note.tests ? 'tests ok' : 'TESTS KO'}`)
      return { cell, run: r }
    })
  }
}

const bruts = await pool(taches, CONCURRENCY)

const parCellule = CELLS.map((cell) => ({
  cell,
  runs: bruts.filter((b) => b.cell === cell).map((b) => b.run),
}))

const rendu = tableau(parCellule)
console.log(rendu)
writeFileSync('banc-resultats.md', rendu + '\n')
console.log('\nÉcrit dans banc-resultats.md\n')
