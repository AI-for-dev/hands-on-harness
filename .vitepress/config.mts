import { defineConfig } from 'vitepress'
import { fr } from './locales/fr.mts'
import { en } from './locales/en.mts'
import { es } from './locales/es.mts'

// Same attribution as LICENSE-CONTENT, shown under every page by
// .vitepress/theme/LicenseNotice.vue and exposed in the HTML metadata.
const authors = [
  { name: 'Loic Gouarin', link: 'https://github.com/gouarin' },
  { name: 'Max Beligné', link: 'https://github.com/PUD-GA' }
]

// French is the source language, served at the root (no prefix). English
// and Spanish are generated into content/en and content/es by
// `npm run i18n:translate` (see i18n/README.md) and served under /en/ and
// /es/.
//
// https://vitepress.dev/guide/i18n
export default defineConfig({
  srcDir: 'content',

  // The GitHub repository (AI-for-dev/hands-on-harness) publishes to
  // https://ai-for-dev.github.io/hands-on-harness/, a project page rather
  // than a user/organisation page served at the domain root. Without this
  // `base`, assets (CSS/JS) and internal links would point to the domain
  // root and break once deployed.
  base: '/hands-on-harness/',

  head: [['meta', { name: 'author', content: authors.map((a) => a.name).join(', ') }]],

  // Merged into each locale's themeConfig: the authors do not depend on
  // the language.
  themeConfig: {
    authors,
    copyrightYear: 2026
  },

  // A ```mermaid block becomes a <Mermaid> component rendered client-side
  // (.vitepress/theme/Mermaid.vue). The code is URI-encoded so it passes
  // through an attribute untouched, without Vue or markdown-it
  // interpreting it.
  markdown: {
    config(md) {
      const fence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        if (token.info.trim() === 'mermaid') {
          return `<Mermaid code="${encodeURIComponent(token.content)}" />`
        }
        return fence(tokens, idx, options, env, self)
      }
    }
  },

  locales: {
    root: { label: 'Français', ...fr },
    en: { label: 'English', ...en },
    es: { label: 'Español', ...es }
  }
})
