import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import LicenseNotice from './LicenseNotice.vue'
import Mermaid from './Mermaid.vue'
import Issue1Matrix from './charts/Issue1Matrix.vue'
import Issue1Effects from './charts/Issue1Effects.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Mermaid', Mermaid)
    app.component('Issue1Matrix', Issue1Matrix)
    app.component('Issue1Effects', Issue1Effects)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-after': () => h(LicenseNotice)
    })
  }
} satisfies Theme
