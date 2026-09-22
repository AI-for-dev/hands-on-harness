# La délégation : découper le travail en sous-agents

::: tip Objectifs de ce module
- Savoir ce qu'un sous-agent reçoit à sa création, ce qu'il ne reçoit pas, et ce qui en revient
- Écrire un agent dont la garantie tient à sa panoplie d'outils, et vérifier cette garantie dans la trace
- Tenir vous-même la boucle explorer → planifier → coder → évaluer sur un ticket réel
- Savoir dire qui a réellement tourné, et avec quel modèle, plutôt que de vous fier à un ✓
- Repartir avec le journal de ce que l'orchestration vous a appris, dont le module suivant a besoin pour automatiser la boucle
:::

Les deux modules précédents se sont arrêtés sur deux constats. Le premier constat est que soigner le texte du prompt en disant explicitement le comportement souhaité améliore les résultats sur certaines colonnes. Notre ticket cadré fait passer le cas du coin de 0/20 à 14/20 parce qu'ISSUES.md le décrit. Néanmoins, avec ou sans la description fine des bugs de l'issue #1, la correction "briques" est de 11/20 respectivement 13/20 ce qui n'est pas un changement fondamental. En revanche, déposer les tests unitaires que l'on souhaite en amont fait progresser ce résultat de 11/20 à 18/20 sans changer une ligne du prompt. Le second constat est qu'un skill n'a que du texte, sans schéma d'entrée, sans fonction d'exécution ni garde de permission, si bien que rien de ce qu'il demande n'est garanti : sa consigne de faire le ménage à la fin est restée lettre morte dans onze exécutions sur vingt, et ses seuls effets établis ont été des déplacements de travail, jamais une amélioration de la correction.

L'agent seul a ses limites et nous pouvons que constater qu'il n'y arrive pas forcément tout seul. Mais imaginez un sous-agent qui ajoute des tests unitaires pertinents pour cet agent, est-ce que nous serions en mesure de retrouver ce résultat de 18/20 ? Nous allons donc essayer de découper le travail via des agents spécialisés dans certaines tâches.

Ce module découpe le travail en quatre rôles (**explorer**, **planifier**, **coder** et **évaluer**), chacun exécuté dans un contexte séparé, avec sa liste d'outils et son modèle. Vous n'emploierez aucun mécanisme d'orchestration : c'est vous qui lancez chaque rôle, qui décidez de ce qui passe de l'un à l'autre et qui exécutez les tests entre deux. Une commande transporte les livrables à votre place, mais aucun code ne choisit le pas suivant. Le module suivant automatisera cette boucle. Mais avant d'automatiser, il faut d'abord savoir quels gestes remplacer ou agencer différemment. Cette liste s'établit en tenant la boucle soi-même, et elle fait partie des livrables du module.

## Comprendre

### Un sous-agent est un contexte neuf

Un **sous-agent** est une session ouverte par la session principale, avec son propre prompt système, sa propre liste d'outils, son propre modèle, et une fenêtre de contexte vide au départ. Il reçoit une tâche sous forme de texte, travaille, et rend un texte final. Tout le reste, ses lectures de fichiers, ses appels d'outils et son raisonnement, disparaît quand sa session se termine, et seule sa conclusion revient dans le contexte de la session qui l'a lancé.

Trois propriétés de cette définition motivent la délégation.

La première est l'isolation du contexte. Le travail d'une sous-tâche est presque toujours plus gros que sa conclusion : établir quels fichiers un ticket touche demande d'en lire une dizaine, soit plusieurs milliers de tokens de sorties d'outils, alors que la note qui en résulte tient en trente lignes. Si vous faites ce travail dans la session principale, les dix fichiers restent dans votre fenêtre jusqu'à la fin. Si vous le déléguez, seule la note y entre.

La deuxième est la restriction d'outils. Le module précédent a montré qu'une consigne n'oblige à rien, puisque la consigne de ménage du `SKILL.md` n'est suivie que dans moins d'une exécution sur trois. Un agent dont la panoplie ne contient pas d'outil d'écriture ne peut pas écrire et la question de l'obéissance ne se pose plus. 

La troisième est la séparation du générateur et de l'évaluateur. Un modèle qui relit son propre travail penche du côté favorable, et cela se comprend : sa fenêtre contient tout le raisonnement qui l'a conduit à ce code, si bien qu'il relit ses intentions plutôt que son diff. Un relecteur dans un contexte neuf ne connaît que le ticket, le plan et le diff, et est donc plus objectif.

### L'anatomie d'un agent

Sur Pi, la délégation n'est pas dans le cœur de l'outil : elle arrive par [combo](https://github.com/AI-for-dev/combo), une bibliothèque écrite pour cette formation au-dessus du SDK de Pi. Un fichier markdown y devient un **agent**, un agent devient un **sous-agent** dont la durée de vie est contrôlée par l'appelant, et les sous-agents se composent en workflows écrits en TypeScript ou encore une fois en Markdown.

::: info D'où vient combo, et quelles extensions lui préférer
combo est né des besoins de ce cours, et ses choix s'expliquent par là. Nous ne pouvons pas dire que cet outil est un bijou de conception pour piloter des sous-agents. Nous l'avons modelé à notre façon et il évoluera certainement selon nos futurs usages pour peut-être devenir un jour utile pour construire des pipelines complexes. Nous voulions avant tout que vous puissiez plonger dans les discussions des sous-agents, que vous puissiez écrire des workflows complexes facilement.

Son intégration à [herdr](https://herdr.dev) donne un volet par sous-agent, pour regarder le travail se faire au lieu d'attendre devant un compteur. Nous avons également ajouté un ensemble d'orchestration afin de créer des pipelines composer de formes plus riches qu'un appel isolé. Et comme tout le reste de la formation mesure, une exécution y compte le temps et les tokens de chaque sous-agent, et s'exporte entière en HTML lisible et en JSONL rejouable. Si ces mesures sont possibles sans instrumenter de processus enfant, c'est que les sous-agents tournent dans le processus de Pi, par le SDK et que Pi a déjà toutes ses informations.

Nous rappelons que combo n'est pas pour le moment une bibliothèque de production, et plusieurs extensions de l'écosystème Pi sont plus éprouvées pour un usage quotidien.

L'[exemple `subagent` du dépôt de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) est le point de comparaison le plus direct : mêmes fichiers markdown dans les mêmes répertoires, et trois modes, single, parallel et chain. Il lance chaque sous-agent dans un processus `pi` distinct, et quand `model:` est absent, le sous-agent hérite du modèle de la session appelante. combo, lui, retombe sur vos réglages : l'avertissement de la section suivante décrit donc combo et non Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) est le plus abouti des trois pour un usage courant. Il s'installe en une commande, `pi install npm:pi-subagents`, et livre des agents prêts à l'emploi (`scout`, `researcher`, `reviewer`, `oracle`) là où combo vous demande d'écrire les vôtres. Il ajoute des tâches de fond, qui continuent dans un processus détaché pendant que vous travaillez, et des workflows enregistrés.

[pi-envoy](https://github.com/jmnargi/pi-envoy) prend le problème par la gouvernance. Chaque enfant reçoit un contrat de délégation avant de démarrer, avec son objectif, son périmètre, ses critères d'acceptation et ses commandes de vérification, et le parent dispose d'un tableau de bord dans le terminal, d'un bus de messages entre agents, de budgets en dollars et de quoi arrêter un enfant en cours.

Si vous montez une chaîne dont vous dépendez, partez de l'une de ces trois. Nous gardons combo ici pour des raisons pédagogiques : ses agents sont des fichiers markdown que vous lisez en entier, la restriction d'outils s'y vérifie dans la trace, et ce que fait la bibliothèque reste visible. Tout ce que le module établit se transpose aux autres.
:::

La bibliothèque s'utilise de deux façons, depuis un script ou depuis Pi à travers son **extension**, chargée avec `-e`, qui enregistre un outil `subagent` que le modèle de la session principale peut appeler. Le sous-agent s'ajoute donc aux outils de la session principale, au même titre que `read` ou `edit`, au lieu de former un moteur d'orchestration à côté du harnais. combo fournit aussi neuf orchestrateurs, `chain`, `fanOut`, `loop`, `orchestrate` et les autres, dont ce module n'utilise aucun : un agent à la fois, puisque c'est vous qui tenez la boucle entre les agents.

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

L'entête porte le nom, la description, la **panoplie** (`tools:`) et le **modèle**. Le corps devient le **prompt système** du sous-agent : chaque session de `reader` démarre avec ce texte pour seul cadre, là où un skill reste une procédure que le modèle décide ou non d'ouvrir.

La différence avec un skill est donc double. Le corps est lu à coup sûr, et la ligne `tools:` décide des outils que la session du sous-agent enregistre, si bien qu'un agent sans `write` n'a aucun moyen d'écrire, quelle que soit la tâche qu'il reçoit.

Un fichier qui omet `tools:` obtient la panoplie en lecture seule, `read, grep, find, ls`, qui est le bon défaut pour tout ce qui explore. Nous préférerons néanmoins mettre les outils disponibles pour faciliter la lecture de ce fichier et des actions possibles de ce sous-agent. 

::: warning Structure des fichiers d'agent
Le premier exemple de fichier markdown que nous avons introduit correspond à la structuration classique d'un sous-agent que vous retrouverez également dans d'autres bibliothèques de harnais comme Claude, Codex, OpenCode, Cursor, ...

Dans le paragraphe suivant, nous allons introduire des métadonnées qui sont propres à combo et que vous ne trouverez pas dans les autres. Néanmoins, ces fichiers devraient quand même fonctionner avec d'autres outils puisque les métadonnées non reconnues seront simplement ignorées.
:::

Dans combo, nous avons un champ supplémentaire dans les métadonnées. Le champ `lifetime` règle la durée de vie du sous-agent : `task`, la valeur par défaut, le fait naître et mourir avec chaque tâche, quand `workflow` le fait survivre d'une itération à l'autre. Ce module utilise `task` partout.

Un sous-agent n'hérite de rien de votre environnement : ni extensions, ni skills, ni fichiers de contexte. Il ne voit que sa définition, complétée d'une seule ligne qui lui dit où il se trouve. C'est ce qui rend une exécution reproductible, et c'est pourquoi tout ce qu'un rôle doit savoir passe par son prompt ou par la tâche que vous lui donnez. Si vous avez besoin de fournir des skills à votre agent, vous pouvez le faire en ajoutant la liste dans un champ `skills`.

Les fichiers d'agents du projet vivent dans `.pi/agents/`, ceux de votre machine dans `~/.pi/agent/agents/`, et l'extension apporte ses propres agents de démonstration. Il vous est possible d'avoir le même nom d'agent globalement et localement et combo vous permet de choisir lequel vous souhaitez utiliser. Nous le verrons dans la suite.

::: warning Un agent sans `model:` tourne sur les réglages du jour
Le modèle d'un sous-agent n'est jamais hérité de la session parente. Il vient d'un argument passé à l'appel, à défaut du fichier de pipeline, à défaut de l'entête de l'agent, et en dernier recours des réglages de Pi : le plus proche du travail l'emporte. Un agent qui ne déclare rien et qu'on lance sans argument tourne donc sur votre `~/.pi/agent/settings.json`, c'est-à-dire sur ce qui s'y trouve ce jour-là.
:::

::: warning Vos agents de projet ne sont jamais chargés par défaut
`.pi/agents/` est un contenu contrôlé par le dépôt, donc ses instructions sont des instructions tierces : combo refuse de les charger sans qu'on le demande. La portée se demande à chaque appel de l'outil.

Vous pouvez avoir la liste de vos agents via la commande:

```
/agents
```
:::

::: warning Voir l'activité de vos agents
L'idée de se module est de décomposer l'orchestration et de voir les sous-agents travailler. Même s'il vous est possible avec combo de voir la trace de la session Pi après coup, il est toujours plus agréable de voir les événements se passer en direct. Pour cela, vous pouvez utiliser herdr. 

Vous devrez alors lancer votre session Pi dans herdr puis taper cette ligne

```
/herdr on
```

Pour que tout sous-agent dans combo ouvre sa propre fenêtre.
:::

## Reconstruire

### La tâche : le ticket #2

Toute la partie pratique porte sur l'**issue #2** de NÉON : la collision est décrite comme lente et emmêlée au rendu, et le ticket demande d'identifier le chemin critique et d'optimiser sans changer l'API publique. En lisant le fichier `game/neon.js`, vous constaterez que la boucle sur les briques de `frame()` fait la collision, le score et le dessin dans le même corps, si bien que rien de tout cela n'est testable séparément. La sortie attendue est une fonction **pure**, extraite de `frame()` et couverte par des tests neufs, sans qu'aucun des exports de `game/neon.js` ne change de nom ni de signature.

Ce ticket convient à ce module pour deux raisons. La première est que chaque rôle y a un livrable falsifiable : une note d'impact se vérifie en ouvrant les fichiers qu'elle cite, un plan se vérifie pas à pas, un diff se vérifie en lançant la suite, un verdict se vérifie contre la liste des exports. La seconde est que le ticket affirme quelque chose qu'il ne mesure pas, puisque « la collision est lente » est une phrase du mainteneur et non un chiffre. Il est donc nécessaire de vérifier que c'est vrai et où cela intervient.

Le cadre ne change pas : seuls `game/neon.js` et `game/neon.test.js` peuvent être modifiés, les tests neufs vont dans la suite et nulle part ailleurs, et `npm test` doit finir vert.

### Quatre rôles, et ce que chacun a le droit de faire

| agent      | livrable                                  | panoplie                            | ce que sa panoplie lui interdit |
| ---------- | ----------------------------------------- | ----------------------------------- | ------------------------------- |
| `explorer` | une note d'impact                         | `read, grep, find, ls`              | écrire quoi que ce soit         |
| `planner`  | un plan en petits pas                     | `read, grep, find, ls`              | écrire quoi que ce soit         |
| `coder`    | le diff d'**un** pas du plan              | `read, grep, find, ls, edit, write` | lancer une commande             |
| `reviewer` | `APPROVED` ou `CHANGES REQUESTED`, motivé | `read, grep, find, ls`              | corriger ce qu'il relit         |

Les quatre fichiers sont versionnés dans `scripts/agents/` et se recopient dans le `.pi/agents/` de votre clone de NÉON. Les voici, avec les décisions de rédaction qui se transposent à n'importe quel découpage en rôles.

<<<@/../scripts/agents/explorer.md{md}

L'exploreur rend une note et non un avis, et sa dernière section le lui rappelle : une note qui contient aussi la correction cesse d'être une note. Son prompt lui dit par ailleurs que les tickets de ce dépôt sont écrits par un mainteneur qui s'est parfois trompé sur l'emplacement du code, ce qui est vrai, et suffit à ce que la note vérifie au lieu de recopier.

<<<@/../scripts/agents/planner.md{md}

Le planificateur applique la leçon du module sur le contexte : un modèle a un budget, et décrire plus de travail ne l'agrandit pas. Chaque pas du plan doit donc tenir dans une invocation du coder, avec sa règle de découpe explicite, « si tu hésites, découpe ». Chaque pas commence par son test rouge, et les tests vont directement dans la suite, ce qui est la coupe exacte que la révision de la procédure du module précédent avait dû faire pour vider ses colonnes en échec.

<<<@/../scripts/agents/coder.md{md}

Le codeur a de quoi écrire et rien pour exécuter, et son prompt l'énonce : il ne lance pas les tests, il ne prétend pas l'avoir fait, c'est vous qui les lancez après lui. Nous aurions pu lui donner un shell, et l'exercice qui suit montre ce que son absence garantit.

<<<@/../scripts/agents/reviewer.md{md}

Le vérificateur ne corrige jamais, parce qu'un vérificateur qui corrige devient un second codeur dont le travail n'est plus relu. Ses quatre vérifications sont ordonnées, la plus mécanique d'abord, et deux d'entre elles portent sur l'arbre plutôt que sur le diff, parce qu'un diff montre ce qui a changé sans montrer ce que le changement a oublié. Son verdict, enfin, peut désigner le plan plutôt que le code, auquel cas c'est au planificateur que vous retournerez.

Deux autres fichiers, `tester.md` et `auditor.md`, vivent à côté des quatre rôles et seront copiés avec eux. Ils ne jouent aucun rôle dans la boucle de ce module : le premier est le candidat naturel du lancement en parallèle du module suivant, le second y relira le travail fini dans son ensemble.


::: warning Utilisation de herdr
Afin de suivre les activités des sous-agents, nous vous encourageons fortement à lancer Pi depuis herdr (https://herdr.dev/). combo sait ouvrir des fenêtres herdr pour voir les sous-agents travaillés et les refermer automatiquement lorsqu'ils ont terminé.
:::

::: info Exercice (en salle)
Avant de lancer quoi que ce soit, faites énoncer à chaque agent sa propre garantie. Installez l'extension et déposez les agents :

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi 
```

L'extension n'ajoute pas de commande pour explicite pour appeler un agent : `subagent` est un outil que le modèle de la session principale appelle quand vous le lui demandez. Il vous suffit de nommer l'agent et ce que vous souhaitez qu'il fasse. Demandez donc l'explorateur ainsi :

```
utilise le subagent "explorer" pour la tâche "Nomme exactement les outils dont tu disposes."
```

Voici ce que le nôtre a rendu :

> « Je dispose des outils suivants :
> `read` : lire le contenu d'un fichier. `grep` : rechercher un motif dans le contenu des fichiers. `find` : rechercher des fichiers selon un motif (glob). `ls` : lister le contenu d'un répertoire. »

La liste ne contient aucun outil d'écriture, et c'est l'agent qui l'énonce lui-même.

Faites de même avec le codeur, en lui demandant cette fois de lancer les tests :

```
utilise le subagent "coder" pour la tâche "Lance `npm test` et rapporte le résultat."
```

> « Le subagent "coder" indique qu'il ne dispose pas d'un outil lui permettant d'exécuter des commandes shell, et ne peut donc pas lancer npm test. »

Ces deux citations sont les sorties de deux exécutions, et les vôtres seront différentes : un modèle reformule d'une fois sur l'autre, et le module sur le contexte a chiffré cette dispersion. Ce qui se reproduit est le fond, l'explorateur énumérant quatre outils de lecture et le codeur renvoyant les tests à l'orchestrateur.
:::

::: warning Choix du modèle
Vous pouvez également dire dans votre demande le modèle que vous souhaitez utiliser comme dans le prompt suivant:

```
utilise le subagent "coder" avec le modèle deepseek-v4-flash d'opencode-go pour la tâche "Lance npm test et rapporte le résultat."
```
:::

### Le tour de boucle, à la main

Vous tenez maintenant le rôle d'orchestrateur que le module suivant automatisera. Ouvrez la session principale avec l'extension chargée, et parcourez la chaîne un pas à la fois avec `/step`.

Cette commande `/step <agent> <instruction>` lance l'agent que vous nommez sur ce que vous tapez, plus la sortie du pas précédent. Sa réponse est **écrite dans la transcription sans entrer dans le contexte du modèle** : la session principale voit défiler les rapports sans les lire, donc sans pouvoir agir dessus. C'est la différence qui compte ici. Une session qui lit un rapport d'exploration devient un orchestrateur que vous ne commandez pas et qui choisit la suite contre des conclusions que vous n'avez pas validées. Or, nous souhaitons que ce soit vous qui décidiez qu'elle est l'étape d'après. La fenêtre principale est donc votre console et pas un interlocuteur comme vous l'avez vu jusqu'à présent. La commande `/quote` vous permet de faire entrer le résultat du pas précédent dans le contexte vous permettant de faire un copier-coller rapide quand il y a quelque chose à discuter.

La boucle comporte six étapes :

1. `/step explorer traite le ticket #2 d'ISSUES.md` rend la note d'impact ;
2. vous la lisez dans la transcription, puis `/step planner` la reçoit telle quelle, avec le ticket, et rend le plan ;
3. `/step coder` reçoit le plan ; donnez-lui le pas 1 et rien d'autre, en le dictant après le nom de l'agent. Il rend son rapport, et le diff est dans l'arbre ;
4. vous lancez **`npm test` vous-même**, dans un second terminal, et vous gardez la sortie ;
5. `/step reviewer` reçoit le rapport du coder ; collez-y le ticket, le pas, le diff (`git diff`) et la sortie des tests, et il rend son verdict ;
6. selon le verdict : pas suivant au coder, retour au coder avec les raisons, ou retour au planner si c'est le pas qui est en cause. `/step --from <id>` reprend la sortie d'un pas plus ancien que le dernier, ce qui est exactement le geste du retour en arrière.

`/chain` liste à tout moment les pas parcourus ; `/chain reset` repart de zéro dans un nouveau répertoire. Le journal que vous teniez à la main pour l'ordre des étapes est donc déjà tenu par l'outil, ce qui vous laisse n'écrire que la partie qu'il ne sait pas voir, vos décisions.

Pendant qu'un sous-agent travaille, un point s'affiche au-dessus de l'invite avec son modèle, ses tokens et un chronomètre, et la ligne d'outil en dessous garde la trace de l'appel. Si [herdr](https://herdr.dev) tourne sur votre machine, `/herdr on` donne à chaque sous-agent son propre onglet, et vous voyez l'explorer lire pendant que vous préparez la tâche suivante. Cette vue sert à suivre le travail pendant qu'il se fait, sans rien vous permettre de conclure : pour cela, il vous faudra la trace de l'étape précédente.

Pendant que vous faites ces gestes, tenez un journal de ce que `/chain` ne peut pas voir : non pas l'ordre des pas, qu'il enregistre déjà, mais ce que vous avez décidé entre deux et sur quel critère. Pourquoi ce pas plutôt que le suivant, pourquoi ce retour au planner, ce que vous avez relu avant de trancher. Ce journal liste ce que l'orchestrateur du module suivant devra savoir faire, et vous êtes bien placé pour l'écrire puisque vous aurez pris chaque décision vous-même.

::: info Exercice (en salle)
Déroulez la boucle jusqu'au premier `APPROVED`, c'est-à-dire jusqu'à ce que le pas 1 du plan soit livré, testé et relu. Si le reviewer refuse, jouez le refus jusqu'au bout : c'est la moitié la plus instructive de la boucle, parce qu'elle vous oblige à décider à qui renvoyer le verdict.

Si la séance le permet, continuez jusqu'au bout du plan. Le critère final est celui du ticket : la fonction extraite est pure et couverte par au moins deux tests neufs dans la suite, toutes les fonctions exportées de `game/neon.js` le sont encore, et `npm test` est vert.
:::

### Ce que l'isolation change dans votre fenêtre

::: info Exercice (en salle)
Juste après le retour de la note de l'explorer, tapez `/session` dans la session principale et notez ce qu'elle contient : votre cadre, l'appel d'outil, la note. Ouvrez ensuite une session neuve sans l'extension et demandez au modèle de produire la même note d'impact lui-même, en lisant le dépôt. Comparez les deux `/session`, puis les deux `\tree`.

Dans la seconde session, chaque fichier lu est resté dans la fenêtre et y restera jusqu'à la fin, alors que la première n'a fait entrer que la note. La délégation paie l'exploration dans un contexte qui disparaît une fois la tâche rendue, au lieu de la payer à chaque tour dans la fenêtre principale. L'argument est le même que pour la lecture de cache du module sur le contexte : un travail se paie à chaque tour tant qu'il reste dans la fenêtre, et une seule fois quand il n'y entre pas.
:::

### Vérifier dans la trace qui a tourné

::: info Exercice (en salle) 
Exportez la session principale avec `\export` et retrouvez chaque appel de l'outil `subagent` : le nom de l'agent, la portée, le modèle, la tâche transmise. C'est la seule réponse fiable à la question de savoir qui a tourné si vous n'avez pas vu l'activité de vos agents via herdr.
:::


### Pourquoi ce module ne publie pas de matrice

Les deux modules précédents ont établi leurs affirmations sur vingt répétitions, et celui-ci n'en publie aucune. Cette absence est délibérée. Nous souhaitions avant tout vous montrer comment fonctionne la délégation et ce qu'elle peut vous apporter sur la taille de votre contexte ou sur la vérification des modifications dans un contexte neuf.

Vous avez également pu voir qu'il est facile de contrôler finement ce que peut faire un agent via ses outils et définir le modèle que l'on souhaite pour celui-ci.

Ce module ne peut donc pas assurer pour le moment que le découpage en rôles améliore le résultat, c'est-à-dire que le ticket #2 traité par cette boucle serait mieux corrigé que le même ticket traité par un agent seul. La question est légitime, elle relève de la mesure. Le module suivant pose le protocole qui permet de faire cette mesure. Nous allons automatiser la boucle que vous avez jouée à la main et observer la qualité des résultats.

## Généraliser

Déléguer revient à isoler un contexte pour n'en faire revenir que la conclusion. Le gain tient moins au coût du travail qu'au fait qu'il ne reste pas dans la fenêtre : une exploration faite dans la session principale s'y relit à chaque tour jusqu'à la fin, alors que la même exploration déléguée disparaît avec son contexte et ne laisse que trente lignes. Bien évidemment, si ce qui revient du sous-agent est aussi gros que ce qu'il a lu, vous n'avez rien isolé.

La garantie d'un agent vient de sa panoplie plutôt que de son prompt. Le prompt du coder lui dit de ne pas lancer les tests, mais c'est l'absence d'un shell qui fait qu'il ne le peut pas, et l'agent sait lui-même faire la différence. Chaque fois que vous hésitez entre écrire une interdiction et retirer un outil, retirez l'outil : une absence se constate dans la configuration, alors qu'une interdiction suppose que le modèle la suive.

Un générateur ne s'évalue pas lui-même. La valeur d'un relecteur séparé vient de ce que son contexte ne contient pas, c'est-à-dire le raisonnement qui a produit le code. C'est aussi pourquoi un reviewer qui corrige détruit sa propre valeur, en redevenant un générateur de code.

Un champ que vous ne déclarez pas est décidé ailleurs. Un agent sans `model:` tourne sur les réglages du jour de la machine, un fichier sans `tools:` obtient la panoplie en lecture seule, un fichier sans `name` n'existe pas. La règle vaut au-delà des agents : pour chaque champ d'une configuration, demandez-vous ce qui se passe quand il est absent, et qui décide alors à votre place.

Le découpage en rôles répartit le travail du modèle sans l'augmenter. Le modèle qui décrochait sur le ticket long décrochera tout autant sur un plan entier passé en une fois. Le fait de faire par petits pas permet d'avoir un travail de meilleure qualité. Un planner qui découpe trop gros reproduit exactement le décrochage que le module sur le contexte a mesuré.

Automatiser une boucle demande de l'avoir tenue à la main. Votre journal dit ce que l'orchestrateur devra router, dans quel ordre, et sur quels critères vous avez décidé des retours. Nous vous rappelons que construire son propre harnais demande de l'expérience et c'est au fur et à mesure de l'acquisition de cette expérience que vous allez peaufiner votre harnais pour qu'une confiance s'instaure.

## Livrable

Ce module produit trois pièces.

1. Les quatre agents, versionnés dans votre dépôt, chacun avec sa panoplie minimale et son `model:` déclaré. Ce sont eux que le module suivant branchera sur l'orchestrateur, sans les modifier.
2. Le journal d'un tour de boucle : la trace de la session principale exportée, le diff livré du premier pas, la sortie de `npm test` que le reviewer a lue, et votre journal. 
3. La ligne « délégation » de la fiche de décision, ci-dessous.

| levier                            | effet observé | adopté ? | pourquoi |
| --------------------------------- | ------------- | -------- | -------- |
| contexte isolé par rôle           |               |          |          |
| panoplie réduite (`tools:`)       |               |          |          |
| modèle déclaré par agent          |               |          |          |
| un pas de plan par invocation     |               |          |          |
| relecteur séparé du codeur        |               |          |          |
| verdict qui peut remonter au plan |               |          |          |
| orchestration humaine             |               |          |          |

La colonne s'appelle « effet observé » plutôt que « effet mesuré », parce que ce module vérifie des propriétés dans des traces et n'établit pas d'écarts sur des répétitions. La dernière ligne se remplira en deux temps, ici puis au module suivant, quand vous saurez ce que l'automatisation de chaque geste a réellement changé.

::: tip Critère de réussite
Vous savez montrer, trace en main, quel agent a tourné à chaque étape de votre boucle, avec quels outils et quel modèle, et citer le geste écrit dans votre journal que vous refuseriez de refaire vingt fois.
:::

## Pour aller plus loin

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), sur l'orchestrateur et les sous-agents chercheurs, et sur ce que la parallélisation coûte en tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), le contrepoint : ce que la fragmentation du contexte fait perdre, et pourquoi le partage du fil complet est parfois préférable.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la page qui distingue workflows et agents ; le module suivant en met les motifs en œuvre.
- [combo](https://github.com/AI-for-dev/combo), la bibliothèque de sous-agents et de workflows utilisée ici : sa documentation sur les agents et les durées de vie, et son `NEXT.md`, qui liste les pièges déjà rencontrés.
- [herdr](https://herdr.dev), la vue en direct des sous-agents, utilisée dans ce module et le suivant.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), pour la place des sous-agents parmi les autres briques : réinjecter une synthèse propre plutôt que la réflexion qui l'a produite.
