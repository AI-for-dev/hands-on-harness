# Los LLM en 2026

::: tip Objetivos de este módulo
- Saber situar un modelo: su tamaño, su arquitectura, su ventana de contexto, su nivel de razonamiento, su capacidad para llamar herramientas
- Comprender lo justo del funcionamiento de un LLM para elegir más tarde el modelo adecuado según el rol que se le confíe
:::

Este módulo forma parte de los prerrequisitos y lo abordamos como tal. El tema se trata en profundidad en otros lugares, a menudo mejor de lo que sabríamos hacer aquí. Nuestro objetivo no es rivalizar con esos recursos, sino poner a todos al mismo nivel para abordar la reconstrucción. Por eso nos quedamos deliberadamente en la superficie y remitimos a lecturas de referencia para quienes quieran profundizar, empezando por la [introducción de Andrej Karpathy a los grandes modelos de lenguaje][karpathy], un calentamiento de una hora sobre la pregunta «qué es un LLM», que continúa en su [curso detallado de 2025][karpathy-deepdive] para quien quiera el stack completo del entrenamiento.

## Lo que hace un modelo, en el fondo

Un modelo de lenguaje predice la siguiente palabra. Más precisamente, predice el siguiente *token*, es decir, el siguiente fragmento de texto, a partir de todo lo que lo precede. El texto que le das primero se divide en tokens, luego el modelo produce un token a la vez, y cada uno se añade a la entrada para predecir el siguiente. La capacidad de responder a una pregunta, de escribir código o de razonar surge de este mecanismo simple aplicado a muy gran escala.

Esta forma de funcionar explica dos cosas que nos servirán a lo largo de la formación. Por un lado, el modelo solo «sabe» lo que se encuentra en su entrada o lo que ha aprendido en el entrenamiento. Por otro lado, la calidad de lo que pones en la entrada incide directamente en la calidad de lo que sale. Ahí es donde el [«prompt engineering»][weng-prompting] cobra toda su importancia.

El terreno, sin embargo, ha cambiado desde las primeras guías. Las técnicas clásicas (ejemplos en contexto, cadena de pensamiento, coherencia por votación) siguen siendo una base útil, pero su peso ha cambiado: los modelos de razonamiento producen ahora la cadena de pensamiento por sí mismos, lo que [hace menos necesario el guiado manual][wolfe-reasoning]; la llamada a herramientas se ha convertido en una funcionalidad nativa en lugar de un truco de formulación; y la atención se ha desplazado de la optimización de un prompt aislado a la organización de todo el contexto de un agente, lo que hoy se llama [«context engineering»][context-engineering]. Es un hilo que conduce directamente a la [construcción de agentes][huyen-agents], y que retomaremos en el acto 2.

## La ventana de contexto

El modelo no puede tener en cuenta un texto infinitamente largo. Dispone de una **ventana de contexto**, un número máximo de tokens que puede considerar a la vez. Esta ventana ha crecido mucho en los últimos años, hasta superar el millón de tokens en algunos modelos recientes.

Sin embargo, este crecimiento no resuelve el problema, porque los modelos aprovechan mal la información situada en medio de un contexto largo, un fenómeno conocido como [*lost in the middle*][lost-in-the-middle]. Por tanto, llenar la ventana no basta: lo que cuenta es lo que pones en ella, y dónde. Esta observación motiva por sí sola una buena parte del trabajo sobre el contexto que llevaremos a cabo en el acto 2.

::: info Un matiz sobre los modelos recientes
El *lost in the middle* ya no se cumple del todo en los últimos modelos. En pruebas de recuperación de tipo *needle in a haystack*, los modelos recientes de Anthropic alcanzan una recuperación casi perfecta, [por encima del 99 % ya desde Claude 3 Opus][claude-3-recall], sea cual sea la posición de la información en el contexto. En consecuencia, el fenómeno se atenúa considerablemente para la simple recuperación de un dato; sigue siendo más marcado en cuanto la tarea exige razonar sobre varias informaciones dispersas en el contexto. La lección práctica no cambia: cuidar lo que pones en la ventana, y dónde, sigue siendo rentable.
:::

## Mezcla de expertos

Muchos modelos recientes se basan en una arquitectura denominada **mezcla de expertos** (*Mixture of Experts*, o MoE), de la que Hugging Face ofrece una [presentación ilustrada][hf-moe]. La idea es no activar toda la red en cada token, sino solo una pequeña parte, [elegida dinámicamente][wolfe-moe]. Un modelo puede así presentar un número total de parámetros muy elevado mientras solo activa una fracción de ellos en cada paso.

La consecuencia práctica es que hay que distinguir los parámetros totales de los parámetros activos. Los primeros informan sobre la capacidad del modelo y sobre la memoria necesaria para cargarlo; los segundos, sobre su costo computacional y su velocidad. Dos modelos anunciados con el mismo número de parámetros pueden comportarse de manera muy diferente según esta distinción.

Algunos ejemplos de modelos abiertos, donde la diferencia entre parámetros totales y activos salta a la vista en cuanto se trata de un MoE:

| Año | Modelo                   | Arquitectura | Parámetros totales | Parámetros activos |
| ----- | ------------------------ | ------------ | ----------------- | ----------------- |
| 2025  | Kimi K2 (Moonshot AI)    | MoE          | 1 000 millardos    | 32 millardos       |
| 2024  | DeepSeek-V3              | MoE          | 671 millardos      | 37 millardos       |
| 2025  | Llama 4 Maverick (Meta)  | MoE          | 400 millardos      | 17 millardos       |
| 2025  | Qwen3-235B-A22B          | MoE          | 235 millardos      | 22 millardos       |
| 2026  | Gemma 4 26B A4B (Google) | MoE          | 26 millardos       | 4 millardos        |
| 2026  | Gemma 4 31B (Google)     | Dense        | 31 millardos       | 31 millardos       |
| 2025  | Qwen3-32B                | Dense        | 32 millardos       | 32 millardos       |
| 2025  | Mistral Small 3          | Dense        | 24 millardos       | 24 millardos       |

Sur un modelo denso, las dos columnas son idénticas: toda la red se activa en cada token. En un MoE, la diferencia puede ser considerable: DeepSeek-V3 carga 671 mil millones de parámetros pero solo activa 37 mil millones en cada paso. Se supone ampliamente que los grandes modelos propietarios (GPT, Claude, Gemini) también se basan en MoE, pero su arquitectura no se divulga, así que aquí nos ceñimos a los modelos abiertos.

El nombre del modelo suele dar una primera pista. El sufijo `A<n>B`, por *Active `<n>` Billion*, indica el número de parámetros activos: «Gemma 4 26B A4B» designa 26 mil millones de parámetros en total pero 4 mil millones activos, y «Qwen3-235B-A22B», 235 mil millones por 22 mil millones activos. Un modelo denso nunca lleva este sufijo, ya que activos y totales coinciden. Atención: esta convención no es universal. Kimi K2 o DeepSeek-V3 son MoE sin mostrarlo en su nombre. El reflejo fiable sigue siendo consultar la ficha del modelo, donde se anuncian ambas cifras.

## El nivel de razonamiento

Un modelo puede responder de inmediato, o tomarse el tiempo de «reflexionar» antes de concluir. Desde finales de 2024, una familia de **modelos de razonamiento** ha hecho de esta segunda manera un modo propio: antes de producir su respuesta, el modelo genera una larga cadena de tokens intermedios, una reflexión paso a paso que no se muestra necesariamente al usuario, pero que mejora notablemente los resultados en tareas difíciles (matemáticas, código, planificación, problemas de varios pasos).

Es un cambio de fondo. Hasta entonces, se mejoraba un modelo sobre todo entrenándolo más tiempo con más datos. Aquí se gana calidad dejándole gastar más cálculo *en el momento de responder*, lo que se llama [*test-time compute*][wolfe-reasoning]. El movimiento se encadenó rápido: [OpenAI o1][openai-reasoning] en septiembre de 2024, [DeepSeek-R1][deepseek-r1] en enero de 2025, luego la *reflexión extendida* de Claude 3.7 Sonnet en febrero de 2025. En pocos meses, el razonamiento en inferencia se convirtió en un estándar.

Ese exceso de reflexión tiene un costo: consume muchos tokens y alarga el tiempo de respuesta. Por eso la mayoría de estos modelos permite ajustar el esfuerzo de razonamiento, desde un modo rápido y económico hasta una reflexión profunda. Todo el arte consiste en movilizarlo solo cuando aporta algo. Esto está directamente relacionado con la elección del modelo según el rol, más abajo: un planificador se beneficia de razonar largo tiempo, un ejecutor acotado no lo necesita y resultaría innecesariamente caro.

## La llamada a herramientas

Un modelo que solo produce texto no puede actuar. Para que se convierta en un agente, debe poder desencadenar acciones: leer un archivo, ejecutar un comando, consultar una API. Ese es el rol de la **llamada a herramientas** (*tool calling*). El modelo no realiza la acción por sí mismo; produce una solicitud estructurada, que el harness ejecuta, antes de devolverle el resultado.

Esta capacidad es reciente a escala de la historia de los LLM. Primero se exploró en la investigación, con el paradigma [*ReAct*][react] (razonar y luego actuar) a finales de 2022 y luego [*Toolformer*][toolformer] a principios de 2023, antes de convertirse en una funcionalidad de API en toda regla: OpenAI introdujo el [*function calling*][openai-function-calling] en junio de 2023, y Anthropic abrió la llamada a herramientas en Claude en versión beta a finales de 2023, antes de su [disponibilidad general en mayo de 2024][claude-tool-use-ga]. En menos de dos años, se pasó así del simple modelo de texto al agente capaz de actuar.

Esta capacidad es el prerrequisito de todo lo que sigue. Un harness es precisamente lo que organiza este bucle entre el modelo y las herramientas, y una buena parte de la formación consiste en reconstruir sus mecanismos.

## ¿Dónde encontrar los modelos y su especificidad?

Todas las cifras de la tabla anterior, y muchas otras, se leen en el mismo lugar. Los modelos abiertos se publican hoy en día en el [*Hub* de Hugging Face][hf-hub], una plataforma que aloja a la vez los pesos de los modelos, su documentación y recursos para probarlos. Es el primer reflejo cuando se busca situar un modelo.

Cada modelo dispone en el Hub de una **ficha** (*model card*), un README redactado por el editor. Allí se encuentra lo esencial de lo que nos interesa en este módulo: el tamaño del modelo, su arquitectura (densa o MoE, número de expertos), su ventana de contexto, los idiomas y modalidades admitidos, los resultados en los grandes bancos de pruebas y la licencia de uso.

Para los detalles técnicos que la ficha a veces omite, el archivo `config.json` del modelo proporciona la configuración en bruto: dimensiones internas, número de capas, número de expertos y número de expertos activados para un MoE. Es allí donde se confirma, con las cifras en la mano, la diferencia entre parámetros totales y activos mencionada más arriba.

Por último, el Hub no solo sirve para consultar. Sus filtros permiten explorar los modelos por tarea, por tamaño o por licencia; los rankings comparativos ayudan a orientarse en una oferta que cambia rápido; y las versiones cuantizadas (a menudo en formato GGUF), más ligeras, hacen que algunos modelos puedan ejecutarse en una máquina modesta.

## Elegir un modelo según el rol

Todo esto tiene un propósito práctico. Cuando construyamos agentes, les confiaremos roles distintos, y esos roles no requieren el mismo modelo. Un agente encargado de planificar se beneficia de apoyarse en un modelo sólido, capaz de razonar durante largo tiempo. Un agente que ejecuta una tarea repetitiva y bien delimitada se beneficia, por su parte, de apoyarse en un modelo rápido y económico.

La mejor manera de forjarse una intuición sigue siendo probar. Algunos sitios gratuitos permiten enviar un mismo prompt a dos modelos y comparar sus respuestas lado a lado. El más útil es [LMArena][lmarena] (antes *Chatbot Arena*): su modo *side-by-side* permite elegir los dos modelos a confrontar, sin siquiera crear una cuenta; su modo *battle*, donde dos modelos anónimos responden y se vota, alimenta además un ranking comparativo. [Hugging Face Chat][hf-chat] y [OpenRouter][openrouter] ofrecen el mismo tipo de prueba con un amplio catálogo. No hay nada mejor que volver a ejecutar tu propio prompt en un modelo rápido y en un modelo de razonamiento para sentir, concretamente, qué aporta cada uno y qué cuesta. Es lo que veremos, de hecho, en la primera parte de la formación.

## Referencias

- Andrej Karpathy, [Intro to Large Language Models][karpathy]: un calentamiento de una hora sobre la pregunta «¿qué es un LLM?».
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive]: un curso de 3 h 30 (2025) sobre todo el stack de entrenamiento, para profundizar.
- Lilian Weng, [Prompt Engineering][weng-prompting]: un panorama de las técnicas clásicas de prompting, para leer como una base histórica.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering]: el paso de la optimización de un prompt a la arquitectura del contexto de un agente.
- Chip Huyen, [Agents][huyen-agents]: una guía reciente y neutral sobre los agentes: herramientas, planificación, modos de fallo.
- Liu et al., [Lost in the Middle][lost-in-the-middle]: el artículo que puso en evidencia la mala utilización de la parte central del contexto.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall]: un recall casi perfecto (más del 99 %) en la prueba *needle in a haystack*, independientemente de la posición en el contexto.
- Hugging Face, [Mixture of Experts Explained][hf-moe]: una presentación ilustrada de la mezcla de expertos.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe]: un estudio técnico del enrutamiento y del funcionamiento de las arquitecturas MoE.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning]: cómo o1 y DeepSeek-R1 razonan mediante largas cadenas de pensamiento y el cómputo en la inferencia.
- OpenAI, [Learning to reason with LLMs][openai-reasoning]: la presentación de los modelos de razonamiento (o1) y del *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1]: el artículo que describe un modelo de razonamiento abierto.
- Yao et al., [ReAct][react]: el paradigma «razonar y luego actuar».
- Schick et al., [Toolformer][toolformer]: un modelo que aprende a invocar herramientas.
- OpenAI, [Function calling and other API updates][openai-function-calling]: la introducción de la invocación de herramientas en la API (junio de 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga]: la disponibilidad general de la invocación de herramientas en Claude (mayo de 2024).
- Hugging Face, [el Hub de modelos][hf-hub]: la plataforma donde se publican los modelos abiertos y sus fichas.

## Herramientas

- [LMArena][lmarena]: comparar dos modelos lado a lado con un mismo prompt.
- Hugging Face, [Chat][hf-chat]: probar modelos abiertos en línea.
- [OpenRouter][openrouter]: acceder a un amplio catálogo de modelos a través de una misma interfaz.

[karpathy]: https://www.youtube.com/watch?v=zjkBMFhNj_g
[karpathy-deepdive]: https://www.youtube.com/watch?v=7xTGNNLPyMI
[weng-prompting]: https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/
[context-engineering]: https://www.philschmid.de/context-engineering
[huyen-agents]: https://huyenchip.com/2025/01/07/agents.html
[lost-in-the-middle]: https://arxiv.org/abs/2307.03172
[claude-3-recall]: https://www.anthropic.com/news/claude-3-family
[hf-moe]: https://huggingface.co/blog/moe
[wolfe-moe]: https://cameronrwolfe.substack.com/p/moe-llms
[wolfe-reasoning]: https://cameronrwolfe.substack.com/p/demystifying-reasoning-models
[react]: https://arxiv.org/abs/2210.03629
[toolformer]: https://arxiv.org/abs/2302.04761
[openai-function-calling]: https://openai.com/index/function-calling-and-other-api-updates/
[claude-tool-use-ga]: https://www.anthropic.com/news/tool-use-ga
[hf-hub]: https://huggingface.co/models
[openai-reasoning]: https://openai.com/index/learning-to-reason-with-llms/
[deepseek-r1]: https://arxiv.org/abs/2501.12948
[lmarena]: https://lmarena.ai
[hf-chat]: https://huggingface.co/chat
[openrouter]: https://openrouter.ai
