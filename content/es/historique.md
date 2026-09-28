# Historia

::: tip Objetivos de este módulo
- Situar en el tiempo las técnicas aparecidas desde el lanzamiento de ChatGPT: del completado de código al harness
:::

Los LLM y su ecosistema han evolucionado a una velocidad vertiginosa. Recordemos que ChatGPT fue lanzado al público general a finales de noviembre de 2022. Desde entonces, las técnicas y las herramientas se han multiplicado:

- **2022: autocompletado inteligente**. Los modelos comienzan a predecir y completar el código sobre la marcha, directamente en el editor, como el autocompletado clásico, pero impulsado por LLM entrenados con miles de millones de líneas de código público.
- **2022-2023: ingeniería de prompts**. Con ChatGPT accesible para el público en general, los desarrolladores descubren que la formulación de la pregunta cambia enormemente la calidad de la respuesta del LLM. La ingeniería de prompts consiste en construir instrucciones muy precisas y estructuradas para obtener mejores resultados.
- **2023-2024: RAG (Retrieval-Augmented Generation)**. El LLM por sí solo no conoce tu base de código específica ni tu documentación interna. Un RAG aumenta los conocimientos del modelo proporcionándole documentos relevantes antes de que responda.
- **2023-2024: agente (LLM + herramientas)**. En lugar de hacer una pregunta y recibir una respuesta, se le dan al modelo los medios para actuar: ejecutar código, consultar una base de datos, llamar a una API, leer archivos.
- **Finales de 2024: MCP (Model Context Protocol)**. Un estándar abierto de Anthropic que normaliza la forma en que los LLM se comunican con las herramientas externas. MCP define un protocolo unificado: cualquier LLM que implemente el protocolo puede utilizar cualquier herramienta que implemente MCP (archivos, API, bases de datos, etc.).
- **2025: ingeniería de contexto**. Prolongación de la ingeniería de prompts: ya no se trata solo de formular bien la pregunta, sino de optimizar todo el contexto proporcionado al modelo, desde la elección de los documentos hasta la gestión del historial, pasando por la estructuración de la información y la relevancia de los ejemplos.
- **2025: harness (harness)**. Un marco que reúne todos los conceptos anteriores en un sistema coherente. El harness gestiona el contexto, las herramientas disponibles, la ejecución del código y los permisos, con el objetivo de lograr un sistema lo bastante autónomo para trabajar en tareas complejas y largas.

Las herramientas han seguido estos avances: ChatGPT, Copilot, Claude Code, OpenCode o, más recientemente, Pi. El módulo [¿Por qué un harness y de qué está hecho?](./act1-harness) retoma esta línea de tiempo para mostrar qué carencia cubre cada etapa.
