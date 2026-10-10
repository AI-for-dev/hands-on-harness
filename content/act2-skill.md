# Les skills : définir des compétences

::: tip Objectifs de ce module
- Savoir ce qu'est un skill
- Distinguer une compétence que le modèle peut ignorer d'une compétence qu'on lui impose
- Écrire une procédure de travail qui produise un livrable exploitable
- Réviser une procédure à partir des sessions lues, en la testant avec plusieurs modèles
:::

Le module précédent vous a permis de vous familiariser avec le contexte et avec la façon d'interagir avec lui. Vous avez également pu voir des écarts de comportement en fonction du modèle choisi. Vous avez pu par ailleurs constater que le fait que l'issue #1 soit très bien précisée dans le fichier `ISSUES.md` de NÉON permet aux modèles assez récents de corriger facilement le bug en ajoutant tous les tests nécessaires, car ils lisent l'ensemble du dépôt et tombent facilement dessus. Vous pourriez mettre un prompt très court : le modèle trouverait quand même ce fichier.

Dans la vraie vie, vous demanderez à corriger le bug sans une explication aussi poussée, parce que vous ne saurez pas forcément évaluer l'ensemble des effets de bord de ce bug.

La question de ce module est donc de savoir si une compétence (appelée *skill*), écrite une fois et rechargée à la demande, obtient les mêmes résultats qu'au module précédent sans fournir les tests.

Nous suivons l'ordre habituel : comprendre ce qu'est un skill dans le harnais, en écrire un sur cette question, mesurer ce qu'il produit.

## Comprendre

### Un skill est un fichier markdown

Un **skill** est un fichier `SKILL.md` posé dans un répertoire `.pi/skills/<nom>/` du projet ou du répertoire global de Pi, au format du standard ouvert [Agent Skills](https://agentskills.io). Il se compose d'un frontmatter, qui porte au minimum un nom et une description, et d'un corps qui contient les instructions. Il n'y a ni code, ni enregistrement, ni configuration à prévoir : déposer le fichier suffit.

Voici un skill complet, volontairement minuscule :

```markdown
---
name: revue-rapide
description: Relit les modifications en cours du dépôt.
Utiliser quand l'utilisateur demande une relecture avant de commiter.
---

# Revue rapide

1. Lance `git diff` et lis toute la sortie.
2. Relève ce qui peut casser un test existant, puis ce qui manque de test.
3. Rends deux listes : « à corriger avant le commit » et « peut attendre ».
```

Un skill décrit des instructions et des fichiers d'appui (scripts, références) qu'un agent charge à la demande, au lieu de les retaper dans chaque prompt. Il occupe une place à part dans le harnais : `AGENTS.md` entre dans le contexte à chaque tour et coûte donc à chaque tour, alors qu'un skill est fait pour n'entrer que quand la tâche le demande.

### Ce que le modèle en voit

Un point de mécanique conditionne tout le reste : Pi injecte dans le prompt système, **à chaque tour**, le nom, la description et le chemin de chaque skill disponible :

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

Les autres harnais fournissent cette liste de manière similaire, mais pas forcément au même endroit du contexte.

Le **corps** du `SKILL.md` n'y est pas. Mais alors, comment le modèle peut-il l'utiliser ? Il y a deux chemins possibles.

Le premier est que le modèle **décide** de l'ouvrir avec l'outil de lecture, sur la foi de la seule description. La documentation de Pi le dit dans les mêmes termes, en ajoutant que « models don't always do this ».

Le second est que l'utilisateur écrive `/skill:revue-rapide` dans son message, auquel cas Pi **développe** le fichier côté client et colle son corps dans le premier tour. Le modèle n'a plus rien à décider.

Il y a deux conséquences pratiques. La description est la seule chose sur laquelle repose le premier chemin, si bien que tout le soin mis dans le corps ne sert à rien tant qu'elle ne déclenche pas. Et un skill ne coûte presque rien tant qu'il n'est pas utilisé, ce qui rend tentant d'en accumuler. Gardez cependant en tête que chaque description ajoutée entre dans le contexte à chaque tour et que vingt skills finissent par former un préambule conséquent.

::: info Exercice (en salle)
Vérifiez cette mécanique par vous-même, dans votre clone de NÉON.

1. Créez `.pi/skills/revue-rapide/SKILL.md` avec le contenu ci-dessus, modifiez une ligne d'un fichier du jeu, puis ouvrez une session.
2. Exportez la session avec `/export` et retrouvez le bloc `<available_skills>` dans le prompt système : le nom, la description et le chemin y sont, le corps n'y est pas.
3. Demandez « relis ce que je viens de modifier » sans nommer le skill, et regardez si le modèle va lire `SKILL.md` de lui-même : l'appel à l'outil de lecture est visible dans la session.
4. Ouvrez une session neuve et tapez `/skill:revue-rapide`. Le corps est cette fois collé dans votre premier message, et il n'y a plus de décision à observer.

Vous venez de parcourir les deux chemins. Le premier repose entièrement sur la description, le second n'en a pas besoin.
:::

::: warning User-invoked seulement
Vous pouvez faire en sorte que votre skill ne puisse pas être déclenché par le modèle, mais uniquement par vous, en mettant dans le frontmatter :

```
disable-model-invocation: true
```

La description du skill ne sera alors pas ajoutée à la liste des skills qui se trouve dans le contexte.
:::

### Anatomie complète

Nous n'avons pour le moment présenté que le fichier `SKILL.md`, mais sachez qu'il y a toute une arborescence possible qui offre plein de possibilités à votre compétence.

```
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

Les trois répertoires optionnels peuvent avoir une grande utilité dans la suite de la construction de votre harnais.

- `scripts` : ce sont des programmes qui accompagnent la compétence et qui sont mentionnés dans `SKILL.md`. Ils permettent de suivre toujours le même chemin et de ne pas laisser le modèle créer ses scripts à la volée, car, vous le savez, ça ne sera jamais la même façon de faire.
- `references` : il arrive parfois que `SKILL.md` devienne trop long et que certaines parties soient spécifiques. Vous pouvez alors demander dans les instructions du skill d'aller voir dans ces fichiers de référence. Vous pouvez voir ça comme une forme de récurrence. Imaginez que vous ayez un skill pour la documentation. La documentation dans un logiciel est de différentes natures : utilisateur, référence, API, how-to, tuto... Et elle ne s'écrit pas de la même manière en fonction de la cible. Vous pourriez donc envisager de lister dans le skill ces différentes documentations avec leur description et de référencer les fichiers se trouvant dans `references` pour que le modèle lise uniquement celui qui le concerne.
- `assets` : vous trouverez dans ce répertoire tout document utile au modèle dont le skill a besoin : image, template...

Nous les utiliserons dans la deuxième partie de **Reconstruire**.

### Dois-je écrire mon skill ?

Tout dépend, encore une fois, du degré de maîtrise que vous souhaitez avoir sur votre harnais. Vous trouverez plein de sites qui vous proposent des skills. Le plus connu est probablement https://www.skills.sh/. Néanmoins, il faut faire attention, car, comme nous l'avons vu, le skill peut demander à votre modèle de faire des choses pour lui ou lancer des scripts. Une vigilance au niveau de la sécurité est donc à prendre en compte.

Nous vous encourageons dans un premier temps à les écrire par vous-même en vous inspirant de personnes ayant un recul suffisant sur l'utilisation des skills et qui peuvent être une source d'inspiration. Voici, selon nous, les trois personnes qui offrent les meilleurs skills en octobre 2026 :

- Lauren Tan : https://github.com/cursor/plugins/tree/main/pstack
- Matt Pocock : https://github.com/mattpocock/skills
- Addy Osmani : https://github.com/addyosmani/agent-skills

Vous pouvez également vous servir du skill [skill-creator d'Anthropic](https://www.skills.sh/anthropics/skills/skill-creator) pour faire votre premier squelette.

::: warning Les agents ne sont pas des humains
Il faut faire attention lorsque l'on écrit un skill. Il n'est pas à destination d'un humain, mais d'un modèle, et un modèle n'a pas besoin des mêmes informations. Un humain a tendance à prendre ce en quoi il croit et à écarter les paragraphes qui lui semblent moins pertinents. S'il a un doute, il fera une recherche pour se faire sa propre opinion. Un modèle ou un agent ne fera pas du tout cette démarche. Il suivra à la lettre vos instructions et tout ce qui sera écrit aura la même importance pour lui. Un agent ne va pas non plus deviner ce que vous aurez oublié de dire.

Tout ça pour dire qu'il faut aller à l'essentiel et écrire le processus que vous souhaitez répéter encore et encore à chaque appel du skill.
:::

## Reconstruire

Nous allons maintenant essayer de créer une compétence en adéquation avec le projet NÉON. Comme nous l'avons mentionné en introduction, le précédent module a démontré que si l'agent avait une définition précise des problèmes liés à un bug et des tests associés, alors il devrait être en mesure de vous donner une solution de qualité.

Nous proposons donc de le faire en deux temps. La première version répertorie l'ensemble des problèmes rencontrés dans un casse-brique en lien avec l'issue #1. Le problème avec cette première version est qu'elle est beaucoup trop spécifique à notre cas. L'intérêt d'une compétence est qu'elle soit spécifique à une problématique, mais assez généraliste pour pouvoir l'utiliser dans d'autres cas. La deuxième version essaiera donc de construire une liste de bugs pour le jeu d'arcade envisagé avant de suivre le même processus que la première solution.

### Version 1

Nous allons faire cette version en plusieurs étapes. Il faut bien comprendre que la création d'un skill est un processus itératif. Vous allez le tester puis l'améliorer au fur et à mesure des tests sur celui-ci. Le modèle a également son importance. Vous pouvez avoir un skill qui fonctionne très bien sur un modèle assez performant et s'effondrer sur un modèle plus léger. À vous de voir si vous souhaitez que votre compétence fonctionne avec un ensemble de modèles.

Les modèles évoluant très vite, le skill ne doit pas être figé et vous devez le faire évoluer dans le processus d'amélioration de votre harnais. Des instructions écrites peuvent être moins utiles, voire néfastes à l'avenir.

Vous pouvez vous appuyer sur le skill [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) proposé par Anthropic ou essayer pas à pas.

::: info Exercice (en salle)
Commencez par écrire le frontmatter et faire en sorte que le skill soit appelé à chaque fois qu'on demande à corriger un bug dans NÉON.

Testez-le avec différents modèles.
:::

Nous allons maintenant définir une liste de bugs connus. Nous aurions pu vous la faire construire seuls, mais nous préférons vous en donner un exemple afin que vous vous concentriez sur l'essentiel. Voici donc le début du skill que nous vous proposons :

::: details Le début du skill `playtester`

<<<@/../scripts/skills/playtester/SKILL.md#L1-77{md}

:::

::: info Exercice (en salle)
À partir de ce début de fichier déjà assez explicite, nous vous demandons d'écrire deux autres parties :

- **3. Tests rouges** : comment l'agent écrit les tests de la liste établie à l'étape 2 ;
- **4. Vérification** : à quel moment l'agent a fini.

Testez ensuite votre skill avec au moins deux modèles, sur la demande négligée du module précédent, sans laisser l'agent lire `ISSUES.md`. Regardez les tests produits et vérifiez qu'ils couvrent l'ensemble des problèmes du bug #1 décrit dans `ISSUES.md`. Si ce n'est pas le cas, corrigez la procédure et recommencez.

Notre version est dans la solution ci-dessous. Ne l'ouvrez qu'après avoir testé la vôtre.
:::

::: details Solution : le skill `playtester` complet

<<<@/../scripts/skills/playtester/SKILL.md{md}

:::

### Version 2

La première version fonctionne sur NÉON, mais son catalogue a été écrit à la main pour un casse-brique. Si vous utilisez `playtester` sur un shoot 'em up ou un jeu de plateforme, la procédure reste valable, mais l'agent n'a plus aucune entrée dans laquelle choisir. Nous allons donc demander à l'agent de construire lui-même le catalogue du genre à partir d'une recherche web. Ce catalogue sera rangé dans le répertoire `references` du skill : il n'est construit qu'une fois et relu aux appels suivants. Le reste de la procédure ne change presque pas.

C'est l'occasion d'utiliser les répertoires optionnels dont nous avons parlé plus haut. Le skill `dynamic-playtester` a la forme suivante :

```
dynamic-playtester/
├── SKILL.md
├── references/
│   ├── consignes-catalogue.md   # consignes pour construire le catalogue
│   └── bugs-arcade.md           # le catalogue, écrit par le script
└── scripts/
    └── catalogue.sh             # construit le catalogue dans une session séparée
```

Nous allons écrire ces fichiers dans l'ordre : les consignes pour construire le catalogue, le script qui les exécute, puis le skill qui appelle le script. Pi n'a pas d'outil de recherche web : ses outils de base sont `read`, `write`, `edit` et `bash`. La recherche passe donc par l'extension `pi-web-access`, qui fournit les outils `web_search` et `fetch_content`, quel que soit le modèle utilisé. Installez-la avant de commencer :

```bash
pi install npm:pi-web-access
```

Elle fonctionne sans clé d'API. Le script de collecte que nous allons écrire tourne dans l'outil `codemode` de Pi, disponible à partir de la version 1.0.

#### Les consignes du catalogue

Le fichier `references/consignes-catalogue.md` n'est pas lu par l'agent qui corrige le bug. Il contient les consignes données à une autre session, lancée par le script, dont le seul travail est d'écrire `references/bugs-arcade.md`. Ces consignes ne servent qu'au moment de construire le catalogue, c'est pourquoi elles sont dans `references` et non dans `SKILL.md`.

Cette session ne connaît que les consignes, le genre du jeu et le chemin du fichier à écrire. Elle doit donc savoir ce qu'elle cherche, où le chercher et sous quelle forme rendre le résultat. La forme est le point le plus important : le skill va relire ce fichier, et chaque entrée doit avoir un invariant, puisque c'est lui que les tests vérifieront. Gardez aussi en tête que le texte des pages vient d'internet et que n'importe qui a pu l'écrire. Les consignes doivent donc préciser qu'il s'agit de données et non d'instructions.

Pour la recherche elle-même, vous pouvez laisser le modèle choisir ses requêtes et ouvrir les pages une par une. Il fera alors un tour de boucle par appel, et deux exécutions ne chercheront pas la même chose. L'outil `codemode` permet au contraire de lancer un script qui fait toutes les recherches et ouvre toutes les pages en un seul tour. On retrouve la même idée que pour le répertoire `scripts` : suivre toujours le même chemin.

::: info Exercice (en salle)
Écrivez `references/consignes-catalogue.md`. La session doit chercher les bugs du genre pour chacun de ces composants : déplacement et collision, entrées du joueur, bords de l'écran, pas de temps, score et état. Elle écrit une entrée par cause distincte, avec son symptôme, sa cause, son invariant et l'URL de la page d'où elle vient, et elle ajoute une section au fichier sans effacer les autres genres.
:::

::: details Solution : `references/consignes-catalogue.md`

<<<@/../scripts/skills/dynamic-playtester/references/consignes-catalogue.md{md}

:::

#### Le script qui construit le catalogue

Vous pourriez demander directement à l'agent de faire la recherche. Le problème est que l'agent qui reçoit le ticket connaît le symptôme et va chercher autour de lui : « la balle traverse les briques » ramène des pages sur le tunneling, et le catalogue ne contiendra que ça. C'est justement ce que nous voulons éviter. Une session lancée avec `pi -p` part d'un contexte vide. Elle ne connaît que le genre, et cherche donc sur tous les composants.

Cette session ne doit rien charger d'autre que les consignes : ni `AGENTS.md`, ni les skills. Sinon, elle risque de retrouver le symptôme, voire d'appeler `dynamic-playtester` elle-même. Elle n'a besoin que des outils de recherche, de lecture et d'écriture, et il est préférable qu'elle utilise le même modèle que la session qui l'appelle.

::: info Exercice (en salle)
Écrivez `scripts/catalogue.sh`, qui prend le genre en argument (`bash scripts/catalogue.sh "breakout"`), lance la session décrite ci-dessus avec les consignes de `references/consignes-catalogue.md`, puis vérifie que `references/bugs-arcade.md` n'est pas vide.

Lancez-le seul sur `breakout` et comparez le résultat avec le catalogue de la version 1. Lancez-le une deuxième fois : obtenez-vous le même catalogue ?
:::

::: details Solution : `scripts/catalogue.sh`

<<<@/../scripts/skills/dynamic-playtester/scripts/catalogue.sh{bash}

:::

#### Adapter le skill

Il reste à modifier `playtester` pour qu'il ne dépende plus du casse-brique. Le catalogue écrit en dur laisse la place à une première étape qui lit `references/bugs-arcade.md` et lance le script si le genre du jeu n'y est pas encore. Le genre doit être écrit en anglais, puisqu'il sert de mot-clé pour la recherche.

Les autres étapes restent en place, mais plusieurs passages ont été écrits pour des balles et des briques : faces, coin, grille, sens de `y`... Il faut les généraliser sans perdre les règles de montage, qui restent valables dans un shoot 'em up. Enfin, un catalogue tiré du web mélange les défauts et les suggestions de gameplay, comme « accélérer la balle au fil du niveau ». L'agent doit savoir écarter les secondes.

::: info Exercice (en salle)
Écrivez `dynamic-playtester/SKILL.md` à partir de `playtester`.

Testez-le sur NÉON avec la demande négligée, sans `ISSUES.md` et sans `references/bugs-arcade.md`. Le premier appel doit construire le catalogue et le second le réutiliser. Les tests produits couvrent-ils les problèmes de l'issue #1 aussi bien qu'avec la version 1 ?
:::

::: details Solution : le skill `dynamic-playtester` complet

<<<@/../scripts/skills/dynamic-playtester/SKILL.md{md}

:::

## Généraliser

Ce que nous avons construit pour NÉON vaut pour n'importe quel skill.

Un skill est une procédure écrite en texte. Il n'exécute rien par lui-même : il dit au modèle dans quel ordre travailler et ce qu'il doit rendre. Quand une étape doit toujours se faire de la même façon, mieux vaut la mettre dans un script du répertoire `scripts` que la décrire, comme nous l'avons fait pour la construction du catalogue.

La description est la seule partie que le modèle lit à coup sûr. Elle doit dire quand se servir du skill, et pas seulement ce qu'il fait. Si vous voulez être certain que le skill soit utilisé, appelez-le vous-même avec `/skill:<nom>`.

Les connaissances d'un domaine et la procédure qui s'en sert n'ont pas à vivre dans le même fichier. Dans la version 1, le catalogue était écrit dans `SKILL.md`, et le skill ne valait que pour un casse-brique. Dans la version 2, le catalogue est construit par un script et rangé dans `references`, et la même procédure peut servir à d'autres genres de jeux.

Une tâche qui ne doit pas dépendre de ce que sait l'agent peut tourner dans une session séparée. La session lancée par `catalogue.sh` ne connaît pas le symptôme, et elle cherche donc les bugs sur tout le genre au lieu de s'arrêter au cas rapporté.

Une procédure doit dire quand le travail est fini, avec un critère que l'agent peut vérifier seul. Ici, chaque entrée retenue a ses tests, les tests existants passent toujours et chaque nouveau test échoue sur une `AssertionError`.

Enfin, un skill se teste comme du code. Lancez-le avec plusieurs modèles, lisez les sessions pour voir où l'agent s'écarte de ce que vous avez écrit, corrigez et recommencez. Un skill qui fonctionne avec un modèle peut échouer avec un autre, et il devra évoluer en même temps que les modèles.

## Livrable

Ce module produit trois pièces.

**1. Le skill `playtester`**, dans `.pi/skills/playtester/` de votre clone de NÉON, avec le catalogue du casse-brique dans `SKILL.md`.

**2. Le skill `dynamic-playtester`**, dans `.pi/skills/dynamic-playtester/`, avec les consignes `references/consignes-catalogue.md`, le script `scripts/catalogue.sh` et le catalogue `references/bugs-arcade.md` qu'il a construit. Gardez aussi les tests rouges produits par chaque version sur l'issue #1 : ce sont eux qui permettent de comparer les deux.

**3. La ligne « skills » de la fiche de décision** :

| levier                                | effet mesuré | adopté ? | pourquoi |
| ------------------------------------- | ------------ | -------- | -------- |
| skill choisi par le modèle            |              |          |          |
| skill imposé par `/skill:`            |              |          |          |
| catalogue écrit à la main             |              |          |          |
| catalogue construit par recherche web |              |          |          |
| script dans `scripts/`                |              |          |          |
| session séparée                       |              |          |          |

::: tip Critère de réussite
Vous savez dire quels problèmes de l'issue #1 vos tests couvrent avec chaque version du skill, lesquels manquent, et ce que vous avez changé dans le skill après avoir lu les sessions.
:::

## Pour aller plus loin

- La [spécification Agent Skills](https://agentskills.io/specification), qui décrit le format de `SKILL.md`, les répertoires optionnels `scripts`, `references` et `assets`, et la règle qui veut que le nom du skill soit celui de son répertoire.
- La [documentation des skills de Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md), pour l'emplacement des skills et la façon dont Pi les charge.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills), sur le chargement progressif : la description d'abord, le corps ensuite, les fichiers annexes seulement si besoin.
- Anthropic, [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices), des conseils d'écriture qui recoupent ceux de ce module : aller à l'essentiel, sortir le détail dans des fichiers de référence, tester avec chaque modèle visé.
- La page de [pi-web-access](https://pi.dev/packages/pi-web-access), pour configurer d'autres moteurs de recherche que celui par défaut.
