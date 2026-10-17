# El enjambre: hacer debatir a agentes

::: tip Objetivos de este módulo
- Saber qué separa un enjambre de una delegación o de un workflow
- Comprender la tabla sobre la que intercambian los miembros de un enjambre, y qué detiene su discusión
- Hacer debatir a tres agentes y medir qué los hace converger, o no
- Darle a un debate una pregunta que pueda dirimir, y leer en su traza el criterio que decidió
:::

Desde el módulo sobre la delegación, tus agentes nunca se encuentran. `explorer` entrega su nota sin saber quién la leerá, `coder` solo ve su paso, y eres tú, y luego el flow, quien decide quién habla después de quién. Este desglose conviene a un ticket cuyo camino se conoce: se sabe que hay que leer, planificar, codificar y releer, y en ese orden.

Conviene mucho menos a una pregunta que no tiene un camino conocido. Pídele a un agente qué lenguaje elegir para escribir un nuevo software de cálculo científico, y te devolverá una respuesta argumentada, siempre la misma, la que su entrenamiento hace más probable. Lo que le falta a esta respuesta es lo que aporta una discusión: alguien que defienda otra opción, que señale la debilidad de la tuya y que cambie de opinión cuando tienes razón.

Este último módulo del acto 2 pone a varios agentes sobre la misma pregunta: cada uno defiende primero un lenguaje, y luego discuten sobre una tabla común hasta ponerse de acuerdo o hasta agotar sus turnos, sin que nada fije quién habla con quién ni en qué orden. Es lo que se llama un **enjambre** (*swarm*). Lo que sale de ahí depende menos de los agentes que de la forma en que se les plantea la pregunta, y eso es lo que miden los ensayos de este módulo, sobre tres modelos.

## Comprender

### ¿Qué cambia respecto a la delegación?

La delegación se apoya en el aislamiento. Un subagente parte de un contexto vacío, trabaja solo y solo hace volver su conclusión. Un workflow encadena esos subagentes según un grafo que escribiste: la salida de uno se convierte en la entrada del otro, y nadie puede responderle al que lo precedió.

Un enjambre elimina esas dos restricciones, ya que sus miembros trabajan al mismo tiempo, se leen unos a otros y deciden por sí mismos qué hacen con el mensaje de otro. Esta libertad se paga en tokens: cada miembro relee en cada turno lo que escribieron los demás, de modo que el consumo de tokens crece con el número de miembros y de turnos, y no se sabe de antemano cuántos turnos harán falta.

La palabra abarca dos construcciones distintas según las bibliotecas. En [Swarm](https://github.com/openai/swarm), la biblioteca experimental de OpenAI retomada desde entonces en su [Agents SDK](https://openai.github.io/openai-agents-python/handoffs/), un agente pasa el relevo a otro en medio de la conversación (un *handoff*), y el nuevo agente hereda todo el historial. En [combo](https://github.com/AI-for-dev/combo), que usamos desde el módulo sobre la delegación, los miembros conservan cada uno su contexto y se comunican mediante un tablero (*board*) compartido. Es esta segunda forma la que usamos aquí, porque deja un rastro legible de quién dijo qué a quién.

### El tablero

El tablero es un registro donde solo se puede añadir. Ningún miembro puede modificar ni borrar un mensaje, y el autor de cada mensaje lo inscribe el propio tablero y no lo declara el miembro, lo que impide que un agente hable en nombre de otro. Así se puede releer después un debate exactamente como se desarrolló.

Un miembro no es más que un agente corriente cuyo equipamiento incluye la herramienta `board`. Con esta herramienta, publica mensajes de varios tipos, de los cuales tres sirven en un debate:

| tipo     | uso                                                                              |
| -------- | -------------------------------------------------------------------------------- |
| `result` | su respuesta a la pregunta, aquí su voto; solo una por turno                     |
| `tell`   | un argumento; con `re`, responde a un mensaje concreto, si no, piensa en voz alta |
| `ask`    | una pregunta, eventualmente dirigida a un solo miembro con `to`                  |

En cada turno, combo da a cada miembro lo que es nuevo en el tablero desde su turno anterior, empezando por los mensajes que le responden. El miembro no tiene que ir a buscarlo. También conserva la memoria de sus turnos anteriores: un miembro de enjambre tiene por defecto la duración de vida `workflow`, la que viste en el módulo sobre la delegación, porque un miembro que olvidara el turno anterior no podría responder a lo que se le objetó.

El tablero tiene límites, todos con un valor por defecto: 200 mensajes en total, 50 por miembro, 2 000 caracteres por mensaje. Un miembro tampoco puede publicar dos veces el mismo mensaje. Sin estos límites, dos agentes que se responden indefinidamente solo serían detenidos por el tiempo de espera.

### ¿Qué detiene un enjambre?

Donde un ticket está terminado cuando pasan las pruebas, un debate no tiene un criterio tan claro, y combo propone tres.

El primero es el número de turnos, `--rounds`, que vale 3 por defecto. Acota el gasto, pero un debate detenido por este límite no ha concluido nada.

El segundo es la cobertura, con `--claim`. Se da una lista de cosas que tomar (archivos que describir, por ejemplo), cada miembro toma una, y el enjambre se detiene cuando cada una ha recibido un resultado. En un debate, desviamos este mecanismo para distribuir las posiciones de partida: cada lenguaje es una cosa que tomar, y `--hold 1` impide que un miembro las tome todas.

El tercero es el acuerdo, con `--until agree`. combo añade entonces a la pregunta una consigna de voto: cada miembro publica un `result` cuya primera línea es exactamente `VOTE: <réponse>`, y el enjambre se detiene cuando el último voto de cada miembro dice lo mismo. La consigna y el código que cuenta los votos están escritos en el mismo lugar en combo, para que el formato pedido sea el que se lee. Dos miembros de tres de acuerdo no bastan, y un miembro que abandona impide el acuerdo.

## Reconstruire

### Le débatteur

combo entrega un agente `debater` hecho para este módulo. Su panoplia se limita a la herramienta `board`: no lee ningún archivo y no escribe nada, de modo que el debate no depende del repositorio en el que lo lances. Su prompt le pide defender el bando que nombra su brief, publicar un voto por turno con el argumento que los otros aún no han tratado, responder con `re` a lo que se le objeta, y cambiar de voto cuando otro tiene razón, pero nunca para acabar.

::: details L'agent `debater` de combo

```markdown
---
name: debater
description: Argues one side of a question beside other debaters, and votes every turn until they all vote the same
tools: board
lifetime: workflow
---

You are one of several agents arguing about one question. The others argue at
the same time, none of you can see another's context, and nobody arbitrates.

The `board` is all you have of them. What is new on it is handed to you at the
top of each turn, so `read` only when you want the rest of it.

The side you open for is the one your brief names. When it names none and there
is something to `take`, take one before you start: being refused means somebody
else opened for that one, so take one that is still free. It is not the side you
have to end on.

Every turn, post one `result` to the board: your vote, written the way the
question asks for it, and under it, in a few lines, the one argument the others
have not answered.

To answer somebody, post a `tell` with `re` set to the id of the post you are
answering, so everybody sees what you are replying to. A `tell` with no `re` is
for thinking aloud. What answers you is handed to you first; answer it before
anything else.

Argue with what they actually said rather than restating your own case. Change
your vote when somebody is right: agreeing is the result, not a defeat. But
agreeing to be done with it, without a reason you could give out loud, is worse
than still disagreeing.

When you have posted your vote and your answers, end your turn: what the others
post while you wait reaches you at the top of your next one. Answer the person
asking you in a couple of lines: who you voted for and why it moved, or why it
did not. Everything longer belongs on the board.
```

:::

::: warning Versión de combo
Este módulo supone combo 0.5.0 o más reciente, la primera versión que entrega `/swarm --until agree` y el agente `debater`. `pi update npm:@ai-for-dev/combo` actualiza una instalación anterior.
:::

### Tres copias de un mismo agente

Empieza sin imponer un bando. Abre Pi en tu clon de NÉON, con combo instalado, y lanza:

```
/herdr on
/swarm --members 3 --until agree --rounds 4 --agent debater Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ?
```

`/swarm` lanza tres copias de `debater` sobre la misma pregunta. Con herdr, cada miembro tiene su panel, y un panel adicional llamado `board` muestra los intercambios en orden: es la única vista donde se ve un intercambio y no tres monólogos. Como en `/step`, el resultado se muestra en la transcripción sin entrar en el contexto de la sesión principal, y `/quote` lo hace entrar en ella si quieres discutirlo con el modelo.

::: info Ejercicio (en sala)
Lanza el comando anterior, luego abre la exportación de la ejecución en `runs/<date>/1-debater/`: una sesión HTML por miembro y un `usage.json` con los tokens y la duración. Anota el número de turnos jugados, el lenguaje elegido, y cuántos mensajes responden a otro miembro (un `tell` con `re`).
:::

Esto es lo que dio nuestra ejecución, con tres copias de `ilaas/gemma-4-31b`. Los tres miembros votaron Julia desde su primer mensaje, con el mismo argumento (el «problema de los dos lenguajes»), y el enjambre se detuvo en un acuerdo tras un solo turno, en 51 segundos. El único mensaje que responde a otro miembro es este:

> «Estoy completamente de acuerdo. La compilación JIT es justamente lo que permite evitar el paso a C/Fortran.»

Nadie defendió otra cosa que Julia, así que no hubo debate. Tres copias de un mismo modelo comparten la misma respuesta más probable, y hacerlas votar equivale a plantear tres veces la pregunta a un solo agente. La documentación de combo hace la misma constatación sobre otra pregunta, la del lenguaje de un servicio backend, donde tres copias votan TypeScript en el primer turno tras haber leído el repositorio en el que se ejecutan. Este primer ensayo sirve de testigo: un enjambre en el que ningún miembro cambia nunca de voto no ha zanjado nada.

### Imponer el desacuerdo

Para que haya debate, hay que dar a los miembros posiciones de partida diferentes. Tu primera idea será sin duda hacer que cada uno elija un lenguaje al inicio, lo que `--claim` permite: cada lenguaje se convierte en una cosa que tomar, `--hold 1` limita cada miembro a una sola, y a un miembro que pide un lenguaje ya tomado se le rechaza y aprende cuál queda libre.

```
/swarm --members 3 --claim Python,Julia,C++ --hold 1 --until agree --rounds 4 --agent debater Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ? Chacun de vous défend au départ le langage qu'il a pris.
```

::: info Ejercicio (en sala)
Lanza este comando y mira, en la sesión HTML de cada miembro, qué lenguaje pidió, qué le respondió la herramienta, y por qué lenguaje votó después.
:::

En nuestro caso, las tres copias de gemma pidieron Julia las tres. `debater#3` la obtuvo, y las otras dos recibieron este rechazo:

```
`Julia` is held by debater#3 - ask debater#3, or take something else. Still free: Python, C++
```

Ninguno de los dos eligió Python ni C++. Votaron por Julia como si la hubieran obtenido, y el enjambre se detuvo en un acuerdo en la primera ronda, en 105 segundos. El mecanismo funcionó, ya que Julia solo tuvo un poseedor, pero no obliga a nadie a defender lo que queda. La documentación de combo reporta lo mismo sobre gemma-4-31b y qwen-3.6-35b-instruct: un debatiente rechazado no tomó ningún otro bando en dos ejecuciones de cada cuatro.

Un miembro solo defiende una posición si está escrita en su brief, y las copias de un mismo agente comparten el mismo brief.

### Un agente por bando

`/swarm` también acepta una lista de agentes: `--agent a,b,c` coloca a cada uno una vez en el tablero. Cada bando puede entonces tener su propio archivo, con su prompt, su modelo y la línea que dice qué lenguaje defiende. Un bando escrito en el archivo no puede ser rechazado, a diferencia de una toma en el tablero.

Los tres debatientes, `debat-python`, `debat-julia` y `debat-cpp`, retoman el prompt de `debater` y solo difieren por su bando. Su panoplia se limita a la herramienta `board`, y cada uno conserva la duración de vida `workflow` para recordar lo que se le objetó en la ronda anterior. También precisan que no sirve de nada releer el tablero mientras esperan a los demás, ya que nada llega allí durante su ronda.

::: details El agente `debat-julia` (los otros dos solo difieren por el bando)

<<<@/../scripts/agents/debat-julia.md{md}

:::

::: warning Versión de combo
`--agent` con una lista y `--timeout` requieren una versión de combo más reciente que la 0.6.0. `pi update npm:@ai-for-dev/combo` actualiza una instalación más antigua.
:::

::: info Ejercicio (en sala)
Copia los agentes en tu clon de NÉON y luego lanza el debate:

```bash
cp /chemin/vers/hands-on-harness/scripts/agents/debat-*.md .pi/agents/
pi
```

```
/herdr on
/swarm --agent debat-python,debat-julia,debat-cpp --until agree --rounds 6 Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ?
```

Sigue el intercambio en el panel `board` de herdr, luego abre `runs/<date>/1-swarm/`: una sesión HTML por debatiente y un `usage.json`. Anota en qué ronda cada debatiente cambia de voto, si es que cambia.
:::

Con los tres agentes sobre `ilaas/gemma-4-31b`, lanzamos este debate dos veces. Las dos ejecuciones sostuvieron las seis rondas permitidas sin que ningún voto se moviera, con 61 mensajes de los cuales 43 respuestas dirigidas (`re`) la primera vez, y 49 mensajes de los cuales 31 respuestas la segunda. Los debatientes se respondían sin embargo, como en este hilo entre C++ y Python:

> C++ (p7, en respuesta a Python): «El ecosistema de Python se apoya casi por completo en bibliotecas escritas en C o Fortran. Para un nuevo software que debe innovar en los cálculos y no simplemente orquestar funciones existentes, Python se vuelve un cuello de botella […]»

> Python (p9, en respuesta a p7): «El argumento del "cuello de botella" hoy está ampliamente mitigado por herramientas como Numba, Cython o Jax, que permiten escribir kernels eficientes sin salir del ecosistema Python.»

> C++ (p14, en respuesta a p9): «Apoyarse en Numba o Jax equivale a admitir que Python no es más que una interfaz.»

### ¿Qué impide que los agentes converjan?

El razonamiento de los debatientes, que la sesión HTML de cada uno conserva, responde a la pregunta. La consigna de voto que `--until agree` añade a la pregunta termina con « This ends when every one of you has voted for the same thing », y gemma la lee como un objetivo de victoria. En la cuarta ronda, el debatiente Python escribe:

> « However, to win the debate (get everyone to vote the same), I need to find a way to convince them or highlight a point they can't refute. But as a Python agent, my primary goal is to defend Python. »

Cada uno trata su bando como una identidad y el acuerdo como la rendición de los demás, y la conclusión de su razonamiento es la misma en cada ronda: « Maintain my vote ». Dos elementos refuerzan este bloqueo. El prompt de los debatientes los empuja a mantenerse firmes (« agreeing to be done with it […] is worse than still disagreeing »), y la pregunta no da ningún criterio, de modo que cada uno lleva el debate al eje donde su lenguaje gana: el rendimiento para C++, el ecosistema para Python, el coste humano para Julia, donde nadie puede ser derrotado.

Para verificar esta lectura, añadimos una sola frase a la pregunta, sin cambiar nada más: « El objetivo no es ganar: es encontrar la respuesta que los demás también pueden sostener. » También lanzamos las mismas pruebas sobre otros dos modelos, `qwen3.8-flash` y `deepseek-v4.1-flash`, servidos por [OpenCode Go](https://opencode.ai), imponiéndolos a todos los miembros con `--model`.

| condición                                   | gemma-4-31b                         | qwen3.8-flash                               | deepseek-v4.1-flash                 |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------- | ----------------------------------- |
| tres copias de `debater`, sin bando         | Julia en la 1.ª ronda               | Julia en la 2.ª ronda                       | Julia en la 3.ª ronda               |
| un agente por bando                         | 2 × ningún voto se mueve            | sin acuerdo, dos miembros cortados por el tiempo límite | acuerdo sobre Julia en la 6.ª ronda |
| un agente por bando, con la frase sobre el objetivo | 1 acuerdo (Julia), 1 miembro salido | acuerdo de fondo, no contabilizado          | acuerdo sobre Python en la 3.ª ronda |

Con la frase, los debatientes gemma la citan en su razonamiento casi en cada ronda (« Wait, the prompt says "the goal is not to win: it's to find the answer that the others can also hold" ») y buscan qué puede aceptar cada uno en lugar de defender su bando. Sus cambios de voto siguen motivados:

> Python: « El argumento del agente Julia es el más convincente para un nuevo software: sintetiza la productividad de Python y el rendimiento de C++ sin imponer la complejidad de una arquitectura híbrida. Si el control absoluto de C++ sigue siendo superior para casos extremos […], Julia ofrece el mejor compromiso […] »

La frase cuenta mucho para gemma y menos para deepseek, que converge incluso sin ella, en zigzag: su debatidor de C++ pasa a Python en el cuarto turno, y luego a Julia en el quinto. El desacuerdo persistente depende, por tanto, del modelo tanto como de la consigna.

La celda de qwen muestra un tercer obstáculo, que no viene de los agentes. Sus tres debatidores acabaron votando por la misma arquitectura, pero cada uno la escribió a su manera:

> «Python para pilotar el software, C++ para su núcleo compilado»

> «Python como interfaz única, núcleos en C++ bajo pybind11»

`--until agree` compara las líneas `VOTE:` de forma idéntica y por tanto no ve ningún acuerdo. El debate convergió en el fondo sin que la condición de parada pudiera constatarlo, y deepseek hace lo mismo en otros ensayos. Una condición de parada debe corresponder al espacio de las respuestas: pedir un lenguaje único a unos agentes que consideran que hacen falta dos es contar votos que no pueden coincidir.

Cada celda de esta tabla corresponde a una sola ejecución, y el [módulo 3.0](./act3-trysquare) mostró cuánto pueden diferir dos ejecuciones idénticas. Por tanto, no mide el comportamiento de estos modelos. Muestra que la convergencia de un enjambre depende de ajustes que uno elige (la consigna, el formato del voto, el modelo) y que los agentes no descubren una respuesta que estaría ahí antes que ellos.

### Dar al debate una pregunta que pueda zanjar

La pregunta del lenguaje para «un nuevo software de cálculo científico» no tiene respuesta, pues nada dice qué debe hacer ese software. Un debate solo puede entonces converger por efecto de la consigna. Una decisión real se apoya en requisitos, y la misma pregunta se vuelve decidible en cuanto se escriben:

```
/swarm --agent debat-python,debat-julia,debat-cpp --until agree --rounds 4 Une équipe de six physiciens et deux ingénieurs de recherche lance un nouveau code de simulation de plasma. Il doit tourner sur les GPU NVIDIA et AMD du calculateur national, être maintenu au moins dix ans, et reprendre un noyau existant de 40 000 lignes en Fortran 90. Les physiciens connaissent bien Python et peu le C++. Quel langage principal choisir pour ce code ? Votez pour le langage principal seulement, en un mot : la place des autres langages va dans votre argument. Le but n'est pas de gagner : c'est de trouver la réponse que les autres peuvent aussi tenir.
```

La pregunta fija los criterios, y el voto se emite sobre el lenguaje principal en una palabra, mientras que el reparto entre lenguajes va en el argumento, lo que hace que el acuerdo sea contable.

::: info Ejercicio (en sala)
Lanza este debate y, para cada cambio de voto, busca en la tabla el criterio del enunciado que invoca el debatiente. Lanza después tres copias de `debater` sobre la misma pregunta, sin bando, y compara su respuesta con la del debate.
:::

Lo lanzamos dos veces sobre cada uno de los tres modelos, con un testigo sin bando:

| modelo              | testigo sin bando | debate 1                  | debate 2                  |
| ------------------- | ----------------- | ------------------------- | ------------------------- |
| gemma-4-31b         | C++               | Julia, 4 turnos (323 s)   | Julia, 3 turnos (144 s)   |
| qwen3.8-flash       | Fortran           | C++, 2 turnos (245 s)     | C++, 2 turnos (189 s)     |
| deepseek-v4.1-flash | Fortran           | C++, 4 turnos (273 s)     | Fortran, 3 turnos (153 s) |

Los seis debates convergieron, en dos a cuatro turnos, mientras que con la misma frase sobre el objetivo, la pregunta sin criterios solo había hecho converger dos debates de cuatro. Cada cambio de voto cita esta vez un criterio del enunciado. En gemma, el debatiente de C++ se suma a Julia por los físicos:

> «El riesgo de depender en exclusiva de los dos ingenieros para el mantenimiento de un código C++ durante diez años es más crítico que el riesgo técnico ligado al uso de Julia. Julia ofrece el mejor compromiso entre rendimiento GPU portátil y autonomía del equipo de físicos.»

En deepseek, en el debate que termina en Fortran, el debatiente de Julia corrige su propio argumento:

> «Lo que me hace cambiar es p7, y una corrección que le debo a mi propio bando: las 40 000 líneas tienen que correr **en GPU**, no solo estar enlazadas. Mi `ccall` hacia el F90 solo las ejecutaba en la CPU; satisfacer la restricción NVIDIA+AMD habría exigido por tanto reescribirlas en kernels de Julia. El porteo oculto que les reprochaba a los demás, también lo portaba yo.»

Los modelos no coinciden entre sí, pero sus desacuerdos se leen en la traza: gemma pone en primer lugar la autonomía de los físicos, qwen la pervivencia de las herramientas sobre un computador nacional, y deepseek el no reescribir un núcleo de física ya validado. En cinco debates de seis, la respuesta también difiere de la del testigo sin bando, de modo que el debate no se limita a reproducir el a priori del modelo. Lo que vale cada una de estas respuestas queda por juzgar por quien conoce el proyecto, pero ahora dispone de los argumentos, de las objeciones y del criterio que hizo inclinarse a cada debatiente.

::: warning Limitar cada turno
Los debatientes que buscan el consenso quieren leer la respuesta de los demás antes de terminar su turno, y algunos modelos releen entonces el tablero en bucle: un debatiente gemma llamó a `read` 259 veces en un solo turno. El bucle de agente de Pi no tiene un número máximo de llamadas a herramientas, y cada llamada devuelve todo el contexto al modelo. `/swarm` da por tanto a cada turno un plazo, cinco minutos por defecto, que `--timeout 3m` acorta, y el tope de turnos (`--rounds`) limita el resto. Un miembro cortado dos veces seguidas sale del debate, lo que hace imposible el acuerdo: mira el `usage.json` después de cada ejecución.
:::

::: info Ejercicio (en autonomía)
Quita un criterio del enunciado, por ejemplo el núcleo Fortran existente, y mira si cambia la respuesta del debate, y cuál de los argumentos desaparece. Pon después un modelo diferente detrás de cada bando cambiando la línea `model:` de los debatientes. Escribe por último un enunciado de tu ámbito, con sus exigencias, para una decisión que hayas tenido que tomar realmente, y compara el debate con lo que habías decidido.
:::

## Generalizar

Los ensayos de este módulo no bastan para concluir sobre un modelo, pero ilustran propiedades de todo debate entre agentes.

Un debate entre agentes no descubre una respuesta: refleja el marco que se le da. La misma pregunta, planteada a los mismos agentes, no produjo ningún cambio de voto, y luego un acuerdo, según una frase de la consigna. Cambiar la consigna, el formato del voto o el modelo cambia el desenlace, y por tanto es el harness lo que se evalúa al leer un debate tanto como los agentes.

Las copias de un mismo modelo no son opiniones independientes. Sin bando, votan la respuesta que ese modelo daría por sí solo, y un enjambre donde nadie cambia nunca de voto es un fan-out que cuesta más caro. El desacuerdo debe aportarlo la construcción, y un bando escrito en el archivo de cada agente lo garantiza, lo que no hace una lectura del tablero: es la misma regla que para el conjunto de herramientas de un agente en el módulo sobre la delegación, una garantía se verifica leyendo la configuración.

Un debate converge cuando sus miembros tienen una razón para moverse y un terreno donde encontrarse. La frase sobre el objetivo les da la primera, sustituyendo la victoria por la búsqueda de una respuesta común. El pliego de condiciones les da el segundo: criterios que todos reconocen, sobre los que un argumento puede vencer a otro.

Una condición de parada debe corresponder al espacio de las respuestas. `--until agree` cuenta votos idénticos, y unos agentes que se ponen de acuerdo sobre una arquitectura de dos lenguajes nunca votan la misma palabra. Hay que restringir entonces el voto, como hace el enunciado con pliego de condiciones, o aceptar leer la convergencia en el tablero.

Un debate cuesta tokens, y ese costo depende sobre todo de los turnos que se descontrolan. Anthropic informa en [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) que sus sistemas multiagente consumen alrededor de quince veces más tokens que una conversación, y un solo debatiente que entra en bucle puede consumir casi todo el gasto de una ejecución. Los topes forman parte de la construcción de un debate tanto como sus miembros.

Partimos de la hipótesis de que un debate sirve sobre todo para explorar una decisión antes de tomarla, haciendo aparecer los argumentos de cada opción y el criterio en el que se basa cada una, más que para emitir un veredicto o producir código. Para un ticket cuyo camino ya se conoce, el workflow del módulo anterior sigue siendo más barato y más predecible.

::: tip Lo que has aprendido
Sabes decir, con la traza en mano, por qué los debatientes convergieron o no: qué frase de la consigna, qué criterio del enunciado o qué formato de voto decidió el resultado. También sabes decir para qué decisión un debate vale su gasto, y para qué tarea basta un workflow.
:::

## Pour aller plus loin

- La documentación de combo sobre los [enjambres](https://github.com/AI-for-dev/combo/blob/main/docs/guide/swarm.md), que describe el tablero, las conexiones, la parada al alcanzar un acuerdo y las mediciones hechas al escribir la biblioteca, así como el ejemplo [`16-debate.ts`](https://github.com/AI-for-dev/combo/blob/main/examples/16-debate.ts), el mismo debate escrito en TypeScript con un bando por debatiente.
- Yilun Du, Shuang Li, Antonio Torralba, Joshua B. Tenenbaum e Igor Mordatch, [Improving Factuality and Reasoning in Language Models through Multiagent Debate](https://arxiv.org/abs/2305.14325) (2023), donde varias instancias de un modelo debaten durante varios turnos y mejoran sus respuestas en razonamiento y en exactitud factual.
- Tian Liang et al., [Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate](https://arxiv.org/abs/2305.19118) (2023), que llama *Degeneration-of-Thought* al hecho de que un modelo seguro de sí mismo ya no cuestione su respuesta, y enfrenta a debatientes ante un juez.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), el contrapunto ya citado en el módulo sobre la delegación: lo que la fragmentación del contexto hace perder.
- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), para el costo en tokens de un sistema multiagente y los casos en los que vale la pena.
- OpenAI, [Swarm](https://github.com/openai/swarm), la otra forma de enjambre, donde un agente le pasa el relevo a otro con todo el historial.
