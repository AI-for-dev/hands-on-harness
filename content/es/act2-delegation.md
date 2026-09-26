# La delegación: dividir el trabajo en subagentes

::: tip Objetivos de este módulo
- Saber qué recibe un subagente en su creación, qué no recibe y qué devuelve
- Escribir un agente cuya garantía descansa en su panoplia de herramientas, y verificar esa garantía en la traza
- Llevar tú mismo el bucle explorar → planificar → codificar → evaluar sobre un ticket real
- Saber decir quién se ejecutó realmente, y con qué modelo, en lugar de fiarte de una ✓
- Irte con la bitácora de lo que la orquestación te ha enseñado, que el siguiente módulo necesita para automatizar el bucle
:::

Los dos módulos anteriores terminaron con dos constataciones. La primera es que cuidar el texto del prompt diciendo explícitamente el comportamiento deseado mejora los resultados en algunas columnas. Nuestro ticket acotado hace pasar el caso límite de 0/20 a 14/20 porque ISSUES.md lo describe. Sin embargo, con o sin la descripción detallada de los bugs de la issue #1, la corrección "briques" es de 11/20 y 13/20 respectivamente, lo que no es un cambio sustancial. En cambio, dejar de antemano los tests unitarios que se desean hace pasar ese resultado de 11/20 a 18/20 sin modificar una línea del prompt. La segunda constatación es que un skill solo tiene texto, sin esquema de entrada, sin función de ejecución ni control de permisos, de modo que nada de lo que pide está garantizado: su consigna de hacer la limpieza al final quedó en letra muerta en once ejecuciones de veinte, y sus únicos efectos comprobados fueron desplazamientos de trabajo, nunca una mejora de la corrección.

El agente, por sí solo, tiene sus límites, y solo podemos constatar que no siempre lo logra. Pero imagina un subagente que añada tests unitarios pertinentes para ese agente: ¿podríamos volver a obtener ese resultado de 18/20? Así que vamos a intentar dividir el trabajo mediante agentes especializados en ciertas tareas.

Este módulo divide el trabajo en cuatro roles (**explorar**, **planificar**, **codificar** y **evaluar**), cada uno ejecutado en un contexto separado, con su lista de herramientas y su modelo. No emplearás ningún mecanismo de orquestación: eres tú quien lanza cada rol, quien decide qué pasa de uno a otro y quien ejecuta los tests entre medias. Un comando transporta los entregables por ti, pero ningún código elige el siguiente paso. El siguiente módulo automatizará este bucle. Pero antes de automatizar, primero hay que saber qué pasos reemplazar o reordenar. Esta lista se establece llevando tú mismo el bucle, y forma parte de los entregables del módulo.

## Comprender

### Un subagente es un contexto nuevo

Un **subagente** es una sesión abierta por la sesión principal, con su propio system prompt, su propia lista de herramientas, su propio modelo y una ventana de contexto vacía al inicio. Recibe una tarea en forma de texto, trabaja y devuelve un texto final. Todo lo demás, sus lecturas de archivos, sus llamadas a herramientas y su razonamiento, desaparece cuando su sesión termina, y solo su conclusión regresa al contexto de la sesión que lo lanzó.

Tres propiedades de esta definición motivan la delegación.

La primera es el aislamiento del contexto. El trabajo de una subtarea casi siempre es más grande que su conclusión: determinar qué archivos afecta un ticket exige leer unos diez, es decir, varios miles de tokens de salidas de herramientas, mientras que la nota resultante cabe en treinta líneas. Si haces este trabajo en la sesión principal, los diez archivos permanecen en tu ventana hasta el final. Si lo delegas, solo la nota entra en ella.

La segunda es la restricción de herramientas. El módulo anterior mostró que una instrucción no obliga a nada, ya que la instrucción de limpieza del `SKILL.md` solo se sigue en menos de una de cada tres ejecuciones. Un agente cuyo arsenal de herramientas no incluye ninguna de escritura no puede escribir, y la cuestión de la obediencia ya no se plantea.

La tercera es la separación entre el generador y el evaluador. Un modelo que relee su propio trabajo se inclina hacia el lado favorable, y se entiende: su ventana contiene todo el razonamiento que lo condujo a ese código, de modo que relee sus intenciones en lugar de su diff. Un revisor en un contexto nuevo solo conoce el ticket, el plan y el diff, y por tanto es más objetivo.

### La anatomía de un agente

En Pi, la delegación no está en el núcleo de la herramienta: se hace a través de [combo](https://github.com/AI-for-dev/combo), una biblioteca escrita para esta formación sobre el SDK de Pi. Un archivo markdown se convierte allí en un **agente**, un agente se convierte en un **subagente** cuyo ciclo de vida está controlado por el llamante, y los subagentes se componen en workflows escritos en TypeScript o también en Markdown.

::: info De dónde viene combo, y qué extensiones preferirle
combo nació de las necesidades de este curso, y sus decisiones se explican por ello. No podemos decir que esta herramienta sea una joya de diseño para pilotar subagentes. La hemos moldeado a nuestra manera y seguramente evolucionará según nuestros usos futuros para quizás llegar a ser útil algún día para construir pipelines complejos. Sobre todo queríamos que pudieras sumergirte en las discusiones de los subagentes, que pudieras escribir workflows complejos fácilmente.

Su integración con [herdr](https://herdr.dev) ofrece un panel por subagente, para ver cómo se hace el trabajo en lugar de esperar ante un contador. También hemos añadido un conjunto de orquestación para crear pipelines compuestos de formas más ricas que una llamada aislada. Y como todo el resto de la formación mide, una ejecución cuenta allí el tiempo y los tokens de cada subagente, y se exporta por completo en HTML legible y en JSONL reproducible. Si estas mediciones son posibles sin instrumentar procesos hijos, es porque los subagentes se ejecutan en el proceso de Pi, a través del SDK, y Pi ya tiene toda esa información.

Recordamos que combo no es por ahora una biblioteca de producción, y varias extensiones del ecosistema Pi están más probadas para un uso cotidiano.

El [ejemplo `subagent` del repositorio de Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) es el punto de comparación más directo: los mismos archivos markdown en los mismos directorios, y tres modos, single, parallel y chain. Lanza cada subagente en un proceso `pi` distinto, y cuando `model:` está ausente, el subagente hereda el modelo de la sesión que lo llama. combo, en cambio, recurre a tus ajustes: la advertencia de la siguiente sección describe por tanto a combo y no a Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) es el más logrado de los tres para un uso habitual. Se instala con un comando, `pi install npm:pi-subagents`, y entrega agentes listos para usar (`scout`, `researcher`, `reviewer`, `oracle`) allí donde combo te pide escribir los tuyos. Añade tareas de fondo, que continúan en un proceso separado mientras trabajas, y workflows guardados.

[pi-envoy](https://github.com/jmnargi/pi-envoy) aborda el problema desde la gobernanza. Cada hijo recibe un contrato de delegación antes de empezar, con su objetivo, su alcance, sus criterios de aceptación y sus comandos de verificación, y el padre dispone de un panel en la terminal, un bus de mensajes entre agentes, presupuestos en dólares y de lo necesario para detener a un hijo en plena ejecución.

Si montas una cadena de la que dependes, parte de una de estas tres. Conservamos combo aquí por razones pedagógicas: sus agentes son archivos markdown que lees por completo, la restricción de herramientas se verifica en la traza, y lo que hace la biblioteca sigue siendo visible. Todo lo que el módulo establece se traslada a los demás.
:::

La biblioteca se utiliza de dos maneras: desde un script o desde Pi a través de su **extensión**, cargada con `-e`, que registra una herramienta `subagent` que el modelo de la sesión principal puede llamar. El subagente se añade así a las herramientas de la sesión principal, al igual que `read` o `edit`, en lugar de formar un motor de orquestación junto al harness. combo también proporciona nueve combinadores, `chain`, `fanOut`, `loop`, `orchestrate` y los demás, de los cuales este módulo no utiliza ninguno: un agente a la vez, ya que eres tú quien lleva el bucle entre los agentes.

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

El encabezado contiene el nombre, la descripción, el **conjunto de herramientas** (`tools:`) y el **modelo**. El cuerpo se convierte en el **system prompt** del subagente: cada sesión de `reader` comienza con este texto como único marco, mientras que un skill sigue siendo un procedimiento que el modelo decide abrir o no.

La diferencia con un skill es, por tanto, doble. El cuerpo se lee siempre, y la línea `tools:` decide qué herramientas registra la sesión del subagente, de modo que un agente sin `write` no tiene ningún medio de escribir, sea cual sea la tarea que reciba.

Un archivo que omite `tools:` obtiene el conjunto de herramientas en modo de solo lectura, `read, grep, find, ls`, que es el valor por defecto adecuado para todo lo que explora. No obstante, preferiremos incluir las herramientas disponibles para facilitar la lectura de este archivo y de las acciones posibles de este subagente.

::: warning Estructura de los archivos de agente
El primer ejemplo de archivo markdown que hemos presentado corresponde a la estructuración clásica de un subagente, que también encontrarás en otras bibliotecas de harness como Claude, Codex, OpenCode, Cursor, ...

En el párrafo siguiente, vamos a introducir metadatos que son propios de combo y que no encontrarás en las demás. No obstante, estos archivos deberían funcionar igualmente con otras herramientas, ya que los metadatos no reconocidos simplemente se ignorarán.
:::

En combo, disponemos de un campo adicional en los metadatos. El campo `lifetime` regula la duración de vida del subagente: `task`, el valor por defecto, lo hace nacer y morir con cada tarea, mientras que `workflow` le permite sobrevivir de una iteración a otra. Este módulo utiliza `task` en todos los casos.

Un subagente no hereda nada de tu entorno: ni extensiones, ni skills, ni archivos de contexto. Solo ve su definición, completada con una única línea que le indica dónde se encuentra. Esto es lo que hace que una ejecución sea reproducible, y por eso todo lo que un rol debe saber pasa por su prompt o por la tarea que le das. Si necesitas proporcionar skills a tu agente, puedes hacerlo añadiendo la lista en un campo `skills`.

Los archivos de agentes del proyecto se encuentran en `.pi/agents/`, los de tu máquina en `~/.pi/agent/agents/`, y la extensión trae sus propios agentes de demostración. Puedes tener el mismo nombre de agente a nivel global y local, y combo te permite elegir cuál quieres usar. Lo veremos más adelante.

::: warning Un agente sin `model:` se ejecuta con la configuración del día
El modelo de un subagente nunca se hereda de la sesión padre. Viene de un argumento pasado en la llamada; en su defecto, del archivo de pipeline; en su defecto, del encabezado del agente; y en último recurso, de la configuración de Pi: prevalece el más cercano al trabajo. Un agente que no declara nada y que se lanza sin argumento se ejecuta entonces con tu `~/.pi/agent/settings.json`, es decir, con lo que contenga ese día.
:::

::: warning Tus agentes de proyecto nunca se cargan por defecto
`.pi/agents/` es un contenido controlado por el repositorio, por lo que sus instrucciones son instrucciones de terceros: combo se niega a cargarlas sin que se lo pidas. El alcance se solicita en cada llamada a la herramienta.

Puedes obtener la lista de tus agentes con el comando:

```
/agents
```
:::

::: warning Ver la actividad de tus agentes
La idea de este módulo es descomponer la orquestación y ver a los subagentes trabajar. Aunque con combo puedas ver la traza de la sesión de Pi a posteriori, siempre es más agradable ver los eventos en directo. Para ello, puedes usar herdr.

Entonces tendrás que lanzar tu sesión de Pi en herdr y luego escribir esta línea

```
/herdr on
```

Para que todo subagente en combo abra su propia ventana.
:::

## Reconstruir

### La tarea: el ticket #2

Toda la parte práctica se centra en el **issue #2** de NÉON: la colisión se describe como lenta y enredada en el renderizado, y el ticket pide identificar el camino crítico y optimizar sin cambiar la API pública. Al leer el archivo `game/neon.js`, comprobarás que el bucle sobre los ladrillos de `frame()` hace la colisión, la puntuación y el dibujo en el mismo cuerpo, de modo que nada de ello es testeable por separado. El resultado esperado es una función **pura**, extraída de `frame()` y cubierta por tests nuevos, sin que ninguno de los exports de `game/neon.js` cambie de nombre ni de firma.

Este ticket se ajusta a este módulo por dos razones. La primera es que cada rol tiene un entregable falsable: una nota de impacto se verifica abriendo los archivos que cita, un plan se verifica paso a paso, un diff se verifica lanzando la suite de tests, un veredicto se verifica contra la lista de exports. La segunda es que el ticket afirma algo que no mide, ya que «la colisión es lenta» es una frase del mantenedor y no una cifra. Por lo tanto, es necesario verificar que es cierto y dónde ocurre.

El marco no cambia: solo `game/neon.js` y `game/neon.test.js` pueden modificarse, los tests nuevos van a la suite de tests y a ningún otro sitio, y `npm test` debe terminar en verde.

### Cuatro roles, y qué tiene derecho a hacer cada uno

| agente     | entregable                              | repertorio                          | lo que su repertorio le prohíbe |
| ---------- | --------------------------------------- | ----------------------------------- | ------------------------------- |
| `explorer` | una nota de impacto                     | `read, grep, find, ls`              | escribir cualquier cosa         |
| `planner`  | un plan en pequeños pasos               | `read, grep, find, ls`              | escribir cualquier cosa         |
| `coder`    | el diff de **un** paso del plan         | `read, grep, find, ls, edit, write` | ejecutar un comando             |
| `reviewer` | `APPROVED` o `CHANGES REQUESTED`, motivado | `read, grep, find, ls`              | corregir lo que revisa          |

Los cuatro archivos están versionados en `scripts/agents/` y se copian en el `.pi/agents/` de tu clon de NÉON. Aquí están, con las decisiones de redacción que se trasponen a cualquier reparto en roles.

<<<@/../scripts/agents/explorer.md{md}

El explorador entrega una nota y no una opinión, y su última sección se lo recuerda: una nota que contiene además la corrección deja de ser una nota. Su prompt le dice también que los tickets de este repositorio están escritos por un mantenedor que a veces se ha equivocado sobre la ubicación del código, lo cual es cierto, y basta para que la nota verifique en lugar de copiar.

<<<@/../scripts/agents/planner.md{md}

El planificador aplica la lección del módulo sobre el contexto: un modelo tiene un presupuesto, y describir más trabajo no lo agranda. Cada paso del plan debe caber entonces en una invocación del coder, con su regla de división explícita, «si dudas, divide». Cada paso comienza por su test en rojo, y los tests van directamente a la suite, que es el corte exacto que la revisión del procedimiento del módulo anterior había tenido que hacer para vaciar sus columnas en fallo.

<<<@/../scripts/agents/coder.md{md}

El codificador tiene con qué escribir y nada para ejecutar, y su prompt lo enuncia: no ejecuta los tests, no pretende haberlo hecho, los ejecutas tú después de él. Podríamos haberle dado una shell, y el ejercicio que sigue muestra lo que su ausencia garantiza.

<<<@/../scripts/agents/reviewer.md{md}

El verificador no corrige nunca, porque un verificador que corrige se convierte en un segundo codificador cuyo trabajo ya no se relee. Sus cuatro verificaciones están ordenadas, la más mecánica primero, y dos de ellas se centran en el árbol más que en el diff, porque un diff muestra lo que ha cambiado sin mostrar lo que el cambio ha olvidado. Su veredicto, por último, puede designar el plan en lugar del código, en cuyo caso es al planificador a quien volverás.

Otros dos archivos, `tester.md` y `auditor.md`, viven junto a los cuatro roles y se copiarán con ellos. No desempeñan ningún papel en el bucle de este módulo: el primero es el candidato natural para el lanzamiento en paralelo del módulo siguiente, el segundo releerá allí el trabajo terminado en su conjunto.


::: warning Uso de herdr
Para seguir las actividades de los subagentes, te recomendamos encarecidamente que lances Pi desde herdr (https://herdr.dev/). combo sabe abrir ventanas herdr para ver los subagentes en los que se está trabajando y cerrarlas automáticamente cuando terminan.
:::

::: info Ejercicio (en sala)
Antes de lanzar nada, haz que cada agente enuncie su propia garantía. Instala la extensión y coloca los agentes:

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi
```

La extensión no añade ningún comando explícito para llamar a un agente: `subagent` es una herramienta que el modelo de la sesión principal invoca cuando se lo pides. Basta con nombrar el agente y lo que deseas que haga. Pide, pues, al explorador así:

```
utilise le subagent "explorer" pour la tâche "Nomme exactement les outils dont tu disposes."
```

Esto es lo que devolvió el nuestro:

> « Dispongo de las siguientes herramientas:
> `read`: leer el contenido de un archivo. `grep`: buscar un patrón en el contenido de los archivos. `find`: buscar archivos según un patrón (glob). `ls`: listar el contenido de un directorio. »

La lista no contiene ninguna herramienta de escritura, y es el propio agente quien lo enuncia.

Haz lo mismo con el programador, pidiéndole esta vez que ejecute los tests:

```
utilise le subagent "coder" pour la tâche "Lance `npm test` et rapporte le résultat."
```

> « El subagente "coder" indica que no dispone de una herramienta que le permita ejecutar comandos shell y, por tanto, no puede lanzar npm test. »

Estas dos citas son las salidas de dos ejecuciones, y las tuyas serán diferentes: un modelo reformula de una ejecución a otra, y el módulo sobre el contexto ha cuantificado esta dispersión. Lo que se repite es el fondo: el explorador enumera cuatro herramientas de lectura y el programador remite los tests al orquestador.
:::

::: warning Elección del modelo
También puedes indicar en tu solicitud el modelo que deseas utilizar, como en el siguiente prompt:

```
utilise le subagent "coder" avec le modèle deepseek-v4-flash d'opencode-go pour la tâche "Lance npm test et rapporte le résultat."
```
:::

### La vuelta al bucle, a mano

Ahora desempeñas el papel de orquestador que el módulo siguiente automatizará. Abre la sesión principal con la extensión cargada y recorre la cadena un paso a la vez con `/step`.

Este comando `/step <agent> <instruction>` lanza el agente que nombres sobre lo que escribes, más la salida del paso anterior. Su respuesta se **escribe en la transcripción sin entrar en el contexto del modelo**: la sesión principal ve pasar los informes sin leerlos y, por tanto, sin poder actuar sobre ellos. Es la diferencia que importa aquí. Una sesión que lee un informe de exploración se convierte en un orquestador que no controlas y que elige lo que sigue contra conclusiones que no has validado. Ahora bien, queremos que seas tú quien decida cuál es el siguiente paso. La ventana principal es, pues, tu consola y no un interlocutor, como lo has visto hasta ahora. El comando `/quote` te permite meter el resultado del paso anterior en el contexto, lo que te facilita copiar y pegar rápidamente cuando hay algo que discutir.

El bucle consta de seis pasos:

1. `/step explorer traite le ticket #2 d'ISSUES.md` entrega la nota de impacto;
2. la lees en la transcripción, luego `/step planner` la recibe tal cual, con el ticket, y entrega el plan;
3. `/step coder` recibe el plan; dale el paso 1 y nada más, dictándolo después del nombre del agente. Entrega su informe, y el diff está en el árbol;
4. lanzas **`npm test` tú mismo**, en un segundo terminal, y guardas la salida;
5. `/step reviewer` recibe el informe del coder; pega ahí el ticket, el paso, el diff (`git diff`) y la salida de los tests, y entrega su veredicto;
6. según el veredicto: siguiente paso al coder, retorno al coder con las razones, o retorno al planner si el paso es el que está en cuestión. `/step --from <id>` retoma la salida de un paso más antiguo que el último, que es exactamente el gesto de marcha atrás.

`/chain` lista en todo momento los pasos recorridos; `/chain reset` parte de cero en un nuevo directorio. El registro que llevabas a mano para el orden de los pasos ya lo lleva la herramienta, lo que te deja escribir solo la parte que ella no sabe ver: tus decisiones.

Mientras un subagente trabaja, se muestra un punto encima del prompt con su modelo, sus tokens y un cronómetro, y la línea de herramientas debajo mantiene el rastro de la llamada. Si [herdr](https://herdr.dev) corre en tu máquina, `/herdr on` da a cada subagente su propia pestaña, y ves al explorer leer mientras preparas la siguiente tarea. Esta vista sirve para seguir el trabajo mientras se hace, sin permitirte concluir nada: para eso necesitarás el rastro del paso anterior.

Mientras haces estos gestos, lleva un diario de lo que `/chain` no puede ver: no el orden de los pasos, que ya registra, sino lo que has decidido entre un paso y otro, y según qué criterio. Por qué este paso y no el siguiente, por qué ese retorno al planner, qué has releído antes de decidir. Este diario enumera lo que el orquestador del módulo siguiente deberá saber hacer, y estás en buena posición para escribirlo, ya que habrás tomado cada decisión tú mismo.

::: info Ejercicio (en el aula)
Ejecuta el bucle hasta el primer `APPROVED`, es decir, hasta que el paso 1 del plan esté entregado, probado y revisado. Si el reviewer rechaza, juega el rechazo hasta el final: es la mitad más instructiva del bucle, porque te obliga a decidir a quién devolver el veredicto.

Si la sesión lo permite, continúa hasta el final del plan. El criterio final es el del ticket: la función extraída es pura y está cubierta por al menos dos tests nuevos en la suite, todas las funciones exportadas de `game/neon.js` lo siguen estando, y `npm test` está en verde.
:::

### Lo que el aislamiento cambia en tu ventana

::: info Ejercicio (en el aula)
Justo después de que el explorer entregue su nota, escribe `/session` en la sesión principal y anota lo que contiene: tu marco, la llamada a la herramienta, la nota. Abre luego una sesión nueva sin la extensión y pide al modelo que produzca la misma nota de impacto por sí mismo, leyendo el repositorio. Compara los dos `/session`, luego los dos `\tree`.

En la segunda sesión, cada archivo leído ha quedado en la ventana y permanecerá en ella hasta el final, mientras que la primera solo ha dejado entrar la nota. La delegación paga la exploración en un contexto que desaparece una vez entregada la tarea, en lugar de pagarla en cada turno en la ventana principal. El argumento es el mismo que para la lectura de caché del módulo sobre el contexto: un trabajo se paga en cada turno mientras permanece en la ventana, y una sola vez cuando no entra en ella.
:::

### Verificar en la traza quién ha corrido

::: info Ejercicio (en el aula)
Exporta la sesión principal con `\export` y localiza cada llamada a la herramienta `subagent`: el nombre del agente, el alcance, el modelo, la tarea transmitida. Es la única respuesta fiable a la cuestión de saber quién ha corrido si no has visto la actividad de tus agentes mediante herdr.
:::


### Por qué este módulo no publica ninguna matriz

Los dos módulos anteriores basaron sus afirmaciones en veinte repeticiones, mientras que este no publica ninguna. Esta ausencia es deliberada. Queríamos ante todo mostrarte cómo funciona la delegación y lo que puede aportarte en cuanto al tamaño de tu contexto o a la verificación de los cambios en un contexto nuevo.

También has podido ver que es fácil controlar con precisión lo que puede hacer un agente mediante sus herramientas y definir el modelo que se desee para él.

Este módulo no puede, por ahora, garantizar que la división en roles mejore el resultado, es decir, que el ticket #2 tratado por este bucle se corregiría mejor que el mismo ticket tratado por un agente solo. La pregunta es legítima, es una cuestión de medición. El siguiente módulo presenta el protocolo que permite hacer esa medición. Vamos a automatizar el bucle que ejecutaste a mano y observar la calidad de los resultados.

## Generalizar

Delegar equivale a aislar un contexto del que solo regresa la conclusión. La ganancia se debe menos al costo del trabajo que al hecho de que no permanece en la ventana: una exploración hecha en la sesión principal se relee allí en cada turno hasta el final, mientras que la misma exploración delegada desaparece con su contexto y solo deja treinta líneas. Por supuesto, si lo que devuelve el subagente es tan grande como lo que leyó, no has aislado nada.

La garantía de un agente proviene de su conjunto de herramientas más que de su prompt. El prompt del coder le dice que no lance los tests, pero es la ausencia de un shell lo que hace que no pueda hacerlo, y el propio agente sabe distinguir. Cada vez que dudes entre escribir una prohibición y retirar una herramienta, retira la herramienta: una ausencia se comprueba en la configuración, mientras que una prohibición supone que el modelo la cumpla.

Un generador no se evalúa a sí mismo. El valor de un revisor separado proviene de lo que su contexto no contiene, es decir, del razonamiento que produjo el código. Es también por eso que un reviewer que corrige destruye su propio valor, al volver a ser un generador de código.

Un campo que no declaras se decide en otro lugar. Un agente sin `model:` se ejecuta con los ajustes actuales de la máquina, un archivo sin `tools:` obtiene el conjunto de herramientas en modo de solo lectura, un archivo sin `name` no existe. La regla se aplica más allá de los agentes: para cada campo de una configuración, pregúntate qué sucede cuando está ausente y quién decide entonces en tu lugar.

La división en roles reparte el trabajo del modelo sin aumentarlo. El modelo que perdía el hilo con el ticket largo lo perderá igualmente con un plan completo pasado de una sola vez. El hecho de avanzar en pequeños pasos permite obtener un trabajo de mejor calidad. Un planner que divide en trozos demasiado grandes reproduce exactamente la pérdida de hilo que el módulo sobre el contexto midió.

Automatizar un bucle exige haberlo ejecutado a mano. Tu diario dice lo que el orquestador deberá enrutar, en qué orden y según qué criterios decidiste los retornos. Te recordamos que construir tu propio harness requiere experiencia, y es a medida que adquieres esa experiencia que irás perfeccionando tu harness para que se establezca la confianza.

::: info Ejercicio (en autonomía)
Ya puedes probar muchas combinaciones y tratar de ver su influencia en los resultados. Entre estas combinaciones, puedes:
- escribir tus propios agentes o modificar los agentes propuestos en este módulo
- añadir skills a los agentes
- cambiar los modelos y ver en particular los cambios cuando se usan modelos más grandes para las fases de plan y de validación
- ...
:::

## Entregable

Este módulo produce tres piezas.

1. Los cuatro agentes, versionados en tu repositorio, cada uno con su equipamiento mínimo y su `model:` declarado. Son estos los que el siguiente módulo conectará al orquestador, sin modificarlos.
2. El diario de una iteración del bucle: la traza de la sesión principal exportada, el diff entregado del primer paso, la salida de `npm test` que el reviewer leyó, y tu diario.
3. Las decisiones a tomar entre cada etapa: has desempeñado el papel del agente principal y organizado el flujo de trabajo. Ahora sabes qué esperar para la automatización completa del bucle.

::: tip Criterio de éxito
Sabes mostrar, con la traza en mano, qué agente se ha ejecutado en cada etapa de tu bucle, con qué herramientas y qué modelo. Como orquestador, también has podido ver qué acciones te negarías a repetir veinte veces. Esta comprensión es importante para finalizar la automatización de tu primer flujo de trabajo en tu harness.
:::

## Para ir más allá

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), sobre el orquestador y los subagentes investigadores, y sobre lo que cuesta la paralelización en tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), el contrapunto: lo que hace perder la fragmentación del contexto, y por qué a veces es preferible compartir el hilo completo.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la página que distingue workflows y agentes; el siguiente módulo pone en práctica sus patrones.
- [combo](https://github.com/AI-for-dev/combo), la biblioteca de subagentes y de workflows utilizada aquí: su documentación sobre los agentes y los ciclos de vida, y su `NEXT.md`, que enumera los escollos ya encontrados.
- [herdr](https://herdr.dev), la vista en directo de los subagentes, utilizada en este módulo y en el siguiente.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), sobre el lugar de los subagentes entre los demás bloques: reinyectar una síntesis limpia en lugar de la reflexión que la produjo.
