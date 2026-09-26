# El contexto y la ventana: qué ponemos en ella y cuánto cuesta

::: tip Objetivos de este módulo
- Saber decir qué hay realmente en la ventana de contexto y cuánto cuesta cada parte
- Manipular las palancas que la llenan: modelo, esfuerzo de razonamiento, prompt, `AGENTS.md`, system prompt
- Montar un dispositivo de medición reproducible y usarlo para tomar decisiones
- Terminar con un `AGENTS.md` corto y una decisión motivada sobre cada palanca
:::

La gestión del contexto es la pieza de la que dependen todas las demás, ya que un subagente sirve para no contaminar el contexto principal, una memoria para no llenarlo con lo que podríamos volver a encontrar, y un permiso para no verter en él un archivo que no deberíamos haber leído. Por lo tanto, hay que empezar por saber qué contiene la ventana y cuánto cuesta cada parte; de lo contrario, los módulos siguientes no serán más que recetas aplicadas sin ser comprendidas.

Procedemos en el orden habitual: comprender qué hay en la ventana, reconstruir las palancas que la llenan y, a continuación, extraer lo que sigue siendo válido cuando la herramienta cambia.

::: info Una convención de lectura
Cada manipulación está marcada como **en sala** o **en autonomía**. El recorrido en sala está diseñado para encajar en la sesión y para bastar para comprender los desafíos del módulo. Las manipulaciones en autonomía profundizan y están escritas para hacerse solo, más tarde, en tu propio repositorio.
:::

## Comprender

### Cinco fuentes, una sola ventana

Cuando escribes una pregunta en Pi, el modelo recibe una pila de la que tu pregunta es solo una línea:

1. el **system prompt**, que describe al modelo su rol, sus herramientas y sus convenciones;
2. los **archivos de contexto**, `AGENTS.md` y `CLAUDE.md`, cargados desde tu directorio personal, luego desde cada directorio padre hacia arriba y, finalmente, desde el directorio actual;
3. las **descripciones de las herramientas**, en JSON, una por cada herramienta disponible;
4. **tu pregunta**;
5. y, a medida que el bucle gira, el **historial**, es decir, cada respuesta del modelo, cada llamada a una herramienta y cada salida de herramienta.

Las primeras cuatro fuentes son estables de una iteración a otra, mientras que la quinta crece en cada iteración, lo que la convierte casi siempre en la responsable de los desbordamientos.

::: info Ejercicio (en sala)
Abre una sesión, haz cualquier pregunta y luego exporta la sesión con `\export`. Abre el archivo HTML generado y lee el system prompt de Pi completo, algo que la mayoría de los agentes de código no permiten hacer.

Identifica qué describe **capacidades** y qué describe **convenciones**: más adelante mediremos el peso real de cada una de las dos categorías.
:::

En una solicitud tan trivial como «di solo OK», sin archivo de contexto, sin skill y sin extensión, la entrada pesa **1 660 tokens**, y baja a **1 110** si se sustituye el system prompt de Pi por tres líneas. El system prompt de Pi cuesta, por lo tanto, unos **550 tokens**, lo cual es poco considerando lo que las salidas de herramientas y el historial añadirán después. Lo esencial de lo que llena una ventana de contexto no proviene del harness, sino de lo que tú y el agente volcáis en ella a lo largo de la sesión.

### ¿Cuánto cuesta utilizar un LLM?

Una llamada al modelo se factura en tres conceptos, expresados por millón de tokens. Aquí tienes las tarifas de los dos modelos tomadas de la oferta opencode Go:

| modelo              | entrada | salida | lectura de caché |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $ | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $ | 3,48 $ | 0,0145 $         |

Estas tarifas son las publicadas por [opencode Zen](https://opencode.ai/docs/zen/). Nuestras mediciones más abajo se realizan en ILaaS, que no cobra nada a los participantes de esta formación, y cuentan tokens en lugar de euros. Ambos se leen de la misma manera, con la diferencia de que un contador de tokens no te avisa cuando gastas.

De aquí resultan dos diferencias. La primera separa los dos modelos, ya que el `pro` cuesta 12,4 veces más que el `flash` a tarifa nominal. Es una primera forma de darse cuenta de que un modelo tiene más capacidades que otro. La segunda diferencia, mucho mayor, separa la entrada de la lectura de caché: un factor de **50** en `flash` y **120** en `pro`.

Esta segunda diferencia es lo que hace que un agente de código sea económicamente viable, ya que un agente relee su historial completo en cada turno y, de lo contrario, pagaría veinte veces el precio de su contexto a lo largo de una sesión de veinte turnos.

::: info Ejercicio (en aula)
En una sesión interactiva, encadena cinco preguntas sobre un mismo archivo escribiendo `/session` después de cada una, y cambia el modelo con `/model` antes de la cuarta. Las preguntas deben prohibir explícitamente cualquier relectura del archivo, ya que, de lo contrario, una nueva salida de herramienta se añadiría al contexto y dificultaría la lectura.

Aquí tienes la secuencia exacta que hemos medido, en modo no interactivo para que sea reproducible tal cual. La opción `-c` continúa la sesión anterior, y se omiten los acentos en los comandos sin que ello afecte al resultado:

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

Estas cinco vueltas producen seis llamadas al modelo, porque la primera consume dos: una para pedir la lectura de `theme.js`, una segunda para responder una vez que vuelve la salida de la herramienta.

| llamada | turno | prompt                     | modelo  | entrada | lectura de caché | coste           |
| ------- | ----- | -------------------------- | ------- | ------- | ---------------- | -------------- |
| 1       | 1     | « Lee `game/theme.js`... »  | `flash` | 1 675   | 0                | 0,000254 $     |
| 2       | 1     | (continuación, tras la lectura) | `flash` | 307     | 1 664            | 0,000081 $     |
| 3       | 2     | « cita un color... »       | `flash` | 66      | 2 048            | 0,000053 $     |
| 4       | 3     | « cuántos colores... »     | `flash` | 118     | 2 048            | 0,000087 $     |
| 5       | 4     | « confirma este número... » | `pro`   | 2 521   | **0**            | **0,005455 $** |
| 6       | 5     | « repite este número... »  | `pro`   | 148     | 2 432            | 0,000362 $     |

El caché se activa desde la segunda llamada, incluso dentro de un mismo turno, y reduce el coste en un factor de tres a cinco. El cambio de modelo en el cuarto turno reinicia la lectura de caché a cero y hace que se pague todo el prefijo a tarifa completa: este único turno cuesta quince veces más que el siguiente, con el mismo modelo.
:::

::: warning Si `pi -p` se congela sin mostrar nada
Desde un script, redirige la entrada estándar con `< /dev/null`. En modo no interactivo, `pi` espera en su entrada estándar mientras permanezca abierta, lo que bloquea indefinidamente cuando se llama desde un script de bash, por ejemplo. La herramienta de medición trysquare que describiremos más adelante conoce esta trampa y cierra la entrada estándar de cada ejecución utilizando `stdin=subprocess.DEVNULL` en un comando de Python `subprocess.run`.
:::

El caché solo funciona sobre un **prefijo sin cambios**, de lo cual se deriva la regla de ordenación del contexto: todo lo que varía debe colocarse detrás de lo que es estable. Una marca de tiempo o un `git status` insertado en el system prompt invalida la totalidad de lo que sigue, incluidas las herramientas, la pregunta y el historial, y hace que pagues la tarifa completa en cada turno, mientras que el mismo dato colocado en el mensaje del turno actual no cuesta nada ya que se encuentra en la zona que varía.

Ten en cuenta también que cambiar de modelo durante la sesión no es gratis, algo que conviene recordar cada vez que cambies de un modelo a otro con `/model`.

## Reconstruir

### La tarea y qué se considera un éxito

Todas las mediciones de este módulo se centran en la misma tarea, la **issue #1** de NÉON: la pelota atraviesa los ladrillos en lugar de rebotar.

El ticket se describe en `ISSUES.md`, en la raíz del [repositorio NÉON](https://github.com/AI-for-dev/neon): la pelota atraviesa los ladrillos, y el ticket detalla los comportamientos esperados tras la corrección. Podríamos dárselo directamente al agente, pero no lo haremos por ahora: primero queremos ver cómo se comporta según el prompt que le proporcionemos y el marco que lo rodea.

Este issue contiene varias sutilezas difíciles de encontrar para un agente solo. Verá rápidamente el problema y propondrá calcular la distancia de la pelota a los lados del ladrillo para invertir, según el lado tocado, una de las dos velocidades. En cambio, el caso de la esquina, raro pero real, y el de una velocidad lo suficientemente alta como para que la pelota atraviese el ladrillo sin llegar a cubrirlo, tienen muy pocas probabilidades de ser tratados.

Además de la corrección del bug, queremos empezar a definir un marco y verificar que el agente no se salga de él. Este marco se resume en tres reglas:

- El agente solo puede modificar `game/neon.js` y `game/neon.test.js`, y nada más.
- El agente debe ejecutar las pruebas para verificar que no haya roto nada.
- El agente debe añadir pruebas si la cobertura no es buena. Es nuestro caso aquí: no hay pruebas que verifiquen el comportamiento de la pelota con el ladrillo.

Esto es lo que proponemos medir en cada ejecución:

| métrica             | qué indica                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`          | el agente ha modificado al menos un archivo                                                         |
| `in_scope`           | solo ha tocado `game/neon.js` y `game/neon.test.js`                                       |
| `suite_lancee`       | ha ejecutado `npm test` por sí mismo, leído en su sesión                                            |
| `tests_ajoutes`      | la suite tiene más casos que la referencia                                                     |
| **`rebond_briques`** | **el criterio**: en cada una de las cuatro caras, el eje tocado se invierte y el otro no cambia |
| `rebond_angles`      | en la esquina, los dos componentes se invierten                                                |
| `rebond_sortie`      | tras el rebote, la pelota ha salido del rectángulo del ladrillo                             |
| `rebond_voisines`    | en una costura de la cuadrícula, el rebote se aplica una vez y no dos                       |
| `rebond_traversee`   | una pelota rápida ya no atraviesa el ladrillo sin tocarlo                                   |

Probamos todos estos puntos de manera determinista, sin LLM-as-a-judge: las pruebas necesarias están escritas en un archivo sonda. Una prueba ejecutable es más segura que un LLM encargado de confirmar un comportamiento deseado, cuyo veredicto probabilístico puede hacerte creer que es correcto cuando no lo es.

::: warning Cada ejecución trabaja sobre un clon efímero
Si el dispositivo trabajara directamente en el árbol de trabajo, cada ejecución modificaría el repositorio y la siguiente mediría esas modificaciones en lugar de la configuración. La herramienta que utilizamos más adelante clona NÉON **en un tag**, `etalon-v1`, en un directorio temporal, en cada ejecución. Sin esta precaución, `main` avanza, un aula corrige el issue #1, y las medidas de ayer ya no son comparables con las de mañana sin que nada lo indique.

Esta barrera de seguridad no es suficiente, ya que un tag sigue siendo un nombre que su propietario puede desplazar. Volveremos a esto en la parte « Generalizar ».
:::

### Los controles, a mano

#### El modelo

::: info Ejercicio (en clase)
Lanza la misma solicitud en dos modelos de tamaños diferentes: el que usas habitualmente y el más grande al que tengas acceso. La solicitud es deliberadamente mínima, es la que se escribe naturalmente el primer día. La llamaremos « solicitud descuidada » en el resto de este módulo:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Asegúrate de crear previamente dos clones separados:

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

luego trabaja en el directorio correspondiente al modelo probado.

Lee los dos diffs, luego los dos `/session`. Anota tus observaciones sin sacar conclusiones: la sección sobre las repeticiones explicará por qué dos ejecuciones no bastan para diferenciar dos modelos.
:::

#### El esfuerzo de razonamiento

`pi --help` anuncia siete niveles de razonamiento, de `off` a `max`. Es un control sencillo de manipular y, por lo tanto, resulta tentador empezar por ahí.

::: info Ejercicio (en clase)
Ejecuta la misma tarea con `--thinking minimal`, luego con `--thinking max`, y compara los tokens de salida y la respuesta. No encontrarás ninguna diferencia, porque ambos flags producen exactamente la misma solicitud si utilizas el modelo `gemma-4-31b`.

Para este modelo, solo hay dos modos: el thinking `on` o `off`.

Repite la comparación entre dos niveles realmente distintos en tu modelo, por ejemplo `off` y `high`, y mide la diferencia.
:::

El razonamiento tiene un efecto real cuando se mide entre dos niveles reales, y nuestras mediciones más abajo indicarán su magnitud. La lección general trata más bien sobre la confianza que se debe depositar en los ajustes: **un ajuste expuesto por el harness no se transmite necesariamente al modelo**, porque entre la configuración que escribes y la solicitud que se envía hay una tabla de correspondencia escrita por alguien, que puede estar incompleta. Te encontrarás con esta situación varias veces en la formación y regularmente en tu trabajo. Acostúmbrate a buscar dónde termina una configuración o un flag antes de confiar en él.

### Lo que escribimos

#### `AGENTS.md`, el punto de configuración global

El archivo de reglas situado en la raíz del repositorio entra en el contexto en cada turno, lo que lo convierte en un buen candidato para definir el marco global de nuestro proyecto. Cuando el agente se equivoca, la reacción natural es añadir una frase y luego otra. Sin embargo, cada línea añadida tiene un coste, y cuanto más crece el archivo, menos ve el agente el conjunto; además, la mejora de los modelos hará que algunas líneas que hoy son ciertas queden obsoletas. Por lo tanto, este archivo requiere un refactoring continuo a lo largo de la vida del proyecto.

Para esta formación, establecemos una restricción estricta.

::: danger Presupuesto: 40 líneas
El `AGENTS.md` de NÉON nunca superará las 40 líneas, desde el principio hasta el final de la formación. Cada módulo que quiera añadir una regla deberá primero eliminar otra, o reformular para que ambas quepan en una sola.

Esta restricción te obliga a realizar el trabajo de refactoring continuo descrito anteriormente: cada regla debe merecer su lugar, y un archivo corto tiene muchas más probabilidades de ser seguido realmente que una guía de estilo larga.
:::

También podemos apoyarnos en otros archivos y mencionarlo en `AGENTS.md`, para que el agente los lea según sea necesario. Por ejemplo, podemos indicarle que las convenciones están en `CONTRIBUTING.md`, la arquitectura en el `README.md` y el historial en git.

En nuestras veinte ejecuciones del issue #1 con la solicitud ignorada, **ninguna lanzó la suite de pruebas** y **ninguna añadió un caso**.

::: info Ejercicio (en clase)
Escribe el `AGENTS.md` de NÉON basándote en tus propias ejecuciones en lugar de las nuestras: relee los diffs que acabas de producir y busca qué hizo el agente sin que se le pidiera, o qué omitió a pesar de que se le solicitaba. Haz que lance las pruebas cada vez que modifique el código y que añada nuevas si no hay cobertura.

Aquí tienes la base de partida, para discutir y enmendar. Es el mismo archivo que utilizan nuestras mediciones y está versionado en los experimentos más abajo:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning Un `AGENTS.md` puede ocultar otro
Pi carga estos archivos de forma acumulativa, empezando por tu `~/.pi/agent/AGENTS.md` personal, luego cada directorio padre ascendente y finalmente el directorio actual. Por lo tanto, un archivo de reglas personal se incluye en todas tus mediciones sin que nada lo indique.

El flag `--no-context-files`, abreviado `-nc`, desactiva este descubrimiento, lo cual es indispensable para medir correctamente. La herramienta de medición más abajo trabaja en un clon desechable donde solo se deposita el archivo `AGENTS.md` del directorio actual (NEON).
:::

#### El system prompt

Pi permite reemplazar completamente su system prompt por un `.pi/SYSTEM.md` en la raíz del proyecto o un `~/.pi/agent/SYSTEM.md` global. La opción `--system-prompt` sigue una regla ligeramente diferente, ya que los archivos de contexto y los skills se siguen añadiendo encima, por lo que nunca se parte totalmente de una página en blanco.

::: info Ejercicio (autónomo)
Crea un `.pi/SYSTEM.md` de tres líneas. Este es el bloque que nuestras mediciones depositan en el clon para la configuración `-system_prompt`:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Reinicia la misma tarea y compara los tokens de entrada, los turnos, la duración y el contenido del diff.
:::


El system prompt de Pi ocupa 550 tokens. Todo el resto del trabajo ocurre en otros lugares y te recomendamos modificarlo solo por buenas razones. Te lo mostramos aquí para ilustrar la flexibilidad que ofrece Pi.

#### Una ventana limitada para observar la compactación

Cuando el contexto se acerca al límite, Pi compacta; es decir, resume los mensajes antiguos y mantiene intactos solo los más recientes. El activador sigue la regla `contextTokens > contextWindow - reserveTokens`, donde `reserveTokens` es 16 384 por defecto y representa el espacio dejado para la respuesta. El corte es visible en `\tree`, y `/compact` permite forzarlo, con instrucciones opcionales para orientar el resumen.

En NÉON, la compactación nunca se activará. El repositorio tiene 617 líneas, `gemma-4-31b` anuncia una ventana de unos 128 000 tokens, lo que sitúa el umbral alrededor de los 112 000, y nuestra experiencia más costosa solo alcanza este total acumulando trece turnos, ninguno de los cuales pesa más de unos diez mil tokens. Observar el mecanismo requiere, por tanto, crear la restricción.

::: info Ejercicio (autónomo)
Declara en `~/.pi/agent/models.json` una segunda entrada que apunte al mismo servicio, pero que anuncie una ventana de 32 000 tokens:

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

Entonces dispones de los dos regímenes en `/model`: el modelo real de 128K y el mismo limitado a 32K. Haz trabajar al agente con varios archivos usando el segundo hasta que se active la compactación, lee el resumen producido y luego verifica en `\tree` dónde ocurrió el corte y si el agente aún recuerda lo que se le pidió al principio.
:::

Esta manipulación muestra también que Pi compacta a 32 000 tokens no porque el modelo se sature, sino porque tú se lo has indicado. La ventana que conoce un harness es una línea de configuración y no una propiedad del modelo. Esta observación te será útil el día que un agente empiece a compactar demasiado pronto sin razón aparente.

### Un experimento más completo

#### El dispositivo

Estudiamos ahora más detalladamente la influencia de las diferentes partes del contexto, ejecutando cada configuración varias veces para tener en cuenta la dispersión de los resultados.

Para ello, vamos a utilizar [trysquare](https://github.com/AI-for-dev/trysquare), una herramienta escrita en Python y diseñada especialmente para esta formación. Lanza las configuraciones de un escenario, registra cada ejecución, agrega y ofrece una síntesis de los resultados. No sabe nada de NÉON, nada del issue #1, nada de esta formación.

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

No entraremos en los detalles de diseño y uso, para los cuales puedes consultar la [documentación](https://ai-for-dev.github.io/trysquare/). Recuerda para esta formación que el directorio `scenarios/` describe los experimentos: cada archivo declara el modelo utilizado (en el sentido en que Pi lo nombra), el número de repeticiones, las configuraciones del experimento y las pruebas de validación.

#### El plan de experimento

El plan elegido es el más sencillo que sigue siendo legible: una **base**, y luego un conjunto de variantes que cambian muy poco cada una.

La base, llamada `nothing`, reproduce lo que haría alguien el primer día: la solicitud descuidada proporcionada anteriormente durante tus primeros intentos, sin archivo de reglas, el system prompt del agente y el razonamiento cortado. Cada otra configuración añade un elemento para ver su efecto en la respuesta.

| configuración                    | qué cambia                                                   |
| -------------------------------- | --------------------------------------------------------------- |
| `nothing`                        | nada, es la referencia                                        |
| `+thinking`                      | `thinking = "high"`                                             |
| `+agents`                        | `brick/AGENTS.md` se deposita en el clon                      |
| `+well_crafted`                  | el prompt describe correctamente el problema y hace referencia a `ISSUES.md` |
| `-system_prompt`                 | el system prompt se sustituye por tres líneas                 |
| `+agents+well_crafted`           | `AGENTS.md` + prompt bien escrito                                 |
| `+agents+add_tests+well_crafted` | aquí añadimos además las pruebas que queremos que pasen   |

Un experimento se encuentra en un archivo: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

El directorio del experimento contiene otras configuraciones aparte de las de la tabla anterior; pertenecen a otros módulos y hablaremos de ellas más adelante.

El prompt bien escrito no copia el contenido del ticket. `ISSUES.md` ya describe cómo corregir el bug en el repositorio que el agente tiene a mano. Por lo tanto, el prompt menciona el issue, el alcance y el criterio de parada, y nada más:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Esta configuración mide, por tanto, si señalar un documento escrito es suficiente para que el agente lo lea y lo tenga en cuenta. Si el prompt copiara la solución, solo mediríamos la capacidad del agente para seguir una instrucción que acabamos de darle.

#### Las pruebas de validación

Para juzgar la calidad de los resultados, el escenario declara pruebas de validación:

- **delivered**: la ejecución llegó al final, sin interrupciones.
- **suite_lancee**: el agente recordó ejecutar las pruebas que se encuentran en el directorio `game`.
- **in_scope**: el agente solo modificó los archivos que se le pidió modificar, y únicamente las líneas que corresponden al problema.
- **tests_ajoutes**: el agente recordó añadir pruebas sobre los rebotes de la pelota contra los ladrillos.
- **`sonde.test.js`**: al final de la ejecución, esta sonda verifica que las modificaciones del código corrijan el problema en su totalidad, tal como se describe en `ISSUES.md`. También se incluye desde el principio en la configuración `+add_tests`, para ver si el agente es capaz de reparar sus errores basándose en las pruebas.

#### Las trazas

El experimento guarda trazas que permiten analizar a posteriori lo que ha sucedido. Para cada run, tienes acceso a:

- una exportación de la sesión de Pi en formato JSONL, que puede convertirse al formato HTML (hablaremos de ello más adelante);
- un directorio `validation` que muestra el estado de las pruebas de validación;
- un archivo `configuration.json` que recuerda el marco del run (modelo, harness, pruebas...);
- un parche (`diff.patch`) que indica qué se ha modificado en el código de NÉON durante el run.

Al final del experimento, una síntesis en formatos HTML y Markdown muestra los éxitos de las validaciones para cada configuración, así como los promedios de costes de tokens y la duración de los runs.

#### Cuántas repeticiones y por qué

Cada configuración se ejecuta varias veces y la razón se aprecia claramente en la configuración base.

Aquí tienes las seis primeras ejecuciones de `nothing`, estrictamente idénticas en su configuración: mismo modelo, mismo esfuerzo, mismo prompt, mismo repositorio en el mismo commit.

| ejecución       | 1      | 2      | 3      | 4       | 5      | 6       |
| --------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| tokens de entrada | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| turnos           | 4      | 5      | 4      | 4       | 5      | 4       |
| duración           | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterio alcanzado | sí    | sí    | sí    | **no** | sí    | **no** |

El coste varía menos de una cuarta parte, el número de turnos toma dos valores y la respuesta cambia una de cada tres veces. Una única ejecución de esta configuración te habría dado, según el sorteo, «la base corrige el bug» o «la base no lo corrige».

La configuración mejor equipada desplaza su dispersión hacia el coste en lugar de hacia la respuesta. En `+agents+add_tests+well_crafted`, los tokens de entrada van de 42 731 a 2 420 677, es decir, una amplitud de **×57**, y tres ejecuciones consecutivas dan 2 420 677, 2 147 526 y luego 594 786.

Un agente no es determinista, y la diferencia entre dos ejecuciones de una misma configuración es del mismo orden de magnitud que el efecto de la mayoría de las palancas, lo que hace que una única ejecución por configuración mida el sorteo más que la palanca.

Ante esta dispersión, trysquare nunca publica una cifra sola. Dos nociones bastan para leer sus tablas.

**Un punto es un punto porcentual de éxito.** `+agents+add_tests+well_crafted` alcanza el criterio 18 de cada 20 veces, es decir, el 90 %, y `nothing` 11 de cada 20 veces, es decir, el 55 %: la diferencia es de **+35 puntos**. Solo cuentan las ejecuciones válidas; aquellas que no entregaron nada se eliminan de ambos lados, lo que explica que un denominador pueda ser inferior al número de repeticiones.

**El intervalo proviene del bootstrap.** Se extraen al azar y con reposición veinte ejecuciones de cada grupo, se recalcula la diferencia y se repite diez mil veces; los límites publicados son los rangos del 2,5 % y 97,5 % de las diez mil diferencias obtenidas. Las ejecuciones similares dan un intervalo estrecho, las ejecuciones dispersas un intervalo amplio. La semilla está escrita en `trysquare.toml`, por lo que los límites se recalculan idénticamente.

Leer una diferencia equivale entonces a hacerse una sola pregunta: **¿este intervalo contiene el cero?** Si no lo contiene, la diferencia se marca con `*` y está **establecida**. Si lo contiene, se marca con `o` y **no es concluyente**, sea cual sea el valor central.

Ambos casos están en la matriz. Los +35 puntos anteriores vienen con un intervalo de +10 a +60, por lo que la ganancia es ciertamente positiva sin que se pueda decir si es de diez puntos o de sesenta. La configuración `+well_crafted` muestra +17 puntos en este mismo criterio, pero su intervalo contiene el cero: estas ejecuciones siguen siendo compatibles tanto con una palanca que ayuda como con una que perjudica.

Los `o` se muestran igualmente en las tablas, con un recordatorio debajo de cada una: ninguna conclusión puede basarse en una diferencia marcada con `o`.

El número de repeticiones sigue siendo un parámetro, porque la elección correcta depende de lo que busques. **Tres bastan para ver la dispersión**, que es el objetivo en el aula. **Desempatar dos palancas cercanas requiere mucho más**, y las columnas que cuentan éxitos son las más costosas: un 2/3 frente a un 3/3 no dice casi nada, mientras que un 8/20 frente a un 20/20 es defendible. Las tablas publicadas más abajo tienen veinte repeticiones por esta razón.

::: info Ejercicio (en el aula, luego de forma autónoma)
Empieza por el plan completo, que no consume nada:

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

La configuración se toma del `trysquare.toml` más cercano, es decir, el de `scripts/trysquare-campaign/` siempre que lances desde este directorio.

Luego lanza la matriz a tres repeticiones y déjala ejecutar mientras discutes los parámetros:

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

Los subcomandos que no consumen nada se ejecutan directamente y sirven después:

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**De forma autónoma**, copia `scenarios/issue1-contexte.toml`, cambia una configuración y vuelve a lanzar. No habrás tocado ni la herramienta, ni el validador, ni las otras configuraciones, y es el único artefacto de este módulo que no quedará obsoleto.
:::

#### Nuestras medidas

Te habrás dado cuenta en tus primeros intentos con `trysquare`: hacer mediciones lleva tiempo. Para unas veinte repeticiones, necesitarás entre 2 h y 3 h para obtener todos los resultados junto con los del siguiente módulo. Por ello, hemos preferido darte una campaña completa realizada previamente en la que puedes navegar por los directorios de cada ejecución como hiciste anteriormente.

Esto es lo que obtuvimos en agosto de 2026, sobre `ilaas` y `gemma-4-31b`, frente al commit `d62ccd1f` de NÉON, con **veinte repeticiones por configuración**. Las dos configuraciones de competencia figuran en el archivo y pertenecen al siguiente módulo; han sido excluidas de las tablas siguientes, a excepción de una observación al final.

| configuración                    | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

Y las columnas de la sonda, el criterio principal:

| configuración                    | bloques | ángulos | salida | vecinas | travesía |
| -------------------------------- | --------- | --------- | --------- | --------- | --------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

Los denominadores de `+well_crafted` y `+thinking` valen 18 y 19 en las columnas de coste, porque ILaaS devolvió `Request timed out` durante la medición y las ejecuciones afectadas no produjeron nada destacable.

Extraemos cinco conclusiones de estas dos tablas, y la última servirá de transición al siguiente módulo. Todas las desviaciones citadas más abajo provienen de los intervalos descritos anteriormente, con la misma marca `*` para una desviación establecida y `o` para una desviación no concluyente. Las comparaciones que no se realizan frente a `nothing` se obtienen volviendo a ejecutar el cálculo frente a otra referencia, lo que no tiene coste ni requiere nuevas mediciones. La columna del veredicto se basa en la única métrica declarada por `[verdict].criterion`; para leer una desviación en otra columna, es necesario cambiar esa línea del escenario antes de ejecutar:

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

La salida va a un `synthesis_ref-<referencia>.md` junto a la síntesis habitual, que no se modifica.

**El prompt acotado logra que se haga todo lo que indica el ticket, y nada más.** `tests_ajoutes` pasa de 0/20 a 17/20 y `rebond_angles` de 0/20 a 14/20, dos columnas que estaban vacías y que ahora se completan. Sin embargo, el prompt no menciona el mecanismo de rebote: indica el problema, el alcance y el criterio de parada, y es `ISSUES.md` el que describe la esquina, la salida del rectángulo, la costura de la rejilla y el túnel. La esquina se mantiene en **0/20 en las cuatro configuraciones que no acotan el ticket**, es decir, ochenta ejecuciones consecutivas. Por lo tanto, basarse en un documento escrito es suficiente para que sea leído, y es el contenido de dicho documento el que decide qué se procesará.

**El archivo de reglas solo desplaza el procedimiento, y deja de desplazar nada en cuanto el ticket es correcto.** `+agents` hace pasar `suite_lancee` de 0/20 a 20/20, porque una de sus cuatro líneas nombra el comando. En el criterio da 9/20 frente a 11/20 inicialmente, una diferencia no concluyente, y en `tests_ajoutes` se mantiene en 0/20 ya que ninguna de sus líneas menciona los tests. Añadido sobre el prompt estructurado no aporta **absolutamente nada**: 11/20 frente a 13/20 en el criterio, 12/20 frente a 14/20 en el coin, 17/20 frente a 17/20 en los tests añadidos; ninguna de estas tres diferencias es distinguible de cero. El archivo de reglas es un sustituto del ticket correcto más que un complemento, lo que da una regla de escritura directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que hay que eliminar.

**El razonamiento desplaza el criterio, y es el único que no hace que se lea el ticket.** `+thinking` da 16/20 en `rebond_briques`, es decir, una diferencia de +29 puntos cuyo intervalo excluye el cero. Es la única palanca de la matriz, aparte de las que afectan al ticket, para desplazar la corrección en sí. Su columna del coin se mantiene en 0/20 y sus tests añadidos en 3/20: el razonamiento mejora lo que el modelo hace con lo que tiene delante, pero no lo lleva a buscar lo que le falta.

**El prompt estructurado hace que se escriban los tests rojos, y una de cada cinco ejecuciones se detiene ahí.** La columna `touched` lo dice sin ambigüedades: en `+well_crafted` y `+agents+well_crafted`, cuatro ejecuciones de veinte nunca abren `game/neon.js`, de las cuales dos o tres escriben únicamente en `game/neon.test.js` y una o dos no entregan nada en absoluto. Ninguna otra configuración muestra este comportamiento; `nothing`, `+agents` y `-system_prompt` afectan a la fuente en veinte ejecuciones de veinte. La explicación está en el ticket, que enumera cinco subcasos y termina con « each case above added **first as a red test**, then green »: `gemma-4-31b` escribe los rojos y se detiene ahí, al no poder procesar la especificación completa. Es también por lo que el criterio de corrección no sube mientras que el coin sí: el modelo tiene un presupuesto de trabajo, y describir más trabajo en el ticket no lo amplía.

**Proporcionar los tests soluciona este desfase.** La configuración `+agents+add_tests+well_crafted` se analiza frente a `+agents+well_crafted`, la única en la que solo difiere por la sonda colocada en el árbol:

| columna           | `+agents+well_crafted` | `+add_tests` | diferencia            |
| ----------------- | ---------------------- | ------------ | -------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | no aplica             | **20/20**    |                        |

Las cuatro columnas de la corrección suben y las cuatro diferencias están establecidas. Por lo tanto, la palanca no solo gana casos límite, sino que también alcanza el criterio en sí mismo. Fíjate en la amplitud de los intervalos, y en particular en el del extremo que comienza en un solo punto: estas diferencias están establecidas en el sentido de que son positivas, sin que se pueda precisar su magnitud más allá de un factor de cincuenta.

`sonde_intacte` es 20/20, lo que significa que el modelo no intentó cambiar las pruebas de referencia. Y `tests_ajoutes` no varía, lo cual es coherente con un agente que ya tiene los casos delante y no tiene motivo para reescribirlos.

::: warning Ninguna columna de coste de gemma es citable aquí
La matriz registra 1 151 reintentos, es decir, turnos reiniciados porque el proveedor había fallado, y el recuadro de abajo muestra cuánto se concentran en las configuraciones más pesadas. Un reintento vuelve a ejecutar el turno con todo el contexto acumulado, por lo que infla las columnas de coste y, sobre todo, vuelve a pilotar al agente.

El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` registra **37**, lo que hace que los suyos sean legibles:

| configuración                    | turnos | duración |
| -------------------------------- | ------ | -------- |
| `nothing`                        | 19     | 163 s    |
| `+agents`                        | 12     | 65 s     |
| `-system_prompt`                 | 17     | 142 s    |
| `+well_crafted`                  | 15     | 252 s    |
| `+thinking`                      | 19     | 490 s    |
| `+agents+well_crafted`           | 14     | 561 s    |
| `+agents+add_tests+well_crafted` | 13     | 410 s    |

Los tokens de entrada de las dos matrices no se pueden poner en la misma tabla por una razón que no tiene nada que ver con el modelo: ILaaS no reporta ningún caché, ya que `cacheRead` es cero en sus ciento ochenta ejecuciones, por lo que su columna de entrada es la suma de los prefijos completos releídos en cada turno. opencode Zen sí reporta el caché, con hasta cinco millones de tokens leídos en una sola ejecución. La misma configuración muestra, por tanto, 558 000 tokens de entrada por un lado y 15 000 por el otro, sin que ninguno de los dos sea incorrecto. Esta es la parte práctica de lo que la primera sección de este módulo explica sobre el caché: el coste de las entradas depende de la configuración del proveedor del modelo y la activación del caché permite reducir drásticamente la factura.
:::

#### Tres verificaciones antes de citar una tabla

Una matriz publica tablas, intervalos y veredictos, lo que puede dar la impresión de ser conclusiones sólidas. No obstante, durante la elaboración de esta formación, nos hemos enfrentado a varios fenómenos que pueden desacreditar algunos resultados.

::: warning El recuento de reintentos
Un reintento es un turno que la herramienta tuvo que relanzar porque el proveedor falló. Vuelve a ejecutar ese turno con todo el contexto acumulado, por lo que infla las columnas de coste y, sobre todo, vuelve a pilotar al agente: ya no es la misma conducta de trabajo.

En la matriz `gemma-4-31b`, el recuento es de **1 151**, y no está repartido:

| configuración                    | reintentos |
| -------------------------------- | ---------- |
| `nothing`                        | 1           |
| `+agents`                        | 2           |
| `-system_prompt`                 | 1           |
| `+well_crafted`                  | 24          |
| `+thinking`                      | 81          |
| `+agents+well_crafted`           | 205         |
| `+agents+add_tests+well_crafted` | 205         |
| `+agents+add_tests+skill`        | 287         |
| `+agents+skill`                  | 345         |

Nada en las configuraciones de contexto corto, todo en aquellas de razonamiento elevado, y especialmente a medida que el contexto acumulado crece: una sola ejecución de `+agents+add_tests+well_crafted` consumió 2,4 millones de tokens de entrada en sesenta y tres turnos y acumuló dieciocho reintentos. El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` suma **treinta y siete** en total.
:::

::: warning La importancia de la prueba de validación
Una columna uniformemente negra parece un comportamiento del agente, pero puede ser un defecto del validador. La única forma de distinguirlos es que la métrica indique **por qué** respondió que es falso, y no solo que respondió que es falso.

Nuestro validador lo hace para `suite_lancee`: cuando no reconoce ninguna ejecución de la suite, copia en su motivo todos los comandos que el agente ha ejecutado. Esta precaución es importante, porque la forma del comando varía más entre modelos que el comando en sí. `deepseek-v4-flash` antepone a cada llamada el directorio de trabajo (`cd .../repo && npm test`, 664 veces en la matriz) y redirige la salida (`npm test 2>&1 | tail -30`, 80 veces), mientras que `gemma-4-31b` escribe simplemente `npm test`. Un test de validación que solo conociera la última forma calificaría el primer modelo con cero en toda la matriz.

En conclusión, **escribe tus métricas con precaución y pruébalas en un conjunto de tests**. Deben ser fiables. Anota cualquier comportamiento extraño antes de sacar conclusiones apresuradas.
:::

::: warning Lo que permite decir la comparación de los dos modelos y lo que no
Ambas matrices (`gemma-4-31b` y `deepseek-v4-flash`) se basan en el mismo escenario, las mismas nueve configuraciones y el mismo commit de NÉON, por lo que sus columnas de puntuación pueden leerse comparándolas entre sí. El modelo y el proveedor cambiaron a la vez, lo que impide atribuir una diferencia a uno más que al otro, pero aun así permite observar esto en la columna del extremo:

| configuration          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Ambos modelos reaccionan al mismo estímulo y en el mismo sentido; el más capaz parte de un nivel más alto y sube más.
:::

Estas cifras no deben tomarse como una verdad absoluta ni copiarse dentro de un año. Ejecuta la matriz de nuevo: para eso sirve precisamente, y la que obtengas sustituirá a esta.

Un contexto bien mantenido hace que el agente sea disciplinado y completo en lo que el ticket indica, sin hacerlo exhaustivo: no se llega al detalle del ladrillo donde el ticket no lo describe, y el tunneling sigue siendo la columna más baja de todas las que mide la sonda. Ir más allá de lo que contiene el material escrito requerirá un revisor independiente y un bucle de verificación, que es el tema de los módulos sobre delegación y workflows.

::: warning Tres conclusiones tentadoras que los intervalos no permiten
Cada una de las siguientes frases se basa en una cifra exacta de la campaña publicada en esta página, y ninguna es válida.

**« El archivo de reglas rompe la corrección. »** `+agents` da 9/20 en el criterio frente a 11/20 en la base. La diferencia es de -10 puntos, pero su intervalo contiene el cero: no podemos afirmar nada, ni en un sentido ni en el otro.

**« Eliminar el system prompt mejora el rebote. »** `-system_prompt` da 14/20 frente a 11/20, es decir, +15 puntos, y el intervalo también contiene el cero aquí. Con solo tres ejecuciones bien seleccionadas, habríamos obtenido 3/3 frente a 1/3 y podríamos haberlo creído durante mucho tiempo.

**« El prompt estructurado corrige mejor el bug. »** `+well_crafted` da +17 puntos en el criterio, lo cual no es concluyente. El efecto real de esta palanca se ve en otros lugares, en los tests añadidos y en los casos límite, donde las diferencias se cuentan por decenas de puntos y no dejan lugar a dudas.

Repetir tres veces no es suficiente: un efecto que no supera la dispersión de su propia configuración no es un efecto. Y un efecto establecido en esta tarea, con este ticket y este modelo, solo está establecido en este marco.
:::

Acabas de practicar una evaluación, en el sentido de que se comparan comportamientos en una misma tarea, con repeticiones y sabiendo que la medida tiene ruido, mientras que un test responde con sí o no a una pregunta cerrada. El módulo 3.2 formalizará esta práctica con archivos de evaluación y un LLM-juez, para los criterios que la sonda de este módulo no hubiera podido gestionar.

### La pila frente a la base

Las palancas de este módulo requieren atención y tiempo, mientras que un modelo más capaz se obtiene simplemente pagando más. Por lo tanto, es legítimo preguntarse si es más rentable optimizar el contexto o cambiar de modelo. La segunda parte de esta pregunta no se mide aquí, y más abajo explicamos por qué. La primera sí se mide, con un modelo constante, enfrentando las dos configuraciones extremas de la matriz.

::: info Ejercicio (en clase)
Compara la configuración `nothing`, que recibe una solicitud de una línea y nada más, y la configuración `+agents+add_tests+well_crafted`, que dispone del razonamiento, del ticket estructurado, del `AGENTS.md` y de la sonda depositada en el árbol. Mira primero los diffs, luego las columnas de la sonda y, solo al final, lo que ha costado cada una.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, diferencia +35 puntos  |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| turnos medianos    | 19        | 13                               |
| duración mediana   | 163 s     | 410 s                            |

Las dos últimas líneas se han tomado de la matriz `deepseek-v4-flash`, cuyas treinta y siete repeticiones hacen que las columnas de coste sean legibles, y las columnas de puntuación de `gemma-4-31b`.

El harness completo alcanza dieciocho sobre veinte en un criterio donde la base llega a once, y la columna más severa de la sonda pasa de 7/20 a 18/20. Es la tesis de Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, verificada en su mitad más fácil de establecer: con un modelo rigurosamente constante, el harness por sí solo marca la diferencia entre una corrección que funciona una vez cada dos y una corrección que funciona nueve veces cada diez.

El caso límite pasa de 0/20 a 18/20, y el prompt estructurado por sí solo ya obtenía catorce: la mayor parte de la ganancia proviene de que el prompt hace referencia a un ticket en `ISSUES.md` que nombra el caso, y la sonda añade a esto la perseverancia que faltaba para terminar el trabajo.

### Lo que este módulo no logra obtener

El único palancaje que llevó al modelo a tratar todo lo que pide el ticket es aquel que le puso las pruebas delante de los ojos. Sin embargo, esta configuración tiene algo de artificial: los casos límite estaban escritos de antemano, por nosotros, en el mismo archivo que registra. En un ticket real, nadie te los proporcionará.

Lo que esta configuración aporta en realidad es perseverancia. El modelo se pierde en un ticket largo porque agota su presupuesto formulando los casos en lugar de corregirlos; recibir los casos ya formulados le devuelve ese presupuesto. La pregunta del siguiente módulo es, por tanto, si una **competencia**, es decir, un procedimiento de trabajo escrito una vez y recargado a demanda, puede producir la misma perseverancia sin proporcionar las pruebas.


## Generalizar

Ocho principios de este módulo siguen siendo válidos más allá de Pi, de `ilaas` y de la versión de los paquetes que acabas de instalar.

**Lo que es estable delante, lo que varía detrás.** El caché solo funciona con un prefijo invariable y cuesta cincuenta veces menos que la entrada, por lo que cualquier dato volátil colocado pronto en el contexto, ya sea una marca de tiempo, un estado de git o una fecha, invalida todo lo siguiente.

**Señalar un documento escrito basta para que sea leído, y lo que esté escrito en él decide el resultado.** Nuestro ticket estructurado no describe el mecanismo del rebote: nombra el issue, el perímetro y el criterio de parada. Diecisiete ejecuciones de veinte fueron a leer `ISSUES.md`, allí encontraron la solicitud de casos límite en pruebas rojas y la ejecutaron, mientras que la solicitud omitida no había obtenido ninguna. El caso límite del ladrillo ofrece la versión más clara: está descrito en `ISSUES.md` y en ninguno de nuestros prompts, y tiene un valor de 0/20 en las cuatro configuraciones que no nombran el issue, frente a 14/20 en la que sí lo nombra. Escribe lo que esperas en un documento que puedas señalar, y vuelve a leer ese documento antes de concluir cualquier cosa sobre el agente.

**Un modelo tiene un presupuesto, y describir más trabajo no lo amplía.** Nuestro ticket enumera cinco subcasos y pide un test rojo para cada uno; cuatro ejecuciones de veinte escriben estos tests rojos y nunca abren el archivo fuente. Esta observación condiciona lo siguiente: o reduces la solicitud a lo que el modelo puede manejar, o le das los medios para mantener el ritmo, que es el tema del siguiente módulo.

**El archivo de reglas cambia lo que el agente hace y no lo que encuentra, y solo sirve para lo que el ticket no dice.** Se incluye en el contexto en cada turno, lo que lo convierte en una palanca potente y costosa a la vez; de ahí el interés de mantenerlo corto, de fundamentar cada regla en un fallo observado y de refactorizarlo en lugar de alargarlo. Nuestras mediciones enmarcan precisamente lo que aporta: la configuración `+agents` hace pasar de 0/20 a 20/20 el número de ejecuciones que lanzan la suite de tests, deja el criterio de corrección sin cambios y no aporta nada más una vez que el prompt estructurado está presente. La regla de escritura resultante es directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que hay que eliminar.

**Un ajuste expuesto por el harness no se transmite necesariamente al modelo.** Entre el flag que escribes y la solicitud que se envía hay código y tablas de correspondencia, como muestra `--thinking max`, que no llega al modelo que utilizamos sin que nada te lo advierta. El corolario en cuanto a la medición es que lo que define la experiencia debe estar escrito en la experiencia: un nivel de razonamiento heredado de una configuración personal hizo que una de nuestras configuraciones fuera idéntica a su base en todas las matrices publicadas.

**Un efecto que no sobrevive al remuestreo no es un efecto.** Repetir tres veces no es suficiente: mientras el intervalo de una desviación contenga cero, no hay nada que decir. De las nueve configuraciones medidas aquí, solo tres desplazan el criterio de corrección de manera establecida, mientras que las otras seis muestran cada una una cifra que podría parecer convincente. Una desviación establecida solo lo es, por lo demás, en esta tarea, con este ticket y este modelo.

**Lo que se mide debe estar anclado a lo que no cambia.** Un tag es un nombre, y `git tag -f` lo desplaza sin dejar rastro en la medición, de modo que dos matrices pueden declarar el mismo estándar y haber trabajado sobre dos versiones diferentes del código. Ancla mediante el commit, que no cambia, y si tu herramienta aún no lo permite, archiva al menos a qué commit resolvía el nombre en el momento de la medición.

**Una métrica debe decir por qué, y no solo qué.** Una columna uniformemente negra parece un comportamiento del agente y puede ser un defecto del validador, y nada distingue a los dos mientras la métrica se limite a responder verdadero o falso. Haz que escriba sobre lo que se ha pronunciado: la nuestra copia, debajo de cada falso, los comandos que el agente ejecutó, y eso es lo que permite verificar un cero en lugar de creerlo a ciegas.

**Escribe la hipótesis antes de medir, y versiónala.** Una hipótesis redactada después de las mediciones no es más que una conclusión disfrazada. La nuestra, `hypotheses/issue1-contexte.md`, contiene una predicción que resultó ser falsa, y es porque estaba escrita de antemano que la publicamos como tal en lugar de reformularla a posteriori como un descubrimiento.

## Entregable

Este módulo produce tres piezas: las dos primeras sirven durante todo el día, la tercera servirá para el acto 4.

**1. El `AGENTS.md` de NÉON**, versionado en el repositorio, de menos de 40 líneas, con cada regla justificada por un fallo que hayas observado.

**2. El repositorio de matriz** producido por `trysquare run`, con su línea de registro. El entregable no es una tabla copiada, sino el archivo que permite reconstruirla: las mediciones brutas, las sesiones, los diffs y la revisión de la herramienta que realizó la medición. Sin este archivo, la matriz no puede ser ni verificada ni recalificada, y sus cifras no valen más que una opinión.

**3. La ficha de decisión**, una línea por palanca:

| palanca                     | efecto medido | ¿adoptado? | por qué |
| -------------------------- | ------------ | -------- | -------- |
| elección del modelo        |              |          |          |
| esfuerzo de razonamiento   |              |          |          |
| ticket delimitado          |              |          |          |
| contenido del ticket señalado |          |          |          |
| `AGENTS.md`                |              |          |          |
| system prompt              |              |          |          |
| tests proporcionados de antemano |          |          |          |
| orquestación / caché       |              |          |          |
| compactación               |              |          |          |
| criterio ejecutable (sonda)|              |          |          |

Se han añadido dos líneas a esta ficha después de nuestras últimas mediciones. « Contenido del ticket señalado » figura aquí porque la reescritura de `ISSUES.md` desplazó más columnas que cualquier ajuste del harness, y « tests proporcionados de antemano » porque es la única palanca que ha compensado la caída de rendimiento del modelo en un ticket largo.

Esta ficha constituye el primer llenado real de la columna « ¿tu harness? » de la tabla de correspondencia, para la fila « contexto ». Los cinco módulos siguientes harán lo mismo para su bloque, de modo que llegarás al capstone con una tabla ya completada por tus experiencias.

::: tip Criterio de éxito
Sabes citar una palanca que hayas medido como sin efecto en NÉON y decir bajo qué condición precisa tendría uno en otro lugar.

Nuestro ejemplo es `AGENTS.md`: no desplaza ni un solo punto el criterio de corrección, y resultaría decisivo en un ticket cuyo fallo habitual sea de procedimiento más que de razonamiento, o en un repositorio cuyos tickets estén mal escritos. El tuyo será diferente, y ese es el objetivo. Este criterio exige haber visto las cifras y haber comprendido que son la tarea y su material lo que las determina. Por lo tanto, no puede satisfacerse de memoria.
:::

## Las trampas

**Concluir a partir de una sola ejecución**, que sigue siendo la trampa principal y la más costosa, ya que produce convicciones duraderas a partir del ruido.

**Inyectar datos volátiles en la zona cacheable.** Una fecha, un `git status` o una marca de tiempo colocada temprano en el contexto invalida todo el caché posterior y hace que pagues caro un ahorro que creías haber conseguido.

**Olvidar tu `AGENTS.md` personal**, cargado además del del proyecto, invisible en la interfaz, y que sesga todas tus mediciones mientras no utilices `-nc`.

**Creer ciegamente en un flag**, cuando `--thinking max` puede no tener ningún efecto sin que Pi te advierta.

**Confundir la ausencia de saturación con la ausencia de problemas.** En una ventana cómoda nada se desborda nunca, lo que significa únicamente que la alarma no sonará y que el coste será tu único indicador.

**Juzgar por el motivo cuando se puede juzgar por el comportamiento.** Buscar en un diff si se parece a la solución esperada responde a una pregunta distinta a «¿este diff resuelve el problema?», y es en esa brecha donde se encuentran los falsos positivos. Busca la forma ejecutable antes de resignarte al motivo, y luego al juez.

**No contar los reintentos.** Una matriz medida mientras el proveedor falla y reintenta no mide la configuración, aunque dé la apariencia completa: tablas, intervalos, veredictos. Por lo tanto, el recuento de reintentos debe leerse como una columna de resultado independiente.

**Creer en una columna uniformemente negra.** Ceros en todas las configuraciones se parece a un comportamiento del modelo y puede ser un comparador demasiado estricto, como aquel que rechazaba `cd /tmp/x && npm test` porque solo conocía `npm test`. Verifica la razón adjunta a un fallo antes de sacar una conclusión.

**Confiar en un tag.** Este se desplaza, y nada en una tabla lo indicará. La única forma de saberlo a posteriori es mediante el commit archivado por ejecución, y la única forma de evitarlo es fijarlo mediante dicho commit.

**Comparar costes entre dos proveedores.** No cuentan lo mismo: uno informa del caché y el otro no, de modo que la columna «entrada» de uno es la suma de los prefijos completos y la del otro es la parte que no estaba ya en caché. La relación entre ambos no significa nada.

## Para ir más allá

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), el estudio que justifica que no baste con rellenar la ventana.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sobre el desplazamiento del prompt aislado hacia la arquitectura del contexto.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), cuya tesis es la que la comparación de la pila inicial pone a prueba.
- [La documentación de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), y en particular sus páginas sobre la compactación, los modelos y los ajustes.
- [trysquare](https://github.com/AI-for-dev/trysquare), la herramienta de medición utilizada en este módulo, y su guía de redacción de escenarios.
- La campaña de trysquare de la formación, `scripts/trysquare-campaign/`, con sus hipótesis escritas antes de la medición y sus matrices archivadas. Es el único lugar donde las cifras de esta página son verificables.
