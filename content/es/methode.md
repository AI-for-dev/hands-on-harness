# El método

Esta formación se basa en una elección pedagógica que queremos explicitar desde el principio. Podríamos haberte propuesto un catálogo de herramientas acompañado de recetas de instalación. No lo haremos, porque ese tipo de contenido caduca en pocos meses: los paquetes cambian de nombre, las opciones de configuración evolucionan, y ya no queda gran cosa que aprovechar un año después.

Adoptamos el enfoque contrario. La columna vertebral de la formación es el propio harness, es decir, el conjunto de piezas funcionales que debe incluir para funcionar: gestión del contexto, herramientas, delegación, orquestación, memoria, seguridad y verificación. Primero establecemos *qué* piezas son necesarias y *por qué*, y luego reconstruimos cada una de ellas a mano con la ayuda de software de código abierto. Por último, llegamos al principio transferible, el que conservarás sea cual sea la herramienta del momento.

El objetivo no es construir un competidor de Claude Code, y la reconstrucción es voluntariamente mínima. Al final, en lugar de un software, te llevarás la comprensión necesaria para construir tu propio harness, adaptado a tus usos, y para manejar con conocimiento de causa los harness que usarás a diario.

## El tríptico

Cada módulo de reconstrucción se desarrolla en tres momentos que repetimos a lo largo de toda la formación.

El primer momento, **Comprender**, parte de la necesidad. ¿Para qué sirve la pieza, por qué es indispensable y cómo la realiza un harness real?

El segundo momento, **Reconstruir**, consiste en escribir a mano el equivalente mínimo de la pieza sobre Pi. Es lo que permite poner a prueba el concepto. La puesta en práctica siempre es más eficaz que una lectura pasiva. Recordamos que el código es una ilustración y no la lección. Un harness no es una receta que funcione para cualquier caso de uso. Se alimenta de tus necesidades.

El tercer momento, **Generalizar**, destaca el principio que es independiente de la herramienta utilizada. Ofrece las reglas de diseño que aplicarías en otros entornos. Ese es el momento que de verdad cuenta, porque es el único que no caduca.

Además de estos tres momentos, al comienzo de cada módulo tendrás sus objetivos, la descripción del entregable cuando sea pertinente y referencias para profundizar en los conceptos.

## El desarrollo

La formación se organiza en cuatro actos.

| Acto                                | Contenido                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| 1. Fundamentos                      | Los LLM y su ecosistema, los componentes de un harness, el harness inicial Pi y el método    |
| 2. Reconstrucción pieza por pieza   | Contexto, herramientas, agentes, workflows, memoria, permisos                                |
| 3. Verificar, evaluar, observar     | Pruebas, evaluaciones multimodelo, observabilidad                                            |
| 4. Construir tu propio harness      | Un caso de uso personal y la clasificación duradero / desechable                             |

Hemos querido que este documento sea lo más detallado posible para que puedas experimentar con total autonomía.
