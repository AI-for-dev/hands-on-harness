import assert from 'node:assert/strict'
import { test } from 'node:test'

import { mapWithConcurrency } from './pool.mjs'

test('preserves the order of the results', async () => {
  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
    await new Promise((resolve) => setTimeout(resolve, (6 - n) * 2))
    return n * 10
  })
  assert.deepEqual(results, [10, 20, 30, 40, 50])
})

test('never exceeds the in-flight task limit', async () => {
  let inFlight = 0
  let maxInFlight = 0
  await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
    inFlight += 1
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 1))
    inFlight -= 1
  })
  assert.equal(maxInFlight, 3)
})

test('accepts an empty list and an absurd limit', async () => {
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), [])
  assert.deepEqual(await mapWithConcurrency([1, 2], 0, async (n) => n), [1, 2])
})
