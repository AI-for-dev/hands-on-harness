import { test } from 'node:test'
import assert from 'node:assert/strict'

import { delocalizeAssetLinks, localizeAssetLinks, localizedAssets } from './assets.mjs'

const files = new Set(['/figures/workflows/chain-light.en.svg', '/figures/pi.es.png'])
const exists = (target) => files.has(target)

test('localizeAssetLinks: a figure that exists in the language is used', () => {
  const md = '![chain](/figures/workflows/chain-light.svg){.only-light}'
  assert.equal(localizeAssetLinks(md, 'en', exists), '![chain](/figures/workflows/chain-light.en.svg){.only-light}')
})

test('localizeAssetLinks: without a localised file, the link stays as written', () => {
  const md = '![chain](/figures/workflows/chain-light.svg)'
  assert.equal(localizeAssetLinks(md, 'es', exists), md)
})

test('localizeAssetLinks: a title is kept, other links and code are left alone', () => {
  const md = '![pi](/figures/pi.png "Pi") and [a link](/figures/pi.png)'
  assert.equal(localizeAssetLinks(md, 'es', exists), '![pi](/figures/pi.es.png "Pi") and [a link](/figures/pi.png)')
})

test('localizeAssetLinks: idempotent', () => {
  const once = localizeAssetLinks('![c](/figures/workflows/chain-light.svg)', 'en', exists)
  assert.equal(localizeAssetLinks(once, 'en', exists), once)
})

test('localizedAssets: the localised targets a page depends on', () => {
  const md = '![a](/figures/workflows/chain-light.svg)\n![b](/figures/workflows/loop-light.svg)'
  assert.deepEqual(localizedAssets(md, 'en', exists), ['/figures/workflows/chain-light.en.svg'])
  assert.deepEqual(localizedAssets(md, 'es', exists), [])
})

test('delocalizeAssetLinks: source and translation compare equal again', () => {
  assert.equal(
    delocalizeAssetLinks('![](/figures/workflows/chain-light.en.svg)'),
    '![](/figures/workflows/chain-light.svg)'
  )
})
