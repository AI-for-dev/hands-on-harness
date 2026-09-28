# Hands-on Harness

*Una formación para que descubras los harness y los domines*

## Contexto y posicionamiento

Este material ha sido creado para la [formación IA4Dev](https://ia4dev-2026.sciencesconf.org/), que se celebra del 19 al 22 de octubre de 2026. El uso de los grandes modelos de lenguaje (LLM), tanto para programar como para otras tareas, plantea importantes cuestiones jurídicas (por ejemplo, la propiedad del código producido), sociales y ambientales. Durante la formación, invitamos a varias personas a hablar sobre estos temas, pero no los desarrollamos en este material; sin embargo, las personas interesadas encontrarán algunas referencias sobre estas cuestiones en el anexo.

Construir una formación sobre la IA aplicada al desarrollo de software plantea, pues, una pregunta: ¿se promueve de manera implícita el uso de la IA para programar? Nuestra decisión de no tratar aquí los aspectos jurídicos, sociales y medioambientales la vuelve aún más crítica, ya que relega al anexo lo que quizá debería constituir la información principal, la que permite a cada cual posicionarse con pleno conocimiento de causa.

Hemos tenido la suerte de reunir en el comité de organización de esta formación posturas muy diferentes, y esta diversidad ha alimentado numerosos debates. Esta formación no tiene en absoluto por objetivo convencer a nadie de usar o de no usar la IA, aunque, al mostrar cómo hacerlo, contribuimos a la difusión de esta práctica.

El 14 de julio de 2026, en un mensaje a una lista de correo del núcleo, Linus Torvalds, el creador de Linux, hizo una declaración cercana al posicionamiento de este material, que traducimos aquí:

> […] La IA es una herramienta, al igual que otras herramientas que utilizamos. Y está claro que es una herramienta útil.
> Quizá no estaba tan «claro» hace apenas un año, pero hoy ya no es una cuestión.
> Hay otras cuestiones en torno a la IA (como a qué se parecerá realmente la economía de la IA al final), pero «¿es útil?» ya no es una de ellas. Quien lo dude, claramente no ha usado la IA de verdad.
> Sí, también puede ser una herramienta algo dolorosa, tanto por la carga de trabajo de los mantenedores como desde el punto de vista de «sigue encontrando bugs vergonzosos».
> Pero la solución no es meter la cabeza en la arena y cantar «La la la, no te oigo» a plena voz, como algunos parecen hacer.
> La solución es asegurarse de que estas herramientas LLM *ayuden* a los mantenedores en lugar de limitarse a causarles dolor. No hay duda en ese aspecto.
> No forzamos a nadie a usarla, pero ignoraré muy ruidosamente a quienes intentan disuadir a otros de usarla.
> Y no, la IA no es perfecta. Pero joder, quien señale los problemas de la IA haría bien en mirarse al espejo y señalarse a sí mismo al mismo tiempo.
> Porque no es como si la inteligencia natural fuera siempre tan genial tampoco.
>
> Linus Torvalds, [Re: Linking Patchwork with Sashiko?](https://lore.kernel.org/linux-media/CAHk-=wi4zC+Ze8e+p3tMv8TtG_80KzsZ1syL9anBtmEh5Z40vg@mail.gmail.com/)

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

Linus Torvalds, [Re: Linking Patchwork with Sashiko?](https://lore.kernel.org/linux-media/CAHk-=wi4zC+Ze8e+p3tMv8TtG_80KzsZ1syL9anBtmEh5Z40vg@mail.gmail.com/)
```

Queremos ayudar más allá de los únicos mantenedores: las personas que ya usan la IA, las que querrían usarla, e incluso las que no están seguras de usarla pero que quieren entender cómo funciona. La organización de esta formación nos mostró que esta demanda es fuerte. Así que te dejamos a ti ser juez de la cuestión de si debes usar la IA, y tratamos la que viene después: cómo utilizarla de manera pertinente en el marco de la enseñanza superior y de la investigación (ESR) si así lo deseas.

El uso de un harness, que ocupa la mayor parte de este material, corresponde a un uso más bien avanzado. Ya se puede conectar el entorno de desarrollo (IDE) a un proveedor de IA y usar los comandos chat, edit y agent, a menudo integrados o accesibles mediante plugins. La elección del proveedor es una cuestión de fondo, cuya respuesta varía según el marco en el que trabajáis y puede evolucionar con el tiempo; os invitamos a informaros al respecto.

En esta formación, nos apoyamos en la oferta de [ILaaS](https://www.ilaas.fr/), que da acceso a modelos más grandes y más potentes que los que la gran mayoría de nosotros puede instalar localmente. No todas las universidades forman parte de ILaaS, y para las personas de la ESR que solo quieren acceder a un modelo para probar, sin construir necesariamente un harness, remitimos a la [API Albert](https://ia.numerique.gouv.fr/outils-ia/albert-api/) de la DINUM.

Antes de entrar en el núcleo de la formación, es decir, el harness y su uso, el Acto 1 retoma la [historia](./historique) de las técnicas y los [modelos](./act1-llm), tanto los que son bastante accesibles como los que esperamos alcanzar en un futuro próximo, siendo esta formación la ocasión de impulsar una dinámica en ese sentido. Luego aborda [qué es un harness](./act1-harness) y las razones que nos llevaron a elegir [Pi](./act1-pi).
