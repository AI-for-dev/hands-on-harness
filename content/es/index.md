# Hands-on Harness

*Un curso para que descubras y domines los harnas*

## Contexto

El uso de los Large Language Models (LLM) en nuestras tareas diarias cobra cada vez más importancia, ya sea en la transcripción de reuniones, el análisis de documentos o la codificación de aplicaciones. Nos centraremos en el resto del curso en su impacto en el ámbito del desarrollo de software.

La evolución de los LLM y su ecosistema ha avanzado a una velocidad vertiginosa. Recordemos que ChatGPT se presentó al gran público a finales de noviembre de 2022. Desde entonces, han surgido una multiplicidad de técnicas y herramientas:

- **2022: completado inteligente** — Los modelos comienzan a predecir y completar el código sobre la marcha, directamente en el editor. Es como la autocompletación clásica, pero alimentada por LLM entrenados con miles de millones de líneas de código público.
- **2022-2023: prompt engineering** — Con ChatGPT accesible al gran público, los desarrolladores descubren que la formulación de la pregunta impacta enormemente en la calidad de la respuesta del LLM. El prompt engineering consiste en construir instrucciones muy precisas y estructuradas para obtener mejores resultados.
- **2023-2024: RAG (Retrieval-Augmented Generation)** — El LLM solo no conoce tu base de código específica ni tu documentación interna. Un RAG permite aumentar los conocimientos del modelo proporcionándole documentos pertinentes antes de responder.
- **2023-2024: agente (LLM + herramientas)** — En lugar de publicar simplemente una pregunta y recibir la respuesta, creamos agentes inteligentes que pueden actuar: ejecutar código, consultar una base de datos, llamar a una API, leer archivos.
- **Final de 2024: MCP (Model Context Protocol)** — Un estándar abierto de Anthropic que normaliza la forma en que los LLM se comunican con herramientas externas. MCP define un protocolo unificado: cualquier LLM que implemente el protocolo puede utilizar cualquier herramienta que implemente MCP (archivos, APIs, bases de datos, etc.).
- **2025: context engineering** — Evolución del prompt engineering. Ya no se trata solo de formular bien la pregunta, sino de optimizar el contexto proporcionado al modelo: elección de documentos, estructuración de la información, relevancia de los ejemplos, gestión del historial. Es un enfoque más holístico para maximizar la calidad de las respuestas.
- **2025: harnas** — Un marco o infraestructura que integra todos los conceptos anteriores de manera cohesiva. El harnas gestiona automáticamente el contexto, las herramientas disponibles, la ejecución del código, los permisos, etc. Es la evolución lógica: tras haber aprendido los bloques individuales, ensamblarlos en un sistema integrado e inteligente. Su papel es construir un sistema lo más autónomo posible para poder trabajar en tareas complejas y largas.

Las herramientas también han evolucionado enormemente para responder a estos avances: ChatGPT, Copilot, Claude Code, OpenCode o más recientemente Pi.

## Desafíos

En solo 4 años, el panorama de los LLM para la codificación no ha dejado de modificarse, volviéndose más eficiente, pero también más complejo. Incluso antes de que domines un concepto o una herramienta, ya debes aprender otra. Los desarrolladores (y no desarrolladores) montan a caballo en esta ola gigantesca a riesgo de la calidad del software. Porque hoy llegamos a un punto crucial: ¿cómo utilizar eficazmente estas herramientas sin perder el control? ¿En qué nos pueden ayudar estas herramientas en el día a día?

Grandes anuncios nos hicieron creer que éramos al menos un 50 % más productivos gracias a los LLM. La realidad es mucho más matizada. Estudios muestran que, en el caso de códigos complejos, el uso de los LLM puede ser contraproducente [1]. Para un uso habitual, estudios indican que los desarrolladores dedican más tiempo a rehacer el trabajo tras descubrir que la adición de LLM en la base de código era errónea [2]. Cada vez vemos más Pull Requests que se abren sobre software de código abierto donde la calidad no está a la altura. El mantenedor se convierte entonces en un revisor completamente ocupado revisando el trabajo extenso y a menudo no estructurado, producido por agentes y no revisado por el contribuyente que no se ha familiarizado con el código al que pretende contribuir. Si la tarea de revisión se realiza mal, surgen procesos de refactoring limitantes que, de nuevo, pueden afectar negativamente a la productividad [3].

Observamos cada vez más proyectos de código abierto que cierran el acceso a la apertura de Pull Requests por defecto y exigen iniciar una discusión con los potenciales contribuyentes antes de otorgarles los derechos.

En cuanto al uso de MCP, la realidad es aún más matizada que las promesas iniciales. A pesar del aumento del número total de tokens disponibles en la ventana de contexto de los nuevos LLM (hace poco hemos pasado a 1M de tokens), se sabe desde hace un tiempo que los modelos reaccionan muy mal tan pronto como hemos llenado el 40 % del tamaño total del contexto [4]. Otros estudios son aún más alarmistas y muestran que no se trata de un porcentaje, sino más bien de un número de tokens que no se debe superar, situándose en torno a los 100K tokens [5]. Verás esta zona bajo el nombre de « dumb zone » [6], « context-rot » o, como en el artículo original, « lost in the middle ». El uso de MCP y de todas las herramientas existentes hoy añade un prefacio en el contexto que puede hacerte llegar a la « dumb zone » incluso antes de empezar a formular tu primera pregunta. Las respuestas que obtengas entonces ya no serán fiables.

Entonces, ¿es posible recuperar el dominio de la IA en el marco del desarrollo de software? ¿Cómo no perder el espíritu crítico y seguir ejercitándolo frente a esta facilidad para generar código? ¿Cómo convertirse en un orquestador y no en un simple observador?

## Objetivos

El desarrollo de software constituye un pilar fundamental del progreso de la investigación y la industria. Por consiguiente, es primordial acompañar a las personas que desarrollan frente a las evoluciones profesionales inducidas por la integración de LLM y agentes de IA.

Esta formación tiene como objetivo presentar un panorama de las herramientas, de los modelos existentes y de sus mecanismos de funcionamiento. También tiene la ambición de desarrollar un espíritu crítico frente a las posibles desviaciones relacionadas con su uso, con el fin de promover un uso ético y responsable de estas tecnologías.

El programa incluirá numerosas partes prácticas para que los participantes puedan, al término de la formación, integrar estas herramientas en sus prácticas diarias.

## Público objetivo y requisitos previos

- **Público**: cualquier persona que realice actividades de desarrollo de software.
- **Requisitos previos**: experiencia en programación (mínimo 1-2 años); no se requiere experiencia previa en IA, aunque tener alguna es beneficioso.
- **Nivel**: desde principiantes hasta expertos.

## Referencias

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)