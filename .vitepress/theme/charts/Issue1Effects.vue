<script setup lang="ts">
// L'effet moyen de chaque levier de la matrice issue1-context : pour chaque
// métrique, l'écart en points entre les 160 exécutions qui ont le levier et
// les 160 qui ne l'ont pas, avec son intervalle à 95 % par rééchantillonnage.
// Un point plein a un intervalle qui exclut zéro, un point creux non. Chaque
// modèle a sa couleur et sa forme, pour ne pas reposer sur la couleur seule.
import { computed, ref } from 'vue'
import { useData } from 'vitepress'
import data from '../../../content/data/issue1-context.json'
import { labels, langOf } from './labels'

const { lang } = useData()
const t = computed(() => labels[langOf(lang.value)])

const LEVERS = ['add_tests', 'well_crafted', 'thinking', 'blind'] as const
type Lever = (typeof LEVERS)[number]
type Metric = (typeof data.metrics)[number]
type Effect = { diff: number; lo: number; hi: number }

const effect = (model: string, lever: Lever, metric: Metric): Effect =>
  (data.effects as any)[model][lever][metric]

// Domaine commun aux quatre panneaux, arrondi à la dizaine, pour que les
// longueurs se comparent d'un levier à l'autre.
const all = data.models.flatMap((m) =>
  LEVERS.flatMap((l) => data.metrics.map((k) => effect(m.id, l, k as Metric)))
)
const MIN = Math.floor(Math.min(...all.map((e) => e.lo)) / 10) * 10
const MAX = Math.ceil(Math.max(...all.map((e) => e.hi)) / 10) * 10
const pos = (v: number) => `${((v - MIN) / (MAX - MIN)) * 100}%`
const TICKS = [-50, -25, 0, 25, 50].filter((v) => v >= MIN && v <= MAX)

const significant = (e: Effect) => e.lo > 0 || e.hi < 0
const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0')

const active = ref<{ model: string; lever: Lever; metric: Metric } | null>(null)

const readout = computed(() => {
  const a = active.value
  if (!a) return null
  const e = effect(a.model, a.lever, a.metric)
  const model = data.models.find((m) => m.id === a.model)!.label
  return {
    title: `${model} · ${t.value.levers[a.lever]} · ${t.value.metricsShort[a.metric]}`,
    value: `${signed(e.diff)} ${t.value.pts}  [${signed(e.lo)} ; ${signed(e.hi)}]`,
    verdict: significant(e) ? t.value.significant : t.value.notSignificant
  }
})
</script>

<template>
  <figure class="i1e">
    <div class="i1e-legend">
      <span v-for="(m, i) in data.models" :key="m.id" class="i1e-key">
        <span :class="['i1e-mark', `s${i}`]" aria-hidden="true"></span>{{ m.label }}
      </span>
      <span class="i1e-key i1e-key-muted">
        <span class="i1e-mark s-neutral" aria-hidden="true"></span>{{ t.significant }}
      </span>
      <span class="i1e-key i1e-key-muted">
        <span class="i1e-mark s-neutral hollow" aria-hidden="true"></span>{{ t.notSignificant }}
      </span>
    </div>

    <div class="i1e-panels">
      <section v-for="lever in LEVERS" :key="lever" class="i1e-panel">
        <h4 class="i1e-title">{{ t.levers[lever] }}</h4>
        <div v-for="metric in data.metrics" :key="metric" class="i1e-row">
          <div class="i1e-label">{{ t.metricsShort[metric as Metric] }}</div>
          <div class="i1e-track">
            <span
              v-for="tick in TICKS"
              :key="tick"
              :class="['i1e-grid', { zero: tick === 0 }]"
              :style="{ left: pos(tick) }"
            ></span>
            <button
              v-for="(m, i) in data.models"
              :key="m.id"
              type="button"
              :class="[
                'i1e-point',
                `lane${i}`,
                {
                  active:
                    active?.model === m.id && active?.lever === lever && active?.metric === metric
                }
              ]"
              :style="{
                left: pos(effect(m.id, lever, metric as Metric).lo),
                width: `calc(${pos(effect(m.id, lever, metric as Metric).hi)} - ${pos(effect(m.id, lever, metric as Metric).lo)})`
              }"
              :aria-label="`${m.label}, ${t.metricsShort[metric as Metric]} : ${signed(effect(m.id, lever, metric as Metric).diff)} ${t.pts}`"
              @mouseenter="active = { model: m.id, lever, metric: metric as Metric }"
              @focus="active = { model: m.id, lever, metric: metric as Metric }"
              @mouseleave="active = null"
              @blur="active = null"
            >
              <span :class="['i1e-ci', `s${i}`]"></span>
              <span
                :class="[
                  'i1e-mark',
                  `s${i}`,
                  { hollow: !significant(effect(m.id, lever, metric as Metric)) }
                ]"
                :style="{
                  left: `${((effect(m.id, lever, metric as Metric).diff - effect(m.id, lever, metric as Metric).lo) / Math.max(1, effect(m.id, lever, metric as Metric).hi - effect(m.id, lever, metric as Metric).lo)) * 100}%`
                }"
              ></span>
            </button>
          </div>
        </div>
        <div class="i1e-row i1e-axis" aria-hidden="true">
          <div class="i1e-label"></div>
          <div class="i1e-track">
            <span v-for="tick in TICKS" :key="tick" class="i1e-tick" :style="{ left: pos(tick) }">
              {{ signed(tick) }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <figcaption class="i1e-caption" aria-live="polite">
      <template v-if="readout">
        <span class="i1e-readout-title">{{ readout.title }}</span>
        <span class="i1e-readout-value">{{ readout.value }}</span>
        <span>{{ readout.verdict }}</span>
      </template>
      <template v-else>{{ t.effectAxis }}. {{ t.effectHint }}</template>
    </figcaption>
  </figure>
</template>

<style scoped>
.i1e {
  /* Trois premiers emplacements de la palette catégorielle de référence
     (bleu, orange, turquoise), validés deux à deux pour les daltonismes dans
     les deux modes. La forme du point double la couleur. */
  --i1e-s0: #2a78d6;
  --i1e-s1: #eb6834;
  --i1e-s2: #1baf7a;
  --i1e-neutral: var(--vp-c-text-2);
  margin: 1.5rem 0 2rem;
}

.dark .i1e {
  --i1e-s0: #3987e5;
  --i1e-s1: #d95926;
  --i1e-s2: #199e70;
}

.i1e-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.25rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.i1e-key {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.i1e-key-muted {
  color: var(--vp-c-text-2);
}

.i1e-key .i1e-mark {
  position: static;
  transform: none;
}

.i1e-key .i1e-mark.s2 {
  transform: rotate(45deg) scale(0.85);
}

.i1e-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1.5rem 2rem;
}

.vp-doc h4.i1e-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  line-height: 1.4;
  font-weight: 600;
}

.i1e-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  align-items: stretch;
  border-top: 1px solid var(--vp-c-divider);
}

.i1e-row.i1e-axis {
  border-top: 0;
}

.i1e-label {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  align-self: center;
  padding-right: 0.5rem;
  line-height: 1.25;
}

.i1e-track {
  position: relative;
  height: 3rem;
}

.i1e-axis .i1e-track {
  height: 1.4rem;
}

.i1e-grid {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--vp-c-divider);
}

.i1e-grid.zero {
  background: var(--vp-c-text-3);
}

.i1e-tick {
  position: absolute;
  top: 0.2rem;
  transform: translateX(-50%);
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

/* Une ligne par modèle dans chaque rangée : le bouton couvre l'intervalle,
   avec une hauteur qui déborde la marque pour faciliter le survol. */
.i1e-point {
  position: absolute;
  height: 0.9rem;
  min-width: 0.9rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform: translateY(-50%);
}

.i1e-point.lane0 {
  top: 25%;
}
.i1e-point.lane1 {
  top: 50%;
}
.i1e-point.lane2 {
  top: 75%;
}

.i1e-point:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
  border-radius: 3px;
}

.i1e-ci {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  border-radius: 1px;
  opacity: 0.55;
}

.i1e-ci.s0 {
  background: var(--i1e-s0);
}
.i1e-ci.s1 {
  background: var(--i1e-s1);
}
.i1e-ci.s2 {
  background: var(--i1e-s2);
}

.i1e-mark {
  position: absolute;
  top: 50%;
  width: 0.6rem;
  height: 0.6rem;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px var(--vp-c-bg);
  transition: transform 0.15s ease-out;
}

.i1e-mark.s0 {
  background: var(--i1e-s0);
  border: 2px solid var(--i1e-s0);
  border-radius: 50%;
}
.i1e-mark.s1 {
  background: var(--i1e-s1);
  border: 2px solid var(--i1e-s1);
  border-radius: 1px;
}
.i1e-mark.s2 {
  background: var(--i1e-s2);
  border: 2px solid var(--i1e-s2);
  transform: translate(-50%, -50%) rotate(45deg) scale(0.85);
}
.i1e-mark.s-neutral {
  background: var(--i1e-neutral);
  border: 2px solid var(--i1e-neutral);
  border-radius: 50%;
}

.i1e-mark.hollow {
  background: var(--vp-c-bg);
}

.i1e-point.active .i1e-ci {
  opacity: 1;
  height: 3px;
}

.i1e-point.active .i1e-mark {
  transform: translate(-50%, -50%) scale(1.35);
}
.i1e-point.active .i1e-mark.s2 {
  transform: translate(-50%, -50%) rotate(45deg) scale(1.15);
}

.i1e-caption {
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

.i1e-readout-title {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.i1e-readout-value {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
  white-space: pre;
}
</style>
