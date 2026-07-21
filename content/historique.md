
# I1 Historique


L'évolution des LLM ainsi que leur écosystème se sont développés à une vitesse folle. Rappelons que ChatGPT a été proposé au grand public fin novembre 2022. Depuis, une multiplication de techniques et d'outils a vu le jour :

- **2022 : complétion intelligente** — Les modèles commencent à prédire et compléter le code à la volée, directement dans l'éditeur. C'est comme l'autocomplétion classique, mais alimentée par des LLM entraînés sur des milliards de lignes de code public.
- **2022-2023 : prompt engineering** — Avec ChatGPT accessible au grand public, les développeurs découvrent que la formulation de la question impacte énormément la qualité de la réponse du LLM. Le prompt engineering consiste à construire des instructions très précises et structurées pour obtenir de meilleurs résultats.
- **2023-2024 : RAG (Retrieval-Augmented Generation)** — Le LLM seul ne connaît pas votre base de code spécifique ou votre documentation interne. Un RAG permet d'augmenter les connaissances du modèle en lui fournissant des documents pertinents avant de répondre.
- **2023-2024 : agent (LLM + outils)** — Au lieu de poster juste une question et de recevoir la réponse, nous créons des agents intelligents qui peuvent agir : exécuter du code, consulter une base de données, appeler une API, lire des fichiers.
- **Fin 2024 : MCP (Model Context Protocol)** — Un standard ouvert d'Anthropic qui normalise la façon dont les LLM communiquent avec les outils externes. MCP définit un protocole unifié : tout LLM implémentant le protocole peut utiliser n'importe quel outil implémentant MCP (fichiers, APIs, bases de données, etc.).
- **2025 : context engineering** — Évolution du prompt engineering. Il ne s'agit plus uniquement de bien formuler la question, il faut optimiser le contexte fourni au modèle : choix des documents, structuration des informations, pertinence des exemples, gestion de l'historique. C'est une approche plus holistique pour maximiser la qualité des réponses.
- **2025 : harnais (harness)** — Un cadre ou une infrastructure qui intègre tous les concepts précédents de manière cohésive. Le harnais gère automatiquement le contexte, les outils disponibles, l'exécution du code, les permissions, etc. C'est l'évolution logique : après avoir appris les briques individuelles, les assembler dans un système intégré et intelligent. Son rôle est de construire un système qui soit le plus autonome possible pour pouvoir travailler sur des tâches complexes et longues.

