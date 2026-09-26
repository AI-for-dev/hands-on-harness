import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import LicenseNotice from './LicenseNotice.vue'
import Mermaid from './Mermaid.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Mermaid', Mermaid)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-after': () => h(LicenseNotice)
    })
  }
} satisfies Theme
