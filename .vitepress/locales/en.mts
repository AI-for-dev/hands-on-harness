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
        text: 'Contents',
        items: [
          { text: 'Introduction', link: '/en/' },
          { text: '1. What is a harness?', link: '/en/quest-ce-quun-harnais' }
        ]
      }
    ],
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous page', next: 'Next page' },
    returnToTopLabel: 'Return to top',
    sidebarMenuLabel: 'Contents',
    darkModeSwitchLabel: 'Appearance',
    socialLinks: [{ icon: 'github', link: 'https://github.com/AI-for-dev/hands-on-harness' }]
  }
}
