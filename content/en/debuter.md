# Getting started with the training

::: tip Objectives of this page
- Know what you need to know and install before you start
- Fix a first ticket with an agent and review its work
- Choose, in each module, what to do first and what can wait
:::

This training goes far: it rebuilds a harness piece by piece and measures the effect of each piece. If you have never used a coding agent before, doing everything at once demands a lot of tools and time. This page offers you a shorter path. You keep the essentials of each module, and you come back to the rest later.

## What do you need to know before you start?

You don't need to know AI. However, you must be comfortable with three things.

- **The terminal.** All the exercises are done on the command line: moving around a directory, running a command, reading its output.
- **git.** You will clone repositories, look at what changed with `git status` and `git diff`, undo a change with `git restore`, and create a branch. These commands are what will let you check what the agent did.
- **Reading JavaScript.** The exercise repository, [NÉON](./fil-rouge), is a small game written in JavaScript. You won't have to write it yourself, but you will have to understand the agent's changes.

The module on hooks asks you to write a bit of TypeScript. If you don't know it, Pi can help you write those few lines.

## What do you need to install?

- **git**, to clone NÉON and track the changes.
- **[Node.js](https://nodejs.org/) 22 or newer.** NÉON has no dependencies, and its tests run with `npm test`, which uses the test runner built into Node. We have verified the exercises with Node 22.
- **[Pi](https://pi.dev)**, the coding agent for the training. The module [The starting harness: Pi](./act1-pi) explains how to install it and declare your models.
- **Access to a model.** In the classroom, an [ILaaS](https://www.ilaas.fr/) API key is provided to you. On your own, you can use any provider Pi knows how to call.

Other tools are only used in certain parts: [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) for the second half of the sandbox, [uv](https://docs.astral.sh/uv/) for act 3, [herdr](https://herdr.dev) to watch the subagents work. You can leave them aside to start.

Check your installation with these commands:

```bash
git --version
node --version   # v22 ou plus
pi --version
```

## Which path should you follow through the modules?

Follow the modules in the order of the table of contents, but at first only keep the "to do" column. The "can wait" column contains what demands more tools or more time.

| module                                   | to do                                                                        | can wait                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| [LLMs in 2026](./act1-llm)               | everything                                                                   | the "References" readings                         |
| [Why a harness](./act1-harness)          | everything, skimming "The seven building blocks"                             |                                                   |
| [Pi](./act1-pi)                          | the installation, the first commands, installing combo                       |                                                   |
| [2.0 The sandbox](./act2-sandbox)        | "Understanding" and the exercise with `pi-permission-system`                 | Docker Sandboxes (`sbx`)                          |
| First ticket                             | the exercise below                                                           |                                                   |
| [2.1 Context](./act2-contexte)           | "Understanding", the model choice, the reasoning effort and `AGENTS.md`      | the system prompt, the constrained window, `codemode` |
| [2.2 Skills](./act2-skill)               | "Understanding" and version 1 of `playtester`                                | version 2 (`dynamic-playtester`)                  |
| [2.3 Delegation](./act2-delegation)      | "Understanding" and the exercise on each agent's tools                       | the full loop round                               |
| [2.4 Workflows](./act2-workflows)        | "Understanding"                                                              | the ticket #2 flow and its adaptation             |
| [2.5 Hooks](./act2-hooks)                | both extensions                                                              |                                                   |
| [3.0 Measuring an agent](./act3-trysquare) | the introduction and "How to read a gap?"                                  | installing trysquare                              |
| [3.1 The context levers](./act3-contexte) | "The results" and "Generalizing"                                            | the exercise that reruns the matrix               |

The [glossary](./annexes#glossaire) explains the terms used in the training.

## How do you fix a first ticket with an agent?

Before entering act 2, put Pi to work on a simple ticket, then check what it did yourself. We take issue #5 of NÉON: the `comboMultiplier` and `scoreForBrick` functions have no tests, and the combo multiplier has no cap.

::: info Exercise (in class)
1. Clone NÉON, create a branch and run the tests. All six tests must pass.

   ```bash
   git clone https://github.com/AI-for-dev/neon neon-debut
   cd neon-debut
   git switch -c issue-5
   npm test
   ```

2. Run `pi` and first ask a question that requires no modification:

   ```
   Explique-moi en trois phrases ce que font comboMultiplier et scoreForBrick dans game/neon.js.
   ```

   Look at the tool lines that appear: the agent read the file before answering.

3. Then ask it to handle the ticket:

   ```
   Traite l'issue #5 d'ISSUES.md.
   ```

4. Quit Pi and review its work yourself.
   - `git status` and `git diff`: which files did it modify, and does every changed line have a reason?
   - The ticket gives no value for the cap. Which one did the agent choose? Does it suit you?
   - `npm test`: do the tests pass on your machine, and not just according to the agent's summary?

5. If the work suits you, commit it on the branch:

   ```bash
   git add game/ && git commit -m "Test and clamp the combo multiplier (#5)"
   ```

   Otherwise, discard it with `git restore .` and start again at step 3 with a more precise request.

6. Check that the new tests really verify something. Remove the cap by hand in `comboMultiplier` and run `npm test` again: at least one test must fail. If everything stays green, the tests do not protect the expected behaviour. Then return to the committed version with `git restore game/neon.js`.
:::

In our trial with `gemma-4-31b`, Pi added two tests, capped the multiplier at 10 and announced a green suite, all in under a minute. It also attached a `TODO` comment to issue #5 that had nothing to do with it. That is the kind of detail only reading the diff reveals. Your run will be different: the model does not do the same thing twice, and [module 3.0](./act3-trysquare) shows how to measure this variation.

## Which habits should you keep?

These habits come up in every module. Adopt them now.

- **Read the diff again.** The agent's summary says what it thinks it did. The diff says what it did.
- **Run the tests yourself.** A green suite reported by the agent is not a green suite.
- **Check the added tests.** The agent can add trivial tests and miss the essential.
- **Work on a branch, in a clone or a worktree.** You must be able to undo everything at any time.
- **Do not commit what you do not understand.** If a modification escapes you, ask the agent to explain it, or discard it.

::: tip What you have learned
You know what to install to follow the training and where to go in the modules. You had an agent fix a ticket, and you know how to check its work: read the diff again, run the tests yourself and make sure a written test makes sense.
:::
