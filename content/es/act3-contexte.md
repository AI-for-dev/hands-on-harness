# Las palancas del contexto, medidas

::: tip Objetivos de este módulo
- Medir con trysquare el efecto de cada palanca del [módulo 2.1](./act2-contexte) sobre una misma tarea
- Leer una matriz de veinte repeticiones y quedarte solo con las diferencias establecidas
- Verificar el recuento de repeticiones y las razones de las métricas antes de citar una tabla
- Salir con una decisión razonada sobre cada palanca
:::

El [módulo 2.1](./act2-contexte) te hizo manipular a mano las palancas que llenan la ventana de contexto: el modelo, el esfuerzo de razonamiento, el prompt, `AGENTS.md` y el system prompt. Cada manipulación cabía en una o dos ejecuciones, lo que basta para ver qué cambia una palanca en la sesión y deja abierta la pregunta de si ese cambio se reproduce. Este módulo retoma la misma tarea, la issue #1 de NÉON, y mide las mismas palancas con [trysquare](https://github.com/AI-for-dev/trysquare), cuyo [módulo 3.0](./act3-trysquare) describe el funcionamiento y la lectura de las tablas.

## La experiencia

### Qué cuenta como éxito

El marco es el del [módulo 2.1](./act2-contexte): el agente solo modifica `game/neon.js` y `game/neon.test.js`, lanza las pruebas para comprobar que no ha roto nada, y añade pruebas puesto que la suite no cubre el rebote de la pelota sobre los ladrillos. Esto es lo que medimos en cada ejecución:


| métrica              | qué dice                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`          | el agente ha modificado al menos un archivo                                                   |
| `in_scope`           | solo ha tocado `game/neon.js` y `game/neon.test.js`                                           |
| `suite_lancee`       | ha lanzado `npm test` él mismo, leído en su sesión                                            |
| `tests_ajoutes`      | la suite cuenta con más casos que en la referencia                                            |
| **`rebond_briques`** | **el criterio**: en cada una de las cuatro caras, el eje tocado se invierte y el otro no se mueve |
| `rebond_angles`      | en la esquina, ambos componentes se invierten                                                 |
| `rebond_sortie`      | tras el rebote, la pelota ha salido del rectángulo del ladrillo                               |
| `rebond_voisines`    | en una costura de la cuadrícula, el rebote se aplica una vez y no dos                         |
| `rebond_traversee`   | una pelota rápida ya no atraviesa el ladrillo sin tocarlo                                     |

Probamos el conjunto de estos puntos de forma determinista, sin LLM-as-a-judge: los tests que habría que tener están escritos en un archivo sonda. Un test ejecutable es más seguro que un LLM encargado de confirmar un comportamiento deseado, cuyo veredicto probabilista puede hacerte creer que está bien cuando no lo está.

### El plan del experimento

El plan elegido es el más simple que sigue siendo legible: una **base**, y luego un conjunto de variantes que cambian cada una poco.

La base, llamada `nothing`, reproduce lo que hace alguien el primer día: la petición descuidada de tus primeros ensayos en el [módulo 2.1](./act2-contexte), sin archivo de reglas, el system prompt del agente y el razonamiento cortado. Cada otra configuración añade un elemento para ver su efecto en la respuesta.

| configuración                    | qué cambia                                                         |
| -------------------------------- | ------------------------------------------------------------------ |
| `nothing`                        | nada, es la referencia                                             |
| `+thinking`                      | `thinking = "high"`                                                |
| `+agents`                        | `briques/AGENTS.md` se deposita en el clon                         |
| `+well_crafted`                  | el prompt describe limpiamente el problema y se refiere a `ISSUES.md` |
| `-system_prompt`                 | el system prompt se reemplaza por tres líneas                      |
| `+agents+well_crafted`           | `AGENTS.md` + prompt bien escrito                                  |
| `+agents+add_tests+well_crafted` | aquí se añaden además los tests que se desea ver pasar             |

Un experimento cabe en un archivo: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

El directorio del experimento contiene otras configuraciones además de las del cuadro anterior; pertenecen a otros módulos, y hablaremos de ellas más adelante.

El prompt bien escrito no copia el contenido del ticket. `ISSUES.md` ya describe cómo corregir el bug, en el repositorio que el agente tiene a mano. El prompt nombra entonces la issue, el alcance y el criterio de parada, y nada más:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Esta configuración mide entonces si señalar un documento escrito basta para que el agente vaya a leerlo y lo tenga en cuenta. Si el prompt copiara la solución, mediríamos únicamente la capacidad del agente de seguir una consigna que se le acaba de dar.

### Los tests de validación

Para juzgar la calidad de los resultados, el escenario declara tests de validación:

- **delivered**: la ejecución llegó hasta el final, sin interrupciones.
- **suite_lancee**: el agente se acordó de lanzar los tests que se encuentran en el directorio `game`.
- **in_scope**: el agente solo modificó los archivos que se le pidió modificar, y solo las líneas que corresponden al problema.
- **tests_ajoutes**: el agente se acordó de añadir tests sobre los rebotes de la pelota contra los ladrillos.
- **`sonde.test.js`**: al final de la ejecución, esta sonda verifica que las modificaciones del código corrigen el problema en su totalidad, tal como se describe en `ISSUES.md`. También se deposita desde el principio en la configuración `+add_tests`, para ver si el agente es capaz de reparar sus errores en función de los tests.

Cada ejecución deja en su directorio la sesión del agente, el diff y la salida de las validaciones, descritas en el [módulo 3.0](./act3-trysquare). Ahí es donde hay que ir a leer cuando una columna sorprende.

::: info Ejercicio (en sala, luego en autonomía)
Colócate en el repositorio [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) instalado en el [módulo 3.0](./act3-trysquare), donde ya has consultado el plan de este escenario con `--dry-run`.

Lanza la matriz con tres repeticiones y déjala correr mientras discutes los cursores:

```bash
uv run trysquare run scenarios/issue1-contexte.toml --output results --repetitions 3
```

Dispones de un conjunto de subcomandos que no lanzan modelos y que sirven esencialmente para analizar los resultados:

```bash
# refabriquer les tables
uv run trysquare render scenarios/issue1-contexte.toml --output results --repetitions 3
# renoter sans rejouer
uv run trysquare replay results/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
uv run trysquare compare results/... results/...
```

**En autonomía**, copia `scenarios/issue1-contexte.toml`, cambia una configuración y vuelve a lanzar. No habrás tocado ni la herramienta, ni la validación, ni las otras configuraciones, y es el único artefacto de este módulo que no quedará obsoleto.
:::

## Lo que dicen nuestras mediciones

Habrás podido darte cuenta en tus primeros ensayos con `trysquare`: hacer mediciones lleva tiempo. Para una veintena de repeticiones, tardarás entre 2 h y 3 h en tener el conjunto de los resultados, configuraciones con skills incluidas. Por eso hemos preferido darte una campaña completa realizada de antemano, en la que puedes recorrer los directorios de cada ejecución como lo hiciste anteriormente.

Esto es lo que obtuvimos en agosto de 2026, sobre `ilaas` y `gemma-4-31b`, frente al commit `d62ccd1f` de NÉON, con **veinte repeticiones por configuración**. Las dos configuraciones con skills figuran en el archivo y pertenecen al [módulo sobre los skills](./act2-skill); quedan excluidas de las tablas de abajo, salvo por una observación al final.

| configuración                    | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

Y las columnas de la sonda, el criterio en cabeza:

| configuración                    | bloques   | ángulos   | salida    | vecinas   | travesía   |
| -------------------------------- | --------- | --------- | --------- | --------- | ---------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

Los denominadores de `+well_crafted` y `+thinking` valen 18 y 19 en las columnas de coste, porque ILaaS devolvió `Request timed out` durante la medición y las ejecuciones afectadas no produjeron nada.

Extraemos cinco conclusiones de estas dos tablas. Todas las diferencias citadas más abajo provienen de los intervalos descritos en el [módulo 3.0](./act3-trysquare), con la misma marca `*` para una diferencia establecida y `o` para una diferencia no concluyente. Las diferencias se calculan contra una configuración de referencia, la primera del escenario (aquí `nothing`) cuando no especificas otra. Rehacer los cálculos contra otra referencia solo cambia este puntero, sin llamar al modelo ni volver a medir nada.

```bash
uv run trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

La salida va a un `synthesis_ref-<référence>.md` junto a la síntesis habitual, que no se toca.

**El prompt acotado hace que se haga todo lo que el ticket nombra, y nada más.** `tests_ajoutes` pasa de 0/20 a 17/20 y `rebond_angles` de 0/20 a 14/20, dos columnas que estaban vacías y que se llenan. El prompt, sin embargo, no dice nada del mecanismo del rebote: nombra el resultado, el alcance y el criterio de parada, y es `ISSUES.md` quien describe la esquina, la salida del rectángulo, los ladrillos vecinos y el tunneling. La esquina se queda en **0/20 en las cuatro configuraciones que no acotan el ticket**, o sea ochenta ejecuciones consecutivas. Señalar un documento escrito basta entonces para que se lea, y es el contenido de ese documento el que decide qué se tratará.

**El archivo de reglas solo mueve el procedimiento, y ya no mueve nada en cuanto el ticket es correcto.** `+agents` hace pasar `suite_lancee` de 0/20 a 20/20, porque una de sus cuatro líneas nombra el comando. En el criterio, da 9/20 frente a 11/20 de la base, una diferencia no concluyente, y en `tests_ajoutes` se queda en 0/20, ya que ninguna de sus líneas habla de tests. Añadido por encima del prompt acotado, no aporta **absolutamente nada**: 11/20 frente a 13/20 en el criterio, 12/20 frente a 14/20 en la esquina, 17/20 frente a 17/20 en los tests añadidos, sin que ninguna de esas tres diferencias sea distinguible. El archivo de reglas es un sustituto del ticket correcto más que un complemento, lo que da una regla de escritura directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que hay que quitar.

**El razonamiento mueve el criterio, y por sí solo no hace leer el ticket.** `+thinking` da 16/20 en `rebond_briques`, una diferencia de +29 puntos cuyo intervalo excluye el cero. Es la única palanca de la matriz, aparte de las que tocan el ticket, que desplaza la corrección misma. Su columna de la esquina se queda en 0/20 y sus tests añadidos en 3/20: el razonamiento mejora lo que el modelo hace con lo que tiene delante, pero no lo lleva a ir a buscar lo que le falta.

**El prompt acotado hace escribir los tests rojos, y una ejecución de cada cinco se detiene ahí.** La columna `touched` lo dice sin ambigüedad: en `+well_crafted` y `+agents+well_crafted`, cuatro ejecuciones de veinte nunca abren `game/neon.js`, de las cuales dos o tres escriben únicamente en `game/neon.test.js` y una o dos no entregan nada en absoluto. Ninguna otra configuración muestra este comportamiento: `nothing`, `+agents` y `-system_prompt` tocan la fuente en veinte ejecuciones de veinte. La explicación está en el ticket, que enumera cinco subcasos y termina con « each case above added **first as a red test**, then green »: `gemma-4-31b` escribe los rojos y se detiene ahí, al no poder tratar la especificación entera. Es también por eso que el criterio de corrección no sube mientras la esquina sube: el modelo tiene un presupuesto de trabajo, y describir más trabajo en el ticket no lo agranda.

**Dar los tests repara esta caída.** La configuración `+agents+add_tests+well_crafted` se lee contra `+agents+well_crafted`, la única de la que solo difiere por la sonda depositada en el árbol:

| columna           | `+agents+well_crafted` | `+add_tests` | diferencia             |
| ----------------- | ---------------------- | ------------ | ---------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | no aplica              | **20/20**    |                        |

Las cuatro columnas de la corrección suben, y las cuatro diferencias están establecidas. La palanca no solo gana casos límite, también recupera el propio criterio. Fíjate en la anchura de los intervalos, y en particular en la de la esquina que empieza en un solo punto: estas diferencias están establecidas en el sentido de que son positivas, sin que se pueda dar su tamaño con mejor precisión que un factor de cincuenta.

`sonde_intacte` vale 20/20, lo que significa que el modelo no intentó cambiar los tests de referencia. Y `tests_ajoutes` no se mueve, lo cual es coherente con un agente que ya tiene los casos a la vista y no tiene ninguna razón para reescribirlos.

::: warning Ninguna columna de coste de gemma es citable aquí
La matriz cuenta con 1 151 reintentos, es decir, turnos relanzados porque el proveedor había fallado, y el recuadro de más abajo muestra hasta qué punto se concentran en las configuraciones más pesadas. Un reintento rejuega el turno con todo el contexto acumulado, así que infla las columnas de coste y, sobre todo, vuelve a pilotar al agente.

El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` cuenta con **37**, lo que hace legibles las suyas:

| configuración                    | turnos | duración |
| -------------------------------- | ------ | -------- |
| `nothing`                        | 19     | 163 s    |
| `+agents`                        | 12     | 65 s     |
| `-system_prompt`                 | 17     | 142 s    |
| `+well_crafted`                  | 15     | 252 s    |
| `+thinking`                      | 19     | 490 s    |
| `+agents+well_crafted`           | 14     | 561 s    |
| `+agents+add_tests+well_crafted` | 13     | 410 s    |

Los tokens de entrada de las dos matrices no van en la misma tabla, por una razón que no tiene nada que ver con el modelo: ILaaS no reporta ninguna caché, con `cacheRead` valiendo cero en sus ciento ochenta ejecuciones, de modo que su columna de entrada es la suma de los prefijos completos releídos en cada turno. opencode Zen reporta la caché, hasta cinco millones de tokens leídos en una sola ejecución. La misma configuración muestra entonces 558 000 tokens de entrada por un lado y 15 000 por el otro sin que ninguno de los dos sea falso. Es la mitad práctica de lo que el [módulo 2.1](./act2-contexte) explica sobre la caché: el coste de las entradas depende de la configuración del proveedor del modelo, y activar la caché permite reducir drásticamente la factura.
:::

### Tres comprobaciones antes de citar una tabla

Una matriz publica tablas, intervalos y veredictos, lo que puede dar la impresión de conclusiones sólidas. No obstante, durante la elaboración de esta formación, nos enfrentamos a varios fenómenos que pueden desacreditar algunos resultados.

::: warning El recuento de reintentos
Un reintento es un turno que la herramienta tuvo que relanzar porque el proveedor había fallado. Reproduce ese turno con todo el contexto acumulado, así que infla las columnas de coste y, sobre todo, vuelve a pilotar el agente: ya no es la misma forma de llevar el trabajo.

En la matriz `gemma-4-31b`, el recuento vale **1 151**, y no está repartido:

| configuración                    | reintentos |
| -------------------------------- | ---------- |
| `nothing`                        | 1          |
| `+agents`                        | 2          |
| `-system_prompt`                 | 1          |
| `+well_crafted`                  | 24         |
| `+thinking`                      | 81         |
| `+agents+well_crafted`           | 205        |
| `+agents+add_tests+well_crafted` | 205        |
| `+agents+add_tests+skill`        | 287        |
| `+agents+skill`                  | 345        |

Nada en las configuraciones de contexto corto, todo en las de razonamiento elevado, y tanto más cuanto más crece el contexto acumulado: una sola ejecución de `+agents+add_tests+well_crafted` consumió 2,4 millones de tokens de entrada en sesenta y tres turnos y acumuló dieciocho reintentos. El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` cuenta **treinta y siete** en total.
:::

::: warning La importancia del test de validación
Una columna uniformemente negra se parece a un comportamiento del agente y puede ser un defecto de la validación. La única forma de distinguirlos es que la métrica diga **por qué** respondió mal, y no solo que respondió mal.

Nuestra prueba de validación lo hace con `suite_lancee`: cuando no reconoce ningún lanzamiento de la suite, copia en su razón todos los comandos que el agente ejecutó. Esta precaución es importante, porque la forma del comando varía de un modelo a otro mucho más que el comando mismo. `deepseek-v4-flash` prefija cada llamada con el directorio de trabajo (`cd .../repo && npm test`, 664 veces en la matriz) y redirige con gusto la salida (`npm test 2>&1 | tail -30`, 80 veces), mientras que `gemma-4-31b` escribe `npm test` a secas. Una prueba de validación que solo conociera la última forma puntuaría al primer modelo con cero en toda la matriz.

En conclusión, **escribe tus métricas con cuidado y ponlas a prueba con un conjunto de pruebas**. Tienen que ser fiables. Anota cualquier comportamiento extraño antes de sacar conclusiones apresuradas.
:::

::: warning Qué permite decir la comparación de los dos modelos, y qué no
Las dos matrices (`gemma-4-31b` y `deepseek-v4-flash`) cubren el mismo escenario, las nueve mismas configuraciones y el mismo commit de NÉON, de modo que sus columnas de puntuación se leen una contra la otra. El modelo y el proveedor cambiaron a la vez, lo que impide atribuir una diferencia a uno más que al otro, y aun así deja ver esto en la columna de la esquina:

| configuración          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Ambos modelos reaccionan a la misma palanca y en el mismo sentido, el más capaz partiendo de más arriba y subiendo más alto.
:::

Estas cifras no pretenden ser creídas a ciegas ni copiadas dentro de un año. Relanza la matriz: precisamente para eso sirve, y la que obtengas sustituirá a esta.

El contexto bien sostenido vuelve al agente disciplinado y completo sobre lo que el ticket nombra, sin volverlo exhaustivo: la esquina del bloque nunca se alcanza allí donde el ticket no la describe, y el tunneling sigue siendo la columna más baja de todas las que la sonda mide. Ir más allá de lo que contiene el material escrito requerirá un revisor independiente y un bucle de verificación, que es el tema de los módulos sobre la delegación y los workflows.

::: warning Tres conclusiones tentadoras que los intervalos no permiten
Cada una de las frases siguientes se apoya en una cifra exacta de la campaña publicada en esta página, y ninguna se sostiene.

**«El archivo de reglas rompe la corrección.»** `+agents` da 9/20 en el criterio frente a 11/20 de la base. La diferencia vale -10 puntos pero su intervalo contiene el cero: no podemos decir nada al respecto, ni en un sentido ni en el otro.

**«Quitar el system prompt mejora el rebote.»** `-system_prompt` da 14/20 frente a 11/20, es decir +15 puntos, y el intervalo contiene cero también ahí. Con solo tres ejecuciones bien tiradas, habríamos obtenido 3/3 frente a 1/3 y habríamos podido creerlo de forma duradera.

**«El prompt acotado corrige mejor el bug.»** `+well_crafted` da +17 puntos en el criterio, no concluyente. El efecto real de esta palanca se ve en otra parte, en los tests añadidos y en la esquina, donde las diferencias se cuentan en decenas de puntos y no dejan ninguna duda.

Repetir tres veces no basta, por tanto: un efecto que no supera la dispersión de su propia configuración no es un efecto. Y un efecto establecido sobre esta tarea, con este ticket y este modelo, solo queda establecido en este marco.
:::

## La pila contra la base

Las palancas de este módulo exigen atención y tiempo, mientras que un modelo más capaz se obtiene simplemente pagando más. Es legítimo, pues, preguntarse si resulta más rentable cuidar el contexto o cambiar de modelo. La segunda mitad de esta pregunta no se mide aquí, por la razón dada en el recuadro sobre la comparación de los dos modelos: el modelo y el proveedor cambian juntos. La primera sí se mide, con el modelo constante, poniendo frente a frente las dos configuraciones extremas de la matriz.

::: info Ejercicio (en sala)
Compara la configuración `nothing`, que recibe una petición de una línea y nada más, y la configuración `+agents+add_tests+well_crafted`, que dispone del razonamiento, del ticket acotado, del `AGENTS.md` y de la sonda depositada en el árbol. Mira primero los diffs, después las columnas de la sonda, y solo al final lo que costó cada una.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, diferencia +35 puntos |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| turnos medianos    | 19        | 13                               |
| duración mediana   | 163 s     | 410 s                            |

Las dos últimas filas se toman de la matriz `deepseek-v4-flash`, cuyas treinta y siete repeticiones hacen legibles las columnas de coste, y las columnas de puntuación, de `gemma-4-31b`.

El harness completo alcanza dieciocho sobre veinte en un criterio donde la base se queda en once, y la columna más severa de la sonda pasa de 7/20 a 18/20. Es la tesis de Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, verificada en su mitad más fácil de establecer: con un modelo rigurosamente constante, solo el harness marca la diferencia entre una corrección que funciona una vez de cada dos y una corrección que funciona nueve veces de cada diez.

La esquina pasa de 0/20 a 18/20, y el prompt acotado solo ya obtenía catorce: lo esencial de la ganancia viene de que el prompt hace referencia a un ticket en `ISSUES.md` que nombra el caso, y la sonda añade encima la perseverancia que faltaba para terminar el trabajo.

## Lo que este módulo no sabe obtener

La única palanca que llevó al modelo a tratar el conjunto de lo que el ticket pide es la que le puso los tests ante los ojos. Sin embargo, esta configuración tiene algo artificial: los casos límite estaban escritos de antemano, por nosotros, en el propio archivo que evalúa. En un ticket real, nadie te los proporcionará.

Lo que esta configuración aporta en realidad es perseverancia. El modelo abandona en un ticket largo porque agota su presupuesto formulando los casos en lugar de corregirlos; recibir los casos ya formulados le devuelve ese presupuesto. La pregunta que plantea el [módulo sobre los skills](./act2-skill) es, por tanto, si una **competencia**, es decir, un procedimiento de trabajo escrito una vez y recargado a demanda, puede producir la misma perseverancia sin proporcionar los tests.

## Generalizar

Los principios que siguen tratan sobre las propias palancas, y los que tratan sobre el método de medición están agrupados en el [módulo 3.0](./act3-trysquare).

**Señalar un documento escrito basta para que se lea, y lo que en él se escribe decide el resultado.** Nuestro ticket acotado no describe el mecanismo del rebote: nombra la issue, el alcance y el criterio de parada. Diecisiete ejecuciones de veinte fueron a leer `ISSUES.md`, encontraron allí la petición de casos límite en tests rojos, y la ejecutaron, mientras que la petición desatendida no había obtenido ninguna. La esquina de la brique da la versión más nítida: está descrita en `ISSUES.md` y en ninguno de nuestros prompts, y vale 0/20 en las cuatro configuraciones que no nombran la issue frente a 14/20 en la que la nombra. Escribe lo que esperas en un documento que puedas señalar, y relee ese documento antes de concluir cualquier cosa sobre el agente.

**Un modelo tiene un presupuesto, y describir más trabajo no lo agranda.** Nuestro ticket enumera cinco subcasos y pide un test rojo para cada uno; cuatro ejecuciones de veinte escriben esos tests rojos y nunca abren el archivo fuente. Esta constatación condiciona lo que sigue: o reduces la petición a lo que el modelo puede soportar, o le das con qué aguantar la distancia, que es el tema del [módulo sobre los skills](./act2-skill).

**El archivo de reglas cambia lo que el agente hace y no lo que encuentra, y solo sirve para lo que el ticket no dice.** Entra en el contexto en cada turno, lo que lo convierte en una palanca fuerte y costosa a la vez, de ahí el interés de mantenerlo corto, de fundamentar cada regla en un fallo observado y de refactorizarlo en lugar de alargarlo. Nuestras mediciones enmarcan con precisión lo que compra: la configuración `+agents` hace pasar de 0/20 a 20/20 el número de ejecuciones que lanzan la suite de tests, deja el criterio de corrección sin cambios, y no aporta ya nada en absoluto en cuanto el prompt enmarcado está ahí. La regla de escritura que se deriva es directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que hay que quitar.

## Entregable

Este módulo produce dos piezas, y la segunda servirá para el acto 4.

**1. El directorio de matriz** producido por `trysquare run`, con su línea de registro. El entregable no es una tabla copiada sino el archivo que permite volver a fabricarlo: las mediciones brutas, las sesiones, los diffs, y la revisión de la herramienta que midió. Sin este archivo, la matriz no se puede verificar ni volver a puntuar, y sus cifras no valen más que una opinión.

**2. La ficha de decisión**, una línea por palanca:

| palanca                    | efecto medido | ¿adoptado? | por qué |
| -------------------------- | ------------- | ---------- | ------- |
| elección del modelo        |               |            |         |
| esfuerzo de razonamiento   |               |            |         |
| ticket enmarcado           |               |            |         |
| contenido del ticket apuntado |            |            |         |
| `AGENTS.md`                |               |            |         |
| system prompt              |               |            |         |
| tests proporcionados de antemano |         |            |         |
| ordenación / caché         |               |            |         |
| compactación               |               |            |         |
| criterio ejecutable (sonda) |              |            |         |

Se han añadido dos líneas a esta ficha después de nuestras últimas mediciones. «Contenido del ticket apuntado» figura en ella porque la reescritura de `ISSUES.md` movió más columnas que cualquier ajuste del harness, y «tests proporcionados de antemano» porque es la única palanca que ha compensado la caída del modelo en un ticket largo.

Esta ficha constituye el primer relleno real de la columna «¿tu harness?» de la tabla de correspondencia, para la fila «contexto». Los módulos siguientes harán lo mismo con su ladrillo, de modo que abordarás el capstone con una tabla ya rellena por tus experiencias.

::: tip Criterio de éxito
Sabes citar una palanca que has medido como sin efecto sobre NÉON, y decir en qué condición precisa la tendría en otro lugar.

Nuestro ejemplo es `AGENTS.md`: no mueve ni un punto el criterio de corrección, y se volvería decisivo en un ticket cuyo fallo habitual es de procedimiento y no de razonamiento, o en un repositorio cuyos tickets están mal escritos. El tuyo será distinto, y ese es el objetivo. Este criterio exige haber visto las cifras y haber entendido que son la tarea y su material los que las determinan. Por lo tanto, no se puede satisfacer de memoria.
:::

## Para profundizar

- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), cuya tesis es la que la comparación de la pila con la base pone a prueba.
- [trysquare](https://github.com/AI-for-dev/trysquare), la herramienta de medición usada en este módulo, y su [documentación](https://ai-for-dev.github.io/trysquare/).
- La campaña trysquare de la formación, `scripts/trysquare-campaign/`, con sus hipótesis escritas antes de la medición y sus matrices archivadas. Es el único lugar donde las cifras de esta página se pueden verificar.
