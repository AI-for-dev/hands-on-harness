# Los LLM en 2026

::: tip Objetivos de este módulo
- Saber situar un modelo: su tamaño, su arquitectura, su ventana de contexto, su nivel de razonamiento, su capacidad para llamar a herramientas
- Entender lo justo necesario del funcionamiento de un LLM para elegir luego el modelo adecuado según el rol que se le confíe
:::

Este módulo forma parte de los prerrequisitos, y lo abordamos como tal. El tema se trata en profundidad en otras partes, a menudo mejor de lo que podríamos hacerlo aquí. Nuestro objetivo no es competir con esos recursos, sino poner a todo el mundo en el mismo nivel para abordar la reconstrucción. Nos mantenemos por tanto voluntariamente a la superficie, y remitimos a lecturas de referencia para quienes deseen profundizar, comenzando por la [introducción de Andrej Karpathy a los grandes modelos de lenguaje][karpathy], una toma de contacto de una hora sobre la cuestión « ¿qué es un LLM? », prolongada por su [inmersión detallada de 2025][karpathy-deepdive] para quien quiera el stack completo del entrenamiento.

## Lo que hace un modelo, en el fondo

Un modelo de lenguaje predice la palabra siguiente. Más precisamente, predice el siguiente *token*, es decir, el siguiente fragmento de texto, a partir de todo lo anterior. El texto que tú le das se divide primero en tokens, y luego el modelo produce un token a la vez, cada uno añadiéndose a la entrada para predecir el siguiente. La capacidad de responder a una pregunta, de escribir código, de razonar emerge de este mecanismo simple aplicado a muy gran escala.

Esta forma de funcionar explica dos cosas que nos servirán a lo largo del curso. Por un lado, el modelo « sabe » solo lo que se encuentra en su entrada o en lo que ha aprendido durante el entrenamiento. Por otro lado, la calidad de lo que pones en la entrada incide directamente en la calidad de lo que sale. Ahí es donde el [« prompt engineering »][weng-prompting] tiene toda su importancia.

El terreno ha cambiado desde las primeras guías. Las técnicas clásicas - ejemplos en contexto, cadena de pensamiento, consistencia por voto - siguen siendo una base útil, pero su peso ha cambiado: los modelos de razonamiento generan ahora la cadena de pensamiento por sí mismos, lo que [hace menos necesario el guiado manual][wolfe-reasoning]; la llamada a herramientas se ha convertido en una función nativa en lugar de un truco de formulación; y la atención se ha desplazado de la optimización de un prompt aislado a la organización de todo el contexto de un agente, lo que se denomina hoy « context engineering ». Este hilo conduce directamente a la [construcción de agentes][huyen-agents], y lo retomaremos en el acto 2.

## La ventana de contexto

El modelo no puede tener en cuenta un texto infinitamente largo. Dispone de una **ventana de contexto**, un número máximo de tokens que puede considerar a la vez. Esta ventana ha crecido mucho estos últimos años, hasta superar el millón de tokens en algunos modelos recientes.

Podría parecer que el problema está resuelto. No lo está. Se sabe desde hace tiempo que los modelos explotan mal la información situada en medio de un contexto largo, un fenómeno descrito bajo el nombre de [*lost in the middle*][lost-in-the-middle]. Es decir, llenar la ventana no basta: lo que importa es lo que se pone en ella, y dónde. Esta observación motiva por sí sola buena parte del trabajo sobre el contexto que llevaremos a cabo en el acto 2.

::: info Matizar sobre los modelos recientes
El *lost in the middle* ya no se verifica completamente en los últimos modelos. En pruebas de recuperación de tipo *needle in a haystack*, los modelos recientes de Anthropic alcanzan un recall casi perfecto, [más del 99 % desde Claude 3 Opus][claude-3-recall], independientemente de la posición de la información en el contexto. El fenómeno se atenúa por tanto fuertemente para la simple recuperación de un hecho; sigue siendo más marcado cuando la tarea requiere razonar sobre varias informaciónes dispersas en el contexto. La lección práctica no cambia: cuidar lo que se pone en la ventana, y dónde, sigue mereciendo la pena.
:::

## Mezcla de expertos

Muchos modelos recientes se basan en una arquitectura denominada **mezcla de expertos** (*Mixture of Experts*, o MoE), cuya [presentación ilustrada][hf-moe] ofrece Hugging Face. La idea es no activar toda la red en cada token, sino solo una pequeña parte, [elegida dinámicamente][wolfe-moe]. Un modelo puede así mostrar un número total de parámetros muy elevado sin activar más que una fracción en cada paso.

La consecuencia práctica es que hay que distinguir los parámetros totales de los parámetros activos. Los primeros informan sobre la capacidad del modelo y sobre la memoria necesaria para cargarlo; los segundos sobre su coste de cálculo y su velocidad. Dos modelos anunciados con el mismo número de parámetros pueden comportarse muy diferentemente según esta distinción.

Algunos ejemplos entre los modelos abiertos, donde la brecha entre parámetros totales y activos salta a la vista cuando se trata de un MoE:

| Año | Modelo                   | Arquitectura | Parámetros totales | Parámetros activos |
| --- | ------------------------ | ------------ | ------------------ | ------------------ |
| 2025 | Kimi K2 (Moonshot AI)    | MoE          | 1 000 Mds          | 32 Mds             |
| 2024 | DeepSeek-V3              | MoE          | 671 Mds            | 37 Mds             |
| 2025 | Llama 4 Maverick (Meta)  | MoE          | 400 Mds            | 17 Mds             |
| 2025 | Qwen3-235B-A22B          | MoE          | 235 Mds            | 22 Mds             |
| 2026 | Gemma 4 26B A4B (Google) | MoE          | 26 Mds             | 4 Mds              |
| 2026 | Gemma 4 31B (Google)     | Denso        | 31 Mds             | 31 Mds             |
| 2025 | Qwen3-32B                | Denso        | 32 Mds             | 32 Mds             |
| 2025 | Mistral Small 3          | Denso        | 24 Mds             | 24 Mds             |

En un modelo denso, las dos columnas son idénticas: toda la red se activa en cada token. En un MoE, la brecha puede ser considerable: DeepSeek-V3 carga 671 mil millones de parámetros pero solo activa 37 en cada paso. Los grandes modelos propietarios (GPT, Claude, Gemini) se asumen ampliamente que se basan también en MoE, pero su arquitectura no se divulga, y por tanto nos limitamos aquí a los modelos abiertos.

El nombre del modelo suele dar una primera pista. El sufijo `A<n>B`, para *Active `<n>` Billion*, anuncia el número de parámetros activos: « Gemma 4 26B A4B » designa 26 mil millones de parámetros en total pero 4 mil millones activos, y « Qwen3-235B-A22B » 235 mil millones para 22 activos. Un modelo denso nunca lleva este sufijo, ya que activos y totales se confunden. Atención no obstante: esta convención no es universal, Kimi K2 o DeepSeek-V3 son bien MoE sin mostrarlo en su nombre. El reflejo fiable sigue siendo verificar la ficha del modelo, donde se anuncian ambas cuentas.

## El nivel de razonamiento

Un modelo puede responder de inmediato, o tardar en « reflexionar » antes de concluir. Desde finales de 2024, una familia de **modelos de razonamiento** ha hecho de esta segunda manera un modo a parte entera: antes de producir su respuesta, el modelo genera una larga cadena de tokens intermedios, una reflexión paso a paso, que no se muestra necesariamente al usuario, pero que mejora notablemente los resultados en tareas difíciles: matemáticas, código, planificación, problemas de varios pasos.

Es un cambio de fondo. Hasta ahora, se mejoraba un modelo sobre todo entrenándolo más tiempo con más datos. Aquí, se gana en calidad dejándolo gastar más cálculo *en el momento de responder*, lo que se denomina [*test-time compute*][wolfe-reasoning]. El movimiento se ha sucedido rápidamente: [OpenAI o1][openai-reasoning] en septiembre de 2024, [DeepSeek-R1][deepseek-r1] en enero de 2025, luego la *reflexión extendida* de Claude 3.7 Sonnet en febrero de 2025. En pocos meses, el razonamiento en inferencia se ha convertido en un estándar.

Este exceso de reflexión tiene un coste: consume muchos tokens y alarga el tiempo de respuesta. Por eso, la mayoría de estos modelos dejan ajustar el esfuerzo de razonamiento, desde un modo rápido y económico hasta una reflexión profunda. Todo el arte consiste en no mobilizarlo más que cuando aporta algo. Esto está directamente ligado a la elección del modelo según el rol, más abajo: un planificador gana en razonar largamente, un ejecutor acotado no lo necesita y costaría innecesariamente caro.

## La llamada a herramientas

Un modelo que solo produce texto no puede actuar. Para que se convierta en un agente, necesita poder desencadenar acciones: leer un archivo, ejecutar un comando, consultar una API. Ese es el rol de la **llamada a herramientas** (*tool calling*). El modelo no realiza la acción él mismo; produce una solicitud estructurada, que el harness ejecuta, antes de devolverle el resultado.

Esta capacidad es reciente en la escala de la historia de los LLM. Se ha explorado primero en la investigación, el paradigma [*ReAct*][react] (razonar luego actuar) a finales de 2022, luego [*Toolformer*][toolformer] a principios de 2023, antes de convertirse en una función de API a parte entera: OpenAI introdujo el [*function calling*][openai-function-calling] en junio de 2023, y Anthropic abrió la llamada a herramientas en Claude en beta a finales de 2023, antes de su [disponibilidad general en mayo de 2024][claude-tool-use-ga]. En menos de dos años, se ha pasado así del simple modelo de texto al agente capaz de actuar.

Esta capacidad es el prerrequisito de todo lo que sigue. Un harness es precisamente lo que organiza este bucle entre el modelo y las herramientas, y una buena parte del curso consiste en reconstruir los mecanismos.

## Dónde encontrar los modelos y su especificidad ?

Todos los números de la tabla anterior, y muchos otros, se leen en el mismo lugar. Los modelos abiertos se publican hoy en el [*Hub* de Hugging Face][hf-hub], una plataforma que aloja tanto los pesos de los modelos, su documentación y algo para probarlos. Es el primer reflejo cuando se busca situar un modelo.

Cada modelo dispone allí de una **ficha** (*model card*), un README redactado por el editor. Se encuentra allí lo esencial de lo que nos interesa en este módulo: el tamaño del modelo, su arquitectura (denso o MoE, número de expertos), su ventana de contexto, los idiomas y modalidades soportados, los resultados en los grandes bancos de pruebas, y la licencia de uso. Este último punto no es un detalle: una licencia permissiva como Apache 2.0 no abre los mismos usos que una licencia « comunitaria » acompañada de restricciones, y hay que leerla antes de prever un despliegue.

Para los detalles técnicos que la ficha a veces pasa por alto, el archivo `config.json` del modelo da la configuración bruta: dimensiones internas, número de capas, número de expertos y número de expertos activados para un MoE. Es allí donde se confirma, números en mano, la brecha entre parámetros totales y activos mencionada más arriba.

Finalmente, el Hub no sirve solo para consultar. Sus filtros permiten explorar los modelos por tarea, por tamaño o por licencia; unos clasificaciones comparativas ayudan a orientarse en una oferta que se mueve rápido; y las versiones cuantificadas (a menudo en formato GGUF), más ligeras, hacen ejecutables ciertos modelos en una máquina modesta. Volvemos sobre ello cuando se trate de hacer funcionar un modelo en local.

## Elegir un modelo según el rol

Todo esto tiene una intención práctica. Cuando construyamos agentes, les confiaremos roles distintos, y estos roles no llaman al mismo modelo. Un agente encargado de planear gana en apoyarse en un modelo sólido, capaz de razonar largamente. Un agente que ejecuta una tarea repetitiva y bien acotada gana, por su parte, en apoyarse en un modelo rápido y económico.

La mejor manera de forjarse una intuición sigue siendo probar. Sitios gratuitos permiten someter un mismo prompt a dos modelos y comparar sus respuestas lado a lado. El más útil es [LMArena][lmarena] (ex-*Chatbot Arena*): su modo *side-by-side* permite elegir los dos modelos a confrontar, incluso sin crear una cuenta; su modo *battle*, donde dos modelos anónimos responden y se vota, alimenta por otra parte un ranking comparativo. [Hugging Face Chat][hf-chat] y [OpenRouter][openrouter] ofrecen el mismo tipo de prueba en un amplio catálogo. Nada sustituye a jugar de nuevo tu propio prompt en un modelo rápido y en un modelo de razonamiento para sentir, concretamente, lo que cada uno aporta y lo que cuesta. Esto es lo que veremos por otra parte en la primera parte del curso.

## Referencias

- Andrej Karpathy, [Intro to Large Language Models][karpathy] - una toma de contacto de una hora sobre la cuestión « ¿qué es un LLM? ».
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive] - una inmersión de 3 h 30 (2025) en todo el stack de entrenamiento, para profundizar.
- Lilian Weng, [Prompt Engineering][weng-prompting] - un panorama de las técnicas clásicas de prompting, para leer como un soco histórico.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering] - el desplazamiento de la optimización de un prompt hacia la arquitectura del contexto de un agente.
- Chip Huyen, [Agents][huyen-agents] - una guía reciente y neutral sobre los agentes: herramientas, planificación, modos de fallo.
- Liu et al., [Lost in the Middle][lost-in-the-middle] - el artículo que ha puesto en evidencia la mala explotación del medio del contexto.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall] - un recall casi perfecto (más del 99 %) en la prueba *needle in a haystack*, independientemente de la posición en el contexto.
- Hugging Face, [Mixture of Experts Explained][hf-moe] - una presentación ilustrada de la mezcla de expertos.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe] - una inmersión técnica en el enrutamiento y el funcionamiento de las arquitecturas MoE.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning] - cómo o1 y DeepSeek-R1 razonan mediante largas cadenas de pensamiento y el cálculo en inferencia.
- OpenAI, [Learning to reason with LLMs][openai-reasoning] - la presentación de los modelos de razonamiento (o1) y del *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1] - el artículo describiendo un modelo de razonamiento abierto.
- Yao et al., [ReAct][react] - el paradigma « razonar luego actuar ».
- Schick et al., [Toolformer][toolformer] - un modelo que aprende a llamar a herramientas.
- OpenAI, [Function calling and other API updates][openai-function-calling] - la introducción de la llamada a herramientas en la API (junio de 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga] - la disponibilidad general de la llamada a herramientas en Claude (mayo de 2024).
- Hugging Face, [el Hub de los modelos][hf-hub] - la plataforma donde se publican los modelos abiertos y sus fichas.

## Herramientas

- [LMArena][lmarena] - comparar dos modelos lado a lado en un mismo prompt.
- Hugging Face, [Chat][hf-chat] - probar modelos abiertos en línea.
- [OpenRouter][openrouter] - acceder a un amplio catálogo de modelos a través de una misma interfaz.

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