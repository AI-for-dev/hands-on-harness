# La delegación: dividir el trabajo en subagentes

::: tip Objetivos de este módulo
- Saber qué recibe un subagente al crearse, qué no recibe y qué devuelve
- Escribir un agente cuya garantía sea el conjunto de herramientas y verificar dicha garantía en el rastro
- Gestionar tú mismo el bucle explorer → planner → coder → reviewer en un ticket real
- Saber decir quién se ha ejecutado realmente, y con qué modelo, en lugar de creerse un ✓
- Terminar con el registro de lo que cuesta la orquestación manual, que el siguiente módulo necesitará para automatizar el bucle
:::

Las mediciones de los dos módulos anteriores han evidenciado dos limitaciones. La primera se refiere al presupuesto de trabajo del modelo: en las configuraciones que reciben el ticket delimitado, cuatro de cada veinte ejecuciones escriben los tests rojos que solicita el ticket y nunca abren el archivo fuente, y describir más trabajo en el ticket no elimina esta limitación. La segunda se refiere a la verificación: un procedimiento de trabajo modifica lo que el agente produce, pero no se ha medido ningún efecto establecido sobre la corrección en sí, y nada de lo que solicita un skill está garantizado. Estas dos limitaciones tienen una causa estructural común: todas las configuraciones medidas hasta ahora trabajan en un contexto único, donde el mismo modelo lee el repositorio, escribe el código y revisa su propio trabajo, acumulándose cada una de estas actividades en la misma ventana.

Este módulo introduce el bloque de delegación. El trabajo se divide en cuatro roles (explorer, planner, coder y reviewer), cada uno ejecutado en un contexto separado, con una lista de herramientas y un modelo propios. En este módulo no se utiliza ningún mecanismo de orquestación: eres tú quien lanza cada rol, quien transmite los entregables de uno a otro y quien ejecuta los tests entre ellos, ya que el siguiente módulo automatizará este bucle y automatizar requiere la lista de acciones a reemplazar y lo que cuesta cada una. Esta lista se establece gestionando el bucle tú mismo, y forma parte de los entregables del módulo.

Seguimos el orden habitual: comprender qué es un subagente en el harness, escribir cuatro y ejecutar el bucle en un ticket real, para luego extraer lo que sigue siendo válido cuando la herramienta cambia.

## Comprender

### Un subagente es un contexto nuevo

Un **subagente** es una sesión abierta por la sesión principal, con su propio system prompt, su propia lista de herramientas, su propio modelo y una ventana de contexto vacía al inicio. Recibe una tarea en forma de texto, trabaja y devuelve un texto final. Todo lo demás, es decir, sus lecturas de archivos, sus llamadas a herramientas y su razonamiento, desaparece cuando su sesión termina: solo su conclusión regresa al contexto de la sesión que lo lanzó.

Tres propiedades de esta definición motivan la delegación.

**El aislamiento del contexto.** El trabajo de una subtarea es casi siempre más extenso que su conclusión. Establecer qué archivos afecta un ticket requiere leer una decena de archivos, es decir, varios miles de tokens de salidas de herramientas, mientras que la nota resultante ocupa treinta líneas. Si se hace en la sesión principal, este trabajo mantiene los diez archivos en la ventana hasta el final de la sesión; si se delega, solo introduce la nota.

**La restricción de herramientas.** El módulo anterior mostró que una instrucción no obliga a nada, ya que la instrucción de limpieza de `SKILL.md` se sigue menos de una vez cada tres. Un agente cuyo conjunto de herramientas no contiene una herramienta de escritura **no puede** escribir, puesto que nada en su sesión registra dicha herramienta, y la cuestión de la obediencia deja de existir. La documentación de combo reporta el caso inverso: un ejemplo de su repositorio le daba al programador el conjunto completo pidiéndole que no modificara nada, y modificó un archivo fuente, dos veces, durante una simple demostración. Esta garantía se verifica en la traza, y es lo que permite confiar en un explorador o en un revisor.

**La separación del generador y el evaluador.** Un modelo que revisa su propio trabajo tiende a ser favorable, y es comprensible: su ventana contiene todo el razonamiento que lo llevó a ese código, por lo que revisa sus intenciones en lugar de su diff. Un revisor en un contexto nuevo solo conoce el ticket, el plan y el diff, y por lo tanto juzga el diff basándose en los hechos.

### La anatomía de un agente

En Pi, la delegación no está en el núcleo de la herramienta: llega a través de [combo](https://github.com/AI-for-dev/combo), una biblioteca construida sobre el SDK de Pi. Un archivo markdown se convierte allí en un **agente**, un agente se convierte en un **subagente** cuya vida útil es controlada por el llamador, y los subagentes se componen en workflows escritos en TypeScript. La biblioteca se utiliza de dos maneras: desde un script, o desde Pi a través de su **extensión**, cargada con `-e`, que registra una herramienta `subagent` que el modelo de la sesión principal puede llamar. El subagente se añade, por tanto, a las herramientas de la sesión principal, al igual que `read` o `edit`, en lugar de formar un motor de orquestación junto al harness. combo proporciona también nueve combinadores, `chain`, `fanOut`, `loop`, `orchestrate` y otros; este módulo no utiliza ninguno, un agente a la vez, ya que el bucle entre los agentes lo mantienes tú. Los combinadores son el tema del siguiente módulo.

Un agente se define en un archivo markdown cuya estructura recuerda la de un skill. Aquí tienes el agente completo más pequeño:

```markdown
---
name: liseur
description: Reads one file and reports what it exports
tools: read
model: ilaas/gemma-4-31b
---

You read the file you are given and list its exported symbols,
one per line, with the line number. Nothing else.
```

El frontmatter contiene el nombre, la descripción, el **conjunto de herramientas** (`tools:`) y el **modelo**. El cuerpo se convierte en el **system prompt** del subagente, y no en un procedimiento que un modelo decida o no abrir: cada sesión de `liseur` comienza con este texto como único marco. La diferencia con un skill es, por tanto, doble. El cuerpo se lee sin duda, y la línea `tools:` no es una declaración de intenciones: decide qué herramientas registra la sesión del subagente, de modo que un agente sin `write` no tiene forma de escribir, independientemente de la tarea recibida. Se añaden dos convenciones: un archivo que omite `tools:` obtiene el conjunto de herramientas en modo lectura, `read, grep, find, ls`, que es el valor predeterminado adecuado para todo lo que sea exploración; y el campo `lifetime` regula la vida útil del subagente, siendo `task` el valor por defecto, haciendo que nazca y muera con cada tarea. Este módulo utiliza `task` en todas partes; `workflow`, que permite que un subagente sobreviva de una iteración a otra, pertenece al siguiente módulo.

Un subagente no hereda nada de tu entorno: ni extensiones, ni skills, ni archivos de contexto. Solo ve su definición, completada con una única línea que le indica dónde se encuentra. Esto es lo que hace que una ejecución sea reproducible, y por eso todo lo que un rol debe saber pasa por su prompt o por la tarea que le asignes.

Los archivos de agentes del proyecto residen en `.pi/agents/`, los de tu máquina en `~/.pi/agent/agents/`, y la extensión aporta sus propios agentes de demostración. Saber cuál de estas tres fuentes se utiliza en una llamada determinada condiciona toda la parte práctica, y las tres advertencias a continuación fijan las reglas.

### Lo que el agente declara y lo que hereda sin decirlo

Tres comportamientos de carga condicionan la manera en que este módulo escribe y lanza sus agentes. Están documentados por combo, y hemos encontrado el primero durante la preparación de esta formación.

::: warning Un agente sin `model:` funciona con la configuración del día
El modelo de un subagente **nunca se hereda de la sesión padre**. Proviene de un argumento pasado en la llamada, en su defecto del archivo de pipeline, en su defecto del frontmatter del agente y, como último recurso, de la configuración de Pi: prevalece lo que esté más cerca del trabajo. Un agente que no declara nada y que se lanza sin argumentos funciona, por tanto, con tu `~/.pi/agent/settings.json`, es decir, con lo que haya allí ese día. Durante la preparación de esta formación, nueve agentes sin `model:` se ejecutaron simultáneamente con un proveedor que nadie había elegido y devolvieron tantos errores 402.

La regla, que combo establece para sí mismo, es que todo agente cuyos resultados se vayan a comparar debe declarar su modelo. Los cuatro agentes de este módulo declaran el suyo, por lo que dos participantes que los ejecuten medirán lo mismo.
:::

::: warning Tus agentes de proyecto nunca se cargan por defecto
`.pi/agents/` es un contenido controlado por el repositorio, por lo que sus instrucciones son instrucciones de terceros: combo se niega a cargarlas sin que se le solicite, y es una frontera de seguridad y no una preferencia. El alcance se solicita en cada llamada a la herramienta, y el olvido no produce el mismo síntoma según el agente. En `explorer`, la llamada falla, pero el error no menciona el alcance y enumera lo que se ha cargado: `Unknown agent "explorer". Loaded agents: auditor, coder, committer, interviewer, planner, reviewer, router, scout, synthesiser`. La lista permite corregirse, ya que ninguno de esos nueve nombres es el tuyo, pero el mensaje nunca menciona la palabra alcance. En `planner`, `coder` y `reviewer`, la llamada no falla: estos tres nombres también existen entre los nueve agentes de demostración suministrados con la extensión, servidos con la prioridad más baja, y es el agente suministrado el que recibe tu tarea, bajo el nombre que creías que era el tuyo, con otro prompt y sin un `model:` declarado. En cuanto se solicita el alcance, la precedencia actúa correctamente: la definición del repositorio prevalece sobre la de tu máquina, y esta sobre la del paquete.

La solución consiste en solicitar el alcance del proyecto en cada lanzamiento y **verificar en la traza quién se ejecutó**, lo que la parte Reconstruir hace practicar.
:::

::: warning Un archivo de agente incompleto se ignora silenciosamente
Un archivo al que le falten `name` o `description` no se carga, sin errores ni advertencias: el agente simplemente no existe, y el primer síntoma es una llamada que falla más adelante, al listar agentes entre los cuales falta el tuyo. Es el comportamiento de Pi, que combo mantiene. Los agentes se redescubren en cada llamada, por lo que editar un archivo basta para recargarlo, pero solo si el archivo está completo.
:::

## Reconstruir

### La tarea: el ticket #2

Toda la parte práctica se centra en el **issue #2** de NÉON: la colisión se describe como lenta y desordenada en el renderizado, y el ticket pide identificar la ruta crítica y optimizar **sin cambiar la API pública**. La deuda se constata al leer el archivo: el bucle sobre los ladrillos de `frame()` realiza la colisión, la puntuación y el dibujo en el mismo cuerpo, por lo que nada de esto puede probarse por separado. El resultado esperado es una función **pura**, extraída de `frame()` y cubierta por tests nuevos, sin que ninguno de los exports de `game/neon.js` cambie de nombre ni de firma.

Este ticket es adecuado para este módulo por dos razones. La primera es que cada rol tiene un entregable falsable: una nota de impacto se verifica abriendo los archivos que cita, un plan se verifica paso a paso, un diff se verifica ejecutando la suite, un veredicto se verifica contra la lista de exports. La segunda es que el ticket **afirma** algo que no mide: «la colisión es lenta» es una frase del mantenedor y no una cifra. El módulo sobre el contexto mostró que un documento referenciado es leído y seguido; este añade que un documento leído sigue siendo un dato, que se verifica antes de propagarlo en un plan.

El marco no cambia: solo se pueden modificar `game/neon.js` y `game/neon.test.js`, las pruebas nuevas van a la suite y a ningún otro lugar, y `npm test` debe terminar en verde.

### Cuatro roles, y lo que cada uno tiene permiso de hacer

| agent      | entregable                                    | panoplia                             | lo que su panoplia le prohíbe |
| ---------- | ------------------------------------------- | ------------------------------------ | ------------------------------- |
| `explorer` | una nota de impacto                           | `read, grep, find, ls`               | escribir cualquier cosa         |
| `planner`  | un plan en pasos pequeños                       | `read, grep, find, ls`               | escribir cualquier cosa         |
| `coder`    | el diff de **un** paso del plan                | `read, grep, find, ls, edit, write`  | ejecutar un comando             |
| `reviewer` | `APPROVED` o `CHANGES REQUESTED`, motivado   | `read, grep, find, ls`               | corregir lo que revisa         |

Los cuatro archivos están versionados en `scripts/agents/` y se copian en el `.pi/agents/` de tu clon de NÉON. Aquí los tienes, con las decisiones de redacción que se trasladan a cualquier división de roles.

<<<@/../scripts/agents/explorer.md{md}

El explorer entrega una nota y no una opinión: su última sección recuerda que una nota que contiene también la corrección deja de ser una nota. Y su prompt le indica que los tickets de este repositorio son escritos por un mantenedor que a veces se ha equivocado en la ubicación del código, lo cual es cierto, y basta para que la nota verifique en lugar de copiar.

<<<@/../scripts/agents/planner.md{md}

El planner aplica la lección del módulo sobre el contexto: un modelo tiene un presupuesto, y describir más trabajo no lo amplía. Cada paso del plan debe, por lo tanto, caber en una invocación del coder, con su regla de división explícita: «si dudas, divide». Cada paso comienza con su prueba roja, y las pruebas van directamente a la suite, que es el ajuste exacto que la revisión del procedimiento del módulo anterior tuvo que hacer para vaciar sus columnas en fallo.

<<<@/../scripts/agents/coder.md{md}

El coder tiene lo necesario para escribir y nada para ejecutar, y su prompt lo indica: no lanza las pruebas, no finge haberlo hecho, eres tú quien las lanza después. Podríamos haberle dado un shell; el siguiente ejercicio muestra lo que garantiza su ausencia.

<<<@/../scripts/agents/reviewer.md{md}

El reviewer nunca corrige, porque un revisor que corrige se convierte en un segundo coder cuyo trabajo ya no es revisado. Sus cuatro verificaciones están ordenadas, la más mecánica primero, y dos de ellas se hacen contra **el árbol** y no contra el diff, porque el diff muestra lo que ha cambiado y no lo que el cambio ha olvidado. Su veredicto, finalmente, puede señalar el plan en lugar del código, en cuyo caso volverás al planner.

Otros dos archivos, `tester.md` y `auditor.md`, conviven junto a los cuatro roles y se copiarán con ellos. No juegan ningún papel en el bucle de este módulo: el primero es el candidato natural para el lanzamiento en paralelo del siguiente módulo, el segundo revisará allí el trabajo terminado en su conjunto, y dejarlos en `.pi/agents/` solo cuesta sus descripciones.

::: info Ejercicio (en sala)
Antes de lanzar cualquier cosa, haz que cada agente enuncie su propia garantía. Instala la extensión y deposita los agentes:

```bash
git clone https://github.com/AI-for-dev/combo.git
cd combo && npm install       # Node 23.6 ou plus récent, pas d'étape de build

cd /chemin/vers/neon
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi -e /chemin/vers/combo/extension
```

Luego, en la sesión, lanza el explorer con alcance de proyecto con la única tarea: « Nombra exactamente las herramientas de las que dispones. » Esto es lo que el nuestro devolvió:

> « Dispongo de las siguientes herramientas:
> `read`: leer el contenido de un archivo. `grep`: buscar un patrón en el contenido de los archivos. `find`: buscar archivos según un patrón (glob). `ls`: listar el contenido de un directorio. »

La lista no contiene ninguna herramienta de escritura, y es el propio agente quien lo enuncia.

Haz lo mismo con el coder pidiéndole que lance las pruebas. Aquí tienes, verbatim, la respuesta del nuestro:

> « I cannot execute shell commands, including `npm test`. According to my instructions, the orchestrator runs the tests after my response and provides the output. Since I cannot trigger the tests myself, I cannot report their result at this moment. »

Primero habíamos previsto la demostración inversa, que consiste en ordenar al explorer que corrija un archivo y observar que no puede hacerlo. La hicimos, y es menos probatoria de lo que parece, porque el agente razona sobre la contradicción y elige obedecer su prompt, de modo que un participante escéptico puede legítimamente ver en ello obediencia en lugar de una imposibilidad. El conjunto de herramientas enunciado por el agente no padece esta ambigüedad.
:::

### Una vuelta al bucle, a mano

Ahora desempeñas el rol que el siguiente módulo automatizará. Abre la sesión principal con la extensión cargada y dale su marco en el primer mensaje: es un relé, no lee el repositorio, no modifica nada, lanza el agente que nombres con alcance de proyecto con la tarea que dictes, y te devuelve el entregable del subagente **tal cual**. Este marco es una consigna y no una garantía; la sección sobre las limitaciones del dispositivo vuelve sobre ello, y la verificación se realiza en el rastro.

El bucle consta de seis pasos:

1. **explorer** recibe el ticket #2 $\rightarrow$ devuelve la nota de impacto;
2. lees la nota, luego **planner** recibe el ticket y la nota, tal cual $\rightarrow$ devuelve el plan;
3. **coder** recibe el paso 1 del plan, y nada más del plan $\rightarrow$ devuelve su informe y el diff queda en el árbol;
4. lanzas **`npm test` tú mismo**, en una segunda terminal, y guardas la salida;
5. **reviewer** recibe el ticket, el paso, el diff (`git diff`) y la salida de las pruebas, pegados por ti $\rightarrow$ devuelve su veredicto;
6. según el veredicto: siguiente paso al coder, retorno al coder con los motivos, o retorno al planner si el problema es el paso.

Mientras un subagente trabaja, un punto aparece sobre el prompt con su modelo, sus tokens y un cronómetro, y la línea de herramienta debajo mantiene el rastro de la llamada. Si [herdr](https://herdr.dev) se ejecuta en tu máquina, `/herdr on` asigna a cada subagente su propio panel, y puedes ver al explorer leer mientras preparas la siguiente tarea. Esta vista sirve para seguir el trabajo; la sección sobre el rastro explica por qué no permite concluir nada.

Mientras los ejecutas, lleva un diario de fricción, una línea por paso: qué has copiado, de quién a quién, y qué has decidido en el proceso. Guárdalo donde quieras, excepto en el árbol de NÉON, cuyo perímetro está definido. Este diario enumera lo que el orquestador del siguiente módulo deberá saber hacer, y tú estás en la mejor posición para escribirlo ya que habrás realizado cada paso tú mismo.

::: info Ejercicio (en aula)
Ejecuta el bucle hasta el primer `APPROVED`, es decir, hasta que el paso 1 del plan sea entregado, probado y revisado. Si el reviewer rechaza, sigue el rechazo hasta el final: es la mitad más instructiva del bucle, porque te obliga a decidir a quién devolver el veredicto.

Si la sesión lo permite, continúa hasta el final del plan. El criterio final es el del ticket: la función extraída es pura y está cubierta por al menos dos pruebas nuevas en la suite, todas las funciones exportadas de `game/neon.js` sigan siéndolo, y `npm test` esté en verde.
:::

### Lo que el aislamiento cambia en tu ventana

::: info Ejercicio (en clase)
Justo después de recibir la nota del explorer, escribe `/session` en la sesión principal y anota lo que contiene: tu marco, la llamada a la herramienta, la nota. Luego, abre una sesión nueva **sin** la extensión y pide al modelo que produzca la misma nota de impacto por sí mismo, leyendo el repositorio. Compara las dos `/session` y luego las dos `\tree`.

En la segunda sesión, cada archivo leído permaneció en la ventana y allí se quedará hasta el final; la primera solo introdujo la nota. La delegación compensa la exploración en un contexto que desaparece una vez entregada la tarea, en lugar de pagarla en cada turno en la ventana principal. El argumento es el mismo que para la lectura de caché del módulo sobre el contexto: un trabajo se paga en cada turno mientras permanezca en la ventana, y una sola vez cuando no entra en ella.
:::

### Verificar en la traza quién se ejecutó

::: info Ejercicio (en clase)
Exporta la sesión principal con `\export` y localiza cada llamada a la herramienta `subagent`: el nombre del agente, el alcance, el modelo, la tarea transmitida. Es la única respuesta fiable a la pregunta de quién se ejecutó.

Luego haz la contraprueba, dos veces. Pide el lanzamiento del explorer **sin** especificar el alcance: la llamada falla y el error enumera los nueve agentes suministrados, entre los cuales no figura el tuyo, sin que el mensaje mencione la palabra «alcance». Pide después el del planner en los mismos términos: la llamada tiene éxito, porque existe un `planner` entre los agentes suministrados con la extensión, y es él quien recibió tu tarea, bajo otro prompt y sin un `model:` declarado. Solo el argumento de alcance en la traza y el modelo utilizado delatan la sustitución; nada en la respuesta entregada te lo habría indicado.
:::

Una razón más para no creer ciegamente en los indicadores: durante la preparación de esta formación, una versión anterior de las herramientas de delegación mostraba un ✓ verde en un subagente **muerto**, porque la función de cierre devolvía `ok: true` de forma fija. El defecto ha sido corregido y una prueba lo mantiene, pero la lección no depende de la corrección: un indicador de éxito es código como cualquier otro, escrito por alguien, y solo la traza es fidedigna.

### Por qué este módulo no publica una matriz

Los dos módulos anteriores basaron sus afirmaciones en veinte repeticiones, y este no publica ninguna. Esta ausencia es deliberada, y su razón determina qué se mide en un harness.

Lo que este módulo afirma es **estructural**: un agente sin herramientas de escritura no puede escribir, un revisor con un contexto nuevo no ve las intenciones del programador, una exploración delegada no regresa a la ventana. Una sola ejecución, con la traza en mano, basta para verificar cada una de estas propiedades, y veinte no añadirían nada, mientras que veinte no siempre bastaban para establecer el efecto de un prompt. Los efectos probabilísticos se establecen mediante la repetición, y las propiedades estructurales mediante la inspección de una traza.

Lo que este módulo no puede afirmar, en cambio, es que la división por roles **mejora el resultado**: que el ticket #2 procesado por este bucle se desborde menos, o esté mejor corregido, que el mismo ticket procesado por un agente solo. Es una cuestión de medición, es legítima, y no se resuelve aquí. El siguiente módulo plantea el protocolo que permite resolverla: el bucle automatizado frente al agente solo sobre este mismo ticket en una misma matriz, y la hipótesis se escribirá allí antes que las cifras.

### Las limitaciones del dispositivo

**Nada impide que la sesión principal haga el trabajo ella misma.** Tu enlace tiene un shell, herramientas de escritura y una instrucción de no utilizarlas: esta es la situación que el módulo anterior midió; una instrucción de este tipo se sigue menos de una vez cada tres. Si tu bucle ha funcionado bien, es porque la tarea de cada turno estaba lo suficientemente delimitada para que delegar fuera el camino de menor esfuerzo, y nada lo imponía. La versión garantizada, un control que niega a la sesión principal lo que solo pertenece a los roles, requiere el mecanismo del módulo sobre los permisos.

**Nada de lo que hayas hecho entre dos agentes queda archivado.** La nota que leíste por encima, el paso que transmitiste reformulándolo un poco, la salida de la prueba que truncaste al pegarla: cada uno de estos gestos salió de tu memoria de trabajo, y ninguno puede ser reproducido, comparado ni medido. Esto es lo que el siguiente módulo automatiza, y tu registro da la lista.

## Generalizar

**Delegar es aislar un contexto y hacer que solo regrese la conclusión.** La ganancia reside menos en el coste del trabajo que en el hecho de que este no permanezca en la ventana: una exploración realizada en la sesión principal se vuelve a leer en cada turno hasta el final; la misma exploración delegada desaparece con su contexto y solo deja treinta líneas. Si lo que regresa del subagente es tan extenso como lo que ha leído, la delegación no ha aislado nada en absoluto.

**La garantía de un agente proviene de su conjunto de herramientas más que de su prompt.** El prompt del programador le indica que no ejecute las pruebas, pero es la ausencia de un shell lo que hace que no pueda hacerlo, y el agente sabe diferenciarlo por sí mismo. Cada vez que dudes entre escribir una prohibición y retirar una herramienta, retira la herramienta, porque una ausencia se constata en la configuración, mientras que una prohibición supone que el modelo la siga.

**El generador no se evalúa a sí mismo.** El valor de un revisor separado proviene de lo que su contexto no contiene, es decir, el razonamiento que produjo el código. Por eso un revisor que corrige destruye su propio valor, al volver a ser un generador que nadie revisa.

**Lo que no está declarado se decide en otro lugar.** Un agente sin `model:` funciona con la configuración del día de la máquina, un archivo sin `tools:` obtiene el conjunto de herramientas en modo lectura, un archivo sin `name` no existe. La regla se aplica más allá de los agentes: para cada campo de una configuración, pregúntate qué pasa cuando falta y quién decide entonces por ti.

**Una configuración que el modelo puede omitir se verifica en cada ejecución.** Tus agentes depositados en `.pi/agents/` solo se sirven si la llamada solicita el alcance del proyecto, y tres de tus roles tienen homónimos entregados que ocupan su lugar sin error cuando falta. Este tipo de configuración se verifica en la traza en cada ejecución, o se fuerza mediante un mecanismo, y nunca se supone asegurada.

**Solo la traza dice quién se ejecutó.** Un ✓ verde apareció en un subagente muerto porque una función devolvía `true` hardcoded, y nada en la respuesta de un agente sustituido dice que fue sustituido. La cuestión de saber quién se ejecutó, con qué herramientas y sobre qué modelo, tiene una sola fuente fiable: la traza de sesión, y se lee en un minuto.

**La división en roles distribuye el presupuesto del modelo sin aumentarlo.** El modelo que fallaba con el ticket largo fallará igual con un plan completo pasado de una vez: es el paso del plan, dimensionado para caber en una invocación, lo que convierte la división en trabajo terminado. El planner que divide en bloques demasiado grandes reproduce exactamente el fallo que el módulo sobre el contexto midió.

**Automatizar un bucle requiere haberlo gestionado a mano primero.** Tu diario de fricción dice qué deberá rutear el orquestador, en qué orden y bajo qué criterios decidiste los retornos. Un orquestador adoptado antes de haber gestionado el bucle manualmente automatiza un procedimiento que nadie ha verificado.

## Entregables

Este módulo produce tres piezas.

**1. Los cuatro agentes**, versionados en tu repositorio, cada uno con su conjunto mínimo de herramientas y su `model:` declarado. Estos son los que el siguiente módulo conectará al orquestador, sin modificarlos.

**2. El diario de una vuelta de bucle**: la traza de la sesión principal exportada, el diff entregado del primer paso, la salida de `npm test` que leyó el revisor y tu diario de fricción. Esta es la pieza que prueba quién se ejecutó, y la que el siguiente módulo necesita.

**3. La línea « delegación » de la ficha de decisión**:

| palanca                            | efecto observado | ¿adoptado? | por qué |
| --------------------------------- | ------------- | -------- | -------- |
| contexto aislado por rol           |               |          |          |
| conjunto reducido de herramientas (`tools:`) |               |          |          |
| modelo declarado por agente          |               |          |          |
| un paso del plan por invocación     |               |          |          |
| revisor separado del codificador        |               |          |          |
| veredicto que puede volver al plan |               |          |          |
| orquestación humana             |               |          |          |

La columna se llama «efecto observado» en lugar de «efecto medido», porque este módulo verifica propiedades en trazas y no establece desviaciones basadas en repeticiones. La última fila se completará en dos etapas, aquí y luego en el siguiente módulo, cuando sepas lo que la automatización de cada acción ha cambiado realmente.

::: tip Criterio de éxito
Sabes mostrar, traza en mano, qué agente se ejecutó en cada etapa de tu bucle, con qué herramientas y qué modelo, y citar la acción de tu diario de fricciones que te negarías a repetir veinte veces.

La primera parte requiere haber leído una traza en lugar de un ✓, la segunda haber gestionado el bucle tú mismo, y ninguna de las dos se completa de memoria.
:::

## Las trampas

**Olvidar el alcance del proyecto.** El olvido es silencioso precisamente en los roles que tienen un homónimo disponible: `planner`, `coder` y `reviewer` responden de todos modos, bajo otro prompt y con otro modelo, y solo `explorer` falla, con un error que enumera los agentes cargados sin nombrar el alcance. Solicita el alcance en cada llamada y verifícalo en la traza.

**No declarar `model:`.** El agente se ejecuta entonces con la configuración actual de tu máquina, y dos participantes que ejecuten el mismo módulo ya no compararán lo mismo. Los nueve agentes de prueba que empezaron a devolver 402 en un proveedor que nadie había elegido son la prueba de ello.

**Dar el plan completo al codificador.** Es recrear, dentro de la división, el ticket largo con el que el modelo se pierde: escribirá el principio y se detendrá, y el revisor rechazará un trabajo que nadie ha dividido para él. Da un paso por invocación y lee el informe del codificador entre medio.

**Dejar que el revisor corrija.** Un revisor que corrige se convierte en un segundo codificador que nadie revisa, y su siguiente `APPROVED` ya no vale nada, ya que se refiere a su propio trabajo.

**Hacer subir la exploración en lugar de la conclusión.** Pegar la sesión completa del explorer en el contexto principal anula el aislamiento que acabamos de conseguir: solo debe subir la nota. El criterio se verifica mecánicamente: lo que regresa debe ser pequeño comparado con lo que se ha leído.

**Reformular un entregable al enrutarlo.** El orquestador que resume la nota antes de dársela al planner introduce una etapa invisible, ni versionada ni legible, exactamente donde se pretendía que la cadena fuera trazable. Los entregables se transmiten tal cual, y por eso su forma está impuesta por los prompts de los agentes.

**Confundir un rechazo con disciplina.** Un agente de solo lectura (read-only) no ha «rechazado» escribir, es que no podía hacerlo; y a la inversa, el agente que tiene la herramienta y promete no usarla no ha garantizado nada en absoluto. El módulo anterior ha cuantificado cuánto vale una instrucción de este tipo: se cumple menos de una vez cada tres.

**Confiar en un ✓.** Apareció un ✓ verde en un subagente muerto durante la preparación de este módulo. El trazo contiene las llamadas a herramientas reales, y es este el que es válido.

## Para saber más

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), sobre el orquestador y los subagentes investigadores, y sobre lo que cuesta la paralelización en tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), el contrapunto: lo que se pierde con la fragmentación del contexto y por qué compartir el hilo completo es a veces preferible.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la página que distingue entre workflows y agentes; el siguiente módulo implementa sus patrones.
- [combo](https://github.com/AI-for-dev/combo), la biblioteca de subagentes y workflows utilizada aquí: su documentación sobre agentes y tiempos de vida, y su `NEXT.md`, que enumera las trampas ya encontradas.
- [herdr](https://herdr.dev), la vista en tiempo real de los subagentes, utilizada en este módulo y en el siguiente.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), para entender el lugar de los subagentes entre los demás componentes: reinyectar una síntesis limpia en lugar de la reflexión que la produjo.
