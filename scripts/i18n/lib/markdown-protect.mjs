// Protects code blocks (```/~~~) and VitePress snippet imports so that an LLM
// neither translates nor alters them: each is replaced by an opaque marker
// before the model call, then restored verbatim afterwards.
//
// Capturing `{3,}` (rather than hardcoding `` ``` ``) and backreferencing \2
// matter for nested fences: an example showing how to write a ```js block is
// often wrapped in a 4-backtick fence (````md ... ````). Without capturing the
// exact opening length, the nearest closing fence (the inner 3 backticks) would
// wrongly be taken as the end of the protected block.
//
// The opening indentation is captured (\1) and required on the closing fence: a
// code block inside a list item is indented by two or four spaces, and the
// course does that often. Without it, those blocks went to the model as
// ordinary text - with the expected result: "translated" commands (`/tools`,
// `\resume`).
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm

// A VitePress snippet import (`<<<@/path/to/file.md{md}`) is a path, not prose,
// yet it used to reach the model as ordinary text: deepseek-v4-flash dropped the
// closing brace of `{md}` on three of these lines, which breaks the build. It is
// protected like a code block. Fences are replaced first, so a `<<<` line shown
// inside a code example stays part of that block.
const SNIPPET_RE = /^[ \t]*<<<[ \t]*@[^\n]*$/gm

export function protectCodeBlocks(markdown) {
  const blocks = []
  const protect = (match) => {
    blocks.push(match)
    return `%%%PROTECTED_${blocks.length - 1}%%%`
  }
  const protectedMd = markdown.replace(FENCE_RE, protect).replace(SNIPPET_RE, protect)
  return { protectedMd, blocks }
}

export function restoreCodeBlocks(translatedMd, blocks) {
  let result = translatedMd
  blocks.forEach((block, i) => {
    result = result.split(`%%%PROTECTED_${i}%%%`).join(block)
  })
  return result
}
