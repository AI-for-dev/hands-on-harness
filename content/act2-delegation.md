# La délégation : découper le travail en sous-agents

::: tip Objectifs de ce module
- Savoir ce qu'un sous-agent reçoit à sa création, ce qu'il ne reçoit pas, et ce qui en revient
- Écrire un agent dont la garantie est la panoplie d'outils, et vérifier cette garantie dans la trace
- Tenir vous-même la boucle explorer → planner → coder → reviewer sur un ticket réel
- Savoir dire qui a réellement tourné, et avec quel modèle, plutôt que de croire un ✓
- Repartir avec le journal de ce que l'orchestration à la main coûte, dont le module suivant a besoin pour automatiser la boucle
:::

Les mesures des deux modules précédents ont mis en évidence deux limites. La première porte sur le budget de travail du modèle : sur les configurations qui reçoivent le ticket cadré, quatre exécutions sur vingt écrivent les tests rouges que le ticket demande et n'ouvrent jamais le fichier source, et décrire davantage de travail dans le ticket ne déplace pas cette limite. La seconde porte sur la vérification : une procédure de travail déplace ce que l'agent produit, mais aucun effet établi n'a été mesuré sur la correction elle-même, et rien de ce qu'un skill demande n'est garanti. Ces deux limites ont une cause structurelle commune : toutes les configurations mesurées jusqu'ici travaillent dans un contexte unique, où le même modèle lit le dépôt, écrit le code et relit son propre travail, chacune de ces activités s'accumulant dans la même fenêtre.

Ce module introduit la brique de délégation. Le travail est découpé en quatre rôles, explorer, planner, coder et reviewer, chacun exécuté dans un contexte séparé, avec une liste d'outils et un modèle qui lui sont propres. Aucun mécanisme d'orchestration n'est utilisé dans ce module : c'est vous qui lancez chaque rôle, qui transmettez les livrables de l'un à l'autre et qui exécutez les tests entre deux, parce que le module suivant automatisera cette boucle et qu'automatiser demande la liste des gestes à remplacer et de ce que chacun coûte. Cette liste s'établit en tenant la boucle soi-même, et elle fait partie des livrables du module.

Nous suivons l'ordre habituel : comprendre ce qu'est un sous-agent dans le harnais, en écrire quatre et dérouler la boucle sur un ticket réel, puis dégager ce qui reste vrai quand l'outil change.

## Comprendre

### Un sous-agent est un contexte neuf

Un **sous-agent** est une session ouverte par la session principale, avec son propre prompt système, sa propre liste d'outils, son propre modèle, et une fenêtre de contexte vide au départ. Il reçoit une tâche sous forme de texte, travaille, et rend un texte final. Tout le reste, c'est-à-dire ses lectures de fichiers, ses appels d'outils et son raisonnement, disparaît quand sa session se termine : seule sa conclusion revient dans le contexte de la session qui l'a lancé.

Trois propriétés de cette définition motivent la délégation.

**L'isolation du contexte.** Le travail d'une sous-tâche est presque toujours plus gros que sa conclusion. Établir quels fichiers un ticket touche demande de lire une dizaine de fichiers, soit plusieurs milliers de tokens de sorties d'outils, alors que la note qui en résulte tient en trente lignes. Fait dans la session principale, ce travail garde les dix fichiers dans la fenêtre jusqu'à la fin de la session ; délégué, il n'y fait entrer que la note.

**La restriction d'outils.** Le module précédent a montré qu'une consigne n'oblige à rien, la consigne de ménage du `SKILL.md` étant suivie moins d'une fois sur trois. Un agent dont la panoplie ne contient pas d'outil d'écriture **ne peut pas** écrire, puisque rien dans sa session n'enregistre cet outil, et la question de l'obéissance ne se pose plus. La documentation de combo rapporte le cas inverse : un exemple de son dépôt donnait au coder la panoplie complète en lui demandant de ne rien modifier, et il a modifié un fichier source, deux fois, au cours d'une simple démonstration. Cette garantie se vérifie dans la trace, et c'est elle qui permet de faire confiance à un explorateur ou à un relecteur.

**La séparation du générateur et de l'évaluateur.** Un modèle qui relit son propre travail penche du côté favorable, et cela se comprend : sa fenêtre contient tout le raisonnement qui l'a conduit à ce code, si bien qu'il relit ses intentions plutôt que son diff. Un relecteur dans un contexte neuf ne connaît que le ticket, le plan et le diff, et juge donc le diff sur pièces.

### L'anatomie d'un agent

Sur Pi, la délégation n'est pas dans le cœur de l'outil : elle arrive par [combo](https://github.com/AI-for-dev/combo), une bibliothèque construite sur le SDK de Pi. Un fichier markdown y devient un **agent**, un agent devient un **sous-agent** dont la durée de vie est contrôlée par l'appelant, et les sous-agents se composent en workflows écrits en TypeScript. La bibliothèque s'utilise de deux façons : depuis un script, ou depuis Pi à travers son **extension**, chargée avec `-e`, qui enregistre un outil `subagent` que le modèle de la session principale peut appeler. Le sous-agent s'ajoute donc aux outils de la session principale, au même titre que `read` ou `edit`, plutôt que de former un moteur d'orchestration à côté du harnais. combo fournit aussi neuf combinateurs, `chain`, `fanOut`, `loop`, `orchestrate` et les autres ; ce module n'en utilise aucun, un agent à la fois, puisque la boucle entre les agents est tenue par vous. Les combinateurs sont le sujet du module suivant.

Un agent se définit dans un fichier markdown dont la structure rappelle celle d'un skill. Voici le plus petit agent complet :

```markdown
---
name: liseur
description: Reads one file and reports what it exports
tools: read
model: ilaas/gemma-4-31b
---

You read the file you are given and list its exported symbols,
one per line, with the line number. Nothing else.
```

Le frontmatter porte le nom, la description, la **panoplie** (`tools:`) et le **modèle**. Le corps devient le **prompt système** du sous-agent, et non une procédure qu'un modèle décide ou non d'ouvrir : chaque session de `liseur` démarre avec ce texte pour seul cadre. La différence avec un skill est donc double. Le corps est lu à coup sûr, et la ligne `tools:` n'est pas une déclaration d'intention : elle décide des outils que la session du sous-agent enregistre, si bien qu'un agent sans `write` n'a aucun moyen d'écrire, quelle que soit la tâche reçue. Deux conventions s'y ajoutent : un fichier qui omet `tools:` obtient la panoplie en lecture seule, `read, grep, find, ls`, qui est le bon défaut pour tout ce qui explore ; et le champ `lifetime` règle la durée de vie du sous-agent, `task`, la valeur par défaut, le faisant naître et mourir avec chaque tâche. Ce module utilise `task` partout ; `workflow`, qui fait survivre un sous-agent d'une itération à l'autre, appartient au module suivant.

Un sous-agent n'hérite de rien de votre environnement : ni extensions, ni skills, ni fichiers de contexte. Il ne voit que sa définition, complétée d'une seule ligne qui lui dit où il se trouve. C'est ce qui rend une exécution reproductible, et c'est pourquoi tout ce qu'un rôle doit savoir passe par son prompt ou par la tâche que vous lui donnez.

Les fichiers d'agents du projet vivent dans `.pi/agents/`, ceux de votre machine dans `~/.pi/agent/agents/`, et l'extension apporte ses propres agents de démonstration. Savoir laquelle de ces trois sources est servie à un appel donné conditionne toute la partie pratique, et les trois avertissements qui suivent en fixent les règles.

### Ce que l'agent déclare, et ce qu'il hérite sans le dire

Trois comportements de chargement conditionnent la manière dont ce module écrit et lance ses agents. Ils sont documentés par combo, et nous avons rencontré le premier pendant la préparation de cette formation.

::: warning Un agent sans `model:` tourne sur les réglages du jour
Le modèle d'un sous-agent n'est **jamais hérité de la session parente**. Il vient d'un argument passé à l'appel, à défaut du fichier de pipeline, à défaut du frontmatter de l'agent, et en dernier recours des réglages de Pi : le plus proche du travail l'emporte. Un agent qui ne déclare rien et qu'on lance sans argument tourne donc sur votre `~/.pi/agent/settings.json`, c'est-à-dire sur ce qui s'y trouve ce jour-là. Pendant la préparation de cette formation, neuf agents sans `model:` sont partis ensemble sur un fournisseur que personne n'avait choisi et ont rendu autant d'erreurs 402.

La règle, que combo énonce pour lui-même, est que tout agent dont les chiffres seront comparés déclare son modèle. Les quatre agents de ce module déclarent le leur, et deux participants qui les exécutent mesurent donc la même chose.
:::

::: warning Vos agents de projet ne sont jamais chargés par défaut
`.pi/agents/` est un contenu contrôlé par le dépôt, donc ses instructions sont des instructions tierces : combo refuse de les charger sans qu'on le demande, et c'est une frontière de sécurité et non une préférence. La portée se demande à chaque appel de l'outil, et l'oubli ne produit pas le même symptôme selon l'agent. Sur `explorer`, l'appel échoue, mais l'erreur ne nomme pas la portée et liste ce qui a été chargé : `Unknown agent "explorer". Loaded agents: auditor, coder, committer, interviewer, planner, reviewer, router, scout, synthesiser`. La liste permet de se corriger, puisqu'aucun de ces neuf noms n'est le vôtre, mais le message ne prononce jamais le mot portée. Sur `planner`, `coder` et `reviewer`, l'appel n'échoue pas : ces trois noms existent aussi parmi les neuf agents de démonstration livrés avec l'extension, servis à la priorité la plus basse, et c'est l'agent livré qui reçoit votre tâche, sous le nom que vous croyiez être le vôtre, avec un autre prompt et sans `model:` déclaré. Dès que la portée est demandée, la précédence joue dans le bon sens : la définition du dépôt l'emporte sur celle de votre machine, qui l'emporte sur celle du paquet.

La parade consiste à demander la portée projet à chaque lancement et à **vérifier dans la trace qui a tourné**, ce que la partie Reconstruire fait pratiquer.
:::

::: warning Un fichier d'agent incomplet est ignoré en silence
Un fichier auquel il manque `name` ou `description` n'est pas chargé, sans erreur ni avertissement : l'agent n'existe simplement pas, et le premier symptôme est un appel qui échoue plus tard, en listant des agents parmi lesquels le vôtre manque. C'est le comportement de Pi, que combo conserve. Les agents sont redécouverts à chaque appel, si bien qu'éditer un fichier suffit à le recharger, mais seulement si le fichier est complet.
:::

## Reconstruire

### La tâche : le ticket #2

Toute la partie pratique porte sur l'**issue #2** de NÉON : la collision est décrite comme lente et emmêlée au rendu, et le ticket demande d'identifier le chemin critique et d'optimiser **sans changer l'API publique**. La dette se constate en lisant le fichier : la boucle sur les briques de `frame()` fait la collision, le score et le dessin dans le même corps, si bien que rien de tout cela n'est testable séparément. La sortie attendue est une fonction **pure**, extraite de `frame()` et couverte par des tests neufs, sans qu'aucun des exports de `game/neon.js` ne change de nom ni de signature.

Ce ticket convient à ce module pour deux raisons. La première est que chaque rôle y a un livrable falsifiable : une note d'impact se vérifie en ouvrant les fichiers qu'elle cite, un plan se vérifie pas à pas, un diff se vérifie en lançant la suite, un verdict se vérifie contre la liste des exports. La seconde est que le ticket **affirme** quelque chose qu'il ne mesure pas : « la collision est lente » est une phrase du mainteneur et non un chiffre. Le module sur le contexte a montré qu'un document pointé est lu et suivi ; celui-ci ajoute qu'un document lu reste une donnée, que l'on vérifie avant de la propager dans un plan.

Le cadre ne change pas : seuls `game/neon.js` et `game/neon.test.js` peuvent être modifiés, les tests neufs vont dans la suite et nulle part ailleurs, et `npm test` doit finir vert.

### Quatre rôles, et ce que chacun a le droit de faire

| agent      | livrable                                    | panoplie                             | ce que sa panoplie lui interdit |
| ---------- | ------------------------------------------- | ------------------------------------ | ------------------------------- |
| `explorer` | une note d'impact                           | `read, grep, find, ls`               | écrire quoi que ce soit         |
| `planner`  | un plan en petits pas                       | `read, grep, find, ls`               | écrire quoi que ce soit         |
| `coder`    | le diff d'**un** pas du plan                | `read, grep, find, ls, edit, write`  | lancer une commande             |
| `reviewer` | `APPROVED` ou `CHANGES REQUESTED`, motivé   | `read, grep, find, ls`               | corriger ce qu'il relit         |

Les quatre fichiers sont versionnés dans `scripts/agents/` et se recopient dans le `.pi/agents/` de votre clone de NÉON. Les voici, avec les décisions de rédaction qui se transposent à n'importe quel découpage en rôles.

<<<@/../scripts/agents/explorer.md{md}

L'explorer rend une note et non un avis : sa dernière section rappelle qu'une note qui contient aussi la correction cesse d'être une note. Et son prompt lui dit que les tickets de ce dépôt sont écrits par un mainteneur qui s'est parfois trompé sur l'emplacement du code, ce qui est vrai, et suffit à ce que la note vérifie au lieu de recopier.

<<<@/../scripts/agents/planner.md{md}

Le planner applique la leçon du module sur le contexte : un modèle a un budget, et décrire plus de travail ne l'agrandit pas. Chaque pas du plan doit donc tenir dans une invocation du coder, avec sa règle de découpe explicite, « si tu hésites, découpe ». Chaque pas commence par son test rouge, et les tests vont directement dans la suite, ce qui est la coupe exacte que la révision de la procédure du module précédent avait dû faire pour vider ses colonnes en échec.

<<<@/../scripts/agents/coder.md{md}

Le coder a de quoi écrire et rien pour exécuter, et son prompt l'énonce : il ne lance pas les tests, il ne prétend pas l'avoir fait, c'est vous qui les lancez après lui. Nous aurions pu lui donner un shell ; l'exercice qui suit montre ce que son absence garantit.

<<<@/../scripts/agents/reviewer.md{md}

Le reviewer ne corrige jamais, parce qu'un relecteur qui corrige devient un second codeur dont le travail n'est plus relu. Ses quatre vérifications sont ordonnées, la plus mécanique d'abord, et deux d'entre elles se font contre **l'arbre** et non contre le diff, parce que le diff montre ce qui a changé et non ce que le changement a oublié. Son verdict, enfin, peut désigner le plan plutôt que le code, auquel cas c'est au planner que vous retournerez.

Deux autres fichiers, `tester.md` et `auditor.md`, vivent à côté des quatre rôles et seront copiés avec eux. Ils ne jouent aucun rôle dans la boucle de ce module : le premier est le candidat naturel du lancement en parallèle du module suivant, le second y relira le travail fini dans son ensemble, et les laisser dans `.pi/agents/` ne coûte que leurs descriptions.

::: info Exercice (en salle)
Avant de lancer quoi que ce soit, faites énoncer à chaque agent sa propre garantie. Installez l'extension et déposez les agents :

```bash
git clone https://github.com/AI-for-dev/combo.git
cd combo && npm install       # Node 23.6 ou plus récent, pas d'étape de build

cd /chemin/vers/neon
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi -e /chemin/vers/combo/extension
```

Puis, dans la session, lancez l'explorer en portée projet avec pour seule tâche : « Nomme exactement les outils dont tu disposes. » Voici ce que le nôtre a rendu :

> « Je dispose des outils suivants :
> `read` : lire le contenu d'un fichier. `grep` : rechercher un motif dans le contenu des fichiers. `find` : rechercher des fichiers selon un motif (glob). `ls` : lister le contenu d'un répertoire. »

La liste ne contient aucun outil d'écriture, et c'est l'agent qui l'énonce lui-même.

Faites de même avec le coder en lui demandant de lancer les tests. Voici, verbatim, la réponse du nôtre :

> « I cannot execute shell commands, including `npm test`. According to my instructions, the orchestrator runs the tests after my response and provides the output. Since I cannot trigger the tests myself, I cannot report their result at this moment. »

Nous avions d'abord prévu la démonstration inverse, qui consiste à ordonner à l'explorer de corriger un fichier et à le regarder ne pas pouvoir. Nous l'avons faite, et elle est moins probante qu'il n'y paraît, parce que l'agent y raisonne sur la contradiction et choisit d'obéir à son prompt, si bien qu'un participant sceptique peut légitimement y voir de l'obéissance plutôt qu'une impossibilité. La panoplie énoncée par l'agent ne souffre pas de cette ambiguïté.
:::

### Le tour de boucle, à la main

Vous tenez maintenant le rôle que le module suivant automatisera. Ouvrez la session principale avec l'extension chargée, et donnez-lui son cadre en premier message : elle est un relais, elle ne lit pas le dépôt, ne modifie rien, lance l'agent que vous nommez en portée projet avec la tâche que vous dictez, et vous rend le livrable du sous-agent **tel quel**. Ce cadre est une consigne et non une garantie, la section sur les limites du dispositif y revient, et la vérification se fait dans la trace.

La boucle comporte six gestes :

1. **explorer** reçoit le ticket #2 et rend la note d'impact ;
2. vous lisez la note, puis **planner** reçoit le ticket et la note, telles quelles, et rend le plan ;
3. **coder** reçoit le pas 1 du plan, et rien d'autre du plan ; il rend son rapport, et le diff est dans l'arbre ;
4. vous lancez **`npm test` vous-même**, dans un second terminal, et vous gardez la sortie ;
5. **reviewer** reçoit le ticket, le pas, le diff (`git diff`) et la sortie des tests, collés par vous, et rend son verdict ;
6. selon le verdict : pas suivant au coder, retour au coder avec les raisons, ou retour au planner si c'est le pas qui est en cause.

Pendant qu'un sous-agent travaille, un point s'affiche au-dessus de l'invite avec son modèle, ses tokens et un chronomètre, et la ligne d'outil en dessous garde la trace de l'appel. Si [herdr](https://herdr.dev) tourne sur votre machine, `/herdr on` donne à chaque sous-agent son propre volet, et vous voyez l'explorer lire pendant que vous préparez la tâche suivante. Cette vue sert à suivre le travail ; la section sur la trace explique pourquoi elle ne permet de rien conclure.

Pendant que vous les faites, tenez un journal de friction, une ligne par geste : ce que vous avez copié, de qui vers qui, et ce que vous avez décidé au passage. Tenez-le où vous voulez, sauf dans l'arbre de NÉON, dont le périmètre est noté. Ce journal liste ce que l'orchestrateur du module suivant devra savoir faire, et vous êtes bien placé pour l'écrire puisque vous aurez fait chaque geste vous-même.

::: info Exercice (en salle)
Déroulez la boucle jusqu'au premier `APPROVED`, c'est-à-dire jusqu'à ce que le pas 1 du plan soit livré, testé et relu. Si le reviewer refuse, jouez le refus jusqu'au bout : c'est la moitié la plus instructive de la boucle, parce qu'elle vous oblige à décider à qui renvoyer le verdict.

Si la séance le permet, continuez jusqu'au bout du plan. Le critère final est celui du ticket : la fonction extraite est pure et couverte par au moins deux tests neufs dans la suite, toutes les fonctions exportées de `game/neon.js` le sont encore, et `npm test` est vert.
:::

### Ce que l'isolation change dans votre fenêtre

::: info Exercice (en salle)
Juste après le retour de la note de l'explorer, tapez `/session` dans la session principale et notez ce qu'elle contient : votre cadre, l'appel d'outil, la note. Ouvrez ensuite une session neuve **sans** l'extension et demandez au modèle de produire la même note d'impact lui-même, en lisant le dépôt. Comparez les deux `/session`, puis les deux `\tree`.

Dans la seconde session, chaque fichier lu est resté dans la fenêtre et y restera jusqu'à la fin ; la première n'a fait entrer que la note. La délégation paie l'exploration dans un contexte qui disparaît une fois la tâche rendue, au lieu de la payer à chaque tour dans la fenêtre principale. L'argument est le même que pour la lecture de cache du module sur le contexte : un travail se paie à chaque tour tant qu'il reste dans la fenêtre, et une seule fois quand il n'y entre pas.
:::

### Vérifier dans la trace qui a tourné

::: info Exercice (en salle)
Exportez la session principale avec `\export` et retrouvez chaque appel de l'outil `subagent` : le nom de l'agent, la portée, le modèle, la tâche transmise. C'est la seule réponse fiable à la question de savoir qui a tourné.

Puis faites la contre-épreuve, deux fois. Demandez le lancement de l'explorer **sans** préciser la portée : l'appel échoue, et l'erreur énumère les neuf agents livrés, parmi lesquels le vôtre ne figure pas, sans que le message prononce le mot « portée ». Demandez ensuite celui du planner dans les mêmes termes : l'appel réussit, parce qu'un `planner` existe parmi les agents livrés avec l'extension, et c'est lui qui a reçu votre tâche, sous un autre prompt et sans `model:` déclaré. Seuls l'argument de portée dans la trace et le modèle utilisé trahissent la substitution ; rien, dans la réponse rendue, ne vous l'aurait dit.
:::

Une raison de plus de ne pas croire les indicateurs sur parole : pendant la préparation de cette formation, une version antérieure de l'outillage de délégation affichait un ✓ vert sur un sous-agent **mort**, parce que la fonction de fermeture renvoyait `ok: true` en dur. Le défaut est corrigé, et un test le garde, mais la leçon ne dépend pas du correctif : un indicateur de réussite est du code comme un autre, écrit par quelqu'un, et seule la trace fait foi.

### Pourquoi ce module ne publie pas de matrice

Les deux modules précédents ont établi leurs affirmations sur vingt répétitions, et celui-ci n'en publie aucune. Cette absence est délibérée, et sa raison décide de ce qu'on mesure dans un harnais.

Ce que ce module affirme est **structurel** : un agent sans outil d'écriture ne peut pas écrire, un relecteur au contexte neuf ne voit pas les intentions du codeur, une exploration déléguée ne revient pas dans la fenêtre. Une seule exécution, trace en main, suffit à vérifier chacune de ces propriétés, et vingt n'y ajouteraient rien, là où vingt ne suffisaient pas toujours à établir l'effet d'un prompt.

Ce que ce module ne peut pas affirmer, en revanche, c'est que le découpage en rôles **améliore le résultat** : que le ticket #2 traité par cette boucle déborde moins, ou soit mieux corrigé, que le même ticket traité par un agent seul. C'est une question de mesure, elle est légitime, et elle n'est pas tranchée ici. Le module suivant pose le protocole qui permet de la trancher, la boucle automatisée contre l'agent seul sur ce même ticket dans une même matrice, et l'hypothèse s'y écrira avant les chiffres.

### Les limites du dispositif

**Rien n'empêche la session principale de faire le travail elle-même.** Votre relais a un shell, des outils d'écriture, et une consigne de ne pas s'en servir : c'est la situation que le module précédent a mesurée, une consigne de ce genre étant suivie moins d'une fois sur trois. Si votre boucle a bien fonctionné, c'est que la tâche de chaque tour était assez cadrée pour que déléguer soit le chemin de moindre effort, et rien ne l'imposait. La version garantie, un contrôle qui refuse à la session principale ce qui n'appartient qu'aux rôles, demande le mécanisme du module sur les permissions.

**Rien de ce que vous avez fait entre deux agents n'est archivé.** La note que vous avez lue en diagonale, le pas que vous avez transmis en le reformulant un peu, la sortie de test que vous avez tronquée en la collant : chacun de ces gestes est parti de votre mémoire de travail, et aucun ne peut être rejoué, comparé ni mesuré. C'est ce que le module suivant automatise, et votre journal en donne la liste.

## Généraliser

**Déléguer, c'est isoler un contexte et n'en faire revenir que la conclusion.** Le gain tient moins au coût du travail qu'au fait qu'il ne reste pas dans la fenêtre : une exploration faite dans la session principale s'y relit à chaque tour jusqu'à la fin, la même exploration déléguée disparaît avec son contexte et ne laisse que trente lignes. Si ce qui revient du sous-agent est aussi gros que ce qu'il a lu, la délégation n'a rien isolé du tout.

**La garantie d'un agent vient de sa panoplie plutôt que de son prompt.** Le prompt du coder lui dit de ne pas lancer les tests, mais c'est l'absence d'un shell qui fait qu'il ne le peut pas, et l'agent sait lui-même faire la différence. Chaque fois que vous hésitez entre écrire une interdiction et retirer un outil, retirez l'outil, parce qu'une absence se constate dans la configuration alors qu'une interdiction suppose que le modèle la suive.

**Le générateur ne s'évalue pas lui-même.** La valeur d'un relecteur séparé vient de ce que son contexte ne contient pas, c'est-à-dire le raisonnement qui a produit le code. C'est aussi pourquoi un reviewer qui corrige détruit sa propre valeur, en redevenant un générateur que personne ne relit.

**Ce qui n'est pas déclaré est décidé ailleurs.** Un agent sans `model:` tourne sur les réglages du jour de la machine, un fichier sans `tools:` obtient la panoplie en lecture seule, un fichier sans `name` n'existe pas. La règle vaut au-delà des agents : pour chaque champ d'une configuration, demandez-vous ce qui se passe quand il est absent, et qui décide alors à votre place.

**Une configuration que le modèle peut omettre se vérifie à chaque exécution.** Vos agents déposés dans `.pi/agents/` ne sont servis que si l'appel demande la portée projet, et trois de vos rôles ont des homonymes livrés qui prennent leur place sans erreur quand elle manque. Ce genre de configuration se vérifie dans la trace à chaque exécution, ou se force par un mécanisme, et ne se suppose jamais acquise.

**Seule la trace dit qui a tourné.** Un ✓ vert s'est affiché sur un sous-agent mort parce qu'une fonction renvoyait `true` en dur, et rien dans la réponse d'un agent substitué ne dit qu'il a été substitué. La question de savoir qui a tourné, avec quels outils et sur quel modèle, a une seule source fiable, la trace de session, et elle se lit en une minute.

**Le découpage en rôles répartit le budget du modèle sans l'augmenter.** Le modèle qui décrochait sur le ticket long décrochera tout autant sur un plan entier passé en une fois : c'est le pas du plan, dimensionné pour tenir dans une invocation, qui convertit le découpage en travail fini. Le planner qui découpe trop gros reproduit exactement le décrochage que le module sur le contexte a mesuré.

**Automatiser une boucle demande de l'avoir tenue à la main.** Votre journal de friction dit ce que l'orchestrateur devra router, dans quel ordre, et sur quels critères vous avez décidé des retours. Un orchestrateur adopté avant d'avoir tenu la boucle automatise une procédure que personne n'a vérifiée.

## Livrable

Ce module produit trois pièces.

**1. Les quatre agents**, versionnés dans votre dépôt, chacun avec sa panoplie minimale et son `model:` déclaré. Ce sont eux que le module suivant branchera sur l'orchestrateur, sans les modifier.

**2. Le journal d'un tour de boucle** : la trace de la session principale exportée, le diff livré du premier pas, la sortie de `npm test` que le reviewer a lue, et votre journal de friction. C'est la pièce qui prouve qui a tourné, et celle dont le module suivant a besoin.

**3. La ligne « délégation » de la fiche de décision** :

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
Vous savez montrer, trace en main, quel agent a tourné à chaque étape de votre boucle, avec quels outils et quel modèle, et citer le geste de votre journal de friction que vous refuseriez de refaire vingt fois.

La première moitié demande d'avoir lu une trace plutôt qu'un ✓, la seconde d'avoir tenu la boucle soi-même, et ni l'une ni l'autre ne se remplit de mémoire.
:::

## Les pièges

**Oublier la portée projet.** L'oubli est silencieux précisément sur les rôles qui ont un homonyme livré : `planner`, `coder` et `reviewer` répondent quand même, sous un autre prompt et sur un autre modèle, et seul `explorer` échoue, avec une erreur qui énumère les agents chargés sans nommer la portée. Demandez la portée à chaque appel, et vérifiez dans la trace.

**Ne pas déclarer `model:`.** L'agent tourne alors sur les réglages du jour de votre machine, et deux participants qui exécutent le même module ne comparent plus la même chose. Les neuf agents de test partis rendre des 402 sur un fournisseur que personne n'avait choisi en sont la démonstration.

**Donner le plan entier au coder.** C'est recréer, à l'intérieur du découpage, le ticket long sur lequel le modèle décroche : il écrira le début et s'arrêtera, et le reviewer refusera un travail que personne ne lui a découpé. Donnez un pas par invocation, et lisez le rapport du coder entre deux.

**Laisser le reviewer corriger.** Un relecteur qui corrige devient un second codeur que personne ne relit, et son `APPROVED` suivant ne vaut plus rien, puisqu'il porte sur son propre travail.

**Faire remonter l'exploration au lieu de la conclusion.** Coller la session entière de l'explorer dans le contexte principal annule l'isolation qu'on vient de payer : seule la note remonte. Le critère se vérifie mécaniquement : ce qui revient doit être petit devant ce qui a été lu.

**Reformuler un livrable en le routant.** L'orchestrateur qui résume la note avant de la donner au planner introduit une étape invisible, ni versionnée ni relisible, exactement là où la chaîne se voulait traçable. Les livrables se transmettent tels quels, et c'est pour cela que leur forme est imposée par les prompts des agents.

**Prendre un refus pour une discipline.** Un agent read-only n'a pas « refusé » d'écrire, il ne le pouvait pas ; et inversement, l'agent qui a l'outil et promet de ne pas s'en servir n'a rien garanti du tout. Le module précédent a chiffré ce que vaut une consigne de ce genre : elle est suivie moins d'une fois sur trois.

**Croire un ✓.** Un ✓ vert s'est affiché sur un sous-agent mort pendant la préparation de ce module. La trace contient les appels d'outils réels, et c'est elle qui fait foi.

## Pour aller plus loin

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), sur l'orchestrateur et les sous-agents chercheurs, et sur ce que la parallélisation coûte en tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), le contrepoint : ce que la fragmentation du contexte fait perdre, et pourquoi le partage du fil complet est parfois préférable.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la page qui distingue workflows et agents ; le module suivant en met les motifs en œuvre.
- [combo](https://github.com/AI-for-dev/combo), la bibliothèque de sous-agents et de workflows utilisée ici : sa documentation sur les agents et les durées de vie, et son `NEXT.md`, qui liste les pièges déjà rencontrés.
- [herdr](https://herdr.dev), la vue en direct des sous-agents, utilisée dans ce module et le suivant.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), pour la place des sous-agents parmi les autres briques : réinjecter une synthèse propre plutôt que la réflexion qui l'a produite.
