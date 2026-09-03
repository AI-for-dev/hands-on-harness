# Los workflows: el bucle escrito en código

::: tip Objetivos de este módulo
- Componer los roles del módulo anterior con los combinadores de combo: cadena, fan-out, bucle, entrega
- Escribir un pipeline: la estructura en el frontmatter, la prosa por etapa y lo que un archivo no puede expresar
- Establecer un gate ejecutable cuyo veredicto prevalezca sobre todas las aprobaciones
- Leer un resultado de workflow: `ok`, `converged`, `approved` y lo que cada uno no dice
- Reproducir el ticket #2 de principio a fin, sin intervención entre el brief y el veredicto, y saber demostrar el mecanismo sin un modelo
:::

El módulo anterior concluyó con dos limitaciones: nada impedía que la sesión principal realizara el trabajo ella misma, ya que su rol de enlace dependía de una instrucción, y cada acción de enrutamiento partía de tu memoria de trabajo sin quedar archivada en ningún lugar, lo que impedía reproducirla, compararla o medirla.

Este módulo automatiza las acciones que ha registrado tu diario de fricción. El enrutamiento se convierte en código que llama a los roles en un orden decidido al escribirlo, de modo que ningún modelo puede reinterpretarlo, y el veredicto pasa a ser la ejecución de la suite de pruebas, cuyo resultado no depende de ninguna aprobación. Solo quedan dos intervenciones humanas, antes del trabajo y antes del commit, y la parte práctica muestra por qué estos dos puntos de parada son decisiones de diseño.

Seguimos el orden habitual: comprender qué es un workflow en combo, conectar los roles del módulo anterior y reproducir el ticket #2 de principio a fin, para luego extraer lo que sigue siendo válido cuando la herramienta cambia.

## Comprender

### Un workflow es una función

En combo, un workflow es una función de una entrada hacia un `Result`, o una lista de `Result`: el texto final de un agente, sus mensajes, su consumo y un campo `ok` que indica si el turno se ejecutó sin errores del modelo. Los combinadores componen porque comparten este contrato. Los agentes siguen siendo los archivos Markdown del módulo anterior; la orquestación, en cambio, es código: no hay un lenguaje de descripción que aprender, y la documentación de combo registra esta elección en sus decisiones de diseño.

Nueve combinadores cubren las formas útiles:

| combinador   | forma                                                             |
| ------------- | ----------------------------------------------------------------- |
| `chain`       | 1 → 1 → 1, la salida de un paso alimenta al siguiente            |
| `fanOut`      | 1 → N ramas en paralelo, un agente para todas o uno por rama    |
| `loop`        | 1 → 1 hasta una meta (`until`), techo de iteraciones             |
| `reduce`      | N → 1, un agente sintetiza las ramas                             |
| `route`       | un clasificador elige el destino                                 |
| `orchestrate` | un agente decide la división, plan validado antes del lanzamiento |
| `pair`        | un trabajador y un revisor, hasta llegar al acuerdo              |
| `interview`   | el agente interroga al usuario, una pregunta a la vez           |
| `deliver`     | plan, un pair por subtarea, chequeo del proyecto, auditoría, correcciones |

**`ok`, `converged` y `approved` responden a tres preguntas diferentes.** `ok` indica que los turnos se ejecutaron sin errores del proveedor; `converged`, en un `loop`, indica que el trabajo alcanzó la meta solicitada en lugar de agotar su techo de iteraciones; `approved`, en un `pair` o un `deliver`, indica que alguien ha firmado. Alcanzar un techo no es un éxito, y la lectura de un informe comienza por distinguir estos tres campos.

**Un fallo no hace que el workflow colapse.** Una rama de fan-out que falla se convierte en un `Result` con `ok: false` en su lugar, las demás continúan, y un subagente que consumió doce mil tokens antes de fallar costó doce mil tokens: su consumo se contabiliza incluso cuando `ok` es falso.

::: warning Un bucle de agente no tiene un límite propio
Un turno es un `session.prompt()`, y el bucle de agente de Pi gira mientras el modelo solicite herramientas. Un modelo débil que alucina un nombre de herramienta, recibe « unknown tool » y vuelve a preguntar, entra en bucle hasta que algo lo detenga: la documentación de combo reporta 79 llamadas a una herramienta inexistente y aproximadamente 500 000 tokens de entrada en un solo turno. `maxIterations` tiene un valor por defecto (5), porque una iteración es una unidad discreta y costosa; `timeoutMs` no lo tiene, porque ningún valor por defecto puede decidir que una tarea legítima ha tardado demasiado. Pon un `timeoutMs` en todo lo que se ejecute sin supervisión: el olvido de un argumento no debe bastar para hacer posible un bucle infinito.
:::

### El pipeline: la parte lineal, en Markdown

Una secuencia lineal de combinadores puede escribirse en un archivo en lugar de en código: un **pipeline**, ubicado en `.pi/pipelines/` junto a los agentes. El frontmatter contiene la estructura, es decir, las etapas, sus agentes, sus techos y el chequeo del proyecto, porque es YAML real y la anidación allí es natural; el cuerpo contiene la prosa, una sección `## <id>` por etapa. Ningún agente lee este archivo para decidir el siguiente paso: es el código de combo el que lo ejecuta.

Los pipelines siguen los mismos alcances que los agentes (entregados, máquina, repositorio, predominando el más cercano al trabajo) y la misma frontera de seguridad: los de un repositorio nunca se cargan por defecto. El régimen de fallo difiere, en cambio, del de los agentes, y esta diferencia corrige una trampa del módulo anterior: un archivo de agente incompleto se ignora silenciosamente, mientras que un **pipeline malformado es rechazado**, nunca reemplazado sin aviso por el valor predeterminado. Un agente se descubre, mientras que un pipeline se solicita por su nombre, por lo que un archivo presente pero ilegible debe notificarse con su motivo en lugar de ignorarse.

Todo se valida **antes** de abrir la menor sesión: la forma de cada etapa, la correspondencia entre las entradas del frontmatter y las secciones del cuerpo en ambos sentidos, y cada nombre de agente frente al roster. Un error tipográfico en la etapa cuatro cuesta así un segundo en lugar de tres etapas de trabajo real.

El límite está establecido de antemano y es voluntario: un pipeline no tiene condiciones, ni ramas, ni referencias a la etapa dos. Cada etapa recibe su instrucción, la solicitud inicial y la salida de la etapa anterior, nada más. En el momento en que una ejecución necesita una bifurcación, se convierte en un workflow en TypeScript, lo que mantiene la regla "los agentes son datos, los workflows son código" sin prohibir escribir la parte lineal en Markdown.

### El gate: la suite de pruebas como veredicto

`deliver` acepta una verificación, y la documentación de combo reporta la ejecución que la impuso: un par escribió una función y sus pruebas, el revisor aprobó, el auditor aprobó, y el archivo de prueba importaba `./slugify.js` para un archivo llamado `slugify.ts`. La suite ni siquiera se cargaba: los dos agentes habían leído el código y ninguno lo había ejecutado.

El mecanismo es un **puerto**: el pipeline nombra el check (`verify: [npm, test]`), y es el código llamador el que lo ejecuta, mediante `execFile` y sin shell. Los argumentos son una lista, de modo que `"npm test && rm -rf /"` sigue siendo un argumento y nunca dos comandos. La salida se trunca por la **cola** en lugar de por la cabeza, porque un ejecutor de pruebas indica al final lo que falló. Por último, **cuando un check está configurado, su veredicto es final**: ninguna aprobación, de ningún agente, transforma un check rojo en éxito.

## Reconstruir

### Lo que la bifurcación ha cambiado en los roles

Conectar los agentes del módulo anterior a `deliver` hizo aparecer dos colisiones de convención, que responden al mismo principio: la forma del entregable pertenece al llamador.

La primera afecta al planner. `deliver` le envía su propia solicitud de plan, un array JSON `[{"agent": …, "task": …}]`, y lee la respuesta con un parseador flexible en la forma, pero estricto en el fondo: un nombre de agente desconocido se descarta, nunca se reemplaza por uno similar plausible. El plan «para humanos» del módulo anterior, con sus `files:` y `done:`, no contiene nada que este parseador sepa leer: hemos vuelto a ejecutar esta respuesta contra el parseador real, y la entrega se detiene antes de abrir la primera sesión, con un `no runnable plan`. La segunda afecta al reviewer: bajo `pair`, la palabra de acuerdo es `LGTM`, sola en su línea, y un revisor que responde `APPROVED` nunca se cuenta como un acuerdo, por lo que el pair agota sus turnos.

La corrección consiste en una regla añadida a los dos archivos, la misma: el formato por defecto sirve al orquestador humano, y cuando el llamador especifica el formato de respuesta que sabe leer, ese es el que se aplica, porque un plan que el llamador no puede analizar no planifica nada. Las reglas de fondo, el tamaño de los pasos, primero el test rojo, la API congelada, se mantienen independientemente del formato.

Se añade un rol: el auditor. El revisor del pair ve una subtarea; el auditor lee todo el conjunto terminado y busca lo que la suma de las partes ha olvidado: un paso del plan que nadie realizó, o un requisito del ticket que ninguna subtarea contemplaba. Es la versión «en conjunto» de las verificaciones que el reviewer del módulo anterior hacía paso a paso.

<<<@/../scripts/agents/auditor.md{md}

### El pipeline del ticket #2

<<<@/../scripts/pipelines/issue2.md{md}

Cinco decisiones de este archivo requieren una justificación. El fan-out del módulo anterior se escribe en el archivo, dos agentes, uno por rama, con tareas **literales**: un fan-out cuyas ramas provengan de la etapa anterior sería otro combinador, `orchestrate`, donde un agente decide el desglose, y mantener las tareas literales evita que el formato necesite cualquier sintaxis de plantilla. `verify: [npm, test]` se declara una vez, al principio: es el gate, que el pipeline nombra sin ejecutarlo, ya que la ejecución pertenece al código que posee el árbol de trabajo. `maxTasks: 2` y `concurrency: 1` en la entrega, porque los trabajadores escriben en el mismo árbol y el trabajo del ticket #2 es secuencial: un trabajo secuencial cabe en una subtarea en lugar de tres, y dos coders concurrentes en un solo repositorio producirían escrituras cruzadas que nadie revisaría. `maxAuditRounds: 3` en lugar de 2, porque un audit que prescribe una corrección consume un turno, la corrección otro, y hace falta un turno restante para firmar: con 2, un run cuyo segundo audit pedía un ajuste terminó en `approved: false` en un árbol que, sin embargo, estaba verde y era conforme. La prosa de la etapa `work` establece el **contrato** del entregable, es decir, la firma exacta, la pureza, la forma del retorno y el comportamiento de `frame()` cuando la pelota solapa varios ladrillos, porque cada libertad que la solicitud deja abierta se convierte en una variante de un run a otro: antes de este bloque, seis runs de este ticket devolvieron tres firmas diferentes, una de las cuales solo rompía un ladrillo por frame sin que ningún test se pusiera rojo. Por último, la misma prosa impone el test rojo primero en la suite, que es la regla del planner repetida en el lugar donde se fabrica el plan.

::: info Ejercicio (en clase)
Deposita el pipeline junto a los agentes, luego verifica lo que Pi ha cargado realmente antes de lanzar nada:

```bash
cd /chemin/vers/neon
cp /chemin/vers/hands-on-harness/scripts/pipelines/issue2.md .pi/pipelines/
cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi -e /chemin/vers/combo/extension
```

```
> /pipelines
```

El comando lista los pipelines cargados, la forma de cada ejecución y los archivos que no parsean con su motivo. Rompe deliberadamente el YAML del frontmatter, reinicia `/pipelines` y constata el régimen de fallo: el archivo es rechazado y nombrado con su motivo, en lugar de ser reemplazado en silencio.

Luego lanza el bucle:

```
> /build --pipeline issue2 --model ilaas/gemma-4-31b traite le ticket #2 d'ISSUES.md
```

`/build` se detiene exactamente dos veces, en el brief antes de cualquier trabajo y en el commit al final. Entre los dos, todo lo que hacías a mano en el módulo anterior se encadena sin ti: la nota de impacto, el plan, el pair coder-reviewer, `npm test`, el audit, las correcciones. Rechazar una de las dos paradas no deshace nada, el trabajo permanece en el árbol. Al final, haz tus propias verificaciones, las del módulo anterior: `npm test`, la lista de exports, `git diff` y el trazo completo en `runs/<marca-de-tiempo>/`.
:::

Una ejecución interrumpida se reanuda con `/build resume`: solo se conservan las subtareas **aprobadas**, el plan se reutiliza en lugar de rehacerse y nada de la conversación se recupera, de modo que una ejecución reanudada lee el código en lugar de reproducir una transcripción.

### La versión script: lo que el pipeline no puede expresar

El fan-out cabe en el archivo, pero hay tres cosas que no. La primera es la autonomía completa: `/build` se detiene dos veces por diseño y dispone de un terminal mientras se ejecuta, mientras que un harness que debe trabajar solo, en CI, mediante un trigger o en la matriz de un experimento, no puede permitirse ni las detenciones ni el terminal. La forma autónoma del bucle es, por tanto, un proceso, sin interrupciones entre la solicitud y el veredicto, con un código de salida exploitable por una máquina.

La segunda es la política del veredicto. La prueba a continuación muestra que `approved` agrega la auditoría y el check, y no el acuerdo de pares: un par no convergido aparece en el informe, pero no bloquea nada. Si tu política exige el acuerdo del par, ese requisito es una línea de código en el llamador, un archivo que no tiene ni condiciones ni acceso al informe para expresarlo. La tercera es la medición: comparar lo paralelo con lo secuencial requiere variar la concurrencia de un lanzamiento a otro sin cambiar nada más, y comparar `busyMs` frente a `wallMs`.

Este es el segundo artefacto del módulo, la misma ejecución que el pipeline, escrita con la biblioteca:

<<<@/../scripts/workflows/issue2.ts{ts}

El script hace lo mismo que hacía el pipeline: las mismas dos ramas, la misma entrega, el mismo gate, y ahí se ven las tres cosas: el código de salida del proceso combina `approved` y el acuerdo de pares, de modo que la política endurecida cabe en las dos líneas encima del `exit` y una CI la aplica sin añadir nada; `--sequential` reduce la concurrencia a uno, y se imprime la línea de paralelismo. combo se importa desde su clone, como argumento y nunca como variable de entorno, porque un estado ambiente que llegue a un subagente es precisamente lo que el diseño de combo quiere evitar.

::: info Ejercicio (en autonomía)
Ejecuta el script dos veces, con y sin `--sequential`, y compara la línea de paralelismo. Luego, compara lo que el fan-out ha reportado realmente sobre la duración total del bucle, incluyendo el gate y la auditoría: es la versión numérica de la comparación prometida en el módulo anterior.

Aquí tienes la nuestra, dos ramas en `ilaas/gemma-4-31b`, con el clone reiniciado entre los dos lanzamientos:

| | fan-out | secuencial |
| --- | --- | --- |
| reloj / trabajo | 131 511 / 184 502 ms | 134 584 / 134 557 ms |
| línea de paralelismo | **×1,40** | ×1,00 |
| explorar / probar | 53,0 s / 131,5 s | 75,9 s / 58,6 s |
| bucle completo | 298 s | 348 s |

El fan-out ha ganado 3 segundos de 134, es decir, un 2,3 %. Las dos ramas van individualmente un 37 % más lento cuando se ejecutan juntas, porque comparten el caudal de un solo proveedor: el ×1,40 mide, por tanto, el solapamiento de las dos ramas y no una aceleración del bucle. La diferencia de 50 segundos en el bucle completo proviene de la dispersión del modelo de una ejecución a otra, mayor aquí que la ganancia medida, y no del paralelismo.

Reproduce la medida en tu proveedor antes de concluir, porque estas cifras describen un punto de entrada compartido y no una propiedad del fan-out. Lo que se transpone es el método, y la constatación de que un buen ratio de paralelismo no prueba ningún ahorro en la duración total.
:::

### La prueba de mecanismo, sin modelo

Antes de pagar un solo token, el mecanismo completo se verifica en blanco y el protocolo se reutiliza en cualquier workflow: el código real de combo (parseur, `runPipeline`, `deliver`), el `npm test` real de NÉON como gate, y un modelo falso inyectado por el puerto `spawn`, cuyo coder aplica el diff de referencia del ticket #2. Solo el modelo está simulado; todo lo que lo rodea es el código real. Se trata de `scripts/workflows/issue2-smoke.mjs`, que se lanza en un clon desechable con los agentes y el pipeline:

```bash
node scripts/workflows/issue2-smoke.mjs /chemin/vers/neon /chemin/vers/combo
```

Y aquí tienes su salida:

```
S1 parse+resolve            OK   note(fanOut) -> work(deliver)
S2 chemin vert              OK   approved=true, npm test: 9 cas verts
S3 gate                     OK   pair LGTM + audit APPROVED, check rouge => approved=false
S4 plan au format humain    OK   'no runnable plan' - la forme appartient à l'appelant
S5 mauvais mot d'accord     OK   pair jamais approuvé ; le tout reste sauvé par audit + check
```

Cada línea verifica una propiedad. S1: el archivo se parsea y cada nombre se resuelve antes de cualquier sesión. S2: sobre el diff de referencia, la suite pasa de 6 a 9 casos y todos firman. S3 es la demostración central: el mismo diff más un test sabotado, el pair aprueba, el audit aprueba y `approved` sigue siendo falso porque el check está en rojo: una aprobación no vence a un veredicto ejecutable. S4 y S5 reproducen las dos colisiones de convención descritas anteriormente, y prueban que fallan donde deben: antes del trabajo para el plan, en el pair para el veredicto.

::: warning Lo que `approved` agrega
S5 muestra una sutileza de diseño que debes conocer antes de leer un informe de `deliver`: un pair que agota sus turnos sin acuerdo **no es un veto**. Su propio `approved` sigue siendo falso y se lee en el informe, pero el veredicto final de la entrega es « el auditor ha firmado **y** el check está en verde ». En S5, el trabajo estaba hecho desde el primer turno, el audit y la suite lo confirmaron, y la entrega se aprueba aunque ningún revisor de pair haya dicho la palabra correcta: el veredicto final se basa en el check y en la lectura del conjunto, y no en el acuerdo de cada etapa. Si tu política exige el acuerdo del pair, se escribe en el código llamador, y la versión script de este módulo lo hace en las dos líneas que preceden a su código de salida.
:::

Esta prueba no dice nada de lo que un modelo real hará en el rol de planner o de coder en este ticket. Establece que si el modelo hace el trabajo, el harness lo dejará pasar, y que si lo hace mal, el gate lo detendrá. El comportamiento del modelo solo se establece mediante la medida.

::: warning Un check verde no significa que el ticket esté terminado
S3 establece que una aprobación no vence a un veredicto rojo, y lo contrario es falso. Una ejecución real de este pipeline lo demostró: `check: vert`, `approved: true`, doce casos verdes, y en el árbol una función `export function brickHit(state)` que muta el estado, donde el ticket pide `brickHit(ball, bricks)`, **pura**. El auditor había prescrito el cambio de firma, el revisor lo había dejado pasar, y la suite lo validó porque ningún test restringe la firma solicitada.

Un gate solo verifica lo que la suite restringe. `approved` significa «el auditor ha firmado y el check está en verde», nunca «el ticket está satisfecho», y lo único que une ambos es un test que alguien escribió específicamente. Esto es también lo que justifica la etapa `tester` del fan-out: un plan de tests que define la firma esperada transforma un requisito de prosa en un requisito ejecutable.
:::

### La comparación que queda por medir

El módulo anterior dejó una pregunta de medición abierta: ¿mejora la división por roles el resultado en el ticket #2, frente a un único agente que recibe el mismo brief? Este módulo plantea el protocolo sin publicar cifras y, como en el resto de la formación, la hipótesis se escribe antes de la medición.

combo proporciona la pieza: `experiment` reproduce el mismo workflow en M modelos y N repeticiones, cada célula en su propio directorio con sus mediciones, y devuelve una tabla donde las columnas de banderas son lo que tu función retorna (`approved`, la suite en verde, los exports intactos). Dos variantes bastan: el bucle de este módulo y un `run` único del coder con el ticket definido. Las columnas de lectura son las del módulo sobre el contexto, priorizando el desbordamiento del perímetro.

::: info Ejercicio (autónomo)
Escribe primero la hipótesis: ¿qué predices sobre la división respecto al desbordamiento, y bajo qué condición dirías que no aporta nada? Escribe después la función de `experiment` que la ponga a prueba, con veinte repeticiones por variante. La lección del módulo sobre el contexto se aplica sin cambios: tres repeticiones muestran la dispersión y no permiten desempatar.
:::

## Generalizar

**Los agentes son datos, los workflows son código.** Un archivo describe un rol, el código describe una secuencia, y la frontera entre ambos es un contrato: la parte lineal puede volver a ser un archivo, la primera condición hace que retorne al código. Un sistema que organiza la orquestación en un lenguaje de configuración acaba reinventando ahí un lenguaje de programación, sin las herramientas correspondientes.

**Un veredicto ejecutable vence a todas las aprobaciones.** Dos agentes aprobaron un test que no se cargaba, y un check lo habría dicho con un solo comando. El veredicto del gate es el único que no es una opinión, y es final por construcción.

**`ok`, `converged` y `approved` responden a tres preguntas diferentes.** Que haya iteraciones no significa que se haya alcanzado el objetivo, que se haya agotado el límite no es un éxito, y lo que el veredicto final agrega se lee en el código más que en su nombre, como demuestra S5.

**La forma del entregable pertenece al llamador.** El mismo planner sirve a un humano y a un parser, siempre que se especifique en su prompt a quién corresponde la forma. Las dos colisiones de este módulo se corrigieron con una frase cada una, porque los roles y los formatos estaban separados desde la escritura; si se hubieran mezclado, la corrección habría requerido una reescritura.

**Toda verificación que se pueda desplazar antes del primer gasto debe desplazarse.** El pipeline se analiza, sus secciones se emparejan, sus agentes se resuelven y su plan se delimita antes de la primera sesión, de modo que una errata cuesta un segundo en lugar de tres etapas de trabajo real. La regla se traslada a cualquier secuencia donde se paga por cada etapa.

**Los límites sin defecto se establecen a mano.** El límite de iteraciones tiene un defecto porque la unidad es discreta y costosa, el tiempo límite no lo tiene porque sería arbitrario, y por lo tanto te corresponde a ti establecerlo en todo lo que se ejecute sin supervisión. Busca, en cada herramienta, qué permite el olvido de un argumento.

**El mecanismo se verifica sin modelo.** Un puerto de inyección, el `spawn` de combo, separa el harness del modelo: la prueba en blanco establece que el harness enruta, filtra y rechaza según lo previsto, en un segundo y con cero tokens, mientras que lo que el modelo hará con el rol sigue siendo una cuestión de matriz. Confundir ambos provoca pagar repeticiones para verificar código, o hace creer que está probado lo que solo era plausible.

**Las paradas de un harness autónomo son decisiones de diseño.** `/build` marca dos paradas, el brief y el commit, y todo lo demás se encadena sin intervención. Estas paradas son los dos puntos donde un error cuesta más deshacer que prevenir, elegidos durante la escritura, y un harness autónomo se juzga por la posición de sus paradas más que por su ausencia.

## Entregable

Este módulo produce tres piezas.

**1. El pipeline y el script**, `scripts/pipelines/issue2.md` y `scripts/workflows/issue2.ts`, versionados con los tres archivos de agentes que el branching afectó: las dos reglas de forma añadidas al planner y al reviewer, y el auditor.

**2. El rastro de una ejecución completa**: el directorio `runs/<horodatage>/` de un `/build` realizado desde el brief hasta el commit en el ticket #2, y la salida verde de `issue2-smoke.mjs`. La prueba de mecanismo y la ejecución real siguen siendo dos piezas separadas, porque no establecen lo mismo.

**3. La línea « workflows » de la ficha de decisión**:

| palanca | efecto observado | ¿adoptado? | por qué |
| ----------------------------------- | ------------- | -------- | -------- |
| pipeline markdown (parte lineal) |               |          |          |
| workflow en código (ramas, medida) |               |          |          |
| gate ejecutable (`verify`)          |               |          |          |
| fan-out explorer ∥ tester           |               |          |          |
| auditoría del total, después de los pares |               |          |          |
| topes (`maxRounds`, `timeoutMs`) |               |          |          |
| prueba de mecanismo sin modelo     |               |          |          |
| paradas elegidas (brief, commit)      |               |          |          |

::: tip Criterio de éxito
Sabes decir, con el informe en la mano, por qué un run determinado está `approved` o no lo está, es decir, qué etapa firmó, qué devolvió el check y qué tope se agotó, y sabes citar la propiedad del harness que la prueba en blanco establece y aquella que no establece.

La primera parte requiere haber leído un informe de `deliver` en lugar de su última palabra, la segunda, haber ejecutado la prueba tú mismo; ninguna de las dos se completa de memoria.
:::

## Las trampas

**Paralelizarlo todo.** Dos coders concurrentes escriben en el mismo árbol, y el fan-out tiene un coste fijo que la exploración sola rara vez amortiza: la comparación cuantitativa de este módulo midió una ganancia de 3 segundos sobre 134. El paralelismo se mide con `busyMs` frente a `wallMs` antes de generalizarse.

**Olvidar `timeoutMs`.** Es la única barrera de seguridad sin valor por defecto: una vuelta puede buclear con una herramienta que alucina hasta cientos de miles de tokens, y ningún tope de iteraciones limita el interior de una vuelta.

**Leer `approved: true` como « el ticket está hecho ».** El veredicto agrega una firma y un check, y el check solo sabe lo que la suite restringe. Una entrega que cambia la firma solicitada por el ticket pasa el gate mientras ningún test la restrinja; el remedio es un test más en lugar de un rol más.

**Leer `ok` como un éxito.** `ok` indica que las vueltas se ejecutaron. Un `loop` puede estar `ok` y no haber convergido, un `deliver` `ok` y no estar aprobado; son `converged` y `approved` los que traen la respuesta.

**Creer que el par bloquea la entrega.** El veredicto final agrega la auditoría y el check; un par que no ha convergido se lee en el informe, no bloquea. Si tu política lo requiere, escríbela en el código llamador.

**Dejar que un rol imponga su forma al llamador.** Un plan que el llamador no sabe analizar y un veredicto que no sabe leer fallan ambos en silencio por el lado del agente; el parseur te lo dirá, antes del trabajo para el plan y al precio de un run para el veredicto.

**Considera `/run` como una versión segura de `/build`.** `/run` elimina la entrevista y la detención del commit, nada más: toda escritura de un paso permanece en el árbol, y lo que un agente puede hacer sigue decidido por su panoplia.

**Verifica el mecanismo mediante repeticiones.** Veinte ejecuciones del modelo para constatar que un gate detiene un test rojo consumen tokens, mientras que una prueba en blanco emite el mismo veredicto en un segundo, y la dispersión del modelo nubla lo que se quería observar. Las repeticiones sirven para medir el modelo, y el código se inspecciona.

## Para profundizar

- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la distinción entre workflows y agentes, de la cual los combinadores de este módulo son una implementación, y los patrones (encadenamiento, enrutamiento, paralelización, orquestador-trabajadores, evaluador) en su forma general.
- [La documentación de combo](https://github.com/AI-for-dev/combo/tree/main/docs): las páginas de workflows, pipelines y « Deliver a change », así como `docs/decisions.md`, que registra las decisiones de diseño y aquellas que fueron anuladas, una práctica a imitar.
- [herdr](https://herdr.dev), para ver un `deliver` trabajar: un panel por subagente, con el peer y el audit visibles mientras se ejecutan.
- El `NEXT.md` de combo, que enumera lo que queda por hacer y las trampas ya encontradas: cada defecto descubierto se convierte allí en un test.
