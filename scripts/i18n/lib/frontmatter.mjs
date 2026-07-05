import yaml from 'js-yaml'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function splitFrontmatter(fileContent) {
  const match = fileContent.match(FRONTMATTER_RE)
  if (!match) return { frontmatter: null, body: fileContent }
  const data = yaml.load(match[1]) ?? {}
  const body = fileContent.slice(match[0].length)
  return { frontmatter: data, body }
}

function isTranslatable(value) {
  if (typeof value !== 'string') return false
  if (value.trim() === '') return false
  if (/^(https?:)?\/\//.test(value)) return false
  if (value.startsWith('/')) return false
  return true
}

// Aplati un objet front-matter en { "chemin.dans.le.yaml": "texte source" },
// en ignorant les clés listées dans skipKeys (config.frontMatterSkipKeys) et
// les valeurs qui ressemblent à des URLs/chemins plutôt qu'à du texte.
export function collectTranslatableStrings(node, skipKeys, path = []) {
  const out = {}

  const walk = (value, currentPath) => {
    if (value == null) return

    if (typeof value === 'string') {
      const lastKey = currentPath[currentPath.length - 1]
      if (typeof lastKey === 'string' && skipKeys.includes(lastKey)) return
      if (!isTranslatable(value)) return
      out[currentPath.join('.')] = value
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, [...currentPath, String(i)]))
      return
    }

    if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        walk(val, [...currentPath, key])
      }
    }
  }

  walk(node, path)
  return out
}

export function applyTranslatedStrings(node, translations) {
  const clone = JSON.parse(JSON.stringify(node))
  for (const [path, value] of Object.entries(translations)) {
    const keys = path.split('.')
    let target = clone
    for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]]
    target[keys[keys.length - 1]] = value
  }
  return clone
}

export function serializeFrontmatter(data) {
  return `---\n${yaml.dump(data, { lineWidth: -1 }).trimEnd()}\n---\n`
}
