# ¿Por qué un harness y de qué está hecho?

::: tip Objetivos de este módulo
- Reconstruir la cadena que va desde el prompt hasta el harness, y señalar qué vacío cubre cada etapa
- Definir con precisión qué es un harness, y comprender por qué es propio tuyo y está en constante evolución
- Saber enumerar las piezas imprescindibles de un harness y, para cada una, a qué problema responde
:::

La introducción presentó una línea temporal de las técnicas aparecidas desde finales de 2022. La retomamos aquí con otro ángulo, no para contar una historia, sino para comprender una mecánica. Cada etapa de esta línea temporal responde a una carencia de la etapa anterior, y sobre todo, cada una se apila sobre las demás en lugar de reemplazarlas. Un harness no hace que el *prompt engineering* quede obsoleto; siempre lo necesita, pero lo organiza.

Al principio, estaba el prompt. Uno se da cuenta rápidamente de que la forma de formular una petición cambia radicalmente la respuesta, y el *prompt engineering* consiste en formular mejor. Pero un modelo bien interrogado sigue siendo ignorante de tu base de código y de tu documentación interna. El RAG colma esta carencia: va a buscar los documentos pertinentes y los proporciona al modelo antes de que responda, pero requiere una construcción que puede ser laboriosa.

El modelo ya sabe responder mejor, pero sigue sin hacer más que responder. No puede actuar. El agente colma esta carencia dotándolo de herramientas: ejecutar código, leer un archivo, llamar a una API. Dado que cada herramienta debe ser descrita y conectada, la multiplicación de las integraciones se vuelve rápidamente ingrible, y el MCP normaliza la forma en que un modelo dialoga con herramientas externas. Las herramientas pueden a veces ser buenos sustitutos del RAG.

En este punto, se dispone de un modelo capaz de ir a buscar información y de actuar. Queda por decidir qué se mete en su ventana de contexto y en qué orden. Este es el *context engineering*, prolongación del *prompt engineering*: ya no se trata solo de plantear bien la pregunta, sino de optimizar todo el contexto proporcionado al modelo.

## El harness, una infraestructura de software

El harness es el eslabón que ensambla todos los precedentes en un sistema coherente. [Vivek Trivedy][langchain-harness] lo define así: un harness es código, configuración o lógica de ejecución, nada más misterioso que eso, pero tampoco menos. [Lilian Weng][weng-harness] va un poco más lejos: es el sistema que rodea al modelo y decide cómo piensa y planifica, cómo llama a herramientas y actúa, cómo percibe y gestiona su contexto, dónde guarda lo que produce y cómo evalúa sus resultados. Tiene cuidado de distinguirlo de la fórmula más antigua « agente = LLM + memoria + herramientas + planificación + acción »: el harness añade el diseño explícito de los bucles de trabajo, la evaluación, el control de permisos y la persistencia del estado en el tiempo.

[Avi Chawla][ddods-harness] clasifica estos tres niveles en círculos concéntricos. El *prompt engineering* da forma a las instrucciones dadas al modelo. El *context engineering* decide qué ve el modelo, y cuándo. El *harness engineering* contiene ambos, y añade toda la infraestructura de aplicación: orquestación de herramientas, persistencia del estado, recuperación ante errores, bucles de verificación, control de permisos, ciclo de vida completo de una tarea. Un harness que se resumiera a un system prompt bien escrito no lo es; es la parte más visible, rara vez la más determinante.

Esta infraestructura no es nada abstracto: es software que se puede abrir, leer y modificar. Un archivo de configuración que declara los modelos disponibles y los permisos concedidos. Un archivo `AGENTS.md` o `CLAUDE.md` que contiene las reglas del proyecto. Scripts que implementan hooks, un directorio de habilidades, y por encima de todo esto un proceso que gira realmente: el bucle agentivo en sí mismo, el que encadena la llamada al modelo, la ejecución de la herramienta y la relección del resultado. Es esta materialidad lo que lo cambia todo: un harness se construye, se depura y se repara como cualquier otro software, mediante archivos modificados, pruebas y commits. Veremos una instancia concreta ya en el siguiente módulo, con el directorio `.pi/` de Pi.

## Un harness propio de cada uno, y que nunca deja de moverse

Dos ideas merecen presentarse antes de ir más lejos, porque condicionan la forma en que debes recibir todo lo que sigue.

La primera es que tu harness nunca se parecerá del todo al del vecino. [Addy Osmani][osmani-harness] lo formula así: la ingeniería del harness es una disciplina, no un framework que se instalaría tal cual, porque el buen harness para tu código está moldeado por tu historial de fracasos. Y un historial de fracasos no se descarga. Se puede inspirar en el harness de otro, nunca copiarlo tal cual esperando que cubra los mismos ángulos ciegos, ya que fue moldeado por incidentes que no son los tuyos.

La segunda es que el harness se mueve, por dos razones de naturaleza diferente.

La primera depende del propio modelo. [Avi Chawla][ddods-harness] lo llama el grosor del harness (*harness thickness*): cuánta lógica debe vivir en el harness en lugar de en el modelo? Anthropic, dice el artículo, apuesta por un harness fino y por el progreso del modelo, hasta el punto de eliminar regularmente etapas de planificación de Claude Code a medida que las nuevas versiones del modelo las internalizan, cuando otros frameworks, construidos alrededor de grafos explícitos, apuestan por un control que permanece escrito en duro. Una pieza que tiene sentido hoy puede convertirse en un lastre muerto en seis meses, solo por la razón de que el modelo ha evolucionado.

La segunda razón depende de tu uso. [Osmani][osmani-harness] la resume en lo que presenta como el hábito más importante de la profesión: tratar cada fracaso del agente como una señal permanente, no como un accidente a justificar. Advierte contra la respuesta más tentadora: añadir la lección aprendida como una frase más en un archivo `AGENTS.md` ya largo. Pero un archivo de reglas que crece sin ser nunca retrabajado pierde legibilidad lo que cree ganar en cobertura. Su fórmula para retener: un harness es un sistema vivo, no un archivo de configuración que se escribe una vez para siempre. El patrón que propone a cambio se resume en una pregunta: qué comportamiento queremos obtener o corregir, y qué pieza precisa del harness puede lograrlo: es exactamente el patrón que seguiremos a lo largo de la reconstrucción.

Por tanto, retén este módulo como un inventario de partida, no como una arquitectura fija. Algunas de las piezas que siguen, las dejarás mínimas; otras, las engrosarás a lo largo de tus propios fracasos.

## Las siete piezas

La pregunta de partida es la siguiente. Tenemos un modelo capaz de predecir texto y de llamar a herramientas. ¿De qué hay que rodearlo para que trabaje de forma fiable, segura y útil en tareas reales? Cada pieza que sigue responde a un límite preciso del modelo nu; esa correspondencia es lo que hay que tener en mente, más que la lista en sí. Es la rejilla que organiza todo el resto de la formación: cada módulo del acto 2 reconstruye una de estas piezas.

La **gestión del contexto** viene en primer lugar. La ventana es finita, y hemos visto que el modelo explota mal un contexto demasiado largo o mal ordenado. [Avi Chawla][ddods-harness] recopila cinco estrategias prácticas para mantenerla bajo control: purga periódica, resumen de la conversación, enmascaramiento de las observaciones obsoletas, toma de notas estructurada y delegación a un sub-agente. Un estudio que cita (ACON) obtiene hasta un 54 % menos de tokens, con una exactitud preservada por encima del 95 %, preferiendo las trazas de razonamiento a las salidas crudas de las herramientas. El principio que se desprende: seleccionar qué se pone en la ventana, ordenarlo para aprovechar la caché, y compactar lo que se infla inútilmente.

Las **herramientas** vienen después, porque un modelo que solo produce texto no puede actuar. [Vivek Trivedy][langchain-harness] lo resume en una imagen: el bash y la ejecución de código dan al agente « un ordenador bajo la mano », hasta el punto de que puede usarlo para construir sus propias herramientas sobre la marcha. Pero un catálogo demasiado amplio perjudica tanto como ayuda: [Avi Chawla][ddods-harness] informa de que Vercel retiró el 80 % de las herramientas de su agente v0 y obtuvo mejores resultados, y de que Claude Code reduce su contexto en un 95 % al cargar las herramientas solo bajo demanda. El principio: cada capacidad debe exponerse bajo forma de herramienta descrita para el modelo y conservada por un permiso, y exponer solo lo estrictamente necesario en la etapa actual.

La **delegación** responde a un problema más sutil, que [Vivek Trivedy][langchain-harness] formula así: para mantener un contexto limpio, hay que desplegar sub-agentes en tareas bien precisas, y no reinyectar en el hilo principal más que una síntesis de su trabajo, en lugar de toda la reflexión que permitió llegar ahí. El trabajo de una subtarea es de hecho a menudo mucho más voluminoso que su conclusión; si todo ese trabajo se acumula en el contexto principal, este se degrada.

La **orquestación** organiza varios agentes entre sí. [Avi Chawla][ddods-harness] plantea dos compromisos recurrentes. Primero, agente único o multi-agentes: Anthropic así como OpenAI recomiendan empujar un solo agente al máximo antes de añadir un segundo, y separar solo pasado una decena de herramientas que se superponen, o dominios de tarea claramente distintos. Luego, una vez varios agentes en juego, hay que hacer razonar y actuar cada paso (el patrón ReAct), o separar la planificación de la ejecución? La orquestación lleva también la ambición más difícil de mantener, la que [Vivek Trivedy][langchain-harness] presenta como el objetivo último: hacer trabajar un agente en un horizonte largo. [Osmani][osmani-harness] describe una realización concreta y sorprendentemente simple: un mecanismo intercepta el intento del agente de concluir, y luego relanza una sesión nueva sobre el mismo objetivo; cada iteración parte de un contexto limpio, pero recupera el estado del trabajo anterior solo a través de lo que el sistema de archivos ha guardado.

La **memoria** persiste las decisiones entre las sesiones. [Vivek Trivedy][langchain-harness] lo recuerda sin rodeos: un modelo no conoce nada más que sus pesos y lo que se encuentra en su contexto del momento; sin un proceso dedicado, olvida tanto sus errores pasados como sobre lo que trabajaba la víspera, de ahí el uso de archivos como `AGENTS.md` o `CLAUDE.md`. [Osmani][osmani-harness] designa este tipo de archivo como el punto de configuración más rentable del harness, ya que aterriza en el system prompt en cada turno; recomienda mantenerlo corto (algunos equipos mantienen el suyo bajo sesenta líneas) y tratarlo como la lista de control de un piloto, no como una guía de estilo. El sistema de archivos sigue siendo un buen punto de partida para la memoria, pero Osmani nota que no basta siempre: para la documentación actualizada de una biblioteca, una búsqueda web o un servidor MCP dedicado siguen siendo necesarios.

La **seguridad**, materializada por los permisos, delimita lo que el agente tiene derecho a hacer. [Avi Chawla][ddods-harness] la presenta como un cursor: una arquitectura permisiva avanza rápido pero corre riesgos, una arquitectura restrictiva es más segura, pero ralentiza cada acción, y el buen ajuste depende del contexto de despliegue. Se acompaña a menudo de un aislamiento físico: [Vivek Trivedy][langchain-harness] recuerda que los sandboxes dan al agente un espacio seguro, y permiten que varios agentes trabajen en paralelo sin que uno rompa lo que el otro construye. Es lo que distingue un sistema autónomo de un sistema peligroso, y veremos que esta pieza merece un cuidado particular.

La **verificación y la evaluación**, por fin, responden a una pregunta sencilla: ¿funciona, y a qué coste? [Avi Chawla][ddods-harness] distingue una verificación computacional y determinista (pruebas, linters, verificadores de tipos) de una verificación inferencial confiada a un LLM-juez, más sensible a los problemas semánticos pero más lenta de obtener. Un principio transversal vuelve en [Osmani][osmani-harness]: un modelo que juzga su propio trabajo tiende a auto-notarse generosamente, y confiar la relección a un agente distinto de aquel que produjo el resultado da veredictos notablemente más fiables. [Lilian Weng][weng-harness] cierra el bucle: en los harnesses más avanzados, esta verificación ya no sirve solo para controlar una tarea puntual, alimenta un bucle de auto-mejora del modelo. Un modelo que progresa así evita, a su vez, que el harness se sobre-complique. Un harness que no se mide es un harness que no se pilota.

## En la práctica

Sería tentador retener estas siete piezas como una lista de verificación. Eso sería perder lo esencial. Lo que queremos transmitir es una rejilla de lectura: frente a cualquier harness, debes poder señalar cada pieza, decir si está presente, ausente o mínima, y comprender las consecuencias de esta elección.

Esta rejilla tiene dos usos. La aplicaremos primero a Pi, para organizar la reconstrucción. La aplicarás luego a tu propio harness, en el acto 4. No todas las piezas son obligatorias para todos los usos: un harness dedicado a la revisión de código no tiene las mismas necesidades que un harness de migración. Saber elegir las piezas útiles forma parte de la competencia que buscamos construir.

Toma un harness que conozcas, o que manipulemos juntos: Claude Code, Cursor, u otro. Para cada pieza de la rejilla, intenta señalarla en la herramienta. ¿Dónde se gestiona el contexto? ¿Cuáles son las herramientas expuestas? ¿Hay memoria, y dónde vive? Anota las piezas que parecen ausentes o reducidas al mínimo: son a menudo las más reveladoras de las elecciones de diseño de la herramienta. Si ya te has encontrado con un fracaso con esta herramienta (una acción que no habría debido emprender, un olvido repetido), intenta relacionar este fracaso con una de las siete piezas: es exactamente el ejercicio que repetiremos a lo largo del acto 2.

## Para ir más lejos

Este módulo se apoya en cuatro textos recientes que, cada uno a su manera, intentan definir qué es un harness y qué lo hace moverse. Los encontraremos citados a lo largo de las piezas arriba.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering
