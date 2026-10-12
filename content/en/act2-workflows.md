# Workflows: the loop written in a file

::: tip Objectives of this module
- Recognize in the previous module's loop the patterns of a workflow
- Write that loop in a file that Pi runs by itself
- Make tests the final judge, and choose where the human keeps control
- Adapt this file to your own needs in a few lines
:::

In the previous module, you were the orchestrator. You launched each agent with `/step`, reread the note, ran `npm test` in a second terminal, and after each verdict you decided who took over. That is instructive once. Doing these actions twenty times is far less so, and that is precisely the kind of repetitive task worth automating.

This module writes these actions into a file. combo calls this file a **flow**: a task graph described in YAML and markdown, placed next to your agents, and run by code rather than by a model. We will see that there is no language to learn and that your harness is modified like any configuration file.

We remind you that the combo tool was written specifically for this training and that it may not be advisable to use it in production today. That may no longer be the case in the long term. The idea is always to let you experiment quickly and easily.

## Understanding

### What is a workflow?

If we take a step back from the previous module, the steps we chained together form a graph. The rectangles are the subagents launched by `/step` and the rounded shapes are the actions you performed yourself:

```mermaid
flowchart TD
    T([ticket #2]) --> E[explorer]
    E -- impact note --> L([you review the note])
    L --> P[planner]
    P -- step-by-step plan --> C[coder]
    C -- report and diff --> N([you run npm test])
    N -- test output --> R[reviewer]
    R --> V{verdict}
    V -- "APPROVED, next step" --> C
    V -- "rejected, code is at fault" --> C
    V -- "rejected, step is at fault" --> P
    V -- "APPROVED, final step" --> F([ticket delivered])
```

This graph breaks down into a few patterns found in most multi-agent systems. Each figure shows in the top right corner how the pattern is written in a flow. Two patterns have their own node: fan-out and loop. The other three are simply nodes chained end to end.

- **chain**: the planner receives the explorer's note, the coder receives the plan.

  ![chain](/figures/workflows/chain-light.en.svg){.only-light}
  ![chain](/figures/workflows/chain-dark.en.svg){.only-dark}

- **fan-out**: the explorer and the tester read the ticket at the same time, since neither of them writes.

  ![fan-out](/figures/workflows/fan-out-light.en.svg){.only-light}
  ![fan-out](/figures/workflows/fan-out-dark.en.svg){.only-dark}

- **orchestrate**: the planner decides how many steps are needed, then each step goes to the coder.

  ![orchestrate](/figures/workflows/orchestrate-light.en.svg){.only-light}
  ![orchestrate](/figures/workflows/orchestrate-dark.en.svg){.only-dark}

- **loop**: the coder and the reviewer start again until the step is validated.

  ![loop](/figures/workflows/loop-light.en.svg){.only-light}
  ![loop](/figures/workflows/loop-dark.en.svg){.only-dark}

- **reduce**: an agent rereads the result of several branches and derives a single answer from it. In our loop, that is the auditor's role.

![reduce](/figures/workflows/reduce-light.en.svg){.only-light}
  ![reduce](/figures/workflows/reduce-dark.en.svg){.only-dark}

### A flow: your loop in a file

Let's see instead what this gives with combo on a concrete example, the explorer-then-planner chain:

```md
---
name: impact-plan
description: La note d'impact, puis le plan
input: string
nodes:
  - id: note
    agent: explorer
    reads: [input]
  - id: plan
    agent: planner
    reads: [input, note]
---

## note
Rends la note d'impact du ticket désigné sous `input`.

## plan
Découpe le ticket désigné sous `input` en petits pas, avec la note sous `note` comme carte.
```

The header describes the structure: the nodes, in order, and what each one reads. The body gives each agent its instructions, one `## <id>` section per node. Each agent receives its section and the items listed in `reads:`, nothing else. That is exactly what you were doing when you manually pasted the issue, the step, and the diff into the reviewer's message.

The entire file is validated before any model runs.

::: info Exercise (in class)
If you haven't already, install the combo extension

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
pi
```

Add this file to `.pi/flows/impact-plan.md` and test it on issue #2. You can watch the agents evolve in herdr.

```
/herdr on
/run impact-plan traite le ticket #2 d'ISSUES.md
```
:::

### Automating the orchestrator

In the previous module, you carried out the orchestration of the various steps involved in resolving a bug. Here we will automate this process as follows:

| in the previous module                         | in the flow                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `/step explorer`, and test it alongside       | a `parallel` of two agents                                                    |
| the planner returns a plan in steps           | an `agent` whose output is a list of steps                                     |
| you give a step to the coder, then the next   | a `map` over that list, one step at a time                                     |
| you run `npm test`                            | a `check` that runs `.pi/checks/test.sh`                                       |
| the verdict, and the return to the coder      | a `loop` until the tests pass and the reviewer approves                        |
| the return to the planner                     | a second pass: the auditor re-reads everything and the planner replans what remains |
| `/chain` and your journal                     | the `runs/<timestamp>/` directory, with the trace of each agent                |

We saw in previous modules that it was important to carry out each step of a plan separately. You can ask combo to format the output. That is what we will do here, by asking it to produce a list of steps.

### Tests have the last word

We need a reliable step to know whether the changes made clearly meet our needs. We could ask for it in the prompt, but you have seen that a written instruction is not always followed. So we prefer to define a bash script that represents the actions to take after each change. In a flow, the `check` node does exactly that by running a script from your project. Its result is a value that the loop reads: with `loop: tests.output.passed && review.output.approved`, the coder knows what to do if the code it generated is wrong or if it does not exactly follow the development framework (linter, for example).

![gate](/figures/workflows/gate-light.en.svg){.only-light}
![gate](/figures/workflows/gate-dark.en.svg){.only-dark}

## Rebuilding

### The flow of ticket #2

Here is the loop from the previous module written out in full, versioned in `scripts/flows/issue2.md`. It uses the four agents from the previous module without modifying them, as well as `tester` and `auditor`, copied at the same time as them.

<<<@/../scripts/flows/issue2.md{md}

A few remarks on this flow

- Steps follow one another in the same tree, like your `/step`.
- Three attempts per step and two rounds at most. A cap is mandatory for every loop: without it, a model that never converges would run until the budget is exhausted. If your flow fails by reaching this limit, combo will tell you.
- The ticket contract is written in the planner section to ensure that user requests are clearly included. The exploration phase can obscure them.
- `retry: 1` for each agent. During the first real run of this flow, the planner wrote a very good plan, but in plain text, without using the intended tool, and the run stopped. A second attempt, with the named error, was sufficient. A second attempt is not always enough: in a run from October 2026, the reviewer for the first step twice returned a justified refusal in prose without calling `verdict`, and the step failed without the coder getting a second attempt. `on-fail: continue` allowed the following steps to proceed, which picked up this work, and the audit approved the whole thing, which only the trace made possible to understand.
- Each step ends with a green suite. Another run scheduled a step to "write the red tests" alone, without the code. The loop requires a green suite, so this step could not succeed and it burned through its three attempts. When a loop does not converge, first check if its condition was achievable.

Two roles are added here. The tester (`scripts/agents/tester.md`) checks whether tests exist and whether more are needed. The auditor (`scripts/agents/auditor.md`) ensures the work is completed in full and nothing has been forgotten, while the reviewer only sees one step. What it raises stays open until someone addresses it, and the flow starts a second round.

::: warning  A note on these choices
We remind you that the objective of this training is to give you all the elements needed to build your harness. The choices made here are therefore debatable and perhaps not optimal for getting the best results. But you have all the understanding required to remove nodes, add new ones, or modify them.
:::

::: info Exercise (in class)
Place the agents, the flow, and the test script in your NÉON clone:

```bash
cd /chemin/vers/neon
mkdir -p .pi/agents .pi/flows .pi/checks
cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
cp /chemin/vers/hands-on-harness/scripts/flows/issue2.md .pi/flows/
printf '#!/usr/bin/env bash\nnpm test\n' > .pi/checks/test.sh

printf '.pi/\nruns/\n' >> .gitignore
git add .gitignore && git commit -m "ignorer .pi et runs"

pi install -l npm:@ai-for-dev/combo
pi
```

The two lines added to `.gitignore` are necessary because the `diff` read by the reviewer and the auditor also counts files that git does not track: without them, agents, packages installed under `.pi/`, and `runs/` traces would appear there.

On first launch, Pi asks whether you trust the project folder: without this, it loads neither `.pi/` nor combo. Choose "Trust".

Check what Pi loaded before launching anything:

```prompt
/flows
/flows issue2
```

The first command lists the flows found, the second displays the plan of `issue2` node by node. Then break the file on purpose by replacing `agent: coder` with `agent: codeur`, rerun `/flows`, and read the refusal: it names the node and suggests the correct name. Put `coder` back, then run the loop:

```prompt
/run issue2 traite le ticket #2 d'ISSUES.md
```

Pi draws the flow above the prompt as it progresses, and everything you used to do by hand now runs in sequence without you. Expect about twenty minutes on ILaaS with gemma-4-31b: our October 2026 run took 20 min 27 s.

At the end, do your own checks, the ones from the previous module: `npm test`, the exports list, `git diff`, and the trace in `runs/<horodatage>/`. Don't settle for the flow's verdict.
:::

An interrupted run resumes with `/run resume`, where it stopped.

### Adapt the harness to your needs

This flow is a starting point. Each modification that follows only takes a few lines, and `/flows issue2` tells you before any run whether it is valid.

The flow stops at the audit, and committing is left to you. To have it propose the commit, add a question, a branch, and the commit at the end:

![human stop](/figures/workflows/human-stop-light.en.svg){.only-light}
![human stop](/figures/workflows/human-stop-dark.en.svg){.only-dark}

```yaml
  - id: go
    ask: "Commiter ce changement ?"
    confirm: true
    default: false
    reads: [diff]

  - id: ship
    choice:
      - when: go.output.yes
        do:
          - id: message
            agent: committer
            reads: [input, diff]
          - id: commit
            commit: message
    default: []
```

Add a `## message` section that tells the committer what to write. The `committer` ships with combo, the commit goes to a branch dedicated to the run, and nothing is pushed. With `default: false`, a run with no one at the screen does not commit.

A flow that works also becomes a building block. A `flow` node calls another flow in its entirety: your `issue2` can be used in a larger flow without being copied.

![composition](/figures/workflows/composition-light.en.svg){.only-light}
![composition](/figures/workflows/composition-dark.en.svg){.only-dark}

```md
---
name: ticket
description: Le flow issue2 comme une brique, puis le commit
input: string
nodes:
  - id: work
    flow: issue2
    input: input

  - id: message
    agent: committer
    retry: 1
    reads: [input, diff]

  - id: commit
    commit: message
---

## message
Écris le message de commit du changement sous `diff`, fait pour la demande sous `input`.
```

The rest follows the same logic. A larger model for the planner and the auditor is set in their agent files. An audit that adds nothing on a small ticket is removed by deleting its node and simplifying the loop condition. Independent steps can run in parallel, each in its own copy of the repository (`concurrency: 2` and `copies: true` on the `map`).

::: info Exercise (on your own)
Add the stop before the commit and replay the ticket. Then try a modification of your own: a different split of the roles, a larger model where you judge it useful, a flow for another type of ticket. The question to ask yourself is always the same: what gesture were you repeating by hand, and which line would write it?
:::

## Generalizing

Automating a loop requires having run it by hand or analyzing the traces closely. The flow in this module is your journal from the previous module, rewritten: each line answers a decision you made yourself, and that is why you know where to put it.

The harness is built through successive corrections. Each failure read in the trace becomes a modification to the flow.

Tests have the final say, but they only check what they constrain. A green suite does not prove the ticket is done.

A decision deserves its own channel. As long as a verdict is read out of prose, it depends on how the model writes a word like `APPROVED`. When possible, give it a tool to answer with. At the time of writing this training, new models are appearing. These are called "classification" models. They use very few tokens and can answer multiple-choice questions quite well from the prompt you give them. The most prominent one right now is [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), but you can be sure other classification models will appear in the coming months.

Human stops are design choices. Place them where an error costs more to undo than to prevent, and nowhere else. In our case, a Q&A discussion on the ticket to enrich the plan could be a good thing.

::: tip What you learned
You can say, trace in hand, why a run succeeded or not: which step did not converge, whether the suite was red, what the auditor left open. You can evolve your workflow so that it follows the way you work, and check the result yourself instead of trusting the flow's verdict.
:::

## Going further

- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), the distinction between workflows and agents, and the patterns of this module in their general form.
- [The combo documentation](https://github.com/AI-for-dev/combo/tree/main/docs), in particular the page on flows and the `build` and `build-attended` flows shipped with combo, which do more generically what this module does on a ticket.
- [herdr](https://herdr.dev), to watch a flow work, one panel per agent.
