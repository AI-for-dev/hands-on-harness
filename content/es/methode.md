# El método

Esta formación se basa en una elección pedagógica que queremos explicar desde el principio. Podríamos haber propuesto un catálogo de herramientas acompañado de recetas de instalación. No lo haremos, ya que este tipo de contenido caduca en pocos meses: los paquetes cambian de nombre, las opciones de configuración evolucionan y no queda mucho que aprovechar un año después.

Tomamos la decisión opuesta. La columna vertebral de la formación es el harness mismo, es decir, el conjunto de bloques funcionales que debe incluir para funcionar: gestión del contexto, herramientas, delegación, orquestación, memoria, seguridad y verificación. Primero establecemos *qué* bloques son necesarios y *por qué*, y luego reconstruimos cada uno de ellos a mano utilizando software de código abierto. Finalmente, volvemos al principio transferible, aquel que conservarás independientemente de la herramienta del momento.

El objetivo no es construir un competidor de Claude Code. La reconstrucción es deliberadamente mínima. Lo que te llevarás al final no es un software, sino la comprensión necesaria para construir tu propio harness, adaptado a tus necesidades, y para gestionar con conocimiento de causa los harness que utilices a diario.

## El tríptico

Cada módulo de reconstrucción se desarrolla en tres tiempos que repetimos a lo largo de la formación.

El primer tiempo, **Comprender**, parte de la necesidad. ¿Para qué sirve el bloque, por qué es indispensable y cómo lo implementa un harness real?

El segundo tiempo, **Reconstruir**, consiste en escribir a mano el equivalente mínimo del bloque en Pi. Esto es lo que permite poner a prueba el concepto en lugar de simplemente leerlo. Debes tener en cuenta que este código es una ilustración, no la lección: está ahí para hacer tangible la idea y es reemplazable.

El tercer tiempo, **Generalizar**, extrae el principio que sobrevive al cambio de herramienta, la regla de diseño que aplicarías en otro lugar. Este es el tiempo que realmente importa, ya que es el único que no caduca.

Esta distinción entre lo duradero y lo desechable está en el corazón de la formación. Los principios del tercer tiempo son los que hay que recordar; las versiones de los paquetes y los detalles de configuración del segundo tiempo están destinados a cambiar y los tratamos como tales.

## La estructura de un módulo

Para orientarte, cada módulo del acto de reconstrucción sigue la misma estructura: su duración, sus objetivos expresados en términos de competencias, sus prerrequisitos, el tríptico Comprender / Reconstruir / Generalizar, una puesta en práctica basada en un artefacto real, un entregable con su criterio de éxito y, finalmente, las trampas a evitar.

## El desarrollo (A revisar)

La formación representa aproximadamente 13h30 en modalidad presencial. Se organiza en cuatro actos.

| Acto                                | Contenido                                                                                    | Duración |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| 1. Fundamentos                     | Los LLM y su ecosistema, los bloques de un harness, el harness de inicio Pi y el método       | 3h30  |
| 2. Reconstrucción bloque a bloque  | Contexto, herramientas, agentes, workflows, memoria, permisos                                    | 6h30  |
| 3. Verificar, evaluar, observar      | Pruebas, evaluaciones multi-modelo, observabilidad                                              | 2h00  |
| 4. Construir tu propio harness     | Un caso de uso personal y la clasificación duradero / desechable                                | 1h30  |

El acto 2 concentra la mayor parte del valor. Está deliberadamente más nutrido de contenido escrito de lo que sugiere su duración, para seguir siendo útil de forma autónoma una vez finalizada la formación.
