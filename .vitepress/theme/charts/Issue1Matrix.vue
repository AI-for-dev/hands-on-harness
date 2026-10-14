<script setup lang="ts">
// Les seize configurations de la matrice issue1-context, une grille 4 × 4 par
// modèle : les lignes croisent le ticket et `blind`, les colonnes le
// raisonnement et la sonde. La couleur donne l'ordre de grandeur, le chiffre
// la valeur exacte. Survoler une case met en évidence la même configuration
// chez les trois modèles et l'écrit en clair sous les grilles.
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import data from '../../../content/data/issue1-context.json'
import { labels, langOf } from './labels'

const { lang } = useData()
const t = computed(() => labels[langOf(lang.value)])

type Metric = (typeof data.metrics)[number]
const metric = ref<Metric>('bounce_bricks')
const active = ref<[number, number] | null>(null)

// Cinq classes sur vingt exécutions : la couleur sert à voir les motifs (une
// colonne qui s'éteint, une ligne qui s'allume), le chiffre reste dans la case.
function level(count: number): number {
  return Math.min(4, Math.floor(count / 4.01))
}

const count = (model: string, r: number, c: number): number =>
  (data.cells as any)[model][metric.value][r][c]

// Pistes de la grille : deux colonnes d'étiquettes, puis pour chaque modèle
// deux cases, un espace qui sépare raisonnement off et medium, deux cases, et
// un espace plus large avant le modèle suivant. Même principe pour les lignes,
// où l'espace sépare le ticket négligé du ticket rédigé.
const CELL = 'minmax(0, 1fr)'
const columns = (n: number) =>
  `auto auto ${Array.from({ length: n }, (_, i) =>
    [CELL, CELL, '6px', CELL, CELL, i < n - 1 ? '1.25rem' : ''].join(' ')
  ).join(' ')}`
const colOf = (mi: number, c: number) => 3 + mi * 6 + (c < 2 ? c : c + 1)
const rowOf = (r: number) => 4 + (r < 2 ? r : r + 1)

const layouts = [
  { key: 'wide', models: data.models },
  ...data.models.map((m) => ({ key: 'narrow', models: [m] }))
]

function cellLabel(r: number, c: number) {
  const L = t.value
  const [ticket, blind] = data.rows[r]
  const [thinking, probe] = data.cols[c]
  return [
    L.ticket[ticket as keyof typeof L.ticket],
    L.blind[blind as keyof typeof L.blind],
    L.thinking[thinking as keyof typeof L.thinking],
    L.probe[probe as keyof typeof L.probe]
  ].join(' · ')
}

function isActive(r: number, c: number) {
  return active.value !== null && active.value[0] === r && active.value[1] === c
}

const readout = computed(() => {
  if (!active.value) return null
  const [r, c] = active.value
  return {
    config: cellLabel(r, c),
    values: data.models.map((m) => ({ label: m.label, count: count(m.id, r, c) }))
  }
})
</script>

<template>
  <figure class="i1m">
    <div class="i1m-metrics" role="radiogroup" :aria-label="t.metric">
      <button
        v-for="m in data.metrics"
        :key="m"
        type="button"
        role="radio"
        :aria-checked="metric === m"
        :class="{ on: metric === m }"
        @click="metric = m as Metric"
      >
        {{ t.metrics[m as Metric] }}
      </button>
    </div>

    <!-- Deux mises en page du même contenu : les trois modèles côte à côte
         avec une seule colonne d'étiquettes quand la place le permet, un
         modèle sous l'autre sinon. Le conteneur choisit, pas l'écran. -->
    <div class="i1m-layouts">
      <div
        v-for="group in layouts"
        :key="group.key"
        :class="['i1m-models', group.key]"
        :style="{ gridTemplateColumns: columns(group.models.length) }"
      >
        <!-- étiquettes des colonnes -->
        <div class="i1m-head i1m-axis" :style="{ gridColumn: '1 / 3', gridRow: 2 }">
          {{ t.thinkingHead }}
        </div>
        <div class="i1m-head i1m-axis" :style="{ gridColumn: '1 / 3', gridRow: 3 }">
          {{ t.probeHead }}
        </div>
        <!-- étiquettes des lignes -->
        <template v-for="(row, r) in data.rows" :key="`row${r}`">
          <div
            v-if="r % 2 === 0"
            class="i1m-ticket"
            :style="{ gridColumn: 1, gridRow: `${rowOf(r)} / span 2` }"
          >
            <span>{{ t.ticket[row[0] as keyof typeof t.ticket] }}</span>
          </div>
          <div class="i1m-rowlabel" :style="{ gridColumn: 2, gridRow: rowOf(r) }">
            {{ t.blind[row[1] as keyof typeof t.blind] }}
          </div>
        </template>

        <template v-for="(model, mi) in group.models" :key="model.id">
          <div class="i1m-model-name" :style="{ gridColumn: `${colOf(mi, 0)} / span 5`, gridRow: 1 }">
            {{ model.label }}
          </div>
          <div
            v-for="c in [0, 2]"
            :key="`th${c}`"
            class="i1m-head"
            :style="{ gridColumn: `${colOf(mi, c)} / span 2`, gridRow: 2 }"
          >
            {{ t.thinkingShort[data.cols[c][0] as keyof typeof t.thinkingShort] }}
          </div>
          <div
            v-for="(col, c) in data.cols"
            :key="`pr${c}`"
            class="i1m-head i1m-sub"
            :style="{ gridColumn: colOf(mi, c), gridRow: 3 }"
          >
            {{ t.probeShort[col[1] as keyof typeof t.probeShort] }}
          </div>
          <template v-for="(row, r) in data.rows" :key="`r${r}`">
            <div
              v-for="(col, c) in data.cols"
              :key="`c${c}`"
              :class="[
                'i1m-cell',
                `l${level(count(model.id, r, c))}`,
                { active: isActive(r, c) }
              ]"
              :style="{ gridColumn: colOf(mi, c), gridRow: rowOf(r) }"
              tabindex="0"
              :aria-label="`${model.label}, ${cellLabel(r, c)} : ${count(model.id, r, c)}/20`"
              @mouseenter="active = [r, c]"
              @focus="active = [r, c]"
              @mouseleave="active = null"
              @blur="active = null"
            >
              {{ count(model.id, r, c) }}
            </div>
          </template>
        </template>
      </div>
    </div>

    <figcaption class="i1m-caption" aria-live="polite">
      <template v-if="readout">
        <span class="i1m-config">{{ readout.config }}</span>
        <span class="i1m-values">
          <span v-for="v in readout.values" :key="v.label">
            {{ v.label }} <strong>{{ v.count }}</strong>/20
          </span>
        </span>
      </template>
      <template v-else>
        <span class="i1m-legend" aria-hidden="true">
          <span class="i1m-swatch l0">0</span><span class="i1m-swatch l1"></span><span
            class="i1m-swatch l2"
          ></span><span class="i1m-swatch l3"></span><span class="i1m-swatch l4">20</span>
        </span>
        <span>{{ t.metrics[metric] }}, {{ t.outOf }}. {{ t.hint }}</span>
      </template>
    </figcaption>
  </figure>
</template>

<style scoped>
.i1m {
  /* Rampe séquentielle tirée de l'encre bleue du site (#34568b), du papier
     vers l'encre. En mode sombre, les faibles valeurs se fondent dans le fond
     et les fortes s'éclairent. */
  --i1m-l0: #ece6d8;
  --i1m-l1: #cdd6e6;
  --i1m-l2: #9fb3d2;
  --i1m-l3: #4e6ea4;
  --i1m-l4: #34568b;
  --i1m-ink-low: #2b2620;
  --i1m-ink-high: #fffdf8;
  margin: 1.5rem 0 2rem;
}

.dark .i1m {
  --i1m-l0: #29251e;
  --i1m-l1: #2e3a50;
  --i1m-l2: #3e5784;
  --i1m-l3: #6c8fc8;
  --i1m-l4: #a9c2ea;
  --i1m-ink-low: #ebe5d8;
  --i1m-ink-high: #161412;
}

.i1m-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.i1m-metrics button {
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.3;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.15s ease-out,
    color 0.15s ease-out,
    border-color 0.15s ease-out;
}

.i1m-metrics button:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.i1m-metrics button.on {
  background: var(--i1m-l4);
  border-color: var(--i1m-l4);
  color: var(--i1m-ink-high);
}

.i1m-metrics button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.i1m-cell:focus-visible {
  outline: none;
}

.i1m-layouts {
  container-type: inline-size;
}

.i1m-models {
  display: grid;
  grid-template-rows: auto auto auto 2.5rem 2.5rem 6px 2.5rem 2.5rem;
  gap: 2px;
  align-items: center;
}

.i1m-models.narrow {
  display: none;
}

.i1m-models.narrow + .i1m-models.narrow {
  margin-top: 1.5rem;
}

@container (max-width: 33rem) {
  .i1m-models.wide {
    display: none;
  }
  .i1m-models.narrow {
    display: grid;
  }
}

.i1m-model-name {
  font-weight: 600;
  font-size: 0.95rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.i1m-head {
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--vp-c-text-1);
  text-align: center;
  white-space: nowrap;
}

.i1m-head.i1m-sub {
  color: var(--vp-c-text-2);
  padding-bottom: 0.2rem;
}

.i1m-head.i1m-axis {
  text-align: right;
  color: var(--vp-c-text-3);
  font-style: italic;
  padding-right: 0.5rem;
}

.i1m-ticket {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--vp-c-divider);
  margin-right: 0.35rem;
  padding: 0 0.2rem;
}

.i1m-ticket span {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  /* Le libellé passe sur deux lignes s'il dépasse la hauteur des deux
     rangées qu'il couvre (« Ticket bien redactado » en espagnol). */
  max-height: 100%;
  text-align: center;
  line-height: 1.2;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.i1m-rowlabel {
  font-size: 0.75rem;
  line-height: 1.2;
  color: var(--vp-c-text-2);
  text-align: right;
  white-space: nowrap;
  padding-right: 0.5rem;
}

.i1m-cell {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  border-radius: 4px;
  cursor: default;
  transition: box-shadow 0.15s ease-out;
}

.l0 {
  background-color: var(--i1m-l0);
  color: var(--i1m-ink-low);
}
.l1 {
  background-color: var(--i1m-l1);
  color: var(--i1m-ink-low);
}
.l2 {
  background-color: var(--i1m-l2);
  color: var(--i1m-ink-low);
}
.l3 {
  background-color: var(--i1m-l3);
  color: var(--i1m-ink-high);
}
.l4 {
  background-color: var(--i1m-l4);
  color: var(--i1m-ink-high);
}

.i1m-cell.active {
  box-shadow:
    0 0 0 2px var(--vp-c-bg),
    0 0 0 4px var(--vp-c-text-1);
  font-weight: 700;
  position: relative;
  z-index: 1;
}

.i1m-caption {
  margin-top: 1rem;
  min-height: 3.2em;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 1rem;
}

.i1m-config {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.i1m-values {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.2rem 1rem;
  font-variant-numeric: tabular-nums;
}

.i1m-values strong {
  color: var(--vp-c-text-1);
}

.i1m-legend {
  display: inline-flex;
  gap: 2px;
}

.i1m-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.1rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
</style>
