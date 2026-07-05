# Qu'est-ce qu'un harnais ?

Un **harnais** (*harness*) est un cadre ou une infrastructure qui intègre, de manière cohésive, les briques individuelles apparues avec les LLM : gestion du contexte, orchestration des outils disponibles, exécution du code, permissions, etc.

C'est l'évolution logique après avoir appris ces briques séparément : les assembler dans un système intégré et intelligent. Son rôle est de construire un système le plus autonome possible, capable de travailler sur des tâches complexes et longues.

Claude Code est un exemple de harnais : il orchestre un modèle de langage, un ensemble d'outils (lecture/écriture de fichiers, exécution de commandes, recherche web, etc.) et une politique de permissions, pour transformer un LLM en agent capable de mener une tâche de bout en bout.

## Ce que gère un harnais

- Le **contexte** : quelles informations sont fournies au modèle, dans quel ordre, avec quelle fraîcheur.
- Les **outils** : quelles actions le modèle peut déclencher (lire un fichier, lancer une commande, appeler une API...).
- Les **permissions** : ce qui nécessite une confirmation humaine, ce qui peut s'exécuter en autonomie.
- La **boucle d'exécution** : comment le harnais enchaîne les appels au modèle, l'exécution des outils, et la relecture des résultats.

## Pourquoi ça compte

Un même modèle de langage produit des résultats très différents selon le harnais qui l'entoure : la qualité du contexte fourni, les outils exposés et les garde-fous mis en place pèsent souvent plus sur le résultat final que le choix du modèle lui-même.
