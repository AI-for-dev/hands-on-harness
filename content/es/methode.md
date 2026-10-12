# El método

Esta formación se apoya en una elección pedagógica que queremos explicitar desde el principio. Habríamos podido proponerte un catálogo de herramientas acompañado de recetas de instalación. No lo haremos, porque este tipo de contenido caduca en pocos meses: los paquetes cambian de nombre, las opciones de configuración evolucionan, y un año después ya no queda mucho que aprovechar.

Tomamos el partido inverso. La columna vertebral de la formación es el harness mismo, es decir, el conjunto de componentes funcionales que debe incluir para funcionar: gestión del contexto, herramientas, delegación, orquestación, memoria, seguridad y verificación. Primero establecemos *qué* componentes son necesarios y *por qué*, y luego reconstruimos cada uno de ellos a mano con software de código abierto. Por último, remontamos al principio transferible, el que conservarás sea cual sea la herramienta del momento.

El objetivo no es construir un competidor de Claude Code, y la reconstrucción es voluntariamente mínima. Al final te llevarás, más que un software, la comprensión necesaria para construir tu propio harness, adaptado a tus usos, y para pilotar con conocimiento de causa los harness que utilices a diario.

## El tríptico

Cada módulo de reconstrucción se desarrolla en tres tiempos que repetimos a lo largo de toda la formación.

El primer tiempo, **Comprender**, parte de la necesidad. ¿Para qué sirve el componente, por qué es indispensable y cómo lo implementa un harness real?

El segundo tiempo, **Reconstruir**, consiste en escribir el equivalente mínimo del componente en Pi, a mano. Es lo que permite poner a prueba el concepto. La puesta en práctica siempre es más eficaz que una lectura pasiva. Recordamos que el código es una ilustración y no la lección. Un harness no es una receta que funciona para cualquier caso de uso. Se nutre de tus necesidades.

El tercer tiempo, **Generalizar**, extrae el principio que es independiente de la herramienta utilizada. Da las reglas de diseño que aplicarías en otro lugar. Es este tiempo el que cuenta de verdad, porque es el único que no caduca.

Además de estos tres tiempos, cada módulo presenta sus objetivos al principio y, al final, lo que has aprendido y referencias para profundizar en los conceptos.

## El desarrollo

La formación se organiza en tres actos, seguidos de una página de conclusión.

| Acto                                | Contenido                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1. Fundamentos                      | La historia de las técnicas, los LLM en 2026, las piezas de un harness y el harness inicial Pi           |
| 2. Reconstrucción pieza a pieza     | El sandbox, el contexto, los skills, la delegación a subagentes, los workflows y los hooks               |
| 3. Evaluar                          | Medir un agente con trysquare y luego medir las palancas del contexto en veinte repeticiones             |
| Ahora te toca a ti                  | Retomar el proceso en tu repositorio, y las herramientas más maduras que ya hacen lo que hacen las nuestras |

Hemos querido que este documento sea lo más detallado posible para que puedas experimentar con total autonomía.
