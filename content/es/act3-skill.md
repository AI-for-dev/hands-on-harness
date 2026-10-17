# Las competencias, medidas

::: tip Objetivos de este módulo
- Medir qué cambia un skill en la corrección de un bug y en los tests que escribe el agente
- Juzgar los tests del agente sobre correcciones distintas de la suya
- Detectar una campaña en la que el skill hace fallar al modelo antes incluso de que haya trabajado
- Distinguir lo que aporta el procedimiento de lo que aporta el catálogo
:::

El [módulo 3.1](./act3-contexte) terminó con una pregunta. Dar la sonda al agente es la única palanca que ayuda a los tres modelos a tratar la esquina del ladrillo y el tunneling, pero en un ticket real nadie te dará la sonda. ¿Puede un procedimiento de trabajo escrito una vez obtener el mismo resultado?

En el [módulo 2.2](./act2-skill), escribiste este procedimiento en dos formas: `playtester`, que lleva un catálogo de bugs de rompeladrillos escrito a mano, y `dynamic-playtester`, que construye su catálogo mediante una búsqueda web. Una o dos sesiones te mostraron que los tests producidos cubrían más casos. Este módulo repite cada configuración veinte veces sobre tres modelos para saber si eso se reproduce, y qué cambia en la corrección.

## La experiencia

### La tarea

La tarea es la del módulo 3.1: el issue #1 de NÉON, la pelota que atraviesa los ladrillos. La petición es la petición desatendida:

```
The ball goes through the bricks instead of bouncing. Fix that.
```

Todas las configuraciones corren en `blind`: ni `ISSUES.md` ni historial de git. El módulo 3.1 lo mostró, `ISSUES.md` describe justamente los casos difíciles (la esquina, la unión, el tunneling). Un agente que pudiera leerlo sería evaluado por lo que copió, no por lo que el skill le hizo buscar.

### Las tres configuraciones

| configuración        | lo que recibe el agente                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| `nothing`            | la petición desatendida sola                                                          |
| `playtester`         | `/skill:playtester` seguido de la petición desatendida                                |
| `dynamic_playtester` | `/skill:dynamic-playtester` seguido de la petición desatendida                        |

El skill se invoca por su nombre. Pi pega entonces el cuerpo de `SKILL.md` en el primer mensaje, y no hay ninguna decisión del modelo que medir: medimos lo que hace el procedimiento una vez cargado, y no la calidad de su descripción.

Los dos skills son los del módulo 2.2, traducidos al inglés, con una diferencia. La versión del curso se detiene en los tests rojos («No corriges el juego»). Aquí, un último paso pide corregir el juego hasta que toda la suite pase, modificando el código y no los tests, salvo un montaje que se juzgue falso al releer el invariante, que hay que señalar entonces. Sin este paso, no podríamos comparar la corrección con la del módulo 3.1.

```toml
[presets.playtester]
prompt = "../materials/issue1-simple-prompt-with-playtester.md"
harness = ["skills-playtester"]

[presets.dynamic_playtester]
prompt = "../materials/issue1-simple-prompt-with-dynamic-playtester.md"
harness = ["skills-dynamic-playtester", "web-access"]

[axes]
lever = ["nothing", "playtester", "dynamic_playtester"]
```

::: warning Observaciones
1. El catálogo de `playtester` lo escribimos nosotros, que conocemos `ISSUES.md`. Contiene una entrada para la esquina, la unión y el tunneling, con un invariante preciso. Este skill no es, por tanto, neutro: es un conocimiento del género escrito por alguien que sabía qué había que buscar.
2. El catálogo de `dynamic-playtester` ya estaba presente en `references/bugs-arcade.md` al lanzarse las campañas: 53 entradas sacadas de la web, con una sección `breakout`. Ninguna ejecución relanzó `catalogue.sh`. Esta configuración mide, por tanto, el procedimiento genérico con un catálogo resultado de una búsqueda, y no la búsqueda en sí.
3. La introducción del skill medido sigue diciendo « You do not fix the game », mientras que el paso 5 pide corregir. Todas las ejecuciones que entregaron algo modificaron `game/neon.js`: los modelos siguieron el paso numerado.
:::

### Qué cuenta como éxito

Se leen dos familias de métricas, siempre sin LLM-as-a-judge.

La corrección la puntúa la sonda del módulo 3.1, depositada al final en una copia del árbol del agente: `bounce_bricks` (el rebote en cada cara), `bounce_corners`, `bounce_tunneling`.

Los tests del agente se juzgan aparte. Sus archivos de test se lanzan contra varios árboles de referencia: el patrón, una corrección completa y cinco correcciones a las que les falta cada una una parte (el eje, la esquina, la salida del ladrillo, la unión, el tunneling).

| métrica                  | lo que dice                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `tests_sound`            | ningún test del agente falla en la corrección completa                                |
| **`detects_axis`**       | **el criterio**: un test sano falla en una corrección que invierte `vy` en todas las caras |
| `detects_corner`         | un test sano falla en la corrección que olvida la esquina                             |
| `detects_neighbors`      | un test sano falla en la corrección que rebota dos veces en la unión                  |
| `detects_tunneling`      | un test sano falla en la corrección que deja pasar una bola rápida                    |

Esta forma de juzgar es exigente, ya que un test que verifica la corrección escrita por el agente en lugar del comportamiento esperado falla en la corrección de referencia y ya no detecta nada. Es el caso, por ejemplo, de un test que exige una posición al píxel exacto o que importa una función que el agente acaba de crear.

### Los modelos

Son los tres modelos del módulo 3.1, esta vez todos servidos por GRICAD:

| modelo                | razonamiento | timeout |
| --------------------- | ------------ | ------- |
| `gemma-4-31b`         | `high`       | 60 min  |
| `qwen-3.8-27b`        | `medium`     | 60 min  |
| `DeepSeek-V4.1-Flash` | `medium`     | 30 min  |

Las campañas se lanzaron el 17 de octubre de 2026, contra la etiqueta `etalon-v1`, con un límite de salida de 32 768 tokens por turno. Cada configuración se repite veinte veces, es decir, 60 ejecuciones por modelo. El timeout es más largo que en el módulo 3.1 porque un skill hace trabajar al agente durante más tiempo.

::: info Ejercicio (en sala, luego en autonomía)
Ubícate en [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), abre `scenarios/issue1-skill.toml` y adapta la sección `[agent]` a tu proveedor. Lanza la matriz con tres repeticiones:

```bash
uv run trysquare run scenarios/issue1-skill.toml --output results --repetitions 3
```

Eso da 9 ejecuciones, más largas que las del módulo 3.1. Mientras corren, abre el `diff.patch` de una ejecución `playtester` y lee los tests añadidos: ¿encuentras una entrada del catálogo por `describe`?

**En autonomía**, elimina `references/bugs-arcade.md` del skill `dynamic-playtester` y relanza la única configuración `dynamic_playtester` (`--only dynamic_playtester`): el catálogo se construye entonces en cada ejecución, y mides la búsqueda además del procedimiento.
:::

## ¿Se puede confiar en las campañas?

Como en el módulo 3.1, verificamos las ejecuciones antes de leer una puntuación.

|                                                          | gemma | qwen  | DeepSeek |
| -------------------------------------------------------- | ----- | ----- | -------- |
| ejecuciones sin ningún archivo modificado, sin skill     | 0/20  | 2/20  | 0/20     |
| lo mismo, `playtester`                                   | 0/20  | 11/20 | 0/20     |
| lo mismo, `dynamic_playtester`                           | 0/20  | 12/20 | 0/20     |
| reintentos por parte del proveedor                       | 4     | 0     | 0        |
| tests del agente imposibles de lanzar sobre las referencias | 13    | 14    | 16       |

DeepSeek está limpio: ningún reintento, ningún timeout, todas las ejecuciones entregan.

gemma es explotable. Los 4 reintentos caen todos en `playtester`, de modo que las columnas de coste de esa configuración no son legibles.

qwen no entrega nada en más de la mitad de las ejecuciones con skill, y no es un incidente del proveedor. Esas 23 ejecuciones se detienen todas de la misma forma: qwen lee el skill y algunos archivos del repositorio, y luego, en el momento de escribir, su razonamiento llena los 32 768 tokens del turno (unos 100 000 caracteres) sin emitir una sola llamada de herramienta. Pi recibe una respuesta cortada (`stopReason: length`) y la sesión se detiene. Las sesiones sugieren que qwen intenta diseñar todos los tests en su razonamiento antes de escribir uno. En ese modelo y con ese límite, el skill hace fallar la tarea una vez de cada dos, lo cual forma parte del resultado. Las cifras de qwen que siguen se calculan sobre veinte, pero ten en cuenta que con `playtester` sus 9 ejecuciones entregadas corrigen todas el coin.

La última línea pide una explicación. Cuando los tests del agente importan una función que los árboles de referencia no exportan (`bounceOffBrick`, `handleBrickCollisions`…), no se ejecutan, y la métrica no se evalúa. Esto ocurre sobre todo sin skill, donde el agente corrige primero y luego prueba la función que acaba de escribir (16 ejecuciones de 20 en DeepSeek), y en gemma con `playtester` (8 de 20).

::: tip Nuestra convención de cálculo
Como en el módulo 3.1, todas las cifras se dan sobre las veinte ejecuciones de cada configuración. Una ejecución que no entregó nada, o cuyos tests no se ejecutan sobre las referencias, cuenta como fallo. Un test que solo corre sobre la corrección del agente no detecta nada en otra. La síntesis de trysquare retira esas ejecuciones del denominador: `detects_axis` vale 5/12 para gemma con `playtester`, frente a 5/20 aquí.
:::

## Los resultados

### Configuración por configuración

La cuadrícula da, para la métrica elegida, el número de ejecuciones exitosas de veinte, con una columna por modelo. Los botones de arriba separan la corrección, evaluada por la sonda, de los tests del agente, juzgados sobre los árboles de referencia. Para la corrección, dos líneas con sangría retoman las configuraciones del módulo 3.1 más cercanas a `nothing`: petición descuidada, `blind`, razonamiento medium, sin y luego con la sonda.

```chart
issue1-skill-matrix
```

Las líneas del módulo 3.1 no son una referencia estricta, ya que gemma se servía allí mediante ILaaS y el razonamiento de gemma y de qwen no estaba configurado de la misma forma. En la esquina y el tunneling, `nothing` recupera sin embargo el 0/20 del módulo 3.1 en los tres modelos.

::: details Los mismos números en tabla
La corrección: cada celda da, sobre veinte ejecuciones, `bounce_bricks / bounce_corners / bounce_tunneling`.

| configuración        | gemma          | qwen           | DeepSeek       |
| -------------------- | -------------- | -------------- | -------------- |
| `nothing`            | 14 / 0 / 0     | 17 / 0 / 0     | 20 / 0 / 0     |
| `playtester`         | 20 / 20 / 17   | 9 / 9 / 8      | 20 / 20 / 19   |
| `dynamic_playtester` | 16 / 0 / 12    | 5 / 4 / 1      | 20 / 12 / 17   |
| *3.1, sin la sonda*  | *19 / 0 / 0*   | *19 / 0 / 0*   | *19 / 0 / 1*   |
| *3.1, con la sonda*  | *19 / 17 / 9*  | *20 / 20 / 17* | *20 / 20 / 20* |

Los tests: cada celda da, sobre veinte ejecuciones, `detects_axis / detects_corner / detects_neighbors / detects_tunneling`, y luego el número de ejecuciones que añadieron tests todos sanos.

| configuration        | gemma                  | qwen                   | DeepSeek                    |
| -------------------- | ---------------------- | ---------------------- | --------------------------- |
| `nothing`            | 4 / 0 / 0 / 0, sanos 3 | 0 / 0 / 0 / 0, sanos 0 | 0 / 0 / 0 / 0, sanos 0      |
| `playtester`         | 5 / 5 / 1 / 8, sanos 1 | 9 / 9 / 7 / 7, sanos 6 | 20 / 20 / 18 / 18, sanos 16 |
| `dynamic_playtester` | 8 / 1 / 1 / 4, sanos 4 | 7 / 4 / 0 / 1, sanos 4 | 20 / 10 / 1 / 17, sanos 5   |
:::

### El efecto de cada skill

Cada panel compara dos configuraciones sobre sus veinte ejecuciones: cada skill contra la petición sola, luego los dos skills entre sí, que solo difieren por su catálogo. Como en el módulo 3.1, cada símbolo da la diferencia en puntos porcentuales y su trazo el intervalo al 95 % obtenido por remuestreo. Un símbolo lleno tiene un intervalo que excluye cero, uno hueco no (sin corrección por comparaciones múltiples). Con veinte ejecuciones de cada lado, los intervalos son más anchos que en el módulo 3.1, donde cada palanca se leía sobre 160 contra 160.

```chart
issue1-skill-effects
```

::: details Las mismas cifras en tabla
La diferencia va seguida de su intervalo al 95 %. `*` señala un intervalo que excluye cero.

| comparación | métrica | gemma | qwen | DeepSeek |
| --- | --- | --- | --- | --- |
| `playtester` contra `nothing` | `bounce_corners` | +100 \* [+100, +100] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `bounce_tunneling` | +85 \* [+70, +100] | +40 \* [+20, +60] | +95 \* [+85, +100] |
|  | `detects_axis` | +5 [-20, +30] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `detects_corner` | +25 \* [+5, +45] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `detects_neighbors` | +5 [0, +15] | +35 \* [+15, +55] | +90 \* [+75, +100] |
| `dynamic_playtester` contra `nothing` | `bounce_corners` | 0 [0, 0] | +20 \* [+5, +40] | +60 \* [+40, +80] |
|  | `bounce_tunneling` | +60 \* [+40, +80] | +5 [0, +15] | +85 \* [+70, +100] |
|  | `detects_axis` | +20 [-10, +45] | +35 \* [+15, +55] | +100 \* [+100, +100] |
|  | `detects_corner` | +5 [0, +15] | +20 \* [+5, +40] | +50 \* [+30, +70] |
|  | `detects_neighbors` | +5 [0, +15] | 0 [0, 0] | +5 [0, +15] |
| `dynamic_playtester` contra `playtester` | `bounce_corners` | -100 \* [-100, -100] | -25 [-50, +5] | -40 \* [-60, -20] |
|  | `bounce_tunneling` | -25 [-50, 0] | -35 \* [-60, -10] | -10 [-30, +5] |
|  | `detects_axis` | +15 [-15, +45] | -10 [-40, +20] | 0 [0, 0] |
|  | `detects_corner` | -20 [-40, 0] | -25 [-50, +5] | -50 \* [-70, -30] |
|  | `detects_neighbors` | 0 [-15, +15] | -35 \* [-55, -15] | -85 \* [-100, -65] |
:::

El criterio `detects_axis` pasa de 0 a 20 sobre 20 en DeepSeek con uno u otro skill, y de 0 a 9 en qwen con `playtester`. En gemma, la diferencia sobre el criterio no está establecida para ninguno de los dos skills, mientras que la corrección de la esquina gana 100 puntos con `playtester`.

### Lo que retenemos de esto

**El procedimiento hace escribir las pruebas antes de la corrección, en todos los modelos.** Sin skill, ninguna ejecución escribe una prueba antes de modificar `neon.js`. Con uno u otro skill, todas las ejecuciones entregadas lo hacen, y casi todas lanzan las pruebas entre ambas para verlas fallar. El agente además añade muchos más casos: 10 de mediana con `playtester`, frente a 2 a 4 sin skill.

**`playtester` obtiene la esquina sin dar la sonda.** gemma y DeepSeek consiguen la esquina en 20 ejecuciones de 20, y el tunneling en 17 y 19. gemma incluso lo hace mejor que con la sonda del módulo 3.1 en el tunneling (17 frente a 9). qwen consigue la esquina en sus 9 ejecuciones entregadas. Es la respuesta a la pregunta del módulo 3.1, con una salvedad: ese catálogo fue escrito por personas que habían leído `ISSUES.md`.

**El catálogo cuenta tanto como el procedimiento.** `dynamic_playtester` sigue los mismos pasos, pero su catálogo extraído de la web describe la esquina de forma vaga: « the chosen reflection side must be the face the ball is actually penetrating ». El de `playtester` da una condición y un valor: « when the ball penetrates as much on both axes, both components flip ». Con el invariante vago, gemma ya no corrige nunca la esquina (0/20) y DeepSeek solo 12 veces de 20. La unión entre dos ladrillos no tiene una entrada clara en el catálogo de la web, y `detects_neighbors` cae a 1 de 20 en DeepSeek, frente a 18 con `playtester`. El tunneling, en cambio, está bien descrito en ambos catálogos, y la diferencia es pequeña en DeepSeek (17 frente a 19).

**Una prueba que pasa sobre la corrección del agente puede no detectar nada sobre otra.** gemma corrige la esquina en 20 de cada 20 ejecuciones con `playtester`, pero sus pruebas solo detectan el defecto de la esquina en 5, y solo uno de sus veinte conjuntos de pruebas pasa sobre la corrección de referencia. Las aserciones casi nunca son la causa, ya que gemma solo elimina una, en una sola ejecución. Sus pruebas siguen el desplazamiento de su código: para corregir, gemma saca la colisión de `frame()` y la pone en `step()` o en una nueva función como `handleBrickCollisions`, luego reescribe sus pruebas para llamar a esta nueva ubicación, lo que hace en 15 de cada 20 ejecuciones. La corrección de referencia mantiene la colisión en `frame()`, por lo que las pruebas que importan la función de gemma no se ejecutan allí y las que ya solo llaman a `step()` fallan allí. DeepSeek, con el mismo skill, escribe pruebas sanas en 16 de cada 20 ejecuciones.

**Un skill cuesta tiempo, y puede hacer fracasar a un modelo.** DeepSeek, cuya campaña es la única con columnas de coste legibles, pasa de 104 segundos de mediana sin skill a 470 con `playtester`, y consume aproximadamente siete veces más tokens de entrada. En qwen, el skill hace que el razonamiento se salga de su techo una vez de cada dos, y la tarea falla antes de haber empezado.

## ¿Cómo trabajan los modelos?

::: info Método
Como en el módulo 3.1, cada sesión se reduce a una secuencia de acciones mediante expresiones regulares: son tendencias, no medidas.
:::

### DeepSeek sigue el procedimiento paso a paso

DeepSeek lee el catálogo, conserva las entradas de la colisión bala-ladrillo, escribe un test por entrada, lanza los tests uno a uno para verificar que fallan en la aserción prevista (17 ejecuciones de 20 con `playtester`) y después corrige. Con un skill, sus tests solo importan funciones que el juego ya exportaba, así que se ejecutan sobre todas las correcciones de referencia, mientras que sin skill 16 ejecuciones de 20 prueban una función que acaba de crear. También busca `ISSUES.md` en 14 a 17 ejecuciones de 20, sin encontrarlo, ya que fue retirado.

### gemma sigue el procedimiento, pero prueba su propia corrección

gemma respeta el orden de las etapas: pruebas, ejecución en rojo, corrección. Con `playtester`, hace 45 turnos en mediana y 24 modificaciones de archivos, de las cuales 5 fallan porque el texto a reemplazar no coincide con el archivo, mientras que DeepSeek hace 10 sin ningún fallo. En 15 ejecuciones de 20, sus pruebas rojas llaman a `frame()`, la función del síntoma, luego gemma traslada la colisión fuera de `frame()` para corregir, en `step()` (9 ejecuciones) o en una función que crea (8 ejecuciones, algunas hacen ambas cosas), y reemplaza en sus pruebas `frame(ctx, state)` por `step(state, 1 / 60)` o `handleBrickCollisions(state)`. El skill solo permite tocar las pruebas durante la corrección para reparar un montaje incorrecto, y gemma se sirve de esa excepción para adaptar sus pruebas a su código. Sus pruebas terminan, por tanto, verificando la organización de su corrección en lugar del comportamiento esperado.

### qwen planifica todo antes de actuar

Cuando qwen entrega con `playtester`, corrige la esquina las 9 veces de 9 y sus tests son sanos en 6 ejecuciones de 9. Pero un skill largo en el primer mensaje lo empuja a diseñar todos los tests de golpe en su razonamiento. Una de cada dos veces, ese razonamiento supera los 32 768 tokens y la sesión se detiene sin una sola línea escrita. Un skill que funciona en un modelo puede así bloquear a otro por una razón que no tiene nada que ver con su contenido.

## Generalizar

Un procedimiento escrito una vez cambia la forma de trabajar del agente de manera reproducible. Los tres modelos escriben sus tests antes de corregir en cuanto se les da, y ninguno lo hace sin ella.

El procedimiento no aporta el conocimiento del dominio: `playtester` y `dynamic-playtester` solo difieren en su catálogo, y es él quien decide la esquina y la unión. Un invariante útil nombra una condición y un valor que el agente puede convertir en un test exacto. Un invariante vago da un test vago, y el agente corrige lo que ese test verifica.

Para saber qué detecta un test escrito por el agente, hay que ejecutarlo sobre otra corrección distinta de la suya. Un test que falla antes de la corrección y luego pasa después da la impresión de verificar el comportamiento esperado, cuando el agente pudo haberlo modificado sobre la marcha para que siguiera su código. Con gemma, las aserciones permanecen casi intactas, pero en 15 de cada 20 ejecuciones los tests ya no llaman a `frame()` una vez que la colisión se ha desplazado a otro lugar: pasan con su corrección, y solo uno de sus veinte conjuntos de tests pasa con la corrección completa del validador. En un proyecto real no siempre se tiene a mano una segunda corrección, y entonces se comparan los tests rojos del principio con los tests verdes del final, para comprobar que siguen llamando al código del síntoma y que todavía verifican el invariante de partida.

Mide un skill en cada modelo objetivo. El mismo archivo da 20 esquinas de 20 en DeepSeek y hace fallar a qwen una de cada dos veces, por una razón (la longitud del razonamiento) que ninguna relectura del skill habría dejado ver.

Por último, verifica lo que la configuración mide realmente. Aquí, `dynamic_playtester` partió de un catálogo ya escrito, de modo que mide el procedimiento y ese catálogo, y no la búsqueda web. En la tabla de puntuaciones, solo la columna `catalogue_built` con 0/20 lo dejaba entrever, y hubo que leer las sesiones para confirmarlo.

::: tip Lo que has aprendido
Sabes decir, a partir de la matriz, qué aporta el procedimiento (las pruebas escritas antes de la corrección, en todos los modelos) y qué depende del catálogo (la esquina y la unión). También sabes por qué una prueba en verde sobre la corrección del agente no basta: hay que ejecutarla sobre otra corrección para saber qué detecta.
:::

## Para ir más lejos

- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), que contiene el escenario `issue1-skill`, su hipótesis, los dos skills traducidos y el validador que evalúa las pruebas sobre los árboles de referencia.
- El [módulo 2.2](./act2-skill), para la construcción de los dos skills medidos aquí.
- Anthropic, [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices), que recomienda probar un skill con cada modelo objetivo.
