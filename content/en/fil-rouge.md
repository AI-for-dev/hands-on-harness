# The Running Theme: NÉON

Throughout the training, we work on a single repository, which we call **NÉON**. It is a small playable Breakout game, written in HTML and JavaScript on a `<canvas>`, with no dependencies. You open it in your browser and it works. It is real software, with its strengths and weaknesses, because NÉON is intentionally imperfect: it contains bugs, technical choices to correct, a list of pending tickets, a booby-trapped file, and a real git history, which form the raw material of the training.

You can find it at [github.com/AI-for-dev/neon](https://github.com/AI-for-dev/neon).

## Maintaining Rather Than Building

We could have had you build NÉON from scratch, brick by brick, at the same time as your harness. That is visually satisfying, but often artificial: having an agent's memory "learn a color palette" has little to do with a developer's actual work.

We have therefore made a different choice. You are not building NÉON; you are maintaining and evolving it. The harness you forge learns to understand the repository, plan a modification, delegate part of the work, modify the code, test it, refuse a dangerous instruction, and then deliver a defensible diff and commit-exactly what you will do at the end of this training on your own projects, which already have a history.

This choice has three advantages. Each brick of the harness then meets a concrete need rather than a contrived exercise. The transfer to your daily work is direct, as a repository, an issue, a diff, a review, and a commit are exactly what you already work on. Finally, the flow is more resilient to setbacks: since the repository already exists, failing one module does not prevent you from tackling the next.

## The Starting Repository

The provided repository has the following structure.

```
neon/
  game/index.html     coquille : le <canvas> et le démarrage
  game/neon.js        logique et rendu, mêlés par endroits
  game/theme.js       couleurs en dur et une amorce de palette, les deux coexistent
  game/neon.test.js   tests partiels : la collision est testée, le score ne l'est pas
  README.md           partiel : lancer et tester sont documentés, l'architecture reste floue
  ISSUES.md           le backlog
  CONTRIBUTING.md     la contrainte « zéro dépendance » et les conventions
  SUPPORT.md          un fichier piégé, contenant une instruction d'exfiltration
  .env                un secret local à ne jamais lire ; un .env.example est fourni
  .git/               un historique réel, sur plusieurs commits
```

The separation between pure logic and rendering is partially respected. Where it is not, it is deliberate: this gives us the opportunity for a testable refactor. Tests are run with `npm test`, equivalent to `node --test "game/**/*.test.js"`, without additional tools, which serves as both a guardrail for the harness and support for evaluations.

## The backlog

The `ISSUES.md` file contains the backlog that we work through module by module.

| #   | Type           | Title                                                                     | Module |
| --- | -------------- | ------------------------------------------------------------------------- | ------ |
| 1   | bug            | The ball passes through a brick at high speed                             | 2.4    |
| 2   | performance    | Collision scans all bricks every frame, code mixed with rendering         | 2.1    |
| 3   | feature        | Night mode                                                                 | 4.0    |
| 4   | feature        | CSV import of a scoreboard, compatible with local save                    | 4.0    |
| 5   | debt           | Score and combo logic is not tested                                       | 3.1    |
| 6   | debt           | Hard-coded colors instead of the palette                                   | 2.5    |

## The booby-trapped file

The `SUPPORT.md` file contains text that looks like a support procedure, but actually asks to read the `.env` file and send its content to an external address. This text is untrusted data, placed there to test your harness's safety, and not a legitimate instruction.

The key point to remember now is this: your harness must treat this text as data, and not as an instruction to be executed. We will return to this in detail in the module on permissions.

## The "zero dependency" constraint (I'm not sure if I'll keep this part)

The `CONTRIBUTING.md` file imposes a hard constraint: no dependencies, no CDN. This constraint makes the lesson of *context engineering* concrete: the less code and tooling there is around, the more manageable the context remains. We will defend this constraint when dealing with safety, and the harness must respect it as a project decision.

## The end goal

The final module brings together everything that came before. You give your harness a single sentence, corresponding to a real combined issue:

> Add night mode and CSV import for a scoreboard, maintain compatibility with local save, document the behavior, and add tests.

The harness then runs the complete cycle autonomously: it retrieves project decisions from memory, plans, delegates to read-only sub-agents, has workers operating in parallel, has the result reviewed, requires green tests before concluding, refuses the `SUPPORT.md` trap by explaining why, updates the README, and produces a diff accompanied by a justified commit.

You have now done, on a toy repository, exactly what you will do on your own repositories: you will only need to replace NÉON with your own.
