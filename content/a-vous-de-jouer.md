# À vous de jouer

::: tip Objectifs de ce module
- Savoir quoi reprendre de trysquare et de combo une fois la formation terminée
- Savoir où chercher des skills écrits par des praticiens qui les utilisent au quotidien
- Situer trysquare et combo parmi les outils d'évaluation et de workflows plus aboutis
- Reconnaître dans les usines logicielles qui apparaissent les briques construites pendant l'acte 2
:::

Tout au long de la formation, vous avez travaillé sur NÉON, un dépôt que nous avions préparé pour que chaque levier du harnais y produise un effet visible. Votre propre dépôt n'aura ni un `ISSUES.md` aussi détaillé, ni une issue #1 dont on connaît d'avance tous les effets de bord, et c'est sur lui que les choix faits pendant ces trois actes doivent maintenant tenir. Pour continuer seuls, vous pouvez repartir des deux outils écrits pour la formation, lire les skills de praticiens qui en écrivent depuis longtemps, et regarder les outils plus aboutis qui font déjà la même chose que les nôtres, jusqu'aux usines logicielles qui assemblent toutes les briques de l'acte 2.

## Que garder de trysquare et de combo ?

Nous avons écrit deux outils pour cette formation, pour que chaque expérience d'un module se lance en quelques minutes depuis une session Pi et que leur code reste assez court pour être lu.

[combo](https://github.com/AI-for-dev/combo) est une extension de Pi qui déroule un **flow**, c'est-à-dire un graphe de tâches décrit en YAML et en markdown, dont les nœuds sont des sous-agents et dont l'enchaînement est décidé par le code au lieu du modèle. Le [module 2.5](./act2-workflows) l'a utilisé pour écrire la chaîne explorer, planner, implémentation et tests, avec une boucle plafonnée et un arrêt humain avant le commit. Sa [documentation](https://github.com/AI-for-dev/combo/tree/main/docs) décrit aussi les flows `build` et `build-attended`, qui font de façon générique ce que le module a fait sur un ticket.

[trysquare](https://github.com/AI-for-dev/trysquare) est un outil en Python qui rejoue les configurations d'un scénario, note chaque exécution et dit si l'écart mesuré entre deux configurations tient au rééchantillonnage. Le [module 3.0](./act3-trysquare) en décrit le fonctionnement et le [module 3.1](./act3-contexte) l'a appliqué aux leviers du contexte. Le dépôt [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) contient les scénarios de l'acte 3 et sert de point de départ pour écrire les vôtres.

::: warning Des outils de formation
combo et trysquare ont été écrits pour expérimenter vite. Ils ne pilotent aujourd'hui que Pi et n'ont pas encore été éprouvés en production. Nous vous conseillons de les utiliser pour décider de ce que vous mettez dans votre harnais, puis de regarder les outils de la section suivante si vous avez besoin de le faire tourner tous les jours sur une équipe.
:::

La démarche est plus importante que les outils eux-mêmes, et elle se transpose sur votre dépôt sans changement : choisir un ticket réel dont on sait vérifier la correction par un test, écrire la demande telle que vous l'écririez un jour ordinaire, puis faire varier un seul levier à la fois (le modèle, `AGENTS.md`, un skill, un flow) en répétant chaque configuration assez de fois pour que l'écart observé ne soit pas du bruit.

## Où trouver des skills dont s'inspirer ?

Le [module 2.2](./act2-skill) vous a fait écrire `playtester` puis `dynamic-playtester` à la main, et nous vous encourageons à continuer ainsi : un skill que vous avez écrit et testé avec vos modèles est un skill dont vous savez ce qu'il fait. Lire les skills de personnes qui les utilisent depuis longtemps reste le meilleur moyen d'apprendre à les écrire. Voici les trois dépôts que nous recommandons en octobre 2026.

- [pstack](https://github.com/cursor/plugins/tree/main/pstack), de Lauren Tan, qui regroupe les skills qu'elle utilise chaque jour chez Cursor, dont plusieurs répartissent une même tâche entre plusieurs modèles pour profiter des points forts de chacun.
- [mattpocock/skills](https://github.com/mattpocock/skills), de Matt Pocock, des skills volontairement courts et faciles à adapter (développement piloté par les tests, conception de modules, diagnostic de bugs), qui décrivent chacun une procédure avec un critère de fin vérifiable, comme nous l'avons fait pour `playtester`.
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), d'Addy Osmani, qui découpe le cycle de développement en neuf commandes (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`...) dont chacune charge les skills de l'étape.

Le skill [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) d'Anthropic reste utile pour écrire un premier squelette, et le catalogue [skills.sh](https://www.skills.sh/) pour voir ce qui existe sur un sujet.

::: danger Un skill est du code
Un skill peut demander au modèle de lancer ses scripts, de lire des pages web ou d'écrire dans votre dépôt. Installer un skill trouvé en ligne revient donc à exécuter du code dont vous n'êtes pas l'auteur, avec les droits de votre agent. Lisez `SKILL.md` et le contenu de `scripts/` avant de l'installer, et faites-le tourner dans le bac à sable du [module 2.0](./act2-sandbox) tant que vous ne l'avez pas lu.
:::

## Quels outils font la même chose que trysquare et combo ?

Pour l'évaluation, [Inspect](https://inspect.aisi.org.uk/), le framework de l'AI Security Institute britannique, rejoue chaque échantillon avec `--epochs`, agrège les répétitions et publie une erreur standard, et son paquet [Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/) fait tourner Claude Code, Codex CLI, Gemini CLI ou OpenCode dans un bac à sable. [Harbor](https://github.com/harbor-framework/harbor), écrit par l'équipe de Terminal-Bench, lance des agents sur des tâches en conteneurs avec `--n-attempts` et peut répartir la charge chez des fournisseurs de bacs à sable distants comme Daytona ou Modal. Ces deux outils couvrent plus d'agents et plus d'infrastructure que trysquare, au prix d'une installation plus lourde, et aucun des deux ne se concentre sur la question qui a occupé l'acte 3 : savoir si l'écart entre deux configurations de harnais, sur une tâche fixe, est réel.

Pour les workflows, [Archon](https://github.com/coleam00/Archon) décrit un workflow comme un graphe YAML rangé dans `.archon/workflows/`, y mêle des nœuds déterministes (bash, tests, git) et des nœuds confiés à Claude Code, Codex ou Pi, gère les boucles et les validations humaines, et livre une vingtaine de workflows prêts à l'emploi. [Fabro](https://github.com/fabro-sh/fabro), distribué en un seul binaire Rust, décrit le graphe en DOT (le langage de [Graphviz](https://graphviz.org/)), attribue un modèle à chaque nœud par une feuille de style et suspend le run à des portes d'approbation. Ces moteurs lancent les agents depuis l'extérieur du harnais, alors qu'un flow combo se lance avec `/run` depuis la session Pi et laisse lire la trace de chaque sous-agent au même endroit. Les motifs du module 2.5 (chaîne, boucle plafonnée, tests comme juge, arrêt humain) ont un équivalent direct dans Archon, si bien qu'un flow écrit pendant la formation s'y transpose nœud par nœud.

## Qu'est-ce qu'une usine logicielle ?

Une **usine logicielle** (*software factory*) est un système qui reçoit une demande, le plus souvent une issue ou une spécification, et rend une pull request ou un rapport, en faisant travailler plusieurs agents en parallèle, chacun dans son propre arbre de travail, sous une supervision qui ne sollicite l'humain que pour les décisions qui lui reviennent. Les outils de cette famille sont jeunes et changent de semaine en semaine. Nous les présentons ici parce qu'ils assemblent les briques que vous avez construites une par une pendant l'acte 2 : le bac à sable, le contexte, les skills, la délégation à des sous-agents, les workflows et les hooks.

[Machinist](https://github.com/owainlewis/machinist), écrit en Go et publié en accès anticipé, tourne sur votre machine et garde les dépôts et les clés en local. Une **commande** y associe un prompt, un exécutable qui le lit sur son entrée standard (Codex, Claude Code, un autre agent, un script de tests) et un délai maximal, et un workflow enchaîne ces commandes en conservant les fichiers produits d'une étape à l'autre, et peut s'arrêter avant une étape pour attendre votre approbation. Le fichier de configuration est en TOML, et le workflow `task-to-pr` livré par défaut passe d'une issue GitHub à une pull request. Machinist ne voit pas l'intérieur d'une commande : un script interrompu repart du début, à moins qu'il ne gère lui-même ses points de reprise.

[firstmate](https://github.com/kunchenguid/firstmate) se présente comme une distribution d'agent plutôt que comme un logiciel à installer : le dépôt cloné contient un `AGENTS.md`, des skills et des scripts, et c'est le harnais que vous lancez dedans (Pi, Claude Code, Codex, OpenCode et d'autres) qui devient le « second ». Vous ne parlez qu'à cet agent, qui lance un agent par tâche dans une fenêtre tmux ou un onglet [herdr](https://herdr.dev) que vous pouvez regarder, lui donne un arbre de travail git propre, le surveille jusqu'au bout et vous rend une pull request ou un rapport d'investigation. La surveillance est confiée à un script bash qui ne réveille le modèle que lorsqu'un agent a besoin de lui, ce qui évite de payer des tokens pendant l'attente. On retrouve le motif du [module 2.4](./act2-delegation), un orchestrateur et des sous-agents isolés, poussé jusqu'à plusieurs tâches en parallèle sur plusieurs dépôts.

[Gas Town](https://github.com/steveyegge/gastown), de Steve Yegge, coordonne des agents (Claude Code, GitHub Copilot, Codex, Gemini et d'autres) répartis sur plusieurs projets, avec un agent coordinateur, des boîtes aux lettres entre agents et un état de travail conservé dans git, pour qu'un agent redémarré reprenne là où il en était. Son README annonce un fonctionnement confortable avec vingt à trente agents, un chiffre que nous n'avons pas mesuré.

Ces outils vous font passer d'un agent que vous surveillez à plusieurs agents que vous dirigez, mais chaque agent ajouté multiplie les tokens dépensés et les pull requests à relire, et aucun d'eux ne dit si sa configuration corrige vos tickets plus souvent qu'un agent seul bien réglé, alors que c'est exactement la question à laquelle trysquare répond. Avant de confier votre dépôt à une usine, mesurez sur quelques tickets réels si elle livre plus souvent un correctif qui passe les tests que la configuration que vous avez retenue, et pour quel coût.

## Pour aller plus loin

- [combo](https://github.com/AI-for-dev/combo) et sa [documentation](https://github.com/AI-for-dev/combo/tree/main/docs).
- [trysquare](https://github.com/AI-for-dev/trysquare), sa [documentation](https://ai-for-dev.github.io/trysquare/) et le dépôt d'exercice [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter).
- La [spécification Agent Skills](https://agentskills.io/specification), pour écrire des skills qui fonctionnent d'un harnais à l'autre.
- La [documentation de Machinist](https://github.com/owainlewis/machinist/blob/main/docs/README.md), en particulier le [guide des workflows de tâches](https://github.com/owainlewis/machinist/blob/main/docs/task-guide.md).
- L'[architecture de firstmate](https://github.com/kunchenguid/firstmate/blob/main/docs/architecture.md), qui détaille la supervision, l'isolation des arbres de travail et les modes de livraison par projet.
