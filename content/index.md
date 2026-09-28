# Hands-on Harness

*Une formation pour vous faire découvrir les harnais et les dompter*

## Contexte et positionnement

Ce support a été créé pour la [formation IA4Dev](https://ia4dev-2026.sciencesconf.org/), qui se tient du 19 au 22 octobre 2026. L'utilisation des Large Language Models (LLM), pour coder comme pour d'autres tâches, pose des questions juridiques (la propriété du code produit, par exemple), sociales et environnementales importantes. Pendant la formation, nous avons fait intervenir plusieurs personnes sur ces sujets, mais nous ne les développons pas dans ce support ; les personnes intéressées trouveront toutefois quelques références sur ces questions en annexe.

Construire une formation sur l'IA appliquée au développement logiciel pose donc une question : fait-on, de manière implicite, la promotion de l'usage de l'IA pour coder ? Notre choix de ne pas traiter ici les aspects juridiques, sociaux et environnementaux la rend plus critique encore, puisqu'il relègue en annexe ce qui devrait peut-être constituer l'information première, celle qui permet à chacun de se positionner en connaissance de cause.

Nous avons eu la chance de réunir dans le comité d'organisation de cette formation des positionnements très différents, et cette diversité a nourri de nombreuses discussions. Cette formation n'a aucunement pour objectif de convaincre quiconque d'utiliser ou de ne pas utiliser l'IA, même si, en montrant comment faire, nous participons à la diffusion de cette pratique.

Le 14 juillet 2026, dans un message à une liste de diffusion du noyau, Linus Torvalds, le créateur de Linux, a fait une déclaration proche du positionnement de ce support, que nous traduisons ici :

> […] L'IA est un outil, tout comme d'autres outils que nous utilisons. Et c'est clairement un outil utile.
> Ce n'était peut-être pas aussi « clair » il y a seulement un an, mais ce n'est plus une question aujourd'hui.
> Il y a d'autres questions autour de l'IA (comme ce à quoi l'économie de l'IA ressemblera réellement à la fin), mais « est-ce utile » n'est plus l'une de ces questions. Quiconque en doute n'a clairement pas réellement utilisé l'IA.
> Oui, cela peut également être un outil quelque peu douloureux, tant pour la charge de travail des mainteneurs que du point de vue de « ça continue de trouver des bugs embarrassants ».
> Mais la solution n'est pas de mettre la tête dans le sable et de chanter « La La La, je ne t'entends pas » à pleine voix comme certains semblent le faire.
> La solution est de s'assurer que ces outils LLM *aident* les mainteneurs au lieu de simplement leur causer de la douleur. Il n'y a pas de question de ce côté-là.
> Nous ne forçons personne à l'utiliser, mais j'ignorerai très bruyamment les personnes qui essaient de dissuader les autres de l'utiliser.
> Et non, l'IA n'est pas parfaite. Mais bordel, quiconque souligne les problèmes de l'IA ferait mieux de se regarder dans le miroir et de se montrer du doigt en même temps.
> Parce que ce n'est pas comme si l'intelligence naturelle était toujours si géniale non plus.
>
> Linus Torvalds, [Re: Linking Patchwork with Sashiko?](https://lore.kernel.org/all/CAHk-=wi4zC+Ze8e+p3tMv8TtG_80KzsZ1syL9anBtmEh5Z40vg@mail.gmail.com/)

```quote en
[…] AI is a tool, just like other tools we use. And it's clearly a useful one.
It may not have been that "clearly" even just a year ago, but it's no longer in question today.
There are other questions around AI (like what the economy of it will actually look like in the end), but "is it useful" is no longer one of those questions. Anybody who doubts that clearly hasn't actually used it.
Yes, it can also be a somewhat painful tool, both for maintainer workloads and just from a "it keeps finding embarrassing bugs" standpoint.
But the solution is not to put your head in the sand and sing "La La La, I can't hear you" at the top of your voice like some people seem to do.
The solution is to make sure those LLM tools *help* maintainers instead of just causing them pain. There's no question on that side.
We're not forcing anybody to use it, but I will very loudly ignore people who try to argue against other people from using it.
And no, AI isn't perfect. But Christ, anybody who points to the problems at AI had better be looking in the mirror and pointing at themselves at the same time.
Because it's not like natural intelligence is always all that great either.

Linus Torvalds, [Re: Linking Patchwork with Sashiko?](https://lore.kernel.org/all/CAHk-=wi4zC+Ze8e+p3tMv8TtG_80KzsZ1syL9anBtmEh5Z40vg@mail.gmail.com/)
```

Nous voulons aider au-delà des seuls mainteneurs : les personnes qui utilisent déjà l'IA, celles qui aimeraient l'utiliser, et même celles qui ne sont pas certaines de s'en servir mais qui ont envie de comprendre comment elle fonctionne. L'organisation de cette formation nous a montré que cette demande est forte. Nous vous laissons donc vraiment juges de la question de savoir si vous devez vous servir de l'IA, et nous traitons celle qui vient ensuite : comment l'utiliser de manière pertinente dans le cadre de l'enseignement supérieur et de la recherche (ESR) si vous le souhaitez.

L'utilisation d'un harnais, qui occupe l'essentiel de ce support, correspond à un usage plutôt avancé. On peut déjà connecter son environnement de développement (IDE) à un fournisseur d'IA et utiliser les commandes chat, edit et agent, souvent intégrées ou accessibles via des plugins. Le choix du fournisseur est une question de fond, dont la réponse varie selon le cadre dans lequel vous travaillez et risque d'évoluer avec le temps ; nous vous invitons à vous renseigner sur ce point.

Dans cette formation, nous nous appuyons sur l'offre d'[ILaaS](https://www.ilaas.fr/), qui donne accès à des modèles plus gros et plus performants que ceux que la grande majorité d'entre nous peut [installer en local](https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/). Toutes les universités ne font pas partie d'ILaaS, et pour les personnes de l'ESR qui souhaitent simplement accéder à un modèle pour tester, sans forcément construire de harnais, nous renvoyons vers l'[API Albert](https://ia.numerique.gouv.fr/outils-ia/albert-api/) de la DINUM.

Avant d'entrer dans le cœur de la formation, le harnais et son utilisation, l'Acte 1 revient sur l'[historique](./historique) des techniques, sur [les modèles](./act1-llm), ceux qui sont assez facilement accessibles comme ceux que nous visons dans un futur proche, cette formation ayant été l'occasion d'impulser une dynamique dans ce sens, puis sur [ce qu'est un harnais](./act1-harness) et sur les raisons qui nous ont fait choisir [Pi](./act1-pi).
