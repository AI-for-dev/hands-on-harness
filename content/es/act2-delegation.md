# La delegación: dividir el trabajo en subagentes

::: tip Objetivos de este módulo
- Saber qué recibe un subagente al crearse, qué no recibe y qué devuelve
- Escribir un agente cuya garantía resida en su conjunto de herramientas y verificar dicha garantía en la traza
- Gestionar tú mismo el bucle explorar → planificar → codificar → evaluar en un ticket real
- Saber decir quién se ejecutó realmente y con qué modelo, en lugar de confiar en un ✓
- Terminar con el registro de lo que la orquestación te ha enseñado, que el siguiente módulo necesitará para automatizar el bucle
:::

Los dos módulos anteriores concluyeron con dos observaciones. La primera es que cuidar el texto del prompt, indicando explícitamente el comportamiento deseado, mejora los resultados en algunas columnas. Nuestro ticket definido hace que el caso borde pase de 0/20 a 14/20 porque ISSUES.md lo describe. Sin embargo, con o sin la descripción detallada de los errores del issue #1, la corrección de "briques" es de 11/20 y 13/20 respectivamente, lo cual no es un cambio fundamental. En cambio, proporcionar los tests unitarios deseados de antemano eleva este resultado de 11/20 a 18/20 sin cambiar una sola línea del prompt. La segunda observación es que un skill solo contiene texto, sin esquema de entrada, sin función de ejecución ni barreras de permiso, por lo que nada de lo que solicita está garantizado: su instrucción de limpiar al final fue ignorada en once de cada veinte ejecuciones, y sus únicos efectos comprobados fueron desplazamientos de trabajo, nunca una mejora en la corrección.

El agente solo tiene sus límites y podemos constatar que no siempre lo logra por su cuenta. ¿Pero qué pasaría si un subagente añadiera tests unitarios pertinentes para ese agente? ¿Podríamos recuperar ese resultado de 18/20? Por lo tanto, intentaremos dividir el trabajo mediante agentes especializados en tareas concretas.

Este módulo divide el trabajo en cuatro roles (**explorar**, **planificar**, **codificar** y **evaluar**), cada uno ejecutado en un contexto separado, con su propia lista de herramientas y su modelo. No utilizarás ningún mecanismo de orquestación: tú lanzas cada rol, decides qué pasa de uno a otro y ejecutas los tests entre ambos. Un comando transporta los entregables por ti, pero ningún código elige el siguiente paso. El siguiente módulo automatizará este bucle. Pero antes de automatizar, primero hay que saber qué gestos reemplazar o organizar de forma distinta. Esta lista se elabora gestionando el bucle tú mismo, y forma parte de los entregables del módulo.

## Comprender

### Un subagente es un contexto nuevo

Un **subagente** es una sesión abierta por la sesión principal, con su propio system prompt, su propia lista de herramientas, su propio modelo y una ventana de contexto vacía al principio. Recibe una tarea en forma de texto, trabaja y devuelve un texto final. Todo lo demás, sus lecturas de archivos, sus llamadas a herramientas y su razonamiento, desaparece cuando su sesión termina, y solo su conclusión vuelve al contexto de la sesión que lo inició.

Tres propiedades de esta definición motivan la delegación.

La primera es el aislamiento del contexto. El trabajo de una subtarea es casi siempre mayor que su conclusión: determinar qué archivos afecta un ticket requiere leer una decena, es decir, varios miles de tokens de salidas de herramientas, mientras que la nota resultante cabe en treinta líneas. Si haces este trabajo en la sesión principal, los diez archivos permanecen en tu ventana hasta el final. Si lo delegas, solo la nota entra en ella.

La segunda es la restricción de herramientas. El módulo anterior mostró que una instrucción no obliga a nada, ya que la instrucción de limpieza de `SKILL.md` solo se sigue en menos de una de cada tres ejecuciones. Un agente cuyo conjunto de herramientas no incluye una herramienta de escritura no puede escribir, y la cuestión de la obediencia deja de existir.

La tercera es la separación del generador y del evaluador. Un modelo que revisa su propio trabajo tiende a ser favorable, y es comprensible: su ventana contiene todo el razonamiento que lo llevó a ese código, por lo que revisa sus intenciones en lugar de su diff. Un revisor en un contexto nuevo solo conoce el ticket, el plan y el diff, y por lo tanto es más objetivo.

### La anatomía de un agente

En Pi, la delegación no está en el núcleo de la herramienta: llega a través de [combo](https://github.com/AI-for-dev/combo), una biblioteca escrita para esta formación sobre el SDK de Pi. Un archivo Markdown se convierte allí en un **agente**, un agente se convierte en un **subagente** cuya vida útil es controlada por el llamador, y los subagentes se componen en workflows escritos en TypeScript o, una vez más, en Markdown.

::: info De dónde viene combo y qué extensiones preferir sobre él
combo nació de las necesidades de este curso, y sus decisiones se explican por ello. No podemos decir que esta herramienta sea una joya del diseño para gestionar subagentes. Lo hemos modelado a nuestra manera y seguramente evolucionará según nuestros futuros usos para quizá llegar a ser útil algún día para construir pipelines complejos. Queríamos, sobre todo, que pudieras explorar las discusiones de los subagentes y que pudieras escribir workflows complejos fácilmente.

Su integración con [herdr](https://herdr.dev) ofrece un panel por subagente, para observar el trabajo mientras ocurre en lugar de esperar ante un contador. También hemos añadido un conjunto de orquestación para crear pipelines compuestos con formas más ricas que una llamada aislada. Y, como todo lo demás en la formación, una ejecución mide el tiempo y los tokens de cada subagente, y se puede exportar completa en HTML legible y en JSONL reproducible. Si estas mediciones son posibles sin instrumentar procesos hijos, es porque los subagentes se ejecutan en el proceso de Pi, a través del SDK, y Pi ya dispone de toda esa información.

Te recordamos que combo no es, por el momento, una biblioteca de producción, y varias extensiones del ecosistema de Pi están más probadas para un uso diario.

El [ejemplo `subagent` del repositorio de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) es el punto de comparación más directo: mismos archivos markdown en los mismos directorios y tres modos: single, parallel y chain. Lanza cada subagente en un proceso `pi` distinto y, cuando `model:` no está presente, el subagente hereda el modelo de la sesión que realiza la llamada. combo, en cambio, utiliza tu configuración: por lo tanto, la advertencia de la siguiente sección describe combo y no Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) es el más avanzado de los tres para un uso habitual. Se instala con un comando, `pi install npm:pi-subagents`, y ofrece agentes listos para usar (`scout`, `researcher`, `reviewer`, `oracle`) mientras que combo te pide que escribas los tuyos. Añade tareas en segundo plano, que continúan en un proceso independiente mientras trabajas, y workflows guardados.

[pi-envoy](https://github.com/jmnargi/pi-envoy) aborda el problema desde la gobernanza. Cada hijo recibe un contrato de delegación antes de iniciar, con su objetivo, su alcance, sus criterios de aceptación y sus comandos de verificación, y el padre dispone de un panel de control en la terminal, un bus de mensajes entre agentes, presupuestos en dólares y la capacidad de detener a un hijo en curso.

Si vas a montar una cadena de la que dependas, comienza con una de estas tres. Mantenemos combo aquí por razones pedagógicas: sus agentes son archivos markdown que lees completos, la restricción de herramientas se verifica en el trazo y lo que hace la biblioteca sigue siendo visible. Todo lo que el módulo establece se puede trasladar a las demás.
:::

La biblioteca se usa de dos maneras, desde un script o desde Pi a través de su **extensión**, cargada con `-e`, que registra una herramienta `subagent` que el modelo de la sesión principal puede llamar. El subagente se añade, por lo tanto, a las herramientas de la sesión principal, al igual que `read` o `edit`, en lugar de formar un motor de orquestación al lado del harness. combo también proporciona nueve orquestadores, `chain`, `fanOut`, `loop`, `orchestrate` y los demás, de los cuales este módulo no utiliza ninguno: un agente a la vez, ya que eres tú quien gestiona el bucle entre los agentes.

Un agente se define en un archivo Markdown cuya estructura recuerda a la de un skill. Aquí tienes el agente completo más pequeño:

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

El encabezado contiene el nombre, la descripción, el **conjunto de herramientas** (`tools:`) y el **modelo**. El cuerpo se convierte en el **system prompt** del subagente: cada sesión de `reader` comienza con este texto como único marco, mientras que un skill sigue siendo un procedimiento que el modelo decide si abrir o no.

La diferencia con un skill es, por lo tanto, doble. El cuerpo se lee sin falta, y la línea `tools:` decide las herramientas que registra la sesión del subagente, de modo que un agente sin `write` no tiene forma de escribir, sea cual sea la tarea que reciba.

Un archivo que omita `tools:` obtiene el conjunto de herramientas de solo lectura, `read, grep, find, ls`, que es la configuración predeterminada correcta para todo lo que explora. No obstante, preferimos indicar las herramientas disponibles para facilitar la lectura de este archivo y de las acciones posibles de este subagente.

::: warning Estructura de los archivos de agente
El primer ejemplo de archivo Markdown que hemos introducido corresponde a la estructuración clásica de un subagente que también encontrarás en otras bibliotecas de harness como Claude, Codex, OpenCode, Cursor, ...

En el siguiente párrafo, introduciremos metadatos que son propios de combo y que no encontrarás en los demás. No obstante, estos archivos deberían funcionar igualmente con otras herramientas, ya que los metadatos no reconocidos serán simplemente ignorados.
:::

En combo, tenemos un campo adicional en los metadatos. El campo `lifetime` regula la vida útil del subagente: `task`, el valor por defecto, hace que nazca y muera con cada tarea, mientras que `workflow` hace que sobreviva de una iteración a otra. Este módulo utiliza `task` en todas partes.

Un subagente no hereda nada de tu entorno: ni extensiones, ni skills, ni archivos de contexto. Solo ve su definición, completada con una única línea que le indica dónde se encuentra. Esto es lo que hace que una ejecución sea reproducible, y es por ello que todo lo que un rol debe saber pasa por su prompt o por la tarea que le asignes. Si necesitas proporcionar skills a tu agente, puedes hacerlo añadiendo la lista en un campo `skills`.

Los archivos de agentes del proyecto están en `.pi/agents/`, los de tu máquina en `~/.pi/agent/agents/`, y la extensión trae sus propios agentes de demostración. Es posible tener el mismo nombre de agente global y localmente, y combo te permite elegir cuál quieres usar. Lo veremos más adelante.

::: warning Un agente sin `model:` funciona con los ajustes del día
El modelo de un subagente nunca se hereda de la sesión padre. Proviene de un argumento pasado en la llamada, en su defecto del archivo de pipeline, en su defecto del encabezado del agente y, como último recurso, de los ajustes de Pi: el más cercano al trabajo prevalece. Un agente que no declara nada y que se lanza sin argumentos funciona, por tanto, con tu `~/.pi/agent/settings.json`, es decir, con lo que haya configurado ese día.
:::

::: warning Tus agentes de proyecto nunca se cargan por defecto
`.pi/agents/` es un contenido controlado por el repositorio, por lo que sus instrucciones son instrucciones de terceros: combo se niega a cargarlas sin que se le solicite. El alcance se define en cada llamada a la herramienta.

Puedes obtener la lista de tus agentes mediante el comando:

```
/agents
```
:::

::: warning Ver la actividad de tus agentes
La idea de este módulo es descomponer la orquestación y ver a los subagentes trabajar. Aunque con combo es posible ver el rastro de la sesión de Pi a posteriori, siempre es más agradable ver los eventos ocurrir en directo. Para ello, puedes usar herdr.

Entonces deberás lanzar tu sesión de Pi en herdr y escribir esta línea

```
/herdr on
```

Para que cada subagente en combo abra su propia ventana.
:::

## Reconstruir

### La tarea: el ticket #2

Toda la parte práctica se centra en la **issue #2** de NÉON: la colisión se describe como lenta y confusa en el renderizado, y el ticket pide identificar la ruta crítica y optimizarla sin cambiar la API pública. Al leer el archivo `game/neon.js`, verás que el bucle sobre los ladrillos de `frame()` gestiona la colisión, la puntuación y el dibujo en el mismo cuerpo, de modo que nada de esto se puede probar por separado. El resultado esperado es una función **pura**, extraída de `frame()` y cubierta por pruebas nuevas, sin que ninguno de los exports de `game/neon.js` cambie de nombre ni de firma.

Este ticket es adecuado para este módulo por dos razones. La primera es que cada rol tiene un entregable falsable: una nota de impacto se verifica abriendo los archivos que cita, un plan se verifica paso a paso, un diff se verifica ejecutando la suite de pruebas y un veredicto se verifica contrastándolo con la lista de exports. La segunda es que el ticket afirma algo que no mide, ya que "la colisión es lenta" es una frase del mantenedor y no una cifra. Por lo tanto, es necesario verificar que sea cierto y dónde ocurre.

El marco no cambia: solo se pueden modificar `game/neon.js` y `game/neon.test.js`, las pruebas nuevas van en la suite y en ningún otro lugar, y `npm test` debe terminar en verde.

### Cuatro roles y lo que cada uno tiene permitido hacer

| agente | entregable | herramientas | lo que sus herramientas le prohíben |
| -------- | ----------------------------------------- | ----------------------------------- | ------------------------------- |
| `explorer` | una nota de impacto | `read, grep, find, ls` | escribir cualquier cosa |
| `planner` | un plan de pasos cortos | `read, grep, find, ls` | escribir cualquier cosa |
| `coder` | el diff de **un** paso del plan | `read, grep, find, ls, edit, write` | ejecutar un comando |
| `reviewer` | `APPROVED` o `CHANGES REQUESTED`, justificado | `read, grep, find, ls` | corregir lo que revisa |

Los cuatro archivos están versionados en `scripts/agents/` y se copian en el `.pi/agents/` de tu clon de NÉON. Aquí los tienes, con las decisiones de redacción que se aplican a cualquier división de roles.

<<<@/../scripts/agents/explorer.md{md}

El explorador entrega una nota y no una opinión, y su última sección se lo recuerda: una nota que contiene también la corrección deja de ser una nota. Su system prompt le indica además que los tickets de este repositorio están escritos por un mantenedor que a veces se ha equivocado en la ubicación del código, lo cual es cierto y basta para que la nota verifique en lugar de copiar.

<<<@/../scripts/agents/planner.md{md}

El planificador aplica la lección del módulo sobre el contexto: un modelo tiene un presupuesto, y describir más trabajo no lo amplía. Cada paso del plan debe, por tanto, caber en una invocación del coder, con su regla de división explícita: «si dudas, divide». Cada paso comienza con su test rojo, y los tests van directamente a la suite, que es el corte exacto que la revisión del procedimiento del módulo anterior tuvo que hacer para vaciar sus columnas en fallo.

<<<@/../scripts/agents/coder.md{md}

El coder tiene herramientas para escribir y nada para ejecutar, y su system prompt lo establece: no ejecuta los tests, no pretende haberlo hecho, eres tú quien los ejecuta después de él. Podríamos haberle dado un shell, y el ejercicio siguiente muestra lo que su ausencia garantiza.

<<<@/../scripts/agents/reviewer.md{md}

El revisor nunca corrige, porque un revisor que corrige se convierte en un segundo coder cuyo trabajo ya no se revisa. Sus cuatro verificaciones están ordenadas, la más mecánica primero, y dos de ellas se centran en el árbol en lugar del diff, porque un diff muestra lo que ha cambiado sin mostrar lo que el cambio ha olvidado. Su veredicto, finalmente, puede señalar el plan en lugar del código, en cuyo caso volverás al planificador.

Otros dos archivos, `tester.md` y `auditor.md`, se encuentran junto a los cuatro roles y se copiarán con ellos. No desempeñan ningún papel en el bucle de este módulo: el primero es el candidato natural para el lanzamiento en paralelo del siguiente módulo, y el segundo revisará allí el trabajo terminado en su conjunto.


::: warning Uso de herdr
Para seguir las actividades de los subagentes, te recomendamos encarecidamente que inicies Pi desde herdr (https://herdr.dev/). combo sabe abrir ventanas de herdr para ver los subagentes trabajando y cerrarlas automáticamente cuando hayan terminado.
:::

::: info Ejercicio (en clase)
Antes de lanzar cualquier cosa, haz que cada agente enuncie su propia garantía. Instala la extensión y despliega los agentes:

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi
```

La extensión no añade un comando explícito para llamar a un agente: `subagent` es una herramienta que el modelo de la sesión principal llama cuando se lo pides. Solo tienes que nombrar al agente y lo que quieres que haga. Pide al explorador de esta manera:

```
utilise le subagent "explorer" pour la tâche "Nomme exactement les outils dont tu disposes."
```

Esto es lo que el nuestro devolvió:

> « Dispongo de las siguientes herramientas:
> `read`: leer el contenido de un archivo. `grep`: buscar un patrón en el contenido de los archivos. `find`: buscar archivos según un patrón (glob). `ls`: listar el contenido de un directorio. »

La lista no contiene ninguna herramienta de escritura, y es el propio agente quien lo enuncia.

Haz lo mismo con el codificador, pidiéndole esta vez que ejecute las pruebas:

```
utilise le subagent "coder" pour la tâche "Lance `npm test` et rapporte le résultat."
```

> « El subagente "coder" indica que no dispone de una herramienta que le permita ejecutar comandos de shell y, por lo tanto, no puede ejecutar npm test. »

Estas dos citas son las salidas de dos ejecuciones, y las tuyas serán diferentes: un modelo reformula cada vez, y el módulo sobre el contexto ha cuantificado esta dispersión. Lo que se reproduce es el fondo: el explorador enumerando cuatro herramientas de lectura y el codificador devolviendo las pruebas al orquestador.
:::

::: warning Elección del modelo
También puedes indicar en tu petición el modelo que deseas utilizar, como en el siguiente prompt:

```
utilise le subagent "coder" avec le modèle deepseek-v4-flash d'opencode-go pour la tâche "Lance npm test et rapporte le résultat."
```
:::

### El ciclo del bucle, a mano

Ahora asumes el rol de orquestador que el siguiente módulo automatizará. Abre la sesión principal con la extensión cargada y recorre la cadena paso a paso con `/step`.

Este comando `/step <agent> <instruction>` lanza al agente que nombres sobre lo que escribas, más la salida del paso anterior. Su respuesta queda **escrita en la transcripción sin entrar en el contexto del modelo**: la sesión principal ve pasar los informes sin leerlos, por lo que no puede actuar sobre ellos. Esa es la diferencia clave aquí. Una sesión que lee un informe de exploración se convierte en un orquestador que tú no controlas y que decide los siguientes pasos basándose en conclusiones que no has validado. Sin embargo, queremos que seas tú quien decida cuál es el siguiente paso. Por lo tanto, la ventana principal es tu consola y no un interlocutor, como has visto hasta ahora. El comando `/quote` permite introducir el resultado del paso anterior en el contexto, lo que te permite hacer un copiar y pegar rápido cuando haya algo que discutir.

La secuencia consta de seis pasos:

1. `/step explorer traite le ticket #2 d'ISSUES.md` devuelve la nota de impacto;
2. lo lees en la transcripción y luego `/step planner` lo recibe tal cual, junto con el ticket, y devuelve el plan;
3. `/step coder` recibe el plan; dale el paso 1 y nada más, dictándolo después del nombre del agente. Devuelve su informe y el diff queda en el árbol;
4. lanzas **`npm test` tú mismo**, en una segunda terminal, y guardas la salida;
5. `/step reviewer` recibe el informe del coder; pega ahí el ticket, el paso, el diff (`git diff`) y la salida de las pruebas, y devuelve su veredicto;
6. según el veredicto: siguiente paso al coder, retorno al coder con los motivos, o retorno al planner si el problema está en el paso. `/step --from <id>` retoma la salida de un paso anterior al último, que es exactamente la acción de retroceder.

`/chain` lista en cualquier momento los pasos recorridos; `/chain reset` comienza de cero en un nuevo directorio. Por lo tanto, el registro que llevabas a mano para el orden de los pasos ya lo gestiona la herramienta, lo que te permite escribir solo la parte que ella no puede ver: tus decisiones.

Mientras un subagente trabaja, aparece un punto sobre el prompt con su modelo, sus tokens y un cronómetro, y la línea de herramienta debajo mantiene el rastro de la llamada. Si [herdr](https://herdr.dev) se ejecuta en tu máquina, `/herdr on` asigna a cada subagente su propia pestaña y puedes ver al explorer leyendo mientras preparas la siguiente tarea. Esta vista sirve para seguir el trabajo mientras se realiza, sin permitirte concluir nada: para ello, necesitarás el rastro del paso anterior.

Mientras realizas estas acciones, lleva un registro de lo que `/chain` no puede ver: no el orden de los pasos, que ya registra, sino lo que decidiste entre uno y otro y bajo qué criterio. ¿Por qué este paso en lugar del siguiente?, ¿por qué este retorno al planner?, lo que releíste antes de decidir. Este registro enumera lo que el orquestador del siguiente módulo deberá saber hacer, y estás en la mejor posición para escribirlo ya que habrás tomado cada decisión tú mismo.

::: info Ejercicio (en sala)
Ejecuta el bucle hasta el primer `APPROVED`, es decir, hasta que el paso 1 del plan sea entregado, probado y revisado. Si el reviewer lo rechaza, sigue el rechazo hasta el final: es la parte más instructiva del bucle, porque te obliga a decidir a quién devolver el veredicto.

Si la sesión lo permite, continúa hasta el final del plan. El criterio final es el del ticket: la función extraída es pura y está cubierta por al menos dos tests nuevos en la suite, todas las funciones exportadas de `game/neon.js` siguen siéndolo, y `npm test` esté en verde.
:::

### Lo que el aislamiento cambia en tu ventana

::: info Ejercicio (en sala)
Justo después de recibir la nota del explorer, escribe `/session` en la sesión principal y anota lo que contiene: tu contexto, la llamada a la herramienta, la nota. Luego, abre una sesión nueva sin la extensión y pide al modelo que produzca la misma nota de impacto por sí mismo, leyendo el repositorio. Compara los dos `/session` y luego los dos `\tree`.

En la segunda sesión, cada archivo leído permaneció en la ventana y seguirá allí hasta el final, mientras que la primera solo introdujo la nota. La delegación paga la exploración en un contexto que desaparece una vez entregada la tarea, en lugar de pagarla en cada turno en la ventana principal. El argumento es el mismo que para la lectura de caché del módulo sobre el contexto: un trabajo se paga en cada turno mientras permanezca en la ventana, y una sola vez cuando no entra en ella.
:::

### Verificar en el rastro quién se ejecutó

::: info Ejercicio (en sala)
Exporta la sesión principal con `\export` y busca cada llamada a la herramienta `subagent`: el nombre del agente, el alcance, el modelo, la tarea transmitida. Es la única respuesta fiable a la pregunta de quién se ejecutó si no has visto la actividad de tus agentes a través de herdr.
:::


### ¿Por qué este módulo no publica una matriz?

Los dos módulos anteriores basaron sus afirmaciones en veinte repeticiones, y este no publica ninguna. Esta ausencia es deliberada. Queríamos, sobre todo, mostrarte cómo funciona la delegación y lo que puede aportarte respecto al tamaño de tu contexto o a la verificación de los cambios en un contexto nuevo.

También has podido ver que es fácil controlar detalladamente lo que puede hacer un agente a través de sus herramientas y definir el modelo que se desea para él.

Este módulo no puede asegurar por el momento que la división en roles mejore el resultado, es decir, que el ticket #2 procesado por este bucle se corrija mejor que el mismo ticket procesado por un solo agente. La pregunta es legítima, es una cuestión de medición. El siguiente módulo establece el protocolo que permite realizar dicha medición. Vamos a automatizar el bucle que has ejecutado manualmente y observar la calidad de los resultados.

## Generalizar

Delegar consiste en aislar un contexto para que solo devuelva la conclusión. La ventaja no radica tanto en el coste del trabajo sino en que este no permanezca en la ventana: una exploración realizada en la sesión principal se lee en cada turno hasta el final, mientras que la misma exploración delegada desaparece con su contexto y solo deja treinta líneas. Obviamente, si lo que devuelve el subagente es tan voluminoso como lo que ha leído, no has aislado nada.

La garantía de un agente proviene de su conjunto de herramientas más que de su prompt. El prompt del coder le indica que no ejecute las pruebas, pero es la ausencia de una shell lo que impide que pueda hacerlo, y el agente sabe diferenciarlo por sí mismo. Cada vez que dudes entre escribir una prohibición y retirar una herramienta, retira la herramienta: una ausencia se constata en la configuración, mientras que una prohibición supone que el modelo la siga.

Un generador no se evalúa a sí mismo. El valor de un revisor independiente radica en lo que su contexto no contiene, es decir, el razonamiento que produjo el código. Es también por eso que un reviewer que corrige destruye su propio valor, al volver a convertirse en un generador de código.

Un campo que no declares se decide en otro lugar. Un agente sin `model:` funciona con los ajustes actuales de la máquina, un archivo sin `tools:` obtiene el conjunto de herramientas en modo lectura, un archivo sin `name` no existe. La regla se aplica más allá de los agentes: para cada campo de una configuración, pregúntate qué pasa cuando está ausente y quién decide entonces por ti.

La división en roles distribuye el trabajo del modelo sin aumentarlo. El modelo que fallaba con el ticket largo fallará igual con un plan completo pasado de una sola vez. El hecho de avanzar en pasos pequeños permite obtener un trabajo de mejor calidad. Un planner que divide las tareas en bloques demasiado grandes reproduce exactamente el fallo que el módulo sobre el contexto midió.

Automatizar un bucle requiere haberlo ejecutado manualmente. Tu registro indica qué deberá enrutar el orquestador, en qué orden y bajo qué criterios decidiste los retornos. Te recordamos que construir tu propio harness requiere experiencia, y es a medida que adquieres esa experiencia como irás perfeccionando tu harness para generar confianza.

::: info Ejercicio (autónomo)
Ahora puedes probar muchas combinaciones y tratar de ver su influencia en los resultados. Entre estas combinaciones, puedes:
- escribir tus propios agentes o modificar los agentes propuestos en este módulo,
- añadir skills a los agentes,
- cambiar los modelos y ver, especialmente, los cambios al usar modelos más grandes para las fases de plan y de validación,
- ...
:::

## Entregable

Este módulo produce tres elementos.

1. Los cuatro agentes, versionados en tu repositorio, cada uno con su conjunto mínimo y su `model:` declarado. Estos son los que el siguiente módulo conectará al orquestador, sin modificarlos.
2. El registro de una vuelta del bucle: el rastro de la sesión principal exportado, el diff entregado del primer paso, la salida de `npm test` que el reviewer leyó y tu registro.
3. Las decisiones a tomar entre cada etapa: has desempeñado el papel de agente principal y organizado el flujo de trabajo. Ahora sabes qué esperar para la automatización completa del bucle.

::: tip Criterio de éxito
Sabes mostrar, rastro en mano, qué agente se ejecutó en cada etapa de tu bucle, con qué herramientas y qué modelo. Como orquestador, también has podido ver qué acciones te negarías a repetir veinte veces. Esta comprensión es importante para finalizar la automatización del primer flujo de trabajo de tu harness.
:::

## Para ir más allá

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), sobre el orquestador y los subagentes investigadores, y sobre lo que cuesta la paralelización en tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), el contrapunto: lo que se pierde con la fragmentación del contexto y por qué compartir el hilo completo es preferible a veces.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la página que distingue entre workflows y agentes; el siguiente módulo implementa sus patrones.
- [combo](https://github.com/AI-for-dev/combo), la biblioteca de subagentes y de workflows utilizada aquí: su documentación sobre agentes y ciclos de vida, y su `NEXT.md`, que enumera las trampas ya encontradas.
- [herdr](https://herdr.dev), la vista en tiempo real de los subagentes, utilizada en este módulo y en el siguiente.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), para situar a los subagentes entre los demás componentes: reinyectar una síntesis limpia en lugar de la reflexión que la produjo.
