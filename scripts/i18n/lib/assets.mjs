// Points the images of a translated page at their localised variant.
//
// A figure whose labels are French is still French once the page around it is
// translated: link targets are copied as they are, and they should be. When a
// figure exists in the target language, next to the source one and named after
// it (`chain-light.svg` -> `chain-light.en.svg`), the translated page uses it.
// When it does not, the link is left alone: a French figure beats a broken one.

const IMAGE_LINK_RE = /(!\[[^\]\n]*\]\()([^)\s]+?)(\.(?:svg|png|jpe?g|gif|webp))(\s+"[^"\n]*")?\)/g

// `name.en.svg` already names a language: it is never localised twice.
const LOCALISED_RE = /\.[a-z]{2}$/

// Rewrites the image links of `markdown` for `lang`. `exists(target)` says
// whether a link target is a file, as written in the page.
export function localizeAssetLinks(markdown, lang, exists) {
  return markdown.replaceAll(IMAGE_LINK_RE, (whole, open, base, ext, title = '') => {
    if (LOCALISED_RE.test(base)) return whole
    const localised = `${base}.${lang}${ext}`
    return exists(localised) ? `${open}${localised}${title})` : whole
  })
}

// The localised targets `markdown` would use for `lang`, sorted: what a
// translated page depends on beyond its source text.
export function localizedAssets(markdown, lang, exists) {
  const found = new Set()
  for (const [, , base, ext] of markdown.matchAll(IMAGE_LINK_RE)) {
    if (!LOCALISED_RE.test(base) && exists(`${base}.${lang}${ext}`)) found.add(`${base}.${lang}${ext}`)
  }
  return [...found].sort()
}

// The same links with the language dropped: a source segment and its
// translation compare equal again, whatever figures were localised.
export function delocalizeAssetLinks(markdown) {
  return markdown.replaceAll(IMAGE_LINK_RE, (whole, open, base, ext, title = '') =>
    LOCALISED_RE.test(base) ? `${open}${base.replace(LOCALISED_RE, '')}${ext}${title})` : whole
  )
}
