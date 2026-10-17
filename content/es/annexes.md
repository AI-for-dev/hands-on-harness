# Anexos y glosario

Esta página ofrece primero lecturas sobre las cuestiones jurídicas, sociales y ambientales que plantea el uso de los LLM en general y después, más en particular, en el ámbito del desarrollo de software. Hemos elegido no tratarlas en este material, como explica la [introducción](./), pero cuentan para decidir si usas estas herramientas y cómo. Termina con un glosario de los términos empleados en la formación, con su equivalente en inglés y el módulo donde se explican.

## ¿Qué lecturas para formarse una opinión sobre los riesgos?

Esta formación muestra cómo usar un agente de código y en qué punto estamos en octubre de 2026. No dice si hay que hacerlo, porque esa decisión te corresponde. Los textos de abajo toman posición, a menudo de forma tajante, y varios llaman a rechazar estas herramientas. Los hemos elegido porque sus autores argumentan a partir de hechos, de mediciones o de su experiencia como investigadores y mantenedores. Estamos en la bifurcación de los caminos y es difícil verlo con claridad. La promoción de los LLM y el ruido mediático ante la población no tienen precedentes. No es difícil encontrar artículos que promocionan los LLM. Por eso hemos tomado la decisión de mostrarte el otro lado y el impacto sobre la sociedad. Lee estos recursos antes de decidir qué lugar le dejas a la IA en tu trabajo.

### ¿Hay que rechazar estas herramientas?

- Atécopol, [Face à l'IA générative, l'objection de conscience](https://atecopol.hypotheses.org/13082) (noviembre de 2025). Este manifiesto del Atelier d'écologie politique de Toulouse se dirige a la enseñanza superior, a la investigación y a la educación nacional. Plantea tres razones para rechazar el despliegue de la IA generativa en estas instituciones: su coste energético y material, los daños sociales de la cadena industrial que la produce y el poder que otorga a unas pocas empresas. Sus firmantes, más de tres mil, se comprometen a no utilizarla salvo obligación. [Reporterre](https://reporterre.net/Nous-sommes-debordes-par-l-IA-chercheurs-ils-refusent-d-utiliser-l-intelligence) (junio de 2026) dio voz a algunos de ellos.
- Florence Maraninchi, [Pourquoi je n'utilise pas ChatGPT](https://academia.hypotheses.org/58766) (febrero de 2025). La autora es docente e investigadora en informática y trabaja en sistemas críticos (trenes, aviones, centrales). Explica por qué rechaza sistemas opacos, no deterministas y no testables. También responde al argumento de las IA «éticas» o «soberanas»: incluso sobrias, participan según ella en la aceptación general de estas tecnologías y en el efecto rebote.
- Olivier Lefebvre, [« ChatGPT, c'est juste un outil ! » : les impensés de la vision instrumentale de la technique](https://www.terrestres.org/2025/06/28/chatgpt-cest-juste-un-outil/) (Terrestres, junio de 2025). El texto discute el argumento que retoma la cita de Linus Torvalds de la [introducción](./). Decir que la IA es una herramienta como cualquier otra hace olvidar las infraestructuras materiales y el trabajo humano que exige, y la forma en que transforma la sociedad y los usos de cada persona.
- Olivia Guest et al., [Against the Uncritical Adoption of 'AI' Technologies in Academia](https://zenodo.org/records/17065099) (septiembre de 2025). Dieciocho universitarios piden a las universidades que resistan al marketing de la industria y protejan el pensamiento crítico, la experiencia y la integridad científica. Recuerdan que rechazar estas herramientas en la docencia y la investigación debe seguir siendo una posición legítima.
- François Levin, [L'IA comme technologie planétaire](https://lestempsquirestent.org/en/numeros/numero-9/l-ia-comme-technologie-planetaire) (Les temps qui restent, abril de 2026). El autor busca una vía entre dos respuestas: la que cree que una IA más sobria bastará, y la que rechaza la IA en bloque. A través de la noción de «planetaridad», explora las bifurcaciones que estas tecnologías dejan todavía abiertas.

### ¿Cuál es el impacto ambiental?

Cada consulta enviada a un modelo consume electricidad y agua, y la fabricación del material que la atiende también tiene un coste. Las cifras publicadas siguen siendo escasas y provienen sobre todo de las propias empresas.

- Danilo Carastan dos Santos, Denis Trystram et al., [¿Es sostenible la IA generativa? El verdadero coste ecológico de un prompt](https://theconversation.com/lia-generative-est-elle-soutenable-le-vrai-cout-ecologique-dun-prompt-269432) (The Conversation, noviembre de 2025). Los autores examinan la estimación publicada por Google para Gemini (0,24 Wh y cinco gotas de agua por prompt). Muestran que esta cifra tan baja se debe a decisiones de alcance: solo se cuentan los centros de datos de Google, el agua solo cubre la refrigeración, y el estudio, realizado internamente, no dice en qué consultas se basa.
- Alexandra Sasha Luccioni et al., [From Efficiency Gains to Rebound Effects: The Problem of Jevons' Paradox in AI's Polarized Environmental Debate](https://arxiv.org/abs/2501.16548) (FAccT 2025). Un modelo más eficiente puede hacer aumentar el consumo total, porque abarata el uso y por tanto lo hace más frecuente. Las autoras y autores piden mirar estos efectos indirectos, y no solo las emisiones de los centros de datos.
- The Shift Project, [Inteligencia artificial, datos, cálculos: ¿qué infraestructuras en un mundo descarbonizado?](https://theshiftproject.org/en/publications/al-data-and-computing-shaping-infrastructures-for-a-decarbonised-world/) (octubre de 2025). El informe estudia el consumo eléctrico de los centros de datos en Francia y en el mundo. Concluye que la optimización técnica no basta y que hay que elegir los usos.
- Agencia Internacional de la Energía, [Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai) (abril de 2026). La energía consumida por una solicitud simple baja al menos un orden de magnitud por año, pero las tareas de razonamiento y las tareas agénticas, como las de un agente de código, consumen de cientos a miles de veces más por solicitud. El consumo eléctrico de los centros de datos aumentó un 17 % en 2025, y el de los centros dedicados a la IA un 50 %. La Agencia prevé una duplicación entre 2025 y 2030, de 485 a 950 TWh, y pide a las empresas que publiquen sus consumos de forma sistemática.
- Emma Bougerol, [La IA generativa tiene el potencial de destruir el planeta (pero no como crees)](https://basta.media/l-ia-generative-a-le-potentiel-de-detruire-la-planete-mais-pas-comme-vous-le) (Basta!, febrero de 2025). Escrito en el momento de la cumbre sobre la IA de París, el artículo relaciona las inversiones anunciadas en los centros de datos con su consumo de electricidad y reúne las estimaciones disponibles.
- Anaëlle Beignon et al., [Imposing AI: Deceptive design patterns against sustainability](https://arxiv.org/abs/2508.08672) (2025). Los autores documentan cómo los editores de software imponen la IA, colocando sus funciones en el lugar de funciones existentes y difundiendo relatos que hacen más difícil negarse a usarla. Clasifican estas prácticas entre los *deceptive patterns* y subrayan su coste medioambiental.

Para estimar el impacto de vuestros propios usos, la biblioteca [EcoLogits](https://github.com/genai-impact/ecologits) calcula la energía y las emisiones de una consulta a partir del tamaño del modelo y del número de tokens producidos. El comparador [compar:IA](https://comparia.beta.gouv.fr/) de beta.gouv.fr muestra esa estimación junto a cada respuesta. Las palancas vistas en la formación, como un `AGENTS.md` corto, salidas de herramientas filtradas o un modelo más pequeño para las tareas bien delimitadas, reducen el número de tokens procesados.

### ¿Qué pasa con el software libre y la seguridad?

- Daniel Stenberg, [The end of the curl bug-bounty](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/) (enero de 2026). El mantenedor de curl explica por qué el proyecto detuvo su programa de recompensas por fallos de seguridad. Antes de 2025, más del 15 % de los reportes recibidos eran fallos reales. En 2025, con la avalancha de informes generados por IA, era menos del 5 %, y cada informe falso exigía tiempo para ser refutado.
- Software Freedom Conservancy, [Recommendations When Using LLM-backed Generative AI Systems for FOSS Contributions](https://sfconservancy.org/llm-gen-ai/llm-backed-generative-ai-recommendations.html). La asociación apoya a los proyectos que rechazan toda contribución escrita con un LLM. Pide que nadie esté obligado a usar estas herramientas, y que quienes las usen relean y comprendan su contribución antes de enviarla.
- La documentación del núcleo Linux, [AI Coding Assistants](https://docs.kernel.org/process/coding-assistants.html). Un agente nunca añade un `Signed-off-by` allí: la persona que envía el parche relee el código, verifica la licencia y asume la responsabilidad. Una etiqueta `Assisted-by` indica la herramienta utilizada.
- Joseph Spracklen et al., [We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://arxiv.org/abs/2406.10279) (USENIX Security 2025). Sobre 576 000 fragmentos de código generados por dieciséis modelos, al menos el 5,2 % de los paquetes citados por los modelos comerciales y el 21,7 % de los citados por los modelos abiertos no existen. Un atacante puede publicar un paquete malicioso bajo uno de esos nombres.

### ¿Qué dicen el derecho y las reglas de uso?

- Comisión Europea, [Living guidelines on the responsible use of generative AI in research](https://research-and-innovation.ec.europa.eu/document/download/2b6cf7e5-36ac-41cb-aab5-0d32050143dc_en?filename=ec_rtd_ai-guidelines.pdf). Estas recomendaciones, redactadas en el marco del Espacio Europeo de la Investigación, se dirigen a los investigadores, a las instituciones y a los financiadores. El investigador sigue siendo responsable de lo que produce con estas herramientas. Declara su uso y evita servirse de ellas para actividades sensibles como la evaluación por pares.
- U.S. Copyright Office, [Copyright and Artificial Intelligence, Part 2: Copyrightability](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf) (enero de 2025). Un contenido producido únicamente a partir de un prompt no está protegido por el derecho de autor. Lo que sí lo está es la aportación humana: el código que escribes, o la forma en que eliges, ordenas y modificas lo que produce el modelo. El informe solo se refiere al derecho estadounidense.

### ¿Qué cambia la IA en el trabajo y en el aprendizaje?

- METR, [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089) (julio de 2025). En este ensayo aleatorizado, dieciséis desarrolladores experimentados trataron tickets reales de proyectos de código abierto en los que contribuyen, con y sin IA. Pensaban ir más rápido con la IA y tardaron un 19 % más de tiempo. El estudio se centra en un caso concreto: proyectos que estas personas conocen muy bien, con las herramientas de principios de 2025.
- Judy Hanwen Shen y Alex Tamkin (Anthropic), [How AI assistance impacts the formation of coding skills](https://www.anthropic.com/research/AI-assistance-coding-skills) (enero de 2026, [artículo](https://arxiv.org/abs/2601.20245)). Cincuenta y dos desarrolladores aprenden una biblioteca de Python desconocida, con o sin asistente. El grupo con asistente obtiene un 17 % menos en el cuestionario posterior, sobre todo en la depuración. Delegar todo el código hace que se aprenda menos que hacer preguntas para entender.

Estos dos estudios coinciden con lo que la formación repite: releer el diff, lanzar las pruebas tú mismo y entender lo que ha escrito el agente siguen siendo tu trabajo.

## Glosario

Los términos están clasificados por orden alfabético. El equivalente inglés se da entre paréntesis cuando difiere.

**`AGENTS.md`**: archivo de reglas colocado en la raíz de un repositorio, que el harness carga en el contexto en cada turno. Claude Code utiliza `CLAUDE.md`. Ver [2.1](./act2-contexte).

**Agente**: un LLM que puede llamar a herramientas, leer el resultado y volver a empezar hasta terminar su tarea. Ver [Por qué un harness](./act1-harness).

**Llamada a herramienta** (*tool calling*): petición estructurada que produce el modelo para lanzar una acción. El modelo no ejecuta nada por sí mismo, es el harness el que ejecuta la herramienta y le devuelve el resultado. Ver [Los LLM en 2026](./act1-llm).

**Entorno de pruebas** (*sandbox*): entorno aislado en el que el agente trabaja, con límites que el modelo no puede franquear (archivos visibles, red, claves). Ver [2.0](./act2-sandbox).

**Bucle agéntico** (*agent loop*): encadenamiento repetido de una llamada al modelo, de la ejecución de las herramientas solicitadas y de la relectura de su resultado. Ver [El harness de partida: Pi](./act1-pi).

**Caché** (*prompt caching*): mecanismo del proveedor que cobra mucho más barata la parte del contexto que no ha cambiado desde la llamada anterior. Solo funciona sobre un prefijo idéntico. Ver [2.1](./act2-contexte).

**`codemode`**: herramienta de Pi que permite al modelo escribir un script que llama a las demás herramientas, para que solo el resultado filtrado vuelva al contexto. Ver [2.1](./act2-contexte).

**combo**: extensión de Pi escrita para la formación, que lanza subagentes y despliega flows. Ver [2.4](./act2-delegation) y [2.5](./act2-workflows).

**Compactación**: resumen de los mensajes más antiguos, que se activa cuando el contexto se acerca al tamaño de la ventana. Ver [2.1](./act2-contexte).

**Context engineering**: elección de lo que entra en la ventana de contexto y en qué orden, más allá de la sola formulación del prompt. Ver [Por qué un harness](./act1-harness).

**Petición descuidada**: prompt mínimo, el que se escribe el primer día, usado como punto de comparación en los ejercicios sobre la incidencia #1. Ver [2.1](./act2-contexte).

**Diferencia establecida**: en trysquare, diferencia entre dos configuraciones cuyo intervalo al 95 % no contiene cero, marcada con `*`. Una diferencia cuyo intervalo contiene cero no es concluyente y se marca con `o`. Ver [3.0](./act3-trysquare).

**Esfuerzo de razonamiento** (*thinking level*): ajuste que deja al modelo producir más o menos tokens de reflexión antes de responder. Ver [Los LLM en 2026](./act1-llm) y [2.1](./act2-contexte).

**Enjambre** (*swarm*): varios agentes sobre una misma tarea, que intercambian mediante una tabla común y deciden ellos mismos qué hacen con el mensaje de otro, en lugar de seguir una secuencia escrita de antemano. Ver [2.6](./act2-swarm).

**Patrón**: etiqueta congelada del repositorio NÉON (por ejemplo `etalon-v1`) que cada ejecución clona, para que todas partan del mismo código. Ver [3.0](./act3-trysquare).

**Evaluación**: comparación de configuraciones sobre una misma tarea, repitiendo cada configuración porque el resultado varía de una ejecución a otra. Un **test**, en cambio, responde sí o no. Ver [3.0](./act3-trysquare).

**Extensión** : código TypeScript que Pi carga, y que añade herramientas, comandos o hooks. Ver [El harness de partida: Pi](./act1-pi) y [2.3](./act2-hooks).

**Fan-out** : patrón de workflow en el que varios agentes trabajan en paralelo sobre la misma entrada. Ver [2.5](./act2-workflows).

**Ventana de contexto** (*context window*): número máximo de tokens que el modelo puede tener en cuenta a la vez. El **contexto** es lo que la llena: prompt del sistema, archivos de reglas, descripciones de herramientas, tu pregunta y el historial. Ver [2.1](./act2-contexte).

**Flow** : en combo, grafo de tareas descrito en YAML y en markdown, cuyos nodos son subagentes o scripts y cuya secuencia decide el código. Ver [2.5](./act2-workflows).

**Guía y sensor** (*guide and sensor*) : vocabulario de Birgitta Böckeler. Una guía actúa antes del agente para orientarlo, un sensor actúa después para ayudarlo a corregirse. Ver [2.3](./act2-hooks).

**Harness** (*harness*) : todo lo que rodea al modelo para convertirlo en un agente útil y seguro: bucle, herramientas, gestión del contexto, permisos, verificación. Ver [Por qué un harness](./act1-harness).

**Hook** : función que el harness ejecuta en un momento preciso del bucle, por ejemplo antes de cada llamada a una herramienta o cuando el agente está a punto de devolver el control. Su efecto no depende del modelo. Ver [2.3](./act2-hooks).

**Inyección de prompt** (*prompt injection*) : texto leído por el agente, en un archivo o una página web, que se hace pasar por una instrucción. El `SUPPORT.md` de NÉON es un ejemplo. Ver [2.0](./act2-sandbox).

**Juez** (*LLM-as-a-judge*) : modelo encargado de puntuar una ejecución cuando ningún test sabe hacerlo. Su veredicto es probabilístico. Ver [3.0](./act3-trysquare).

**LLM** (*Large Language Model*) : modelo de lenguaje entrenado para predecir el token siguiente a partir de lo que precede. Ver [Los LLM en 2026](./act1-llm).

**MCP** (*Model Context Protocol*) : protocolo abierto que normaliza la forma en que un modelo accede a herramientas externas. Ver [Histórico](./historique).

**Mezcla de expertos** (*Mixture of Experts*, MoE) : arquitectura que solo activa una parte de la red en cada token. Hay que distinguir entonces los **parámetros totales** y los **parámetros activos**. Ver [Los LLM en 2026](./act1-llm).

**Panoplia**: lista de las herramientas de las que dispone un agente, declarada en el campo `tools:` de su archivo. Una herramienta ausente de la panoplia no se puede invocar. Ver [2.4](./act2-delegation).

**System prompt** (*system prompt*) : texto colocado al principio del contexto que describe al modelo su rol, sus herramientas y sus convenciones. Ver [2.1](./act2-contexte).

**RAG** (*Retrieval-Augmented Generation*) : técnica que proporciona al modelo documentos relevantes antes de que responda. Ver [Histórico](./historique).

**Reintento** : turno relanzado por la herramienta de medición porque el proveedor devolvió un error. Los reintentos inflan los costes medidos. Ver [3.1](./act3-contexte).

**Escenario** : archivo TOML que describe un experimento trysquare: la tarea, las configuraciones que se van a comparar, el número de repeticiones y la forma de puntuar. Ver [3.0](./act3-trysquare).

**Centinela** : valor ficticio de la clave de API visible en el entorno aislado. El proxy del host la sustituye por la clave real en el momento en que sale la petición. Ver [2.0](./act2-sandbox).

**Skill** (competencia) : archivo `SKILL.md`, con posibles scripts y archivos de referencia, que el agente carga cuando la tarea lo requiere. Ver [2.2](./act2-skill).

**Sonda**: archivo de tests de referencia que trysquare usa para verificar que una ejecución corrige realmente el bug. Ver [3.1](./act3-contexte).

**Subagente** (*subagent*): sesión lanzada por el agente principal con su propio contexto, sus herramientas y su modelo. Solo su conclusión vuelve al contexto principal. Ver [2.4](./act2-delegation).

**Tablero** (*board*): en combo, registro compartido por los miembros de un enjambre, donde solo se pueden añadir mensajes y donde el autor de cada uno queda inscrito por el propio tablero. Ver [2.6](./act2-swarm).

**Token**: fragmento de texto, unidad básica que el modelo lee y produce. Los proveedores facturan por millón de tokens. Ver [Los LLM en 2026](./act1-llm).

**trysquare**: herramienta Python escrita para la formación, que repite las configuraciones de un escenario y dice si la diferencia entre dos configuraciones está establecida. Ver [3.0](./act3-trysquare).

**Fábrica de software** (*software factory*): sistema que recibe una solicitud y devuelve una pull request haciendo trabajar a varios agentes en paralelo. Ver [Ahora te toca](./a-vous-de-jouer).

**Validación**: en trysquare, ejecutable que puntúa una ejecución y devuelve métricas con sus razones. Ver [3.0](./act3-trysquare).

**Workflow** (flujo de trabajo): encadenamiento de etapas decidido por código, por oposición a un agente que decide por sí mismo lo que sigue. Ver [2.5](./act2-workflows).
