# Les compétences, mesurées

::: tip Objectifs de ce module
- Mesurer ce qu'un skill change à la correction d'un bug et aux tests que l'agent écrit
- Juger les tests de l'agent sur d'autres corrections que la sienne
- Repérer une campagne où le skill fait échouer le modèle avant même qu'il ait travaillé
- Distinguer ce qu'apporte la procédure de ce qu'apporte le catalogue
:::

Le [module 3.1](./act3-contexte) s'est terminé sur une question. Donner la sonde à l'agent est le seul levier qui aide les trois modèles à traiter le coin de la brique et le tunneling, mais sur un vrai ticket personne ne vous fournira la sonde. Une procédure de travail écrite une fois peut-elle obtenir le même résultat ?

Au [module 2.2](./act2-skill), vous avez écrit cette procédure sous deux formes : `playtester`, qui porte un catalogue de bugs de casse-brique écrit à la main, et `dynamic-playtester`, qui construit son catalogue par une recherche web. Une ou deux sessions vous ont montré que les tests produits couvraient plus de cas. Ce module répète chaque configuration vingt fois sur trois modèles pour savoir si ça se reproduit, et ce que ça change à la correction.

## L'expérience

### La tâche

La tâche est celle du module 3.1 : l'issue #1 de NÉON, la balle qui traverse les briques. La demande est la demande négligée :

```
The ball goes through the bricks instead of bouncing. Fix that.
```

Toutes les configurations tournent en `blind` : ni `ISSUES.md` ni historique git. Le module 3.1 l'a montré, `ISSUES.md` décrit justement les cas difficiles (le coin, la jonction, le tunneling). Un agent qui pourrait le lire serait noté sur ce qu'il a recopié, pas sur ce que le skill lui a fait chercher.

### Les trois configurations

| configuration        | ce que reçoit l'agent                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| `nothing`            | la demande négligée seule                                                             |
| `playtester`         | `/skill:playtester` suivi de la demande négligée                                      |
| `dynamic_playtester` | `/skill:dynamic-playtester` suivi de la demande négligée                              |

Le skill est appelé par son nom. Pi colle alors le corps de `SKILL.md` dans le premier message, et il n'y a pas de décision du modèle à mesurer : nous mesurons ce que fait la procédure une fois chargée, et non la qualité de sa description.

Les deux skills sont ceux du module 2.2, traduits en anglais, avec une différence. La version du cours s'arrête aux tests rouges (« Tu ne corriges pas le jeu »). Ici, une dernière étape demande de corriger le jeu jusqu'à ce que toute la suite passe, en modifiant le code et non les tests, sauf un montage jugé faux en relisant l'invariant, qu'il faut alors signaler. Sans cette étape, nous ne pourrions pas comparer la correction à celle du module 3.1.

```toml
[presets.playtester]
prompt = "../materials/issue1-simple-prompt-with-playtester.md"
harness = ["skills-playtester"]

[presets.dynamic_playtester]
prompt = "../materials/issue1-simple-prompt-with-dynamic-playtester.md"
harness = ["skills-dynamic-playtester", "web-access"]

[axes]
lever = ["nothing", "playtester", "dynamic_playtester"]
```

::: warning Remarques
1. Le catalogue de `playtester` a été écrit par nous, qui connaissons `ISSUES.md`. Il contient une entrée pour le coin, la jonction et le tunneling, avec un invariant précis. Ce skill n'est donc pas neutre : c'est une connaissance du genre écrite par quelqu'un qui savait ce qu'il fallait chercher.
2. Le catalogue de `dynamic-playtester` était déjà présent dans `references/bugs-arcade.md` au lancement des campagnes : 53 entrées tirées du web, avec une section `breakout`. Aucune exécution n'a relancé `catalogue.sh`. Cette configuration mesure donc la procédure générique avec un catalogue issu d'une recherche, et non la recherche elle-même.
3. L'introduction du skill mesuré dit encore « You do not fix the game », alors que l'étape 5 demande de corriger. Toutes les exécutions qui ont livré quelque chose ont modifié `game/neon.js` : les modèles ont suivi l'étape numérotée.
:::

### Ce qui compte comme réussite

Deux familles de métriques sont lues, toujours sans LLM-as-a-judge.

La correction est notée par la sonde du module 3.1, déposée à la fin dans une copie de l'arbre de l'agent : `bounce_bricks` (le rebond sur chaque face), `bounce_corners`, `bounce_tunneling`.

Les tests de l'agent sont jugés à part. Ses fichiers de test sont lancés contre plusieurs arbres de référence : l'étalon, une correction complète, et cinq corrections à qui il manque chacune une partie (l'axe, le coin, la sortie de la brique, la jonction, le tunneling).

| métrique                 | ce qu'elle dit                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `tests_sound`            | aucun test de l'agent n'échoue sur la correction complète                             |
| **`detects_axis`**       | **le critère** : un test sain échoue sur une correction qui inverse `vy` sur toutes les faces |
| `detects_corner`         | un test sain échoue sur la correction qui oublie le coin                              |
| `detects_neighbors`      | un test sain échoue sur la correction qui rebondit deux fois à la jonction           |
| `detects_tunneling`      | un test sain échoue sur la correction qui laisse passer une balle rapide             |

Cette façon de juger est exigeante, puisqu'un test qui vérifie la correction écrite par l'agent au lieu du comportement attendu échoue sur la correction de référence et ne détecte plus rien. C'est le cas, par exemple, d'un test qui exige une position au pixel près ou qui importe une fonction que l'agent vient de créer.

### Les modèles

Ce sont les trois modèles du module 3.1, cette fois tous servis par GRICAD :

| modèle                | raisonnement | timeout |
| --------------------- | ------------ | ------- |
| `gemma-4-31b`         | `high`       | 60 min  |
| `qwen-3.8-27b`        | `medium`     | 60 min  |
| `DeepSeek-V4.1-Flash` | `medium`     | 30 min  |

Les campagnes ont été lancées le 17 octobre 2026, contre le tag `etalon-v1`, avec un plafond de sortie de 32 768 tokens par tour. Chaque configuration est répétée vingt fois, soit 60 exécutions par modèle. Le timeout est plus long qu'au module 3.1 parce qu'un skill fait travailler l'agent plus longtemps. Les résultats bruts sont dans les répertoires `resultats/issue1-skill_*` de l'[archive Zenodo de l'acte](https://doi.org/10.5281/zenodo.23452689).

::: info Exercice (en salle, puis en autonomie)
Placez-vous dans [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), ouvrez `scenarios/issue1-skill.toml` et adaptez la section `[agent]` à votre fournisseur. Lancez la matrice à trois répétitions :

```bash
uv run trysquare run scenarios/issue1-skill.toml --output results --repetitions 3
```

Cela fait 9 exécutions, plus longues que celles du module 3.1. Pendant qu'elles tournent, ouvrez le `diff.patch` d'une exécution `playtester` et lisez les tests ajoutés : retrouvez-vous une entrée du catalogue par `describe` ?

**En autonomie**, supprimez `references/bugs-arcade.md` du skill `dynamic-playtester` et relancez la seule configuration `dynamic_playtester` (`--only dynamic_playtester`) : le catalogue est alors construit dans chaque exécution, et vous mesurez la recherche en plus de la procédure.
:::

## Peut-on se fier aux campagnes ?

Comme au module 3.1, nous vérifions les exécutions avant de lire un score.

|                                                          | gemma | qwen  | DeepSeek |
| -------------------------------------------------------- | ----- | ----- | -------- |
| exécutions sans aucun fichier modifié, sans skill        | 0/20  | 2/20  | 0/20     |
| même chose, `playtester`                                 | 0/20  | 11/20 | 0/20     |
| même chose, `dynamic_playtester`                         | 0/20  | 12/20 | 0/20     |
| reprises côté fournisseur                                | 4     | 0     | 0        |
| tests de l'agent impossibles à lancer sur les références | 13    | 14    | 16       |

DeepSeek est propre : aucune reprise, aucun timeout, toutes les exécutions livrent.

gemma est exploitable. Les 4 reprises tombent toutes dans `playtester`, si bien que les colonnes de coût de cette configuration ne sont pas lisibles.

qwen ne livre rien dans plus de la moitié des exécutions avec skill, et ce n'est pas un incident du fournisseur. Ces 23 exécutions s'arrêtent toutes de la même façon : qwen lit le skill et quelques fichiers du dépôt, puis, au moment d'écrire, son raisonnement remplit les 32 768 tokens du tour (environ 100 000 caractères) sans émettre un seul appel d'outil. Pi reçoit une réponse coupée (`stopReason: length`) et la session s'arrête. Les sessions laissent penser que qwen essaie de concevoir tous les tests dans son raisonnement avant d'en écrire un. Sur ce modèle et avec ce plafond, le skill fait donc échouer la tâche une fois sur deux, ce qui fait partie du résultat. Les chiffres de qwen qui suivent restent calculés sur vingt, mais gardez en tête qu'avec `playtester` ses 9 exécutions livrées corrigent toutes le coin.

La dernière ligne demande une explication. Quand les tests de l'agent importent une fonction que les arbres de référence n'exportent pas (`bounceOffBrick`, `handleBrickCollisions`…), ils ne se lancent pas, et la métrique n'est pas jugée. Cela arrive surtout sans skill, où l'agent corrige d'abord puis teste la fonction qu'il vient d'écrire (16 exécutions sur 20 chez DeepSeek), et chez gemma avec `playtester` (8 sur 20).

::: tip Notre convention de calcul
Comme au module 3.1, tous les chiffres sont donnés sur les vingt exécutions de chaque configuration. Une exécution qui n'a rien livré, ou dont les tests ne se lancent pas sur les références, compte comme un échec. Un test qui ne tourne que sur la correction de l'agent ne détecte rien sur une autre. La synthèse de trysquare retire ces exécutions du dénominateur : `detects_axis` y vaut 5/12 pour gemma avec `playtester`, contre 5/20 ici.
:::

## Les résultats

### Configuration par configuration

La grille donne, pour la métrique choisie, le nombre d'exécutions réussies sur vingt, avec une colonne par modèle. Les boutons du haut séparent la correction, notée par la sonde, des tests de l'agent, jugés sur les arbres de référence. Pour la correction, deux lignes en retrait reprennent les configurations du module 3.1 les plus proches de `nothing` : demande négligée, `blind`, raisonnement medium, sans puis avec la sonde.

```chart
issue1-skill-matrix
```

Les lignes du module 3.1 ne sont pas une référence stricte, puisque gemma y était servi par ILaaS et que le raisonnement de gemma et de qwen n'était pas réglé de la même façon. Sur le coin et le tunneling, `nothing` retrouve pourtant le 0/20 du module 3.1 chez les trois modèles.

::: details Les mêmes chiffres en tableau
La correction : chaque case donne, sur vingt exécutions, `bounce_bricks / bounce_corners / bounce_tunneling`.

| configuration          | gemma          | qwen           | DeepSeek       |
| ---------------------- | -------------- | -------------- | -------------- |
| `nothing`              | 14 / 0 / 0     | 17 / 0 / 0     | 20 / 0 / 0     |
| `playtester`           | 20 / 20 / 17   | 9 / 9 / 8      | 20 / 20 / 19   |
| `dynamic_playtester`   | 16 / 0 / 12    | 5 / 4 / 1      | 20 / 12 / 17   |
| *3.1, sans la sonde*   | *19 / 0 / 0*   | *19 / 0 / 0*   | *19 / 0 / 1*   |
| *3.1, avec la sonde*   | *19 / 17 / 9*  | *20 / 20 / 17* | *20 / 20 / 20* |

Les tests : chaque case donne, sur vingt exécutions, `detects_axis / detects_corner / detects_neighbors / detects_tunneling`, puis le nombre d'exécutions qui ont ajouté des tests tous sains.

| configuration        | gemma                  | qwen                   | DeepSeek                    |
| -------------------- | ---------------------- | ---------------------- | --------------------------- |
| `nothing`            | 4 / 0 / 0 / 0, sains 3 | 0 / 0 / 0 / 0, sains 0 | 0 / 0 / 0 / 0, sains 0      |
| `playtester`         | 5 / 5 / 1 / 8, sains 1 | 9 / 9 / 7 / 7, sains 6 | 20 / 20 / 18 / 18, sains 16 |
| `dynamic_playtester` | 8 / 1 / 1 / 4, sains 4 | 7 / 4 / 0 / 1, sains 4 | 20 / 10 / 1 / 17, sains 5   |
:::

### L'effet de chaque skill

Chaque panneau compare deux configurations sur leurs vingt exécutions : chaque skill contre la demande seule, puis les deux skills entre eux, qui ne diffèrent que par leur catalogue. Comme au module 3.1, chaque symbole donne l'écart en points de pourcentage et son trait l'intervalle à 95 % obtenu par rééchantillonnage. Un symbole plein a un intervalle qui exclut zéro, un symbole creux non (sans correction pour les comparaisons multiples). Avec vingt exécutions de chaque côté, les intervalles sont plus larges qu'au module 3.1, où chaque levier se lisait sur 160 contre 160.

```chart
issue1-skill-effects
```

::: details Les mêmes chiffres en tableau
L'écart est suivi de son intervalle à 95 %. `*` signale un intervalle qui exclut zéro.

| comparaison | métrique | gemma | qwen | DeepSeek |
| --- | --- | --- | --- | --- |
| `playtester` contre `nothing` | `bounce_corners` | +100 \* [+100, +100] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `bounce_tunneling` | +85 \* [+70, +100] | +40 \* [+20, +60] | +95 \* [+85, +100] |
|  | `detects_axis` | +5 [-20, +30] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `detects_corner` | +25 \* [+5, +45] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `detects_neighbors` | +5 [0, +15] | +35 \* [+15, +55] | +90 \* [+75, +100] |
| `dynamic_playtester` contre `nothing` | `bounce_corners` | 0 [0, 0] | +20 \* [+5, +40] | +60 \* [+40, +80] |
|  | `bounce_tunneling` | +60 \* [+40, +80] | +5 [0, +15] | +85 \* [+70, +100] |
|  | `detects_axis` | +20 [-10, +45] | +35 \* [+15, +55] | +100 \* [+100, +100] |
|  | `detects_corner` | +5 [0, +15] | +20 \* [+5, +40] | +50 \* [+30, +70] |
|  | `detects_neighbors` | +5 [0, +15] | 0 [0, 0] | +5 [0, +15] |
| `dynamic_playtester` contre `playtester` | `bounce_corners` | -100 \* [-100, -100] | -25 [-50, +5] | -40 \* [-60, -20] |
|  | `bounce_tunneling` | -25 [-50, 0] | -35 \* [-60, -10] | -10 [-30, +5] |
|  | `detects_axis` | +15 [-15, +45] | -10 [-40, +20] | 0 [0, 0] |
|  | `detects_corner` | -20 [-40, 0] | -25 [-50, +5] | -50 \* [-70, -30] |
|  | `detects_neighbors` | 0 [-15, +15] | -35 \* [-55, -15] | -85 \* [-100, -65] |
:::

Le critère `detects_axis` passe de 0 à 20 sur 20 chez DeepSeek avec l'un ou l'autre skill, et de 0 à 9 chez qwen avec `playtester`. Chez gemma, l'écart sur le critère n'est établi pour aucun des deux skills, alors que la correction du coin gagne 100 points avec `playtester`.

### Ce que nous en retenons

**La procédure fait écrire les tests avant la correction, chez tous les modèles.** Sans skill, aucune exécution n'écrit un test avant de modifier `neon.js`. Avec l'un ou l'autre skill, toutes les exécutions livrées le font, et presque toutes lancent les tests entre les deux pour les voir échouer. L'agent ajoute aussi bien plus de cas : 10 en médiane avec `playtester`, contre 2 à 4 sans skill.

**`playtester` obtient le coin sans donner la sonde.** gemma et DeepSeek réussissent le coin dans 20 exécutions sur 20, et le tunneling dans 17 et 19. gemma fait même mieux qu'avec la sonde du module 3.1 sur le tunneling (17 contre 9). qwen réussit le coin dans ses 9 exécutions livrées. C'est la réponse à la question du module 3.1, avec une réserve : ce catalogue a été écrit par des gens qui avaient lu `ISSUES.md`.

**Le catalogue compte autant que la procédure.** `dynamic_playtester` suit les mêmes étapes, mais son catalogue tiré du web décrit le coin de façon vague : « the chosen reflection side must be the face the ball is actually penetrating ». Celui de `playtester` donne une condition et une valeur : « when the ball penetrates as much on both axes, both components flip ». Avec l'invariant vague, gemma ne corrige plus jamais le coin (0/20) et DeepSeek seulement 12 fois sur 20. La jonction entre deux briques n'a pas d'entrée claire dans le catalogue du web, et `detects_neighbors` tombe à 1 sur 20 chez DeepSeek, contre 18 avec `playtester`. Le tunneling, lui, est bien décrit dans les deux catalogues, et l'écart est faible chez DeepSeek (17 contre 19).

**Un test qui passe sur la correction de l'agent peut ne rien détecter sur une autre.** gemma corrige le coin dans 20 exécutions sur 20 avec `playtester`, mais ses tests ne détectent le défaut du coin que dans 5, et un seul de ses vingt jeux de tests passe sur la correction de référence. Les assertions n'en sont presque jamais la cause, puisque gemma n'en supprime qu'une, dans une seule exécution. Ses tests suivent le déplacement de son code : pour corriger, gemma sort la collision de `frame()` et la met dans `step()` ou dans une nouvelle fonction comme `handleBrickCollisions`, puis réécrit ses tests pour appeler ce nouvel emplacement, ce qu'il fait dans 15 exécutions sur 20. La correction de référence garde la collision dans `frame()`, si bien que les tests qui importent la fonction de gemma ne s'y lancent pas et que ceux qui n'appellent plus que `step()` y échouent. DeepSeek, avec le même skill, écrit des tests sains dans 16 exécutions sur 20.

**Un skill coûte du temps, et peut faire échouer un modèle.** DeepSeek, dont la campagne est la seule aux colonnes de coût lisibles, passe de 104 secondes en médiane sans skill à 470 avec `playtester`, et consomme environ sept fois plus de tokens en entrée. Chez qwen, le skill fait sortir le raisonnement de son plafond une fois sur deux, et la tâche échoue avant d'avoir commencé.

## Comment travaillent les modèles ?

::: info Méthode
Comme au module 3.1, chaque session est réduite à une suite d'actions par des expressions régulières : ce sont des tendances, pas des mesures.
:::

### DeepSeek suit la procédure pas à pas

DeepSeek lit le catalogue, garde les entrées de la collision balle-brique, écrit un test par entrée, lance les tests un par un pour vérifier qu'ils échouent sur l'assertion prévue (17 exécutions sur 20 avec `playtester`), puis corrige. Avec un skill, ses tests n'importent que des fonctions que le jeu exportait déjà, et ils se lancent donc sur toutes les corrections de référence, alors que sans skill 16 exécutions sur 20 testent une fonction qu'il vient de créer. Il cherche aussi `ISSUES.md` dans 14 à 17 exécutions sur 20, sans le trouver puisqu'il a été retiré.

### gemma suit la procédure, mais teste sa propre correction

gemma respecte l'ordre des étapes : tests, exécution en rouge, correction. Avec `playtester`, il fait 45 tours en médiane et 24 modifications de fichiers, dont 5 échouent parce que le texte à remplacer ne correspond pas au fichier, là où DeepSeek en fait 10 sans aucun échec. Dans 15 exécutions sur 20, ses tests rouges appellent `frame()`, la fonction du symptôme, puis gemma déplace la collision hors de `frame()` pour corriger, dans `step()` (9 exécutions) ou dans une fonction qu'il crée (8 exécutions, certaines faisant les deux), et remplace dans ses tests `frame(ctx, state)` par `step(state, 1 / 60)` ou `handleBrickCollisions(state)`. Le skill ne permet de toucher aux tests pendant la correction que pour réparer un montage faux, et gemma se sert de cette exception pour adapter ses tests à son code. Ses tests finissent donc par vérifier l'organisation de sa correction au lieu du comportement attendu.

### qwen planifie tout avant d'agir

Quand qwen livre avec `playtester`, il corrige le coin à chaque fois (9 sur 9) et ses tests sont sains dans 6 exécutions sur 9. Mais un skill long dans le premier message le pousse à concevoir tous les tests d'un coup dans son raisonnement. Une fois sur deux, ce raisonnement dépasse 32 768 tokens et la session s'arrête sans une ligne écrite. Un skill qui fonctionne sur un modèle peut ainsi en bloquer un autre pour une raison qui n'a rien à voir avec son contenu.

## Généraliser

Une procédure écrite une fois change la façon de travailler de l'agent de manière reproductible. Les trois modèles écrivent leurs tests avant de corriger dès qu'on la leur donne, et aucun ne le fait sans elle.

La procédure n'apporte pas la connaissance du domaine : `playtester` et `dynamic-playtester` ne diffèrent que par leur catalogue, et c'est lui qui décide du coin et de la jonction. Un invariant utile nomme une condition et une valeur que l'agent peut transformer en test exact. Un invariant vague donne un test vague, et l'agent corrige ce que ce test vérifie.

Pour savoir ce que détecte un test écrit par l'agent, il faut le lancer sur une autre correction que la sienne. Un test qui échoue avant la correction puis passe après donne l'impression de vérifier le comportement attendu, alors que l'agent a pu le modifier en cours de route pour qu'il suive son code. Chez gemma, les assertions restent presque intactes, mais dans 15 exécutions sur 20 les tests n'appellent plus `frame()` une fois la collision déplacée ailleurs : ils passent sur sa correction, et un seul de ses vingt jeux de tests passe sur la correction complète du validateur. Sur un vrai projet, on n'a pas toujours une seconde correction sous la main, et on compare alors les tests rouges du début aux tests verts de la fin, pour vérifier qu'ils appellent toujours le code du symptôme et qu'ils vérifient encore l'invariant de départ.

Mesurez un skill sur chaque modèle visé. Le même fichier donne 20 coins sur 20 chez DeepSeek et fait échouer qwen une fois sur deux, pour une raison (la longueur du raisonnement) qu'aucune relecture du skill n'aurait fait voir.

Enfin, vérifiez ce que la configuration mesure vraiment. Ici, `dynamic_playtester` est parti d'un catalogue déjà écrit, si bien qu'il mesure la procédure et ce catalogue et non la recherche web. Dans la table des scores, seule la colonne `catalogue_built` à 0/20 le laissait deviner, et il a fallu lire les sessions pour le confirmer.

::: tip Ce que vous avez appris
Vous savez dire, à partir de la matrice, ce que la procédure apporte (les tests écrits avant la correction, chez tous les modèles) et ce qui dépend du catalogue (le coin et la jonction). Vous savez aussi pourquoi un test vert sur la correction de l'agent ne suffit pas : il faut le lancer sur une autre correction pour savoir ce qu'il détecte.
:::

## Pour aller plus loin

- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), qui contient le scénario `issue1-skill`, son hypothèse, les deux skills traduits et le validateur qui juge les tests sur les arbres de référence.
- Le [module 2.2](./act2-skill), pour la construction des deux skills mesurés ici.
- Anthropic, [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices), qui recommande de tester un skill avec chaque modèle visé.
