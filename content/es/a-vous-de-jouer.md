# Ahora te toca a ti

::: tip Objetivos de este módulo
- Saber qué aprovechar de trysquare y de combo una vez terminada la formación
- Saber dónde buscar skills escritos por practicantes que los usan a diario
- Situar trysquare y combo entre las herramientas de evaluación y de workflows más acabadas
- Reconocer en las fábricas de software que están apareciendo las piezas construidas durante el acto 2
:::

A lo largo de la formación, has trabajado sobre NÉON, un repositorio que habíamos preparado para que cada palanca del harness produjera en él un efecto visible. Tu propio repositorio no tendrá ni un `ISSUES.md` tan detallado, ni una issue #1 cuyos efectos secundarios se conozcan de antemano, y es sobre él donde las decisiones tomadas durante estos tres actos deben ahora sostenerse. Para continuar por tu cuenta, puedes partir de las dos herramientas escritas para la formación, leer los skills de practicantes que llevan mucho tiempo escribiéndolos, y mirar las herramientas más acabadas que ya hacen lo mismo que las nuestras, hasta las fábricas de software que ensamblan todas las piezas del acto 2.

## ¿Qué conservar de trysquare y de combo?

Hemos escrito dos herramientas para esta formación, para que cada experimento de un módulo se lance en pocos minutos desde una sesión de Pi y su código siga siendo lo bastante corto para poder leerse.

[combo](https://github.com/AI-for-dev/combo) es una extensión de Pi que ejecuta un **flow**, es decir, un grafo de tareas descrito en YAML y en markdown, cuyos nodos son subagentes y cuyo encadenamiento lo decide el código en lugar del modelo. El [módulo 2.4](./act2-workflows) lo usó para escribir la cadena explorer, planner, implementación y tests, con un bucle con tope y una parada humana antes del commit. Su [documentación](https://github.com/AI-for-dev/combo/tree/main/docs) describe también los flows `build` y `build-attended`, que hacen de forma genérica lo que el módulo hizo sobre un ticket.

[trysquare](https://github.com/AI-for-dev/trysquare) es una herramienta en Python que reejecuta las configuraciones de un escenario, califica cada ejecución y dice si la diferencia medida entre dos configuraciones se debe al remuestreo. El [módulo 3.0](./act3-trysquare) describe su funcionamiento y el [módulo 3.1](./act3-contexte) lo aplicó a las palancas del contexto. El repositorio [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) contiene los escenarios del acto 3 y sirve de punto de partida para escribir los tuyos.

::: warning Herramientas de formación
combo y trysquare se escribieron para experimentar rápido. Hoy solo controlan Pi y todavía no se han probado en producción. Te aconsejamos usarlas para decidir qué pones en tu harness, y luego mirar las herramientas de la sección siguiente si necesitas hacerlo funcionar todos los días con un equipo.
:::

El proceso importa más que las herramientas en sí, y se traslada a tu repositorio sin cambios: elegir un ticket real cuya corrección sepas verificar con un test, escribir la petición tal como la escribirías un día cualquiera, y luego hacer variar una sola palanca a la vez (el modelo, `AGENTS.md`, un skill, un flow) repitiendo cada configuración las veces suficientes para que la diferencia observada no sea ruido. La ficha de decisión que rellenaste módulo a módulo es el entregable que hay que reproducir.

## ¿Dónde encontrar skills en los que inspirarse?

El [módulo 2.2](./act2-skill) te hizo escribir `playtester` y luego `dynamic-playtester` a mano, y te animamos a seguir así: un skill que has escrito y probado con tus modelos es un skill del que sabes qué hace. Leer los skills de personas que llevan mucho tiempo usándolos sigue siendo la mejor forma de aprender a escribirlos. Estos son los tres repositorios que recomendamos en octubre de 2026.

- [pstack](https://github.com/cursor/plugins/tree/main/pstack), de Lauren Tan, que reúne los skills que usa cada día en Cursor, y varios de ellos reparten una misma tarea entre varios modelos para aprovechar los puntos fuertes de cada uno.
- [mattpocock/skills](https://github.com/mattpocock/skills), de Matt Pocock, skills deliberadamente cortos y fáciles de adaptar (desarrollo guiado por tests, diseño de módulos, diagnóstico de bugs), que describen cada uno un procedimiento con un criterio de final verificable, como hicimos con `playtester`.
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), de Addy Osmani, que divide el ciclo de desarrollo en nueve comandos (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`...) y cada uno carga los skills de la etapa.

El skill [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) de Anthropic sigue siendo útil para escribir un primer esqueleto, y el catálogo [skills.sh](https://www.skills.sh/) para ver qué existe sobre un tema.

::: danger Un skill es código
Un skill puede pedirle al modelo que ejecute sus scripts, lea páginas web o escriba en tu repositorio. Instalar un skill encontrado en línea equivale, por tanto, a ejecutar código del que no eres autor, con los permisos de tu agente. Lee `SKILL.md` y el contenido de `scripts/` antes de instalarlo, y hazlo correr en el sandbox del [módulo 2.0](./act2-sandbox) mientras no lo hayas leído.
:::

## ¿Qué herramientas hacen lo mismo que trysquare y combo?

Para la evaluación, [Inspect](https://inspect.aisi.org.uk/), el framework del AI Security Institute británico, reproduce cada muestra con `--epochs`, agrega las repeticiones y publica un error estándar, y su paquete [Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/) hace correr Claude Code, Codex CLI, Gemini CLI u OpenCode en un sandbox. [Harbor](https://github.com/harbor-framework/harbor), escrito por el equipo de Terminal-Bench, lanza agentes sobre tareas en contenedores con `--n-attempts` y puede repartir la carga entre proveedores de sandboxes remotos como Daytona o Modal. Estas dos herramientas cubren más agentes y más infraestructura que trysquare, a costa de una instalación más pesada, y ninguna de las dos se centra en la cuestión que ocupó el acto 3: saber si la diferencia entre dos configuraciones de harness, sobre una tarea fija, es real.

Para los workflows, [Archon](https://github.com/coleam00/Archon) describe un workflow como un grafo YAML guardado en `.archon/workflows/`, mezcla en él nodos deterministas (bash, tests, git) y nodos confiados a Claude Code, Codex o Pi, gestiona los bucles y las validaciones humanas, y entrega una veintena de workflows listos para usar. [Fabro](https://github.com/fabro-sh/fabro), distribuido en un solo binario Rust, describe el grafo en DOT (el lenguaje de [Graphviz](https://graphviz.org/)), asigna un modelo a cada nodo mediante una hoja de estilo y suspende el run en puertas de aprobación. Estos motores lanzan los agentes desde fuera del harness, mientras que un flow combo se lanza con `/run` desde la sesión Pi y deja leer la traza de cada subagente en el mismo lugar. Los patrones del módulo 2.4 (cadena, bucle con tope, tests como juez, parada humana) tienen un equivalente directo en Archon, de modo que un flow escrito durante la formación se transpone allí nodo por nodo.

## ¿Qué es una fábrica de software?

Una **fábrica de software** (*software factory*) es un sistema que recibe una petición, casi siempre una issue o una especificación, y devuelve una pull request o un informe, haciendo trabajar a varios agentes en paralelo, cada uno en su propio árbol de trabajo, bajo una supervisión que solo recurre al humano para las decisiones que le corresponden. Las herramientas de esta familia son jóvenes y cambian de semana en semana. Las presentamos aquí porque ensamblan las piezas que construiste una a una durante el acto 2: el sandbox, el contexto, los skills, la delegación a subagentes, los workflows y los hooks.

[Machinist](https://github.com/owainlewis/machinist), escrito en Go y publicado en acceso anticipado, se ejecuta en tu máquina y mantiene los repositorios y las claves en local. Un **comando** asocia ahí un prompt, un ejecutable que lo lee de su entrada estándar (Codex, Claude Code, otro agente, un script de pruebas) y un tiempo máximo, y un workflow encadena estos comandos conservando los archivos producidos de una etapa a la siguiente, y puede detenerse antes de una etapa para esperar tu aprobación. El archivo de configuración está en TOML, y el workflow `task-to-pr` incluido por defecto pasa de una issue de GitHub a una pull request. Machinist no ve el interior de un comando: un script interrumpido vuelve a empezar desde el principio, a menos que gestione él mismo sus puntos de reanudación.

[firstmate](https://github.com/kunchenguid/firstmate) se presenta como una distribución de agente en lugar de un software para instalar: el repositorio clonado contiene un `AGENTS.md`, skills y scripts, y es el harness que lanzas dentro (Pi, Claude Code, Codex, OpenCode y otros) el que se convierte en el «segundo». Solo hablas con ese agente, que lanza un agente por tarea en una ventana tmux o una pestaña [herdr](https://herdr.dev) que puedes observar, le da un árbol de trabajo git limpio, lo vigila hasta el final y te devuelve una pull request o un informe de investigación. La vigilancia se delega a un script bash que solo despierta al modelo cuando un agente lo necesita, lo que evita pagar tokens durante la espera. Se recupera el patrón del [módulo 2.3](./act2-delegation), un orquestador y subagentes aislados, llevado hasta varias tareas en paralelo sobre varios repositorios.

[Gas Town](https://github.com/steveyegge/gastown), de Steve Yegge, coordina agentes (Claude Code, GitHub Copilot, Codex, Gemini y otros) repartidos por varios proyectos, con un agente coordinador, buzones entre agentes y un estado de trabajo conservado en git, para que un agente reiniciado retome donde lo dejó. Su README anuncia un funcionamiento cómodo con veinte a treinta agentes, una cifra que no hemos medido.

Estas herramientas te hacen pasar de un agente que vigilas a varios agentes que diriges, pero cada agente añadido multiplica los tokens gastados y las pull requests por revisar, y ninguno dice si su configuración corrige tus tickets con más frecuencia que un solo agente bien ajustado, cuando es exactamente la pregunta a la que responde trysquare. Antes de confiar tu repositorio a una fábrica, mide sobre algunos tickets reales si entrega con más frecuencia una corrección que pasa las pruebas que la configuración elegida en tu ficha de decisión, y a qué coste.

## Para ir más lejos

- [combo](https://github.com/AI-for-dev/combo) y su [documentación](https://github.com/AI-for-dev/combo/tree/main/docs).
- [trysquare](https://github.com/AI-for-dev/trysquare), su [documentación](https://ai-for-dev.github.io/trysquare/) y el repositorio de ejercicios [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter).
- La [especificación Agent Skills](https://agentskills.io/specification), para escribir skills que funcionen de un harness a otro.
- La [documentación de Machinist](https://github.com/owainlewis/machinist/blob/main/docs/README.md), en particular la [guía de workflows de tareas](https://github.com/owainlewis/machinist/blob/main/docs/task-guide.md).
- La [arquitectura de firstmate](https://github.com/kunchenguid/firstmate/blob/main/docs/architecture.md), que detalla la supervisión, el aislamiento de los árboles de trabajo y los modos de entrega por proyecto.
