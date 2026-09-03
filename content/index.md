# Hands-on Harness

*Une formation pour vous faire découvrir les harnais et les dompter*

## Contexte

L'utilisation des Large Language Models (LLM) dans nos tâches quotidiennes devient de plus en plus importante, que ce soit dans la retranscription de réunions, l'analyse de documents ou encore le codage d'applications. Nous nous concentrerons dans la suite sur leur impact dans un cadre de développement logiciel.

Les LLM et leur écosystème ont évolué à une vitesse folle. Rappelons que ChatGPT a été proposé au grand public fin novembre 2022. Depuis, les techniques et les outils se sont multipliés :

- **2022 : complétion intelligente**. Les modèles commencent à prédire et compléter le code à la volée, directement dans l'éditeur, comme l'autocomplétion classique, mais alimentée par des LLM entraînés sur des milliards de lignes de code public.
- **2022-2023 : prompt engineering**. Avec ChatGPT accessible au grand public, les développeurs découvrent que la formulation de la question change énormément la qualité de la réponse du LLM. Le prompt engineering consiste à construire des instructions très précises et structurées pour obtenir de meilleurs résultats.
- **2023-2024 : RAG (Retrieval-Augmented Generation)**. Le LLM seul ne connaît pas votre base de code spécifique ou votre documentation interne. Un RAG augmente les connaissances du modèle en lui fournissant des documents pertinents avant de répondre.
- **2023-2024 : agent (LLM + outils)**. Au lieu de poser une question et de recevoir une réponse, on donne au modèle les moyens d'agir : exécuter du code, consulter une base de données, appeler une API, lire des fichiers.
- **Fin 2024 : MCP (Model Context Protocol)**. Un standard ouvert d'Anthropic qui normalise la façon dont les LLM communiquent avec les outils externes. MCP définit un protocole unifié : tout LLM implémentant le protocole peut utiliser n'importe quel outil implémentant MCP (fichiers, APIs, bases de données, etc.).
- **2025 : context engineering**. Prolongement du prompt engineering : il ne s'agit plus seulement de bien formuler la question, mais d'optimiser tout le contexte fourni au modèle, du choix des documents à la gestion de l'historique, en passant par la structuration des informations et la pertinence des exemples.
- **2025 : harnais (harness)**. Un cadre qui assemble tous les concepts précédents en un système cohérent. Le harnais gère le contexte, les outils disponibles, l'exécution du code et les permissions, avec pour but un système assez autonome pour travailler sur des tâches complexes et longues.

Les outils ont suivi ces avancées : ChatGPT, Copilot, Claude Code, OpenCode ou plus récemment Pi.

## Enjeux

En quatre ans, les LLM pour le codage n'ont cessé de changer, de gagner en performance et de se complexifier. Avant même que vous maîtrisiez un concept ou un outil, vous devez déjà en apprendre un autre, et les développeurs, comme les non-développeurs, suivent cette vague au péril de la qualité logicielle. Deux questions se posent désormais : comment utiliser efficacement ces outils sans perdre la maîtrise, et en quoi peuvent-ils nous aider au quotidien ?

De grandes annonces nous faisaient miroiter un gain de productivité d'au moins 50&nbsp;% grâce aux LLM. Le constat est beaucoup plus nuancé : une étude du METR menée sur des développeurs expérimentés conclut que, sur des codes complexes, l'usage des LLM peut être contre-productif [1], et le rapport GitClear sur la qualité du code observe que les développeurs passent plus de temps à refaire le travail après s'être aperçus que ce qu'un LLM avait ajouté à la base de code était erroné [2]. Les Pull Requests de qualité insuffisante se multiplient sur les logiciels open source, et le mainteneur devient un relecteur accaparé par un travail verbeux, souvent mal structuré, produit par des agents et non relu par un contributeur qui ne s'est pas familiarisé avec le code auquel il prétend contribuer. Quand cette relecture est mal faite, la refonte qui suit limite à son tour la productivité, quand elle ne la réduit pas [3].

Nous observons de plus en plus de projets open source qui ferment par défaut l'ouverture de Pull Requests et demandent aux contributeurs d'engager une discussion avant de leur donner les droits.

L'usage du MCP est là encore plus nuancé que les promesses initiales. Les fenêtres de contexte des nouveaux LLM ont grandi, jusqu'à atteindre récemment le million de tokens, mais les modèles réagissent très mal dès que 40&nbsp;% de la taille globale du contexte est occupée [4]. D'autres mesures, plus alarmistes, situent le seuil en valeur absolue plutôt qu'en pourcentage, autour de 100K tokens [5]. Vous verrez cette zone sous le nom de « dumb zone » [6], de « context-rot » ou, comme dans l'article original, de « lost in the middle ». Les MCP et tous les outils qui existent aujourd'hui ajoutent au contexte un préambule qui peut vous y faire arriver avant même d'avoir posé votre première question, et les réponses que vous obtiendrez ne seront alors plus fiables.

La question qui reste est celle de la maîtrise : garder un esprit critique face à cette facilité de génération de code, et devenir orchestrateur au lieu de rester simple observateur. C'est ce que cette formation cherche à construire.

## Objectifs

La recherche comme l'industrie reposent sur le développement logiciel ; les personnes qui développent doivent donc être accompagnées face aux évolutions du métier qu'induisent les LLM et les agents IA.

Cette formation dresse un panorama des outils, des modèles existants et de leurs mécanismes de fonctionnement. Elle cherche aussi à développer un esprit critique face aux dérives possibles de leur usage, pour en promouvoir une utilisation éthique et responsable.

Le programme comporte de nombreuses parties pratiques, pour que les participants puissent, à l'issue de la formation, intégrer ces outils dans leurs pratiques quotidiennes.

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
