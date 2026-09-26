// Génère les infographies des motifs de workflow (act2-workflows.md),
// une version claire et une version sombre par opérateur, dans
// content/figures/workflows/. Les deux thèmes partagent le même dessin : seules
// les teintes changent, alignées sur les couleurs papier/encre du site
// (.vitepress/theme/custom.css).
//
//   node scripts/figures/workflow-nodes.mjs

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../content/figures/workflows')

const THEMES = {
  light: {
    card: '#f2ede1',
    cardStroke: '#e2d9c6',
    surface: '#fffdf8',
    pill: '#e8e0cd',
    line: '#b9ad96',
    text: '#2b2620',
    text2: '#6f6557',
    accent: '#34568b',
    accentSoft: '#e3e8f1',
    danger: '#b0412c'
  },
  dark: {
    card: '#211e19',
    cardStroke: '#332e26',
    surface: '#2a261f',
    pill: '#332e26',
    line: '#5e5646',
    text: '#ece6da',
    text2: '#a89e8e',
    accent: '#93b2e2',
    accentSoft: '#2a3242',
    danger: '#e3846f'
  }
}

const W = 800
const H = 380
const CY = 232 // axe horizontal du schéma
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"

// Langue en cours de génération, et ses libellés (voir LABELS en fin de
// fichier). Le français est la langue source : ses libellés sont ceux écrits
// dans les figures.
let LANG = 'fr'
const missing = new Set()
const tr = (s) => {
  if (LANG === 'fr') return s
  const translated = LABELS[LANG]?.[s]
  if (translated === undefined) missing.add(s)
  return translated ?? s
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Chaque primitive reçoit le thème `c` et rend un fragment SVG.

const text = (c, x, y, s, { size = 13, fill = c.text2, anchor = 'middle', font = SERIF, weight = 400, italic = false, spacing = 0, raw = false } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''}${spacing ? ` letter-spacing="${spacing}"` : ''} fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle">${esc(raw ? s : tr(s))}</text>`

// Agent : le seul élément « actif » du schéma, donc le seul en couleur d'accent.
// En pointillés : rouge s'il a échoué, couleur d'accent s'il est optionnel.
const agent = (c, x, cy, w, label, { h = 52, failed = false, optional = false } = {}) => {
  const stroke = failed ? c.danger : c.accent
  const dashed = failed || optional
  return [
    `<rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="10" fill="${dashed ? c.surface : c.accentSoft}" stroke="${stroke}" stroke-width="1.5"${dashed ? ' stroke-dasharray="5 4"' : ''}/>`,
    text(c, x + w / 2, cy - 8, 'AGENT', { size: 9, fill: stroke, font: MONO, spacing: 1.2 }),
    text(c, x + w / 2, cy + 9, label, { size: 15, fill: c.text })
  ].join('')
}

// Nœud qui ne fait tourner aucun agent (check, ask, commit, flow) : neutre,
// angles plus vifs que ceux d'un agent, sourcil au nom du nœud.
const box = (c, x, cy, w, kind, label, { h = 52, mono = false, fill } = {}) =>
  [
    `<rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="4" fill="${fill ?? c.surface}" stroke="${c.line}" stroke-width="1.5"/>`,
    text(c, x + w / 2, cy - 8, kind.toUpperCase(), { size: 9, font: MONO, spacing: 1.2 }),
    text(c, x + w / 2, cy + 9, label, { size: mono ? 13 : 15, fill: c.text, font: mono ? MONO : SERIF })
  ].join('')

// Entrée, sortie, données : neutres, en pastille.
// `outline` distingue une consigne des données qu'elle accompagne.
const pill = (c, x, cy, w, label, { h = 34, mono = false, failed = false, outline = false } = {}) =>
  [
    `<rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${failed ? 'none' : outline ? c.surface : c.pill}"${failed ? ` stroke="${c.danger}" stroke-width="1.2" stroke-dasharray="4 3"` : outline ? ` stroke="${c.line}" stroke-width="1.2"` : ''}/>`,
    text(c, x + w / 2, cy + 1, label, { size: mono ? 12.5 : 14, fill: failed ? c.danger : c.text, font: mono ? MONO : SERIF })
  ].join('')

const diamond = (c, cx, cy, r, label) =>
  [
    `<path d="M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z" fill="${c.surface}" stroke="${c.line}" stroke-width="1.5" stroke-linejoin="round"/>`,
    text(c, cx, cy + 1, label, { size: 12.5, fill: c.text, font: MONO })
  ].join('')

const arrow = (c, d, { dashed = false, color = c.line } = {}) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${dashed ? ' stroke-dasharray="4 4"' : ''} marker-end="url(#${color === c.danger ? 'head-danger' : 'head'})"/>`

const line = (c, d, { dashed = false } = {}) =>
  `<path d="${d}" fill="none" stroke="${c.line}" stroke-width="1.5" stroke-linecap="round"${dashed ? ' stroke-dasharray="4 4"' : ''}/>`

// Courbe horizontale douce entre deux points, pour les éventails.
const curve = (x1, y1, x2, y2) => {
  const mx = (x1 + x2) / 2
  return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`
}

const column = (c, x, label) => text(c, x, 134, tr(label).toUpperCase(), { size: 10, font: MONO, spacing: 1.2, raw: true })

const vdots = (c, x, y) => [-5, 0, 5].map((d) => `<circle cx="${x}" cy="${y + d}" r="1.6" fill="${c.text2}"/>`).join('')

const FIGURES = {
  chain: {
    title: 'chain',
    nodes: 'agent → agent',
    subtitle: '1 → 1 → 1 : la sortie d’un pas nourrit le suivant',
    note: 'Chaque nœud lit la sortie du précédent ; un nœud en échec arrête la suite.',
    draw: (c) => {
      const xs = [178, 340, 502]
      return [
        column(c, 88, 'entrée'),
        column(c, 400, 'dans l’ordre du fichier'),
        column(c, 712, 'sortie'),
        pill(c, 40, CY, 96, 'tâche'),
        ...xs.map((x, i) => agent(c, x, CY, 120, `pas ${i + 1}`)),
        ...[319, 481].map((x) => text(c, x, CY - 14, 'sortie', { size: 11, font: MONO })),
        pill(c, 664, CY, 96, 'sortie'),
        arrow(c, `M136 ${CY} H172`),
        arrow(c, `M298 ${CY} H334`),
        arrow(c, `M460 ${CY} H496`),
        arrow(c, `M622 ${CY} H658`)
      ]
    }
  },

  'fan-out': {
    title: 'fan-out',
    nodes: 'parallel · map',
    subtitle: '1 → N : des tâches écrites à l’avance, en parallèle',
    note: 'Une branche en échec n’arrête pas les autres ; le bloc échoue, sauf avec on-fail: continue.',
    draw: (c) => {
      const ys = [CY - 62, CY, CY + 62]
      const names = ['A', 'B', 'C']
      return [
        column(c, 95, 'écrites'),
        column(c, 255, 'en même temps'),
        column(c, 425, 'une sortie chacune'),
        column(c, 675, 'sortie'),
        ...ys.map((y, i) => pill(c, 40, y, 110, `tâche ${names[i]}`, { h: 32 })),
        ...ys.map((y) => arrow(c, `M150 ${y} H184`)),
        ...ys.map((y, i) => agent(c, 190, y, 130, `branche ${names[i]}`, { h: 46, failed: i === 2 })),
        ...ys.map((y, i) => arrow(c, `M320 ${y} H364`, { color: i === 2 ? c.danger : c.line, dashed: i === 2 })),
        ...ys.map((y, i) => pill(c, 370, y, 110, i === 2 ? 'ok: false' : 'ok: true', { h: 30, mono: true, failed: i === 2 })),
        ...ys.map((y) => arrow(c, curve(480, y, 584, CY))),
        pill(c, 590, CY, 170, 'sortie du bloc'),
        text(c, 675, CY + 32, 'une entrée par branche', { size: 11.5, italic: true })
      ]
    }
  },

  orchestrate: {
    title: 'orchestrate',
    nodes: 'agent → map-from',
    subtitle: '1 → ? : un agent décide du découpage, puis il tourne',
    note: 'Le plan est une liste typée ; plus longue que max:, elle échoue avant la première sous-tâche.',
    draw: (c) => {
      const ys = [CY - 68, CY, CY + 68]
      const gx = 392
      return [
        column(c, 545, 'agent-from · among'),
        column(c, 705, 'optionnel'),
        pill(c, 40, CY, 76, 'tâche'),
        arrow(c, `M116 ${CY} H140`),
        agent(c, 146, CY, 120, 'planificateur'),
        arrow(c, `M266 ${CY} H290`),
        // Document « plan » : feuille à coin replié, trois lignes de pas.
        `<path d="M296 ${CY - 36} H340 L352 ${CY - 24} V${CY + 36} H296 Z" fill="${c.surface}" stroke="${c.line}" stroke-width="1.5" stroke-linejoin="round"/>`,
        `<path d="M340 ${CY - 36} V${CY - 24} H352" fill="none" stroke="${c.line}" stroke-width="1.5" stroke-linejoin="round"/>`,
        ...[-6, 8, 22].map((d, i) => `<path d="M306 ${CY + d} H${i === 2 ? 330 : 342}" stroke="${c.text2}" stroke-width="1.5" stroke-linecap="round"/>`),
        text(c, 316, CY - 22, 'PLAN', { size: 9, font: MONO, spacing: 1.2 }),
        arrow(c, `M352 ${CY} H${gx - 16}`),
        // Validation par le code : rien ne passe avant.
        `<circle cx="${gx}" cy="${CY}" r="15" fill="${c.surface}" stroke="${c.accent}" stroke-width="1.5"/>`,
        `<path d="M${gx - 6} ${CY} L${gx - 1.5} ${CY + 5} L${gx + 7} ${CY - 5}" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        text(c, gx, CY - 28, 'validé', { size: 12, italic: true }),
        // Plan invalide : un seul tour dépensé, aucun worker lancé.
        arrow(c, `M${gx} ${CY + 15} V${CY + 54}`, { color: c.danger, dashed: true }),
        text(c, gx - 10, CY + 47, 'trop de pas', { size: 12, italic: true, anchor: 'end', fill: c.danger }),
        pill(c, gx - 60, CY + 76, 120, 'échec', { h: 30, failed: true }),
        ...[ys[0], ys[1]].map((y) => arrow(c, curve(gx + 15, CY, 474, y))),
        arrow(c, curve(gx + 15, CY, 474, ys[2]), { dashed: true }),
        agent(c, 480, ys[0], 130, 'sous-tâche 1', { h: 42 }),
        agent(c, 480, ys[1], 130, 'sous-tâche 2', { h: 42 }),
        vdots(c, 545, CY + 34),
        agent(c, 480, ys[2], 130, 'sous-tâche N', { h: 42 }),
        ...ys.map((y) => arrow(c, curve(610, y, 644, CY), { dashed: true })),
        agent(c, 650, CY, 110, 'synthèse', { optional: true }),
        text(c, 705, CY + 42, 'lit le bloc', { size: 11.5, italic: true })
      ]
    }
  },

  loop: {
    title: 'loop',
    nodes: 'loop',
    subtitle: '1 → 1 jusqu’à une condition, plafond d’itérations',
    note: 'Atteindre max: fait échouer la boucle ; avec on-fail: continue, converged reste false.',
    draw: (c) => {
      const y = CY - 8
      const dx = 480
      return [
        pill(c, 40, y, 76, 'tâche'),
        arrow(c, `M116 ${y} H144`),
        agent(c, 150, y, 110, 'codeur'),
        arrow(c, `M260 ${y} H284`),
        agent(c, 290, y, 110, 'relecteur'),
        text(c, 275, y + 44, 'max: obligatoire', { size: 11.5, font: MONO }),
        arrow(c, `M400 ${y} H${dx - 42}`),
        diamond(c, dx, y, 40, 'fini ?'),
        // Barre non atteinte : la sortie du dernier pas relance le premier.
        arrow(c, `M${dx} ${y - 40} V${y - 66} H205 V${y - 32}`),
        text(c, 342, y - 78, 'non : le codeur reçoit la relecture et recommence', { size: 12.5, italic: true }),
        // Barre atteinte.
        arrow(c, `M${dx + 40} ${y} H584`),
        text(c, dx + 62, y - 12, 'oui', { size: 12.5, italic: true }),
        pill(c, 590, y, 170, 'converged: true', { mono: true }),
        // Plafond épuisé.
        arrow(c, `M${dx} ${y + 40} V${y + 76} H584`, { color: c.danger, dashed: true }),
        text(c, dx - 12, y + 58, 'plafond atteint', { size: 12.5, italic: true, anchor: 'end', fill: c.danger }),
        pill(c, 590, y + 76, 170, 'converged: false', { mono: true, failed: true })
      ]
    }
  },

  reduce: {
    title: 'reduce',
    nodes: 'parallel → agent',
    subtitle: 'N → 1 : un agent synthétise des branches',
    note: 'Une branche en échec arrive au synthétiseur comme { ok: false, error } : il la voit.',
    draw: (c) => {
      const ys = [CY - 69, CY - 23, CY + 23, CY + 69]
      return [
        column(c, 110, 'section + bloc lu'),
        column(c, 405, 'synthèse'),
        column(c, 690, 'sortie'),
        pill(c, 40, ys[0], 140, '## synthese', { h: 30, mono: true, outline: true }),
        pill(c, 40, ys[1], 140, 'branche 1', { h: 30 }),
        pill(c, 40, ys[2], 140, 'branche 2', { h: 30 }),
        pill(c, 40, ys[3], 140, 'branche N', { h: 30, failed: true }),
        ...ys.map((y, i) => arrow(c, curve(180, y, 324, CY), i === 3 ? { color: c.danger, dashed: true } : {})),
        agent(c, 330, CY, 150, 'synthétiseur', { h: 60 }),
        arrow(c, `M480 ${CY} H614`),
        pill(c, 620, CY, 140, 'sortie')
      ]
    }
  },
  gate: {
    title: 'gate',
    nodes: 'check dans une loop',
    subtitle: 'la suite de tests décide, pas l’approbation',
    note: 'Tant que la suite est rouge, aucune approbation ne fait sortir la boucle.',
    draw: (c) => {
      const y = CY - 14
      const dx = 560
      return [
        pill(c, 40, y, 70, 'pas'),
        arrow(c, `M110 ${y} H130`),
        agent(c, 136, y, 100, 'coder'),
        arrow(c, `M236 ${y} H256`),
        box(c, 262, y, 100, 'check', 'npm test', { mono: true }),
        arrow(c, `M362 ${y} H382`),
        agent(c, 388, y, 100, 'reviewer'),
        arrow(c, `M488 ${y} H${dx - 38}`),
        diamond(c, dx, y, 36, 'fini ?'),
        arrow(c, `M${dx + 36} ${y} H620`),
        text(c, dx + 50, y - 12, 'oui', { size: 12.5, italic: true }),
        pill(c, 626, y, 134, 'pas suivant'),
        // Retour au coder.
        arrow(c, `M${dx} ${y - 36} V${y - 66} H186 V${y - 32}`),
        text(c, 373, y - 78, 'non : nouvel essai, le coder lit la relecture', { size: 12.5, italic: true }),
        // Ce que chacun a dit.
        pill(c, 257, y + 46, 110, 'passed: false', { h: 26, mono: true, failed: true }),
        pill(c, 383, y + 46, 110, 'approved: true', { h: 26, mono: true }),
        text(c, 400, y + 84, 'loop: tests.output.passed && review.output.approved', { size: 12, font: MONO, fill: c.text })
      ]
    }
  },

  'human-stop': {
    title: 'arrêt humain',
    nodes: 'ask → choice → commit',
    subtitle: 'une question à la personne, un branchement sur sa réponse',
    note: 'Sans personne devant l’écran, la carte prend son default: ; ici, rien n’est commité.',
    draw: (c) => {
      const y = CY - 22
      const dx = 350
      return [
        pill(c, 40, y, 70, 'diff', { mono: true }),
        arrow(c, `M110 ${y} H134`),
        box(c, 140, y, 150, 'ask', 'Commiter ?'),
        text(c, 215, y + 44, 'default: false', { size: 11.5, font: MONO }),
        arrow(c, `M290 ${y} H${dx - 38}`),
        diamond(c, dx, y, 36, 'yes ?'),
        text(c, dx, y - 54, 'CHOICE', { size: 9, font: MONO, spacing: 1.2 }),
        arrow(c, `M${dx + 36} ${y} H424`),
        text(c, dx + 52, y - 12, 'oui', { size: 12.5, italic: true }),
        agent(c, 430, y, 120, 'committer'),
        arrow(c, `M550 ${y} H584`),
        box(c, 590, y, 170, 'commit', 'combo/<demande>', { mono: true }),
        // default: [] : rien ne tourne.
        arrow(c, `M${dx} ${y + 36} V${y + 84} H424`),
        text(c, dx - 10, y + 62, 'non', { size: 12.5, italic: true, anchor: 'end' }),
        pill(c, 430, y + 84, 180, 'rien n’est commité', { h: 30 })
      ]
    }
  },

  composition: {
    title: 'composition',
    nodes: 'flow',
    subtitle: 'un flow entier, appelé comme un seul nœud',
    note: 'L’appelé ne reçoit que son input ; ses agents, ses boucles et sa mémoire restent les siens.',
    draw: (c) => {
      const inner = [['survey', 152], ['remark', 248], ['round', 344]]
      return [
        pill(c, 40, CY, 70, 'ticket'),
        arrow(c, `M110 ${CY} H130`),
        // Le nœud flow : une boîte qui contient un autre flow.
        `<rect x="136" y="${CY - 58}" width="300" height="116" rx="6" fill="${c.surface}" stroke="${c.accent}" stroke-width="1.5"/>`,
        text(c, 286, CY - 38, 'FLOW · issue2', { size: 10, font: MONO, spacing: 1.2, fill: c.accent }),
        ...inner.map(([label, x]) => `<rect x="${x}" y="${CY - 14}" width="76" height="30" rx="7" fill="${c.accentSoft}" stroke="${c.accent}" stroke-width="1.2"/>` + text(c, x + 38, CY + 2, label, { size: 12, font: MONO, fill: c.text })),
        arrow(c, `M228 ${CY + 1} H242`),
        arrow(c, `M324 ${CY + 1} H338`),
        text(c, 286, CY + 38, 'input: son entrée, rien d’autre', { size: 11.5, italic: true }),
        arrow(c, `M436 ${CY} H456`),
        agent(c, 462, CY, 120, 'committer'),
        arrow(c, `M582 ${CY} H602`),
        box(c, 608, CY, 152, 'commit', 'une branche')
      ]
    }
  }
}

const render = (fig, c, theme) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">${esc(tr(fig.title))} : ${esc(tr(fig.subtitle))}</title>
  <desc id="d">${esc(tr(fig.note))}</desc>
  <defs>
    <marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1.5 L9 5 L1 8.5" fill="none" stroke="${c.line}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>
    <marker id="head-danger" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1.5 L9 5 L1 8.5" fill="none" stroke="${c.danger}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${c.card}" stroke="${c.cardStroke}"/>
  ${text(c, 40, 40, 'MOTIF', { size: 10, anchor: 'start', font: MONO, spacing: 1.4 })}
  ${text(c, W - 40, 40, 'DANS UN FLOW', { size: 10, anchor: 'end', font: MONO, spacing: 1.4 })}
  ${text(c, W - 40, 70, fig.nodes, { size: 15, anchor: 'end', font: MONO, fill: c.text })}
  ${text(c, 40, 70, fig.title, { size: 26, anchor: 'start', font: MONO, weight: 600, fill: c.accent })}
  ${text(c, 40, 100, fig.subtitle, { size: 16, anchor: 'start', fill: c.text })}
  ${fig.draw(c).join('\n  ')}
  ${line(c, `M40 ${H - 50} H${W - 40}`)}
  ${text(c, 40, H - 28, fig.note, { size: 13.5, anchor: 'start', italic: true })}
</svg>
`

// Libellés des figures dans les langues cibles du site (i18n/config.json).
// Le script de traduction (scripts/i18n) fait pointer les pages traduites vers
// `<figure>.<langue>.svg` quand ce fichier existe.
const LABELS = {
  en: {
    "chain": "chain",
    "fan-out": "fan-out",
    "orchestrate": "orchestrate",
    "loop": "loop",
    "reduce": "reduce",
    "gate": "gate",
    "flow": "flow",
    "agent → agent": "agent → agent",
    "parallel · map": "parallel · map",
    "agent → map-from": "agent → map-from",
    "agent-from · among": "agent-from · among",
    "parallel → agent": "parallel → agent",
    "check dans une loop": "check in a loop",
    "ask → choice → commit": "ask → choice → commit",
    "AGENT": "AGENT",
    "PLAN": "PLAN",
    "CHECK": "CHECK",
    "ASK": "ASK",
    "CHOICE": "CHOICE",
    "COMMIT": "COMMIT",
    "FLOW · issue2": "FLOW · issue2",
    "ok: true": "ok: true",
    "ok: false": "ok: false",
    "converged: true": "converged: true",
    "converged: false": "converged: false",
    "passed: false": "passed: false",
    "approved: true": "approved: true",
    "npm test": "npm test",
    "loop: tests.output.passed && review.output.approved": "loop: tests.output.passed && review.output.approved",
    "default: false": "default: false",
    "coder": "coder",
    "reviewer": "reviewer",
    "committer": "committer",
    "diff": "diff",
    "survey": "survey",
    "remark": "remark",
    "round": "round",
    "yes ?": "yes ?",
    "1 → 1 → 1 : la sortie d’un pas nourrit le suivant": "1 → 1 → 1: each step’s output feeds the next",
    "Chaque nœud lit la sortie du précédent ; un nœud en échec arrête la suite.": "Each node reads the previous one’s output; a failed node stops the sequence.",
    "MOTIF": "PATTERN",
    "DANS UN FLOW": "IN A FLOW",
    "entrée": "input",
    "dans l’ordre du fichier": "in file order",
    "sortie": "output",
    "tâche": "task",
    "pas 1": "step 1",
    "pas 2": "step 2",
    "pas 3": "step 3",
    "1 → N : des tâches écrites à l’avance, en parallèle": "1 → N: tasks written in advance, in parallel",
    "Une branche en échec n’arrête pas les autres ; le bloc échoue, sauf avec on-fail: continue.": "A failed branch does not stop the others; the block fails, unless on-fail: continue.",
    "écrites": "written",
    "en même temps": "at the same time",
    "une sortie chacune": "one output each",
    "tâche A": "task A",
    "tâche B": "task B",
    "tâche C": "task C",
    "branche A": "branch A",
    "branche B": "branch B",
    "branche C": "branch C",
    "sortie du bloc": "block output",
    "une entrée par branche": "one entry per branch",
    "1 → ? : un agent décide du découpage, puis il tourne": "1 → ?: an agent decides the split, then it runs",
    "Le plan est une liste typée ; plus longue que max:, elle échoue avant la première sous-tâche.": "The plan is a typed list; longer than max:, it fails before the first subtask.",
    "optionnel": "optional",
    "planificateur": "planner",
    "validé": "validated",
    "trop de pas": "too many steps",
    "échec": "failure",
    "sous-tâche 1": "subtask 1",
    "sous-tâche 2": "subtask 2",
    "sous-tâche N": "subtask N",
    "synthèse": "synthesis",
    "lit le bloc": "reads the block",
    "1 → 1 jusqu’à une condition, plafond d’itérations": "1 → 1 until a condition, with an iteration cap",
    "Atteindre max: fait échouer la boucle ; avec on-fail: continue, converged reste false.": "Reaching max: fails the loop; with on-fail: continue, converged stays false.",
    "codeur": "coder",
    "relecteur": "reviewer",
    "max: obligatoire": "max: required",
    "fini ?": "done?",
    "non : le codeur reçoit la relecture et recommence": "no: the coder gets the review and starts again",
    "oui": "yes",
    "plafond atteint": "cap reached",
    "N → 1 : un agent synthétise des branches": "N → 1: an agent synthesises branches",
    "Une branche en échec arrive au synthétiseur comme { ok: false, error } : il la voit.": "A failed branch reaches the synthesiser as { ok: false, error }: it sees it.",
    "section + bloc lu": "section + block read",
    "## synthese": "## synthesis",
    "branche 1": "branch 1",
    "branche 2": "branch 2",
    "branche N": "branch N",
    "synthétiseur": "synthesiser",
    "la suite de tests décide, pas l’approbation": "the test suite decides, not the approval",
    "Tant que la suite est rouge, aucune approbation ne fait sortir la boucle.": "While the suite is red, no approval gets the loop out.",
    "pas": "step",
    "pas suivant": "next step",
    "non : nouvel essai, le coder lit la relecture": "no: new attempt, the coder reads the review",
    "arrêt humain": "human stop",
    "une question à la personne, un branchement sur sa réponse": "a question to the person, a branch on their answer",
    "Sans personne devant l’écran, la carte prend son default: ; ici, rien n’est commité.": "With nobody at the screen, the card takes its default:; here, nothing is committed.",
    "Commiter ?": "Commit?",
    "combo/<demande>": "combo/<request>",
    "non": "no",
    "rien n’est commité": "nothing is committed",
    "composition": "composition",
    "un flow entier, appelé comme un seul nœud": "a whole flow, called as a single node",
    "L’appelé ne reçoit que son input ; ses agents, ses boucles et sa mémoire restent les siens.": "The callee receives only its input; its agents, loops and memory stay its own.",
    "ticket": "ticket",
    "input: son entrée, rien d’autre": "input: its input, nothing else",
    "une branche": "a branch"
  },
  es: {
    "chain": "chain",
    "fan-out": "fan-out",
    "orchestrate": "orchestrate",
    "loop": "loop",
    "reduce": "reduce",
    "gate": "gate",
    "flow": "flow",
    "agent → agent": "agent → agent",
    "parallel · map": "parallel · map",
    "agent → map-from": "agent → map-from",
    "agent-from · among": "agent-from · among",
    "parallel → agent": "parallel → agent",
    "check dans une loop": "check dentro de un loop",
    "ask → choice → commit": "ask → choice → commit",
    "AGENT": "AGENT",
    "PLAN": "PLAN",
    "CHECK": "CHECK",
    "ASK": "ASK",
    "CHOICE": "CHOICE",
    "COMMIT": "COMMIT",
    "FLOW · issue2": "FLOW · issue2",
    "ok: true": "ok: true",
    "ok: false": "ok: false",
    "converged: true": "converged: true",
    "converged: false": "converged: false",
    "passed: false": "passed: false",
    "approved: true": "approved: true",
    "npm test": "npm test",
    "loop: tests.output.passed && review.output.approved": "loop: tests.output.passed && review.output.approved",
    "default: false": "default: false",
    "coder": "coder",
    "reviewer": "reviewer",
    "committer": "committer",
    "diff": "diff",
    "survey": "survey",
    "remark": "remark",
    "round": "round",
    "yes ?": "yes ?",
    "1 → 1 → 1 : la sortie d’un pas nourrit le suivant": "1 → 1 → 1: la salida de un paso alimenta el siguiente",
    "Chaque nœud lit la sortie du précédent ; un nœud en échec arrête la suite.": "Cada nodo lee la salida del anterior; un nodo que falla detiene la secuencia.",
    "MOTIF": "PATRÓN",
    "DANS UN FLOW": "EN UN FLOW",
    "entrée": "entrada",
    "dans l’ordre du fichier": "en el orden del archivo",
    "sortie": "salida",
    "tâche": "tarea",
    "pas 1": "paso 1",
    "pas 2": "paso 2",
    "pas 3": "paso 3",
    "1 → N : des tâches écrites à l’avance, en parallèle": "1 → N: tareas escritas de antemano, en paralelo",
    "Une branche en échec n’arrête pas les autres ; le bloc échoue, sauf avec on-fail: continue.": "Una rama que falla no detiene las demás; el bloque falla, salvo con on-fail: continue.",
    "écrites": "escritas",
    "en même temps": "a la vez",
    "une sortie chacune": "una salida cada una",
    "tâche A": "tarea A",
    "tâche B": "tarea B",
    "tâche C": "tarea C",
    "branche A": "rama A",
    "branche B": "rama B",
    "branche C": "rama C",
    "sortie du bloc": "salida del bloque",
    "une entrée par branche": "una entrada por rama",
    "1 → ? : un agent décide du découpage, puis il tourne": "1 → ?: un agente decide el reparto, y luego se ejecuta",
    "Le plan est une liste typée ; plus longue que max:, elle échoue avant la première sous-tâche.": "El plan es una lista tipada; si supera max:, falla antes de la primera subtarea.",
    "optionnel": "opcional",
    "planificateur": "planificador",
    "validé": "validado",
    "trop de pas": "demasiados pasos",
    "échec": "fallo",
    "sous-tâche 1": "subtarea 1",
    "sous-tâche 2": "subtarea 2",
    "sous-tâche N": "subtarea N",
    "synthèse": "síntesis",
    "lit le bloc": "lee el bloque",
    "1 → 1 jusqu’à une condition, plafond d’itérations": "1 → 1 hasta una condición, con un tope de iteraciones",
    "Atteindre max: fait échouer la boucle ; avec on-fail: continue, converged reste false.": "Alcanzar max: hace fallar el bucle; con on-fail: continue, converged sigue en false.",
    "codeur": "programador",
    "relecteur": "revisor",
    "max: obligatoire": "max: obligatorio",
    "fini ?": "¿listo?",
    "non : le codeur reçoit la relecture et recommence": "no: el programador recibe la revisión y vuelve a empezar",
    "oui": "sí",
    "plafond atteint": "tope alcanzado",
    "N → 1 : un agent synthétise des branches": "N → 1: un agente sintetiza ramas",
    "Une branche en échec arrive au synthétiseur comme { ok: false, error } : il la voit.": "Una rama que falla llega al sintetizador como { ok: false, error }: la ve.",
    "section + bloc lu": "sección + bloque leído",
    "## synthese": "## sintesis",
    "branche 1": "rama 1",
    "branche 2": "rama 2",
    "branche N": "rama N",
    "synthétiseur": "sintetizador",
    "la suite de tests décide, pas l’approbation": "decide la suite de tests, no la aprobación",
    "Tant que la suite est rouge, aucune approbation ne fait sortir la boucle.": "Mientras la suite esté en rojo, ninguna aprobación saca al bucle.",
    "pas": "paso",
    "pas suivant": "paso siguiente",
    "non : nouvel essai, le coder lit la relecture": "no: nuevo intento, el programador lee la revisión",
    "arrêt humain": "parada humana",
    "une question à la personne, un branchement sur sa réponse": "una pregunta a la persona, una bifurcación según su respuesta",
    "Sans personne devant l’écran, la carte prend son default: ; ici, rien n’est commité.": "Sin nadie ante la pantalla, la tarjeta toma su default:; aquí, no se hace commit.",
    "Commiter ?": "¿Hacer commit?",
    "combo/<demande>": "combo/<petición>",
    "non": "no",
    "rien n’est commité": "no se hace commit",
    "composition": "composición",
    "un flow entier, appelé comme un seul nœud": "un flow entero, llamado como un solo nodo",
    "L’appelé ne reçoit que son input ; ses agents, ses boucles et sa mémoire restent les siens.": "El flow llamado solo recibe su input; sus agentes, bucles y memoria siguen siendo suyos.",
    "ticket": "ticket",
    "input: son entrée, rien d’autre": "input: su entrada, nada más",
    "une branche": "una rama"
  }
}

// Une figure à moitié traduite serait pire qu'une figure française : on
// génère tout en mémoire, et on n'écrit rien tant qu'un libellé manque.
const outputs = []
for (const lang of ['fr', ...Object.keys(LABELS)]) {
  LANG = lang
  const suffix = lang === 'fr' ? '' : `.${lang}`
  for (const [name, fig] of Object.entries(FIGURES)) {
    for (const [theme, c] of Object.entries(THEMES)) {
      outputs.push([join(OUT, `${name}-${theme}${suffix}.svg`), render(fig, c, theme)])
    }
  }
}
if (missing.size > 0) {
  console.error(`Libellés sans traduction :\n${[...missing].map((s) => `  ${JSON.stringify(s)}`).join('\n')}`)
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })
for (const [file, svg] of outputs) writeFileSync(file, svg)
console.log(`${outputs.length} figures écrites dans ${OUT}`)
