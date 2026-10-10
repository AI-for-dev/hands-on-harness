import { readFileSync } from 'node:fs'
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

// Title of the collapsible block holding a quote's original wording. Kept by
// hand like the other interface texts of .vitepress/locales/.
const originalQuoteLabel: Record<string, string> = {
  fr: 'Texte original',
  en: 'Original text',
  es: 'Texto original'
}

// Language of a page from its path relative to content/: en/ and es/ hold the
// translations, everything else is the French source.
function pageLanguage(relativePath: string): string {
  const top = relativePath.split('/')[0]
  return top === 'en' || top === 'es' ? top : 'fr'
}

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
  //
  // A ```quote <lang> block holds the original wording of the quote just
  // above it (see scripts/i18n/lib/quotes.mjs). It is shown as a collapsible
  // "original text", except on the page in its own language, where the
  // translator has already put the original in place of the translation.
  //
  // `<<<@/file#L1-77` imports only lines 1 to 77 of the file. VitePress only
  // knows regions marked by comments, and a skill cannot carry a marker
  // above its frontmatter.
  markdown: {
    config(md) {
      const fence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const [src, region] = token.src ?? []
        const range = region?.match(/^L(\d+)-(\d+)$/)
        if (range) {
          env.includes?.push(src)
          token.content = readFileSync(src, 'utf8')
            .replace(/\r\n/g, '\n')
            .split('\n')
            .slice(Number(range[1]) - 1, Number(range[2]))
            .join('\n')
          token.src = undefined
        }
        const info = token.info.trim()
        if (info === 'mermaid') {
          return `<Mermaid code="${encodeURIComponent(token.content)}" />`
        }
        const quote = info.match(/^quote\s+(\S+)$/)
        if (quote) {
          const pageLang = pageLanguage(env.relativePath ?? '')
          if (quote[1] === pageLang) return ''
          const original = md.render(token.content, { ...env })
          return (
            `<details class="details custom-block original-quote">` +
            `<summary>${originalQuoteLabel[pageLang]}</summary>` +
            `<blockquote>${original}</blockquote></details>\n`
          )
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
