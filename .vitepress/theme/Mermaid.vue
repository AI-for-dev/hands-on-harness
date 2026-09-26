<script setup lang="ts">
// Rendu côté client des blocs ```mermaid (voir markdown.config dans
// config.mts). mermaid touche au DOM, il est donc importé au montage et
// jamais pendant le build SSR. Le graphe est redessiné quand le thème
// clair/sombre change.
import { onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{ code: string }>()
const { isDark } = useData()
const root = ref<HTMLElement>()
const svg = ref('')
let seq = 0

async function render() {
  const { default: mermaid } = await import('mermaid')
  const style = getComputedStyle(root.value!)
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark.value ? 'dark' : 'default',
    // mermaid mesure le texte pour dimensionner les nœuds : une variable CSS
    // non résolue fausse la mesure et rogne les libellés.
    fontFamily: style.fontFamily,
    themeVariables: {
      edgeLabelBackground: style.getPropertyValue('--vp-c-bg').trim()
    }
  })
  const id = `mermaid-${Math.random().toString(36).slice(2)}-${seq++}`
  svg.value = (await mermaid.render(id, decodeURIComponent(props.code))).svg
}

onMounted(render)
watch(isDark, render)
</script>

<template>
  <div ref="root" class="mermaid-diagram" v-html="svg" />
</template>

<style scoped>
.mermaid-diagram {
  display: flex;
  justify-content: center;
  margin: 16px 0;
  overflow-x: auto;
}

/* Les libellés mermaid sont des <p> dans un foreignObject : sans ce reset,
   la hauteur de ligne de .vp-doc p s'y applique et rogne le texte. */
.mermaid-diagram :deep(foreignObject p) {
  margin: 0;
  line-height: 1.5;
}
</style>
