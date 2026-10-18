# Las palancas del contexto, medidas

::: tip Objetivos de este módulo
- Saber qué palancas del contexto hace variar la matriz `issue1-context`
- Leer los resultados de tres modelos sobre la misma tarea, a veinte repeticiones por configuración
- Verificar el estado de una campaña antes de citar sus cifras
- Distinguir lo que depende de la palanca de lo que depende del modelo
:::

En el [módulo 2.1](./act2-contexte), manipulaste a mano las palancas que llenan la ventana de contexto: el prompt, el razonamiento, los archivos que el agente encuentra en el repositorio. Una o dos ejecuciones bastaban para ver qué cambia una palanca en la sesión, pero no para saber si ese cambio se reproduce. El [módulo 3.0](./act3-trysquare) te presentó después [trysquare](https://github.com/AI-for-dev/trysquare), que repite cada configuración y dice si una diferencia se debe al azar del muestreo.

Este módulo junta las dos cosas. Retomamos la issue #1 de NÉON, cruzamos cuatro palancas y hacemos girar la matriz completa sobre tres modelos. La pregunta es doble: qué palancas cambian realmente el resultado, y si la respuesta es la misma de un modelo a otro.

## El experimento

### La tarea

La issue #1 es la que conoces: la bola atraviesa los ladrillos en lugar de rebotar.

El comentario `BUG (#1)` de `game/neon.js` describe la corrección básica: hacer rebotar la bola según la cara golpeada y luego sacarla del rectángulo del ladrillo. `ISSUES.md` retoma esa corrección y añade todo lo demás: la esquina del ladrillo, la unión entre dos ladrillos vecinos, el tunneling de una bola rápida, y la petición de escribir primero los tests rojos. Un agente que no ha leído `ISSUES.md` no tiene por tanto ninguna razón para tratar las esquinas, y esa diferencia explica la mayoría de los resultados que siguen.

### Qué cuenta como éxito

Cada ejecución se puntúa sin LLM-as-a-judge. Una sonda, `probe.test.js`, se deposita al final en una copia del árbol del agente: coloca una bola contra un ladrillo, llama a `frame()` y mira qué componente de la velocidad se invierte. Las demás métricas se leen en la sesión o en el diff.

| métrica                | lo que dice                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `delivered`            | el agente ha modificado al menos un archivo                                            |
| `suite_run`            | ha lanzado `npm test` por su cuenta                                                    |
| `tests_added`          | la suite tiene más casos que al principio                                              |
| `probe_intact`         | cuando se le dio la sonda, no la modificó                                              |
| **`bounce_bricks`**    | **el criterio**: en cada una de las cuatro caras, el eje tocado se invierte y el otro no |
| `bounce_corners`       | en la esquina, los dos componentes se invierten                                        |
| `bounce_exit`          | tras el rebote, la bola ha salido del rectángulo del ladrillo                          |
| `bounce_neighbors`     | en la unión de dos ladrillos, el rebote solo se aplica una vez                         |
| `bounce_tunneling`     | una bola rápida ya no atraviesa el ladrillo sin tocarlo                                |

En lo que sigue, nos centramos en cuatro columnas: el criterio, la esquina, el tunneling y los tests añadidos. `bounce_exit` y `bounce_neighbors` siguen de cerca el criterio y no aportan gran cosa más aquí.

### Las cuatro palancas

Hemos conservado cuatro palancas, cada una con dos valores:

| palanca      | sin                                          | con                                                                      |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------ |
| el ticket    | `nothing`: la petición descuidada            | `well_crafted`: un ticket que remite a la issue y fija el alcance        |
| `blind`      | `no-blind`: el repositorio tal cual          | `blind`: ni historial de git ni `ISSUES.md`                              |
| razonamiento | `off`                                        | `thinking_medium`                                                        |
| `add_tests`  | `no-add_tests`                               | `add_tests`: la sonda se coloca en `game/probe.test.js` desde el principio |

La petición descuidada cabe en una línea:

```
The ball goes through the bricks instead of bouncing. Fix that.
```

El ticket bien redactado no copia `ISSUES.md`. Dice dónde está la descripción, pide pensar en las distintas interacciones posibles y fija el alcance y el criterio de parada:

```
The ball goes through the bricks instead of bouncing. The problem and the
expected behaviour are described in `ISSUE.md`, under issue #1. Read the code
carefully and think about the different interactions the ball can have with
the bricks. The behaviour must be worthy of the best arcade games. Only modify
`game/neon.js` and `game/neon.test.js`. You are done when `npm test` passes and
the already exported functions have kept their name and their signature.
```

`blind` elimina el historial de git y borra `ISSUES.md` antes de que arranque el agente. Solo queda entonces el comentario del código. `add_tests` le da al agente el propio archivo que lo evalúa, lo que equivale a darle los tests que nos gustaría ver pasar.

Un fichier `AGENTS.md` de cuatro líneas (un ticket a la vez, no renombrar los exports, cero dependencias, lanzar los tests con `npm test`) está presente en todas las configuraciones. Por lo tanto, no es una palanca de esta matriz.

Las cuatro palancas se cruzan, lo que da 2 × 2 × 2 × 2 = 16 configuraciones. Cada una se repite veinte veces, es decir, 320 ejecuciones por modelo. En el escenario, este plan cabe en unas pocas líneas:

```toml
[presets]
well_crafted = { prompt = "../materials/issue1-well-crafted-prompt.md" }
add_tests = { harness = ["provided-probe"] }
blind = { history = false, setup = "../materials/remove-issues-md.sh" }
thinking_medium = { thinking = "medium" }

[axes]
lever = ["nothing", "well_crafted"]
blind = ["no-blind", "blind"]
thinking = ["off", "thinking_medium"]
add_tests = ["no-add_tests", "add_tests"]
```

::: warning Observaciones
Queríamos aclarar varios puntos que podrían parecer errores, pero que son intencionados.

1. El ticket bien redactado remite a `ISSUE.md`, mientras que el archivo se llama `ISSUES.md`. Es intencionado: queremos ver si el modelo busca o si se detiene ahí y no usa el archivo.
2. En `blind`, apunta a un archivo que ya no existe, lo que permite ver hasta qué punto el modelo es curioso:
   - ir a mirar los directorios vecinos
   - intentar recuperar el historial git que se reinició
   - ...
    y en qué momento lo deja estar.
3. `add_tests` le da al agente el archivo que lo evalúa. La idea es ver cómo evolucionan los resultados si ya tenemos los tests. Puedes verlo como un desarrollo [TDD](https://en.wikipedia.org/wiki/Test-driven_development).
4. `thinking_medium` no corresponde al mismo ajuste de un modelo a otro (ver la tabla de los modelos).
:::

### Los modelos

Los tres modelos los sirven dos proveedores, ILaaS y GRICAD:

| modelo                | proveedor | qué significa `thinking_medium`                 | techo de salida |
| --------------------- | --------- | ---------------------------------------------- | --------------- |
| `gemma-4-31b`         | ILaaS       | `reasoning_effort = on`                        | 16 384 tokens   |
| `qwen-3.8-27b`        | ILaaS/GRICAD      | `reasoning_effort = medium`                    | 32 768 tokens   |
| `DeepSeek-V4.1-Flash` | GRICAD      | `reasoning_effort = medium`                    | 32 768 tokens   |

Las tres campañas se lanzaron los días 13 y 14 de octubre de 2026, contra la etiqueta `etalon-v1` de NÉON, con un timeout de 30 minutos por ejecución. El modelo y el proveedor cambian juntos de una columna a otra: una diferencia entre dos modelos puede venir de uno como del otro. Los resultados en bruto de las tres campañas, incluidas las sesiones del agente, están en los directorios `resultats/issue1-context_*` del [archivo Zenodo del acto](https://doi.org/10.5281/zenodo.23452689).

::: info Ejercicio (en el aula, luego en autonomía)
Sitúate en el repositorio [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) instalado en el [módulo 3.0](./act3-trysquare). Abre `scenarios/issue1-context.toml`, adapta la sección `[agent]` al proveedor que uses y lanza la matriz con tres repeticiones:

```bash
uv run trysquare run scenarios/issue1-context.toml --output results --repetitions 3
```

Eso son 48 ejecuciones, que puedes dejar corriendo mientras sigues con el módulo. Los siguientes subcomandos no llaman al modelo y sirven para analizar los resultados:

```bash
# refabriquer les tables
uv run trysquare render scenarios/issue1-context.toml --output results --repetitions 3
# renoter sans rejouer
uv run trysquare replay results/issue1-context_... --scenario scenarios/issue1-context.toml --rescore
# joindre deux matrices
uv run trysquare compare results/... results/...
```

**Por tu cuenta**, cambia de modelo en `[agent]` y compara tu matriz con las nuestras, que encontrarás en el archivo Zenodo.
:::

## ¿Se puede confiar en las campañas?

Antes de mirar una sola puntuación, hay que verificar que las ejecuciones se desarrollaron con normalidad. El [módulo 3.0](./act3-trysquare) lo mostró: un incidente en el proveedor o un defecto de la validación se lee fácilmente como un comportamiento del agente.

|                                         | gemma   | qwen    | DeepSeek |
| --------------------------------------- | ------- | ------- | -------- |
| ejecuciones sin ningún archivo modificado    | 3       | 18      | 1        |
| ejecuciones detenidas por el timeout      | 25      | 181     | 1        |
| reintentos del lado del proveedor               | 974     | 9       | 0        |
| sonda dejada intacta (celdas `add_tests`) | 160/160 | 158/160 | 160/160 |
| caudal mediano de salida                  | 21 tokens/s | 8 tokens/s | 49 tokens/s |

DeepSeek está limpio: ningún reintento, una sola ejecución cortada por el timeout.

gemma es aprovechable, pero ILaaS fue inestable durante la medición: más de 1 200 errores `Stream ended without finish_reason`, absorbidos por 974 reintentos. Un reintento vuelve a ejecutar el turno con todo el contexto acumulado, de modo que las columnas de coste de gemma no son legibles. Los 25 timeouts se puntúan sobre un árbol parcial y se concentran en las celdas con razonamiento o ticket bien redactado, lo que las penaliza un poco.

qwen exige la mayor prudencia. Una primera campaña en ILaaS fue en parte inaprovechable: sin límite de salida declarado, el razonamiento llenaba los 16 384 tokens por defecto en un solo turno, y 23 ejecuciones entraban en bucle (`-\n-\n-\n…`) desde los primeros turnos. La relanzamos en GRICAD con un límite de 32 768 tokens, y esos dos problemas desaparecieron. El proveedor, en cambio, es lento, y más de la mitad de las ejecuciones alcanzan el timeout de 30 minutos, a veces después de solo tres turnos porque una llamada nunca regresa. Esas ejecuciones se puntúan sobre el estado del árbol en el momento del corte. Las cifras de qwen dicen, por tanto, lo que obtiene en 30 minutos con ese proveedor.

::: tip Nuestra convención de cálculo
Todas las cifras de esta página se dan sobre las veinte ejecuciones de cada configuración: una ejecución que no entregó nada cuenta como un fallo. La síntesis de trysquare quita esas ejecuciones del denominador, lo que oculta las caídas de un modelo como qwen.
:::

## Los resultados

### Configuración por configuración

Cada cuadrícula reúne las dieciséis configuraciones de un modelo. Las filas cruzan el ticket y la presencia de `ISSUES.md`, las columnas cruzan el razonamiento y la sonda, y cada casilla cuenta las ejecuciones exitosas sobre veinte. La elección de colores permite ver rápidamente lo que sale bien y lo que falla: cuanto más resalta una casilla sobre el fondo, más ha acertado el modelo. Es en la esquina del bloque donde las filas y las columnas que cambian de golpe resultan más nítidas.

```chart
issue1-matrix
```

::: details Las mismas cifras en tabla
Cada celda da, sobre veinte ejecuciones: `bounce_bricks / bounce_corners / bounce_tunneling / tests_added`.

| ticket         | `blind` | razonamiento | sonda | gemma         | qwen          | DeepSeek      |
| -------------- | ------- | ------------ | ----- | ------------- | ------------- | ------------- |
| `nothing`      | no      | off          | no    | 8 / 0 / 0 / 0     | 12 / 12 / 1 / 16  | 20 / 19 / 19 / 19 |
| `nothing`      | no      | off          | sí    | 16 / 12 / 9 / 0   | 16 / 16 / 7 / 0   | 20 / 20 / 20 / 2  |
| `nothing`      | no      | medium       | no    | 18 / 0 / 1 / 12   | 14 / 4 / 5 / 14   | 20 / 20 / 20 / 20 |
| `nothing`      | no      | medium       | sí    | 20 / 19 / 10 / 7  | 18 / 18 / 18 / 1  | 20 / 20 / 20 / 0  |
| `nothing`      | sí      | off          | no    | 13 / 0 / 0 / 0    | 13 / 0 / 0 / 8    | 19 / 0 / 0 / 7    |
| `nothing`      | sí      | off          | sí    | 15 / 10 / 6 / 0   | 10 / 10 / 7 / 0   | 20 / 20 / 20 / 0  |
| `nothing`      | sí      | medium       | no    | 19 / 0 / 0 / 11   | 19 / 0 / 0 / 10   | 19 / 0 / 1 / 10   |
| `nothing`      | sí      | medium       | sí    | 19 / 17 / 9 / 10  | 20 / 20 / 17 / 5  | 20 / 20 / 20 / 0  |
| `well_crafted` | no      | off          | no    | 17 / 16 / 3 / 16  | 8 / 9 / 7 / 15    | 20 / 20 / 20 / 20 |
| `well_crafted` | no      | off          | sí    | 18 / 17 / 16 / 0  | 16 / 16 / 8 / 10  | 20 / 20 / 20 / 20 |
| `well_crafted` | no      | medium       | no    | 16 / 17 / 13 / 20 | 8 / 8 / 8 / 12    | 19 / 19 / 19 / 19 |
| `well_crafted` | no      | medium       | sí    | 18 / 17 / 18 / 16 | 15 / 15 / 14 / 14 | 20 / 20 / 20 / 20 |
| `well_crafted` | sí      | off          | no    | 15 / 0 / 0 / 13   | 12 / 1 / 4 / 18   | 19 / 5 / 18 / 20  |
| `well_crafted` | sí      | off          | sí    | 18 / 16 / 11 / 0  | 13 / 13 / 6 / 4   | 20 / 20 / 20 / 17 |
| `well_crafted` | sí      | medium       | no    | 18 / 0 / 0 / 20   | 14 / 1 / 2 / 18   | 19 / 4 / 12 / 20  |
| `well_crafted` | sí      | medium       | sí    | 19 / 19 / 19 / 9  | 18 / 16 / 16 / 16 | 20 / 20 / 20 / 9  |
:::

### El efecto de cada palanca

Como las palancas están cruzadas, se mide el efecto medio de cada una comparando las 160 ejecuciones que la tienen con las 160 que no, con las otras tres palancas repartidas de la misma forma en ambos lados. Cada símbolo da la diferencia en puntos porcentuales, y su trazo el intervalo al 95 % obtenido por remuestreo. Un símbolo lleno tiene un intervalo que excluye el cero, un símbolo hueco no (sin corrección por comparaciones múltiples). Los cuatro paneles comparten la misma escala, de modo que la longitud de una diferencia se compara de una palanca a otra.

```chart
issue1-effects
```

::: details Las mismas cifras en tabla
La diferencia va seguida de su intervalo al 95 %. `*` señala un intervalo que excluye el cero.

| palanca | métrica | gemma | qwen | DeepSeek |
| --- | --- | --- | --- | --- |
| `add_tests` | `bounce_bricks` | +12 \* [+4, +20] | +16 \* [+6, +26] | +3 \* [+1, +6] |
|  | `bounce_corners` | +59 \* [+49, +68] | +56 \* [+46, +64] | +46 \* [+38, +53] |
|  | `bounce_tunneling` | +51 \* [+42, +59] | +41 \* [+31, +51] | +32 \* [+25, +39] |
|  | `tests_added` | -31 \* [-41, -21] | -38 \* [-48, -28] | -42 \* [-51, -32] |
| `well_crafted` | `bounce_bricks` | +7 [-1, +15] | -11 \* [-21, -2] | -1 [-4, +2] |
|  | `bounce_corners` | +27 \* [+17, +38] | -1 [-11, +10] | +6 [-4, +15] |
|  | `bounce_tunneling` | +28 \* [+18, +38] | +6 [-4, +17] | +18 \* [+11, +26] |
|  | `tests_added` | +34 \* [+23, +44] | +33 \* [+22, +44] | +54 \* [+46, +63] |
| razonamiento | `bounce_bricks` | +17 \* [+9, +25] | +16 \* [+6, +26] | -1 [-3, +2] |
|  | `bounce_corners` | +11 \* [+1, +22] | +3 [-8, +14] | -1 [-10, +9] |
|  | `bounce_tunneling` | +16 \* [+6, +26] | +25 \* [+15, +35] | -3 [-11, +5] |
|  | `tests_added` | +48 \* [+38, +56] | +12 \* [+1, +23] | -4 [-15, +6] |
| `blind` | `bounce_bricks` | +3 [-4, +11] | +8 [-3, +17] | -2 [-5, +1] |
|  | `bounce_corners` | -23 \* [-33, -12] | -23 \* [-34, -12] | -43 \* [-51, -35] |
|  | `bounce_tunneling` | -16 \* [-26, -5] | -10 [-21, 0] | -29 \* [-37, -22] |
|  | `tests_added` | -5 [-16, +6] | -2 [-12, +9] | -23 \* [-33, -13] |
:::

### Lo que retenemos de esto

**El criterio separa sobre todo los modelos.** DeepSeek logra `bounce_bricks` en 315 ejecuciones de 320, sea cual sea la configuración: no queda margen para medir una palanca en esa columna. gemma está en 267 de 320 y qwen en 226. Las palancas se leen en los casos difíciles (la esquina, el tunneling) y en los tests añadidos.

**La sonda es la única palanca que ayuda a los tres modelos.** Con `add_tests`, la esquina se resuelve en el 79 % de las ejecuciones con gemma, el 78 % con qwen y el 100 % con DeepSeek, y el tunneling también sube en los tres modelos. La contrapartida es la misma en todas partes: el agente ya no escribe sus propios tests, con una caída de 31 a 42 puntos en `tests_added`. Tiene los casos delante y ya no tiene motivo para reescribirlos. Solo dos ejecuciones de 480 tocaron la sonda, ambas en qwen.

**El ticket bien redactado hace que se escriban pruebas.** `tests_added` gana entre 33 y 54 puntos en los tres modelos. En gemma, también mejora la esquina y el tunneling, porque es lo que lo envía a leer `ISSUES.md`. En DeepSeek, la frase « think about the different interactions… worthy of the best arcade games » basta para hacer que se trate el tunneling incluso sin `ISSUES.md` (18/20 en `blind` frente a 0/20 con la petición descuidada), pero no la esquina (5/20). En qwen, el ticket bien redactado hace bajar el criterio 11 puntos. La bajada se concentra allí donde `ISSUES.md` está presente y donde falta la sonda (8/20 con o sin razonamiento), y las 24 ejecuciones que fallan ahí alcanzaron todas el timeout: qwen lee `ISSUES.md`, se lanza a una larga investigación, escribe pruebas, y ya no tiene tiempo de terminar la corrección.

**El razonamiento ayuda a gemma y qwen, y no cambia nada en DeepSeek.** gemma gana 17 puntos en el criterio y 48 en las pruebas añadidas. qwen gana 16 puntos en el criterio y 25 en el tunneling, en parte porque el razonamiento sustituye sus largas series de simulaciones y hace que alcance el timeout con menos frecuencia (54 ejecuciones de 160 frente a 127 sin razonamiento). DeepSeek ya está en el techo: el razonamiento solo le cuesta tiempo, 482 segundos de mediana frente a 335.

**`blind` solo cuesta lo que aporta `ISSUES.md`, y solo a los modelos que lo leen.** En el criterio, quitar `ISSUES.md` y el historial no cambia nada, sea cual sea el modelo, porque el comentario del código basta. En la esquina, el efecto depende de la propensión del modelo a ir a leer ese archivo sin que se lo pidan:

| esquinas superadas, sin sonda | petición descuidada: con → sin `ISSUES.md` | ticket bien redactado: con → sin `ISSUES.md` |
| ----------------------------- | ------------------------------------------ | -------------------------------------------- |
| gemma                         | 0/40 → 0/40                                | 33/40 → 0/40                                 |
| qwen                          | 16/40 → 0/40                               | 17/40 → 2/40                                 |
| DeepSeek                      | 39/40 → 0/40                               | 39/40 → 9/40                                 |

Con la petición descuidada, gemma solo abre `ISSUES.md` en 2 ejecuciones de 80: quitarlo no le cuesta nada. qwen lo abre en 58 ejecuciones de 80, DeepSeek en 79, y ambos pierden la esquina en cuanto desaparece.

**El historial de git no aporta nada.** qwen y DeepSeek lo consultan, DeepSeek hasta llegar a lanzar `git log` y `git show` en la mayoría de las ejecuciones `blind`, y ninguno de los dos saca de ahí información útil.

## ¿Cómo trabajan los modelos?

Las sesiones muestran cómo llega cada modelo a sus resultados, lo que explica que una misma palanca no tenga el mismo efecto en todas partes.

::: info Método
Cada sesión se reduce a una secuencia de acciones (leer un archivo, abrir `ISSUES.md`, ejecutar `npm test`, modificar `neon.js`, escribir un test, ejecutar un script de simulación…). Estas clasificaciones se basan en expresiones regulares: son tendencias, no medidas.
:::

|                                                                   | gemma | qwen  | DeepSeek |
| ----------------------------------------------------------------- | ----- | ----- | -------- |
| llamadas a herramientas (mediana), configuración base             | 5     | 27    | 22       |
| misma configuración, en `blind`                                   | 5     | 9     | 11       |
| abre `ISSUES.md` con la petición descuidada                       | 2/80  | 58/80 | 79/80    |
| duración mediana sin razonamiento / con                           | 269 s / 556 s | 1 800 s / 1 422 s | 335 s / 482 s |

### gemma hace lo que se le muestra

Con la petición descuidada y sin sonda, 35 ejecuciones de 40 siguen exactamente el mismo camino: `ls -R`, leer `neon.js`, `npm test`, aplicar el parche descrito en el comentario, `npm test`. Estas cinco llamadas tardan unos cuarenta segundos y no añaden ningún test. Es el único comportamiento realmente determinista de los tres modelos.

Cada palanca desencadena después un comportamiento reconocible. El ticket bien redactado, con `ISSUES.md` presente, produce TDD en 18 a 20 ejecuciones de 20, con tests en rojo escritos antes del parche. La sonda se descubre al ejecutar los tests: gemma ve el fallo, lee la sonda y encadena los arreglos. El razonamiento añade simulaciones y hace que los caminos sean todos distintos. Su punto débil aparece cuando el prompt remite a un archivo ausente: en `well_crafted / blind / off / add_tests`, 18 ejecuciones de 20 se convierten en largos bucles de corrección, con unas cuarenta llamadas y una decena de modificaciones de `neon.js`.

### qwen explora y depura mediante simulación

Sin razonamiento, qwen escribe scripts desechables, mira las velocidades de la bala, retoca `neon.js` y vuelve a empezar. Los caminos son todos distintos, pero el método sigue siendo el mismo. Es costoso en tiempo, y con un proveedor lento a menudo lleva al timeout. qwen también olvida a veces sus archivos de depuración en el árbol, lo que hace fallar `in_scope`, la métrica que verifica que el agente solo haya tocado los archivos autorizados.

Es `ISSUES.md` lo que lanza la larga investigación. En `blind`, la sesión base pasa de 27 a 9 llamadas a herramientas y qwen se conforma con el parche del comentario. Con el razonamiento, las simulaciones se vuelven raras: qwen reflexiona en lugar de probar, y termina dentro del tiempo con más frecuencia.

### DeepSeek trabaja como un desarrollador metódico

DeepSeek lee todo el contexto disponible sin que se lo pidamos, `ISSUES.md` incluido, y usa git como un desarrollador (`git diff`, `git status`, `git log`). Sigue las indicaciones de `ISSUES.md` sin que se las recordemos: en la configuración base, 15 de cada 20 ejecuciones escriben los tests en rojo antes de corregir, y 19 de cada 20 tratan la esquina, las uniones y el tunneling.

Cuando la sonda está presente, la lee ya en la exploración, antes incluso de lanzar los tests, y la corrección se vuelve corta y directa. Casi siempre verifica su trabajo, relanzando los tests tras su última modificación en 317 de cada 319 ejecuciones, y produce las correcciones más completas, con 147 líneas añadidas a `neon.js` como mediana cuando tiene la sonda.

## Generalizar

El camino que sigue el agente predice mal el resultado. En cada uno de los tres modelos, la tasa de éxito del criterio varía poco de un tipo de sesión a otro. Lo que decide la esquina y el tunneling es la información que el agente ha leído: `ISSUES.md` o la sonda.

Lo que más separa a los modelos es su tendencia a ir a buscar el contexto por su cuenta. gemma solo lee aquello a lo que lo enviamos, mientras que qwen y DeepSeek exploran el repositorio sin que se lo pidamos. Esta tendencia decide el efecto de `blind` y el del ticket bien redactado. Una palanca medida sobre un solo modelo no dice nada de su efecto sobre otro: el mismo ticket es decisivo para gemma y casi no cambia la esquina en DeepSeek, que ya ha leído `ISSUES.md`.

Poner los tests en el bucle del agente es la única palanca que actúa sobre todos los modelos, porque lleva la información allí donde el agente la consulta de todos modos. Tiene un coste: el agente deja de escribir sus propios tests, y en un ticket real, nadie te dará la sonda. La pregunta que plantea el [módulo sobre los skills](./act2-skill) es si un procedimiento de trabajo escrito una vez puede obtener el mismo resultado sin dar los tests.

Por último, verifica una campaña antes de leer sus puntuaciones. De las tres matrices de este módulo, una perdió sus columnas de coste a causa de las repeticiones, otra se relanzó en otro proveedor porque la primera era inutilizable, y el relanzamiento mismo solo es legible teniendo en cuenta 181 timeouts. Ninguno de estos incidentes era visible en la tabla de puntuaciones.

::: tip Lo que has aprendido
Sabes citar una palanca cuyo efecto cambia de un modelo a otro, y explicar por qué a partir de las sesiones. Nuestro ejemplo es el ticket bien redactado: hace que gemma lea `ISSUES.md`, que no lo habría abierto por su cuenta, y casi no cambia la esquina en DeepSeek, que lo lee en todos los casos.
:::

## Para ir más lejos

- [trysquare](https://github.com/AI-for-dev/trysquare), la herramienta de medición utilizada en este módulo, y su [documentación](https://ai-for-dev.github.io/trysquare/).
- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), que contiene el escenario `issue1-context`, su hipótesis escrita antes de la medición, los prompts, la sonda y el script de validación.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), sobre la idea de que un harness cuidado cuenta tanto como el modelo.
