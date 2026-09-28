# Historique

::: tip Objectifs de ce module
- Situer dans le temps les techniques apparues depuis la sortie de ChatGPT, de la complétion de code au harnais
:::

Les LLM et leur écosystème ont évolué à une vitesse folle. Rappelons que ChatGPT a été proposé au grand public fin novembre 2022. Depuis, les techniques et les outils se sont multipliés :

- **2022 : complétion intelligente**. Les modèles commencent à prédire et compléter le code à la volée, directement dans l'éditeur, comme l'autocomplétion classique, mais alimentée par des LLM entraînés sur des milliards de lignes de code public.
- **2022-2023 : prompt engineering**. Avec ChatGPT accessible au grand public, les développeurs découvrent que la formulation de la question change énormément la qualité de la réponse du LLM. Le prompt engineering consiste à construire des instructions très précises et structurées pour obtenir de meilleurs résultats.
- **2023-2024 : RAG (Retrieval-Augmented Generation)**. Le LLM seul ne connaît pas votre base de code spécifique ou votre documentation interne. Un RAG augmente les connaissances du modèle en lui fournissant des documents pertinents avant qu'il ne réponde.
- **2023-2024 : agent (LLM + outils)**. Au lieu de poser une question et de recevoir une réponse, on donne au modèle les moyens d'agir : exécuter du code, consulter une base de données, appeler une API, lire des fichiers.
- **Fin 2024 : MCP (Model Context Protocol)**. Un standard ouvert d'Anthropic qui normalise la façon dont les LLM communiquent avec les outils externes. MCP définit un protocole unifié : tout LLM implémentant le protocole peut utiliser n'importe quel outil implémentant MCP (fichiers, API, bases de données, etc.).
- **2025 : context engineering**. Prolongement du prompt engineering : il ne s'agit plus seulement de bien formuler la question, mais d'optimiser tout le contexte fourni au modèle, du choix des documents à la gestion de l'historique, en passant par la structuration des informations et la pertinence des exemples.
- **2025 : harnais (harness)**. Un cadre qui assemble tous les concepts précédents en un système cohérent. Le harnais gère le contexte, les outils disponibles, l'exécution du code et les permissions, avec pour but un système assez autonome pour travailler sur des tâches complexes et longues.

Les outils ont suivi ces avancées : ChatGPT, Copilot, Claude Code, OpenCode ou plus récemment Pi. Le module [Pourquoi un harnais, et de quoi est-il fait ?](./act1-harness) reprend cette frise pour montrer quel manque chaque étape comble.
