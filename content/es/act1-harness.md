# ¿Por qué un harness y de qué está hecho?

::: tip Objetivos de este módulo
- Reconstituir la cadena que va del prompt al harness, y decir qué carencia cubre cada etapa
- Definir con precisión qué es un harness, y comprender por qué te es propio y no deja de moverse
- Saber enumerar las piezas indispensables de un harness y, para cada una, a qué problema responde
:::

La introducción presentó una línea de tiempo de las técnicas aparecidas desde finales de 2022. La retomamos aquí desde otro ángulo, ya no para contar una historia, sino para comprender una mecánica. Cada etapa de esta línea de tiempo responde a una carencia de la etapa anterior y, sobre todo, cada una se apila sobre las demás en lugar de reemplazarlas. Un harness no vuelve obsoleto el *prompt engineering*; siempre lo necesita, pero lo organiza.

Al principio está el prompt. Uno se da cuenta rápido de que la forma de formular una petición cambia radicalmente la respuesta, y el *prompt engineering* consiste en formular mejor. Pero un modelo bien interrogado sigue ignorando tu base de código y tu documentación interna. El RAG cubre esa carencia: va a buscar los documentos pertinentes y se los proporciona al modelo antes de que responda, al precio de un montaje que puede ser tedioso.

El modelo entonces sabe responder mejor, pero sigue limitándose a responder. No puede actuar. El agente cubre esa carencia dándole herramientas: ejecutar código, leer un archivo, llamar a una API. Como cada herramienta debe ser descrita y conectada, la multiplicación de integraciones se vuelve rápidamente ingobernable, y el MCP normaliza la forma en que un modelo dialoga con herramientas externas. Las herramientas a veces pueden ser buenos reemplazos del RAG.

En este punto, se dispone de un modelo capaz de ir a buscar información y de actuar. Queda por decidir qué se pone en su ventana de contexto y en qué orden. Es el *context engineering*, prolongación del *prompt engineering*: ya no se trata solo de plantear bien la pregunta, sino de optimizar todo el contexto proporcionado al modelo.

## El harness, una infraestructura de software

El harness es el eslabón que ensambla todos los anteriores en un sistema coherente. [Vivek Trivedy][langchain-harness] lo define así: un harness es código, configuración o una lógica de ejecución, nada más misterioso que eso, pero tampoco nada menos. [Lilian Weng][weng-harness] va un poco más lejos: es el sistema que rodea al modelo y que decide cómo piensa y planifica, cómo llama a las herramientas y actúa, cómo percibe y gestiona su contexto, dónde guarda lo que produce y cómo evalúa sus resultados. Se cuida de distinguirlo de la fórmula más antigua «agente = LLM + memoria + herramientas + planificación + acción»: el harness añade el diseño explícito de los bucles de trabajo, la evaluación, el control de permisos y la persistencia del estado en el tiempo.

[Avi Chawla][ddods-harness] ordena estos tres niveles en círculos concéntricos. El *prompt engineering* moldea las instrucciones dadas al modelo. El *context engineering* decide qué ve el modelo, y cuándo. El *harness engineering* contiene los dos, y añade a ello toda la infraestructura de la aplicación: orquestación de herramientas, persistencia de estado, recuperación ante errores, bucles de verificación, control de permisos, ciclo de vida completo de una tarea. Un harness que se redujera a un system prompt bien escrito no lo es; es su parte más visible, rara vez la más determinante.

Esta infraestructura no tiene nada de abstracto: es software que se puede abrir, leer y modificar, hecho de un archivo de configuración que declara los modelos disponibles y los permisos otorgados, de un archivo `AGENTS.md` o `CLAUDE.md` que porta las reglas del proyecto, de scripts que implementan hooks y de un directorio de skills, todo ello impulsado por un proceso que se ejecuta de verdad: el propio bucle agéntico, el que encadena la llamada al modelo, la ejecución de la herramienta y la relectura del resultado. Es esta materialidad la que explica que un harness se construya, se depure y se repare como cualquier software: a base de archivos modificados, de pruebas y de commits. Veremos una instancia concreta de ello ya en el siguiente módulo, con el directorio `.pi/` de Pi.

## Un harness propio de cada uno, y que no deja de moverse

La manera en que debes recibir todo lo que sigue depende de dos ideas: tu harness te pertenece, y no deja de moverse.

La primera es que tu harness nunca se parecerá del todo al de tu vecino. [Addy Osmani][osmani-harness] lo formula así: la ingeniería del harness es una disciplina y no un framework que se instalaría tal cual, porque el buen harness para tu código está moldeado por tu historial de fracasos, que no se descarga como un paquete. Puedes inspirarte en el harness de otro, jamás copiarlo tal cual esperando que cubra los mismos puntos ciegos, puesto que ha sido moldeado por incidentes que no son los tuyos.

La segunda es que el harness se mueve, por dos razones de naturaleza distinta.

La primera se debe al propio modelo. [Avi Chawla][ddods-harness] lo llama el grosor del harness (*harness thickness*): ¿cuánta lógica debe vivir en el harness en lugar de en el modelo? Anthropic, escribe el artículo, apuesta por un harness fino y por el progreso del modelo, hasta el punto de suprimir regularmente pasos de planificación de Claude Code a medida que las nuevas versiones del modelo los internalizan, mientras que otros frameworks, construidos en torno a grafos explícitos, apuestan por el contrario por un control que permanece escrito en duro. Una pieza que tiene sentido hoy puede convertirse así en un peso muerto en seis meses, por la única razón de que el modelo ha evolucionado.

La segunda razón tiene que ver con tu uso. [Osmani][osmani-harness] la resume en lo que presenta como el hábito más importante del oficio: tratar cada fallo del agente como una señal permanente y no como un accidente que excusar. Advierte contra la respuesta más tentadora: añadir la lección aprendida como una frase más en un archivo `AGENTS.md` ya largo. Ahora bien, un archivo de reglas que crece sin ser retrabajado jamás pierde en legibilidad lo que cree ganar en cobertura. Su fórmula para recordar: un harness es un sistema vivo y no un archivo de configuración que se escribe una vez para siempre. El patrón que propone en su lugar se resume en una pregunta: ¿qué comportamiento queremos obtener o corregir, y qué pieza concreta del harness puede lograrlo? Ese es el patrón que seguiremos a lo largo de toda la reconstrucción.

Considera este módulo como un inventario de partida y no como una arquitectura fija. Algunos de los bloques que siguen los dejarás en su forma mínima; otros, los engrosarás a lo largo de tus propios fallos.

## Los siete bloques

La pregunta de partida es la siguiente. Tenemos un modelo capaz de predecir texto y de llamar a herramientas. ¿Con qué hay que rodearlo para que trabaje de forma fiable, segura y útil en tareas reales? Cada bloque que sigue responde a un límite concreto del modelo desnudo; es esa correspondencia la que hay que tener presente, más que la lista en sí. Es la rejilla que organiza todo el resto de la formación: cada módulo del acto 2 reconstruye uno de estos bloques.

La **gestión del contexto** viene primero. La ventana es finita, y hemos visto que el modelo explota mal un contexto demasiado largo o mal ordenado. [Avi Chawla][ddods-harness] enumera cinco estrategias prácticas para mantenerla bajo control: purga periódica, resumen de la conversación, enmascaramiento de las observaciones que han quedado obsoletas, toma de notas estructurada y delegación a un subagente. Un estudio que cita (ACON) consigue hasta un 54 % menos de tokens, con una exactitud que se mantiene por encima del 95 %, al preferir las trazas de razonamiento a las salidas brutas de las herramientas. El principio que se desprende: seleccionar lo que se pone en la ventana, ordenarlo para aprovechar la caché y compactar lo que infla innecesariamente.

Las **herramientas** vienen después, porque un modelo que solo produce texto no puede actuar. [Vivek Trivedy][langchain-harness] lo resume con una imagen: el bash y la ejecución de código le dan al agente «un ordenador a mano», hasta el punto de que puede usarlo para construir sus propias herramientas sobre la marcha. Pero un catálogo demasiado amplio perjudica tanto como ayuda: [Avi Chawla][ddods-harness] informa que Vercel retiró el 80 % de las herramientas de su agente v0 y obtuvo mejores resultados, y que Claude Code reduce su contexto en un 95 % al cargar las herramientas solo bajo demanda. El principio: cada capacidad debe exponerse como una herramienta descrita para el modelo y protegida por un permiso, y exponer únicamente lo estrictamente necesario para la etapa en curso.

La **delegación** responde a un problema más sutil, que [Vivek Trivedy][langchain-harness] formula así: para mantener un contexto limpio, hay que desplegar subagentes en tareas muy concretas y reinyectar en el hilo principal solo una síntesis de su trabajo, en lugar de todo el razonamiento que ha permitido llegar a ella. El trabajo de una subtarea suele ser, de hecho, mucho más voluminoso que su conclusión; si todo ese trabajo se acumula en el contexto principal, este se degrada.

La **orquestación** organiza a varios agentes entre sí. [Avi Chawla][ddods-harness] plantea dos disyuntivas recurrentes. Primero, agente único o multiagente: tanto Anthropic como OpenAI recomiendan llevar a un solo agente al máximo antes de añadir un segundo, y no separar hasta superar una decena de herramientas que se solapan, o dominios de tarea claramente distintos. Después, una vez que hay varios agentes en juego, ¿hay que hacerlos razonar y actuar en cada paso (el patrón ReAct), o separar la planificación de la ejecución? La orquestación lleva también la ambición más difícil de sostener, la que [Vivek Trivedy][langchain-harness] presenta como el objetivo último: hacer trabajar a un agente en un horizonte largo. [Osmani][osmani-harness] describe una realización concreta y sorprendentemente simple: un mecanismo intercepta el intento del agente de concluir, luego relanza una nueva sesión sobre el mismo objetivo; cada iteración parte de un contexto limpio, pero recupera el estado del trabajo anterior únicamente a través de lo que el sistema de archivos ha conservado de él.

La **memoria** persiste las decisiones entre sesiones. [Vivek Trivedy][langchain-harness] lo recuerda sin rodeos: un modelo no conoce nada más que sus pesos y lo que se encuentra en su contexto del momento; sin un proceso dedicado, olvida tanto sus errores pasados como aquello en lo que trabajaba el día anterior, de ahí el uso de archivos como `AGENTS.md` o `CLAUDE.md`. [Osmani][osmani-harness] designa este tipo de archivo como el punto de configuración más rentable del harness, ya que termina en el system prompt en cada turno; recomienda mantenerlo corto (algunos equipos mantienen el suyo por debajo de sesenta líneas) y tratarlo como la checklist de un piloto, no como una guía de estilo. El sistema de archivos sigue siendo un buen punto de partida para la memoria, pero Osmani señala que no siempre basta: para la documentación actualizada de una biblioteca, una búsqueda web o un servidor MCP dedicado siguen siendo necesarios.

La **seguridad**, materializada por los permisos, limita lo que el agente tiene derecho a hacer. [Avi Chawla][ddods-harness] la presenta como un control deslizante: una arquitectura permisiva es rápida pero asume riesgos, una arquitectura restrictiva es más segura, pero ralentiza cada acción, y el ajuste correcto depende del contexto de despliegue. Suele ir acompañada de un aislamiento físico: [Vivek Trivedy][langchain-harness] recuerda que los sandboxes dan al agente un espacio seguro y permiten que varios agentes trabajen en paralelo sin que uno rompa lo que otro construye. Esto es lo que distingue un sistema autónomo de un sistema peligroso, y veremos que esta pieza merece un cuidado especial.

La **verificación y la evaluación**, por último, responden a una pregunta sencilla: ¿funciona, y a qué costo? [Avi Chawla][ddods-harness] distingue una verificación computacional y determinista (tests, linters, verificadores de tipos) de una verificación inferencial confiada a un LLM-juez, más sensible a los problemas semánticos pero más lenta de obtener. Un principio transversal reaparece en [Osmani][osmani-harness]: un modelo que juzga su propio trabajo tiende a calificarse con generosidad, y confiar la revisión a un agente distinto del que produjo el resultado da veredictos claramente más fiables. [Lilian Weng][weng-harness] cierra el bucle: en los harness más avanzados, esta verificación ya no sirve solo para controlar una tarea puntual, sino que alimenta un bucle de auto-mejora del modelo. Un modelo que progresa así evita, a su vez, que el harness se sobre-complique. Medir el harness, sus resultados y sus costos, es la condición para dirigirlo.

## En la práctica

Estas siete piezas forman un marco de lectura más que una lista de verificación: ante cualquier harness, debes poder señalar cada pieza, decir si está presente, ausente o es mínima, y entender las consecuencias de esa elección.

Esta cuadrícula tiene dos usos. Primero la aplicaremos a Pi, para organizar la reconstrucción. Después la aplicarás a tu propio harness, en el acto 4. No todos los bloques son obligatorios para todos los usos: un harness dedicado a la revisión de código no tiene las mismas necesidades que un harness de migración. Saber elegir los bloques útiles forma parte de la competencia que buscamos construir.

Toma un harness que conozcas, o que manejaremos juntos: Claude Code, Cursor, u otro. Para cada bloque de la cuadrícula, intenta señalarlo en la herramienta. ¿Dónde se gestiona el contexto? ¿Qué herramientas están expuestas? ¿Hay una memoria, y dónde reside? Anota los bloques que parecen ausentes o reducidos al mínimo: suelen ser los más reveladores de las decisiones de diseño de la herramienta. Si ya has encontrado un fallo con esta herramienta (una acción que no debería haber emprendido, un olvido repetido), intenta vincular ese fallo con uno de los siete bloques: es exactamente el ejercicio que repetiremos a lo largo del acto 2.

## Para profundizar

Este módulo se apoya en cuatro textos recientes que, cada uno a su manera, intentan definir qué es un harness y qué lo hace avanzar. Los veremos citados a lo largo de los bloques anteriores.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering
