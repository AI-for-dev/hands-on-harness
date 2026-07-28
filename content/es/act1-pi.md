# El harness inicial: Pi

::: tip Objetivos de este módulo
- Por qué usar Pi
- Lanzar Pi y comprender el rol del directorio `.pi/`
- Ubicar las cuatro extensiones que usaremos para encarnar la rejilla de bloques
- Enmarcar honestamente el ejercicio de reconstrucción
:::

Hemos visto anteriormente que un harness era un conjunto de herramientas sobre los modelos LLM. Cada uno puede desempeñar un papel esencial en el cumplimiento de una tarea con total autonomía. Tienes a tu disposición un conjunto de harness ya construidos: Claude Code, codex, opencode, Pi... Pero en la mayoría de los casos, no controlas nada y te dejas guiar esperando que haga lo que le pediste. Si algo sale mal, no es necesariamente fácil entender por qué. Ahora bien, nuestro objetivo es precisamente comprender cómo funciona un harness en el más mínimo detalle. Queremos poder añadir o quitar fácilmente un elemento al mismo y probar las consecuencias.

A continuación, vamos a utilizar [Pi](https://pi.dev), un agente de código de línea de comandos, abierto, extensible y minimalista. Lo que nos interesará es precisamente la posibilidad de añadirle extensiones de forma sencilla y comprender todo lo que sucede en su interior sin sorpresas: un control de extremo a extremo.

## Qué es Pi

Pi es un agente de código que se ejecuta en tu terminal, creado inicialmente por Mario Zechner. Su objetivo primordial era precisamente tener el control de su harness. Pi se basa en un puñado de herramientas básicas —leer un archivo, escribir uno, editarlo, ejecutar un comando shell— y en un bucle agéntico que encadena las llamadas al modelo, la ejecución de las herramientas y la relectura de los resultados. Es exactamente el bucle que describimos en el módulo anterior, reducido a su expresión más simple.

Alrededor de este núcleo, Pi expone un sistema de extensiones y eventos. Puedes conectarte a los momentos clave del bucle con `pi.on(...)`, de la misma forma que se conectan hooks en Claude Code.

Al igual que Claude Code se apoya en un directorio `.claude/`, Pi se apoya en un directorio `.pi/`. Ahí es donde residen la configuración, los skills, los agentes y las reglas de permiso. Puedes considerarlo como el equivalente, por parte de Pi, de lo que quizás ya conozcas por parte de Claude Code.

Pi se conoce muy bien y, por lo tanto, puede ayudarte a extender sus funcionalidades. Todo está descrito en su "system prompt" como verás en un instante.

## Primeros pasos

Para instalar Pi, solo tienes que ir al sitio oficial https://pi.dev y dejarte guiar.

A continuación, debes instalar los modelos que utilizarás a lo largo de tus experiencias. Tienes varias formas de configurar tu proveedor de modelos: https://pi.dev/docs/latest/providers. Te recomendamos contar con un modelo lo suficientemente potente para realizar una planificación de calidad y un modelo más rápido que codifique a medida que el planificador defina las tareas.

Para quienes sigan esta formación presencialmente, te proponemos utilizar los modelos puestos a disposición por [ILaaS](https://www.ilaas.fr/), que es una plataforma compartida orientada a una IA generativa fiable, robusta, ética y sobria. Este servicio proviene del mundo académico francés.

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
                    "reasoning": true
                },
                {
                    "id": "qwen-3.6-35b-instruct",
                    "contextWindow": 256000
                }
            ]
        },
    }
}
```

Deberás indicar la api key que se te haya proporcionado. Los modelos anunciados son los disponibles durante la formación. No dudes en visitar la página de IlaaS para ver las actualizaciones (https://www.ilaas.fr/liste-des-modeles-llms/).

Si todo ha ido bien, deberías poder utilizar Pi. Inicia una primera sesión interactiva con `pi` en tu terminal y verifica que tienes un prompt. Algo como

![](/figures/pi.png)

Puedes observar los diferentes elementos que componen Pi (contexto, skills, extensiones) así como el modelo utilizado por defecto abajo a la derecha (en este caso `(ilaas) qwen-3.6-35b-instruct`).

Puedes jugar con él haciéndole preguntas, observar el bucle y ver cómo responde. Prueba después el modo no interactivo con `pi -p`, que ejecuta una solicitud y devuelve el control.

## Los primeros comandos útiles

- Las herramientas

    Como se mencionó en la introducción de esta parte, Pi incluye 4 herramientas. Para obtener la lista, solo tienes que escribir

    ```
    /tools
    ```

    Deberías ver al menos las herramientas: read, bash edit, write.

    ::: info Exercice
    Desde el prompt, intenta activar cada una de estas herramientas a través de tus preguntas.
    :::

- El árbol de tu sesión

    Puede ser útil navegar por tu sesión y volver a una de las etapas de tu conversación. Para ello, debes usar el comando

    ```
    \tree
    ```

    ::: info Exercice
    Intenta volver a un punto de tu hilo de conversación.
    :::

- Retomar una sesión anterior

    Puedes retomar cualquier sesión anterior mediante el comando

    ```
    \resume
    ```

    ::: info Exercice
    Intenta retomar una sesión anterior.
    :::

- Exportar la sesión

    Por último, puedes exportar tu sesión en formato html o json mediante el comando

    ```
    \export
    ```

    ::: info Exercice
    Haz una exportación de tu sesión en html (formato por defecto) y abre este archivo. ¡Por fin podrás ver cómo es un "system prompt" minimal de Pi!
    :::

Hemos repasado los principales comandos que consideramos útiles por el momento. Veremos otros a lo largo de este recorrido.

## Comprender el contenido de los directorios de Pi

Pi distingue dos directorios con el mismo nombre `.pi/`, y tienes que aprender a diferenciarlos desde ahora para no perderte.

El primero reside en tu directorio personal, `~/.pi/agent/`. Es la configuración global, la que se aplica por defecto a todos tus proyectos: ya la has modificado al editar `~/.pi/agent/models.json` para declarar tus proveedores de modelos. También encontrarás allí `settings.json`, para las preferencias generales (proveedor y modelo por defecto, tema, proxy...), y `trust.json`, que recuerda de una sesión a otra los proyectos en los que has decidido confiar.

El segundo reside en la raíz de tu proyecto, `.pi/`, el que versionas con el resto del repositorio. Contiene los elementos específicos del proyecto actual: un `settings.json` que sobrescribe el global (los objetos anidados se fusionan, no se reemplazan por completo), y sobre todo los directorios que llenaremos nosotros mismos a lo largo de la formación, empezando por `skills/` para las herramientas que escribiremos.

Esta distinción no es solo una conveniencia de organización. Los skills declarados en el directorio global se cargan sin ninguna verificación particular: te acompañan a todas partes. Los del proyecto, en cambio, solo se cargan una vez que el proyecto se ha marcado como seguro, precisamente en el `trust.json` mencionado anteriormente. Es un primer vistazo muy concreto del bloque de seguridad que reconstruiremos más adelante: un harness que ejecute sin discernimiento código encontrado en cualquier repositorio clonado sería una vulnerabilidad en sí mismo.

Recuerda esta regla sencilla para el futuro: lo que debe aplicarse en todas partes va en `~/.pi/agent/`, lo que es propio del repositorio NÉON va en su `.pi/` local, y es este segundo directorio el que iremos poblando a lo largo de los siguientes módulos.

## Las extensiones

Pi no se limita a sus cuatro herramientas básicas y es completamente extensible. Puedes añadirle cualquier acción a través del mecanismo `pi.on(...)` ya mencionado, que permite modificar el comportamiento en el bucle agéntico. También puedes cambiar la interfaz de usuario llamada TUI añadiendo información en las diferentes zonas. Estos cambios de comportamiento hacen que Pi sea extremadamente interesante, ya que tú eres el arquitecto de tu harness. Solo tienes que crear una extensión para tus necesidades. Obviamente, puedes distribuirla o utilizar extensiones creadas por la comunidad. Para encontrarlas, la galería oficial en [pi.dev/packages](https://pi.dev/packages) es el mejor recurso.

Una extensión se distribuye como un paquete npm o como un repositorio git, y se instala con `pi install`:

```
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

Por defecto, la instalación es global: el paquete se deposita en `~/.pi/agent/npm/` (o `~/.pi/agent/git/<hôte>/<chemin>` para un repositorio git), y la extensión queda disponible en todas tus sesiones de Pi, en todos tus proyectos. Añade `-l` al comando para instalarlo en local en su lugar: el paquete llegará entonces a `.pi/npm/`, y la extensión solo estará activa para este proyecto, una vez que este haya sido marcado como seguro, exactamente como vimos en el párrafo anterior para los skills. Para eliminar un paquete, el comando simétrico es `pi remove npm:@foo/bar`.

Para probar una extensión sin instalarla, ya sea un paquete o un simple archivo local, la opción `-e` (o `--extension`) la carga solo durante la sesión actual:

```
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

Es el reflejo a adoptar antes de comprometerse con una extensión encontrada en el directorio comunitario. Ten en cuenta, sin embargo, que una extensión se ejecuta con la totalidad de tus permisos de sistema: no instales ni pruebes nada que no estés dispuesto a ejecutar con confianza.

## Las cuatro extensiones

Podríamos haber hecho que construyeras tus propias extensiones, pero dado el tiempo asignado y el hecho de que seguramente no conoces ni la herramienta Pi ni la estructura de un harness, habría sido una pérdida de tiempo y de motivación. Esperamos que al final de esta formación, tengas las ideas lo suficientemente claras como para tener ideas de mejora de tu harness a través de nuevas extensiones de Pi.

Para construir nuestro harness, nos basaremos en cuatro extensiones:

- `pi-rtk-optimizer` se encargará del contexto y la compactación,
- `@tintinweb/pi-subagents` proporcionará la delegación,
- `pi-hermes-memory` llevará la memoria,
- `pi-lens` completará la observabilidad y el set de herramientas de código.

Los permisos y las herramientas, por su parte, se reconstruirán a mano en `.pi/skills/`.

::: info Ejercicio
Instala en local (`-l`) una de las cuatro extensiones presentadas a continuación, verifica que aparezca correctamente en `.pi/npm/`. Inicia Pi, deberías verla en la sección de extensiones. Puedes intentar eliminarla con `pi remove`.
:::

## Para ir más allá

- El [sitio oficial de Pi](https://pi.dev/) y su [documentación](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
