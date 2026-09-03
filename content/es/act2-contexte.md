# El contexto y la ventana: qué ponemos en ella y cuánto cuesta

::: tip Objetivos de este módulo
- Saber decir qué hay realmente en la ventana de contexto y cuánto cuesta cada parte
- Manipular las palancas que la llenan: modelo, esfuerzo de razonamiento, prompt, `AGENTS.md`, system prompt
- Montar un dispositivo de medición reproducible y usarlo para decidir
- Irse con un `AGENTS.md` corto y una decisión motivada sobre cada palanca
:::

La gestión del contexto es la pieza de la que dependen todas las demás, ya que un subagente sirve para no contaminar el contexto principal, una memoria para no llenarlo con lo que se podría volver a encontrar, y un permiso para no volcar en ella un archivo que no se debería haber leído. Por lo tanto, es necesario empezar por saber qué contiene la ventana y cuánto cuesta cada parte; de lo contrario, los siguientes módulos no serán más que recetas aplicadas sin ser comprendidas.

Procedemos en el orden habitual: comprender qué hay en la ventana, reconstruir las palancas que la llenan y luego extraer lo que sigue siendo válido cuando la herramienta cambia.

::: info Una convención de lectura
Cada manipulación está marcada como **en clase** o **en autonomía**. El recorrido en clase está diseñado para encajar en la sesión y para bastar para comprender los retos del módulo. Las manipulaciones en autonomía profundizan y están escritas para ser realizadas solo, más tarde, en tu propio repositorio.
:::

## Comprender

### Cinco fuentes, una sola ventana

Cuando escribes una pregunta en Pi, el modelo recibe un apilamiento donde tu pregunta es solo una línea:

1. el **system prompt**, que describe al modelo su rol, sus herramientas y sus convenciones;
2. los **archivos de contexto**, `AGENTS.md` y `CLAUDE.md`, cargados desde tu directorio personal, luego desde cada directorio padre ascendiendo y, finalmente, desde el directorio actual;
3. las **descripciones de las herramientas**, en JSON, una por cada herramienta disponible;
4. **tu pregunta**;
5. y, a medida que el bucle gira, el **historial**, es decir, cada respuesta del modelo, cada llamada a una herramienta y cada salida de una herramienta.

Las cuatro primeras fuentes son estables de un turno a otro, mientras que la quinta crece en cada turno, lo que la convierte casi siempre en la responsable de los desbordamientos.

::: info Ejercicio (en clase)
Abre una sesión, haz cualquier pregunta y luego exporta la sesión con `\export`. Abre el archivo HTML producido y lee el system prompt de Pi completo, algo que la mayoría de los agentes de código no te permiten hacer.

Identifica en él lo que describe **capacidades** y lo que describe **convenciones**: más adelante mediremos el peso real de cada una de las dos categorías.
:::

En una solicitud tan trivial como « di solo OK », sin archivo de contexto, sin skill y sin extensión, la entrada pesa **1 660 tokens**, y cae a **1 110** si se reemplaza el system prompt de Pi por tres líneas. El system prompt de Pi cuesta, por lo tanto, unos **550 tokens**, lo cual es poco considerando lo que las salidas de herramientas y el historial añadirán después. Lo esencial de lo que llena una ventana de contexto no proviene del harness, sino de lo que tú y el agente vertéis en ella a lo largo de la sesión.

### ¿Cuánto cuesta el uso de un LLM?

Una llamada al modelo se factura en tres conceptos, expresados por millón de tokens. Aquí tienes las tarifas de los dos modelos tomadas de la oferta opencode Go:

| modelo              | entrada | salida | lectura de caché |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $ | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $ | 3,48 $ | 0,0145 $         |

Estas tarifas son las publicadas por [opencode Zen](https://opencode.ai/docs/zen/). Nuestras mediciones más abajo se realizan en ILaaS, que no cobra nada a los participantes de esta formación, y por lo tanto cuentan tokens en lugar de euros. Ambos se leen de la misma manera, con la diferencia de que un contador de tokens no te avisa cuando estás gastando.

De aquí resultan dos diferencias. La primera separa los dos modelos, ya que el `pro` cuesta 12,4 veces más que el `flash` a precio nominal. Esta es una primera forma de darse cuenta de que un modelo tiene más capacidades que otro. La segunda diferencia, mucho mayor, separa la entrada de la lectura de caché: un factor de **50** en `flash` y **120** en `pro`.

Esta segunda diferencia es lo que hace que un agente de código sea económicamente viable, ya que un agente relee su historial completo en cada turno y, de lo contrario, pagaría veinte veces el precio de su contexto durante una sesión de veinte turnos.

::: info Ejercicio (en clase)
En una sesión interactiva, encadena cinco preguntas sobre un mismo archivo escribiendo `/session` después de cada una, y cambia de modelo con `/model` antes de la cuarta. Las preguntas deben prohibir explícitamente cualquier relectura de archivo; de lo contrario, una nueva salida de herramienta se añadirá al contexto y entorpecerá la lectura.

Aquí tienes la secuencia exacta que hemos medido, en este caso en modo no interactivo para que sea reproducible tal cual. La opción `-c` continúa la sesión anterior, y se han omitido los acentos en los comandos sin que ello afecte al resultado:

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

Estos cinco turnos producen seis llamadas al modelo, ya que el primero consume dos: una para solicitar la lectura de `theme.js`, una segunda para responder una vez que regresa la salida de la herramienta.

| llamada | turno | prompt                     | modelo  | entrada | lectura de caché | coste           |
| -------- | ----- | -------------------------- | ------- | ------- | ---------------- | -------------- |
| 1        | 1     | « Lee `game/theme.js`... » | `flash` | 1 675   | 0                | 0,000254 $      |
| 2        | 1     | (continuación, tras lectura)| `flash` | 307     | 1 664            | 0,000081 $      |
| 3        | 2     | « cita un color... »       | `flash` | 66      | 2 048            | 0,000053 $      |
| 4        | 3     | « cuántos colores... »      | `flash` | 118     | 2 048            | 0,000087 $      |
| 5        | 4     | « confirma este número... »| `pro`   | 2 521   | **0**            | **0,005455 $** |
| 6        | 5     | « repite este número... »  | `pro`   | 148     | 2 432            | 0,000362 $      |

La caché se activa desde la segunda llamada, incluso dentro de un mismo turno, y reduce el coste en un factor de tres a cinco. El cambio de modelo en el cuarto turno reinicia la lectura de caché a cero y obliga a pagar todo el prefijo a tarifa completa: este único turno cuesta quince veces más que el siguiente, con el mismo modelo.
:::

::: warning Si `pi -p` se congela sin mostrar nada
Desde un script, redirige la entrada estándar con `< /dev/null`. En modo no interactivo, `pi` espera en su entrada estándar mientras permanezca abierta, lo que bloquea indefinidamente cuando es llamado desde un script de bash, por ejemplo. La herramienta de medición trysquare que describiremos más adelante conoce esta trampa y cierra la entrada estándar de cada ejecución utilizando `stdin=subprocess.DEVNULL` en un comando de Python `subprocess.run`.
:::

La caché solo funciona sobre un **prefijo invariable**, de lo cual se deriva la regla de ordenación del contexto: todo lo que varíe debe colocarse detrás de lo que sea estable. Una marca de tiempo o un `git status` insertado en el system prompt invalida la totalidad de lo que sigue, incluyendo herramientas, pregunta e historial, y hace que vuelvas a pagar la tarifa completa en cada turno, mientras que el mismo dato colocado en el mensaje del turno actual no cuesta nada, ya que se encuentra ya en la zona que varía.

Ten en cuenta también que cambiar de modelo durante la sesión no es gratuito, algo que debes recordar cada vez que cambies de un modelo a otro con `/model`.

## Reconstruir

### La tarea y qué se considera un éxito

Todas las mediciones de este módulo se basan en la misma tarea, la **issue #1** de NÉON: la pelota atraviesa los ladrillos en lugar de rebotar.

El ticket se describe en `ISSUES.md`, en la raíz del [repositorio NÉON](https://github.com/AI-for-dev/neon): la pelota atraviesa los ladrillos, y el ticket detalla los comportamientos esperados después de la corrección. Podríamos dárselo directamente al agente, pero no lo haremos por el momento: primero queremos ver cómo se comporta según el prompt que le proporcionamos y el marco que lo rodea.

Este issue presenta varias sutilezas difíciles de encontrar para un agente solo. Verá rápidamente el problema y propondrá calcular la distancia de la pelota a los lados del ladrillo para invertir, según el lado tocado, una de las dos velocidades. El caso de la esquina, raro pero real, y el de una velocidad lo suficientemente alta como para que la pelota atraviese el ladrillo sin llegar a cubrirlo, tienen en cambio muy pocas probabilidades de ser tratados.

Además de la corrección del bug, queremos empezar a definir un marco y verificar que el agente no se salga de él. Este marco se resume en tres reglas:

- El agente solo puede modificar `game/neon.js` y `game/neon.test.js` y nada más.
- El agente debe ejecutar los tests para verificar que no ha roto nada.
- El agente debe añadir tests si la cobertura no es buena. Este es nuestro caso aquí: no hay tests que verifiquen el comportamiento de la pelota con el ladrillo.

Esto es lo que proponemos medir en cada ejecución:

| métrica             | lo que indica                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`          | el agente ha modificado al menos un archivo                                                         |
| `in_scope`           | solo ha tocado `game/neon.js` y `game/neon.test.js`                                       |
| `suite_lancee`       | ha ejecutado `npm test` por sí mismo, leído en su sesión                                            |
| `tests_ajoutes`      | la suite tiene más casos que el patrón de referencia                                                     |
| **`rebond_briques`** | **el criterio** : en cada una de las cuatro caras, el eje tocado se invierte y el otro no se mueve |
| `rebond_angles`      | en la esquina, ambas componentes se invierten                                                |
| `rebond_sortie`      | tras el rebote, la pelota ha salido del rectángulo del ladrillo                             |
| `rebond_voisines`    | en una costura de la cuadrícula, el rebote se aplica una vez y no dos                       |
| `rebond_traversee`   | una pelota rápida ya no atraviesa el ladrillo sin tocarlo                                   |

Probamos todos estos puntos de manera determinista, sin LLM-as-a-judge: las pruebas necesarias están escritas en un archivo sonda. Una prueba ejecutable es más segura que un LLM encargado de confirmar un comportamiento deseado, cuyo veredicto probabilístico puede hacerte creer que es correcto cuando no lo es.

::: warning Cada ejecución trabaja sobre un clon efímero
Si el dispositivo trabajara directamente en el árbol de trabajo, cada ejecución modificaría el repositorio y la siguiente mediría esas modificaciones en lugar de la configuración. La herramienta que utilizamos más adelante clona NÉON **en un tag**, `etalon-v1`, en un directorio temporal, en cada ejecución. Sin esta precaución, `main` avanza, alguien corrige la issue #1, y las medidas de ayer ya no se comparan con las de mañana sin que nada lo indique.

Esta barrera de seguridad no es completamente suficiente, ya que un tag sigue siendo un nombre que su propietario puede desplazar. Volveremos a esto en la sección « Generalizar ».
:::

### Los controles, a mano

#### El modelo

::: info Ejercicio (en clase)
Lanza la misma petición en dos modelos de tamaños diferentes, el que usas habitualmente y el más grande al que tengas acceso. La petición es deliberadamente mínima, es la que se escribe naturalmente el primer día. La llamaremos « petición descuidada » en el resto de este módulo:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Asegúrate de crear previamente dos clones separados:

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

luego trabaja en el directorio correspondiente al modelo probado.

Lee los dos diffs, y luego las dos `/session`. Anota tus observaciones sin sacar conclusiones: la sección sobre las repeticiones explicará por qué dos ejecuciones no bastan para diferenciar dos modelos.
:::

#### El esfuerzo de razonamiento

`pi --help` anuncia siete niveles de razonamiento, de `off` a `max`. Es un control sencillo de manipular y, por tanto, resulta tentador empezar por él.

::: info Ejercicio (en clase)
Lanza la misma tarea con `--thinking minimal`, luego con `--thinking max`, y compara los tokens de salida y la respuesta. No encontrarás ninguna diferencia, porque los dos flags producen exactamente la misma petición si utilizas el modelo `gemma-4-31b`.

Para este modelo, solo hay dos modos: el thinking `on` o `off`.

Vuelve a realizar la comparación entre dos niveles realmente distintos en tu modelo, por ejemplo `off` y `high`, y mide la diferencia.
:::

El razonamiento tiene un efecto real cuando se mide entre dos niveles reales, y nuestras mediciones más abajo determinarán su magnitud. La lección general se centra más bien en la confianza que se debe depositar en los ajustes: **un ajuste expuesto por el harness no se transmite necesariamente al modelo**, porque entre la configuración que escribes y la solicitud que se envía hay una tabla de correspondencia escrita por alguien, que puede estar incompleta. Te encontrarás con esta situación varias veces en la formación y regularmente en tu trabajo. Acostúmbrate a buscar dónde termina una configuración o un flag antes de confiar en él.

### Lo que escribimos

#### `AGENTS.md`, el punto de configuración global

El archivo de reglas situado en la raíz del repositorio entra en el contexto en cada turno, lo que lo convierte en un buen candidato para definir el marco global de nuestro proyecto. Cuando el agente se equivoca, la reacción natural es añadir una frase, y luego otra. Sin embargo, cada línea añadida tiene un coste, y cuanto más crece el archivo, menos ve el agente el conjunto; además, la mejora de los modelos hará que algunas líneas actuales queden obsoletas. Por lo tanto, este archivo requiere un refactoring continuo durante toda la vida del proyecto.

Para esta formación, establecemos una restricción fuerte.

::: danger Presupuesto: 40 líneas
El `AGENTS.md` de NÉON nunca superará las 40 líneas, desde el principio hasta el final de la formación. Cada módulo que quiera añadir una regla deberá primero eliminar otra, o reformularlas para que ambas quepan en una sola.

Esta restricción te obliga a realizar el trabajo de refactoring continuo descrito anteriormente: cada regla debe merecer su lugar, y un archivo corto tiene muchas más probabilidades de ser seguido realmente que una guía de estilo larga.
:::

También podemos apoyarnos en otros archivos y mencionarlo en `AGENTS.md`, para que el agente los lea según sea necesario. Por ejemplo, podemos indicarle que las convenciones están en `CONTRIBUTING.md`, la arquitectura en el `README.md` y el historial en git.

En nuestras veinte ejecuciones del issue #1 con la petición ignorada, **ninguna lanzó la suite de pruebas** y **ninguna añadió un caso**.

::: info Ejercicio (en clase)
Escribe el `AGENTS.md` de NÉON basándote en tus propias ejecuciones en lugar de las nuestras: revisa los diffs que acabas de generar y busca qué hizo el agente sin que se lo pidieras, o qué omitió a pesar de que se lo pedías. Haz que lance las pruebas cada vez que modifique el código y que añada algunas si no hay cobertura.

Aquí tienes la base de partida, para discutir y enmendar. Es el mismo archivo que utilizan nuestras mediciones y está versionado en los experimentos más abajo:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning Un `AGENTS.md` puede esconder otro
Pi carga estos archivos de forma acumulativa, empezando por tu `~/.pi/agent/AGENTS.md` personal, luego desde cada directorio padre ascendiendo, y finalmente el directorio actual. Por lo tanto, un archivo de reglas personal se incluye en todas tus mediciones sin que nada lo indique.

La bandera `--no-context-files`, abreviada como `-nc`, desactiva este descubrimiento, lo cual es indispensable para medir correctamente. La herramienta de medición más abajo trabaja en un clon desechable donde solo se deposita el archivo `AGENTS.md` del directorio actual (NEON).
:::

#### El system prompt

Pi permite reemplazar completamente su system prompt mediante un `.pi/SYSTEM.md` en la raíz del proyecto o un `~/.pi/agent/SYSTEM.md` global. La opción `--system-prompt` sigue una regla ligeramente diferente, ya que los archivos de contexto y los skills se siguen añadiendo encima, por lo que nunca se empieza totalmente desde cero.

::: info Ejercicio (autónomo)
Crea un `.pi/SYSTEM.md` de tres líneas. Este es el bloque que nuestras mediciones depositan en el clon para la configuración `-system_prompt`:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Vuelve a ejecutar la misma tarea y compara los tokens de entrada, los turnos, la duración y el contenido del diff.
:::


El system prompt de Pi ocupa 550 tokens. Todo el resto del trabajo ocurre en otro lugar y te recomendamos modificarlo solo por buenas razones. Te lo mostramos aquí para ilustrar la flexibilidad que ofrece Pi.

#### Una ventana limitada, para ver la compactación

Cuando el contexto se acerca al límite, Pi compacta, es decir, resume los mensajes antiguos y mantiene intactos solo los más recientes. El activador sigue la regla `contextTokens > contextWindow - reserveTokens`, donde `reserveTokens` es 16 384 por defecto y representa el espacio dejado para la respuesta. El corte es visible en `\tree`, y `/compact` permite forzarlo, con instrucciones opcionales para orientar el resumen.

En NÉON, la compactación nunca se activará. El repositorio tiene 617 líneas, `gemma-4-31b` anuncia una ventana de unos 128 000 tokens, lo que sitúa el umbral alrededor de 112 000, y nuestra experiencia más costosa solo alcanza este total acumulando trece turnos, ninguno de los cuales pesa más de diez mil tokens. Observar el mecanismo requiere, por lo tanto, crear la restricción.

::: info Ejercicio (autónomo)
Declara en `~/.pi/agent/models.json` una segunda entrada, apuntando al mismo servicio, pero anunciando una ventana de 32 000 tokens:

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

Añade en el `.pi/settings.json` de NÉON unos umbrales coherentes con esta ventana pequeña:

```json
{ "compaction": { "reserveTokens": 4000, "keepRecentTokens": 8000 } }
```

Entonces dispones de los dos regímenes en `/model`: el modelo real de 128K y el mismo limitado a 32K. Haz trabajar al agente en varios archivos con el segundo hasta que se active la compactación, lee el resumen producido y luego verifica en `\tree` dónde ocurrió el corte y si el agente aún sabe lo que se le pidió al principio.
:::

Esta manipulación también muestra que Pi compacta a 32 000 tokens no porque el modelo se sature, sino porque tú se lo has declarado. La ventana que conoce un harness es una línea de configuración y no una propiedad del modelo. Esta observación te será útil el día que un agente empiece a compactar demasiado pronto sin razón aparente.

### Una experiencia más completa

#### El dispositivo

Ahora estudiaremos más detalladamente la influencia de las diferentes partes del contexto, ejecutando cada configuración varias veces para tener en cuenta la dispersión de los resultados.

Para ello, vamos a utilizar [trysquare](https://github.com/AI-for-dev/trysquare), una herramienta escrita en Python y diseñada especialmente para esta formación. Lanza las configuraciones de un escenario, registra cada ejecución, agrega y ofrece una síntesis de los resultados. No sabe nada de NÉON, nada del issue #1, nada de esta formación.

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

No entraremos en los detalles de diseño y uso, para los cuales puedes consultar la [documentación](https://ai-for-dev.github.io/trysquare/). Ten en cuenta para esta formación que el directorio `scenarios/` describe los experimentos: cada archivo declara el modelo utilizado (en el sentido que Pi lo nombra), el número de repeticiones, las configuraciones del experimento y las pruebas de validación.

#### El plan de experiencia

El plan elegido es el más sencillo que sigue siendo legible: una **base**, seguida de un conjunto de variantes que cambian poco cada una.

La base, llamada `nothing`, reproduce lo que haría alguien el primer día: la solicitud descuidada proporcionada anteriormente en tus primeros intentos, sin archivo de reglas, el system prompt del agente y el razonamiento cortado. Cada configuración adicional añade un elemento para observar su efecto en la respuesta.

| configuración                    | qué cambia                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `nothing`                        | nada, es la referencia                                                     |
| `+thinking`                      | `thinking = "high"`                                                         |
| `+agents`                        | `brick/AGENTS.md` se deposita en el clon                                     |
| `+well_crafted`                  | el prompt describe correctamente el problema y hace referencia a `ISSUES.md` |
| `-system_prompt`                 | el system prompt es sustituido por tres líneas                              |
| `+agents+well_crafted`           | `AGENTS.md` + prompt bien escrito                                           |
| `+agents+add_tests+well_crafted` | aquí se añaden además las pruebas que se desea que pasen                   |

Un experimento reside en un archivo: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

El directorio del experimento contiene otras configuraciones además de las de la tabla anterior; pertenecen a otros módulos y hablaremos de ellas más adelante.

El prompt bien escrito no copia el contenido del ticket. `ISSUES.md` ya describe cómo corregir el bug en el repositorio que el agente tiene a mano. Por lo tanto, el prompt indica el issue, el alcance y el criterio de parada, y nada más:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

Esta configuración mide, por tanto, si señalar un documento escrito es suficiente para que el agente lo lea y lo tenga en cuenta. Si el prompt copiara la solución, mediríamos únicamente la capacidad del agente para seguir una instrucción que acaba de recibir.

#### Las pruebas de validación

Para juzgar la calidad de los resultados, el escenario declara pruebas de validación:

- **delivered**: la ejecución llegó al final, sin interrupciones.
- **suite_lancee**: el agente pensó en ejecutar las pruebas que se encuentran en el directorio `game`.
- **in_scope**: el agente solo modificó los archivos que se le pidió modificar, y solo las líneas que corresponden al problema.
- **tests_ajoutes**: el agente pensó en añadir pruebas sobre los rebotes de la pelota contra los ladrillos.
- **`sonde.test.js`**: al final de la ejecución, esta sonda verifica que las modificaciones del código corrijan el problema en su totalidad, tal como se describe en `ISSUES.md`. También se incluye desde el principio en la configuración `+add_tests`, para ver si el agente es capaz de reparar sus errores basándose en las pruebas.

#### Las trazas

El experimento guarda trazas que permiten analizar a posteriori lo que sucedió. Para cada run, tienes acceso a:

- un export de la sesión Pi en formato JSONL, que se puede convertir al formato HTML (hablaremos de ello más adelante);
- un directorio `validation` que indica el estado de las pruebas de validación;
- un archivo `configuration.json` que recuerda el marco del run (modelo, harness, pruebas...);
- un patch (`diff.patch`) que indica qué se ha modificado en el código de NÉON durante el run.

Al final del experimento, una síntesis en formatos HTML y Markdown muestra los éxitos de las validaciones para cada configuración, así como los promedios de costes de tokens y la duración de los runs.

#### Cuántas repeticiones y por qué

Cada configuración se ejecuta varias veces y la razón se aprecia claramente en la configuración base.

Aquí tienes las primeras seis ejecuciones de `nothing`, estrictamente idénticas en su configuración: mismo modelo, mismo esfuerzo, mismo prompt, mismo repositorio en el mismo commit.

| ejecución       | 1      | 2      | 3      | 4       | 5      | 6       |
| --------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| tokens de entrada | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| turnos           | 4      | 5      | 4      | 4       | 5      | 4       |
| duración           | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterio alcanzado | sí    | sí    | sí    | **no** | sí    | **no** |

El coste varía en menos de una cuarta parte, el número de turnos toma dos valores y la respuesta cambia una de cada tres veces. Una ejecución única de esta configuración te habría dado, según el azar, « la base corrige el bug » o « la base no lo corrige ».

La configuración mejor equipada desplaza su dispersión hacia el coste en lugar de hacia la respuesta. En `+agents+add_tests+well_crafted`, los tokens de entrada van de 42 731 a 2 420 677, es decir, una amplitud de **×57**, y tres ejecuciones consecutivas dan 2 420 677, 2 147 526 y luego 594 786.

Un agente no es determinista, y la diferencia entre dos ejecuciones de una misma configuración es del mismo orden de magnitud que el efecto de la mayoría de las palancas, lo que hace que una ejecución única por configuración mida el azar más que la palanca.

Ante esta dispersión, trysquare nunca publica una cifra aislada. Dos nociones bastan para leer sus tablas.

**Un punto es un punto porcentual de éxito.** `+agents+add_tests+well_crafted` alcanza el criterio 18 de 20 veces, es decir, el 90 %, y `nothing` 11 de 20 veces, es decir, el 55 %: la diferencia es de **+35 puntos**. Solo cuentan las ejecuciones válidas; aquellas que no entregaron nada se eliminan de ambos lados, lo que explica que un denominador pueda ser inferior al número de repeticiones.

**El intervalo proviene del bootstrap.** Se extraen al azar y con reemplazo veinte ejecuciones en cada grupo, se recalcula la diferencia y se repite diez mil veces; los límites publicados son los rangos 2,5 % y 97,5 % de las diez mil diferencias obtenidas. Ejecuciones similares dan un intervalo estrecho, ejecuciones dispersas un intervalo amplio. La semilla está escrita en `trysquare.toml`, por lo que los límites se recalculan de forma idéntica.

Leer una diferencia equivale entonces a hacer una sola pregunta: **¿contiene este intervalo el cero?** Si no lo contiene, la diferencia se marca con `*` y está **establecida**. Si lo contiene, se marca con `o` y **no es concluyente**, independientemente del valor central.

Ambos casos están en la matriz. Los +35 puntos anteriores vienen con un intervalo de +10 a +60, por lo que la ganancia es ciertamente positiva sin que se pueda decir si vale diez puntos o sesenta. La configuración `+well_crafted` muestra +17 puntos bajo este mismo criterio, pero su intervalo contiene el cero: estas ejecuciones siguen siendo compatibles tanto con una palanca que ayuda como con una que perjudica.

Las `o` se muestran igualmente en las tablas, con un recordatorio debajo de cada una: ninguna conclusión puede basarse en una diferencia marcada con `o`.

El número de repeticiones sigue siendo un parámetro, ya que la elección correcta depende de lo que busques. **Tres bastan para ver la dispersión**, que es el objetivo en el aula. **Desempatar dos palancas cercanas requiere mucho más**, y las columnas que cuentan los éxitos son las que más consumen: un 2/3 frente a un 3/3 no significa casi nada, mientras que un 8/20 frente a un 20/20 es defendible. Las tablas publicadas más abajo tienen veinte repeticiones por esta razón.

::: info Ejercicio (en el aula, luego en autonomía)
Empieza por el plan completo, que no consume nada:

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

La configuración se toma del `trysquare.toml` más cercano, es decir, el de `scripts/trysquare-campaign/` siempre que lances la ejecución desde este directorio.

Luego lanza la matriz a tres repeticiones y deja que se ejecute mientras discutes los parámetros:

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

Los subcomandos que no consumen nada se ejecutan directamente y sirven a posteriori:

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**En autonomía**, copia `scenarios/issue1-contexte.toml`, cambia una configuración y vuelve a lanzar. No habrás tocado ni la herramienta, ni el validador, ni las otras configuraciones, y es el único artefacto de este módulo que no caducará.
:::

#### Nuestras mediciones

Te habrás dado cuenta durante tus primeras pruebas con `trysquare`: realizar mediciones lleva tiempo. Para unas veinte repeticiones, necesitarás entre 2 y 3 horas para obtener todos los resultados junto con los del siguiente módulo. Por eso, hemos preferido darte una campaña completa realizada previamente en la que puedes navegar por los directorios de cada ejecución, tal como hiciste anteriormente.

Esto es lo que hemos obtenido en agosto de 2026, en `ilaas` y `gemma-4-31b`, frente al commit `d62ccd1f` de NÉON, con **veinte repeticiones por configuración**. Las dos configuraciones de competencia figuran en el archivo y pertenecen al siguiente módulo; están excluidas de las tablas a continuación, a excepción de una observación al final.

| configuración                    | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

Y las columnas de la sonda, el criterio al principio:

| configuración                    | bloques   | ángulos    | salida    | vecinas  | travesía |
| -------------------------------- | --------- | --------- | --------- | --------- | --------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

Los denominadores de `+well_crafted` y `+thinking` son 18 y 19 en las columnas de coste, porque ILaaS devolvió `Request timed out` durante la medición y las ejecuciones correspondientes no produjeron nada digno de anotar.

Extraemos cinco conclusiones de estas dos tablas, y la última servirá de transición al siguiente módulo. Todas las desviaciones citadas más abajo provienen de los intervalos descritos anteriormente, con la misma marca `*` para una desviación establecida y `o` para una desviación no concluyente. Las comparaciones que no se realizan frente a `nothing` se obtienen volviendo a ejecutar el cálculo frente a otra referencia, lo que no supone coste alguno ni requiere nuevas mediciones. La columna del veredicto se basa únicamente en la métrica declarada por `[verdict].criterion`; leer una desviación en otra columna requiere cambiar esta línea del escenario antes de ejecutar:

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

La salida va en un `synthesis_ref-<référence>.md` junto a la síntesis habitual, que no se ve afectada.

**El prompt delimitado hace que se realice todo lo que indica el ticket, y nada más.** `tests_ajoutes` pasa de 0/20 a 17/20 y `rebond_angles` de 0/20 a 14/20, dos columnas que estaban vacías y que se completan. Sin embargo, el prompt no dice nada sobre el mecanismo de rebote: indica el problema, el perímetro y el criterio de parada, y es `ISSUES.md` el que describe la esquina, la salida del rectángulo, la costura de la cuadrícula y el tunneling. La esquina permanece en **0/20 en las cuatro configuraciones que no delimitan el ticket**, es decir, ochenta ejecuciones consecutivas. Apuntar a un documento escrito basta para que sea leído, y es el contenido de ese documento el que decide qué se procesará.

**El archivo de reglas solo desplaza el procedimiento, y deja de desplazar cualquier cosa en cuanto el ticket es correcto.** `+agents` hace que `suite_lancee` pase de 0/20 a 20/20, porque una de sus cuatro líneas indica el comando. En el criterio da 9/20 frente a 11/20 en la base, una diferencia no concluyente, y en `tests_ajoutes` se mantiene en 0/20 ya que ninguna de sus líneas menciona las pruebas. Sumado al prompt delimitado, no aporta **absolutamente nada**: 11/20 frente a 13/20 en el criterio, 12/20 frente a 14/20 en la esquina, 17/20 frente a 17/20 en las pruebas añadidas; ninguna de estas tres diferencias es distinguible de cero. El archivo de reglas es un sustituto de un buen ticket más que un complemento, lo que da como resultado una regla de escritura directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todos modos es una línea que debe eliminarse.

**El razonamiento desplaza el criterio, y es el único que no hace que se lea el ticket.** `+thinking` da 16/20 en `rebond_briques`, es decir, una diferencia de +29 puntos cuyo intervalo excluye el cero. Es la única palanca de la matriz, aparte de las que afectan al ticket, para desplazar la corrección en sí misma. Su columna de la esquina permanece en 0/20 y sus pruebas añadidas en 3/20: el razonamiento mejora lo que el modelo hace con lo que tiene delante, pero no le lleva a buscar lo que le falta.

**El prompt estructurado hace que se escriban los tests rojos, y una de cada cinco ejecuciones se detiene ahí.** La columna `touched` lo dice sin ambigüedad: en `+well_crafted` y `+agents+well_crafted`, cuatro de cada veinte ejecuciones nunca abren `game/neon.js`, de las cuales dos o tres escriben únicamente en `game/neon.test.js` y una o dos no entregan nada. Ninguna otra configuración muestra este comportamiento; `nothing`, `+agents` y `-system_prompt` tocan la fuente en veinte de cada veinte ejecuciones. La explicación está en el ticket, que enumera cinco subcasos y termina con « each case above added **first as a red test**, then green »: `gemma-4-31b` escribe los rojos y se detiene ahí, al no poder procesar la especificación completa. Es también por eso que el criterio de corrección no sube mientras que el rincón sí: el modelo tiene un presupuesto de trabajo, y describir más trabajo en el ticket no lo amplía.

**Proporcionar los tests repara esta caída.** La configuración `+agents+add_tests+well_crafted` se compara con `+agents+well_crafted`, la única de la que difiere solo por la sonda depositada en el árbol:

| columna           | `+agents+well_crafted` | `+add_tests` | diferencia            |
| ----------------- | ---------------------- | ------------ | ---------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | sin objeto             | **20/20**    |                        |

Las cuatro columnas de la corrección suben, y las cuatro diferencias están establecidas. Por lo tanto, la palanca no solo gana casos límite, sino que también recupera el criterio mismo. Fíjate en la anchura de los intervalos, y en particular en el del rincón que comienza en un solo punto: estas diferencias están establecidas en el sentido de que son positivas, sin que se pueda dar su tamaño con una precisión mejor que un factor de cincuenta.

`sonde_intacte` vale 20/20, lo que significa que el modelo no ha intentado cambiar los tests de referencia. Y `tests_ajoutes` no cambia, lo cual es coherente con un agente que ya tiene los casos delante y no tiene razón alguna para reescribirlos.

::: warning Ninguna columna de coste de gemma es citable aquí
La matriz cuenta con 1 151 reintentos, es decir, turnos reiniciados porque el proveedor había fallado, y el recuadro de abajo muestra hasta qué punto están concentrados en las configuraciones más pesadas. Un reintento vuelve a ejecutar el turno con todo el contexto acumulado, por lo que infla las columnas de coste y, sobre todo, vuelve a dirigir al agente.

El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` cuenta con **37**, lo que hace que las suyas sean legibles:

| configuración                    | turnos | duración |
| -------------------------------- | ------ | -------- |
| `nothing`                        | 19     | 163 s    |
| `+agents`                        | 12     | 65 s     |
| `-system_prompt`                 | 17     | 142 s    |
| `+well_crafted`                  | 15     | 252 s    |
| `+thinking`                      | 19     | 490 s    |
| `+agents+well_crafted`           | 14     | 561 s    |
| `+agents+add_tests+well_crafted` | 13     | 410 s    |

Los tokens de entrada de las dos matrices no se colocan en la misma tabla, por una razón que no tiene nada que ver con el modelo: ILaaS no reporta ningún caché, siendo `cacheRead` igual a cero en sus ciento ochenta ejecuciones, por lo que su columna de entrada es la suma de los prefijos completos releídos en cada turno. opencode Zen reporta el caché, hasta cinco millones de tokens leídos en una sola ejecución. La misma configuración muestra, por tanto, 558 000 tokens de entrada por un lado y 15 000 por el otro, sin que ninguno de los dos sea incorrecto. Es la parte práctica de lo que la primera parte de este módulo explica sobre el caché: el coste de las entradas depende de la configuración del proveedor del modelo y la activación del caché permite reducir drásticamente la factura.
:::

#### Tres verificaciones antes de citar una tabla

Una matriz publica tablas, intervalos y veredictos, lo que puede dar la impresión de conclusiones sólidas. No obstante, durante la elaboración de esta formación, nos hemos enfrentado a varios fenómenos que pueden desacreditar algunos resultados.

::: warning El recuento de reintentos
Un reintento es un turno que la herramienta tuvo que relanzar porque el proveedor había fallado. Vuelve a ejecutar este turno con todo el contexto acumulado, por lo que infla las columnas de coste y, sobre todo, vuelve a pilotar al agente: ya no es la misma dinámica de trabajo.

En la matriz `gemma-4-31b`, el recuento es de **1 151**, y no está distribuido:

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

Nada en las configuraciones de contexto corto, todo en aquellas de razonamiento elevado, y más aún a medida que el contexto acumulado crece: una sola ejecución de `+agents+add_tests+well_crafted` consumió 2,4 millones de tokens de entrada en sesenta y tres turnos y acumuló dieciocho reintentos. El mismo escenario medido en `opencode-go` y `deepseek-v4-flash` cuenta con **treinta y siete** en total.
:::

::: warning La importancia del test de validación
Una columna uniformemente negra se parece a un comportamiento del agente y puede ser un defecto del validador. La única forma de distinguirlos es que la métrica diga **por qué** ha respondido falso, y no solo que ha respondido falso.

Nuestro validador lo hace para `suite_lancee`: cuando no reconoce ningún lanzamiento de la suite, copia en su razón todos los comandos que el agente ha pasado. Esta precaución es importante, porque la forma del comando varía de un modelo a otro mucho más que el comando en sí. `deepseek-v4-flash` prefija cada llamada al directorio de trabajo (`cd .../repo && npm test`, 664 veces en la matriz) y redirige la salida con gusto (`npm test 2>&1 | tail -30`, 80 veces), mientras que `gemma-4-31b` escribe `npm test` a secas. Un test de validación que solo conociera la última forma calificaría al primer modelo con cero en toda la matriz.

En conclusión, **escribe tus métricas con precaución y pruébalas en un conjunto de tests**. Deben ser fiables. Anota cualquier comportamiento extraño antes de sacar conclusiones precipitadas.
:::

::: warning Lo que la comparación de los dos modelos permite decir, y lo que no
Las dos matrices (`gemma-4-31b` y `deepseek-v4-flash`) tratan sobre el mismo escenario, las mismas nueve configuraciones y el mismo commit de NÉON, de modo que sus columnas de puntuación se leen una frente a la otra. El modelo y el proveedor han cambiado a la vez, lo que impide atribuir una diferencia a uno más que al otro, y aun así permite ver esto en la columna de la esquina:

| configuración          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Los dos modelos reaccionan a la misma palanca y en el mismo sentido, partiendo el más capaz desde más arriba y subiendo más alto.
:::

Estos números no están destinados a ser tomados al pie de la letra ni a ser copiados dentro de un año. Vuelve a ejecutar la matriz: es precisamente para eso que sirve, y la que obtengas reemplazará a esta.

Un contexto bien mantenido hace que el agente sea disciplinado y completo en lo que el ticket nombra, sin hacerlo exhaustivo: la esquina del ladrillo nunca se alcanza donde el ticket no la describe, y el tunneling sigue siendo la columna más baja de todas las que mide la sonda. Ir más allá de lo que contiene el material escrito requerirá un revisor independiente y un bucle de verificación, que es el tema de los módulos sobre la delegación y los workflows.

::: warning Tres conclusiones tentadoras que los intervalos no permiten
Cada una de las siguientes frases se basa en una cifra exacta de la campaña publicada en esta página, y ninguna se sostiene.

**« El archivo de reglas rompe la corrección. »** `+agents` da 9/20 en el criterio frente a 11/20 en la base. La diferencia es de -10 puntos, pero su intervalo contiene el cero: no podemos concluir nada, ni en un sentido ni en el otro.

**« Eliminar el system prompt mejora el rebote. »** `-system_prompt` da 14/20 frente a 11/20, es decir, +15 puntos, y el intervalo también contiene el cero aquí. Con solo tres ejecuciones bien seleccionadas, habríamos obtenido 3/3 frente a 1/3 y habríamos podido creerlo durante mucho tiempo.

**« El prompt estructurado corrige mejor el bug. »** `+well_crafted` da +17 puntos en el criterio, no concluyente. El efecto real de esta palanca se ve en otro lugar, en los tests añadidos y en el coin, donde las diferencias se cuentan por decenas de puntos y no dejan lugar a dudas.

Repetir tres veces no es suficiente: un efecto que no supera la dispersión de su propia configuración no es un efecto. Y un efecto establecido en esta tarea, con este ticket y este modelo, solo está establecido en este marco.
:::

Acabas de realizar una evaluación, en el sentido de que se comparan comportamientos en una misma tarea, con repeticiones y sabiendo que la medición es ruidosa, mientras que un test responde sí o no a una pregunta cerrada. El módulo 3.2 formalizará esta práctica con archivos de evaluación y un LLM-juez, para los criterios que la sonda de este módulo no habría podido gestionar.

### La pila contra la base

Las palancas de este módulo requieren atención y tiempo, mientras que un modelo más capaz se obtiene simplemente pagando más. Por lo tanto, es legítimo preguntarse si es más rentable cuidar el contexto o cambiar de modelo. La segunda mitad de esta pregunta no se mide aquí, y explicamos más abajo por qué. La primera sí se mide, con el modelo constante, enfrentando las dos configuraciones extremas de la matriz.

::: info Ejercicio (en clase)
Compara la configuración `nothing`, que recibe una petición de una línea y nada más, y la configuración `+agents+add_tests+well_crafted`, que dispone del razonamiento, del ticket estructurado, del `AGENTS.md` y de la sonda depositada en el árbol. Mira primero los diffs, luego las columnas de la sonda y solo al final cuánto ha costado cada una.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, diferencia +35 puntos   |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| turnos medianos    | 19        | 13                               |
| duración mediana   | 163 s     | 410 s                            |

Las dos últimas líneas se han tomado de la matriz `deepseek-v4-flash`, cuyos treinta y siete reintentos hacen que las columnas de coste sean legibles, y las columnas de puntuación de `gemma-4-31b`.

El harness completo alcanza dieciocho sobre veinte en un criterio donde la base tiene un techo de once, y la columna más severa de la sonda pasa de 7/20 a 18/20. Es la tesis de Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, verificada en su mitad más fácil de establecer: con un modelo rigurosamente constante, el harness por sí solo marca la diferencia entre una corrección que funciona una de cada dos veces y una corrección que funciona nueve de cada diez.

El caso límite pasa de 0/20 a 18/20, y el prompt estructurado por sí solo ya obtenía catorce: la mayor parte de la ganancia se debe a que el prompt hace referencia a un ticket en `ISSUES.md` que nombra el caso, y la sonda añade la perseverancia que faltaba para terminar el trabajo.

### Lo que este módulo no sabe obtener

La única palanca que ha llevado al modelo a tratar todo lo que solicita el ticket es aquella que le ha puesto los tests delante. Sin embargo, esta configuración tiene algo de artificial: los casos límite estaban escritos de antemano por nosotros, en el mismo archivo que registra. En un ticket real, nadie te los proporcionará.

Lo que esta configuración aporta en realidad es perseverancia. El modelo pierde el hilo en un ticket largo porque agota su presupuesto formulando los casos en lugar de corregirlos; recibir los casos ya formulados le devuelve ese presupuesto. La pregunta del siguiente módulo es, por tanto, si una **competencia**, es decir, un procedimiento de trabajo escrito una vez y recargado bajo demanda, puede producir la misma perseverancia sin proporcionar los tests.


## Generalizar

Ocho principios de este módulo siguen siendo válidos más allá de Pi, de `ilaas` y de la versión de los paquetes que acabas de instalar.

**Lo que es estable delante, lo que varía detrás.** El caché solo funciona sobre un prefijo invariable y cuesta cincuenta veces menos que la entrada, por lo que cualquier dato volátil colocado temprano en el contexto, ya sea una marca de tiempo, un estado de git o una fecha, invalida todo lo siguiente.

**Apuntar a un documento escrito es suficiente para que sea leído, y lo que está escrito en él decide el resultado.** Nuestro ticket definido no describe el mecanismo de rebote: nombra la issue, el perímetro y el criterio de parada. Diecisiete de cada veinte ejecuciones han ido a leer `ISSUES.md`, han encontrado la solicitud de casos límite en tests rojos y la han ejecutado, mientras que la solicitud omitida no ha obtenido ninguna. El caso del "coin de la brique" ofrece la versión más clara: está descrito en `ISSUES.md` y en ninguno de nuestros prompts, y obtiene un 0/20 en las cuatro configuraciones que no nombran la issue, frente a un 14/20 en la que sí la nombra. Escribe lo que esperas en un documento al que puedas apuntar, y vuelve a leer este documento antes de concluir cualquier cosa sobre el agente.

**Un modelo tiene un presupuesto, y describir más trabajo no lo amplía.** Nuestro ticket enumera cinco subcasos y solicita un test rojo para cada uno; cuatro de cada veinte ejecuciones escriben estos tests rojos y nunca abren el archivo fuente. Esta constatación condiciona lo siguiente: o reduces la solicitud a lo que el modelo puede soportar, o le das los medios para mantener la distancia, que es el tema del siguiente módulo.

El archivo de reglas cambia lo que el agente hace y no lo que encuentra, y solo sirve para aquello que el ticket no especifica. Entra en el contexto en cada turno, lo que lo convierte en una palanca potente y costosa a la vez, de ahí el interés de mantenerlo corto, basar cada regla en un fallo observado y refactorizarlo en lugar de alargarlo. Nuestras mediciones encuadran precisamente lo que aporta: la configuración `+agents` hace pasar de 0/20 a 20/20 el número de ejecuciones que lanzan la suite de pruebas, deja el criterio de corrección sin cambios y no aporta nada más en cuanto el prompt encuadrado está presente. La regla de escritura que se deriva es directamente aplicable al presupuesto de cuarenta líneas: una línea que un ticket correcto diría de todas formas es una línea que hay que eliminar.

**Un ajuste expuesto por el harness no es necesariamente transmitido al modelo.** Entre la bandera que escribes y la solicitud que se envía hay código y tablas de correspondencia, como muestra `--thinking max`, que no llega al modelo que utilizamos sin que nada te lo advierta. El corolario en cuanto a la medición es que lo que decide la experiencia debe estar escrito en la experiencia: un nivel de razonamiento heredado de una configuración personal hizo que una de nuestras configuraciones fuera idéntica a su base en todas las matrices publicadas.

**Un efecto que no sobrevive al remuestreo no es un efecto.** Repetir tres veces no es suficiente: mientras el intervalo de una desviación contenga el cero, no hay nada que decir al respecto. De las nueve configuraciones medidas aquí, solo tres desplazan el criterio de corrección de forma establecida, mientras que las otras seis muestran cada una una cifra que podría parecer convincente. Una desviación establecida solo lo es, además, en esta tarea, con este ticket y este modelo.

**Lo que se mide debe estar anclado a lo que no cambia.** Un tag es un nombre, y `git tag -f` lo desplaza sin dejar rastro en la medición, de modo que dos matrices pueden declarar el mismo patrón y haber trabajado en dos versiones diferentes del código. Ancla mediante el commit, que no cambia, y si tu herramienta aún no lo permite, archiva al menos a qué resolvía el nombre en el momento de la medición.

**Una métrica debe decir por qué, y no solo qué.** Una columna uniformemente negra se parece al comportamiento del agente y puede ser un defecto del validador, y nada distingue a ambos mientras la métrica se limite a responder verdadero o falso. Haz que escriba sobre qué se ha pronunciado: la nuestra copia, debajo de cada falso, los comandos que el agente ejecutó, y eso es lo que permite verificar un cero en lugar de creerlo ciegamente.

**Escribe la hipótesis antes de medir, y crea versiones de ella.** Una hipótesis redactada después de las mediciones no es más que una conclusión disfrazada. La nuestra, `hypotheses/issue1-contexte.md`, contiene una predicción que resultó ser falsa, y es porque estaba escrita de antemano que la publicamos como tal en lugar de reformularla a posteriori como un descubrimiento.

## Entregable

Este módulo produce tres piezas: las dos primeras sirven durante todo el día, la tercera servirá para el acto 4.

**1. El `AGENTS.md` de NÉON**, versionado en el repositorio, con menos de 40 líneas, cada regla justificada por un fallo que hayas observado.

**2. El directorio de matriz** producido por `trysquare run`, con su línea de registro. El entregable no es una tabla copiada, sino el archivo que permite reconstruirla: las mediciones brutas, las sesiones, los diffs y la revisión de la herramienta que midió. Sin este archivo, la matriz no puede ser verificada ni calificada de nuevo, y sus cifras no valen más que una opinión.

**3. La ficha de decisión**, una línea por palanca:

| palanca                     | efecto medido | ¿adoptado? | por qué |
| -------------------------- | ------------ | -------- | -------- |
| elección del modelo            |              |          |          |
| esfuerzo de razonamiento     |              |          |          |
| ticket delimitado               |              |          |          |
| contenido del ticket señalado   |              |          |          |
| `AGENTS.md`                |              |          |          |
| system prompt             |              |          |          |
| tests proporcionados de antemano     |              |          |          |
| planificación / caché     |              |          |          |
| compactación                 |              |          |          |
| criterio ejecutable (sonda) |              |          |          |

Se han añadido dos líneas a esta ficha después de nuestras últimas mediciones. « Contenido del ticket referenciado » figura en ella porque la reescritura de `ISSUES.md` ha desplazado más columnas que cualquier ajuste del harness, y « tests proporcionados de antemano » porque es la única palanca que ha compensado la caída de rendimiento del modelo en un ticket largo.

Esta ficha constituye el primer llenado real de la columna « ¿tu harness? » de la tabla de correspondencia, para la fila « contexto ». Los cinco módulos siguientes harán lo mismo para su bloque, de modo que abordarás el capstone con una tabla ya completada por tus experiencias.

::: tip Criterio de éxito
Sabes citar una palanca que hayas medido como sin efecto en NÉON, y decir en qué condición precisa tendría uno en otro lugar.

Nuestro ejemplo es `AGENTS.md`: no desplaza ni un punto el criterio de corrección, y se volvería decisivo en un ticket cuyo fallo habitual sea de procedimiento más que de razonamiento, o en un repositorio cuyos tickets estén mal escritos. El tuyo será diferente, y ese es el objetivo. Este criterio requiere haber visto las cifras y haber comprendido que son la tarea y su material los que las determinan. Por lo tanto, no puede satisfacerse de memoria.
:::

## Las trampas

**Concluir a partir de una sola ejecución**, que sigue siendo la trampa principal y más costosa, ya que produce convicciones duraderas basadas en ruido.

**Inyectar contenido volátil en la zona cacheable.** Una fecha, un `git status` o una marca de tiempo colocada temprano en el contexto invalida todo el caché posterior, y te hace pagar caro un ahorro que creías haber conseguido.

**Olvidar tu `AGENTS.md` personal**, cargado además del del proyecto, invisible en la interfaz, y que falsea todas tus mediciones mientras no uses `-nc`.

**Creer ciegamente en un flag**, cuando `--thinking max` puede no tener ningún efecto sin que Pi te lo advierta.

**Tomar la ausencia de saturación como una ausencia de problema.** En una ventana cómoda nada se desborda jamás, lo que solo significa que la señal de alarma no sonará y que el costo será tu único indicador.

**Juzgar por un patrón cuando se puede juzgar por un comportamiento.** Buscar en un diff si se parece a la solución esperada responde a una pregunta distinta a « ¿resuelve este diff el problema? », y es en esa brecha donde se esconden los falsos positivos. Busca la forma ejecutable antes de resignarte al patrón, y luego al juez.

**No contar los reintentos.** Una matriz medida mientras el proveedor falla y reinicia no mide la configuración, aunque dé una apariencia completa: tablas, intervalos, veredictos. El recuento de reintentos debe, por tanto, leerse como una columna de resultado independiente.

**Creer en una columna uniformemente negra.** Cero en todas las configuraciones parece un comportamiento del modelo y puede ser un comparador demasiado estricto, como aquel que rechazaba `cd /tmp/x && npm test` porque solo conocía `npm test`. Verifica la razón asociada a un falso antes de sacar una conclusión.

**Confiar en un tag.** Se mueve, y nada en una tabla lo indicará. La única forma de saberlo a posteriori es el commit archivado por ejecución, y la única forma de evitarlo es anclarlo mediante ese commit.

**Comparar costes entre dos proveedores.** No cuentan lo mismo: uno informa sobre la caché y el otro no, de modo que la columna « entrada » de uno es la suma de los prefijos completos y la del otro es la parte que no estaba ya en caché. La relación entre los dos no significa nada.

## Para ir más lejos

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), el estudio que justifica que no baste con rellenar la ventana.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sobre el desplazamiento del prompt aislado hacia la arquitectura del contexto.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), cuya tesis es la que la comparación de la pila pone a prueba desde la base.
- [La documentación de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), y en particular sus páginas sobre la compactación, los modelos y los ajustes.
- [trysquare](https://github.com/AI-for-dev/trysquare), la herramienta de medición utilizada en este módulo, y su guía de escritura de escenarios.
- La campaña trysquare de la formación, `scripts/trysquare-campaign/`, con sus hipótesis escritas antes de la medición y sus matrices archivadas. Es el único lugar donde las cifras de esta página son verificables.
