# Annexes et glossaire

Cette page donne d'abord des lectures sur les questions juridiques, sociales et environnementales que pose l'usage des LLM en général et ensuite plus particulièrement dans le cadre du développement logiciel. Nous avons choisi de ne pas les traiter dans ce support, comme l'explique l'[introduction](./), mais elles comptent pour décider si, et comment, vous utilisez ces outils. Elle se termine par un glossaire des termes employés dans la formation, avec leur équivalent anglais et le module où ils sont expliqués.

## Quelles lectures pour se faire une opinion sur les risques ?

Cette formation montre comment utiliser un agent de code et où nous en sommes en octobre 2026. Elle ne dit pas s'il faut le faire car ce choix vous appartient. Les textes ci-dessous prennent position, souvent de façon tranchée, et plusieurs appellent à refuser ces outils. Nous les avons choisis parce que leurs auteurs argumentent à partir de faits, de mesures ou de leur expérience de chercheurs et de mainteneurs. Nous sommes à la bifurcation des chemins et il est difficile d'y voir clair. La promotion des LLM et le tapage médiatique auprès des populations est sans précédent. Il n'est pas difficile de trouver des articles qui font la promotion des LLM. Nous avons donc pris le partie pris de vous montrer l'autre coté et l'impact sur la société. Lisez ces ressources avant de décider de la place que vous laissez à l'IA dans votre travail.

### Faut-il refuser ces outils ?

- Atécopol, [Face à l'IA générative, l'objection de conscience](https://atecopol.hypotheses.org/13082) (novembre 2025). Ce manifeste de l'Atelier d'écologie politique de Toulouse s'adresse à l'enseignement supérieur, à la recherche et à l'éducation nationale. Il avance trois raisons de refuser le déploiement de l'IA générative dans ces institutions : son coût énergétique et matériel, les dégâts sociaux de la chaîne industrielle qui la produit, et le pouvoir qu'elle donne à quelques entreprises. Ses signataires, plus de trois mille, s'engagent à ne pas l'utiliser sauf contrainte. [Reporterre](https://reporterre.net/Nous-sommes-debordes-par-l-IA-chercheurs-ils-refusent-d-utiliser-l-intelligence) (juin 2026) a donné la parole à certains d'entre eux.
- Florence Maraninchi, [Pourquoi je n'utilise pas ChatGPT](https://academia.hypotheses.org/58766) (février 2025). L'autrice est enseignante-chercheuse en informatique et travaille sur les systèmes critiques (trains, avions, centrales). Elle explique pourquoi elle refuse des systèmes opaques, non déterministes et non testables. Elle répond aussi à l'argument des IA « éthiques » ou « souveraines » : même sobres, elles participent selon elle à l'acceptation générale de ces technologies et à l'effet rebond.
- Olivier Lefebvre, [« ChatGPT, c'est juste un outil ! » : les impensés de la vision instrumentale de la technique](https://www.terrestres.org/2025/06/28/chatgpt-cest-juste-un-outil/) (Terrestres, juin 2025). Le texte discute l'argument que reprend la citation de Linus Torvalds de l'[introduction](./). Dire que l'IA est un outil comme un autre fait oublier les infrastructures matérielles et le travail humain qu'elle demande, et la façon dont elle transforme la société et les usages de chacun.
- Olivia Guest et al., [Against the Uncritical Adoption of 'AI' Technologies in Academia](https://zenodo.org/records/17065099) (septembre 2025). Dix-huit universitaires demandent aux universités de résister au marketing de l'industrie et de protéger la pensée critique, l'expertise et l'intégrité scientifique. Ils rappellent que refuser ces outils dans son enseignement et sa recherche doit rester une position légitime.
- François Levin, [L'IA comme technologie planétaire](https://lestempsquirestent.org/en/numeros/numero-9/l-ia-comme-technologie-planetaire) (Les temps qui restent, avril 2026). L'auteur cherche une voie entre deux réponses : celle qui croit qu'une IA plus sobre suffira, et celle qui rejette l'IA en bloc. À travers la notion de « planétarité », il explore les bifurcations que ces technologies laissent encore ouvertes.

### Quel est l'impact environnemental ?

Chaque requête envoyée à un modèle consomme de l'électricité et de l'eau, et la fabrication du matériel qui la sert a aussi un coût. Les chiffres publiés restent rares et viennent surtout des entreprises elles-mêmes.

- Danilo Carastan dos Santos, Denis Trystram et al., [L'IA générative est-elle soutenable ? Le vrai coût écologique d'un prompt](https://theconversation.com/lia-generative-est-elle-soutenable-le-vrai-cout-ecologique-dun-prompt-269432) (The Conversation, novembre 2025). Les auteurs examinent l'estimation publiée par Google pour Gemini (0,24 Wh et cinq gouttes d'eau par prompt). Ils montrent que ce chiffre bas tient à des choix de périmètre : seuls les centres de données de Google sont comptés, l'eau ne couvre que le refroidissement, et l'étude, menée en interne, ne dit pas sur quelles requêtes elle repose.
- Alexandra Sasha Luccioni et al., [From Efficiency Gains to Rebound Effects: The Problem of Jevons' Paradox in AI's Polarized Environmental Debate](https://arxiv.org/abs/2501.16548) (FAccT 2025). Un modèle plus efficace peut faire augmenter la consommation totale, parce qu'il rend l'usage moins cher et donc plus fréquent. Les autrices et auteurs demandent de regarder ces effets indirects, et non les seules émissions des centres de données.
- The Shift Project, [Intelligence artificielle, données, calculs : quelles infrastructures dans un monde décarboné ?](https://theshiftproject.org/en/publications/al-data-and-computing-shaping-infrastructures-for-a-decarbonised-world/) (octobre 2025). Le rapport étudie la consommation électrique des centres de données en France et dans le monde. Il conclut que l'optimisation technique ne suffit pas et qu'il faut choisir les usages.
- Agence internationale de l'énergie, [Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai) (avril 2026). L'énergie consommée par une requête simple baisse d'au moins un ordre de grandeur par an, mais les tâches de raisonnement et les tâches agentiques, comme celles d'un agent de code, consomment des centaines à des milliers de fois plus par requête. La consommation électrique des centres de données a augmenté de 17 % en 2025, et celle des centres dédiés à l'IA de 50 %. L'Agence prévoit un doublement entre 2025 et 2030, de 485 à 950 TWh, et demande aux entreprises de publier leurs consommations de façon systématique.
- Emma Bougerol, [L'IA générative a le potentiel de détruire la planète (mais pas comme vous le pensez)](https://basta.media/l-ia-generative-a-le-potentiel-de-detruire-la-planete-mais-pas-comme-vous-le) (Basta!, février 2025). Écrit au moment du sommet sur l'IA de Paris, l'article relie les investissements annoncés dans les centres de données à leur consommation d'électricité et rassemble les estimations disponibles.
- Anaëlle Beignon et al., [Imposing AI: Deceptive design patterns against sustainability](https://arxiv.org/abs/2508.08672) (2025). Les auteurs documentent comment les éditeurs de logiciels imposent l'IA, en mettant ses fonctions à la place de fonctions existantes et en diffusant des récits qui rendent plus difficile de refuser de s'en servir. Ils rangent ces pratiques parmi les *deceptive patterns* et en soulignent le coût environnemental.

Pour estimer l'impact de vos propres usages, la bibliothèque [EcoLogits](https://github.com/genai-impact/ecologits) calcule l'énergie et les émissions d'une requête à partir de la taille du modèle et du nombre de tokens produits. Le comparateur [compar:IA](https://comparia.beta.gouv.fr/) de beta.gouv.fr affiche cette estimation à côté de chaque réponse. Les leviers vus dans la formation, comme un `AGENTS.md` court, des sorties d'outils filtrées ou un modèle plus petit pour les tâches bien cadrées, réduisent le nombre de tokens traités.

### Que deviennent le logiciel libre et la sécurité ?

- Daniel Stenberg, [The end of the curl bug-bounty](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/) (janvier 2026). Le mainteneur de curl explique pourquoi le projet a arrêté son programme de récompense pour les failles de sécurité. Avant 2025, plus de 15 % des signalements reçus étaient de vraies failles. En 2025, avec l'afflux de rapports générés par IA, c'était moins de 5 %, et chaque faux rapport demandait du temps pour être réfuté.
- Software Freedom Conservancy, [Recommendations When Using LLM-backed Generative AI Systems for FOSS Contributions](https://sfconservancy.org/llm-gen-ai/llm-backed-generative-ai-recommendations.html). L'association soutient les projets qui refusent toute contribution écrite avec un LLM. Elle demande que personne ne soit obligé d'utiliser ces outils, et que ceux qui s'en servent relisent et comprennent leur contribution avant de la soumettre.
- La documentation du noyau Linux, [AI Coding Assistants](https://docs.kernel.org/process/coding-assistants.html). Un agent n'y ajoute jamais de `Signed-off-by` : la personne qui soumet le patch relit le code, vérifie la licence et en prend la responsabilité. Un tag `Assisted-by` indique l'outil utilisé.
- Joseph Spracklen et al., [We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://arxiv.org/abs/2406.10279) (USENIX Security 2025). Sur 576 000 extraits de code générés par seize modèles, au moins 5,2 % des paquets cités par les modèles commerciaux et 21,7 % de ceux cités par les modèles ouverts n'existent pas. Un attaquant peut publier un paquet malveillant sous l'un de ces noms.

### Que disent le droit et les règles d'usage ?

- Commission européenne, [Living guidelines on the responsible use of generative AI in research](https://research-and-innovation.ec.europa.eu/document/download/2b6cf7e5-36ac-41cb-aab5-0d32050143dc_en?filename=ec_rtd_ai-guidelines.pdf). Ces recommandations, rédigées dans le cadre de l'Espace européen de la recherche, s'adressent aux chercheurs, aux établissements et aux financeurs. Le chercheur reste responsable de ce qu'il produit avec ces outils. Il déclare leur usage et évite de s'en servir pour des activités sensibles comme l'évaluation par les pairs.
- U.S. Copyright Office, [Copyright and Artificial Intelligence, Part 2: Copyrightability](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf) (janvier 2025). Un contenu produit uniquement à partir d'un prompt n'est pas protégé par le droit d'auteur. Ce qui l'est, c'est l'apport humain : le code que vous écrivez, ou la façon dont vous choisissez, arrangez et modifiez ce que le modèle produit. Le rapport ne porte que sur le droit américain.

### Qu'est-ce que l'IA change au travail et à l'apprentissage ?

- METR, [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089) (juillet 2025). Dans cet essai randomisé, seize développeurs expérimentés ont traité des tickets réels de projets open source auxquels ils contribuent, avec et sans IA. Ils pensaient aller plus vite avec l'IA et ont mis 19 % de temps en plus. L'étude porte sur un cas précis : des projets que ces personnes connaissent très bien, avec les outils du début de 2025.
- Judy Hanwen Shen et Alex Tamkin (Anthropic), [How AI assistance impacts the formation of coding skills](https://www.anthropic.com/research/AI-assistance-coding-skills) (janvier 2026, [article](https://arxiv.org/abs/2601.20245)). Cinquante-deux développeurs apprennent une bibliothèque Python inconnue, avec ou sans assistant. Le groupe avec assistant obtient 17 % de moins au questionnaire qui suit, surtout sur le débogage. Déléguer tout le code fait moins apprendre que poser des questions pour comprendre.

Ces deux études rejoignent ce que la formation répète : relire le diff, lancer les tests vous-même et comprendre ce que l'agent a écrit restent votre travail.

## Glossaire

Les termes sont classés par ordre alphabétique. L'équivalent anglais est donné entre parenthèses quand il diffère.

**`AGENTS.md`** : fichier de règles placé à la racine d'un dépôt, que le harnais charge dans le contexte à chaque tour. Claude Code utilise `CLAUDE.md`. Voir [2.1](./act2-contexte).

**Agent** : un LLM qui peut appeler des outils, lire le résultat et recommencer jusqu'à finir sa tâche. Voir [Pourquoi un harnais](./act1-harness).

**Appel d'outil** (*tool calling*) : demande structurée que le modèle produit pour lancer une action. Le modèle n'exécute rien lui-même, c'est le harnais qui exécute l'outil et lui renvoie le résultat. Voir [Les LLM en 2026](./act1-llm).

**Bac à sable** (*sandbox*) : environnement isolé dans lequel l'agent travaille, avec des limites que le modèle ne peut pas franchir (fichiers visibles, réseau, clés). Voir [2.0](./act2-sandbox).

**Boucle agentique** (*agent loop*) : enchaînement répété d'un appel au modèle, de l'exécution des outils demandés et de la relecture de leur résultat. Voir [Le harnais de départ : Pi](./act1-pi).

**Cache** (*prompt caching*) : mécanisme du fournisseur qui facture beaucoup moins cher la partie du contexte inchangée depuis l'appel précédent. Il ne fonctionne que sur un préfixe identique. Voir [2.1](./act2-contexte).

**`codemode`** : outil de Pi qui permet au modèle d'écrire un script appelant les autres outils, pour que seul le résultat filtré revienne dans le contexte. Voir [2.1](./act2-contexte).

**combo** : extension de Pi écrite pour la formation, qui lance des sous-agents et déroule des flows. Voir [2.4](./act2-delegation) et [2.5](./act2-workflows).

**Compaction** : résumé des messages les plus anciens, déclenché quand le contexte approche de la taille de la fenêtre. Voir [2.1](./act2-contexte).

**Context engineering** : choix de ce qui entre dans la fenêtre de contexte et dans quel ordre, au-delà de la seule formulation du prompt. Voir [Pourquoi un harnais](./act1-harness).

**Demande négligée** : prompt minimal, celui qu'on écrit le premier jour, utilisé comme point de comparaison dans les exercices sur l'issue #1. Voir [2.1](./act2-contexte).

**Écart établi** : dans trysquare, écart entre deux configurations dont l'intervalle à 95 % ne contient pas zéro, marqué `*`. Un écart dont l'intervalle contient zéro est non concluant et marqué `o`. Voir [3.0](./act3-trysquare).

**Effort de raisonnement** (*thinking level*) : réglage qui laisse le modèle produire plus ou moins de tokens de réflexion avant de répondre. Voir [Les LLM en 2026](./act1-llm) et [2.1](./act2-contexte).

**Étalon** : tag figé du dépôt NÉON (par exemple `etalon-v1`) que chaque exécution clone, pour que toutes partent du même code. Voir [3.0](./act3-trysquare).

**Évaluation** : comparaison de configurations sur une même tâche, en répétant chaque configuration parce que le résultat varie d'une exécution à l'autre. Un **test**, lui, répond par oui ou par non. Voir [3.0](./act3-trysquare).

**Extension** : code TypeScript chargé par Pi, qui ajoute des outils, des commandes ou des hooks. Voir [Le harnais de départ : Pi](./act1-pi) et [2.3](./act2-hooks).

**Fan-out** : motif de workflow où plusieurs agents travaillent en parallèle sur la même entrée. Voir [2.5](./act2-workflows).

**Fenêtre de contexte** (*context window*) : nombre maximal de tokens que le modèle peut prendre en compte à la fois. Le **contexte** est ce qui la remplit : prompt système, fichiers de règles, descriptions d'outils, votre question et l'historique. Voir [2.1](./act2-contexte).

**Flow** : dans combo, graphe de tâches décrit en YAML et en markdown, dont les nœuds sont des sous-agents ou des scripts et dont l'enchaînement est décidé par le code. Voir [2.5](./act2-workflows).

**Guide et capteur** (*guide and sensor*) : vocabulaire de Birgitta Böckeler. Un guide agit avant l'agent pour l'orienter, un capteur agit après pour l'aider à se corriger. Voir [2.3](./act2-hooks).

**Harnais** (*harness*) : tout ce qui entoure le modèle pour en faire un agent utile et sûr : boucle, outils, gestion du contexte, permissions, vérification. Voir [Pourquoi un harnais](./act1-harness).

**Hook** : fonction exécutée par le harnais à un moment précis de la boucle, par exemple avant chaque appel d'outil ou quand l'agent s'apprête à rendre la main. Son effet ne dépend pas du modèle. Voir [2.3](./act2-hooks).

**Injection de prompt** (*prompt injection*) : texte lu par l'agent, dans un fichier ou une page web, qui se fait passer pour une instruction. Le `SUPPORT.md` de NÉON en est un exemple. Voir [2.0](./act2-sandbox).

**Juge** (*LLM-as-a-judge*) : modèle chargé de noter une exécution quand aucun test ne sait le faire. Son verdict est probabiliste. Voir [3.0](./act3-trysquare).

**LLM** (*Large Language Model*) : modèle de langage entraîné à prédire le token suivant à partir de ce qui précède. Voir [Les LLM en 2026](./act1-llm).

**MCP** (*Model Context Protocol*) : protocole ouvert qui normalise la façon dont un modèle accède à des outils externes. Voir [Historique](./historique).

**Mélange d'experts** (*Mixture of Experts*, MoE) : architecture qui n'active qu'une partie du réseau à chaque token. Il faut alors distinguer les **paramètres totaux** et les **paramètres actifs**. Voir [Les LLM en 2026](./act1-llm).

**Panoplie** : liste des outils dont dispose un agent, déclarée dans le champ `tools:` de son fichier. Un outil absent de la panoplie ne peut pas être appelé. Voir [2.4](./act2-delegation).

**Prompt système** (*system prompt*) : texte placé au début du contexte qui décrit au modèle son rôle, ses outils et ses conventions. Voir [2.1](./act2-contexte).

**RAG** (*Retrieval-Augmented Generation*) : technique qui fournit au modèle des documents pertinents avant qu'il réponde. Voir [Historique](./historique).

**Reprise** : tour relancé par l'outil de mesure parce que le fournisseur a renvoyé une erreur. Les reprises gonflent les coûts mesurés. Voir [3.1](./act3-contexte).

**Scénario** : fichier TOML qui décrit une expérience trysquare : la tâche, les configurations à comparer, le nombre de répétitions et la façon de noter. Voir [3.0](./act3-trysquare).

**Sentinelle** : valeur factice de la clé d'API visible dans le bac à sable. Le proxy de l'hôte la remplace par la vraie clé au moment où la requête part. Voir [2.0](./act2-sandbox).

**Skill** (compétence) : fichier `SKILL.md`, avec d'éventuels scripts et fichiers de référence, que l'agent charge quand la tâche le demande. Voir [2.2](./act2-skill).

**Sonde** : fichier de tests de référence que trysquare utilise pour vérifier qu'une exécution corrige vraiment le bug. Voir [3.1](./act3-contexte).

**Sous-agent** (*subagent*) : session lancée par l'agent principal avec son propre contexte, ses outils et son modèle. Seule sa conclusion revient dans le contexte principal. Voir [2.4](./act2-delegation).

**Token** : fragment de texte, unité de base que le modèle lit et produit. Les fournisseurs facturent au million de tokens. Voir [Les LLM en 2026](./act1-llm).

**trysquare** : outil Python écrit pour la formation, qui répète les configurations d'un scénario et dit si l'écart entre deux configurations est établi. Voir [3.0](./act3-trysquare).

**Usine logicielle** (*software factory*) : système qui reçoit une demande et rend une pull request en faisant travailler plusieurs agents en parallèle. Voir [À vous de jouer](./a-vous-de-jouer).

**Validation** : dans trysquare, exécutable qui note une exécution et renvoie des métriques avec leurs raisons. Voir [3.0](./act3-trysquare).

**Workflow** (flux de travail) : enchaînement d'étapes décidé par du code, par opposition à un agent qui décide lui-même de la suite. Voir [2.5](./act2-workflows).
