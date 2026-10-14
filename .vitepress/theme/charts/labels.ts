// Textes des graphiques du module 3.1. Comme les autres textes d'interface
// (.vitepress/locales/), ils sont tenus à la main dans les trois langues : un
// composant n'est pas traduit par scripts/i18n/translate.mjs, qui ne voit que
// le markdown.

export type Lang = 'fr' | 'en' | 'es'

export function langOf(lang: string): Lang {
  const short = lang.slice(0, 2)
  return short === 'en' || short === 'es' ? short : 'fr'
}

export const labels = {
  fr: {
    metric: 'Métrique',
    metrics: {
      bounce_bricks: 'Critère : les quatre faces',
      bounce_corners: 'Coin de la brique',
      bounce_tunneling: 'Tunneling',
      tests_added: 'Tests ajoutés'
    },
    metricsShort: {
      bounce_bricks: 'critère',
      bounce_corners: 'coin',
      bounce_tunneling: 'tunneling',
      tests_added: 'tests ajoutés'
    },
    ticket: { nothing: 'Demande négligée', well_crafted: 'Ticket bien rédigé' },
    blind: { 'no-blind': 'avec ISSUES.md', blind: 'blind' },
    thinking: { off: 'Raisonnement off', thinking_medium: 'Raisonnement medium' },
    probe: { 'no-add_tests': 'sans sonde', add_tests: 'sonde' },
    thinkingShort: { off: 'off', thinking_medium: 'medium' },
    probeShort: { 'no-add_tests': 'sans', add_tests: 'avec' },
    thinkingHead: 'raisonnement',
    probeHead: 'sonde',
    outOf: 'exécutions réussies sur 20',
    hint: 'Survolez ou sélectionnez une case pour comparer les trois modèles sur la même configuration.',
    levers: {
      add_tests: 'Sonde fournie (add_tests)',
      blind: 'Sans ISSUES.md ni historique (blind)',
      well_crafted: 'Ticket bien rédigé (well_crafted)',
      thinking: 'Raisonnement medium'
    },
    effectAxis: 'écart en points (avec le levier − sans)',
    significant: 'intervalle à 95 % qui exclut zéro',
    notSignificant: 'intervalle qui contient zéro',
    pts: 'pts',
    effectHint: 'Survolez ou sélectionnez un point pour lire son intervalle.'
  },
  en: {
    metric: 'Metric',
    metrics: {
      bounce_bricks: 'Criterion: the four faces',
      bounce_corners: 'Brick corner',
      bounce_tunneling: 'Tunneling',
      tests_added: 'Tests added'
    },
    metricsShort: {
      bounce_bricks: 'criterion',
      bounce_corners: 'corner',
      bounce_tunneling: 'tunneling',
      tests_added: 'tests added'
    },
    ticket: { nothing: 'Neglected request', well_crafted: 'Well-written ticket' },
    blind: { 'no-blind': 'with ISSUES.md', blind: 'blind' },
    thinking: { off: 'Reasoning off', thinking_medium: 'Reasoning medium' },
    probe: { 'no-add_tests': 'no probe', add_tests: 'probe' },
    thinkingShort: { off: 'off', thinking_medium: 'medium' },
    probeShort: { 'no-add_tests': 'without', add_tests: 'with' },
    thinkingHead: 'reasoning',
    probeHead: 'probe',
    outOf: 'successful runs out of 20',
    hint: 'Hover or select a cell to compare the three models on the same configuration.',
    levers: {
      add_tests: 'Probe provided (add_tests)',
      blind: 'No ISSUES.md, no history (blind)',
      well_crafted: 'Well-written ticket (well_crafted)',
      thinking: 'Reasoning medium'
    },
    effectAxis: 'difference in points (with the lever − without)',
    significant: '95% interval excludes zero',
    notSignificant: 'interval contains zero',
    pts: 'pts',
    effectHint: 'Hover or select a point to read its interval.'
  },
  es: {
    metric: 'Métrica',
    metrics: {
      bounce_bricks: 'Criterio: las cuatro caras',
      bounce_corners: 'Esquina del ladrillo',
      bounce_tunneling: 'Tunneling',
      tests_added: 'Tests añadidos'
    },
    metricsShort: {
      bounce_bricks: 'criterio',
      bounce_corners: 'esquina',
      bounce_tunneling: 'tunneling',
      tests_added: 'tests añadidos'
    },
    ticket: { nothing: 'Petición descuidada', well_crafted: 'Ticket bien redactado' },
    blind: { 'no-blind': 'con ISSUES.md', blind: 'blind' },
    thinking: { off: 'Razonamiento off', thinking_medium: 'Razonamiento medium' },
    probe: { 'no-add_tests': 'sin sonda', add_tests: 'sonda' },
    thinkingShort: { off: 'off', thinking_medium: 'medium' },
    probeShort: { 'no-add_tests': 'sin', add_tests: 'con' },
    thinkingHead: 'razonamiento',
    probeHead: 'sonda',
    outOf: 'ejecuciones exitosas de 20',
    hint: 'Pase el cursor o seleccione una celda para comparar los tres modelos en la misma configuración.',
    levers: {
      add_tests: 'Sonda proporcionada (add_tests)',
      blind: 'Sin ISSUES.md ni historial (blind)',
      well_crafted: 'Ticket bien redactado (well_crafted)',
      thinking: 'Razonamiento medium'
    },
    effectAxis: 'diferencia en puntos (con la palanca − sin ella)',
    significant: 'intervalo al 95 % que excluye el cero',
    notSignificant: 'intervalo que contiene el cero',
    pts: 'pts',
    effectHint: 'Pase el cursor o seleccione un punto para leer su intervalo.'
  }
} as const
