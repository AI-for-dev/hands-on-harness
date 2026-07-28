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
En una sesión, haz tres preguntas seguidas sobre un mismo archivo y escribe `/session` después de cada una, observando la línea de tokens: la lectura de caché aumenta mientras que el coste del turno se desploma.

Aquí tienes lo que hemos medido en una sesión de seis llamadas, cambiando voluntariamente de modelo en la quinta:

| llamada | modelo  | entrada | lectura de caché | coste           |
| ----- | ------- | ------ | ---------------- | -------------- |
| 1     | `flash` | 1 675  | 0                | 0,000254 $     |
| 2     | `flash` | 307    | 1 664            | 0,000081 $     |
| 3     | `flash` | 66     | 2 048            | 0,000053 $     |
| 4     | `flash` | 118    | 2 048            | 0,000087 $     |
| 5     | `pro`   | 2 521  | **0**            | **0,005455 $** |
| 6     | `pro`   | 148    | 2 432            | 0,000362 $     |

El caché se activa desde la segunda llamada, incluso dentro de un mismo turno, y reduce el coste en un factor de tres a cinco. El cambio de modelo en la quinta llamada restablece la lectura de caché a cero y hace que se vuelva a pagar todo el prefijo a tarifa completa: este único turno cuesta quince veces más que el siguiente, con el mismo modelo.
:::

El caché solo funciona sobre un **prefijo inalterado**, de lo cual se deriva la regla de ordenación del contexto: todo lo que varíe debe colocarse detrás de lo que es estable. Una marca de tiempo o un `git status` insertado en el system prompt invalida todo lo siguiente, incluyendo herramientas, pregunta e historial, y hace que vuelvas a pagar la tarifa completa en cada turno, mientras que el mismo dato colocado en el mensaje del turno actual no cuesta nada ya que se encuentra ya en la zona que varía.

Recuerda también que cambiar de modelo durante la sesión no es gratuito, algo que conviene tener en cuenta durante todo este módulo en el que vas a alternar mucho entre `flash` y `pro`.

## Reconstruir

### La tarea y qué se considera un éxito

Todas las mediciones de este módulo se basan en la misma tarea, la **issue #2** de NÉON, donde la colisión escanea todos los ladrillos en cada frame y donde su código está mezclado con el bucle de renderizado.

La hemos elegido porque consta de dos partes de las cuales solo se puede completar una: separar la lógica del renderizado es fácil, mientras que dejar de escanear todos los ladrillos requiere haber leído el ticket hasta el final. Un agente que se detiene en la primera mitad entrega un diff limpio y tests en verde para un trabajo a medio hacer, algo que un criterio demasiado superficial dejaría pasar.

Mantenemos cuatro criterios:

| criterio                                                                   | ¿mecánico? |
| ------------------------------------------------------------------------- | ----------- |
| `npm test` pasa                                                          | sí         |
| ningún export de `game/neon.js` renombrado o eliminado                        | sí         |
| solo `game/neon.js` es modificado, por lo que se respeta el perímetro del ticket | sí         |
| la parte de « rendimiento » del ticket ha sido tratada                         | **no**     |

Los tres primeros se calculan, mientras que el cuarto, que sin embargo decide si el trabajo está hecho, requiere leer el diff. Ten presente esta limitación: volverá a aparecer en la conclusión del módulo y el módulo 3.2 responderá a ella.

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

Vuelve a ejecutar la misma tarea y compara. Esto es lo que obtuvimos con el mismo modelo y esfuerzo de razonamiento:

|                  | system prompt de Pi | system prompt amputado     | relación |
| ---------------- | -------------------- | -------------------------- | -------- |
| turnos            | 9                    | 26                          | ×2,9     |
| llamadas a herramientas | 10                   | 27                          | ×2,7     |
| tokens de salida | 2 551                | 16 162                      | ×6,3     |
| coste            | 0,0025 $             | 0,0087 $                    | **×3,5** |
| duración         | 128 s                | 126 s                       | igual    |
| archivos tocados | `neon.js`            | `neon.js` y `neon.test.js` | se excede |

La tarea se completa satisfactoriamente en ambos casos, con tests en verde, el refactor realizado y la API preservada, lo que significa que no se perdió ninguna capacidad. El agente amputado simplemente tanteó tres veces más tiempo antes de lograrlo, y se puso a reescribir los tests sin que se le pidiera.
:::

Este resultado se define así: el system prompt no añade ninguna capacidad, ya que las herramientas se declaran al modelo mediante su esquema JSON y no mediante prosa, sino que añade disciplina, y es la disciplina la que determina la factura. Aquí, 550 tokens bien escritos dividen el coste por tres y medio. Esta es también la razón por la cual un harness no se resume en un system prompt bien redactado: el de Pi cabe en 550 tokens, y todo el resto del trabajo ocurre en otro lugar.

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

#### Tres repeticiones, y por qué

Cada celda se ejecuta tres veces, por una razón que hemos descubierto por experiencia propia. Aquí hay tres ejecuciones estrictamente idénticas, mismo modelo, mismo esfuerzo, mismo prompt, mismo repositorio:

|      | run a    | run b    | run c    | mediana   | rango     |
| ---- | -------- | -------- | -------- | --------- | --------- |
| coste | 0,0104 $ | 0,0052 $ | 0,0050 $ | 0,0052 $ | **×2,08** |

Al ampliar a cuatro ejecuciones, la extensión sube a **×4,2**, los turnos varían de 7 a 23, las llamadas a `bash` de 2 a 13 y el diff de 34 a 167 líneas insertadas.

Un agente no es determinista, y la diferencia entre dos ejecuciones de una misma configuración es del mismo orden de magnitud que el efecto de la mayoría de las palancas, por lo que una ejecución única por celda mide el ruido en lugar de la palanca. El banco muestra entonces un mínimo, una mediana y un máximo, y nunca una cifra única, lo que te obliga a mirar la dispersión antes de concluir.

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

RESULTATS_BANC

Estas cifras no deben tomarse al pie de la letra ni copiarse dentro de un año. Vuelve a ejecutar el banco de pruebas: para eso sirve precisamente, y la tabla que obtengas reemplazará a esta.

Lo que estas mediciones permiten afirmar, y nada más:

- La diferencia entre `flash` y `pro` se cuenta por decenas, muy por encima de la dispersión, lo que lo convierte en un efecto real.
- La amputación del system prompt multiplica el coste por 3,5, lo que supera la dispersión, aunque sea por poco.
- El efecto de `rtk` en el coste mediano ronda el 10 %, lo que se mantiene dentro de la dispersión y no permite sacar ninguna conclusión.

Acabas de realizar una evaluación, en el sentido de que se comparan comportamientos en una misma tarea, con repeticiones y sabiendo que la medida tiene ruido, mientras que un test responde con sí o no a una pregunta cerrada. El módulo 3.2 formalizará esta práctica con archivos de evaluación y un modelo de lenguaje juez, pero ya tienes lo esencial.

### El 2×2

Las palancas de este módulo cuestan atención y tiempo, mientras que el modelo se compra, lo que plantea la cuestión de si es más rentable cuidar el contexto o pagar más.

::: info Ejercicio (en aula)
Compara las dos celdas extremas de la matriz: el `flash` bien equipado que dispone de razonamiento, un prompt estructurado y un `AGENTS.md`, y el `pro` mal equipado que recibe un prompt vago y nada más. Mira el coste, luego los cuatro criterios y después los diffs.
:::

Esperamos que el primero gane, conforme a la tesis de Addy Osmani según la cual *« a decent model with a great harness beats a great model with a bad harness »*, que es también la de toda esta formación.

No obstante, esta comparación puede fallar, y que falle en tu caso sería un resultado a anotar más que un incidente que ocultar, ya que un modelo claramente más capaz puede absorber un contexto descuidado y es útil saber a partir de qué diferencia de capacidad esto se vuelve cierto. La cuestión merece ser planteada de nuevo con cada nueva generación de modelos.

## Generalizar

Cinco principios sobreviven a Pi, a `opencode-go` y a la versión de los paquetes que acabas de instalar.

**Lo que es estable delante, lo que varía detrás.** El caché solo funciona con un prefijo invariable y cuesta cincuenta veces menos que la entrada, por lo que cualquier dato volátil colocado al principio del contexto, ya sea una marca de tiempo, un estado de git o una fecha, invalida todo lo siguiente.

**Decir cuándo detenerse es la mitad de un buen prompt.** Nuestras ejecuciones han fallado más a menudo por desbordamiento que por incompetencia, y un criterio de parada explícito cuesta una frase para evitar tener que releer un diff completo.

**El archivo de reglas es una check-list, no una guía de estilo.** Entra en el contexto en cada turno, lo que lo hace potente y costoso, de ahí el interés de mantenerlo corto, basar cada regla en un fallo observado y refactorizarlo en lugar de alargarlo. Un presupuesto de líneas sigue siendo la forma más sencilla de mantenerlo así.

**Un ajuste expuesto no es un ajuste comprendido.** Entre la bandera que escribes y la petición que se envía hay código y tablas de correspondencia, como muestra `--thinking medium`, que no existe en la mitad de los modelos sin que nada te advierta.

**Un agente es ruidoso, y sin repeticiones no mides nada.** Hemos observado un factor de 4 entre dos ejecuciones idénticas, lo que hace que cualquier desviación inferior a este orden de magnitud sea ininterpretable. Tres repeticiones y tres números (mínimo, mediana y máximo) constituyen lo mínimo honesto.

### El caso `rtk` y el paso al acto 2

`pi-rtk-optimizer` es la extensión recomendada para dominar el contexto en Pi, ya que reescribe los comandos de `bash` hacia una herramienta dedicada y compacta las salidas de las herramientas antes de que entren en el contexto. En NÉON, no hemos podido demostrar que aporte alguna ventaja.

La razón es aritmética: `rtk` actúa sobre las salidas de las herramientas, pero las salidas de `bash` solo representan entre el 6 y el 22 % del total en este repositorio; el resto proviene de las lecturas de archivos. Un repositorio de 617 líneas no produce ni un build verboso, ni una suite de tests de diez minutos, ni un `git log` de trescientos commits, por lo que casi no hay nada que compactar.

Solo emerge un resultado, y no es el que buscábamos: la dispersión es menor con `rtk`, de ×1,33 frente a ×2,08 sin ella, lo que sugiere que la extensión haría que el agente fuera más previsible en lugar de más barato. Con tres repeticiones, no podemos afirmarlo.

Hay que recordar que un bloque de harness solo vale lo que tu carga de trabajo le dé para procesar, y que el cálculo probablemente se invertirá en un repositorio con un build verboso y una integración continua ruidosa. Sabrás cómo repetirlo, ya que tienes el banco de pruebas.

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
