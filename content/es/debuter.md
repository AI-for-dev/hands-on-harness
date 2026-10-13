# Empezar con la formación

::: tip Objetivos de esta página
- Saber qué hay que conocer e instalar antes de empezar
- Corregir un primer ticket con un agente y revisar su trabajo
- Elegir, en cada módulo, qué hacer primero y qué puede esperar
:::

Esta formación llega lejos: reconstruye un harness pieza a pieza y mide el efecto de cada pieza. Si aún no has usado nunca un agente de código, hacerlo todo de golpe exige muchas herramientas y mucho tiempo. Esta página te propone un camino más corto. Conservas lo esencial de cada módulo, y volverás al resto más adelante.

## ¿Qué hay que saber antes de empezar?

No necesitas conocer la IA. En cambio, debes manejar con soltura tres cosas.

- **La terminal.** Todos los ejercicios se hacen en línea de comandos: moverte por un directorio, lanzar un comando, leer su salida.
- **git.** Vas a clonar repositorios, mirar qué ha cambiado con `git status` y `git diff`, deshacer una modificación con `git restore` y crear una rama. Son esos comandos los que te permitirán comprobar qué ha hecho el agente.
- **Leer JavaScript.** El repositorio de ejercicios, [NÉON](./fil-rouge), es un pequeño juego escrito en JavaScript. No tendrás que escribirlo tú, pero sí entender las modificaciones del agente.

El módulo sobre los hooks pide escribir algo de TypeScript. Si no lo conoces, Pi puede ayudarte a escribir esas pocas líneas.

## ¿Qué hay que instalar?

- **git**, para clonar NÉON y seguir las modificaciones.
- **[Node.js](https://nodejs.org/) 22 o más reciente.** NÉON no tiene ninguna dependencia, y sus tests se lanzan con `npm test`, que usa el lanzador de tests integrado en Node. Hemos verificado los ejercicios con Node 22.
- **[Pi](https://pi.dev)**, el agente de código de la formación. El módulo [El harness de partida: Pi](./act1-pi) explica cómo instalarlo y declarar tus modelos.
- **Acceso a un modelo.** En clase se te proporciona una clave de API de [ILaaS](https://www.ilaas.fr/). Por tu cuenta, puedes usar cualquier proveedor al que Pi sepa llamar.

Otras herramientas solo sirven en algunas partes: [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) para la segunda mitad del sandbox, [uv](https://docs.astral.sh/uv/) para el acto 3, [herdr](https://herdr.dev) para ver trabajar a los subagentes. Puedes dejarlas de lado para empezar.

Comprueba tu instalación con estos comandos:

```bash
git --version
node --version   # v22 ou plus
pi --version
```

## ¿Qué camino seguir en los módulos?

Sigue los módulos en el orden del índice, pero quedándote primero solo con la columna «a hacer». La columna «puede esperar» contiene lo que exige más herramientas o más tiempo.

| módulo                                         | por hacer                                                                   | puede esperar                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| [Los LLM en 2026](./act1-llm)                  | todo                                                                        | las lecturas de « Referencias »                  |
| [Por qué un harness](./act1-harness)           | todo, leyendo rápido « Los siete ladrillos »                                |                                                  |
| [Pi](./act1-pi)                                | la instalación, los primeros comandos, la instalación de combo              |                                                  |
| [2.0 El sandbox](./act2-sandbox)               | « Comprender » y el ejercicio con `pi-permission-system`                    | Docker Sandboxes (`sbx`)                         |
| Primer ticket                                  | el ejercicio de abajo                                                       |                                                  |
| [2.1 El contexto](./act2-contexte)             | « Comprender », la elección del modelo, el esfuerzo de razonamiento y `AGENTS.md` | el system prompt, la ventana limitada, `codemode` |
| [2.2 Los skills](./act2-skill)                 | « Comprender » y la versión 1 de `playtester`                               | la versión 2 (`dynamic-playtester`)              |
| [2.3 La delegación](./act2-delegation)         | « Comprender » y el ejercicio sobre las herramientas de cada agente         | la vuelta de bucle completa                      |
| [2.4 Los workflows](./act2-workflows)          | « Comprender »                                                              | el flow del ticket #2 y su adaptación            |
| [2.5 Los hooks](./act2-hooks)                  | las dos extensiones                                                         |                                                  |
| [3.0 Medir un agente](./act3-trysquare)        | la introducción y « ¿Cómo leer una diferencia? »                            | la instalación de trysquare                      |
| [3.1 Las palancas del contexto](./act3-contexte) | « Lo que dicen nuestras mediciones »                                      | la campaña de mediciones                         |

El [glosario](./annexes#glossaire) explica los términos de la formación.

## ¿Cómo corregir un primer ticket con un agente?

Antes de entrar en el acto 2, haz que Pi trabaje sobre un ticket sencillo y verifica tú mismo lo que hizo. Tomamos la issue #5 de NÉON: las funciones `comboMultiplier` y `scoreForBrick` no tienen tests, y el multiplicador de combo no tiene tope.

::: info Ejercicio (en sala)
1. Clona NÉON, crea una rama y lanza los tests. Los seis tests deben pasar.

   ```bash
   git clone https://github.com/AI-for-dev/neon neon-debut
   cd neon-debut
   git switch -c issue-5
   npm test
   ```

2. Lanza `pi` y plantea primero una pregunta que no requiera ninguna modificación:

   ```
   Explique-moi en trois phrases ce que font comboMultiplier et scoreForBrick dans game/neon.js.
   ```

   Observa las líneas de herramientas que aparecen: el agente leyó el archivo antes de responder.

3. Pídele después que resuelva el ticket:

   ```
   Traite l'issue #5 d'ISSUES.md.
   ```

4. Sal de Pi y revisa tú mismo su trabajo.
   - `git status` y `git diff`: ¿qué archivos modificó, y cada línea cambiada tiene una razón?
   - El ticket no da un valor para el tope. ¿Cuál eligió el agente? ¿Te conviene?
   - `npm test`: ¿pasan los tests en tu máquina, y no solo según el resumen del agente?

5. Si el trabajo te convence, haz commit en la rama:

   ```bash
   git add game/ && git commit -m "Test and clamp the combo multiplier (#5)"
   ```

   Si no, descártalo con `git restore .` y vuelve al paso 3 con una petición más precisa.

6. Comprueba que los nuevos tests verifican realmente algo. Quita el tope a mano en `comboMultiplier` y relanza `npm test`: al menos un test debe fallar. Si todo sigue en verde, los tests no protegen el comportamiento esperado. Vuelve después a la versión commiteada con `git restore game/neon.js`.
:::

En nuestro ensayo con `gemma-4-31b`, Pi añadió dos tests, limitó el multiplicador a 10 y anunció una suite en verde, todo en menos de un minuto. También adjuntó a la issue #5 un comentario `TODO` que no le concernía. Es el tipo de detalle que solo la relectura del diff deja ver. Tu ejecución será distinta: el modelo no hace dos veces lo mismo, y el [módulo 3.0](./act3-trysquare) muestra cómo medir esa variación.

## ¿Qué reflejos conservar?

Estos reflejos vuelven en todos los módulos. Adquiere los desde ahora.

- **Relee el diff.** El resumen del agente dice lo que cree haber hecho. El diff dice lo que hizo.
- **Lanza tú mismo los tests.** Una suite en verde indicada por el agente no es una suite en verde.
- **Comprueba que los tests añadidos** verifican algo. El agente puede añadir tests triviales y dejar pasar lo esencial.
- **Trabaja en una rama, en un clon o en un worktree.** Debes poder anularlo todo en cualquier momento.
- **No hagas commit de lo que no entiendes.** Si una modificación se te escapa, pide al agente que la explique, o descártala.

::: tip Lo que has aprendido
Ya sabes qué instalar para seguir la formación y por dónde pasar en los módulos. Has hecho corregir un ticket por un agente, y sabes verificar su trabajo: releer el diff, lanzar los tests tú mismo y asegurarte de que un test escrito tiene sentido.
:::
