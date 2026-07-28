# ¿Qué es un harness?

Un **harness** es un marco o una infraestructura que integra, de manera cohesiva, los bloques individuales surgidos con los LLM: gestión del contexto, orquestación de las herramientas disponibles, ejecución de código, permisos, etc.

Es la evolución lógica después de haber aprendido estos componentes por separado: ensamblarlos en un sistema integrado e inteligente. Su función es construir un sistema lo más autónomo posible, capaz de trabajar en tareas complejas y largas.

Claude Code es un ejemplo de harness: orquesta un modelo de lenguaje, un conjunto de herramientas (lectura/escritura de archivos, ejecución de comandos, búsqueda web, etc.) y una política de permisos, para transformar un LLM en un agente capaz de llevar a cabo una tarea de principio a fin.

## Lo que gestiona un harness

- El **contexto**: qué información se proporciona al modelo, en qué orden y con qué frescura.
- Las **herramientas**: qué acciones puede activar el modelo (leer un archivo, ejecutar un comando, llamar a una API...).
- Los **permisos**: qué requiere una confirmación humana y qué puede ejecutarse de forma autónoma.
- El **bucle de ejecución**: cómo el harness encadena las llamadas al modelo, la ejecución de las herramientas y la revisión de los resultados.

## Por qué es importante

Un mismo modelo de lenguaje produce resultados muy diferentes según el harness que lo rodee: la calidad del contexto proporcionado, las herramientas expuestas y las barreras de seguridad implementadas suelen influir más en el resultado final que la elección del propio modelo.
