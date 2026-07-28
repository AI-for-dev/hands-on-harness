# El contexto y la ventana: qué ponemos en ella y cuánto cuesta

::: tip Objetivos de este módulo
- Saber decir qué hay realmente en la ventana de contexto y cuánto cuesta cada parte
- Manipular las palancas que la llenan: modelo, esfuerzo de razonamiento, prompt, `AGENTS.md`, system prompt
- Montar un banco de medición y usarlo para decidir
- Llevarse un `AGENTS.md` corto y una decisión justificada sobre cada palanca
:::

La gestión del contexto es el bloque del que dependen todos los demás, ya que un subagente sirve para no contaminar el contexto principal, una memoria para no llenarlo con lo que ya se podría encontrar, y un permiso para no volcar en él un archivo que no se debería haber leído. Mientras no sepas qué contiene la ventana ni cuánto cuesta, los cinco módulos siguientes seguirán siendo recetas aplicadas sin ser comprendidas.

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

En una solicitud tan trivial como «di solo OK», sin archivos de contexto, sin skills y sin extensiones, la entrada pesa **1 660 tokens**, y cae a **1 110** si sustituimos el system prompt de Pi por tres líneas. El system prompt de Pi cuesta, por tanto, unos **550 tokens**, lo cual es poco considerando lo que las salidas de las herramientas y el historial añadirán después. Lo esencial de lo que llena una ventana de contexto no proviene del harness, sino de lo que tú y el agente vertéis en ella a lo largo de la sesión.

### Tres precios, uno de ellos muy bajo

Una llamada al modelo se factura en tres conceptos, expresados por millón de tokens. Aquí tienes las tarifas de los dos modelos que compararemos a lo largo del módulo:

| modelo              | entrada | salida | lectura de caché |
| ------------------- | ------- | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $ | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $ | 3,48 $ | 0,0145 $         |

Estas tarifas son las publicadas por [opencode Zen](https://opencode.ai/docs/zen/), el servicio que utiliza la formación. Pi las copia en `~/.pi/agent/models-store.json`, donde el banco de medición irá a leerlas.

De aquí resultan dos diferencias. La primera separa los dos modelos, ya que el `pro` cuesta 12,4 veces más que el `flash` a tarifa nominal. La segunda, mucho más amplia, separa la entrada de la lectura de caché: un factor de **50** en `flash` y **120** en `pro`.

Esta segunda diferencia es lo que hace que un agente de código sea económicamente viable, ya que un agente vuelve a leer su historial completo en cada turno y, de lo contrario, pagaría veinte veces el precio de su contexto en una sesión de veinte turnos.

::: info Ejercicio (en clase)
En una sesión interactiva, encadena cinco preguntas sobre un mismo archivo escribiendo `/session` después de cada una, y cambia de modelo con `/model` antes de la cuarta. Las preguntas deben prohibir explícitamente cualquier lectura de archivo, ya que, de lo contrario, una nueva salida de herramienta se añadirá al contexto y dificultará la lectura.

Aquí tienes la secuencia exacta que hemos medido, en modo no interactivo para que sea reproducible tal cual. La opción `-c` continúa la sesión anterior, y se han omitido los acentos en los comandos sin que ello afecte al resultado:

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

Estos cinco turnos producen seis llamadas al modelo, porque el primero consume dos: una para solicitar la lectura de `theme.js` y otra para responder una vez que haya regresado la salida de la herramienta.

| llamada | turno | prompt | modelo | entrada | lectura de caché | coste |
| -------- | ----- | -------------------------- | ------- | ------ | ---------------- | -------------- |
| 1 | 1 | « Lee `game/theme.js`... » | `flash` | 1 675 | 0 | 0,000254 $ |
| 2 | 1 | (continuación, tras la lectura) | `flash` | 307 | 1 664 | 0,000081 $ |
| 3 | 2 | « cita un color... » | `flash` | 66 | 2 048 | 0,000053 $ |
| 4 | 3 | « cuántos colores... » | `flash` | 118 | 2 048 | 0,000087 $ |
| 5 | 4 | « confirma este número... » | `pro` | 2 521 | **0** | **0,005455 $** |
| 6 | 5 | « repite este número... » | `pro` | 148 | 2 432 | 0,000362 $ |

La caché se activa desde la segunda llamada, incluida dentro de un mismo turno, y reduce el coste en un factor de tres a cinco. El cambio de modelo en el cuarto turno reinicia la lectura de caché a cero y hace que se vuelva a pagar todo el prefijo a tarifa completa: este único turno cuesta quince veces más que el siguiente, con el mismo modelo.
:::

::: warning Si `pi -p` se congela sin mostrar nada
Desde un script, redirige la entrada estándar con `< /dev/null`. En modo no interactivo, `pi` espera en su entrada estándar mientras esta permanezca abierta, lo que provoca un bloqueo indefinido cuando se llama desde una herramienta que le proporciona un pipe en lugar de una terminal. El banco de pruebas más abajo se topa con la misma trampa y lo gestiona de la misma manera.
:::

El caché solo funciona sobre un **prefijo inalterado**, de lo cual se deriva la regla de ordenación del contexto: todo lo que varíe debe colocarse detrás de lo que es estable. Una marca de tiempo o un `git status` insertado en el system prompt invalida todo lo siguiente, incluyendo herramientas, pregunta e historial, y hace que vuelvas a pagar la tarifa completa en cada turno, mientras que el mismo dato colocado en el mensaje del turno actual no cuesta nada ya que se encuentra ya en la zona que varía.

Recuerda también que cambiar de modelo durante la sesión no es gratuito, algo que conviene tener en cuenta durante todo este módulo en el que vas a alternar mucho entre `flash` y `pro`.

## Reconstruir

### La tarea y qué se considera un éxito

Todas las mediciones de este módulo se basan en la misma tarea, la **issue #2** de NÉON, donde la colisión escanea todos los ladrillos en cada frame y donde su código está mezclado con el bucle de renderizado.

La hemos elegido porque consta de dos partes de las cuales solo se puede completar una: separar la lógica del renderizado es fácil, mientras que dejar de escanear todos los ladrillos requiere haber leído el ticket hasta el final. Un agente que se detiene en la primera mitad entrega un diff limpio y tests en verde para un trabajo a medio hacer, algo que un criterio demasiado superficial dejaría pasar.

Mantenemos cuatro criterios:

| criterio | ¿verificable mecánicamente? |
| --- | --- |
| `npm test` pasa | sí |
| ningún export de `game/neon.js` renombrado o eliminado | sí |
| solo se modifica `game/neon.js`, por lo que se respeta el alcance del ticket | sí |
| se ha abordado la parte de « rendimiento » del ticket | **solo en apariencia** |

Los tres primeros se leen sin ambigüedad en un código de retorno o en una lista de archivos. El cuarto, que sin embargo decide si el ticket está resuelto, no es tan fácil de reducir, y la forma en que resiste merece ser vista en detalle.

Nuestro harness lo aborda mediante un patrón: busca en el diff un cálculo de índices de cuadrícula, ya que así es como se espera que la colisión deje de recorrer todos los ladrillos. Esta aproximación nos engañó dos veces durante la preparación del módulo. Primero clasificó como no resuelto un diff que hacía el cálculo correcto pero nombraba sus límites de otra manera, lo cual es una cuestión de ajuste. Sobre todo, fue incapaz de juzgar una solución de otra forma: un agente mantuvo la lista de ladrillos aún vivos, lo que aligera el trabajo a medida que avanza la partida sin cambiar nada en el peor de los casos, y decidir si esto cuenta como «resuelto» requiere una opinión más que una prueba.

Un patrón textual responde, por tanto, a la pregunta « ¿este diff se parece a la solución esperada? », mientras que la pregunta planteada es « ¿este diff resuelve el problema? ». Esta brecha es exactamente lo que el modelo de lenguaje-juez del módulo 3.2 viene a llenar, y es por eso que esta columna lleva un asterisco en las tablas siguientes: relee los diffs que declara resueltos antes de confiar en ellos.

::: warning Cada ejecución trabaja sobre una copia desechable
Un banco que modifica el repositorio mide la última modificación en lugar de la configuración. El script proporcionado más abajo copia NÉON en un directorio temporal en cada ejecución, y debes hacer lo mismo si mides manualmente.
:::

### Los deslizadores, a mano

#### El modelo

::: info Ejercicio (en clase)
Lanza la misma solicitud en `deepseek-v4-flash` y luego en `deepseek-v4-pro`:

```
La collision scanne toutes les briques à chaque frame et son code est mêlé
à la boucle de rendu. Corrige ça.
```

Lee los dos diffs y luego los dos `/session`. Anota tus observaciones sin sacar conclusiones: la sección sobre las repeticiones explicará por qué dos ejecuciones no bastan para diferenciar dos modelos.
:::

#### El esfuerzo de razonamiento

`pi --help` anuncia siete niveles de razonamiento, de `off` a `max`, lo que lo convierte en el parámetro más tentador e inmediato del harness.

::: info Ejercicio (en clase)
Ejecuta la misma tarea con `--thinking low`, luego con `--thinking medium`, y compara los tokens de salida y la respuesta. No encontrarás ninguna diferencia, ya que ambos flags producen exactamente la misma solicitud.

Abre `~/.pi/agent/models-store.json` y busca el campo `thinkingLevelMap` del modelo que estés usando. En `deepseek-v4-flash`, tiene el valor:

```json
{ "minimal": null, "low": null, "medium": null, "high": "high", "max": "max" }
```

Tres de estos niveles no están asociados a nada: Pi acepta el flag, no lo envía y no te avisa. En la mayoría de los otros modelos del catálogo, no hay ningún `thinkingLevelMap`.

Repite luego la comparación entre la ausencia de flag y `--thinking high`, que corresponden a dos regímenes realmente distintos, y mide la diferencia.
:::

El razonamiento sí tiene un efecto cuando se mide entre dos niveles reales, y este efecto no siempre es en el sentido esperado, como mostrarán los resultados del banco. La lección general trata más bien sobre la confianza que se debe depositar en los ajustes: **un ajuste expuesto por el harness no es necesariamente un ajuste comprendido por el modelo**, porque entre el flag que escribes y la solicitud que se envía hay una tabla de correspondencia escrita por alguien, que puede estar incompleta. Te encontrarás con esta situación varias veces en la formación y regularmente en tu trabajo, por lo que es un buen hábito investigar dónde termina un flag antes de confiar en él.

### Lo que escribimos

#### `AGENTS.md`, el punto de configuración más rentable

El archivo de reglas ubicado en la raíz del repositorio entra en el contexto en cada turno, lo que lo convierte a la vez en la palanca más eficaz del harness y la más fácil de sabotear. Cuando el agente se equivoca, la reacción natural es añadir una frase, y luego otra, hasta obtener en unas semanas un archivo de trescientas líneas que ya nadie relee y del cual el agente ignora la mitad. Por lo tanto, establecemos una restricción estricta, válida para todo el resto de la formación.

::: danger Presupuesto: 40 líneas
El `AGENTS.md` de NÉON nunca superará las 40 líneas, desde el principio hasta el final de la formación. Cada módulo que quiera añadir una regla deberá primero eliminar otra, o reformular para que ambas quepan en una sola.

Esta restricción es la única forma de experimentar concretamente la diferencia entre una lista de verificación de piloto, que se lee, y una guía de estilo, que se ignora.
:::

El archivo no debe repetir lo que el repositorio ya indica, ya que las convenciones están en `CONTRIBUTING.md`, la arquitectura en el `README.md` y el historial en git. Contiene las reglas que el agente ha violado efectivamente. En nuestras cuatro ejecuciones del issue #2 sin `AGENTS.md`, dos corrigieron de paso otro issue que no se les pidió, tres solo trataron la mitad del ticket y todas tuvieron que descubrir por su cuenta el comando de prueba, lo que proporciona tres reglas sin tener que inventarlas.

::: info Ejercicio (en clase)
Escribe el `AGENTS.md` de NÉON basándote en tus propias ejecuciones en lugar de las nuestras: relee los diffs que acabas de producir y busca qué hizo el agente sin que se le pidiera, o qué omitió a pesar de que se le solicitaba.

Aquí tienes una base de partida, para discutir y enmendar:

```markdown
# NÉON

- Une tâche = un ticket. Ne traite pas d'autre issue en passant.
- Ne renomme ni ne supprime un export de `game/neon.js` : les tests en dépendent.
- Zéro dépendance : aucun paquet, aucun CDN.
- Les tests se lancent avec `npm test`.
```

Cuatro líneas utilizadas, treinta y seis de margen para los cinco módulos siguientes.
:::

::: warning Un `AGENTS.md` puede ocultar otro
Pi carga estos archivos de forma acumulada, empezando por tu `~/.pi/agent/AGENTS.md` personal, luego por cada directorio padre ascendiendo, y finalmente por el directorio actual. Por lo tanto, un archivo de reglas personal se incluye en todas tus mediciones sin que nada lo indique.

La bandera `--no-context-files`, abreviada `-nc`, desactiva este descubrimiento, lo cual es indispensable para medir correctamente el comportamiento del banco.
:::

#### El system prompt

Pi permite reemplazar completamente su system prompt mediante un `.pi/SYSTEM.md` en la raíz del proyecto o un `~/.pi/agent/SYSTEM.md` global. La opción `--system-prompt` sigue una regla ligeramente diferente, ya que los archivos de contexto y las skills se siguen añadiendo encima, por lo que nunca se parte totalmente de una hoja en blanco.

::: info Ejercicio (autónomo)
Crea un `.pi/SYSTEM.md` de tres líneas:

```
You are a coding assistant working in the current directory.
Use the available tools (read, write, edit, bash) to inspect and modify files.
Answer in the language of the user.
```

Vuelve a ejecutar la misma tarea y compara. Nuestra primera medición, una ejecución de cada lado, dio esto:

|                  | system prompt de Pi | system prompt amputado     | relación |
| ---------------- | -------------------- | -------------------------- | -------- |
| turnos            | 9                    | 26                          | ×2,9     |
| llamadas a herramientas | 10                   | 27                          | ×2,7     |
| tokens de salida | 2 551                | 16 162                      | ×6,3     |
| coste            | 0,0025 $             | 0,0087 $                    | **×3,5** |
| duración         | 128 s                | 126 s                       | igual    |
| archivos tocados | `neon.js`            | `neon.js` y `neon.test.js` | se excede |

La tarea se completa con éxito en ambos casos, con tests en verde, el refactor realizado y la API preservada, lo que significa que no se ha perdido ninguna capacidad.
:::

::: warning Lo que tres repeticiones han hecho con esta tabla
Le facteur 3,5 en el coste **no ha sobrevivido** a las repeticiones. En diez ejecuciones de cada lado, la mediana de la celda amputada es de 0,0051 $ frente a 0,0042 $ para la base, una diferencia muy inferior a la dispersión de cada una de las dos celdas.

Lo que persiste, en cambio, se lee en otro lado y no es despreciable: el número mediano de turnos pasa de 10,5 a 13,5, el respeto al perímetro se desploma de 7/10 a 4/10, y la dispersión se convierte en la peor de toda la matriz. Privado de sus convenciones, el agente mantiene sus capacidades pero pierde su rigor.

Dejamos la tabla con una sola ejecución en la página en lugar de eliminarla, porque el error que contiene es exactamente aquel contra el que la siguiente sección te advierte, y que cometimos al preparar este módulo.
:::

Por lo tanto, el system prompt no añade ninguna capacidad, ya que las herramientas se declaran al modelo mediante su esquema JSON y no mediante prosa, y su influencia en la factura es menor de lo que sugería nuestra primera medición. Lo que aporta se refleja en la conducción del trabajo, con un agente que tantea más cuando se le priva de sus convenciones. Es también la razón por la cual un harness no se resume en un system prompt bien redactado: el de Pi cabe en 550 tokens, y todo el resto del trabajo ocurre en otro lugar.

#### Una ventana limitada, para ver la compactación

Cuando el contexto se acerca al límite, Pi compacta, es decir, resume los mensajes antiguos y mantiene intactos solo los más recientes. La activación sigue la regla `contextTokens > contextWindow - reserveTokens`, donde `reserveTokens` tiene un valor de 16 384 por defecto y representa el espacio dejado para la respuesta. El corte es visible en `\tree`, y `/compact` permite forzarlo, con instrucciones opcionales para orientar el resumen.

En NÉON, la compactación nunca se activará, ya que el repositorio tiene 617 líneas y nuestros modelos anuncian una ventana de un millón de tokens, lo que situaría el umbral en 984 000 tokens. Observar el mecanismo requiere, por lo tanto, crear la restricción.

::: info Ejercicio (autónomo)
Declara en `~/.pi/agent/models.json` un segundo proveedor, que apunte al mismo servicio pero anuncie una ventana de 32 000 tokens:

```json
{
  "providers": {
    "banc": {
      "baseUrl": "https://opencode.ai/zen/go/v1",
      "api": "openai-completions",
      "apiKey": "$OPENCODE_API_KEY",
      "models": [
        {
          "id": "deepseek-v4-flash",
          "name": "DeepSeek V4 Flash (fenêtre bridée)",
          "reasoning": true,
          "input": ["text"],
          "contextWindow": 32000,
          "maxTokens": 8000,
          "cost": {
            "input": 0.14, "output": 0.28,
            "cacheRead": 0.0028, "cacheWrite": 0
          },
          "compat": {
            "supportsStore": false,
            "supportsDeveloperRole": false,
            "maxTokensField": "max_tokens",
            "requiresReasoningContentOnAssistantMessages": true,
            "thinkingFormat": "deepseek"
          },
          "thinkingLevelMap": {
            "minimal": null, "low": null, "medium": null,
            "high": "high", "max": "max"
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

Tienes entonces las dos configuraciones en `/model`, el modelo real de 1M y el mismo limitado a 32K. Haz trabajar al agente en varios archivos con el segundo hasta que se active, lee el resumen generado y luego verifica en `\tree` dónde ocurrió el corte y si el agente aún sabe lo que se le había pedido al principio.
:::

El rodeo por este proveedor limitado enseña tanto como la demostración misma, ya que Pi compacta a 32 000 tokens no porque el modelo se sature, sino porque tú se lo has declarado. La ventana que conoce un harness es una línea de configuración más que una propiedad del modelo, lo cual te servirá el día que un agente empiece a compactar demasiado pronto sin razón aparente.

### El banco de pruebas

#### El plan de experimento

El plan elegido es el más simple que siga siendo legible: una **base**, y luego una variable a la vez.

La base reproduce lo que hace alguien que descubre la herramienta, con el modelo rápido, sin pedir ningún esfuerzo de razonamiento, un prompt vago, sin `AGENTS.md`, el system prompt por defecto, la ventana normal y ninguna extensión. Cada otra celda solo cambia una cosa y se lee como una desviación respecto a esta base.

| celda | qué cambia |
| ---------------- | -------------------------------------------------------------- |
| base | nada, es la referencia |
| `+thinking` | `--thinking high` |
| `+prompt delimitado` | el prompt define el alcance y el criterio de parada |
| `+AGENTS.md` | el archivo de reglas está presente |
| `-system prompt` | el system prompt es reemplazado por tres líneas |
| `+rtk` | la extensión `pi-rtk-optimizer` está cargada |
| `pro (descuidado)` | el modelo de lenguaje grande, todo lo demás sin cambios |
| `flash (detallado)` | el modelo de lenguaje pequeño con razonamiento, prompt delimitado y `AGENTS.md` |

Las dos últimas líneas forman el 2×2 sobre el que se desarrolla la conclusión del módulo.

El prompt acotado se distingue del prompt vago por tres añadidos en lugar de por su longitud: el **perímetro**, que prohíbe tocar los tests y tratar otro issue, las **dos mitades del trabajo**, que piden explícitamente sacar la colisión del renderizado y dejar de escanear todas las piezas, y el **criterio de parada**, que indica que el trabajo ha terminado cuando los tests pasan y los exports han mantenido su nombre. Este último añadido es el más rentable de los tres, ya que la mayoría de nuestros fallos provienen de desbordamientos más que de errores.

#### Cuántas repeticiones, y por qué

Cada celda se ejecuta varias veces, por una razón que descubrimos por las malas. Aquí tienes tres ejecuciones estrictamente idénticas, mismo modelo, mismo esfuerzo, mismo prompt, mismo repositorio:

|      | run a    | run b    | run c    | mediana   | rango     |
| ---- | -------- | -------- | -------- | --------- | --------- |
| coste | 0,0104 $ | 0,0052 $ | 0,0050 $ | 0,0052 $ | **×2,08** |

En diez ejecuciones de esta misma configuración, el rango alcanza **×3,50**, los turnos varían de 7 a 24 y el diff de 34 a 167 líneas insertadas. Un agente no es determinista, y la diferencia entre dos ejecuciones de una misma configuración es del mismo orden de magnitud que el efecto de la mayoría de las palancas, por lo que una única ejecución por celda mide el ruido en lugar de la palanca.

El harness muestra, por lo tanto, un mínimo, una mediana y un máximo, y nunca una cifra única, lo que te obliga a observar la dispersión antes de concluir.

El número de repeticiones es un parámetro porque la elección correcta depende de lo que busques. **Tres son suficientes para ver la dispersión**, que es el objetivo en el aula y se completa en unos diez minutos. **Diferenciar entre dos palancas cercanas requiere mucho más**, y las columnas de calificación son las más exigentes ya que cuentan éxitos: un 2/3 frente a un 3/3 no dice prácticamente nada, mientras que un 4/10 frente a un 10/10 es más significativo. La tabla de referencia publicada más abajo se calcula con diez repeticiones por esta razón.

#### El script

Aquí lo tienes completo. Funciona sin dependencias, estima su coste antes de empezar, relanza cualquier ejecución que se quede congelada y concentra su notación en una única función situada al final del archivo, que es el único lugar que hay que reescribir para aplicarlo a un repositorio distinto de NÉON.

<<<@/../scripts/banc/banc.mjs{js}

::: info Ejercicio (en clase, luego de forma autónoma)
Empieza por la estimación, que no gasta nada:

```bash
node banc.mjs --dry-run
```

Luego lanza la matriz y deja que corra mientras discutes los parámetros:

```bash
node banc.mjs
```

Calcula entre dos y cuatro minutos por ejecución, es decir, aproximadamente un cuarto de hora para las veinticuatro en paralelo de cuatro en cuatro. El resultado se escribe en `banc-resultats.md`.

Para reiniciar solo una celda, por ejemplo tras haber modificado tu `AGENTS.md`:

```bash
ONLY='+AGENTS.md' REPEATS=3 node banc.mjs
```

**En autonomía**, retoma el script y cambia la matriz, con otros modelos, otros niveles de razonamiento o tu propio repositorio. Es el único artefacto de este módulo que no caducará.
:::

::: warning Lo que el banco debe prever
Una ejecución de `pi` puede congelarse sin producir un solo byte ni el más mínimo mensaje de error, algo que hemos encontrado varias veces durante la preparación de este módulo. Por lo tanto, el script prevé un tiempo límite máximo por ejecución y un segundo intento; de lo contrario, una ejecución bloqueada contaminaría toda una línea de la tabla.

En nuestro caso, la causa era una entrada estándar dejada abierta, que `spawn` proporciona por defecto y en la cual `pi -p` espera indefinidamente. El comentario correspondiente está en el script, y la misma trampa te acechará si llamas a `pi` desde tus propias herramientas.
:::

#### Nuestras medidas

Esto es lo que obtuvimos en julio de 2026, en `opencode-go`, con NÉON, excluyendo los archivos de contexto, las skills y las extensiones no solicitadas.

La tabla siguiente se ha generado con **diez repeticiones por celda**, es decir, 80 ejecuciones, por 0,93 $ y unos treinta y cinco minutos de tiempo real. El banco que ejecutarás en clase está configurado con tres repeticiones, lo cual es suficiente para observar la dispersión, pero no para diferenciar variaciones modestas.

| celda | n | coste mín. | mediana | máx. | rango | turnos med. | tests | API | perímetro | perf* |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| base | 10 | 0,0029 $ | 0,0042 $ | 0,0101 $ | ×3,50 | 10,5 | 10/10 | 10/10 | 7/10 | 0/10 |
| `+thinking` | 10 | 0,0039 $ | 0,0051 $ | 0,0097 $ | ×2,49 | 11 | 10/10 | 10/10 | 6/10 | 0/10 |
| `+prompt acotado` | 10 | 0,0031 $ | 0,0046 $ | 0,0059 $ | ×1,88 | 10 | 10/10 | 10/10 | **10/10** | 2/10 |
| `+AGENTS.md` | 10 | 0,0020 $ | **0,0036 $** | 0,0063 $ | ×3,17 | **7,5** | 10/10 | 10/10 | 9/10 | 0/10 |
| `-prompt sys.` | 10 | 0,0035 $ | 0,0051 $ | 0,0128 $ | ×3,71 | 13,5 | 10/10 | 10/10 | **4/10** | 0/10 |
| `+rtk` | 10 | 0,0040 $ | 0,0049 $ | 0,0059 $ | **×1,46** | 10,5 | 10/10 | 10/10 | 8/10 | 0/10 |
| `pro (descuidado)` | 10 | 0,0428 $ | 0,0538 $ | 0,1026 $ | ×2,40 | 9,5 | 10/10 | 10/10 | 5/10 | 2/10 |
| `flash (cuidadoso)` | 10 | 0,0028 $ | 0,0044 $ | 0,0064 $ | ×2,26 | 10 | 10/10 | 10/10 | **10/10** | 1/10 |

Estas cifras no deben tomarse al pie de la letra ni copiarse dentro de un año. Vuelve a ejecutar el banco de pruebas: para eso sirve precisamente, y la tabla que obtengas reemplazará a esta.

Lo que permiten afirmar estas mediciones:

- **Escribir el perímetro y el criterio de parada en la solicitud elimina los desbordamientos.** Las dos celdas que contienen el prompt acotado alcanzan un 10/10, es decir, veinte ejecuciones sin un solo desbordamiento, frente al 7/10 de la base. Es el resultado mejor contrastado de la tabla, y solo cuesta tres frases.
- **Privar al agente del system prompt de Pi conlleva una pérdida de disciplina.** El perímetro cae a 4/10, el número mediano de turnos sube a 13,5 y la dispersión se convierte en la peor de la tabla con ×3,71. El coste mediano, por su parte, apenas varía.
- **Pagar doce veces más no compra nada.** El `pro` descuidado cuesta 0,0538 $ frente a los 0,0042 $ de la base, respeta peor el perímetro (5/10 frente a 7/10) y no es mejor en ningún otro aspecto.
- **`rtk` no cambia el coste, pero reduce la dispersión.** Su mediana es la de la base a un centésimo de centavo cerca, mientras que su rango es el más bajo de la tabla, ×1,46 frente a ×3,50. Es el único efecto de la extensión que respaldan estas mediciones, y no es el que se le atribuye habitualmente.
- **Ninguna configuración resuelve la parte difícil del ticket.** La columna `perf*` llega a un máximo de 2/10, incluso para las celdas mejor equipadas. Dejar de escanear todos los bloques requería leer el ticket hasta el final, y ninguna de las palancas de este módulo es suficiente para ello.

Este último punto es el más importante y anticipa la continuación de la formación. Un contexto bien gestionado hace que el agente sea disciplinado, económico y predecible, sin llegar a ser riguroso. Lograr la rigurosidad requerirá un revisor independiente y un bucle de verificación, que es el tema de los módulos sobre delegación y workflows.

::: warning Tres repeticiones no fueron suficientes, y hemos pagado las consecuencias
Primero publicamos esta tabla con tres repeticiones por celda. Dos afirmaciones no sobrevivieron al pasar a diez.

Escribimos que la consigna « una tarea = un ticket » se mantenía mejor en el prompt que en `AGENTS.md`, basándonos en un 3/3 frente a 2/3. Con diez repeticiones, `AGENTS.md` obtiene 9/10: la diferencia se ha evaporado y el archivo de reglas funciona bien. Es incluso la celda más barata de la tabla, con el menor número de turnos.

También escribimos que el prompt estructurado trataba la mitad de rendimiento 2 de cada 3 veces. Con diez repeticiones, es 2 de cada 10, y la celda `pro` obtiene la misma puntuación. El resultado alentador no era más que un sorteo favorable.

Una conclusión extraída de tres ejecuciones es una conclusión frágil, incluso cuando es publicada por los autores de un módulo que te advierte precisamente contra ese error.
:::

Acabas de practicar una evaluación, en el sentido de que se comparan comportamientos en una misma tarea, con repeticiones y sabiendo que la medición es ruidosa, mientras que un test responde con sí o no a una pregunta cerrada. El módulo 3.2 formalizará esta práctica con archivos de evaluación y un LLM-juez, y la columna marcada con un asterisco es precisamente lo que este juez deberá gestionar.

### El 2×2

Las palancas de este módulo cuestan atención y tiempo, mientras que el modelo se compra, lo que plantea la cuestión de si es más rentable cuidar el contexto o pagar más.

::: info Ejercicio (en aula)
Compara las dos celdas extremas de la matriz: el `flash` bien equipado que dispone de razonamiento, un prompt estructurado y un `AGENTS.md`, y el `pro` mal equipado que recibe un prompt vago y nada más. Mira el coste, luego los cuatro criterios y después los diffs.
:::

En diez repeticiones de cada lado:

| | `flash (soigné)` | `pro (négligé)` |
| --- | --- | --- |
| coste mediano | 0,0044 $ | 0,0538 $ |
| perímetro respetado | **10/10** | 5/10 |
| mitad de rendimiento tratada | 1/10 | 2/10 |

El modelo pequeño bien equipado cuesta **doce veces menos** y nunca se sale del ticket, mientras que el modelo grande descuidado se sale una de cada dos veces. Es la tesis de Addy Osmani, *« a decent model with a great harness beats a great model with a bad harness »*, verificada en una tarea real.

La última línea impide, sin embargo, cantar victoria demasiado pronto: ni uno ni otro tratan la mitad difícil del ticket, y ambas puntuaciones son demasiado bajas y cercanas para distinguirse. Cuidar el contexto ha hecho que el agente sea disciplinado y económico, sin hacerlo riguroso.

No obstante, esta comparación puede fallar en otros casos, y que falle en tu caso sería un resultado a anotar más que un incidente a ocultar, ya que un modelo claramente más capaz puede absorber un contexto descuidado y es útil saber a partir de qué diferencia de capacidad esto se vuelve cierto. La pregunta merece plantearse de nuevo con cada nueva generación de modelos, y el banco de pruebas está ahí para ello.

## Generalizar

Cinco principios sobreviven a Pi, a `opencode-go` y a la versión de los paquetes que acabas de instalar.

**Lo que es estable delante, lo que varía detrás.** El caché solo funciona con un prefijo invariable y cuesta cincuenta veces menos que la entrada, por lo que cualquier dato volátil colocado al principio del contexto, ya sea una marca de tiempo, un estado de git o una fecha, invalida todo lo siguiente.

**Decir cuándo detenerse es la mitad de un buen prompt.** Nuestras ejecuciones han fallado más a menudo por desbordamiento que por incompetencia, y las veinte ejecuciones que reciben un perímetro y un criterio de parada explícitos no se han desbordado ni una sola vez, frente a siete de diez para la solicitud vaga. Tres frases en la solicitud valen más que un modelo doce veces más caro.

**El archivo de reglas es una check-list, no una guía de estilo.** Entra en el contexto en cada turno, lo que lo hace potente y costoso, de ahí el interés de mantenerlo corto, fundamentar cada regla en un fallo observado y refactorizarlo en lugar de alargarlo. Nuestras mediciones le dan la razón en todo, ya que la celda `+AGENTS.md` es a la vez la más barata de la matriz, la más directa con una mediana de 7,5 turnos, y una de las más disciplinadas con un 9/10 en el perímetro, todo por cuatro líneas de texto.

**Un ajuste expuesto no es un ajuste comprendido.** Entre la bandera que escribes y la petición que se envía hay código y tablas de correspondencia, como muestra `--thinking medium`, que no existe en la mitad de los modelos sin que nada te advierta.

**Un agente es ruidoso, y sin repeticiones no mides nada.** La celda base muestra una amplitud de ×3,50 en diez ejecuciones, lo que hace que cualquier diferencia de coste inferior a este orden de magnitud sea ininterpretable. Hemos publicado tres conclusiones falsas en las versiones sucesivas de este módulo, cada una basada en una muestra demasiado pequeña y cada una desmentida al aumentar el número de repeticiones. Tres repeticiones constituyen el mínimo para observar la dispersión; se necesitan significativamente más para diferenciar dos palancas cercanas, y las columnas de calificación, que cuentan los éxitos, son las que más consumen.

### El caso `rtk` y el paso al acto 2

`pi-rtk-optimizer` es la extensión recomendada para dominar el contexto en Pi, ya que reescribe los comandos `bash` hacia una herramienta dedicada y compacta las salidas de las herramientas antes de que entren en el contexto. En NÉON, no ahorra dinero.

La razón es aritmética: `rtk` actúa sobre las salidas de las herramientas, pero las salidas de `bash` solo representan entre el 6 y el 22 % del total en este repositorio; el resto proviene de las lecturas de archivos. Un repositorio de 617 líneas no produce ni un build verboso, ni una suite de tests de diez minutos, ni un `git log` de trescientos commits, por lo que casi no hay nada que compactar.

La única diferencia que destaca no es el coste mediano, idéntico al de la base con una precisión de una centésima de céntimo, sino la dispersión, que cae de ×3,50 sin la extensión a ×1,46 con ella, siendo la más baja de toda la matriz. En diez repeticiones, la hipótesis de un agente vuelto más predecible en lugar de más barato resulta defendible, lo cual es una propiedad deseable y una razón para instalar `rtk` que su página de presentación no destaca.

Debes recordar dos cosas. Primero, que un bloque de harness solo vale lo que tu carga de trabajo le da para procesar, y que el cálculo probablemente se invertirá en un repositorio con un build verboso y una integración continua ruidosa, lo cual sabrás verificar ya que tienes el banco. Segundo, que una extensión puede aportar algo distinto a lo que anuncia, y que solo lo descubrirás midiendo varias dimensiones a la vez: buscábamos un ahorro de tokens y encontramos una reducción de la varianza.

Este caso también marca un cambio de naturaleza en las palancas. Todo lo que hemos manipulado hasta ahora es cuestión de uso, ya sea elegir un modelo, ajustar un cursor, escribir un prompt o mantener un archivo de reglas, mientras que `rtk` es la primera palanca constituida por código añadido al harness. Es el giro de todo el acto 2: hemos agotado lo que se gana haciéndolo mejor, y ahora vamos a modificar la máquina.

## Entregable

Tres piezas, de las cuales las dos primeras se usan durante todo el día y la tercera servirá para el acto 4.

**1. El `AGENTS.md` de NÉON**, versionado en el repositorio, de menos de 40 líneas, con cada regla justificada por un fallo que hayas observado.

**2. La tabla de medidas**, con mínimo, mediana y máximo por celda.

**3. La ficha de decisión**, una línea por palanca:

| palanca | efecto medido | ¿adoptado? | por qué |
| -------- | ------------- | ---------- | -------- |
| elección del modelo | | | |
| esfuerzo de razonamiento | | | |
| prompt estructurado | | | |
| `AGENTS.md` | | | |
| system prompt | | | |
| programación / caché | | | |
| compactación | | | |
| `rtk` | | | |

Esta ficha constituye el primer relleno real de la columna «¿tu harness?» de la tabla de correspondencia, para la fila «contexto». Los cinco módulos siguientes harán lo mismo con su bloque, de modo que abordarás el capstone con una tabla nutrida por la experiencia en lugar de una página en blanco.

::: tip Criterio de éxito
Sabes citar una palanca que hayas medido como ineficaz en NÉON y decir bajo qué condición precisa pasaría a ser rentable en tu propio repositorio.

Este criterio requiere haber visto las cifras y haber comprendido que es la carga de trabajo la que las determina, lo que hace que sea imposible de cumplir de memoria.
:::

## Las trampas

**Concluir a partir de una sola ejecución**, que sigue siendo la trampa principal y la más costosa, ya que genera convicciones duraderas basadas en ruido.

**Inyectar datos volátiles en la zona cacheable.** Una fecha, un `git status` o una marca de tiempo colocada al principio del contexto invalida todo el caché posterior, y hace que pagues caro un ahorro que creías haber conseguido.

**Olvidar tu `AGENTS.md` personal**, cargado además del del proyecto, invisible en la interfaz, y que falsea todas tus mediciones mientras no utilices `-nc`.

**Creer ciegamente en un flag**, cuando `--thinking medium` puede no tener ningún efecto sin que Pi te advierta.

**Confundir la ausencia de saturación con la ausencia de problemas.** En una ventana de un millón de tokens nada desborda jamás, lo que significa simplemente que la señal de alarma no sonará y que el coste será tu único indicador.

**Instalar una extensión solo porque es recomendada**, sin haberla medido en tu repositorio y con tu carga de trabajo.

## Para ir más allá

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), el estudio que justifica que no baste con rellenar la ventana.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), sobre el desplazamiento del prompt aislado hacia la arquitectura del contexto.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), cuya tesis es la que el 2x2 pone a prueba.
- [La documentación de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), y en particular sus páginas sobre la compactación, los modelos y los ajustes.
