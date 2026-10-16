# Hands-on Harness

A course on coding-agent harnesses: what sits between you and the model, how to rebuild each piece by hand on [Pi](https://pi.dev), and how to measure what each piece actually changes.

**Read it online:** [ai-for-dev.github.io/hands-on-harness](https://ai-for-dev.github.io/hands-on-harness/) (written in French, published in [English](https://ai-for-dev.github.io/hands-on-harness/en/) and [Spanish](https://ai-for-dev.github.io/hands-on-harness/es/)).

## Why this course?

Run the same configuration six times on the first ticket of the course's practice repository, with the same model, the same reasoning effort, the same prompt and the same commit, and two of the six runs fail to fix the bug. On the best-equipped configuration of act 3, input tokens range from 42,731 to 2,420,677 depending on the run. A single run tells you very little, and the part you can act on is the harness around the model: what goes into the context window, which skills it can load, how the work is split between agents, and which rules are enforced by code rather than only written in a markdown file. In one of our experiments, a cleanup instruction placed in a `SKILL.md` was followed less than one time in three, which is why the course asks the same question of every piece of the harness: can the model ignore it, or does the harness guarantee it?

We could have written a catalogue of tools with installation recipes, but that kind of material is out of date within a few months. The course is built around the functional pieces every harness needs instead (context, skills, hooks, delegation, workflows, sandboxing, evaluation). For each one we start from the situation where things go wrong, rebuild a minimal version on Pi, then draw out the principle that still holds once you switch to Claude Code, Codex or whatever comes next.

## What will you do?

You work on a single repository from start to finish: [NÉON](https://github.com/AI-for-dev/neon), a small brick-breaker game in HTML and JavaScript with no dependencies. It is deliberately imperfect, with real bugs, a backlog of tickets, a trapped file and a genuine git history, because an agent writing the first lines of a project rarely struggles, and the interesting failures only show up when it has to maintain code that already exists.

| Act            | What it covers                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1. Foundations | A working picture of LLMs in 2026, of what a harness is made of, and of Pi as a minimal starting point                  |
| 2. Rebuilding  | A sandbox, then context, skills, hooks, sub-agents and workflows, each one written by hand and tested on NÉON's tickets |
| 3. Evaluating  | Repeating the same task many times, to tell a real improvement from sampling noise                                      |
| Your turn      | Pointers to carry the method over to your own repository, and to the tools that already go further                      |

Every module of act 2 follows the same three steps (understand, rebuild, generalise) and ends with a short summary of what you have learned.

## What tools come with the course?

We wrote a few tools for the course, so that each experiment runs in minutes from a Pi session and their code stays short enough to read. They only drive Pi today and have not been tested in production, and the course points to more mature alternatives where they exist.

- [combo](https://github.com/AI-for-dev/combo) is a Pi extension that runs a **flow**, a task graph written in YAML and markdown whose nodes are sub-agents and whose sequencing is decided by code instead of by the model. It is what the workflows module uses to chain exploration, planning, implementation and tests, with a capped retry loop and a human stop before the commit.
- [trysquare](https://github.com/AI-for-dev/trysquare) is a Python tool that replays the configurations of a scenario many times, scores each run, and tells you whether the gap between two harness configurations holds up under resampling. Its [documentation](https://ai-for-dev.github.io/trysquare/) covers writing scenarios and validations, and [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) holds the experiments of act 3 as a starting point for your own.
- [ai4dev-pi-kit](https://github.com/AI-for-dev/ai4dev-pi-kit) is a [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) kit that runs Pi in an isolated micro-VM, so that the unattended runs of the later modules never see your SSH or API keys and only reach the domains you allow.

## Who is it for?

The material was created for the [IA4Dev training school](https://ia4dev-2026.sciencesconf.org/) (19 to 22 October 2026) and is aimed at people in higher education and research who already code, whether they use AI tools every day, want to start, or simply want to understand how these agents work. The course does not try to convince anyone to use AI. It takes the next question, how to use it well if you choose to, and the [introduction](https://ai-for-dev.github.io/hands-on-harness/en/) explains that position and the legal, social and environmental questions it leaves to other sessions.

## Development

The site is built with [VitePress](https://vitepress.dev). French pages live in `content/`, and the English and Spanish translations are generated into `content/en/` and `content/es/` (see `i18n/README.md`).

```bash
npm install
npm run docs:dev
```

After cloning the repository, install the pre-commit hooks (up-to-date translations, file hygiene):

```bash
pre-commit install
```

## License

This repository combines two licenses depending on the type of content:

- **Course content** (`content/`, French pages and generated translations):
  [CC BY-SA 4.0](LICENSE-CONTENT).
- **Code** (scripts, VitePress configuration, theme): [BSD-3-Clause](LICENSE).
