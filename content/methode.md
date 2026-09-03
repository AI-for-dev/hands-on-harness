# La méthode

Cette formation repose sur un choix pédagogique que nous voulons expliciter dès le départ. Nous aurions pu vous proposer un catalogue d'outils accompagné de recettes d'installation. Nous ne le ferons pas, car ce genre de contenu périme en quelques mois : les paquets changent de nom, les options de configuration évoluent, et il ne reste plus grand-chose à en tirer un an plus tard.

Nous prenons le parti inverse. La colonne vertébrale de la formation, c'est le harnais lui-même, c'est-à-dire l'ensemble des briques fonctionnelles qu'il doit comporter pour fonctionner : gestion du contexte, outils, délégation, orchestration, mémoire, sûreté et vérification. Nous établissons d'abord *quelles* briques sont nécessaires et *pourquoi*, puis nous reconstruisons chacune d'elles à la main à l'aide de logiciels open source. Enfin, nous remontons au principe transférable, celui que vous garderez quel que soit l'outil du moment.

L'objectif n'est pas de bâtir un concurrent de Claude Code, et la reconstruction est volontairement minimale. Vous emporterez à la fin, plutôt qu'un logiciel, la compréhension nécessaire pour construire votre propre harnais, adapté à vos usages, et pour piloter en connaissance de cause les harnais que vous utiliserez au quotidien.

## Le triptyque

Chaque module de reconstruction se déroule en trois temps que nous répétons tout au long de la formation.

Le premier temps, **Comprendre**, part du besoin. À quoi sert la brique, pourquoi est-elle indispensable, et comment un harnais réel la réalise-t-il ?

Le deuxième temps, **Reconstruire**, consiste à écrire l'équivalent minimal de la brique sur Pi, à la main. C'est ce qui permet d'éprouver le concept plutôt que de le lire. Ce code est une illustration et non la leçon : il rend l'idée tangible, et il est remplaçable.

Le troisième temps, **Généraliser**, dégage le principe qui survit au changement d'outil, la règle de conception que vous appliqueriez ailleurs. C'est ce temps-là qui compte vraiment, car c'est le seul qui ne périme pas.

Cette distinction entre le durable et le jetable structure la formation. Les principes du troisième temps sont à retenir ; les versions de paquets et les détails de configuration du deuxième temps sont voués à changer, et nous les traitons comme tels.

## La trame d'un module

Pour vous repérer, chaque module de l'acte de reconstruction suit la même trame : sa durée, ses objectifs exprimés en termes de savoir-faire, ses prérequis, le triptyque Comprendre / Reconstruire / Généraliser, une mise en pratique ancrée sur un artefact réel, un livrable assorti de son critère de réussite, et enfin les pièges à éviter.

## Le déroulé (A revoir)

La formation représente environ 13h30 en présentiel. Elle s'organise en quatre actes.

| Acte                                | Contenu                                                                                      | Durée |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| 1. Fondations                       | Les LLM et leur écosystème, les briques d'un harnais, le harnais de départ Pi, et la méthode | 3h30  |
| 2. Reconstruction brique par brique | Contexte, outils, agents, workflows, mémoire, permissions                                    | 6h30  |
| 3. Vérifier, évaluer, observer      | Tests, évaluations multi-modèles, observabilité                                              | 2h00  |
| 4. Construire son propre harnais    | Un cas d'usage personnel, et le tri durable / jetable                                        | 1h30  |

L'acte 2 concentre l'essentiel de la valeur. Il est volontairement plus fourni en contenu écrit que ne le laisse penser sa durée, afin de rester utile en autonomie une fois la formation terminée.
