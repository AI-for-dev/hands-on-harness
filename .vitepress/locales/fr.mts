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
        text: 'Introduction',
        items: [
          { text: 'Présentation', link: '/' },
          { text: 'La méthode', link: '/methode' },
          { text: 'Le fil rouge : NÉON', link: '/fil-rouge' }
        ]
      },
      {
        text: 'Acte 1 — Fondations',
        items: [
          { text: 'Les LLM en 2026', link: '/act1-llm' },
          { text: 'Pourquoi un harnais, et de quoi est-il fait ?', link: '/act1-harness' },
          { text: 'Le harnais de départ : Pi', link: '/act1-pi' }
        ]
      },
      {
        text: 'Acte 2 — Reconstruction',
        items: [
          { text: '2.1 Le contexte et la fenêtre', link: '/act2-contexte' },
          { text: '2.2 Les compétences', link: '/act2-skill' }
        ]
      },
      // {
      //   text: 'Acte 2 — Reconstruction (suite)',
      //   items: [
      //     { text: '2.2 Les outils', link: '/act2-outils' },
      //     { text: '2.3 La délégation', link: '/act2-delegation' },
      //     { text: '2.4 Les workflows', link: '/act2-workflows' },
      //     { text: '2.5 La mémoire persistante', link: '/act2-memoire' },
      //     { text: '2.6 Les permissions et la sûreté', link: '/act2-securite' }
      //   ]
      // },
      // {
      //   text: 'Acte 3 — Vérifier, évaluer, observer',
      //   items: [
      //     { text: '3.1 Tester les briques', link: '/act3-tester' },
      //     { text: '3.2 Évaluer le harnais', link: '/act3-evaluer' },
      //     { text: '3.3 Observabilité et coût', link: '/act3-observabilite' }
      //   ]
      // },
      // {
      //   text: 'Acte 4 — Construire son harnais',
      //   items: [
      //     { text: '4.0 De l\'issue au commit, en autonomie', link: '/act4-revelation' },
      //     { text: '4.1 Remplacez NÉON par votre cas', link: '/act4-capstone' }
      //   ]
      // },
      // {
      //   text: 'Annexes',
      //   items: [
      //     { text: 'Annexes et glossaire', link: '/annexes' }
      //   ]
      // }
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
