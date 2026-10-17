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
import { gap, rng } from './lib/stats.mjs'

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

const SEED = 20261013

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
      out.effects[model.id][lever][metric] = gap(on, off, random)
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`écrit ${OUT}`)
