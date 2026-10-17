// Extrait des trois matrices `issue1-skill` les chiffres que tracent les
// graphiques du module 3.2 (content/act3-skill.md), et les écrit dans
// content/data/issue1-skill.json. Les composants de .vitepress/theme/charts/
// lisent ce fichier : la page ne recopie aucun chiffre à la main.
//
//   node scripts/figures/issue1-skill-data.mjs <répertoire des résultats>
//
// Le répertoire est celui de trysquare-starter (results-2026-10-17), qui
// contient un sous-répertoire par modèle avec son measures.json. Les deux
// lignes de comparaison viennent du module 3.1, lues dans
// content/data/issue1-context.json : lancez d'abord issue1-context-data.mjs
// si ce fichier manque.
//
// Comme au module 3.1, les taux sont calculés sur les vingt exécutions de
// chaque configuration. Une exécution qui n'a rien livré, ou dont les tests ne
// se lancent pas sur les arbres de référence (métrique sans valeur), compte
// comme un échec. `tests_sound` ne compte que les exécutions qui ont ajouté des
// tests : le validateur le déclare vrai quand aucun test n'échoue, ce qui est
// le cas d'une exécution qui n'en a écrit aucun.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gap, rng } from './lib/stats.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '../../content/data/issue1-skill.json')
const CONTEXT = join(HERE, '../../content/data/issue1-context.json')

const MODELS = [
  { id: 'gemma', label: 'gemma-4-31b', dir: 'issue1-skill_etalon-v1_ia4dev-gricad_gemma-4-31b_n20' },
  { id: 'qwen', label: 'qwen-3.8-27b', dir: 'issue1-skill_etalon-v1_ia4dev-gricad_qwen-3.8-27b_n20' },
  {
    id: 'deepseek',
    label: 'DeepSeek-V4.1-Flash',
    dir: 'issue1-skill_etalon-v1_ia4dev-gricad_ARES-DeepSeek-V4.1-Flash_n20'
  }
]
const CONFIGS = ['nothing', 'playtester', 'dynamic_playtester']

// Les colonnes de la grille, en deux vues : la correction notée par la sonde,
// et les tests de l'agent jugés sur les arbres de référence.
const GROUPS = {
  fix: ['bounce_bricks', 'bounce_corners', 'bounce_tunneling'],
  tests: ['detects_axis', 'detects_corner', 'detects_neighbors', 'detects_tunneling', 'tests_sound']
}

// Les configurations du module 3.1 les plus proches de `nothing` : demande
// négligée, `blind`, raisonnement medium, sans puis avec la sonde. Leur place
// dans les grilles de issue1-context.json (ligne, colonne).
const REFERENCES = {
  context_without_probe: [1, 2],
  context_with_probe: [1, 3]
}

// Les écarts tracés : chaque skill contre la demande seule, puis les deux
// skills entre eux, qui ne diffèrent que par leur catalogue.
const COMPARISONS = [
  ['playtester', 'nothing'],
  ['dynamic_playtester', 'nothing'],
  ['dynamic_playtester', 'playtester']
]
const EFFECT_METRICS = [
  'bounce_corners',
  'bounce_tunneling',
  'detects_axis',
  'detects_corner',
  'detects_neighbors'
]

const SEED = 20261017

function passes(run, metric) {
  if (metric === 'tests_sound' && run.metrics?.tests_added !== true) return false
  return run.metrics?.[metric] === true
}

const root = process.argv[2]
if (!root) {
  console.error('usage: node scripts/figures/issue1-skill-data.mjs <répertoire des résultats>')
  process.exit(1)
}

const context = JSON.parse(readFileSync(CONTEXT, 'utf8'))
const random = rng(SEED)
const out = {
  source: 'trysquare-starter/results-2026-10-17',
  runsPerCell: 20,
  models: MODELS.map(({ id, label }) => ({ id, label })),
  configs: CONFIGS,
  references: Object.keys(REFERENCES),
  groups: GROUPS,
  comparisons: COMPARISONS.map(([a, b]) => `${a}-${b}`),
  effectMetrics: EFFECT_METRICS,
  cells: {},
  reference: {},
  effects: {}
}

for (const model of MODELS) {
  const runs = JSON.parse(readFileSync(join(root, model.dir, 'measures.json'), 'utf8'))
  const metrics = [...GROUPS.fix, ...GROUPS.tests]

  // cells[model][config][metric] : exécutions réussies sur vingt.
  out.cells[model.id] = {}
  for (const config of CONFIGS) {
    const cell = runs.filter((r) => r.cell === config)
    if (cell.length !== out.runsPerCell) {
      throw new Error(`${model.dir} : ${cell.length} exécutions dans ${config}`)
    }
    out.cells[model.id][config] = Object.fromEntries(
      metrics.map((m) => [m, cell.filter((r) => passes(r, m)).length])
    )
  }

  // reference[model][référence][metric] : les métriques de correction du
  // module 3.1, les seules que les deux matrices partagent.
  out.reference[model.id] = {}
  for (const [key, [row, col]] of Object.entries(REFERENCES)) {
    out.reference[model.id][key] = Object.fromEntries(
      GROUPS.fix.map((m) => [m, context.cells[model.id][m][row][col]])
    )
  }

  // effects[model][comparaison][metric] : écart en points entre les vingt
  // exécutions de chaque configuration, avec son intervalle.
  out.effects[model.id] = {}
  for (const [a, b] of COMPARISONS) {
    const coded = (config, metric) =>
      runs.filter((r) => r.cell === config).map((r) => (passes(r, metric) ? 1 : 0))
    out.effects[model.id][`${a}-${b}`] = Object.fromEntries(
      EFFECT_METRICS.map((m) => [m, gap(coded(a, m), coded(b, m), random)])
    )
  }
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`écrit ${OUT}`)
