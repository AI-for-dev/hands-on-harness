# Hands-on Harness

*Une formation pour vous faire découvrir les harnais et les dompter*

## Contexte et positionnement

Ce support de formation à été créé dans le cadre de l'ANF IA4Dev du 19 au 22 octobre 2026 [https://ia4dev-2026.sciencesconf.org/](https://ia4dev-2026.sciencesconf.org/). L'utilisation des Large Language Models (LLM), que ce soit pour le codage ou d'autres tâches, pose évidemment des problématiques importantes d'un point de vue juridique (propriété du code...), social et environnemental. Nous avons fait le choix lors de l'ANF de faire intervenir plusieurs personnes sur ces sujets mais nous n'avons pas développé ces aspects dans ce support. Les personnes intéresssés pourront toutefois trouver quelques références sur ces questions en annexe.

Il est évident que construire une formation sur l'IA pour aider au développement logiciel pose question. Est-ce qu'il s'agit de manière implicite de faire la promotion de l'usage de l'IA pour coder ? Notre choix de ne pas développer ici les problématiques juridiques, sociales et environnementales, pose même la question de manière plus critique : ne met-on pas en annexe dans ce support ce qui devrait être les informations premières et le coeur de la formation pour se positionner en connaissance de cause ?

Nous avons eu la chance d'avoir eu dans le comité d'organisation de cette ANF des positionnements très différents. Cette diversité a été la source de nombreuses discussions et cette formation n'a aucunement pour objectif de convaincre quiconque d'utiliser ou de ne pas utiliser l'IA.
Il est vrai qu'en montrant comment faire à traver ce support nous participons à la diffusion de la pratique.

Au moment de la rédaction de ces lignes, Linus Torvalds, le fondateur de Linux, a fait une déclaration proche du positionnement de ce support pédagogique :

> "L'IA est un outil, tout comme d'autres outils que nous utilisons. Et c'est clairement un outil utile.
> Il n'était peut-être pas aussi "clair" il y a seulement un an, mais ce n'est plus une question aujourd'hui.
> Il y a d'autres questions autour de l'IA (comme ce à quoi l'économie de l'IA ressemblera réellement à la fin), mais "est-ce utile" n'est plus l'une de ces questions. Quiconque en doute n'a clairement pas réellement utilisé l'IA.
> Oui, cela peut également être un outil quelque peu douloureux, tant pour la charge de travail des mainteneurs que du point de vue de "ça continue de trouver des bugs embarrassants".
> Mais la solution n'est pas de mettre la tête dans le sable et de chanter "La La La, je ne t'entends pas" à pleine voix comme certains semblent le faire.
> La solution est de s'assurer que ces outils LLM _aident_ les mainteneurs au lieu de leur causer de la douleur. Il n'y a pas de question de ce côté-là.
> Nous ne forçons personne à l'utiliser, mais j'ignorerai très bruyamment les personnes qui essaient de contredire d'autres sur leur utilisation.
> Et non, l'IA n'est pas parfaite. Mais bordel, quiconque souligne les problèmes de l'IA ferait mieux de se regarder dans le miroir en même temps.
> Parce que ce n'est pas comme si l'intelligence naturelle était toujours si géniale non plus."
> 
> —— Linus Torvalds [https://www.phoronix.com/news/Linux-Is-Not-Anti-AI](https://www.phoronix.com/news/Linux-Is-Not-Anti-AI)


Dans notre cas, il s'agit d'aider pas seulement les mainteneurs mais plus globalement les utilisateurs de l'IA, ceux qui aimeraient l'utiliser ou même ceux qui ne sont pas vraiment certain de s'en servir mais qui ont envie de mieux comprendre et savoir comment ça marche. L'organisation de cette ANF nous a montré qu'il y a une forte demande dans ce sens. La question n'est donc pas : devez-vous servir de l'IA ou pas ? (car nous vous laissons vraiment juge de cette dernière) mais si je veux l'utiliser dans le cadre de l'ESR de manière pertinente, comment puis-je faire ?

Il est évident que ce qui va être présenté principalement dans ce support, c'est-à-dire l'utilisation d'un harnais, correspond à un usage un peu avancé. D'une certaine façon, il est possible de simplement connecter son environnement de développement (IDE) à un fournisseur d'IA et d'utiliser des commandes souvent intégrées ou accessibles via des plugins : chat, edit et agent. La question de quel fournisseur d'IA est fondamental ? Ici, suivant les cadres dans lesquels vous travaillez, les réponses vont variées. De plus, elles risquent d'évoluer avec le temps et nous vous invitons à vous renseigner sur la questions.

Dans cette formation, nous allons appuyer sur l'offre d'IlaaS [https://www.ilaas.fr/](https://www.ilaas.fr/) car elle permet d'utiliser des modèles plus gros et performants que ce qu'il est possible pour la grande majorité d'entre nous d'installer en local [https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/] (https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/)). Nous avons conscience que toutes les universités ne sont pas dans IlaaS et pour ceux et celles dans l'ESR qui souhaite juste avoir accès à un modèle pour tester sans forcément construire un harnais, nous vous renvoyons vers l'API Albert de la DINUM [https://ia.numerique.gouv.fr/outils-ia/albert-api/](https://ia.numerique.gouv.fr/outils-ia/albert-api/).

Avant d'entrer dans le coeur de la formation, c'est-à-dire le harnais et son utilisation, nous allons détailler un peu l'historique, les modèles (ceux qui sont assez facilement accesibles et ceux que nous visons dans un futur proche car cette formation a été l'occasion d'impulser une dynamique dans ce sens) et quelques harnais disponibles et pourquoi nous avons choisi Pi.

Dans une deuxième partie, nous verrons le fonctionnement de Pi et allons créer une première extension. Les notions de 


## Plan de la formation

1. **Se reperer dans le paysage actuel des LLM et des harnais**
   - [Historique](./historique)
   - Modèles et fournisseurs
   - Les harnais
       - [Qu'est-ce qu'un harnais ?](./quest-ce-quun-harnais)
       - Quelques harnais

2. **Prendre en main Pi**
   - Installer et configurer Pi
   - Configurer l'accès à IlaaS
   - Découverte de Herdr 
   - Découvrir les commandes et quelques premières extensions de Pi

3. **Construire et adapter son harnais**
   - Créer une première extension
   - ...
