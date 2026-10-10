# Le contexte et la fenêtre principale

::: tip Objectifs de ce module
- Savoir dire ce qu'il y a réellement dans la fenêtre de contexte, et ce que chaque partie coûte
- Manipuler les leviers qui la remplissent : modèle, effort de raisonnement, prompt, `AGENTS.md`, prompt système, `codemode`
- Savoir construire et faire évoluer son `AGENTS.md`
:::

La gestion du contexte est la brique dont dépendent toutes les autres, puisqu'un sous-agent sert à ne pas polluer le contexte principal, une mémoire à ne pas le remplir de ce qu'on saurait retrouver, et une permission à ne pas y déverser un fichier qu'on n'aurait pas dû lire. Il faut donc commencer par savoir ce que contient la fenêtre et comment elle est alimentée au fil du temps. Les modules suivants présenteront des outils qui interviendront dans le processus de remplissage du contexte.

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
5. et, à mesure que la boucle tourne, l'**historique**, c'est-à-dire chaque réponse du modèle, y compris la phase de raisonnement, chaque appel d'outil et chaque sortie d'outil.

Les quatre premières sources sont stables d'un tour à l'autre, alors que la cinquième grossit à chaque tour, ce qui en fait presque toujours la responsable des débordements.

::: info Exercice (en salle)
Ouvrez une session, posez une question quelconque, puis exportez la session avec `/export`. Ouvrez le fichier HTML produit et lisez le prompt système de Pi en entier, ce que la plupart des agents de code ne vous permettent pas de voir.

Repérez-y ce qui décrit des **capacités** et ce qui décrit des **conventions** : nous mesurerons plus loin le poids réel de chacune des deux catégories.
:::

Sur une requête aussi triviale que « dis juste OK », sans fichier de contexte, sans skill et sans extension, l'entrée pèse **1 660 tokens**, et elle tombe à **1 110** si l'on remplace le prompt système de Pi par trois lignes. Le prompt système de Pi coûte donc environ **550 tokens**, ce qui est peu au regard de ce que les sorties d'outils et l'historique viendront y ajouter ensuite. L'essentiel de ce qui remplit une fenêtre de contexte ne vient pas du harnais mais de ce que vous et l'agent y déversez au fil de la session.

### Que coûte l'utilisation d'un LLM ?

Un appel au modèle se facture en trois postes, exprimés au million de tokens. Voici les tarifs des deux modèles pris sur l'offre opencode Go :

| modèle              | entrée | sortie | lecture de cache |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $ | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $ | 3,48 $ | 0,0145 $         |

Ces tarifs sont ceux publiés par [opencode Zen](https://opencode.ai/docs/zen/). Les mesures de l'[acte 3](./act3-trysquare) tournent sur ILaaS, qui ne facture rien aux participants de cette formation, et comptent donc des tokens plutôt que des euros. Les deux se lisent de la même façon, à ceci près qu'un compteur de tokens ne vous prévient pas quand vous dépensez.

Deux écarts en ressortent. Le premier sépare les deux modèles, puisque le `pro` coûte 12,4 fois plus cher que le `flash` à tarif nominal. C'est une première manière de se rendre compte qu'un modèle possède plus de capacités qu'un autre. Le second écart, bien plus large, sépare l'entrée de la lecture de cache : un facteur **50** sur `flash` et **120** sur `pro`.

Ce second écart est ce qui rend un agent de code économiquement viable, car un agent relit son historique complet à chaque tour et paierait sinon vingt fois le prix de son contexte au cours d'une session de vingt tours.

::: info Exercice (en salle)
Dans une session interactive, enchaînez cinq questions sur un même fichier en tapant `/session` après chacune, et changez de modèle avec `/model` avant la quatrième. Les questions doivent interdire explicitement toute relecture de fichier, faute de quoi une nouvelle sortie d'outil viendra s'ajouter au contexte et brouillera la lecture.

Voici la séquence exacte que nous avons mesurée, ici en mode non interactif pour qu'elle soit reproductible telle quelle. L'option `-c` poursuit la session précédente, et les accents sont omis dans les commandes sans incidence sur le résultat :

```bash
git clone https://github.com/AI-for-dev/neon
cd neon

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
Depuis un script, redirigez l'entrée standard avec `< /dev/null`. En mode non interactif, `pi` attend sur son entrée standard tant qu'elle reste ouverte, ce qui bloque indéfiniment quand il est appelé depuis un script bash par exemple.
:::

Le cache ne fonctionne que sur un **préfixe inchangé**, ce dont découle la règle d'ordonnancement du contexte : tout ce qui varie doit être placé derrière ce qui est stable. Un horodatage ou un `git status` glissé dans le prompt système invalide l'intégralité de ce qui suit, outils, question et historique compris, et vous fait repayer le plein tarif à chaque tour, alors que la même donnée placée dans le message du tour courant ne coûte rien puisqu'elle se trouve déjà dans la zone qui varie.

Retenez aussi que changer de modèle en cours de session n'est pas gratuit, ce qui mérite d'être gardé en tête chaque fois que vous basculerez d'un modèle à l'autre avec `/model`.

## Reconstruire

### La tâche

Toutes les manipulations de ce module portent sur la même tâche, l'**issue #1** de NÉON : la balle traverse les briques au lieu de rebondir.

Le ticket est décrit dans `ISSUES.md`, à la racine du [dépôt NÉON](https://github.com/AI-for-dev/neon) : la balle passe à travers les briques, et le ticket détaille les comportements attendus après correction. Nous pourrions le donner directement à l'agent, mais nous ne le ferons pas pour le moment : nous voulons d'abord voir comment il se comporte selon le prompt qu'on lui fournit et le cadre qui l'entoure.

Cette issue comporte plusieurs subtilités difficiles à trouver pour un agent seul. Il verra rapidement le problème et proposera de calculer la distance de la balle aux côtés de la brique, pour inverser, selon le côté touché, l'une des deux vitesses. Le cas du coin, rare mais réel, et celui d'une vitesse assez grande pour que la balle franchisse la brique sans jamais la recouvrir, ont en revanche très peu de chances d'être traités.

En plus de la correction du bug, nous souhaitons commencer à définir un cadre et vérifier que l'agent n'en sort pas. Ce cadre tient en trois règles :

- L'agent ne peut modifier que `game/neon.js` et `game/neon.test.js` et rien d'autre.
- L'agent doit lancer les tests pour vérifier qu'il n'a rien cassé.
- L'agent doit ajouter des tests si la couverture n'est pas bonne. C'est notre cas ici : il n'y a pas de tests qui vérifient le comportement de la balle avec la brique.

La première contrainte est trop forte dans un cadre général. L'idée ici est surtout de voir comment se comporte le modèle et s'il respecte cette contrainte écrite.

Ce module vous fait manipuler les leviers à la main, sur une ou deux exécutions, pour voir ce que chacun change dans la session et dans le diff. Le [module 3.1](./act3-contexte) reprend la même tâche et les mêmes leviers avec vingt répétitions par configuration, ce qui permet de dire lesquels changent réellement le résultat.

### Les curseurs, à la main

#### Le modèle

::: info Exercice (en salle)
Lancez la même demande sur deux modèles de tailles différentes, celui que vous utilisez d'ordinaire et le plus gros auquel vous avez accès. La demande est volontairement minimale, c'est celle qu'on écrit naturellement le premier jour. Nous l'appellerons « demande négligée » dans la suite de ce module :

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Prenez soin de créer au préalable deux clones séparés :

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

puis travaillez dans le répertoire correspondant au modèle testé.

Lisez les deux diffs, puis les deux `/session`. Notez vos observations sans en tirer de conclusion : le [module 3.0](./act3-trysquare) explique pourquoi deux exécutions ne suffisent pas à départager deux modèles.
:::

#### L'effort de raisonnement

`pi --help` annonce sept niveaux de raisonnement, de `off` à `max`. C'est un curseur simple à manipuler et il est donc tentant de commencer par lui.

::: info Exercice (en salle)
Lancez la même tâche avec `--thinking minimal`, puis avec `--thinking max`, et comparez les tokens de sortie et la réponse. Vous ne trouverez aucun écart, parce que les deux drapeaux produisent exactement la même requête si vous utilisez le modèle `gemma-4-31b`.

Pour ce modèle, il n'y a que deux modes : le thinking `on` ou `off`.

Refaites la comparaison entre deux niveaux réellement distincts sur votre modèle, par exemple `off` et `high`, et mesurez l'écart.
:::

Le raisonnement a bien un effet quand on le mesure entre deux niveaux réels. La leçon générale porte plutôt sur la confiance à accorder aux réglages : **un réglage exposé par le harnais n'est pas forcément transmis au modèle**, parce qu'entre la configuration que vous tapez et la requête qui part sur le serveur d'inférence se trouve une table de correspondance écrite par quelqu'un, qui peut être incomplète. Vous rencontrerez cette situation plusieurs fois dans la formation, et régulièrement dans votre travail. Prenez l'habitude de chercher où atterrit une configuration ou un flag avant de lui faire confiance.

### Ce qu'on écrit

#### `AGENTS.md`, le point de configuration globale

Le fichier de règles placé à la racine du dépôt entre dans le contexte à chaque tour, ce qui en fait un bon candidat pour définir le cadre global de notre projet. Quand l'agent se trompe, la réaction naturelle consiste à y ajouter une phrase, puis une autre. Chaque ligne ajoutée a pourtant un coût, et plus le fichier grossit, moins l'agent en voit l'ensemble ; l'amélioration des modèles rendra par ailleurs obsolètes des lignes introduites précédemment. Ce fichier demande donc un refactoring continu, tout au long de la vie du projet.

Nous posons pour cette formation une contrainte forte.

::: danger Budget : 40 lignes
L'`AGENTS.md` de NÉON ne dépassera jamais 40 lignes, du début à la fin de la formation. Chaque module qui voudra y ajouter une règle devra d'abord en retirer une, ou reformuler pour faire tenir les deux en une seule.

Cette contrainte vous oblige à faire le travail de refactoring continu décrit plus haut : chaque règle doit mériter sa place, et un fichier court a beaucoup plus de chances d'être réellement suivi qu'un long guide de style.
:::

Nous pouvons également nous appuyer sur d'autres fichiers et le dire dans `AGENTS.md`, pour que l'agent aille les lire au besoin. Par exemple, nous pouvons lui indiquer que les conventions sont dans `CONTRIBUTING.md`, l'architecture dans le `README.md` et l'historique dans git.

Sur les vingt exécutions de l'issue #1 avec la demande négligée que mesure le [module 3.1](./act3-contexte), **aucune n'a lancé la suite de tests** et **aucune n'a ajouté un cas**.

::: info Exercice (en salle)
Écrivez l'`AGENTS.md` de NÉON en partant de vos propres exécutions plutôt que des nôtres : relisez les diffs que vous venez de produire et cherchez ce que l'agent a fait sans qu'on le lui demande, ou omis alors qu'on le lui demandait. Faites en sorte qu'il lance les tests à chaque fois qu'il modifie le code et qu'il en ajoute s'il n'y a pas de couverture.

Voici la base de départ, à discuter et à amender. C'est le fichier même que les mesures du [module 3.1](./act3-contexte) utilisent, versionné avec l'expérience :

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning Un `AGENTS.md` peut en cacher un autre
Pi cumule ces fichiers, à partir de votre `~/.pi/agent/AGENTS.md` personnel, puis de chaque répertoire parent en remontant, puis du répertoire courant. Un fichier de règles personnel s'invite donc dans toutes vos mesures sans que vous en soyez informé.

Le drapeau `--no-context-files`, abrégé `-nc`, désactive cette découverte, ce qui est indispensable pour mesurer proprement. L'outil de mesure de l'acte 3 travaille dans un clone jetable où seul le fichier `AGENTS.md` du répertoire courant (NÉON) est déposé.
:::

#### Le prompt système

Pi permet de remplacer entièrement son prompt système par un `.pi/SYSTEM.md` à la racine du projet ou un `~/.pi/agent/SYSTEM.md` global. L'option `--system-prompt` obéit à une règle légèrement différente, puisque les fichiers de contexte et les skills continuent d'être ajoutés par-dessus, si bien qu'on ne repart jamais tout à fait d'une page blanche.

::: info Exercice (en autonomie)
Créez un `.pi/SYSTEM.md` de trois lignes. C'est la brique que les mesures du [module 3.1](./act3-contexte) déposent dans le clone pour la configuration `-system_prompt` :

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Relancez la même tâche et comparez les tokens d'entrée, les tours, la durée, et ce que le diff contient.
:::

Le prompt système de Pi tient en 550 tokens. Tout le reste du travail se joue ailleurs et nous vous encourageons à ne le modifier que pour de bonnes raisons. Nous vous le montrons ici pour illustrer la flexibilité qu'offre Pi.

#### Une fenêtre bridée, pour voir la compaction

Quand le contexte approche de la limite, Pi compacte, c'est-à-dire qu'il résume les messages anciens et ne garde intacts que les plus récents. Le déclenchement suit la règle `contextTokens > contextWindow - reserveTokens`, où `reserveTokens` vaut 16 384 par défaut et représente la place laissée à la réponse. La coupure est visible dans `/tree`, et `/compact` permet de la forcer, avec des instructions optionnelles pour orienter le résumé.

Sur NÉON, selon le modèle, la compaction ne se déclenchera jamais. Le dépôt fait 617 lignes, `gemma-4-31b` annonce une fenêtre d'environ 128 000 tokens, ce qui place le seuil aux alentours de 112 000, et notre expérience la plus dépensière n'atteint ce total qu'en cumulant treize tours dont aucun ne pèse plus d'une dizaine de milliers de tokens. Observer le mécanisme suppose donc de fabriquer la contrainte pour voir ses effets plus rapidement.

::: info Exercice (en autonomie)
Déclarez dans `~/.pi/agent/models.json` un second fournisseur, `ilaas-bride`, qui pointe sur le même service mais annonce une fenêtre de 32 000 tokens. Ajoutez-le dans `providers`, à côté du fournisseur `ilaas` que vous avez déclaré en [installant Pi](./act1-pi), sans toucher à celui-ci :

```jsonc
// à ajouter dans "providers", à côté de "ilaas"
"ilaas-bride": {
  "baseUrl": "https://llm.ilaas.fr/v1",
  "api": "openai-completions",
  "apiKey": "XXXXX",
  "models": [
    {
      "id": "gemma-4-31b",
      "name": "Gemma 4 31B (fenêtre bridée)",
      "reasoning": true,
      "contextWindow": 32000,
      "maxTokens": 8000
    }
  ]
}
```

Un second fournisseur est nécessaire parce que Pi identifie un modèle par son fournisseur et son `id`. Une entrée qui reprend le même `id` chez le même fournisseur remplace la première au lieu de s'y ajouter, et l'`id` ne peut pas changer puisque c'est lui que Pi envoie au service.

Ajoutez dans le `.pi/settings.json` de NÉON des seuils cohérents avec cette petite fenêtre, réservés au modèle bridé :

```json
{
  "compaction": {
    "modelOverrides": {
      "ilaas-bride/gemma-4-31b": { "reserveTokens": 8000, "keepRecentTokens": 8000 }
    }
  }
}
```

La compaction se déclenche alors au-delà de 24 000 tokens (32 000 moins 8 000) et garde intacts les 8 000 derniers tokens. `reserveTokens` vaut le `maxTokens` déclaré, pour que la place réservée corresponde à la plus longue réponse permise. La clé `ilaas-bride/gemma-4-31b` limite ces réglages au modèle bridé, et le modèle à 128K garde les valeurs par défaut. Pi ne lit ce fichier que si vous faites confiance au projet : acceptez la question qu'il pose au lancement, ou tapez `/trust`. En mode `pi -p`, où il ne peut pas poser la question, il ignore le fichier sans prévenir.

Vous disposez alors des deux régimes dans `/model`, `ilaas/gemma-4-31b` à 128K et `ilaas-bride/gemma-4-31b` bridé à 32K. Faites travailler l'agent sur plusieurs fichiers avec le second jusqu'au déclenchement, lisez le résumé produit, puis vérifiez dans `/tree` où la coupure a eu lieu et si l'agent sait encore ce qu'on lui avait demandé au départ.
:::

Cette manipulation montre également que Pi compacte vers 24 000 tokens non pas parce que le modèle sature, mais parce que vous lui avez déclaré une fenêtre de 32 000. La fenêtre que connaît un harnais est une ligne de configuration et non une propriété du modèle. Ce constat vous servira le jour où un agent se mettra à compacter trop tôt sans raison apparente.

### Que faire quand les sorties d'outils remplissent la fenêtre ?

La cinquième source de la fenêtre, l'historique, grossit surtout par les sorties d'outils. Quand l'agent lit dix fichiers pour trouver la fonction qui l'intéresse, ou lance un `grep` qui rend trois cents lignes pour en garder deux, tout ce qu'il a lu reste dans le contexte et se relit à chaque tour jusqu'à la fin de la session, y compris ce qui ne lui a servi à rien. La compaction ne traite ce problème qu'après coup, en résumant ce qui a été utile.

À son lancement, Pi n'avait pas d'outil pour appeler un serveur MCP, parce que son auteur estimait que ces serveurs remplissaient trop facilement la fenêtre de contexte. Le discours a évolué avec la version 1.0, notamment avec l'arrivée de `codemode`, qui simplifie l'utilisation des MCP et réduit leur poids dans la fenêtre ([You Said No MCP!](https://earendil.com/posts/you-said-no-mcp/)).

Au lieu d'appeler les outils un par un et de recevoir chaque résultat dans la fenêtre, `codemode` permet au modèle d'écrire un programme qui fait les appels, filtre et combine les résultats, et seule la sortie du programme revient dans le contexte. [Cloudflare](https://blog.cloudflare.com/code-mode-mcp/) et [Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp) ont décrit cette approche fin 2025 pour les serveurs MCP qui exposent des centaines d'outils. Leurs chiffres, comme les 150 000 tokens ramenés à 2 000 qu'annonce Anthropic, décrivent le meilleur cas, un workflow qui fait transiter de gros volumes de données entre deux services. Mario Zechner, l'auteur de Pi, défendait la même idée dans [What if you don't need MCP at all?](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/) : un agent qui dispose de `bash` et sait écrire du code n'a pas besoin de faire passer chaque résultat intermédiaire par son contexte.

Pi propose ce mode depuis sa version 1.0 sous la forme d'un outil, [`codemode`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/codemode.md), livré avec Pi mais inactif par défaut. On l'ajoute aux outils de base pour une session avec `pi --tools +codemode`, ou pour un projet avec `"defaultTools": ["+codemode"]` dans `.pi/settings.json`. Le modèle écrit alors un script JavaScript qui appelle les autres outils (`tools.read(...)`, `tools.bash(...)`, les outils des serveurs MCP) et rend ce qu'il juge utile avec `text()` ou `return`. Le script tourne dans un bac à sable [QuickJS](https://bellard.org/quickjs/), sans accès au réseau ni au système de fichiers autrement que par les outils, et sa sortie est plafonnée à 10 000 tokens par défaut : au-delà, Pi garde le début et la fin et écrit le texte complet dans un fichier temporaire dont il donne le chemin.

Ce levier a un coût fixe, celui de la description de l'outil, qui entre dans le préfixe stable à chaque tour. Le journal des modifications de Pi 1.0 indique qu'une requête GPT-5.6 avec les outils par défaut et `codemode` actif est passée d'environ 5 300 à 3 300 tokens après un allègement de cette description, ce qui donne l'ordre de grandeur à amortir. Sur une tâche qui lit peu, comme l'issue #1 de NÉON (un fichier source de quelques centaines de lignes et quatre outils), il y a donc de bonnes chances que `codemode` augmente les tokens d'entrée au lieu de les réduire. Il devient intéressant quand les sorties sont volumineuses et que l'essentiel peut être filtré dans le script : chercher un motif dans tout un dépôt, agréger la sortie d'une suite de tests, interroger un serveur MCP qui renvoie des documents entiers.

::: warning Ce que `codemode` ne change pas
Les appels d'outils faits depuis un script sont réels : un `tools.bash(...)` ou un `tools.edit(...)` modifie le dépôt exactement comme s'il avait été appelé directement, et un script qui échoue en cours de route n'annule pas les appels déjà faits. Le bac à sable QuickJS isole le script et non les outils qu'il appelle, et le [module 2.0](./act2-sandbox) reste ce qui borne ce que l'agent peut toucher.

Activez-le aussi en début de session plutôt qu'en cours de route : la liste des outils fait partie du préfixe mis en cache, et la modifier fait repayer tout ce qui suit au tarif plein, comme un changement de modèle.
:::

::: info Exercice (en autonomie)
Dans un clone de NÉON, posez deux fois la même question qui oblige à parcourir le dépôt, une fois avec les outils par défaut et une fois avec `--tools +codemode`, par exemple :

```bash
pi -p -nc --session-dir ./runs/without-codemode --provider opencode-go --model deepseek-v4-flash \
  "Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4-flash \
  "Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4-flash \
  "Utilise l'outil codemode. Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4-flash \
  "Utilise l'outil codemode, en une seule commande. Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

```

Comparez les tokens d'entrée de chaque appel dans l'export HTML des quatre sessions, puis lisez ce que le script a réellement renvoyé au modèle.
:::

Pour exporter une session, il suffit de lancer :

```bash
pi --export runs/--path--/session.jsonl
```

Dans l'exercice précédent, vous devriez constater que si vous ne demandez pas explicitement d'utiliser `codemode`, le modèle se dit qu'il n'y a pas assez de travail pour lancer cet outil. Vérifiez qu'il est bien dans la liste.

Dans le troisième cas, le modèle appelle `codemode` plusieurs fois, ce qui demande beaucoup plus de tokens et de temps que dans le premier cas.

Enfin, le dernier cas devrait vous montrer que vous gagnez du temps et des tokens si vous n'effectuez qu'une seule commande.

::: info D'autres outils pour réduire ce que l'agent lit
D'autres outils s'attaquent au même problème par un autre côté. Les cartes de dépôt comme celle d'[Aider](https://aider.chat/docs/repomap.html), les serveurs fondés sur un serveur de langage (LSP) comme [Serena](https://github.com/oraios/serena) et les graphes de code exposés en MCP comme [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) aident l'agent à trouver les bonnes lignes sans ouvrir les fichiers entiers ; [RTK](https://github.com/rtk-ai/rtk) compresse la sortie des commandes avant que l'agent ne la lise.

Il faut prendre ces outils avec des pincettes, et vous constaterez qu'ils dépendent fortement de votre cas d'usage. Dans certains cas, ils seront utiles, et dans d'autres, réellement contre-productifs. Là encore, l'expérimentation est votre seule arme pour juger de leur pertinence.
:::

Les manipulations de ce module vous ont montré ce que chaque levier change sur une exécution, et une exécution ne dit pas si ce changement se reproduit. Le [module 3.1](./act3-contexte) reprend les mêmes leviers sur la même tâche, avec vingt répétitions par configuration et un critère exécutable, pour séparer ce qui déplace précisément le résultat de ce qui relève de la dispersion du modèle.

## Généraliser

Ce que nous avons fait sur NÉON vaut pour n'importe quel agent de code, et pas seulement pour Pi.

Le contexte se relit à chaque tour, et le cache facture cinquante fois moins cher, sur `deepseek-v4-flash`, la partie qui n'a pas changé depuis le tour précédent. Placez donc au début ce qui reste stable, le prompt système, les fichiers de contexte et les outils, et à la fin ce qui varie. Un horodatage ou un `git status` ajouté au prompt système fait repayer tout ce qui suit au tarif plein, à chaque tour.

Changer de modèle ou de liste d'outils en cours de session remet le cache à zéro. Dans la séquence de cinq tours du début du module, le premier tour sur `pro` coûte quinze fois plus cher que le suivant, sur le même modèle.

Un réglage proposé par le harnais n'arrive pas forcément jusqu'au modèle. Avec `gemma-4-31b`, `--thinking max` envoie la même requête que `--thinking minimal`, et la fenêtre que Pi connaît est celle que vous avez déclarée dans `models.json`. Avant de vous fier à un réglage, regardez dans la session ce qu'il a changé.

Une sortie d'outil reste dans la fenêtre jusqu'à la fin de la session. Mieux vaut la filtrer avant qu'elle y entre, avec un script, une commande ou `codemode`, que la résumer après coup par la compaction. Ce filtrage a aussi un coût : la description de `codemode` entre dans le contexte à chaque tour, et sur une petite tâche comme l'issue #1 elle peut coûter plus qu'elle ne fait gagner.

Enfin, `AGENTS.md` entre lui aussi dans le contexte à chaque tour. Gardez-le court, n'y ajoutez une règle qu'après avoir vu l'agent échouer sans elle, et renvoyez vers les documents que l'agent peut lire au besoin au lieu de les recopier. Quand vous changez de modèle, relisez-le et retirez ce qui ne sert plus.

## Livrable

Ce module produit deux pièces.

**1. L'`AGENTS.md` de NÉON**, versionné dans le dépôt, sous les 40 lignes. Pour chaque règle, notez l'échec que vous avez observé pendant les exercices et qui vous l'a fait ajouter.

**2. Vos observations sur chaque levier**, une ligne par levier, avec la session ou le diff qui la montre. Le [module 3.1](./act3-contexte) reprend ces leviers sur vingt exécutions, et vous pourrez y comparer vos observations aux mesures.

| levier                           | ce que vous avez observé | session ou diff |
| -------------------------------- | ------------------------ | --------------- |
| choix du modèle                  |                          |                 |
| effort de raisonnement           |                          |                 |
| `AGENTS.md`                      |                          |                 |
| prompt système (`.pi/SYSTEM.md`) |                          |                 |
| fenêtre bridée et compaction     |                          |                 |
| `codemode`                       |                          |                 |

::: tip Critère de réussite
Vous savez dire de quoi la fenêtre de contexte est faite. Vous savez comment elle est initialisée et comment modifier cette initialisation. Vous comprenez également comment limiter l'impact des outils ou du niveau de raisonnement. Vous pouvez dire si l'infrastructure d'inférence est bien configurée ou si elle vous coûte plus de tokens qu'il n'en faut, ce qui arrive par exemple quand le cache est mal configuré ou pas configuré du tout.
:::

## Pour aller plus loin

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), l'étude qui justifie qu'on ne se contente pas de remplir la fenêtre.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sur le glissement du prompt isolé vers l'architecture du contexte.
- [La documentation de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), et en particulier ses pages sur la compaction, les modèles et les réglages.
