// Outils communs aux scripts qui extraient les chiffres des graphiques de
// l'acte 3 (issue1-context-data.mjs, issue1-skill-data.mjs).

export const BOOTSTRAP_DRAWS = 4000

// Générateur pseudo-aléatoire à graine (mulberry32), pour que les intervalles
// soient identiques d'une génération à l'autre.
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length

// Intervalle à 95 % de la différence de deux proportions, par rééchantillonnage
// de chaque groupe.
export function bootstrap(a, b, random) {
  const diffs = []
  for (let i = 0; i < BOOTSTRAP_DRAWS; i++) {
    let sa = 0
    let sb = 0
    for (let j = 0; j < a.length; j++) sa += a[Math.floor(random() * a.length)]
    for (let j = 0; j < b.length; j++) sb += b[Math.floor(random() * b.length)]
    diffs.push(sa / a.length - sb / b.length)
  }
  diffs.sort((x, y) => x - y)
  return [diffs[Math.floor(0.025 * BOOTSTRAP_DRAWS)], diffs[Math.floor(0.975 * BOOTSTRAP_DRAWS)]]
}

// Écart en points entre deux groupes d'exécutions codées 0/1, avec son
// intervalle, arrondis à l'entier.
export function gap(on, off, random) {
  const [lo, hi] = bootstrap(on, off, random)
  return {
    diff: Math.round(100 * (mean(on) - mean(off))),
    lo: Math.round(100 * lo),
    hi: Math.round(100 * hi)
  }
}
