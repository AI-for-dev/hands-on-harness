# Le harnais de départ : Pi

::: tip Objectifs de ce module
- Comprendre pourquoi nous partons de Pi
- Lancer Pi et comprendre le rôle du répertoire `.pi/`
- Situer les quatre extensions que nous utiliserons pour incarner la grille des briques
- Cadrer honnêtement l'exercice de reconstruction
:::

Nous avons vu précédemment qu'un harnais était un ensemble d'outils au-dessus des modèles LLM, dont chacun contribue à l'accomplissement d'une tâche en autonomie. Vous avez à votre disposition un ensemble de harnais déjà construits : Claude Code, Codex, OpenCode, Pi... Dans la plupart des cas, vous n'en maîtrisez pourtant rien : vous vous laissez guider en espérant que l'outil fasse ce que vous lui avez demandé, et quand quelque chose se passe mal, il n'est pas forcément aisé de comprendre pourquoi. Or, notre objectif est justement de comprendre comment marche un harnais dans le moindre de ses détails, de pouvoir y ajouter ou en retirer facilement un élément et d'en tester les conséquences.

Dans la suite, nous allons utiliser [Pi](https://pi.dev), un agent de code en ligne de commande, ouvert, extensible et minimaliste. Il nous intéresse précisément parce qu'on peut lui ajouter des extensions simplement et comprendre tout ce qui se passe à l'intérieur, sans surprise : une maîtrise de bout en bout.

## Ce qu'est Pi

Pi est un agent de code créé initialement par Mario Zechner, qui tourne dans votre terminal. Son but premier était justement d'avoir la maîtrise de son harnais. Pi repose sur une poignée d'outils de base (lire un fichier, en écrire un, l'éditer, exécuter une commande shell) et sur une boucle agentique qui enchaîne les appels au modèle, l'exécution des outils et la relecture des résultats. C'est exactement la boucle que nous avons décrite au module précédent, réduite à sa plus simple expression.

Autour de ce noyau, Pi expose un système d'extensions et d'événements. Vous pouvez vous brancher sur les moments importants de la boucle avec `pi.on(...)`, de la même façon qu'on branche des hooks dans Claude Code.

Comme Claude Code s'appuie sur un répertoire `.claude/`, Pi s'appuie sur un répertoire `.pi/`. C'est là que vivent la configuration, les skills, les agents et les règles de permission. Vous pouvez le considérer comme l'équivalent, côté Pi, de ce que vous connaissez peut-être déjà côté Claude Code.

Le « system prompt » de Pi décrit l'intégralité de son fonctionnement, comme vous le verrez dans un instant ; Pi est donc en mesure de vous aider à étendre ses propres fonctionnalités.

## Premiers pas

Pour installer Pi, rendez-vous sur le [site officiel](https://pi.dev) et laissez-vous guider.

Il vous faut ensuite déclarer les modèles qui vous serviront tout au long de vos expériences ; les façons de renseigner votre fournisseur de modèles sont décrites dans la [documentation](https://pi.dev/docs/latest/providers). Nous vous encourageons à disposer d'un modèle solide pour une planification de bonne qualité et d'un modèle plus rapide, qui codera au fur et à mesure les tâches établies par le planificateur.

Pour celles et ceux qui suivent cette formation en présentiel, nous vous proposons d'utiliser les modèles mis à disposition par [ILaaS](https://www.ilaas.fr/), une plateforme mutualisée issue du monde académique français, pour une IA générative de confiance.

Éditez le fichier `~/.pi/agent/models.json` et remplissez-le de la manière suivante :

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
                    "contextWindow": 128000,
                    "reasoning": true,
                    "cost": { "input": 0.14, "output": 0.28, "cacheRead": 0.0028, "cacheWrite": 0 }
                },
                {
                    "id": "qwen-3.6-35b-instruct",
                    "contextWindow": 256000,
                    "cost": { "input": 0.14, "output": 0.28, "cacheRead": 0.0028, "cacheWrite": 0 }
                }
            ]
        },
    }
}
```

Vous devrez renseigner la clé d'API qui vous aura été fournie. Les modèles indiqués sont ceux disponibles lors de la formation ; la [liste à jour](https://www.ilaas.fr/liste-des-modeles-llms/) se trouve sur le site d'ILaaS.

::: info Le bloc `cost` n'est pas une donnée du fournisseur
Le champ `cost` est optionnel et vaut zéro par défaut. Sans lui, la commande `/session` vous annoncera un coût de 0,00 € sur toutes vos sessions, ce qui vous priverait d'un indicateur dont nous nous servirons beaucoup par la suite.

Les tarifs ci-dessus, exprimés au million de tokens, sont ceux pratiqués sur le marché pour un modèle de gabarit comparable. Ils ne correspondent à aucune facturation réelle : votre usage d'ILaaS ne vous est pas facturé au token. Ils ne sont là que pour obtenir un ordre de grandeur.

Retenez surtout ceci, car c'est déjà une leçon de harnais : le coût qu'affiche un agent de code n'est pas une information reçue du fournisseur, c'est une multiplication effectuée à partir d'un champ de configuration que vous avez écrit vous-même.
:::

Si tout s'est bien passé, vous pouvez utiliser Pi. Lancez une première session interactive avec `pi` dans votre terminal et vérifiez que vous obtenez un prompt de ce type :

![](/figures/pi.png)

Vous y voyez les différents éléments qui composent Pi (contexte, skills, extensions) ainsi que le modèle utilisé par défaut en bas à droite (ici `(ilaas) qwen-3.6-35b-instruct`).

Vous pouvez jouer avec en lui posant des questions, observer la boucle et voir comment il vous répond. Essayez ensuite le mode non interactif avec `pi -p`, qui exécute une requête et rend la main.

## Les premières commandes utiles

- Les outils

    Comme dit en introduction de cette partie, Pi est livré avec quatre outils. Pour en obtenir la liste, il vous suffit de taper

    ```
    /tools
    ```

    Vous devriez voir au moins les outils read, bash, edit et write.

    ::: info Exercice
    À partir du prompt, essayez grâce à votre question de déclencher chacun de ces outils.
    :::

- L'arborescence de votre session

    Il peut être utile de naviguer dans votre session et de repartir d'une des étapes de votre discussion. Pour cela, il faut utiliser la commande

    ```
    \tree
    ```

    ::: info Exercice
    Essayez de repartir d'un point de votre fil de discussion.
    :::

- Reprendre une session précédente

    Vous pouvez repartir de n'importe quelle session précédente à l'aide de la commande

    ```
    \resume
    ```

    ::: info Exercice
    Essayez de repartir d'une session précédente.
    :::

- Exporter sa session

    Enfin, vous pouvez exporter votre session au format HTML ou JSON via la commande

    ```
    \export
    ```

    ::: info Exercice
    Faites un export de votre session en HTML (format par défaut) et ouvrez ce fichier.
    :::

Nous avons fait le tour des principales commandes que nous jugeons utiles pour le moment ; nous en verrons d'autres au fil de la formation.

## Comprendre le contenu des répertoires Pi

Pi distingue deux répertoires portant le même nom `.pi/`, et il faut apprendre à les différencier tout de suite pour ne pas s'y perdre.

Le premier vit dans votre répertoire personnel, `~/.pi/agent/`. C'est la configuration globale, celle qui s'applique par défaut à tous vos projets : vous y avez déjà touché en éditant `~/.pi/agent/models.json` pour déclarer vos fournisseurs de modèles. On y trouve aussi `settings.json`, pour les préférences générales (fournisseur et modèle par défaut, thème, proxy...), et `trust.json`, qui mémorise d'une session à l'autre les projets auxquels vous avez choisi de faire confiance.

Le second vit à la racine de votre projet, `.pi/`, celui que vous versionnez avec le reste du dépôt. Il contient les éléments propres au projet en cours : un `settings.json` qui surcharge le global (les objets imbriqués sont fusionnés et non remplacés dans leur ensemble), et surtout les répertoires que nous remplirons nous-mêmes tout au long de la formation, à commencer par `skills/` pour les outils que nous écrirons.

Cette distinction n'est pas qu'une commodité de rangement. Les skills déclarés dans le répertoire global se chargent sans vérification particulière : ils vous suivent partout. Ceux du projet, eux, ne se chargent qu'une fois ce projet marqué comme sûr, précisément dans ce `trust.json` mentionné plus haut. C'est un premier aperçu très concret de la brique de sûreté que nous reconstruirons plus loin : un harnais qui exécuterait sans discernement du code trouvé dans n'importe quel dépôt cloné serait une faille en soi.

Retenez cette règle simple pour la suite : ce qui doit s'appliquer partout va dans `~/.pi/agent/`, ce qui est propre au dépôt NÉON va dans son `.pi/` local, et c'est ce second répertoire que nous allons peupler au fil des modules qui suivent.

## Les extensions

Pi ne se limite pas à ses quatre outils de base et est complètement extensible. On peut lui ajouter n'importe quelle action via le mécanisme `pi.on(...)` déjà mentionné, qui permet de modifier le comportement de la boucle agentique. On peut aussi changer l'interface utilisateur, le TUI, en ajoutant des informations dans ses différentes zones. Ces deux mécanismes font de vous l'architecte de votre harnais : il vous suffit d'écrire une extension pour vos besoins, de la distribuer, ou de vous servir de celles écrites par la communauté. Pour en trouver, la galerie officielle sur [pi.dev/packages](https://pi.dev/packages) est le meilleur point d'entrée.

Une extension se distribue comme un paquet npm ou comme un dépôt git, et s'installe avec `pi install` :

```
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

Par défaut, l'installation est globale : le paquet est déposé dans `~/.pi/agent/npm/` (ou `~/.pi/agent/git/<hôte>/<chemin>` pour un dépôt git), et l'extension devient disponible dans toutes vos sessions Pi, sur tous vos projets. Ajoutez `-l` à la commande pour l'installer en local à la place : le paquet atterrit alors dans `.pi/npm/`, et l'extension n'est active que pour ce projet, une fois celui-ci marqué comme sûr, exactement comme nous l'avons vu au paragraphe précédent pour les skills. Pour retirer un paquet, la commande symétrique est `pi remove npm:@foo/bar`.

Pour essayer une extension sans l'installer, que ce soit un paquet ou un simple fichier local, l'option `-e` (ou `--extension`) la charge pour la seule durée de la session en cours :

```
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

C'est le réflexe à adopter avant de s'engager sur une extension trouvée dans l'annuaire communautaire. Gardez toutefois à l'esprit qu'une extension s'exécute avec l'intégralité de vos permissions système : n'installez, et ne testez, que ce que vous êtes prêt à faire tourner en confiance.

## Les quatre extensions

Nous aurions pu vous faire construire vos propres extensions, mais dans le temps imparti, sans connaître encore ni l'outil Pi ni la structure d'un harnais, vous y auriez perdu du temps et de la motivation. Nous espérons qu'à la fin de cette formation, vous aurez les idées assez claires pour imaginer vous-même des améliorations de votre harnais sous forme de nouvelles extensions Pi.

Pour construire notre harnais, nous nous appuierons sur quatre extensions :

- `pi-rtk-optimizer` prendra en charge le contexte et la compaction,
- `@tintinweb/pi-subagents` fournira la délégation,
- `pi-hermes-memory` portera la mémoire,
- `pi-lens` complétera l'observabilité et l'outillage de code.

Les permissions et les outils, eux, seront reconstruits à la main dans `.pi/skills/`.

::: info Exercice
Installez en local (`-l`) l'une des quatre extensions ci-dessus, vérifiez qu'elle apparaît bien dans `.pi/npm/`. Lancez Pi : vous devriez la voir dans la section extensions. Vous pouvez ensuite essayer de la retirer avec `pi remove`.
:::

## Pour aller plus loin

- Le [site officiel de Pi](https://pi.dev/) et sa [documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
