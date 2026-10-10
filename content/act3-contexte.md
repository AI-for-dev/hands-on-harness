# Les leviers du contexte, mesurés

::: tip Objectifs de ce module
- Mesurer avec trysquare l'effet de chaque levier du [module 2.1](./act2-contexte) sur une même tâche
- Lire une matrice de vingt répétitions et ne retenir que les écarts établis
- Vérifier le compte de reprises et les raisons des métriques avant de citer une table
- Repartir avec une décision motivée sur chaque levier
:::

Le [module 2.1](./act2-contexte) vous a fait manipuler à la main les leviers qui remplissent la fenêtre de contexte : le modèle, l'effort de raisonnement, le prompt, `AGENTS.md` et le prompt système. Chaque manipulation tenait en une ou deux exécutions, ce qui suffit à voir ce qu'un levier change dans la session et laisse ouverte la question de savoir si ce changement se reproduit. Ce module reprend la même tâche, l'issue #1 de NÉON, et mesure les mêmes leviers avec [trysquare](https://github.com/AI-for-dev/trysquare), dont le [module 3.0](./act3-trysquare) décrit le fonctionnement et la lecture des tables.

## L'expérience

### Ce qui compte comme réussite

Le cadre est celui du [module 2.1](./act2-contexte) : l'agent ne modifie que `game/neon.js` et `game/neon.test.js`, il lance les tests pour vérifier qu'il n'a rien cassé, et il ajoute des tests puisque la suite ne couvre pas le rebond de la balle sur les briques. Voici ce que nous mesurons sur chaque exécution :


| métrique             | ce qu'elle dit                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`          | l'agent a modifié au moins un fichier                                                         |
| `in_scope`           | il n'a touché que `game/neon.js` et `game/neon.test.js`                                       |
| `suite_lancee`       | il a lancé `npm test` lui-même, lu dans sa session                                            |
| `tests_ajoutes`      | la suite compte plus de cas qu'à l'étalon                                                     |
| **`rebond_briques`** | **le critère** : sur chacune des quatre faces, l'axe touché s'inverse et l'autre ne bouge pas |
| `rebond_angles`      | dans le coin, les deux composantes s'inversent                                                |
| `rebond_sortie`      | après le rebond, la balle est ressortie du rectangle de la brique                             |
| `rebond_voisines`    | sur une couture de la grille, le rebond s'applique une fois et pas deux                       |
| `rebond_traversee`   | une balle rapide ne franchit plus la brique sans la toucher                                   |

Nous testons l'ensemble de ces points de manière déterministe, sans LLM-as-a-judge : les tests qu'il faudrait avoir sont écrits dans un fichier sonde. Un test exécutable est plus sûr qu'un LLM chargé de confirmer un comportement souhaité, dont le verdict probabiliste peut vous faire croire que c'est bon alors que ça ne l'est pas.

### Le plan d'expérience

Le plan retenu est le plus simple qui reste lisible : une **base**, puis un ensemble de variantes qui changent chacune peu de chose.

La base, appelée `nothing`, reproduit ce que fait quelqu'un le premier jour : la demande négligée de vos premiers essais au [module 2.1](./act2-contexte), pas de fichier de règles, le prompt système de l'agent et le raisonnement coupé. Chaque autre configuration ajoute un élément pour en voir l'effet sur la réponse.

| configuration                    | ce qui change                                                      |
| -------------------------------- | ------------------------------------------------------------------ |
| `nothing`                        | rien, c'est la référence                                           |
| `+thinking`                      | `thinking = "high"`                                                |
| `+agents`                        | `briques/AGENTS.md` est déposé dans le clone                       |
| `+well_crafted`                  | le prompt décrit proprement le problème et se réfère à `ISSUES.md` |
| `-system_prompt`                 | le prompt système est remplacé par trois lignes                    |
| `+agents+well_crafted`           | `AGENTS.md` + prompt bien écrit                                    |
| `+agents+add_tests+well_crafted` | on ajoute en plus ici les tests que l'on souhaite voir passer      |

Une expérience tient dans un fichier : `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

Le répertoire de l'expérience contient d'autres configurations que celles du tableau ci-dessus ; elles appartiennent à d'autres modules, et nous en discuterons plus tard.

Le prompt bien écrit ne recopie pas le contenu du ticket. `ISSUES.md` décrit déjà comment corriger le bug, dans le dépôt que l'agent a sous la main. Le prompt nomme donc l'issue, le périmètre et le critère d'arrêt, et rien de plus :

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Cette configuration mesure donc si pointer un document écrit suffit à ce que l'agent aille le lire et en tienne compte. Si le prompt recopiait la solution, nous mesurerions uniquement la capacité de l'agent à suivre une consigne qu'on vient de lui donner.

### Les tests de validation

Pour juger la qualité des résultats, le scénario déclare des tests de validation :

- **delivered** : l'exécution est allée au bout, sans interruption.
- **suite_lancee** : l'agent a pensé à lancer les tests qui se trouvent dans le répertoire `game`.
- **in_scope** : l'agent n'a modifié que les fichiers qu'on lui a demandé de modifier, et seulement les lignes qui correspondent au problème.
- **tests_ajoutes** : l'agent a pensé à ajouter des tests sur les rebonds de la balle contre les briques.
- **`sonde.test.js`** : à la fin de l'exécution, cette sonde vérifie que les modifications du code corrigent le problème dans sa globalité, tel que décrit dans `ISSUES.md`. Elle est aussi déposée dès le départ dans la configuration `+add_tests`, pour voir si l'agent est en mesure de réparer ses erreurs en fonction des tests.

Chaque exécution laisse dans son répertoire la session de l'agent, le diff et la sortie des validations, décrites au [module 3.0](./act3-trysquare). C'est là qu'il faut aller lire quand une colonne surprend.

::: info Exercice (en salle, puis en autonomie)
Placez-vous dans le dépôt [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) installé au [module 3.0](./act3-trysquare), où vous avez déjà regardé le plan de ce scénario avec `--dry-run`.

Lancez la matrice à trois répétitions et laissez-la tourner pendant que vous discutez des curseurs :

```bash
uv run trysquare run scenarios/issue1-contexte.toml --output results --repetitions 3
```

Vous disposez d'un ensemble de sous-commandes qui ne lancent pas de modèles et qui servent essentiellement à analyser les résultats :

```bash
# refabriquer les tables
uv run trysquare render scenarios/issue1-contexte.toml --output results --repetitions 3
# renoter sans rejouer
uv run trysquare replay results/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
uv run trysquare compare results/... results/...
```

**En autonomie**, copiez `scenarios/issue1-contexte.toml`, changez une configuration, et relancez. Vous n'aurez touché ni l'outil, ni la validation, ni les autres configurations, et c'est le seul artefact de ce module qui ne périmera pas.
:::

## Ce que disent nos mesures

Vous avez dû vous en rendre compte lors de vos premiers essais avec `trysquare` : faire des mesures prend du temps. Pour une vingtaine de répétitions, il vous faudra entre 2 h et 3 h pour avoir l'ensemble des résultats, configurations à compétence comprises. Nous avons donc préféré vous donner une campagne complète réalisée en amont, dans laquelle vous pouvez parcourir les répertoires de chaque exécution comme vous l'avez fait précédemment.

Voici ce que nous avons obtenu en août 2026, sur `ilaas` et `gemma-4-31b`, contre le commit `d62ccd1f` de NÉON, avec **vingt répétitions par configuration**. Les deux configurations à compétence figurent dans l'archive et appartiennent au [module sur les skills](./act2-skill) ; elles sont écartées des tables ci-dessous, à l'exception d'une remarque à la fin.

| configuration                    | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

Et les colonnes de la sonde, le critère en tête :

| configuration                    | briques   | angles    | sortie    | voisines  | traversée |
| -------------------------------- | --------- | --------- | --------- | --------- | --------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

Les dénominateurs de `+well_crafted` et `+thinking` valent 18 et 19 dans les colonnes de coût, parce qu'ILaaS a rendu des `Request timed out` pendant la mesure et que les exécutions concernées n'ont rien produit.

Nous tirons cinq enseignements de ces deux tables. Tous les écarts cités plus bas viennent des intervalles décrits au [module 3.0](./act3-trysquare), avec la même marque `*` pour un écart établi et `o` pour un écart non concluant. Les écarts se calculent contre une configuration de référence, la première du scénario (ici `nothing`) quand vous n'en précisez pas d'autre. Refaire les calculs contre une autre référence ne fait que changer ce pointeur, sans appeler le modèle ni remesurer quoi que ce soit.

```bash
uv run trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

La sortie va dans un `synthesis_ref-<référence>.md` à côté de la synthèse habituelle, qui n'est pas touchée.

**Le prompt cadré fait faire tout ce que le ticket nomme, et rien de plus.** `tests_ajoutes` passe de 0/20 à 17/20 et `rebond_angles` de 0/20 à 14/20, deux colonnes qui étaient vides et qui se remplissent. Le prompt ne dit pourtant rien du mécanisme du rebond : il nomme l'issue, le périmètre et le critère d'arrêt, et c'est `ISSUES.md` qui décrit le coin, la sortie du rectangle, les briques voisines et le tunneling. Le coin reste à **0/20 dans les quatre configurations qui ne cadrent pas le ticket**, soit quatre-vingts exécutions consécutives. Pointer un document écrit suffit donc à ce qu'il soit lu, et c'est le contenu de ce document qui décide de ce qui sera traité.

**Le fichier de règles ne déplace que le procédé, et il ne déplace plus rien dès que le ticket est correct.** `+agents` fait passer `suite_lancee` de 0/20 à 20/20, parce qu'une de ses quatre lignes nomme la commande. Sur le critère, il donne 9/20 contre 11/20 à la base, écart non concluant, et sur `tests_ajoutes` il reste à 0/20 puisqu'aucune de ses lignes ne parle de tests. Ajouté par-dessus le prompt cadré, il n'apporte **strictement rien** : 11/20 contre 13/20 sur le critère, 12/20 contre 14/20 sur le coin, 17/20 contre 17/20 sur les tests ajoutés, aucun de ces trois écarts n'étant distinguable. Le fichier de règles est un substitut du bon ticket plutôt qu'un complément, ce qui donne une règle d'écriture directement applicable au budget de quarante lignes : une ligne qu'un ticket correct dirait de toute façon est une ligne à retirer.

**Le raisonnement déplace le critère, et lui seul ne fait pas lire le ticket.** `+thinking` donne 16/20 sur `rebond_briques`, soit un écart de +29 points dont l'intervalle exclut zéro. C'est le seul levier de la matrice, hors ceux qui touchent au ticket, à déplacer la correction elle-même. Sa colonne du coin reste à 0/20 et ses tests ajoutés à 3/20 : le raisonnement améliore ce que le modèle fait de ce qu'il a sous les yeux, mais ne l'amène pas à aller chercher ce qui lui manque.

**Le prompt cadré fait écrire les tests rouges, et une exécution sur cinq s'arrête là.** La colonne `touched` le dit sans ambiguïté : sur `+well_crafted` et `+agents+well_crafted`, quatre exécutions sur vingt n'ouvrent jamais `game/neon.js`, dont deux ou trois qui écrivent uniquement dans `game/neon.test.js` et une ou deux qui ne livrent rien du tout. Aucune autre configuration ne montre ce comportement, `nothing`, `+agents` et `-system_prompt` touchant la source dans vingt exécutions sur vingt. L'explication est dans le ticket, qui énumère cinq sous-cas et se termine par « each case above added **first as a red test**, then green » : `gemma-4-31b` écrit les rouges et s'arrête là, faute de pouvoir traiter la spécification entière. C'est aussi pourquoi le critère de correction ne monte pas alors que le coin monte : le modèle a un budget de travail, et décrire plus de travail dans le ticket ne l'agrandit pas.

**Donner les tests répare ce décrochage.** La configuration `+agents+add_tests+well_crafted` se lit contre `+agents+well_crafted`, la seule dont elle ne diffère que par la sonde déposée dans l'arbre :

| colonne           | `+agents+well_crafted` | `+add_tests` | écart                  |
| ----------------- | ---------------------- | ------------ | ---------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | sans objet             | **20/20**    |                        |

Les quatre colonnes de la correction montent, et les quatre écarts sont établis. Le levier ne fait donc pas que gagner des cas limites, il rattrape aussi le critère lui-même. Notez la largeur des intervalles, et en particulier celui du coin qui commence à un seul point : ces écarts sont établis au sens où ils sont positifs, sans qu'on puisse en donner la taille à mieux qu'un facteur cinquante.

`sonde_intacte` vaut 20/20, ce qui veut dire que le modèle n'a pas essayé de changer les tests de référence. Et `tests_ajoutes` ne bouge pas, ce qui est cohérent avec un agent qui a déjà les cas sous les yeux et n'a aucune raison de les réécrire.

::: warning Aucune colonne de coût gemma n'est citable ici
La matrice compte 1 151 reprises, c'est-à-dire des tours relancés parce que le fournisseur avait échoué, et l'encadré plus bas montre à quel point elles sont concentrées sur les configurations les plus lourdes. Une reprise rejoue le tour avec tout le contexte accumulé, donc elle gonfle les colonnes de coût, et surtout, elle repilote l'agent.

Le même scénario mesuré sur `opencode-go` et `deepseek-v4-flash` en compte **37**, ce qui rend les siennes lisibles :

| configuration                    | tours | durée |
| -------------------------------- | ----- | ----- |
| `nothing`                        | 19    | 163 s |
| `+agents`                        | 12    | 65 s  |
| `-system_prompt`                 | 17    | 142 s |
| `+well_crafted`                  | 15    | 252 s |
| `+thinking`                      | 19    | 490 s |
| `+agents+well_crafted`           | 14    | 561 s |
| `+agents+add_tests+well_crafted` | 13    | 410 s |

Les tokens d'entrée des deux matrices ne se mettent pas dans le même tableau, pour une raison qui n'a rien à voir avec le modèle : ILaaS ne rapporte aucun cache, `cacheRead` valant zéro sur ses cent quatre-vingts exécutions, si bien que sa colonne d'entrée est la somme des préfixes complets relus à chaque tour. opencode Zen rapporte le cache, jusqu'à cinq millions de tokens lus sur une seule exécution. La même configuration affiche donc 558 000 tokens d'entrée d'un côté et 15 000 de l'autre sans qu'aucun des deux ne soit faux. C'est la moitié pratique de ce que le [module 2.1](./act2-contexte) explique sur le cache : le coût des entrées dépend de la configuration du fournisseur de modèle, et l'activation du cache permet de réduire drastiquement la note.
:::

### Trois vérifications avant de citer une table

Une matrice publie des tables, des intervalles et des verdicts, ce qui peut donner l'impression de conclusions solides. Néanmoins, lors de l'élaboration de cette formation, nous avons fait face à plusieurs phénomènes qui peuvent discréditer certains résultats.

::: warning Le compte de reprises
Une reprise est un tour que l'outil a dû relancer parce que le fournisseur avait échoué. Elle rejoue ce tour avec tout le contexte accumulé, donc elle gonfle les colonnes de coût, et surtout, elle repilote l'agent : ce n'est plus la même conduite de travail.

Sur la matrice `gemma-4-31b`, le compte vaut **1 151**, et il n'est pas réparti :

| configuration                    | reprises |
| -------------------------------- | -------- |
| `nothing`                        | 1        |
| `+agents`                        | 2        |
| `-system_prompt`                 | 1        |
| `+well_crafted`                  | 24       |
| `+thinking`                      | 81       |
| `+agents+well_crafted`           | 205      |
| `+agents+add_tests+well_crafted` | 205      |
| `+agents+add_tests+skill`        | 287      |
| `+agents+skill`                  | 345      |

Rien sur les configurations à contexte court, tout sur celles à raisonnement élevé, et d'autant plus que le contexte accumulé grossit : une seule exécution de `+agents+add_tests+well_crafted` a consommé 2,4 millions de tokens d'entrée sur soixante-trois tours et accumulé dix-huit reprises. Le même scénario mesuré sur `opencode-go` et `deepseek-v4-flash` en compte **trente-sept** au total.
:::

::: warning L'importance du test de validation
Une colonne uniformément noire ressemble à un comportement de l'agent et peut être un défaut de la validation. Le seul moyen de les distinguer est que la métrique dise **pourquoi** elle a répondu faux, et non seulement qu'elle a répondu faux.

Notre test de validation le fait pour `suite_lancee` : quand il ne reconnaît aucun lancement de la suite, il recopie dans sa raison toutes les commandes que l'agent a passées. Cette précaution est importante, parce que la forme de la commande varie d'un modèle à l'autre bien plus que la commande elle-même. `deepseek-v4-flash` préfixe chaque appel du répertoire de travail (`cd .../repo && npm test`, 664 fois sur la matrice) et redirige volontiers la sortie (`npm test 2>&1 | tail -30`, 80 fois), là où `gemma-4-31b` tape `npm test` nu. Un test de validation qui ne connaîtrait que la dernière forme noterait le premier modèle à zéro sur toute la matrice.

En conclusion, **écrivez vos métriques avec précaution et éprouvez-les sur un ensemble de tests**. Il faut qu'elles soient fiables. Notez tout comportement étrange avant d'en tirer des conclusions hâtives.
:::

::: warning Ce que la comparaison des deux modèles permet de dire, et ce qu'elle ne permet pas
Les deux matrices (`gemma-4-31b` et `deepseek-v4-flash`) portent sur le même scénario, les neuf mêmes configurations et le même commit de NÉON, si bien que leurs colonnes de score se lisent l'une contre l'autre. Le modèle et le fournisseur ont changé ensemble, ce qui interdit d'attribuer un écart à l'un plutôt qu'à l'autre, et laisse quand même voir ceci sur la colonne du coin :

| configuration          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Les deux modèles réagissent au même levier et dans le même sens, le plus capable partant de plus haut et montant plus haut.
:::

Ces chiffres n'ont pas vocation à être crus sur parole ni recopiés dans un an. Relancez la matrice : c'est précisément ce à quoi elle sert, et celle que vous obtiendrez remplacera celle-ci.

Le contexte bien tenu rend l'agent discipliné et complet sur ce que le ticket nomme, sans le rendre exhaustif : le coin de la brique n'est jamais atteint là où le ticket ne le décrit pas, et le tunneling reste la colonne la plus basse de toutes celles que la sonde mesure. Aller au-delà de ce que le matériau écrit contient demandera un relecteur indépendant et une boucle de vérification, ce qui est le sujet des modules sur la délégation et les workflows.

::: warning Trois conclusions tentantes que les intervalles ne permettent pas
Chacune des phrases suivantes s'appuie sur un chiffre exact de la campagne publiée sur cette page, et aucune ne tient.

**« Le fichier de règles casse la correction. »** `+agents` donne 9/20 sur le critère contre 11/20 à la base. L'écart vaut -10 points mais son intervalle contient zéro : nous ne pouvons rien en dire, ni dans un sens ni dans l'autre.

**« Retirer le prompt système améliore le rebond. »** `-system_prompt` donne 14/20 contre 11/20, soit +15 points, et l'intervalle contient zéro là aussi. Avec seulement trois exécutions bien tirées, nous aurions obtenu 3/3 contre 1/3 et nous aurions pu y croire durablement.

**« Le prompt cadré corrige mieux le bug. »** `+well_crafted` donne +17 points sur le critère, non concluant. L'effet réel de ce levier se voit ailleurs, sur les tests ajoutés et sur le coin, où les écarts se comptent en dizaines de points et ne laissent aucun doute.

Répéter trois fois ne suffit donc pas : un effet qui ne dépasse pas la dispersion de sa propre configuration n'est pas un effet. Et un effet établi sur cette tâche, avec ce ticket et ce modèle, n'est établi que dans ce cadre.
:::

## La pile contre la base

Les leviers de ce module demandent de l'attention et du temps, alors qu'un modèle plus capable s'obtient simplement en payant plus cher. Il est donc légitime de se demander s'il est plus rentable de soigner son contexte ou de changer de modèle. La seconde moitié de cette question n'est pas mesurée ici, pour la raison donnée dans l'encadré sur la comparaison des deux modèles : le modèle et le fournisseur y changent ensemble. La première l'est, à modèle constant, en mettant face à face les deux configurations extrêmes de la matrice.

::: info Exercice (en salle)
Comparez la configuration `nothing`, qui reçoit une demande d'une ligne et rien d'autre, et la configuration `+agents+add_tests+well_crafted`, qui dispose du raisonnement, du ticket cadré, de l'`AGENTS.md` et de la sonde déposée dans l'arbre. Regardez d'abord les diffs, puis les colonnes de la sonde, puis seulement à la fin ce que chacune a coûté.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, écart +35 points      |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| tours médians      | 19        | 13                               |
| durée médiane      | 163 s     | 410 s                            |

Les deux dernières lignes sont prises sur la matrice `deepseek-v4-flash`, dont les trente-sept reprises rendent les colonnes de coût lisibles, et les colonnes de score sur `gemma-4-31b`.

Le harnais complet atteint dix-huit sur vingt sur un critère où la base plafonne à onze, et la colonne la plus sévère de la sonde passe de 7/20 à 18/20. C'est la thèse d'Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, vérifiée sur sa moitié la plus facile à établir : à modèle rigoureusement constant, le harnais seul fait la différence entre une correction qui marche une fois sur deux et une correction qui marche neuf fois sur dix.

Le coin passe de 0/20 à 18/20, et le prompt cadré seul en obtenait déjà quatorze : l'essentiel du gain vient du fait que le prompt fait référence à un ticket dans `ISSUES.md` qui nomme le cas, et la sonde ajoute par-dessus la persévérance qui manquait pour finir le travail.

## Ce que ce module ne sait pas obtenir

Le seul levier qui ait amené le modèle à traiter l'ensemble de ce que le ticket demande est celui qui lui a mis les tests sous les yeux. Cette configuration a cependant quelque chose d'artificiel : les cas limites étaient écrits d'avance, par nous, dans le fichier même qui note. Sur un vrai ticket, personne ne vous les fournira.

Ce que cette configuration apporte en réalité, c'est de la persévérance. Le modèle décroche sur un ticket long parce qu'il épuise son budget à formuler les cas au lieu de les corriger ; recevoir les cas déjà formulés lui rend ce budget. La question que pose le [module sur les skills](./act2-skill) est donc de savoir si une **compétence**, c'est-à-dire une procédure de travail écrite une fois et rechargée à la demande, peut produire la même persévérance sans fournir les tests.

## Généraliser

Les principes qui suivent portent sur les leviers eux-mêmes, ceux qui portent sur la méthode de mesure étant regroupés au [module 3.0](./act3-trysquare).

**Pointer un document écrit suffit à ce qu'il soit lu, et ce qui y est écrit décide du résultat.** Notre ticket cadré ne décrit pas le mécanisme du rebond : il nomme l'issue, le périmètre et le critère d'arrêt. Dix-sept exécutions sur vingt sont allées lire `ISSUES.md`, y ont trouvé la demande de cas limites en tests rouges, et l'ont exécutée, là où la demande négligée n'en avait obtenu aucune. Le coin de la brique en donne la version la plus nette : il est décrit dans `ISSUES.md` et dans aucun de nos prompts, et il vaut 0/20 dans les quatre configurations qui ne nomment pas l'issue contre 14/20 dans celle qui la nomme. Écrivez ce que vous attendez dans un document que vous pouvez pointer, et relisez ce document avant de conclure quoi que ce soit sur l'agent.

**Un modèle a un budget, et décrire plus de travail ne l'agrandit pas.** Notre ticket énumère cinq sous-cas et demande un test rouge pour chacun ; quatre exécutions sur vingt écrivent ces tests rouges et n'ouvrent jamais le fichier source. Ce constat conditionne la suite : soit vous réduisez la demande à ce que le modèle peut porter, soit vous lui donnez de quoi tenir la distance, ce qui est le sujet du [module sur les skills](./act2-skill).

**Le fichier de règles change ce que l'agent fait et non ce qu'il trouve, et il ne sert que sur ce que le ticket ne dit pas.** Il entre dans le contexte à chaque tour, ce qui en fait un levier fort et coûteux à la fois, d'où l'intérêt de le tenir court, de sourcer chaque règle par un échec observé et de le refactorer plutôt que de l'allonger. Nos mesures cadrent précisément ce qu'il achète : la configuration `+agents` fait passer de 0/20 à 20/20 le nombre d'exécutions qui lancent la suite de tests, laisse le critère de correction inchangé, et n'apporte plus rien du tout dès que le prompt cadré est là. La règle d'écriture qui en découle est directement applicable au budget de quarante lignes : une ligne qu'un ticket correct dirait de toute façon est une ligne à retirer.

## Livrable

Ce module produit deux pièces, et la seconde servira à l'acte 4.

**1. Le répertoire de matrice** produit par `trysquare run`, avec sa ligne de journal. Le livrable n'est pas un tableau recopié mais l'archive qui permet de le refabriquer : les mesures brutes, les sessions, les diffs, et la révision de l'outil qui a mesuré. Sans cette archive, la matrice ne peut être ni vérifiée ni renotée, et ses chiffres ne valent pas mieux qu'une opinion.

**2. La fiche de décision**, une ligne par levier :

| levier                     | effet mesuré | adopté ? | pourquoi |
| -------------------------- | ------------ | -------- | -------- |
| choix du modèle            |              |          |          |
| effort de raisonnement     |              |          |          |
| ticket cadré               |              |          |          |
| contenu du ticket pointé   |              |          |          |
| `AGENTS.md`                |              |          |          |
| prompt système             |              |          |          |
| tests fournis d'avance     |              |          |          |
| ordonnancement / cache     |              |          |          |
| compaction                 |              |          |          |
| critère exécutable (sonde) |              |          |          |

Deux lignes ont été ajoutées à cette fiche après nos dernières mesures. « Contenu du ticket pointé » y figure parce que la réécriture d'`ISSUES.md` a déplacé plus de colonnes que n'importe quel réglage du harnais, et « tests fournis d'avance » parce que c'est le seul levier qui ait rattrapé le décrochage du modèle sur un ticket long.

Cette fiche constitue le premier remplissage réel de la colonne « ton harnais ? » de la table de correspondance, pour la ligne « contexte ». Les modules suivants feront de même pour leur brique, si bien que vous aborderez le capstone avec une table déjà remplie par vos expériences.

::: tip Critère de réussite
Vous savez citer un levier que vous avez mesuré comme sans effet sur NÉON, et dire à quelle condition précise il en aurait un ailleurs.

Notre exemple est `AGENTS.md` : il ne déplace pas d'un point le critère de correction, et il deviendrait décisif sur un ticket dont l'échec habituel est de procédé plutôt que de raisonnement, ou sur un dépôt dont les tickets sont mal écrits. Le vôtre sera différent, et c'est le but. Ce critère demande d'avoir vu les chiffres et d'avoir compris que c'est la tâche et son matériau qui les déterminent. Il ne peut donc pas être satisfait de mémoire.
:::

## Pour aller plus loin

- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), dont la thèse est celle que la comparaison de la pile à la base met à l'épreuve.
- [trysquare](https://github.com/AI-for-dev/trysquare), l'outil de mesure utilisé dans ce module, et sa [documentation](https://ai-for-dev.github.io/trysquare/).
- La campagne trysquare de la formation, `scripts/trysquare-campaign/`, avec ses hypothèses écrites avant mesure et ses matrices archivées. C'est le seul endroit où les chiffres de cette page sont vérifiables.
