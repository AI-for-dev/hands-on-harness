# El harness de partida: Pi

::: tip Objetivos de este módulo
- Comprender por qué empezamos con Pi
- Lanzar Pi y comprender el papel del directorio `.pi/`
- Ubicar las cuatro extensiones que utilizaremos para encarnar la rejilla de bloques
- Enmarcar honestamente el ejercicio de reconstrucción
:::

Hemos visto anteriormente que un harness era un conjunto de herramientas sobre los modelos LLM, donde cada una contribuye al cumplimiento de una tarea de forma autónoma. Tienes a tu disposición un conjunto de harness ya construidos: Claude Code, Codex, OpenCode, Pi... En la mayoría de los casos, sin embargo, no controlas nada: te dejas guiar esperando que la herramienta haga lo que le has pedido y, cuando algo sale mal, no siempre es fácil entender por qué. Pues bien, nuestro objetivo es precisamente comprender cómo funciona un harness en el más mínimo de sus detalles, poder añadirle o quitarle fácilmente un elemento y probar sus consecuencias.

A continuación, utilizaremos [Pi](https://pi.dev), un agente de código de línea de comandos, abierto, extensible y minimalista. Nos interesa precisamente porque podemos añadirle extensiones fácilmente y comprender todo lo que sucede en su interior, sin sorpresas: un control de extremo a extremo.

## Qué es Pi

Pi es un agente de código creado inicialmente por Mario Zechner, que se ejecuta en tu terminal. Su objetivo principal era precisamente tener el control de su harness. Pi se basa en un puñado de herramientas básicas (leer un archivo, escribir uno, editarlo, ejecutar un comando shell) y en un bucle agéntico que encadena las llamadas al modelo, la ejecución de las herramientas y la revisión de los resultados. Es exactamente el bucle que describimos en el módulo anterior, reducido a su expresión más simple.

Alrededor de este núcleo, Pi expone un sistema de extensiones y eventos. Puedes conectarte a los momentos importantes del bucle con `pi.on(...)`, de la misma manera que se conectan hooks en Claude Code.

Al igual que Claude Code se apoya en un directorio `.claude/`, Pi se apoya en un directorio `.pi/`. Ahí es donde residen la configuración, las skills, los agentes y las reglas de permiso. Puedes considerarlo como el equivalente, por parte de Pi, de lo que quizá ya conoces por parte de Claude Code.

El system prompt de Pi describe la totalidad de su funcionamiento, como verás en un instante; Pi puede, por tanto, ayudarte a extender sus propias funcionalidades.

## Primeros pasos

Para instalar Pi, visita el [sitio oficial](https://pi.dev) y deja que te guíen.

Luego debes declarar los modelos de lenguaje que usarás a lo largo de tus experiencias; las formas de configurar tu proveedor de modelos de lenguaje se describen en la [documentación](https://pi.dev/docs/latest/providers). Te recomendamos contar con un modelo de lenguaje sólido para una planificación de calidad y uno más rápido que codifique progresivamente las tareas establecidas por el planificador.

Para quienes sigan esta formación presencialmente, te proponemos usar los modelos de lenguaje puestos a disposición por [ILaaS](https://www.ilaas.fr/), una plataforma compartida del ámbito académico francés para una IA generativa confiable.

Edita el archivo `~/.pi/agent/models.json` y complétalo de la siguiente manera:

```json
{
    "providers": {
        "ilaas": {
            "baseUrl": "https://llm.ilaas.fr/v1",
            "api": "openai-completions",
            "apiKey": "XXXXX",
            "models": [
                {
                    "id": "gemma-4-31b",
                    "contextWindow": 128000,
                    "reasoning": true,
                    "cost": { "input": 0.14, "output": 0.28, "cacheRead": 0.0028, "cacheWrite": 0 }
                },
                {
                    "id": "qwen-3.6-35b-instruct",
                    "contextWindow": 256000,
                    "cost": { "input": 0.14, "output": 0.28, "cacheRead": 0.0028, "cacheWrite": 0 }
                }
            ]
        },
    }
}
```

Deberás introducir la clave de API que se te haya proporcionado. Los modelos indicados son los disponibles durante la formación; la [lista actualizada](https://www.ilaas.fr/liste-des-modeles-llms/) se encuentra en el sitio de ILaaS.

::: info El bloque `cost` no es un dato del proveedor
El campo `cost` es opcional y tiene un valor predeterminado de cero. Sin él, el comando `/session` te indicará un coste de 0,00 € en todas tus sesiones, lo que te privaría de un indicador que utilizaremos mucho más adelante.

Las tarifas anteriores, expresadas por millón de tokens, son las practicadas en el mercado para un modelo de tamaño comparable. No corresponden a ninguna facturación real: tu uso de ILaaS no se te factura por token. Están ahí solo para darte una idea del orden de magnitud.

Recuerda sobre todo esto, ya que es una lección de harness: el coste que muestra un agente de código no es una información recibida del proveedor, sino una multiplicación realizada a partir de un campo de configuración que tú mismo has escrito.
:::

Si todo ha ido bien, puedes usar Pi. Inicia una primera sesión interactiva con `pi` en tu terminal y verifica que obtienes un prompt de este tipo:

![](/figures/pi.png)

Ahí verás los diferentes elementos que componen Pi (contexto, skills, extensiones), así como el modelo utilizado por defecto abajo a la derecha (aquí `(ilaas) qwen-3.6-35b-instruct`).

Puedes jugar con él haciéndole preguntas, observar el bucle y ver cómo te responde. Prueba después el modo no interactivo con `pi -p`, que ejecuta una solicitud y devuelve el control.

## Los primeros comandos útiles

- Las herramientas

    Como se mencionó en la introducción de esta parte, Pi viene con cuatro herramientas. Para obtener la lista, solo tienes que escribir

    ```
    /tools
    ```

    Deberías ver al menos las herramientas read, bash, edit y write.

    ::: info Ejercicio
    Desde el prompt, intenta activar cada una de estas herramientas mediante tu pregunta.
    :::

- El árbol de tu sesión

    Puede ser útil navegar por tu sesión y retomar una de las etapas de tu conversación. Para ello, debes usar el comando

    ```
    \tree
    ```

    ::: info Ejercicio
    Intenta retomar la sesión desde un punto de tu hilo de conversación.
    :::

- Retomar una sesión anterior

    Puedes retomar cualquier sesión anterior mediante el comando

    ```
    \resume
    ```

    ::: info Ejercicio
    Intenta retomar una sesión anterior.
    :::

- Exportar la sesión

    Por último, puedes exportar tu sesión en formato HTML o JSON a través del comando

    ```
    \export
    ```

    ::: info Ejercicio
    Exporta tu sesión en HTML (formato por defecto) y abre este archivo.
    :::

Hemos repasado los principales comandos que consideramos útiles por el momento; veremos otros a lo largo de la formación.

## Comprender el contenido de los directorios de Pi

Pi distingue dos directorios con el mismo nombre `.pi/`, y es necesario aprender a diferenciarlos desde ahora para no perderse.

El primero reside en tu directorio personal, `~/.pi/agent/`. Es la configuración global, la que se aplica por defecto a todos tus proyectos: ya la has modificado al editar `~/.pi/agent/models.json` para declarar tus proveedores de modelos. Allí también se encuentra `settings.json`, para las preferencias generales (proveedor y modelo por defecto, tema, proxy...), y `trust.json`, que recuerda de una sesión a otra los proyectos en los que has decidido confiar.

El segundo reside en la raíz de tu proyecto, `.pi/`, el que versionas junto con el resto del repositorio. Contiene los elementos propios del proyecto actual: un `settings.json` que sobrescribe el global (los objetos anidados se fusionan y no se reemplazan en su conjunto), y sobre todo los directorios que llenaremos nosotros mismos a lo largo de la formación, empezando por `skills/` para las herramientas que escribiremos.

Esta distinción no es solo una comodidad de organización. Los skills declarados en el directorio global se cargan sin ninguna verificación: te acompañan a todas partes. Los del proyecto, en cambio, solo se cargan una vez que este proyecto ha sido marcado como seguro, precisamente en ese `trust.json` mencionado anteriormente. Es un primer vistazo muy concreto al bloque de seguridad que reconstruiremos más adelante: un harness que ejecutara sin criterio código encontrado en cualquier repositorio clonado sería una vulnerabilidad en sí mismo.

Recuerda esta regla sencilla para lo que sigue: lo que debe aplicarse en todas partes va en `~/.pi/agent/`, lo que es propio del repositorio NÉON va en su `.pi/` local, y es este segundo directorio el que poblaremos a medida que avancemos en los siguientes módulos.

## Las extensiones

Pi no se limita a sus cuatro herramientas básicas y es completamente extensible. Se le puede añadir cualquier acción a través del mecanismo `pi.on(...)` ya mencionado, que permite modificar el comportamiento del bucle agéntico. También se puede cambiar la interfaz de usuario, el TUI, añadiendo información en sus diferentes zonas. Estos dos mecanismos te convierten en el arquitecto de tu harness: solo tienes que escribir una extensión para tus necesidades, distribuirla o utilizar las escritas por la comunidad. Para encontrarlas, la galería oficial en [pi.dev/packages](https://pi.dev/packages) es el mejor punto de entrada.

Una extensión se distribuye como un paquete npm o como un repositorio git, y se instala con `pi install`:

```
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

Por defecto, la instalación es global: el paquete se deposita en `~/.pi/agent/npm/` (o `~/.pi/agent/git/<host>/<ruta>` para un repositorio git), y la extensión pasa a estar disponible en todas tus sesiones de Pi, en todos tus proyectos. Añade `-l` al comando para instalarlo en local en su lugar: el paquete se deposita entonces en `.pi/npm/`, y la extensión solo está activa para este proyecto, una vez que este se haya marcado como seguro, exactamente como hemos visto en el párrafo anterior para los skills. Para eliminar un paquete, el comando simétrico es `pi remove npm:@foo/bar`.

Para probar una extensión sin instalarla, ya sea un paquete o un simple archivo local, la opción `-e` (o `--extension`) la carga solo durante la sesión actual:

```
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

Este es el reflejo que debes adoptar antes de decidirte por una extensión encontrada en el directorio comunitario. Ten en cuenta, no obstante, que una extensión se ejecuta con la totalidad de tus permisos del sistema: instala y prueba solo aquello que estés dispuesto a ejecutar con confianza.

## Las cuatro extensiones

Podríamos haber hecho que construyeras tus propias extensiones, pero en el tiempo asignado, sin conocer aún ni la herramienta Pi ni la estructura de un harness, habrías perdido tiempo y motivación. Esperamos que, al final de esta formación, tengas las ideas lo suficientemente claras como para imaginar tú mismo mejoras para tu harness en forma de nuevas extensiones de Pi.

Para construir nuestro harness, nos basaremos en cuatro extensiones:

- `pi-rtk-optimizer` se encargará del contexto y la compactación,
- `@tintinweb/pi-subagents` proporcionará la delegación,
- `pi-hermes-memory` gestionará la memoria,
- `pi-lens` completará la observabilidad y el utillaje de código.

Los permisos y las herramientas, por su parte, se reconstruirán a mano en `.pi/skills/`.

::: info Ejercicio
Instala en local (`-l`) una de las cuatro extensiones anteriores y comprueba que aparece en `.pi/npm/`. Inicia Pi: deberías verla en la sección de extensiones. Después, puedes intentar eliminarla con `pi remove`.
:::

## Para ir más allá

- El [sitio oficial de Pi](https://pi.dev/) y su [documentación](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
