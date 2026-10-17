<script setup lang="ts">
// Les trois configurations de la matrice issue1-skill, une colonne par modèle,
// pour la métrique choisie. Les métriques de correction ajoutent, sous un
// filet, les deux configurations du module 3.1 les plus proches. La couleur
// donne l'ordre de grandeur, le chiffre la valeur exacte. Survoler une case
// écrit sous la grille toutes les métriques du même groupe pour ce modèle et
// cette configuration. Mêmes couleurs que Issue1Matrix.
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import data from '../../../content/data/issue1-skill.json'
import { labels, langOf } from './labels'

const { lang } = useData()
const t = computed(() => labels[langOf(lang.value)])
const s = computed(() => t.value.skill)

type Group = keyof typeof data.groups
type Metric = keyof typeof labels.fr.skill.metrics
const GROUPS = Object.keys(data.groups) as Group[]

const metric = ref<Metric>('bounce_corners')
const group = computed(() => GROUPS.find((g) => (data.groups[g] as string[]).includes(metric.value))!)

// Une ligne de la grille : une configuration de cette matrice, ou une
// configuration du module 3.1 reprise pour comparaison, qui n'existe que pour
// les métriques de correction.
type Row = { key: string; reference: boolean }
const rows = computed<Row[]>(() => [
  ...data.configs.map((key) => ({ key, reference: false })),
  ...(group.value === 'fix' ? data.references.map((key) => ({ key, reference: true })) : [])
])

function value(model: string, row: Row, m: string): number {
  const source = row.reference ? (data.reference as any) : (data.cells as any)
  return source[model][row.key][m]
}

const rowLabel = (row: Row) =>
  row.reference
    ? s.value.references[row.key as keyof typeof s.value.references]
    : s.value.configs[row.key as keyof typeof s.value.configs]

// Cinq classes sur vingt exécutions, comme dans Issue1Matrix.
function level(count: number): number {
  return Math.min(4, Math.floor(count / 4.01))
}

// Pistes : une ligne de noms de modèles, les trois configurations, un
// intertitre et les deux lignes du module 3.1.
const gridRow = (r: number) => (r < data.configs.length ? 2 + r : 3 + r)

const active = ref<{ model: string; row: number } | null>(null)
const isActive = (model: string, r: number) =>
  active.value?.model === model && active.value?.row === r

const readout = computed(() => {
  const a = active.value
  if (!a) return null
  const row = rows.value[a.row]
  if (!row) return null
  const model = data.models.find((m) => m.id === a.model)!.label
  return {
    title: `${model} · ${rowLabel(row)}`,
    values: (data.groups[group.value] as string[]).map((m) => ({
      label: s.value.metricsShort[m as Metric],
      count: value(a.model, row, m),
      current: m === metric.value
    }))
  }
})
</script>

<template>
  <figure class="i1s">
    <div class="i1s-groups">
      <div
        v-for="g in GROUPS"
        :key="g"
        class="i1s-group"
        role="radiogroup"
        :aria-label="s.groups[g]"
      >
        <span class="i1s-group-name">{{ s.groups[g] }}</span>
        <div class="i1s-pills">
          <button
            v-for="m in data.groups[g]"
            :key="m"
            type="button"
            role="radio"
            :aria-checked="metric === m"
            :class="{ on: metric === m }"
            @click="metric = m as Metric"
          >
            {{ s.metrics[m as Metric] }}
          </button>
        </div>
      </div>
    </div>

    <div class="i1s-grid">
      <div
        v-for="(model, mi) in data.models"
        :key="model.id"
        class="i1s-model-name"
        :style="{ gridColumn: 2 + mi, gridRow: 1 }"
      >
        {{ model.label }}
      </div>

      <div
        class="i1s-reference-head"
        :style="{ gridColumn: '1 / -1', gridRow: data.configs.length + 2 }"
      >
        {{ s.referenceHead }}
      </div>
      <!-- Le module 3.1 n'a jugé que la correction : pour les tests, la place
           de ses deux lignes reste, pour que la grille garde sa hauteur, et dit
           pourquoi elle est vide. -->
      <div
        v-if="group !== 'fix'"
        class="i1s-reference-none"
        :style="{
          gridColumn: '2 / -1',
          gridRow: `${data.configs.length + 3} / span ${data.references.length}`
        }"
      >
        {{ s.referenceNone }}
      </div>

      <template v-for="(row, r) in rows" :key="row.key">
        <div
          :class="['i1s-rowlabel', { reference: row.reference }]"
          :style="{ gridColumn: 1, gridRow: gridRow(r) }"
        >
          {{ rowLabel(row) }}
        </div>
        <div
          v-for="(model, mi) in data.models"
          :key="model.id"
          :class="[
            'i1s-cell',
            `l${level(value(model.id, row, metric))}`,
            { reference: row.reference, active: isActive(model.id, r) }
          ]"
          :style="{ gridColumn: 2 + mi, gridRow: gridRow(r) }"
          tabindex="0"
          :aria-label="`${model.label}, ${rowLabel(row)}, ${s.metricsShort[metric]} : ${value(model.id, row, metric)}/20`"
          @mouseenter="active = { model: model.id, row: r }"
          @focus="active = { model: model.id, row: r }"
          @mouseleave="active = null"
          @blur="active = null"
        >
          {{ value(model.id, row, metric) }}
        </div>
      </template>
    </div>

    <figcaption class="i1s-caption" aria-live="polite">
      <template v-if="readout">
        <span class="i1s-config">{{ readout.title }}</span>
        <span class="i1s-values">
          <span v-for="v in readout.values" :key="v.label" :class="{ current: v.current }">
            {{ v.label }} <strong>{{ v.count }}</strong>/20
          </span>
        </span>
      </template>
      <template v-else>
        <span class="i1s-legend" aria-hidden="true">
          <span class="i1s-swatch l0">0</span><span class="i1s-swatch l1"></span><span
            class="i1s-swatch l2"
          ></span><span class="i1s-swatch l3"></span><span class="i1s-swatch l4">20</span>
        </span>
        <span>{{ s.metrics[metric] }}, {{ t.outOf }}. {{ s.hint }}</span>
      </template>
    </figcaption>
  </figure>
</template>

<style scoped>
.i1s {
  /* La rampe de Issue1Matrix, tirée de l'encre bleue du site. */
  --i1s-l0: #ece6d8;
  --i1s-l1: #cdd6e6;
  --i1s-l2: #9fb3d2;
  --i1s-l3: #4e6ea4;
  --i1s-l4: #34568b;
  --i1s-ink-low: #2b2620;
  --i1s-ink-high: #fffdf8;
  margin: 1.5rem 0 2rem;
}

.dark .i1s {
  --i1s-l0: #29251e;
  --i1s-l1: #2e3a50;
  --i1s-l2: #3e5784;
  --i1s-l3: #6c8fc8;
  --i1s-l4: #a9c2ea;
  --i1s-ink-low: #ebe5d8;
  --i1s-ink-high: #161412;
}

.i1s-groups {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.i1s-group {
  display: grid;
  grid-template-columns: 9.5rem 1fr;
  align-items: start;
  gap: 0.375rem;
}

.i1s-group-name {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-2);
  /* aligné sur la première rangée de boutons */
  padding-top: 0.45rem;
}

.i1s-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.i1s-pills button {
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

.i1s-pills button:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

.i1s-pills button.on {
  background: var(--i1s-l4);
  border-color: var(--i1s-l4);
  color: var(--i1s-ink-high);
}

.i1s-pills button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.i1s-grid {
  display: grid;
  grid-template-columns: auto repeat(3, minmax(0, 1fr));
  grid-template-rows: auto repeat(3, 2.5rem) auto repeat(2, 2.5rem);
  gap: 2px;
  align-items: center;
  max-width: 40rem;
}

.i1s-model-name {
  align-self: end;
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.25rem;
}

.i1s-rowlabel {
  font-size: 0.8rem;
  line-height: 1.2;
  color: var(--vp-c-text-1);
  text-align: right;
  padding-right: 0.75rem;
}

.i1s-rowlabel.reference {
  color: var(--vp-c-text-2);
  font-style: italic;
}

.i1s-reference-head {
  align-self: end;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--vp-c-text-3);
  border-top: 1px dashed var(--vp-c-divider);
  padding-top: 0.35rem;
  margin-top: 0.5rem;
}

.i1s-reference-none {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 1rem;
  font-size: 0.8rem;
  font-style: italic;
  line-height: 1.4;
  color: var(--vp-c-text-3);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 4px;
}

.i1s-cell {
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

.i1s-cell:focus-visible {
  outline: none;
}

/* Les lignes du module 3.1 sont une comparaison et non une mesure de cette
   matrice : même couleur, chiffre en italique, sous un intertitre. */
.i1s-cell.reference {
  font-style: italic;
}

.l0 {
  background-color: var(--i1s-l0);
  color: var(--i1s-ink-low);
}
.l1 {
  background-color: var(--i1s-l1);
  color: var(--i1s-ink-low);
}
.l2 {
  background-color: var(--i1s-l2);
  color: var(--i1s-ink-low);
}
.l3 {
  background-color: var(--i1s-l3);
  color: var(--i1s-ink-high);
}
.l4 {
  background-color: var(--i1s-l4);
  color: var(--i1s-ink-high);
}

.i1s-cell.active {
  box-shadow:
    0 0 0 2px var(--vp-c-bg),
    0 0 0 4px var(--vp-c-text-1);
  font-weight: 700;
  position: relative;
  z-index: 1;
}

.i1s-caption {
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

.i1s-config {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.i1s-values {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.2rem 1rem;
  font-variant-numeric: tabular-nums;
}

.i1s-values strong {
  color: var(--vp-c-text-1);
}

.i1s-values .current {
  color: var(--vp-c-text-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.i1s-legend {
  display: inline-flex;
  gap: 2px;
}

.i1s-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.1rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 480px) {
  .i1s-group {
    grid-template-columns: 1fr;
  }
  .i1s-group-name {
    padding-top: 0;
  }
  .i1s-model-name {
    font-size: 0.8rem;
  }
  .i1s-rowlabel {
    font-size: 0.75rem;
    padding-right: 0.4rem;
  }
}
</style>
