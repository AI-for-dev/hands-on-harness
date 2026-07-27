# El harnes inicial: Pi

::: tip Objetivos de este módulo
- Por qué usar Pi
- Iniciar Pi y comprender el papel del directorio `.pi/`
- Situar las cuatro extensiones que utilizaremos para materializar la cuadrícula de módulos
- Enmarcar con honestidad el ejercicio de reconstrucción
:::

Hemos visto anteriormente que un harnes es un conjunto de herramientas por encima de los modelos LLM. Cada uno puede desempeñar un papel esencial en la realización de una tarea de manera autónoma. Dispones de un conjunto de harnes ya construidos: claude code, codex, opencode, Pi... Pero en la mayoría de los casos, no controlas nada y te dejas guiar esperando que haga lo que le has pedido. Si algo sale mal, no siempre es fácil entender por qué. Sin embargo, nuestro objetivo es precisamente comprender cómo funciona un harnes en cada uno de sus detalles. Queremos poder añadir o retirar fácilmente un elemento de este y probar las consecuencias.

En el resto del curso utilizaremos [Pi](https://pi.dev), un agente de código de línea de comandos, abierto y extensible, que es minimalista. Lo que nos interesa es precisamente la posibilidad de añadirle extensiones de forma sencilla y comprender todo lo que ocurre en su interior sin sorpresas: un control de principio a fin.

## Qué es Pi

Pi es un agente de código que se ejecuta en tu terminal, creado originalmente por Mario Zechner. Su objetivo principal era precisamente tener el control de su harnes. Pi se basa en un puñado de herramientas básicas —leer un archivo, escribir uno, editarlo, ejecutar un comando shell— y en un bucle agentico que encadena llamadas al modelo, ejecución de herramientas y relección de los resultados. Es exactamente el bucle que describimos en el módulo anterior, reducido a su expresión más simple.

Alrededor de este núcleo, Pi expone un sistema de extensiones y eventos. Puedes conectarte a los momentos clave del bucle con `pi.on(...)`, de la misma manera que se conectan los hooks en Claude Code.

Al igual que Claude Code se basa en un directorio `.claude/`, Pi se basa en un directorio `.pi/`. Allí residen la configuración, los skills, los agentes y las reglas de permiso. Puedes considerarlo como el equivalente, en el lado de Pi, de lo que quizás ya conoces en el lado de Claude Code.

Pi se conoce muy bien y por lo tanto es capaz de ayudarte a extender sus funcionalidades. Todo está descrito en su "system prompt" como verás en seguida.

## Primeros pasos

Para instalar Pi, simplemente visita el sitio oficial https://pi.dev y déjate guiar.

A continuación, necesitas instalar modelos que utilizarás durante todas tus experiencias. Hay varias formas de configurar tu proveedor de modelos: https://pi.dev/docs/latest/providers. Te recomendamos tener un modelo lo suficientemente potente para realizar una planificación de buena calidad y un modelo más rápido que codifique progresivamente las tareas establecidas por el planificador.

Para quienes sigan esta formación presencial, os proponemos utilizar los modelos puestos a disposición por [ILaaS](https://www.ilaas.fr/), una plataforma compartida destinada a una IA generativa de confianza, robusta, ética y sobria. Este servicio proviene del mundo académico francés.

Debes editar este archivo `~/.pi/agent/models.json` y rellenarlo de la siguiente manera:

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

Deberás introducir la clave API que te haya sido proporcionada. Los modelos anunciados son los disponibles durante la formación. No dudes en visitar la página de IlaaS para las actualizaciones (https://www.ilaas.fr/liste-des-modeles-llms/).

Si todo ha ido bien, deberías poder utilizar Pi. Inicia una primera sesión interactiva con `pi` en tu terminal y verifica que tienes un prompt. Algo como:

![](/figures/pi.png)

Puedes observar los diferentes elementos que componen Pi (contexto, skills, extensiones) así como el modelo utilizado por defecto en la esquina inferior derecha (aquí `(ilaas) qwen-3.6-35b-instruct`).

Puedes jugar con él hacíendole preguntas, observar el bucle y ver cómo te responde. Prueba luego el modo no interactivo con `pi -p`, que ejecuta una petición y devuelve el control.

## Los primeros comandos útiles

- Las herramientas
    Como se mencionó en la introducción de esta sección, Pi viene con 4 herramientas. Para obtener la lista, simplemente escribe:

    ```
    /tools
    ```

    Deberías ver al menos las herramientas: read, bash edit, write.

    ::: info Ejercicio
    Desde el prompt, intenta, mediante tu pregunta, activar cada una de estas herramientas.
    :::

- El árbol de tu sesión

    Puede ser útil navegar por tu sesión y volver a una de las etapas de tu conversación. Para ello, utiliza el comando:

    ```
    \tree
    ```

    ::: info Ejercicio
    Intenta volver a un punto de tu hilo de conversación.
    :::

- Reanudar una sesión anterior

    Puedes retomar cualquier sesión anterior utilizando el comando:

    ```
    \resume
    ```

    ::: info Ejercicio
    Intenta retomar una sesión anterior.
    :::

- Exportar tu sesión

    Finalmente, puedes exportar tu sesión en formato html o json mediante el comando:

    ```
    \export
    ```

    ::: info Ejercicio
    Realiza una exportación de tu sesión en html (formato por defecto) y abre este archivo. ¡Finalmente puedes ver cómo se ve el "system prompt" mínimo de Pi!
    :::

Hemos cubierto los comandos principales que consideramos útiles por ahora. Veremos otros a lo largo de este viaje.

## Comprender el contenido de los directorios Pi

## Instalar una extensión

## Las cuatro extensiones

Para materializar la cuadrícula de módulos, nos apoyaremos en cuatro extensiones, cada una correspondiente a un módulo. `pi-rtk-optimizer` se encargará del contexto y la compaction. `@tintinweb/pi-subagents` proporcionará la delegación. `pi-hermes-memory` gestionará la memoria. `pi-lens` completará la observabilidad y las herramientas de código. Los permisos y las herramientas, por su parte, serán reconstruidos a mano en `.pi/skills/`.

Las introducimos aquí como un inventario; cada extensión se presentará en detalle en el momento en que se reconstruya su módulo correspondiente.

## La tabla de correspondencia

El hilo conductor de la formación se centra en una tabla de tres columnas. La primera recuerda la invariant, es decir, el principio perdurable de cada módulo. La segunda muestra cómo un harnes real lo implementa, basándose en lo que el *leak* nos enseña sobre Claude Code. La tercera indica cómo lo reconstruimos en Pi. Una cuarta columna permanece vacía: es la tuya, para rellenarla con tus propias intenciones de uso.

| Invariant           | En Claude Code                 | Reconstruido en Pi                   | Tu harnes ? |
| ------------------- | ------------------------------ | ------------------------------------ | ----------- |
| Contexto y cache    | frontera estática / dinámica   | `pi-rtk-optimizer`                   |             |
| Herramientas        | plugins gestionados por permiso| skills en `.pi/skills/`              |             |
| Delegación          | sub-agente aislado, expuesto como herramienta | `@tintinweb/pi-subagents` |             |
| Memoria             | lectura/escritura + filtrado   | `pi-hermes-memory`                   |             |
| Sûreté              | modos y reglas de rechazo      | pipeline `.pi/skills/permissions/`   |             |

## Un enmarcación honesta

Hay dos puntos que deben decirse claramente antes de comenzar.

El primero es que nuestro objetivo no es igualar a Claude Code. La reconstrucción que llevamos a cabo es mínima, y lo seguirá siendo. Lo que buscamos es comprender suficientemente bien cada módulo para ser capaces de construir uno adaptado a nuestras necesidades.

El segundo es una tensión que preferimos abordar de frente. Claude Code ya sabe escribir su propio harnes sobre la marcha, según la tarea. Entonces uno puede preguntarse para qué sirve aprender a construirlo a mano. La respuesta se resume en una frase: solo se controla, audita y adapta lo que se comprende. Saber construir manualmente sigue siendo la condición para mantener el control sobre lo que el agente hace por ti.

## En la práctica

Recupera el estado del repositorio de la formación, haz que Pi responda mediante el acceso a los modelos y rellena la cuarta columna de la tabla con tus propios usos: ¿en qué tipo de tareas te gustaría fiabilizar tu trabajo? Esta columna te acompañará hasta el capstone del acto 4.

::: warning Una trampa a conocer
El evento `input` se dispara *antes* de la expansión de los skills. Si prefijas tus entradas con un comando `/`, es probable que no sea reconocido en el momento en que se ejecuta tu hook. Volveremos sobre esto cuando conectemos hooks a este evento.
:::

## Para ir más allá

- El [sitio oficial de Pi](https://pi.dev/) y su [documentación](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
- [Awesome Pi Coding Agent](https://awesome-pi.site/extensions/), el directorio comunitario de extensiones y recursos alrededor de Pi.
- El paquete [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) en npm, para las versiones e instalación.
- Anthropic, [A harness for every task](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code), sobre la capacidad de Claude Code para escribir su propio harnes.
