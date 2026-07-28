# Le harnais de départ : Pi

::: tip Objectifs de ce module
- Pourquoi utiliser Pi
- Lancer Pi et comprendre le rôle du répertoire `.pi/`
- Situer les quatre extensions que nous utiliserons pour incarner la grille des briques
- Cadrer honnêtement l'exercice de reconstruction
:::

Nous avons vu précédemment qu'un harnais était un ensemble d'outils au-dessus des modèles LLM. Chacun peut jouer un rôle essentiel dans l'accomplissement d'une tâche en toute autonomie. Vous avez à votre disposition un ensemble de harnais déjà construits : claude code, codex, opencode, Pi... Mais dans la plupart des cas, vous ne maîtrisez rien et vous vous laissez guider en espérant que ça fasse ce que vous lui avez demandé. Si quelque chose se passe mal, il n'est pas forcément aisé de comprendre pourquoi. Or, notre objectif est justement de comprendre comment marche un harnais dans le moindre de ses détails. Nous souhaitons pouvoir ajouter ou retirer facilement un élément à celui-ci et en tester les conséquences.

Dans la suite, nous allons utiliser [Pi](https://pi.dev), un agent de code en ligne de commande, ouvert et extensible qui est minimaliste. Ce qui va nous intéresser c'est précisément la possibilité de lui ajouter des extensions simplement et de comprendre tout ce qui se passe à l'intérieur sans surprises : une maîtrise de bout en bout.

## Ce qu'est Pi

Pi est un agent de code qui tourne dans votre terminal créé initialement par Mario Zechner. Son but premier était justement d'avoir la maîtrise de son harnais. Pi repose sur une poignée d'outils de base — lire un fichier, en écrire un, l'éditer, exécuter une commande shell — et sur une boucle agentique qui enchaîne les appels au modèle, l'exécution des outils et la relecture des résultats. C'est exactement la boucle que nous avons décrite au module précédent, réduite à sa plus simple expression.

Autour de ce noyau, Pi expose un système d'extensions et d'événements. Vous pouvez vous brancher sur les moments clés de la boucle avec `pi.on(...)`, de la même façon qu'on branche des hooks dans Claude Code.

Comme Claude Code s'appuie sur un répertoire `.claude/`, Pi s'appuie sur un répertoire `.pi/`. C'est là que vivent la configuration, les skills, les agents et les règles de permission. Vous pouvez le considérer comme l'équivalent, côté Pi, de ce que vous connaissez peut-être déjà côté Claude Code.

Pi se connaît très bien et est donc en mesure de vous aider pour étendre ses fonctionnalités. Tout est décrit dans son "system prompt" comme vous le verrez dans un instant.

## Premiers pas

Pour installer Pi, il vous suffit de vous rendre sur le site officiel https://pi.dev et de vous laisser guider.

Ensuite, il vous faut installer des modèles qui vous serviront tout au long de vos expériences. Vous avez plusieurs façons de renseigner votre fournisseur de modèles: https://pi.dev/docs/latest/providers. Nous vous encourageons à avoir un modèle assez puissant pour faire de la planification de bonne qualité et un modèle plus rapide qui va coder au fur et à mesure ce que le planificateur aura établi comme tâches.

Pour celles et ceux qui suivent cette formation en présentiel, nous vous proposons d'utiliser les modèles mis à disposition par [ILaaS](https://www.ilaas.fr/) qui est une plateforme mutualisée visant une IA générative de confiance, robuste, éthique et sobre. Ce service provient du monde académique français.

Vous devez éditer ce fichier `~/.pi/agent/models.json` et le remplir de la manière suivante :

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
                    "reasoning": true
                },
                {
                    "id": "qwen-3.6-35b-instruct",
                    "contextWindow": 256000
                }
            ]
        },
    }
}
```

Vous devrez renseigner l'api key qui vous aura été fournie. Les modèles annoncés sont ceux disponibles lors de la formation. N'hésitez pas à aller sur la page d'IlaaS pour les mises à jour (https://www.ilaas.fr/liste-des-modeles-llms/).

Si tout s'est bien passé, vous devrez pouvoir utiliser Pi. Lancez une première session interactive avec `pi` dans votre terminal et vérifier que vous avez un prompt. Quelque chose comme

![](/figures/pi.png)

Vous pouvez constater les différents éléments que composent Pi (contexte, skills, extensions) ainsi que le modèle utilisé par défaut en bas à droite (ici `(ilaas) qwen-3.6-35b-instruct`).

Vous pouvez jouer avec en lui posant des questions, observer la boucle et voir comment il vous répond. Essayez ensuite le mode non interactif avec `pi -p`, qui exécute une requête et rend la main.

## Les premières commandes utiles

- Les outils

    Comme dit en introduction de cette partie, Pi est livré avec 4 outils. Pour obtenir la liste, il vous suffit de tapez

    ```
    /tools
    ```

    Vous devriez voir au moins les outils : read, bash edit, write.

    ::: info Exercice
    À partir du prompt, essayez grâce à votre question de déclencher chacun de ces outils.
    :::

- L'arborescence de votre session

    Il peut être utile de naviguer dans votre session et repartir à une des étapes de votre discussion. Pour cela, il faut utiliser la commande

    ```
    \tree
    ```

    ::: info Exercice
    Essayez de repartir d'un point de votre fil de discussion.
    :::

- Reprendre une session précédente

    Vous pouvez repartir de n'importe quelles sessions précédentes à l'aide de la commande

    ```
    \resume
    ```

    ::: info Exercice
    Essayez de repartir d'une session précédente.
    :::

- Exporter sa session

    Enfin, vous pouvez exporter votre session au format html ou json via la commande

    ```
    \export
    ```

    ::: info Exercice
    Faites un export de votre session en html (format par défaut) et ouvrez ce fichier. Vous pouvez enfin voir à quoi ressemble de "system prompt" minimal de Pi !
    :::

Nous avons fait le tour des principales commandes que nous jugeons utiles pour le moment. Nous en verrons d'autres au cours de ce périple.

## Comprendre le contenu des répertoires Pi

Pi distingue deux répertoires portant le même nom `.pi/`, et il faut apprendre à les différencier tout de suite pour ne pas s'y perdre.

Le premier vit dans votre répertoire personnel, `~/.pi/agent/`. C'est la configuration globale, celle qui s'applique par défaut à tous vos projets : vous y avez déjà touché en éditant `~/.pi/agent/models.json` pour déclarer vos fournisseurs de modèles. On y trouve aussi `settings.json`, pour les préférences générales (fournisseur et modèle par défaut, thème, proxy...), et `trust.json`, qui mémorise d'une session à l'autre les projets auxquels vous avez choisi de faire confiance.

Le second vit à la racine de votre projet, `.pi/`, celui que vous versionnez avec le reste du dépôt. Il contient les éléments propres au projet en cours : un `settings.json` qui surcharge le global (les objets imbriqués sont fusionnés, pas remplacés dans leur ensemble), et surtout les répertoires que nous remplirons nous-mêmes tout au long de la formation, à commencer par `skills/` pour les outils que nous écrirons.

Cette distinction n'est pas qu'une commodité de rangement. Les skills déclarés dans le répertoire global se chargent sans vérification particulière : ils vous suivent partout. Ceux du projet, eux, ne se chargent qu'une fois ce projet marqué comme sûr, précisément dans ce `trust.json` mentionné plus haut. C'est un premier aperçu très concret de la brique de sûreté que nous reconstruirons plus loin : un harnais qui exécuterait sans discernement du code trouvé dans n'importe quel dépôt cloné serait une faille en soi.

Retenez cette règle simple pour la suite : ce qui doit s'appliquer partout va dans `~/.pi/agent/`, ce qui est propre au dépôt NÉON va dans son `.pi/` local, et c'est ce second répertoire que nous allons peupler au fil des modules qui suivent.

## Les extensions

Pi ne se limite pas à ses quatre outils de base et est complètement extensible. On peut lui ajouter n'importe quelles actions via le mécanisme `pi.on(...)` déjà mentionné qui permet de modifier le comportement dans la boucle agentique. On peut également changer l'interface utilisateur appelé TUI en ajoutant des informations dans les différentes zones. Ces changements de comportements rendent Pi extrêmement intéressant car c'est vous qui êtes l'architecte de votre harnais. Il vous suffit de créer une extension pour vos besoins. Vous pouvez bien évidemment la distribuer ou vous servir d'extensions réalisées par la communauté. Pour en trouver, la galerie officielle sur [pi.dev/packages](https://pi.dev/packages) est la meilleure des ressources.

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

Nous aurions pu vous faire construire vos propres extensions, mais étant donné le temps imparti et le fait que vous ne connaissez certainement nu l'outil Pi, ni la structure d'un harnais, cela aurait été une perte de temps et de motivation. Nous espérons qu'à la fin de cette formation, vous aurez les idées assez claires pour avoir des idées d'amélioration de votre harnais au travers de nouvelles extensions de Pi.

Pour construire notre harnais, nous nous appuierons sur quatre extensions :

- `pi-rtk-optimizer` prendra en charge le contexte et la compaction,
- `@tintinweb/pi-subagents` fournira la délégation,
- `pi-hermes-memory` portera la mémoire,
- `pi-lens` complétera l'observabilité et l'outillage de code.

Les permissions et les outils, eux, seront reconstruits à la main dans `.pi/skills/`.

::: info Exercice
Installez en local (`-l`) l'une des quatre extensions présentées juste après, vérifiez qu'elle apparaît bien dans `.pi/npm/`. Lancez Pi, vous devriez la voir dans la section extension. Vous pouvez essayer de la retirer avec `pi remove`.
:::

## Pour aller plus loin

- Le [site officiel de Pi](https://pi.dev/) et sa [documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
