# Los skills: definir competencias

::: tip Objetivos de este módulo
- Saber qué es un skill
- Distinguir una competencia que el modelo puede ignorar de una competencia que se le impone
- Escribir un procedimiento de trabajo que produzca un entregable aprovechable
- Revisar un procedimiento a partir de las sesiones leídas, probándolo con varios modelos
:::

El módulo anterior te permitió familiarizarte con el contexto y con la forma de interactuar con él. También pudiste ver diferencias de comportamiento según el modelo elegido. Pudiste además constatar que el hecho de que el issue #1 esté muy bien detallada en el archivo `ISSUES.md` de NÉON permite a los modelos bastante recientes corregir fácilmente el bug añadiendo todas las pruebas necesarias, porque leen todo el repositorio y dan con ella fácilmente. Podrías poner un prompt muy corto: el modelo encontraría ese archivo de todos modos.

En la vida real, pedirás corregir el bug sin una explicación tan detallada, porque no sabrás necesariamente evaluar todos los efectos secundarios de ese bug.

La pregunta de este módulo es, entonces, saber si una competencia (llamada *skill*), escrita una vez y recargada a demanda, obtiene los mismos resultados que en el módulo anterior sin proporcionar las pruebas.

Seguimos el orden habitual: entender qué es un skill en el harness, escribir uno sobre esta cuestión, medir lo que produce.

## Comprender

### Un skill es un archivo Markdown

Un **skill** es un archivo `SKILL.md` ubicado en un directorio `.pi/skills/<nom>/` del proyecto o del directorio global de Pi, en el formato del estándar abierto [Agent Skills](https://agentskills.io). Se compone de un frontmatter, que incluye como mínimo un nombre y una descripción, y de un cuerpo que contiene las instrucciones. No hay que preparar código, registro ni configuración: basta con colocar el archivo.

He aquí un skill completo, deliberadamente mínimo:

```markdown
---
name: revue-rapide
description: Relit les modifications en cours du dépôt.
Utiliser quand l'utilisateur demande une relecture avant de commiter.
---

# Revue rapide

1. Lance `git diff` et lis toute la sortie.
2. Relève ce qui peut casser un test existant, puis ce qui manque de test.
3. Rends deux listes : « à corriger avant le commit » et « peut attendre ».
```

Un skill describe instrucciones y archivos de apoyo (scripts, referencias) que un agente carga a demanda, en lugar de reescribirlos en cada prompt. Ocupa un lugar aparte en el harness: `AGENTS.md` entra en el contexto en cada turno y por lo tanto cuesta en cada turno, mientras que un skill está hecho para entrar solo cuando la tarea lo pide.

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

Los demás harness proporcionan esta lista de forma similar, pero no necesariamente en el mismo lugar del contexto.

El **cuerpo** del `SKILL.md` no está ahí. Pero entonces, ¿cómo puede el modelo usarlo? Hay dos caminos posibles.

La primera es que el modelo **decide** abrirlo con la herramienta de lectura, basándose únicamente en la descripción. La documentación de Pi lo dice en los mismos términos, añadiendo que «models don't always do this».

La segunda es que el usuario escriba `/skill:revue-rapide` en su mensaje, en cuyo caso Pi **expande** el archivo del lado del cliente y pega su cuerpo en el primer turno. El modelo ya no tiene nada que decidir.

Hay dos consecuencias prácticas. La descripción es lo único sobre lo que se apoya el primer camino, de modo que todo el cuidado puesto en el cuerpo no sirve de nada mientras no dispare. Y un skill casi no cuesta nada mientras no se use, lo que invita a acumularlos. Ten en cuenta, sin embargo, que cada descripción añadida entra en el contexto en cada turno y que veinte skills terminan formando un preámbulo considerable.

::: info Ejercicio (en el aula)
Comprueba esta mecánica por ti mismo, en tu clon de NÉON.

1. Crea `.pi/skills/revue-rapide/SKILL.md` con el contenido anterior, modifica una línea de un archivo del juego y abre una sesión.
2. Exporta la sesión con `/export` y localiza el bloque `<available_skills>` en el system prompt: el nombre, la descripción y la ruta están ahí, el cuerpo no.
3. Pide «revisa lo que acabo de modificar» sin nombrar el skill, y observa si el modelo va a leer `SKILL.md` por sí mismo: la llamada a la herramienta de lectura es visible en la sesión.
4. Abre una sesión nueva y escribe `/skill:revue-rapide`. Esta vez el cuerpo se pega en tu primer mensaje, y ya no hay ninguna decisión que observar.

Acabas de recorrer los dos caminos. El primero se apoya por completo en la descripción; el segundo no la necesita.
:::

::: warning Solo invocado por el usuario
Puedes hacer que tu skill no pueda ser activado por el modelo, sino únicamente por ti, poniendo en el frontmatter:

```
disable-model-invocation: true
```

La descripción del skill entonces no se añadirá a la lista de skills que se encuentra en el contexto.
:::

### Anatomía completa

Hasta ahora solo hemos presentado el archivo `SKILL.md`, pero has de saber que existe todo un árbol de directorios posible que ofrece muchas posibilidades a tu skill.

```
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

Los tres directorios opcionales pueden ser muy útiles en la continuación de la construcción de tu harness.

- `scripts`: son programas que acompañan a la skill y que se mencionan en `SKILL.md`. Permiten seguir siempre el mismo camino y no dejar que el modelo cree sus scripts sobre la marcha, porque, como ya sabes, nunca será la misma forma de hacerlo.
- `references`: a veces ocurre que `SKILL.md` se vuelve demasiado largo y que algunas partes son específicas. Puedes entonces pedir en las instrucciones del skill que se vaya a ver esos archivos de referencia. Puedes verlo como una forma de recurrencia. Imagina que tienes un skill para la documentación. La documentación en un software es de distintas naturalezas: usuario, referencia, API, how-to, tuto... Y no se escribe de la misma manera según el destinatario. Podrías por tanto plantearte listar en el skill esas distintas documentaciones con su descripción y referenciar los archivos que se encuentran en `references` para que el modelo lea únicamente el que le concierne.
- `assets`: encontrarás en este directorio todo documento útil al modelo que la skill necesita: imagen, template...

Los usaremos en la segunda parte de **Reconstruir**.

### ¿Debo escribir mi skill?

Todo depende, una vez más, del grado de control que quieras tener sobre tu harness. Encontrarás muchos sitios que te ofrecen skills. El más conocido es probablemente https://www.skills.sh/. Sin embargo, hay que tener cuidado, porque, como hemos visto, el skill puede pedirle a tu modelo que haga cosas por él o que lance scripts. Por lo tanto, hay que tener en cuenta una vigilancia en materia de seguridad.

En un primer momento, te animamos a escribirlos tú mismo inspirándote en personas con suficiente perspectiva sobre el uso de los skills y que pueden ser una fuente de inspiración. Estas son, en nuestra opinión, las tres personas que ofrecen los mejores skills en octubre de 2026:

- Lauren Tan: https://github.com/cursor/plugins/tree/main/pstack
- Matt Pocock: https://github.com/mattpocock/skills
- Addy Osmani: https://github.com/addyosmani/agent-skills

También puedes usar el skill [skill-creator de Anthropic](https://www.skills.sh/anthropics/skills/skill-creator) para hacer tu primer esqueleto.

::: warning Los agentes no son humanos
Hay que tener cuidado cuando se escribe un skill. No está destinado a un humano, sino a un modelo, y un modelo no necesita la misma información. Un humano tiende a quedarse con aquello en lo que cree y a descartar los párrafos que le parecen menos relevantes. Si tiene una duda, hará una búsqueda para formarse su propia opinión. Un modelo o un agente no hará nada de eso. Seguirá al pie de la letra tus instrucciones y todo lo que esté escrito tendrá la misma importancia para él. Un agente tampoco va a adivinar lo que hayas olvidado decir.

Todo esto para decir que hay que ir a lo esencial y escribir el proceso que quieras repetir una y otra vez en cada llamada del skill.
:::

## Reconstruir

Ahora vamos a intentar crear una competencia que encaje con el proyecto NÉON. Como mencionamos en la introducción, el módulo anterior demostró que si el agente tenía una definición precisa de los problemas ligados a un bug y de los tests asociados, entonces debería ser capaz de darte una solución de calidad.

Así que proponemos hacerlo en dos tiempos. La primera versión recopila el conjunto de los problemas encontrados en un rompeladrillos relacionados con la issue #1. El problema con esta primera versión es que es demasiado específica para nuestro caso. El interés de una competencia es que sea específica para una problemática, pero lo bastante generalista como para poder usarla en otros casos. La segunda versión intentará entonces construir una lista de bugs para el juego de arcade previsto antes de seguir el mismo proceso que la primera solución.

### Versión 1

Vamos a hacer esta versión en varias etapas. Hay que entender bien que la creación de un skill es un proceso iterativo. Vas a probarlo y luego mejorarlo a medida que lo testeas. El modelo también tiene su importancia. Puedes tener un skill que funcione muy bien en un modelo bastante potente y se derrumbe en un modelo más ligero. Tú decides si quieres que tu skill funcione con un conjunto de modelos.

Como los modelos evolucionan muy rápido, el skill no debe quedarse fijo y debes hacerlo evolucionar en el proceso de mejora de tu harness. Las instrucciones escritas pueden ser menos útiles, o incluso perjudiciales en el futuro.

Puedes apoyarte en el skill [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) propuesto por Anthropic o probar paso a paso.

::: info Ejercicio (en sala)
Empieza por escribir el frontmatter y haz que el skill se invoque cada vez que se pida corregir un bug en NÉON.

Pruébalo con distintos modelos.
:::

Vamos a definir ahora una lista de bugs conocidos. Podríamos habértela hecho construir solo, pero preferimos darte un ejemplo para que te concentres en lo esencial. Aquí tienes, pues, el comienzo del skill que te proponemos:

::: details El comienzo del skill `playtester`

<<<@/../scripts/skills/playtester/SKILL.md#L1-77{md}

:::

::: info Ejercicio (en sala)
A partir de este inicio de archivo ya bastante explícito, te pedimos escribir otras dos partes:

- **3. Tests en rojo**: cómo el agente escribe los tests de la lista establecida en la etapa 2;
- **4. Verificación**: en qué momento el agente ha terminado.

Prueba luego tu skill con al menos dos modelos, sobre la petición descuidada del módulo anterior, sin dejar que el agente lea `ISSUES.md`. Mira los tests producidos y verifica que cubran todos los problemas del bug #1 descrito en `ISSUES.md`. Si no es el caso, corrige el procedimiento y vuelve a empezar.

Nuestra versión está en la solución de abajo. No la abras hasta haber probado la tuya.
:::

::: details Solución: el skill `playtester` completo

<<<@/../scripts/skills/playtester/SKILL.md{md}

:::

### Versión 2

La primera versión funciona en NÉON, pero su catálogo se escribió a mano para un rompeladrillos. Si usas `playtester` en un shoot 'em up o un juego de plataformas, el procedimiento sigue siendo válido, pero el agente ya no tiene ninguna entrada entre la que elegir. Vamos entonces a pedirle al agente que construya él mismo el catálogo del género a partir de una búsqueda web. Este catálogo se guardará en el directorio `references` del skill: solo se construye una vez y se relee en las llamadas siguientes. El resto del procedimiento casi no cambia.

Es la ocasión de usar los directorios opcionales de los que hablamos más arriba. El skill `dynamic-playtester` tiene la forma siguiente:

```
dynamic-playtester/
├── SKILL.md
├── references/
│   ├── consignes-catalogue.md   # consignes pour construire le catalogue
│   └── bugs-arcade.md           # le catalogue, écrit par le script
└── scripts/
    └── catalogue.sh             # construit le catalogue dans une session séparée
```

Vamos a escribir estos archivos en orden: las instrucciones para construir el catálogo, el script que las ejecuta, y luego el skill que llama al script. Pi no tiene herramienta de búsqueda web: sus herramientas básicas son `read`, `write`, `edit` y `bash`. La búsqueda pasa por la extensión `pi-web-access`, que proporciona las herramientas `web_search` y `fetch_content`, independientemente del modelo utilizado. Instálala antes de empezar:

```bash
pi install npm:pi-web-access
```

Funciona sin clave de API. El script de recolección que vamos a escribir se ejecuta en la herramienta `codemode` de Pi, disponible a partir de la versión 1.0.

#### Las instrucciones del catálogo

El archivo `references/consignes-catalogue.md` no lo lee el agente que corrige el bug. Contiene las instrucciones dadas a otra sesión, lanzada por el script, cuyo único trabajo es escribir `references/bugs-arcade.md`. Estas instrucciones solo sirven en el momento de construir el catálogo, por eso están en `references` y no en `SKILL.md`.

Esta sesión solo conoce las instrucciones, el género del juego y la ruta del archivo a escribir. Debe por tanto saber qué busca, dónde buscarlo y en qué forma devolver el resultado. La forma es el punto más importante: el skill va a releer este archivo, y cada entrada debe tener un invariante, ya que es lo que verificarán los tests. Ten también en cuenta que el texto de las páginas viene de internet y que cualquiera pudo escribirlo. Las instrucciones deben por tanto precisar que se trata de datos y no de instrucciones.

Para la búsqueda en sí, puedes dejar que el modelo elija sus consultas y abra las páginas una por una. Hará entonces un turno de bucle por llamada, y dos ejecuciones no buscarán lo mismo. La herramienta `codemode` permite, al contrario, lanzar un script que hace todas las búsquedas y abre todas las páginas en un solo turno. Nos encontramos con la misma idea que para el directorio `scripts`: seguir siempre el mismo camino.

::: info Ejercicio (en sala)
Escribe `references/consignes-catalogue.md`. La sesión debe buscar los bugs del género para cada uno de estos componentes: desplazamiento y colisión, entradas del jugador, bordes de la pantalla, paso de tiempo, puntuación y estado. Escribe una entrada por causa distinta, con su síntoma, su causa, su invariante y la URL de la página de donde viene, y añade una sección al archivo sin borrar los otros géneros.
:::

::: details Solución: `references/consignes-catalogue.md`

<<<@/../scripts/skills/dynamic-playtester/references/consignes-catalogue.md{md}

:::

#### El script que construye el catálogo

Podrías pedirle directamente al agente que haga la búsqueda. El problema es que el agente que recibe el ticket conoce el síntoma y va a buscar a su alrededor: "la pelota atraviesa los ladrillos" trae páginas sobre el tunneling, y el catálogo solo contendrá eso. Es precisamente lo que queremos evitar. Una sesión lanzada con `pi -p` parte de un contexto vacío. Solo conoce el género, y busca por tanto sobre todos los componentes.

Esta sesión no debe cargar nada más que las consignas: ni `AGENTS.md` ni los skills. De lo contrario, corre el riesgo de reencontrar el síntoma, incluso de llamar a `dynamic-playtester` por sí misma. Solo necesita las herramientas de búsqueda, lectura y escritura, y es preferible que use el mismo modelo que la sesión que la llama.

::: info Ejercicio (en sala)
Escribe `scripts/catalogue.sh`, que toma el género como argumento (`bash scripts/catalogue.sh "breakout"`), lanza la sesión descrita arriba con las consignas de `references/consignes-catalogue.md` y luego verifica que `references/bugs-arcade.md` no esté vacío.

Lánzalo solo sobre `breakout` y compara el resultado con el catálogo de la versión 1. Lánzalo una segunda vez: ¿obtienes el mismo catálogo?
:::

::: details Solución: `scripts/catalogue.sh`

<<<@/../scripts/skills/dynamic-playtester/scripts/catalogue.sh{bash}

:::

#### Adaptar el skill

Queda modificar `playtester` para que ya no dependa del rompeladrillos. El catálogo escrito en duro deja lugar a un primer paso que lee `references/bugs-arcade.md` y lanza el script si el género del juego todavía no aparece ahí. El género debe escribirse en inglés, ya que sirve de palabra clave para la búsqueda.

Los demás pasos se mantienen, pero varios fragmentos se escribieron para pelotas y ladrillos: caras, esquina, cuadrícula, sentido de `y`... Hay que generalizarlos sin perder las reglas de montaje, que siguen siendo válidas en un shoot 'em up. Por último, un catálogo extraído de la web mezcla los defectos y las sugerencias de gameplay, como «acelerar la pelota a lo largo del nivel». El agente debe saber descartar las segundas.

::: info Ejercicio (en sala)
Escribe `dynamic-playtester/SKILL.md` a partir de `playtester`.

Pruébalo en NÉON con la petición descuidada, sin `ISSUES.md` y sin `references/bugs-arcade.md`. La primera llamada debe construir el catálogo y la segunda reutilizarlo. ¿Los tests producidos cubren los problemas del issue #1 tan bien como con la versión 1?
:::

::: details Solución: el skill `dynamic-playtester` completo

<<<@/../scripts/skills/dynamic-playtester/SKILL.md{md}

:::

## Generalizar

Lo que hemos construido para NÉON sirve para cualquier skill.

Un skill es un procedimiento escrito en texto. No ejecuta nada por sí mismo: le dice al modelo en qué orden trabajar y qué debe entregar. Cuando un paso siempre debe hacerse de la misma manera, conviene ponerlo en un script del directorio `scripts` en lugar de describirlo, como hicimos para la construcción del catálogo.

La descripción es la única parte que el modelo lee con seguridad. Debe decir cuándo usar el skill, y no solo qué hace. Si quieres estar seguro de que el skill se use, llámalo tú mismo con `/skill:<nombre>`.

Los conocimientos de un dominio y el procedimiento que los usa no tienen que vivir en el mismo archivo. En la versión 1, el catálogo estaba escrito en `SKILL.md`, y el skill solo valía para un rompeladrillos. En la versión 2, el catálogo lo construye un script y se guarda en `references`, y el mismo procedimiento puede servir para otros géneros de juegos.

Una tarea que no debe depender de lo que sabe el agente puede ejecutarse en una sesión separada. La sesión que lanza `catalogue.sh` no conoce el síntoma, así que busca los bugs en todo el género en lugar de detenerse en el caso reportado.

Un procedimiento debe decir cuándo termina el trabajo, con un criterio que el agente pueda verificar por sí solo. Aquí, cada entrada aceptada tiene sus tests, los tests existentes siguen pasando y cada test nuevo falla con una `AssertionError`.

Por último, un skill se prueba como si fuera código. Lánzalo con varios modelos, lee las sesiones para ver dónde el agente se aparta de lo que escribiste, corrige y vuelve a empezar. Un skill que funciona con un modelo puede fallar con otro, y tendrá que evolucionar al mismo tiempo que los modelos.

## Entregable

Este módulo produce tres piezas.

**1. El skill `playtester`**, en `.pi/skills/playtester/` de tu clon de NÉON, con el catálogo del rompeladrillos en `SKILL.md`.

**2. El skill `dynamic-playtester`**, en `.pi/skills/dynamic-playtester/`, con las consignas `references/consignes-catalogue.md`, el script `scripts/catalogue.sh` y el catálogo `references/bugs-arcade.md` que ha construido. Guarda también los tests rojos que produce cada versión en la issue #1: son los que permiten comparar las dos.

**3. La fila «skills» de la ficha de decisión**:

| palanca                               | efecto medido | ¿adoptado? | por qué |
| ------------------------------------- | ------------- | ---------- | ------- |
| skill elegido por el modelo           |               |            |         |
| skill impuesto por `/skill:`          |               |            |         |
| catálogo escrito a mano               |               |            |         |
| catálogo construido por búsqueda web  |               |            |         |
| script en `scripts/`                  |               |            |         |
| sesión separada                       |               |            |         |

::: tip Criterio de éxito
Sabes decir qué problemas de la issue #1 cubren tus tests con cada versión del skill, cuáles faltan, y qué cambiaste en el skill tras leer las sesiones.
:::

## Para ir más lejos

- La [especificación Agent Skills](https://agentskills.io/specification), que describe el formato de `SKILL.md`, los directorios opcionales `scripts`, `references` y `assets`, y la regla que quiere que el nombre del skill sea el de su directorio.
- La [documentación de los skills de Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md), para la ubicación de los skills y la forma en que Pi los carga.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills), sobre la carga progresiva: primero la descripción, luego el cuerpo, los archivos adjuntos solo si hace falta.
- Anthropic, [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices), consejos de escritura que coinciden con los de este módulo: ir a lo esencial, sacar el detalle a archivos de referencia, probar con cada modelo objetivo.
- La página de [pi-web-access](https://pi.dev/packages/pi-web-access), para configurar otros motores de búsqueda que el predeterminado.
