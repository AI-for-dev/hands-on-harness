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
  segments.json            # index des segments traduits (généré, à commiter)
scripts/i18n/
  translate.mjs            # CLI
  lib/                     # découpage en segments, index des segments,
                           # protection code, front-matter, backends, hash,
                           # contrôle d'intégrité (validate.mjs)
  lib/*.test.mjs           # tests unitaires (npm test)
```

## Utilisation

```bash
npm run i18n:translate          # traduit ce qui a changé, vers en + es
npm run i18n:translate:dry      # affiche ce qui serait traduit, sans appeler le LLM
npm run i18n:translate:force    # force la retraduction de tout

node scripts/i18n/translate.mjs --lang=en          # une seule langue
node scripts/i18n/translate.mjs --lang=en,es --force

# une page en particulier (chemins relatifs à content/), par exemple pour
# reprendre une traduction marquée needsReview :
node scripts/i18n/translate.mjs --force --file=act1-pi.md,methode.md

npm test                        # tests du découpage, de l'index, des contrôles
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
fichiers `content/en/`/`content/es/`, `i18n/manifest.json` et
`i18n/segments.json` régénérés, et recommit.

## Ne retraduire que ce qui change

Deux niveaux de granularité, du plus grossier au plus fin.

### 1. Le fichier : est-ce qu'il y a quelque chose à faire ?

Pour chaque fichier source et chaque langue, `i18n/manifest.json` retient un
hash combinant :

- le contenu du fichier source,
- le prompt système (`i18n/prompts/*.md`),
- le glossaire (`i18n/glossary.yaml`),
- le guide de style (`i18n/style-guide.md`),
- le numéro de version du prompt (`promptVersion` dans `i18n/config.json`).

Si rien de tout ça n'a changé, le fichier est ignoré sans lire quoi que ce
soit d'autre (`= à jour`).

### 2. Le segment : qu'est-ce qui doit repartir au modèle ?

Dès qu'un fichier a bougé, il est découpé en **segments** : les blocs Markdown
séparés par une ligne vide (paragraphe, titre, liste, tableau, bloc de code,
conteneur `:::`...). Chaque segment est traité indépendamment :

- un segment **inchangé** garde la traduction déjà présente dans
  `content/<lang>/`, sans aucun appel au modèle ;
- un segment **sans texte à traduire** (bloc de code seul, filet `---`) est
  recopié tel quel, sans appel au modèle non plus ;
- seuls les segments **réellement modifiés ou nouveaux** partent au modèle.

Corriger une phrase dans un chapitre de 60 segments coûte donc un appel sur un
paragraphe, pas la retraduction du chapitre :

```
> traduction [en] bloc3-observabilite.md : 1/11 segment(s) en 1 appel(s)
  ✓ écrit -> content/en/bloc3-observabilite.md (10 segment(s) réutilisé(s))
```

`--dry-run` affiche le même décompte sans rien appeler, ce qui permet de voir
le coût d'une modification avant de la lancer.

### Contexte et regroupement des appels

Un segment n'est jamais envoyé nu. Les segments à traduire sont regroupés en
morceaux contigus, étoffés si besoin par leurs voisins déjà traduits, envoyés
uniquement comme contexte (leur traduction est jetée). C'est indispensable :
testé avec `qwen-3.6-35b-instruct`, la phrase « Dernier paragraphe, après un
filet horizontal. » envoyée seule revient traduite par... « Bonjour ». Deux
paragraphes de contexte autour suffisent à obtenir une traduction correcte.
Les morceaux d'une même page partent en parallèle (`concurrency` dans
`i18n/config.json`, 4 par défaut).

Le prompt, lui, ne dit qu'une phrase à ce sujet : « Le texte reçu peut être un
extrait de document : traduis exactement les blocs qu'on te donne, sans rien
ajouter avant ni après. » La première version disait la même chose en dix
lignes, avec une liste de ce qu'il ne fallait pas inventer. Mesuré sur dix
appels (page entière + fragments, en et es), cette version longue faisait
échouer 3 appels sur 6, contre 1 sur 6 pour le prompt d'origine et 0 sur 6
pour la version courte : à force d'insister sur ce qu'il ne faut pas faire, on
obtenait des titres inventés et des réponses restées en français. Leçon
réutilisable pour le cours : sur un modèle de cette taille, une consigne
courte et positive vaut mieux qu'une longue liste d'interdits - et une
modification de prompt se mesure, elle ne se raisonne pas.

### Où est stocké l'état

`i18n/manifest.json` (état par fichier) et `i18n/segments.json` (index des
segments) doivent tous les deux être commités : ce sont eux qui permettent à
n'importe qui (ou à une CI) de savoir ce qui est à jour sans rien retraduire
pour vérifier.

L'index ne contient **pas** les traductions, seulement une paire d'empreintes
par segment (`<empreinte source>:<empreinte traduite>`), dans l'ordre du
fichier. Les traductions, elles, vivent déjà dans `content/<lang>/` : les
relire consiste à redécouper le fichier traduit et à vérifier segment par
segment que son empreinte est bien celle enregistrée. Trois conséquences :

- aucune duplication du texte traduit dans le dépôt ;
- un index périmé ne peut pas produire une réutilisation erronée : la
  vérification échoue et le segment est retraduit ;
- une traduction retouchée à la main est détectée et **conservée** telle
  quelle, tant que le français correspondant ne change pas.

Si un fichier traduit existe sans être encore décrit par l'index (dépôt
antérieur à l'index, page retouchée à la main), il est apparié automatiquement
au premier run, gratuitement, à condition que sa structure corresponde segment
par segment à celle du français. Sinon, la page est simplement retraduite en
entier au prochain changement.

### Ce qui invalide tout

Modifier le glossaire, le guide de style ou un prompt invalide **toutes** les
traductions, jusqu'au dernier segment (c'est voulu : ces fichiers définissent
les règles appliquées à tout le corpus). Compter quelques minutes pour un
corpus d'une vingtaine de pages en deux langues, et vérifier ensuite les
éventuels `needsReview`.

C'est aussi le bon réflexe quand un terme est traduit de deux façons
différentes d'un paragraphe à l'autre : l'ajouter au glossaire, plutôt que de
retoucher les fichiers générés.

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
   fusionné deux paragraphes et fait disparaître une phrase entière - et
   la référence `[3]` avec. Quatre signaux sont comparés entre chaque
   segment source et sa traduction :

   - le nombre de blocs rendus (autant qu'envoyés, sinon on ne sait plus
     quelle traduction correspond à quel segment) ;
   - les marqueurs `%%%PROTECTED_n%%%` (ni un de moins, bloc de code perdu,
     ni un de plus, marqueur inventé - les deux ont été observés) ;
   - le nombre de références `[n]` et de titres Markdown ;
   - la longueur, qui ne doit pas changer d'ordre de grandeur : c'est ce qui
     attrape un modèle qui invente un paragraphe entier au lieu de traduire
     la phrase qu'on lui a donnée.

   En cas d'écart, `translate.mjs` retente l'appel (jusqu'à trois fois : sur
   un fragment court, l'échec est indépendant d'une tentative à l'autre),
   puis reprend segment par segment si les blocs ne s'alignent pas. Si
   l'écart persiste, le fichier est écrit quand même mais marqué
   `needsReview: true` (avec le détail de l'écart) dans
   `i18n/manifest.json`, pour repérage facile
   (`grep needsReview i18n/manifest.json`).

   Le découpage, l'index des segments, la mise en parallèle et ces contrôles
   sont couverts par des tests unitaires : `npm test`.

Le modèle utilisé pour chaque traduction est tracé dans
`i18n/manifest.json` (`model: "pi:ilaas/gemma-4-31b"`, etc.) : si
une traduction détonne, cette info dit immédiatement si c'est parce qu'un
autre modèle que d'habitude a été utilisé.

Changer de modèle n'invalide **pas** les traductions existantes (sinon
chacun retraduirait tout le corpus avec le modèle qu'il a sous la main). Pour
repasser une page ou tout le corpus sur un nouveau modèle, c'est donc
`--force` (éventuellement avec `--file=`) qu'il faut lancer explicitement.

Le choix du modèle par défaut vient d'une mesure, pas d'une préférence. Le
corpus a d'abord été traduit avec `qwen-3.6-35b-instruct` : sur l'ensemble,
6 segments revenaient systématiquement remplacés par « Bonjour », « C'est »
ou « Entendu », y compris avec du contexte autour et après trois tentatives -
et un tableau de 857 caractères devenait « ### **Introduction** ». Les mêmes
segments passent du premier coup avec `gemma-4-31b`, et une reprise complète
du corpus avec ce modèle ne laisse aucun `needsReview`. C'est exactement le
genre d'arbitrage que les contrôles d'intégrité rendent possible : sans eux,
ces six trous seraient partis en production sans que personne les voie.

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
    "model": "gemma-4-31b",
    "thinking": null
  }
  ```
  Pour changer de modèle, éditer `provider`/`model` - voir les couples
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
