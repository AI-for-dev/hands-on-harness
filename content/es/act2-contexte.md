# El contexto y la ventana: qué ponemos en ella, qué cuesta

::: tip Objetivos de este módulo
- Saber decir qué hay realmente en la ventana de contexto, y qué cuesta cada parte
- Manipular las palancas que la llenan: modelo, esfuerzo de razonamiento, prompt, `AGENTS.md`, system prompt
- Montar un dispositivo de medición reproducible y usarlo para decidir
- Salir con un `AGENTS.md` corto y una decisión justificada sobre cada palanca
:::

La gestión del contexto es el bloque del que dependen todos los demás, ya que un subagente sirve para no contaminar el contexto principal, una memoria para no llenarlo con lo que se podría volver a encontrar, y un permiso para no volcar en él un archivo que no se debería haber leído. Hay que empezar, por tanto, por saber qué contiene la ventana y qué cuesta cada parte, sin lo cual los módulos siguientes no serán más que recetas aplicadas sin ser comprendidas.

Procedemos en el orden habitual: comprender qué hay en la ventana, reconstruir las palancas que la llenan y, después, extraer lo que sigue siendo válido cuando la herramienta cambia.

::: info Una convención de lectura
Cada manipulación está marcada como **en sala** o **en autonomía**. El recorrido en sala está diseñado para ajustarse a la sesión y para bastar para comprender los desafíos del módulo. Las manipulaciones en autonomía profundizan y están escritas para ser rehechas a solas, más tarde, en tu propio repositorio.
:::

## Comprender

### Cinco fuentes, una sola ventana

Cuando escribes una pregunta en Pi, el modelo recibe una pila de la que tu pregunta es solo una línea:

1. el **system prompt**, que describe al modelo su rol, sus herramientas y sus convenciones;
2. los **archivos de contexto**, `AGENTS.md` y `CLAUDE.md`, cargados desde tu directorio personal, luego desde cada directorio padre ascendiendo, y finalmente desde el directorio actual;
3. las **descripciones de las herramientas**, en JSON, una por herramienta disponible;
4. **tu pregunta**;
5. y, a medida que el bucle avanza, el **historial**, es decir, cada respuesta del modelo, cada llamada a herramienta y cada salida de herramienta.

Las cuatro primeras fuentes son estables de un turno a otro, mientras que la quinta crece en cada turno, lo que la convierte casi siempre en la responsable de los desbordamientos.

::: info Ejercicio (en sala)
Abre una sesión, haz cualquier pregunta y luego exporta la sesión con `\export`. Abre el archivo HTML generado y lee el system prompt de Pi completo, algo que la mayoría de los agentes de código no te permiten hacer.

Identifica en él lo que describe **capacidades** y lo que describe **convenciones**: más adelante mediremos el peso real de cada una de las dos categorías.
:::

En una solicitud tan trivial como «di simplemente OK», sin archivo de contexto, sin skill y sin extensión, la entrada pesa **1 660 tokens**, y cae a **1 110** si se sustituye el system prompt de Pi por tres líneas. El system prompt de Pi cuesta entonces alrededor de **550 tokens**, lo cual es poco en comparación con lo que las salidas de herramientas y el historial le añadirán después. Lo esencial de lo que llena una ventana de contexto no viene del harness sino de lo que tú y el agente vertéis en ella a lo largo de la sesión.

### ¿Cuánto cuesta usar un LLM?

Una llamada al modelo se factura en tres partidas, expresadas por millón de tokens. Aquí tienes las tarifas de los dos modelos tomados de la oferta opencode Go:

| modelo              | entrada | salida | lectura de caché |
| ------------------- | ------- | ------ | ----------------- |
| `deepseek-v4-flash` | 0,14 $  | 0,28 $ | 0,0028 $          |
| `deepseek-v4-pro`   | 1,74 $  | 3,48 $ | 0,0145 $          |

Estas tarifas son las publicadas por [opencode Zen](https://opencode.ai/docs/zen/). Nuestras mediciones más abajo se ejecutan en ILaaS, que no factura nada a los participantes de esta formación, y por tanto cuentan tokens en lugar de euros. Ambas se leen de la misma manera, salvo que un contador de tokens no te avisa cuando gastas.

De aquí surgen dos diferencias. La primera separa los dos modelos, ya que el `pro` cuesta 12,4 veces más que el `flash` a tarifa nominal. Es una primera forma de darse cuenta de que un modelo tiene más capacidades que otro. La segunda diferencia, mucho más amplia, separa la entrada de la lectura de caché: un factor de **50** en `flash` y **120** en `pro`.

Esta segunda diferencia es lo que hace que un agente de código sea económicamente viable, porque un agente relee su historial completo en cada turno y, de otro modo, pagaría veinte veces el precio de su contexto durante una sesión de veinte turnos.

::: info Ejercicio (en sala)
En una sesión interactiva, encadena cinco preguntas sobre un mismo archivo escribiendo `/session` después de cada una, y cambia de modelo con `/model` antes de la cuarta. Las preguntas deben prohibir explícitamente cualquier nueva lectura de archivo, ya que de lo contrario una nueva salida de herramienta se añadirá al contexto y dificultará la lectura.

Aquí tienes la secuencia exacta que hemos medido, en este caso en modo no interactivo para que sea reproducible tal cual. La opción `-c` continúa la sesión anterior, y en los comandos se omiten los acentos sin que ello afecte al resultado:

```bash
cd /chemin/vers/neon

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

Estos cinco turnos producen seis llamadas al modelo, porque el primero consume dos: una para solicitar la lectura de `theme.js`, y una segunda para responder una vez que la salida de la herramienta ha vuelto.

| llamada | turno | prompt                          | modelo  | entrada | lectura de caché | coste          |
| ------- | ----- | -------------------------------- | ------- | ------- | ----------------- | -------------- |
| 1       | 1     | « Lee `game/theme.js`... »       | `flash` | 1 675   | 0                  | 0,000254 $     |
| 2       | 1     | (continuación, tras la lectura)  | `flash` | 307     | 1 664              | 0,000081 $     |
| 3       | 2     | « cita un color... »             | `flash` | 66      | 2 048              | 0,000053 $     |
| 4       | 3     | « cuántos colores... »           | `flash` | 118     | 2 048              | 0,000087 $     |
| 5       | 4     | « confirma ese número... »       | `pro`   | 2 521   | **0**              | **0,005455 $** |
| 6       | 5     | « repite ese número... »         | `pro`   | 148     | 2 432              | 0,000362 $     |

La caché se activa desde la segunda llamada, incluso dentro de un mismo turno, y hace caer el coste en un factor de tres a cinco. El cambio de modelo en el cuarto turno reinicia la lectura de caché a cero y hace que se vuelva a pagar todo el prefijo a tarifa completa: ese único turno cuesta quince veces más que el siguiente, con el mismo modelo.
:::

::: warning Si `pi -p` se congela sin mostrar nada
Desde un script, redirige la entrada estándar con `< /dev/null`. En modo no interactivo, `pi` espera en su entrada estándar mientras esta permanezca abierta, lo que bloquea indefinidamente cuando se le llama, por ejemplo, desde un script bash. La herramienta de medición trysquare que describiremos más abajo conoce esta trampa y cierra la entrada estándar de cada ejecución utilizando `stdin=subprocess.DEVNULL` en un comando Python `subprocess.run`.
:::

La caché solo funciona sobre un **prefijo inalterado**, de lo cual se deriva la regla de ordenación del contexto: todo lo que varía debe colocarse detrás de lo que es estable. Una marca de tiempo o un `git status` deslizado en el system prompt invalida todo lo que sigue, herramientas, pregunta e historial incluidos, y te hace pagar la tarifa completa en cada turno, mientras que el mismo dato colocado en el mensaje del turno actual no cuesta nada, ya que se encuentra ya en la zona que varía.

Recuerda también que cambiar de modelo durante la sesión no es gratuito, algo que conviene tener presente cada vez que cambies de un modelo a otro con `/model`.

## Reconstruir

### La tarea, y qué cuenta como éxito

Todas las mediciones de este módulo se refieren a la misma tarea, la **issue #1** de NÉON: la bola atraviesa los ladrillos en lugar de rebotar.

El ticket está descrito en `ISSUES.md`, en la raíz del repositorio de NEON (https://github.com/AI-for-dev/neon). Explica que la bola pasa a través de los ladrillos, así como los distintos comportamientos que hay que corregir para obtener un comportamiento normal de la bola. Podríamos darle directamente este ticket al agente, pero no lo haremos por el momento. Por ahora queremos ver cómo se comporta en función del prompt que le proporcionamos y el marco que lo rodea.

Como puedes comprobar, esta issue tiene varios matices que serán difíciles de encontrar para el agente por sí solo. Verá rápidamente el problema y propondrá calcular una distancia a los lados del ladrillo. Según el lado golpeado, invertirá una de las dos velocidades. Pero el problema en la esquina, que es raro pero real, o el problema de una velocidad demasiado alta que haría que la bola atraviese el ladrillo sin siquiera verlo, lamentablemente hay muy pocas probabilidades de que los vea.

Además de la corrección del bug, queremos empezar a definir un marco y comprobar que el agente no se salga de él. Hay principalmente tres:

- El agente solo puede modificar `game/neon.js` y `game/neon.test.js`, y nada más.
- El agente debe lanzar los tests para comprobar que no ha roto nada.
- El agente debe añadir tests si la cobertura no es buena. Es nuestro caso aquí: no hay tests que verifiquen el comportamiento de la bola con el ladrillo.

Esto es lo que proponemos medir en cada ejecución:

| métrica               | qué dice                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`            | el agente ha modificado al menos un archivo                                                   |
| `in_scope`             | solo ha tocado `game/neon.js` y `game/neon.test.js`                                            |
| `suite_lancee`         | ha lanzado `npm test` él mismo, leído en su sesión                                             |
| `tests_ajoutes`        | la suite tiene más casos que en el patrón                                                      |
| **`rebond_briques`**   | **el criterio**: en cada una de las cuatro caras, el eje golpeado se invierte y el otro no se mueve |
| `rebond_angles`        | en la esquina, las dos componentes se invierten                                                |
| `rebond_sortie`        | después del rebote, la bola ha salido del rectángulo del ladrillo                              |
| `rebond_voisines`      | en una costura de la cuadrícula, el rebote se aplica una vez y no dos                          |
| `rebond_traversee`     | una bola rápida ya no atraviesa el ladrillo sin tocarlo                                        |

Comprobaremos todos estos puntos de manera determinista y sin usar un LLM-as-a-judge. Hemos escrito los tests que habría que tener en un archivo sonda. Piensa que un test que verificar es siempre mucho más seguro que usar un LLM para confirmar un comportamiento deseado. El aspecto probabilístico del LLM puede hacerte creer que está bien cuando en realidad no lo está en absoluto.

::: warning Cada ejecución trabaja sobre un clon desechable
Si el dispositivo trabajara directamente en el árbol de trabajo, cada ejecución modificaría el repositorio y la siguiente mediría esas modificaciones en lugar de la configuración. La herramienta que usamos más abajo clona, por tanto, NÉON **en un tag**, `etalon-v1`, en un directorio temporal, en cada ejecución. Sin esta precaución, `main` avanza, una sala corrige la issue #1, y las mediciones de ayer ya no se comparan con las de mañana sin que nada lo indique.

Esta protección no basta del todo, porque un tag sigue siendo un nombre que su propietario puede desplazar. Volveremos a ello en la parte «Generalizar».
:::

### Los deslizadores, a mano

#### El modelo

::: info Ejercicio (en sala)
Lanza la misma solicitud en dos modelos de tamaños diferentes, el que usas habitualmente y el más grande al que tengas acceso. La solicitud es voluntariamente mínima, es la que se escribe naturalmente el primer día. La llamaremos «petición descuidada» en el resto de este módulo:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Tendrás buen cuidado de hacer previamente dos clones separados usando el comando

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

y trabajarás directamente en estos dos directorios según el modelo.

Lee los dos diffs, y luego las dos `/session`. Anota tus observaciones sin sacar conclusiones: la sección sobre las repeticiones explicará por qué dos ejecuciones no bastan para diferenciar dos modelos.
:::

#### El esfuerzo de razonamiento

`pi --help` anuncia siete niveles de razonamiento, de `off` a `max`. Es un deslizador sencillo de manipular, por lo que resulta tentador empezar por él.

::: info Ejercicio (en sala)
Ejecuta la misma tarea con `--thinking minimal`, y luego con `--thinking max`, y compara los tokens de salida y la respuesta. No encontrarás ninguna diferencia, porque ambos flags producen exactamente la misma solicitud si usas el modelo `gemma-4-31b`.

Para este modelo, solo hay dos modos: el thinking `on` o `off`.

Repite la comparación entre dos niveles realmente distintos en tu modelo, por ejemplo `off` y `high`, y mide la diferencia.
:::

El razonamiento sí tiene un efecto cuando se mide entre dos niveles reales, y nuestras mediciones más abajo darán su tamaño. La lección general trata más bien sobre la confianza que hay que otorgar a los ajustes: **un ajuste expuesto por el harness no se transmite necesariamente al modelo**, porque entre la configuración que escribes y la solicitud que se envía hay una tabla de correspondencia escrita por alguien, que puede estar incompleta. Te encontrarás con esta situación varias veces en la formación, y con regularidad en tu trabajo. Adquiere el hábito de buscar dónde aterriza una configuración o un flag antes de confiar en él.

### Lo que escribimos

#### `AGENTS.md`, el punto de configuración global

El archivo de reglas colocado en la raíz del repositorio entra en el contexto en cada turno, lo que lo convierte en un buen candidato para definir el marco global de nuestro proyecto. Cuando el agente se equivoca, la reacción natural consiste en añadirle una frase, y luego otra. Sin embargo, hay que ser vigilante, porque añadir cada vez una nueva línea tiene un coste, y cuanto más grande sea el archivo, menos verá el agente el conjunto. Además, la mejora de los modelos hará que ciertas líneas sean verdaderas hoy pero queden obsoletas en una futura actualización. Hay aquí un verdadero trabajo de refactorización continua que es importante hacer a lo largo de toda la evolución de tu proyecto.

Aquí daremos una restricción estricta para esta formación.

::: danger Presupuesto: 40 líneas
El `AGENTS.md` de NÉON nunca superará las 40 líneas, desde el principio hasta el final de la formación. Cada módulo que quiera añadirle una regla deberá primero retirar otra, o reformular para que ambas quepan en una sola.

Esta restricción te obliga a hacer el trabajo de refactorización continua descrito más arriba: cada regla debe merecer su lugar, y un archivo corto tiene muchas más probabilidades de ser realmente seguido que una larga guía de estilo.
:::

Pero también podemos apoyarnos en otros archivos y decirlo en `AGENTS.md` para que vaya a leerlos si es necesario. Por ejemplo, podemos indicarle que las convenciones están en `CONTRIBUTING.md`, la arquitectura en el `README.md` y el historial en git.

En nuestras veinte ejecuciones de la issue #1 con la petición descuidada, **ninguna lanzó la suite de tests** y **ninguna añadió un caso**.

::: info Ejercicio (en sala)
Escribe el `AGENTS.md` de NÉON partiendo de tus propias ejecuciones en lugar de las nuestras: relee los diffs que acabas de producir y busca qué hizo el agente sin que se le pidiera, u omitió aunque se le pedía. Haz que lance los tests cada vez que modifique el código y que añada tests si no hay cobertura.

Aquí tienes la base de partida, para discutir y enmendar. Es el mismo archivo que usan nuestras mediciones, y está versionado en los experimentos más abajo:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning Un `AGENTS.md` puede ocultar otro
Pi carga estos archivos de forma acumulada, a partir de tu `~/.pi/agent/AGENTS.md` personal, luego de cada directorio padre ascendiendo, y luego del directorio actual. Un archivo de reglas personal se cuela, por tanto, en todas tus mediciones sin que nada lo indique.

El flag `--no-context-files`, abreviado `-nc`, desactiva este descubrimiento, lo cual es indispensable para medir correctamente. La herramienta de medición más abajo trabaja en un clon desechable donde solo se deposita el archivo `AGENTS.md` del directorio actual (NEON).
:::

#### El system prompt

Pi permite reemplazar por completo su system prompt mediante un `.pi/SYSTEM.md` en la raíz del proyecto o un `~/.pi/agent/SYSTEM.md` global. La opción `--system-prompt` obedece a una regla ligeramente distinta, ya que los archivos de contexto y los skills siguen añadiéndose por encima, de modo que nunca se parte del todo de una página en blanco.

::: info Ejercicio (en autonomía)
Crea un `.pi/SYSTEM.md` de tres líneas. Es el bloque que nuestras mediciones depositan en el clon para la configuración `-system_prompt`:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Vuelve a lanzar la misma tarea y compara los tokens de entrada, los turnos, la duración, y lo que contiene el diff.
:::


El system prompt de Pi cabe en 550 tokens. Todo el resto del trabajo ocurre en otro lugar, y te animamos a modificarlo solo por buenas razones. Te lo mostramos aquí para ilustrar la flexibilidad que ofrece Pi.

#### Una ventana limitada, para ver la compactación

Cuando el contexto se acerca al límite, Pi compacta, es decir, resume los mensajes antiguos y mantiene intactos solo los más recientes. La activación sigue la regla `contextTokens > contextWindow - reserveTokens`, donde `reserveTokens` vale 16 384 por defecto y representa el espacio dejado para la respuesta. El corte es visible en `\tree`, y `/compact` permite forzarlo, con instrucciones opcionales para orientar el resumen.

En NÉON, la compactación nunca se activará. El repositorio tiene 617 líneas, `gemma-4-31b` anuncia una ventana de unos 128 000 tokens, lo que sitúa el umbral alrededor de 112 000, y nuestro experimento más costoso solo alcanza ese total acumulando trece turnos, ninguno de los cuales pesa más de una decena de miles de tokens. Observar el mecanismo supone, por tanto, fabricar la restricción.

::: info Ejercicio (en autonomía)
Declara en `~/.pi/agent/models.json` una segunda entrada, que apunte al mismo servicio, pero que anuncie una ventana de 32 000 tokens:

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

Añade en el `.pi/settings.json` de NÉON unos umbrales coherentes con esta pequeña ventana:

```json
{ "compaction": { "reserveTokens": 4000, "keepRecentTokens": 8000 } }
```

Dispones entonces de los dos regímenes en `/model`, el modelo real a 128K y el mismo limitado a 32K. Haz trabajar al agente en varios archivos con el segundo hasta que se active, lee el resumen generado, y luego verifica en `\tree` dónde ocurrió el corte y si el agente todavía sabe lo que se le había pedido al principio.
:::

Esta manipulación muestra también que Pi compacta a 32 000 tokens no porque el modelo se sature, sino porque tú se lo has declarado. La ventana que conoce un harness es una línea de configuración y no una propiedad del modelo. Esta constatación te servirá el día en que un agente empiece a compactar demasiado pronto sin razón aparente.

### Un experimento más completo

#### El dispositivo

Vamos a estudiar un poco más a fondo la influencia de las distintas partes del contexto lanzando sesiones de Pi con un conjunto de repeticiones, para intentar ver la convergencia de los resultados.

Para ello, usaremos [trysquare](https://github.com/AI-for-dev/trysquare), una herramienta escrita en Python y diseñada especialmente para esta formación. Lanza las configuraciones de un escenario, califica cada ejecución, agrega los resultados y ofrece una síntesis. No sabe nada de NÉON, nada de la issue #1, nada de esta formación.

`scripts/trysquare-campaign/` es el directorio que contiene el experimento. Aquí tienes su contenido:

```
scripts/trysquare-campaign/
  trysquare.toml     chemins machine : où est NÉON, où vivent les clones jetables
  scenarios/         une expérience = un fichier TOML autonome
  hypotheses/        ce qui est prédit, écrit avant de mesurer
  briques/           tickets, AGENTS.md, prompt système, compétences : le matériau
  validateurs/       ce qui note
  results/           une matrice par répertoire
```

No entraremos en los detalles de diseño y uso. Puedes consultar la documentación: https://ai-for-dev.github.io/trysquare/.

Aquí te damos solo la información suficiente para esta formación. En el directorio `scenarios` tienes la descripción de los experimentos. En cada uno de ellos encontrarás el modelo usado (el mismo que encuentras en Pi) y el número de repeticiones. También encontrarás las distintas configuraciones que componen el experimento, así como los tests de validación.

#### El plan de experimento

El plan elegido es el más simple que sigue siendo legible: una **base**, y luego un conjunto de variantes que realizan micro cambios.

La base, llamada `nothing`, reproduce lo que hace alguien el primer día: la petición descuidada, sin archivo de reglas, el system prompt del agente. Vamos un poco más allá al no poner razonamiento. Contiene el prompt que se te proporcionó un poco más arriba durante tus primeras pruebas. Cada otra configuración solo añade elementos para ver el impacto en la respuesta.

| configuración                    | qué cambia                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `nothing`                        | nada, es la referencia                                              |
| `+thinking`                      | `thinking = "high"`                                                 |
| `+agents`                        | `brick/AGENTS.md` se deposita en el clon                            |
| `+well_crafted`                  | el prompt describe correctamente el problema y hace referencia a ISSUE.md |
| `-system_prompt`                 | el system prompt es reemplazado por tres líneas                     |
| `+agents+well_crafted`           | `AGENTS.md` + prompt bien escrito                                   |
| `+agents+add_tests+well_crafted` | aquí se añaden además los tests que se desea ver pasar              |

Un experimento cabe en un archivo: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

Cuando mires los resultados en el directorio del experimento, verás otras configuraciones además de las del cuadro anterior. Pertenecen a otros módulos. Las trataremos más adelante.

El prompt bien encuadrado no copia el contenido del ticket. `ISSUES.md` ya describe cómo corregir el bug, en el repositorio que el agente tiene a mano. El prompt nombra, por tanto, la issue, el perímetro y el criterio de parada, y nada más:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Esta configuración mide, por tanto, si señalar un documento escrito basta para que el agente vaya a leerlo y lo tenga en cuenta. Si el prompt copiara la solución, mediríamos únicamente la capacidad del agente para seguir una instrucción que se le acaba de dar.

#### Los tests de validación

Para juzgar la calidad de los resultados, debemos definir una serie de tests de validación. Aquí hacemos la lista añadiendo su descripción.

- **delivered**: el test ha funcionado hasta el final y no ha habido interrupción.
- **suite_lancee**: el agente ha pensado en lanzar los tests que se encuentran en el directorio `game`.
- **in_scope**: el agente solo ha modificado los archivos que se le pidió modificar y solo las líneas que corresponden al problema.
- **tests_ajoutes**: el agente ha pensado en añadir tests para probar los rebotes de la bola con los ladrillos.
- **`sonde.test.js`**: al final de las modificaciones, ejecutaremos tests para verificar que los cambios realizados en el código responden bien a la corrección del problema en su totalidad, tal como se describe en `ISSUE.md`. Esta sonda también se usará en la configuración `+add_tests`, donde los tests estarán directamente accesibles desde el principio. El objetivo es ver si el agente es capaz de reparar sus errores en función de los tests.

#### Las trazas

Durante el desarrollo del experimento, guardamos una serie de trazas para analizar con más detalle lo que ocurrió durante el post-procesamiento.

Para cada run, tienes acceso a

- una exportación de la sesión de Pi en formato JSONL que se puede volver a convertir a formato html (hablaremos de ello un poco más adelante)
- un directorio `validation` que indica el estado de los tests de validación
- un archivo `configuration.json` que recuerda el marco del run (modelo, harness, tests...)
- un patch (`diff.patch`) que indica lo que se modificó en el código de NEON durante ese run

Al final del experimento, tienes acceso a una síntesis en formato html y markdown que te da los aciertos de las validaciones para cada una de las configuraciones, así como promedios de los costes en tokens y la duración de los runs.

#### Cuántas repeticiones, y por qué

Cada configuración se ejecuta varias veces, y la razón ya se ve muy bien en la configuración base.

Aquí tienes las seis primeras ejecuciones de `nothing`, estrictamente idénticas en su configuración: mismo modelo, mismo esfuerzo, mismo prompt, mismo repositorio en el mismo commit.

| ejecución          | 1      | 2      | 3      | 4       | 5      | 6       |
| ------------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| tokens de entrada   | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| turnos              | 4      | 5      | 4      | 4       | 5      | 4       |
| duración            | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterio alcanzado  | sí     | sí     | sí     | **no**  | sí     | **no**  |

El coste varía en menos de un cuarto, el número de turnos toma dos valores, y la respuesta cambia una de cada tres veces. Una única ejecución de esta configuración te habría dado, según el sorteo, «la base corrige el bug» o «la base no lo corrige».

La configuración mejor equipada desplaza su dispersión hacia el coste en lugar de hacia la respuesta. En `+agents+add_tests+well_crafted`, los tokens de entrada van de 42 731 a 2 420 677, es decir, un rango de **×57**, y tres ejecuciones consecutivas dan 2 420 677, 2 147 526 y 594 786.

Un agente no es determinista, y la diferencia entre dos ejecuciones de una misma configuración es del mismo orden de magnitud que el efecto de la mayoría de las palancas, lo que hace que una única ejecución por configuración mida el sorteo en lugar de la palanca.

Ante esta dispersión, trysquare nunca publica una cifra sola. Dos nociones bastan para leer sus tablas.

**Un punto es un punto porcentual de éxito.** `+agents+add_tests+well_crafted` alcanza el criterio 18 veces de 20, es decir, un 90 %, y `nothing` 11 veces de 20, es decir, un 55 %: la diferencia vale **+35 puntos**. Solo cuentan las ejecuciones válidas, ya que las que no entregaron nada se retiran de ambos lados, lo que explica que un denominador pueda ser inferior al número de repeticiones.

**El intervalo proviene del bootstrap.** Se extraen al azar y con reemplazo veinte ejecuciones de cada grupo, se recalcula la diferencia, y se repite diez mil veces; los límites publicados son los rangos 2,5 % y 97,5 % de las diez mil diferencias obtenidas. Ejecuciones que se parecen entre sí dan un intervalo estrecho, ejecuciones dispersas dan un intervalo amplio. La semilla está escrita en `trysquare.toml`, por lo que los límites se recalculan de forma idéntica.

Leer una diferencia se reduce entonces a plantear una sola pregunta: **¿este intervalo contiene el cero?** Si no lo contiene, la diferencia se marca con `*` y está **establecida**. Si lo contiene, se marca con `o` y **no es concluyente**, cualquiera que sea el valor central.

Las `o` se muestran igualmente en las tablas, con un recordatorio bajo cada una de ellas: ninguna conclusión puede apoyarse en una diferencia marcada con `o`.

El número de repeticiones sigue siendo un parámetro, porque la elección correcta depende de lo que busques. **Tres bastan para ver la dispersión**, que es el objetivo en sala. **Diferenciar dos palancas cercanas exige mucho más**, y las columnas que cuentan éxitos son las más exigentes: un 2/3 frente a un 3/3 no dice prácticamente nada, mientras que un 8/20 frente a un 20/20 se defiende. Las tablas publicadas más abajo son de veinte repeticiones por esta razón.

::: info Ejercicio (en sala, luego en autonomía)
Empieza por el plan completo, que no gasta nada:

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

La configuración se toma del `trysquare.toml` más cercano, es decir, el del banco de trabajo mientras lances desde este directorio.

Luego lanza la matriz a tres repeticiones y déjala correr mientras discutes los deslizadores:

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

Los subcomandos que no gastan nada se ejecutan directamente, y sirven después:

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**En autonomía**, copia `scenarios/issue1-contexte.toml`, cambia una configuración, y vuelve a lanzar. No habrás tocado ni la herramienta, ni el validador, ni las demás configuraciones, y es el único artefacto de este módulo que no caducará.
:::

#### Nuestras mediciones

Debiste darte cuenta en tus primeras pruebas con `trysquare`: hacer mediciones toma tiempo. Para una veintena de repeticiones, necesitarás entre 2h y 3h para obtener el conjunto de resultados junto con los del módulo siguiente. Por eso hemos preferido darte una campaña completa realizada de antemano, en la que puedes navegar por los directorios de cada ejecución como lo has hecho antes.

Aquí tienes lo que obtuvimos en agosto de 2026, en `ilaas` y `gemma-4-31b`, contra el commit `d62ccd1f` de NÉON, con **veinte repeticiones por configuración**. Las dos configuraciones con skill figuran en el archivo y pertenecen al módulo siguiente; se han descartado de las tablas siguientes, salvo por una observación al final.

| configuración                    | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| --------------------------------- | ----------- | -------------- | ---------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20              | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20              | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20              | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20             | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20              | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20             | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20             | 20/20      |

Y las columnas de la sonda, con el criterio en primer lugar:

| configuración                    | ladrillos | ángulos   | salida    | vecinas   | travesía  |
| --------------------------------- | --------- | --------- | --------- | --------- | --------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

Los denominadores de `+well_crafted` y `+thinking` valen 18 y 19 en las columnas de coste, porque ILaaS devolvió `Request timed out` durante la medición y las ejecuciones afectadas no produjeron nada que calificar.

Extraemos cinco enseñanzas de estas dos tablas, y la última hará la transición con el módulo siguiente. Todas las diferencias citadas más abajo provienen de los intervalos descritos más arriba, con la misma marca `*` para una diferencia establecida y `o` para una diferencia no concluyente. Las comparaciones que no se hacen contra `nothing` se obtienen recalculando la operación contra otra referencia, lo cual no cuesta nada y no vuelve a medir nada. Como la columna del veredicto se refiere únicamente a la métrica declarada por `[verdict].criterion`, leer una diferencia en otra columna requiere cambiar esta línea del escenario antes de renderizar:

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

La salida va a un `synthesis_ref-<référence>.md` junto a la síntesis habitual, que no se modifica.

**El prompt bien encuadrado hace que se haga todo lo que el ticket nombra, y nada más.** `tests_ajoutes` pasa de 0/20 a 17/20 y `rebond_angles` de 0/20 a 14/20, dos columnas que estaban vacías y que se llenan. El prompt, sin embargo, no dice nada del mecanismo del rebote: nombra la issue, el perímetro y el criterio de parada, y es `ISSUES.md` el que describe la esquina, la salida del rectángulo, la costura de la cuadrícula y el tunneling. La esquina se mantiene en **0/20 en las cuatro configuraciones que no encuadran el ticket**, es decir, ochenta ejecuciones consecutivas. Señalar un documento escrito basta, por tanto, para que sea leído, y es el contenido de ese documento el que decide lo que se tratará.

**El archivo de reglas solo desplaza el procedimiento, y ya no desplaza nada en cuanto el ticket es correcto.** `+agents` hace pasar `suite_lancee` de 0/20 a 20/20, porque una de sus cuatro líneas nombra el comando. Sobre el criterio da 9/20 contra 11/20 de la base, diferencia no concluyente, y sobre `tests_ajoutes` se mantiene en 0/20 ya que ninguna de sus líneas habla de tests. Añadido encima del prompt bien encuadrado no aporta **absolutamente nada**: 11/20 contra 13/20 en el criterio, 12/20 contra 14/20 en la esquina, 17/20 contra 17/20 en los tests añadidos, ninguna de estas tres diferencias es distinguible de cero. El archivo de reglas es un sustituto del buen ticket más que un complemento, lo cual da una regla de escritura directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que hay que retirar.

**El razonamiento desplaza el criterio, y por sí solo no hace leer el ticket.** `+thinking` da 16/20 en `rebond_briques`, es decir, una diferencia de +29 puntos cuyo intervalo excluye el cero. Es la única palanca de la matriz, aparte de las que tocan el ticket, que desplaza la corrección en sí misma. Su columna de la esquina se mantiene en 0/20 y sus tests añadidos en 3/20: el razonamiento mejora lo que el modelo hace con lo que tiene ante los ojos, pero no lo lleva a ir a buscar lo que le falta.

**El prompt bien encuadrado hace escribir los tests rojos, y una de cada cinco ejecuciones se detiene ahí.** La columna `touched` lo dice sin ambigüedad: en `+well_crafted` y `+agents+well_crafted`, cuatro ejecuciones de veinte nunca abren `game/neon.js`, de las cuales dos o tres escriben únicamente en `game/neon.test.js` y una o dos no entregan nada en absoluto. Ninguna otra configuración muestra este comportamiento, ya que `nothing`, `+agents` y `-system_prompt` tocan la fuente en veinte ejecuciones de veinte. La explicación está en el ticket, que enumera cinco subcasos y termina con « each case above added **first as a red test**, then green »: `gemma-4-31b` escribe los rojos y se detiene ahí, por no poder abordar la especificación completa. Es también por eso que el criterio de corrección no sube mientras la esquina sí sube: el modelo tiene un presupuesto de trabajo, y describir más trabajo en el ticket no lo amplía.

**Dar los tests repara este bloqueo.** La configuración `+agents+add_tests+well_crafted` se lee frente a `+agents+well_crafted`, la única de la que solo se diferencia por la sonda depositada en el árbol:

| columna           | `+agents+well_crafted` | `+add_tests` | diferencia             |
| ----------------- | ----------------------- | ------------- | ----------------------- |
| `rebond_sortie`   | 9/20                     | **18/20**     | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                     | **18/20**     | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                    | **18/20**     | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                    | **18/20**     | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                    | 17/20         | -4 pts `o`             |
| `sonde_intacte`   | no aplica                | **20/20**     |                         |

Las cuatro columnas de la corrección suben, y las cuatro diferencias están establecidas. La palanca no solo gana casos límite, también recupera el criterio en sí mismo. Observa la amplitud de los intervalos, y en particular el de la esquina, que empieza en un solo punto: estas diferencias están establecidas en el sentido de que son positivas, sin que se pueda dar su tamaño con una precisión mejor que un factor de cincuenta.

`sonde_intacte` vale 20/20, lo que significa que el modelo no intentó cambiar los tests de referencia. Y `tests_ajoutes` no se mueve, lo cual es coherente con un agente que ya tiene los casos ante los ojos y no tiene ninguna razón para reescribirlos.

::: warning Ninguna columna de coste de gemma es citable aquí
La matriz cuenta 1 151 reintentos, es decir, turnos relanzados porque el proveedor había fallado, y el recuadro más abajo muestra hasta qué punto se concentran en las configuraciones más pesadas. Un reintento vuelve a jugar el turno con todo el contexto acumulado, por lo que engorda las columnas de coste y, sobre todo, vuelve a pilotar al agente.

El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` cuenta **37**, lo que hace que las suyas sean legibles:

| configuración                    | turnos | duración |
| --------------------------------- | ------ | -------- |
| `nothing`                        | 19     | 163 s    |
| `+agents`                        | 12     | 65 s     |
| `-system_prompt`                 | 17     | 142 s    |
| `+well_crafted`                  | 15     | 252 s    |
| `+thinking`                      | 19     | 490 s    |
| `+agents+well_crafted`           | 14     | 561 s    |
| `+agents+add_tests+well_crafted` | 13     | 410 s    |

Los tokens de entrada de las dos matrices no se colocan en la misma tabla, por una razón que no tiene nada que ver con el modelo: ILaaS no reporta ninguna caché, con `cacheRead` valiendo cero en sus ciento ochenta ejecuciones, de modo que su columna de entrada es la suma de los prefijos completos releídos en cada turno. opencode Zen reporta la caché, hasta cinco millones de tokens leídos en una sola ejecución. La misma configuración muestra, por tanto, 558 000 tokens de entrada por un lado y 15 000 por el otro, sin que ninguno de los dos sea falso. Esta es la mitad práctica de lo que la primera parte de este módulo explica sobre la caché: el coste de las entradas depende de la configuración del proveedor del modelo, y la activación de la caché permite reducir drásticamente la factura.
:::

#### Tres verificaciones antes de citar una tabla

Una matriz publica tablas, intervalos y veredictos, lo que puede dar la impresión de conclusiones sólidas. Sin embargo, durante la elaboración de esta formación, nos enfrentamos a varios fenómenos que pueden desacreditar ciertos resultados.

::: warning El recuento de reintentos
Un reintento es un turno que la herramienta tuvo que relanzar porque el proveedor había fallado. Vuelve a jugar ese turno con todo el contexto acumulado, por lo que engorda las columnas de coste y, sobre todo, vuelve a pilotar al agente: ya no es la misma conducción del trabajo.

En la matriz `gemma-4-31b`, el recuento vale **1 151**, y no está repartido uniformemente:

| configuración                    | reintentos |
| --------------------------------- | ---------- |
| `nothing`                        | 1          |
| `+agents`                        | 2          |
| `-system_prompt`                 | 1          |
| `+well_crafted`                  | 24         |
| `+thinking`                      | 81         |
| `+agents+well_crafted`           | 205        |
| `+agents+add_tests+well_crafted` | 205        |
| `+agents+add_tests+skill`        | 287        |
| `+agents+skill`                  | 345        |

Nada en las configuraciones de contexto corto, todo en las de razonamiento elevado, y más aún cuanto más crece el contexto acumulado: una sola ejecución de `+agents+add_tests+well_crafted` consumió 2,4 millones de tokens de entrada en sesenta y tres turnos y acumuló dieciocho reintentos. El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` cuenta **treinta y siete** en total.
:::

::: warning La importancia del test de validación
Una columna uniformemente negra se parece a un comportamiento del agente y puede ser un defecto del validador. La única forma de distinguirlos es que la métrica diga **por qué** respondió en falso, y no solo que respondió en falso.

Nuestro validador lo hace para `suite_lancee`: cuando no reconoce ningún lanzamiento de la suite, copia en su razón todos los comandos que ejecutó el agente. Esta precaución es importante, porque la forma del comando varía de un modelo a otro mucho más que el comando en sí. `deepseek-v4-flash` prefija cada llamada con el directorio de trabajo (`cd .../repo && npm test`, 664 veces en la matriz) y redirige de buen grado la salida (`npm test 2>&1 | tail -30`, 80 veces), mientras que `gemma-4-31b` escribe `npm test` a secas. Un test de validación que solo conociera la última forma calificaría al primer modelo con cero en toda la matriz.

En conclusión, **escribe tus métricas con cuidado y pruébalas sobre un conjunto de tests**. Es necesario que sean fiables. Anota cualquier comportamiento extraño antes de sacar conclusiones precipitadas.
:::

::: warning Lo que la comparación de los dos modelos permite decir, y lo que no permite decir
Las dos matrices (`gemma-4-31b` y `deepseek-v4-flash`) se refieren al mismo escenario, las mismas nueve configuraciones y el mismo commit de NÉON, de modo que sus columnas de puntuación se leen una frente a la otra. El modelo y el proveedor cambiaron juntos, lo que impide atribuir una diferencia a uno más que al otro, pero deja ver esto en la columna de la esquina:

| configuración          | `gemma-4-31b` | `deepseek-v4-flash` |
| ----------------------- | ------------- | -------------------- |
| `nothing`              | 0/20          | 8/20                 |
| `+agents`              | 0/20          | 8/20                 |
| `+well_crafted`        | 14/20         | 19/20                |
| `+agents+well_crafted` | 12/20         | 19/20                |

Ambos modelos reaccionan a la misma palanca y en el mismo sentido, el más capaz partiendo de más arriba y subiendo más alto.
:::

Estas cifras no tienen vocación de creerse a pie juntillas ni de copiarse dentro de un año. Vuelve a lanzar la matriz: para eso sirve precisamente, y la que obtengas reemplazará a esta.

El contexto bien gestionado hace que el agente sea disciplinado y completo en lo que el ticket nombra, sin hacerlo exhaustivo: la esquina del ladrillo nunca se alcanza donde el ticket no la describe, y el tunneling sigue siendo la columna más baja de todas las que mide la sonda. Ir más allá de lo que contiene el material escrito requerirá un revisor independiente y un bucle de verificación, que es el tema de los módulos sobre la delegación y los workflows.

::: warning Tres conclusiones tentadoras que los intervalos no permiten
Cada una de las siguientes frases se apoya en una cifra exacta de la campaña publicada en esta página, y ninguna se sostiene.

**« El archivo de reglas rompe la corrección. »** `+agents` da 9/20 en el criterio contra 11/20 de la base. La diferencia vale -10 puntos, pero su intervalo contiene cero: no podemos decir nada al respecto, ni en un sentido ni en el otro.

**« Quitar el system prompt mejora el rebote. »** `-system_prompt` da 14/20 contra 11/20, es decir, +15 puntos, y el intervalo contiene cero también aquí. Con solo tres ejecuciones bien sorteadas, habríamos obtenido 3/3 contra 1/3 y habríamos podido creerlo de forma duradera.

**« El prompt bien encuadrado corrige mejor el bug. »** `+well_crafted` da +17 puntos en el criterio, no concluyente. El efecto real de esta palanca se ve en otro lado, en los tests añadidos y en la esquina, donde las diferencias se cuentan en decenas de puntos y no dejan ninguna duda.

Repetir tres veces no basta, por tanto: un efecto que no supera la dispersión de su propia configuración no es un efecto. Y un efecto establecido en esta tarea, con este ticket y este modelo, solo está establecido en ese marco.
:::

Acabas de practicar una evaluación, en el sentido de que se comparan comportamientos en una misma tarea, con repeticiones y sabiendo que la medición es ruidosa, mientras que un test responde con sí o con no a una pregunta cerrada. El módulo 3.2 formalizará esta práctica con archivos de evaluación y un LLM-juez, para los criterios que la sonda de este módulo no habría podido gestionar.

### La pila contra la base

Las palancas de este módulo exigen atención y tiempo, mientras que un modelo más capaz se obtiene simplemente pagando más caro. Es legítimo, por tanto, preguntarse si es más rentable cuidar el contexto o cambiar de modelo. La segunda mitad de esta pregunta no se mide aquí, y decimos más abajo por qué. La primera sí se mide, a modelo constante, poniendo frente a frente las dos configuraciones extremas de la matriz.

::: info Ejercicio (en sala)
Compara la configuración `nothing`, que recibe una petición de una línea y nada más, y la configuración `+agents+add_tests+well_crafted`, que dispone del razonamiento, del ticket bien encuadrado, del `AGENTS.md` y de la sonda depositada en el árbol. Mira primero los diffs, luego las columnas de la sonda, y solo al final lo que costó cada una.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | --------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, diferencia +35 puntos  |
| `rebond_sortie`    | 9/20      | **18/20**                         |
| `rebond_voisines`  | 7/20      | **18/20**                         |
| `rebond_angles`    | 0/20      | **18/20**                         |
| `rebond_traversee` | 0/20      | **17/20**                         |
| `suite_lancee`     | 0/20      | 20/20                              |
| `tests_ajoutes`    | 0/20      | 17/20                              |
| turnos medianos    | 19        | 13                                 |
| duración mediana   | 163 s     | 410 s                              |

Las dos últimas líneas se toman de la matriz `deepseek-v4-flash`, cuyos treinta y siete reintentos hacen legibles las columnas de coste, y las columnas de puntuación de `gemma-4-31b`.

El harness completo alcanza dieciocho de veinte en un criterio donde la base se estanca en once, y la columna más severa de la sonda pasa de 7/20 a 18/20. Es la tesis de Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, verificada en su mitad más fácil de establecer: a modelo rigurosamente constante, el harness solo marca la diferencia entre una corrección que funciona una vez de cada dos y una corrección que funciona nueve veces de cada diez.

La esquina pasa de 0/20 a 18/20, y el prompt bien encuadrado por sí solo ya obtenía catorce: la mayor parte de la ganancia proviene del hecho de que el prompt hace referencia a un ticket en `ISSUES.md` que nombra el caso, y la sonda añade encima la perseverancia que faltaba para terminar el trabajo.

### Lo que este módulo no logra obtener

La única palanca que llevó al modelo a tratar el conjunto de lo que pide el ticket es la que le puso los tests ante los ojos. Esta configuración tiene, sin embargo, algo de artificial: los casos límite estaban escritos de antemano, por nosotros, en el mismo archivo que califica. En un ticket real, nadie te los proporcionará.

Lo que esta configuración aporta en realidad es perseverancia. El modelo se descuelga en un ticket largo porque agota su presupuesto formulando los casos en lugar de corregirlos; recibir los casos ya formulados le devuelve ese presupuesto. La pregunta del módulo siguiente es entonces si un **skill**, es decir, un procedimiento de trabajo escrito una vez y recargado a demanda, puede producir la misma perseverancia sin proporcionar los tests.


## Generalizar

Ocho principios de este módulo siguen siendo válidos más allá de Pi, de `ilaas` y de la versión de los paquetes que acabas de instalar.

**Lo estable delante, lo que varía detrás.** La caché solo funciona sobre un prefijo inalterado y cuesta cincuenta veces menos que la entrada, de modo que cualquier dato volátil colocado temprano en el contexto, ya sea una marca de tiempo, un estado de git o una fecha, invalida todo lo que sigue.

**Señalar un documento escrito basta para que sea leído, y lo que está escrito en él decide el resultado.** Nuestro ticket bien encuadrado no describe el mecanismo del rebote: nombra la issue, el perímetro y el criterio de parada. Diecisiete ejecuciones de veinte fueron a leer `ISSUES.md`, encontraron ahí la petición de casos límite en tests rojos, y la ejecutaron, mientras que la petición descuidada no obtuvo ninguna. La esquina del ladrillo da la versión más clara de esto: está descrita en `ISSUES.md` y en ninguno de nuestros prompts, y vale 0/20 en las cuatro configuraciones que no nombran la issue contra 14/20 en la que la nombra. Escribe lo que esperas en un documento que puedas señalar, y relee ese documento antes de concluir cualquier cosa sobre el agente.

**Un modelo tiene un presupuesto, y describir más trabajo no lo amplía.** Nuestro ticket enumera cinco subcasos y pide un test rojo para cada uno; cuatro ejecuciones de veinte escriben esos tests rojos y nunca abren el archivo fuente. Esta constatación condiciona lo que sigue: o bien reduces la petición a lo que el modelo puede soportar, o bien le das con qué aguantar la distancia, que es el tema del módulo siguiente.

**El archivo de reglas cambia lo que el agente hace, no lo que encuentra, y solo sirve en lo que el ticket no dice.** Entra en el contexto en cada turno, lo que lo hace potente y costoso, de ahí el interés de mantenerlo corto, de fundamentar cada regla en un fallo observado y de refactorizarlo en lugar de alargarlo. Nuestras mediciones acotan con precisión lo que compra: la configuración `+agents` hace pasar de 0/20 a 20/20 el número de ejecuciones que lanzan la suite de tests, deja sin cambios el criterio de corrección, y ya no aporta nada en absoluto en cuanto el prompt bien encuadrado está presente. La regla de escritura que se deriva de esto es directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que hay que retirar.

**Un ajuste expuesto por el harness no se transmite necesariamente al modelo.** Entre el flag que escribes y la solicitud que se envía hay código y tablas de correspondencia, como lo muestra `--thinking max`, que no llega al modelo que usamos sin que nada te lo advierta. El corolario en el lado de la medición es que lo que decide el experimento debe estar escrito en el experimento: un nivel de razonamiento heredado de una configuración personal hizo que una de nuestras configuraciones fuera idéntica a su base en todas las matrices publicadas.

**Un efecto que no sobrevive al remuestreo no es un efecto.** Repetir tres veces no basta: mientras el intervalo de una diferencia contenga cero, no hay nada que decir al respecto. De las nueve configuraciones medidas aquí, solo tres desplazan el criterio de corrección de manera establecida, mientras que las otras seis muestran cada una una cifra que podría parecer convincente. Además, una diferencia establecida solo lo está en esta tarea, con este ticket y este modelo.

**Lo que se mide debe fijarse mediante lo que no se mueve.** Un tag es un nombre, y `git tag -f` lo desplaza sin dejar rastro del lado de la medición, de modo que dos matrices pueden declarar el mismo patrón y haber trabajado sobre dos versiones distintas del código. Fija por el commit, que no se mueve, y si tu herramienta todavía no lo permite, archiva al menos lo que el nombre resolvió en el momento de la medición.

**Una métrica debe decir por qué, no solo qué.** Una columna uniformemente negra se parece a un comportamiento del agente y puede ser un defecto del validador, y nada distingue a los dos mientras la métrica se limite a responder verdadero o falso. Haz que escriba sobre qué se pronunció: la nuestra copia, bajo cada falso, los comandos que ejecutó el agente, y eso es lo que permite verificar un cero en lugar de creerlo a pie juntillas.

**Escribe la hipótesis antes de medir, y versiónala.** Una hipótesis redactada después de las mediciones no es más que una conclusión disfrazada. La nuestra, `hypotheses/issue1-contexte.md`, contiene una predicción que resultó ser falsa, y es porque estaba escrita de antemano que la publicamos como tal en lugar de reformularla después como descubrimiento.

## Entregable

Tres piezas, de las cuales las dos primeras sirven todo el día y la tercera servirá para el acto 4.

**1. El `AGENTS.md` de NÉON**, versionado en el repositorio, por debajo de las 40 líneas, cada regla justificada por un fallo que hayas observado.

**2. El directorio de matriz** producido por `trysquare run`, con su línea de registro. El entregable no es una tabla copiada, sino el archivo que permite refabricarla: las mediciones brutas, las sesiones, los diffs, y la revisión de la herramienta que midió. Sin este archivo, la matriz no puede ser ni verificada ni recalificada, y sus cifras no valen más que una opinión.

**3. La ficha de decisión**, una línea por palanca:

| palanca                        | efecto medido | ¿adoptado? | por qué |
| -------------------------------- | -------------- | ---------- | -------- |
| elección del modelo             |                |            |          |
| esfuerzo de razonamiento        |                |            |          |
| ticket bien encuadrado          |                |            |          |
| contenido del ticket señalado   |                |            |          |
| `AGENTS.md`                     |                |            |          |
| system prompt                   |                |            |          |
| tests proporcionados de antemano|                |            |          |
| ordenación / caché              |                |            |          |
| compactación                    |                |            |          |
| criterio ejecutable (sonda)     |                |            |          |

Se añadieron dos líneas a esta ficha después de nuestras últimas mediciones. «Contenido del ticket señalado» figura ahí porque la reescritura de `ISSUES.md` desplazó más columnas que cualquier ajuste del harness, y «tests proporcionados de antemano» porque es la única palanca que recuperó el bloqueo del modelo en un ticket largo.

Esta ficha constituye el primer relleno real de la columna «¿tu harness?» de la tabla de correspondencia, para la línea «contexto». Los cinco módulos siguientes harán lo mismo para su bloque, de modo que abordarás el capstone con una tabla ya rellenada por tus experiencias.

::: tip Criterio de éxito
Sabes citar una palanca que hayas medido como sin efecto en NÉON, y decir bajo qué condición precisa tendría uno en otro lugar.

Nuestro ejemplo es `AGENTS.md`: no desplaza ni un punto el criterio de corrección, y se volvería decisivo en un ticket cuyo fallo habitual es de procedimiento más que de razonamiento, o en un repositorio cuyos tickets están mal escritos. El tuyo será diferente, y ese es el objetivo. Este criterio exige haber visto las cifras y haber comprendido que es la tarea y su material lo que las determina. No puede, por tanto, satisfacerse de memoria.
:::

## Las trampas

**Concluir a partir de una sola ejecución**, que sigue siendo la trampa principal y la más costosa, ya que produce convicciones duraderas a partir de ruido.

**Inyectar datos volátiles en la zona cacheable.** Una fecha, un `git status` o una marca de tiempo colocada temprano en el contexto invalida toda la caché que sigue, y te hace pagar caro un ahorro que creías asegurado.

**Olvidar tu `AGENTS.md` personal**, cargado además del proyecto, invisible en la interfaz, y que falsea todas tus mediciones mientras no uses `-nc`.

**Creer un flag a pie juntillas**, cuando `--thinking max` puede no tener ningún efecto sin que Pi te lo advierta.

**Confundir la ausencia de saturación con la ausencia de problema.** En una ventana holgada nada desborda nunca, lo que significa solamente que la señal de alarma no sonará y que el coste será tu único indicador.

**Juzgar sobre un patrón cuando se puede juzgar sobre un comportamiento.** Buscar en un diff si se parece a la solución esperada responde a una pregunta distinta de «¿este diff resuelve el problema?», y es en esa brecha donde se alojan los falsos verdes. Busca la forma ejecutable antes de resignarte al patrón, y luego al juez.

**No contar los reintentos.** Una matriz medida mientras el proveedor falla y relanza no mide la configuración, y da de ella la apariencia completa: tablas, intervalos, veredictos. El recuento de reintentos debe leerse, por tanto, como una columna de resultado por derecho propio.

**Creer en una columna uniformemente negra.** Un cero en todas las configuraciones se parece a un comportamiento del modelo y puede ser un comparador demasiado estricto, como el que rechazaba `cd /tmp/x && npm test` porque solo conocía `npm test`. Verifica la razón adjunta a un falso antes de sacar una conclusión.

**Confiar en un tag.** Se desplaza, y nada en una tabla lo dirá. La única forma de saberlo después es el commit archivado por ejecución, y la única forma de evitarlo es fijar por ese commit.

**Comparar costes entre dos proveedores.** No cuentan lo mismo: uno reporta la caché y el otro no, de modo que la columna «entrada» de uno es la suma de los prefijos completos y la del otro es la parte que no estaba ya en caché. La relación entre los dos no significa nada.

## Para ir más allá

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), el estudio que justifica que no basta con rellenar la ventana.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sobre el desplazamiento del prompt aislado hacia la arquitectura del contexto.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), cuya tesis es la que la comparación de la pila con la base pone a prueba.
- [La documentación de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), y en particular sus páginas sobre la compactación, los modelos y los ajustes.
- [trysquare](https://github.com/AI-for-dev/trysquare), la herramienta de medición usada en este módulo, y su guía de escritura de escenarios.
- El banco de trabajo de la formación, `scripts/trysquare-campaign/`, con sus hipótesis escritas antes de medir y sus matrices archivadas. Es el único lugar donde las cifras de esta página son verificables.
