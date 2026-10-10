# Medir un agente: trysquare

::: tip Objetivos de este módulo
- Entender por qué una única ejecución no dice nada de una configuración
- Distinguir un test, que responde sí o no, de una evaluación, que compara comportamientos ruidosos
- Leer un escenario trysquare y saber qué decide cada una de sus secciones
- Leer una matriz: tasa de éxito, diferencia en puntos, intervalo, marca `*` o `o`
- Instalar la herramienta y verificar un plan de experimento sin gastar un token
:::

En el acto 2, reconstruiste cada pieza y la probaste a mano: lanzabas el agente una o dos veces, leías la sesión y el diff, y sacabas una impresión. Esta forma de hacer las cosas basta para ver qué cambia una pieza en el desarrollo de una sesión, pero no permite decir si una configuración lo hace mejor que otra, porque dos ejecuciones estrictamente idénticas no dan el mismo resultado.

Aquí tienes seis ejecuciones de la misma configuración sobre la issue #1 de NÉON, la que el [módulo 2.1](./act2-contexte) llama la petición descuidada: mismo modelo, mismo esfuerzo de razonamiento, mismo prompt, mismo repositorio en el mismo commit.

| ejecución          | 1      | 2      | 3      | 4       | 5      | 6       |
| ------------------ | ------ | ------ | ------ | ------- | ------ | ------- |
| tokens de entrada  | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| turnos             | 4      | 5      | 4      | 4       | 5      | 4       |
| duración           | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterio alcanzado | sí     | sí     | sí     | **no**  | sí     | **no**  |

El coste varía en menos de un cuarto, el número de turnos toma dos valores, y la respuesta cambia una de cada tres veces. Una única ejecución de esta configuración te habría dado, según el sorteo, «la base corrige el bug» o «la base no lo corrige». La dispersión también puede afectar al coste en lugar de a la respuesta: la configuración mejor equipada del [módulo 3.1](./act3-contexte) consume entre 42 731 y 2 420 677 tokens de entrada según la ejecución, es decir, una amplitud de **×57**.

Los módulos de este acto miden, por tanto, las palancas del acto 2 con una herramienta que repite cada configuración y tiene en cuenta esta dispersión.

## Definición de la herramienta

### ¿Un test o una evaluación?

Un test responde sí o no a una pregunta cerrada: `npm test` pasa, o no pasa. El test es reproducible. Una evaluación compara comportamientos sobre una misma tarea, repitiendo cada configuración y sabiendo que la medida tiene ruido. Las dos se combinan, ya que una evaluación se apoya casi siempre en tests para puntuar cada ejecución, pero no responden a la misma pregunta: el test dice si ese diff corrige el bug, la evaluación dice si esta configuración de harness hace que el bug se corrija más a menudo que otra.

### ¿Qué es trysquare?

[trysquare](https://github.com/AI-for-dev/trysquare) es una herramienta escrita en Python y concebida para esta formación. Lanza las configuraciones de un escenario, puntúa cada ejecución, agrega las puntuaciones y produce una síntesis de los resultados. No sabe nada de NÉON, nada del issue #1, nada de esta formación: todo lo propio de una experiencia se describe en un archivo de escenario y un conjunto de validaciones que invoca. Su nombre en inglés designa la escuadra del carpintero, que sirve para verificar que un ensamblaje está recto, y la herramienta sirve de la misma manera para verificar que una diferencia medida se debe al remuestreo.

::: info ¿Por qué trysquare en lugar de Inspect o Harbor ?
Herramientas de evaluación más maduras ya saben repetir una ejecución, y algunas extraen de ello una incertidumbre. [Inspect](https://inspect.aisi.org.uk/), el framework del AI Security Institute británico, reproduce cada muestra con `--epochs`, agrega las repeticiones (`mean`, `pass_at_k`, `at_least_k`) y publica un error estándar, y su paquete [Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/) hace correr Claude Code, Codex CLI, Gemini CLI u OpenCode en un sandbox. [Harbor](https://github.com/harbor-framework/harbor), escrito por el equipo de Terminal-Bench, lanza agentes sobre tareas en contenedores con `--n-attempts`, resume los intentos con una media, sin intervalo, y reparte la carga entre proveedores de sandbox remotos como Daytona o Modal.

trysquare hoy solo controla Pi y se instala con [uv](https://docs.astral.sh/uv/). Cada ejecución parte de un clon desechable del repositorio en un tag fijo, y el agente corre a elección directamente en la máquina, lo que cabe en un portátil en aula, en un sandbox [bubblewrap](https://github.com/containers/bubblewrap) bajo Linux, o en un contenedor Docker construido a partir de la imagen que declara el escenario. En estos dos últimos casos, la clave del proveedor nunca entra en el sandbox: un relé lanzado en la máquina la sustituye en cada petición. trysquare se centra sobre todo en la cuestión que estas herramientas dejan abierta: ¿la diferencia medida entre dos configuraciones es real? Mantiene la tarea fija y hace variar el harness (prompt, `AGENTS.md`, system prompt, razonamiento, competencias), y una configuración puede incluso lanzar un flow [combo](https://github.com/AI-for-dev/combo) entero. El proveedor, el modelo, el nivel de razonamiento y el número de repeticiones son obligatorios en el escenario y nunca se heredan de la máquina. trysquare también lee los registros de sesión de Pi para puntuar el procedimiento seguido además del resultado, y `replay --rescore` vuelve a puntuar las ejecuciones ya pagadas tras una corrección de los pasos de validación.
:::

## Uso de trysquare

### ¿Qué contiene un escenario ?

Una experiencia cabe en un archivo TOML autónomo, el **escenario**, que describe la tarea, las configuraciones a comparar, el protocolo y la forma de puntuar. Aquí tienes un escenario reducido, que compara la petición descuidada con una petición encuadrada y con la adición de un `AGENTS.md`:

```toml
[scenario]
name = "regle-contre-ticket"
title = "Un fichier de règles contre un ticket bien écrit"
hypothesis = "hypothese.md"       # écrite avant de mesurer

[task]
repo = "neon"                     # nom logique, résolu par trysquare.toml
etalon = "etalon-v1"              # un tag, cloné ; jamais l'arbre de travail
prompt = "briques/demande-negligee.md"

[agent]
provider = "ilaas"                # obligatoire, jamais hérité
model = "gemma-4-31b"             # obligatoire
thinking = "off"                  # obligatoire

[protocol]
repetitions = 20                  # déclaré à l'avance
concurrency = 5
timeout = 900

[variants.nothing]                # la base, sans aucun delta

[variants."+agents"]
context = "briques/AGENTS.md"     # déposé dans le clone

[variants."+well_crafted"]
prompt = "briques/demande-cadree.md"

[[validation]]
mode = "script"
command = "validateurs/noter.py"
metrics = ["delivered", "in_scope", "suite_lancee"]   # un contrat

[verdict]
criterion = "in_scope"
reference = "nothing"
```

Cada **configuración**, o celda de la matriz, solo declara lo que la distingue de la base, lo que hace que el escenario se lea de un vistazo: `+agents` añade un archivo de reglas, `+well_crafted` reemplaza el prompt, y el resto es común. Para un plan regular, trysquare también acepta una grilla de ejes cuyo producto calcula, pero las variantes nombradas bastan en cuanto cada configuración cambia una sola cosa.

Las rutas de máquina, es decir, la dirección del repositorio medido y el directorio donde viven los clones, están en un segundo archivo, `trysquare.toml`. Este archivo rechaza al cargar cualquier clave que decidiría lo que se mide, como el modelo o el esfuerzo de razonamiento, para que el mismo escenario mida lo mismo en todas las máquinas.

::: warning Cada ejecución trabaja sobre un clon desechable
Si el dispositivo trabajara directamente en el árbol de trabajo, cada ejecución modificaría el repositorio y la siguiente mediría esas modificaciones en lugar de la configuración. Por eso trysquare clona el repositorio **en el tag declarado**, en un directorio temporal, en cada ejecución, deposita allí los archivos de la configuración y luego lanza el agente.
:::

### ¿Qué es una validación?

Una **validación** es un ejecutable, en el lenguaje que elijas, que recibe la ruta de un archivo `context.json` que describe la ejecución (el clon, el diff, la sesión del agente) y escribe en su salida estándar un objeto JSON con dos campos: `metrics`, los valores medidos, y `reasons`, la justificación de cada uno. El tipo de una métrica decide su agregación: un booleano se convierte en una tasa de éxito y un número en una mediana.

La lista `metrics` del escenario es un contrato: una validación que omite una métrica declarada vuelve la ejecución inválida en lugar de puntuarla como falsa. El campo `reasons` es opcional, y nosotros siempre lo rellenamos, porque una columna uniformemente a cero se parece a un comportamiento del agente y puede igual de bien ser un defecto de la validación. El [módulo 3.1](./act3-contexte) muestra un ejemplo, donde la forma del comando `npm test` cambia de un modelo a otro.

El archivo `context.json` se archiva con la ejecución, lo que permite volver a puntuar una matriz ya pagada después de corregir una validación, sin relanzar el modelo.

::: info ¿Y cuando ningún script sabe puntuar?
Un escenario también puede declarar un **juez**, es decir, un modelo que lee piezas elegidas de la ejecución (el prompt, la respuesta final, el diff) y emite su veredicto a través de una herramienta cuyos parámetros son las métricas declaradas. El juez no conoce el nombre de la configuración que puntúa, y debe ser un modelo distinto del que se evalúa. Su veredicto sigue siendo probabilista y cuesta tokens en cada puntuación, así que trysquare no lo vuelve a ejecutar en una repuntuación. Preferimos una prueba ejecutable siempre que el criterio se preste a ello.
:::

### ¿Qué produce una matriz?

Una matriz escribe un directorio por experimento, cuyo nombre lleva el escenario, el estándar, el proveedor, el modelo y el número de repeticiones:

```
results/issue1-contexte_etalon-v1_ilaas_gemma-4-31b_n20/
  state.json        configurations, exécutions valides, vides ou en échec, reprises
  measures.json     une ligne par exécution
  synthesis.md      scores, coûts, écarts et verdicts
  synthesis.html    la même synthèse en page autonome, liée aux sessions
  runs/<configuration>/<id>/
    configuration.json   le cadre de l'exécution : modèle, harnais, validations
    diff.patch           ce que l'agent a modifié dans le dépôt
    validation/          la sortie de chaque validation, raisons comprises
    session/*.jsonl      la session de l'agent, un fichier par tentative
```

Relanzar el mismo experimento sobrescribe este directorio, y es git quien conserva las versiones anteriores. Un directorio con marca temporal por lanzamiento acumularía las variantes de un mismo experimento entre las que terminaríamos eligiendo la que conviene.

### ¿Cómo leer una diferencia?

Las tablas de trysquare hablan en **puntos**, en el sentido de puntos de porcentaje de éxito. Si una configuración alcanza el criterio 18 veces de 20, es decir, el 90 %, y la base 11 veces de 20, es decir, el 55 %, la diferencia vale **+35 puntos**. Solo cuentan las ejecuciones válidas, lo que explica que un denominador pueda ser inferior al número de repeticiones.

Para cada diferencia, la herramienta remuestrea las ejecuciones de ambas configuraciones diez mil veces, con una semilla fija para que el cálculo se rehaga de forma idéntica, y extrae un intervalo al 95 %. Leer una diferencia equivale entonces a plantear una sola pregunta: **¿este intervalo contiene el cero?** Si no lo contiene, la diferencia se marca con `*` y queda **establecida**. Si lo contiene, se marca con `o` y **no es concluyente**, sea cual sea el valor del centro, y la herramienta no conoce un tercer estado.

El intervalo también indica la precisión de una diferencia establecida. Los +35 puntos del ejemplo vienen con un intervalo de +10 a +60: la ganancia es ciertamente positiva, sin que se pueda decir si vale diez puntos o sesenta. Por el contrario, una diferencia de +17 puntos cuyo intervalo contiene el cero sigue siendo compatible con una palanca que ayuda como con una palanca que perjudica. Los `o` se muestran de todos modos, con un recordatorio bajo cada tabla: ninguna conclusión puede apoyarse en ellos.

El número de repeticiones depende de lo que busques. **Tres bastan para ver la dispersión**, que es el objetivo en el aula. **Desempatar dos palancas cercanas exige muchas más**, y las columnas que cuentan éxitos son las más exigentes: un 2/3 contra 3/3 no dice casi nada, mientras que un 8/20 contra 20/20 se defiende. Las campañas publicadas en este acto están a veinte repeticiones por esta razón.

::: warning Una duración solo se compara dentro de una matriz
trysquare entrelaza las ejecuciones de las distintas configuraciones, en lugar de jugar veinte veces la primera y luego veinte veces la siguiente, para que todas soporten la misma carga del proveedor. Dos matrices lanzadas en momentos diferentes no tienen esta garantía, y sus columnas de duración no se comparan.
:::

::: info Ejercicio (en el aula)
Debes tener [uv](https://docs.astral.sh/uv/getting-started/installation/) y Pi instalados para continuar.

Hemos extraído los experimentos de este acto a un repositorio dedicado, fuera de los materiales de formación: [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter).

```bash
git clone https://github.com/AI-for-dev/trysquare-starter
cd trysquare-starter
uv sync
```

Abre `trysquare.toml`, luego `scenarios/issue1-contexte.toml`, y encuentra en el segundo la tarea, el modelo, el número de repeticiones, las configuraciones y las validaciones. Verifica después el escenario de extremo a extremo, incluidos los archivos y las precondiciones, y luego muestra el plan completo de la matriz. Ninguno de estos dos comandos llama a un modelo:

```bash
uv run trysquare validate scenarios/issue1-contexte.toml
uv run trysquare run scenarios/issue1-contexte.toml --output results --dry-run
```

Cuenta las ejecuciones que anuncia el plan y estima cuánto costarían en tiempo, a partir de las duraciones de la tabla al inicio de este módulo. Ese cálculo decide el número de repeticiones que lanzarás en el módulo siguiente.
:::

Los otros subcomandos trabajan sobre una matriz ya medida y tampoco llaman a un modelo: `render` rehace las tablas, posiblemente contra otra referencia, `replay --rescore` vuelve a puntuar las ejecuciones archivadas tras una corrección de validación, `compare` pone dos matrices una al lado de la otra rechazando lo que no es comparable, y `watch` sigue en el navegador una matriz en curso y la sesión de cada ejecución mientras el agente la escribe.

## Para profundizar

- La [documentación de trysquare](https://ai-for-dev.github.io/trysquare/), en particular sus páginas sobre la escritura de un escenario, la escritura de una validación y los invariantes de medida.
- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), el repositorio de ejercicios de este acto.
- [Inspect](https://inspect.aisi.org.uk/) y [Harbor](https://github.com/harbor-framework/harbor), los frameworks de evaluación que hay que tomar cuando la pregunta trata sobre un modelo o un agente frente a un conjunto de tareas, y no sobre una variante de harness.
