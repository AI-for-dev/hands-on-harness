# Hands-on Harness

*Una formación para descubrir y dominar los harness*

## Contexto y posicionamiento

Este material de formación fue creado en el marco de la ANF IA4Dev del 19 al 22 de octubre de 2026 [https://ia4dev-2026.sciencesconf.org/](https://ia4dev-2026.sciencesconf.org/). El uso de los Modelos de Lenguaje Grande (LLM), ya sea para codificación u otras tareas, plantea obviamente problemas importantes desde una perspectiva jurídica (propiedad del código...), social y ambiental. En la ANF, optamos por invitar a varias personas a tratar estos temas, pero no hemos desarrollado estos aspectos en este material. Las personas interesadas podrán encontrar algunas referencias sobre estas cuestiones en el apéndice.

Es evidente que construir una formación sobre IA para ayudar al desarrollo software plantea cuestiones. ¿Se trata, implícitamente, de promover el uso de la IA para codificar? Nuestra elección de no desarrollar aquí las problemáticas jurídicas, sociales y ambientales plantea incluso la cuestión de manera más crítica: ¿estamos poniendo en el apéndice de este material lo que debería ser la información principal y el núcleo de la formación para posicionarse con conocimiento de causa?

Tuvimos la suerte de tener en el comité de organización de esta ANF posicionamientos muy diferentes. Esta diversidad fue fuente de numerosas discusiones y esta formación no tiene ningún objetivo de convencer a nadie de usar o no usar la IA.
Es cierto que, mostrando cómo hacerlo a través de este material, participamos en la difusión de la práctica.

En el momento de la redacción de estas líneas, Linus Torvalds, el fundador de Linux, hizo una declaración cercana al posicionamiento de este material pedagógico:

> "La IA es una herramienta, al igual que otras herramientas que utilizamos. Y es claramente una herramienta útil.
> Quizás no era tan 'clara' hace solo un año, pero ya no es una cuestión hoy.
> Hay otras cuestiones alrededor de la IA (como a qué se parecerá realmente la economía de la IA al final), pero 'si es útil' ya no es una de esas cuestiones. Quien dude de ello claramente no ha utilizado la IA de verdad.
> Sí, también puede ser una herramienta algo dolorosa, tanto para la carga de trabajo de los mantenedores como desde el punto de vista de 'sigue encontrando errores vergonzosos'.
> Pero la solución no es esconder la cabeza en la arena y cantar 'La La La, no te oigo' a toda voz como algunos parecen hacerlo.
> La solución es asegurar que estas herramientas LLM _ayuden_ a los mantenedores en lugar de causarles dolor. No hay cuestión al respecto.
> No forzamos a nadie a usarlas, pero ignoraré muy ruidosamente a las personas que intenten contradecir a otros sobre su uso.
> Y no, la IA no es perfecta. Pero carajo, quien destaque los problemas de la IA debería mirarse en el espejo al mismo tiempo.
> Porque no es como si la inteligencia natural fuera siempre tan genial tampoco."
>
> —— Linus Torvalds [https://www.phoronix.com/news/Linux-Is-Not-Anti-AI](https://www.phoronix.com/news/Linux-Is-Not-Anti-AI)


En nuestro caso, se trata de ayudar no solo a los mantenedores, sino más globalmente a los usuarios de la IA, aquellos que gustaría usarla o incluso aquellos que no están realmente seguros de servirse de ella pero que quieren comprender mejor y saber cómo funciona. La organización de esta ANF nos mostró que hay una fuerte demanda en este sentido. La cuestión no es, por tanto: ¿debes servirte de la IA o no? (pues te dejamos realmente como juez de esto) sino, si quiero usarla en el marco de la ESR de manera pertinente, ¿cómo puedo hacerlo?

Es evidente que lo que se presentará principalmente en este material, es decir, el uso de un harnais, corresponde a un uso algo avanzado. De cierta manera, es posible conectar simplemente su entorno de desarrollo (IDE) a un proveedor de IA y usar comandos a menudo integrados o accesibles mediante plugins: chat, edit y agent. ¿Cuál es la pregunta fundamental sobre qué proveedor de IA? Aquí, según los marcos en los que trabajes, las respuestas variarán. Además, es probable que evolucionen con el tiempo y te invitamos a informarte sobre la cuestión.

En esta formación, apoyaremos la oferta de IlaaS [https://www.ilaas.fr/](https://www.ilaas.fr/) porque permite usar modelos más grandes y performantes de lo que es posible para la gran mayoría de nosotros instalar localmente [https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/] (https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/)). Somos conscientes de que todas las universidades no están en IlaaS y para aquellos y aquellas en la ESR que solo quieren tener acceso a un modelo para probar sin necesariamente construir un harnais, te remitimos a la API Albert de la DINUM [https://ia.numerique.gouv.fr/outils-ia/albert-api/](https://ia.numerique.gouv.fr/outils-ia/albert-api/).

Antes de entrar en el núcleo de la formación, es decir, el harnais y su uso, detallaremos un poco la historia, los modelos (los que son fácilmente accesibles y los que apuntamos en un futuro cercano, ya que esta formación fue la ocasión de impulsar una dinámica en este sentido) y algunos harnais disponibles y por qué elegimos Pi.

En una segunda parte, veremos el funcionamiento de Pi y crearemos una primera extensión. Las nociones de 


## Plan de la formación

1. **Orientarse en el panorama actual de los LLM y los harnais**
   - [Historia](./historique)
   - Modelos y proveedores
   - Los harnais
       - [¿Qué es un harnais?](./quest-ce-quun-harnais)
       - Algunos harnais

2. **Manejar Pi**
   - Instalar y configurar Pi
   - Configurar el acceso a IlaaS
   - Descubrimiento de Herdr 
   - Descubrir los comandos y algunas primeras extensiones de Pi

3. **Construir y adaptar su harnais**
   - Crear una primera extensión
   - ...