# El harness de partida: Pi

::: tip Objetivos de este módulo
- Entender por qué partimos de Pi
- Lanzar Pi y entender el papel del directorio `.pi/`
- Situar las cuatro extensiones que usaremos para materializar la cuadrícula de bloques
- Enmarcar con honestidad el ejercicio de reconstrucción
:::

Hemos visto anteriormente que un harness es un conjunto de herramientas por encima de los modelos LLM, cada una de las cuales contribuye a la realización de una tarea de forma autónoma. Tienes a tu disposición un conjunto de harness ya construidos: Claude Code, Codex, OpenCode, Pi... Sin embargo, en la mayoría de los casos no controlas nada de ellos: te dejas guiar esperando que la herramienta haga lo que le pediste, y cuando algo sale mal, no siempre es fácil entender por qué. Ahora bien, nuestro objetivo es precisamente entender cómo funciona un harness en el más mínimo de sus detalles, poder añadirle o quitarle fácilmente un elemento y probar sus consecuencias.

En lo que sigue, vamos a utilizar [Pi](https://pi.dev), un agente de código de línea de comandos, abierto, extensible y minimalista. Nos interesa precisamente porque puedes añadirle extensiones fácilmente y entender todo lo que sucede en su interior, sin sorpresas: un control de principio a fin.

## Qué es Pi

Pi es un agente de código creado inicialmente por Mario Zechner, que se ejecuta en tu terminal. Su propósito inicial era precisamente tener el control de su harness. Pi se apoya en un puñado de herramientas básicas (leer un archivo, escribir uno, editarlo, ejecutar un comando de shell) y en un bucle de agente que encadena las llamadas al modelo, la ejecución de las herramientas y la relectura de los resultados. Es exactamente el bucle que describimos en el módulo anterior, reducido a su mínima expresión.

Alrededor de este núcleo, Pi expone un sistema de extensiones y eventos. Puedes conectarte a los momentos importantes del bucle con `pi.on(...)`, de la misma manera que se conectan hooks en Claude Code.

Del mismo modo que Claude Code se apoya en un directorio `.claude/`, Pi se apoya en un directorio `.pi/`. Es ahí donde viven la configuración, los skills, los agentes y las reglas de permisos. Puedes considerarlo el equivalente en Pi de lo que quizá ya conozcas de Claude Code.

El «system prompt» de Pi describe la totalidad de su funcionamiento, como verás en un momento; por tanto, Pi puede ayudarte a extender sus propias funcionalidades.

## Primeros pasos

Para instalar Pi, dirígete al [sitio oficial](https://pi.dev) y déjate guiar.

A continuación, debes declarar los modelos que utilizarás a lo largo de tus experimentos; las formas de configurar tu proveedor de modelos se describen en la [documentación](https://pi.dev/docs/latest/providers). Te recomendamos contar con un modelo sólido para una planificación de buena calidad y con un modelo más rápido, que irá codificando sobre la marcha las tareas establecidas por el planificador.

Para quienes siguen esta formación en modalidad presencial, te proponemos utilizar los modelos puestos a disposición por [ILaaS](https://www.ilaas.fr/), una plataforma mutualizada procedente del ámbito académico francés, para una IA generativa de confianza.

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

Deberás indicar la clave de API que se te haya proporcionado. Los modelos indicados son los disponibles durante la formación; la [lista actualizada](https://www.ilaas.fr/liste-des-modeles-llms/) se encuentra en el sitio de ILaaS.

::: info El bloque `cost` no es un dato del proveedor
El campo `cost` es opcional y vale cero por defecto. Sin él, el comando `/session` te anunciará un costo de 0,00 € en todas tus sesiones, lo que te privaría de un indicador que usaremos mucho en adelante.

Las tarifas anteriores, expresadas por millón de tokens, son las que se aplican en el mercado para un modelo de tamaño comparable. No corresponden a ninguna facturación real: tu uso de ILaaS no se te factura por token. Solo están ahí para obtener un orden de magnitud.

Recuerda sobre todo esto, porque ya es una lección de harness: el costo que muestra un agente de código no es una información recibida del proveedor, es una multiplicación hecha a partir de un campo de configuración que tú mismo has escrito.
:::

Si todo ha ido bien, puedes usar Pi. Inicia una primera sesión interactiva con `pi` en tu terminal y comprueba que obtienes un prompt de este tipo:

![](/figures/pi.png)

Ahí ves los diferentes elementos que componen Pi (contexto, skills, extensiones) así como el modelo utilizado por defecto abajo a la derecha (aquí `(ilaas) qwen-3.6-35b-instruct`).

Puedes jugar con él haciéndole preguntas, observar el bucle y ver cómo te responde. Prueba luego el modo no interactivo con `pi -p`, que ejecuta una consulta y devuelve el control.

## Los primeros comandos útiles

- Las herramientas

    Como se dijo en la introducción de esta parte, Pi viene con cuatro herramientas. Para obtener la lista, solo tienes que escribir

    ```
    /tools
    ```

    Deberías ver al menos las herramientas read, bash, edit y write.

    ::: info Ejercicio (en clase)
    A partir del prompt, intenta activar cada una de estas herramientas con tu pregunta.
    :::

- El árbol de tu sesión

    Puede ser útil navegar por tu sesión y retomar desde uno de los pasos de tu conversación. Para ello, tienes que usar el comando

    ```
    \tree
    ```

    ::: info Ejercicio (en clase)
    Intenta volver a un punto de tu hilo de discusión.
    :::

- Retomar una sesión anterior

    Puedes retomar cualquier sesión anterior con el comando

    ```
    \resume
    ```

    ::: info Ejercicio (en clase)
    Intenta retomar una sesión anterior.
    :::

- Exportar tu sesión

    Por último, puedes exportar tu sesión al formato HTML o JSON mediante el comando

    ```
    \export
    ```

    ::: info Ejercicio (en clase)
    Haz una exportación de tu sesión en HTML (formato por defecto) y abre este archivo.
    :::

Hemos repasado los principales comandos que consideramos útiles por ahora; veremos otros a lo largo de la formación.

## Comprender el contenido de los directorios de Pi

Pi distingue dos directorios con el mismo nombre `.pi/`, y hay que aprender a diferenciarlos de inmediato para no perderse.

El primero vive en tu directorio personal, `~/.pi/agent/`. Es la configuración global, la que se aplica por defecto a todos tus proyectos: ya has tocado en ella al editar `~/.pi/agent/models.json` para declarar tus proveedores de modelos. También encontramos `settings.json`, para las preferencias generales (proveedor y modelo por defecto, tema, proxy...), y `trust.json`, que memoriza de una sesión a otra los proyectos en los que has decidido confiar.

El segundo vive en la raíz de tu proyecto, `.pi/`, el que versionas con el resto del repositorio. Contiene los elementos propios del proyecto en curso: un `settings.json` que sobreescribe el global (los objetos anidados se fusionan y no se reemplazan en su conjunto), y sobre todo los directorios que iremos llenando nosotros mismos a lo largo de la formación, empezando por `skills/` para las herramientas que escribiremos.

Esta distinción no es solo una cuestión de almacenamiento. Los skills declarados en el directorio global se cargan sin verificación especial: te siguen a todas partes. Los del proyecto, en cambio, solo se cargan una vez que este proyecto está marcado como seguro, precisamente en ese `trust.json` mencionado más arriba. Es un primer vistazo muy concreto del bloque de seguridad que reconstruiremos más adelante: un harness que ejecutara indiscriminadamente código encontrado en cualquier repositorio clonado sería una falla en sí mismo.

Recuerda esta regla simple para lo que sigue: lo que debe aplicarse en todas partes va en `~/.pi/agent/`, lo que es propio del repositorio NÉON va en su `.pi/` local, y es este segundo directorio el que iremos poblando a lo largo de los módulos que siguen.

## Las extensiones

Pi no se limita a sus cuatro herramientas básicas y es completamente extensible. Se le puede añadir cualquier acción mediante el mecanismo `pi.on(...)` ya mencionado, que permite modificar el comportamiento del bucle agéntico. También se puede cambiar la interfaz de usuario, el TUI, añadiendo información en sus distintas zonas. Estos dos mecanismos te convierten en el arquitecto de tu harness: te basta con escribir una extensión para tus necesidades, distribuirla, o usar las escritas por la comunidad. Para encontrarlas, la galería oficial en [pi.dev/packages](https://pi.dev/packages) es el mejor punto de entrada.

Una extensión se distribuye como un paquete npm o como un repositorio git, y se instala con `pi install`:

```bash
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

Por defecto, la instalación es global: el paquete se deposita en `~/.pi/agent/npm/` (o `~/.pi/agent/git/<hôte>/<chemin>` para un repositorio git), y la extensión queda disponible en todas tus sesiones Pi, en todos tus proyectos. Añade `-l` al comando para instalarla en local en su lugar: el paquete aterriza entonces en `.pi/npm/`, y la extensión solo está activa para ese proyecto, una vez marcado como seguro, exactamente como vimos en el párrafo anterior para los skills. Para retirar un paquete, el comando simétrico es `pi remove npm:@foo/bar`.

Para probar una extensión sin instalarla, ya sea un paquete o un simple archivo local, la opción `-e` (o `--extension`) la carga solo durante la sesión en curso:

```bash
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

Es el reflejo que hay que adoptar antes de comprometerte con una extensión encontrada en el directorio comunitario. Ten en cuenta, sin embargo, que una extensión se ejecuta con la totalidad de tus permisos de sistema: instala y prueba únicamente lo que estés dispuesto a ejecutar con confianza.

::: warning La extensión combo
En el resto de la formación, solo tendrás que instalar una extensión especialmente diseñada para esta. Te animamos encarecidamente a mirar lo que existe, a probar y a tomar distancia de tus experimentos. Puede ocurrir que una extensión nos haga perder el control de nuestro harness y desencadene eventos que degradan los resultados.
:::

::: info Ejercicio (en clase)
Instala en local (`-l`) la extensión combo

```bash
pi install -l npm:@ai-for-dev/combo
```

verifica que aparece correctamente en `.pi/npm/`. Lanza Pi: deberías verla en la sección de extensiones. Luego puedes intentar quitarla con `pi remove`.
:::

## Para saber más

- El [sitio oficial de Pi](https://pi.dev/) y su [documentación](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
