# ¿Por qué un harness y de qué está hecho?

::: tip Objetivos de este módulo
- Reconstituir la cadena que va desde el prompt hasta el harness, e indicar qué vacío llena cada etapa
- Definir precisamente qué es un harness, y comprender por qué es propio tuyo y no deja de cambiar
- Saber enumerar los componentes indispensables de un harness y, para cada uno, a qué problema responde
:::

La introducción presentó una línea de tiempo de las técnicas aparecidas desde finales de 2022. La retomamos aquí desde otro ángulo, ya no para contar una historia, sino para comprender una mecánica. Cada etapa de esta línea de tiempo responde a un vacío de la etapa anterior y, sobre todo, cada una se apila sobre las otras en lugar de reemplazarlas. Un harness no hace que el *prompt engineering* sea obsoleto; siempre lo necesita, pero lo organiza.

Al principio, está el prompt. Pronto te das cuenta de que la forma de formular una solicitud cambia radicalmente la respuesta, y el *prompt engineering* consiste en formular mejor. Pero un modelo bien interrogado sigue ignorando tu base de código y tu documentación interna. El RAG llena este vacío: busca los documentos pertinentes y se los proporciona al modelo antes de que responda, pero requiere una construcción que puede ser tediosa.

El modelo sabe entonces responder mejor, pero sigue limitándose a responder. No puede actuar. El agente llena este vacío dándole herramientas: ejecutar código, leer un archivo, llamar a una API. Como cada herramienta debe ser descrita y conectada, la multiplicación de las integraciones se vuelve rápidamente inmanejable, y el MCP normaliza la forma en que un modelo dialoga con herramientas externas. Las herramientas pueden ser a veces buenos sustitutos del RAG.

En este punto, disponemos de un modelo capaz de buscar información y de actuar. Queda decidir qué se pone en su ventana de contexto y en qué orden. Es el *context engineering*, una extensión del *prompt engineering*: ya no se trata solo de plantear bien la pregunta, sino de optimizar todo el contexto proporcionado al modelo.

## El harness, una infraestructura de software

El harness es el eslabón que ensambla todos los anteriores en un sistema coherente. [Vivek Trivedy][langchain-harness] lo define así: un harness es código, configuración o una lógica de ejecución; nada más misterioso que eso, pero tampoco nada menos. [Lilian Weng][weng-harness] va un paso más allá: es el sistema que rodea al modelo y que decide cómo piensa y planifica, cómo llama a herramientas y actúa, cómo percibe y gestiona su contexto, dónde guarda lo que produce y cómo evalúa sus resultados. Ella se encarga de distinguirlo de la fórmula más antigua « agente = LLM + memoria + herramientas + planificación + acción »: el harness añade el diseño explícito de los bucles de trabajo, la evaluación, el control de permisos y la persistencia de estado en el tiempo.

[Avi Chawla][ddods-harness] organiza estos tres niveles en círculos concéntricos. El *prompt engineering* moldea las instrucciones dadas al modelo. El *context engineering* decide qué ve el modelo y cuándo. El *harness engineering* contiene ambos y añade toda la infraestructura de aplicación: orquestación de herramientas, persistencia de estado, recuperación de errores, bucles de verificación, control de permisos y el ciclo de vida completo de una tarea. Un harness que se resumiera en un system prompt bien escrito no lo es; es la parte más visible, pero rara vez la más determinante.

Esta infraestructura no tiene nada de abstracta: es software que se puede abrir, leer y modificar. Un archivo de configuración que declara los modelos disponibles y los permisos otorgados. Un archivo `AGENTS.md` o `CLAUDE.md` que contiene las reglas del proyecto. Scripts que implementan hooks, un directorio de skills y, por encima de todo, un proceso que realmente se ejecuta: el propio bucle agéntico, el que encadena la llamada al modelo, la ejecución de la herramienta y la relectura del resultado. Esta materialidad es la que explica que un harness se construya, se depure y se repare como cualquier otro software: mediante archivos modificados, pruebas y commits. Veremos una instancia concreta en el siguiente módulo, con el directorio `.pi/` de Pi.

## Un harness propio para cada uno, y que no deja de evolucionar

Dos ideas merecen ser presentadas antes de seguir adelante, ya que condicionan la forma en que debes recibir todo lo siguiente.

La primera es que tu harness nunca se parecerá del todo al del vecino. [Addy Osmani][osmani-harness] lo formula así: la ingeniería del harness es una disciplina, no un framework que se instale tal cual, porque el harness adecuado para tu código está moldeado por tu historial de fracasos, el cual no se descarga como un paquete. Uno puede inspirarse en el harness de otro, pero nunca copiarlo tal cual esperando que cubra los mismos puntos ciegos, ya que ha sido moldeado por incidentes que no son los tuyos.

La segunda es que el harness cambia, por dos razones de naturaleza diferente.

La primera se debe al modelo mismo. [Avi Chawla][ddods-harness] llama a esto el grosor del harness (*harness thickness*): ¿cuánta lógica debe vivir en el harness en lugar de en el modelo? Anthropic, según el artículo, apuesta por un harness delgado y por el progreso del modelo, hasta el punto de eliminar regularmente etapas de planificación de Claude Code a medida que las nuevas versiones del modelo las internalizan, mientras que otros frameworks, construidos alrededor de grafos explícitos, apuestan, por el contrario, por un control que permanece escrito en código duro. Un bloque que tiene sentido hoy puede, por tanto, convertirse en un lastre en seis meses, solo por la razón de que el modelo ha evolucionado.

La segunda razón se debe a tu uso. [Osmani][osmani-harness] la resume en lo que presenta como el hábito más importante de la profesión: tratar cada fallo del agente como una señal permanente, no como un accidente que deba justificarse. Advierte contra la respuesta más tentadora: añadir la lección aprendida como una frase más en un archivo `AGENTS.md` que ya es largo. Sin embargo, un archivo de reglas que crece sin ser revisado pierde en legibilidad lo que cree ganar en cobertura. Su fórmula a recordar: un harness es un sistema vivo, no un archivo de configuración que se escribe una sola vez. El patrón que propone en su lugar se resume en una pregunta: ¿qué comportamiento queremos obtener o corregir, y qué pieza precisa del harness puede lograrlo? Este es el patrón que seguiremos a lo largo de la reconstrucción.

Considera este módulo, por tanto, como un inventario inicial, no como una arquitectura fija. Algunas de las piezas que siguen las dejarás mínimas; otras, las reforzarás a medida que experimentes tus propios fallos.

## Los siete bloques

La pregunta inicial es la siguiente. Tenemos un modelo capaz de predecir texto y de llamar a herramientas. ¿De qué debemos rodearlo para que trabaje de forma fiable, segura y útil en tareas reales? Cada bloque que sigue responde a una limitación precisa del modelo puro; es esta correspondencia la que hay que tener en cuenta, más que la lista en sí. Es la guía que organiza todo el resto de la formación: cada módulo del acto 2 reconstruye uno de estos bloques.

La **gestión del contexto** es lo primero. La ventana es finita, y ya hemos visto que el modelo gestiona mal un contexto demasiado largo o mal ordenado. [Avi Chawla][ddods-harness] enumera cinco estrategias prácticas para controlarla: purga periódica, resumen de la conversación, ocultación de observaciones obsoletas, toma de notas estructurada y delegación a un subagente. Un estudio que cita (ACON) logra hasta un 54 % menos de tokens, manteniendo una exactitud superior al 95 %, al preferir los rastros de razonamiento sobre las salidas brutas de las herramientas. El principio resultante es: seleccionar lo que se coloca en la ventana, ordenarlo para aprovechar la caché y compactar aquello que crece innecesariamente.

Las **herramientas** vienen después, ya que un modelo que solo produce texto no puede actuar. [Vivek Trivedy][langchain-harness] lo resume en una imagen: el bash y la ejecución de código le dan al agente «un ordenador a mano», hasta el punto de que puede usarlo para construir sus propias herramientas sobre la marcha. Pero un catálogo demasiado amplio perjudica tanto como ayuda: [Avi Chawla][ddods-harness] relata que Vercel retiró el 80 % de las herramientas de su agente v0 y obtuvo mejores resultados, y que Claude Code reduce su contexto en un 95 % al cargar las herramientas solo bajo demanda. El principio: cada capacidad debe exponerse en forma de herramienta descrita para el modelo y protegida por un permiso, y exponer solo lo estrictamente necesario en el paso actual.

La **delegación** responde a un problema más sutil, que [Vivek Trivedy][langchain-harness] formula así: para mantener un contexto limpio, hay que desplegar subagentes en tareas muy precisas y reinyectar en el hilo principal solo una síntesis de su trabajo, en lugar de toda la reflexión que permitió llegar a ella. El trabajo de una subtarea es, de hecho, a menudo mucho más voluminoso que su conclusión; si todo ese trabajo se acumula en el contexto principal, este se degrada.

La **orquestación** organiza varios agentes entre sí. [Avi Chawla][ddods-harness] plantea dos dilemas recurrentes. Primero, agente único o multiagentes: tanto Anthropic como OpenAI recomiendan llevar un solo agente al máximo antes de añadir un segundo, y separar solo cuando haya más de diez herramientas que se solapen o dominios de tarea claramente distintos. Luego, una vez que hay varios agentes en juego, ¿deben razonar y actuar en cada paso (el patrón ReAct) o separar la planificación de la ejecución? La orquestación conlleva también la ambición más difícil de mantener, la que [Vivek Trivedy][langchain-harness] presenta como la meta final: hacer que un agente trabaje en un horizonte largo. [Osmani][osmani-harness] describe una implementación concreta y sorprendentemente sencilla: un mecanismo intercepta el intento del agente de concluir y luego reinicia una sesión nueva sobre el mismo objetivo; cada iteración comienza con un contexto limpio, pero recupera el estado del trabajo anterior únicamente a través de lo que el sistema de archivos haya conservado.

La **memoria** persiste las decisiones entre sesiones. [Vivek Trivedy][langchain-harness] lo recuerda claramente: un modelo no conoce nada más que sus pesos y lo que se encuentra en su contexto actual; sin un proceso dedicado, olvida tanto sus errores pasados como aquello en lo que trabajaba el día anterior, de ahí el uso de archivos como `AGENTS.md` o `CLAUDE.md`. [Osmani][osmani-harness] designa este tipo de archivo como el punto de configuración más rentable del harness, ya que aterriza en el system prompt en cada turno; recomienda mantenerlo corto (algunos equipos mantienen el suyo en menos de sesenta líneas) y tratarlo como la lista de verificación de un piloto, no como una guía de estilo. El sistema de archivos sigue siendo un buen punto de partida para la memoria, pero Osmani señala que no siempre es suficiente: para la documentación actualizada de una librería, una búsqueda web o un servidor MCP dedicado siguen siendo necesarios.

La **seguridad**, materializada por los permisos, delimita lo que el agente tiene derecho a hacer. [Avi Chawla][ddods-harness] la presenta como un deslizador: una arquitectura permisiva es rápida pero asume riesgos, una arquitectura restrictiva es más segura, pero ralentiza cada acción, y el ajuste correcto depende del contexto de despliegue. A menudo se acompaña de un aislamiento físico: [Vivek Trivedy][langchain-harness] recuerda que los sandboxes dan al agente un espacio seguro y permiten que varios agentes trabajen en paralelo sin que uno rompa lo que el otro construye. Esto es lo que distingue a un sistema autónomo de un sistema peligroso, y veremos que este componente merece un cuidado particular.

La **verificación y la evaluación**, por último, responden a una pregunta sencilla: ¿funciona y a qué coste? [Avi Chawla][ddods-harness] distingue una verificación computacional y determinista (tests, linters, verificadores de tipos) de una verificación inferencial confiada a un LLM-juez, más sensible a los problemas semánticos pero más lenta de obtener. Un principio transversal recurre en [Osmani][osmani-harness]: un modelo que juzga su propio trabajo tiende a calificarse generosamente, y confiar la revisión a un agente distinto del que produjo el resultado ofrece veredictos significativamente más fiables. [Lilian Weng][weng-harness] cierra el ciclo: en los harness más avanzados, esta verificación ya no sirve solo para controlar una tarea puntual, sino que alimenta un ciclo de automejora del modelo. Un modelo que progresa de esta manera evita, a su vez, que el harness se vuelva excesivamente complejo. Un harness que no se mide es un harness que no se pilota.

## En la práctica

Podría ser tentador recordar estos siete bloques como una lista de verificación. Sería perder lo esencial. Lo que queremos transmitir es una guía de análisis: ante cualquier harness, debes poder señalar cada bloque, decir si está presente, ausente o es mínimo, y comprender las consecuencias de esa elección.

Esta guía tiene dos usos. Primero la aplicaremos a Pi, para organizar la reconstrucción. Luego la aplicarás a tu propio harness, en el acto 4. No todos los bloques son obligatorios para todos los usos: un harness dedicado a la revisión de código no tiene las mismas necesidades que un harness de migración. Saber elegir los bloques útiles es parte de la competencia que buscamos desarrollar.

Toma un harness que conozcas, o uno que manipularemos juntos: Claude Code, Cursor, o cualquier otro. Para cada bloque de la guía, intenta señalarlo en la herramienta. ¿Dónde se gestiona el contexto? ¿Cuáles son las herramientas expuestas? ¿Hay una memoria, y dónde reside? Anota los bloques que parezcan ausentes o reducidos al mínimo: a menudo son los que más revelan las decisiones de diseño de la herramienta. Si ya has experimentado un fallo con esta herramienta (una acción que no debería haber realizado, un olvido recurrente), intenta vincular ese fallo a uno de los siete bloques: este es exactamente el ejercicio que repetiremos a lo largo del acto 2.

## Para ir más allá

Este módulo se basa en cuatro textos recientes que, cada uno a su manera, intentan definir qué es un harness y qué lo hace evolucionar. Los encontrarás citados a lo largo de los bloques anteriores.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering
