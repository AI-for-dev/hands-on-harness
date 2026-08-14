import type { LocaleSpecificConfig, DefaultTheme } from 'vitepress'

// Nav/sidebar labels are maintained by hand (see i18n/README.md). Page
// content is translated by scripts/i18n/translate.mjs.
//
// The sidebar acts as the book's table of contents: add each new chapter
// (a file under content/) here by hand, in reading order.
export const en: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: 'en-US',
  title: 'Hands-on Harness',
  description: 'A course to help you discover harnesses and tame them',
  themeConfig: {
    nav: [{ text: 'Contents', link: '/en/' }],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Overview', link: '/en/' },
          { text: 'The Method', link: '/en/methode' },
          { text: 'The Running Theme: NÉON', link: '/en/fil-rouge' }
        ]
      },
      {
        text: 'Act 1 - Foundations',
        items: [
          { text: 'LLMs in 2026', link: '/en/act1-llm' },
          { text: 'Why a harness, and what is it made of?', link: '/en/act1-harness' },
          { text: 'The starting harness: Pi', link: '/en/act1-pi' }
        ]
      },
      {
        text: 'Act 2 - Rebuilding',
        items: [
          { text: '2.1 Context and the window', link: '/en/act2-contexte' },
          { text: '2.2 Skills', link: '/en/act2-skill' }
        ]
      }
    ],
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous page', next: 'Next page' },
    returnToTopLabel: 'Return to top',
    sidebarMenuLabel: 'Contents',
    darkModeSwitchLabel: 'Appearance',
    // Shown on every page via .vitepress/theme/LicenseNotice.vue: VitePress'
    // built-in footer never shows when a sidebar is present, which is the
    // case everywhere here.
    license: {
      message: 'This content is published under the',
      linkText: 'CC BY-SA 4.0 license',
      linkHref: 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/AI-for-dev/hands-on-harness' }]
  }
}
