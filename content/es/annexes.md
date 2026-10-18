# Anexos y glosario

Esta página ofrece primero lecturas sobre las cuestiones jurídicas, sociales y ambientales que plantea el uso de los LLM en general y después, más concretamente, en el ámbito del desarrollo de software. Hemos decidido no tratarlas en este material, como explica la [introducción](./), pero cuentan para decidir si usas estas herramientas, y cómo. A continuación indica dónde encontrar los datos del acto 3 y termina con un glosario de los términos empleados en la formación, con su equivalente inglés y el módulo donde se explican.

## ¿Qué lecturas para formarse una opinión sobre los riesgos?

Esta formación muestra cómo usar un agente de código y en qué punto estamos en octubre de 2026. No dice si hay que hacerlo, porque esa elección te pertenece. Los textos de abajo toman posición, a menudo de forma tajante, y varios llaman a rechazar estas herramientas. Los hemos elegido porque sus autores argumentan a partir de hechos, de mediciones o de su experiencia como investigadores y mantenedores. Estamos en la bifurcación de los caminos y es difícil verlo con claridad. La promoción de los LLM y el ruido mediático ante las poblaciones no tiene precedentes. No es difícil encontrar artículos que promocionan los LLM. Por eso hemos tomado la decisión de mostrarte el otro lado y el impacto en la sociedad. Lee estos recursos antes de decidir el lugar que dejas a la IA en tu trabajo.

### ¿Hay que rechazar estas herramientas?

- Atécopol, [Face à l'IA générative, l'objection de conscience](https://atecopol.hypotheses.org/13082) (noviembre de 2025). Este manifiesto del Taller de ecología política de Toulouse se dirige a la enseñanza superior, a la investigación y a la educación nacional. Expone tres razones para rechazar el despliegue de la IA generativa en estas instituciones: su costo energético y material, los daños sociales de la cadena industrial que la produce y el poder que otorga a unas pocas empresas. Sus firmantes, más de tres mil, se comprometen a no usarla salvo por obligación. [Reporterre](https://reporterre.net/Nous-sommes-debordes-par-l-IA-chercheurs-ils-refusent-d-utiliser-l-intelligence) (junio de 2026) dio la palabra a algunos de ellos.
- Florence Maraninchi, [Pourquoi je n'utilise pas ChatGPT](https://academia.hypotheses.org/58766) (febrero de 2025). La autora es docente e investigadora en informática y trabaja sobre sistemas críticos (trenes, aviones, centrales). Explica por qué rechaza sistemas opacos, no deterministas y no testeables. También responde al argumento de las IA «éticas» o «soberanas»: incluso sobrias, participan según ella en la aceptación general de estas tecnologías y en el efecto rebote.
- Olivier Lefebvre, [« ChatGPT, c'est juste un outil ! » : les impensés de la vision instrumentale de la technique](https://www.terrestres.org/2025/06/28/chatgpt-cest-juste-un-outil/) (Terrestres, junio de 2025). El texto discute el argumento que retoma la cita de Linus Torvalds de la [introducción](./). Decir que la IA es una herramienta como cualquier otra hace olvidar las infraestructuras materiales y el trabajo humano que exige, y la forma en que transforma la sociedad y los usos de cada uno.
- Olivia Guest et al., [Against the Uncritical Adoption of 'AI' Technologies in Academia](https://zenodo.org/records/17065099) (septiembre de 2025). Dieciocho académicos piden a las universidades que resistan al marketing de la industria y protejan el pensamiento crítico, la pericia y la integridad científica. Recuerdan que rechazar estas herramientas en la propia docencia y en la propia investigación debe seguir siendo una posición legítima.
- François Levin, [L'IA comme technologie planétaire](https://lestempsquirestent.org/en/numeros/numero-9/l-ia-comme-technologie-planetaire) (Les temps qui restent, abril de 2026). El autor busca una vía entre dos respuestas: la que cree que una IA más sobria bastará y la que rechaza la IA en bloque. A través de la noción de «planetariedad», explora las bifurcaciones que estas tecnologías dejan todavía abiertas.

### ¿Cuál es el impacto ambiental?

Cada petición enviada a un modelo consume electricidad y agua, y la fabricación del material que la sirve también tiene un costo. Las cifras publicadas siguen siendo escasas y provienen sobre todo de las propias empresas.

- Danilo Carastan dos Santos, Denis Trystram et al., [¿Es sostenible la IA generativa? El verdadero coste ecológico de un prompt](https://theconversation.com/lia-generative-est-elle-soutenable-le-vrai-cout-ecologique-dun-prompt-269432) (The Conversation, noviembre de 2025). Los autores examinan la estimación publicada por Google para Gemini (0,24 Wh y cinco gotas de agua por prompt). Muestran que esa cifra baja se debe a decisiones de alcance: solo se cuentan los centros de datos de Google, el agua solo cubre la refrigeración, y el estudio, realizado en interno, no dice sobre qué consultas se basa.
- Alexandra Sasha Luccioni et al., [From Efficiency Gains to Rebound Effects: The Problem of Jevons' Paradox in AI's Polarized Environmental Debate](https://arxiv.org/abs/2501.16548) (FAccT 2025). Un modelo más eficiente puede hacer aumentar el consumo total, porque abarata el uso y por tanto lo hace más frecuente. Las autoras y autores piden mirar estos efectos indirectos, y no solo las emisiones de los centros de datos.
- Clément Morand et al., [When rebound effect is not a side effect: analyzing sociotechnical contexts of digital technologies](https://hal.science/hal-05566029) (prepublicación HAL, marzo de 2026). Los autores estudian dos casos, el despliegue del 5G en Francia y el entrenamiento de los modelos de aprendizaje profundo, partiendo de las intenciones declaradas por los actores que los impulsan. En ambos casos, esos actores anuncian abiertamente un objetivo de crecimiento de su actividad y se sirven de las ganancias de eficiencia energética para alcanzarlo, porque esas ganancias abren nuevos usos. La noción de efecto rebote, que presenta el aumento de consumo como una consecuencia involuntaria de la eficiencia, describe mal estas situaciones. Con esta grilla de lectura, optimizar un software o hacer codear un agente más rápido sirve ante todo para producir más, y la reducción del impacto ambiental no es el objetivo.
- The Shift Project, [Intelligence artificielle, données, calculs : quelles infrastructures dans un monde décarboné ?](https://theshiftproject.org/en/publications/al-data-and-computing-shaping-infrastructures-for-a-decarbonised-world/) (octubre de 2025). El informe estudia el consumo eléctrico de los centros de datos en Francia y en el mundo. Concluye que la optimización técnica no basta y que hay que elegir los usos.
- Agencia Internacional de la Energía, [Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai) (abril de 2026). La energía consumida por una consulta simple baja al menos un orden de magnitud por año, pero las tareas de razonamiento y las tareas agénticas, como las de un agente de código, consumen de cientos a miles de veces más por consulta. El consumo eléctrico de los centros de datos aumentó un 17 % en 2025, y el de los centros dedicados a la IA un 50 %. La Agencia prevé una duplicación entre 2025 y 2030, de 485 a 950 TWh, y pide a las empresas que publiquen sus consumos de forma sistemática.
- Emma Bougerol, [L'IA générative a le potentiel de détruire la planète (mais pas comme vous le pensez)](https://basta.media/l-ia-generative-a-le-potentiel-de-detruire-la-planete-mais-pas-comme-vous-le) (Basta!, febrero de 2025). Escrito en el momento de la cumbre sobre la IA de París, el artículo relaciona las inversiones anunciadas en los centros de datos con su consumo de electricidad y reúne las estimaciones disponibles.
- Anaëlle Beignon et al., [Imposing AI: Deceptive design patterns against sustainability](https://arxiv.org/abs/2508.08672) (2025). Los autores documentan cómo los editores de software imponen la IA, poniendo sus funciones en el lugar de funciones existentes y difundiendo relatos que hacen más difícil negarse a usarla. Clasifican estas prácticas entre los *deceptive patterns* y subrayan su coste ambiental.

Para estimar el impacto de tus propios usos, la biblioteca [EcoLogits](https://github.com/genai-impact/ecologits) calcula la energía y las emisiones de una petición a partir del tamaño del modelo y del número de tokens producidos. El comparador [compar:IA](https://comparia.beta.gouv.fr/) de beta.gouv.fr muestra esta estimación junto a cada respuesta. Las palancas vistas en la formación, como un `AGENTS.md` corto, salidas de herramientas filtradas o un modelo más pequeño para las tareas bien acotadas, reducen el número de tokens procesados.

### ¿Qué pasa con el software libre y la seguridad?

- Daniel Stenberg, [The end of the curl bug-bounty](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/) (enero de 2026). El mantenedor de curl explica por qué el proyecto detuvo su programa de recompensas por fallos de seguridad. Antes de 2025, más del 15 % de los avisos recibidos eran fallos reales. En 2025, con la llegada de informes generados por IA, era menos del 5 %, y cada informe falso requería tiempo para ser refutado.
- Software Freedom Conservancy, [Recommendations When Using LLM-backed Generative AI Systems for FOSS Contributions](https://sfconservancy.org/llm-gen-ai/llm-backed-generative-ai-recommendations.html). La asociación apoya a los proyectos que rechazan cualquier contribución escrita con un LLM. Pide que nadie esté obligado a usar estas herramientas, y que quienes las usen relean y comprendan su contribución antes de enviarla.
- La documentación del núcleo Linux, [AI Coding Assistants](https://docs.kernel.org/process/coding-assistants.html). Un agente nunca añade ahí un `Signed-off-by`: la persona que envía el parche relee el código, verifica la licencia y asume la responsabilidad. Una etiqueta `Assisted-by` indica la herramienta utilizada.
- Joseph Spracklen et al., [We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://arxiv.org/abs/2406.10279) (USENIX Security 2025). Sobre 576 000 extractos de código generados por dieciséis modelos, al menos el 5,2 % de los paquetes citados por los modelos comerciales y el 21,7 % de los citados por los modelos abiertos no existen. Un atacante puede publicar un paquete malicioso bajo uno de esos nombres.

### ¿Qué dicen el derecho y las reglas de uso?

- Comisión Europea, [Living guidelines on the responsible use of generative AI in research](https://research-and-innovation.ec.europa.eu/document/download/2b6cf7e5-36ac-41cb-aab5-0d32050143dc_en?filename=ec_rtd_ai-guidelines.pdf). Estas recomendaciones, redactadas en el marco del Espacio Europeo de Investigación, se dirigen a los investigadores, a las instituciones y a los financiadores. El investigador sigue siendo responsable de lo que produce con estas herramientas. Declara su uso y evita emplearlas para actividades sensibles como la evaluación por pares.
- U.S. Copyright Office, [Copyright and Artificial Intelligence, Part 2: Copyrightability](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf) (enero de 2025). Un contenido producido únicamente a partir de un prompt no está protegido por el derecho de autor. Lo que sí lo está es la aportación humana: el código que escribes, o la forma en que eliges, organizas y modificas lo que produce el modelo. El informe solo se refiere al derecho estadounidense.

### ¿Qué cambia la IA en el trabajo y en el aprendizaje?

- METR, [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089) (julio de 2025). En este ensayo aleatorizado, dieciséis desarrolladores experimentados trabajaron en tickets reales de proyectos de código abierto a los que contribuyen, con y sin IA. Pensaban que irían más rápido con la IA y tardaron un 19 % más. El estudio abarca un caso concreto: proyectos que estas personas conocen muy bien, con las herramientas de principios de 2025.
- Judy Hanwen Shen y Alex Tamkin (Anthropic), [How AI assistance impacts the formation of coding skills](https://www.anthropic.com/research/AI-assistance-coding-skills) (enero de 2026, [artículo](https://arxiv.org/abs/2601.20245)). Cincuenta y dos desarrolladores aprenden una biblioteca de Python desconocida, con o sin asistente. El grupo con asistente obtiene un 17 % menos en el cuestionario posterior, sobre todo en la depuración. Delegar todo el código hace aprender menos que plantear preguntas para comprender.
- Nataliya Kosmyna et al. (MIT Media Lab), [Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task](https://arxiv.org/abs/2506.08872) (prepublicación, junio de 2025). Cincuenta y cuatro participantes redactan ensayos a lo largo de tres sesiones, con un LLM, con un motor de búsqueda o sin herramienta, mientras un electroencefalograma registra su actividad cerebral. El grupo que usa el LLM muestra la conectividad cerebral más baja, se siente menos autor de sus textos y le cuesta citar fragmentos de ellos. En una cuarta sesión, en la que participaron dieciocho personas, quienes pasan del LLM a la escritura sin herramienta conservan una conectividad reducida. Los autores llaman «deuda cognitiva» a este coste que se acumula a lo largo de las sesiones. El estudio abarca la redacción de ensayos y no el código, y su muestra es pequeña.
- Ganesh Pagade, [Cognitive Debt: When Velocity Exceeds Comprehension](https://www.rockoder.com/beyondthecode/cognitive-debt-when-velocity-exceeds-comprehension/) (febrero de 2026). El autor aplica la noción de deuda cognitiva al desarrollo de software: con la IA, un equipo produce código más rápido de lo que puede comprenderlo, y esa diferencia no aparece en ninguna de las métricas que sigue (funcionalidades entregadas, commits, [métricas DORA](https://dora.dev/guides/dora-metrics-four-keys/)). Los revisores aprueban código que no comprenden del todo, y la deuda se revela meses después, cuando un incidente tarda horas en resolverse porque ya nadie sabe explicar el sistema. El artículo se basa en la experiencia del autor y no cita ningún dato.
- Siddhant Khare, [AI fatigue is real and nobody talks about it](https://siddhantkhare.com/writing/ai-fatigue-is-real) (febrero de 2026). El autor, mantenedor de [OpenFGA](https://openfga.dev/), relata el agotamiento profesional que atravesó a finales de 2025 mientras trabajaba cada día con agentes. Una tarea de tres horas le llevaba cuarenta y cinco minutos, pero la carga y las expectativas aumentaron en la misma medida, y sus jornadas se llenaron de relecturas y de decisiones que tomar sobre código que no había escrito, lo que lo agotaba más que escribir. Describe también la carrera por las nuevas herramientas, los prompts reformulados sin fin y la dificultad de razonar sin asistente durante una revisión de diseño. Este testimonio, que no se apoya en ninguna medición, reunió más de trescientos comentarios en [Hacker News](https://news.ycombinator.com/item?id=46934404).

Los estudios de METR y de Anthropic coinciden con lo que la formación repite: releer el diff, lanzar los tests tú mismo y entender lo que el agente escribió siguen siendo tu trabajo.

## ¿Dónde encontrar los datos del acto 3?

Los resultados presentados en los módulos [3.1](./act3-contexte) y [3.2](./act3-skill) están archivados en Zenodo: [Measuring context and skills of a coding agent on a brick-breaker bug: raw data of the hands-on-harness act 3 evaluation](https://doi.org/10.5281/zenodo.23452689) (octubre de 2026, licencia CC BY-SA 4.0). El archivo contiene la experiencia trysquare, las 1 140 ejecuciones de las dos campañas con sus sesiones y sus diffs, y los scripts que calculan las cifras de los gráficos del curso.

## Glosario

Los términos están ordenados alfabéticamente. El equivalente inglés se da entre paréntesis cuando difiere.

**`AGENTS.md`** : archivo de reglas colocado en la raíz de un repositorio, que el harness carga en el contexto en cada turno. Claude Code usa `CLAUDE.md`. Ver [2.1](./act2-contexte).

**Agente** : un LLM que puede llamar herramientas, leer el resultado y volver a empezar hasta terminar su tarea. Ver [Por qué un harness](./act1-harness).

**Llamada a herramienta** (*tool calling*) : petición estructurada que el modelo produce para lanzar una acción. El modelo no ejecuta nada por sí mismo, es el harness quien ejecuta la herramienta y le devuelve el resultado. Ver [Los LLM en 2026](./act1-llm).

**Entorno aislado** (*sandbox*) : entorno aislado en el que el agente trabaja, con límites que el modelo no puede franquear (archivos visibles, red, claves). Ver [2.0](./act2-sandbox).

**Bucle agéntico** (*agent loop*) : encadenamiento repetido de una llamada al modelo, de la ejecución de las herramientas solicitadas y de la relectura de su resultado. Ver [El harness de partida: Pi](./act1-pi).

**Caché** (*prompt caching*) : mecanismo del proveedor que factura mucho más barata la parte del contexto que no ha cambiado desde la llamada anterior. Solo funciona sobre un prefijo idéntico. Ver [2.1](./act2-contexte).

**`codemode`** : herramienta de Pi que permite al modelo escribir un script que llama a las demás herramientas, para que solo el resultado filtrado vuelva al contexto. Ver [2.1](./act2-contexte).

**combo** : extensión de Pi escrita para la formación, que lanza subagentes y despliega flows. Ver [2.4](./act2-delegation) y [2.5](./act2-workflows).

**Compactación** : resumen de los mensajes más antiguos, activado cuando el contexto se acerca al tamaño de la ventana. Ver [2.1](./act2-contexte).

**Context engineering** : elección de lo que entra en la ventana de contexto y en qué orden, más allá de la sola formulación del prompt. Ver [Por qué un harness](./act1-harness).

**Petición descuidada** : prompt mínimo, el que se escribe el primer día, usado como punto de comparación en los ejercicios sobre la issue #1. Ver [2.1](./act2-contexte).

**Diferencia establecida** : en trysquare, diferencia entre dos configuraciones cuyo intervalo al 95 % no contiene cero, marcada `*`. Una diferencia cuyo intervalo contiene cero no es concluyente y se marca `o`. Ver [3.0](./act3-trysquare).

**Esfuerzo de razonamiento** (*thinking level*) : ajuste que deja al modelo producir más o menos tokens de reflexión antes de responder. Ver [Los LLM en 2026](./act1-llm) y [2.1](./act2-contexte).

**Enjambre** (*swarm*) : varios agentes sobre una misma tarea, que intercambian por una tabla común y deciden ellos mismos qué hacen con el mensaje de otro, en lugar de seguir un encadenamiento escrito de antemano. Ver [2.6](./act2-swarm).

**Patrón**: tag congelado del repositorio NÉON (por ejemplo `etalon-v1`) que cada ejecución clona, para que todas partan del mismo código. Ver [3.0](./act3-trysquare).

**Evaluación**: comparación de configuraciones sobre una misma tarea, repitiendo cada configuración porque el resultado varía de una ejecución a otra. Un **test**, en cambio, responde sí o no. Ver [3.0](./act3-trysquare).

**Extensión**: código TypeScript cargado por Pi, que añade herramientas, comandos o hooks. Ver [El harness de partida: Pi](./act1-pi) y [2.3](./act2-hooks).

**Fan-out**: patrón de workflow donde varios agentes trabajan en paralelo sobre la misma entrada. Ver [2.5](./act2-workflows).

**Ventana de contexto** (*context window*): número máximo de tokens que el modelo puede tener en cuenta a la vez. El **contexto** es lo que la llena: system prompt, archivos de reglas, descripciones de herramientas, tu pregunta y el historial. Ver [2.1](./act2-contexte).

**Flow**: en combo, grafo de tareas descrito en YAML y en markdown, cuyos nodos son subagentes o scripts y cuyo encadenamiento lo decide el código. Ver [2.5](./act2-workflows).

**Guía y sensor** (*guide and sensor*): vocabulario de Birgitta Böckeler. Una guía actúa antes del agente para orientarlo, un sensor actúa después para ayudarlo a corregirse. Ver [2.3](./act2-hooks).

**Harness** (*harness*): todo lo que rodea al modelo para convertirlo en un agente útil y seguro: bucle, herramientas, gestión del contexto, permisos, verificación. Ver [Por qué un harness](./act1-harness).

**Hook**: función ejecutada por el harness en un momento preciso del bucle, por ejemplo antes de cada llamada a herramienta o cuando el agente está a punto de devolver el control. Su efecto no depende del modelo. Ver [2.3](./act2-hooks).

**Inyección de prompt** (*prompt injection*): texto leído por el agente, en un archivo o una página web, que se hace pasar por una instrucción. El `SUPPORT.md` de NÉON es un ejemplo. Ver [2.0](./act2-sandbox).

**Juez** (*LLM-as-a-judge*): modelo encargado de puntuar una ejecución cuando ningún test sabe hacerlo. Su veredicto es probabilístico. Ver [3.0](./act3-trysquare).

**LLM** (*Large Language Model*): modelo de lenguaje entrenado para predecir el token siguiente a partir de lo que precede. Ver [Los LLM en 2026](./act1-llm).

**MCP** (*Model Context Protocol*): protocolo abierto que normaliza la forma en que un modelo accede a herramientas externas. Ver [Historia](./historique).

**Mezcla de expertos** (*Mixture of Experts*, MoE): arquitectura que solo activa una parte de la red en cada token. Hay que distinguir entonces los **parámetros totales** y los **parámetros activos**. Ver [Los LLM en 2026](./act1-llm).

**Panoplia**: lista de las herramientas de las que dispone un agente, declarada en el campo `tools:` de su archivo. Una herramienta ausente de la panoplia no puede ser llamada. Ver [2.4](./act2-delegation).

**Prompt système** (*system prompt*) : texto colocado al inicio del contexto que describe al modelo su rol, sus herramientas y sus convenciones. Ver [2.1](./act2-contexte).

**RAG** (*Retrieval-Augmented Generation*) : técnica que proporciona al modelo documentos pertinentes antes de que responda. Ver [Histórico](./historique).

**Reintento** : turno relanzado por la herramienta de medición porque el proveedor devolvió un error. Los reintentos inflan los costes medidos. Ver [3.1](./act3-contexte).

**Escenario** : archivo TOML que describe un experimento trysquare: la tarea, las configuraciones a comparar, el número de repeticiones y la forma de puntuar. Ver [3.0](./act3-trysquare).

**Centinela** : valor ficticio de la clave de API visible en el sandbox. El proxy del host la sustituye por la clave real en el momento en que sale la petición. Ver [2.0](./act2-sandbox).

**Skill** (habilidad) : archivo `SKILL.md`, con eventuales scripts y archivos de referencia, que el agente carga cuando la tarea lo pide. Ver [2.2](./act2-skill).

**Sonda** : archivo de tests de referencia que trysquare usa para verificar que una ejecución corrige realmente el bug. Ver [3.1](./act3-contexte).

**Subagente** (*subagent*) : sesión lanzada por el agente principal con su propio contexto, sus herramientas y su modelo. Solo su conclusión vuelve al contexto principal. Ver [2.4](./act2-delegation).

**Tablero** (*board*) : en combo, registro compartido por los miembros de un enjambre, donde solo se pueden añadir mensajes y donde el autor de cada uno queda inscrito por el propio tablero. Ver [2.6](./act2-swarm).

**Token** : fragmento de texto, unidad básica que el modelo lee y produce. Los proveedores facturan por millón de tokens. Ver [Los LLM en 2026](./act1-llm).

**trysquare** : herramienta Python escrita para la formación, que repite las configuraciones de un escenario y dice si la diferencia entre dos configuraciones está establecida. Ver [3.0](./act3-trysquare).

**Fábrica de software** (*software factory*) : sistema que recibe una solicitud y devuelve una pull request haciendo trabajar varios agentes en paralelo. Ver [Ahora te toca](./a-vous-de-jouer).

**Validación** : en trysquare, ejecutable que puntúa una ejecución y devuelve métricas con sus razones. Ver [3.0](./act3-trysquare).

**Workflow** (flujo de trabajo) : encadenamiento de pasos decidido por código, a diferencia de un agente que decide por sí mismo lo que sigue. Ver [2.5](./act2-workflows).
