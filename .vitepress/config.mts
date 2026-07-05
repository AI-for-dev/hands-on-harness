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

  locales: {
    root: { label: 'Français', ...fr },
    en: { label: 'English', ...en },
    es: { label: 'Español', ...es }
  }
})
