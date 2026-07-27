# Pourquoi un harnais, et de quoi est-il fait ?

::: tip Objectifs de ce module
- Reconstituer la chaîne qui va du prompt au harnais, et dire quel manque chaque étape comble
- Définir précisément ce qu'est un harnais, et comprendre pourquoi il vous est propre et ne cesse de bouger
- Savoir énumérer les briques indispensables d'un harnais et, pour chacune, à quel problème elle répond
:::

L'introduction a présenté une frise des techniques apparues depuis fin 2022. Nous la reprenons ici sous un autre angle, non plus pour raconter une histoire, mais pour comprendre une mécanique. Chaque étape de cette frise répond à un manque de l'étape précédente, et surtout, chacune s'empile sur les autres plutôt que de les remplacer. Un harnais ne rend pas le *prompt engineering* obsolète ; il en a toujours besoin, mais il l'organise.

Au commencement, il y a le prompt. On s'aperçoit vite que la façon de formuler une demande change radicalement la réponse, et le *prompt engineering* consiste à formuler mieux. Mais un modèle bien interrogé reste ignorant de votre base de code et de votre documentation interne. Le RAG comble ce manque : il va chercher les documents pertinents et les fournit au modèle avant qu'il réponde mais nécessite une construction pouvant être fastidieuse.

Le modèle sait alors mieux répondre, mais il ne fait toujours que répondre. Il ne peut pas agir. L'agent comble ce manque en lui donnant des outils : exécuter du code, lire un fichier, appeler une API. Chaque outil devant être décrit et connecté, la multiplication des intégrations devient vite ingérable, et le MCP normalise la façon dont un modèle dialogue avec des outils externes. Les outils peuvent parfois être de bons remplaçants au RAG.

À ce stade, on dispose d'un modèle capable d'aller chercher de l'information et d'agir. Reste à décider ce que l'on met dans sa fenêtre de contexte et dans quel ordre. C'est le *context engineering*, prolongement du *prompt engineering* : il ne s'agit plus seulement de bien poser la question, mais d'optimiser tout le contexte fourni au modèle.

## Le harnais, une infrastructure logicielle

Le harnais est le maillon qui assemble tous les précédents en un système cohérent. [Vivek Trivedy][langchain-harness] le définit comme : un harnais, c'est du code, de la configuration, ou une logique d'exécution, rien de plus mystérieux que cela, mais rien de moins non plus. [Lilian Weng][weng-harness] va un peu plus loin : c'est le système qui entoure le modèle et qui décide comment il pense et planifie, comment il appelle des outils et agit, comment il perçoit et gère son contexte, où il range ce qu'il produit, et comment il évalue ses résultats. Elle prend soin de la distinguer de la formule plus ancienne « agent = LLM + mémoire + outils + planification + action » : le harnais y ajoute la conception explicite des boucles de travail, l'évaluation, le contrôle des permissions et la persistance d'état dans la durée.

[Avi Chawla][ddods-harness] range ces trois niveaux en cercles concentriques. Le *prompt engineering* façonne les instructions données au modèle. Le *context engineering* décide de ce que le modèle voit, et quand. Le *harness engineering* contient les deux, et y ajoute toute l'infrastructure applicative : orchestration des outils, persistance d'état, reprise sur erreur, boucles de vérification, contrôle des permissions, cycle de vie complet d'une tâche. Un harnais qui se résumerait à un system prompt bien écrit n'en est pas un ; il en est la partie la plus visible, rarement la plus déterminante.

Cette infrastructure n'a rien d'abstrait : c'est du logiciel qu'on peut ouvrir, lire et modifier. Un fichier de configuration qui déclare les modèles disponibles et les permissions accordées. Un fichier `AGENTS.md` ou `CLAUDE.md` qui porte les règles du projet. Des scripts qui implémentent des hooks, un répertoire de skills, et par-dessus tout cela un processus qui tourne réellement : la boucle agentique elle-même, celle qui enchaîne appel au modèle, exécution d'outil et relecture du résultat. C'est cette matérialité qui change tout : un harnais se construit, se débogue et se répare comme n'importe quel logiciel, à coups de fichiers modifiés, de tests et de commits. Nous en verrons une instance concrète dès le module suivant, avec le répertoire `.pi/` de Pi.

## Un harnais propre à chacun, et qui ne cesse de bouger

Deux idées méritent d'être présentées avant d'aller plus loin, car elles conditionnent la façon dont vous devez recevoir tout ce qui suit.

La première est que votre harnais ne ressemblera jamais tout à fait à celui du voisin. [Addy Osmani][osmani-harness] le formule ainsi : l'ingénierie du harnais est une discipline, pas un framework qu'on installerait tel quel, parce que le bon harnais pour votre code est façonné par votre historique d'échecs. Or un historique d'échecs, cela ne se télécharge pas. On peut s'inspirer du harnais d'un autre, jamais le copier tel quel en espérant qu'il couvre les mêmes angles morts, puisqu'il a été façonné par des incidents qui ne sont pas les vôtres.

La seconde est que le harnais bouge, pour deux raisons de nature différente.

La première tient au modèle lui-même. [Avi Chawla][ddods-harness] appelle cela l'épaisseur du harnais (*harness thickness*) : combien de logique doit vivre dans le harnais plutôt que dans le modèle ? Anthropic, écrit l'article, parie sur un harnais fin et sur le progrès du modèle, au point de supprimer régulièrement des étapes de planification de Claude Code à mesure que les nouvelles versions du modèle les internalisent, quand d'autres frameworks, construits autour de graphes explicites, parient au contraire sur un contrôle qui reste écrit en dur. Une brique qui a du sens aujourd'hui peut donc devenir un poids mort dans six mois, pour la seule raison que le modèle a évolué.

La seconde raison tient à votre usage. [Osmani][osmani-harness] la résume dans ce qu'il présente comme l'habitude la plus importante du métier : traiter chaque échec de l'agent comme un signal permanent, pas comme un accident à excuser. Il met en garde contre la réponse la plus tentante : ajouter la leçon apprise comme une phrase de plus dans un fichier `AGENTS.md` déjà long. Or un fichier de règles qui grossit sans jamais être retravaillé perd en lisibilité ce qu'il croit gagner en couverture. Sa formule à retenir : un harnais est un système vivant, pas un fichier de configuration qu'on écrit une fois pour toutes. Le motif qu'il propose à la place se résume en une question, quel comportement voulons-nous obtenir ou corriger, et quelle pièce précise du harnais peut l'obtenir : c'est exactement le motif que nous suivrons tout au long de la reconstruction.

Retenez donc ce module comme un inventaire de départ, pas comme une architecture figée. Certaines des briques qui suivent, vous les laisserez minimales ; d'autres, vous les épaissirez au fil de vos propres échecs.

## Les sept briques

La question de départ est la suivante. Nous avons un modèle capable de prédire du texte et d'appeler des outils. De quoi faut-il l'entourer pour qu'il travaille de façon fiable, sûre et utile sur des tâches réelles ? Chaque brique qui suit répond à une limite précise du modèle nu ; c'est cette correspondance qu'il faut garder en tête, plus que la liste elle-même. C'est la grille qui organise tout le reste de la formation : chaque module de l'acte 2 reconstruit l'une de ces briques.

La **gestion du contexte** vient en premier. La fenêtre est finie, et nous avons vu que le modèle exploite mal un contexte trop long ou mal ordonné. [Avi Chawla][ddods-harness] recense cinq stratégies pratiques pour la tenir en main : purge périodique, résumé de la conversation, masquage des observations devenues obsolètes, prise de notes structurée, et délégation à un sous-agent. Une étude qu'il cite (ACON) obtient jusqu'à 54 % de tokens en moins, pour une exactitude préservée au-dessus de 95 %, en préférant les traces de raisonnement aux sorties brutes d'outils. Le principe qui en ressort : sélectionner ce qu'on met dans la fenêtre, l'ordonner pour tirer parti du cache, et compacter ce qui gonfle inutilement.

Les **outils** viennent ensuite, car un modèle qui ne produit que du texte ne peut pas agir. [Vivek Trivedy][langchain-harness] le résume en une image : le bash et l'exécution de code donnent à l'agent « un ordinateur sous la main », au point qu'il peut s'en servir pour construire ses propres outils en cours de route. Mais un catalogue trop large nuit autant qu'il aide : [Avi Chawla][ddods-harness] rapporte que Vercel a retiré 80 % des outils de son agent v0 et obtenu de meilleurs résultats, et que Claude Code réduit son contexte de 95 % en ne chargeant les outils qu'à la demande. Le principe : chaque capacité doit être exposée sous forme d'outil décrit pour le modèle et gardé par une permission, et n'exposer que le strict nécessaire à l'étape en cours.

La **délégation** répond à un problème plus subtil, que [Vivek Trivedy][langchain-harness] formule ainsi : pour garder un contexte propre, il faut déployer des sous-agents sur des tâches bien précises, et ne réinjecter dans le fil principal qu'une synthèse de leur travail, plutôt que toute la réflexion qui a permis d'y arriver. Le travail d'une sous-tâche est en effet souvent bien plus volumineux que sa conclusion ; si tout ce travail s'accumule dans le contexte principal, celui-ci se dégrade.

L'**orchestration** organise plusieurs agents entre eux. [Avi Chawla][ddods-harness] pose deux arbitrages récurrents. D'abord, agent unique ou multi-agents : Anthropic comme OpenAI recommandent de pousser un seul agent au maximum avant d'en ajouter un second, et de ne séparer que passé une dizaine d'outils qui se recouvrent, ou des domaines de tâche clairement distincts. Ensuite, une fois plusieurs agents en jeu, faut-il les faire raisonner et agir à chaque pas (le pattern ReAct), ou séparer la planification de l'exécution ? L'orchestration porte aussi l'ambition la plus difficile à tenir, celle que [Vivek Trivedy][langchain-harness] présente comme le but ultime : faire travailler un agent sur un horizon long. [Osmani][osmani-harness] en décrit une réalisation concrète et étonnamment simple : un mécanisme intercepte la tentative de l'agent de conclure, puis relance une session neuve sur le même objectif ; chaque itération repart d'un contexte propre, mais retrouve l'état du travail précédent uniquement à travers ce que le système de fichiers en a gardé.

La **mémoire** persiste les décisions entre les sessions. [Vivek Trivedy][langchain-harness] le rappelle sans détour : un modèle ne connaît rien d'autre que ses poids et ce qui se trouve dans son contexte du moment ; sans un processus dédié, il oublie aussi bien ses erreurs passées que ce sur quoi il travaillait la veille, d'où l'usage de fichiers comme `AGENTS.md` ou `CLAUDE.md`. [Osmani][osmani-harness] désigne ce type de fichier comme le point de configuration le plus rentable du harnais, puisqu'il atterrit dans le system prompt à chaque tour ; il recommande de le garder court (certaines équipes tiennent le leur sous soixante lignes) et de le traiter comme la check-list d'un pilote, pas comme un guide de style. Le système de fichiers reste un bon point de départ pour la mémoire, mais Osmani note qu'il ne suffit pas toujours : pour la documentation à jour d'une bibliothèque, une recherche web ou un serveur MCP dédié restent nécessaires.

La **sûreté**, matérialisée par les permissions, borne ce que l'agent a le droit de faire. [Avi Chawla][ddods-harness] la présente comme un curseur : une architecture permissive va vite mais prend des risques, une architecture restrictive est plus sûre, mais ralentit chaque action, et le bon réglage dépend du contexte de déploiement. Elle s'accompagne souvent d'un isolement physique : [Vivek Trivedy][langchain-harness] rappelle que les bacs à sable donnent à l'agent un espace sécurisé, et permettent à plusieurs agents de travailler en parallèle sans que l'un casse ce que l'autre construit. C'est ce qui distingue un système autonome d'un système dangereux, et nous verrons que cette brique mérite un soin particulier.

La **vérification et l'évaluation**, enfin, répondent à une question simple : est-ce que cela marche, et à quel coût ? [Avi Chawla][ddods-harness] distingue une vérification calculatoire et déterministe (tests, linters, vérificateurs de types) d'une vérification inférentielle confiée à un LLM-juge, plus sensible aux problèmes sémantiques mais plus lente à obtenir. Un principe transverse revient chez [Osmani][osmani-harness] : un modèle qui juge son propre travail a tendance à se noter généreusement, et confier la relecture à un agent distinct de celui qui a produit le résultat donne des verdicts nettement plus fiables. [Lilian Weng][weng-harness] referme la boucle : dans les harnais les plus aboutis, cette vérification ne sert plus seulement à contrôler une tâche ponctuelle, elle nourrit une boucle d'auto-amélioration du modèle. Un modèle qui progresse ainsi évite, en retour, au harnais de se sur-complexifier. Un harnais qu'on ne mesure pas est un harnais qu'on ne pilote pas.

## En pratique

Il serait tentant de retenir ces sept briques comme une liste à cocher. Ce serait manquer l'essentiel. Ce que nous voulons transmettre, c'est une grille de lecture : face à n'importe quel harnais, vous devez pouvoir pointer chaque brique, dire si elle est présente, absente ou minimale, et comprendre les conséquences de ce choix.

Cette grille a deux usages. Nous l'appliquerons d'abord à Pi, pour organiser la reconstruction. Vous l'appliquerez ensuite à votre propre harnais, à l'acte 4. Toutes les briques ne sont pas obligatoires pour tous les usages : un harnais dédié à la revue de code n'a pas les mêmes besoins qu'un harnais de migration. Savoir choisir les briques utiles fait partie de la compétence que nous cherchons à construire.

Prenez un harnais que vous connaissez, ou que nous manipulerons ensemble : Claude Code, Cursor, ou un autre. Pour chaque brique de la grille, essayez de la pointer dans l'outil. Où se gère le contexte ? Quels sont les outils exposés ? Y a-t-il une mémoire, et où vit-elle ? Notez les briques qui semblent absentes ou réduites au minimum : ce sont souvent les plus révélatrices des choix de conception de l'outil. Si vous avez déjà rencontré un échec avec cet outil (une action qu'il n'aurait pas dû entreprendre, un oubli répété), essayez de rattacher cet échec à l'une des sept briques : c'est exactement l'exercice que nous répéterons tout au long de l'acte 2.

## Pour aller plus loin

Ce module s'appuie sur quatre textes récents qui, chacun à sa façon, tentent de définir ce qu'est un harnais et ce qui le fait bouger. Nous les retrouverons cités au fil des briques ci-dessus.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering
