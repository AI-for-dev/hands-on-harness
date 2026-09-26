# Los skills: un procedimiento de trabajo y lo que desplaza

::: tip Objetivos de este módulo
- Saber qué es un skill en Pi, qué ve el modelo de él y qué no ve
- Distinguir una competencia que el modelo puede ignorar de una competencia que se le impone
- Escribir un procedimiento de trabajo que produzca un entregable aprovechable
- Medir lo que desplaza y no confundir desplazar con mejorar
- Revisar un procedimiento a partir de las ejecuciones leídas y verificar la revisión con una nueva matriz
:::

El módulo anterior repasó lo que se gana haciendo las cosas mejor: elegir un modelo, ajustar un deslizador, escribir un ticket, mantener un archivo de reglas. Terminó con una constatación: en las configuraciones que reciben el ticket acotado, cuatro de cada veinte ejecuciones escriben las pruebas rojas que pide el ticket y nunca abren `game/neon.js`: el modelo agota su presupuesto formulando los casos y no llega a corregirlos. La única palanca que compensó ese desfase consistía en proporcionarle las pruebas ya escritas, algo que nadie hará en un ticket real.

La pregunta de este módulo es, por tanto, si un **procedimiento de trabajo**, escrito una vez y recargado bajo demanda, consigue lo mismo sin proporcionar las pruebas.

Seguimos el orden habitual: entender qué es un skill en el harness, escribir uno sobre esta cuestión, medir lo que produce y luego revisarlo y volver a medir.

## Comprender

### Un skill es un archivo Markdown

Un **skill** es un archivo `SKILL.md` colocado en un directorio `.pi/skills/<nom>/` del proyecto, con el formato del estándar abierto [Agent Skills](https://agentskills.io). Se compone de un frontmatter, que lleva como mínimo un nombre y una descripción, y de un cuerpo que contiene las instrucciones. No hay que prever ni código, ni registro, ni configuración: basta con colocar el archivo.

He aquí un skill completo, deliberadamente mínimo:

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

La idea es la de un procedimiento de trabajo que se escribe una vez y que el agente recarga bajo demanda, en lugar de volver a escribirlo en cada prompt. Ocupa un lugar aparte en el harness: `AGENTS.md` entra en el contexto en cada turno y, por tanto, cuesta en cada turno, mientras que un skill está hecho para entrar solo cuando la tarea lo pide.

### Lo que el modelo ve de él

Un detalle de mecánica condiciona todo lo demás: Pi inyecta en el system prompt, **en cada turno**, el nombre, la descripción y la ruta de cada skill disponible:

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

El **cuerpo** del `SKILL.md` no está en él. Entra en el contexto por una de las dos vías siguientes, y la diferencia entre ambas es el tema de este módulo.

La primera es que el modelo **decide** abrirlo con la herramienta de lectura, basándose únicamente en la descripción. La documentación de Pi lo dice en los mismos términos, añadiendo que «models don't always do this».

La segunda es que el usuario escriba `/skill:revue-rapide` en su mensaje, en cuyo caso Pi **expande** el archivo del lado del cliente y pega su cuerpo en el primer turno. El modelo ya no tiene nada que decidir.

Hay dos consecuencias prácticas. La descripción es lo único sobre lo que se apoya el primer camino, de modo que todo el cuidado puesto en el cuerpo no sirve de nada mientras no dispare. Y un skill casi no cuesta nada mientras no se use, lo que invita a acumularlos. Ten en cuenta, sin embargo, que cada descripción añadida entra en el contexto en cada turno y que veinte skills terminan formando un preámbulo considerable.

::: info Ejercicio (en el aula)
Comprueba esta mecánica por ti mismo, en tu clon de NÉON.

1. Crea `.pi/skills/revue-rapide/SKILL.md` con el contenido anterior, modifica una línea de un archivo del juego y abre una sesión.
2. Exporta la sesión con `\export` y localiza el bloque `<available_skills>` en el system prompt: el nombre, la descripción y la ruta están ahí, el cuerpo no.
3. Pide «relee lo que acabo de modificar» sin nombrar el skill y observa si el modelo lee `SKILL.md` por sí mismo: la llamada a la herramienta de lectura es visible en la sesión.
4. Abre una sesión nueva y escribe `/skill:revue-rapide`. Esta vez el cuerpo está pegado en tu primer mensaje, y ya no hay ninguna decisión que observar.

Acabas de recorrer los dos caminos. El primero se apoya por completo en la descripción; el segundo no la necesita.
:::

## Reconstruir

### Lo que un procedimiento debe producir

La skill que escribimos responde a la deserción medida en el módulo anterior y tiene por tanto dos objetivos. La primera es que el agente **descomponga** el síntoma reportado por el jugador en defectos distintos, en lugar de detenerse en la primera explicación que da cuenta de lo que ve. La segunda es que **vaya hasta el final**, es decir, que corrija cada defecto hasta el verde en lugar de detenerse una vez escritos los casos rojos.

La skill `playtest` está escrita para eso. Le da al agente un rol, el del playtester que sabe que un síntoma no es un bug; una referencia de coordenadas para que los signos de velocidad no se adivinen; una tabla de diez familias de fallas para repasar una por una; y la obligación de cuantificar cada disparador a partir de las constantes del archivo en lugar de describirlo.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest/SKILL.md{md}

Dos decisiones de redacción se trasladan a cualquier procedimiento.

**El entregable es un archivo con una forma impuesta.** El paso 4 impone la forma de `.scratch/to_fix.md`: un bloque para cada defecto, con su causa localizada a la línea exacta, su invariante violado, su disparador cuantificado, su caso de test, la salida de fallo real copiada del terminal y la corrección ingenua que ese caso rechaza. Un agente que produce este archivo ha hecho necesariamente el trabajo que el archivo describe.

**El procedimiento también describe lo que rechaza.** El paso 3 pide poner cada caso en rojo dos veces, una vez sobre el código actual y otra sobre la corrección ingenua, lo que descarta las pruebas que solo verifican que algo ha cambiado. Es la contrapartida directa de lo que midió el módulo anterior, donde algunas correcciones pasaban las cuatro caras y fallaban en la esquina.

::: info Ejercicio (en clase)
Escribe la descripción antes de leer la nuestra y luego compara. Es la única línea del archivo que el modelo leerá con seguridad, y su redacción exige el mayor cuidado.

Un criterio útil: ¿tu descripción dice **cuándo** usarlo, o solo **qué** hace el procedimiento? Las dos formulaciones se parecen al releerlas, pero solo la primera ayuda al modelo a decidir abrir el archivo.
:::

### Cómo entra el skill en la medición

Las dos configuraciones con skill de la matriz reciben el siguiente prompt:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt-with-skill.md

Hay tres cosas a tener en cuenta: la solicitud es la solicitud desatendida del módulo anterior; el `/skill:playtest` al inicio hace que el cuerpo del archivo se expanda del lado del cliente, por lo que el skill es **impuesto** en lugar de propuesto; y la lectura de `ISSUES.md` está prohibida, para que el procedimiento trabaje sobre el síntoma del jugador y no sobre un ticket ya redactado.

La columna `skill_invoque` vale, por tanto, 20/20 en estas dos configuraciones por construcción, y 0/20 en todas las demás. Registra un hecho sobre la sesión sin medir una decisión del modelo, y nada de lo que sigue aborda la cuestión de si una buena descripción activa el skill.

## Lo que dice la medición

Las configuraciones con skill se comparan con las que reciben el ticket estructurado, con `AGENTS.md` y razonamiento idénticos. Sobre `gemma-4-31b`, veinte repeticiones:

| configuración                    | `in_scope` | `tests_ajoutes` | bloques | esquinas | salida | vecinas |
| -------------------------------- | ---------- | --------------- | ------- | -------- | ------ | ------- |
| `+agents+well_crafted`           | 19/20      | 17/20           | 11/20   | 12/20    | 9/20   | 9/20    |
| `+agents+skill`                  | **6/20**   | **8/20**        | 16/20   | 7/20     | 13/20  | 14/20   |
| `+agents+add_tests+well_crafted` | 20/20      | 17/20           | 18/20   | 18/20    | 18/20  | 18/20   |
| `+agents+add_tests+skill`        | **9/20**   | **7/20**        | 13/20   | 12/20    | 13/20  | 13/20   |

De ello extraemos tres lecturas, de las cuales dos están establecidas y una no.

**La competencia desplaza las pruebas fuera de la suite.** `tests_ajoutes` pasa de 17/20 a 8/20, es decir, una diferencia de -47 puntos cuyo intervalo excluye el cero. No es un incumplimiento: el procedimiento pide explícitamente que los casos vivan en `.scratch/to_fix.md`, y el agente obedece. La métrica cuenta los casos añadidos a `game/neon.test.js`, así que registra exactamente lo que la competencia decidió hacer: los casos existen, pero en un lugar donde la suite de pruebas del repositorio nunca irá a buscarlos.

**La competencia deja sus borradores detrás de sí.** `in_scope` cae de 19/20 a 6/20, es decir, una diferencia de -68 puntos, también establecida. La columna `touched` nombra a los culpables: `.scratch/to_fix.md` permanece en once ejecuciones de veinte, acompañado de `.scratch/repro.test.js`, `.scratch/test_collision.js` o `.scratch/probe.js`. El paso 6 del `SKILL.md` ordena, sin embargo, retirar todos los archivos creados. La instrucción de limpieza solo se sigue, por tanto, en menos de una ejecución de cada tres.

**Sobre la corrección en sí, nada está establecido.** El criterio pasa de 11/20 a 16/20 frente al ticket delimitado, pero su intervalo contiene el cero. La columna de la esquina va en la otra dirección, 12/20 frente a 7/20, y su intervalo también contiene el cero. Las veinte ejecuciones no permiten concluir ni que el procedimiento ayude, ni que perjudique.

::: warning Lo que no dice la diferencia con la base
La síntesis publica `+agents+skill` con +29 puntos en el criterio frente a `nothing`, una diferencia establecida, y sería tentador convertirlo en el resultado del módulo.

Esta configuración difiere de la base en **cuatro cosas a la vez**: el razonamiento elevado, el archivo de reglas, la competencia y una extensión de búsqueda web. Las tres primeras tienen cada una su propia configuración en la matriz, la competencia no tiene ninguna, y nada permite, por tanto, atribuirle una parte de esos veintinueve puntos.

La única diferencia legible para la competencia es la que la compara con el ticket delimitado, más arriba, y no es concluyente sobre la corrección. Aislar la palanca exigiría una configuración más, con una solicitud descuidada, razonamiento elevado, archivo de reglas y nada más. No se ha medido.
:::

### La competencia frente a la pila mejor equipada

La configuración `+agents+add_tests+skill` se lee contra `+agents+add_tests+well_crafted`, de la que solo difiere en el reemplazo del ticket delimitado por la competencia:

| columna          | ticket delimitado | competencia | diferencia |
| ---------------- | ------------ | ---------- | ----------- |
| `in_scope`       | 20/20        | 9/20       | -55 pts `*` |
| `tests_ajoutes`  | 17/20        | 7/20       | -50 pts `*` |
| `rebond_angles`  | 18/20        | 12/20      | -30 pts `*` |
| `rebond_briques` | 18/20        | 13/20      | -25 pts `o` |

Tres diferencias constatadas, todas negativas. En esta tarea, con este modelo, el procedimiento de trabajo no sustituye ventajosamente a un ticket correctamente redactado, y la columna de la esquina lo dice con mayor claridad: es la que describe el ticket y la que la competencia, que no tiene derecho a leer `ISSUES.md`, debe encontrar por sí sola.

`sonde_intacte` vale 20/20, así que ninguna ejecución modificó la sonda que tenía ante los ojos.

### Lo que cuesta la competencia

| configuración                    | tokens de entrada | turnos | duración |
| -------------------------------- | ----------------- | ------ | -------- |
| `+agents+well_crafted`           | 413 335           | 30     | 378 s    |
| `+agents+skill`                  | **921 783**       | 49     | 575 s    |
| `+agents+add_tests+well_crafted` | 558 473           | 31     | 590 s    |
| `+agents+add_tests+skill`        | **811 584**       | 44     | 540 s    |

Frente a la base, `+agents+skill` cuesta +908 622 tokens de entrada, +47 turnos y +560 segundos, con las tres diferencias constatadas. Es la configuración más cara de toda la matriz.

::: warning Estas columnas de coste deben leerse con la reserva del módulo anterior
Las dos configuraciones con competencia concentran por sí solas 632 de las 1 151 repeticiones de la matriz ILaaS, 345 para una y 287 para la otra. Una repetición vuelve a jugar el turno con todo el contexto acumulado, así que estas columnas miden en parte nuestra propia carga sobre el proveedor.

El orden de magnitud sigue siendo legible en la matriz `deepseek-v4-flash`, que cuenta treinta y siete repeticiones en total y donde `+agents+skill` tarda 1 068 segundos de mediana frente a 553 para `+agents+well_crafted`. Un procedimiento en seis pasos que impone una búsqueda documental, diez familias que instruir y un bucle TDD es un trabajo largo, y la medición no dice nada más.
:::

## Revisar el procedimiento y volver a medir

Un procedimiento de trabajo es texto versionado que produce efectos medibles, y por tanto se revisa como código: un diagnóstico extraído de las ejecuciones, una corrección, una nueva medición. Las columnas fallidas de la matriz tienen cada una una causa que se lee en las ejecuciones tomadas una a una.

**Las pruebas nacen en el lugar equivocado.** El paso 3 dice que los casos viven en `.scratch/to_fix.md`, y es el paso 5 el que los hace migrar a `game/neon.test.js`. Esa migración es el paso que el modelo falla: diez ejecuciones de veinte terminan en «6 casos, como en la referencia», habiendo corregido el agente el código contra sus borradores y considerado el trabajo terminado.

**La consigna de limpieza a veces destruye el entregable.** «Retira todos los archivos que hayas creado» quedó en letra muerta en las trece ejecuciones que dejan archivos tras de sí, y dos ejecuciones, en cambio, la aplicaron al pie de la letra: `game/neon.test.js`, que el agente acababa de llenar, ya no existe en el árbol medido.

**Una referencia fantasma crea archivos.** El paso 3 pide ejecutar cada caso «desde la sonda del paso 1», mientras que el paso 1 es la búsqueda documental y no crea ninguna sonda. Esta instrucción huérfana, que quedó de una versión anterior del archivo, empuja a las ejecuciones a inventar lo que falta: los `probe.js`, `repro.test.js` y `test_ghost.js` que llenan la columna `touched` son su rastro.

La matriz `deepseek-v4-flash` completa el diagnóstico: la misma habilidad obtiene ahí `tests_ajoutes` con 20/20. El contenido del procedimiento basta entonces para un modelo que tiene el presupuesto de ejecutarlo; en `gemma-4-31b`, es el propio protocolo el que agota ese presupuesto.

### La revisión: `playtest-court`

La versión revisada conserva lo que sostiene el contenido: el rol, la referencia de coordenadas, la tabla de las diez familias y la obligación de cuantificar cada disparador a partir de las constantes. Recorta el resto, y cada recorte responde a un defecto leído en las ejecuciones. Los casos se escriben directamente en rojo en `game/neon.test.js` y el procedimiento ya no crea ningún archivo, lo que elimina a la vez la migración fallida y la necesidad de limpieza. El paso de búsqueda web desaparece, ya que las sesiones no mostraban más que una sola llamada. El doble rojo y el bloque de doce campos se sustituyen por un requisito de una línea: el caso verifica el comportamiento esperado en valores, nunca solo «algo ha cambiado». El archivo pasa de seis pasos a cuatro y de 182 líneas a 86.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest-court/SKILL.md{md

### Lo que dice la segunda matriz

El escenario `issue1-skills` enfrenta a las dos habilidades, con `AGENTS.md`, razonamiento y modelo idénticos, veinte repeticiones por celda, y la original sirviendo de referencia para las diferencias. Vive en su propio archivo para no tocar las matrices archivadas del módulo, y su hipótesis, `hypotheses/issue1-skills.md`, se escribió antes de medir. En `gemma-4-31b`:

| columna          | `playtest` | `playtest-court` | diferencia            |
| ---------------- | ---------- | ---------------- | ---------------------- |
| `in_scope`       | 9/20       | **20/20**        | +53 pts `*` [+32, +74] |
| `tests_ajoutes`  | 13/20      | **20/20**        | +32 pts `*` [+11, +53] |
| `rebond_briques` | 14/20      | 17/20            | +11 pts `o`            |
| `rebond_angles`  | 4/20       | 8/20             | +19 pts `o`            |

En `deepseek-v4-flash`, `in_scope` pasa de 15/20 a 20/20, es decir, +25 puntos establecidos [+10, +45], y ninguna columna de corrección se mueve: la diferencia en el criterio vale +0 puntos.

De ello extraemos tres lecturas.

**Los dos desplazamientos establecidos de la primera versión desaparecen.** El alcance está completo en las cuarenta ejecuciones de competencia corta, y los tests van todos a la suite del repositorio. Los modelos son los mismos, solo ha cambiado el protocolo: cuando el entregable se escribe directamente en su sitio, ya no hay migración que fallar ni limpieza que conseguir. Un procedimiento que necesitara de verdad archivos intermedios conservaría el problema entero, y el módulo sobre los permisos mostrará cómo un hook que rechaza un `git commit` mientras el borrador está en el árbol garantiza lo que una frase solo puede sugerir.

**La corrección sigue sin mostrar un desplazamiento establecido.** +11 puntos en el criterio y +19 en la esquina, con intervalos que contienen cero en los dos casos. La esquina sigue siendo la columna más baja de gemma, con 8/20, lejos de los 14/20 que el prompt enmarcado obtenía en el módulo anterior: la revisión ha reparado el protocolo del procedimiento, pero no ha sustituido el ticket.

**El coste baja, y la diferencia es legible en flash.** Su matriz lleva veintitrés repeticiones, un total del mismo orden que los treinta y siete que el módulo anterior juzgaba legibles, y la competencia corta consume allí 12 861 tokens de entrada en mediana frente a 34 764, 692 segundos frente a 1 054, y la diferencia de turnos es de -27 con un intervalo de [-47, -16]. La matriz gemma va en el mismo sentido, pero lleva 490 repeticiones, de modo que sus columnas de coste mantienen la reserva habitual: la hipótesis predecía esta bajada, y esa matriz no puede confirmarla.

::: warning La celda replicada no ha devuelto las mismas cifras
`+agents+skill` remedida en gemma da 9/20 en el alcance, 13/20 en los tests añadidos y 14/20 en el criterio, mientras que la campaña del módulo daba 6, 8 y 16. Misma configuración, mismo commit, mismo modelo: es la dispersión del módulo anterior, vista una vez más. Es también por eso que el escenario vuelve a medir la original en la misma matriz en lugar de recopilar sus cifras antiguas, y por eso las diferencias de esta sección solo comparan celdas medidas juntas.
:::

El archivo de estas dos matrices está en `scripts/trysquare-campaign/results-2026-08-13/`.

## Lo que un skill no garantiza

Todo lo que las dos matrices acaban de mostrar se reduce a una sola propiedad: un skill solo tiene texto. La consigna de limpieza ignorada, el borrador nunca migrado a la suite, la referencia fantasma seguida al pie de la letra: cada vez, el procedimiento pedía algo que nada obligaba al modelo a hacer. Un skill no tiene ni esquema de entrada, ni función de ejecución, ni guardia de permiso. Una herramienta de agente completa tiene un nombre, una descripción leída por el modelo, un esquema de entrada, una función de ejecución y un permiso entre la validación y la ejecución; un skill solo implementa los dos primeros elementos.

Pi tiene un segundo mecanismo para el resto. Una **extensión** es un módulo TypeScript ubicado en `.pi/extensions/`, que llama a `pi.registerTool({ name, ... })`: una herramienta real, con un esquema JSON validado, una función que has escrito, y la posibilidad de interceptar las llamadas a herramientas para insertar un permiso en ellas. Ya te has topado con una sin saberlo: la herramienta de búsqueda web que pedía la primera versión del procedimiento es una extensión, cargada por el bloque `extension` del escenario. El módulo de permisos se apoyará en este mecanismo para convertir las instrucciones en garantías.

::: danger Un campo documentado no se lee necesariamente
Si pese a todo buscas un mecanismo de permiso en el skill, a menudo se lee que un skill declara las herramientas que se permite invocar mediante un campo `allowed-tools` en su frontmatter. La documentación incluida con Pi 0.80.6 lo describe efectivamente, en su tabla de frontmatter:

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

Este tipo solo contiene tres campos, y la cadena `allowed-tools` no aparece en ningún lugar del código compilado del paquete, mientras que `disable-model-invocation` sí se lee. El `[key: string]: unknown` acepta silenciosamente todo lo que añadas, sin usarlo nunca ni avisarte.

Es la misma trampa que el `--thinking max` del módulo anterior, aún más engañosa, ya que la fuente que te induce a error aquí es la documentación de la propia herramienta. Un skill no tiene ningún mecanismo de permiso propio, y si quieres uno, hace falta una extensión.
:::

## Lo que este módulo aún no sabe

Dos preguntas siguen abiertas, y conviene nombrarlas con claridad antes que darlas por resueltas.

**¿Una buena descripción la activa?** Nuestras configuraciones imponen la skill mediante `/skill:`; por lo tanto, las matrices miden un procedimiento aplicado y nunca un procedimiento elegido. La pregunta tiene que ver con la mecánica descrita más arriba, se puede medir con la columna `skill_invoque`, que ya existe para eso, y exige una configuración en la que la skill se cargue por su nombre sin estar desarrollada en el prompt.

**¿La skill aporta algo con la misma solicitud?** Sigue faltando el control, es decir, la misma configuración sin la skill. La segunda matriz no lo añadió: compara dos versiones del procedimiento entre sí, no el procedimiento con su ausencia.

::: info Ejercicio (por tu cuenta)
Añade al escenario una configuración `+agents+skill_par_nom`, idéntica a `+agents+skill` pero cuyo prompt no contenga el `/skill:`, con la skill todavía cargada por el bloque `harness`. Vuelve a ejecutarlo y lee `skill_invoque`.

Medirás lo único que este módulo afirma sin haberlo establecido, y no habrás tocado ni la herramienta, ni el validador, ni las demás configuraciones.
:::

## Generalizar

**Un skill es un procedimiento de trabajo y no una herramienta.** No tiene ni esquema de entrada, ni función, ni permiso, y el único mecanismo del que dispone es el texto. Lo que sabe hacer es imponer un orden de trabajo y una forma de entregable, lo cual es útil y no se confunde con la ejecución de un código que tú controlas.

**La descripción es lo único que se lee con certeza.** El cuerpo solo entra en el contexto si el modelo decide abrirlo o si el usuario lo despliega con `/skill:`. Una descripción que dice qué hace el procedimiento, en lugar de cuándo usarlo, se dirige a la decisión equivocada.

**Un procedimiento desplaza el trabajo antes de mejorarlo.** Los dos efectos establecidos de la primera versión son desplazamientos: los tests van a un archivo de borrador en lugar de a la suite del repositorio, y los borradores permanecen en el árbol. La revisión suprime estos dos desplazamientos, y el efecto sobre la corrección sigue sin ser concluyente en las dos versiones. Antes de preguntarte si un componente mejora el resultado, mira primero adónde envía el trabajo.

**Una consigna de limpieza no garantiza la limpieza.** El paso final de nuestro `SKILL.md` pide retirar los archivos creados, y once ejecuciones de veinte los dejan. La revisión que completó el alcance no reforzó la consigna, eliminó la necesidad de limpieza: un procedimiento que no crea nada no tiene nada que limpiar. Cuando los archivos intermedios son realmente necesarios, lo que debe ocurrir incluso si el modelo no piensa en ello exige un mecanismo que no dependa de él.

**Cada paso intermedio es un escalón que el modelo puede fallar.** Los tests nacían en un borrador antes de migrar a la suite, y esa migración es el paso perdido diez veces de veinte. Escribir el entregable directamente en su lugar eliminó el escalón, y las dos columnas afectadas pasaron a 20/20 en los dos modelos.

**Un procedimiento se revisa como código, con las ejecuciones en la mano.** El diagnóstico no viene de las columnas agregadas sino de las ejecuciones leídas una por una: la migración fallida, la consigna aplicada al pie de la letra y la referencia fantasma dictaron cada corte, y una nueva matriz verificó la revisión en lugar de creerla.

**Un campo documentado no siempre se lee.** `allowed-tools` figura en la documentación que se entrega con Pi y no aparece en ninguna parte de su código. El código es la única fuente que no se equivoca, y la verificación se reduce a un `grep`.

**Una pieza de harness se mide contra lo que reemplaza, nunca contra nada.** En esta tarea, reemplazar el ticket delimitado por el procedimiento hace perder treinta puntos en la esquina y cincuenta en los tests añadidos, lo que no se ve en una comparación contra la base.

## Entregable

Este módulo produce tres piezas.

**1. La competencia**, en `.pi/skills/<nombre>/`, con su descripción escrita por ti y un entregable cuya forma impone el cuerpo. Si la has revisado, las dos versiones permanecen versionadas: la matriz que las compara no se entiende sin ellas.

**2. El directorio de matriz** producido por `trysquare run`, con la configuración con competencia leída contra la que reemplaza y no contra la base.

**3. La línea « herramientas » de la ficha de decisión**:

| palanca | efecto medido | ¿adoptado? | por qué |
| -------------------------------- | ------------ | -------- | -------- |
| skill (markdown)                 |              |          |          |
| descripción del skill             |              |          |          |
| competencia impuesta por `/skill:` |              |          |          |
| forma del entregable impuesta     |              |          |          |
| entregable directo o vía borrador |              |          |          |
| extensión (herramienta real)      |              |          |          |

::: tip Criterio de éxito
Sabes citar un efecto de tu competencia que está establecido, un efecto que no lo está, y decir qué falta para zanjar el segundo.

Este criterio exige haber leído una configuración contra la referencia correcta. Por tanto, no puede satisfacerse de memoria.
:::

## Los escollos

**Leer una configuración con competencia contra la base.** Difiere de ella por varias cosas a la vez, y la brecha publicada contra `nothing` mezcla todas las palancas de la pila. La referencia útil es la configuración de la que solo difiere por la competencia.

**Confundir una competencia impuesta y una competencia propuesta.** El `/skill:` del prompt expande el cuerpo del lado del cliente, y una columna de invocación llena no dice entonces nada de lo que el modelo habría elegido.

**Cuidar el cuerpo del `SKILL.md` descuidando la descripción.** El cuerpo solo se lee si la descripción ha disparado su lectura.

**Hacer que se escriban las pruebas fuera de la suite.** Un caso de prueba que vive en un archivo de trabajo no lo ejecutará nadie después de que el agente se haya ido, y la migración prometida hacia la suite es precisamente el paso en el que el modelo falla.

**Contar con una consigna de limpieza.** Solo se sigue en menos de una de cada tres ejecuciones, lo que queda en el árbol hace fallar el alcance de toda la configuración, y la corrección fiable no es una mejor consigna sino un procedimiento que no crea nada.

**Revisar sin volver a medir.** Una revisión que responde punto por punto al diagnóstico sigue siendo una hipótesis mientras una matriz no la haya verificado. La nuestra también predecía una bajada de coste en gemma, y esa matriz no puede confirmarla: sus repeticiones hacen ilegibles las columnas de coste.

**Acumular skills.** Cada uno cuesta poco mientras no se usa, pero sus descripciones entran todas en el contexto en cada turno.

## Para ir más lejos

- [Agent Skills](https://agentskills.io), el estándar abierto que Pi implementa, y su página sobre la integración en un system prompt.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Schick et al., [Toolformer](https://arxiv.org/abs/2302.04761), sobre la idea de que un modelo aprenda cuándo y cómo llamar a una herramienta.
- Yao et al., [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629), el bucle que alterna razonamiento y acción.
- La [documentación de las extensiones de Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), para el componente que da garantías donde el skill da sugerencias.
