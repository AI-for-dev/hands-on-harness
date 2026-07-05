import type { LocaleSpecificConfig, DefaultTheme } from 'vitepress'

// Las etiquetas de nav/sidebar se mantienen a mano (ver i18n/README.md).
// El contenido de las páginas se traduce con scripts/i18n/translate.mjs.
//
// La barra lateral funciona como el índice del libro: añade aquí a mano
// cada nuevo capítulo (un archivo en content/), en el orden de lectura.
export const es: LocaleSpecificConfig<DefaultTheme.Config> = {
  lang: 'es-ES',
  title: 'Hands-on Harness',
  description: 'Un curso para descubrir los harnesses y domarlos',
  themeConfig: {
    nav: [{ text: 'Índice', link: '/es/' }],
    sidebar: [
      {
        text: 'Índice',
        items: [
          { text: 'Introducción', link: '/es/' },
          { text: '1. ¿Qué es un harness?', link: '/es/quest-ce-quun-harnais' }
        ]
      }
    ],
    outline: { level: [2, 3], label: 'En esta página' },
    docFooter: { prev: 'Página anterior', next: 'Página siguiente' },
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Índice',
    darkModeSwitchLabel: 'Apariencia',
    socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }]
  }
}
