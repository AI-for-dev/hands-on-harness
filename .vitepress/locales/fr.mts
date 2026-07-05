import type { LocaleSpecificConfig, DefaultTheme } from 'vitepress'

// Textes de l'interface (nav, sidebar) maintenus à la main : ils sont trop
// courts et trop liés à la structure du site pour valoir la traduction par
// LLM (voir i18n/README.md). Le contenu des pages, lui, passe par
// scripts/i18n/translate.mjs.
//
// La sidebar fait office de sommaire de livre : chaque nouveau chapitre
// (fichier dans content/) doit y être ajouté à la main, dans l'ordre de
// lecture souhaité.
export const fr: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: 'fr-FR',
  title: 'Hands-on Harness',
  description: 'Une formation pour vous faire découvrir les harnais et les dompter',
  themeConfig: {
    nav: [{ text: 'Sommaire', link: '/' }],
    sidebar: [
      {
        text: 'Sommaire',
        items: [
          { text: 'Introduction', link: '/' },
          { text: '1. Qu\'est-ce qu\'un harnais ?', link: '/quest-ce-quun-harnais' }
        ]
      }
    ],
    outline: { level: [2, 3], label: 'Sur cette page' },
    docFooter: { prev: 'Page précédente', next: 'Page suivante' },
    returnToTopLabel: 'Revenir en haut',
    sidebarMenuLabel: 'Sommaire',
    darkModeSwitchLabel: 'Apparence',
    // Affiché sur chaque page via .vitepress/theme/LicenseNotice.vue : le
    // footer standard de VitePress ne s'affiche jamais quand une sidebar
    // est présente, ce qui est notre cas partout.
    license: {
      message: 'Ce contenu est publié sous licence',
      linkText: 'CC BY-SA 4.0',
      linkHref: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr'
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/AI-for-dev/hands-on-harness' }]
  }
}
