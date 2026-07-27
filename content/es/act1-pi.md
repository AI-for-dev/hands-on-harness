# El harnes inicial: Pi

::: tip Objetivos de este módulo
- Por qué utilizar Pi
- Iniciar Pi y comprender el papel del directorio `.pi/`
- Situar las cuatro extensiones que utilizaremos para encarnar la cuadrícula de componentes
- Encuadrar honestamente el ejercicio de reconstrucción
:::

Hemos visto anteriormente que un harnes es un conjunto de herramientas por encima de los modelos LLM. Cada uno puede desempeñar un papel esencial en la ejecución de una tarea con total autonomía. Dispones de un conjunto de harnes ya construidos: claude code, codex, opencode, Pi... Pero en la mayoría de los casos, no dominas nada y te dejas guiar esperando que haga lo que le has pedido. Si algo sale mal, no siempre es fácil entender por qué. Sin embargo, nuestro objetivo es precisamente comprender cómo funciona un harnes en el más mínimo detalle. Queremos poder añadir o retirar fácilmente un elemento y probar las consecuencias.

En lo sucesivo, utilizaremos [Pi](https://pi.dev), un agente de código de línea de comandos, abierto y extensible, que es minimalista. Lo que nos interesa es precisamente la posibilidad de añadirle extensiones de forma sencilla y comprender todo lo que ocurre en su interior sin sorpresas: un dominio de extremo a extremo.

## Qué es Pi

Pi es un agente de código que se ejecuta en tu terminal, creado inicialmente por Mario Zechner. Su objetivo principal era precisamente tener el control de su harnes. Pi se basa en un puñado de herramientas básicas —leer un archivo, escribir uno, editarlo, ejecutar un comando shell— y en un bucle agentivo que encadena las llamadas al modelo, la ejecución de las herramientas y la relección de los resultados. Es exactamente el bucle que hemos descrito en el módulo anterior, reducido a su expresión más simple.

Alrededor de este núcleo, Pi expone un sistema de extensiones y eventos. Puedes conectarte a los momentos clave del bucle con `pi.on(...)`, de la misma manera que se conectan los hooks en Claude Code.

Como Claude Code se apoya en un directorio `.claude/`, Pi se apoya en un directorio `.pi/`. Aquí es donde residen la configuración, los skills, los agentes y las reglas de permiso. Puedes considerarlo como el equivalente, en el lado de Pi, de lo que quizás ya conozcas en el lado de Claude Code.

Pi se conoce muy bien a sí mismo y, por tanto, está en condiciones de ayudarte a ampliar sus funcionalidades. Todo está descrito en su "system prompt", como verás en seguida.

## Primeros pasos

Para instalar Pi, simplemente dirígete al sitio oficial https://pi.dev y déjate guiar.

A continuación, necesitas instalar modelos que utilizarás durante todas tus experiencias. Tienes varias formas de indicar tu proveedor de modelos: https://pi.dev/docs/latest/providers. Te animamos a disponer de un modelo lo bastante potente para realizar una planificación de buena calidad y de un modelo más rápido que codifique progresivamente las tareas que el planificador haya establecido.

Para quienes sigan esta formación en presencial, os proponemos utilizar los modelos proporcionados por [ILaaS](https://www.ilaas.fr/), una plataforma compartida orientada a una IA generativa confiable, robusta, ética y sobria. Este servicio proviene del mundo académico francés.

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

Deberás indicar la api key que te haya sido proporcionada. Los modelos anunciados son los disponibles durante la formación. No dudes en visitar la página de IlaaS para consultar las actualizaciones (https://www.ilaas.fr/liste-des-modeles-llms/).

Si todo ha ido bien, deberías poder utilizar Pi. Inicia una primera sesión interactiva con `pi` en tu terminal y verifica que tienes un prompt. Algo como

![](/figures/pi.png)

Puedes observar los diferentes elementos que componen Pi (contexto, skills, extensiones) así como el modelo predeterminado utilizado en la esquina inferior derecha (aquí `(ilaas) qwen-3.6-35b-instruct`).

Puedes jugar con él formulándole preguntas, observar el bucle y ver cómo te responde. Prueba a continuación el modo no interactivo con `pi -p`, que ejecuta una solicitud y devuelve el control.

## Los primeros comandos útiles

- Las herramientas
    Como se ha dicho en la introducción de esta parte, Pi viene con 4 herramientas. Para obtener la lista, solo tienes que escribir

    ```
    /tools
    ```

    Deberías ver al menos las herramientas: read, bash edit, write.

    ::: info Ejercicio
    A partir del prompt, intenta desencadenar cada una de estas herramientas mediante tu pregunta.
    :::

- El árbol de tu sesión

    Puede resultar útil navegar por tu sesión y volver a una de las etapas de tu conversación. Para ello, utiliza el comando

    ```
    \tree
    ```

    ::: info Ejercicio
    Intenta volver a un punto de tu hilo de conversación.
    :::

- Reanudar una sesión anterior

    Puedes retomar cualquiera de las sesiones anteriores mediante el comando

    ```
    \resume
    ```

    ::: info Ejercicio
    Intenta retomar una sesión anterior.
    :::

- Exportar tu sesión

    Por último, puedes exportar tu sesión en formato html o json mediante el comando

    ```
    \export
    ```

    ::: info Ejercicio
    Haz una exportación de tu sesión en html (formato predeterminado) y abre este archivo. ¡Por fin podrás ver cómo es el "system prompt" mínimo de Pi!
    :::

Hemos cubierto los principales comandos que consideramos útiles por el momento. Veremos otros a lo largo de este viaje.

## Comprender el contenido de los directorios de Pi

## Instalar una extensión

## Las cuatro extensiones

Para encarnar la cuadrícula de componentes, nos apoyaremos en cuatro extensiones, cada una correspondiente a un componente. `pi-rtk-optimizer` se encargará del contexto y la compactación. `@tintinweb/pi-subagents` proporcionará la delegación. `pi-hermes-memory` llevará la memoria. `pi-lens` completará la observabilidad y las herramientas de código. Los permisos y las herramientas, por su parte, se reconstruirán manualmente en `.pi/skills/`.

Las introducimos aquí como un inventario; cada extensión se presentará en detalle en el momento en que se reconstruya su componente.

## La tabla de correspondencia

El hilo conductor de la formación reside en una tabla de tres columnas. La primera recuerda la invariant, es decir, el principio perdurable de cada componente. La segunda muestra cómo un harnes real lo implementa, apoyándose en lo que el *leak* nos enseña de Claude Code. La tercera indica cómo lo reconstruimos en Pi. Una cuarta columna permanece vacía: es la tuya, para rellenar con tus propias intenciones de uso.

| Invariant           | En Claude Code                 | Reconstruido en Pi                   | Tu harnes? |
| ------------------- | -------------------------------- | ------------------------------------ | --------------- |
| Contexto y caché   | frontera estática / dinámica   | `pi-rtk-optimizer`                   |                 |
| Herramientas        | plugins guardados por permiso    | skills en `.pi/skills/`            |                 |
| Delegación          | sub-agente aislado, expuesto como herramienta| `@tintinweb/pi-subagents`           |                 |
| Memoria           | lectura/escritura + filtrado      | `pi-hermes-memory`                   |                 |
| Sûreté            | modos y reglas de rechazo         | pipeline `.pi/skills/permissions/`  |                 |

## Un encuadre honesto

Hay dos puntos que deben decirse claramente antes de comenzar.

El primero es que nuestro objetivo no es igualar a Claude Code. La reconstrucción que llevamos a cabo es mínima, y lo seguirá siendo. Lo que buscamos es comprender lo suficiente cada componente para ser capaces de construir uno adaptado a nuestras necesidades.

El segundo es una tensión que preferimos abordar directamente. Claude Code ya sabe escribir su propio harnes sobre la marcha, según la tarea. Entonces uno puede preguntarse para qué sirve aprender a construirlo a mano. La respuesta cabe en una frase: no se pilota, no se audita y no se adapta más que lo que se comprende. Saber construir manualmente sigue siendo la condición para mantener el control sobre lo que el agente hace en tu lugar.

## En la práctica

Recupera el estado del repositorio de la formación, haz que Pi responda mediante el acceso a los modelos y rellena la cuarta columna de la tabla con tus propios usos: ¿en qué tipo de tareas te gustaría fiabilizar tu trabajo? Esta columna te acompañará hasta el capstone del acto 4.

::: warning Una trampa que hay que conocer
El evento `input` se desencadena *antes* de la expansión de los skills. Si prefijas tus entradas con un comando `/, es posible que no se reconozca en el momento en que se ejecuta tu hook. Volveremos sobre esto cuando conectemos hooks a este evento.
:::

## Para ir más allá

- El [sitio oficial de Pi](https://pi.dev/) y su [documentación](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
- [Awesome Pi Coding Agent](https://awesome-pi.site/extensions/), el directorio comunitario de extensiones y recursos alrededor de Pi.
- El paquete [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) en npm, para las versiones y la instalación.
- Anthropic, [A harness for every task](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code), sobre la capacidad de Claude Code para escribir su propio harnes.
