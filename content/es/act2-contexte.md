# El contexto y la ventana: lo que metemos en ella y lo que cuesta

::: tip Objetivos de este módulo
- Saber decir qué hay realmente en la ventana de contexto y qué cuesta cada parte
- Manejar las palancas que la llenan: modelo, esfuerzo de razonamiento, prompt, `AGENTS.md`, system prompt
- Montar un dispositivo de medición reproducible y usarlo para decidir
- Salir con un `AGENTS.md` corto y una decisión motivada sobre cada palanca
:::

La gestión del contexto es el bloque del que dependen todas las demás, ya que un subagente sirve para no contaminar el contexto principal, una memoria para no llenarlo con lo que se podría volver a encontrar, y un permiso para no volcar en él un archivo que no se debería haber leído. Por lo tanto, hay que empezar por saber qué contiene la ventana y cómo se alimenta a lo largo del tiempo. Los módulos siguientes presentarán herramientas que intervendrán en el proceso de llenado del contexto.

Procedemos en el orden habitual: entender qué hay en la ventana, reconstruir las palancas que la llenan y luego extraer lo que sigue siendo cierto cuando la herramienta cambia.

::: info Una convención de lectura
Cada manipulación está marcada como **en sala** o **en autonomía**. El recorrido en sala está pensado para caber en la sesión y para bastar para entender los retos del módulo. Las manipulaciones en autonomía profundizan y están escritas para rehacerlas a solas, más tarde, en tu propio repositorio.
:::

## Comprender

### Cinco fuentes, una sola ventana

Cuando escribes una pregunta en Pi, el modelo recibe una pila en la que tu pregunta es solo una línea:

1. el **system prompt**, que describe al modelo su rol, sus herramientas y sus convenciones;
2. los **archivos de contexto**, `AGENTS.md` y `CLAUDE.md`, cargados desde tu directorio personal, luego desde cada directorio padre en orden ascendente, y luego desde el directorio actual;
3. las **descripciones de las herramientas**, en JSON, una por herramienta disponible;
4. **tu pregunta**;
5. y, a medida que el bucle gira, el **historial**, es decir, cada respuesta del modelo con su fase de razonamiento, cada llamada a herramienta y cada salida de herramienta.

Las cuatro primeras fuentes son estables de un turno a otro, mientras que la quinta crece en cada turno, lo que casi siempre la convierte en la responsable de los desbordamientos.

::: info Ejercicio (en el aula)
Abre una sesión, plantea una pregunta cualquiera y luego exporta la sesión con `/export`. Abre el archivo HTML generado y lee el system prompt de Pi completo, algo que la mayoría de los agentes de código no te permiten ver.

Identifica en él lo que describe **capacidades** y lo que describe **convenciones**: más adelante mediremos el peso real de cada una de las dos categorías.
:::

En una consulta tan trivial como «di solo OK», sin archivo de contexto, sin skill y sin extensión, la entrada pesa **1660 tokens**, y baja a **1110** si se reemplaza el system prompt de Pi por tres líneas. El system prompt de Pi cuesta por tanto unos **550 tokens**, lo cual es poco en comparación con lo que las salidas de herramientas y el historial añadirán después. Lo esencial de lo que llena una ventana de contexto no proviene del harness, sino de lo que tú y el agente vierten en ella a lo largo de la sesión.

### ¿Cuánto cuesta usar un LLM?

Una llamada al modelo se factura en tres partidas, expresadas por millón de tokens. Estos son los precios de los dos modelos tomados de la oferta opencode Go:

| modelo              | entrada | salida | lectura de caché |
| ------------------- | ------- | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $  | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $  | 3,48 $ | 0,0145 $         |

Estos precios son los publicados por [opencode Zen](https://opencode.ai/docs/zen/). Nuestras mediciones más abajo se ejecutan en ILaaS, que no cobra nada a los participantes de esta formación, y cuentan por tanto tokens en lugar de euros. Ambos se leen de la misma manera, con la salvedad de que un contador de tokens no te avisa cuando estás gastando.

De ello se desprenden dos brechas. La primera separa los dos modelos, ya que el `pro` cuesta 12,4 veces más que el `flash` a tarifa nominal. Es una primera manera de darse cuenta de que un modelo posee más capacidades que otro. La segunda brecha, mucho más amplia, separa la entrada de la lectura de caché: un factor **50** en `flash` y **120** en `pro`.

Esta segunda diferencia es lo que hace económicamente viable a un agente de código, porque un agente relee su historial completo en cada turno y, de otro modo, pagaría veinte veces el precio de su contexto a lo largo de una sesión de veinte turnos.

::: info Ejercicio (en sala)
En una sesión interactiva, encadena cinco preguntas sobre un mismo archivo tecleando `/session` después de cada una, y cambia de modelo con `/model` antes de la cuarta. Las preguntas deben prohibir explícitamente cualquier relectura de archivo; de lo contrario, una nueva salida de herramienta se añadirá al contexto y enturbiará la lectura.

Esta es la secuencia exacta que hemos medido, aquí en modo no interactivo para que sea reproducible tal cual. La opción `-c` continúa la sesión anterior, y los acentos se omiten en los comandos sin incidencia sobre el resultado:

```bash
git clone https://github.com/AI-for-dev/neon
cd neon

pi -p --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "Lis game/theme.js et dis en une phrase ce que fait ce fichier."

pi -p -c --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "En une phrase, cite une couleur qui y est definie. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "En une phrase, combien de couleurs au total ? Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, confirme ce nombre. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, redis ce nombre. Ne relis aucun fichier."
```

Estos cinco turnos producen seis llamadas al modelo, porque el primero consume dos: una para solicitar la lectura de `theme.js`, y una segunda para responder una vez recibida la salida de la herramienta.

| llamada | turno | prompt                     | modelo  | entrada | lectura de caché | costo          |
| ------- | ----- | -------------------------- | ------- | ------- | ---------------- | -------------- |
| 1       | 1     | «Lee `game/theme.js`...»   | `flash` | 1 675   | 0                | 0,000254 $     |
| 2       | 1     | (continuación, tras la lectura) | `flash` | 307 | 1 664 | 0,000081 $ |
| 3       | 2     | «menciona un color...»     | `flash` | 66      | 2 048            | 0,000053 $     |
| 4       | 3     | «¿cuántos colores...?»     | `flash` | 118     | 2 048            | 0,000087 $     |
| 5       | 4     | «confirma ese número...»   | `pro`   | 2 521   | **0**            | **0,005455 $** |
| 6       | 5     | «repite ese número...»     | `pro`   | 148     | 2 432            | 0,000362 $     |

El caché se activa ya en la segunda llamada, incluso dentro de un mismo turno, y reduce el costo por un factor de tres a cinco. El cambio de modelo en el cuarto turno vuelve a poner la lectura de caché a cero y hace que todo el prefijo se vuelva a pagar a tarifa completa: ese solo turno cuesta quince veces más que el siguiente, con el mismo modelo.
:::

::: warning Si `pi -p` se queda congelado sin mostrar nada
Desde un script, redirige la entrada estándar con `< /dev/null`. En modo no interactivo, `pi` espera en su entrada estándar mientras esta permanezca abierta, lo que bloquea indefinidamente cuando se le llama desde un script bash, por ejemplo.
:::

El caché solo funciona sobre un **prefijo sin cambios**, de lo que se desprende la regla de ordenación del contexto: todo lo que varía debe colocarse después de lo que es estable. Una marca de tiempo o un `git status` insertado en el system prompt invalida todo lo que sigue, incluyendo herramientas, pregunta e historial, y te hace volver a pagar la tarifa completa en cada turno, mientras que el mismo dato colocado en el mensaje del turno actual no cuesta nada, porque ya se encuentra en la zona variable.

Ten también en cuenta que cambiar de modelo a mitad de sesión no es gratis, algo que conviene tener presente cada vez que cambies de un modelo a otro con `/model`.

## Reconstruir

### La tarea, y lo que cuenta como éxito

Todas las mediciones de este módulo se refieren a la misma tarea, la **incidencia #1** de NÉON: la pelota atraviesa los ladrillos en lugar de rebotar.

El ticket se describe en `ISSUES.md`, en la raíz del [repositorio NÉON](https://github.com/AI-for-dev/neon): la bola atraviesa los ladrillos, y el ticket detalla los comportamientos esperados tras la corrección. Podríamos dárselo directamente al agente, pero no lo haremos por ahora: queremos ver primero cómo se comporta según el prompt que le proporcionamos y el marco que lo rodea.

Este ticket tiene varias sutilezas difíciles de encontrar para un agente solo. Verá rápidamente el problema y propondrá calcular la distancia de la bola a los lados del ladrillo, para invertir, según el lado tocado, una de las dos velocidades. El caso de la esquina, raro pero real, y el de una velocidad lo bastante alta para que la bola cruce el ladrillo sin superponerse nunca a él, tienen en cambio muy pocas posibilidades de ser tratados.

Además de la corrección del bug, queremos empezar a definir un marco y verificar que el agente no se salga de él. Este marco se resume en tres reglas:

- El agente solo puede modificar `game/neon.js` y `game/neon.test.js` y nada más.
- El agente debe lanzar los tests para comprobar que no ha roto nada.
- El agente debe añadir tests si la cobertura no es buena. Es nuestro caso aquí: no hay tests que verifiquen el comportamiento de la bola con el ladrillo.

Esto es lo que proponemos medir en cada ejecución:

| métrica             | lo que indica                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `delivered`         | el agente ha modificado al menos un archivo                                                  |
| `in_scope`          | solo ha tocado `game/neon.js` y `game/neon.test.js`                                          |
| `suite_lancee`      | ha lanzado `npm test` él mismo, visto en su sesión                                           |
| `tests_ajoutes`     | la suite tiene más casos que en la referencia                                                |
| **`rebond_briques`** | **el criterio**: en cada una de las cuatro caras, el eje tocado se invierte y el otro no se mueve |
| `rebond_angles`     | en la esquina, las dos componentes se invierten                                              |
| `rebond_sortie`     | tras el rebote, la bola ha salido del rectángulo del ladrillo                                |
| `rebond_voisines`   | en una costura de la cuadrícula, el rebote se aplica una vez y no dos                        |
| `rebond_traversee`  | una bola rápida ya no atraviesa el ladrillo sin tocarlo                                      |

Probamos todos estos puntos de forma determinista, sin LLM-as-a-judge: las pruebas que haría falta tener están escritas en un archivo sonda. Una prueba ejecutable es más fiable que un LLM encargado de confirmar un comportamiento deseado, cuyo veredicto probabilista puede hacerte creer que está bien cuando no lo está.

::: warning Cada ejecución trabaja sobre un clon desechable
Si el dispositivo trabajara directamente en el árbol de trabajo, cada ejecución modificaría el repositorio y la siguiente mediría esas modificaciones en lugar de la configuración. La herramienta que usamos más abajo clona por tanto NÉON **a un tag**, `etalon-v1`, en un directorio temporal, en cada ejecución.
:::

### Los controles, a mano

#### El modelo

::: info Ejercicio (en clase)
Lanza la misma solicitud en dos modelos de tamaños diferentes, el que usas habitualmente y el más grande al que tienes acceso. La solicitud es voluntariamente mínima, es la que se escribe naturalmente el primer día. La llamaremos «solicitud descuidada» en el resto de este módulo:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Asegúrate de crear previamente dos clones separados:

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

y luego trabaja en el directorio correspondiente al modelo probado.

Lee los dos diffs, y luego los dos `/session`. Anota tus observaciones sin sacar conclusiones: la sección sobre las repeticiones explicará por qué dos ejecuciones no bastan para desempatar dos modelos.
:::

#### El esfuerzo de razonamiento

`pi --help` anuncia siete niveles de razonamiento, de `off` a `max`. Es un control simple de manipular, y por eso resulta tentador empezar por él.

::: info Ejercicio (en clase)
Lanza la misma tarea con `--thinking minimal`, y luego con `--thinking max`, y compara los tokens de salida y la respuesta. No encontrarás ninguna diferencia, porque las dos banderas producen exactamente la misma solicitud si usas el modelo `gemma-4-31b`.

Para este modelo solo hay dos modos: el thinking `on` u `off`.

Rehaz la comparación entre dos niveles realmente distintos en tu modelo, por ejemplo `off` y `high`, y mide la diferencia.
:::

El razonamiento sí tiene un efecto cuando se mide entre dos niveles reales, y nuestras mediciones más abajo darán su magnitud. La lección general tiene que ver más bien con la confianza que merecen los ajustes: **un ajuste expuesto por el harness no se transmite necesariamente al modelo**, porque entre la configuración que escribes y la consulta que se envía hay una tabla de correspondencia escrita por alguien, que puede estar incompleta. Encontrarás esta situación varias veces en la formación, y con regularidad en tu trabajo. Toma la costumbre de buscar dónde aterriza una configuración o un flag antes de confiar en él.

### Lo que escribimos

#### `AGENTS.md`, el punto de configuración global

El archivo de reglas situado en la raíz del repositorio entra en el contexto en cada turno, lo que lo convierte en un buen candidato para definir el marco global de nuestro proyecto. Cuando el agente se equivoca, la reacción natural consiste en añadirle una frase, y luego otra. Cada línea añadida tiene, sin embargo, un coste, y cuanto más crece el archivo, menos ve el agente el conjunto; la mejora de los modelos volverá además obsoletas las líneas introducidas anteriormente. Este archivo exige por tanto un refactoring continuo, a lo largo de toda la vida del proyecto.

Establecemos para esta formación una restricción fuerte.

::: danger Presupuesto: 40 líneas
El `AGENTS.md` de NÉON nunca superará las 40 líneas, de principio a fin de la formación. Cada módulo que quiera añadirle una regla deberá primero retirar una, o reformular para que las dos quepan en una sola.

Esta restricción te obliga a hacer el trabajo de refactorización continua descrito más arriba: cada regla debe merecer su lugar, y un archivo corto tiene muchas más posibilidades de ser seguido de verdad que una guía de estilo larga.
:::

También podemos apoyarnos en otros archivos y decirlo en `AGENTS.md`, para que el agente los lea cuando sea necesario. Por ejemplo, podemos indicarle que las convenciones están en `CONTRIBUTING.md`, la arquitectura en `README.md` y el historial en git.

En nuestras veinte ejecuciones de la issue #1 con la petición descuidada, **ninguna lanzó la suite de pruebas** y **ninguna añadió un caso**.

::: info Ejercicio (en clase)
Escribe el `AGENTS.md` de NÉON a partir de tus propias ejecuciones en lugar de las nuestras: relee los diffs que acabas de producir y busca lo que el agente hizo sin que se le pidiera, u omitió cuando se le pedía. Haz que lance los tests cada vez que modifique el código y que añada casos si no hay cobertura.

Esta es la base de partida, para discutir y enmendar. Es el mismo archivo que usan nuestras mediciones, y está versionado en los experimentos de más abajo:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning Un `AGENTS.md` puede esconder a otro
Pi carga estos archivos de forma acumulativa: desde tu `~/.pi/agent/AGENTS.md` personal, luego desde cada directorio padre al subir, y por último desde el directorio actual. Un archivo de reglas personal se cuela así en todas tus mediciones sin que estés informado.

El indicador `--no-context-files`, abreviado `-nc`, desactiva este descubrimiento, lo que es indispensable para medir correctamente. La herramienta de medición más abajo trabaja en un clon desechable donde solo se deposita el archivo `AGENTS.md` del directorio actual (NÉON).
:::

#### El prompt de sistema

Pi permite reemplazar por completo su prompt de sistema con un `.pi/SYSTEM.md` en la raíz del proyecto o con un `~/.pi/agent/SYSTEM.md` global. La opción `--system-prompt` obedece una regla ligeramente diferente, ya que los archivos de contexto y los skills se siguen añadiendo por encima, de modo que nunca se parte del todo de una página en blanco.

::: info Ejercicio (autónomo)
Crea un `.pi/SYSTEM.md` de tres líneas. Es la pieza que nuestras mediciones depositan en el clon para la configuración `-system_prompt`:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Relanza la misma tarea y compara los tokens de entrada, los turnos, la duración y lo que contiene el diff.
:::


El prompt de sistema de Pi ocupa 550 tokens. Todo el resto del trabajo se juega en otra parte, y te animamos a modificarlo solo por buenas razones. Te lo mostramos aquí para ilustrar la flexibilidad que ofrece Pi.

#### Una ventana limitada, para ver la compactación

Cuando el contexto se acerca al límite, Pi compacta, es decir, resume los mensajes antiguos y solo conserva intactos los más recientes. La activación sigue la regla `contextTokens > contextWindow - reserveTokens`, donde `reserveTokens` vale 16 384 por defecto y representa el espacio reservado para la respuesta. El corte es visible en `/tree`, y `/compact` permite forzarlo, con instrucciones opcionales para orientar el resumen.

En NÉON, según el modelo, la compactación nunca se activará. El repositorio tiene 617 líneas, `gemma-4-31b` anuncia una ventana de aproximadamente 128 000 tokens, lo que sitúa el umbral en torno a 112 000, y nuestra experiencia más costosa solo alcanza esa cifra acumulando trece turnos, ninguno de los cuales pesa más de una decena de miles de tokens. Observar el mecanismo implica, por tanto, crear la restricción para ver sus efectos más rápidamente.

::: info Ejercicio (autónomo)
Declara en `~/.pi/agent/models.json` una segunda entrada, que apunte al mismo servicio, pero anunciando una ventana de 32 000 tokens:

```json
{
  "providers": {
    "ilaas": {
      "baseUrl": "https://llm.ilaas.fr/v1",
      "api": "openai-completions",
      "apiKey": "XXXXX",
      "models": [
        {
          "id": "gemma-4-31b",
          "name": "Gemma 4 31B (fenêtre bridée)",
          "reasoning": true,
          "contextWindow": 32000,
          "maxTokens": 8000,
          "cost": {
            "input": 0.14, "output": 0.28,
            "cacheRead": 0.0028, "cacheWrite": 0
          }
        }
      ]
    }
  }
}
```

Añade en el `.pi/settings.json` de NÉON umbrales coherentes con esta ventana pequeña:

```json
{ "compaction": { "reserveTokens": 4000, "keepRecentTokens": 8000 } }
```

Dispones entonces de los dos regímenes en `/model`, el modelo real de 128K y el mismo limitado a 32K. Haz trabajar al agente sobre varios archivos con el segundo hasta que se dispare, lee el resumen producido, luego verifica en `/tree` dónde se produjo el corte y si el agente todavía sabe lo que se le había pedido al principio.
:::

Esta manipulación muestra también que Pi compacta a 32 000 tokens no porque el modelo sature, sino porque tú se lo has declarado. La ventana que conoce un harness es una línea de configuración y no una propiedad del modelo. Esta constatación te servirá el día en que un agente se ponga a compactar demasiado pronto sin razón aparente.

### Un experimento más completo

#### El dispositivo

Ahora estudiamos con más detalle la influencia de las distintas partes del contexto, ejecutando cada configuración varias veces para tener en cuenta la dispersión de los resultados.

Para ello, vamos a utilizar [trysquare](https://github.com/AI-for-dev/trysquare), una herramienta escrita en Python y diseñada especialmente para esta formación. Lanza las configuraciones de un escenario, anota cada ejecución, agrega y ofrece una síntesis de los resultados. No sabe nada de NÉON, nada del issue #1, nada de esta formación.

`scripts/trysquare-campaign/` es el directorio que contiene el experimento. Este es su contenido:

```
scripts/trysquare-campaign/
  trysquare.toml     chemins machine : où est NÉON, où vivent les clones jetables
  scenarios/         une expérience = un fichier TOML autonome
  hypotheses/        ce qui est prédit, écrit avant de mesurer
  briques/           tickets, AGENTS.md, prompt système, compétences : le matériau
  validateurs/       ce qui note
  results/           une matrice par répertoire
```

No entraremos en los detalles de diseño y de uso, para los cuales puedes remitirte a la [documentación](https://ai-for-dev.github.io/trysquare/). Para esta formación, recuerda que el directorio `scenarios/` describe los experimentos: cada archivo declara el modelo utilizado (en el sentido en que Pi lo nombra), el número de repeticiones, las configuraciones del experimento y las pruebas de validación.

#### El plan del experimento

El plan elegido es el más simple que sigue siendo legible: una **base** y luego un conjunto de variantes que cambian cada una pocas cosas.

La base, llamada `nothing`, reproduce lo que alguien hace el primer día: la solicitud descuidada proporcionada más arriba en tus primeros ensayos, sin archivo de reglas, el system prompt del agente y el razonamiento desactivado. Cada otra configuración añade un elemento para ver su efecto en la respuesta.

| configuración                    | lo que cambia                                                        |
| -------------------------------- | -------------------------------------------------------------------- |
| `nothing`                        | nada, es la referencia                                               |
| `+thinking`                      | `thinking = "high"`                                                  |
| `+agents`                        | `brick/AGENTS.md` se coloca en el clon                               |
| `+well_crafted`                  | el prompt describe correctamente el problema y se refiere a `ISSUES.md` |
| `-system_prompt`                 | el system prompt se reemplaza por tres líneas                        |
| `+agents+well_crafted`           | `AGENTS.md` + prompt bien redactado                                  |
| `+agents+add_tests+well_crafted` | aquí se añaden además los tests que queremos ver pasar               |

Un experimento cabe en un archivo: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

El directorio de la experiencia contiene otras configuraciones además de las de la tabla anterior; pertenecen a otros módulos y las discutiremos más adelante.

El prompt bien escrito no copia el contenido del ticket. `ISSUES.md` ya describe cómo corregir el bug, en el repositorio que el agente tiene a mano. El prompt nombra entonces la issue, el alcance y el criterio de parada, y nada más:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Esta configuración mide entonces si señalar un documento escrito basta para que el agente vaya a leerlo y lo tenga en cuenta. Si el prompt copiara la solución, mediríamos únicamente la capacidad del agente para seguir una consigna que acabamos de darle.

#### Los tests de validación

Para juzgar la calidad de los resultados, el escenario declara tests de validación:

- **delivered**: la ejecución llegó hasta el final, sin interrupción.
- **suite_lancee**: el agente pensó en lanzar los tests que se encuentran en el directorio `game`.
- **in_scope**: el agente solo modificó los archivos que se le pidió modificar, y únicamente las líneas que corresponden al problema.
- **tests_ajoutes**: el agente pensó en añadir tests sobre los rebotes de la pelota contra los ladrillos.
- **`sonde.test.js`**: al final de la ejecución, esta sonda verifica que las modificaciones del código corrigen el problema en su globalidad, tal como se describe en `ISSUES.md`. También se deposita desde el inicio en la configuración `+add_tests`, para ver si el agente es capaz de reparar sus errores en función de los tests.

#### Las trazas

La experiencia guarda trazas que permiten analizar a posteriori lo que sucedió. Para cada run, tienes acceso a:

- una exportación de la sesión Pi en formato JSONL, que es posible volver a pasar a formato HTML (hablaremos de ello un poco más adelante);
- un directorio `validation` que indica el estado de los tests de validación;
- un archivo `configuration.json` que recuerda el marco del run (modelo, harness, tests...);
- un patch (`diff.patch`) que indica lo que se modificó en el código de NÉON durante el run.

Al final de la experiencia, una síntesis en formatos HTML y Markdown da los éxitos de las validaciones para cada configuración, así como promedios sobre los costos en tokens y la duración de los runs.

#### Cuántas repeticiones, y por qué

Cada configuración se ejecuta varias veces y la razón se ve ya muy claramente en la configuración de base.

Estas son las seis primeras ejecuciones de `nothing`, estrictamente idénticas en su configuración: mismo modelo, mismo esfuerzo, mismo prompt, mismo repositorio en el mismo commit.

| ejecución       | 1      | 2      | 3      | 4       | 5      | 6       |
| --------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| tokens de entrada | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| turnos          | 4      | 5      | 4      | 4       | 5      | 4       |
| duración        | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterio alcanzado | sí    | sí    | sí    | **no**  | sí    | **no**  |

El costo varía en menos de un cuarto, el número de turnos toma dos valores, y la respuesta cambia una vez de cada tres. Una ejecución única de esta configuración te habría dado, según el sorteo, «la base corrige el bug» o «la base no lo corrige».

La configuración mejor equipada desplaza su dispersión al costo más que a la respuesta. En `+agents+add_tests+well_crafted`, los tokens de entrada van de 42 731 a 2 420 677, es decir, un rango de **×57**, y tres ejecuciones consecutivas dan 2 420 677, 2 147 526 y luego 594 786.

Ante esta dispersión, trysquare nunca publica una cifra sola. Dos nociones bastan para leer sus tablas.

**Un punto es un punto porcentual de éxito.** `+agents+add_tests+well_crafted` alcanza el criterio 18 veces de 20, es decir, 90 %, y `nothing` 11 veces de 20, es decir, 55 %: la diferencia vale **+35 puntos**. Solo cuentan las ejecuciones válidas; las que no han entregado nada se retiran de ambos lados, lo que explica que un denominador pueda ser inferior al número de repeticiones.

Las ejecuciones se sortean aleatoriamente, de modo que no se realiza un experimento veinte veces seguidas, sino de forma repartida.

Leer una diferencia equivale entonces a plantear una sola pregunta: **¿este intervalo contiene el cero?** Si no lo contiene, la diferencia está marcada `*` y es **establecida**. Si lo contiene, está marcada `o` y **no es concluyente**, cualquiera que sea el valor en el centro.

Los dos casos están en la matriz. Los +35 puntos anteriores vienen con un intervalo de +10 a +60, así que la ganancia es ciertamente positiva sin que se pueda decir si vale diez puntos o sesenta. La configuración `+well_crafted` muestra +17 puntos en este mismo criterio, pero su intervalo contiene el cero: estas ejecuciones siguen siendo compatibles tanto con una palanca que ayuda como con una que perjudica.

Los `o` se muestran igualmente en las tablas, con un recordatorio bajo cada una de ellas: ninguna conclusión puede apoyarse en una diferencia marcada `o`.

El número de repeticiones sigue siendo un parámetro, porque la elección correcta depende de lo que buscas. **Tres bastan para ver la dispersión**, que es el objetivo en sala. **Desempatar dos palancas cercanas requiere mucho más**, y las columnas que cuentan éxitos son las más exigentes: un 2/3 frente a 3/3 no quiere decir casi nada, mientras que un 8/20 frente a 20/20 se defiende. Las tablas publicadas más abajo tienen veinte repeticiones por esta razón.

::: info Ejercicio (en sala, luego en autonomía)
Debes tener [uv](https://docs.astral.sh/uv/getting-started/installation/) instalado en tu máquina para poder continuar.

Hemos extraído la experiencia en un repositorio dedicado fuera de los materiales de formación: [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter).

```bash
git clone https://github.com/AI-for-dev/trysquare-starter
cd trysquare-starter
uv sync
```

Empieza por el plan completo, que no consume nada:

```bash
uv run trysquare run scenarios/issue1-contexte.toml --output results --dry-run
```

La configuración se toma del `trysquare.toml`.

Luego lanza la matriz con tres repeticiones y déjala correr mientras hablas de los cursores:

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

**En autonomía**, copia `scenarios/issue1-contexte.toml`, cambia una configuración y vuelve a lanzar. No habrás tocado ni la herramienta, ni el validador, ni las demás configuraciones, y es el único artefacto de este módulo que no caducará.
:::

#### Nuestras mediciones

Te habrás dado cuenta durante tus primeros ensayos con `trysquare`: hacer mediciones lleva tiempo. Para una veintena de repeticiones, necesitarás entre 2 h y 3 h para tener el conjunto de resultados junto con los del módulo siguiente. Por eso hemos preferido darte una campaña completa realizada de antemano en la que puedes navegar por los directorios de cada ejecución como lo hiciste antes.

Esto es lo que obtuvimos en agosto de 2026, en `ilaas` y `gemma-4-31b`, contra el commit `d62ccd1f` de NÉON, con **veinte repeticiones por configuración**. Las dos configuraciones con competencia figuran en el archivo y pertenecen al módulo siguiente; están excluidas de las tablas siguientes, a excepción de una observación al final.

| configuración                   | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

Y las columnas de la sonda, con el criterio a la cabeza:

| configuración                | bloques   | ángulos  | salida   | vecinas  | travesía |
| ---------------------------- | --------- | -------- | -------- | -------- | -------- |
| `nothing`                    | 11/20     | **0/20** | 9/20     | 7/20     | 0/20     |
| `+thinking`                  | 16/20     | **0/20** | 17/20    | 15/20    | 0/20     |
| `+agents`                    | 9/20      | **0/20** | 8/20     | 6/20     | 0/20     |
| `+well_crafted`              | 13/20     | **14/20**| 13/20    | 13/20    | 4/20     |
| `-system_prompt`             | 14/20     | **0/20** | 14/20    | 13/20    | 0/20     |
| `+agents+well_crafted`       | 11/20     | **12/20**| 9/20     | 9/20     | 12/20    |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20 |

Los denominadores de `+well_crafted` y `+thinking` valen 18 y 19 en las columnas de costo, porque ILaaS devolvió `Request timed out` durante la medición y las ejecuciones afectadas no produjeron nada.

Extraemos cinco enseñanzas de estas dos tablas, y la última hará la transición con el siguiente módulo. Todas las diferencias citadas más abajo provienen de los intervalos descritos más arriba, con la misma marca `*` para una diferencia establecida y `o` para una diferencia no concluyente. Las comparaciones se hacen a partir de un experimento. Si no lo especificas, se elige el primer experimento (aquí `nothing`). Puedes rehacer los cálculos apoyándote en otra referencia. Eso solo cambia el puntero: no cuesta nada en términos de modelo y no vuelve a medir nada.

```bash
uv run trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

La salida va a un `synthesis_ref-<référence>.md` junto a la síntesis habitual que no se toca.

**El prompt enmarcado consigue que se haga todo lo que el ticket nombra, y nada más.** `tests_ajoutes` pasa de 0/20 a 17/20 y `rebond_angles` de 0/20 a 14/20, dos columnas que estaban vacías y que se llenan. El prompt, sin embargo, no dice nada del mecanismo del rebote: nombra el resultado, el alcance y el criterio de parada, y es `ISSUES.md` el que describe la esquina, la salida del rectángulo, los ladrillos vecinos y el tunneling. La esquina se mantiene en **0/20 en las cuatro configuraciones que no enmarcan el ticket**, es decir, ochenta ejecuciones consecutivas. Señalar un documento escrito basta, por tanto, para que se lea, y es el contenido de ese documento el que decide lo que se tratará.

**El archivo de reglas solo mueve el procedimiento, y ya no mueve nada en cuanto el ticket es correcto.** `+agents` hace pasar `suite_lancee` de 0/20 a 20/20, porque una de sus cuatro líneas nombra el comando. En el criterio, da 9/20 frente a 11/20 de la base, diferencia no concluyente, y en `tests_ajoutes` se mantiene en 0/20 puesto que ninguna de sus líneas habla de pruebas. Cuando se añade al prompt enmarcado, no aporta estrictamente nada: 11/20 frente a 13/20 en el criterio, 12/20 frente a 14/20 en la esquina, 17/20 frente a 17/20 en las pruebas añadidas, sin que ninguna de estas tres diferencias sea distinguible. El archivo de reglas es más un sustituto del buen ticket que un complemento, lo que da una regla de escritura directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea a eliminar.

**El razonamiento desplaza el criterio, y él solo no hace que se lea el ticket.** `+thinking` da 16/20 sobre `rebond_briques`, es decir, una diferencia de +29 puntos cuyo intervalo excluye el cero. Es la única palanca de la matriz, aparte de las que tocan el ticket, que desplaza la corrección en sí. Su columna de la esquina se queda en 0/20 y sus tests añadidos en 3/20: el razonamiento mejora lo que el modelo hace con lo que tiene delante, pero no lo lleva a ir a buscar lo que le falta.

**El prompt estructurado hace escribir los tests rojos, y una ejecución de cada cinco se detiene ahí.** La columna `touched` lo dice sin ambigüedad: en `+well_crafted` y `+agents+well_crafted`, cuatro ejecuciones de veinte nunca abren `game/neon.js`, de las cuales dos o tres escriben únicamente en `game/neon.test.js` y una o dos no entregan nada en absoluto. Ninguna otra configuración muestra este comportamiento: `nothing`, `+agents` y `-system_prompt` tocan el código fuente en veinte ejecuciones de veinte. La explicación está en el ticket, que enumera cinco subcasos y termina con « each case above added **first as a red test**, then green »: `gemma-4-31b` escribe los rojos y se detiene ahí, por no poder procesar la especificación completa. Es también por eso que el criterio de corrección no sube mientras que la esquina sube: el modelo tiene un presupuesto de trabajo, y describir más trabajo en el ticket no lo agranda.

**Entregar los tests repara ese descolgamiento.** La configuración `+agents+add_tests+well_crafted` se lee frente a `+agents+well_crafted`, la única de la que no difiere más que por la sonda depositada en el árbol:

| columna           | `+agents+well_crafted` | `+add_tests` | diferencia            |
| ----------------- | ---------------------- | ------------ | --------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | no aplica              | **20/20**    |                        |

Las cuatro columnas de la evaluación suben, y las cuatro diferencias quedan establecidas. La palanca, por tanto, no solo gana casos límite: también recupera terreno en el propio criterio. Observa la amplitud de los intervalos y, en particular, el de la esquina, que comienza en un solo punto: estas diferencias están establecidas en el sentido de que son positivas, sin que se pueda estimar su tamaño con más precisión que un factor de cincuenta.

`sonde_intacte` obtiene 20/20, lo que significa que el modelo no ha intentado modificar las pruebas de referencia. Y `tests_ajoutes` no varía, lo que es coherente con un agente que ya tiene los casos a la vista y no tiene ninguna razón para reescribirlos.

::: warning Ninguna columna de coste gemma es citable aquí
La matriz cuenta 1 151 reintentos, es decir, turnos relanzados porque el proveedor había fallado, y el recuadro más abajo muestra hasta qué punto se concentran en las configuraciones más pesadas. Un reintento vuelve a reproducir el turno con todo el contexto acumulado, por lo que infla las columnas de coste y, sobre todo, vuelve a pilotar al agente.

El mismo escenario, medido sobre `opencode-go` y `deepseek-v4-flash`, registra **37**, lo que hace legibles las suyas:

| configuración                | turnos | duración |
| ---------------------------- | ------ | -------- |
| `nothing`                    | 19     | 163 s    |
| `+agents`                    | 12     | 65 s     |
| `-system_prompt`             | 17     | 142 s    |
| `+well_crafted`              | 15     | 252 s    |
| `+thinking`                  | 19     | 490 s    |
| `+agents+well_crafted`       | 14     | 561 s    |
| `+agents+add_tests+well_crafted` | 13     | 410 s    |

Los tokens de entrada de las dos matrices no se colocan en la misma tabla, por una razón que no tiene nada que ver con el modelo: ILaaS no reporta ninguna caché, `cacheRead` valiendo cero en sus ciento ochenta ejecuciones, de modo que su columna de entrada es la suma de los prefijos completos releídos en cada turno. opencode Zen sí reporta la caché, hasta cinco millones de tokens leídos en una sola ejecución. La misma configuración muestra por tanto 558 000 tokens de entrada de un lado y 15 000 del otro, sin que ninguno de los dos sea falso. Es la mitad práctica de lo que la primera parte de este módulo explica sobre la caché: el costo de las entradas depende de la configuración del proveedor del modelo y activar la caché permite reducir drásticamente la factura.
:::

#### Tres verificaciones antes de citar una tabla

Una matriz publica tablas, intervalos y veredictos, lo que puede dar la impresión de conclusiones sólidas. Sin embargo, al elaborar esta formación, nos enfrentamos a varios fenómenos que pueden desacreditar algunos resultados.

::: warning El recuento de reintentos
Un reintento es un turno que la herramienta tuvo que relanzar porque el proveedor había fallado. Vuelve a reproducir ese turno con todo el contexto acumulado, por lo que infla las columnas de costo y, sobre todo, vuelve a pilotar al agente: ya no es la misma forma de trabajar.

En la matriz `gemma-4-31b`, el recuento es de **1 151**, y no está repartido:

| configuración                | reintentos |
| ---------------------------- | ---------- |
| `nothing`                    | 1          |
| `+agents`                    | 2          |
| `-system_prompt`             | 1          |
| `+well_crafted`              | 24         |
| `+thinking`                  | 81         |
| `+agents+well_crafted`       | 205        |
| `+agents+add_tests+well_crafted` | 205    |
| `+agents+add_tests+skill`    | 287        |
| `+agents+skill`              | 345        |

Nada en las configuraciones de contexto corto, todo en las de razonamiento elevado, y tanto más cuanto que el contexto acumulado crece: una sola ejecución de `+agents+add_tests+well_crafted` consumió 2,4 millones de tokens de entrada en sesenta y tres turnos y acumuló dieciocho reintentos. El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` suma **treinta y siete** en total.
:::

::: warning La importancia de la prueba de validación
Una columna uniformemente negra se parece a un comportamiento del agente y puede ser un defecto del validador. La única forma de distinguirlos es que la métrica diga **por qué** respondió falso, y no solo que respondió falso.

Nuestro validador hace eso con `suite_lancee`: cuando no reconoce ningún lanzamiento de la suite, copia en su motivo todos los comandos que el agente ejecutó. Esta precaución es importante, porque la forma del comando varía de un modelo a otro mucho más que el propio comando. `deepseek-v4-flash` prefija cada llamada con el directorio de trabajo (`cd .../repo && npm test`, 664 veces en la matriz) y redirige de buena gana la salida (`npm test 2>&1 | tail -30`, 80 veces), mientras que `gemma-4-31b` escribe `npm test` a secas. Una prueba de validación que solo conociera la última forma puntuaría al primer modelo con cero en toda la matriz.

En conclusión, **escribe tus métricas con precaución y pruébalas sobre un conjunto de pruebas**. Tienen que ser fiables. Anota cualquier comportamiento extraño antes de sacar conclusiones precipitadas.
:::

::: warning Lo que la comparación de los dos modelos permite decir, y lo que no permite
Las dos matrices (`gemma-4-31b` y `deepseek-v4-flash`) abarcan el mismo escenario, las mismas nueve configuraciones y el mismo commit de NÉON, de modo que sus columnas de puntuación se leen una contra la otra. El modelo y el proveedor cambiaron juntos, lo que impide atribuir la diferencia a uno más que al otro, y aun así deja ver esto en la columna de la esquina:

| configuración          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Los dos modelos reaccionan a la misma palanca y en el mismo sentido, el más capaz parte de más arriba y sube más alto.
:::

Estas cifras no están pensadas para ser tomadas al pie de la letra ni para ser recopiadas dentro de un año. Relanza la matriz: es precisamente para eso que sirve, y la que obtengas reemplazará a esta.

Un contexto bien mantenido hace al agente disciplinado y completo en lo que el ticket nombra, sin volverlo exhaustivo: la esquina de la pieza nunca se alcanza donde el ticket no la describe, y el tunneling sigue siendo la columna más baja de todas las que mide la sonda. Ir más allá de lo que contiene el material escrito exigirá un revisor independiente y un bucle de verificación, que es el tema de los módulos sobre la delegación y los workflows.

::: warning Tres conclusiones tentadoras que los intervalos no permiten
Cada una de las frases siguientes se apoya en una cifra exacta de la campaña publicada en esta página, y ninguna se sostiene.

**« El archivo de reglas rompe la corrección. »** `+agents` da 9/20 en el criterio frente a 11/20 en la base. La diferencia vale -10 puntos pero su intervalo contiene cero: no podemos decir nada al respecto, ni en un sentido ni en el otro.

**« Quitar el system prompt mejora el rebote. »** `-system_prompt` da 14/20 frente a 11/20, es decir, +15 puntos, y el intervalo también contiene el cero. Con solo tres ejecuciones bien sorteadas, habríamos obtenido 3/3 frente a 1/3 y habríamos podido creer en ello de manera duradera.

**« El prompt delimitado corrige mejor el bug. »** `+well_crafted` da +17 puntos en el criterio, no concluyente. El efecto real de esta palanca se ve en otra parte, en los tests añadidos y en la esquina, donde las diferencias se cuentan por decenas de puntos y no dejan ninguna duda.

Repetir tres veces no basta, por tanto: un efecto que no supera la dispersión de su propia configuración no es un efecto. Y un efecto establecido en esta tarea, con este ticket y este modelo, solo está establecido en ese marco.
:::

Acabas de practicar una evaluación, en el sentido de que se comparan comportamientos sobre una misma tarea, con repeticiones y sabiendo que la medida es ruidosa, allí donde un test responde sí o no a una pregunta cerrada. El módulo 3.2 formalizará esta práctica con archivos de evaluación y un LLM-juez, para los criterios que la sonda de este módulo no habría podido cubrir.

### La pila contra la base

Las palancas de este módulo exigen atención y tiempo, mientras que un modelo más capaz se obtiene simplemente pagando más. Por tanto, es legítimo preguntarse si es más rentable cuidar el contexto o cambiar de modelo. La segunda mitad de esta pregunta no se mide aquí, y decimos más abajo por qué. La primera sí se mide, a modelo constante, enfrentando las dos configuraciones extremas de la matriz.

::: info Ejercicio (en sala)
Compara la configuración `nothing`, que recibe una petición de una línea y nada más, y la configuración `+agents+add_tests+well_crafted`, que dispone del razonamiento, del ticket delimitado, del `AGENTS.md` y de la sonda depositada en el árbol. Mira primero los diffs, luego las columnas de la sonda, y solo al final lo que ha costado cada una.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, diferencia de +35 puntos |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| turnos medianos    | 19        | 13                               |
| duración mediana   | 163 s     | 410 s                            |

Las dos últimas filas se toman de la matriz `deepseek-v4-flash`, cuyas treinta y siete repeticiones hacen legibles las columnas de costo, y las columnas de puntuación, de `gemma-4-31b`.

El harness completo alcanza dieciocho sobre veinte en un criterio donde la base no pasa de once, y la columna más severa de la sonda pasa de 7/20 a 18/20. Es la tesis de Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, verificada en su mitad más fácil de establecer: a modelo rigurosamente constante, el harness por sí solo hace la diferencia entre una corrección que funciona una de cada dos veces y una corrección que funciona nueve de cada diez.

La esquina pasa de 0/20 a 18/20, y el prompt delimitado por sí solo ya obtenía catorce: lo esencial de la ganancia viene de que el prompt hace referencia a un ticket en `ISSUES.md` que nombra el caso, y la sonda añade la perseverancia que faltaba para terminar el trabajo.

### Lo que este módulo no sabe conseguir

La única palanca que ha llevado al modelo a atender todo lo que pide el ticket es la que le puso los tests delante de los ojos. Esta configuración tiene, sin embargo, algo de artificial: los casos límite estaban escritos de antemano, por nosotros, en el propio archivo que puntúa. En un ticket real, nadie te los proporcionará.

Lo que esta configuración aporta en realidad es perseverancia. El modelo abandona ante un ticket largo porque agota su presupuesto formulando los casos en lugar de corregirlos; recibir los casos ya formulados le devuelve ese presupuesto. La pregunta del módulo siguiente es, pues, saber si una **competencia**, es decir, un procedimiento de trabajo escrito una vez y recargado a demanda, puede producir la misma perseverancia sin proporcionar los tests.


## Generalizar

Ocho principios de este módulo siguen siendo válidos más allá de Pi, de `ilaas` y de la versión de los paquetes que acabas de instalar.

**Lo que es estable delante, lo que varía detrás.** El caché solo funciona con un prefijo sin cambios y cuesta cincuenta veces menos que la entrada, de modo que cualquier dato volátil colocado temprano en el contexto, ya se trate de una marca de tiempo, de un estado de git o de una fecha, invalida todo lo que sigue.

**Señalar un documento escrito basta para que sea leído, y lo que está escrito en él decide el resultado.** Nuestro ticket delimitado no describe el mecanismo del rebote: nombra el issue, el perímetro y el criterio de parada. Diecisiete ejecuciones de veinte fueron a leer `ISSUES.md`, encontraron allí la petición de casos límite como tests en rojo, y la ejecutaron, mientras que la petición descuidada no había obtenido ninguna. La esquina del ladrillo da la versión más nítida: está descrita en `ISSUES.md` y en ninguno de nuestros prompts, y vale 0/20 en las cuatro configuraciones que no nombran el issue, frente a 14/20 en la que sí lo nombra. Escribe lo que esperas en un documento que puedas señalar, y relee ese documento antes de concluir nada sobre el agente.

Un modelo tiene un presupuesto, y describir más trabajo no lo aumenta. Nuestro ticket enumera cinco subcasos y pide un test en rojo para cada uno; cuatro ejecuciones de veinte escriben estos tests en rojo y nunca abren el archivo fuente. Esta constatación condiciona lo que sigue: o reduces la petición a lo que el modelo puede soportar, o le das con qué aguantar la distancia, que es el tema del módulo siguiente.

El archivo de reglas cambia lo que el agente hace y no lo que encuentra, y solo sirve para lo que el ticket no dice. Entra en el contexto en cada turno, lo que lo convierte en una palanca fuerte y costosa a la vez, de ahí el interés de mantenerlo corto, de respaldar cada regla con un fallo observado y de refactorizarlo en lugar de alargarlo. Nuestras mediciones acotan con precisión lo que aporta: la configuración `+agents` hace pasar de 0/20 a 20/20 el número de ejecuciones que lanzan la suite de pruebas, deja el criterio de corrección sin cambios, y ya no aporta nada en absoluto en cuanto está el prompt delimitado. La regla de escritura que se deriva de ello es directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que hay que quitar.

Un ajuste expuesto por el harness no se transmite necesariamente al modelo. Entre la bandera que escribes y la solicitud que se envía hay código y tablas de correspondencia, como muestra `--thinking max`, que no llega al modelo que usamos sin que nada te lo advierta. El corolario en el plano de la medición es que lo que decide el experimento debe quedar escrito en el experimento: un nivel de razonamiento heredado de una configuración personal hizo que una de nuestras configuraciones fuera idéntica a su línea base en todas las matrices publicadas.

Un efecto que no sobrevive al remuestreo no es un efecto. Repetir tres veces no basta: mientras el intervalo de una diferencia contenga cero, no hay nada que decir al respecto. De las nueve configuraciones medidas aquí, solo tres modifican el criterio de corrección de forma demostrada, mientras que las otras seis muestran cada una una cifra que podría parecer convincente. Además, una diferencia demostrada solo lo es en esta tarea, con este ticket y este modelo.

Lo que se mide debe fijarse con aquello que no se mueve. Un tag es un nombre, y `git tag -f` lo mueve sin dejar rastro del lado de la medición, de modo que dos matrices pueden declarar el mismo patrón y haber trabajado sobre dos versiones diferentes del código. Fija mediante el commit, que no se mueve, y si tu herramienta aún no lo permite, archiva al menos lo que el nombre resolvía en el momento de la medición.

**Una métrica debe decir el porqué, y no solo el qué.** Una columna uniformemente negra se parece a un comportamiento del agente y puede ser un defecto del validador, y nada los distingue mientras la métrica se limite a responder verdadero o falso. Haz que escriba aquello sobre lo que se pronunció: la nuestra copia, bajo cada falso, los comandos que el agente ha ejecutado, y eso es lo que permite verificar un cero en lugar de darlo por bueno.

**Escribe la hipótesis antes de medir, y versiónala.** Una hipótesis redactada después de las mediciones no es más que una conclusión disfrazada. La nuestra, `hypotheses/issue1-contexte.md`, contiene una predicción que resultó falsa, y es porque estaba escrita de antemano que la publicamos como tal en lugar de reformularla a posteriori como descubrimiento.

## Entregable

Este módulo produce tres piezas: las dos primeras sirven durante toda la jornada, la tercera servirá para el acto 4.

**1. El `AGENTS.md` de NÉON**, versionado en el repositorio, por debajo de las 40 líneas, cada regla justificada por un fallo que hayas observado.

**2. El directorio de matriz** producido por `trysquare run`, con su línea de log. El entregable no es una tabla copiada sino el archivo que permite reconstruirla: las mediciones brutas, las sesiones, los diffs y la versión de la herramienta que midió. Sin ese archivo, la matriz no puede ser ni verificada ni recalificada, y sus cifras no valen más que una opinión.

**3. La ficha de decisión**, una línea por palanca:

| palanca                         | efecto medido | ¿adoptada? | por qué |
| ------------------------------- | ------------- | ---------- | ------- |
| elección del modelo             |               |            |         |
| esfuerzo de razonamiento        |               |            |         |
| ticket acotado                  |               |            |         |
| contenido del ticket señalado   |               |            |         |
| `AGENTS.md`                     |               |            |         |
| system prompt                   |               |            |         |
| pruebas proporcionadas de antemano |            |            |         |
| ordenamiento / caché            |               |            |         |
| compactación                    |               |            |         |
| criterio ejecutable (sonda)     |               |            |         |

Dos líneas se añadieron a esta ficha después de nuestras últimas mediciones. «Contenido del ticket señalado» figura en ella porque la reescritura de `ISSUES.md` desplazó más columnas que cualquier ajuste del harness, y «pruebas proporcionadas de antemano» porque es la única palanca que compensó la caída del modelo en un ticket largo.

Esta ficha constituye el primer llenado real de la columna «¿tu harness?» de la tabla de correspondencia, para la línea «contexto». Los cinco módulos siguientes harán lo mismo para su bloque, de modo que abordarás el capstone con una tabla ya llenada por tus experimentos.

::: tip Criterio de éxito
Sabes citar una palanca que has medido como sin efecto sobre NÉON y decir bajo qué condición precisa tendría un efecto en otro lugar.

Nuestro ejemplo es `AGENTS.md`: no mueve el criterio de corrección ni un punto, y se volvería decisivo en un ticket cuyo fallo habitual es de procedimiento más que de razonamiento, o en un repositorio cuyos tickets están mal escritos. El tuyo será diferente, y ese es el objetivo. Este criterio exige haber visto las cifras y haber comprendido que son la tarea y su material los que las determinan. Por tanto, no puede satisfacerse de memoria.
:::

## Para ir más lejos

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), el estudio que justifica que no nos conformemos con llenar la ventana.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sobre el paso del prompt aislado hacia la arquitectura del contexto.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), cuya tesis es la que la comparación de la pila con la base pone a prueba.
- [La documentación de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), y en particular sus páginas sobre la compactación, los modelos y los ajustes.
- [trysquare](https://github.com/AI-for-dev/trysquare), la herramienta de medición utilizada en este módulo, y su guía de escritura de escenarios.
- La campaña trysquare de la formación, `scripts/trysquare-campaign/`, con sus hipótesis escritas antes de la medición y sus matrices archivadas. Es el único lugar donde las cifras de esta página son verificables.
