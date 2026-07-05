# Hands-on Harness

*Une formation pour vous faire découvrir les harnais et les dompter*

## Contexte

L'utilisation des Large Language Models (LLM) dans nos tâches quotidiennes devient de plus en plus importante, que ce soit dans la retranscription de réunions, l'analyse de documents ou encore le codage d'applications. Nous nous concentrerons dans la suite sur leur impact dans un cadre de développement logiciel.

L'évolution des LLM ainsi que leur écosystème se sont développés à une vitesse folle. Rappelons que ChatGPT a été proposé au grand public fin novembre 2022. Depuis, une multiplication de techniques et d'outils a vu le jour :

- **2022 : complétion intelligente** — Les modèles commencent à prédire et compléter le code à la volée, directement dans l'éditeur. C'est comme l'autocomplétion classique, mais alimentée par des LLM entraînés sur des milliards de lignes de code public.
- **2022-2023 : prompt engineering** — Avec ChatGPT accessible au grand public, les développeurs découvrent que la formulation de la question impacte énormément la qualité de la réponse du LLM. Le prompt engineering consiste à construire des instructions très précises et structurées pour obtenir de meilleurs résultats.
- **2023-2024 : RAG (Retrieval-Augmented Generation)** — Le LLM seul ne connaît pas votre base de code spécifique ou votre documentation interne. Un RAG permet d'augmenter les connaissances du modèle en lui fournissant des documents pertinents avant de répondre.
- **2023-2024 : agent (LLM + outils)** — Au lieu de poster juste une question et de recevoir la réponse, nous créons des agents intelligents qui peuvent agir : exécuter du code, consulter une base de données, appeler une API, lire des fichiers.
- **Fin 2024 : MCP (Model Context Protocol)** — Un standard ouvert d'Anthropic qui normalise la façon dont les LLM communiquent avec les outils externes. MCP définit un protocole unifié : tout LLM implémentant le protocole peut utiliser n'importe quel outil implémentant MCP (fichiers, APIs, bases de données, etc.).
- **2025 : context engineering** — Évolution du prompt engineering. Il ne s'agit plus uniquement de bien formuler la question, il faut optimiser le contexte fourni au modèle : choix des documents, structuration des informations, pertinence des exemples, gestion de l'historique. C'est une approche plus holistique pour maximiser la qualité des réponses.
- **2025 : harnais (harness)** — Un cadre ou une infrastructure qui intègre tous les concepts précédents de manière cohésive. Le harnais gère automatiquement le contexte, les outils disponibles, l'exécution du code, les permissions, etc. C'est l'évolution logique : après avoir appris les briques individuelles, les assembler dans un système intégré et intelligent. Son rôle est de construire un système qui soit le plus autonome possible pour pouvoir travailler sur des tâches complexes et longues.

Les outils ont également fortement évolué afin de répondre à ces avancées : ChatGPT, Copilot, Claude Code, OpenCode ou plus récemment Pi.

## Enjeux

En seulement 4 ans, le paysage des LLM pour le codage n'a cessé de se modifier, de devenir plus performant, mais aussi de se complexifier. Avant même que vous maîtrisiez un concept ou un outil, vous devez déjà en apprendre un autre. Les développeurs (et non développeurs) surfent sur cette vague gigantesque au péril de la qualité logicielle. Car aujourd'hui, nous en sommes bien là : comment utiliser efficacement ces outils sans perdre la maîtrise ? En quoi ces outils peuvent nous aider au quotidien ?

De grandes annonces nous faisaient miroiter que nous étions au moins 50&nbsp;% plus productifs grâce aux LLM. Le constat est beaucoup plus nuancé. Des études montrent que, sur des codes complexes, l'usage des LLM peut être contre-productif [1]. Pour un usage courant, des études montrent que les développeurs passent plus de temps à refaire le travail après s'être aperçus que l'ajout des LLM dans la base de code était erroné [2]. Nous voyons de plus en plus de Pull Requests qui s'ouvrent sur des logiciels open source où la qualité n'est pas au rendez-vous. Le mainteneur devient alors un relecteur complètement accaparé à relire le travail verbeux, et souvent non structuré, produit par des agents et non relu par le contributeur qui ne s'est pas familiarisé avec le code auquel il prétend contribuer. Si le travail de relecture est mal fait, des processus de refonte apparaissent là encore limitants, voire impactants négativement la productivité [3].

Nous observons de plus en plus de projets open source qui ferment l'accès à l'ouverture de Pull Request par défaut et demandent à engager une discussion avec d'éventuels contributeurs avant de leur donner les droits.

Concernant l'usage du MCP, la réalité est là encore plus nuancée que les promesses initiales. Malgré l'augmentation du nombre total de tokens disponibles dans la fenêtre de contexte des nouveaux LLM (nous sommes récemment passés à 1M de tokens), il est connu depuis un petit moment que les modèles réagissent très mal dès que nous avons rempli 40&nbsp;% de la taille globale du contexte [4]. D'autres études sont encore plus alarmistes et montrent que ce n'est pas un pourcentage, mais plutôt un nombre de tokens à ne pas dépasser qui se situe autour de 100K tokens [5]. Vous verrez cette zone sous le nom de « dumb zone » [6], « context-rot » ou, comme dans le papier original, « lost in the middle ». L'utilisation des MCP et de tous les outils qui existent aujourd'hui ajoute un préambule dans le contexte qui peut vous faire arriver dans la « dumb zone » avant même d'avoir commencé à poser votre première question. Les réponses que vous obtiendrez ne seront alors plus fiables.

Alors, est-il possible de revenir à une maîtrise de l'IA dans le cadre du développement logiciel ? Comment ne pas perdre son esprit critique et continuer à l'exercer face à cette facilité de génération de code ? Comment devenir orchestrateur et non pas simple observateur ?

## Objectifs

Le développement logiciel constitue un pilier fondamental du progrès de la recherche et de l'industrie. Il est par conséquent primordial d'accompagner les personnes qui développent face aux évolutions métiers induites par l'intégration des LLM et des agents IA.

Cette formation vise à dresser un panorama des outils, des modèles existants et de leurs mécanismes de fonctionnement. Elle a également pour ambition de développer un esprit critique face aux potentielles dérives liées à leur usage, afin de promouvoir une utilisation éthique et responsable de ces technologies.

Le programme comportera de nombreuses parties pratiques afin que les participants puissent, à l'issue de la formation, intégrer ces outils dans leurs pratiques quotidiennes.

## Public cible et pré-requis

- **Public** : toute personne ayant une activité de développement logiciel.
- **Pré-requis** : expérience en programmation (au minimum 1-2 ans) ; aucune expertise IA requise, même si une expérience minimale est un plus.
- **Niveau** : juniors aux confirmés.

## Références

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)
