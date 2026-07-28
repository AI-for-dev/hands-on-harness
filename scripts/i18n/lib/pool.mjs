// Exécute `worker` sur chaque élément avec au plus `limit` tâches en vol,
// en préservant l'ordre des résultats.
//
// Les morceaux à traduire d'une même page sont indépendants : les envoyer en
// parallèle divise d'autant le temps d'attente, qui est presque entièrement
// de la latence de génération. `limit` reste configurable (`concurrency` dans
// i18n/config.json) parce que le bon réglage dépend du fournisseur derrière
// le modèle, pas du script.
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  const effectiveLimit = Math.max(1, Math.min(limit, items.length))
  let next = 0

  async function run() {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: effectiveLimit }, run))
  return results
}
