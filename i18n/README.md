# Course translation (i18n)

French is the source language. English and Spanish are generated
automatically from French by an LLM (local or through `pi`), and must
**never be edited by hand** (they would be overwritten on the next run).

## Layout

```
content/                  # source, French, served at the root (/)
  index.md
  quest-ce-quun-harnais.md
  en/                      # generated, served under /en/
  es/                      # generated, served under /es/
i18n/
  config.json              # LLM backend, model, target languages
  glossary.yaml            # fixed term translations + proper nouns
  style-guide.md           # tone, register, formatting rules
  prompts/                 # system prompts (body + front-matter)
  manifest.json            # translation state (generated, to be committed)
  segments.json            # index of translated segments (generated, committed)
scripts/i18n/
  translate.mjs            # CLI
  lib/                     # segment splitting, segment index, code
                           # protection, front-matter, backends, hash,
                           # integrity checks (validate.mjs)
  lib/*.test.mjs           # unit tests (npm test)
```

## Usage

```bash
npm run i18n:translate          # translate what changed, into en + es
npm run i18n:translate:dry      # show what would be translated, no LLM call
npm run i18n:translate:force    # force a full retranslation

node scripts/i18n/translate.mjs --lang=en          # a single language
node scripts/i18n/translate.mjs --lang=en,es --force

# one specific page (paths relative to content/), for instance to redo a
# translation flagged needsReview:
node scripts/i18n/translate.mjs --force --file=act1-pi.md,methode.md

npm test                        # tests for splitting, the index, the checks
```

## pre-commit

A local hook (`i18n-translations-up-to-date`, in `.pre-commit-config.yaml`)
blocks the commit when a French page has been edited without its translation
being regenerated, or when a translation already delivered is still flagged
`needsReview` (see below). Installation (once, after cloning the
repository):

```bash
pre-commit install
```

When blocked: run `npm run i18n:translate`, then `git add` the regenerated
`content/en/`/`content/es/` files, `i18n/manifest.json` and
`i18n/segments.json`, and commit again.

## Only retranslating what changes

Two levels of granularity, from the coarsest to the finest.

### 1. The file: is there anything to do at all?

For each source file and each language, `i18n/manifest.json` keeps a hash
combining:

- the content of the source file,
- the system prompt (`i18n/prompts/*.md`),
- the glossary terms (`i18n/glossary.yaml`, hashed as parsed data, so that
  rewording a comment there changes nothing),
- the style guide (`i18n/style-guide.md`, injected verbatim into the prompt,
  hence hashed verbatim),
- the prompt version number (`promptVersion` in `i18n/config.json`).

If none of that changed, the file is skipped without reading anything else
(`= up to date`).

### 2. The segment: what has to go back to the model?

As soon as a file has moved, it is split into **segments**: the Markdown
blocks separated by a blank line (paragraph, heading, list, table, code
block, `:::` container...). Each segment is handled independently:

- an **unchanged** segment keeps the translation already present in
  `content/<lang>/`, with no model call at all;
- a segment **with no text to translate** (a lone code block, a `---` rule)
  is copied as is, with no model call either;
- only the segments that are **actually edited or new** go to the model.

Fixing one sentence in a 60-segment chapter therefore costs one call on one
paragraph, not a retranslation of the chapter:

```
> translating [en] bloc3-observabilite.md: 1/11 segment(s) in 1 call(s)
  ✓ written -> content/en/bloc3-observabilite.md (10 segment(s) reused)
```

`--dry-run` prints the same counts without calling anything, which shows the
cost of an edit before paying it.

### Context and grouping of calls

A segment is never sent bare. The segments to translate are grouped into
contiguous chunks, padded when needed with their already translated
neighbours, sent as context only (their translation is discarded). This is
not optional: tested with `qwen-3.6-35b-instruct`, the sentence "Dernier
paragraphe, après un filet horizontal." sent on its own comes back
translated as... "Bonjour". Two paragraphs of context around it are enough to
get a correct translation. The chunks of a page are translated in parallel
(`concurrency` in `i18n/config.json`, 4 by default).

The prompt itself says a single sentence about this: "Le texte reçu peut être
un extrait de document : traduis exactement les blocs qu'on te donne, sans
rien ajouter avant ni après." The first version said the same thing in ten
lines, with a list of what must not be invented. Measured over ten calls
(whole page plus fragments, en and es), that long version failed 3 calls out
of 6, against 1 out of 6 for the original prompt and 0 out of 6 for the short
version: insisting on what not to do produced invented headings and answers
left in French. Reusable lesson for the course: on a model this size, a short
positive instruction beats a long list of prohibitions, and a prompt change is
measured, not reasoned about.

### Where the state lives

`i18n/manifest.json` (per-file state) and `i18n/segments.json` (segment
index) must both be committed: they are what lets anyone (or a CI) know what
is up to date without retranslating everything to find out.

The index does **not** contain the translations, only one fingerprint pair per
segment (`<source fingerprint>:<translated fingerprint>`), in file order. The
translations themselves already live in `content/<lang>/`: reading them back
means re-splitting the translated file and checking segment by segment that
its fingerprint is the recorded one. Three consequences:

- no duplication of translated text in the repository;
- a stale index cannot produce a wrong reuse: verification fails and the
  segment is retranslated;
- a hand-edited translation is detected and **kept** as is, as long as the
  matching French does not change.

If a translated file exists without being described by the index yet
(repository predating the index, page edited by hand), it is paired
automatically on the first run, for free, provided its structure matches the
French segment for segment. Otherwise the page is simply retranslated in full
on the next change.

### What invalidates everything

Editing a glossary term, the style guide or a prompt invalidates **every**
translation, down to the last segment (this is intended: those files define
the rules applied to the whole corpus). Expect a few minutes for a corpus of
about twenty pages in two languages, then check for any `needsReview`.

Comments in `i18n/glossary.yaml` are not part of the rules: the glossary is
hashed as parsed data, so rewording a comment costs nothing. Note also that
`i18n/style-guide.md` and the `note` fields of the glossary are injected as is
into a French system prompt, and therefore stay in French.

It is also the right reflex when a term is translated two different ways from
one paragraph to the next: add it to the glossary rather than touching up the
generated files.

## Keeping translations stable across local models

The risk, with models that vary widely depending on who runs the script
(local, through `pi`, this or that provider), is getting noticeably different
translations from one model to the next. Four safeguards are in place:

1. **Fixed glossary** (`i18n/glossary.yaml`): the technical terms of the
   course (e.g. "harnais" -> "harness") and the proper nouns never to
   translate are injected into the prompt and must be respected to the
   letter. It is the first thing to extend when a translation "invents" a
   different word from one file to the next.
2. **Short style guide** (`i18n/style-guide.md`): tone, register, relative
   length. Deliberately brief so that small models follow it as well as large
   ones.
3. **Structure protected mechanically**, hence never left to the model's
   interpretation: code blocks (`` ``` ``/`~~~`, including nested and
   indented ones) are replaced by opaque markers before the LLM call and
   restored verbatim afterwards; the YAML front-matter is never reformulated
   as free text (only text values are translated, through a separate call
   returning JSON, key by key).
4. **Automatic integrity checks with retry** (`lib/validate.mjs`): tested for
   real, a small local model (mistral) once merged two paragraphs and made a
   whole sentence disappear, along with reference `[3]`. Four signals are
   compared between each source segment and its translation:

   - the number of blocks returned (as many as sent, otherwise there is no
     telling which translation goes with which segment);
   - the `%%%PROTECTED_n%%%` markers (neither one fewer, a lost code block,
     nor one more, an invented marker; both have been observed);
   - the number of `[n]` references and of Markdown headings;
   - the length, which must not change order of magnitude: this is what
     catches a model inventing a whole paragraph instead of translating the
     sentence it was given.

   On a mismatch, `translate.mjs` retries the call (up to three times: on a
   short fragment, failure is independent from one attempt to the next), then
   falls back segment by segment when the blocks do not line up. If the
   mismatch persists, the file is written anyway but flagged
   `needsReview: true` (with the details of the mismatch) in
   `i18n/manifest.json`, for easy spotting
   (`grep needsReview i18n/manifest.json`).

   The splitting, the segment index, the parallelism and these checks are
   covered by unit tests: `npm test`.

The model used for each translation is traced in `i18n/manifest.json`
(`model: "pi:ilaas/gemma-4-31b"`, etc.): when a translation stands out, that
tells you immediately whether it is because a different model than usual was
used.

Switching models does **not** invalidate the existing translations (otherwise
everyone would retranslate the whole corpus with whatever model they happen to
have). To move one page, or the whole corpus, onto a new model, run `--force`
explicitly (possibly with `--file=`).

The default model comes from a measurement, not a preference. The corpus was
first translated with `qwen-3.6-35b-instruct`: across the whole of it, 6
segments came back systematically replaced by "Bonjour", "C'est" or
"Entendu", including with context around them and after three attempts, and
an 857-character table became "### **Introduction**". The same segments pass
on the first try with `gemma-4-31b`, and a full corpus pass with that model
leaves no `needsReview`. This is exactly the kind of call the integrity checks
make possible: without them, those six holes would have shipped without
anyone noticing.

For stricter control (recommended when several people translate with
different models): assemble a few reference sentences with a hand-validated
translation, and automatically compare a new model's output against those
references before adopting it for the whole corpus. Not implemented here yet,
to be added under `scripts/i18n/` if the need is confirmed.

## LLM backend

`i18n/config.json` picks the backend (`"backend"`) and its parameters under
`"backends"`. Three backends are available:

- **`pi`** (recommended, default backend): delegates the call to the
  [pi](https://pi.dev) CLI, which talks to many providers and models behind a
  single interface (no HTTP client to maintain per provider). Configuration:
  ```json
  "pi": {
    "command": "pi",
    "provider": "ilaas",
    "model": "gemma-4-31b",
    "thinking": null
  }
  ```
  To change model, edit `provider`/`model`; see the available pairs with
  `pi --list-models`. `thinking` is optional (`"off"`, `"low"`, `"medium"`,
  `"high"`, `"xhigh"` or `null` to leave the model's default) and maps to
  `pi`'s `--thinking` option. Unlike `ollama`/`openai_compatible`, `pi`
  exposes no `temperature`/`seed` setting on the command line: reproducibility
  from one run to the next with the same model therefore depends on the
  provider behind `pi`, not on this script.
- `ollama`: direct HTTP call to a local `ollama serve` server
  (`http://localhost:11434` by default). Exposes `temperature`/`seed` to
  limit variance from one run to the next with the same model.
- `openai_compatible`: for LM Studio, vLLM, llama.cpp server, etc. (any
  endpoint exposing `/v1/chat/completions`), same settings as `ollama`.

## What is not translated automatically

The VitePress navigation and sidebar labels (`.vitepress/locales/*.mts`) are
maintained by hand: they are too short and too coupled to the site structure
to justify going through an LLM. If the site grows and this becomes a chore,
`translate.mjs` can be extended to cover them too (the same JSON key -> value
mechanism as the front-matter).
