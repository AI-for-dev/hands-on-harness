<script setup lang="ts">
import { useData } from 'vitepress'

// Le footer standard de VitePress (themeConfig.footer) ne s'affiche jamais
// quand une sidebar est présente (limitation documentée du thème par
// défaut) — or notre mise en page "livre" a toujours une sidebar. On
// injecte donc la mention de licence directement après le contenu de
// chaque page via le slot `doc-after`, indépendamment de la sidebar.
const { theme, frontmatter } = useData()
</script>

<template>
  <div v-if="frontmatter.license !== false && theme.license" class="cc-license-notice">
    {{ theme.license.message }}
    <a :href="theme.license.linkHref" target="_blank" rel="license noopener">{{
      theme.license.linkText
    }}</a>
  </div>
</template>

<style scoped>
.cc-license-notice {
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}

.cc-license-notice a {
  color: var(--vp-c-text-2);
  text-decoration: underline;
}
</style>
