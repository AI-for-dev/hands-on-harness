# La delegación: dividir el trabajo en subagentes

::: tip Objetivos de este módulo
- Saber qué recibe un subagente al crearse, qué no recibe y qué devuelve
- Escribir un agente cuya lista de herramientas limite lo que puede hacer, y verificarlo en la traza
- Sostener tú mismo el bucle explorar → planificar → codificar → evaluar sobre un ticket real
- Saber decir quién se ejecutó realmente, y con qué modelo
- Llevar el registro de las decisiones tomadas entre dos etapas, del que el módulo siguiente necesita para automatizar el bucle
:::

Ahora tenemos una visión bastante clara de lo que puede ayudarnos en el contexto principal a resolver problemas complejos, gracias en particular a los skills. Sin embargo, un skill no es más que texto, y su descripción puede ser insuficiente, incluso ineficaz, para que el modelo lo use. El skill, una vez usado, entra en el contexto junto con su resultado. Por último, no puedes ajustar con precisión las herramientas que quieres usar y las que no.

Vamos a ver, entonces, cómo lanzar sesiones de trabajo fuera del contexto principal, con la ayuda de lo que llamamos agentes, que a su vez pueden usar skills. Este módulo divide el trabajo en cuatro roles (**explorar**, **planificar**, **codificar** y **evaluar**), cada uno ejecutado en un contexto separado, con su lista de herramientas y su modelo. No emplearás ningún mecanismo de orquestación: eres tú quien lanza cada rol, quien decide qué pasa de uno a otro y quien ejecuta las pruebas entre dos. Un comando, `/step`, transmite el resultado de un agente al siguiente, pero eres tú quien elige la etapa siguiente. El módulo siguiente automatizará este bucle y, para saber qué automatizar, hay que haberlo hecho una vez a mano, anotando las decisiones tomadas entre dos etapas.

## Comprender

### Un subagente es un contexto nuevo

Un **subagente** es una sesión abierta por la sesión principal, con su propio system prompt, su propia lista de herramientas, su propio modelo y una ventana de contexto vacía al inicio. Recibe una tarea en forma de texto, trabaja y devuelve un texto final. Todo lo demás, sus lecturas de archivos, sus llamadas a herramientas y su razonamiento, desaparece cuando su sesión termina, y solo su conclusión regresa al contexto de la sesión que lo lanzó.

La primera razón para delegar es el aislamiento del contexto. El trabajo de una subtarea casi siempre es más grande que su conclusión: establecer qué archivos toca un ticket exige leer una decena de ellos, es decir, varios miles de tokens de salidas de herramientas, mientras que la nota resultante cabe en treinta líneas. Si haces este trabajo en la sesión principal, los diez archivos permanecen en tu ventana hasta el final. Si lo delegas, solo la nota entra en ella.

La segunda es la restricción de herramientas. Un skill puede pedirle al modelo que no escriba, pero nada lo obliga a ello: el estándar [Agent Skills](https://agentskills.io/specification) sí prevé un campo `allowed-tools`, que sirve para preautorizar herramientas y no para prohibir las demás, pero Pi lo ignora. Un agente cuyo repertorio no contiene ninguna herramienta de escritura no puede escribir, sea cual sea la consigna que reciba.

La tercera es la separación entre quien escribe el código y quien lo relee. Un modelo que relee el código que acaba de escribir todavía tiene en su contexto todo el razonamiento que lo llevó hasta ahí, y tiende a validar lo que quería hacer en lugar de lo que escribió realmente. Un revisor lanzado en un contexto nuevo solo conoce el ticket, el plan y el diff, y por tanto juzga el código tal como es.

### La anatomía de un agente

En Pi, la delegación no está en el núcleo de la herramienta: llega mediante [combo](https://github.com/AI-for-dev/combo), una biblioteca escrita para esta formación sobre el SDK de Pi. En combo, un **agente** se describe con un archivo Markdown. Cuando la sesión principal lo lanza, se ejecuta como subagente, y varios subagentes pueden encadenarse en un workflow escrito en TypeScript o en Markdown, lo que hará el módulo siguiente.

::: info De dónde viene combo, y qué extensiones preferirle
combo nació de las necesidades de esta formación, y sus decisiones se explican por ello. No podemos decir que esta herramienta sea una joya de diseño para pilotar subagentes. La modelamos a nuestra manera y sin duda evolucionará según nuestros usos futuros hasta convertirse quizá algún día en algo útil para construir pipelines complejos. Ante todo queríamos que pudieras leer en detalle los intercambios de los subagentes y escribir fácilmente workflows complejos.

Su integración con [herdr](https://herdr.dev) da un panel por subagente, para ver el trabajo hacerse en lugar de esperar frente a un contador. También añadimos orquestadores para componer pipelines más ricos que una llamada aislada. Y como todo lo demás en la formación mide, una ejecución cuenta allí el tiempo y los tokens de cada subagente, y se exporta entera en HTML legible y en JSONL rejugable. Estas medidas no requieren ninguna instrumentación, porque los subagentes corren en el proceso de Pi, a través de su SDK, y Pi ya conoce el tiempo y los tokens de cada llamada.

Recordamos que combo no es por ahora una biblioteca de producción, y varias extensiones del ecosistema Pi están más probadas para un uso cotidiano.

El [ejemplo `subagent` del repositorio de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) es el punto de comparación más directo: los mismos archivos markdown en los mismos directorios, y tres modos, single, parallel y chain. Lanza cada subagente en un proceso `pi` distinto, y cuando `model:` está ausente, el subagente hereda el modelo de la sesión que lo llama. combo, en cambio, recurre a tus ajustes: la advertencia de la siguiente sección describe por tanto a combo y no a Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) es el más logrado de los tres para un uso habitual. Se instala con un comando, `pi install npm:pi-subagents`, y entrega agentes listos para usar (`scout`, `researcher`, `reviewer`, `oracle`) allí donde combo te pide escribir los tuyos. Añade tareas de fondo, que continúan en un proceso separado mientras trabajas, y workflows guardados.

[pi-envoy](https://github.com/jmnargi/pi-envoy) aborda el problema desde la gobernanza. Cada hijo recibe un contrato de delegación antes de empezar, con su objetivo, su alcance, sus criterios de aceptación y sus comandos de verificación, y el padre dispone de un panel en la terminal, un bus de mensajes entre agentes, presupuestos en dólares y de lo necesario para detener a un hijo en plena ejecución.

Si montas una cadena de la que dependes, parte de una de estas tres. Conservamos combo aquí por razones pedagógicas: sus agentes son archivos markdown que lees por completo, la restricción de herramientas se verifica en la traza, y lo que hace la biblioteca sigue siendo visible. Todo lo que el módulo establece se traslada a los demás.
:::

La biblioteca se usa de dos maneras, desde un script o desde Pi a través de su **extensión**, cargada con `-e`, que registra una herramienta `subagent` que el modelo de la sesión principal puede llamar. Para el modelo, lanzar un subagente es por tanto una llamada de herramienta como cualquier otra, igual que `read` o `edit`. combo también proporciona nueve orquestadores (`chain`, `fanOut`, `loop`, `orchestrate`...) que encadenan varios agentes automáticamente. Este módulo no usa ninguno: lanzas un agente a la vez, y eres tú quien pasa de uno a otro.

Un agente se define en un archivo markdown cuya estructura recuerda a la de un skill. Este es el agente completo más pequeño:

```markdown
---
name: reader
description: Reads one file and reports what it exports
tools: read
model: ilaas/gemma-4-31b
---

You read the file you are given and list its exported symbols,
one per line, with the line number. Nothing else.
```

El encabezado da el nombre, la descripción, el modelo y la **panoplia**, es decir, la lista de herramientas de las que dispone el agente (`tools:`). El cuerpo del archivo se convierte en el system prompt del subagente. A diferencia de un skill, que el modelo puede no abrir nunca, este texto siempre se lee. La línea `tools:` fija por su parte las únicas herramientas que el subagente puede llamar: `reader` puede leer, pero no tiene ninguna forma de escribir, sea cual sea la tarea que se le dé.

Un archivo que omite `tools:` obtiene la panoplia en solo lectura, `read, grep, find, ls`, que es el valor por defecto adecuado para todo lo que explora. No obstante, siempre declaramos la lista, para que se vea al leer el archivo lo que el agente puede hacer.

::: warning Estructura de los archivos de agente
El primer ejemplo de archivo markdown que presentamos corresponde a la estructuración clásica de un subagente que también encontrarás en otros harness como Claude Code, Codex, OpenCode o Cursor. Por tanto, no está ligado a la biblioteca `combo` de la que hablamos más arriba.

Los campos presentados a continuación son propios de combo. Las demás herramientas ignoran en principio los campos que no conocen, por lo que un archivo que los contenga sigue siendo utilizable en otros sitios.
:::

En combo, tenemos campos adicionales en los metadatos. El campo `lifetime` regula la duración de vida del subagente. Con `task`, el valor por defecto, el subagente se crea para una tarea y desaparece al final de esta; con `workflow`, conserva su contexto de una iteración a otra de un workflow. Este módulo usa `task` en todas partes.

Un subagente no hereda nada de tu entorno: ni extensiones, ni skills, ni archivos de contexto. Solo ve su definición, completada con una sola línea que le dice dónde se encuentra. Su comportamiento no depende, por tanto, de tu configuración personal, y todo lo que necesita saber pasa por su prompt o por la tarea que le das. Si necesitas proporcionar skills a tu agente, puedes hacerlo añadiendo la lista en un campo `skills`. Este campo existe también en Claude Code, pero no necesariamente en los demás harness. Atención: si no pones la herramienta `read` en el conjunto de herramientas y rellenas `skills`, el agente fallará porque no podrá leer los skills.

Los archivos de agentes del proyecto viven en `.pi/agents/`, los de tu máquina en `~/.pi/agent/agents/`, y la extensión aporta sus propios agentes de demostración. Un agente puede llevar el mismo nombre en los dos directorios, y combo te deja elegir cuál usar.

::: warning Un agente sin `model:` se ejecuta con los ajustes del día
El modelo de un subagente nunca se hereda de la sesión padre. Proviene de un argumento pasado a la llamada, en su defecto del archivo de pipeline, en su defecto del encabezado del agente y, en último recurso, de los ajustes de Pi: el más cercano al trabajo prevalece. Un agente que no declara nada y se lanza sin argumento se ejecuta entonces con tu `~/.pi/agent/settings.json`, es decir, con lo que haya en él ese día.
:::

::: warning Tus agentes de proyecto nunca se cargan por defecto
Los archivos de `.pi/agents/` vienen del repositorio que has clonado, y otra persona pudo haberlos escrito. combo solo los carga si lo pides, precisando el alcance (proyecto o máquina) en cada llamada a la herramienta.

Puedes obtener la lista de tus agentes mediante el comando:

```
/agents
```
:::

::: warning Ver la actividad de tus agentes
La idea de este módulo es descomponer la orquestación y ver a los subagentes trabajar. Aunque con combo puedes ver la traza de la sesión Pi después, siempre es más agradable ver los eventos en directo. Para ello, puedes usar herdr.

Deberás entonces lanzar tu sesión Pi en herdr y luego teclear esta línea:

```
/herdr on
```

para que todo subagente en combo abra su propia ventana.
:::

## Reconstruir

### La tarea: el ticket #2

Toda la parte práctica se centra en el **issue #2** de NÉON: la colisión se describe como lenta y enredada en el renderizado, y el ticket pide identificar el camino crítico y optimizar sin cambiar la API pública. Al leer el archivo `game/neon.js`, comprobarás que el bucle sobre los ladrillos de `frame()` hace la colisión, la puntuación y el dibujo en el mismo cuerpo, de modo que nada de ello es testeable por separado. El resultado esperado es una función **pura**, extraída de `frame()` y cubierta por tests nuevos, sin que ninguno de los exports de `game/neon.js` cambie de nombre ni de firma.

La ruta elegida aquí es muy clásica y probablemente la encontrarás en las «software factories». Verás funcionar varios roles en la fase de resolución de este bug y te formarás tu propia opinión sobre el impacto de cada uno. Proponemos cuatro, pero con el uso quizá te parezcan demasiados. De nuevo, este módulo te permite ser el actor principal y modelar tu harness como quieras.

El marco no cambia: solo se pueden modificar `game/neon.js` y `game/neon.test.js`, las pruebas nuevas van en la suite y en ningún otro lugar, y `npm test` debe terminar en verde. Recordamos que es una restricción fuerte que está aquí únicamente para probar la obediencia del modelo.

### Definición de los cuatro roles

El ticket pasa sucesivamente entre cuatro agentes. Cada uno recibe el resultado del anterior, produce un único entregable y solo dispone de las herramientas necesarias para producirlo. Ninguno de los cuatro tiene shell: entre `coder` y `reviewer`, eres tú quien lanza las pruebas.

| agente     | recibe                                 | entrega                                   | conjunto de herramientas            | lo que su conjunto de herramientas le prohíbe |
| ---------- | -------------------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- |
| `explorer` | el ticket                              | una nota de impacto                       | `read, grep, find, ls`              | modificar cualquier cosa        |
| `planner`  | el ticket y la nota de impacto         | un plan en pequeños pasos                 | `read, grep, find, ls`              | modificar cualquier cosa        |
| `coder`    | **un** paso del plan                   | el código y la prueba de ese paso         | `read, grep, find, ls, edit, write` | lanzar un comando               |
| `reviewer` | el paso, el diff y la salida de las pruebas | `APPROVED` o `CHANGES REQUESTED`, justificado | `read, grep, find, ls, verdict`     | corregir lo que relee           |

Los cuatro archivos están versionados en `scripts/agents/`, y los copiarás en el `.pi/agents/` de tu clon de NÉON. El texto completo de cada agente está plegado bajo su descripción.

#### `explorer`: decir qué tocará el ticket

`explorer` recibe el ticket y entrega una **nota de impacto** en cuatro partes: los lugares del código que tocará la modificación, con el archivo y las líneas; lo que depende de esos lugares (llamadores, pruebas, imports); lo que el ticket deja abierto; y lo que no debe moverse, en particular los exports que importan las pruebas. No propone una corrección, ya que es el trabajo de `planner` y luego de `coder`. Su prompt también le advierte que el autor de los tickets de este repositorio a veces se ha equivocado sobre la ubicación del código, para que verifique en los archivos lo que afirma el ticket en lugar de copiarlo. Con sus únicas herramientas de lectura, no puede modificar nada, ni siquiera por error.

::: details El agente `explorer`

<<<@/../scripts/agents/explorer.md{md}

:::

#### `planner` : dividir el trabajo en pasos pequeños

`planner` recibe el ticket y la nota de impacto, y devuelve un **plan**, es decir, una lista ordenada de pasos. Cada paso indica qué hay que hacer, los únicos archivos que puede tocar, el test rojo que hay que escribir primero, y un criterio de fin que puedes verificar con `npm test`. Un paso debe ser lo bastante pequeño para que `coder` lo termine en una sola invocación, y el prompt da una regla simple: «si dudas, divide». Esta restricción viene del [módulo 3.1](./act3-contexte), donde cuatro ejecuciones de veinte escriben los tests rojos que pide un ticket largo, y luego se detienen sin abrir nunca `game/neon.js`. Si un paso añade un export a `game/neon.js`, `planner` debe escribirlo en una línea `api:`, para que `reviewer` pueda pronunciarse.

::: details El agente `planner`

<<<@/../scripts/agents/planner.md{md}

:::

#### `coder` : ejecutar un paso, y solo uno

`coder` recibe **un solo paso** del plan. Escribe primero el test en `game/neon.test.js`, luego la modificación más pequeña de `game/neon.js` que debería hacerlo pasar, y termina con un breve informe: los archivos tocados, el nombre del test y lo que no ha podido hacer. Es el único de los cuatro que puede escribir, pero no tiene shell, así que no puede lanzar los tests, y su prompt le prohíbe pretender que lo ha hecho. Eres tú quien lanza `npm test` después de él, y es la salida de ese comando, y no su informe, la que dice si el paso está hecho.

::: details El agente `coder`

<<<@/../scripts/agents/coder.md{md}

:::

#### `reviewer` : releer el paso sin corregirlo

`reviewer` recibe el ticket, el paso y lo que le pegues: el diff y la salida de `npm test`. No se fía del informe de `coder` y relee directamente el código del repositorio para verificar cuatro puntos en orden: los tests pasan y el nuevo test aparece en la salida, los exports de `game/neon.js` no han cambiado, solo se han tocado los archivos previstos por el paso, y el nuevo test realmente restringe el resultado. Devuelve `APPROVED` o `CHANGES REQUESTED`, con un motivo por línea que cita un archivo y una línea. Cuando combo le proporciona la herramienta `verdict`, registra su decisión con esa herramienta en lugar de escribirla en el texto. Nunca corrige él mismo, porque nadie releería sus correcciones. Si es el paso del plan el que está mal concebido, lo dice, y entonces es a `planner` a quien vuelves.

::: details El agente `reviewer`

<<<@/../scripts/agents/reviewer.md{md}

:::

Otros dos archivos, `tester.md` y `auditor.md`, se encuentran en el mismo directorio y se copiarán con los cuatro roles. Este módulo no los usa. El módulo siguiente sí los usa: `tester` produce un plan de tests que `planner` puede recibir además de la nota de impacto, y `auditor` relee el trabajo una vez terminado.

::: info Ejercicio (en sala)
Antes de lanzar el bucle, verifica que cada agente conoce los límites de su panoplia. Instala la extensión y deposita los agentes:

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi
```

La extensión no añade ningún comando explícito para llamar a un agente: `subagent` es una herramienta que el modelo de la sesión principal llama cuando se lo pides. Basta con que nombres el agente y lo que quieres que haga. Así que llama a `explorer` así:

```
utilise le subagent "explorer" pour la tâche "Nomme exactement les outils dont tu disposes."
```

Esto es lo que devolvió el nuestro:

> « Dispongo de las siguientes herramientas:
> `read`: leer el contenido de un archivo. `grep`: buscar un patrón en el contenido de los archivos. `find`: buscar archivos según un patrón (glob). `ls`: listar el contenido de un directorio. »

La lista no contiene ninguna herramienta de escritura, y es el propio agente quien lo enuncia.

Haz lo mismo con `coder`, pidiéndole esta vez que lance las pruebas:

```
utilise le subagent "coder" pour la tâche "Lance `npm test` et rapporte le résultat."
```

> « El subagente "coder" indica que no dispone de una herramienta que le permita ejecutar comandos shell y, por tanto, no puede lanzar npm test. »

Estas dos citas son las salidas de dos ejecuciones, y las tuyas serán distintas: un modelo reformula de una vez a otra, y el [módulo 3.0](./act3-trysquare) ha cifrado esa dispersión. El contenido, en cambio, sigue siendo el mismo: `explorer` enumera cuatro herramientas de lectura, y `coder` responde que no puede lanzar las pruebas.
:::

::: warning Elección del modelo
También puedes indicar en tu petición el modelo que quieres usar, como en el siguiente prompt:

```
utilise le subagent "coder" avec le modèle deepseek-v4-flash d'ilaas pour la tâche "Lance npm test et rapporte le résultat."
```
:::

### La vuelta al bucle, a mano

Ahora asumes el papel de orquestador que el módulo siguiente automatizará. Abre la sesión principal con la extensión cargada y recorre la cadena paso a paso con `/step`. Este comando forma parte de combo. Si no lo tienes en la consola de Pi, es que no está bien instalado.

Este comando `/step <agent> <instruction>` lanza el agente que nombras sobre lo que escribes, más la salida del paso anterior (esto se hace automáticamente). Su respuesta se **escribe en la transcripción sin entrar en el contexto del modelo**: la sesión principal ve desfilar los informes sin leerlos, y por tanto sin poder actuar sobre ellos. Si la sesión principal leyera el informe de exploración, podría elegir por sí misma lo que sigue a partir de conclusiones que no has validado, mientras que lo que queremos es que seas tú quien decida el paso siguiente. La ventana principal te sirve, pues, de consola, y ya no de interlocutor como en los módulos anteriores. Cuando un resultado merece discutirse con el modelo, el comando `/quote` hace entrar la salida del paso anterior en el contexto, sin copiar y pegar.

El bucle consta de seis pasos:

1. `/step explorer traite le ticket #2 d'ISSUES.md` devuelve la nota de impacto;
2. tú la lees en la transcripción, luego `/step planner` la recibe tal cual, junto con el ticket, y devuelve el plan;
3. `/step coder` recibe el plan; dale el paso 1 y nada más, dictándolo después del nombre del agente. Devuelve su informe, y sus modificaciones están en el repositorio;
4. lanzas **`npm test` tú mismo**, en una segunda terminal, y conservas la salida;
5. `/step reviewer` recibe el informe de `coder`; pégale el ticket, el paso, el diff (`git diff`) y la salida de los tests, y devuelve su veredicto;
6. según el veredicto, das el paso siguiente a `coder`, le reenvías el mismo paso con las razones del rechazo, o vuelves a `planner` si es el paso lo que está en cuestión. `/step --from <id>` parte de la salida de un paso más antiguo, lo que permite retroceder.

`/chain` lista en todo momento los pasos recorridos; `/chain reset` parte de cero en un nuevo directorio. La herramienta, por tanto, registra el orden de las etapas en tu lugar, pero no las razones de tus elecciones.

Mientras un subagente trabaja, aparece un punto sobre el prompt con su modelo, sus tokens y un cronómetro, y la línea de herramienta de debajo conserva el rastro de la llamada. Con herdr y `/herdr on`, descritos más arriba, cada subagente tiene su propia pestaña, y ves a `explorer` leer mientras preparas la tarea siguiente. Esta vista permite seguir el trabajo, pero para concluir cualquier cosa hay que leer la traza de la etapa.

Durante el bucle, lleva un diario de las decisiones que tomas entre dos etapas y del criterio que te hizo decidir. Anota, por ejemplo, por qué devolviste un paso a `coder`, por qué volviste a `planner`, o qué releíste antes de decidir. El módulo siguiente se servirá de ello para escribir el orquestador, ya que cada decisión anotada es una regla que deberá aplicar por sí solo.

::: info Ejercicio (en sala)
Recorre el bucle hasta el primer `APPROVED`, es decir, hasta que el paso 1 del plan esté entregado, probado y revisado. Si `reviewer` rechaza, llega hasta el final del rechazo: es el caso más instructivo, porque debes decidir a quién devolver el veredicto.

Si la sesión lo permite, continúa hasta el final del plan. El criterio final es el del ticket: la función extraída es pura y está cubierta por al menos dos tests nuevos en la suite, todas las funciones exportadas de `game/neon.js` lo siguen estando, y `npm test` está en verde.
:::

### Lo que el aislamiento cambia en tu ventana

::: info Ejercicio (en sala)
Justo después del retorno de la nota de `explorer`, teclea `/session` en la sesión principal y anota lo que contiene: tu marco, la llamada de herramienta, la nota. Abre después una sesión nueva sin la extensión y pide al modelo que produzca él mismo la misma nota de impacto, leyendo el repositorio. Compara los dos `/session`, y luego los dos `/tree`.

Dans la seconde session, chaque fichier lu est resté dans la fenêtre et y restera jusqu'à la fin, alors que la première n'a reçu que la note. Avec la délégation, les fichiers lus par `explorer` restent dans son propre contexte, qui disparaît à la fin de sa tâche. C'est le mécanisme vu au [module 2.1](./act2-contexte) : tout ce qui reste dans la fenêtre est renvoyé au modèle à chaque tour.
:::

### Verificar en la traza quién ha corrido

::: info Ejercicio (en sala)
Exporta la sesión principal con `/export` y localiza cada llamada a la herramienta `subagent`: el nombre del agente, el alcance, el modelo, la tarea transmitida. Es la única respuesta fiable a la pregunta de quién ejecutó si no has visto la actividad de tus agentes a través de herdr.
:::

## Generalizar

Lo que hicimos con estos cuatro agentes vale para cualquier división en roles.

Un subagente sirve ante todo para mantener ligera la ventana principal. `explorer` leyó varios archivos, y solo su nota volvió a la sesión principal. Eso solo funciona si el subagente devuelve un resultado corto: si copia todo lo que ha leído, no has ganado nada.

Para impedir que un agente haga algo, quítale la herramienta en lugar de escribirlo en su prompt. `coder` no ejecuta las pruebas porque no tiene shell, y no porque su prompt se lo pida. Una lista de herramientas se verifica leyendo el archivo del agente, mientras que nada garantiza que un modelo siga una consigna.

Haz que revise el código un agente distinto del que lo escribió. `reviewer` solo conoce el ticket, el paso y el diff, y por tanto juzga lo que se escribió y no lo que se pretendía. Déjalo sin herramienta de escritura, de lo contrario nadie revisaría sus propias modificaciones.

Declara todos los campos de un agente, incluso cuando el valor por defecto te sirva. Sin `model:`, el agente se ejecuta sobre el modelo configurado ese día en tus ajustes; sin `tools:`, recibe las herramientas de lectura; sin `name`, no se carga en absoluto.

Divide el trabajo en pasos lo bastante pequeños para que un agente los termine. El reparto en roles no le da más capacidad al modelo, y un `coder` que recibiera el plan entero de golpe podría perder el hilo como en el [módulo 3.1](./act3-contexte). Suponemos que los pasos pequeños dan un mejor resultado, y el módulo siguiente permite medirlo.

Por último, haz el bucle a mano antes de automatizarlo. Tu diario contiene las decisiones que el orquestador deberá tomar solo: a qué agente pasar el relevo, cuándo retroceder y con qué criterio.

::: info Ejercicio (en autonomía)
Ya puedes probar muchas combinaciones y tratar de ver su influencia en los resultados. Entre estas combinaciones, puedes:
- escribir tus propios agentes o modificar los agentes propuestos en este módulo
- añadir skills a los agentes
- cambiar los modelos y ver en particular los cambios cuando se usan modelos más grandes para las fases de plan y de validación
- ...
:::

## Entregable

Este módulo produce tres piezas.

**1. Los cuatro agentes**, versionados en el `.pi/agents/` de tu clon de NÉON, cada uno con su panoplia mínima y su `model:` declarado. El módulo siguiente los conectará al orquestador sin modificarlos.

**2. La traza de una vuelta de bucle**: la sesión principal exportada, el diff del primer paso, la salida de `npm test` que `reviewer` leyó, y tu registro de las decisiones tomadas entre dos etapas.

**3. La línea «delegación» de la ficha de decisión**:

| palanca                                    | efecto observado | ¿adoptado? | por qué |
| ------------------------------------------ | ---------------- | ---------- | ------- |
| exploración delegada a un subagente        |                  |            |         |
| restricción de herramientas (`tools:`)     |                  |            |         |
| relectura en un contexto separado          |                  |            |         |
| modelo declarado por agente (`model:`)     |                  |            |         |
| plan dividido en pequeños pasos            |                  |            |         |

::: tip Criterio de éxito
Sabes mostrar, con la traza en mano, qué agente se ejecutó en cada etapa de tu bucle, con qué herramientas y qué modelo. También sabes qué decisiones tomaste entre dos etapas, las que el orquestador del módulo siguiente deberá tomar en tu lugar.
:::

## Para ir más allá

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), sobre el orquestador y los subagentes investigadores, y sobre lo que cuesta la paralelización en tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), el contrapunto: lo que hace perder la fragmentación del contexto, y por qué a veces es preferible compartir el hilo completo.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la página que distingue workflows y agentes; el siguiente módulo pone en práctica sus patrones.
- [combo](https://github.com/AI-for-dev/combo), la biblioteca de subagentes y de workflows utilizada aquí: su documentación sobre los agentes y los ciclos de vida, y su `NEXT.md`, que enumera los escollos ya encontrados.
- [herdr](https://herdr.dev), la vista en directo de los subagentes, utilizada en este módulo y en el siguiente.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), sobre el lugar de los subagentes entre los demás bloques: reinyectar una síntesis limpia en lugar de la reflexión que la produjo.
