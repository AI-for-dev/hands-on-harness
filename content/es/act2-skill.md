# Los skills: un procedimiento de trabajo y lo que desplaza

::: tip Objetivos de este módulo
- Saber qué es un skill en Pi, qué ve el modelo de él y qué no ve
- Distinguir un skill que el modelo puede ignorar de un skill que se le impone
- Escribir un procedimiento de trabajo que produzca un entregable utilizable
- Medir lo que desplaza, y no confundir desplazar con mejorar
- Revisar un procedimiento a partir de las ejecuciones leídas, y verificar la revisión con una nueva matriz
:::

El módulo anterior repasó lo que se gana haciéndolo mejor: elegir un modelo, ajustar un cursor, escribir un ticket, mantener un archivo de reglas. Terminó con una constatación. En las configuraciones que reciben el ticket bien encuadrado, cuatro ejecuciones de veinte escriben los tests en rojo que el ticket pide y nunca abren `game/neon.js`: el modelo agota su presupuesto formulando los casos y no logra corregirlos. La única palanca que remedió esta caída consistió en proporcionarle los tests ya escritos, algo que nadie hará en un ticket real.

La pregunta de este módulo es entonces si un **procedimiento de trabajo**, escrito una vez y recargado a demanda, obtiene lo mismo sin proporcionar los tests.

Seguimos el orden habitual: comprender qué es un skill en el arnés, escribir uno sobre esta cuestión, medir lo que produce, y luego revisarlo y volver a medir.

## Comprender

### Un skill es un archivo markdown

Un **skill** es un archivo `SKILL.md` colocado en un directorio `.pi/skills/<nombre>/` del proyecto, con el formato del estándar abierto [Agent Skills](https://agentskills.io). Se compone de un frontmatter, que lleva como mínimo un nombre y una descripción, y de un cuerpo que contiene las instrucciones. No hay ni código, ni registro, ni configuración que prever: basta con colocar el archivo.

He aquí un skill completo, deliberadamente minúsculo:

```markdown
---
name: revue-rapide
description: Relit les modifications en cours du dépôt. Utiliser quand l'utilisateur demande une relecture avant de commiter.
---

# Revue rapide

1. Lance `git diff` et lis toute la sortie.
2. Relève ce qui peut casser un test existant, puis ce qui manque de test.
3. Rends deux listes : « à corriger avant le commit » et « peut attendre ».
```

La idea es la de un procedimiento de trabajo que se escribe una vez y que el agente recarga a demanda, en lugar de reescribirlo en cada prompt. Ocupa un lugar aparte en el arnés: `AGENTS.md` entra en el contexto en cada turno y por lo tanto cuesta en cada turno, mientras que un skill está hecho para entrar solo cuando la tarea lo requiere.

### Lo que el modelo ve de él

Hay un punto de mecánica que conviene entender bien, porque condiciona todo lo demás. Pi inyecta en el prompt de sistema, **en cada turno**, el nombre, la descripción y la ruta de cada skill disponible:

```
The following skills provide specialized instructions for specific tasks.
Use the read tool to load a skill's file when the task matches its description.

<available_skills>
  <skill>
    <name>revue-rapide</name>
    <description>Relit les modifications en cours du dépôt...</description>
    <location>/chemin/vers/.pi/skills/revue-rapide/SKILL.md</location>
  </skill>
</available_skills>
```

El **cuerpo** del `SKILL.md` no está ahí. Entra en el contexto por una de las dos vías siguientes, y la diferencia entre ambas es el tema de este módulo.

La primera es que el modelo **decide** abrirlo con la herramienta de lectura, basándose únicamente en la descripción. La documentación de Pi lo dice en los mismos términos, añadiendo que « models don't always do this ».

La segunda es que el usuario escriba `/skill:revue-rapide` en su mensaje, en cuyo caso Pi **desarrolla** el archivo del lado del cliente y pega su cuerpo en el primer turno. El modelo ya no tiene nada que decidir.

Hay dos consecuencias prácticas. La descripción es lo único en lo que se apoya la primera vía, de modo que todo el cuidado puesto en el cuerpo no sirve de nada mientras no active la lectura. Y un skill casi no cuesta nada mientras no se usa, lo que tienta a acumularlos. Tenga sin embargo presente que cada descripción añadida entra en el contexto en cada turno y que veinte skills terminan formando un preámbulo considerable.

::: info Ejercicio (en sala)
Verifique esta mecánica usted mismo, en su clon de NÉON.

1. Cree `.pi/skills/revue-rapide/SKILL.md` con el contenido anterior, modifique una línea de un archivo del juego, y luego abra una sesión.
2. Exporte la sesión con `\export` y localice el bloque `<available_skills>` en el prompt de sistema: el nombre, la descripción y la ruta están ahí, el cuerpo no está.
3. Pida « relee lo que acabo de modificar » sin nombrar el skill, y observe si el modelo va a leer `SKILL.md` por su cuenta: la llamada a la herramienta de lectura es visible en la sesión.
4. Abra una sesión nueva y escriba `/skill:revue-rapide`. El cuerpo esta vez está pegado en su primer mensaje, y ya no hay decisión que observar.

Ha recorrido las dos vías. La primera se apoya enteramente en la descripción, la segunda no la necesita.
:::

## Reconstruir

### Lo que un procedimiento debe producir

El skill que escribimos responde a la caída medida en el módulo anterior, y por lo tanto tiene dos cosas que lograr. La primera es que el agente **descomponga** el síntoma reportado por el jugador en defectos distintos, en lugar de detenerse en la primera explicación que da cuenta de lo que ve. La segunda es que **aguante hasta el final**, es decir que corrija cada defecto hasta el verde en lugar de detenerse una vez escritos los casos en rojo.

El skill `playtest` está escrito para eso. Le da al agente un rol, el del playtester que sabe que un síntoma no es un bug, un sistema de referencia de coordenadas para que los signos de velocidad no se adivinen, una tabla de diez familias de fallos que recorrer una por una, y la obligación de cuantificar cada disparador desde las constantes del archivo en lugar de describirlo.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest/SKILL.md{md}

Dos decisiones de redacción merecen ser señaladas, porque se transponen a cualquier procedimiento.

**El entregable es un archivo cuya forma está impuesta.** El paso 4 impone la forma de `.scratch/to_fix.md`, un bloque por defecto, con su causa localizada con precisión de línea, su invariante violado, su disparador cuantificado, su caso de test, la salida de fallo real copiada de la terminal, y la corrección ingenua que ese caso rechaza. Un agente que produce este archivo ha hecho necesariamente el trabajo que el archivo describe.

**El procedimiento también describe lo que rechaza.** El paso 3 pide poner cada caso en rojo dos veces, una vez sobre el código de hoy y otra sobre la corrección ingenua, lo que prohíbe los tests que solo verifican que algo cambió. Es la contrapartida directa de lo que el módulo anterior midió, donde correcciones pasaban las cuatro caras y fallaban en la esquina.

::: info Ejercicio (en sala)
Escriba la descripción antes de leer la nuestra, y luego compare. Es la única línea del archivo que el modelo leerá con seguridad, y su formulación exige por lo tanto el mayor cuidado.

Un criterio útil: ¿su descripción dice **cuándo** usarlo, o solo **qué** hace el procedimiento? Las dos formulaciones se parecen al releerlas, pero solo la primera ayuda al modelo a decidir abrir el archivo.
:::

### Cómo el skill entra en la medición

Las dos configuraciones con skill de la matriz reciben el siguiente prompt:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt-with-skill.md

Hay tres cosas que señalar. La petición es la petición descuidada del módulo anterior. El `/skill:playtest` al principio hace desarrollar el cuerpo del archivo del lado del cliente, así que el skill está **impuesto** en lugar de propuesto. Y la lectura de `ISSUES.md` está prohibida, para que el procedimiento trabaje sobre el síntoma del jugador y no sobre un ticket ya redactado.

La columna `skill_invoque` vale entonces 20/20 en estas dos configuraciones por construcción, y 0/20 en todas las demás. Registra un hecho sobre la sesión sin medir una decisión del modelo, y nada de lo que sigue trata la cuestión de si una buena descripción activa la lectura.

## Lo que dice la medición

Las configuraciones con skill se leen contra las que reciben el ticket bien encuadrado, con `AGENTS.md` y razonamiento idénticos. En `gemma-4-31b`, veinte repeticiones:

| configuración                    | `in_scope` | `tests_ajoutes` | ladrillos | esquinas | salida | vecinas |
| --------------------------------- | ---------- | --------------- | --------- | -------- | ------ | ------- |
| `+agents+well_crafted`           | 19/20      | 17/20           | 11/20     | 12/20    | 9/20   | 9/20    |
| `+agents+skill`                  | **6/20**   | **8/20**        | 16/20     | 7/20     | 13/20  | 14/20   |
| `+agents+add_tests+well_crafted` | 20/20      | 17/20           | 18/20     | 18/20    | 18/20  | 18/20   |
| `+agents+add_tests+skill`        | **9/20**   | **7/20**        | 13/20     | 12/20    | 13/20  | 13/20   |

De ahí sacamos tres lecturas, de las cuales dos están establecidas y una no lo está.

**El skill desplaza los tests fuera de la suite.** `tests_ajoutes` pasa de 17/20 a 8/20, es decir una diferencia de -47 puntos cuyo intervalo excluye el cero. No es un incumplimiento: el procedimiento pide explícitamente que los casos vivan en `.scratch/to_fix.md`, y el agente obedece. La métrica cuenta los casos añadidos a `game/neon.test.js`, así que registra exactamente lo que el skill decidió hacer: los casos existen, pero en un lugar donde la suite de tests del repositorio nunca irá a buscarlos.

**El skill deja sus borradores atrás.** `in_scope` cae de 19/20 a 6/20, es decir -68 puntos, también establecido. La columna `touched` nombra a los culpables: `.scratch/to_fix.md` permanece en once ejecuciones de veinte, acompañado de `.scratch/repro.test.js`, `.scratch/test_collision.js` o `.scratch/probe.js`. El paso 6 del `SKILL.md` ordena sin embargo retirar todos los archivos creados. La consigna de limpieza solo se sigue por lo tanto en menos de una ejecución de cada tres.

**Sobre la corrección en sí, nada está establecido.** El criterio pasa de 11/20 a 16/20 frente al ticket bien encuadrado, pero su intervalo contiene el cero. La columna de la esquina va en el otro sentido, 12/20 contra 7/20, y su intervalo también contiene el cero. Las veinte ejecuciones no permiten concluir ni que el procedimiento ayude, ni que perjudique.

::: warning Lo que la diferencia frente a la base no dice
La síntesis publica `+agents+skill` en +29 puntos sobre el criterio frente a `nothing`, diferencia establecida, y sería tentador convertir esto en el resultado del módulo.

Esta configuración se diferencia de la base por **cuatro cosas a la vez**: el razonamiento elevado, el archivo de reglas, el skill, y una extensión de búsqueda web. Las tres primeras tienen cada una su propia configuración en la matriz, el skill no la tiene, y por lo tanto nada permite atribuirle una parte de estos veintinueve puntos.

La única diferencia legible para el skill es la que lo compara con el ticket bien encuadrado, más arriba, y es no concluyente sobre la corrección. Aislar la palanca requeriría una configuración más, con petición descuidada, razonamiento elevado, archivo de reglas, y nada más. No se ha medido.
:::

### El skill frente a la pila mejor equipada

La configuración `+agents+add_tests+skill` se lee contra `+agents+add_tests+well_crafted`, de la que solo se diferencia por el remplazo del ticket bien encuadrado por el skill:

| columna          | ticket bien encuadrado | skill | diferencia  |
| ---------------- | ----------------------- | ----- | ----------- |
| `in_scope`       | 20/20                   | 9/20  | -55 pts `*` |
| `tests_ajoutes`  | 17/20                   | 7/20  | -50 pts `*` |
| `rebond_angles`  | 18/20                   | 12/20 | -30 pts `*` |
| `rebond_briques` | 18/20                   | 13/20 | -25 pts `o` |

Tres diferencias establecidas, todas negativas. En esta tarea, con este modelo, el procedimiento de trabajo no sustituye ventajosamente a un ticket correctamente redactado, y la columna de la esquina lo dice con más claridad: es la que el ticket describe y que el skill, que no tiene derecho a leer `ISSUES.md`, debe encontrar por sí solo.

`sonde_intacte` vale 20/20, así que ninguna ejecución modificó la sonda que tenía ante sí.

### Lo que cuesta el skill

| configuración                    | tokens de entrada | turnos | duración |
| --------------------------------- | ------------------ | ------ | -------- |
| `+agents+well_crafted`           | 413 335             | 30     | 378 s    |
| `+agents+skill`                  | **921 783**         | 49     | 575 s    |
| `+agents+add_tests+well_crafted` | 558 473             | 31     | 590 s    |
| `+agents+add_tests+skill`        | **811 584**         | 44     | 540 s    |

Frente a la base, `+agents+skill` cuesta +908 622 tokens de entrada, +47 turnos y +560 segundos, estando las tres diferencias establecidas. Es la configuración más cara de toda la matriz.

::: warning Estas columnas de coste deben leerse con la reserva del módulo anterior
Las dos configuraciones con skill llevan por sí solas 632 de los 1 151 reintentos de la matriz ILaaS, 345 para una y 287 para la otra. Un reintento vuelve a ejecutar el turno con todo el contexto acumulado, así que estas columnas miden en parte nuestra propia carga sobre el proveedor.

El orden de magnitud sigue siendo legible en la matriz `deepseek-v4-flash`, que cuenta treinta y siete reintentos en total y donde `+agents+skill` toma 1 068 segundos de mediana frente a 553 para `+agents+well_crafted`. Un procedimiento de seis pasos que impone una búsqueda documental, diez familias que instruir y un bucle TDD es un trabajo largo, y la medición no dice nada más.
:::

## Revisar el procedimiento, y luego volver a medir

Un procedimiento de trabajo es texto versionado que produce efectos medibles, y por lo tanto se revisa como código: un diagnóstico extraído de las ejecuciones, una corrección, una nueva medición. Las columnas en fallo de la matriz tienen cada una una causa que se lee en las ejecuciones tomadas una por una.

**Los tests nacen en el lugar equivocado.** El paso 3 dice que los casos viven en `.scratch/to_fix.md`, y es el paso 5 el que los hace migrar hacia `game/neon.test.js`. Esta migración es el escalón que el modelo se salta: diez ejecuciones de veinte terminan en « 6 casos, como en el patrón », habiendo el agente corregido el código contra sus borradores y considerado terminado el trabajo.

**La consigna de limpieza a veces destruye el entregable.** « Retira todos los archivos que has creado » quedó como letra muerta en las trece ejecuciones que dejan archivos atrás, y dos ejecuciones, por el contrario, la aplicaron al pie de la letra: `game/neon.test.js`, que el agente acababa de rellenar, ya no existe en el árbol medido.

**Una referencia fantasma fabrica archivos.** El paso 3 pide ejecutar cada caso « desde la sonda del paso 1 », cuando el paso 1 es la búsqueda documental y no crea ninguna sonda. Esta consigna huérfana, que quedó de una versión anterior del archivo, empuja a las ejecuciones a inventar lo que falta: los `probe.js`, `repro.test.js` y `test_ghost.js` que llenan la columna `touched` son su rastro.

La matriz `deepseek-v4-flash` completa el diagnóstico: el mismo skill obtiene ahí `tests_ajoutes` en 20/20. El contenido del procedimiento basta entonces para un modelo que tiene el presupuesto para desarrollarlo; en `gemma-4-31b`, es el protocolo mismo el que agota ese presupuesto.

### La revisión: `playtest-court`

La versión revisada conserva lo que sostiene el contenido: el rol, el sistema de referencia de coordenadas, la tabla de las diez familias y la obligación de cuantificar cada disparador desde las constantes. Recorta el resto, y cada recorte responde a un defecto leído en las ejecuciones. Los casos se escriben directamente en rojo en `game/neon.test.js` y el procedimiento ya no crea ningún archivo, lo que elimina a la vez la migración fallida y la necesidad de limpieza. El paso de búsqueda web desaparece, ya que las sesiones solo mostraban una única llamada. El doble rojo y el bloque de doce campos son remplazados por una exigencia de una línea: el caso verifica el comportamiento esperado en valores, nunca solo « algo cambió ». El archivo pasa de seis pasos a cuatro y de 182 líneas a 86.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest-court/SKILL.md{md}

### Lo que dice la segunda matriz

El escenario `issue1-skills` enfrenta los dos skills, con `AGENTS.md`, razonamiento y modelo idénticos, veinte repeticiones por celda, sirviendo la original como referencia para las diferencias. Vive en su propio archivo para no tocar las matrices archivadas del módulo, y su hipótesis, `hypotheses/issue1-skills.md`, fue escrita antes de medir. En `gemma-4-31b`:

| columna          | `playtest` | `playtest-court` | diferencia             |
| ---------------- | ---------- | ----------------- | ---------------------- |
| `in_scope`       | 9/20       | **20/20**         | +53 pts `*` [+32, +74] |
| `tests_ajoutes`  | 13/20      | **20/20**         | +32 pts `*` [+11, +53] |
| `rebond_briques` | 14/20      | 17/20              | +11 pts `o`            |
| `rebond_angles`  | 4/20       | 8/20               | +19 pts `o`            |

En `deepseek-v4-flash`, `in_scope` pasa de 15/20 a 20/20, es decir +25 puntos establecidos [+10, +45], y ninguna columna de corrección se mueve: la diferencia en el criterio vale +0 punto.

De ahí sacamos tres lecturas.

**Los dos desplazamientos establecidos de la primera versión desaparecen.** El perímetro está completo en las cuarenta ejecuciones con el skill corto, y los tests van todos a la suite del repositorio. Los modelos son los mismos, solo cambió el protocolo: cuando el entregable se escribe directamente en su lugar, ya no hay migración que fallar ni limpieza que obtener. Un procedimiento que realmente necesitara archivos intermedios conservaría el problema intacto, y el módulo sobre los permisos mostrará cómo un hook que rechaza un `git commit` mientras el borrador esté en el árbol garantiza lo que una frase solo puede sugerir.

**La corrección sigue sin moverse de forma establecida.** +11 puntos sobre el criterio y +19 sobre la esquina, con intervalos que contienen el cero en ambos casos. La esquina sigue siendo la columna más baja de gemma, en 8/20, lejos de los 14/20 que el prompt bien encuadrado obtenía en el módulo anterior: la revisión reparó el protocolo del procedimiento, no remplazó el ticket.

**El coste baja, y la diferencia es legible en flash.** Su matriz lleva veintitrés reintentos, un total del mismo orden que los treinta y siete que el módulo anterior consideraba legibles, y el skill corto toma ahí 12 861 tokens de entrada en mediana frente a 34 764, 692 segundos frente a 1 054, y la diferencia de turnos vale -27 con un intervalo de [-47, -16]. La matriz gemma va en el mismo sentido pero lleva 490 reintentos, de modo que sus columnas de coste conservan la reserva habitual: la hipótesis predecía esta baja, y esa matriz no puede confirmarla.

::: warning La celda replicada no dio las mismas cifras
`+agents+skill` vuelta a medir en gemma da 9/20 en el perímetro, 13/20 en los tests añadidos y 14/20 en el criterio, donde la campaña del módulo daba 6, 8 y 16. Misma configuración, mismo commit, mismo modelo: es la dispersión del módulo anterior, vista una vez más. Es también por eso que el escenario vuelve a medir la original en la misma matriz en lugar de copiar sus cifras anteriores, y por eso las diferencias de esta sección solo comparan celdas medidas juntas.
:::

El archivo de estas dos matrices está en `scripts/trysquare-campaign/results-2026-08-13/`.

## Lo que un skill no garantiza

Todo lo que las dos matrices acaban de mostrar se reduce a una sola propiedad: un skill solo tiene texto. La consigna de limpieza ignorada, el borrador nunca migrado a la suite, la referencia fantasma seguida al pie de la letra: cada vez, el procedimiento pedía algo que nada obligaba al modelo a hacer. Un skill no tiene ni esquema de entrada, ni función de ejecución, ni guardia de permiso. La literatura sobre herramientas de agentes describe la anatomía de una herramienta, a saber un nombre, una descripción leída por el modelo, un esquema de entrada, una función de ejecución y un permiso entre la validación y la ejecución, y un skill solo realiza los dos primeros elementos.

Pi tiene un segundo mecanismo para el resto. Una **extensión** es un módulo TypeScript colocado en `.pi/extensions/`, que llama a `pi.registerTool({ name, ... })`: una herramienta real, con un esquema JSON validado, una función que usted ha escrito, y la posibilidad de interceptar las llamadas a herramientas para insertar ahí un permiso. Ya se ha cruzado con una sin saberlo: la herramienta de búsqueda web que la primera versión del procedimiento pedía es una extensión, cargada por la pieza `extension` del escenario. El módulo sobre los permisos se apoyará en este mecanismo para transformar las consignas en garantías.

::: danger Un campo documentado no está necesariamente leído
Si a pesar de todo busca un mecanismo de permiso del lado del skill, se suele leer que un skill declara las herramientas que se autoriza a través de un campo `allowed-tools` en su frontmatter. La documentación entregada con Pi 0.80.6 lo describe efectivamente, en su tabla del frontmatter:

```
| `allowed-tools` | No | Space-delimited list of pre-approved tools (experimental). |
```

El tipo que el código lee es este:

```ts
export interface SkillFrontmatter {
    name?: string;
    description?: string;
    "disable-model-invocation"?: boolean;
    [key: string]: unknown;
}
```

Este tipo solo contiene tres campos, y la cadena `allowed-tools` no aparece en ningún lugar del código compilado del paquete, mientras que `disable-model-invocation` sí se lee. El `[key: string]: unknown` acepta silenciosamente todo lo que usted añada, sin usarlo nunca ni avisarle.

Es la misma trampa que el `--thinking max` del módulo anterior, todavía más engañosa, ya que la fuente que le induce al error es aquí la propia documentación de la herramienta. Un skill no tiene ningún mecanismo de permiso propio, y si quiere uno, necesita una extensión.
:::

## Lo que este módulo todavía no sabe

Quedan dos preguntas abiertas y es mejor nombrarlas claramente que creerlas resueltas.

**¿Una buena descripción activa la lectura?** Nuestras configuraciones imponen el skill mediante `/skill:`, así que las matrices miden un procedimiento aplicado y nunca un procedimiento elegido. La pregunta depende de la mecánica descrita más arriba, es medible con la columna `skill_invoque` que ya existe para eso, y requiere una configuración donde el skill se carga por su nombre sin desarrollarse en el prompt.

**¿El skill aporta algo a igualdad de petición?** Sigue faltando el testigo, es decir la misma configuración sin el skill. La segunda matriz no lo añadió: compara dos versiones del procedimiento entre sí, no el procedimiento con su ausencia.

::: info Ejercicio (en autonomía)
Añada al escenario una configuración `+agents+skill_par_nom`, idéntica a `+agents+skill` pero cuyo prompt no contiene el `/skill:`, quedando el skill cargado por la pieza `harness`. Vuelva a lanzar, y lea `skill_invoque`.

Medirá lo único que este módulo afirma sin haberlo establecido, y no habrá tocado ni la herramienta, ni el validador, ni las demás configuraciones.
:::

## Generalizar

**Un skill es un procedimiento de trabajo, no una herramienta.** No tiene ni esquema de entrada, ni función, ni permiso, y el único mecanismo de que dispone es el texto. Lo que sabe hacer es imponer un orden de trabajo y una forma de entregable, lo cual es útil y no debe confundirse con la ejecución de un código que usted controla.

**La descripción es lo único que se lee con seguridad.** El cuerpo solo entra en el contexto si el modelo decide abrirlo o si el usuario lo desarrolla con `/skill:`. Una descripción que dice qué hace el procedimiento, en lugar de cuándo usarlo, se dirige a la decisión equivocada.

**Un procedimiento desplaza el trabajo antes de mejorarlo.** Los dos efectos establecidos de la primera versión son desplazamientos: los tests se van a un archivo de borrador en lugar de a la suite del repositorio, y los borradores permanecen en el árbol. La revisión elimina estos dos desplazamientos, y el efecto sobre la corrección sigue siendo no concluyente en ambas versiones. Antes de preguntar si una pieza mejora el resultado, mire primero adónde envía el trabajo.

**Una consigna de limpieza no garantiza la limpieza.** El paso final de nuestro `SKILL.md` pide retirar los archivos creados, y once ejecuciones de veinte los dejan. La revisión que completó el perímetro no reforzó la consigna, eliminó la necesidad de limpieza: un procedimiento que no crea nada no tiene nada que limpiar. Cuando los archivos intermedios son realmente necesarios, lo que debe ocurrir incluso si el modelo no piensa en ello requiere un mecanismo que no dependa de él.

**Cada paso intermedio es un escalón que el modelo puede saltarse.** Los tests nacían en un borrador antes de migrar a la suite, y esta migración es el paso perdido diez veces de veinte. Escribir el entregable directamente en su lugar eliminó el escalón, y las dos columnas afectadas pasaron a 20/20 en los dos modelos.

**Un procedimiento se revisa como código, con las ejecuciones en la mano.** El diagnóstico no viene de las columnas agregadas sino de las ejecuciones leídas una por una: la migración fallida, la consigna aplicada al pie de la letra y la referencia fantasma dictaron cada recorte, y una nueva matriz verificó la revisión en lugar de creerla.

**Un campo documentado no está necesariamente leído.** `allowed-tools` figura en la documentación entregada con Pi y no aparece en ninguna parte de su código. El código es la única fuente que no se equivoca, y la verificación cabe en un `grep`.

**Una pieza de arnés se mide contra lo que remplaza, nunca contra nada.** En esta tarea, remplazar el ticket bien encuadrado por el procedimiento hace perder treinta puntos en la esquina y cincuenta en los tests añadidos, lo cual no se ve en una comparación contra la base.

## Entregable

Tres piezas.

**1. El skill**, en `.pi/skills/<nombre>/`, con su descripción escrita por usted y un entregable cuya forma está impuesta por el cuerpo. Si lo ha revisado, las dos versiones siguen versionadas: la matriz que las compara no se entiende sin ellas.

**2. El directorio de matriz** producido por `trysquare run`, con la configuración con skill leída contra la que remplaza y no contra la base.

**3. La línea « herramientas » de la ficha de decisión**:

| palanca                            | efecto medido | ¿adoptado? | por qué |
| ----------------------------------- | ------------- | ---------- | ------- |
| skill (markdown)                    |               |            |         |
| descripción del skill               |               |            |         |
| skill impuesto por `/skill:`        |               |            |         |
| forma del entregable impuesta       |               |            |         |
| entregable directo o vía borrador   |               |            |         |
| extensión (herramienta real)        |               |            |         |

::: tip Criterio de éxito
Sabe citar un efecto de su skill que está establecido, un efecto que no lo está, y decir qué falta para decidir sobre el segundo.

Este criterio requiere haber leído una configuración contra la referencia correcta. Por lo tanto no se puede satisfacer de memoria.
:::

## Las trampas

**Leer una configuración con skill contra la base.** Se diferencia de ella por varias cosas a la vez, y la diferencia publicada contra `nothing` mezcla todas las palancas de la pila. La referencia útil es la configuración de la que solo se diferencia por el skill.

**Confundir un skill impuesto con un skill propuesto.** El `/skill:` del prompt desarrolla el cuerpo del lado del cliente, y una columna de invocación llena entonces no dice nada de lo que el modelo habría elegido.

**Cuidar el cuerpo del `SKILL.md` descuidando la descripción.** El cuerpo solo se lee si la descripción activó su lectura.

**Hacer escribir los tests en otro lugar que la suite.** Un caso de test que vive en un archivo de trabajo no será ejecutado por nadie después de que el agente se vaya, y la migración prometida hacia la suite es precisamente el paso que el modelo se salta.

**Contar con una consigna de limpieza.** Solo se sigue en menos de una ejecución de cada tres, lo que queda en el árbol hace fallar el perímetro de toda la configuración, y la corrección robusta no es una mejor consigna sino un procedimiento que no crea nada.

**Revisar sin volver a medir.** Una revisión que responde punto por punto al diagnóstico sigue siendo una hipótesis mientras una matriz no la haya verificado. La nuestra también predecía una baja de coste en gemma, y esa matriz no puede confirmarla, ya que sus reintentos vuelven ilegibles las columnas de coste.

**Acumular skills.** Cada uno cuesta poco mientras no se use, pero sus descripciones entran todas en el contexto en cada turno.

## Para ir más allá

- [Agent Skills](https://agentskills.io), el estándar abierto que Pi implementa, y su página sobre la integración en un prompt de sistema.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Schick et al., [Toolformer](https://arxiv.org/abs/2302.04761), sobre la idea de que un modelo aprenda cuándo y cómo llamar a una herramienta.
- Yao et al., [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629), el bucle que alterna razonamiento y acción.
- La [documentación de las extensiones de Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), para la pieza que da garantías donde el skill da sugerencias.
