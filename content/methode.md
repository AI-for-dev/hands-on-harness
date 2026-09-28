# La méthode

Cette formation repose sur un choix pédagogique que nous voulons expliciter dès le départ. Nous aurions pu vous proposer un catalogue d'outils accompagné de recettes d'installation. Nous ne le ferons pas, car ce genre de contenu périme en quelques mois : les paquets changent de nom, les options de configuration évoluent, et il ne reste plus grand-chose à en tirer un an plus tard.

Nous prenons le parti inverse. La colonne vertébrale de la formation, c'est le harnais lui-même, c'est-à-dire l'ensemble des briques fonctionnelles qu'il doit comporter pour fonctionner : gestion du contexte, outils, délégation, orchestration, mémoire, sûreté et vérification. Nous établissons d'abord *quelles* briques sont nécessaires et *pourquoi*, puis nous reconstruisons chacune d'elles à la main à l'aide de logiciels open source. Enfin, nous remontons au principe transférable, celui que vous garderez quel que soit l'outil du moment.

L'objectif n'est pas de bâtir un concurrent de Claude Code, et la reconstruction est volontairement minimale. Vous emporterez à la fin, plutôt qu'un logiciel, la compréhension nécessaire pour construire votre propre harnais, adapté à vos usages, et pour piloter en connaissance de cause les harnais que vous utiliserez au quotidien.

## Le triptyque

Chaque module de reconstruction se déroule en trois temps que nous répétons tout au long de la formation.

Le premier temps, **Comprendre**, part du besoin. À quoi sert la brique, pourquoi est-elle indispensable, et comment un harnais réel la réalise-t-il ?

Le deuxième temps, **Reconstruire**, consiste à écrire l'équivalent minimal de la brique sur Pi, à la main. C'est ce qui permet d'éprouver le concept. La mise en œuvre est toujours plus efficace qu'une lecture passive. Nous rappelons que le code est une illustration et non la leçon. Un harnais n'est pas une recette qui fonctionne pour n'importe quel cas d'usage. Il se nourrit de vos besoins.

Le troisième temps, **Généraliser**, dégage le principe qui est indépendant de l'outil utilisé. Il donne les règles de conception que vous appliqueriez ailleurs. C'est ce temps-là qui compte vraiment, car c'est le seul qui ne périme pas.

En plus de ces trois temps, vous aurez en début de chaque module les objectifs de celui-ci, la description du livrable lorsque ce sera pertinent et des références pour approfondir les concepts.

## Le déroulé

La formation s'organise en quatre actes.

| Acte                                | Contenu                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| 1. Fondations                       | Les LLM et leur écosystème, les briques d'un harnais, le harnais de départ Pi, et la méthode |
| 2. Reconstruction brique par brique | Contexte, outils, agents, workflows, mémoire, permissions                                    |
| 3. Vérifier, évaluer, observer      | Tests, évaluations multi-modèles, observabilité                                              |
| 4. Construire son propre harnais    | Un cas d'usage personnel, et le tri durable / jetable                                        |

Nous avons voulu ce document le plus détaillé possible afin que vous puissiez expérimenter en toute autonomie.
