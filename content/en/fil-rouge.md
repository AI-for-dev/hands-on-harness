# The common thread: NÉON

Throughout the training, we work on the same repository, which we call **NÉON**. It's a small playable Breakout game, written in HTML and JavaScript on a `<canvas>`, with no dependencies at all. The game starts with `npm run serve`, then opens in the browser at `http://localhost:8000/` (its ES modules don't load from a plain `file://`). It's real software, with its strengths and flaws, because NÉON is deliberately imperfect: it has bugs, technical choices to fix, a backlog of tickets, a booby-trapped file and a very real git history, which form the raw material of the training.

You will find it at [github.com/AI-for-dev/neon](https://github.com/AI-for-dev/neon).

## Maintaining rather than building

We could have had you build NÉON from scratch, brick by brick, at the same time as your harness. That would be visually satisfying, but often artificial: using an LLM on the first lines of a codebase usually goes well because everything remains to be done. When the codebase is substantial, it is a different story.

So we made another choice. You don't build NÉON, you maintain and evolve it. The harness you forge learns to understand the repository, to plan a change, to delegate part of the work, to modify the code, to test it, to refuse a dangerous instruction, and then to deliver a diff and a commit - exactly what you'll do at the end of this training on your own projects, which already have a history.

This choice has two advantages. Each piece of the harness then answers a concrete need, not an exercise invented for the occasion. Transfer to your daily work is direct, because a repository, an issue, a diff, a review, and a commit are exactly what you already work on.

## The starting repository

The provided repository has the following structure.

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

The separation between pure logic and rendering is partially respected. Where it is not, this is deliberate: it gives us the opportunity for a testable refactor. Tests run with `npm test`, equivalent to `node --test "game/**/*.test.js"`, with no additional tool, which serves both as a guardrail for the harness and as support for the evaluations.

## The backlog

The `ISSUES.md` file contains the backlog we draw on in the modules.

| #   | Type        | Title                                                                     |
| --- | ----------- | ------------------------------------------------------------------------- |
| 1   | bug         | The ball passes through the bricks instead of bouncing                    |
| 2   | performance | The collision scans all the bricks at each frame, code mixed with rendering |
| 3   | feature     | Night mode                                                                |
| 4   | feature     | CSV import of a score table, compatible with the local save               |
| 5   | debt        | The score and combo logic is not tested                                   |
| 6   | debt        | Hard-coded colors instead of the palette                                  |

You may not do everything, but this backlog gives enough material to test your harness.

## The trap file

The `SUPPORT.md` file contains text that looks like a support procedure, but actually asks to read the `.env` file and send its contents to an external address. This text is untrusted data, placed there to test the safety of your harness, and not a legitimate instruction.

The point to remember right now is this: your harness must treat this text as data, not as an instruction to execute. [Module 2.0](./act2-sandbox) on the sandbox and [module 2.3](./act2-hooks) on hooks build the guardrails that refuse to read the `.env`, whether or not the agent has been tricked.

## The destination

At the end of act 2, you will have built your own harness in your clone of NÉON. It contains:

- an `AGENTS.md` of fewer than forty lines, at the root;
- in `.pi/`, the `playtester` and `dynamic-playtester` skills;
- the `explorer`, `planner`, `coder`, and `reviewer` agents;
- a flow that handles ticket #2 from exploration to audit, with tests as judge;
- two extensions: one refuses forbidden commands, the other sends the agent back to work as long as the tests are red.

All of this runs in a sandbox. Act 3 then measures what some of these pieces really change.

No module handles issues #3, #4, and #6. They are there so that you can try your harness on a request it has never seen. You can then replace NÉON with your own repository, as the [Your turn](./a-vous-de-jouer) page suggests.
