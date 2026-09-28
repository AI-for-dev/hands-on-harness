<script setup lang="ts">
import { useData } from 'vitepress'

// VitePress's standard footer (themeConfig.footer) is never shown when a
// sidebar is present (a documented limitation of the default theme), and
// our "book" layout always has one. The authors and license notice is
// therefore injected right after each page's content through the
// `doc-after` slot, independently of the sidebar.
const { theme, frontmatter } = useData()
</script>

<template>
  <div v-if="frontmatter.license !== false && theme.license" class="cc-license-notice">
    <template v-if="theme.authors?.length">
      © {{ theme.copyrightYear }}
      <template v-for="(author, i) in theme.authors" :key="author.link"
        >{{ i > 0 ? ', ' : ''
        }}<a :href="author.link" target="_blank" rel="author noopener">{{
          author.name
        }}</a></template
      >.
    </template>
    {{ theme.license.message }}
    <a :href="theme.license.linkHref" target="_blank" rel="license noopener">{{
      theme.license.linkText
    }}</a>.
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
