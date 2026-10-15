# El contexto y la ventana principal

::: tip Objetivos de este módulo
- Saber decir qué hay realmente en la ventana de contexto, y cuánto cuesta cada parte
- Manipular las palancas que la llenan: modelo, esfuerzo de razonamiento, prompt, `AGENTS.md`, system prompt, `codemode`
- Saber construir y hacer evolucionar tu `AGENTS.md`
:::

La gestión del contexto es el bloque del que dependen todas las demás, ya que un subagente sirve para no contaminar el contexto principal, una memoria para no llenarlo con lo que se podría volver a encontrar, y un permiso para no volcar en él un archivo que no se debería haber leído. Por lo tanto, hay que empezar por saber qué contiene la ventana y cómo se alimenta a lo largo del tiempo. Los módulos siguientes presentarán herramientas que intervendrán en el proceso de llenado del contexto.

Procedemos en el orden habitual: entender qué hay en la ventana, reconstruir las palancas que la llenan y luego extraer lo que sigue siendo cierto cuando la herramienta cambia.

::: info Una convención de lectura
Cada manipulación está marcada como **en sala** o **en autonomía**. El recorrido en sala está pensado para caber en la sesión y para bastar para entender los retos del módulo. Las manipulaciones en autonomía profundizan y están escritas para rehacerlas a solas, más tarde, en tu propio repositorio.
:::

## Comprender

### Cinco fuentes, una sola ventana

Cuando escribes una pregunta en Pi, el modelo recibe una pila en la que tu pregunta es solo una línea:

1. el **system prompt**, que describe al modelo su rol, sus herramientas y sus convenciones ;
2. los **archivos de contexto**, `AGENTS.md` y `CLAUDE.md`, cargados desde tu directorio personal, luego desde cada directorio padre hacia arriba, y por último desde el directorio actual ;
3. las **descripciones de las herramientas**, en JSON, una por herramienta disponible ;
4. **tu pregunta** ;
5. y, a medida que el bucle gira, el **historial**, es decir, cada respuesta del modelo, incluida la fase de razonamiento, cada llamada de herramienta y cada salida de herramienta.

Las cuatro primeras fuentes son estables de un turno a otro, mientras que la quinta crece en cada turno, lo que casi siempre la convierte en la responsable de los desbordamientos.

::: info Ejercicio (en el aula)
Abre una sesión, plantea una pregunta cualquiera y luego exporta la sesión con `/export`. Abre el archivo HTML generado y lee el system prompt de Pi completo, algo que la mayoría de los agentes de código no te permiten ver.

Identifica en él lo que describe **capacidades** y lo que describe **convenciones**: más adelante mediremos el peso real de cada una de las dos categorías.
:::

En una consulta tan trivial como «di solo OK», sin archivo de contexto, sin skill y sin extensión, la entrada pesa **1660 tokens**, y baja a **1110** si se reemplaza el system prompt de Pi por tres líneas. El system prompt de Pi cuesta por tanto unos **550 tokens**, lo cual es poco en comparación con lo que las salidas de herramientas y el historial añadirán después. Lo esencial de lo que llena una ventana de contexto no proviene del harness, sino de lo que tú y el agente vierten en ella a lo largo de la sesión.

### ¿Cuánto cuesta usar un LLM?

Una llamada al modelo se factura en tres partidas, expresadas por millón de tokens. Estas son las tarifas de los dos modelos publicados por [opencode Zen](https://opencode.ai/docs/zen/):

| modelo                | entrada | salida | lectura de caché |
| --------------------- | ------- | ------ | ---------------- |
| `deepseek-v4.1-flash` | 0,30 $  | 1,20 $ | 0,006 $          |
| `deepseek-v4-pro`     | 1,74 $  | 3,48 $ | 0,145 $          |

La oferta [opencode Go](https://opencode.ai/docs/go/), que utilizan los ejercicios de este módulo, factura estos mismos modelos a una tarifa que varía según la hora, más baja en horas valle que en horas punta. ILaaS, por su parte, no factura nada a los participantes de esta formación. Así que ahí contarás tokens en lugar de euros. Ambos se leen de la misma forma, pero un contador de tokens no te avisa cuando gastas.

De ahí se desprenden dos diferencias. La primera separa los dos modelos, ya que el `pro` cuesta 5,8 veces más que el `flash` en entrada y 2,9 veces más en salida. Es una primera forma de darse cuenta de que un modelo tiene más capacidades que otro. La segunda diferencia separa la entrada de la lectura de caché: un factor **50** en `flash` y **12** en `pro`.

Esta segunda diferencia es lo que hace económicamente viable a un agente de código, porque un agente relee su historial completo en cada turno y, de otro modo, pagaría veinte veces el precio de su contexto a lo largo de una sesión de veinte turnos.

::: warning Un proveedor que reporta el caché
La secuencia del ejercicio siguiente se midió en [opencode Go](https://opencode.ai/docs/zen/). Es una oferta de pago que requiere una cuenta. La elegimos porque ILaaS no reporta la lectura de caché: `cacheRead` siempre vale cero.

Si trabajas en ILaaS, reemplaza `--provider opencode-go --model deepseek-v4.1-flash` por `--provider ilaas --model gemma-4-31b`, y el modelo `pro` por `qwen-3.8-27b`. Verás bien los tokens de entrada y el efecto del cambio de modelo, pero la columna de lectura de caché seguirá vacía. Haz lo mismo para el ejercicio sobre `codemode`, más adelante.
:::

::: info Ejercicio (en sala)
En una sesión interactiva, encadena cinco preguntas sobre un mismo archivo tecleando `/session` después de cada una, y cambia de modelo con `/model` antes de la cuarta. Las preguntas deben prohibir explícitamente cualquier relectura de archivo; de lo contrario, una nueva salida de herramienta se añadirá al contexto y enturbiará la lectura.

Esta es la secuencia exacta que hemos medido, aquí en modo no interactivo para que sea reproducible tal cual. La opción `-c` continúa la sesión anterior, y los acentos se omiten en los comandos sin incidencia sobre el resultado:

```bash
git clone https://github.com/AI-for-dev/neon
cd neon

pi -p --provider opencode-go --model deepseek-v4.1-flash -nc -ns -np -ne \
  "Lis game/theme.js et dis en une phrase ce que fait ce fichier."

pi -p -c --provider opencode-go --model deepseek-v4.1-flash -nc -ns -np -ne \
  "En une phrase, cite une couleur qui y est definie. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4.1-flash -nc -ns -np -ne \
  "En une phrase, combien de couleurs au total ? Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, confirme ce nombre. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, redis ce nombre. Ne relis aucun fichier."
```

Estos cinco turnos producen siete llamadas al modelo, porque el primero consume tres: el modelo busca primero el archivo con `bash`, lo lee y responde una vez que ha llegado la salida de la herramienta. De las diez pasadas que hicimos, siete siguieron este camino y tres leyeron el archivo directamente, en dos llamadas.

Medimos esta secuencia el 15 de octubre de 2026 y calculamos los costes con las tarifas Zen de la tabla anterior:

| llamada | turno | prompt                      | modelo  | entrada | salida | lectura de caché | coste          |
| ------- | ----- | --------------------------- | ------- | ------- | ------ | ---------------- | -------------- |
| 1       | 1     | « Lee `game/theme.js`... »  | `flash` | 1 718   | 92     | 0                | 0,000626 $     |
| 2       | 1     | (lectura del archivo)       | `flash` | 621     | 138    | 1 664            | 0,000362 $     |
| 3       | 1     | (respuesta)                 | `flash` | 472     | 70     | 2 176            | 0,000239 $     |
| 4       | 2     | « cita un color... »        | `flash` | 182     | 53     | 2 560            | 0,000134 $     |
| 5       | 3     | « cuántos colores... »      | `flash` | 130     | 82     | 2 688            | 0,000154 $     |
| 6       | 4     | « confirma este número... » | `pro`   | 2 995   | 41     | **0**            | **0,005354 $** |
| 7       | 5     | « repite este número... »   | `pro`   | 111     | 17     | 2 944            | 0,000679 $     |

La caché se activa desde la segunda llamada, incluso dentro de un mismo turno, y los turnos 2 y 3 cuestan entre cuatro y cinco veces menos que la primera llamada. El cambio de modelo en el cuarto turno devuelve la lectura de caché a cero y hace pagar de nuevo todo el prefijo a tarifa completa: ese solo turno cuesta ocho veces más que el siguiente, con el mismo modelo.

Si vuelves a lanzar la secuencia en los minutos siguientes desde el mismo directorio, la primera llamada ya leerá 1 664 tokens de caché, porque el proveedor conserva el prefijo de una sesión a otra.
:::

::: warning Si `pi -p` se queda congelado sin mostrar nada
Desde un script, redirige la entrada estándar con `< /dev/null`. En modo no interactivo, `pi` espera en su entrada estándar mientras esta permanezca abierta, lo que bloquea indefinidamente cuando se le llama desde un script bash, por ejemplo.
:::

El caché solo funciona sobre un **prefijo sin cambios**, de lo que se desprende la regla de ordenación del contexto: todo lo que varía debe colocarse después de lo que es estable. Una marca de tiempo o un `git status` insertado en el system prompt invalida todo lo que sigue, incluyendo herramientas, pregunta e historial, y te hace volver a pagar la tarifa completa en cada turno, mientras que el mismo dato colocado en el mensaje del turno actual no cuesta nada, porque ya se encuentra en la zona variable.

Ten también en cuenta que cambiar de modelo a mitad de sesión no es gratis, algo que conviene tener presente cada vez que cambies de un modelo a otro con `/model`.

## Reconstruir

### La tarea

Todas las manipulaciones de este módulo giran en torno a la misma tarea, el **issue #1** de NÉON: la bola atraviesa los ladrillos en lugar de rebotar.

El ticket se describe en `ISSUES.md`, en la raíz del [repositorio NÉON](https://github.com/AI-for-dev/neon): la bola atraviesa los ladrillos, y el ticket detalla los comportamientos esperados tras la corrección. Podríamos dárselo directamente al agente, pero no lo haremos por ahora: queremos ver primero cómo se comporta según el prompt que le proporcionamos y el marco que lo rodea.

Este ticket tiene varias sutilezas difíciles de encontrar para un agente solo. Verá rápidamente el problema y propondrá calcular la distancia de la bola a los lados del ladrillo, para invertir, según el lado tocado, una de las dos velocidades. El caso de la esquina, raro pero real, y el de una velocidad lo bastante alta para que la bola cruce el ladrillo sin superponerse nunca a él, tienen en cambio muy pocas posibilidades de ser tratados.

Además de la corrección del bug, queremos empezar a definir un marco y verificar que el agente no se salga de él. Este marco se resume en tres reglas:

- El agente solo puede modificar `game/neon.js` y `game/neon.test.js` y nada más.
- El agente debe lanzar los tests para comprobar que no ha roto nada.
- El agente debe añadir tests si la cobertura no es buena. Es nuestro caso aquí: no hay tests que verifiquen el comportamiento de la bola con el ladrillo.

La primera restricción es demasiado fuerte en un marco general. La idea aquí es sobre todo ver cómo se comporta el modelo y si respeta esta restricción escrita.

Este módulo te hace manipular las palancas a mano, en una o dos ejecuciones, para ver qué cambia cada una en la sesión y en el diff.

### Los controles, a mano

#### El modelo

::: info Ejercicio (en clase)
Lanza la misma solicitud en dos modelos de tamaños diferentes, el que usas habitualmente y el más grande al que tienes acceso. La solicitud es voluntariamente mínima, es la que se escribe naturalmente el primer día. La llamaremos «solicitud descuidada» en el resto de este módulo:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Asegúrate de crear previamente dos clones separados:

```bash
git clone --branch etalon-v1 https://github.com/AI-for-dev/neon neon-model-xxx
git clone --branch etalon-v1 https://github.com/AI-for-dev/neon neon-model-yyy
```

y luego trabaja en el directorio correspondiente al modelo probado.

Lee los dos diffs, luego los dos `/session`. Anota tus observaciones sin sacar conclusiones: dos ejecuciones no bastan para decidir entre dos modelos.
:::

#### El esfuerzo de razonamiento

`pi --help` anuncia siete niveles de razonamiento, de `off` a `max`. Es un control simple de manipular, y por eso resulta tentador empezar por él.

::: info Ejercicio (en clase)
Lanza la misma tarea con `--thinking minimal`, y luego con `--thinking max`, y compara los tokens de salida y la respuesta. No encontrarás ninguna diferencia, porque las dos banderas producen exactamente la misma solicitud si usas el modelo `gemma-4-31b`.

Para este modelo solo hay dos modos: el thinking `on` u `off`.

Rehaz la comparación entre dos niveles realmente distintos en tu modelo, por ejemplo `off` y `high`, y mide la diferencia.
:::

El razonamiento sí tiene un efecto cuando se mide entre dos niveles reales. La lección general se refiere más bien a la confianza que hay que dar a los ajustes: **un ajuste expuesto por el harness no necesariamente se transmite al modelo**, porque entre la configuración que escribes y la petición que sale hacia el servidor de inferencia hay una tabla de correspondencia escrita por alguien, que puede estar incompleta. Te encontrarás con esta situación varias veces en la formación, y con regularidad en tu trabajo. Acostúmbrate a buscar dónde aterriza una configuración o un flag antes de confiar en él.

### Lo que escribimos

#### `AGENTS.md`, el punto de configuración global

El archivo de reglas situado en la raíz del repositorio entra en el contexto en cada turno, lo que lo convierte en un buen candidato para definir el marco global de nuestro proyecto. Cuando el agente se equivoca, la reacción natural consiste en añadirle una frase, y luego otra. Cada línea añadida tiene, sin embargo, un coste, y cuanto más crece el archivo, menos ve el agente el conjunto; la mejora de los modelos volverá además obsoletas las líneas introducidas anteriormente. Este archivo exige por tanto un refactoring continuo, a lo largo de toda la vida del proyecto.

Establecemos para esta formación una restricción fuerte.

::: danger Presupuesto: 40 líneas
El `AGENTS.md` de NÉON nunca superará las 40 líneas, de principio a fin de la formación. Cada módulo que quiera añadirle una regla deberá primero retirar una, o reformular para que las dos quepan en una sola.

Esta restricción te obliga a hacer el trabajo de refactorización continua descrito más arriba: cada regla debe merecer su lugar, y un archivo corto tiene muchas más posibilidades de ser seguido de verdad que una guía de estilo larga.
:::

También podemos apoyarnos en otros archivos y decirlo en `AGENTS.md`, para que el agente los lea cuando sea necesario. Por ejemplo, podemos indicarle que las convenciones están en `CONTRIBUTING.md`, la arquitectura en `README.md` y el historial en git.

Con una petición descuidada, el agente por lo general no ejecuta la suite de pruebas ni añade ningún caso.

::: info Ejercicio (en aula)
Escribe el `AGENTS.md` de NÉON partiendo de tus propias ejecuciones: relee los diffs que acabas de producir y busca lo que el agente hizo sin que se lo pidieras, o lo que omitió aunque se lo pidieras. Haz que lance las pruebas cada vez que modifique el código y que añada alguna si no hay cobertura.

Aquí tienes la base de partida, para discutirla y enmendarla:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning Un `AGENTS.md` puede ocultar otro
Pi acumula estos archivos, empezando por tu `~/.pi/agent/AGENTS.md` personal, luego por cada directorio padre hacia arriba, y por último por el directorio actual. Un archivo de reglas personal se cuela así en todas tus mediciones sin que te enteres.

El flag `--no-context-files`, abreviado `-nc`, desactiva este descubrimiento, algo indispensable para medir con limpieza.
:::

#### El prompt de sistema

Pi permite reemplazar por completo su prompt de sistema con un `.pi/SYSTEM.md` en la raíz del proyecto o con un `~/.pi/agent/SYSTEM.md` global. La opción `--system-prompt` obedece una regla ligeramente diferente, ya que los archivos de contexto y los skills se siguen añadiendo por encima, de modo que nunca se parte del todo de una página en blanco.

::: info Ejercicio (en autonomía)
Crea un `.pi/SYSTEM.md` de tres líneas, por ejemplo:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Relanza la misma tarea y compara los tokens de entrada, los turnos, la duración y lo que contiene el diff.
:::

El prompt de sistema de Pi ocupa 550 tokens. Todo el resto del trabajo se juega en otra parte, y te animamos a modificarlo solo por buenas razones. Te lo mostramos aquí para ilustrar la flexibilidad que ofrece Pi.

#### Una ventana limitada, para ver la compactación

Cuando el contexto se acerca al límite, Pi compacta, es decir, resume los mensajes antiguos y solo conserva intactos los más recientes. La activación sigue la regla `contextTokens > contextWindow - reserveTokens`, donde `reserveTokens` vale 16 384 por defecto y representa el espacio reservado para la respuesta. El corte es visible en `/tree`, y `/compact` permite forzarlo, con instrucciones opcionales para orientar el resumen.

En NÉON, según el modelo, la compactación nunca se activará. El repositorio tiene 617 líneas, `gemma-4-31b` anuncia una ventana de aproximadamente 128 000 tokens, lo que sitúa el umbral en torno a 112 000, y nuestra experiencia más costosa solo alcanza esa cifra acumulando trece turnos, ninguno de los cuales pesa más de una decena de miles de tokens. Observar el mecanismo implica, por tanto, crear la restricción para ver sus efectos más rápidamente.

::: info Ejercicio (en autonomía)
Declara en `~/.pi/agent/models.json` un segundo proveedor, `ilaas-bride`, que apunta al mismo servicio pero anuncia una ventana de 32 000 tokens. Añádelo en `providers`, junto al proveedor `ilaas` que declaraste al [instalar Pi](./act1-pi), sin tocar este:

```jsonc
// à ajouter dans "providers", à côté de "ilaas"
"ilaas-bride": {
  "baseUrl": "https://llm.ilaas.fr/v1",
  "api": "openai-completions",
  "apiKey": "XXXXX",
  "models": [
    {
      "id": "gemma-4-31b",
      "name": "Gemma 4 31B (fenêtre bridée)",
      "reasoning": true,
      "contextWindow": 32000,
      "maxTokens": 8000
    }
  ]
}
```

Un segundo proveedor es necesario porque Pi identifica un modelo por su proveedor y su `id`. Una entrada que reutiliza el mismo `id` en el mismo proveedor reemplaza a la primera en lugar de sumarse a ella, y el `id` no puede cambiar, ya que es lo que Pi envía al servicio.

Añade en el `.pi/settings.json` de NÉON unos umbrales coherentes con esta ventana pequeña, reservados al modelo limitado:

```json
{
  "compaction": {
    "modelOverrides": {
      "ilaas-bride/gemma-4-31b": { "reserveTokens": 8000, "keepRecentTokens": 8000 }
    }
  }
}
```

La compactación se activa entonces por encima de 24 000 tokens (32 000 menos 8 000) y mantiene intactos los últimos 8 000 tokens. `reserveTokens` vale el `maxTokens` declarado, para que el espacio reservado corresponda a la respuesta más larga permitida. La clave `ilaas-bride/gemma-4-31b` limita estos ajustes al modelo limitado, y el modelo de 128K conserva los valores por defecto. Pi solo lee este archivo si confías en el proyecto: acepta la pregunta que plantea al arrancar, o escribe `/trust`. En modo `pi -p`, donde no puede plantear la pregunta, ignora el archivo sin avisar.

Dispones entonces de los dos regímenes en `/model`, `ilaas/gemma-4-31b` a 128K y `ilaas-bride/gemma-4-31b` limitado a 32K. Haz trabajar al agente sobre varios archivos con el segundo hasta que se active, lee el resumen producido y luego comprueba en `/tree` dónde se produjo el corte y si el agente todavía sabe lo que se le había pedido al principio.
:::

Esta manipulación muestra también que Pi compacta hacia 24 000 tokens no porque el modelo se sature, sino porque le declaraste una ventana de 32 000. La ventana que conoce un harness es una línea de configuración y no una propiedad del modelo. Esta constatación te servirá el día en que un agente empiece a compactar demasiado pronto sin razón aparente.

### ¿Qué hacer cuando las salidas de herramientas llenan la ventana?

La quinta fuente de la ventana, el historial, crece sobre todo por las salidas de herramientas. Cuando el agente lee diez archivos para encontrar la función que le interesa, o lanza un `grep` que devuelve trescientas líneas para quedarse con dos, todo lo que ha leído permanece en el contexto y se relee en cada turno hasta el final de la sesión, incluido lo que no le sirvió de nada. La compactación solo trata este problema a posteriori, resumiendo lo que ha sido útil.

En su lanzamiento, Pi no tenía ninguna herramienta para llamar a un servidor MCP, porque su autor consideraba que estos servidores llenaban con demasiada facilidad la ventana de contexto. El discurso ha evolucionado con la versión 1.0, en particular con la llegada de `codemode`, que simplifica el uso de los MCP y reduce su peso en la ventana ([You Said No MCP!](https://earendil.com/posts/you-said-no-mcp/)).

En lugar de llamar a las herramientas una por una y recibir cada resultado en la ventana, `codemode` permite al modelo escribir un programa que hace las llamadas, filtra y combina los resultados, y solo la salida del programa vuelve al contexto. [Cloudflare](https://blog.cloudflare.com/code-mode-mcp/) y [Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp) describieron este enfoque a finales de 2025 para los servidores MCP que exponen cientos de herramientas. Sus cifras, como los 150 000 tokens reducidos a 2 000 que anuncia Anthropic, describen el mejor caso, un workflow que hace transitar grandes volúmenes de datos entre dos servicios. Mario Zechner, el autor de Pi, defendía la misma idea en [What if you don't need MCP at all?](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/): un agente que dispone de `bash` y sabe escribir código no necesita hacer pasar cada resultado intermedio por su contexto.

Pi ofrece este modo desde su versión 1.0 en forma de herramienta, [`codemode`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/codemode.md), incluida con Pi pero inactiva por defecto. Se añade a las herramientas base para una sesión con `pi --tools +codemode`, o para un proyecto con `"defaultTools": ["+codemode"]` en `.pi/settings.json`. El modelo escribe entonces un script JavaScript que llama a las demás herramientas (`tools.read(...)`, `tools.bash(...)`, las herramientas de los servidores MCP) y devuelve lo que considera útil con `text()` o `return`. El script se ejecuta en un entorno aislado [QuickJS](https://bellard.org/quickjs/), sin acceso a la red ni al sistema de archivos salvo mediante las herramientas, y su salida está limitada a 10 000 tokens por defecto: más allá, Pi conserva el principio y el final y escribe el texto completo en un archivo temporal cuya ruta indica.

Esta palanca tiene un coste fijo, el de la descripción de la herramienta, que entra en el prefijo estable en cada turno. El registro de cambios de Pi 1.0 indica que una petición GPT-5.6 con las herramientas por defecto y `codemode` activo pasó de unos 5 300 a 3 300 tokens tras un aligeramiento de esa descripción, lo que da el orden de magnitud que hay que amortizar. En una tarea que lee poco, como la issue #1 de NÉON (un archivo fuente de unos cientos de líneas y cuatro herramientas), hay por tanto muchas probabilidades de que `codemode` aumente los tokens de entrada en lugar de reducirlos. Se vuelve interesante cuando las salidas son voluminosas y lo esencial puede filtrarse en el script: buscar un patrón en todo un repositorio, agregar la salida de una suite de pruebas, consultar un servidor MCP que devuelve documentos enteros.

::: warning Lo que `codemode` no cambia
Las llamadas a herramientas hechas desde un script son reales: un `tools.bash(...)` o un `tools.edit(...)` modifica el repositorio exactamente como si se hubiera llamado directamente, y un script que falla a mitad de camino no anula las llamadas ya hechas. El sandbox de QuickJS aísla el script y no las herramientas que llama, y el [módulo 2.0](./act2-sandbox) sigue siendo lo que acota lo que el agente puede tocar.

Actívalo también al inicio de la sesión en lugar de a mitad de camino: la lista de herramientas forma parte del prefijo en caché, y modificarla hace que se vuelva a pagar todo lo que sigue a tarifa completa, como un cambio de modelo.
:::

::: info Ejercicio (en autonomía)
En un clon de NÉON, plantea dos veces la misma pregunta que obligue a recorrer el repositorio, una vez con las herramientas por defecto y otra con `--tools +codemode`, por ejemplo:

```bash
pi -p -nc --session-dir ./runs/without-codemode --provider opencode-go --model deepseek-v4.1-flash \
  "Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4.1-flash \
  "Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4.1-flash \
  "Utilise l'outil codemode. Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4.1-flash \
  "Utilise l'outil codemode, en une seule commande. Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

```

Compare los tokens de entrada de cada llamada en la exportación HTML de las cuatro sesiones, luego lee lo que el script devolvió realmente al modelo.
:::

Para exportar una sesión, basta con lanzar:

```bash
pi --export runs/--path--/session.jsonl
```

En el ejercicio anterior, deberías comprobar que si no pides explícitamente usar `codemode`, el modelo se dice que no hay suficiente trabajo para lanzar esa herramienta. Verifica que esté en la lista.

En el tercer caso, el modelo llama a `codemode` varias veces, lo que exige muchos más tokens y tiempo que en el primer caso.

Por último, el último caso debería mostrarte que ganas tiempo y tokens si realizas un solo comando.

::: info Otras herramientas para reducir lo que el agente lee
Otras herramientas atacan el mismo problema desde otro lado. Los mapas de repositorio como el de [Aider](https://aider.chat/docs/repomap.html), los servidores basados en un servidor de lenguaje (LSP) como [Serena](https://github.com/oraios/serena) y los grafos de código expuestos en MCP como [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) ayudan al agente a encontrar las líneas correctas sin abrir los archivos enteros; [RTK](https://github.com/rtk-ai/rtk) comprime la salida de los comandos antes de que el agente la lea.

Conviene tomar estas herramientas con pinzas, y comprobarás que dependen en gran medida de tu caso de uso. En algunos casos serán útiles, y en otros, realmente contraproducentes. De nuevo, la experimentación es tu única arma para juzgar su pertinencia.
:::

Las manipulaciones de este módulo te han mostrado lo que cada palanca cambia en una ejecución, y una ejecución no dice si ese cambio se reproduce. El [módulo 3.1](./act3-contexte) retoma las mismas palancas sobre la misma tarea, con veinte repeticiones por configuración y un criterio ejecutable, para separar lo que desplaza precisamente el resultado de lo que depende de la dispersión del modelo.

## Generalizar

Lo que hicimos en NÉON vale para cualquier agente de código, y no solo para Pi.

El contexto se relee en cada turno, y la caché factura cincuenta veces menos, en `deepseek-v4.1-flash`, la parte que no ha cambiado desde el turno anterior. Coloca por tanto al principio lo que permanece estable, el system prompt, los archivos de contexto y las herramientas, y al final lo que varía. Una marca de tiempo o un `git status` añadido al system prompt hace repagar todo lo que sigue a tarifa completa, en cada turno.

Cambiar de modelo o de lista de herramientas en mitad de la sesión reinicia la caché a cero. En la secuencia de cinco turnos del principio del módulo, el primer turno en `pro` cuesta ocho veces más caro que el siguiente, con el mismo modelo.

Un ajuste propuesto por el harness no llega necesariamente hasta el modelo. Con `gemma-4-31b`, `--thinking max` envía la misma petición que `--thinking minimal`, y la ventana que Pi conoce es la que has declarado en `models.json`. Antes de fiarte de un ajuste, mira en la sesión qué ha cambiado.

La salida de una herramienta permanece en la ventana hasta el final de la sesión. Es mejor filtrarla antes de que entre, con un script, un comando o `codemode`, que resumirla a posteriori mediante la compactación. Este filtrado también tiene un coste: la descripción de `codemode` entra en el contexto en cada turno, y en una tarea pequeña como el issue #1 puede costar más de lo que aporta.

Por último, `AGENTS.md` también entra en el contexto en cada turno. Mantenlo corto, no añadas una regla hasta haber visto al agente fallar sin ella, y remite a los documentos que el agente puede leer cuando haga falta en lugar de copiarlos. Cuando cambies de modelo, reléelo y elimina lo que ya no sirva.

::: tip Lo que has aprendido
Sabes decir de qué está hecha la ventana de contexto. Sabes cómo se inicializa y cómo modificar esa inicialización. También entiendes cómo limitar el impacto de las herramientas o del nivel de razonamiento. Puedes decir si la infraestructura de inferencia está bien configurada o si te cuesta más tokens de los necesarios, lo que ocurre por ejemplo cuando el caché está mal configurado o no está configurado en absoluto.
:::

## Para ir más lejos

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), el estudio que justifica que no basta con llenar la ventana.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sobre el desplazamiento del prompt aislado hacia la arquitectura del contexto.
- [La documentación de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), y en particular sus páginas sobre la compactación, los modelos y los ajustes.
