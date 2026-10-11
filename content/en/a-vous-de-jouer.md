# Your turn

::: tip Objectives of this module
- Know what to take from trysquare and combo once the training is over
- Know where to look for skills written by practitioners who use them daily
- Place trysquare and combo among the more mature evaluation and workflow tools
- Recognise in the software factories that are appearing the building blocks built during Act 2
:::

Throughout the training, you worked on NÉON, a repository we had prepared so that every harness lever would produce a visible effect there. Your own repository will have neither an `ISSUES.md` as detailed as this one, nor an issue #1 whose side effects are all known in advance, and it is on that repository that the choices made during these three acts must now hold. To continue on your own, you can start from the two tools written for the training, read the skills of practitioners who have been writing them for a long time, and look at the more mature tools that already do the same thing as ours, up to the software factories that assemble all the building blocks of Act 2.

## What to keep from trysquare and combo?

We wrote two tools for this training, so that each module experiment starts in a few minutes from a Pi session and their code stays short enough to be read.

[combo](https://github.com/AI-for-dev/combo) is a Pi extension that runs a **flow**, that is, a task graph described in YAML and markdown, whose nodes are subagents and whose sequencing is decided by code instead of the model. [Module 2.4](./act2-workflows) used it to write the explorer, planner, implementation and tests chain, with a capped loop and a human stop before the commit. Its [documentation](https://github.com/AI-for-dev/combo/tree/main/docs) also describes the `build` and `build-attended` flows, which do generically what the module did on a ticket.

[trysquare](https://github.com/AI-for-dev/trysquare) is a Python tool that replays the configurations of a scenario, scores each run and says whether the measured gap between two configurations comes from resampling. [Module 3.0](./act3-trysquare) describes how it works and [module 3.1](./act3-contexte) applied it to the context levers. The [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) repository contains the Act 3 scenarios and serves as a starting point for writing your own.

::: warning Training tools
combo and trysquare were written to experiment quickly. Today they only drive Pi and have not yet been tested in production. We advise you to use them to decide what you put in your harness, then to look at the tools in the next section if you need to run it every day for a team.
:::

The approach matters more than the tools themselves, and it carries over to your repository without change: pick a real ticket whose correctness you know how to verify with a test, write the request the way you would write it on an ordinary day, then vary one lever at a time (the model, `AGENTS.md`, a skill, a flow), repeating each configuration enough times that the observed difference is not noise. The decision sheet you filled in module after module is the deliverable to reproduce.

## Where to find skills to draw inspiration from?

[Module 2.2](./act2-skill) had you write `playtester` and then `dynamic-playtester` by hand, and we encourage you to keep doing so: a skill you wrote and tested with your models is a skill whose behavior you know. Reading the skills of people who have used them for a long time remains the best way to learn how to write them. Here are the three repositories we recommend as of October 2026.

- [pstack](https://github.com/cursor/plugins/tree/main/pstack), by Lauren Tan, which gathers the skills she uses every day at Cursor, several of which split a single task across multiple models to take advantage of each one's strengths.
- [mattpocock/skills](https://github.com/mattpocock/skills), by Matt Pocock, deliberately short and easy-to-adapt skills (test-driven development, module design, bug diagnosis), each describing a procedure with a verifiable end criterion, as we did for `playtester`.
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), by Addy Osmani, which splits the development cycle into nine commands (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`...) each of which loads the skills for its stage.

Anthropic's [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) skill remains useful for writing a first skeleton, and the [skills.sh](https://www.skills.sh/) catalog for seeing what already exists on a topic.

::: danger A skill is code
A skill can ask the model to run its scripts, read web pages, or write to your repository. Installing a skill found online therefore amounts to running code you did not write, with your agent's permissions. Read `SKILL.md` and the contents of `scripts/` before installing it, and run it in the sandbox from [module 2.0](./act2-sandbox) until you have read it.
:::

## Which tools do the same thing as trysquare and combo?

For evaluation, [Inspect](https://inspect.aisi.org.uk/), the framework from the UK AI Security Institute, reruns each sample with `--epochs`, aggregates repetitions and publishes a standard error, and its [Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/) package runs Claude Code, Codex CLI, Gemini CLI or OpenCode in a sandbox. [Harbor](https://github.com/harbor-framework/harbor), written by the Terminal-Bench team, launches agents on containerized tasks with `--n-attempts` and can spread the load across remote sandbox providers like Daytona or Modal. These two tools cover more agents and more infrastructure than trysquare, at the cost of a heavier install, and neither focuses on the question that occupied act 3: whether the gap between two harness configurations, on a fixed task, is real.

For workflows, [Archon](https://github.com/coleam00/Archon) describes a workflow as a YAML graph stored in `.archon/workflows/`, mixes deterministic nodes (bash, tests, git) with nodes handed to Claude Code, Codex or Pi, handles loops and human validations, and ships around twenty ready-to-use workflows. [Fabro](https://github.com/fabro-sh/fabro), shipped as a single Rust binary, describes the graph in DOT (the [Graphviz](https://graphviz.org/) language), assigns a model to each node through a stylesheet, and suspends the run at approval gates. These engines launch agents from outside the harness, whereas a combo flow launches with `/run` from the Pi session and lets you read the trace of each sub-agent in the same place. The motifs of module 2.4 (chain, capped loop, tests as judge, human stop) have a direct equivalent in Archon, so a flow written during the training transposes there node by node.

## What is a software factory?

A **software factory** is a system that receives a request, usually an issue or a specification, and returns a pull request or a report, having several agents work in parallel, each in its own worktree, under a supervision that only calls on the human for the decisions that are theirs. The tools in this family are young and change week by week. We present them here because they assemble the bricks you built one by one during act 2: the sandbox, the context, the skills, delegation to sub-agents, workflows and hooks.

[Machinist](https://github.com/owainlewis/machinist), written in Go and released in early access, runs on your machine and keeps repositories and keys local. A **command** binds a prompt, an executable that reads it on its standard input (Codex, Claude Code, another agent, a test script) and a timeout, and a workflow chains these commands while keeping the files produced from one step to the next, and can stop before a step to wait for your approval. The configuration file is in TOML, and the `task-to-pr` workflow shipped by default goes from a GitHub issue to a pull request. Machinist does not see the inside of a command: an interrupted script starts over from the beginning, unless it handles its own restart points itself.

[firstmate](https://github.com/kunchenguid/firstmate) presents itself as an agent distribution rather than as software to install: the cloned repository contains an `AGENTS.md`, skills and scripts, and the harness you launch inside it (Pi, Claude Code, Codex, OpenCode and others) becomes the "second". You talk only to this agent, which launches one agent per task in a tmux window or a [herdr](https://herdr.dev) tab you can watch, gives it a clean git worktree, monitors it to the end and returns a pull request or an investigation report. Monitoring is delegated to a bash script that only wakes the model when an agent needs it, which avoids paying tokens while waiting. We find the pattern from [module 2.3](./act2-delegation), an orchestrator and isolated sub-agents, pushed to several tasks in parallel across several repositories.

[Gas Town](https://github.com/steveyegge/gastown), by Steve Yegge, coordinates agents (Claude Code, GitHub Copilot, Codex, Gemini and others) spread across several projects, with a coordinating agent, mailboxes between agents and a work state kept in git, so that a restarted agent picks up where it left off. Its README announces comfortable operation with twenty to thirty agents, a figure we have not measured.

These tools move you from one agent you monitor to several agents you direct, but each added agent multiplies the tokens spent and the pull requests to review, and none of them says whether its configuration fixes your tickets more often than a single well-tuned agent, while that is exactly the question trysquare answers. Before handing your repository to a factory, measure on a few real tickets whether it more often delivers a fix that passes the tests than the configuration retained in your decision sheet, and at what cost.

## Going further

- [combo](https://github.com/AI-for-dev/combo) and its [documentation](https://github.com/AI-for-dev/combo/tree/main/docs).
- [trysquare](https://github.com/AI-for-dev/trysquare), its [documentation](https://ai-for-dev.github.io/trysquare/), and the exercise repository [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter).
- The [Agent Skills specification](https://agentskills.io/specification), for writing skills that work across harnesses.
- The [Machinist documentation](https://github.com/owainlewis/machinist/blob/main/docs/README.md), in particular the [task workflows guide](https://github.com/owainlewis/machinist/blob/main/docs/task-guide.md).
- The [firstmate architecture](https://github.com/kunchenguid/firstmate/blob/main/docs/architecture.md), which details supervision, worktree isolation, and per-project delivery modes.
