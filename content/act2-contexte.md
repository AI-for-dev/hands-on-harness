# Le contexte et la fenêtre : ce qu'on y met, ce que ça coûte

::: tip Objectifs de ce module
- Savoir dire ce qu'il y a réellement dans la fenêtre de contexte, et ce que chaque partie coûte
- Manipuler les leviers qui la remplissent : modèle, effort de raisonnement, prompt, `AGENTS.md`, prompt système
- Monter un banc de mesure et s'en servir pour trancher
- Repartir avec un `AGENTS.md` court et une décision motivée sur chaque levier
:::

La gestion du contexte est la brique dont dépendent toutes les autres, puisqu'un sous-agent sert à ne pas polluer le contexte principal, une mémoire à ne pas le remplir de ce qu'on saurait retrouver, et une permission à ne pas y déverser un fichier qu'on n'aurait pas dû lire. Tant que vous ne savez pas ce que contient la fenêtre ni ce que ça coûte, les cinq modules qui suivent resteront des recettes appliquées sans être comprises.

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

### Trois prix, dont un très bas

Un appel au modèle se facture en trois postes, exprimés au million de tokens. Voici les tarifs des deux modèles que nous comparerons tout au long du module :

| modèle              | entrée | sortie | lecture de cache |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $ | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $ | 3,48 $ | 0,0145 $         |

Ces tarifs sont ceux publiés par [opencode Zen](https://opencode.ai/docs/zen/), le service que la formation utilise. Pi les recopie dans `~/.pi/agent/models-store.json`, où le banc de mesure ira les lire.

Deux écarts en ressortent. Le premier sépare les deux modèles, puisque le `pro` coûte 12,4 fois plus cher que le `flash` à tarif nominal. Le second, bien plus large, sépare l'entrée de la lecture de cache : un facteur **50** sur `flash` et **120** sur `pro`.

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
Depuis un script, redirigez l'entrée standard avec `< /dev/null`. En mode non interactif, `pi` attend sur son entrée standard tant qu'elle reste ouverte, ce qui bloque indéfiniment quand il est appelé depuis un outil qui lui fournit un tuyau plutôt qu'un terminal. Le banc de mesure plus bas se heurte au même piège et le traite de la même façon.
:::

Le cache ne fonctionne que sur un **préfixe inchangé**, ce dont découle la règle d'ordonnancement du contexte : tout ce qui varie doit être placé derrière ce qui est stable. Un horodatage ou un `git status` glissé dans le prompt système invalide l'intégralité de ce qui suit, outils, question et historique compris, et vous fait repayer le plein tarif à chaque tour, alors que la même donnée placée dans le message du tour courant ne coûte rien puisqu'elle se trouve déjà dans la zone qui varie.

Retenez aussi que changer de modèle en cours de session n'est pas gratuit, ce qui mérite d'être gardé en tête pendant tout ce module où vous allez beaucoup jongler entre `flash` et `pro`.

## Reconstruire

### La tâche, et ce qui compte comme réussite

Toutes les mesures de ce module portent sur la même tâche, l'**issue #2** de NÉON, où la collision scanne toutes les briques à chaque frame et où son code est mêlé à la boucle de rendu.

Nous l'avons choisie parce qu'elle comporte deux moitiés dont on peut n'accomplir qu'une seule : séparer la logique du rendu est facile, alors qu'arrêter de scanner toutes les briques suppose d'avoir lu le ticket jusqu'au bout. Un agent qui s'arrête à la première moitié rend un diff propre et des tests verts pour un travail à moitié fait, ce qu'un critère trop grossier laisse passer.

Nous retenons quatre critères :

| critère                                                                   | vérifiable mécaniquement ? |
| ------------------------------------------------------------------------- | -------------------------- |
| `npm test` passe                                                          | oui                        |
| aucun export de `game/neon.js` renommé ou supprimé                        | oui                        |
| seul `game/neon.js` est modifié, donc le périmètre du ticket est respecté | oui                        |
| la moitié « performance » du ticket a été traitée                         | **en apparence seulement** |

Les trois premiers se lisent sans ambiguïté dans un code de retour ou une liste de fichiers. Le quatrième, qui décide pourtant si le ticket est traité, ne se laisse pas réduire aussi facilement, et la façon dont il résiste vaut la peine d'être vue en détail.

Notre banc l'approche par un motif : il cherche dans le diff un calcul d'indices de grille, puisque c'est ainsi qu'on attend que la collision cesse de parcourir toutes les briques. Cette approximation nous a trompés deux fois pendant la préparation du module. Elle a d'abord classé comme non traité un diff qui faisait le bon calcul mais nommait ses bornes autrement, ce qui relève du réglage. Elle a surtout été incapable de juger une solution d'une autre forme : un agent a maintenu la liste des briques encore vivantes, ce qui allège le travail à mesure que la partie avance sans rien changer au pire cas, et décider si cela compte comme « traité » demande un avis plutôt qu'un test.

Un motif textuel répond donc à la question « ce diff ressemble-t-il à la solution attendue », alors que la question posée est « ce diff résout-il le problème ». Cet écart est exactement ce que le LLM-juge du module 3.2 vient combler, et c'est pourquoi cette colonne porte une étoile dans les tableaux qui suivent : relisez les diffs qu'elle déclare traités avant de vous y fier.

::: warning Chaque run travaille sur une copie jetable
Un banc qui modifie le dépôt mesure la dernière modification plutôt que la configuration. Le script fourni plus bas recopie NÉON dans un répertoire temporaire à chaque exécution, et vous devez faire de même si vous mesurez à la main.
:::

### Les curseurs, à la main

#### Le modèle

::: info Exercice (en salle)
Lancez la même demande sur `deepseek-v4-flash` puis sur `deepseek-v4-pro` :

```
La collision scanne toutes les briques à chaque frame et son code est mêlé
à la boucle de rendu. Corrige ça.
```

Lisez les deux diffs, puis les deux `/session`. Notez vos observations sans en tirer de conclusion : la section sur les répétitions expliquera pourquoi deux exécutions ne suffisent pas à départager deux modèles.
:::

#### L'effort de raisonnement

`pi --help` annonce sept niveaux de raisonnement, de `off` à `max`, ce qui en fait le curseur le plus immédiatement tentant du harnais.

::: info Exercice (en salle)
Lancez la même tâche avec `--thinking low`, puis avec `--thinking medium`, et comparez les tokens de sortie et la réponse. Vous ne trouverez aucun écart, parce que les deux drapeaux produisent exactement la même requête.

Ouvrez `~/.pi/agent/models-store.json` et cherchez le champ `thinkingLevelMap` du modèle que vous utilisez. Sur `deepseek-v4-flash`, il vaut :

```json
{ "minimal": null, "low": null, "medium": null, "high": "high", "max": "max" }
```

Trois de ces niveaux ne sont associés à rien : Pi accepte le drapeau, ne l'envoie pas, et ne vous prévient pas. Sur la plupart des autres modèles du catalogue, il n'y a aucun `thinkingLevelMap`.

Refaites ensuite la comparaison entre l'absence de drapeau et `--thinking high`, qui correspondent à deux régimes réellement distincts, et mesurez l'écart.
:::

Le raisonnement a bien un effet quand on le mesure entre deux niveaux réels, et cet effet n'est pas toujours dans le sens attendu, comme le montreront les résultats du banc. La leçon générale porte plutôt sur la confiance à accorder aux réglages : **un réglage exposé par le harnais n'est pas un réglage compris par le modèle**, parce qu'entre le drapeau que vous tapez et la requête qui part se trouve une table de correspondance écrite par quelqu'un, qui peut être incomplète. Vous rencontrerez cette situation plusieurs fois dans la formation, et régulièrement dans votre travail, d'où l'habitude à prendre de chercher où atterrit un drapeau avant de le croire.

### Ce qu'on écrit

#### `AGENTS.md`, le point de configuration le plus rentable

Le fichier de règles placé à la racine du dépôt entre dans le contexte à chaque tour, ce qui en fait à la fois le levier le plus efficace du harnais et le plus facile à saboter. Quand l'agent se trompe, la réaction naturelle consiste à y ajouter une phrase, puis une autre, jusqu'à obtenir en quelques semaines un fichier de trois cents lignes que plus personne ne relit et dont l'agent ignore la moitié. Nous prenons donc une contrainte dure, valable pour toute la suite de la formation.

::: danger Budget : 40 lignes
L'`AGENTS.md` de NÉON ne dépassera jamais 40 lignes, du début à la fin de la formation. Chaque module qui voudra y ajouter une règle devra d'abord en retirer une, ou reformuler pour faire tenir les deux en une seule.

Cette contrainte est le seul moyen d'éprouver concrètement la différence entre une check-list de pilote, qu'on lit, et un guide de style, qu'on ignore.
:::

Le fichier ne doit pas reprendre ce que le dépôt dit déjà, puisque les conventions sont dans `CONTRIBUTING.md`, l'architecture dans le `README.md` et l'historique dans git. Il porte les règles que l'agent a effectivement violées. Sur nos quatre exécutions de l'issue #2 sans `AGENTS.md`, deux ont corrigé au passage une autre issue qu'on ne leur demandait pas, trois n'ont traité que la moitié du ticket, et toutes ont dû découvrir seules la commande de test, ce qui fournit trois règles sans avoir à en inventer.

::: info Exercice (en salle)
Écrivez l'`AGENTS.md` de NÉON en partant de vos propres exécutions plutôt que des nôtres : relisez les diffs que vous venez de produire et cherchez ce que l'agent a fait sans qu'on le lui demande, ou omis alors qu'on le lui demandait.

Voici une base de départ, à discuter et à amender :

```markdown
# NÉON

- Une tâche = un ticket. Ne traite pas d'autre issue en passant.
- Ne renomme ni ne supprime un export de `game/neon.js` : les tests en dépendent.
- Zéro dépendance : aucun paquet, aucun CDN.
- Les tests se lancent avec `npm test`.
```

Quatre lignes utilisées, trente-six de marge pour les cinq modules à venir.
:::

::: warning Un `AGENTS.md` peut en cacher un autre
Pi charge ces fichiers en cumulé, à partir de votre `~/.pi/agent/AGENTS.md` personnel, puis de chaque répertoire parent en remontant, puis du répertoire courant. Un fichier de règles personnel s'invite donc dans toutes vos mesures sans que rien ne le signale.

Le drapeau `--no-context-files`, abrégé `-nc`, désactive cette découverte, ce qui est indispensable pour mesurer proprement et ce que fait le banc.
:::

#### Le prompt système

Pi permet de remplacer entièrement son prompt système par un `.pi/SYSTEM.md` à la racine du projet ou un `~/.pi/agent/SYSTEM.md` global. L'option `--system-prompt` obéit à une règle légèrement différente, puisque les fichiers de contexte et les skills continuent d'être ajoutés par-dessus, si bien qu'on ne repart jamais tout à fait d'une page blanche.

::: info Exercice (en autonomie)
Créez un `.pi/SYSTEM.md` de trois lignes :

```
You are a coding assistant working in the current directory.
Use the available tools (read, write, edit, bash) to inspect and modify files.
Answer in the language of the user.
```

Relancez la même tâche et comparez. Notre première mesure, une exécution de chaque côté, donnait ceci :

|                  | prompt système de Pi | prompt système amputé       | rapport  |
| ---------------- | -------------------- | --------------------------- | -------- |
| tours            | 9                    | 26                          | ×2,9     |
| appels d'outils  | 10                   | 27                          | ×2,7     |
| tokens de sortie | 2 551                | 16 162                      | ×6,3     |
| coût             | 0,0025 $             | 0,0087 $                    | **×3,5** |
| durée            | 128 s                | 126 s                       | égal     |
| fichiers touchés | `neon.js`            | `neon.js` et `neon.test.js` | déborde  |

La tâche est menée à bien dans les deux cas, avec des tests verts, le refactor effectué et l'API préservée, ce qui signifie qu'aucune capacité n'a été perdue.
:::

::: warning Ce que trois répétitions ont fait de ce tableau
Le facteur 3,5 sur le coût **n'a pas survécu** aux répétitions. Sur dix exécutions de chaque côté, la médiane de la cellule amputée est de 0,0049 $ contre 0,0050 $ pour la base : l'écart a changé de signe et il est de toute façon très inférieur à la dispersion de chacune des deux cellules.

Ce qui subsiste se lit sur les tours, et c'est tout : le nombre de tours médian passe de 12 à 13,5, le plus haut de la matrice. Privé de ses conventions, l'agent tâtonne davantage. Nous avons aussi écrit qu'il perdait sa tenue, sur la foi d'un périmètre tombé à 4/10 ; à la relance il est à 6/10, c'est-à-dire au-dessus de la base. Cette affirmation-là est morte avec les autres, et l'encadré du cimetière plus bas en tient la liste.

Nous laissons le tableau à une exécution dans la page plutôt que de le retirer, parce que l'erreur qu'il contient est exactement celle contre laquelle la section suivante vous met en garde, et que nous l'avons commise en préparant ce module.
:::

Le prompt système n'ajoute donc aucune capacité, puisque les outils sont déclarés au modèle par leur schéma JSON et non par de la prose, et son influence sur la facture est plus faible que ne le suggérait notre première mesure. Ce qu'il apporte se lit dans la conduite du travail, avec un agent qui tâtonne davantage lorsqu'on le prive de ses conventions. C'est aussi la raison pour laquelle un harnais ne se résume pas à un prompt système bien tourné : celui de Pi tient en 550 tokens, et tout le reste du travail se joue ailleurs.

#### Une fenêtre bridée, pour voir la compaction

Quand le contexte approche de la limite, Pi compacte, c'est-à-dire qu'il résume les messages anciens et ne garde intacts que les plus récents. Le déclenchement suit la règle `contextTokens > contextWindow - reserveTokens`, où `reserveTokens` vaut 16 384 par défaut et représente la place laissée à la réponse. La coupure est visible dans `\tree`, et `/compact` permet de la forcer, avec des instructions optionnelles pour orienter le résumé.

Sur NÉON, la compaction ne se déclenchera jamais, puisque le dépôt fait 617 lignes et que nos modèles annoncent une fenêtre d'un million de tokens, ce qui placerait le seuil à 984 000 tokens. Observer le mécanisme suppose donc de fabriquer la contrainte.

::: info Exercice (en autonomie)
Déclarez dans `~/.pi/agent/models.json` un second provider, pointant sur le même service mais annonçant une fenêtre de 32 000 tokens :

```json
{
  "providers": {
    "banc": {
      "baseUrl": "https://opencode.ai/zen/go/v1",
      "api": "openai-completions",
      "apiKey": "$OPENCODE_API_KEY",
      "models": [
        {
          "id": "deepseek-v4-flash",
          "name": "DeepSeek V4 Flash (fenêtre bridée)",
          "reasoning": true,
          "input": ["text"],
          "contextWindow": 32000,
          "maxTokens": 8000,
          "cost": {
            "input": 0.14, "output": 0.28,
            "cacheRead": 0.0028, "cacheWrite": 0
          },
          "compat": {
            "supportsStore": false,
            "supportsDeveloperRole": false,
            "maxTokensField": "max_tokens",
            "requiresReasoningContentOnAssistantMessages": true,
            "thinkingFormat": "deepseek"
          },
          "thinkingLevelMap": {
            "minimal": null, "low": null, "medium": null,
            "high": "high", "max": "max"
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

Vous disposez alors des deux régimes dans `/model`, le modèle réel à 1M et le même bridé à 32K. Faites travailler l'agent sur plusieurs fichiers avec le second jusqu'au déclenchement, lisez le résumé produit, puis vérifiez dans `\tree` où la coupure a eu lieu et si l'agent sait encore ce qu'on lui avait demandé au départ.
:::

Le détour par ce provider bridé enseigne autant que la démonstration elle-même, puisque Pi compacte à 32 000 tokens non pas parce que le modèle sature mais parce que vous le lui avez déclaré. La fenêtre que connaît un harnais est une ligne de configuration plutôt qu'une propriété du modèle, ce qui vous servira le jour où un agent se mettra à compacter trop tôt sans raison apparente.

### Le banc

#### Le plan d'expérience

Le plan retenu est le plus simple qui reste lisible : une **base**, puis une variable à la fois.

La base reproduit ce que fait quelqu'un qui découvre l'outil, avec le modèle rapide, aucun effort de raisonnement demandé, un prompt vague, pas d'`AGENTS.md`, le prompt système par défaut, la fenêtre normale et aucune extension. Chaque autre cellule ne change qu'une seule chose et se lit comme un écart par rapport à cette base.

| cellule          | ce qui change                                                  |
| ---------------- | -------------------------------------------------------------- |
| base             | rien, c'est la référence                                       |
| `+thinking`      | `--thinking high`                                              |
| `+prompt cadré`  | le prompt dit le périmètre et le critère d'arrêt               |
| `+AGENTS.md`     | le fichier de règles est présent                               |
| `-prompt sys.`   | le prompt système est remplacé par trois lignes                |
| `+rtk`           | l'extension `pi-rtk-optimizer` est chargée                     |
| `pro (négligé)`  | le gros modèle, tout le reste inchangé                         |
| `flash (soigné)` | le petit modèle avec raisonnement, prompt cadré et `AGENTS.md` |

Les deux dernières lignes forment le 2×2 sur lequel se joue la conclusion du module.

Le prompt cadré se distingue du prompt vague par trois ajouts plutôt que par sa longueur : le **périmètre**, qui interdit de toucher aux tests et de traiter une autre issue, les **deux moitiés du travail**, qui demandent explicitement de sortir la collision du rendu et d'arrêter de scanner toutes les briques, et le **critère d'arrêt**, qui dit que le travail est fini quand les tests passent et que les exports ont gardé leur nom. Ce dernier ajout est le plus rentable des trois, puisque la majorité de nos échecs viennent de débordements plutôt que d'erreurs.

#### Combien de répétitions, et pourquoi

Chaque cellule est exécutée plusieurs fois, pour une raison que nous avons découverte à nos dépens. Voici trois exécutions strictement identiques, même modèle, même effort, même prompt, même dépôt :

|      | run a    | run b    | run c    | médiane  | étendue   |
| ---- | -------- | -------- | -------- | -------- | --------- |
| coût | 0,0104 $ | 0,0052 $ | 0,0050 $ | 0,0052 $ | **×2,08** |

Sur dix exécutions de cette même configuration, l'étendue atteint **×4,22**, les tours varient de 7 à 24 et le diff de 34 à 167 lignes insérées. Un agent n'est pas déterministe, et l'écart entre deux exécutions d'une même configuration est du même ordre de grandeur que l'effet de la plupart des leviers, si bien qu'une exécution unique par cellule mesure le bruit plutôt que le levier.

Le banc affiche donc un minimum, une médiane et un maximum, et jamais un chiffre unique, ce qui vous oblige à regarder la dispersion avant de conclure.

Le nombre de répétitions est un paramètre parce que le bon choix dépend de ce que vous cherchez. **Trois suffisent à voir la dispersion**, ce qui est l'objectif en salle et tient en une dizaine de minutes. **Départager deux leviers proches en demande beaucoup plus**, et les colonnes de notation sont les plus exigeantes puisqu'elles comptent des succès : un 2/3 contre 3/3 ne veut à peu près rien dire, là où un 4/10 contre 10/10 se défend. Le tableau de référence publié plus bas est calculé à dix répétitions pour cette raison.

#### Le script

Le voici en entier. Il fonctionne sans dépendance, avec Python 3.9 ou plus, estime son coût avant de partir, relance une fois toute exécution qui se fige, et concentre sa notation dans une fonction unique placée en bas de fichier, qui est le seul endroit à réécrire pour l'appliquer à un autre dépôt que NÉON.

<<<@/../scripts/banc/banc.py{py}

::: info Exercice (en salle, puis en autonomie)
Commencez par l'estimation, qui ne dépense rien :

```bash
python banc.py --dry-run
```

Puis lancez la matrice et laissez-la tourner pendant que vous discutez des curseurs :

```bash
python banc.py
```

Comptez deux à quatre minutes par exécution, soit environ un quart d'heure pour les vingt-quatre en parallèle par quatre. Le résultat est écrit dans `banc-resultats.md`.

Pour ne relancer qu'une cellule, par exemple après avoir modifié votre `AGENTS.md` :

```bash
ONLY='+AGENTS.md' REPEATS=3 python banc.py
```

**En autonomie**, reprenez le script et changez la matrice, avec d'autres modèles, d'autres niveaux de raisonnement ou votre propre dépôt. C'est le seul artefact de ce module qui ne périmera pas.
:::

::: warning Ce que le banc doit prévoir
Une exécution de `pi` peut se figer sans produire un seul octet ni le moindre message d'erreur, ce que nous avons rencontré plusieurs fois pendant la préparation de ce module. Le script prévoit donc un délai maximal par exécution et une seconde tentative, faute de quoi une exécution bloquée empoisonne toute une ligne du tableau.

Dans notre cas, la cause était une entrée standard laissée ouverte, que `subprocess` fournit par défaut et sur laquelle `pi -p` attend indéfiniment. Le commentaire correspondant est dans le script, et le même piège vous guettera si vous appelez `pi` depuis vos propres outils.

Prévoir le délai ne suffit pourtant pas, et nous l'avons appris en perdant une matrice entière. Le chemin de récupération lui-même doit tenir : `subprocess.TimeoutExpired.stdout` renvoie des octets même quand on a demandé du texte, si bien que notre dépouillement levait une exception, que cette exception remontait à travers le pool de threads, et qu'une seule exécution figée faisait perdre les soixante-dix-neuf autres, déjà payées. Le script attrape donc maintenant toute exception par exécution : **une cellule manquante vaut mieux qu'un tableau perdu**.

C'est la règle générale des bancs de mesure coûteux. Le code qui gère l'échec est exécuté rarement, donc il est testé rarement, donc c'est lui qui casse — et il casse au pire moment, quand vous avez déjà dépensé.
:::

#### Nos mesures

Voici ce que nous avons obtenu en juillet 2026, sur `opencode-go`, avec NÉON, en excluant les fichiers de contexte, les skills et les extensions non demandées.

Le tableau ci-dessous est produit avec **dix répétitions par cellule**, soit 80 exécutions, pour 0,92 $ et environ trente-cinq minutes de temps réel. Le banc que vous lancerez en salle est réglé sur trois répétitions, ce qui suffit à voir la dispersion mais pas à départager les écarts modestes.

| cellule          | n   | coût min | médiane      | max      | étendue   | tours méd. | tests | API   | périmètre | perf* |
| ---------------- | --- | -------- | ------------ | -------- | --------- | ---------- | ----- | ----- | --------- | ----- |
| base             | 10  | 0,0036 $ | 0,0050 $     | 0,0152 $ | ×4,22     | 12         | 10/10 | 10/10 | 5/10      | 0/10  |
| `+thinking`      | 10  | 0,0028 $ | 0,0049 $     | 0,0101 $ | ×3,61     | 10,5       | 10/10 | 10/10 | 5/10      | 0/10  |
| `+prompt cadré`  | 10  | 0,0027 $ | 0,0051 $     | 0,0085 $ | ×3,15     | 12,5       | 10/10 | 10/10 | **10/10** | 4/10  |
| `+AGENTS.md`     | 10  | 0,0037 $ | 0,0046 $     | 0,0067 $ | **×1,81** | 10         | 10/10 | 10/10 | 8/10      | 0/10  |
| `-prompt sys.`   | 10  | 0,0037 $ | 0,0049 $     | 0,0132 $ | ×3,57     | **13,5**   | 10/10 | 10/10 | 6/10      | 1/10  |
| `+rtk`           | 10  | 0,0033 $ | **0,0044 $** | 0,0078 $ | ×2,36     | 11         | 10/10 | 10/10 | 7/10      | 0/10  |
| `pro (négligé)`  | 9   | 0,0451 $ | 0,0556 $     | 0,0887 $ | ×1,97     | 11         | 9/9   | 9/9   | 4/9       | 0/9   |
| `flash (soigné)` | 10  | 0,0023 $ | 0,0046 $     | 0,0067 $ | ×2,91     | 10         | 10/10 | 10/10 | **10/10** | 6/10  |

La cellule `pro` compte neuf exécutions et non dix : la dixième s'est figée, et l'encadré sur ce que le banc doit prévoir raconte ce qu'il nous a coûté de l'apprendre.

Ces chiffres n'ont pas vocation à être crus sur parole ni recopiés dans un an. Relancez le banc : c'est précisément ce à quoi il sert, et le tableau que vous obtiendrez remplacera celui-ci.

Ce que ces mesures autorisent à dire :

- **Écrire le périmètre et le critère d'arrêt dans la demande supprime les débordements.** Les deux cellules qui contiennent le prompt cadré atteignent 10/10, soit vingt exécutions sans un seul débordement, contre 5/10 pour la base. C'est le résultat le mieux établi du tableau, et il coûte trois phrases. Nous avons poussé `flash (soigné)` à vingt répétitions : le périmètre y tient **20/20**.
- **Payer onze fois plus cher n'achète rien.** Le `pro` négligé coûte 0,0556 $ contre 0,0050 $ pour la base, respecte moins bien le périmètre (4/9 contre 5/10) et ne fait pas mieux ailleurs.
- **Le raisonnement n'apporte rien de mesurable ici.** `+thinking` a la médiane de la base à un dixième de centime près et le même score de périmètre. Le seul écart est une dispersion un peu moindre, ce qui est trop faible pour être interprété.
- **Priver l'agent du prompt système de Pi lui coûte des tours, pas son périmètre.** Le nombre de tours médian monte à 13,5, le plus haut du tableau, alors que le périmètre reste à 6/10, c'est-à-dire mieux que la base. L'agent tâtonne davantage sans pour autant déborder plus.
- **`rtk` n'a aucun effet mesurable.** Sa médiane est la plus basse du tableau, mais d'un dixième de centime, et son étendue n'a rien de remarquable. Une version précédente de ce module lui attribuait la dispersion la plus faible de la matrice, à ×1,46 ; à la relance, elle est à ×2,36 et c'est `+AGENTS.md` qui détient le minimum.

Cette dernière ligne mérite qu'on s'y arrête, parce qu'elle dit quelque chose sur la statistique elle-même. L'étendue est un rapport entre le maximum et le minimum de dix exécutions, donc elle est déterminée par les deux valeurs les plus extrêmes de l'échantillon et ignore les huit autres. C'est la grandeur la moins stable de tout le tableau, et nous avions bâti une conclusion dessus. Un écart d'étendue entre deux cellules ne veut presque rien dire ; un écart de médiane sur un échantillon suffisant, oui.

::: warning Une hypothèse que nous n'avons pas réussi à établir
Les chiffres ci-dessus ont été mesurés après l'arrivée de `game/bloom.js` dans NÉON, la passe de halo qui donne au jeu son aspect néon et qui consomme, à elle seule, près d'un quart du budget d'une frame. Une version antérieure de ce module, mesurée avant, concluait qu'**aucune** configuration ne traitait la moitié « performance » du ticket, la colonne `perf*` plafonnant à 2/10.

Nous avons soupçonné le halo : un fichier entièrement consacré à un calcul par frame mettrait l'agent en tête que la performance existe, avant même qu'il n'ouvre le ticket. L'hypothèse est séduisante, donc nous avons cherché à la casser en remesurant la même cellule sur le dépôt d'origine, le même jour et avec le même modèle.

| dépôt de `flash (soigné)` | moitié performance traitée |
| ------------------------- | -------------------------- |
| sans le halo              | 4/20                       |
| avec le halo              | 10/20                      |

Un écart de 20 % à 50 %, sur vingt exécutions de chaque côté, donne un test exact de Fisher à p ≈ 0,10. **Ce n'est pas concluant.** L'hypothèse survit, elle n'est pas démontrée, et il faudrait plusieurs dizaines d'exécutions de plus pour la départager.

Nous laissons ce résultat non tranché plutôt que de le présenter comme acquis, parce que c'est l'état réel de nos connaissances et parce que la tentation était forte : nous tenions une explication élégante d'un chiffre surprenant, et c'est exactement la situation où on cesse de vérifier.

Ce qui reste, en revanche, mérite d'être retenu comme question : **le contenu du dépôt est peut-être un levier de harnais**, au même titre que le prompt ou le fichier de règles. Vous ne le choisissez pas toujours. Le banc est là pour le savoir sur le vôtre.
:::

Reste que la moitié difficile du ticket n'est traitée qu'une fois sur deux dans la meilleure cellule, et jamais dans cinq des huit. Le contexte bien tenu rend l'agent discipliné, économe et prévisible, sans le rendre rigoureux. Obtenir la rigueur demandera un relecteur indépendant et une boucle de vérification, ce qui est le sujet des modules sur la délégation et les workflows.

::: warning Trois répétitions ne suffisaient pas, et nous en avons fait les frais
Nous avons d'abord publié ce tableau avec trois répétitions par cellule. Deux affirmations n'ont pas survécu au passage à dix.

Nous écrivions que la consigne « une tâche = un ticket » tenait mieux dans le prompt que dans `AGENTS.md`, sur la foi d'un 3/3 contre 2/3. À dix répétitions, `AGENTS.md` obtient 9/10 : l'écart s'est évaporé, et le fichier de règles fonctionne bien. Il est même la cellule la moins chère du tableau, avec le moins de tours.

Nous écrivions aussi que le prompt cadré traitait la moitié performance 2 fois sur 3. À dix répétitions, c'est 2 fois sur 10, et la cellule `pro` obtient le même score. Le résultat encourageant n'était qu'un tirage favorable.

**Et dix ne suffisaient pas non plus.** À la relance suivante, quatre affirmations de plus sont tombées. `+AGENTS.md` n'est plus « la cellule la moins chère de la matrice, la plus directe avec 7,5 tours médians » : elle est à 0,0046 $ et 10 tours. `rtk` n'a plus « la plus faible étendue du tableau, ×1,46 » : elle est à ×2,36. Priver l'agent du prompt système ne fait plus tomber son périmètre « à 4/10 » : il est à 6/10, au-dessus de la base. Et « aucune configuration ne traite la moitié difficile du ticket » est devenu une fois sur deux pour la mieux outillée.

Ce qui a survécu à chacune des trois publications tient en deux lignes : **le prompt cadré supprime les débordements**, et **le gros modèle négligé coûte douze fois plus cher sans rien acheter**. Ce sont les deux seuls résultats sur lesquels nous vous invitons à vous appuyer, et ce n'est pas un hasard s'ils sont aussi les deux plus gros écarts du tableau.

La règle est donc plus dure que « répétez trois fois » : **un effet qui ne dépasse pas la dispersion de sa propre cellule n'est pas un effet**, c'est une coïncidence qu'on a eu le temps de mettre en forme. Nous avons publié six conclusions fausses dans un module dont le sujet est de vous mettre en garde contre exactement cette erreur.
:::

Vous venez de pratiquer une évaluation, au sens où l'on compare des comportements sur une même tâche, avec des répétitions et en sachant la mesure bruitée, là où un test répond par oui ou par non à une question fermée. Le module 3.2 formalisera cette pratique avec des fichiers d'évaluation et un LLM-juge, et la colonne étoilée est précisément ce que ce juge devra prendre en charge.

### Le 2×2

Les leviers de ce module coûtent de l'attention et du temps, alors que le modèle s'achète, ce qui pose la question de savoir s'il est plus rentable de soigner son contexte ou de payer plus cher.

::: info Exercice (en salle)
Comparez les deux cellules extrêmes de la matrice, le `flash` bien outillé qui dispose du raisonnement, d'un prompt cadré et d'un `AGENTS.md`, et le `pro` mal outillé qui reçoit un prompt vague et rien d'autre. Regardez le coût, puis les quatre critères, puis les diffs.
:::

Voici les deux cellules face à face, le `flash` soigné sur vingt répétitions et le `pro` négligé sur neuf :

|                            | `flash (soigné)` | `pro (négligé)` |
| -------------------------- | ---------------- | --------------- |
| coût médian                | 0,0046 $         | 0,0556 $        |
| périmètre respecté         | **20/20**        | 4/9             |
| moitié performance traitée | **10/20**        | 0/9             |

Le petit modèle bien outillé coûte **douze fois moins cher**, ne déborde jamais du ticket sur vingt exécutions, là où le gros modèle négligé déborde une fois sur deux, et il est le seul des deux à traiter la moitié difficile. C'est la thèse d'Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, vérifiée sur une tâche réelle et sur les trois critères à la fois.

Ne lisez pas pour autant la dernière ligne comme une victoire franche. Une fois sur deux, c'est aussi une fois sur deux où le ticket repart à moitié fait, et il n'existe dans ce module aucun levier qui fasse mieux. C'est un plancher de fiabilité, pas un résultat : soigner le contexte a rendu l'agent discipliné et bon marché, sans le rendre fiable.

Cette comparaison peut néanmoins échouer ailleurs, et son échec chez vous serait un résultat à noter plutôt qu'un incident à masquer, puisqu'un modèle nettement plus capable peut absorber un contexte négligé et qu'il est utile de savoir à partir de quel écart de capacité cela devient vrai. La question mérite d'être reposée à chaque nouvelle génération de modèles, et le banc est là pour la reposer.

## Généraliser

Cinq principes survivent à Pi, à `opencode-go` et à la version des paquets que vous venez d'installer.

**Ce qui est stable devant, ce qui varie derrière.** Le cache ne fonctionne que sur un préfixe inchangé et coûte cinquante fois moins cher que l'entrée, si bien que toute donnée volatile placée tôt dans le contexte, qu'il s'agisse d'un horodatage, d'un état git ou d'une date, invalide tout ce qui suit.

**Dire quand s'arrêter fait la moitié d'un bon prompt.** Nos exécutions ont plus souvent échoué par débordement que par incompétence, et les trente exécutions qui reçoivent un périmètre et un critère d'arrêt explicites n'ont pas débordé une seule fois, contre cinq sur dix pour la demande vague. Trois phrases dans la demande valent mieux qu'un modèle douze fois plus cher.

**Le fichier de règles est une check-list, pas un guide de style.** Il entre dans le contexte à chaque tour, ce qui le rend puissant et coûteux, d'où l'intérêt de le tenir court, de sourcer chaque règle par un échec observé et de le refactorer plutôt que de l'allonger. Nos mesures le placent honorablement sans en faire un champion : la cellule `+AGENTS.md` gagne trois points de périmètre sur la base, 8/10 contre 5/10, pour quatre lignes de texte et un coût qui ne bouge pas. C'est un bon rapport, et c'est tout ce que nous pouvons en dire — les deux fois où nous lui avons attribué davantage, la relance nous a démentis.

**Un réglage exposé n'est pas un réglage compris.** Entre le drapeau que vous tapez et la requête qui part se trouvent du code et des tables de correspondance, comme le montre `--thinking medium`, qui n'existe pas sur la moitié des modèles sans que rien ne vous en avertisse.

**Un agent est bruité, et sans répétitions vous ne mesurez rien.** La cellule de base affiche une étendue de ×4,22 sur dix exécutions, ce qui rend ininterprétable tout écart de coût inférieur à cet ordre de grandeur. Nous avons publié six conclusions fausses dans les versions successives de ce module, chacune tirée d'un échantillon trop petit et chacune démentie en augmentant les répétitions ou en relançant. Trois répétitions constituent le minimum pour voir la dispersion ; il en faut nettement plus pour départager deux leviers proches, et les colonnes de notation, qui comptent des succès, sont les plus gourmandes. Défiez-vous en particulier de l'étendue, qui ne dépend que des deux exécutions les plus extrêmes de l'échantillon et ignore toutes les autres : c'est sur elle que nous nous sommes trompés le plus souvent.

### Le cas `rtk`, et le passage à l'acte 2

`pi-rtk-optimizer` est l'extension recommandée pour maîtriser le contexte sur Pi, puisqu'elle réécrit les commandes `bash` vers un outil dédié et compacte les sorties d'outils avant qu'elles n'entrent dans le contexte. Sur NÉON, elle ne fait économiser aucun argent.

La raison est arithmétique : `rtk` mord sur les sorties d'outils, or les sorties de `bash` ne représentent que 6 à 22 % du total sur ce dépôt, le reste venant des lectures de fichiers. Un dépôt de 617 lignes ne produit ni build bavard, ni suite de tests de dix minutes, ni `git log` de trois cents commits, donc il n'y a presque rien à compacter.

Elle ne fait rien gagner ailleurs non plus. Sa médiane est la plus basse du tableau, mais d'un dixième de centime, ce qui ne se distingue pas de zéro à cette dispersion, et ses scores de notation sont ceux du reste de la matrice.

Nous avons cru un moment le contraire. Une version précédente de ce module lui attribuait la dispersion la plus faible de la matrice, ×1,46 contre ×3,50 pour la base, et en tirait une conclusion élégante : l'extension ne rendrait pas l'agent moins cher mais plus prévisible, ce qui serait une propriété désirable dont sa page de présentation ne parle pas. À la relance, `rtk` est à ×2,36 et le minimum du tableau appartient à `+AGENTS.md`. La conclusion élégante était un artefact de la statistique la plus fragile du tableau.

Il faut en retenir trois choses. D'abord qu'une brique de harnais ne vaut que ce que votre charge de travail lui donne à mâcher, et que le calcul s'inversera probablement sur un dépôt doté d'un build verbeux et d'une intégration continue bavarde, ce que vous saurez vérifier puisque vous avez le banc. Ensuite qu'une extension installée sans mesure est une extension dont vous ignorez l'effet, y compris quand elle est recommandée par des gens compétents. Enfin, et c'est le plus inconfortable, qu'un résultat qui vous plaît demande plus de vérification qu'un résultat qui vous déplaît : celui-ci nous plaisait, nous l'avons publié, il était faux.

Ce cas marque aussi un changement de nature dans les leviers. Tout ce que nous avons manipulé jusqu'ici relève de l'usage, qu'il s'agisse de choisir un modèle, de régler un curseur, d'écrire un prompt ou de tenir un fichier de règles, alors que `rtk` est le premier levier constitué de code ajouté au harnais. C'est la bascule de tout l'acte 2 : nous avons épuisé ce qu'on gagne en s'y prenant mieux, et nous allons désormais modifier la machine.

## Livrable

Trois pièces, dont les deux premières servent toute la journée et la troisième servira à l'acte 4.

**1. L'`AGENTS.md` de NÉON**, versionné dans le dépôt, sous les 40 lignes, chaque règle justifiée par un échec que vous avez observé.

**2. Le tableau de mesures**, avec minimum, médiane et maximum par cellule.

**3. La fiche de décision**, une ligne par levier :

| levier                 | effet mesuré | adopté ? | pourquoi |
| ---------------------- | ------------ | -------- | -------- |
| choix du modèle        |              |          |          |
| effort de raisonnement |              |          |          |
| prompt cadré           |              |          |          |
| `AGENTS.md`            |              |          |          |
| prompt système         |              |          |          |
| ordonnancement / cache |              |          |          |
| compaction             |              |          |          |
| `rtk`                  |              |          |          |

Cette fiche constitue le premier remplissage réel de la colonne « ton harnais ? » de la table de correspondance, pour la ligne « contexte ». Les cinq modules suivants feront de même pour leur brique, si bien que vous aborderez le capstone avec une table nourrie par l'expérience plutôt qu'avec une page blanche.

::: tip Critère de réussite
Vous savez citer un levier que vous avez mesuré comme inefficace sur NÉON, et dire à quelle condition précise il deviendrait rentable sur votre propre dépôt.

Ce critère demande d'avoir vu les chiffres et d'avoir compris que c'est la charge de travail qui les détermine, ce qui le rend impossible à satisfaire de mémoire.
:::

## Les pièges

**Conclure d'une seule exécution**, ce qui reste le piège principal et le plus coûteux, puisqu'il produit des convictions durables à partir de bruit.

**Injecter du volatil dans la zone cacheable.** Une date, un `git status` ou un horodatage placé tôt dans le contexte invalide tout le cache qui suit, et vous fait payer au prix fort une économie que vous croyiez acquise.

**Oublier son `AGENTS.md` personnel**, chargé en plus de celui du projet, invisible dans l'interface, et qui fausse toutes vos mesures tant que vous n'utilisez pas `-nc`.

**Croire un drapeau sur parole**, alors que `--thinking medium` peut n'avoir aucun effet sans que Pi vous en avertisse.

**Prendre l'absence de saturation pour une absence de problème.** Sur une fenêtre d'un million de tokens rien ne déborde jamais, ce qui signifie seulement que le signal d'alarme ne sonnera pas et que le coût sera votre seul indicateur.

**Installer une extension parce qu'elle est recommandée**, sans l'avoir mesurée sur votre dépôt et avec votre charge de travail.

## Pour aller plus loin

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), l'étude qui justifie qu'on ne se contente pas de remplir la fenêtre.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sur le glissement du prompt isolé vers l'architecture du contexte.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), dont la thèse est celle que le 2×2 met à l'épreuve.
- [La documentation de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), et en particulier ses pages sur la compaction, les modèles et les réglages.
