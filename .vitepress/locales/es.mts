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
        text: 'Introducción',
        items: [
          { text: 'Presentación', link: '/es/' },
          { text: 'El método', link: '/es/methode' },
          { text: 'El hilo conductor: NÉON', link: '/es/fil-rouge' }
        ]
      },
      {
        text: 'Acto 1 - Fundamentos',
        items: [
          { text: 'Los LLM en 2026', link: '/es/act1-llm' },
          { text: '¿Por qué un harness y de qué está hecho?', link: '/es/act1-harness' },
          { text: 'El harness de partida: Pi', link: '/es/act1-pi' }
        ]
      }
      // El acto 2 empieza por `act2-contexte`, que solo se añade aquí cuando
      // `npm run i18n:translate` haya generado content/es/act2-contexte.md.
      // Un enlace de la barra lateral hacia una página inexistente rompe la
      // compilación.
    ],
    outline: { level: [2, 3], label: 'En esta página' },
    docFooter: { prev: 'Página anterior', next: 'Página siguiente' },
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Índice',
    darkModeSwitchLabel: 'Apariencia',
    // Se muestra en cada página mediante .vitepress/theme/LicenseNotice.vue:
    // el footer integrado de VitePress nunca se muestra si hay una barra
    // lateral, que es el caso en todo el sitio.
    license: {
      message: 'Este contenido se publica bajo la',
      linkText: 'licencia CC BY-SA 4.0',
      linkHref: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es'
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/AI-for-dev/hands-on-harness' }]
  }
}
