<script setup lang="ts">
// L'effet moyen de chaque levier de la matrice issue1-context : pour chaque
// métrique, l'écart en points entre les 160 exécutions qui ont le levier et
// les 160 qui ne l'ont pas, avec son intervalle à 95 % par rééchantillonnage.
import { computed } from 'vue'
import { useData } from 'vitepress'
import data from '../../../content/data/issue1-context.json'
import EffectsChart, { type Effect } from './EffectsChart.vue'
import { labels, langOf } from './labels'

const { lang } = useData()
const t = computed(() => labels[langOf(lang.value)])

const LEVERS = ['add_tests', 'well_crafted', 'thinking', 'blind'] as const

const panels = computed(() => LEVERS.map((key) => ({ key, label: t.value.levers[key] })))
const rows = computed(() =>
  data.metrics.map((key) => ({
    key,
    label: t.value.metricsShort[key as keyof typeof t.value.metricsShort]
  }))
)
const text = computed(() => ({
  significant: t.value.significant,
  notSignificant: t.value.notSignificant,
  pts: t.value.pts,
  axis: t.value.effectAxis,
  hint: t.value.effectHint
}))

const effect = (model: string, lever: string, metric: string): Effect =>
  (data.effects as any)[model][lever][metric]
</script>

<template>
  <EffectsChart :models="data.models" :panels="panels" :rows="rows" :effect="effect" :text="text" />
</template>
