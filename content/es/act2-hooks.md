# Los hooks o eventos deterministas

::: tip Objetivos de este módulo
- Entender qué es un evento determinista en el harness
- Saber en qué momentos del bucle del agente Pi permite ejecutar código, y qué puede cambiar ese código
- Escribir una extensión que rechace los comandos shell descritos en un archivo de reglas
- Escribir una extensión que lance los tests cuando el agente esté a punto de devolver el control, y que le devuelva los fallos que debe corregir
- Distinguir una regla que un hook puede verificar de una regla que exige el juicio de un modelo
:::

En los módulos anteriores, trabajamos sobre todo con archivos escritos en Markdown que los agentes leían (o no). En esos archivos intentamos describir marcos de desarrollo para ayudar a los agentes a llegar allí donde queríamos que llegaran. Recordemos que el carácter aleatorio de los LLM hace que no sea 100 % seguro que las directrices dadas en esos archivos de texto se lleven realmente a cabo. Pueden perderse en el contexto.

En este módulo nos vamos a centrar en hacer deterministas las acciones que describíamos en los archivos Markdown. Esas acciones pueden aparecer en distintos momentos del flujo de trabajo, y veremos que Pi es capaz de darte el control en todos los niveles del harness. Eso pasa por construir extensiones. Ya has instalado algunas; ahora vas a construirlas. Aquí se ve toda la potencia y la flexibilidad de Pi.

Estos eventos también reciben el nombre de hooks.

## Entender

### ¿Por qué añadir eventos deterministas?

Como mencionamos en la introducción, nada impide que el LLM no siga una directriz que se encuentra en los archivos de agentes o en los skills. Por lo tanto, hay varias razones para poner eventos deterministas. Pudimos ver una al principio de esta formación, en el módulo sobre el sandbox. El uso de una extensión puede permitir evitar ciertos comandos que no querríamos que el LLM lanzara en la sesión: leer un archivo `.env`, un `rm -rf` desafortunado... Otra ventaja es poder guiar al agente según reglas preestablecidas, en particular a nivel del linter y de las pruebas unitarias.

El agente está obligado a ejecutarlo; no es texto. La respuesta que da esa acción determinista se inyecta después en el contexto y puede llevar al agente a resolver los problemas de la manera correcta (o más bien a tu manera). Aquí vemos bien que es una nueva pieza del puzle que permite tener más confianza y dejar que el modelo trabaje con total autonomía. La idea es tener una fase final que corresponda a nuestras expectativas y que sea más fácil de revisar y validar.

Recordamos que estos eventos deterministas son complementarios a los eventos de inferencia vistos en los módulos anteriores. La idea es, por tanto, encontrar el equilibrio adecuado entre estas dos formas de interactuar con el agente.

### ¿En qué momento interviene esto?

Estos eventos pueden intervenir en cualquier momento del proceso de desarrollo:

- al inicio de la sesión para preparar el entorno de desarrollo: uv, conda...
- al final del trabajo del agente para verificar que el código producido respeta el marco de desarrollo del proyecto: linter, tests.
- en el momento de la revisión para verificar que no hay código duplicado, que la calidad del código producido es buena...

En Pi, un hook es una función TypeScript registrada con `pi.on("<evento>", handler)` dentro de una extensión. Pi no tiene un archivo de configuración JSON que lance scripts shell con códigos de salida, como `settings.json` en Claude Code (ver la [documentación de los hooks de Claude Code](https://code.claude.com/docs/en/hooks)).

Estos son los eventos disponibles en Pi.

#### Al inicio de la sesión (preparación del entorno)

- `session_start`: preparar el entorno (uv, conda) al inicio de una sesión. Es el lugar donde lanzar lo que debe ejecutarse durante la sesión, y `session_shutdown` donde detenerlo.
- `before_agent_start`: antes de cada ejecución del agente. El handler puede inyectar un mensaje o reemplazar el system prompt (`message`, `systemPrompt`).
- `resources_discover`: añadir rutas de skills, prompts, etc.
- `project_trust`: decidir si se confía en el proyecto. Solo participan las extensiones de usuario o pasadas por línea de comandos.
- `input`: interceptar el prompt del usuario, con tres retornos posibles: `continue`, `transform` (reescribir el texto) o `handled` (el prompt no llega al modelo).

#### Durante el trabajo (las barreras de seguridad)

- `tool_call`: es el equivalente de `PreToolUse` de Claude Code. Devolver `{ block: true, reason }` bloquea la herramienta, y la razón se devuelve al modelo. También se puede modificar `event.input` in situ. Es el lugar adecuado para el `.env` y el `rm -rf`. Si el handler falla, la herramienta se bloquea por seguridad.
- `tool_result`: es el equivalente de `PostToolUse` de Claude Code. El handler puede reescribir `content` o `isError`, por ejemplo para añadir la salida del linter tras una edición.
- `user_bash`: los comandos `!` escritos por el usuario.
- `context` / `context_with_system`: transformar los mensajes enviados al modelo.
- `message_end`: reemplazar un mensaje finalizado.
- `session_before_compact`, `session_before_switch`, `session_before_fork`, `session_before_tree`: cancelar la operación (`cancel`) o personalizarla.

#### Al final del trabajo del agente (linter, tests)

- `turn_end` y `agent_before_settle`: son las dos únicas fronteras donde el handler puede actuar. Devuelve `{ continue: true, entries }` para relanzar una petición al modelo con contexto añadido. Es el equivalente del hook `Stop`: se lanzan las pruebas y, si fallan, se relanza el agente con la salida. La doc advierte que un relanzamiento sin condición entra en bucle, así que hace falta un punto de parada.
- `agent_end` y luego `agent_settled`: solo notificación. `agent_settled` garantiza que Pi no volverá a arrancar por su cuenta.
- `session_shutdown`: limpieza, o commit automático al salir.

Puedes comprobar que realmente puedes intervenir en cualquier momento y adaptar tu harness con precisión.

### Una extensión de Pi

Una extensión es un archivo TypeScript. Pi lo carga directamente, sin paso de compilación. Para una extensión más grande, también se puede usar una carpeta que contenga un `index.ts`.

Aquí tienes una extensión que impide al agente leer el archivo `.env`:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event) => {
    if (event.toolName === "read" && event.input.path.endsWith(".env")) {
      return { block: true, reason: "Lecture du fichier .env interdite" };
    }
  });
}
```

En cada llamada de herramienta, Pi ejecuta esta función antes de la herramienta. Si el agente intenta leer un `.env`, la herramienta no se lanza y el agente recibe el mensaje `reason`. En todos los demás casos, la función no devuelve nada y la llamada se desarrolla con normalidad.

La carpeta donde se deposita el archivo determina su alcance:

| Ubicación | Alcance |
|---|---|
| `~/.pi/agent/extensions/` | todas tus sesiones, sea cual sea el proyecto |
| `.pi/extensions/` | solo este proyecto, una vez aprobado el proyecto |
| `pi --extension ./bloque-env.ts` | solo esta sesión, práctico para probar |

## Reconstruir

Proponemos aquí construir dos extensiones para NÉON, cada una conectada a un momento distinto del bucle del agente. La primera interviene antes de cada llamada de herramienta y rechaza los comandos de shell listados en un archivo de reglas: es una versión reducida de [`pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system), instalada en el módulo en el entorno de pruebas. La segunda interviene cuando el agente está a punto de devolverte el control: lanza la verificación de sintaxis y las pruebas y, si algo falla, devuelve la salida al agente para que corrija.

### ¿Cómo rechazar un comando ejecutado por el agente?

Queremos reproducir aquí comportamientos similares a [`pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system). La idea es poder describir reglas de comandos prohibidos en `.pi/forbidden-commands.json`, en la raíz de NÉON. Cada regla asocia:

- un patrón que es una [expresión regular de JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Regular_expressions) buscada en el comando
- una razón que el agente recibirá si su comando coincide con el patrón

Así es como se ve el archivo de reglas:

```json
{
  "forbidden": [
    { "pattern": "rm -rf", "reason": "recursive deletion, ask the user to run it themselves." },
    { "pattern": "git push.*--force", "reason": "rewrites the remote history." },
    { "pattern": "\\.env(\\s|$)", "reason": "the .env file contains secrets." },
    { "pattern": "curl|wget", "reason": "no network requests from the shell." }
  ]
}
```

El JSON obliga a duplicar las barras invertidas: el patrón `\\.env(\\s|$)` se lee como la expresión `\.env(\s|$)`, que reconoce `cat .env` sin bloquear `cat .env.example`.

La extensión, `.pi/extensions/command-guard.ts`, cabe en una veintena de líneas:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RULES_FILE = ".pi/forbidden-commands.json";

interface Rule {
  pattern: string;
  reason: string;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    // Re-read on every call: a new rule applies without restarting Pi.
    const text = readFileSync(join(ctx.cwd, RULES_FILE), "utf8");
    const rules: Rule[] = JSON.parse(text).forbidden;

    for (const rule of rules) {
      if (new RegExp(rule.pattern).test(event.input.command)) {
        return { block: true, reason: `Command refused by ${RULES_FILE}: ${rule.reason}` };
      }
    }
  });
}
```

El handler recibe el evento y un contexto `ctx`, del que aquí solo usamos `ctx.cwd`, la carpeta del proyecto. `isToolCallEventType("bash", event)` deja pasar todas las demás herramientas e indica a TypeScript que `event.input.command` existe. El archivo de reglas se relee en cada llamada, lo que cuesta una lectura de disco de unos pocos bytes y permite corregir una regla mientras la sesión sigue en marcha. Cuando un patrón coincide, el handler devuelve `{ block: true, reason }`: Pi no ejecuta el comando, y la razón llega al modelo en lugar del resultado de la herramienta. Cuando nada coincide, la función no devuelve nada y el comando se ejecuta.

El caso en que falta el archivo, o contiene un JSON inválido, no necesita tratarse a mano. `readFileSync` o `JSON.parse` lanzan entonces una excepción, y Pi bloquea la herramienta en cuanto falla un handler de `tool_call`. Todos los comandos shell quedan entonces rechazados y el modelo recibe el mensaje de error (`ENOENT: no such file or directory…`), de modo que un error en el archivo de reglas bloquea el shell en lugar de dejarlo pasar todo.

::: warning Una expresión regular no entiende el shell
Esta barrera de seguridad compara texto. `rm -r -f game`, `find game -delete` o un script Python que borra la carpeta se escapan todos al patrón `rm -rf`. `pi-permission-system` analiza el comando bash y rechaza lo que no sabe clasificar, lo que lo hace más difícil de eludir, y el sandbox sigue siendo el único límite que aguanta cuando el agente encuentra un camino que las reglas no previeron. Esta extensión sirve para entender el mecanismo y debe mejorarse para ser robusta.
:::

::: info Ejercicio (presencial)
En tu clon de NÉON, deposita los dos archivos de arriba y luego lanza Pi con la extensión cargada solo para esta sesión:

```bash
pi -e .pi/extensions/command-guard.ts
```

Pídele que borre la carpeta `game/`, y luego que te muestre el contenido del `.env` con `cat`. Ambos comandos se rechazan, y lees la razón en la respuesta del agente. Sin salir de la sesión, añade al archivo una regla que prohíba `npm install`, y luego pide a Pi que instale un paquete: la regla se aplica de inmediato.

La herramienta `read` de Pi lee un archivo sin pasar por el shell, así que la regla sobre `.env` no lo detiene. Amplía la extensión para bloquear también `read` cuando `event.input.path` termine en `.env`, inspirándote en el ejemplo del principio del módulo. No dudes en usar Pi para ayudarte a implementar esta nueva funcionalidad.
:::

### ¿Cómo obligar al agente a pasar las pruebas antes de devolver el control?

El `CONTRIBUTING.md` de NÉON prohíbe hacer commit con pruebas en rojo: `npm test` debe pasar. En los módulos anteriores viste que una consigna escrita puede ignorarse, y un agente que se detiene tras una modificación sin volver a lanzar las pruebas te deja a ti el trabajo de descubrir la regresión. La siguiente extensión lanza las verificaciones por sí misma, en el momento en que el agente ha terminado.

Dos eventos de Pi permiten relanzar el agente con contexto añadido. `turn_end` se dispara después de cada respuesta del modelo, o sea después de cada edición, cuando el código suele estar a medio modificar: los tests fallarían en pleno refactor que iba a devolverlos al verde. `agent_before_settle` se dispara una sola vez, cuando el agente ya no tiene nada que hacer y está a punto de devolverte el control. Es el equivalente del hook `Stop` de Claude Code, y es el que usamos.

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const CHECKS = [
  { name: "tests", command: "npm test" },
];
const MAX_RETRIES = 3;
const MAX_OUTPUT = 3000; // output characters sent back to the model

export default function (pi: ExtensionAPI) {
  let codeChanged = false;
  let retries = 0;

  pi.on("tool_result", async (event) => {
    if (event.toolName === "edit" || event.toolName === "write") codeChanged = true;
  });

  pi.on("agent_before_settle", async (event, ctx) => {
    if (!codeChanged || event.outcome !== "completed") return;

    const failures: string[] = [];
    for (const { name, command } of CHECKS) {
      const r = await pi.exec("bash", ["-c", command], { cwd: ctx.cwd, timeout: 120_000 });
      if (r.code !== 0) {
        failures.push(`### ${name} (code ${r.code})\n${(r.stdout + r.stderr).slice(-MAX_OUTPUT)}`);
      }
    }

    if (failures.length === 0) {
      ctx.ui.notify("Checks: OK", "info");
      return;
    }
    if (retries >= MAX_RETRIES) {
      ctx.ui.notify(`Still failing after ${MAX_RETRIES} retries, handing control back to you.`, "warning");
      return;
    }

    retries += 1;
    return {
      continue: true,
      entries: [
        {
          type: "custom_message",
          customType: "checks",
          display: true,
          content: `The checks failed after your changes. Fix the code (not the tests), then finish.\n\n${failures.join("\n\n")}`,
        },
      ],
    };
  });

  pi.on("agent_settled", async () => {
    codeChanged = false;
    retries = 0;
  });
}
```

L'extension enregistre trois handlers qui partagent deux variables, `codeChanged` et `retries`.

El handler de `tool_result` observa las herramientas que acaban de ejecutarse y levanta `codeChanged` en cuanto ha tenido lugar un `edit` o un `write`. Si le haces una simple pregunta al agente, no modifica nada, y los tests no se lanzan. Sin este indicador, un test ya en rojo antes de la sesión obligaría al agente a repararlo en cada pregunta.

El handler de `agent_before_settle` lanza las verificaciones, siempre que el código haya cambiado y que el turno haya terminado con normalidad (`outcome` vale `"aborted"` cuando interrumpes al agente, y no queremos relanzarlo en contra de tu criterio). Pasa cada comando a `pi.exec`, que lanza un proceso sin shell: de ahí el `bash -c`, necesario para el bucle `for`. Las salidas de los comandos fallidos se reúnen y se truncan a sus últimos 3000 caracteres, porque todo lo que se devuelve entra en el contexto del modelo y se paga en tokens, y el resumen de los tests fallidos se encuentra al final de la salida de `node --test`.

El retorno `{ continue: true, entries }` pide a Pi una nueva petición al modelo, precedida de un mensaje `custom_message` que contiene la salida de las verificaciones. El modelo lo recibe como un mensaje de usuario y retoma el trabajo. Con `display: true`, el mensaje también se muestra en tu terminal, lo que te permite seguir lo que el harness le ha dicho al agente. Ambos campos son necesarios: un `continue: true` sin mensaje que procesar es rechazado por Pi como un error de extensión, ya que el último mensaje es el del agente y el modelo no tendría nada nuevo que leer.

El contador `retries` existe porque Pi no limita el número de continuaciones. Claude Code se detiene tras ocho relanzamientos consecutivos de un hook `Stop`, mientras que Pi deja esa barrera de seguridad a la extensión, y su documentación advierte de que un relanzamiento sin condición entra en bucle. Tras tres intentos, la extensión te devuelve el control con una advertencia, lo que acota el gasto de tokens de un agente que no consigue corregir. El handler de `agent_settled` finalmente pone las dos variables a cero: este evento solo se dispara una vez que el agente se ha detenido realmente, tras la última continuación, y la próxima solicitud parte de un estado limpio.

::: info Ejercicio (en el aula)
Deposita la extensión en `.pi/extensions/final-checks.ts` y lanza Pi con las dos extensiones:

```bash
pi -e .pi/extensions/command-guard.ts -e .pi/extensions/final-checks.ts
```

Pide a Pi que renombre la función `collides` a `intersects` en `game/neon.js`, sin tocar `game/neon.test.js`. Los tests importan `collides` y fallan por fuerza: ves aparecer el mensaje de la extensión, luego los intentos del agente, hasta el aviso de los tres reintentos. La consigna de la extensión («Fix the code (not the tests)») contradice la tuya, y solo el contador pone fin al intercambio. Mira si el agente acaba modificando el test a pesar de todo: una barrera de seguridad en código puede impedir un comando, pero no elige cómo el modelo resuelve un conflicto entre dos consignas.

Plantea después una petición que termine bien, por ejemplo añadir un test para la puntuación (issue #5), y comprueba que la notificación «Checks: OK» aparece al final.
:::


## Generalizar

**Un hook se sitúa entre las guías o entre los sensores.** Birgitta Böckeler, en [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html), separa los controles que actúan antes del agente, "Guides (feedforward controls) - anticipate the agent's behaviour and aim to steer it _before_ it acts.", de los que actúan después, "Sensors (feedback controls) - observe _after_ the agent acts and help it self-correct." También distingue los controles calculados o llamados deterministas (tests, linters, análisis de estructura) de los controles por inferencia (revisión por un LLM). Con este vocabulario, `command-guard.ts` es una guía calculada, `final-checks.ts` un sensor calculado, y los `AGENTS.md` y las skills de los módulos anteriores son guías por inferencia. Cuando no se sigue una regla, esta rejilla ayuda a identificar la familia de control que falta.

**Un hook solo se ocupa de las reglas verificables.** Matthews Wong ([Deterministic Hooks vs Agent Judgement in Claude Code](https://www.matthewswong.com/en/blog/deterministic-hooks-vs-agent-judgement/)) reserva al hook las decisiones que pueden tomarse a partir de una ruta de archivo, un diff, un comando o un código de retorno ("Anything decidable from a path, a diff, a command string or an exit code"). En contrapartida, el hook nunca concede una excepción ("It cannot be told that this edit is the exception, so it has no way to grant one"). Una regla que exige juicio, como «no refactorices más allá del ticket», permanece entonces en `AGENTS.md`. Mitchell Hashimoto ([My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey)) aplica este criterio: ante cada error del agente, añade o bien una consigna en `AGENTS.md`, o bien una herramienta programada.

**El retorno de un sensor se escribe para el modelo.** Addy Osmani ([Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/)) resume la regla con "success is silent, failures are verbose". Es la elección de `final-checks.ts`, que no envía nada al modelo cuando todo pasa y, en caso de fallo, le envía la salida truncada acompañada de una indicación de corrección. Böckeler ve ahí "a positive kind of prompt injection": el mensaje de error es la única parte del control que el modelo lee, y permite al agente mejorar gracias a un retorno pertinente.

**Una barrera de seguridad que verifica el texto de un comando se elude.** Tim Hopper ([How to stop AI agents from bypassing pre-commit hooks](https://pydevtools.com/handbook/how-to/how-to-stop-ai-agents-from-bypassing-pre-commit-hooks/)) parte de un caso real, el [issue #40117](https://github.com/anthropics/claude-code/issues/40117) de Claude Code, donde el agente elude los hooks pre-commit con `--no-verify`, `git stash` y opciones silenciosas. Muestra que una regla de rechazo escrita como un patrón deja pasar `git commit -m "wip" --no-verify`, porque la opción no está en el lugar esperado, que es exactamente la debilidad de nuestra expresión regular. Propone cinco protecciones sucesivas, desde la indicación hasta la CI, cada una atrapando lo que la anterior deja pasar. Un hook solo protege a la herramienta que lo ejecuta ("A PreToolUse hook only catches Claude Code.") y la CI sigue siendo la última red ("The agent cannot pass --no-verify to CI."). Para NÉON, encontramos la misma sucesión: indicación, `command-guard.ts`, sandbox, y luego las pruebas en CI.

**Un bucle de retorno necesita una parada y una supervisión.** Pi relanza el agente tantas veces como lo pida la extensión, de ahí el contador `retries`. El relanzamiento también empuja al agente a hacer pasar las pruebas por todos los medios. Kent Beck ([Augmented Coding: Beyond the Vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes)) cita entre sus señales de alerta "Any indication that the genie was cheating, for example by disabling or deleting tests.", e [ImpossibleBench](https://arxiv.org/abs/2510.20270) lo mide en tareas imposibles de resolver honestamente: permitir hasta diez envíos con el retorno de las pruebas en fallo hace pasar la tasa media de trampa del 33 % al 38 %. El ejercicio sobre `collides` reproduce esta situación a pequeña escala.

**La brecha entre hook y consigna sigue siendo una hipótesis.** No encontramos ningún estudio que compare, con harness constante, un hook con la misma regla escrita en la consigna. La medición más cercana es [ContextCov](https://arxiv.org/abs/2603.00822), que añade a un agente verificaciones ejecutables, entre ellas interceptaciones de comandos prohibidos, y reporta 88,3 % de conformidad frente a 67,0 % con solo `AGENTS.md`. El ejercicio del módulo sobre el sandbox, que cuenta los rechazos obtenidos por una consigna y por una barrera de seguridad en código, te da tu propia cifra sobre NÉON.

## Entregable

Este módulo produce tres piezas.

**1. La barrera de seguridad sobre los comandos** : `.pi/forbidden-commands.json` y `.pi/extensions/command-guard.ts`, extendida a la herramienta `read` para el `.env`, con al menos una regla añadida por ti tras un comando que viste lanzar al agente.

**2. La verificación de fin de trabajo** : `.pi/extensions/final-checks.ts`, cuyo array `CHECKS` contiene los comandos de tu proyecto, y no los de NÉON si lo aplicas en otro lugar.

**3. La fila «hooks» de la ficha de decisión** :

| palanca                                              | efecto observado | ¿adoptado? | por qué |
| ---------------------------------------------------- | ---------------- | ---------- | ------- |
| barrera de seguridad sobre los comandos (`tool_call`) |                  |            |         |
| misma regla escrita en `AGENTS.md`                    |                  |            |         |
| verificación final (`agent_before_settle`)            |                  |            |         |
| límite de reintentos                                  |                  |            |         |
| protección de los tests durante un reintento          |                  |            |         |

::: tip Criterio de éxito
Ante una regla que tu harness no hace respetar, sabes decir cómo verificarla. Si un comando, una ruta, un diff o un código de salida basta, es el trabajo de un hook. Si hace falta un modelo que juzgue, la verificación pasa por la inferencia y por tanto por `AGENTS.md` o un skill.
:::

## Para profundizar

- Birgitta Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) (2026), el marco de guías y sensores, calculados o por inferencia, que se usa en este módulo. Su artículo siguiente, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html), reporta una experiencia sobre los sensores de mantenibilidad y discute la elección de los hooks que los disparan.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/) (2026), sobre el lugar de los hooks en un harness y la forma de su retorno.
- Mitchell Hashimoto, [My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey) (2026), sección « Step 5: Engineer the Harness », de donde viene la expresión.
- Kent Beck, [Augmented Coding: Beyond the Vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes) (2025), sobre las señales que muestran que un agente deriva, entre ellas la eliminación de tests.
- Tim Hopper, [How to stop AI agents from bypassing pre-commit hooks](https://pydevtools.com/handbook/how-to/how-to-stop-ai-agents-from-bypassing-pre-commit-hooks/) (2026), el mejor ejemplo antes/después: una regla eludida, y luego cinco capas que la compensan.
- Zarar Siddiqi, [Don't rely on instructions, use Agent Hooks to enforce guardrails](https://zarar.dev/agent-hooks-deterministic-guardrails-for-ai-generated-code/) (2026), dos hooks probados sobre un design system, entre ellos un hook `Stop` que exige los tests.
- Matthews Wong, [Deterministic Hooks vs Agent Judgement in Claude Code](https://www.matthewswong.com/en/blog/deterministic-hooks-vs-agent-judgement/) (2026), sobre la división entre lo que decide un hook y lo que queda al juicio del agente.
- Paddo, [Claude Code Hooks: Guardrails That Actually Work](https://paddo.dev/blog/claude-code-hooks-guardrails/) (2026), que presenta los hooks como una capa de una defensa en profundidad. Los incidentes que cita provienen de otras fuentes, que hay que verificar antes de reutilizarlos.
