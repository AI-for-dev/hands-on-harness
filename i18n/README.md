# Traduction du cours (i18n)

Le français est la langue source. L'anglais et l'espagnol sont générés
automatiquement à partir du français par un LLM (local ou via `pi`), et ne
doivent **jamais être édités à la main** (ils seraient écrasés au prochain
run).

## Structure

```
content/                  # source, français, servi à la racine (/)
  index.md
  quest-ce-quun-harnais.md
  en/                      # généré, servi sous /en/
  es/                      # généré, servi sous /es/
i18n/
  config.json              # backend LLM, modèle, langues cibles
  glossary.yaml            # termes à traduction figée + noms propres
  style-guide.md           # ton, registre, règles de formatage
  prompts/                 # prompts système (corps + front-matter)
  manifest.json            # état des traductions (généré, à commiter)
scripts/i18n/
  translate.mjs            # CLI
  lib/                     # protection code, front-matter, backends,
                            # hash, contrôle d'intégrité (validate.mjs)
```

## Utilisation

```bash
npm run i18n:translate          # traduit ce qui a changé, vers en + es
npm run i18n:translate:dry      # affiche ce qui serait traduit, sans appeler le LLM
npm run i18n:translate:force    # force la retraduction de tout

node scripts/i18n/translate.mjs --lang=en          # une seule langue
node scripts/i18n/translate.mjs --lang=en,es --force
```

## pre-commit

Un hook local (`i18n-translations-up-to-date`, dans `.pre-commit-config.yaml`)
bloque le commit si une page française a été modifiée sans que sa
traduction ne soit régénérée, ou si une traduction déjà livrée reste
marquée `needsReview` (voir plus haut). Installation (une fois, après
avoir cloné le dépôt) :

```bash
pre-commit install
```

En cas de blocage : lancer `npm run i18n:translate`, puis `git add` les
fichiers `content/en/`/`content/es/` et `i18n/manifest.json` régénérés, et
recommit.

## Ne retraduire que ce qui change

Pour chaque fichier source et chaque langue, `i18n/manifest.json` retient un
hash combinant :

- le contenu du fichier source,
- le prompt système (`i18n/prompts/*.md`),
- le glossaire (`i18n/glossary.yaml`),
- le guide de style (`i18n/style-guide.md`),
- le numéro de version du prompt (`promptVersion` dans `i18n/config.json`).

Si rien de tout ça n'a changé, le fichier est ignoré (`= à jour`). Si le
fichier source change, seule sa traduction est régénérée. Si tu modifies le
glossaire, le style guide ou le prompt, **toutes** les traductions sont
invalidées et régénérées au prochain run (c'est voulu : ces fichiers
définissent les règles appliquées à tout le corpus).

`i18n/manifest.json` doit être commité : c'est lui qui permet à n'importe
qui (ou à une CI) de savoir si les traductions sont à jour sans avoir à
tout retraduire pour vérifier.

## Garantir une traduction stable, quel que soit le modèle local

Le risque, avec des modèles très variables selon la personne qui lance le
script (local, via `pi`, tel ou tel provider), est d'obtenir des
traductions sensiblement différentes d'un modèle à l'autre. Quatre
garde-fous en place :

1. **Glossaire figé** (`i18n/glossary.yaml`) : les termes techniques du
   cours (ex. "harnais" -> "harness") et les noms propres à ne jamais
   traduire sont injectés dans le prompt et doivent être respectés à la
   lettre. C'est la première chose à enrichir si une traduction "invente"
   un mot différent d'un fichier à l'autre.
2. **Guide de style court** (`i18n/style-guide.md`) : ton, registre,
   longueur relative. Volontairement bref pour que les petits modèles le
   suivent aussi bien que les gros.
3. **Structure protégée mécaniquement**, donc jamais soumise à
   interprétation du modèle : les blocs de code (`` ``` ``/`~~~`, y compris
   imbriqués) sont remplacés par des jetons opaques avant l'appel au LLM et
   restaurés tels quels après ; le front-matter YAML n'est jamais reformulé
   en texte libre (on ne traduit que les valeurs texte, via un appel séparé
   qui renvoie du JSON, clé par clé).
4. **Contrôle d'intégrité automatique avec retry** (`lib/validate.mjs`) :
   testé en conditions réelles, un petit modèle local (mistral) a un jour
   fusionné deux paragraphes et fait disparaître une phrase entière — et
   la référence `[3]` avec. Après chaque traduction, on compare le nombre
   de références `[n]` et de titres Markdown entre la source et la
   traduction ; en cas d'écart, `translate.mjs` retente une fois l'appel
   avant de livrer le résultat. Si l'écart persiste après le retry, le
   fichier est écrit quand même mais marqué `needsReview: true` (avec le
   détail de l'écart) dans `i18n/manifest.json`, pour repérage facile
   (`grep needsReview i18n/manifest.json`).

Le modèle utilisé pour chaque traduction est tracé dans
`i18n/manifest.json` (`model: "pi:ilaas/qwen-3.6-35b-instruct"`, etc.) : si
une traduction détonne, cette info dit immédiatement si c'est parce qu'un
autre modèle que d'habitude a été utilisé.

Pour un contrôle plus strict (recommandé si plusieurs personnes traduisent
avec des modèles différents) : constituer quelques phrases de référence
avec une traduction validée à la main, et comparer automatiquement la
sortie d'un nouveau modèle à ces références avant de l'adopter pour tout le
corpus. Pas encore implémenté ici — à ajouter dans `scripts/i18n/` si le
besoin se confirme.

## Backend LLM

`i18n/config.json` choisit le backend (`"backend"`) et ses paramètres dans
`"backends"`. Trois backends disponibles :

- **`pi`** (recommandé, backend par défaut) : délègue l'appel au CLI
  [pi](https://pi.dev), qui sait parler à de nombreux providers/modèles
  derrière une interface unique (pas de client HTTP à maintenir par
  provider). Configuration :
  ```json
  "pi": {
    "command": "pi",
    "provider": "ilaas",
    "model": "qwen-3.6-35b-instruct",
    "thinking": null
  }
  ```
  Pour changer de modèle, éditer `provider`/`model` — voir les couples
  disponibles avec `pi --list-models`. `thinking` est optionnel
  (`"off"`, `"low"`, `"medium"`, `"high"`, `"xhigh"` ou `null` pour laisser
  le défaut du modèle) et correspond à l'option `--thinking` de `pi`.
  Contrairement à `ollama`/`openai_compatible`, `pi` n'expose pas de
  réglage `temperature`/`seed` en ligne de commande : la reproductibilité
  d'un run à l'autre avec un même modèle dépend donc du provider derrière
  `pi`, pas de ce script.
- `ollama` : appel HTTP direct à un serveur `ollama serve` local
  (`http://localhost:11434` par défaut). Expose `temperature`/`seed` pour
  limiter la variance d'un run à l'autre avec un même modèle.
- `openai_compatible` : pour LM Studio, vLLM, llama.cpp server, etc.
  (tout endpoint exposant `/v1/chat/completions`), mêmes réglages que
  `ollama`.

## Ce qui n'est pas traduit automatiquement

Les libellés de navigation/sidebar de VitePress (`.vitepress/locales/*.mts`)
sont maintenus à la main : ils sont trop courts et trop couplés à la
structure du site pour justifier un passage par LLM. Si le site grossit et
que ça devient pénible, on pourra étendre `translate.mjs` pour les couvrir
aussi (même mécanisme JSON clé -> valeur que le front-matter).
