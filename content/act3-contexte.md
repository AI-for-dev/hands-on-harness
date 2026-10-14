# Les leviers du contexte, mesurés

::: tip Objectifs de ce module
- Savoir quels leviers du contexte la matrice `issue1-context` fait varier
- Lire les résultats de trois modèles sur la même tâche, à vingt répétitions par configuration
- Vérifier l'état d'une campagne avant d'en citer les chiffres
- Distinguer ce qui dépend du levier de ce qui dépend du modèle
:::

Au [module 2.1](./act2-contexte), vous avez manipulé à la main les leviers qui remplissent la fenêtre de contexte : le prompt, le raisonnement, les fichiers que l'agent trouve dans le dépôt. Une ou deux exécutions suffisaient pour voir ce qu'un levier change dans la session, mais pas pour savoir si ce changement se reproduit. Le [module 3.0](./act3-trysquare) vous a ensuite présenté [trysquare](https://github.com/AI-for-dev/trysquare), qui répète chaque configuration et dit si un écart tient au hasard du tirage.

Ce module met les deux ensemble. Nous reprenons l'issue #1 de NÉON, nous croisons quatre leviers et nous faisons tourner la matrice complète sur trois modèles. La question est double : quels leviers changent réellement le résultat, et est-ce que la réponse est la même d'un modèle à l'autre ?

## L'expérience

### La tâche

L'issue #1 est celle que vous connaissez : la balle traverse les briques au lieu de rebondir.

Le commentaire `BUG (#1)` de `game/neon.js` décrit le correctif de base : faire rebondir la balle selon la face touchée, puis la sortir du rectangle de la brique. `ISSUES.md` reprend ce correctif et ajoute tout le reste : le coin de la brique, la jonction entre deux briques voisines, le tunneling d'une balle rapide, et la demande d'écrire d'abord les tests rouges. Un agent qui n'a pas lu `ISSUES.md` n'a donc aucune raison de traiter les coins, et cette différence explique la plupart des résultats qui suivent.

### Ce qui compte comme réussite

Chaque exécution est notée sans LLM-as-a-judge. Une sonde, `probe.test.js`, est déposée à la fin dans une copie de l'arbre de l'agent : elle place une balle contre une brique, appelle `frame()` et regarde quelle composante de la vitesse s'inverse. Les autres métriques sont lues dans la session ou dans le diff.

| métrique               | ce qu'elle dit                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `delivered`            | l'agent a modifié au moins un fichier                                                  |
| `suite_run`            | il a lancé `npm test` lui-même                                                         |
| `tests_added`          | la suite compte plus de cas qu'au départ                                               |
| `probe_intact`         | quand on lui a donné la sonde, il ne l'a pas modifiée                                  |
| **`bounce_bricks`**    | **le critère** : sur chacune des quatre faces, l'axe touché s'inverse et l'autre non   |
| `bounce_corners`       | dans le coin, les deux composantes s'inversent                                         |
| `bounce_exit`          | après le rebond, la balle est ressortie du rectangle de la brique                      |
| `bounce_neighbors`     | à la jonction de deux briques, le rebond ne s'applique qu'une fois                     |
| `bounce_tunneling`     | une balle rapide ne traverse plus la brique sans la toucher                            |

Dans la suite, nous nous concentrons sur quatre colonnes : le critère, le coin, le tunneling et les tests ajoutés. `bounce_exit` et `bounce_neighbors` suivent de près le critère et n'apportent pas grand-chose de plus ici.

### Les quatre leviers

Nous avons gardé quatre leviers, chacun avec deux valeurs :

| levier      | sans                                         | avec                                                                     |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| le ticket   | `nothing` : la demande négligée              | `well_crafted` : un ticket qui renvoie à l'issue et fixe le périmètre    |
| `blind`     | `no-blind` : le dépôt tel quel               | `blind` : ni historique git ni `ISSUES.md`                               |
| raisonnement | `off`                                       | `thinking_medium`                                                        |
| `add_tests` | `no-add_tests`                               | `add_tests` : la sonde est déposée dans `game/probe.test.js` dès le départ |

La demande négligée tient en une ligne :

```
The ball goes through the bricks instead of bouncing. Fix that.
```

Le ticket bien rédigé ne recopie pas `ISSUES.md`. Il dit où se trouve la description, demande de penser aux différentes interactions possibles, et fixe le périmètre et le critère d'arrêt :

```
The ball goes through the bricks instead of bouncing. The problem and the
expected behaviour are described in `ISSUE.md`, under issue #1. Read the code
carefully and think about the different interactions the ball can have with
the bricks. The behaviour must be worthy of the best arcade games. Only modify
`game/neon.js` and `game/neon.test.js`. You are done when `npm test` passes and
the already exported functions have kept their name and their signature.
```

`blind` retire l'historique git et supprime `ISSUES.md` avant que l'agent ne démarre. Il ne reste alors que le commentaire du code. `add_tests` donne à l'agent le fichier même qui le note, ce qui revient à lui fournir les tests qu'on aimerait voir passer.

Un fichier `AGENTS.md` de quatre lignes (un ticket à la fois, ne pas renommer les exports, zéro dépendance, lancer les tests avec `npm test`) est présent dans toutes les configurations. Ce n'est donc pas un levier de cette matrice.

Les quatre leviers sont croisés, ce qui donne 2 × 2 × 2 × 2 = 16 configurations. Chacune est répétée vingt fois, soit 320 exécutions par modèle. Dans le scénario, ce plan tient en quelques lignes :

```toml
[presets]
well_crafted = { prompt = "../materials/issue1-well-crafted-prompt.md" }
add_tests = { harness = ["provided-probe"] }
blind = { history = false, setup = "../materials/remove-issues-md.sh" }
thinking_medium = { thinking = "medium" }

[axes]
lever = ["nothing", "well_crafted"]
blind = ["no-blind", "blind"]
thinking = ["off", "thinking_medium"]
add_tests = ["no-add_tests", "add_tests"]
```

::: warning Remarques
Nous voulions éclaircir plusieurs points qui pourraient apparaître comme des erreurs mais qui sont voulus.

1. Le ticket bien rédigé renvoie à `ISSUE.md`, alors que le fichier s'appelle `ISSUES.md`. C'est voulu : nous voulons voir si le modèle fait une recherche ou s'arrête là et n'utilise pas le fichier.
2. En `blind`, il pointe vers un fichier qui n'existe plus, ce qui permet de voir à quel point le modèle est curieux :
   - aller voir les répertoires voisins
   - essayer de récupérer l'historique git qui a été réinitialisé
   - ...
    et à quel moment il laisse tomber.
3. `add_tests` donne à l'agent le fichier qui le note. L'idée est de voir comment évoluent les résultats si nous avons déjà les tests. Vous pouvez voir ça comme un développement [TDD](https://en.wikipedia.org/wiki/Test-driven_development).
4. `thinking_medium` ne correspond pas au même réglage d'un modèle à l'autre (voir le tableau des modèles).
:::

### Les modèles

Les trois modèles sont servis par deux fournisseurs, ILaaS et GRICAD :

| modèle                | fournisseur | ce que veut dire `thinking_medium`             | plafond de sortie |
| --------------------- | ----------- | ---------------------------------------------- | ----------------- |
| `gemma-4-31b`         | ILaaS       | `reasoning_effort = on`                        | 16 384 tokens     |
| `qwen-3.8-27b`        | ILaaS/GRICAD      | `reasoning_effort = medium`                    | 32 768 tokens     |
| `DeepSeek-V4.1-Flash` | GRICAD      | `reasoning_effort = medium`                    | 32 768 tokens     |

Les trois campagnes ont été lancées les 13 et 14 octobre 2026, contre le tag `etalon-v1` de NÉON, avec un timeout de 30 minutes par exécution. Le modèle et le fournisseur changent ensemble d'une colonne à l'autre : un écart entre deux modèles peut venir de l'un comme de l'autre.

::: info Exercice (en salle, puis en autonomie)
Placez-vous dans le dépôt [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) installé au [module 3.0](./act3-trysquare). Ouvrez `scenarios/issue1-context.toml`, adaptez la section `[agent]` au fournisseur que vous utilisez, puis lancez la matrice à trois répétitions :

```bash
uv run trysquare run scenarios/issue1-context.toml --output results --repetitions 3
```

Cela fait 48 exécutions, que vous pouvez laisser tourner pendant la suite du module. Les sous-commandes suivantes n'appellent pas le modèle et servent à analyser les résultats :

```bash
# refabriquer les tables
uv run trysquare render scenarios/issue1-context.toml --output results --repetitions 3
# renoter sans rejouer
uv run trysquare replay results/issue1-context_... --scenario scenarios/issue1-context.toml --rescore
# joindre deux matrices
uv run trysquare compare results/... results/...
```

**En autonomie**, changez de modèle dans `[agent]` et comparez votre matrice aux nôtres.
:::

## Peut-on se fier aux campagnes ?

Avant de regarder un seul score, il faut vérifier que les exécutions se sont déroulées normalement. Le [module 3.0](./act3-trysquare) l'a montré : un incident chez le fournisseur ou un défaut de la validation se lit facilement comme un comportement de l'agent.

|                                         | gemma   | qwen    | DeepSeek |
| --------------------------------------- | ------- | ------- | -------- |
| exécutions sans aucun fichier modifié    | 3       | 18      | 1        |
| exécutions arrêtées par le timeout      | 25      | 181     | 1        |
| reprises côté fournisseur               | 974     | 9       | 0        |
| sonde laissée intacte (cellules `add_tests`) | 160/160 | 158/160 | 160/160 |
| débit médian en sortie                  | 21 tokens/s | 8 tokens/s | 49 tokens/s |

DeepSeek est propre : aucune reprise, une seule exécution coupée par le timeout.

gemma est exploitable, mais ILaaS a été instable pendant la mesure : plus de 1 200 erreurs `Stream ended without finish_reason`, absorbées par 974 reprises. Une reprise rejoue le tour avec tout le contexte accumulé, si bien que les colonnes de coût de gemma ne sont pas lisibles. Les 25 timeouts sont notés sur un arbre partiel et se concentrent sur les cellules avec raisonnement ou ticket bien rédigé, ce qui les pénalise un peu.

qwen demande le plus de prudence. Une première campagne chez ILaaS était en partie inexploitable : sans plafond de sortie déclaré, le raisonnement remplissait les 16 384 tokens par défaut en un seul tour, et 23 exécutions partaient en boucle (`-\n-\n-\n…`) dès les premiers tours. Nous l'avons relancée chez GRICAD avec un plafond à 32 768 tokens, et ces deux problèmes ont disparu. Le fournisseur est en revanche lent, et plus de la moitié des exécutions atteignent le timeout de 30 minutes, parfois après seulement trois tours parce qu'un appel ne revient jamais. Ces exécutions sont notées sur l'état de l'arbre au moment de la coupure. Les chiffres de qwen disent donc ce qu'il obtient en 30 minutes chez ce fournisseur.

::: tip Notre convention de calcul
Tous les chiffres de cette page sont donnés sur les vingt exécutions de chaque configuration : une exécution qui n'a rien livré compte comme un échec. La synthèse de trysquare retire ces exécutions du dénominateur, ce qui masque les pannes d'un modèle comme qwen.
:::

## Les résultats

### Configuration par configuration

Chaque grille regroupe les seize configurations d'un modèle. Les lignes croisent le ticket et la présence d'`ISSUES.md`, les colonnes croisent le raisonnement et la sonde, et chaque case compte les exécutions réussies sur vingt. Le choix des couleurs permet de voir rapidement ce qui réussit et ce qui échoue : plus une case ressort sur le fond, plus le modèle a réussi. C'est sur le coin de la brique que les lignes et les colonnes qui changent d'un bloc sont les plus nettes.

```chart
issue1-matrix
```

::: details Les mêmes chiffres en tableau
Chaque case donne, sur vingt exécutions : `bounce_bricks / bounce_corners / bounce_tunneling / tests_added`.

| ticket         | `blind` | raisonnement | sonde | gemma         | qwen          | DeepSeek      |
| -------------- | ------- | ------------ | ----- | ------------- | ------------- | ------------- |
| `nothing`      | non     | off          | non   | 8 / 0 / 0 / 0     | 12 / 12 / 1 / 16  | 20 / 19 / 19 / 19 |
| `nothing`      | non     | off          | oui   | 16 / 12 / 9 / 0   | 16 / 16 / 7 / 0   | 20 / 20 / 20 / 2  |
| `nothing`      | non     | medium       | non   | 18 / 0 / 1 / 12   | 14 / 4 / 5 / 14   | 20 / 20 / 20 / 20 |
| `nothing`      | non     | medium       | oui   | 20 / 19 / 10 / 7  | 18 / 18 / 18 / 1  | 20 / 20 / 20 / 0  |
| `nothing`      | oui     | off          | non   | 13 / 0 / 0 / 0    | 13 / 0 / 0 / 8    | 19 / 0 / 0 / 7    |
| `nothing`      | oui     | off          | oui   | 15 / 10 / 6 / 0   | 10 / 10 / 7 / 0   | 20 / 20 / 20 / 0  |
| `nothing`      | oui     | medium       | non   | 19 / 0 / 0 / 11   | 19 / 0 / 0 / 10   | 19 / 0 / 1 / 10   |
| `nothing`      | oui     | medium       | oui   | 19 / 17 / 9 / 10  | 20 / 20 / 17 / 5  | 20 / 20 / 20 / 0  |
| `well_crafted` | non     | off          | non   | 17 / 16 / 3 / 16  | 8 / 9 / 7 / 15    | 20 / 20 / 20 / 20 |
| `well_crafted` | non     | off          | oui   | 18 / 17 / 16 / 0  | 16 / 16 / 8 / 10  | 20 / 20 / 20 / 20 |
| `well_crafted` | non     | medium       | non   | 16 / 17 / 13 / 20 | 8 / 8 / 8 / 12    | 19 / 19 / 19 / 19 |
| `well_crafted` | non     | medium       | oui   | 18 / 17 / 18 / 16 | 15 / 15 / 14 / 14 | 20 / 20 / 20 / 20 |
| `well_crafted` | oui     | off          | non   | 15 / 0 / 0 / 13   | 12 / 1 / 4 / 18   | 19 / 5 / 18 / 20  |
| `well_crafted` | oui     | off          | oui   | 18 / 16 / 11 / 0  | 13 / 13 / 6 / 4   | 20 / 20 / 20 / 17 |
| `well_crafted` | oui     | medium       | non   | 18 / 0 / 0 / 20   | 14 / 1 / 2 / 18   | 19 / 4 / 12 / 20  |
| `well_crafted` | oui     | medium       | oui   | 19 / 19 / 19 / 9  | 18 / 16 / 16 / 16 | 20 / 20 / 20 / 9  |
:::

### L'effet de chaque levier

Comme les leviers sont croisés, on mesure l'effet moyen de chacun en comparant les 160 exécutions qui l'ont aux 160 qui ne l'ont pas, les trois autres leviers étant répartis de la même façon des deux côtés. Chaque symbole donne l'écart en points de pourcentage, et son trait l'intervalle à 95 % obtenu par rééchantillonnage. Un symbole plein a un intervalle qui exclut zéro, un symbole creux non (sans correction pour les comparaisons multiples). Les quatre panneaux partagent la même échelle, si bien que la longueur d'un écart se compare d'un levier à l'autre.

```chart
issue1-effects
```

::: details Les mêmes chiffres en tableau
L'écart est suivi de son intervalle à 95 %. `*` signale un intervalle qui exclut zéro.

| levier | métrique | gemma | qwen | DeepSeek |
| --- | --- | --- | --- | --- |
| `add_tests` | `bounce_bricks` | +12 \* [+4, +20] | +16 \* [+6, +26] | +3 \* [+1, +6] |
|  | `bounce_corners` | +59 \* [+49, +68] | +56 \* [+46, +64] | +46 \* [+38, +53] |
|  | `bounce_tunneling` | +51 \* [+42, +59] | +41 \* [+31, +51] | +32 \* [+25, +39] |
|  | `tests_added` | -31 \* [-41, -21] | -38 \* [-48, -28] | -42 \* [-51, -32] |
| `well_crafted` | `bounce_bricks` | +7 [-1, +15] | -11 \* [-21, -2] | -1 [-4, +2] |
|  | `bounce_corners` | +27 \* [+17, +38] | -1 [-11, +10] | +6 [-4, +15] |
|  | `bounce_tunneling` | +28 \* [+18, +38] | +6 [-4, +17] | +18 \* [+11, +26] |
|  | `tests_added` | +34 \* [+23, +44] | +33 \* [+22, +44] | +54 \* [+46, +63] |
| raisonnement | `bounce_bricks` | +17 \* [+9, +25] | +16 \* [+6, +26] | -1 [-3, +2] |
|  | `bounce_corners` | +11 \* [+1, +22] | +3 [-8, +14] | -1 [-10, +9] |
|  | `bounce_tunneling` | +16 \* [+6, +26] | +25 \* [+15, +35] | -3 [-11, +5] |
|  | `tests_added` | +48 \* [+38, +56] | +12 \* [+1, +23] | -4 [-15, +6] |
| `blind` | `bounce_bricks` | +3 [-4, +11] | +8 [-3, +17] | -2 [-5, +1] |
|  | `bounce_corners` | -23 \* [-33, -12] | -23 \* [-34, -12] | -43 \* [-51, -35] |
|  | `bounce_tunneling` | -16 \* [-26, -5] | -10 [-21, 0] | -29 \* [-37, -22] |
|  | `tests_added` | -5 [-16, +6] | -2 [-12, +9] | -23 \* [-33, -13] |
:::

### Ce que nous en retenons

**Le critère sépare surtout les modèles.** DeepSeek réussit `bounce_bricks` dans 315 exécutions sur 320, quelle que soit la configuration : il ne reste plus de marge pour mesurer un levier sur cette colonne. gemma est à 267 sur 320 et qwen à 226. Les leviers se lisent sur les cas difficiles (le coin, le tunneling) et sur les tests ajoutés.

**La sonde est le seul levier qui aide les trois modèles.** Avec `add_tests`, le coin est réussi dans 79 % des exécutions chez gemma, 78 % chez qwen et 100 % chez DeepSeek, et le tunneling monte lui aussi chez les trois modèles. La contrepartie est la même partout : l'agent n'écrit plus ses propres tests, avec une baisse de 31 à 42 points sur `tests_added`. Il a les cas sous les yeux et n'a plus de raison de les réécrire. Seules deux exécutions sur 480 ont touché à la sonde, toutes deux chez qwen.

**Le ticket bien rédigé fait écrire des tests.** `tests_added` gagne entre 33 et 54 points chez les trois modèles. Chez gemma, il améliore aussi le coin et le tunneling, parce que c'est lui qui l'envoie lire `ISSUES.md`. Chez DeepSeek, la phrase « think about the different interactions… worthy of the best arcade games » suffit à faire traiter le tunneling même sans `ISSUES.md` (18/20 en `blind` contre 0/20 avec la demande négligée), mais pas le coin (5/20). Chez qwen, le ticket bien rédigé fait baisser le critère de 11 points. La baisse se concentre là où `ISSUES.md` est présent et où la sonde manque (8/20 avec ou sans raisonnement), et les 24 exécutions qui y échouent ont toutes atteint le timeout : qwen lit `ISSUES.md`, se lance dans une longue enquête, écrit des tests, et n'a plus le temps de finir la correction.

**Le raisonnement aide gemma et qwen, et ne change rien chez DeepSeek.** gemma gagne 17 points sur le critère et 48 sur les tests ajoutés. qwen gagne 16 points sur le critère et 25 sur le tunneling, en partie parce que le raisonnement remplace ses longues séries de simulations et lui fait atteindre moins souvent le timeout (54 exécutions sur 160 contre 127 sans raisonnement). DeepSeek est déjà au plafond : le raisonnement lui coûte seulement du temps, 482 secondes en médiane contre 335.

**`blind` ne coûte que ce qu'apporte `ISSUES.md`, et seulement aux modèles qui le lisent.** Sur le critère, retirer `ISSUES.md` et l'historique ne change rien, quel que soit le modèle, parce que le commentaire du code suffit. Sur le coin, l'effet dépend de la propension du modèle à aller lire ce fichier sans qu'on le lui demande :

| coins réussis, sans sonde | demande négligée : avec → sans `ISSUES.md` | ticket bien rédigé : avec → sans `ISSUES.md` |
| ------------------------- | ------------------------------------------ | -------------------------------------------- |
| gemma                     | 0/40 → 0/40                                | 33/40 → 0/40                                 |
| qwen                      | 16/40 → 0/40                               | 17/40 → 2/40                                 |
| DeepSeek                  | 39/40 → 0/40                               | 39/40 → 9/40                                 |

Avec la demande négligée, gemma n'ouvre `ISSUES.md` que dans 2 exécutions sur 80 : le retirer ne lui coûte donc rien. qwen l'ouvre dans 58 exécutions sur 80, DeepSeek dans 79, et les deux perdent le coin dès qu'il disparaît.

**L'historique git n'apporte rien.** qwen et DeepSeek le consultent, DeepSeek jusqu'à lancer `git log` et `git show` dans la plupart des exécutions `blind`, et aucun des deux n'en tire d'information utile.

## Comment travaillent les modèles ?

Les sessions montrent comment chaque modèle arrive à ses résultats, ce qui explique qu'un même levier n'ait pas le même effet partout.

::: info Méthode
Chaque session est réduite à une suite d'actions (lire un fichier, ouvrir `ISSUES.md`, lancer `npm test`, modifier `neon.js`, écrire un test, lancer un script de simulation…). Ces classements reposent sur des expressions régulières : ce sont des tendances, pas des mesures.
:::

|                                                                   | gemma | qwen  | DeepSeek |
| ----------------------------------------------------------------- | ----- | ----- | -------- |
| appels d'outils (médiane), configuration de base                  | 5     | 27    | 22       |
| même configuration, en `blind`                                    | 5     | 9     | 11       |
| ouvre `ISSUES.md` avec la demande négligée                        | 2/80  | 58/80 | 79/80    |
| durée médiane sans raisonnement / avec                            | 269 s / 556 s | 1 800 s / 1 422 s | 335 s / 482 s |

### gemma fait ce qu'on lui montre

Avec la demande négligée et sans sonde, 35 exécutions sur 40 suivent exactement le même chemin : `ls -R`, lire `neon.js`, `npm test`, appliquer le correctif décrit dans le commentaire, `npm test`. Ces cinq appels prennent une quarantaine de secondes et n'ajoutent aucun test. C'est le seul comportement vraiment déterministe des trois modèles.

Chaque levier déclenche ensuite un comportement reconnaissable. Le ticket bien rédigé, avec `ISSUES.md` présent, produit du TDD dans 18 à 20 exécutions sur 20, avec des tests rouges écrits avant la correction. La sonde est découverte en lançant les tests : gemma voit l'échec, lit la sonde et enchaîne les corrections. Le raisonnement ajoute des simulations et rend les chemins tous différents. Son point faible apparaît quand le prompt renvoie à un fichier absent : dans `well_crafted / blind / off / add_tests`, 18 exécutions sur 20 tournent en longues boucles de correction, avec une quarantaine d'appels et une dizaine de modifications de `neon.js`.

### qwen explore et débogue par simulation

Sans raisonnement, qwen écrit des scripts jetables, regarde les vitesses de la balle, retouche `neon.js` et recommence. Les chemins sont tous différents, mais la méthode reste la même. Elle est coûteuse en temps, et chez un fournisseur lent elle mène souvent au timeout. qwen oublie aussi parfois ses fichiers de débogage dans l'arbre, ce qui fait échouer `in_scope`, la métrique qui vérifie que l'agent n'a touché qu'aux fichiers autorisés.

C'est `ISSUES.md` qui lance la longue enquête. En `blind`, la session de base passe de 27 à 9 appels d'outils et qwen se contente du correctif du commentaire. Avec le raisonnement, les simulations deviennent rares : qwen réfléchit au lieu d'essayer, et finit plus souvent dans les temps.

### DeepSeek travaille comme un développeur méthodique

DeepSeek lit tout le contexte disponible sans qu'on le lui demande, `ISSUES.md` compris, et se sert de git comme un développeur (`git diff`, `git status`, `git log`). Il suit les consignes d'`ISSUES.md` sans qu'on les lui rappelle : dans la configuration de base, 15 exécutions sur 20 écrivent les tests rouges avant de corriger, et 19 sur 20 traitent le coin, les jonctions et le tunneling.

Quand la sonde est présente, il la lit dès l'exploration, avant même de lancer les tests, et la correction devient courte et directe. Il vérifie presque toujours son travail, en relançant les tests après sa dernière modification dans 317 exécutions sur 319, et produit les correctifs les plus complets, avec 147 lignes ajoutées à `neon.js` en médiane quand il a la sonde.

## Généraliser

Le chemin suivi par l'agent prédit mal le résultat. Chez chacun des trois modèles, le taux de réussite du critère varie peu d'un type de session à l'autre. Ce qui décide du coin et du tunneling, c'est l'information que l'agent a lue : `ISSUES.md` ou la sonde.

Ce qui sépare le plus les modèles est leur tendance à aller chercher le contexte par eux-mêmes. gemma ne lit que ce vers quoi on l'envoie, alors que qwen et DeepSeek explorent le dépôt sans qu'on le leur demande. Cette tendance décide de l'effet de `blind` et de celui du ticket bien rédigé. Un levier mesuré sur un seul modèle ne dit donc rien de son effet sur un autre : le même ticket est décisif pour gemma et ne change presque rien au coin chez DeepSeek, qui a déjà lu `ISSUES.md`.

Mettre les tests dans la boucle de l'agent est le seul levier qui agisse sur tous les modèles, parce qu'il apporte l'information là où l'agent la consulte de toute façon. Il a un coût : l'agent arrête d'écrire ses propres tests, et sur un vrai ticket, personne ne vous fournira la sonde. La question que pose le [module sur les skills](./act2-skill) est de savoir si une procédure de travail écrite une fois peut obtenir le même résultat sans donner les tests.

Enfin, vérifiez une campagne avant d'en lire les scores. Sur les trois matrices de ce module, une a perdu ses colonnes de coût à cause des reprises, une autre a été relancée chez un autre fournisseur parce que la première était inexploitable, et la relance elle-même n'est lisible qu'en tenant compte de 181 timeouts. Aucun de ces incidents n'était visible dans la table des scores.

::: tip Ce que vous avez appris
Vous savez citer un levier dont l'effet change d'un modèle à l'autre, et expliquer pourquoi à partir des sessions. Notre exemple est le ticket bien rédigé : il fait lire `ISSUES.md` à gemma, qui ne l'aurait pas ouvert de lui-même, et ne change presque rien au coin chez DeepSeek, qui le lit dans tous les cas.
:::

## Pour aller plus loin

- [trysquare](https://github.com/AI-for-dev/trysquare), l'outil de mesure utilisé dans ce module, et sa [documentation](https://ai-for-dev.github.io/trysquare/).
- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), qui contient le scénario `issue1-context`, son hypothèse écrite avant la mesure, les prompts, la sonde et le script de validation.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), sur l'idée qu'un harnais soigné compte autant que le modèle.
