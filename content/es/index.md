# Hands-on Harness

*Una formación para que descubras los harness y aprendas a dominarlos*

## Contexto

El uso de los modelos de lenguaje (LLM) en nuestras tareas cotidianas es cada vez más importante, ya sea en la transcripción de reuniones, el análisis de documentos o la programación de aplicaciones. Nos centraremos a continuación en su impacto en el marco del desarrollo de software.

Los LLM y su ecosistema han evolucionado a una velocidad increíble. Recordemos que ChatGPT se lanzó al público general a finales de noviembre de 2022. Desde entonces, las técnicas y las herramientas se han multiplicado:

- **2022: completado inteligente**. Los modelos empiezan a predecir y completar el código sobre la marcha, directamente en el editor, como el autocompletado clásico, pero impulsado por LLM entrenados con miles de millones de líneas de código público.
- **2022-2023: prompt engineering**. Con ChatGPT accesible al público general, los desarrolladores descubren que la formulación de la pregunta cambia enormemente la calidad de la respuesta del LLM. El prompt engineering consiste en construir instrucciones muy precisas y estructuradas para obtener mejores resultados.
- **2023-2024: RAG (Retrieval-Augmented Generation)**. El LLM por sí solo no conoce tu base de código específica ni tu documentación interna. Un RAG aumenta los conocimientos del modelo proporcionándole documentos pertinentes antes de responder.
- **2023-2024: agente (LLM + herramientas)**. En lugar de hacer una pregunta y recibir una respuesta, le damos al modelo los medios para actuar: ejecutar código, consultar una base de datos, llamar a una API, leer archivos.
- **Finales de 2024: MCP (Model Context Protocol)**. Un estándar abierto de Anthropic que normaliza la forma en que los LLM se comunican con las herramientas externas. MCP define un protocolo unificado: cualquier LLM que implemente el protocolo puede utilizar cualquier herramienta que implemente MCP (archivos, APIs, bases de datos, etc.).
- **2025: context engineering**. Una extensión del prompt engineering: ya no se trata solo de formular bien la pregunta, sino de optimizar todo el contexto proporcionado al modelo, desde la elección de los documentos hasta la gestión del historial, pasando por la estructuración de la información y la pertinencia de los ejemplos.
- **2025: harness**. Un marco que ensambla todos los conceptos anteriores en un sistema coherente. El harness gestiona el contexto, las herramientas disponibles, la ejecución del código y los permisos, con el objetivo de crear un sistema lo suficientemente autónomo para trabajar en tareas complejas y largas.

Las herramientas han seguido estos avances: ChatGPT, Copilot, Claude Code, OpenCode o, más recientemente, Pi.

## Retos

En cuatro años, los LLM para la programación no han dejado de cambiar, de ganar rendimiento y de volverse más complejos. Antes incluso de que domines un concepto o una herramienta, ya tienes que aprender otro, y los desarrolladores, al igual que quienes no lo son, siguen esta ola a riesgo de la calidad del software. Ahora surgen dos preguntas: ¿cómo usar eficazmente estas herramientas sin perder el control y en qué pueden ayudarnos en el día a día?

Grandes anuncios nos hacían vislumbrar una ganancia de productividad de al menos el 50 % gracias a los LLM. La realidad es mucho más matizada: un estudio de METR realizado con desarrolladores experimentados concluye que, en códigos complejos, el uso de los LLM puede ser contraproducente [1], y el informe de GitClear sobre la calidad del código observa que los desarrolladores pasan más tiempo rehaciendo el trabajo tras darse cuenta de que lo que un LLM había añadido a la base de código era erróneo [2]. Las Pull Requests de calidad insuficiente se multiplican en el software de código abierto, y el mantenedor se convierte en un revisor absorbido por un trabajo verboso, a menudo mal estructurado, producido por agentes y no revisado por un colaborador que no se ha familiarizado con el código al que pretende contribuir. Cuando esta revisión se hace mal, la refactorización posterior limita a su vez la productividad, cuando no la reduce [3].

Observamos cada vez más proyectos de código abierto que cierran por defecto la apertura de Pull Requests y piden a los colaboradores que inicien una discusión antes de darles los permisos.

El uso del MCP es aquí aún más matizado que las promesas iniciales. Las ventanas de contexto de los nuevos LLM han crecido, llegando recientemente al millón de tokens, pero los modelos reaccionan muy mal en cuanto el 40 % del tamaño global del contexto está ocupado [4]. Otras mediciones, más alarmistas, sitúan el umbral en valor absoluto en lugar de porcentaje, alrededor de los 100K tokens [5]. Verás esta zona bajo el nombre de "dumb zone" [6], "context-rot" o, como en el artículo original, "lost in the middle". Los MCP y todas las herramientas actuales añaden al contexto un preámbulo que puede hacer que llegues a ese punto antes incluso de haber hecho tu primera pregunta, y las respuestas que obtengas ya no serán fiables.

La pregunta que queda es la del control: mantener un espíritu crítico frente a esta facilidad de generación de código y convertirse en orquestador en lugar de seguir siendo un simple observador. Es esto lo que esta formación busca construir.

## Objetivos

Tanto la investigación como la industria se basan en el desarrollo de software; por lo tanto, las personas que desarrollan deben ser acompañadas ante las evoluciones del oficio que inducen los LLM y los agentes de IA.

Esta formación presenta un panorama de las herramientas, los modelos existentes y sus mecanismos de funcionamiento. También busca desarrollar un espíritu crítico ante los posibles abusos de su uso, para promover una utilización ética y responsable.

El programa incluye numerosas partes prácticas, para que los participantes puedan integrar estas herramientas en sus prácticas cotidianas al finalizar la formación.

## Público objetivo y requisitos previos

- **Público**: cualquier persona con actividad de desarrollo de software.
- **Requisitos previos**: experiencia en programación (mínimo 1-2 años); no se requiere experiencia en IA, aunque una experiencia mínima es una ventaja.
- **Nivel**: desde juniors hasta avanzados.

## Referencias

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)
