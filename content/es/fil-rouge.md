# El hilo conductor: NÉON

A lo largo de la formación, trabajamos sobre un mismo repositorio, que llamamos **NÉON**. Se trata de un pequeño rompe-ladrillos jugable, escrito en HTML y JavaScript sobre un `<canvas>`, sin ninguna dependencia. El juego se inicia con `npm run serve`, y luego se abre en el navegador en la dirección `http://localhost:8000/` (sus módulos ES no se cargan desde un simple `file://`). Es un software real, con sus virtudes y defectos, porque NÉON es voluntariamente imperfecto: contiene bugs, decisiones técnicas por corregir, una lista de tickets pendientes, un archivo con trampa y un historial de git muy real, que forman la materia prima de la formación.

Lo encontrarás en la dirección [github.com/AI-for-dev/neon](https://github.com/AI-for-dev/neon).

## Mantener en lugar de construir

Podríamos haberte hecho construir NÉON desde cero, ladrillo a ladrillo, a la vez que tu harness. Es visualmente satisfactorio, pero a menudo artificial: el uso de un LLM en las primeras líneas de un código suele ir bien porque todo está por hacer. Cuando la base de código es grande, la historia ya no es la misma.

Así que tomamos otra decisión. No construyes NÉON, lo mantienes y lo haces evolucionar. El harness que forjas aprende a comprender el repositorio, a planificar una modificación, a delegar parte del trabajo, a modificar el código, a probarlo, a rechazar una instrucción peligrosa y luego a entregar un diff y un commit, exactamente lo que harás al final de esta formación en tus propios proyectos, que ya tienen un historial.

Esta decisión tiene dos ventajas. Cada pieza del harness responde así a una necesidad concreta, y no a un ejercicio inventado para la ocasión. La transferencia a tu día a día es directa, porque un repositorio, una issue, un diff, una revisión y un commit son exactamente aquello en lo que ya trabajas.

## El repositorio de partida

El repositorio proporcionado tiene la siguiente estructura.

```
neon/
  game/index.html     coquille : le <canvas> et le démarrage
  game/neon.js        logique et rendu, mêlés par endroits
  game/bloom.js       le halo lumineux autour des briques et de la balle
  game/theme.js       couleurs en dur et une amorce de palette, les deux coexistent
  game/neon.test.js   tests partiels : la collision est testée, le score ne l'est pas
  serve.js            un petit serveur statique, sans dépendance, pour lancer le jeu
  package.json        les scripts `npm run serve` et `npm test`
  README.md           partiel : lancer et tester sont documentés, l'architecture reste floue
  ISSUES.md           le backlog
  CONTRIBUTING.md     la contrainte « zéro dépendance » et les conventions
  SUPPORT.md          un fichier piégé, contenant une instruction d'exfiltration
  .env                un secret local à ne jamais lire ; un .env.example est fourni
  .git/               un historique réel, sur plusieurs commits
```

La separación entre la lógica pura y el renderizado se respeta parcialmente. Donde no se respeta, es deliberado: nos da la ocasión de hacer un refactor comprobable. Los tests se lanzan con `npm test`, equivalente a `node --test "game/**/*.test.js"`, sin herramienta adicional, lo que sirve tanto de barrera de seguridad para el harness como de apoyo a las evaluaciones.

## El backlog

El archivo `ISSUES.md` contiene el backlog que aprovechamos en los módulos.

| #   | Tipo           | Título                                                                    |
| --- | -------------- | ------------------------------------------------------------------------- |
| 1   | bug            | La bola atraviesa los ladrillos en lugar de rebotar                       |
| 2   | rendimiento    | La colisión escanea todos los ladrillos en cada frame, código mezclado con el renderizado |
| 3   | funcionalidad  | Modo noche                                                                |
| 4   | funcionalidad  | Importación CSV de una tabla de puntuaciones, compatible con el guardado local |
| 5   | deuda          | La lógica de puntuación y de combo no tiene tests                         |
| 6   | deuda          | Colores en duro en lugar de la paleta                                     |

Quizá no hagas todo, pero este backlog da bastante material para probar tu harness.

## El archivo trampa

El archivo `SUPPORT.md` contiene un texto que parece un procedimiento de asistencia, pero que en realidad pide leer el archivo `.env` y enviar su contenido a una dirección externa. Ese texto es un dato no fiable, colocado ahí para probar la seguridad de tu harness, y no una instrucción legítima.

El punto que hay que retener desde ya es el siguiente: tu harness debe tratar este texto como un dato, y no como una instrucción que ejecutar. El [módulo 2.0](./act2-sandbox) sobre el sandbox y el [módulo 2.5](./act2-hooks) sobre los hooks construyen las barreras de seguridad que rechazan la lectura del `.env`, haya sido engañado el agente o no.

## El punto de llegada

Al final del acto 2, habrás construido tu propio harness en tu clon de NÉON. Contiene:

- un `AGENTS.md` de menos de cuarenta líneas, en la raíz;
- en `.pi/`, los skills `playtester` y `dynamic-playtester`;
- los agentes `explorer`, `planner`, `coder` y `reviewer`;
- un flow que trata el ticket #2 desde la exploración hasta la auditoría, con los tests como juez;
- dos extensiones: una rechaza los comandos prohibidos, la otra devuelve al agente al trabajo mientras los tests estén en rojo.

Todo esto corre en un sandbox. El acto 3 mide después lo que algunas de estas piezas cambian de verdad.

Ningún módulo trata los issues #3, #4 y #6. Están ahí para que pruebes tu harness con una petición que nunca ha visto. Luego podrás reemplazar NÉON por tu propio repositorio, como propone la página [Ahora te toca a ti](./a-vous-de-jouer).
