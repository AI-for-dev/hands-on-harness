// Textes des graphiques des modules 3.1 et 3.2. Comme les autres textes d'interface
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
    effectHint: 'Survolez ou sélectionnez un point pour lire son intervalle.',
    skill: {
      groups: { fix: 'La correction', tests: "Les tests de l'agent" },
      metrics: {
        bounce_bricks: 'Les quatre faces',
        bounce_corners: 'Coin de la brique',
        bounce_tunneling: 'Tunneling',
        detects_axis: "Critère : détecte l'axe",
        detects_corner: 'Détecte le coin',
        detects_neighbors: 'Détecte la jonction',
        detects_tunneling: 'Détecte le tunneling',
        tests_sound: 'Tests sains'
      },
      metricsShort: {
        bounce_bricks: 'quatre faces',
        bounce_corners: 'coin corrigé',
        bounce_tunneling: 'tunneling corrigé',
        detects_axis: "détecte l'axe",
        detects_corner: 'détecte le coin',
        detects_neighbors: 'détecte la jonction',
        detects_tunneling: 'détecte le tunneling',
        tests_sound: 'tests sains'
      },
      configs: {
        nothing: 'Sans skill',
        playtester: 'playtester',
        dynamic_playtester: 'dynamic-playtester'
      },
      references: {
        context_without_probe: 'sans la sonde',
        context_with_probe: 'avec la sonde'
      },
      referenceHead: 'Module 3.1 : demande négligée, blind, raisonnement medium',
      referenceNone: "Le module 3.1 n'a jugé que la correction, et non les tests de l'agent.",
      comparisons: {
        'playtester-nothing': 'playtester contre sans skill',
        'dynamic_playtester-nothing': 'dynamic-playtester contre sans skill',
        'dynamic_playtester-playtester': 'dynamic-playtester contre playtester'
      },
      hint: 'Survolez ou sélectionnez une case pour lire toutes les métriques de cette configuration.',
      effectAxis: 'écart en points entre les deux configurations, vingt exécutions de chaque côté'
    }
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
    effectHint: 'Hover or select a point to read its interval.',
    skill: {
      groups: { fix: 'The fix', tests: "The agent's tests" },
      metrics: {
        bounce_bricks: 'The four faces',
        bounce_corners: 'Brick corner',
        bounce_tunneling: 'Tunneling',
        detects_axis: 'Criterion: catches the axis',
        detects_corner: 'Catches the corner',
        detects_neighbors: 'Catches the seam',
        detects_tunneling: 'Catches tunneling',
        tests_sound: 'Sound tests'
      },
      metricsShort: {
        bounce_bricks: 'four faces',
        bounce_corners: 'corner fixed',
        bounce_tunneling: 'tunneling fixed',
        detects_axis: 'catches the axis',
        detects_corner: 'catches the corner',
        detects_neighbors: 'catches the seam',
        detects_tunneling: 'catches tunneling',
        tests_sound: 'sound tests'
      },
      configs: {
        nothing: 'No skill',
        playtester: 'playtester',
        dynamic_playtester: 'dynamic-playtester'
      },
      references: {
        context_without_probe: 'without the probe',
        context_with_probe: 'with the probe'
      },
      referenceHead: 'Module 3.1: neglected request, blind, reasoning medium',
      referenceNone: "Module 3.1 only judged the fix, not the agent's tests.",
      comparisons: {
        'playtester-nothing': 'playtester against no skill',
        'dynamic_playtester-nothing': 'dynamic-playtester against no skill',
        'dynamic_playtester-playtester': 'dynamic-playtester against playtester'
      },
      hint: 'Hover or select a cell to read every metric of that configuration.',
      effectAxis: 'difference in points between the two configurations, twenty runs on each side'
    }
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
    effectHint: 'Pase el cursor o seleccione un punto para leer su intervalo.',
    skill: {
      groups: { fix: 'La corrección', tests: 'Los tests del agente' },
      metrics: {
        bounce_bricks: 'Las cuatro caras',
        bounce_corners: 'Esquina del ladrillo',
        bounce_tunneling: 'Tunneling',
        detects_axis: 'Criterio: detecta el eje',
        detects_corner: 'Detecta la esquina',
        detects_neighbors: 'Detecta la junta',
        detects_tunneling: 'Detecta el tunneling',
        tests_sound: 'Tests sanos'
      },
      metricsShort: {
        bounce_bricks: 'cuatro caras',
        bounce_corners: 'esquina corregida',
        bounce_tunneling: 'tunneling corregido',
        detects_axis: 'detecta el eje',
        detects_corner: 'detecta la esquina',
        detects_neighbors: 'detecta la junta',
        detects_tunneling: 'detecta el tunneling',
        tests_sound: 'tests sanos'
      },
      configs: {
        nothing: 'Sin skill',
        playtester: 'playtester',
        dynamic_playtester: 'dynamic-playtester'
      },
      references: {
        context_without_probe: 'sin la sonda',
        context_with_probe: 'con la sonda'
      },
      referenceHead: 'Módulo 3.1: petición descuidada, blind, razonamiento medium',
      referenceNone: 'El módulo 3.1 solo juzgó la corrección, no los tests del agente.',
      comparisons: {
        'playtester-nothing': 'playtester frente a sin skill',
        'dynamic_playtester-nothing': 'dynamic-playtester frente a sin skill',
        'dynamic_playtester-playtester': 'dynamic-playtester frente a playtester'
      },
      hint: 'Pase el cursor o seleccione una celda para leer todas las métricas de esa configuración.',
      effectAxis: 'diferencia en puntos entre las dos configuraciones, veinte ejecuciones de cada lado'
    }
  }
} as const
