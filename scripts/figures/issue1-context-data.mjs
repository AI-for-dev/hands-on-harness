// Extrait des trois matrices `issue1-context` les chiffres que tracent les
// graphiques du module 3.1 (content/act3-contexte.md), et les écrit dans
// content/data/issue1-context.json. Les composants de
// .vitepress/theme/charts/ lisent ce fichier : la page ne recopie aucun
// chiffre à la main.
//
//   node scripts/figures/issue1-context-data.mjs <répertoire des résultats>
//
// Le répertoire est celui de trysquare-starter (results-2026-10-13), qui
// contient un sous-répertoire par modèle avec son measures.json.
//
// Une exécution qui n'a rien livré compte comme un échec : les taux sont
// calculés sur les vingt exécutions de chaque configuration, alors que la
// synthèse de trysquare retire ces exécutions du dénominateur.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../content/data/issue1-context.json')

const MODELS = [
  { id: 'gemma', label: 'gemma-4-31b', dir: 'issue1-context_etalon-v1_ilaas_gemma-4-31b_n20' },
  { id: 'qwen', label: 'qwen-3.8-27b', dir: 'issue1-context_etalon-v1_GRICAD_qwen-3.8-27b_n20' },
  {
    id: 'deepseek',
    label: 'DeepSeek-V4.1-Flash',
    dir: 'issue1-context_etalon-v1_GRICAD_ARES-DeepSeek-V4.1-Flash_n20'
  }
]
const METRICS = ['bounce_bricks', 'bounce_corners', 'bounce_tunneling', 'tests_added']
const LEVERS = ['add_tests', 'blind', 'well_crafted', 'thinking']

// Ordre des seize configurations dans les grilles : les lignes croisent le
// ticket et `blind`, les colonnes le raisonnement et la sonde.
const ROWS = [
  ['nothing', 'no-blind'],
  ['nothing', 'blind'],
  ['well_crafted', 'no-blind'],
  ['well_crafted', 'blind']
]
const COLS = [
  ['off', 'no-add_tests'],
  ['off', 'add_tests'],
  ['thinking_medium', 'no-add_tests'],
  ['thinking_medium', 'add_tests']
]

const BOOTSTRAP_DRAWS = 4000
const SEED = 20261013

// Générateur pseudo-aléatoire à graine (mulberry32), pour que les intervalles
// soient identiques d'une génération à l'autre.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const passes = (run, metric) => run.metrics?.[metric] === true

function leverOn(cell, lever) {
  const [ticket, blind, thinking, addTests] = cell.split(' / ')
  return {
    well_crafted: ticket === 'well_crafted',
    blind: blind === 'blind',
    thinking: thinking !== 'off',
    add_tests: addTests === 'add_tests'
  }[lever]
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length

// Intervalle à 95 % de la différence de deux proportions, par rééchantillonnage
// de chaque groupe.
function bootstrap(a, b, random) {
  const diffs = []
  for (let i = 0; i < BOOTSTRAP_DRAWS; i++) {
    let sa = 0
    let sb = 0
    for (let j = 0; j < a.length; j++) sa += a[Math.floor(random() * a.length)]
    for (let j = 0; j < b.length; j++) sb += b[Math.floor(random() * b.length)]
    diffs.push(sa / a.length - sb / b.length)
  }
  diffs.sort((x, y) => x - y)
  return [diffs[Math.floor(0.025 * BOOTSTRAP_DRAWS)], diffs[Math.floor(0.975 * BOOTSTRAP_DRAWS)]]
}

const root = process.argv[2]
if (!root) {
  console.error('usage: node scripts/figures/issue1-context-data.mjs <répertoire des résultats>')
  process.exit(1)
}

const random = rng(SEED)
const out = {
  source: 'trysquare-starter/results-2026-10-13',
  runsPerCell: 20,
  models: MODELS.map(({ id, label }) => ({ id, label })),
  metrics: METRICS,
  rows: ROWS,
  cols: COLS,
  cells: {},
  effects: {}
}

for (const model of MODELS) {
  const runs = JSON.parse(readFileSync(join(root, model.dir, 'measures.json'), 'utf8'))

  // cells[model][metric] : grille 4 × 4 de comptes sur vingt.
  out.cells[model.id] = {}
  for (const metric of METRICS) {
    out.cells[model.id][metric] = ROWS.map(([ticket, blind]) =>
      COLS.map(([thinking, addTests]) => {
        const cell = [ticket, blind, thinking, addTests].join(' / ')
        return runs.filter((r) => r.cell === cell && passes(r, metric)).length
      })
    )
  }

  // effects[model][lever][metric] : écart en points entre les 160 exécutions
  // qui ont le levier et les 160 qui ne l'ont pas, avec son intervalle.
  out.effects[model.id] = {}
  for (const lever of LEVERS) {
    out.effects[model.id][lever] = {}
    for (const metric of METRICS) {
      const on = runs.filter((r) => leverOn(r.cell, lever)).map((r) => (passes(r, metric) ? 1 : 0))
      const off = runs.filter((r) => !leverOn(r.cell, lever)).map((r) => (passes(r, metric) ? 1 : 0))
      const [lo, hi] = bootstrap(on, off, random)
      out.effects[model.id][lever][metric] = {
        diff: Math.round(100 * (mean(on) - mean(off))),
        lo: Math.round(100 * lo),
        hi: Math.round(100 * hi)
      }
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`écrit ${OUT}`)
