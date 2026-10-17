<script setup lang="ts">
// Les écarts de la matrice issue1-skill : chaque skill contre la demande
// seule, puis les deux skills entre eux. Pour chaque métrique, l'écart en
// points entre les vingt exécutions de chaque configuration, avec son
// intervalle à 95 % par rééchantillonnage.
import { computed } from 'vue'
import { useData } from 'vitepress'
import data from '../../../content/data/issue1-skill.json'
import EffectsChart, { type Effect } from './EffectsChart.vue'
import { labels, langOf } from './labels'

const { lang } = useData()
const t = computed(() => labels[langOf(lang.value)])
const s = computed(() => t.value.skill)

const panels = computed(() =>
  data.comparisons.map((key) => ({
    key,
    label: s.value.comparisons[key as keyof typeof s.value.comparisons]
  }))
)
const rows = computed(() =>
  data.effectMetrics.map((key) => ({
    key,
    label: s.value.metricsShort[key as keyof typeof s.value.metricsShort]
  }))
)
const text = computed(() => ({
  significant: t.value.significant,
  notSignificant: t.value.notSignificant,
  pts: t.value.pts,
  axis: s.value.effectAxis,
  hint: t.value.effectHint
}))

const effect = (model: string, comparison: string, metric: string): Effect =>
  (data.effects as any)[model][comparison][metric]
</script>

<template>
  <EffectsChart :models="data.models" :panels="panels" :rows="rows" :effect="effect" :text="text" />
</template>
