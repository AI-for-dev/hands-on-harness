import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import LicenseNotice from './LicenseNotice.vue'
import Mermaid from './Mermaid.vue'
import Issue1Matrix from './charts/Issue1Matrix.vue'
import Issue1Effects from './charts/Issue1Effects.vue'
import Issue1SkillMatrix from './charts/Issue1SkillMatrix.vue'
import Issue1SkillEffects from './charts/Issue1SkillEffects.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Mermaid', Mermaid)
    app.component('Issue1Matrix', Issue1Matrix)
    app.component('Issue1Effects', Issue1Effects)
    app.component('Issue1SkillMatrix', Issue1SkillMatrix)
    app.component('Issue1SkillEffects', Issue1SkillEffects)
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-after': () => h(LicenseNotice)
    })
  }
} satisfies Theme
