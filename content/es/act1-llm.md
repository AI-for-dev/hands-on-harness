# Los LLM en 2026

::: tip Objetivos de este módulo
- Saber situar un modelo: su tamaño, su arquitectura, su ventana de contexto, su nivel de razonamiento, su capacidad para llamar a herramientas
- Comprender lo suficiente sobre el funcionamiento de un LLM para elegir más adelante el modelo adecuado según el rol que se le asigne
:::

Este módulo forma parte de los requisitos previos, y lo abordamos como tal. El tema se trata en profundidad en otros lugares, a menudo mejor de lo que nosotros podríamos hacerlo aquí. Nuestro objetivo no es competir con esos recursos, sino poner a todo el mundo al mismo nivel para encarar la reconstrucción. Por lo tanto, nos mantenemos deliberadamente en la superficie, y remitimos a lecturas de referencia para quienes deseen profundizar, empezando por la [introducción de Andrej Karpathy a los grandes modelos de lenguaje][karpathy], un calentamiento de una hora sobre la pregunta «qué es un LLM», seguido de su [curso detallado de 2025][karpathy-deepdive] para quien quiera todo el stack de entrenamiento.

## Lo que hace un modelo, en el fondo

Un modelo de lenguaje predice la siguiente palabra. Más precisamente, predice el siguiente *token*, es decir, el siguiente fragmento de texto, basándose en todo lo anterior. El texto que le das primero se divide en tokens, luego el modelo produce un token a la vez, y cada uno se añade a la entrada para predecir el siguiente. La capacidad de responder a una pregunta, escribir código o razonar emerge de este mecanismo simple aplicado a muy gran escala.

Esta forma de funcionar explica dos cosas que nos servirán durante toda la formación. Por un lado, el modelo solo «sabe» lo que se encuentra en su entrada o lo que ha aprendido durante el entrenamiento. Por otro lado, la calidad de lo que pongas en la entrada influye directamente en la calidad de lo que sale. Aquí es donde el [«prompt engineering»][weng-prompting] cobra toda su importancia.

Sin embargo, el terreno ha cambiado desde las primeras guías. Las técnicas clásicas (ejemplos en contexto, cadena de pensamiento, coherencia por votación) siguen siendo una base útil, pero su peso ha cambiado: los modelos de razonamiento ahora producen la cadena de pensamiento por sí mismos, lo que [hace que el guiado manual sea menos necesario][wolfe-reasoning]; la llamada a herramientas se ha convertido en una funcionalidad nativa en lugar de un truco de formulación; y la atención se ha desplazado de la optimización de un prompt aislado hacia la organización de todo el contexto de un agente, lo que hoy llamamos [« context engineering »][context-engineering]. Es un hilo que lleva directo a la [construcción de agentes][huyen-agents], y que retomaremos en el acto 2.

## La ventana de contexto

El modelo no puede tener en cuenta un texto infinitamente largo. Dispone de una **ventana de contexto**, un número máximo de tokens que puede considerar a la vez. Esta ventana ha crecido mucho en los últimos años, llegando a superar el millón de tokens en algunos modelos recientes.

Sin embargo, este crecimiento no soluciona el problema, ya que los modelos aprovechan mal la información situada en medio de un contexto largo, un fenómeno descrito como [*lost in the middle*][lost-in-the-middle]. Por lo tanto, llenar la ventana no es suficiente: lo que importa es qué ponemos en ella y dónde. Esta observación motiva por sí sola gran parte del trabajo sobre el contexto que realizaremos en el acto 2.

::: info Matiz sobre los modelos recientes
El *lost in the middle* ya no se cumple totalmente en los últimos modelos. En pruebas de recuperación tipo *needle in a haystack*, los modelos recientes de Anthropic logran un recall casi perfecto, [más del 99 % desde Claude 3 Opus][claude-3-recall], independientemente de la posición de la información en el contexto. Por lo tanto, el fenómeno se atenúa considerablemente para la simple recuperación de un dato; sigue siendo más marcado cuando la tarea requiere razonar sobre varias informaciones dispersas en el contexto. La lección práctica no cambia: cuidar qué ponemos en la ventana, y dónde, sigue siendo rentable.
:::

## Mezcla de expertos

Muchos modelos recientes se basan en una arquitectura llamada **mezcla de expertos** (*Mixture of Experts*, o MoE), de la cual Hugging Face ofrece una [presentación ilustrada][hf-moe]. La idea es no activar toda la red en cada token, sino solo una pequeña parte, [elegida dinámicamente][wolfe-moe]. Así, un modelo puede mostrar un número total de parámetros muy elevado activando solo una fracción en cada paso.

La consecuencia práctica es que hay que distinguir los parámetros totales de los parámetros activos. Los primeros informan sobre la capacidad del modelo y sobre la memoria necesaria para cargarlo; los segundos sobre su coste de cómputo y su velocidad. Dos modelos anunciados con el mismo número de parámetros pueden comportarse de manera muy diferente según esta distinción.

Algunos ejemplos entre los modelos abiertos, donde la diferencia entre parámetros totales y activos es evidente cuando se trata de un MoE:

| Año | Modelo | Arquitectura | Parámetros totales | Parámetros activos |
| ----- | ------------------------ | ------------ | ----------------- | ----------------- |
| 2025 | Kimi K2 (Moonshot AI) | MoE | 1 000 Mds | 32 Mds |
| 2024 | DeepSeek-V3 | MoE | 671 Mds | 37 Mds |
| 2025 | Llama 4 Maverick (Meta) | MoE | 400 Mds | 17 Mds |
| 2025 | Qwen3-235B-A22B | MoE | 235 Mds | 22 Mds |
| 2026 | Gemma 4 26B A4B (Google) | MoE | 26 Mds | 4 Mds |
| 2026 | Gemma 4 31B (Google) | Dense | 31 Mds | 31 Mds |
| 2025 | Qwen3-32B | Dense | 32 Mds | 32 Mds |
| 2025 | Mistral Small 3 | Dense | 24 Mds | 24 Mds |

En un modelo denso, las dos columnas son idénticas: toda la red se activa en cada token. En un MoE, la diferencia puede ser considerable: DeepSeek-V3 carga 671 mil millones de parámetros pero solo activa 37 en cada paso. Se supone ampliamente que los grandes modelos propietarios (GPT, Claude, Gemini) también se basan en MoE, pero su arquitectura no es pública, por lo que aquí nos ceñimos a los modelos abiertos.

El nombre del modelo suele dar una primera pista. El sufijo `A<n>B`, por *Active `<n>` Billion*, anuncia el número de parámetros activos: « Gemma 4 26B A4B » indica 26 mil millones de parámetros en total pero 4 mil millones activos, y « Qwen3-235B-A22B » 235 mil millones frente a 22 activos. Un modelo denso nunca lleva este sufijo, ya que los activos y los totales coinciden. Sin embargo, ten cuidado: esta convención no es universal; Kimi K2 o DeepSeek-V3 son MoE aunque no lo muestren en su nombre. La opción más fiable sigue siendo revisar la ficha del modelo, donde se anuncian ambas cifras.

## El nivel de razonamiento

Un modelo puede responder al instante o tomarse el tiempo de «reflexionar» antes de concluir. Desde finales de 2024, una familia de **modelos de razonamiento** ha convertido esta segunda forma en un modo propio: antes de producir su respuesta, el modelo genera una larga cadena de tokens intermedios, una reflexión paso a paso que no necesariamente se muestra al usuario, pero que mejora notablemente los resultados en tareas difíciles (matemáticas, código, planificación, problemas de varios pasos).

Es un cambio fundamental. Hasta entonces, un modelo se mejoraba principalmente entrenándolo durante más tiempo con más datos. Aquí, se gana calidad permitiéndole invertir más cómputo *en el momento de responder*, lo que se llama [*test-time compute*][wolfe-reasoning]. El movimiento fue rápido: [OpenAI o1][openai-reasoning] en septiembre de 2024, [DeepSeek-R1][deepseek-r1] en enero de 2025 y, después, la *reflexión extendida* de Claude 3.7 Sonnet en febrero de 2025. En pocos meses, el razonamiento en la inferencia se ha convertido en un estándar.

Este exceso de reflexión tiene un coste: consume muchos tokens y prolonga el tiempo de respuesta. Por ello, la mayoría de estos modelos permiten ajustar el esfuerzo de razonamiento, desde un modo rápido y económico hasta una reflexión profunda. El arte consiste en activarlo solo cuando aporta valor. Esto está directamente relacionado con la elección del modelo según el rol, más abajo: un planificador se beneficia de razonar extensamente, mientras que un ejecutor estructurado no lo necesita y resultaría innecesariamente caro.

## La llamada a herramientas

Un modelo que solo produce texto no puede actuar. Para que se convierta en un agente, debe poder activar acciones: leer un archivo, ejecutar un comando, consultar una API. Este es el papel de la **llamada a herramientas** (*tool calling*). El modelo no realiza la acción por sí mismo; genera una solicitud estructurada que el harness ejecuta antes de devolverle el resultado.

Esta capacidad es reciente en la historia de los LLM. Primero se exploró desde la investigación, con el paradigma [*ReAct*][react] (razonar y luego actuar) a finales de 2022 y luego [*Toolformer*][toolformer] a principios de 2023, antes de convertirse en una funcionalidad de API completa: OpenAI introdujo el [*function calling*][openai-function-calling] en junio de 2023, y Anthropic abrió el uso de herramientas en Claude en beta a finales de 2023, antes de su [disponibilidad general en mayo de 2024][claude-tool-use-ga]. En menos de dos años, así hemos pasado del simple modelo de texto al agente capaz de actuar.

Esta capacidad es el requisito previo de todo lo que sigue. Un harness es precisamente lo que organiza este bucle entre el modelo y las herramientas, y una buena parte de la formación consiste en reconstruir sus mecanismos.

## ¿Dónde encontrar los modelos y su especificidad?

Todas las cifras de la tabla anterior, y muchas otras, se encuentran en el mismo lugar. Los modelos abiertos se publican hoy en el [*Hub* de Hugging Face][hf-hub], una plataforma que aloja tanto los pesos de los modelos como su documentación y los medios para probarlos. Es la primera reacción cuando se busca situar un modelo.

Cada modelo dispone allí de una **ficha** (*model card*), un README redactado por el editor. Allí encontramos lo esencial que nos interesa en este módulo: el tamaño del modelo, su arquitectura (dense o MoE, número de expertos), su ventana de contexto, los idiomas y modalidades compatibles, los resultados en los grandes bancos de pruebas y la licencia de uso. La licencia debe leerse antes de plantear un despliegue, ya que una licencia permisiva como Apache 2.0 no permite los mismos usos que una licencia «comunitaria» con restricciones.

Para los detalles técnicos que la ficha a veces omite, el archivo `config.json` del modelo proporciona la configuración bruta: dimensiones internas, número de capas, número de expertos y número de expertos activos para un MoE. Aquí es donde se confirma, con cifras en la mano, la diferencia entre parámetros totales y activos mencionada anteriormente.

Por último, el Hub no sirve solo para consultar. Sus filtros permiten explorar los modelos por tarea, tamaño o licencia; las clasificaciones comparativas ayudan a orientarse en una oferta que evoluciona rápido; y las versiones cuantizadas (a menudo en formato GGUF), más ligeras, hacen que algunos modelos sean ejecutables en una máquina modesta. Volveremos a esto cuando se trate de ejecutar un modelo en local.

## Elegir un modelo según el rol

Todo esto tiene un objetivo práctico. Cuando construyamos agentes, les asignaremos roles distintos, y estos roles no requieren el mismo modelo. Un agente encargado de planificar se beneficia de apoyarse en un modelo sólido, capaz de razonar extensamente. Un agente que ejecuta una tarea repetitiva y bien definida se beneficia, por su parte, de apoyarse en un modelo rápido y económico.

La mejor manera de desarrollar una intuición sigue siendo probar. Existen sitios gratuitos que permiten enviar un mismo prompt a dos modelos y comparar sus respuestas lado a lado. El más útil es [LMArena][lmarena] (ex-*Chatbot Arena*): su modo *side-by-side* permite elegir los dos modelos a confrontar, sin necesidad de crear una cuenta; su modo *battle*, donde dos modelos anónimos responden y tú votas, alimenta además un ranking comparativo. [Hugging Face Chat][hf-chat] y [OpenRouter][openrouter] ofrecen el mismo tipo de prueba en un catálogo amplio. Nada supera al hecho de probar tu propio prompt en un modelo rápido y en un modelo de razonamiento para sentir, concretamente, qué aporta cada uno y cuánto cuesta. Esto es lo que veremos, por cierto, en la primera parte de la formación.

## Referencias

- Andrej Karpathy, [Intro to Large Language Models][karpathy]: una introducción de una hora sobre la pregunta «qué es un LLM».
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive]: un curso de 3 h 30 (2025) sobre todo el stack de entrenamiento, para profundizar.
- Lilian Weng, [Prompt Engineering][weng-prompting]: un panorama de las técnicas clásicas de prompting, para leer como una base histórica.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering]: el desplazamiento de la optimización de un prompt hacia la arquitectura del contexto de un agente.
- Chip Huyen, [Agents][huyen-agents]: una guía reciente y neutra sobre los agentes: herramientas, planificación, modos de fallo.
- Liu et al., [Lost in the Middle][lost-in-the-middle]: el artículo que puso en evidencia la mala explotación de la parte central del contexto.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall]: una recuperación casi perfecta (más del 99 %) en la prueba *needle in a haystack*, independientemente de la posición en el contexto.
- Hugging Face, [Mixture of Experts Explained][hf-moe]: una presentación ilustrada de la mezcla de expertos.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe]: un estudio técnico del enrutamiento y el funcionamiento de las arquitecturas MoE.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning]: cómo o1 y DeepSeek-R1 razonan mediante largas cadenas de pensamiento y el cálculo en la inferencia.
- OpenAI, [Learning to reason with LLMs][openai-reasoning]: la presentación de los modelos de razonamiento (o1) y del *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1]: el artículo que describe un modelo de razonamiento abierto.
- Yao et al., [ReAct][react]: el paradigma «razonar y luego actuar».
- Schick et al., [Toolformer][toolformer]: un modelo que aprende a llamar a herramientas.
- OpenAI, [Function calling and other API updates][openai-function-calling]: la introducción de la llamada a herramientas en la API (junio de 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga]: la disponibilidad general de la llamada a herramientas en Claude (mayo de 2024).
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
