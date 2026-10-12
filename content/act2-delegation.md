# La délégation : découper le travail en sous-agents

::: tip Objectifs de ce module
- Savoir ce qu'un sous-agent reçoit à sa création, ce qu'il ne reçoit pas, et ce qui en revient
- Écrire un agent dont la liste d'outils limite ce qu'il peut faire, et le vérifier dans la trace
- Tenir vous-même la boucle explorer → planifier → coder → évaluer sur un ticket réel
- Savoir dire qui a réellement tourné, et avec quel modèle
- Tenir le journal des décisions prises entre deux étapes, dont le module suivant a besoin pour automatiser la boucle
:::

Nous avons maintenant une vision assez claire de ce qui peut nous aider dans le contexte principal pour résoudre des problèmes complexes grâce notamment aux skills. Néanmoins, un skill n'est que du texte et sa description peut être insuffisante, voire inefficace, pour que le modèle l'utilise. Le skill, une fois utilisé, entre dans le contexte ainsi que son résultat. Enfin, vous ne pouvez pas régler finement les outils que vous voulez utiliser et ceux que vous ne voulez pas utiliser.

Nous allons donc voir comment lancer des sessions de travail en dehors du contexte principal, à l'aide de ce qu'on appelle des agents, qui peuvent eux-mêmes utiliser des skills. Ce module découpe le travail en quatre rôles (**explorer**, **planifier**, **coder** et **évaluer**), chacun exécuté dans un contexte séparé, avec sa liste d'outils et son modèle. Vous n'emploierez aucun mécanisme d'orchestration : c'est vous qui lancez chaque rôle, qui décidez de ce qui passe de l'un à l'autre et qui exécutez les tests entre deux. Une commande, `/step`, transmet le résultat d'un agent au suivant, mais c'est vous qui choisissez l'étape d'après. Le module suivant automatisera cette boucle, et pour savoir quoi automatiser, il faut l'avoir faite une fois à la main en notant les décisions prises entre deux étapes.

## Comprendre

### Un sous-agent est un contexte neuf

Un **sous-agent** est une session ouverte par la session principale, avec son propre prompt système, sa propre liste d'outils, son propre modèle, et une fenêtre de contexte vide au départ. Il reçoit une tâche sous forme de texte, travaille, et rend un texte final. Tout le reste, ses lectures de fichiers, ses appels d'outils et son raisonnement, disparaît quand sa session se termine, et seule sa conclusion revient dans le contexte de la session qui l'a lancé.

La première raison de déléguer est l'isolation du contexte. Le travail d'une sous-tâche est presque toujours plus gros que sa conclusion : établir quels fichiers un ticket touche demande d'en lire une dizaine, soit plusieurs milliers de tokens de sorties d'outils, alors que la note qui en résulte tient en trente lignes. Si vous faites ce travail dans la session principale, les dix fichiers restent dans votre fenêtre jusqu'à la fin. Si vous le déléguez, seule la note y entre.

La deuxième est la restriction d'outils. Un skill peut demander au modèle de ne pas écrire, mais rien ne l'y oblige : le standard [Agent Skills](https://agentskills.io/specification) prévoit bien un champ `allowed-tools`, qui sert à pré-autoriser des outils et non à interdire les autres, mais Pi l'ignore. Un agent dont la panoplie ne contient pas d'outil d'écriture ne peut pas écrire, quelle que soit la consigne qu'il reçoit.

La troisième est la séparation entre celui qui écrit le code et celui qui le relit. Un modèle qui relit le code qu'il vient d'écrire a encore dans son contexte tout le raisonnement qui l'y a conduit, et il a tendance à valider ce qu'il voulait faire plutôt que ce qu'il a réellement écrit. Un relecteur lancé dans un contexte neuf ne connaît que le ticket, le plan et le diff, et juge donc le code tel qu'il est.

### L'anatomie d'un agent

Sur Pi, la délégation n'est pas dans le cœur de l'outil : elle arrive par [combo](https://github.com/AI-for-dev/combo), une bibliothèque écrite pour cette formation au-dessus du SDK de Pi. Dans combo, un **agent** est décrit par un fichier Markdown. Quand la session principale le lance, il tourne comme sous-agent, et plusieurs sous-agents peuvent s'enchaîner dans un workflow écrit en TypeScript ou en Markdown, ce que fera le module suivant.

::: info D'où vient combo, et quelles extensions lui préférer
combo est né des besoins de ce cours, et ses choix s'expliquent par là. Nous ne pouvons pas dire que cet outil soit un bijou de conception pour piloter des sous-agents. Nous l'avons modelé à notre façon et il évoluera certainement selon nos futurs usages pour peut-être devenir un jour utile pour construire des pipelines complexes. Nous voulions avant tout que vous puissiez lire en détail les échanges des sous-agents et écrire facilement des workflows complexes.

Son intégration à [herdr](https://herdr.dev) donne un volet par sous-agent, pour regarder le travail se faire au lieu d'attendre devant un compteur. Nous avons également ajouté des orchestrateurs pour composer des pipelines plus riches qu'un appel isolé. Et comme tout le reste de la formation mesure, une exécution y compte le temps et les tokens de chaque sous-agent, et s'exporte entière en HTML lisible et en JSONL rejouable. Ces mesures ne demandent aucune instrumentation, parce que les sous-agents tournent dans le processus de Pi, à travers son SDK, et que Pi connaît déjà le temps et les tokens de chaque appel.

Nous rappelons que combo n'est pas pour le moment une bibliothèque de production, et plusieurs extensions de l'écosystème Pi sont plus éprouvées pour un usage quotidien.

L'[exemple `subagent` du dépôt de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) est le point de comparaison le plus direct : mêmes fichiers markdown dans les mêmes répertoires, et trois modes, single, parallel et chain. Il lance chaque sous-agent dans un processus `pi` distinct, et quand `model:` est absent, le sous-agent hérite du modèle de la session appelante. combo, lui, retombe sur vos réglages : l'avertissement de la section suivante décrit donc combo et non Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) est le plus abouti des trois pour un usage courant. Il s'installe en une commande, `pi install npm:pi-subagents`, et livre des agents prêts à l'emploi (`scout`, `researcher`, `reviewer`, `oracle`) là où combo vous demande d'écrire les vôtres. Il ajoute des tâches de fond, qui continuent dans un processus détaché pendant que vous travaillez, et des workflows enregistrés.

[pi-envoy](https://github.com/jmnargi/pi-envoy) prend le problème par la gouvernance. Chaque enfant reçoit un contrat de délégation avant de démarrer, avec son objectif, son périmètre, ses critères d'acceptation et ses commandes de vérification, et le parent dispose d'un tableau de bord dans le terminal, d'un bus de messages entre agents, de budgets en dollars et de quoi arrêter un enfant en cours.

Si vous montez une chaîne dont vous dépendez, partez de l'une de ces trois. Nous gardons combo ici pour des raisons pédagogiques : ses agents sont des fichiers markdown que vous lisez en entier, la restriction d'outils s'y vérifie dans la trace, et ce que fait la bibliothèque reste visible. Tout ce que le module établit se transpose aux autres.
:::

La bibliothèque s'utilise de deux façons, depuis un script ou depuis Pi à travers son **extension**, chargée avec `-e`, qui enregistre un outil `subagent` que le modèle de la session principale peut appeler. Pour le modèle, lancer un sous-agent est donc un appel d'outil comme un autre, au même titre que `read` ou `edit`. combo fournit aussi neuf orchestrateurs (`chain`, `fanOut`, `loop`, `orchestrate`...) qui enchaînent plusieurs agents automatiquement. Ce module n'en utilise aucun : vous lancez un agent à la fois, et c'est vous qui passez de l'un à l'autre.

Un agent se définit dans un fichier markdown dont la structure rappelle celle d'un skill. Voici le plus petit agent complet :

```markdown
---
name: reader
description: Reads one file and reports what it exports
tools: read
model: ilaas/gemma-4-31b
---

You read the file you are given and list its exported symbols,
one per line, with the line number. Nothing else.
```

L'en-tête donne le nom, la description, le modèle et la **panoplie**, c'est-à-dire la liste des outils dont l'agent dispose (`tools:`). Le corps du fichier devient le prompt système du sous-agent. Contrairement à un skill, que le modèle peut ne jamais ouvrir, ce texte est donc toujours lu. La ligne `tools:` fixe quant à elle les seuls outils que le sous-agent peut appeler : `reader` peut lire, mais il n'a aucun moyen d'écrire, quelle que soit la tâche qu'on lui donne.

Un fichier qui omet `tools:` obtient la panoplie en lecture seule, `read, grep, find, ls`, qui est le bon défaut pour tout ce qui explore. Nous déclarons néanmoins toujours la liste, pour qu'on voie en lisant le fichier ce que l'agent peut faire.

::: warning Structure des fichiers d'agent
Le premier exemple de fichier markdown que nous avons introduit correspond à la structuration classique d'un sous-agent que vous retrouverez également dans d'autres harnais comme Claude Code, Codex, OpenCode ou Cursor. Il n'est donc pas lié à la bibliothèque `combo` dont nous avons parlé plus haut.

Les champs présentés ci-dessous sont propres à combo. Les autres outils ignorent en principe les champs qu'ils ne connaissent pas, si bien qu'un fichier qui les contient reste utilisable ailleurs.
:::

Dans combo, nous avons des champs supplémentaires dans les métadonnées. Le champ `lifetime` règle la durée de vie du sous-agent. Avec `task`, la valeur par défaut, le sous-agent est créé pour une tâche et disparaît à la fin de celle-ci ; avec `workflow`, il garde son contexte d'une itération à l'autre d'un workflow. Ce module utilise `task` partout.

Un sous-agent n'hérite de rien de votre environnement : ni extensions, ni skills, ni fichiers de contexte. Il ne voit que sa définition, complétée d'une seule ligne qui lui dit où il se trouve. Son comportement ne dépend donc pas de votre configuration personnelle, et tout ce qu'il doit savoir passe par son prompt ou par la tâche que vous lui donnez. Si vous avez besoin de fournir des skills à votre agent, vous pouvez le faire en ajoutant la liste dans un champ `skills`. Ce champ existe aussi dans Claude Code, mais pas forcément dans les autres harnais. Attention: si vous ne mettez pas l'outil `read` dans la panoplie et que vous renseignez `skills`, l'agent échouera car il ne lui sera pas possible de lire les skills.

Les fichiers d'agents du projet vivent dans `.pi/agents/`, ceux de votre machine dans `~/.pi/agent/agents/`, et l'extension apporte ses propres agents de démonstration. Un agent peut porter le même nom dans les deux répertoires, et combo vous laisse choisir lequel utiliser.

::: warning Un agent sans `model:` tourne sur les réglages du jour
Le modèle d'un sous-agent n'est jamais hérité de la session parente. Il vient d'un argument passé à l'appel, à défaut du fichier de pipeline, à défaut de l'en-tête de l'agent, et en dernier recours des réglages de Pi : le plus proche du travail l'emporte. Un agent qui ne déclare rien et qu'on lance sans argument tourne donc sur votre `~/.pi/agent/settings.json`, c'est-à-dire sur ce qui s'y trouve ce jour-là.
:::

::: warning Vos agents de projet ne sont jamais chargés par défaut
Les fichiers de `.pi/agents/` viennent du dépôt que vous avez cloné, et quelqu'un d'autre a pu les écrire. combo ne les charge donc que si vous le demandez, en précisant la portée (projet ou machine) à chaque appel de l'outil.

Parmi les agents de démonstration de l'extension, `explorer`, `planner`, `coder`, `reviewer` et `auditor` portent les mêmes noms que les agents de ce module, avec un autre prompt, une autre panoplie et sans `model:`. Quand l'appel ne précise pas la portée, c'est cette version de combo qui tourne, et `/agents` ne l'affiche pas, parce que votre fichier de projet la masque dans la liste. Le `coder` de combo, lancé de cette façon, nous a répondu que les six tests étaient passés alors qu'il n'avait aucun moyen de les lancer. Les prompts de ce module précisent donc tous « de portée projet ». La commande `/step`, présentée plus loin, charge les agents de combo, de la machine et du projet, en donnant la priorité au projet, et n'a pas besoin de cette précision.

Vous pouvez avoir la liste de vos agents via la commande :

```
/agents
```
:::

::: warning Voir l'activité de vos agents
L'idée de ce module est de décomposer l'orchestration et de voir les sous-agents travailler. Même s'il vous est possible avec combo de voir la trace de la session Pi après coup, il est toujours plus agréable de voir les événements se passer en direct. Pour cela, vous pouvez utiliser herdr.

Vous devrez alors lancer votre session Pi dans herdr puis taper cette ligne :

```
/herdr on
```

pour que tout sous-agent dans combo ouvre sa propre fenêtre.
:::

## Reconstruire

### La tâche : le ticket #2

Toute la partie pratique porte sur l'**issue #2** de NÉON : la collision est décrite comme lente et emmêlée au rendu, et le ticket demande d'identifier le chemin critique et d'optimiser sans changer l'API publique. En lisant le fichier `game/neon.js`, vous constaterez que la boucle sur les briques de `frame()` fait la collision, le score et le dessin dans le même corps, si bien que rien de tout cela n'est testable séparément. La sortie attendue est une fonction **pure**, extraite de `frame()` et couverte par des tests neufs, sans qu'aucun des exports de `game/neon.js` ne change de nom ni de signature.

Le chemin choisi ici est très classique et vous le retrouverez probablement dans les « software factories ». Vous allez voir tourner plusieurs rôles dans la phase de résolution de ce bug et vous faire votre propre opinion sur l'impact de chacun. Nous en proposons quatre, mais à l'usage, vous trouverez peut-être que c'est trop. Là encore, ce module vous permet d'être l'acteur principal et de modeler votre harnais comme vous le souhaitez.

Le cadre ne change pas : seuls `game/neon.js` et `game/neon.test.js` peuvent être modifiés, les tests neufs vont dans la suite et nulle part ailleurs, et `npm test` doit finir vert. Nous rappelons que c'est une contrainte forte qui est ici uniquement pour tester l'obéissance du modèle.

### Définition des quatre rôles

Le ticket passe successivement entre quatre agents. Chacun reçoit le résultat du précédent, produit un seul livrable, et ne dispose que des outils nécessaires pour le produire. Aucun des quatre n'a de shell : entre `coder` et `reviewer`, c'est vous qui lancez les tests.

| agent      | reçoit                                 | rend                                      | panoplie                            | ce que sa panoplie lui interdit |
| ---------- | -------------------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- |
| `explorer` | le ticket                              | une note d'impact                         | `read, grep, find, ls`              | modifier quoi que ce soit       |
| `planner`  | le ticket et la note d'impact          | un plan en petits pas                     | `read, grep, find, ls`              | modifier quoi que ce soit       |
| `coder`    | **un** pas du plan                     | le code et le test de ce pas              | `read, grep, find, ls, edit, write` | lancer une commande             |
| `reviewer` | le pas, le diff et la sortie des tests | `APPROVED` ou `CHANGES REQUESTED`, motivé | `read, grep, find, ls, verdict`     | corriger ce qu'il relit         |

Les quatre fichiers sont versionnés dans `scripts/agents/`, et vous les copierez dans le `.pi/agents/` de votre clone de NÉON. Le texte complet de chaque agent est replié sous sa description.

#### `explorer` : dire ce que le ticket va toucher

`explorer` reçoit le ticket et rend une **note d'impact** en quatre parties : les endroits du code que la modification touchera, avec le fichier et les lignes ; ce qui dépend de ces endroits (appelants, tests, imports) ; ce que le ticket laisse ouvert ; et ce qui ne doit pas bouger, en particulier les exports que les tests importent. Il ne propose pas de correction, puisque c'est le travail de `planner` puis de `coder`. Son prompt le prévient aussi que l'auteur des tickets de ce dépôt s'est parfois trompé sur l'emplacement du code, pour qu'il vérifie dans les fichiers ce que le ticket affirme au lieu de le recopier. Avec ses seuls outils de lecture, il ne peut rien modifier, même par erreur.

::: details L'agent `explorer`

<<<@/../scripts/agents/explorer.md{md}

:::

#### `planner` : découper le travail en petits pas

`planner` reçoit le ticket et la note d'impact, et rend un **plan**, c'est-à-dire une liste ordonnée de pas. Chaque pas indique ce qu'il faut faire, les seuls fichiers qu'il peut toucher, le test rouge à écrire en premier, et un critère de fin que vous pouvez vérifier avec `npm test`. Un pas doit être assez petit pour que `coder` le termine en une seule invocation, et le prompt donne une règle simple : « si tu hésites, découpe ». Cette contrainte vient du [module 3.1](./act3-contexte), où quatre exécutions sur vingt écrivent les tests rouges demandés par un ticket long, puis s'arrêtent sans jamais ouvrir `game/neon.js`. Si un pas ajoute un export à `game/neon.js`, `planner` doit l'écrire sur une ligne `api:`, pour que `reviewer` puisse se prononcer.

::: details L'agent `planner`

<<<@/../scripts/agents/planner.md{md}

:::

#### `coder` : exécuter un pas, et un seul

`coder` reçoit **un seul pas** du plan. Il écrit d'abord le test dans `game/neon.test.js`, puis la plus petite modification de `game/neon.js` qui devrait le faire passer, et termine par un court rapport : les fichiers touchés, le nom du test, et ce qu'il n'a pas pu faire. C'est le seul des quatre qui peut écrire, mais il n'a pas de shell, si bien qu'il ne peut pas lancer les tests, et son prompt lui interdit de prétendre l'avoir fait. C'est vous qui lancez `npm test` après lui, et c'est la sortie de cette commande, et non son rapport, qui dit si le pas est fait.

::: details L'agent `coder`

<<<@/../scripts/agents/coder.md{md}

:::

#### `reviewer` : relire le pas sans le corriger

`reviewer` reçoit le ticket, le pas, et ce que vous lui collez : le diff et la sortie de `npm test`. Il ne se fie pas au rapport de `coder` et relit directement le code du dépôt pour vérifier quatre points dans l'ordre : les tests passent et le nouveau test apparaît dans la sortie, les exports de `game/neon.js` n'ont pas changé, seuls les fichiers prévus par le pas ont été touchés, et le nouveau test contraint réellement le résultat. Il rend `APPROVED` ou `CHANGES REQUESTED`, avec une raison par ligne qui cite un fichier et une ligne. Quand combo lui fournit l'outil `verdict`, il enregistre sa décision par cet outil au lieu de l'écrire dans le texte. Il ne corrige jamais lui-même, car personne ne relirait ses corrections. Si c'est le pas du plan qui est mal conçu, il le dit, et c'est alors à `planner` que vous revenez.

::: details L'agent `reviewer`

<<<@/../scripts/agents/reviewer.md{md}

:::

Deux autres fichiers, `tester.md` et `auditor.md`, se trouvent dans le même répertoire et seront copiés avec les quatre rôles. Ce module ne s'en sert pas. Le module suivant les utilise : `tester` produit un plan de tests que `planner` peut recevoir en plus de la note d'impact, et `auditor` relit le travail une fois terminé.

::: info Exercice (en salle)
Avant de lancer la boucle, vérifiez que chaque agent connaît les limites de sa panoplie. Installez l'extension et déposez les agents :

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi
```

L'extension n'ajoute pas de commande explicite pour appeler un agent : `subagent` est un outil que le modèle de la session principale appelle quand vous le lui demandez. Il vous suffit de nommer l'agent et ce que vous souhaitez qu'il fasse. Appelez donc `explorer` ainsi :

```
utilise le subagent "explorer" de portée projet pour la tâche "Nomme exactement les outils dont tu disposes."
```

Voici ce que le nôtre a rendu :

> « Je dispose des outils suivants :
> `read` : lire le contenu d'un fichier. `grep` : rechercher un motif dans le contenu des fichiers. `find` : rechercher des fichiers selon un motif (glob). `ls` : lister le contenu d'un répertoire. »

La liste ne contient aucun outil d'écriture, et c'est l'agent qui l'énonce lui-même.

Faites de même avec `coder`, en lui demandant cette fois de lancer les tests :

```
utilise le subagent "coder" de portée projet pour la tâche "Lance `npm test` et rapporte le résultat."
```

> « Le subagent "coder" indique qu'il ne dispose pas d'un outil lui permettant d'exécuter des commandes shell, et ne peut donc pas lancer npm test. »

Ces deux citations sont les sorties de deux exécutions, et les vôtres seront différentes : un modèle reformule d'une fois sur l'autre, et le [module 3.0](./act3-trysquare) a chiffré cette dispersion. Le contenu, lui, reste le même : `explorer` énumère quatre outils de lecture, et `coder` répond qu'il ne peut pas lancer les tests.

La session principale dispose quant à elle de `bash`, et il arrive que le modèle lance alors `npm test` lui-même pour vous rapporter un résultat. Ce n'est pas `coder` qui a lancé les tests, et l'appel `bash` qui suit la ligne de l'outil `subagent` le montre.
:::

::: warning Choix du modèle
Vous pouvez également dire dans votre demande le modèle que vous souhaitez utiliser, comme dans le prompt suivant :

```
utilise le subagent "coder" de portée projet avec le modèle qwen-3.8-27b d'ilaas pour la tâche "Lance npm test et rapporte le résultat."
```

Le modèle doit être déclaré dans votre `~/.pi/agent/models.json`, comme ceux de l'[installation de Pi](./act1-pi), sinon combo refuse l'appel avec `Model "qwen-3.8-27b" not found for provider "ilaas"`. Avec `/step`, présentée plus loin, l'option `--model ilaas/qwen-3.8-27b` a le même effet. Nous avons écarté `qwen-3.6-35b-instruct` de cet exemple : en octobre 2026, lancé comme `coder` sur ILaaS, il a interrompu sa réponse (`Stream ended without finish_reason`) à chacun de nos trois essais.
:::

### Le tour de boucle, à la main

Vous tenez maintenant le rôle d'orchestrateur que le module suivant automatisera. Ouvrez la session principale avec l'extension chargée, et parcourez la chaîne un pas à la fois avec `/step`. Cette commande fait partie de combo. Si vous ne l'avez pas dans la console de Pi, c'est qu'il n'est pas bien installé.

Cette commande `/step <agent> <instruction>` lance l'agent que vous nommez sur ce que vous tapez, plus la sortie du pas précédent (c'est fait automatiquement). Sa réponse est **écrite dans la transcription sans entrer dans le contexte du modèle** : la session principale voit défiler les rapports sans les lire, donc sans pouvoir agir dessus. Si la session principale lisait le rapport d'exploration, elle pourrait choisir elle-même la suite à partir de conclusions que vous n'avez pas validées, alors que nous voulons que ce soit vous qui décidiez de l'étape d'après. Nous l'avons constaté en passant par l'outil `subagent` : une fois la note d'`explorer` reçue sur le ticket #2, la session principale a relu elle-même les fichiers, puis modifié `game/neon.js` et ses tests sans qu'on le lui demande. La fenêtre principale vous sert donc de console, et non plus d'interlocuteur comme dans les modules précédents. Quand un résultat mérite d'être discuté avec le modèle, la commande `/quote` fait entrer la sortie du pas précédent dans le contexte, sans copier-coller.

La boucle comporte six étapes :

1. `/step explorer traite le ticket #2 d'ISSUES.md` rend la note d'impact ;
2. vous la lisez dans la transcription, puis `/step planner découpe le ticket #2 d'ISSUES.md en pas, à partir de cette note` rend le plan. Le ticket doit figurer dans ce que vous tapez, puisque `/step` ne transmet que la sortie du pas précédent ;
3. `/step --from none coder`, suivi du pas 1 que vous recopiez depuis le plan avec ses fichiers et son critère de fin. Sans `--from none`, `coder` recevrait aussi le plan entier, alors qu'il ne doit voir que son pas. Il rend son rapport, et ses modifications sont dans le dépôt ;
4. vous lancez **`npm test` vous-même**, dans un second terminal, en gardant le diff et la sortie dans deux fichiers : `git diff > .pi/pas.diff`, puis `npm test > .pi/pas-tests.txt 2>&1` ;
5. `/step reviewer` reçoit le rapport de `coder` ; donnez-lui le ticket, le pas et le nom des deux fichiers, par exemple `/step reviewer Relis le pas 1 du ticket #2 d'ISSUES.md : <le pas>. Le diff est dans .pi/pas.diff, la sortie de npm test dans .pi/pas-tests.txt.`, et il rend son verdict ;
6. selon le verdict, vous donnez le pas suivant à `coder`, vous lui renvoyez le même pas avec les raisons du refus, ou vous revenez à `planner` si c'est le pas qui est en cause. `/step --from <id>` repart de la sortie d'un pas plus ancien, ce qui permet de revenir en arrière.

::: info Pourquoi passer le diff par des fichiers
`/step` remet sur une seule ligne tout ce que vous tapez après le nom de l'agent, si bien qu'un diff ou une sortie de tests collés arrivent sans leurs retours à la ligne et deviennent difficiles à lire. `reviewer` a l'outil `read` et lit les deux fichiers tels quels. Ils vont dans `.pi/` pour rester hors du code, et `git diff` ne montre de toute façon pas les fichiers que git ne suit pas.
:::

`/chain` liste à tout moment les pas parcourus et donne le répertoire où la chaîne est exportée ; `/chain reset` repart de zéro dans un nouveau répertoire. L'outil enregistre donc l'ordre des étapes à votre place, mais pas les raisons de vos choix.

Pendant qu'un sous-agent travaille, un point s'affiche au-dessus de l'invite avec son modèle, ses tokens et un chronomètre, et la ligne d'outil en dessous garde la trace de l'appel. Avec herdr et `/herdr on`, décrits plus haut, chaque sous-agent a son propre onglet, et vous voyez `explorer` lire pendant que vous préparez la tâche suivante. Cette vue permet de suivre le travail, mais pour conclure quoi que ce soit, il faut lire la trace de l'étape.

Pendant la boucle, tenez un journal des décisions que vous prenez entre deux étapes et du critère qui vous a fait trancher. Notez par exemple pourquoi vous avez renvoyé un pas à `coder`, pourquoi vous êtes revenu à `planner`, ou ce que vous avez relu avant de décider. Le module suivant s'en servira pour écrire l'orchestrateur, puisque chaque décision notée est une règle qu'il devra appliquer seul.

::: info Exercice (en salle)
Déroulez la boucle jusqu'au premier `APPROVED`, c'est-à-dire jusqu'à ce que le pas 1 du plan soit livré, testé et relu. Si `reviewer` refuse, allez jusqu'au bout du refus : c'est le cas le plus instructif, parce que vous devez décider à qui renvoyer le verdict.

Si la séance le permet, continuez jusqu'au bout du plan. Le critère final est celui du ticket : la fonction extraite est pure et couverte par au moins deux tests neufs dans la suite, toutes les fonctions exportées de `game/neon.js` le sont encore, et `npm test` est vert.
:::

### Ce que l'isolation change dans votre fenêtre

::: info Exercice (en salle)
Juste après le retour de la note d'`explorer`, tapez `/session` dans la session principale : elle ne compte aucun message, puisque `/step` a affiché la note dans la transcription sans la faire entrer dans le contexte. Ouvrez ensuite une session neuve sans l'extension, avec `pi -ne` (combo est installé dans le projet, et un simple `pi` le chargerait), et demandez au modèle de produire la même note d'impact lui-même, en lisant le dépôt et sans rien modifier. Comparez les deux `/session`, puis les deux `/tree`.

Dans la seconde session, chaque fichier lu est resté dans la fenêtre et y restera jusqu'à la fin, alors que la première reste vide tant que vous n'utilisez pas `/quote`, qui n'y ferait entrer que la note. Avec la délégation, les fichiers lus par `explorer` restent dans son propre contexte, qui disparaît à la fin de sa tâche. C'est le mécanisme vu au [module 2.1](./act2-contexte) : tout ce qui reste dans la fenêtre est renvoyé au modèle à chaque tour.
:::

### Vérifier dans la trace qui a tourné

::: info Exercice (en salle)
Tapez `/chain` : sa dernière ligne donne le répertoire où combo a exporté la chaîne, `runs/<date>/` à la racine de NÉON. Chaque pas y a son dossier (`1-explorer`, `2-planner`...) avec la session du sous-agent en JSONL et en HTML, et un `usage.json` qui donne le nom de l'agent, sa durée de vie, son modèle, la tâche transmise, ses tokens et sa durée. La session HTML montre chaque appel d'outil, ce qui permet de vérifier que l'agent est resté dans sa panoplie. C'est la seule réponse fiable à la question de savoir qui a tourné si vous n'avez pas vu l'activité de vos agents via herdr.
:::

::: warning `/export` après une boucle en `/step`
`/export` exporte la session principale, qui ne contient rien après une boucle faite uniquement de `/step` : Pi répond alors `Nothing to export yet`. Les agents lancés par l'outil `subagent`, comme dans le premier exercice, y figurent en revanche, chaque appel avec le nom de l'agent, la portée et la tâche, et son résultat avec le modèle.
:::

## Généraliser

Ce que nous avons fait avec ces quatre agents vaut pour n'importe quel découpage en rôles.

Un sous-agent sert d'abord à garder la fenêtre principale légère. `explorer` a lu plusieurs fichiers, et seule sa note est revenue dans la session principale. Cela ne marche que si le sous-agent rend un résultat court : s'il recopie tout ce qu'il a lu, vous n'avez rien gagné.

Pour empêcher un agent de faire quelque chose, retirez-lui l'outil au lieu de l'écrire dans son prompt. `coder` ne lance pas les tests parce qu'il n'a pas de shell, et non parce que son prompt le lui demande. Une liste d'outils se vérifie en lisant le fichier de l'agent, alors que rien ne garantit qu'un modèle suive une consigne.

Faites relire le code par un autre agent que celui qui l'a écrit. `reviewer` ne connaît que le ticket, le pas et le diff, et il juge donc ce qui a été écrit et non ce qui était prévu. Laissez-le sans outil d'écriture, sinon ses propres modifications ne seraient relues par personne.

Déclarez tous les champs d'un agent, même quand la valeur par défaut vous convient. Sans `model:`, l'agent tourne sur le modèle configuré ce jour-là dans vos réglages ; sans `tools:`, il reçoit les outils de lecture ; sans `name`, il n'est pas chargé du tout.

Découpez le travail en pas assez petits pour qu'un agent les termine. Le découpage en rôles ne donne pas plus de capacité au modèle, et un `coder` qui recevrait le plan entier d'un coup risquerait de décrocher comme au [module 3.1](./act3-contexte). Nous faisons l'hypothèse que des petits pas donnent un meilleur résultat, et le module suivant permet de la mesurer.

Enfin, faites la boucle à la main avant de l'automatiser. Votre journal contient les décisions que l'orchestrateur devra prendre seul : à quel agent passer la main, quand revenir en arrière, et sur quel critère.

::: info Exercice (en autonomie)
Vous pouvez à présent tester plein de combinaisons et essayer de voir leur influence sur les résultats. Parmi ces combinaisons, vous pouvez :
- écrire vos propres agents ou modifier les agents proposés dans ce module,
- ajouter des skills aux agents,
- changer les modèles et voir notamment les changements lorsque l'on prend des modèles plus gros pour les phases de plan et de validation,
- ...
:::

## Livrable

Ce module produit trois pièces.

**1. Les quatre agents**, versionnés dans le `.pi/agents/` de votre clone de NÉON, chacun avec sa panoplie minimale et son `model:` déclaré. Le module suivant les branchera sur l'orchestrateur sans les modifier.

**2. La trace d'un tour de boucle** : le répertoire `runs/` de la chaîne, le diff du premier pas, la sortie de `npm test` que `reviewer` a lue, et votre journal des décisions prises entre deux étapes.

**3. La ligne « délégation » de la fiche de décision** :

| levier                               | effet observé | adopté ? | pourquoi |
| ------------------------------------ | ------------- | -------- | -------- |
| exploration déléguée à un sous-agent |               |          |          |
| restriction d'outils (`tools:`)      |               |          |          |
| relecture dans un contexte séparé    |               |          |          |
| modèle déclaré par agent (`model:`)  |               |          |          |
| plan découpé en petits pas           |               |          |          |

::: tip Critère de réussite
Vous savez montrer, trace en main, quel agent a tourné à chaque étape de votre boucle, avec quels outils et quel modèle. Vous savez aussi quelles décisions vous avez prises entre deux étapes, celles que l'orchestrateur du module suivant devra prendre à votre place.
:::

## Pour aller plus loin

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), sur l'orchestrateur et les sous-agents chercheurs, et sur ce que la parallélisation coûte en tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), le contrepoint : ce que la fragmentation du contexte fait perdre, et pourquoi le partage du fil complet est parfois préférable.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la page qui distingue workflows et agents ; le module suivant en met les motifs en œuvre.
- [combo](https://github.com/AI-for-dev/combo), la bibliothèque de sous-agents et de workflows utilisée ici : sa documentation sur les agents et les durées de vie, et son `NEXT.md`, qui liste les pièges déjà rencontrés.
- [herdr](https://herdr.dev), la vue en direct des sous-agents, utilisée dans ce module et le suivant.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), pour la place des sous-agents parmi les autres briques : réinjecter une synthèse propre plutôt que la réflexion qui l'a produite.
