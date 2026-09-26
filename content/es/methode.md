# El método

Esta formación se basa en una elección pedagógica que queremos dejar clara desde el principio. Podríamos haberte propuesto un catálogo de herramientas acompañado de guías de instalación. No lo haremos, porque este tipo de contenido caduca en pocos meses: los paquetes cambian de nombre, las opciones de configuración evolucionan y un año más tarde ya no queda mucho que aprovechar.

Tomamos la decisión contraria. La columna vertebral de la formación es el harness mismo, es decir, el conjunto de bloques funcionales que debe incluir para funcionar: gestión del contexto, herramientas, delegación, orquestación, memoria, seguridad y verificación. Primero establecemos *qué* bloques son necesarios y *por qué*, y luego reconstruimos cada uno de ellos a mano con software de código abierto. Finalmente, volvemos al principio transferible, el que conservarás independientemente de la herramienta del momento.

El objetivo no es construir un competidor de Claude Code, y la reconstrucción es deliberadamente mínima. Al final, más que un software, te llevarás la comprensión necesaria para construir tu propio harness, adaptado a tus usos, y para pilotar con criterio los harness que utilices a diario.

## El tríptico

Cada módulo de reconstrucción se desarrolla en tres etapas que repetimos a lo largo de la formación.

La primera etapa, **Comprender**, parte de la necesidad. ¿Para qué sirve el bloque, por qué es indispensable y cómo lo implementa un harness real?

La segunda etapa, **Reconstruir**, consiste en escribir a mano el equivalente mínimo del bloque en Pi. Esto permite poner a prueba el concepto en lugar de limitarse a leerlo. Este código es una ilustración y no la lección: hace que la idea sea tangible y es sustituible.

La tercera etapa, **Generalizar**, extrae el principio que sobrevive al cambio de herramienta, la regla de diseño que aplicarías en otro lugar. Esta es la etapa que realmente importa, ya que es la única que no caduca.

Esta distinción entre lo duradero y lo desechable estructura la formación. Los principios de la tercera etapa son los que hay que retener; las versiones de los paquetes y los detalles de configuración de la segunda etapa están destinados a cambiar, y los tratamos como tales.

## La estructura de un módulo

Para orientarte, cada módulo del acto de reconstrucción sigue la misma estructura: su duración, sus objetivos expresados en términos de competencias, sus requisitos previos, el tríptico Comprender / Reconstruir / Generalizar, una puesta en práctica basada en un artefacto real, un entregable con su criterio de éxito y, finalmente, las trampas a evitar.

## El programa (A revisar)

La formación representa unas 13h30 presenciales. Se organiza en cuatro actos.

| Acto | Contenido | Duración |
| :--- | :--- | :--- |
| 1. Fundamentos | Los LLM y su ecosistema, los bloques de un harness, el harness inicial Pi y el método | 3h30 |
| 2. Reconstrucción bloque por bloque | Contexto, herramientas, agentes, workflows, memoria, permisos | 6h30 |
| 3. Verificar, evaluar, observar | Tests, evaluaciones multi-modelo, observabilidad | 2h00 |
| 4. Construir tu propio harness | Un caso de uso personal y la clasificación entre duradero / desechable | 1h30 |

El acto 2 concentra la mayor parte del valor. Contiene deliberadamente más contenido escrito de lo que sugiere su duración, para seguir siendo útil de forma autónoma una vez finalizada la formación.
