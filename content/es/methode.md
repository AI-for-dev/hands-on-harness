# El método

Esta formación se basa en una elección pedagógica que queremos explicitar desde el principio. Podríamos haberos propuesto un catálogo de herramientas acompañado de recetas de instalación. No lo haremos, porque este tipo de contenido caduca en unos pocos meses: los paquetes cambian de nombre, las opciones de configuración evolucionan, y poco queda de él un año después.

Tomamos la decisión opuesta. La columna vertebral de la formación es el propio harness, es decir, el conjunto de componentes funcionales que debe contener para funcionar: gestión del contexto, herramientas, delegación, orquestación, memoria, seguridad y verificación. Establecemos primero *cuáles* componentes son necesarios y *por qué*, y luego reconstruimos cada uno de ellos manualmente mediante software de código abierto. Finalmente, remontamos al principio transferible, aquel que conservarás sin importar cuál sea la herramienta del momento.

El objetivo no es construir un competidor de Claude Code. La reconstrucción es voluntariamente mínima. Lo que te llevarás al final no es un software, sino la comprensión necesaria para construir tu propio harness, adaptado a tus usos, y para pilotar con conocimiento de causa los harness que utilices en el día a día.

## El tríptico

Cada módulo de reconstrucción se desarrolla en tres pasos que repetimos a lo largo de toda la formación.

El primer paso, **Comprender**, parte de la necesidad. ¿Para qué sirve el componente, por qué es indispensable, y cómo lo implementa un harness real?

El segundo paso, **Reconstruir**, consiste en escribir la versión mínima equivalente del componente en Pi, manualmente. Esto permite poner a prueba el concepto en lugar de simplemente leerlo. Hay que tener en cuenta que este código es una ilustración, no la lección: está ahí para hacer tangible la idea, y es reemplazable.

El tercer paso, **Generalizar**, extrae el principio que sobrevive al cambio de herramienta, la regla de diseño que aplicarías en otro lugar. Es este último paso el que realmente importa, porque es el único que no caduca.

Esta distinción entre lo duradero y lo desechable está en el corazón de la formación. Los principios del tercer paso deben retenerse; las versiones de los paquetes y los detalles de configuración del segundo paso están destinados a cambiar, y los tratamos como tales.

## El esquema de un módulo

Para que te orientes, cada módulo del acto de reconstrucción sigue la misma estructura: su duración, sus objetivos expresados en términos de habilidades, sus prerequisitos, el tríptico Comprender / Reconstruir / Generalizar, una práctica basada en un artefacto real, un entregable junto con su criterio de éxito, y finalmente las trampas a evitar.

## El desarrollo (A revisar)

La formación representa aproximadamente 13h30 en presencial. Se organiza en cuatro actos.

| Acto                                | Contenido                                                                                    | Duración |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| 1. Fundamentos                      | Los LLM y su ecosistema, los componentes de un harness, el harness de partida Pi, y el método | 3h30     |
| 2. Reconstrucción componente a componente | Contexto, herramientas, agentes, workflows, memoria, permisos                            | 6h30     |
| 3. Verificar, evaluar, observar     | Pruebas, evaluaciones multimodelo, observabilidad                                           | 2h00     |
| 4. Construir tu propio harness      | Un caso de uso personal, y la distinción durable / desechable                              | 1h30     |

El Acto 2 concentra el valor principal. Está voluntariamente más cargado de contenido escrito de lo que sugiere su duración, con el fin de seguir siendo útil de forma autónoma una vez finalizada la formación.