// Runs `worker` on every item with at most `limit` tasks in flight, preserving
// the order of the results.
//
// The chunks of a page are independent: sending them in parallel divides the
// waiting time accordingly, which is almost entirely generation latency.
// `limit` stays configurable (`concurrency` in i18n/config.json) because the
// right setting depends on the provider behind the model, not on this script.
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
