# Les skills : une procédure de travail, et ce qu'elle déplace

::: tip Objectifs de ce module
- Savoir ce qu'est un skill sur Pi, ce que le modèle en voit, et ce qu'il n'en voit pas
- Distinguer une compétence que le modèle peut ignorer d'une compétence qu'on lui impose
- Écrire une procédure de travail qui produise un livrable exploitable
- Mesurer ce qu'elle déplace, et ne pas confondre déplacer et améliorer
- Réviser une procédure à partir des exécutions lues, et vérifier la révision par une nouvelle matrice
:::

Le module précédent a fait le tour de ce qu'on gagne en s'y prenant mieux : choisir un modèle, régler un curseur, écrire un ticket, tenir un fichier de règles. Il s'est terminé sur un constat. Sur les configurations qui reçoivent le ticket cadré, quatre exécutions sur vingt écrivent les tests rouges que le ticket demande et n'ouvrent jamais `game/neon.js` : le modèle épuise son budget à formuler les cas et n'arrive pas à les corriger. Le seul levier qui ait rattrapé ce décrochage consistait à lui fournir les tests déjà écrits, ce que personne ne fera sur un vrai ticket.

La question de ce module est donc de savoir si une **procédure de travail**, écrite une fois et rechargée à la demande, obtient la même chose sans fournir les tests.

Nous suivons l'ordre habituel : comprendre ce qu'est un skill dans le harnais, en écrire un sur cette question, mesurer ce qu'il produit, puis le réviser et remesurer.

## Comprendre

### Un skill est un fichier markdown

Un **skill** est un fichier `SKILL.md` posé dans un répertoire `.pi/skills/<nom>/` du projet, au format du standard ouvert [Agent Skills](https://agentskills.io). Il se compose d'un frontmatter, qui porte au minimum un nom et une description, et d'un corps qui contient les instructions. Il n'y a ni code, ni enregistrement, ni configuration à prévoir : déposer le fichier suffit.

Voici un skill complet, volontairement minuscule :

```markdown
---
name: revue-rapide
description: Relit les modifications en cours du dépôt. Utiliser quand l'utilisateur demande une relecture avant de commiter.
---

# Revue rapide

1. Lance `git diff` et lis toute la sortie.
2. Relève ce qui peut casser un test existant, puis ce qui manque de test.
3. Rends deux listes : « à corriger avant le commit » et « peut attendre ».
```

L'idée est celle d'une procédure de travail qu'on écrit une fois et que l'agent recharge à la demande, au lieu de la retaper dans chaque prompt. Elle occupe une place à part dans le harnais : `AGENTS.md` entre dans le contexte à chaque tour et coûte donc à chaque tour, alors qu'un skill est fait pour n'entrer que quand la tâche le demande.

### Ce que le modèle en voit

Il y a un point de mécanique à bien comprendre, car il conditionne tout le reste. Pi injecte dans le prompt système, **à chaque tour**, le nom, la description et le chemin de chaque skill disponible :

```
The following skills provide specialized instructions for specific tasks.
Use the read tool to load a skill's file when the task matches its description.

<available_skills>
  <skill>
    <name>revue-rapide</name>
    <description>Relit les modifications en cours du dépôt...</description>
    <location>/chemin/vers/.pi/skills/revue-rapide/SKILL.md</location>
  </skill>
</available_skills>
```

Le **corps** du `SKILL.md` n'y est pas. Il entre dans le contexte par l'un des deux chemins suivants, et la différence entre les deux est le sujet de ce module.

Le premier est que le modèle **décide** de l'ouvrir avec l'outil de lecture, sur la foi de la seule description. La documentation de Pi le dit dans les mêmes termes, en ajoutant que « models don't always do this ».

Le second est que l'utilisateur écrive `/skill:revue-rapide` dans son message, auquel cas Pi **développe** le fichier côté client et colle son corps dans le premier tour. Le modèle n'a plus rien à décider.

Il y a deux conséquences pratiques. La description est la seule chose sur laquelle repose le premier chemin, si bien que tout le soin mis dans le corps ne sert à rien tant qu'elle ne déclenche pas. Et un skill ne coûte presque rien tant qu'il n'est pas utilisé, ce qui rend tentant d'en accumuler. Gardez cependant en tête que chaque description ajoutée entre dans le contexte à chaque tour et que vingt skills finissent par former un préambule conséquent.

::: info Exercice (en salle)
Vérifiez cette mécanique par vous-même, dans votre clone de NÉON.

1. Créez `.pi/skills/revue-rapide/SKILL.md` avec le contenu ci-dessus, modifiez une ligne d'un fichier du jeu, puis ouvrez une session.
2. Exportez la session avec `\export` et retrouvez le bloc `<available_skills>` dans le prompt système : le nom, la description et le chemin y sont, le corps n'y est pas.
3. Demandez « relis ce que je viens de modifier » sans nommer le skill, et regardez si le modèle va lire `SKILL.md` de lui-même : l'appel à l'outil de lecture est visible dans la session.
4. Ouvrez une session neuve et tapez `/skill:revue-rapide`. Le corps est cette fois collé dans votre premier message, et il n'y a plus de décision à observer.

Vous venez de parcourir les deux chemins. Le premier repose entièrement sur la description, le second n'en a pas besoin.
:::

## Reconstruire

### Ce qu'une procédure doit produire

La compétence que nous écrivons répond au décrochage mesuré au module précédent, et elle a donc deux choses à obtenir. La première est que l'agent **décompose** le symptôme rapporté par le joueur en défauts distincts, au lieu de s'arrêter à la première explication qui rend compte de ce qu'il voit. La seconde est qu'il **tienne la distance**, c'est-à-dire qu'il corrige chaque défaut jusqu'au vert au lieu de s'arrêter une fois les cas rouges écrits.

La compétence `playtest` est écrite pour ça. Elle donne à l'agent un rôle, celui du playtesteur qui sait qu'un symptôme n'est pas un bug, un repère de coordonnées pour que les signes de vitesse ne se devinent pas, une table de dix familles de défaillances à passer une par une, et l'obligation de chiffrer chaque déclencheur depuis les constantes du fichier plutôt que de le décrire.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest/SKILL.md{md}

Deux décisions de rédaction méritent d'être relevées, parce qu'elles se transposent à n'importe quelle procédure.

**Le livrable est un fichier dont la forme est imposée.** L'étape 4 impose la forme de `.scratch/to_fix.md`, un bloc par défaut, avec sa cause localisée à la ligne près, son invariant violé, son déclencheur chiffré, son cas de test, la sortie d'échec réelle copiée du terminal, et la correction naïve que ce cas refuse. Un agent qui produit ce fichier a nécessairement fait le travail que le fichier décrit.

**La procédure décrit aussi ce qu'elle refuse.** L'étape 3 demande de passer chaque cas au rouge deux fois, une fois sur le code d'aujourd'hui et une fois sur la correction naïve, ce qui interdit les tests qui vérifient seulement que quelque chose a changé. C'est la contrepartie directe de ce que le module précédent a mesuré, où des corrections passaient les quatre faces et échouaient au coin.

::: info Exercice (en salle)
Écrivez la description avant de lire la nôtre, puis comparez. C'est la seule ligne du fichier que le modèle lira à coup sûr, et sa formulation demande donc le plus de soin.

Un critère utile : votre description dit-elle **quand** s'en servir, ou seulement **ce que** la procédure fait ? Les deux formulations se ressemblent à la relecture, mais seule la première aide le modèle à décider d'ouvrir le fichier.
:::

### Comment la compétence entre dans la mesure

Les deux configurations à compétence de la matrice reçoivent le prompt suivant :

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt-with-skill.md

Trois choses sont à noter. La demande est la demande négligée du module précédent. Le `/skill:playtest` en tête fait développer le corps du fichier côté client, donc la compétence est **imposée** plutôt que proposée. Et la lecture d'`ISSUES.md` est interdite, pour que la procédure travaille sur le symptôme du joueur et non sur un ticket déjà rédigé.

La colonne `skill_invoque` vaut donc 20/20 sur ces deux configurations par construction, et 0/20 sur toutes les autres. Elle enregistre un fait sur la session sans mesurer une décision du modèle, et rien de ce qui suit ne porte sur la question de savoir si une bonne description déclenche.

## Ce que la mesure dit

Les configurations à compétence se lisent contre celles qui reçoivent le ticket cadré, à `AGENTS.md` et raisonnement identiques. Sur `gemma-4-31b`, vingt répétitions :

| configuration                    | `in_scope` | `tests_ajoutes` | briques | angles | sortie | voisines |
| -------------------------------- | ---------- | --------------- | ------- | ------ | ------ | -------- |
| `+agents+well_crafted`           | 19/20      | 17/20           | 11/20   | 12/20  | 9/20   | 9/20     |
| `+agents+skill`                  | **6/20**   | **8/20**        | 16/20   | 7/20   | 13/20  | 14/20    |
| `+agents+add_tests+well_crafted` | 20/20      | 17/20           | 18/20   | 18/20  | 18/20  | 18/20    |
| `+agents+add_tests+skill`        | **9/20**   | **7/20**        | 13/20   | 12/20  | 13/20  | 13/20    |

Nous en tirons trois lectures, dont deux sont établies et une ne l'est pas.

**La compétence déplace les tests hors de la suite.** `tests_ajoutes` passe de 17/20 à 8/20, soit un écart de -47 points dont l'intervalle exclut zéro. Ce n'est pas un manquement : la procédure demande explicitement que les cas vivent dans `.scratch/to_fix.md`, et l'agent obéit. La métrique compte les cas ajoutés à `game/neon.test.js`, donc elle enregistre exactement ce que la compétence a décidé de faire : les cas existent, mais à un endroit où la suite de tests du dépôt n'ira jamais les chercher.

**La compétence laisse ses brouillons derrière elle.** `in_scope` tombe de 19/20 à 6/20, soit -68 points, également établi. La colonne `touched` nomme les coupables : `.scratch/to_fix.md` reste dans onze exécutions sur vingt, accompagné de `.scratch/repro.test.js`, `.scratch/test_collision.js` ou `.scratch/probe.js`. L'étape 6 du `SKILL.md` ordonne pourtant de retirer tous les fichiers créés. La consigne de nettoyage n'est donc suivie que dans moins d'une exécution sur trois.

**Sur la correction elle-même, rien n'est établi.** Le critère passe de 11/20 à 16/20 contre le ticket cadré, mais son intervalle contient zéro. La colonne du coin va dans l'autre sens, 12/20 contre 7/20, et son intervalle contient zéro aussi. Les vingt exécutions ne permettent de conclure ni que la procédure aide, ni qu'elle nuit.

::: warning Ce que l'écart à la base ne dit pas
La synthèse publie `+agents+skill` à +29 points sur le critère contre `nothing`, écart établi, et il serait tentant d'en faire le résultat du module.

Cette configuration diffère de la base par **quatre choses à la fois** : le raisonnement élevé, le fichier de règles, la compétence, et une extension de recherche web. Les trois premières ont chacune leur configuration propre dans la matrice, la compétence n'en a pas, et rien ne permet donc de lui attribuer une part de ces vingt-neuf points.

Le seul écart lisible pour la compétence est celui qui la compare au ticket cadré, ci-dessus, et il est non concluant sur la correction. Isoler le levier demanderait une configuration de plus, à demande négligée, raisonnement élevé, fichier de règles, et rien d'autre. Elle n'a pas été mesurée.
:::

### La compétence face à la pile la mieux outillée

La configuration `+agents+add_tests+skill` se lit contre `+agents+add_tests+well_crafted`, dont elle ne diffère que par le remplacement du ticket cadré par la compétence :

| colonne          | ticket cadré | compétence | écart       |
| ---------------- | ------------ | ---------- | ----------- |
| `in_scope`       | 20/20        | 9/20       | -55 pts `*` |
| `tests_ajoutes`  | 17/20        | 7/20       | -50 pts `*` |
| `rebond_angles`  | 18/20        | 12/20      | -30 pts `*` |
| `rebond_briques` | 18/20        | 13/20      | -25 pts `o` |

Trois écarts établis, tous négatifs. Sur cette tâche, avec ce modèle, la procédure de travail ne remplace pas avantageusement un ticket correctement rédigé, et la colonne du coin le dit le plus clairement : elle est celle que le ticket décrit et que la compétence, qui n'a pas le droit de lire `ISSUES.md`, doit retrouver seule.

`sonde_intacte` vaut 20/20, donc aucune exécution n'a modifié la sonde qu'elle avait sous les yeux.

### Ce que la compétence coûte

| configuration                    | tokens d'entrée | tours | durée |
| -------------------------------- | --------------- | ----- | ----- |
| `+agents+well_crafted`           | 413 335         | 30    | 378 s |
| `+agents+skill`                  | **921 783**     | 49    | 575 s |
| `+agents+add_tests+well_crafted` | 558 473         | 31    | 590 s |
| `+agents+add_tests+skill`        | **811 584**     | 44    | 540 s |

Contre la base, `+agents+skill` coûte +908 622 tokens d'entrée, +47 tours et +560 secondes, les trois écarts étant établis. Elle est la configuration la plus chère de toute la matrice.

::: warning Ces colonnes de coût sont à lire avec la réserve du module précédent
Les deux configurations à compétence portent à elles seules 632 des 1 151 reprises de la matrice ILaaS, 345 pour l'une et 287 pour l'autre. Une reprise rejoue le tour avec tout le contexte accumulé, donc ces colonnes mesurent en partie notre propre charge sur le fournisseur.

L'ordre de grandeur reste lisible sur la matrice `deepseek-v4-flash`, qui compte trente-sept reprises au total et où `+agents+skill` met 1 068 secondes de médiane contre 553 pour `+agents+well_crafted`. Une procédure en six étapes qui impose une recherche documentaire, dix familles à instruire et une boucle TDD est un long travail, et la mesure ne dit rien d'autre.
:::

## Réviser la procédure, puis remesurer

Une procédure de travail est du texte versionné qui produit des effets mesurables, et elle se révise donc comme du code : un diagnostic tiré des exécutions, une correction, une nouvelle mesure. Les colonnes en échec de la matrice ont chacune une cause qui se lit dans les exécutions prises une par une.

**Les tests naissent au mauvais endroit.** L'étape 3 dit que les cas vivent dans `.scratch/to_fix.md`, et c'est l'étape 5 qui les fait migrer vers `game/neon.test.js`. Cette migration est la marche que le modèle rate : dix exécutions sur vingt finissent à « 6 cas, comme à l'étalon », l'agent ayant corrigé le code contre ses brouillons et considéré le travail terminé.

**La consigne de ménage détruit parfois le livrable.** « Retire tous les fichiers que tu as créés » est restée lettre morte dans les treize exécutions qui laissent des fichiers derrière elles, et deux exécutions l'ont au contraire appliquée au pied de la lettre : `game/neon.test.js`, que l'agent venait de remplir, n'existe plus dans l'arbre mesuré.

**Une référence fantôme fabrique des fichiers.** L'étape 3 demande d'exécuter chaque cas « depuis la sonde de l'étape 1 », alors que l'étape 1 est la recherche documentaire et ne crée aucune sonde. Cette consigne orpheline, restée d'une version antérieure du fichier, pousse les exécutions à inventer ce qui manque : les `probe.js`, `repro.test.js` et `test_ghost.js` qui remplissent la colonne `touched` en sont la trace.

La matrice `deepseek-v4-flash` complète le diagnostic : la même compétence y obtient `tests_ajoutes` à 20/20. Le contenu de la procédure suffit donc à un modèle qui a le budget de la dérouler ; sur `gemma-4-31b`, c'est le protocole lui-même qui épuise ce budget.

### La révision : `playtest-court`

La version révisée garde ce qui porte le contenu : le rôle, le repère de coordonnées, la table des dix familles et l'obligation de chiffrer chaque déclencheur depuis les constantes. Elle coupe le reste, et chaque coupe répond à un défaut lu dans les exécutions. Les cas s'écrivent directement rouges dans `game/neon.test.js` et la procédure ne crée plus aucun fichier, ce qui supprime à la fois la migration ratée et le besoin de ménage. L'étape de recherche web disparaît, puisque les sessions n'en montraient qu'un seul appel. Le double rouge et le bloc de douze champs sont remplacés par une exigence d'une ligne : le cas vérifie le comportement attendu en valeurs, jamais seulement « quelque chose a changé ». Le fichier passe de six étapes à quatre et de 182 lignes à 86.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest-court/SKILL.md{md}

### Ce que la seconde matrice dit

Le scénario `issue1-skills` met les deux compétences face à face, à `AGENTS.md`, raisonnement et modèle identiques, vingt répétitions par cellule, l'originale servant de référence aux écarts. Il vit dans son propre fichier pour ne pas toucher aux matrices archivées du module, et son hypothèse, `hypotheses/issue1-skills.md`, a été écrite avant de mesurer. Sur `gemma-4-31b` :

| colonne          | `playtest` | `playtest-court` | écart                  |
| ---------------- | ---------- | ---------------- | ---------------------- |
| `in_scope`       | 9/20       | **20/20**        | +53 pts `*` [+32, +74] |
| `tests_ajoutes`  | 13/20      | **20/20**        | +32 pts `*` [+11, +53] |
| `rebond_briques` | 14/20      | 17/20            | +11 pts `o`            |
| `rebond_angles`  | 4/20       | 8/20             | +19 pts `o`            |

Sur `deepseek-v4-flash`, `in_scope` passe de 15/20 à 20/20, soit +25 points établis [+10, +45], et aucune colonne de correction ne bouge : l'écart sur le critère vaut +0 point.

Nous en tirons trois lectures.

**Les deux déplacements établis de la première version disparaissent.** Le périmètre est plein sur les quarante exécutions à compétence courte, et les tests vont tous dans la suite du dépôt. Les modèles sont les mêmes, seul le protocole a changé : quand le livrable s'écrit directement à sa place, il n'y a plus de migration à rater ni de ménage à obtenir. Une procédure qui aurait réellement besoin de fichiers intermédiaires garderait le problème entier, et le module sur les permissions montrera comment un hook qui refuse un `git commit` tant que le brouillon est dans l'arbre garantit ce qu'une phrase ne peut que suggérer.

**La correction ne bouge toujours pas de façon établie.** +11 points sur le critère et +19 sur le coin, avec des intervalles qui contiennent zéro dans les deux cas. Le coin reste la colonne la plus basse de gemma, à 8/20, loin des 14/20 que le prompt cadré obtenait au module précédent : la révision a réparé le protocole de la procédure, elle n'a pas remplacé le ticket.

**Le coût baisse, et l'écart est lisible sur flash.** Sa matrice porte vingt-trois reprises, un total du même ordre que les trente-sept que le module précédent jugeait lisibles, et la compétence courte y prend 12 861 tokens d'entrée en médiane contre 34 764, 692 secondes contre 1 054, et l'écart de tours vaut -27 avec un intervalle de [-47, -16]. La matrice gemma va dans le même sens mais porte 490 reprises, si bien que ses colonnes de coût gardent la réserve habituelle : l'hypothèse prédisait cette baisse, et cette matrice-là ne peut pas la confirmer.

::: warning La cellule répliquée n'a pas rendu les mêmes chiffres
`+agents+skill` remesurée sur gemma donne 9/20 sur le périmètre, 13/20 sur les tests ajoutés et 14/20 sur le critère, là où la campagne du module en donnait 6, 8 et 16. Même configuration, même commit, même modèle : c'est la dispersion du module précédent, vue une fois de plus. C'est aussi pourquoi le scénario remesure l'originale dans la même matrice au lieu de recopier ses anciens chiffres, et pourquoi les écarts de cette section ne comparent que des cellules mesurées ensemble.
:::

L'archive de ces deux matrices est dans `scripts/trysquare-campaign/results-2026-08-13/`.

## Ce qu'un skill ne garantit pas

Tout ce que les deux matrices viennent de montrer tient à une seule propriété : un skill n'a que du texte. La consigne de ménage ignorée, le brouillon jamais migré vers la suite, la référence fantôme suivie à la lettre : chaque fois, la procédure demandait quelque chose que rien n'obligeait le modèle à faire. Un skill n'a ni schéma d'entrée, ni fonction d'exécution, ni garde de permission. La littérature sur les outils d'agents décrit l'anatomie d'un outil, à savoir un nom, une description lue par le modèle, un schéma d'entrée, une fonction d'exécution et une permission entre la validation et l'exécution, et un skill n'en réalise que les deux premiers éléments.

Pi a un second mécanisme pour le reste. Une **extension** est un module TypeScript posé dans `.pi/extensions/`, qui appelle `pi.registerTool({ name, ... })` : un vrai outil, avec un schéma JSON validé, une fonction que vous avez écrite, et la possibilité d'intercepter les appels d'outils pour y insérer une permission. Vous en avez déjà croisé une sans le savoir : l'outil de recherche web que la première version de la procédure demandait est une extension, chargée par la brique `extension` du scénario. Le module sur les permissions s'appuiera sur ce mécanisme pour transformer les consignes en garanties.

::: danger Un champ documenté n'est pas forcément lu
Si vous cherchez malgré tout un mécanisme de permission côté skill, on lit souvent qu'un skill déclare les outils qu'il s'autorise via un champ `allowed-tools` dans son frontmatter. La documentation livrée avec Pi 0.80.6 le décrit effectivement, dans son tableau du frontmatter :

```
| `allowed-tools` | No | Space-delimited list of pre-approved tools (experimental). |
```

Le type que le code lit est celui-ci :

```ts
export interface SkillFrontmatter {
    name?: string;
    description?: string;
    "disable-model-invocation"?: boolean;
    [key: string]: unknown;
}
```

Ce type ne contient que trois champs, et la chaîne `allowed-tools` n'apparaît nulle part dans le code compilé du paquet, alors que `disable-model-invocation` est bien lue. Le `[key: string]: unknown` accepte silencieusement tout ce que vous ajouterez, sans jamais s'en servir ni vous prévenir.

C'est le même piège que le `--thinking max` du module précédent, en plus trompeur encore, puisque la source qui vous induit en erreur est ici la documentation de l'outil lui-même. Un skill n'a aucun mécanisme de permission propre, et si vous en voulez un, il faut une extension.
:::

## Ce que ce module ne sait pas encore

Deux questions restent ouvertes et il vaut mieux les nommer clairement que de les croire réglées.

**Une bonne description déclenche-t-elle ?** Nos configurations imposent la compétence par `/skill:`, donc les matrices mesurent une procédure appliquée et jamais une procédure choisie. La question tient à la mécanique décrite plus haut, elle est mesurable avec la colonne `skill_invoque` qui existe déjà pour ça, et elle demande une configuration où la compétence est chargée par son nom sans être développée dans le prompt.

**La compétence apporte-t-elle quelque chose à demande égale ?** Il manque toujours le témoin, c'est-à-dire la même configuration sans la compétence. La seconde matrice ne l'a pas ajouté : elle compare deux versions de la procédure entre elles, pas la procédure à son absence.

::: info Exercice (en autonomie)
Ajoutez au scénario une configuration `+agents+skill_par_nom`, identique à `+agents+skill` mais dont le prompt ne contient pas le `/skill:`, la compétence restant chargée par la brique `harness`. Relancez, et lisez `skill_invoque`.

Vous mesurerez la seule chose que ce module affirme sans l'avoir établie, et vous n'aurez touché ni l'outil, ni le validateur, ni les autres configurations.
:::

## Généraliser

**Un skill est une procédure de travail, pas un outil.** Il n'a ni schéma d'entrée, ni fonction, ni permission, et le seul mécanisme dont il dispose est le texte. Ce qu'il sait faire est imposer un ordre de travail et une forme de livrable, ce qui est utile et ne se confond pas avec l'exécution d'un code que vous contrôlez.

**La description est la seule chose lue à coup sûr.** Le corps n'entre dans le contexte que si le modèle décide de l'ouvrir ou si l'utilisateur le développe avec `/skill:`. Une description qui dit ce que la procédure fait, plutôt que quand s'en servir, s'adresse à la mauvaise décision.

**Une procédure déplace le travail avant de l'améliorer.** Les deux effets établis de la première version sont des déplacements : les tests partent dans un fichier de brouillon plutôt que dans la suite du dépôt, et les brouillons restent dans l'arbre. La révision supprime ces deux déplacements, et l'effet sur la correction reste non concluant dans les deux versions. Avant de demander si une brique améliore le résultat, regardez d'abord où elle envoie le travail.

**Une consigne de nettoyage ne garantit pas le nettoyage.** L'étape finale de notre `SKILL.md` demande de retirer les fichiers créés, et onze exécutions sur vingt les laissent. La révision qui a rempli le périmètre n'a pas renforcé la consigne, elle a supprimé le besoin de ménage : une procédure qui ne crée rien n'a rien à nettoyer. Quand les fichiers intermédiaires sont réellement nécessaires, ce qui doit arriver même si le modèle n'y pense pas demande un mécanisme qui ne dépende pas de lui.

**Chaque étape intermédiaire est une marche que le modèle peut rater.** Les tests naissaient dans un brouillon avant de migrer vers la suite, et cette migration est l'étape perdue dix fois sur vingt. Écrire le livrable directement à sa place a supprimé la marche, et les deux colonnes concernées sont passées à 20/20 sur les deux modèles.

**Une procédure se révise comme du code, exécutions en main.** Le diagnostic ne vient pas des colonnes agrégées mais des exécutions lues une par une : la migration ratée, la consigne appliquée au pied de la lettre et la référence fantôme ont dicté chaque coupe, et une nouvelle matrice a vérifié la révision au lieu de la croire.

**Un champ documenté n'est pas forcément lu.** `allowed-tools` figure dans la documentation livrée avec Pi et n'apparaît nulle part dans son code. Le code est la seule source qui ne se trompe pas, et la vérification tient en un `grep`.

**Une brique de harnais se mesure contre ce qu'elle remplace, jamais contre rien.** Sur cette tâche, remplacer le ticket cadré par la procédure fait perdre trente points sur le coin et cinquante sur les tests ajoutés, ce qui ne se voit pas dans une comparaison contre la base.

## Livrable

Trois pièces.

**1. La compétence**, dans `.pi/skills/<nom>/`, avec sa description écrite par vous et un livrable dont la forme est imposée par le corps. Si vous l'avez révisée, les deux versions restent versionnées : la matrice qui les compare ne se comprend pas sans elles.

**2. Le répertoire de matrice** produit par `trysquare run`, avec la configuration à compétence lue contre celle qu'elle remplace et non contre la base.

**3. La ligne « outils » de la fiche de décision** :

| levier                           | effet mesuré | adopté ? | pourquoi |
| -------------------------------- | ------------ | -------- | -------- |
| skill (markdown)                 |              |          |          |
| description du skill             |              |          |          |
| compétence imposée par `/skill:` |              |          |          |
| forme du livrable imposée        |              |          |          |
| livrable direct ou via brouillon |              |          |          |
| extension (outil réel)           |              |          |          |

::: tip Critère de réussite
Vous savez citer un effet de votre compétence qui est établi, un effet qui ne l'est pas, et dire ce qui manque pour trancher le second.

Ce critère demande d'avoir lu une configuration contre la bonne référence. Il ne peut donc pas être satisfait de mémoire.
:::

## Les pièges

**Lire une configuration à compétence contre la base.** Elle en diffère par plusieurs choses à la fois, et l'écart publié contre `nothing` mélange tous les leviers de la pile. La référence utile est la configuration dont elle ne diffère que par la compétence.

**Confondre une compétence imposée et une compétence proposée.** Le `/skill:` du prompt développe le corps côté client, et une colonne d'invocation pleine ne dit alors rien de ce que le modèle aurait choisi.

**Soigner le corps du `SKILL.md` en négligeant la description.** Le corps n'est lu que si la description a déclenché sa lecture.

**Faire écrire les tests ailleurs que dans la suite.** Un cas de test qui vit dans un fichier de travail ne sera lancé par personne après le départ de l'agent, et la migration promise vers la suite est précisément l'étape que le modèle rate.

**Compter sur une consigne de nettoyage.** Elle n'est suivie que dans moins d'une exécution sur trois, ce qui reste dans l'arbre fait échouer le périmètre de toute la configuration, et la correction robuste n'est pas une meilleure consigne mais une procédure qui ne crée rien.

**Réviser sans remesurer.** Une révision qui répond point par point au diagnostic reste une hypothèse tant qu'une matrice ne l'a pas vérifiée. La nôtre prédisait aussi une baisse de coût sur gemma, et cette matrice-là ne peut pas la confirmer, ses reprises rendant les colonnes de coût illisibles.

**Accumuler les skills.** Chacun coûte peu tant qu'il n'est pas utilisé, mais leurs descriptions entrent toutes dans le contexte à chaque tour.

## Pour aller plus loin

- [Agent Skills](https://agentskills.io), le standard ouvert que Pi implémente, et sa page sur l'intégration dans un prompt système.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Schick et al., [Toolformer](https://arxiv.org/abs/2302.04761), sur l'idée qu'un modèle apprenne quand et comment appeler un outil.
- Yao et al., [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629), la boucle qui alterne raisonnement et action.
- La [documentation des extensions de Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), pour la brique qui donne des garanties là où le skill donne des suggestions.
