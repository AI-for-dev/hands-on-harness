# Les LLM en 2026

::: tip Objectifs de ce module
- Savoir situer un modèle : sa taille, son architecture, sa fenêtre de contexte, son niveau de raisonnement, sa capacité à appeler des outils
- Comprendre juste assez du fonctionnement d'un LLM pour choisir plus tard le bon modèle selon le rôle qu'on lui confie
:::

Ce module fait partie des prérequis, et nous l'abordons comme tel. Le sujet est traité en profondeur ailleurs, souvent mieux que nous ne saurions le faire ici. Notre but n'est pas de rivaliser avec ces ressources, mais de mettre tout le monde au même niveau pour attaquer la reconstruction. Nous restons donc volontairement à la surface, et nous renvoyons vers des lectures de référence pour ceux qui souhaitent approfondir, à commencer par l'[introduction d'Andrej Karpathy aux grands modèles de langage][karpathy], une mise en jambe d'une heure sur la question « qu'est-ce qu'un LLM », prolongée par son [cours détaillé de 2025][karpathy-deepdive] pour qui veut le stack complet de l'entraînement.

## Ce qu'un modèle fait, au fond

Un modèle de langage prédit le mot suivant. Plus précisément, il prédit le prochain *token*, c'est-à-dire le prochain fragment de texte, à partir de tout ce qui précède. Le texte que vous lui donnez est d'abord découpé en tokens, puis le modèle produit un token à la fois, chacun venant s'ajouter à l'entrée pour prédire le suivant. La capacité à répondre à une question, à écrire du code ou à raisonner émerge de ce mécanisme simple appliqué à très grande échelle.

Cette manière de fonctionner explique deux choses qui nous serviront tout au long de la formation. D'une part, le modèle ne « sait » que ce qui se trouve dans son entrée ou dans ce qu'il a appris à l'entraînement. D'autre part, la qualité de ce que vous mettez en entrée pèse directement sur la qualité de ce qui en sort. C'est là que le [« prompt engineering »][weng-prompting] a toute son importance.

Le terrain a toutefois bougé depuis les premiers guides. Les techniques classiques (exemples en contexte, chaîne de pensée, cohérence par vote) restent une base utile, mais leur poids a changé : les modèles de raisonnement produisent désormais la chaîne de pensée d'eux-mêmes, ce qui [rend le guidage manuel moins nécessaire][wolfe-reasoning] ; l'appel d'outils est devenu une fonctionnalité native plutôt qu'une astuce de formulation ; et l'attention s'est déplacée de l'optimisation d'un prompt isolé vers l'organisation de tout le contexte d'un agent, ce qu'on appelle aujourd'hui le [« context engineering »][context-engineering]. C'est un fil qui mène droit à la [construction d'agents][huyen-agents], et que nous reprendrons à l'acte 2.

## La fenêtre de contexte

Le modèle ne peut pas prendre en compte un texte infiniment long. Il dispose d'une **fenêtre de contexte**, un nombre maximal de tokens qu'il peut considérer à la fois. Cette fenêtre a beaucoup grandi ces dernières années, jusqu'à dépasser le million de tokens sur certains modèles récents.

Cette croissance ne règle pourtant pas le problème, car les modèles exploitent mal l'information située au milieu d'un long contexte, un phénomène décrit sous le nom de [*lost in the middle*][lost-in-the-middle]. Remplir la fenêtre ne suffit donc pas : ce qui compte, c'est ce qu'on y met, et où. Cette observation motive à elle seule une bonne partie du travail sur le contexte que nous mènerons à l'acte 2.

::: info À nuancer sur les modèles récents
Le *lost in the middle* n'est plus tout à fait vérifié sur les derniers modèles. Sur des tests de récupération de type *needle in a haystack*, les modèles récents d'Anthropic atteignent un rappel quasi parfait, [au-delà de 99 % dès Claude 3 Opus][claude-3-recall], quelle que soit la position de l'information dans le contexte. Le phénomène s'atténue donc fortement pour la simple récupération d'un fait ; il reste plus marqué dès que la tâche demande de raisonner sur plusieurs informations dispersées dans le contexte. La leçon pratique ne change pas : soigner ce qu'on met dans la fenêtre, et où, reste payant.
:::

## Mélange d'experts

Beaucoup de modèles récents reposent sur une architecture dite de **mélange d'experts** (*Mixture of Experts*, ou MoE), dont Hugging Face propose une [présentation illustrée][hf-moe]. L'idée est de ne pas activer tout le réseau à chaque token, mais seulement une petite partie, [choisie dynamiquement][wolfe-moe]. Un modèle peut ainsi afficher un nombre total de paramètres très élevé tout en n'en activant qu'une fraction à chaque étape.

La conséquence pratique est qu'il faut distinguer les paramètres totaux des paramètres actifs. Les premiers renseignent sur la capacité du modèle et sur la mémoire nécessaire pour le charger ; les seconds sur son coût de calcul et sa vitesse. Deux modèles annoncés avec le même nombre de paramètres peuvent se comporter très différemment selon cette distinction.

Quelques exemples parmi les modèles ouverts, où l'écart entre paramètres totaux et actifs saute aux yeux dès qu'il s'agit d'un MoE :

| Année | Modèle                   | Architecture | Paramètres totaux | Paramètres actifs |
| ----- | ------------------------ | ------------ | ----------------- | ----------------- |
| 2025  | Kimi K2 (Moonshot AI)    | MoE          | 1 000 Mds         | 32 Mds            |
| 2024  | DeepSeek-V3              | MoE          | 671 Mds           | 37 Mds            |
| 2025  | Llama 4 Maverick (Meta)  | MoE          | 400 Mds           | 17 Mds            |
| 2025  | Qwen3-235B-A22B          | MoE          | 235 Mds           | 22 Mds            |
| 2026  | Gemma 4 26B A4B (Google) | MoE          | 26 Mds            | 4 Mds             |
| 2026  | Gemma 4 31B (Google)     | Dense        | 31 Mds            | 31 Mds            |
| 2025  | Qwen3-32B                | Dense        | 32 Mds            | 32 Mds            |
| 2025  | Mistral Small 3          | Dense        | 24 Mds            | 24 Mds            |

Sur un modèle dense, les deux colonnes sont identiques : tout le réseau est activé à chaque token. Sur un MoE, l'écart peut être considérable : DeepSeek-V3 charge 671 milliards de paramètres mais n'en active que 37 à chaque étape. Les grands modèles propriétaires (GPT, Claude, Gemini) sont largement supposés reposer eux aussi sur du MoE, mais leur architecture n'est pas divulguée, et nous nous en tenons donc ici aux modèles ouverts.

Le nom du modèle donne souvent un premier indice. Le suffixe `A<n>B`, pour *Active `<n>` Billion*, annonce le nombre de paramètres actifs : « Gemma 4 26B A4B » désigne 26 milliards de paramètres au total mais 4 milliards actifs, et « Qwen3-235B-A22B » 235 milliards pour 22 actifs. Un modèle dense ne porte jamais ce suffixe, puisque actifs et totaux se confondent. Attention toutefois, cette convention n'est pas universelle : Kimi K2 ou DeepSeek-V3 sont bien des MoE sans l'afficher dans leur nom. Le réflexe fiable reste de vérifier la fiche du modèle, où les deux comptes sont annoncés.

## Le niveau de raisonnement

Un modèle peut répondre du tac au tac, ou prendre le temps de « réfléchir » avant de conclure. Depuis fin 2024, une famille de **modèles de raisonnement** a fait de cette seconde manière un mode à part entière : avant de produire sa réponse, le modèle génère une longue chaîne de tokens intermédiaires, une réflexion étape par étape qui n'est pas nécessairement montrée à l'utilisateur, mais qui améliore nettement les résultats sur les tâches difficiles (mathématiques, code, planification, problèmes à plusieurs étapes).

C'est un changement de fond. Jusque-là, on améliorait un modèle surtout en l'entraînant plus longtemps sur plus de données. Ici, on gagne en qualité en lui laissant dépenser davantage de calcul *au moment de répondre*, ce qu'on appelle le [*test-time compute*][wolfe-reasoning]. Le mouvement s'est enchaîné vite : [OpenAI o1][openai-reasoning] en septembre 2024, [DeepSeek-R1][deepseek-r1] en janvier 2025, puis la *réflexion étendue* de Claude 3.7 Sonnet en février 2025. En quelques mois, le raisonnement à l'inférence est devenu un standard.

Ce surcroît de réflexion a un coût : il consomme beaucoup de tokens et allonge le temps de réponse. Aussi la plupart de ces modèles laissent-ils régler l'effort de raisonnement, d'un mode rapide et économique jusqu'à une réflexion approfondie. Tout l'art consiste à ne le mobiliser que lorsqu'il apporte quelque chose. C'est directement lié au choix du modèle selon le rôle, plus bas : un planificateur gagne à raisonner longuement, un exécutant cadré n'en a pas besoin et coûterait inutilement cher.

## L'appel d'outils

Un modèle qui ne fait que produire du texte ne peut pas agir. Pour qu'il devienne un agent, il faut qu'il puisse déclencher des actions : lire un fichier, exécuter une commande, interroger une API. C'est le rôle de l'**appel d'outils** (*tool calling*). Le modèle ne réalise pas l'action lui-même ; il produit une demande structurée, que le harnais exécute, avant de lui renvoyer le résultat.

Cette capacité est récente à l'échelle de l'histoire des LLM. Elle a d'abord été explorée côté recherche, avec le paradigme [*ReAct*][react] (raisonner puis agir) fin 2022 puis [*Toolformer*][toolformer] début 2023, avant de devenir une fonctionnalité d'API à part entière : OpenAI a introduit le [*function calling*][openai-function-calling] en juin 2023, et Anthropic a ouvert l'appel d'outils sur Claude en bêta fin 2023, avant sa [disponibilité générale en mai 2024][claude-tool-use-ga]. En moins de deux ans, on est ainsi passé du simple modèle de texte à l'agent capable d'agir.

Cette capacité est le prérequis de tout ce qui suit. Un harnais est précisément ce qui organise cette boucle entre le modèle et les outils, et une bonne partie de la formation consiste à en reconstruire les rouages.

## Où trouver les modèles et leur spécificité ?

Tous les chiffres du tableau précédent, et bien d'autres, se lisent au même endroit. Les modèles ouverts sont aujourd'hui publiés sur le [*Hub* de Hugging Face][hf-hub], une plateforme qui héberge à la fois les poids des modèles, leur documentation et de quoi les essayer. C'est le premier réflexe quand on cherche à situer un modèle.

Chaque modèle y dispose d'une **fiche** (*model card*), un README rédigé par l'éditeur. On y trouve l'essentiel de ce qui nous intéresse dans ce module : la taille du modèle, son architecture (dense ou MoE, nombre d'experts), sa fenêtre de contexte, les langues et modalités prises en charge, les résultats sur les grands bancs d'essai, et la licence d'utilisation. La licence se lit avant d'envisager un déploiement, car une licence permissive comme Apache 2.0 n'ouvre pas les mêmes usages qu'une licence « communautaire » assortie de restrictions.

Pour les détails techniques que la fiche passe parfois sous silence, le fichier `config.json` du modèle donne la configuration brute : dimensions internes, nombre de couches, nombre d'experts et nombre d'experts activés pour un MoE. C'est là qu'on confirme, chiffres à l'appui, l'écart entre paramètres totaux et actifs évoqué plus haut.

Enfin, le Hub ne sert pas qu'à consulter. Ses filtres permettent d'explorer les modèles par tâche, par taille ou par licence ; des classements comparatifs aident à se repérer dans une offre qui bouge vite ; et les versions quantifiées (souvent au format GGUF), plus légères, rendent certains modèles exécutables sur une machine modeste. Nous y reviendrons quand il s'agira de faire tourner un modèle en local.

## Choisir un modèle selon le rôle

Tout cela a une visée pratique. Lorsque nous construirons des agents, nous leur confierons des rôles distincts, et ces rôles n'appellent pas le même modèle. Un agent chargé de planifier gagne à s'appuyer sur un modèle solide, capable de raisonner longuement. Un agent qui exécute une tâche répétitive et bien cadrée gagne, lui, à s'appuyer sur un modèle rapide et économique.

Le meilleur moyen de se forger une intuition reste d'essayer. Des sites gratuits permettent de soumettre un même prompt à deux modèles et de comparer leurs réponses côte à côte. Le plus utile est [LMArena][lmarena] (ex-*Chatbot Arena*) : son mode *side-by-side* laisse choisir les deux modèles à confronter, sans même créer de compte ; son mode *battle*, où deux modèles anonymes répondent et où l'on vote, alimente par ailleurs un classement comparatif. [Hugging Face Chat][hf-chat] et [OpenRouter][openrouter] offrent le même genre d'essai sur un large catalogue. Rien ne vaut de rejouer votre propre prompt sur un modèle rapide et sur un modèle de raisonnement pour sentir, concrètement, ce que chacun apporte et ce qu'il coûte. C'est ce que nous verrons d'ailleurs dans la première partie de la formation.

## Références

- Andrej Karpathy, [Intro to Large Language Models][karpathy] : une mise en jambe d'une heure sur la question « qu'est-ce qu'un LLM ».
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive] : un cours de 3 h 30 (2025) sur tout le stack d'entraînement, pour approfondir.
- Lilian Weng, [Prompt Engineering][weng-prompting] : un panorama des techniques classiques de prompting, à lire comme un socle historique.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering] : le glissement de l'optimisation d'un prompt vers l'architecture du contexte d'un agent.
- Chip Huyen, [Agents][huyen-agents] : un guide récent et neutre sur les agents : outils, planification, modes d'échec.
- Liu et al., [Lost in the Middle][lost-in-the-middle] : l'article qui a mis en évidence la mauvaise exploitation du milieu du contexte.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall] : un rappel quasi parfait (au-delà de 99 %) sur le test *needle in a haystack*, indépendamment de la position dans le contexte.
- Hugging Face, [Mixture of Experts Explained][hf-moe] : une présentation illustrée du mélange d'experts.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe] : une étude technique du routage et du fonctionnement des architectures MoE.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning] : comment o1 et DeepSeek-R1 raisonnent via de longues chaînes de pensée et le calcul à l'inférence.
- OpenAI, [Learning to reason with LLMs][openai-reasoning] : la présentation des modèles de raisonnement (o1) et du *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1] : l'article décrivant un modèle de raisonnement ouvert.
- Yao et al., [ReAct][react] : le paradigme « raisonner puis agir ».
- Schick et al., [Toolformer][toolformer] : un modèle qui apprend à appeler des outils.
- OpenAI, [Function calling and other API updates][openai-function-calling] : l'introduction de l'appel d'outils côté API (juin 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga] : la disponibilité générale de l'appel d'outils sur Claude (mai 2024).
- Hugging Face, [le Hub des modèles][hf-hub] : la plateforme où sont publiés les modèles ouverts et leurs fiches.

## Outils

- [LMArena][lmarena] : comparer deux modèles côte à côte sur un même prompt.
- Hugging Face, [Chat][hf-chat] : essayer des modèles ouverts en ligne.
- [OpenRouter][openrouter] : accéder à un large catalogue de modèles via une même interface.

[karpathy]: https://www.youtube.com/watch?v=zjkBMFhNj_g
[karpathy-deepdive]: https://www.youtube.com/watch?v=7xTGNNLPyMI
[weng-prompting]: https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/
[context-engineering]: https://www.philschmid.de/context-engineering
[huyen-agents]: https://huyenchip.com/2025/01/07/agents.html
[lost-in-the-middle]: https://arxiv.org/abs/2307.03172
[claude-3-recall]: https://www.anthropic.com/news/claude-3-family
[hf-moe]: https://huggingface.co/blog/moe
[wolfe-moe]: https://cameronrwolfe.substack.com/p/moe-llms
[wolfe-reasoning]: https://cameronrwolfe.substack.com/p/demystifying-reasoning-models
[react]: https://arxiv.org/abs/2210.03629
[toolformer]: https://arxiv.org/abs/2302.04761
[openai-function-calling]: https://openai.com/index/function-calling-and-other-api-updates/
[claude-tool-use-ga]: https://www.anthropic.com/news/tool-use-ga
[hf-hub]: https://huggingface.co/models
[openai-reasoning]: https://openai.com/index/learning-to-reason-with-llms/
[deepseek-r1]: https://arxiv.org/abs/2501.12948
[lmarena]: https://lmarena.ai
[hf-chat]: https://huggingface.co/chat
[openrouter]: https://openrouter.ai
