# Le contexte et la fenêtre : ce qu'on y met, ce que ça coûte

::: tip Objectifs de ce module
- Savoir dire ce qu'il y a réellement dans la fenêtre de contexte, et ce que chaque partie coûte
- Manipuler les leviers qui la remplissent : modèle, effort de raisonnement, prompt, `AGENTS.md`, prompt système
- Monter un dispositif de mesure reproductible et s'en servir pour trancher
- Repartir avec un `AGENTS.md` court et une décision motivée sur chaque levier
:::

La gestion du contexte est la brique dont dépendent toutes les autres, puisqu'un sous-agent sert à ne pas polluer le contexte principal, une mémoire à ne pas le remplir de ce qu'on saurait retrouver, et une permission à ne pas y déverser un fichier qu'on n'aurait pas dû lire. Il faut donc commencer par savoir ce que contient la fenêtre et ce que chaque partie coûte, sans quoi les modules qui suivent ne seront que des recettes appliquées sans être comprises.

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

Deux écarts en ressortent. Le premier sépare les deux modèles, puisque le `pro` coûte 12,4 fois plus cher que le `flash` à tarif nominal. C'est une première façon de se rendre compte qu'un modèle a plus de capacités qu'un autre. Le second écart, bien plus large, sépare l'entrée de la lecture de cache : un facteur **50** sur `flash` et **120** sur `pro`.

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

Comme vous pouvez le constater, cette issue comporte plusieurs subtilités qui vont être difficiles à trouver pour l'agent seul. Il va rapidement voir le problème et proposer de calculer une distance aux côtés de la brique. En fonction du côté tapé, il va inverser une des deux vitesses. Mais le problème au coin, qui est rare mais réel, ou le problème d'une vitesse trop importante qui ferait que la balle traverse la brique sans même la voir, il y a malheureusement très peu de chance qu'il les voie.

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
Si le dispositif travaillait directement dans l'arbre de travail, chaque exécution modifierait le dépôt et la suivante mesurerait ces modifications plutôt que la configuration. L'outil que nous utilisons plus bas clone donc NÉON **à un tag**, `etalon-v1`, dans un répertoire temporaire, à chaque exécution. Sans cette précaution, `main` avance, une salle corrige l'issue #1, et les mesures d'hier ne se comparent plus à celles de demain sans que rien ne le signale.

Cette garde ne suffit pas complètement, car un tag reste un nom que son propriétaire peut déplacer. Nous y reviendrons dans la partie « Généraliser ».
:::

### Les curseurs, à la main

#### Le modèle

::: info Exercice (en salle)
Lancez la même demande sur deux modèles de tailles différentes, celui que vous utilisez d'ordinaire et le plus gros auquel vous avez accès. La demande est volontairement minimale, c'est celle qu'on écrit naturellement le premier jour. Nous l'appellerons « demande négligée » dans la suite de ce module :

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

`pi --help` annonce sept niveaux de raisonnement, de `off` à `max`. C'est un curseur simple à manipuler et il est donc tentant de commencer par lui.

::: info Exercice (en salle)
Lancez la même tâche avec `--thinking minimal`, puis avec `--thinking max`, et comparez les tokens de sortie et la réponse. Vous ne trouverez aucun écart, parce que les deux drapeaux produisent exactement la même requête si vous utilisez le modèle `gemma-4-31b`.

Pour ce modèle, il n'y a que deux modes : le thinking `on` ou `off`.

Refaites la comparaison entre deux niveaux réellement distincts sur votre modèle, par exemple `off` et `high`, et mesurez l'écart.
:::

Le raisonnement a bien un effet quand on le mesure entre deux niveaux réels, et nos mesures plus bas en donneront la taille. La leçon générale porte plutôt sur la confiance à accorder aux réglages : **un réglage exposé par le harnais n'est pas forcément transmis au modèle**, parce qu'entre la configuration que vous tapez et la requête qui part se trouve une table de correspondance écrite par quelqu'un, qui peut être incomplète. Vous rencontrerez cette situation plusieurs fois dans la formation, et régulièrement dans votre travail. Prenez l'habitude de chercher où atterrit une configuration ou un flag avant de lui faire confiance.

### Ce qu'on écrit

#### `AGENTS.md`, le point de configuration globale

Le fichier de règles placé à la racine du dépôt entre dans le contexte à chaque tour, ce qui en fait un bon candidat pour définir le cadre global de notre projet. Quand l'agent se trompe, la réaction naturelle consiste à y ajouter une phrase, puis une autre. Néanmoins, il faut être vigilant, car ajouter à chaque fois une nouvelle ligne a un coût et plus le fichier est grand, moins l'agent verra l'ensemble. De plus, l'amélioration des modèles fera que certaines lignes sont vraies aujourd'hui mais seront obsolètes à une future mise à jour. Il y a un réel travail de refactoring continu ici qu'il est important de faire tout au long de l'évolution de votre projet.

Nous donnerons ici une contrainte forte pour cette formation.

::: danger Budget : 40 lignes
L'`AGENTS.md` de NÉON ne dépassera jamais 40 lignes, du début à la fin de la formation. Chaque module qui voudra y ajouter une règle devra d'abord en retirer une, ou reformuler pour faire tenir les deux en une seule.

Cette contrainte vous oblige à faire le travail de refactoring continu décrit plus haut : chaque règle doit mériter sa place, et un fichier court a beaucoup plus de chances d'être réellement suivi qu'un long guide de style.
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
Créez un `.pi/SYSTEM.md` de trois lignes. C'est la brique que nos mesures déposent dans le clone pour la configuration `-system_prompt` :

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

Cette manipulation montre également que Pi compacte à 32 000 tokens non pas parce que le modèle sature, mais parce que vous le lui avez déclaré. La fenêtre que connaît un harnais est une ligne de configuration et non une propriété du modèle. Ce constat vous servira le jour où un agent se mettra à compacter trop tôt sans raison apparente.

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

Nous vous donnons ici juste les informations suffisantes pour cette formation. Dans le répertoire `scenarios`, vous avez la description des expériences. Dans chacune d'elles, vous y trouverez le modèle utilisé (celui que vous trouvez dans Pi) et le nombre de répétitions. Vous y trouverez également les différentes configurations que comporte l'expérience ainsi que les tests de validation.

#### Le plan d'expérience

Le plan retenu est le plus simple qui reste lisible : une **base**, puis un ensemble de variantes effectuant des micro changements.

La base, appelée `nothing`, reproduit ce que fait quelqu'un le premier jour : la demande négligée, pas de fichier de règles, le prompt système de l'agent. Nous allons juste un peu plus loin en ne mettant pas de raisonnement. Il contient le prompt qui vous a été fourni un peu plus haut lors de vos premiers tests. Chaque autre configuration ne fait qu'ajouter des éléments afin de voir l'impact sur la réponse.

| configuration                    | ce qui change                                                   |
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

Lorsque vous regarderez les résultats dans le répertoire de l'expérience, vous y verrez d'autres configurations que dans le tableau ci-dessus. Ils appartiennent à d'autres modules. Nous en discuterons donc plus tard.

Le prompt bien écrit ne recopie pas le contenu du ticket. `ISSUES.md` décrit déjà comment corriger le bug, dans le dépôt que l'agent a sous la main. Le prompt nomme donc l'issue, le périmètre et le critère d'arrêt, et rien de plus :

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Cette configuration mesure donc si pointer un document écrit suffit à ce que l'agent aille le lire et en tienne compte. Si le prompt recopiait la solution, nous mesurerions uniquement la capacité de l'agent à suivre une consigne qu'on vient de lui donner.

#### Les tests de validation

Afin de juger de la qualité des résultats, nous devons définir un certain nombre de tests de validation. Nous en faisons la liste ici en ajoutant leur description.

- **delivered**: le test a fonctionné jusqu'au bout et il n'y a pas eu d'interruption.
- **suite_lancee**: l'agent a pensé à lancer les tests qui se trouvent dans le répertoire `game`.
- **in_scope**: l'agent n'a modifié que les fichiers qu'on lui a demandé de modifier et que les lignes qui correspondent au problème.
- **tests_ajoutes**: l'agent a pensé à ajouter des tests pour tester les rebonds de la balle avec les briques.
- **`sonde.test.js`**: à la fin des modifications, nous exécuterons des tests pour vérifier que les modifications apportées dans le code répondent bien à la correction du problème dans sa globalité comme décrit dans `ISSUE.md`. Cette sonde sera également utilisée dans la configuration `+add_tests`, où les tests seront directement accessibles dès le début. Le but est de voir si l'agent est en mesure de réparer ses erreurs en fonction des tests.

#### Les traces

Durant le déroulé de l'expérience, nous sauvegardons un certain nombre de traces afin d'analyser un peu plus finement ce qui s'est passé lors du post-traitement.

Pour chaque run, vous avez accès à

- un export de la session Pi au format JSONL qu'il est possible de repasser au format html (nous en parlerons un peu plus tard)
- un répertoire `validation` qui mentionne l'état des tests de validation
- un fichier `configuration.json` qui vous rappelle le cadre du run (modèle, harnais, tests...)
- un patch (`diff.patch`) qui vous dit ce qui a été modifié dans le code NEON durant ce run

A la fin de l'expérience, vous avez accès à une synthèse au format html et markdown qui vous donne les réussites des validations pour chacune des configurations ainsi que des moyennes sur les coûts en token et la durée des runs.

#### Combien de répétitions, et pourquoi

Chaque configuration est exécutée plusieurs fois et la raison se voit déjà très bien sur la configuration de base.

Voici les six premières exécutions de `nothing`, strictement identiques dans leur configuration : même modèle, même effort, même prompt, même dépôt au même commit.

| exécution       | 1      | 2      | 3      | 4       | 5      | 6       |
| --------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| tokens d'entrée | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| tours           | 4      | 5      | 4      | 4       | 5      | 4       |
| durée           | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| critère atteint | oui    | oui    | oui    | **non** | oui    | **non** |

Le coût varie de moins d'un quart, le nombre de tours prend deux valeurs, et la réponse change une fois sur trois. Une exécution unique de cette configuration vous aurait donné, selon le tirage, « la base corrige le bug » ou « la base ne le corrige pas ».

La configuration la mieux outillée déplace sa dispersion sur le coût plutôt que sur la réponse. Sur `+agents+add_tests+well_crafted`, les tokens d'entrée vont de 42 731 à 2 420 677, soit une étendue de **×57**, et trois exécutions consécutives donnent 2 420 677, 2 147 526 puis 594 786.

Un agent n'est pas déterministe, et l'écart entre deux exécutions d'une même configuration est du même ordre de grandeur que l'effet de la plupart des leviers, ce qui fait qu'une exécution unique par configuration mesure le tirage plutôt que le levier.

Face à cette dispersion, trysquare ne publie jamais un chiffre seul. Deux notions suffisent pour lire ses tables.

**Un point est un point de pourcentage de réussite.** `+agents+add_tests+well_crafted` atteint le critère 18 fois sur 20, soit 90 %, et `nothing` 11 fois sur 20, soit 55 % : l'écart vaut **+35 points**. Seules les exécutions valides comptent, celles qui n'ont rien livré étant retirées des deux côtés, ce qui explique qu'un dénominateur puisse être inférieur au nombre de répétitions.

**L'intervalle vient du bootstrap.** On retire au hasard et avec remise vingt exécutions dans chaque groupe, on recalcule l'écart, et on recommence dix mille fois ; les bornes publiées sont les rangs 2,5 % et 97,5 % des dix mille écarts obtenus. Des exécutions qui se ressemblent donnent un intervalle serré, des exécutions dispersées un intervalle large. La graine est écrite dans `trysquare.toml`, donc les bornes se recalculent à l'identique.

Lire un écart revient alors à poser une seule question : **cet intervalle contient-il zéro ?** S'il ne le contient pas, l'écart est marqué `*` et il est **établi**. S'il le contient, il est marqué `o` et n'est **pas concluant**, quelle que soit la valeur au centre.

Les deux cas sont dans la matrice. Les +35 points ci-dessus viennent avec un intervalle de +10 à +60, donc le gain est certainement positif sans qu'on puisse dire s'il vaut dix points ou soixante. La configuration `+well_crafted` affiche +17 points sur ce même critère, mais son intervalle contient zéro : ces exécutions restent compatibles avec un levier qui aide comme avec un levier qui nuit.

Les `o` sont tout de même affichés dans les tables, avec un rappel sous chacune d'elles : aucune conclusion ne peut s'appuyer sur un écart marqué `o`.

Le nombre de répétitions reste un paramètre, parce que le bon choix dépend de ce que vous cherchez. **Trois suffisent à voir la dispersion**, ce qui est l'objectif en salle. **Départager deux leviers proches en demande beaucoup plus**, et les colonnes qui comptent des succès sont les plus gourmandes : un 2/3 contre 3/3 ne veut à peu près rien dire, là où un 8/20 contre 20/20 se défend. Les tableaux publiés plus bas sont à vingt répétitions pour cette raison.

::: info Exercice (en salle, puis en autonomie)
Commencez par le plan complet, qui ne dépense rien :

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

La config est prise dans le `trysquare.toml` le plus proche, donc celui de `scripts/trysquare-campaign/` tant que vous lancez depuis ce répertoire.

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

**En autonomie**, copiez `scenarios/issue1-contexte.toml`, changez une configuration, et relancez. Vous n'aurez touché ni l'outil, ni le validateur, ni les autres configurations, et c'est le seul artefact de ce module qui ne périmera pas.
:::

#### Nos mesures

Vous avez dû vous en rendre compte lors de vos premiers essais avec `trysquare` : faire des mesures prend du temps. Pour une vingtaine de répétitions, il vous faudra entre 2h et 3h pour avoir l'ensemble des résultats avec ceux du module suivant. Nous avons donc préféré vous donner une campagne complète réalisée en amont dans laquelle vous pouvez naviguer dans les répertoires de chaque exécution comme vous l'avez fait précédemment.

Voici ce que nous avons obtenu en août 2026, sur `ilaas` et `gemma-4-31b`, contre le commit `d62ccd1f` de NÉON, avec **vingt répétitions par configuration**. Les deux configurations à compétence figurent dans l'archive et appartiennent au module suivant ; elles sont écartées des tables ci-dessous, à l'exception d'une remarque à la fin.

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

Les dénominateurs de `+well_crafted` et `+thinking` valent 18 et 19 dans les colonnes de coût, parce qu'ILaaS a rendu des `Request timed out` pendant la mesure et que les exécutions concernées n'ont rien produit à noter.

Nous tirons cinq enseignements de ces deux tables, et le dernier fera la transition avec le module suivant. Tous les écarts cités plus bas viennent des intervalles décrits plus haut, avec la même marque `*` pour un écart établi et `o` pour un écart non concluant. Les comparaisons qui ne se prennent pas contre `nothing` sont obtenues en rejouant le calcul contre une autre référence, ce qui ne coûte rien et ne remesure rien. La colonne du verdict portant sur la seule métrique déclarée par `[verdict].criterion`, lire un écart sur une autre colonne demande de changer cette ligne du scénario avant de rendre :

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

La sortie va dans un `synthesis_ref-<référence>.md` à côté de la synthèse habituelle, qui n'est pas touchée.

**Le prompt cadré fait faire tout ce que le ticket nomme, et rien de plus.** `tests_ajoutes` passe de 0/20 à 17/20 et `rebond_angles` de 0/20 à 14/20, deux colonnes qui étaient vides et qui se remplissent. Le prompt ne dit pourtant rien du mécanisme du rebond : il nomme l'issue, le périmètre et le critère d'arrêt, et c'est `ISSUES.md` qui décrit le coin, la sortie du rectangle, la couture de la grille et le tunneling. Le coin reste à **0/20 dans les quatre configurations qui ne cadrent pas le ticket**, soit quatre-vingts exécutions consécutives. Pointer un document écrit suffit donc à ce qu'il soit lu, et c'est le contenu de ce document qui décide de ce qui sera traité.

**Le fichier de règles ne déplace que le procédé, et il ne déplace plus rien dès que le ticket est correct.** `+agents` fait passer `suite_lancee` de 0/20 à 20/20, parce qu'une de ses quatre lignes nomme la commande. Sur le critère il donne 9/20 contre 11/20 à la base, écart non concluant, et sur `tests_ajoutes` il reste à 0/20 puisqu'aucune de ses lignes ne parle de tests. Ajouté par-dessus le prompt cadré il n'apporte **strictement rien** : 11/20 contre 13/20 sur le critère, 12/20 contre 14/20 sur le coin, 17/20 contre 17/20 sur les tests ajoutés, aucun de ces trois écarts n'étant distinguable de zéro. Le fichier de règles est un substitut du bon ticket plutôt qu'un complément, ce qui donne une règle d'écriture directement applicable au budget de quarante lignes : une ligne qu'un ticket correct dirait de toute façon est une ligne à retirer.

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

`sonde_intacte` vaut 20/20 ce qui veut dire que le modèle n'a pas essayé de changer les tests de référence. Et `tests_ajoutes` ne bouge pas, ce qui est cohérent avec un agent qui a déjà les cas sous les yeux et n'a aucune raison de les réécrire.

::: warning Aucune colonne de coût gemma n'est citable ici
La matrice compte 1 151 reprises, c'est-à-dire de tours relancés parce que le fournisseur avait échoué, et l'encadré plus bas montre à quel point elles sont concentrées sur les configurations les plus lourdes. Une reprise rejoue le tour avec tout le contexte accumulé, donc elle gonfle les colonnes de coût et surtout elle re-pilote l'agent.

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

Les tokens d'entrée des deux matrices ne se mettent pas dans le même tableau, pour une raison qui n'a rien à voir avec le modèle : ILaaS ne rapporte aucun cache, `cacheRead` valant zéro sur ses cent quatre-vingts exécutions, si bien que sa colonne d'entrée est la somme des préfixes complets relus à chaque tour. opencode Zen rapporte le cache, jusqu'à cinq millions de tokens lus sur une seule exécution. La même configuration affiche donc 558 000 tokens d'entrée d'un côté et 15 000 de l'autre sans qu'aucun des deux ne soit faux. C'est la moitié pratique de ce que la première partie de ce module explique sur le cache : le coût des entrées dépend de la configuration du fournisseur de modèle et l'activation du cache permet de réduire drastiquement la note.
:::

#### Trois vérifications avant de citer une table

Une matrice publie des tables, des intervalles et des verdicts, ce qui peut donner l'impression de conclusions solides. Néanmoins, lors de l'élaboration de cette formation, nous avons fait face à plusieurs phénomènes qui peuvent discréditer certains résultats.

::: warning Le compte de reprises
Une reprise est un tour que l'outil a dû relancer parce que le fournisseur avait échoué. Elle rejoue ce tour avec tout le contexte accumulé, donc elle gonfle les colonnes de coût, et surtout, elle re-pilote l'agent : ce n'est plus la même conduite de travail.

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
Une colonne uniformément noire ressemble à un comportement de l'agent et peut être un défaut du validateur. Le seul moyen de les distinguer est que la métrique dise **pourquoi** elle a répondu faux, et non seulement qu'elle a répondu faux.

Notre validateur le fait pour `suite_lancee` : quand il ne reconnaît aucun lancement de la suite, il recopie dans sa raison toutes les commandes que l'agent a passées. Cette précaution est importante, parce que la forme de la commande varie d'un modèle à l'autre bien plus que la commande elle-même. `deepseek-v4-flash` préfixe chaque appel du répertoire de travail (`cd .../repo && npm test`, 664 fois sur la matrice) et redirige volontiers la sortie (`npm test 2>&1 | tail -30`, 80 fois), là où `gemma-4-31b` tape `npm test` nu. Un test de validation qui ne connaîtrait que la dernière forme noterait le premier modèle à zéro sur toute la matrice.

En conclusion, **écrivez vos métriques avec précaution et éprouvez-les sur un ensemble de tests**. Il faut qu'elles soient fiables. Notez tout comportement étrange avant d'en tirer des conclusions hâtives.
:::

::: warning Ce que la comparaison des deux modèles permet de dire, et ce qu'elle ne permet pas
Les deux matrices (`gemma-4-31b` et `deepseek-v4-flash`) portent sur le même scénario, les mêmes neuf configurations et le même commit de NÉON, si bien que leurs colonnes de score se lisent l'une contre l'autre. Le modèle et le fournisseur ont changé ensemble, ce qui interdit d'attribuer un écart à l'un plutôt qu'à l'autre, et laisse quand même voir ceci sur la colonne du coin :

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

Vous venez de pratiquer une évaluation, au sens où l'on compare des comportements sur une même tâche, avec des répétitions et en sachant la mesure bruitée, là où un test répond par oui ou par non à une question fermée. Le module 3.2 formalisera cette pratique avec des fichiers d'évaluation et un LLM-juge, pour les critères que la sonde de ce module n'aurait pas pu prendre en charge.

### La pile contre la base

Les leviers de ce module demandent de l'attention et du temps, alors qu'un modèle plus capable s'obtient simplement en payant plus cher. Il est donc légitime de se demander s'il est plus rentable de soigner son contexte ou de changer de modèle. La seconde moitié de cette question n'est pas mesurée ici, et nous disons plus bas pourquoi. La première l'est, à modèle constant, en mettant face à face les deux configurations extrêmes de la matrice.

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

Le coin passe de 0/20 à 18/20, et le prompt cadré seul en obtenait déjà quatorze: l'essentiel du gain vient du fait que le prompt fait référence à un ticket dans `ISSUES.md` qui nomme le cas, et la sonde ajoute par-dessus la persévérance qui manquait pour finir le travail.

### Ce que ce module ne sait pas obtenir

Le seul levier qui ait amené le modèle à traiter l'ensemble de ce que le ticket demande est celui qui lui a mis les tests sous les yeux. Cette configuration a cependant quelque chose d'artificiel : les cas limites étaient écrits d'avance, par nous, dans le fichier même qui note. Sur un vrai ticket, personne ne vous les fournira.

Ce que cette configuration apporte en réalité, c'est de la persévérance. Le modèle décroche sur un ticket long parce qu'il épuise son budget à formuler les cas au lieu de les corriger ; recevoir les cas déjà formulés lui rend ce budget. La question du module suivant est donc de savoir si une **compétence**, c'est-à-dire une procédure de travail écrite une fois et rechargée à la demande, peut produire la même persévérance sans fournir les tests.


## Généraliser

Huit principes de ce module restent valables au-delà de Pi, d'`ilaas` et de la version des paquets que vous venez d'installer.

**Ce qui est stable devant, ce qui varie derrière.** Le cache ne fonctionne que sur un préfixe inchangé et coûte cinquante fois moins cher que l'entrée, si bien que toute donnée volatile placée tôt dans le contexte, qu'il s'agisse d'un horodatage, d'un état git ou d'une date, invalide tout ce qui suit.

**Pointer un document écrit suffit à ce qu'il soit lu, et ce qui y est écrit décide du résultat.** Notre ticket cadré ne décrit pas le mécanisme du rebond : il nomme l'issue, le périmètre et le critère d'arrêt. Dix-sept exécutions sur vingt sont allées lire `ISSUES.md`, y ont trouvé la demande de cas limites en tests rouges, et l'ont exécutée, là où la demande négligée n'en avait obtenu aucune. Le coin de la brique en donne la version la plus nette : il est décrit dans `ISSUES.md` et dans aucun de nos prompts, et il vaut 0/20 dans les quatre configurations qui ne nomment pas l'issue contre 14/20 dans celle qui la nomme. Écrivez ce que vous attendez dans un document que vous pouvez pointer, et relisez ce document avant de conclure quoi que ce soit sur l'agent.

**Un modèle a un budget, et décrire plus de travail ne l'agrandit pas.** Notre ticket énumère cinq sous-cas et demande un test rouge pour chacun ; quatre exécutions sur vingt écrivent ces tests rouges et n'ouvrent jamais le fichier source. Ce constat conditionne la suite : soit vous réduisez la demande à ce que le modèle peut porter, soit vous lui donnez de quoi tenir la distance, ce qui est le sujet du module suivant.

**Le fichier de règles change ce que l'agent fait, pas ce qu'il trouve, et il ne sert que sur ce que le ticket ne dit pas.** Il entre dans le contexte à chaque tour, ce qui le rend puissant et coûteux, d'où l'intérêt de le tenir court, de sourcer chaque règle par un échec observé et de le refactorer plutôt que de l'allonger. Nos mesures cadrent précisément ce qu'il achète : la configuration `+agents` fait passer de 0/20 à 20/20 le nombre d'exécutions qui lancent la suite de tests, laisse le critère de correction inchangé, et n'apporte plus rien du tout dès que le prompt cadré est là. La règle d'écriture qui en découle est directement applicable au budget de quarante lignes : une ligne qu'un ticket correct dirait de toute façon est une ligne à retirer.

**Un réglage exposé par le harnais n'est pas forcément transmis au modèle.** Entre le drapeau que vous tapez et la requête qui part se trouvent du code et des tables de correspondance, comme le montre `--thinking max`, qui n'atteint pas le modèle que nous utilisons sans que rien ne vous en avertisse. Le corollaire côté mesure est que ce qui décide de l'expérience doit être écrit dans l'expérience : un niveau de raisonnement hérité d'une configuration personnelle a rendu une de nos configurations identique à sa base dans toutes les matrices publiées.

**Un effet qui ne survit pas au rééchantillonnage n'est pas un effet.** Répéter trois fois ne suffit pas : tant que l'intervalle d'un écart contient zéro, il n'y a rien à en dire. Sur les neuf configurations mesurées ici, trois seulement déplacent le critère de correction de façon établie, alors que les six autres affichent chacune un chiffre qui pourrait sembler convaincant. Un écart établi ne l'est par ailleurs que sur cette tâche, avec ce ticket et ce modèle.

**Ce qui est mesuré doit être épinglé par ce qui ne bouge pas.** Un tag est un nom, et `git tag -f` le déplace sans laisser de trace du côté de la mesure, si bien que deux matrices peuvent déclarer le même étalon et avoir travaillé sur deux versions différentes du code. Épinglez par le commit, qui ne bouge pas, et si votre outil ne le permet pas encore, archivez au moins ce que le nom a résolu au moment de la mesure.

**Une métrique doit dire pourquoi, pas seulement quoi.** Une colonne uniformément noire ressemble à un comportement de l'agent et peut être un défaut du validateur, et rien ne distingue les deux tant que la métrique se contente de répondre vrai ou faux. Faites-lui écrire ce sur quoi elle s'est prononcée : la nôtre recopie, sous chaque faux, les commandes que l'agent a passées, et c'est ce qui permet de vérifier un zéro au lieu de le croire sur parole.

**Écrivez l'hypothèse avant de mesurer, et versionnez-la.** Une hypothèse rédigée après les mesures n'est qu'une conclusion déguisée. La nôtre, `hypotheses/issue1-contexte.md`, contient une prédiction qui s'est révélée fausse, et c'est parce qu'elle était écrite d'avance que nous l'avons publiée comme telle au lieu de la reformuler après coup en découverte.

## Livrable

Trois pièces, dont les deux premières servent toute la journée et la troisième servira à l'acte 4.

**1. L'`AGENTS.md` de NÉON**, versionné dans le dépôt, sous les 40 lignes, chaque règle justifiée par un échec que vous avez observé.

**2. Le répertoire de matrice** produit par `trysquare run`, avec sa ligne de journal. Le livrable n'est pas un tableau recopié mais l'archive qui permet de le refabriquer : les mesures brutes, les sessions, les diffs, et la révision de l'outil qui a mesuré. Sans cette archive, la matrice ne peut être ni vérifiée ni renotée, et ses chiffres ne valent pas mieux qu'une opinion.

**3. La fiche de décision**, une ligne par levier :

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

Cette fiche constitue le premier remplissage réel de la colonne « ton harnais ? » de la table de correspondance, pour la ligne « contexte ». Les cinq modules suivants feront de même pour leur brique, si bien que vous aborderez le capstone avec une table déjà remplie par vos expériences.

::: tip Critère de réussite
Vous savez citer un levier que vous avez mesuré comme sans effet sur NÉON, et dire à quelle condition précise il en aurait un ailleurs.

Notre exemple est `AGENTS.md` : il ne déplace pas d'un point le critère de correction, et il deviendrait décisif sur un ticket dont l'échec habituel est de procédé plutôt que de raisonnement, ou sur un dépôt dont les tickets sont mal écrits. Le vôtre sera différent, et c'est le but. Ce critère demande d'avoir vu les chiffres et d'avoir compris que c'est la tâche et son matériau qui les déterminent. Il ne peut donc pas être satisfait de mémoire.
:::

## Les pièges

**Conclure d'une seule exécution**, ce qui reste le piège principal et le plus coûteux, puisqu'il produit des convictions durables à partir de bruit.

**Injecter du volatil dans la zone cacheable.** Une date, un `git status` ou un horodatage placé tôt dans le contexte invalide tout le cache qui suit, et vous fait payer au prix fort une économie que vous croyiez acquise.

**Oublier son `AGENTS.md` personnel**, chargé en plus de celui du projet, invisible dans l'interface, et qui fausse toutes vos mesures tant que vous n'utilisez pas `-nc`.

**Croire un drapeau sur parole**, alors que `--thinking max` peut n'avoir aucun effet sans que Pi vous en avertisse.

**Prendre l'absence de saturation pour une absence de problème.** Sur une fenêtre confortable rien ne déborde jamais, ce qui signifie seulement que le signal d'alarme ne sonnera pas et que le coût sera votre seul indicateur.

**Juger sur un motif quand on peut juger sur un comportement.** Chercher dans un diff s'il ressemble à la solution attendue répond à une autre question que « ce diff résout-il le problème », et c'est dans cet écart que se logent les faux verts. Cherchez la forme exécutable avant de vous résigner au motif, puis au juge.

**Ne pas compter les reprises.** Une matrice mesurée pendant que le fournisseur échoue et relance ne mesure pas la configuration, et elle en donne l'apparence complète : des tables, des intervalles, des verdicts. Le compte de reprises doit donc se lire comme une colonne de résultat à part entière.

**Croire une colonne uniformément noire.** Zéro sur toutes les configurations ressemble à un comportement du modèle et peut être un comparateur trop strict, comme celui qui refusait `cd /tmp/x && npm test` parce qu'il ne connaissait que `npm test`. Vérifiez la raison attachée à un faux avant d'en tirer une conclusion.

**Faire confiance à un tag.** Il se déplace, et rien dans une table ne le dira. Le seul moyen de le savoir après coup est le commit archivé par exécution, et le seul moyen de l'éviter est d'épingler par ce commit.

**Comparer des coûts entre deux fournisseurs.** Ils ne comptent pas la même chose : l'un rapporte le cache et l'autre non, si bien que la colonne « entrée » de l'un est la somme des préfixes complets et celle de l'autre la part qui n'était pas déjà en cache. Le rapport entre les deux ne veut rien dire.

## Pour aller plus loin

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), l'étude qui justifie qu'on ne se contente pas de remplir la fenêtre.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sur le glissement du prompt isolé vers l'architecture du contexte.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), dont la thèse est celle que la comparaison de la pile à la base met à l'épreuve.
- [La documentation de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), et en particulier ses pages sur la compaction, les modèles et les réglages.
- [trysquare](https://github.com/AI-for-dev/trysquare), l'outil de mesure utilisé dans ce module, et son guide d'écriture de scénario.
- La campagne trysquare de la formation, `scripts/trysquare-campaign/`, avec ses hypothèses écrites avant mesure et ses matrices archivées. C'est le seul endroit où les chiffres de cette page sont vérifiables.
