# Hands-on Harness

*Una formación para que descubras los harness y aprendas a dominarlos*

## Contexto

El uso de los modelos de lenguaje (LLM) en nuestras tareas diarias es cada vez más importante, ya sea en la transcripción de reuniones, el análisis de documentos o incluso el desarrollo de aplicaciones. A continuación, nos centraremos en su impacto en un entorno de desarrollo de software.

La evolución de los LLM y de su ecosistema se ha desarrollado a una velocidad increíble. Recordemos que ChatGPT se presentó al público general a finales de noviembre de 2022. Desde entonces, ha surgido una multiplicidad de técnicas y herramientas:

- **2022: completado inteligente** - Los modelos empiezan a predecir y completar el código sobre la marcha, directamente en el editor. Es como el autocompletado clásico, pero impulsado por LLM entrenados con miles de millones de líneas de código público.
- **2022-2023: prompt engineering** - Con ChatGPT accesible al público general, los desarrolladores descubren que la formulación de la pregunta impacta enormemente la calidad de la respuesta del LLM. El prompt engineering consiste en construir instrucciones muy precisas y estructuradas para obtener mejores resultados.
- **2023-2024: RAG (Retrieval-Augmented Generation)** - El LLM por sí solo no conoce tu base de código específica ni tu documentación interna. Un RAG permite aumentar los conocimientos del modelo proporcionándole documentos pertinentes antes de responder.
- **2023-2024: agente (LLM + herramientas)** - En lugar de publicar solo una pregunta y recibir la respuesta, creamos agentes inteligentes que pueden actuar: ejecutar código, consultar una base de datos, llamar a una API, leer archivos.
- **Finales de 2024: MCP (Model Context Protocol)** - Un estándar abierto de Anthropic que normaliza la forma en que los LLM se comunican con las herramientas externas. MCP define un protocolo unificado: cualquier LLM que implemente el protocolo puede utilizar cualquier herramienta que implemente MCP (archivos, APIs, bases de datos, etc.).
- **2025: context engineering** - Evolución del prompt engineering. Ya no se trata solo de formular bien la pregunta, sino de optimizar el contexto proporcionado al modelo: elección de documentos, estructuración de la información, pertinencia de los ejemplos, gestión del historial. Es un enfoque más holístico para maximizar la calidad de las respuestas.
- **2025: harness** - Un marco o una infraestructura que integra todos los conceptos anteriores de manera cohesiva. El harness gestiona automáticamente el contexto, las herramientas disponibles, la ejecución del código, los permisos, etc. Es la evolución lógica: después de aprender los bloques individuales, ensamblarlos en un sistema integrado e inteligente. Su función es construir un sistema que sea lo más autónomo posible para poder trabajar en tareas complejas y largas.

Las herramientas también han evolucionado considerablemente para responder a estos avances: ChatGPT, Copilot, Claude Code, OpenCode o más recientemente Pi.

## Desafíos

En solo 4 años, el panorama de los LLM para la programación no ha dejado de cambiar, de volverse más eficiente, pero también de complejizarse. Antes incluso de que domines un concepto o una herramienta, ya tienes que aprender otro. Los desarrolladores (y no desarrolladores) surfean esta ola gigantesca a riesgo de la calidad del software. Porque hoy en día, estamos exactamente en este punto: ¿cómo utilizar eficazmente estas herramientas sin perder el control? ¿En qué pueden ayudarnos estas herramientas en el día a día?

Grandes anuncios nos hacían creer que éramos al menos un 50% más productivos gracias a los LLM. La realidad es mucho más matizada. Algunos estudios muestran que, en códigos complejos, el uso de los LLM puede ser contraproducente [1]. Para un uso habitual, los estudios indican que los desarrolladores pasan más tiempo rehaciendo el trabajo tras darse cuenta de que la adición de los LLM en la base de código era errónea [2]. Vemos cada vez más Pull Requests en software de código abierto donde la calidad no está a la altura. El mantenedor se convierte entonces en un revisor completamente absorbido por la lectura de un trabajo verboso y a menudo no estructurado, producido por agentes y no revisado por el contribuidor, quien no se ha familiarizado con el código al que pretende contribuir. Si el trabajo de revisión se hace mal, surgen procesos de refactorización que resultan limitantes o incluso impactan negativamente en la productividad [3].

Observamos cada vez más proyectos de código abierto que cierran el acceso a la apertura de Pull Requests por defecto y solicitan iniciar una discusión con los posibles contribuidores antes de otorgarles los permisos.

En cuanto al uso del MCP, la realidad es aún más matizada que las promesas iniciales. A pesar del aumento del número total de tokens disponibles en la ventana de contexto de los nuevos LLM (recientemente pasamos a 1M de tokens), se sabe desde hace un tiempo que los modelos reaccionan muy mal en cuanto hemos llenado el 40% del tamaño global del contexto [4]. Otros estudios son aún más alarmistas y muestran que no se trata de un porcentaje, sino de un número de tokens a no superar que se sitúa alrededor de los 100K tokens [5]. Verás esta zona bajo el nombre de « dumb zone » [6], « context-rot » o, como en el artículo original, « lost in the middle ». El uso de los MCP y de todas las herramientas actuales añade un preámbulo al contexto que puede llevarte a la « dumb zone » antes incluso de haber empezado a plantear tu primera pregunta. Las respuestas que obtengas dejarán entonces de ser fiables.

¿Entonces, es posible volver a tener el control de la IA en el marco del desarrollo de software? ¿Cómo no perder el espíritu crítico y seguir ejerciéndolo frente a esta facilidad para generar código? ¿Cómo convertirse en orquestador y no en un simple observador?

## Objetivos

El desarrollo de software constituye un pilar fundamental del progreso de la investigación y la industria. Por lo tanto, es primordial acompañar a quienes desarrollan ante las evoluciones profesionales inducidas por la integración de los LLM y los agentes de IA.

Esta formación tiene como objetivo ofrecer un panorama de las herramientas, los modelos existentes y sus mecanismos de funcionamiento. También tiene la ambición de desarrollar un espíritu crítico frente a las posibles desviaciones relacionadas con su uso, con el fin de promover una utilización ética y responsable de estas tecnologías.

El programa incluirá numerosas partes prácticas para que los participantes puedan, al finalizar la formación, integrar estas herramientas en sus prácticas cotidianas.

## Público objetivo y prerrequisitos

- **Público**: cualquier persona que realice actividades de desarrollo de software.
- **Prerrequisitos**: experiencia en programación (mínimo 1-2 años); no se requiere experiencia previa en IA, aunque una experiencia mínima es un punto a favor.
- **Nivel**: desde juniors hasta confirmados.

## Referencias

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)
