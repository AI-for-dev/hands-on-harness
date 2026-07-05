import { defineConfig } from 'vitepress'
import { fr } from './locales/fr.mts'
import { en } from './locales/en.mts'
import { es } from './locales/es.mts'

// Le français est la langue source, servie à la racine (pas de préfixe).
// L'anglais et l'espagnol sont générés automatiquement dans content/en et
// content/es par `npm run i18n:translate` (voir i18n/README.md) et servis
// sous /en/ et /es/.
//
// https://vitepress.dev/guide/i18n
export default defineConfig({
  srcDir: 'content',

  // Le dépôt GitHub (AI-for-dev/hands-on-harness) publie sur
  // https://ai-for-dev.github.io/hands-on-harness/ : une page de projet, pas
  // une page utilisateur/organisation (qui serait servie à la racine). Sans
  // ce `base`, les assets (CSS/JS) et les liens internes pointeraient vers
  // la racine du domaine et casseraient une fois déployés.
  base: '/hands-on-harness/',

  locales: {
    root: { label: 'Français', ...fr },
    en: { label: 'English', ...en },
    es: { label: 'Español', ...es }
  }
})
