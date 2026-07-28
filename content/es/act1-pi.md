# El harness de partida: Pi

::: tip Objetivos de este módulo
- Por qué usar Pi
- Lanzar Pi y entender el rol del directorio `.pi/`
- Ubicar las cuatro extensiones que usaremos para encarnar la cuadrícula de bloques
- Enmarcar honestamente el ejercicio de reconstrucción
:::

Hemos visto anteriormente que un harness era un conjunto de herramientas sobre los modelos LLM. Cada uno puede desempeñar un papel esencial en el cumplimiento de una tarea de forma autónoma. Tienes a tu disposición un conjunto de harness ya construidos: Claude Code, codex, opencode, Pi... Pero en la mayoría de los casos, no controlas nada y te dejas guiar esperando que haga lo que le has pedido. Si algo sale mal, no es necesariamente fácil entender por qué. Ahora bien, nuestro objetivo es precisamente entender cómo funciona un harness en el más mínimo de sus detalles. Queremos poder añadir o quitar fácilmente un elemento a este y probar las consecuencias.

A continuación, vamos a utilizar [Pi](https://pi.dev), un agente de código en línea de comandos, abierto y extensible que es minimalista. Lo que nos interesará es precisamente la posibilidad de añadirle extensiones de forma sencilla y comprender todo lo que ocurre en su interior sin sorpresas: un control de principio a fin.

## Qué es Pi

Pi es un agente de código que se ejecuta en tu terminal, creado inicialmente por Mario Zechner. Su objetivo principal era precisamente tener el control de su harness. Pi se basa en un puñado de herramientas básicas —leer un archivo, escribir uno, editarlo, ejecutar un comando de shell— y en un bucle agéntico que encadena las llamadas al modelo, la ejecución de las herramientas y la lectura de los resultados. Es exactamente el bucle que describimos en el módulo anterior, reducido a su expresión más simple.

Alrededor de este núcleo, Pi expone un sistema de extensiones y eventos. Puedes conectarte a los momentos clave del bucle con `pi.on(...)`, de la misma forma que se conectan hooks en Claude Code.

Al igual que Claude Code se apoya en un directorio `.claude/`, Pi se apoya en un directorio `.pi/`. Aquí es donde residen la configuración, las skills, los agentes y las reglas de permisos. Puedes considerarlo como el equivalente, por parte de Pi, de lo que quizá ya conoces por parte de Claude Code.

Pi se conoce muy bien y, por lo tanto, puede ayudarte a ampliar sus funcionalidades. Todo está descrito en su "system prompt" como verás en un instante.

## Primeros pasos

Para instalar Pi, solo tienes que ir al sitio oficial https://pi.dev y dejarte guiar.

A continuación, debes instalar los modelos que utilizarás durante todas tus experiencias. Tienes varias formas de configurar tu proveedor de modelos: https://pi.dev/docs/latest/providers. Te recomendamos disponer de un modelo lo suficientemente potente para realizar una planificación de buena calidad y un modelo más rápido que codifique a medida que el planificador establezca las tareas.

Para quienes sigan esta formación de forma presencial, te proponemos utilizar los modelos puestos a disposición por [ILaaS](https://www.ilaas.fr/), que es una plataforma compartida que busca una IA generativa fiable, robusta, ética y sobria. Este servicio proviene del ámbito académico francés.

Debes editar el archivo `~/.pi/agent/models.json` y completarlo de la siguiente manera:

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

Tendrás que introducir la clave de API que se te ha proporcionado. Los modelos anunciados son los disponibles durante la formación. No dudes en visitar la página de IlaaS para ver las actualizaciones (https://www.ilaas.fr/liste-des-modeles-llms/).

::: info El bloque `cost` no es un dato del proveedor
El campo `cost` es opcional y su valor por defecto es cero. Sin él, el comando `/session` te indicará un coste de 0,00 € en todas tus sesiones, lo que te privaría de un indicador que utilizaremos mucho más adelante.

Los precios anteriores, expresados por millón de tokens, son los practicados en el mercado para un modelo de dimensiones comparables. No corresponden a ninguna facturación real: el uso de ILaaS no se te factura por token. Están ahí solo para dar una idea del orden de magnitud.

Recuerda sobre todo esto, ya que es una lección de harness: el coste que muestra un agente de código no es una información recibida del proveedor, sino una multiplicación realizada a partir de un campo de configuración que tú mismo has escrito.

Si todo ha ido bien, deberías poder utilizar Pi. Inicia una primera sesión interactiva con `pi` en tu terminal y verifica que tienes un prompt. Algo como

![](/figures/pi.png)

Puedes ver los diferentes elementos que componen Pi (contexto, skills, extensiones) así como el modelo utilizado por defecto en la parte inferior derecha (aquí `(ilaas) qwen-3.6-35b-instruct`).

Puedes jugar con él haciéndole preguntas, observar el bucle y ver cómo te responde. Prueba después el modo no interactivo con `pi -p`, que ejecuta una solicitud y devuelve el control.

## Los primeros comandos útiles

- Las herramientas

    Como se mencionó en la introducción de esta parte, Pi viene con 4 herramientas. Para obtener la lista, basta con escribir

    ```
    /tools
    ```

    Deberías ver al menos las herramientas: read, bash edit, write.

    ::: info Ejercicio
    Desde el prompt, intenta activar cada una de estas herramientas mediante tu pregunta.
    :::

- El árbol de tu sesión

    Puede ser útil navegar por tu sesión y volver a uno de los pasos de tu conversación. Para ello, debes utilizar el comando

    ```
    \tree
    ```

    ::: info Ejercicio
    Intenta volver a un punto de tu hilo de conversación.
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

    Por último, puedes exportar tu sesión en formato html o json mediante el comando

    ```
    \export
    ```

    ::: info Ejercicio
    Realiza una exportación de tu sesión en html (formato por defecto) y abre este archivo.
    :::

Hemos repasado los principales comandos que consideramos útiles por el momento. Veremos otros a lo largo de este recorrido.

## Comprender el contenido de los directorios de Pi

Pi distingue dos directorios con el mismo nombre `.pi/`, y es necesario aprender a diferenciarlos desde el principio para no perderse.

El primero se encuentra en tu directorio personal, `~/.pi/agent/`. Es la configuración global, la que se aplica por defecto a todos tus proyectos: ya la has modificado al editar `~/.pi/agent/models.json` para declarar tus proveedores de modelos. También encontrarás allí `settings.json`, para las preferencias generales (proveedor y modelo por defecto, tema, proxy...), y `trust.json`, que recuerda de una sesión a otra los proyectos en los que has decidido confiar.

El segundo está en la raíz de tu proyecto, `.pi/`, el que versionas junto con el resto del repositorio. Contiene los elementos específicos del proyecto actual: un `settings.json` que sobreescribe el global (los objetos anidados se fusionan, no se reemplazan por completo), y sobre todo los directorios que iremos llenando a lo largo de la formación, empezando por `skills/` para las herramientas que escribiremos.

Esta distinción no es solo una conveniencia de organización. Las skills declaradas en el directorio global se cargan sin ninguna verificación particular: te acompañan a todas partes. Las del proyecto, en cambio, solo se cargan una vez que el proyecto se ha marcado como seguro, precisamente en ese `trust.json` mencionado anteriormente. Es un primer vistazo muy concreto del componente de seguridad que reconstruiremos más adelante: un harness que ejecutara sin criterio código encontrado en cualquier repositorio clonado sería una vulnerabilidad en sí misma.

Recuerda esta regla sencilla para el futuro: lo que deba aplicarse en todas partes va en `~/.pi/agent/`, lo que sea específico del repositorio NÉON va en su `.pi/` local, y es este segundo directorio el que iremos poblando a lo largo de los siguientes módulos.

## Las extensiones

Pi no se limita a sus cuatro herramientas básicas y es completamente extensible. Puedes añadirle cualquier acción a través del mecanismo `pi.on(...)` ya mencionado, que permite modificar el comportamiento del bucle agéntico. También puedes cambiar la interfaz de usuario, el TUI, añadiendo información en sus diferentes zonas. Estos dos mecanismos te convierten en el arquitecto de tu harness: solo tienes que escribir una extensión para tus necesidades, distribuirla o utilizar las escritas por la comunidad. Para encontrarlas, la galería oficial en [pi.dev/packages](https://pi.dev/packages) es el mejor recurso.

Una extensión se distribuye como un paquete npm o como un repositorio git, y se instala con `pi install`:

```
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

Por defecto, la instalación es global: el paquete se deposita en `~/.pi/agent/npm/` (o `~/.pi/agent/git/<hôte>/<chemin>` para un repositorio git), y la extensión pasa a estar disponible en todas tus sesiones de Pi, en todos tus proyectos. Añade `-l` al comando para instalarla en local en su lugar: el paquete se guardará entonces en `.pi/npm/`, y la extensión solo estará activa para este proyecto, una vez que este se haya marcado como seguro, exactamente como hemos visto en el párrafo anterior para las skills. Para eliminar un paquete, el comando simétrico es `pi remove npm:@foo/bar`.

Para probar una extensión sin instalarla, ya sea un paquete o un simple archivo local, la opción `-e` (o `--extension`) la carga solo durante la sesión actual:

```
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

Este es el reflejo que debes adoptar antes de comprometerte con una extensión encontrada en el directorio comunitario. Ten en cuenta, no obstante, que una extensión se ejecuta con todos tus permisos de sistema: instala y prueba solo aquello que estés dispuesto a ejecutar con confianza.

## Las cuatro extensiones

Podríamos haber hecho que construyeras tus propias extensiones, pero dado el tiempo asignado y el hecho de que aún no conoces ni la herramienta Pi ni la estructura de un harness, habría sido una pérdida de tiempo y de motivación. Esperamos que al final de esta formación, tengas las ideas lo suficientemente claras para imaginar tú mismo mejoras de tu harness en forma de nuevas extensiones de Pi.

Para construir nuestro harness, nos apoyaremos en cuatro extensiones:

- `pi-rtk-optimizer` se encargará del contexto y la compactación,
- `@tintinweb/pi-subagents` proporcionará la delegación,
- `pi-hermes-memory` gestionará la memoria,
- `pi-lens` completará la observabilidad y el utillaje de código.

Los permisos y las herramientas, por su parte, se reconstruirán a mano en `.pi/skills/`.

::: info Ejercicio
Instala en local (`-l`) una de las cuatro extensiones presentadas a continuación y verifica que aparezca correctamente en `.pi/npm/`. Inicia Pi; deberías verla en la sección de extensiones. Puedes intentar eliminarla con `pi remove`.
:::

## Para ir más allá

- El [sitio oficial de Pi](https://pi.dev/) y su [documentación](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
