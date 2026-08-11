# Le contexte et la fenêtre : ce qu'on y met, ce que ça coûte

::: tip Objectifs de ce module
- Savoir dire ce qu'il y a réellement dans la fenêtre de contexte, et ce que chaque partie coûte
- Manipuler les leviers qui la remplissent : modèle, effort de raisonnement, prompt, `AGENTS.md`, prompt système
- Monter un dispositif de mesure reproductible et s'en servir pour trancher
- Repartir avec un `AGENTS.md` court et une décision motivée sur chaque levier
:::

La gestion du contexte est la brique dont dépendent toutes les autres, puisqu'un sous-agent sert à ne pas polluer le contexte principal, une mémoire à ne pas le remplir de ce qu'on saurait retrouver, et une permission à ne pas y déverser un fichier qu'on n'aurait pas dû lire. Tant que vous ne savez pas ce que contient la fenêtre ni ce que ça coûte, les modules qui suivent resteront des recettes appliquées sans être comprises.

Nous procédons dans l'ordre habituel : comprendre ce qu'il y a dans la fenêtre, reconstruire les leviers qui la remplissent, puis dégager ce qui reste vrai quand l'outil change.

::: info Une convention de lecture
Chaque manipulation est marquée **en salle** ou **en autonomie**. Le parcours en salle est conçu pour tenir dans la séance et pour suffire à comprendre les enjeux du module. Les manipulations en autonomie approfondissent, et sont écrites pour être refaites seul, plus tard, sur votre propre dépôt.
:::

## Comprendre

### Cinq sources, une seule fenêtre

Quand vous tapez une question dans Pi, le modèle reçoit un empilement dont votre question n'est qu'une ligne :

1. le **prompt système**, qui décrit au modèle son rôle, ses outils et ses conventions ;
2. les **fichiers de contexte**, `AGENTS.md` et `CLAUDE.md`, chargés depuis votre répertoire personnel, puis depuis chaque répertoire parent en remontant, puis depuis le répertoire courant ;
3. les **descriptions des outils**, en JSON, une par outil disponible ;
4. **votre question** ;
5. et, à mesure que la boucle tourne, l'**historique**, c'est-à-dire chaque réponse du modèle, chaque appel d'outil et chaque sortie d'outil.

Les quatre premières sources sont stables d'un tour à l'autre, alors que la cinquième grossit à chaque tour, ce qui en fait presque toujours la responsable des débordements.

::: info Exercice (en salle)
Ouvrez une session, posez une question quelconque, puis exportez la session avec `\export`. Ouvrez le fichier HTML produit et lisez le prompt système de Pi en entier, ce que la plupart des agents de code ne vous permettent pas de faire.

Repérez-y ce qui décrit des **capacités** et ce qui décrit des **conventions** : nous mesurerons plus loin le poids réel de chacune des deux catégories.
:::

Sur une requête aussi triviale que « dis juste OK », sans fichier de contexte, sans skill et sans extension, l'entrée pèse **1 660 tokens**, et elle tombe à **1 110** si l'on remplace le prompt système de Pi par trois lignes. Le prompt système de Pi coûte donc environ **550 tokens**, ce qui est peu au regard de ce que les sorties d'outils et l'historique viendront y ajouter ensuite. L'essentiel de ce qui remplit une fenêtre de contexte ne vient pas du harnais mais de ce que vous et l'agent y déversez au fil de la session.

### Que coûte l'utilisation d'un LLM ?

Un appel au modèle se facture en trois postes, exprimés au million de tokens. Voici les tarifs des deux modèles pris sur l'offre opencode Go :

| modèle              | entrée | sortie | lecture de cache |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $ | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $ | 3,48 $ | 0,0145 $         |

Ces tarifs sont ceux publiés par [opencode Zen](https://opencode.ai/docs/zen/). Nos mesures plus bas tournent sur ILaaS, qui ne facture rien aux participants de cette formation, et comptent donc des tokens plutôt que des euros. Les deux se lisent de la même façon, à ceci près qu'un compteur de tokens ne vous prévient pas quand vous dépensez.

Deux écarts en ressortent. Le premier sépare les deux modèles, puisque le `pro` coûte 12,4 fois plus cher que le `flash` à tarif nominal. C'est une première façon de se rendre compte qu'un modèle à plus de capacité qu'un autre. Le second écart, bien plus large, sépare l'entrée de la lecture de cache : un facteur **50** sur `flash` et **120** sur `pro`.

Ce second écart est ce qui rend un agent de code économiquement viable, car un agent relit son historique complet à chaque tour et paierait sinon vingt fois le prix de son contexte au cours d'une session de vingt tours.

::: info Exercice (en salle)
Dans une session interactive, enchaînez cinq questions sur un même fichier en tapant `/session` après chacune, et changez de modèle avec `/model` avant la quatrième. Les questions doivent interdire explicitement toute relecture de fichier, faute de quoi une nouvelle sortie d'outil viendra s'ajouter au contexte et brouillera la lecture.

Voici la séquence exacte que nous avons mesurée, ici en mode non interactif pour qu'elle soit reproductible telle quelle. L'option `-c` poursuit la session précédente, et les accents sont omis dans les commandes sans incidence sur le résultat :

```bash
cd /chemin/vers/neon

pi -p --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "Lis game/theme.js et dis en une phrase ce que fait ce fichier."

pi -p -c --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "En une phrase, cite une couleur qui y est definie. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "En une phrase, combien de couleurs au total ? Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, confirme ce nombre. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, redis ce nombre. Ne relis aucun fichier."
```

Ces cinq tours produisent six appels au modèle, parce que le premier en consomme deux : un pour demander la lecture de `theme.js`, un second pour répondre une fois la sortie de l'outil revenue.

| appel | tour | prompt                     | modèle  | entrée | lecture de cache | coût           |
| ----- | ---- | -------------------------- | ------- | ------ | ---------------- | -------------- |
| 1     | 1    | « Lis `game/theme.js`... » | `flash` | 1 675  | 0                | 0,000254 $     |
| 2     | 1    | (suite, après la lecture)  | `flash` | 307    | 1 664            | 0,000081 $     |
| 3     | 2    | « cite une couleur... »    | `flash` | 66     | 2 048            | 0,000053 $     |
| 4     | 3    | « combien de couleurs... » | `flash` | 118    | 2 048            | 0,000087 $     |
| 5     | 4    | « confirme ce nombre... »  | `pro`   | 2 521  | **0**            | **0,005455 $** |
| 6     | 5    | « redis ce nombre... »     | `pro`   | 148    | 2 432            | 0,000362 $     |

Le cache s'active dès le deuxième appel, y compris à l'intérieur d'un même tour, et il fait tomber le coût d'un facteur trois à cinq. La bascule de modèle au quatrième tour remet la lecture de cache à zéro et fait repayer tout le préfixe au tarif plein : ce seul tour coûte quinze fois plus cher que le suivant, à modèle identique.
:::

::: warning Si `pi -p` se fige sans rien afficher
Depuis un script, redirigez l'entrée standard avec `< /dev/null`. En mode non interactif, `pi` attend sur son entrée standard tant qu'elle reste ouverte, ce qui bloque indéfiniment quand il est appelé depuis un script bash par exemple. L'outil de mesure trysquare que nous décrirons plus bas connaît ce piège et ferme l'entrée standard de chaque exécution en utilisant `stdin=subprocess.DEVNULL` dans une commande Python `subprocess.run`.
:::

Le cache ne fonctionne que sur un **préfixe inchangé**, ce dont découle la règle d'ordonnancement du contexte : tout ce qui varie doit être placé derrière ce qui est stable. Un horodatage ou un `git status` glissé dans le prompt système invalide l'intégralité de ce qui suit, outils, question et historique compris, et vous fait repayer le plein tarif à chaque tour, alors que la même donnée placée dans le message du tour courant ne coûte rien puisqu'elle se trouve déjà dans la zone qui varie.

Retenez aussi que changer de modèle en cours de session n'est pas gratuit, ce qui mérite d'être gardé en tête chaque fois que vous basculerez d'un modèle à l'autre avec `/model`.

## Reconstruire

### La tâche, et ce qui compte comme réussite

Toutes les mesures de ce module portent sur la même tâche, l'**issue #1** de NÉON : la balle traverse les briques au lieu de rebondir.

Le ticket est décrit dans `ISSUES.md` à la racine du dépôt de NEON (https://github.com/AI-for-dev/neon). Il explique que la balle passe à travers les briques ainsi que les différents comportements qu'il faut corriger pour avoir un comportement normal de la balle. Nous pourrions donner directement ce ticket à l'agent, mais nous ne le ferons pas pour le moment. Nous souhaitons pour l'instant voir comment il se comporte en fonction du prompt qu'on lui fournit et le cadre autour.

Comme vous pouvez le constater, cette issue comporte plusieurs subtilités qui vont être difficile à l'agent de trouver seul. Il va rapidement voir le problème et proposer de calculer une distance aux côtés de la brique. En fonction du côté tapé, il va inverser une des deux vitesses. Mais le problème au coin, qui est rare mais réel, ou le problème d'une vitesse trop importante qui ferait que la balle traverse la brique sans même la voir, il y a malheureusement très peu de chance qu'il les voit.

En plus de la correction du bug, nous souhaitons commencer à définir un cadre et vérifier que l'agent n'en sorte pas. Il y en a principalement trois :

- L'agent ne peut modifier que `game/neon.js` et `game/neon.test.js` et rien d'autre.
- L'agent doit lancer les tests pour vérifier qu'il n'a rien cassé.
- L'agent doit ajouter des tests si la couverture n'est pas bonne. C'est notre cas ici : il n'y a pas de tests qui vérifient le comportement de la balle avec la brique.
 
Voici ce que nous proposons de mesurer sur chaque exécution :

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

Nous testerons l'ensemble de ces points de manière déterministe et sans utiliser de LLM-as-a-judge. Nous avons écrit les tests qu'il faudrait avoir dans un fichier sonde. Dites-vous qu'un test à vérifier est toujours beaucoup plus sûr que l'utilisation d'un LLM pour confirmer un comportement souhaité. L'aspect probabiliste du LLM peut vous faire croire que c'est bon alors que ça ne l'est pas du tout.

::: warning Chaque exécution travaille sur un clone jeté
Un dispositif qui modifie le dépôt mesure la dernière modification plutôt que la configuration. L'outil que nous utilisons plus bas clone NÉON **à un tag**, `etalon-v1`, dans un répertoire temporaire, à chaque exécution.

Jamais l'arbre de travail. `main` avance, une salle corrige l'issue #1, et les mesures d'hier cesseraient de se comparer à celles de demain sans que rien ne le signale.
:::

### Les curseurs, à la main

#### Le modèle

::: info Exercice (en salle)
Lancez la même demande sur deux modèles de tailles différentes, celui que vous utilisez d'ordinaire et le plus gros auquel vous avez accès. C'est la demande négligée, celle que tout le monde écrit le premier jour :

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Vous prendrez bien soin de faire deux clones séparés au préalable en utilisant la commande 

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

et vous travaillerez directement dans ces deux répertoires en fonction du modèle.

Lisez les deux diffs, puis les deux `/session`. Notez vos observations sans en tirer de conclusion : la section sur les répétitions expliquera pourquoi deux exécutions ne suffisent pas à départager deux modèles.
:::

#### L'effort de raisonnement

`pi --help` annonce sept niveaux de raisonnement, de `off` à `max`, ce qui en fait le curseur le plus immédiatement tentant du harnais.

::: info Exercice (en salle)
Lancez la même tâche avec `--thinking minimal`, puis avec `--thinking max`, et comparez les tokens de sortie et la réponse. Vous ne trouverez aucun écart, parce que les deux drapeaux produisent exactement la même requête si vous utilisez le modèle `gemma-4-31b`.

Pour ce modèle, il n'y a que deux modes : le thinking `on` ou `off`.

Refaites la comparaison entre deux niveaux réellement distincts sur votre modèle, par exemple `off` et `high`, et mesurez l'écart.
:::

Le raisonnement a bien un effet quand on le mesure entre deux niveaux réels, et nos mesures plus bas en donneront la taille. La leçon générale porte plutôt sur la confiance à accorder aux réglages : **un réglage exposé par le harnais n'est pas un réglage compris par le modèle**, parce qu'entre la configuration que vous tapez et la requête qui part se trouve une table de correspondance écrite par quelqu'un, qui peut être incomplète. Vous rencontrerez cette situation plusieurs fois dans la formation, et régulièrement dans votre travail, d'où l'habitude à prendre de chercher où atterrit une configuration ou un flag avant de le croire.

### Ce qu'on écrit

#### `AGENTS.md`, le point de configuration globale

Le fichier de règles placé à la racine du dépôt entre dans le contexte à chaque tour, ce qui en fait un bon candidat pour définir le cadre global de notre projet. Quand l'agent se trompe, la réaction naturelle consiste à y ajouter une phrase, puis une autre. Néanmoins, il faut être vigilant, car ajouter à chaque fois une nouvelle ligne à un coût et plus le fichier est grand et moins l'agent verra l'ensemble. De plus, l'amélioration des modèles fera que certaines lignes sont vraies aujourd'hui mais seront obsolètes à une future mise à jour. Il y a un réel travail de refactoring continu ici qu'il est important de faire tout au long de l'évolution de votre projet.

Nous donnerons ici une contrainte forte pour cette formation.

::: danger Budget : 40 lignes
L'`AGENTS.md` de NÉON ne dépassera jamais 40 lignes, du début à la fin de la formation. Chaque module qui voudra y ajouter une règle devra d'abord en retirer une, ou reformuler pour faire tenir les deux en une seule.

Cette contrainte est le seul moyen d'éprouver concrètement la différence entre une check-list de pilote, qu'on lit, et un guide de style, qu'on ignore.
:::

Mais nous pouvons également nous appuyer sur d'autres fichiers et le dire dans `AGENTS.md` pour qu'il aille le lire si besoin. Par exemple, nous pouvons lui indiquer que les conventions sont dans `CONTRIBUTING.md`, l'architecture dans le `README.md` et l'historique dans git. 

Sur nos vingt exécutions de l'issue #1 avec la demande négligée, **aucune n'a lancé la suite de tests** et **aucune n'a ajouté un cas**.

::: info Exercice (en salle)
Écrivez l'`AGENTS.md` de NÉON en partant de vos propres exécutions plutôt que des nôtres : relisez les diffs que vous venez de produire et cherchez ce que l'agent a fait sans qu'on le lui demande, ou omis alors qu'on le lui demandait. Faites en sorte qu'il lance les tests à chaque fois qu'il modifie le code et qu'il en ajoute s'il n'y a pas de couvertures.

Voici la base de départ, à discuter et à amender. C'est le fichier même que nos mesures utilisent, et il est versionné dans les expériences plus bas :

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning Un `AGENTS.md` peut en cacher un autre
Pi charge ces fichiers en cumulé, à partir de votre `~/.pi/agent/AGENTS.md` personnel, puis de chaque répertoire parent en remontant, puis du répertoire courant. Un fichier de règles personnel s'invite donc dans toutes vos mesures sans que rien le signale.

Le drapeau `--no-context-files`, abrégé `-nc`, désactive cette découverte, ce qui est indispensable pour mesurer proprement. L'outil de mesure plus bas travaille dans un clone jetable où seul le fichier `AGENTS.md` du répertoire courant (NEON) est déposé.
:::

#### Le prompt système

Pi permet de remplacer entièrement son prompt système par un `.pi/SYSTEM.md` à la racine du projet ou un `~/.pi/agent/SYSTEM.md` global. L'option `--system-prompt` obéit à une règle légèrement différente, puisque les fichiers de contexte et les skills continuent d'être ajoutés par-dessus, si bien qu'on ne repart jamais tout à fait d'une page blanche.

::: info Exercice (en autonomie)
Créez un `.pi/SYSTEM.md` de trois lignes. C'est la brique que nos mesures déposent dans le clone pour le cas `-prompt système` :

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Relancez la même tâche et comparez les tokens d'entrée, les tours, la durée, et ce que le diff contient.
:::


Le prompt système de Pi tient en 550 tokens. Tout le reste du travail se joue ailleurs et nous vous encourageons à ne le modifier que pour de bonnes raisons. Nous vous le montrons ici pour illustrer la flexibilité qu'offre Pi.

#### Une fenêtre bridée, pour voir la compaction

Quand le contexte approche de la limite, Pi compacte, c'est-à-dire qu'il résume les messages anciens et ne garde intacts que les plus récents. Le déclenchement suit la règle `contextTokens > contextWindow - reserveTokens`, où `reserveTokens` vaut 16 384 par défaut et représente la place laissée à la réponse. La coupure est visible dans `\tree`, et `/compact` permet de la forcer, avec des instructions optionnelles pour orienter le résumé.

Sur NÉON, la compaction ne se déclenchera jamais. Le dépôt fait 617 lignes, `gemma-4-31b` annonce une fenêtre d'environ 128 000 tokens, ce qui place le seuil aux alentours de 112 000, et notre expérience la plus dépensière n'atteint ce total qu'en cumulant treize tours dont aucun ne pèse plus d'une dizaine de milliers de tokens. Observer le mécanisme suppose donc de fabriquer la contrainte.

::: info Exercice (en autonomie)
Déclarez dans `~/.pi/agent/models.json` une seconde entrée, pointant sur le même service, mais annonçant une fenêtre de 32 000 tokens :

```json
{
  "providers": {
    "ilaas": {
      "baseUrl": "https://llm.ilaas.fr/v1",
      "api": "openai-completions",
      "apiKey": "XXXXX",
      "models": [
        {
          "id": "gemma-4-31b",
          "name": "Gemma 4 31B (fenêtre bridée)",
          "reasoning": true,
          "contextWindow": 32000,
          "maxTokens": 8000,
          "cost": {
            "input": 0.14, "output": 0.28,
            "cacheRead": 0.0028, "cacheWrite": 0
          }
        }
      ]
    }
  }
}
```

Ajoutez dans le `.pi/settings.json` de NÉON des seuils cohérents avec cette petite fenêtre :

```json
{ "compaction": { "reserveTokens": 4000, "keepRecentTokens": 8000 } }
```

Vous disposez alors des deux régimes dans `/model`, le modèle réel à 128K et le même bridé à 32K. Faites travailler l'agent sur plusieurs fichiers avec le second jusqu'au déclenchement, lisez le résumé produit, puis vérifiez dans `\tree` où la coupure a eu lieu et si l'agent sait encore ce qu'on lui avait demandé au départ.
:::

Le détour par cette entrée bridée enseigne autant que la démonstration elle-même, puisque Pi compacte à 32 000 tokens non pas parce que le modèle sature, mais parce que vous le lui avez déclaré. La fenêtre que connaît un harnais est une ligne de configuration plutôt qu'une propriété du modèle, ce qui vous servira le jour où un agent se mettra à compacter trop tôt sans raison apparente.
### Une expérience plus complète

#### Le dispositif

Nous allons étudier un peu plus finement l'influence des différentes parties du contexte en lançant des sessions Pi avec un ensemble de répétitions pour essayer de voir la convergence des résultats.

Pour ce faire, nous allons utiliser [trysquare](https://github.com/AI-for-dev/trysquare), un outil écrit en Python et spécialement conçu pour cette formation. Il lance les configurations d'un scénario, note chaque exécution, agrège, et offre une synthèse des résultats. Il ne sait rien de NÉON, rien de l'issue #1, rien de cette formation.

`scripts/trysquare-campaign/` est le répertoire contenant l'expérience. En voici son contenu :

```
scripts/trysquare-campaign/
  trysquare.toml     chemins machine : où est NÉON, où vivent les clones jetables
  scenarios/         une expérience = un fichier TOML autonome
  hypotheses/        ce qui est prédit, écrit avant de mesurer
  briques/           tickets, AGENTS.md, prompt système, compétences : le matériau
  validateurs/       ce qui note
  results/           une matrice par répertoire
```

Nous ne rentrerons pas dans les détails de conception et d'usage. Vous pouvez vous reporter à la documentation : https://ai-for-dev.github.io/trysquare/.

Nous vous donnons ici juste les informations suffisantes pour cette formation. Dans le répertoire `scenarios`, vous avez la description des expériences. Dans chacune d'elles, vous y trouverez le modèle utilisé (celui que vous trouvez dans Pi) et le nombre de répétitions. Vous y trouverez également les différents cas que comportent l'expérience ainsi que les tests de validation.

#### Le plan d'expérience

Le plan retenu est le plus simple qui reste lisible : une **base**, puis un ensemble de variantes effectuant des micro changements.

La base, appelée `nothing`, reproduit ce que fait quelqu'un le premier jour : la demande négligée, pas de fichier de règles, le prompt système de l'agent. Nous allons juste un peu plus loin en ne mettant pas de raisonnement. Il contient le prompt qui vous a été fourni un peu plus haut lors de vos premiers tests. Chaque autre cas ne fait qu'ajouter des éléments afin de voir l'impact sur la réponse.

| cas                              | ce qui change                                                   |
| -------------------------------- | --------------------------------------------------------------- |
| `nothing`                        | rien, c'est la référence                                        |
| `+thinking`                      | `thinking = "high"`                                             |
| `+agents`                        | `brick/AGENTS.md` est déposé dans le clone                      |
| `+well_crafted`                  | le prompt décrit proprement le problème et se réfère à ISSUE.md |
| `-system_prompt`                 | le prompt système est remplacé par trois lignes                 |
| `+agents+well_crafted`           | `AGENTS.md` + prompt bien écrit                                 |
| `+agents+add_tests+well_crafted` | on ajoute en plus ici les tests que l'on souhaite voir passer   |

Une expérience tient dans un fichier : `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

Lorsque vous regarderez les résultats dans le répertoire de l'expérience, vous y verrez d'autres cas que dans le tableau ci-dessus. Ils appartiennent à d'autres modules. Nous en discuterons donc plus tard.

**Le prompt bien écrit ne recopie pas le mécanisme.** `ISSUES.md` décrit déjà comment corriger le bug, dans le dépôt que l'agent a sous la main. Le prompt nomme l'issue, le périmètre et le critère d'arrêt, et rien de plus :

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Ce qui est mesuré est donc « **pointer un matériau écrit suffit-il à ce qu'il soit lu** », et non « un agent sait-il suivre une consigne qu'on vient de lui donner ». Un prompt qui dicte la solution transforme le critère en test d'obéissance.

#### Les tests de validation

Afin de juger de la qualité des résultats, nous devons définir un certain nombre de tests de validation. Nous en faisons la liste ici en ajoutant leur description.

- **delivered**: le test a fonctionné jusqu'au bout et il n'y a pas eu d'interruption.
- **suite_lancee**: l'agent a pensé à lancer les tests qui se trouvent dans le répertoire `game`.
- **in_scope**: l'agent n'a modifié que les fichiers qu'on lui a demandé de modifier et que les lignes qui correspondent au problème.
- **tests_ajoutes**: l'agent a pensé à ajouter des tests pour tester les rebonds de la balle avec les briques.
- **`sonde.test.js`**: à la fin des modifications, nous exécuterons des tests pour vérifier que les modifications apportées dans le code répondent bien à la correction du problème dans sa globalité comme décrit dans `ISSUE.md`. Cette sonde sera également utilisée dans le cas `+add_tests` où dans ce cas, les tests seront directement accessibles dès le début. Le but est de voir si l'agent est en mesure de réparer ses erreurs en fonction des tests.

#### Les traces

Durant le déroulé de l'expérience, nous sauvegardons un certain nombre de traces afin d'analyser un peu plus finement ce qui s'est passé lors du post-traitement. 

Pour chaque run, vous avez accès à 

- un export de la session Pi au format JSONL qu'il est possible de repasser au format html (nous en parlerons un peu plus tard)
- un répertoire `validation` qui mentionne l'état des tests de validation
- un fichier `configuration.json` qui vous rappelle le cadre du run (modèle, harnais, tests...) 
- un patch (`diff.patch`) qui vous dit ce qui a été modifié dans le code NEON durant ce run

A la fin de l'expérience, vous avez accès à une synthèse au format html et markdown qui vous donne les réussites des validations pour chacun des cas ainsi que des moyennes sur les coûts en token et la durée des runs.

---
Il faut reprendre à partir de là

#### Combien de répétitions, et pourquoi

Chaque cellule est exécutée plusieurs fois, pour une raison qui se voit mieux sur la cellule la plus sage de la matrice que sur la plus agitée.

Voici six exécutions consécutives de `nothing`, strictement identiques : même modèle, même effort, même prompt, même dépôt au même tag.

| exécution       | 1      | 2      | 3       | 4       | 5       | 6      |
| --------------- | ------ | ------ | ------- | ------- | ------- | ------ |
| tokens d'entrée | 12 467 | 12 490 | 12 606  | 12 577  | 12 483  | 12 600 |
| tours           | 4      | 4      | 4       | 4       | 4       | 4      |
| critère atteint | oui    | oui    | **non** | **non** | **non** | oui    |

Sur ces six-là, le coût ne bouge pas d'un pour cent, le nombre de tours ne bouge pas du tout, et la réponse change plus d'une fois sur trois. Une exécution unique de cette cellule vous aurait donné, selon le tirage, « la base corrige le bug » ou « la base ne le corrige pas ».

La cellule la mieux outillée fait l'inverse : elle atteint le critère vingt fois sur vingt et sa dispersion se déplace sur le coût. Sur `pile soignée`, les tokens d'entrée vont de 77 033 à 492 150, soit une étendue de **×6,39**, et trois exécutions consécutives donnent 103 014, 263 203 puis 77 033.

Un agent n'est pas déterministe, et l'écart entre deux exécutions d'une même configuration est du même ordre de grandeur que l'effet de la plupart des leviers. Une exécution unique par cellule mesure le tirage, pas le levier.

L'outil en tire une conséquence qu'il applique lui-même : il ne publie **jamais un chiffre unique**. Chaque médiane vient avec un intervalle à 95 % obtenu par rééchantillonnage, chaque écart à la base est marqué `*` s'il est établi, c'est-à-dire si son intervalle exclut zéro, et `o` s'il ne l'est pas. Les `o` sont affichés quand même, avec cette phrase dans chaque table : *aucune phrase ne peut reposer sur un `o`*.

Le nombre de répétitions reste un paramètre, parce que le bon choix dépend de ce que vous cherchez. **Trois suffisent à voir la dispersion**, ce qui est l'objectif en salle. **Départager deux leviers proches en demande beaucoup plus**, et les colonnes qui comptent des succès sont les plus gourmandes : un 2/3 contre 3/3 ne veut à peu près rien dire, là où un 8/20 contre 20/20 se défend. Les tableaux publiés plus bas sont à vingt répétitions pour cette raison.

::: info Exercice (en salle, puis en autonomie)
Commencez par le plan complet, qui ne dépense rien :

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

La config est prise dans le `trysquare.toml` le plus proche, donc celui de l'établi tant que vous lancez depuis ce répertoire.

Puis lancez la matrice à trois répétitions et laissez-la tourner pendant que vous discutez des curseurs :

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

Les sous-commandes qui ne dépensent rien passent directement, et elles servent après coup :

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**En autonomie**, copiez `scenarios/issue1-contexte.toml`, changez un cas, et relancez. Vous n'aurez touché ni l'outil, ni le validateur, ni les autres cas, et c'est le seul artefact de ce module qui ne périmera pas.
:::

#### Nos mesures

Voici ce que nous avons obtenu en août 2026, sur `ilaas` et `gemma-4-31b`, contre le tag `etalon-v1` de NÉON, avec **vingt répétitions par cellule**.

`delivered` et `in_scope` valent 20/20 partout : chaque exécution a modifié au moins un fichier, et aucune n'est sortie de `game/neon.js` et `game/neon.test.js`. Le reste :

| cellule           | `suite_lancee` | `tests_ajoutes` | `rebond_briques` | `rebond_angles` |
| ----------------- | -------------- | --------------- | ---------------- | --------------- |
| `rien`            | 0/20           | 0/20            | 12/20            | **0/20**        |
| `+thinking`       | 7/20           | 4/20            | 19/20            | **0/20**        |
| `+règle`          | 12/20          | 0/20            | 11/20            | **0/20**        |
| `+ticket cadré`   | 20/20          | **20/20**       | 18/20            | **0/20**        |
| `-prompt système` | 0/20           | 0/20            | 15/20            | **0/20**        |
| `pile soignée`    | 20/20          | **20/20**       | **20/20**        | **0/20**        |

La colonne `suite_lancee` de ce tableau est **renotée**. La synthèse archivée le jour de la mesure donne 11 et 18 aux deux cellules du milieu, et ces deux valeurs-là sont fausses ; l'encadré « une métrique qui lisait le mauvais fichier », plus haut, raconte pourquoi et comment elles ont été corrigées sans rejouer une seule exécution. Toutes les autres colonnes sont identiques au bit près à ce que la matrice a rendu.

Les quatre colonnes ajoutées après coup, obtenues en renotant les mêmes arbres archivés, avec le critère rappelé en tête pour qu'on puisse les lire contre lui :

| cellule           | briques | sortie | voisines | traversée | raquette |
| ----------------- | ------- | ------ | -------- | --------- | -------- |
| `rien`            | 12/20   | 12/20  | 8/20     | 0/20      | 0/20     |
| `+thinking`       | 19/20   | 18/20  | 17/20    | 0/20      | 0/20     |
| `+règle`          | 11/20   | 7/20   | 6/20     | 0/20      | 0/20     |
| `+ticket cadré`   | 18/20   | 17/20  | 15/20    | 0/20      | 0/20     |
| `-prompt système` | 15/20   | 11/20  | 9/20     | 0/20      | 0/20     |
| `pile soignée`    | 20/20   | 20/20  | 20/20    | 0/20      | 0/20     |

Et ce que chaque cellule a coûté, en médiane :

| cellule           | tokens d'entrée | tokens de sortie | tours | durée |
| ----------------- | --------------- | ---------------- | ----- | ----- |
| `rien`            | 12 545          | 827              | 4     | 18 s  |
| `+thinking`       | 47 390          | 5 548            | 8     | 104 s |
| `+règle`          | 23 694          | 848              | 5     | 18 s  |
| `+ticket cadré`   | 131 208         | 3 800            | 16,5  | 82 s  |
| `-prompt système` | 10 130          | 850              | 4     | 18 s  |
| `pile soignée`    | 147 306         | 7 789            | 13    | 131 s |

Trois écarts au critère sont **établis**, au sens où leur intervalle à 95 % exclut zéro : `+thinking` à +35 points, `+ticket cadré` à +30 points, `pile soignée` à +40 points. Les deux autres cellules ne le sont pas, et rien ne sera affirmé sur elles.

Ce que ces mesures autorisent à dire :

- **Le fichier de règles déplace le procédé, pas le résultat.** `+règle` fait passer `suite_lancee` de 0/20 à 12/20 : l'agent se met à lancer la suite de tests parce qu'une ligne du fichier lui dit comment. Et le critère ne bouge pas, 11/20 contre 12/20, écart non concluant. La cellule avait été conçue comme un témoin, puisque cet `AGENTS.md` ne dit rien de ce ticket, et elle se comporte exactement comme un témoin. Un fichier de règles change ce que l'agent **fait** ; il ne change pas ce qu'il **trouve**.
- **Le ticket cadré fait lire le ticket.** `tests_ajoutes` passe de 0/20 à 20/20, et le critère gagne 30 points. Le prompt n'a pourtant rien dit du mécanisme du rebond : il a nommé l'issue. C'est `ISSUES.md` qui demande les cas limites « d'abord en tests rouges », et vingt exécutions sur vingt sont allées le lire. Pointer un matériau écrit suffit.
- **Le raisonnement achète le même gain, pour beaucoup moins de contexte.** `+thinking` gagne 35 points sur le critère et `+ticket cadré` 30, deux écarts établis dont les intervalles se recouvrent presque entièrement : rien ne permet de les départager. Ce qui se départage, en revanche, est ce qu'ils coûtent, et là les intervalles ne se touchent pas : **+35 000 tokens d'entrée contre +119 000**. Notez aussi le contraste avec la campagne précédente, où ce même levier n'apportait rien de mesurable. Un levier inefficace sur une tâche peut être le meilleur sur la suivante.
- **Personne ne traite le coin.** `rebond_angles` vaut 0/20 dans les six cellules. Une correction qui compare les deux pénétrations et n'inverse que la plus grande passe les quatre faces et échoue à la diagonale. Aucun levier de ce module ne l'atteint, et la cellule la mieux outillée n'y arrive pas mieux que la base.
- **Personne ne va au-delà du ticket.** `rebond_traversee` et `rebond_raquette` sont noires sur les deux cent quarante exécutions. Ces deux bugs sont bien réels et bien dans le fichier que l'agent a ouvert ; aucun ne demandait de les corriger, aucun ne les a corrigés.

::: danger La même matrice, relancée deux heures plus tard
Nous avons relancé cette matrice le jour même, sans toucher au scénario. Les empreintes de configuration des six cellules sont identiques d'une archive à l'autre, ce qui se vérifie dans les deux `state.json`. Voici les deux critères côte à côte :

| cellule           | première matrice | seconde matrice |
| ----------------- | ---------------- | --------------- |
| `rien`            | 12/20            | 18/20           |
| `+thinking`       | 19/20            | 19/20           |
| `+règle`          | 11/20            | 13/20           |
| `+ticket cadré`   | 18/20            | 16/20           |
| `-prompt système` | 15/20            | 11/20           |
| `pile soignée`    | 20/20            | 16/20           |

Et les verdicts, c'est-à-dire l'écart à `rien` avec son intervalle :

| cellule           | première matrice       | seconde matrice        |
| ----------------- | ---------------------- | ---------------------- |
| `+thinking`       | **+35 pts**, établi    | +0 pts, non concluant  |
| `+ticket cadré`   | **+30 pts**, établi    | -11 pts, non concluant |
| `pile soignée`    | **+40 pts**, établi    | -11 pts, non concluant |
| `+règle`          | -5 pts, non concluant  | **-30 pts**, établi    |
| `-prompt système` | +15 pts, non concluant | **-37 pts**, établi    |

Tout ce qui était établi a disparu, et ce qui apparaît à la place est négatif. À ce stade, la lecture honnête serait qu'on ne peut rien mesurer.

**Sauf que l'archive dit pourquoi.** Une colonne que nous n'avions pas regardée compte les reprises, c'est-à-dire les tours que l'outil a dû relancer parce que le fournisseur avait échoué. Elle vaut **zéro** dans les six cellules de la première matrice. Elle vaut **466** dans les six mêmes cellules de la seconde, dont 170 sur la seule cellule `+ticket cadré`.

Une reprise n'est pas une ligne comptable. Elle rejoue le tour avec tout le contexte accumulé, donc elle gonfle les colonnes de coût, et surtout elle re-pilote l'agent : ce n'est plus la même conduite de travail. La seconde matrice ne mesure pas une configuration, elle mesure une soirée où le fournisseur allait mal.

Trois choses à en retenir.

D'abord que **la première matrice est la citable**, et que ce n'est pas un choix de commodité : le compte de reprises est dans l'archive, il départage seul, et il aurait départagé dans l'autre sens si les chiffres avaient été inversés.

Ensuite que **le compte de reprises est une colonne de résultat**, pas une note de bas de page. Nous ne le regardions pas.

Enfin, et c'est le plus utile, que ce qui a failli devenir une conclusion fausse de plus dans ce module était un incident que l'archive savait nommer. C'est l'argument pour archiver plus que le verdict, et pour regarder ce qu'on a archivé avant de conclure que la mesure est vaine.
:::

Ces chiffres n'ont pas vocation à être crus sur parole ni recopiés dans un an. Relancez la matrice : c'est précisément ce à quoi elle sert, et celle que vous obtiendrez remplacera celle-ci.

::: warning Une hypothèse que nous n'avons pas réussi à établir
Celle-ci vient de la campagne précédente, sur l'issue #2, et elle n'a pas été refaite depuis. Nous la gardons parce que la question qu'elle pose vaut pour n'importe quelle tâche.

Une version antérieure de ce module concluait qu'**aucune** configuration ne traitait la moitié difficile de l'issue #2. Puis `game/bloom.js` est arrivé dans NÉON, la passe de halo qui donne au jeu son aspect néon et qui consomme à elle seule près d'un quart du budget d'une frame, et le chiffre est monté.

Nous avons soupçonné le halo : un fichier entièrement consacré à un calcul par frame mettrait l'agent en tête que la performance existe, avant même qu'il n'ouvre le ticket. L'hypothèse est séduisante, donc nous avons cherché à la casser en remesurant la même cellule sur le dépôt d'origine, le même jour et avec le même modèle.

| dépôt de la cellule la mieux outillée | moitié performance traitée |
| ------------------------------------- | -------------------------- |
| sans le halo                          | 4/20                       |
| avec le halo                          | 10/20                      |

Un écart de 20 % à 50 %, sur vingt exécutions de chaque côté, donne un test exact de Fisher à p ≈ 0,10. **Ce n'est pas concluant.** L'hypothèse survit, elle n'est pas démontrée, et il faudrait plusieurs dizaines d'exécutions de plus pour la départager.

Nous laissons ce résultat non tranché plutôt que de le présenter comme acquis, parce que c'est l'état réel de nos connaissances et parce que la tentation était forte : nous tenions une explication élégante d'un chiffre surprenant, et c'est exactement la situation où on cesse de vérifier.

Ce qui reste mérite d'être retenu comme question : **le contenu du dépôt est peut-être un levier de harnais**, au même titre que le prompt ou le fichier de règles. Vous ne le choisissez pas toujours. L'établi est là pour le savoir sur le vôtre.
:::

Reste que le coin de la brique n'est traité par aucune configuration, et que la plus soignée d'entre elles ne fait pas mieux que la base sur cette colonne-là. Le contexte bien tenu rend l'agent discipliné, complet sur ce que le ticket nomme, et prévisible ; il ne le rend pas exhaustif. Obtenir l'exhaustivité demandera un relecteur indépendant et une boucle de vérification, ce qui est le sujet des modules sur la délégation et les workflows.

::: warning Le cimetière
Ce module a publié, au fil de ses versions, huit affirmations qui se sont révélées fausses. Les voici, parce qu'une liste d'erreurs est plus instructive qu'une liste de résultats.

**À trois répétitions**, nous écrivions que la consigne « une tâche = un ticket » tenait mieux dans le prompt que dans `AGENTS.md`, sur la foi d'un 3/3 contre 2/3. À dix, l'écart s'était évaporé. Nous écrivions aussi que le prompt cadré traitait la moitié difficile deux fois sur trois ; à dix, c'était deux fois sur dix.

**À dix répétitions**, quatre affirmations de plus sont tombées à la relance suivante. `+AGENTS.md` n'était plus la cellule la moins chère ni la plus directe. L'extension `rtk` n'avait plus la plus faible dispersion de la matrice. Priver l'agent du prompt système ne faisait plus tomber son périmètre. Et « aucune configuration ne traite la moitié difficile » était devenu une fois sur deux.

**À vingt répétitions**, sur une autre tâche, deux de plus. « Priver l'agent du prompt système lui coûte des tours » est mort : même médiane que la base, quatre tours. Et « écrire le périmètre supprime les débordements », le résultat que nous donnions comme le mieux établi de tous, n'est plus mesurable sur cette tâche puisque personne ne déborde.

La règle est plus dure que « répétez trois fois » : **un effet qui ne dépasse pas la dispersion de sa propre cellule n'est pas un effet**, c'est une coïncidence qu'on a eu le temps de mettre en forme. Et un effet établi sur une tâche n'est établi que sur cette tâche.
:::

Vous venez de pratiquer une évaluation, au sens où l'on compare des comportements sur une même tâche, avec des répétitions et en sachant la mesure bruitée, là où un test répond par oui ou par non à une question fermée. Le module 3.2 formalisera cette pratique avec des fichiers d'évaluation et un LLM-juge, pour les critères que la sonde de ce module n'aurait pas pu prendre en charge.

### La pile contre la base

Les leviers de ce module coûtent de l'attention et du temps, alors que le modèle s'achète, ce qui pose la question de savoir s'il est plus rentable de soigner son contexte ou de payer plus cher. La seconde moitié de cette question n'est pas mesurée ici, et nous disons plus bas pourquoi. La première l'est, à modèle constant, en mettant face à face les deux cellules extrêmes de la matrice.

::: info Exercice (en salle)
Comparez la cellule `rien`, qui reçoit une demande d'une ligne et rien d'autre, et la cellule `pile soignée`, qui dispose du raisonnement, du ticket cadré et de l'`AGENTS.md`. Regardez d'abord les diffs, puis les colonnes de la sonde, puis seulement à la fin ce que chacune a coûté.
:::

|                   | `rien` | `pile soignée`              |
| ----------------- | ------ | --------------------------- |
| `rebond_briques`  | 12/20  | **20/20**, écart +40 points |
| `rebond_sortie`   | 12/20  | **20/20**                   |
| `rebond_voisines` | 8/20   | **20/20**                   |
| `rebond_angles`   | 0/20   | **0/20**                    |
| `suite_lancee`    | 0/20   | 20/20                       |
| `tests_ajoutes`   | 0/20   | 20/20                       |
| tokens d'entrée   | 12 545 | 147 306, soit ×11,7         |
| durée médiane     | 18 s   | 131 s                       |

Deux lectures, et les deux comptent.

Le harnais soigné atteint **vingt sur vingt** sur un critère où la base plafonne à douze, et la colonne la plus sévère de la sonde passe de 8/20 à 20/20. C'est la thèse d'Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, vérifiée sur sa moitié la plus facile à établir : à modèle rigoureusement constant, le harnais seul fait la différence entre une correction qui marche trois fois sur cinq et une correction qui marche.

Il coûte douze fois plus de contexte et sept fois plus de temps, et **`rebond_angles` reste à zéro**. Soigner le contexte a rendu l'agent discipliné et complet sur ce que le ticket nomme ; cela ne l'a pas rendu exhaustif, et il n'existe dans ce module aucun levier qui y parvienne.

Ce qui n'est pas mesuré ici est l'autre moitié du 2×2, le gros modèle mal outillé. Le modèle est une **constante de scénario** dans trysquare, précisément pour qu'on ne puisse pas le faire varier par inadvertance à l'intérieur d'une matrice, si bien que cette moitié-là est une expérience distincte que `compare` viendrait joindre à celle-ci. Le scénario est écrit, `scenarios/issue1-contexte-pro.toml`, et il n'a pas encore tourné.

Sur l'issue #2, la campagne précédente donnait cette moitié-là au petit modèle bien outillé : douze fois moins cher, aucun débordement sur vingt exécutions contre quatre sur neuf pour le gros modèle négligé. C'était une autre tâche et un autre fournisseur, et nous n'en tirons rien ici. La question mérite d'être reposée à chaque nouvelle génération de modèles, et l'établi est là pour la reposer.

## Généraliser

Six principes survivent à Pi, à `ilaas` et à la version des paquets que vous venez d'installer.

**Ce qui est stable devant, ce qui varie derrière.** Le cache ne fonctionne que sur un préfixe inchangé et coûte cinquante fois moins cher que l'entrée, si bien que toute donnée volatile placée tôt dans le contexte, qu'il s'agisse d'un horodatage, d'un état git ou d'une date, invalide tout ce qui suit.

**Pointer un matériau écrit suffit à ce qu'il soit lu.** Notre ticket cadré ne décrit pas le mécanisme du rebond : il nomme l'issue, le périmètre et le critère d'arrêt. Vingt exécutions sur vingt sont allées lire `ISSUES.md`, y ont trouvé la demande de cas limites en tests rouges, et l'ont exécutée, là où la demande négligée n'en avait obtenu aucune. C'est le levier le plus simple à écrire, et il fonctionne parce que le travail était déjà documenté quelque part. Écrivez ce quelque part.

**Le fichier de règles change ce que l'agent fait, pas ce qu'il trouve.** Il entre dans le contexte à chaque tour, ce qui le rend puissant et coûteux, d'où l'intérêt de le tenir court, de sourcer chaque règle par un échec observé et de le refactorer plutôt que de l'allonger. Nos mesures cadrent précisément ce qu'il achète : la cellule `+règle` fait passer de 0/20 à 12/20 le nombre d'exécutions qui lancent la suite de tests, et laisse le critère de correction rigoureusement inchangé. C'est une check-list de procédé, elle est utile comme telle, et elle ne rendra pas l'agent plus perspicace.

**Un réglage exposé n'est pas un réglage compris.** Entre le drapeau que vous tapez et la requête qui part se trouvent du code et des tables de correspondance, comme le montre `--thinking max`, qui n'atteint pas le modèle que nous utilisons sans que rien ne vous en avertisse. Le corollaire côté mesure est que ce qui décide de l'expérience doit être écrit dans l'expérience : un niveau de raisonnement hérité d'une configuration personnelle a rendu une de nos cellules identique à sa base dans toutes les matrices publiées.

**Un effet qui ne survit pas au rééchantillonnage n'est pas un effet.** La règle n'est pas « répétez trois fois », elle est plus dure : tant que l'intervalle d'un écart contient zéro, il n'y a rien à dire. Nous avons publié huit conclusions fausses dans les versions successives de ce module, chacune tirée d'un échantillon trop petit et chacune démentie en augmentant les répétitions ou en relançant. Et une fois l'écart établi, il ne l'est que sur cette tâche-là : notre meilleur résultat de l'an dernier a cessé d'être mesurable en changeant de ticket.

**Écrivez l'hypothèse avant de mesurer, et versionnez-la.** Une hypothèse rédigée après coup est une conclusion déguisée. La nôtre, `hypotheses/issue1-contexte.md`, contient une prédiction qui s'est révélée fausse, et c'est parce qu'elle était écrite d'avance que nous l'avons publiée comme telle au lieu de la reformuler discrètement en découverte.

## Livrable

Trois pièces, dont les deux premières servent toute la journée et la troisième servira à l'acte 4.

**1. L'`AGENTS.md` de NÉON**, versionné dans le dépôt, sous les 40 lignes, chaque règle justifiée par un échec que vous avez observé.

**2. Le répertoire de matrice** produit par `trysquare run`, avec sa ligne de journal. Le livrable n'est pas un tableau recopié mais l'archive qui permet de le refabriquer : les mesures brutes, les sessions, les diffs, et la révision de l'outil qui a mesuré. Une matrice qu'on ne peut pas renoter est une opinion.

**3. La fiche de décision**, une ligne par levier :

| levier                     | effet mesuré | adopté ? | pourquoi |
| -------------------------- | ------------ | -------- | -------- |
| choix du modèle            |              |          |          |
| effort de raisonnement     |              |          |          |
| ticket cadré               |              |          |          |
| `AGENTS.md`                |              |          |          |
| prompt système             |              |          |          |
| ordonnancement / cache     |              |          |          |
| compaction                 |              |          |          |
| critère exécutable (sonde) |              |          |          |

Cette fiche constitue le premier remplissage réel de la colonne « ton harnais ? » de la table de correspondance, pour la ligne « contexte ». Les cinq modules suivants feront de même pour leur brique, si bien que vous aborderez le capstone avec une table nourrie par l'expérience plutôt qu'avec une page blanche.

::: tip Critère de réussite
Vous savez citer un levier que vous avez mesuré comme sans effet sur NÉON, et dire à quelle condition précise il en aurait un ailleurs.

Notre exemple est `+règle` : le fichier de règles ne déplace pas d'un point le critère de correction, et il deviendrait décisif sur un ticket dont l'échec habituel est de procédé plutôt que de raisonnement. Le vôtre sera différent, et c'est le but. Ce critère demande d'avoir vu les chiffres et d'avoir compris que c'est la tâche qui les détermine, ce qui le rend impossible à satisfaire de mémoire.
:::

## Les pièges

**Conclure d'une seule exécution**, ce qui reste le piège principal et le plus coûteux, puisqu'il produit des convictions durables à partir de bruit.

**Injecter du volatil dans la zone cacheable.** Une date, un `git status` ou un horodatage placé tôt dans le contexte invalide tout le cache qui suit, et vous fait payer au prix fort une économie que vous croyiez acquise.

**Oublier son `AGENTS.md` personnel**, chargé en plus de celui du projet, invisible dans l'interface, et qui fausse toutes vos mesures tant que vous n'utilisez pas `-nc`.

**Croire un drapeau sur parole**, alors que `--thinking max` peut n'avoir aucun effet sans que Pi vous en avertisse.

**Prendre l'absence de saturation pour une absence de problème.** Sur une fenêtre confortable rien ne déborde jamais, ce qui signifie seulement que le signal d'alarme ne sonnera pas et que le coût sera votre seul indicateur.

**Juger sur un motif quand on peut juger sur un comportement.** Chercher dans un diff s'il ressemble à la solution attendue répond à une autre question que « ce diff résout-il le problème », et l'écart entre les deux est là où se logent les faux verts. Cherchez la forme exécutable avant de vous résigner au motif, puis au juge.

**Ne pas compter les reprises.** Une matrice mesurée pendant que le fournisseur échoue et relance ne mesure pas la configuration, et elle en donne l'apparence complète : des tables, des intervalles, des verdicts. C'est la colonne que nous ne regardions pas, et elle a failli nous coûter une conclusion de plus.

## Pour aller plus loin

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), l'étude qui justifie qu'on ne se contente pas de remplir la fenêtre.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sur le glissement du prompt isolé vers l'architecture du contexte.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), dont la thèse est celle que la comparaison de la pile à la base met à l'épreuve.
- [La documentation de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), et en particulier ses pages sur la compaction, les modèles et les réglages.
- [trysquare](https://github.com/AI-for-dev/trysquare), l'outil de mesure utilisé dans ce module, et son guide d'écriture de scénario.
- L'établi de la formation, `scripts/trysquare-campaign/`, avec ses hypothèses écrites avant mesure et ses matrices archivées. C'est le seul endroit où les chiffres de cette page sont vérifiables.
