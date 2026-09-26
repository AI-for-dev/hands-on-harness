# Workflows: the loop written in a file

::: tip Module Objectives
- Recognize workflow patterns within the loop from the previous module
- Write this loop into a file that Pi executes on its own
- Make tests the final judge, and choose where the human remains in control
- Adapt this file to your own needs in a few lines
:::

In the previous module, you were the orchestrator. You launched each agent with `/step`, reviewed the note, ran `npm test` in a second terminal, and decided, after each verdict, who took over. It is instructive once. Repeating these steps twenty times is far less so, and this is precisely the kind of repetitive task that needs to be automated.

This module writes these steps into a file. combo calls this file a **flow**: a task graph described in YAML and markdown, placed alongside your agents, and executed by code rather than a model. We will see that there is no language to learn and that your harness is modified just like any other configuration file.

As a reminder, the combo tool was written specifically for this training and may not be suitable for production use today. This may not be the case in the long run. The goal is still to allow you to experiment quickly and easily.

## Understanding

### What is a workflow?

If we take a step back from the previous module, the steps we chained together form a graph. The rectangles are the sub-agents launched by `/step` and the rounded shapes are the actions you performed yourself:

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
    V -- "rejected, code issue" --> C
    V -- "rejected, step issue" --> P
    V -- "APPROVED, final step" --> F([ticket delivered])
```

This graph breaks down into a few patterns found in most multi-agent systems. Each figure indicates in the top right how it is written in a flow. Two patterns have their own node: fan-out and loop. The other three are simply nodes placed end-to-end.

- **chain**: the planner receives the note from the explorer, the coder receives the plan.

  ![chain](/figures/workflows/chain-light.en.svg){.only-light}
  ![chain](/figures/workflows/chain-dark.en.svg){.only-dark}

- **fan-out**: the explorer and the tester read the ticket at the same time, since neither writes.

  ![fan-out](/figures/workflows/fan-out-light.en.svg){.only-light}
  ![fan-out](/figures/workflows/fan-out-dark.en.svg){.only-dark}

- **orchestrate**: the planner decides how many steps are needed, then each step is sent to the coder.

  ![orchestrate](/figures/workflows/orchestrate-light.en.svg){.only-light}
  ![orchestrate](/figures/workflows/orchestrate-dark.en.svg){.only-dark}

- **loop**: the coder and the reviewer repeat until the step is validated.

  ![loop](/figures/workflows/loop-light.en.svg){.only-light}
  ![loop](/figures/workflows/loop-dark.en.svg){.only-dark}

- **reduce**: an agent reviews the results from several branches and derives a single answer. In our loop, this is the auditor's role.

![reduce](/figures/workflows/reduce-light.en.svg){.only-light}
  ![reduce](/figures/workflows/reduce-dark.en.svg){.only-dark}

### A flow: your loop in a file

Let's look at how this works with combo on a concrete example, the explorer then planner chain:

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

The header describes the structure: the nodes, in order, and what each one reads. The body provides instructions for each agent, with a `## <id>` section per node. Each agent receives its section and the elements listed in `reads:`, nothing else. This is exactly what you were doing by manually pasting the ticket, the step, and the diff into the reviewer's message.

The entire file is validated before any model runs.

::: info Exercise (in-class)
If you haven't already, install the combo extension

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
pi
```

Add this file to `.pi/flows/impact-plan.md` and test it on issue #2. You can watch the agents evolve in herdr.
:::

### Orchestrator Automation

In the previous session, you managed the orchestration of the different steps involved in resolving a bug. We will now automate this process as follows:

| in the previous module                          | in the flow                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `/step explorer`, and testing it on the side        | a `parallel` of two agents                                                    |
| the planner returns a plan as a series of steps               | an `agent` whose output is a list of steps                                  |
| you give one step to the coder, then the next | a `map` over this list, one step at a time                                  |
| you run `npm test`                       | a `check` that runs `.pi/checks/test.sh`                                       |
| the verdict, and the return to the coder            | a `loop` until the tests pass and the reviewer approves         |
| the return to the planner                         | a second round: the auditor reviews everything and the planner replans what remains |
| `/chain` and your log                    | the `runs/<timestamp>/` directory, with the trace of each agent               |

We saw in the previous modules that it was important to perform each step of a plan separately. It is possible to ask combo to format the output. This is what we will do here by asking it to create a list of steps.

### Tests have the final word

We need a reliable step to determine if the changes made clearly meet our needs. We could ask for it in the prompt, but as you've seen, you can't be 100% certain it's actually done. We therefore prefer to define a bash script that represents the actions to take after each change. In a flow, the `check` node does exactly this by running a script from your project. Its result is a value that the loop reads: with `loop: tests.output.passed && review.output.approved`, the coder knows what to do if the generated code is wrong or does not strictly follow the development framework (a linter, for example).

![gate](/figures/workflows/gate-light.en.svg){.only-light}
![gate](/figures/workflows/gate-dark.en.svg){.only-dark}

## Rebuild

### The flow for ticket #2

Here is the full loop from the previous module. It uses your six agents without modifying them.

```md
---
name: issue2
description: Le tour de boucle du module précédent, de la note d'impact à l'audit
input: string
timeout: 15m

nodes:
  # Les deux lectures du ticket, en même temps : aucune des deux n'écrit.
  - id: survey
    parallel:
      impact:
        - id: note
          agent: explorer
          retry: 1
          reads: [input]
      cases:
        - id: cases
          agent: tester
          retry: 1
          reads: [input]

  # Le retour au planner : un second tour replanifie ce que l'audit a laissé ouvert.
  - id: round
    loop: suite.output.passed && audit.output.approved
    max: 2
    ledger: round
    do:
      - id: plan
        agent: planner
        retry: 1
        reads: [input, survey.output.impact.output, survey.output.cases.output, round.ledger]
        output: { steps: [{ text: string }] }

      # Un pas après l'autre, dans le même arbre.
      - id: steps
        map-from: plan.output.steps
        max: 6
        do:
          # Le retour au coder : jusqu'à trois essais par pas.
          - id: step
            loop: tests.output.passed && review.output.approved
            max: 3
            ledger: step
            on-fail: continue
            do:
              - id: code
                agent: coder
                retry: 1
                memory: step
                reads: [input, item.text, step.previous.tests, step.previous.review, step.ledger]

              - id: tests
                check: .pi/checks/test.sh

              - id: review
                agent: reviewer
                retry: 1
                memory: step
                verdict: step
                reads: [input, item.text, code, diff, tests]

      - id: suite
        check: .pi/checks/test.sh

      - id: audit
        agent: auditor
        retry: 1
        verdict: round
        reads: [input, steps, suite, diff, round.ledger]
---

## note
Rends la note d'impact du ticket désigné sous `input`.

## cases
Liste les cas de test dont le ticket désigné sous `input` a besoin, en disant
lesquels existent déjà. Commence par les comportements que l'extraction ne
doit pas changer.

## plan
Découpe le ticket désigné sous `input` en petits pas, avec la note d'impact et
le plan de tests comme carte. `remark` porte la remarque de la personne qui a
lancé le run, vide si elle n'en a pas fait. Quand `round.ledger` n'est pas
vide, c'est un second tour : ne planifie que ce que l'audit a soulevé et que
personne n'a fermé.

Le contrat est celui du ticket, pas le tien :

- la nouvelle fonction est `brickHit(ball, bricks)`, exportée de `game/neon.js` ;
- elle est pure : elle rend le tableau de toutes les briques vivantes que la
  balle chevauche, et ne modifie rien ;
- `frame()` se comporte exactement comme avant, y compris quand la balle
  chevauche plusieurs briques : chacune meurt dans la même frame, avec un
  incrément de combo chacune. Ce comportement est épinglé par un test avant de
  déplacer la logique, avec une balle de rayon 7 centrée dans l'espace entre
  deux briques voisines.

Le coder ne voit que le texte de son pas : nomme les fichiers, redis la partie
du contrat que le pas touche, et dis à quoi ressemble « fini ». Chaque pas
commence par son test rouge, écrit dans `game/neon.test.js`, et finit sur une
suite verte : le test rouge et le code qui le fait passer vont dans le même
pas, jamais dans deux.

## code
Exécute le pas décrit sous `item.text`, et lui seul.

Quand `step.previous.review` suit, le reviewer n'a pas approuvé ton dernier
changement : traite chaque remarque et chaque obligation de `step.ledger`, ou
dis clairement pourquoi tu ne le fais pas. `step.previous.tests` donne la
sortie de la suite après ce changement.

## review
Relis le changement fait pour le pas décrit sous `item.text`. Le rapport du
coder est sous `code`, le changement sous `diff`, la sortie de la suite sous
`tests`. Le rapport est une affirmation, le diff et le code sont la preuve.
Approuve, ou soulève ce qui doit encore changer.

## audit
Relis tout le changement sous `diff` contre le ticket désigné sous `input`.
`steps` dit comment la relecture de chaque pas s'est terminée : un pas qui n'a
pas convergé n'est pas fait tant que le code ne le montre pas. `suite` dit si
les tests du projet passent. `round.ledger` porte ce qu'un audit précédent a
soulevé et que personne n'a fermé.

Approuve le tout, ou soulève chaque correction sur sa propre ligne.
```

A few remarks on this flow

- The steps follow one another in the same tree, like your `/step`.
- Three attempts per step and two rounds at most. A ceiling is mandatory for each loop: without it, a model that never converges would run until the budget is exhausted. If your flow fails upon reaching this limit, combo will tell you.
- The ticket contract is written in the planner section to ensure that user requests are included. The exploration phase can overshadow them.
- `retry: 1` on each agent. During the first real run of this flow, the planner wrote a very good plan, but in free text, without using the intended tool, and the run stopped. A second attempt, with the named error, was sufficient.
- Each step ends with a green suite. Another run scheduled a "write red tests" step on its own, without the code. The loop requires a green suite, so this step could not succeed and it burned through its three attempts. When a loop does not converge, first check if its condition was reachable.

Two roles are added here. The tester (`scripts/agents/tester.md`) makes it possible to verify if tests exist and if more need to be added. The auditor (`scripts/agents/auditor.md`) ensures that the work is completed as a whole and that nothing has been forgotten, whereas the reviewer only sees one step. Whatever the auditor raises remains open until it has been addressed, and the flow starts a second round.

::: warning A point on these choices
We remind you that the goal of this training is to give you all the elements to build your harness. The choices made here are therefore debatable and perhaps not optimal for achieving the best results. But you have all the understanding required to remove nodes, add them, or modify them.
:::

::: info Exercise (in class)
Place the agents, the flow, and the test script into your NÉON clone:

```bash
cd /chemin/vers/neon
mkdir -p .pi/agents .pi/flows .pi/checks
cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
# Collez le flow ci-dessus dans .pi/flows/issue2.md
printf '#!/usr/bin/env bash\nnpm test\n' > .pi/checks/test.sh

printf '.pi/\nruns/\n' >> .gitignore
git add .gitignore && git commit -m "ignorer .pi et runs"

pi install -l git:github.com/AI-for-dev/combo
pi
```

On the first launch, Pi asks if you trust the project folder: without this, it loads neither `.pi/` nor combo. Choose "Trust".

Check what Pi has loaded before launching anything:

```prompt
/flows
/flows issue2
```

The first command lists the flows found, the second displays the `issue2` plan node by node. Then intentionally break the file by replacing `agent: coder` with `agent: codeur`, run `/flows` again, and read the refusal: it names the node and suggests the correct name. Put back `coder`, then start the loop:

```prompt
/run issue2 traite le ticket #2 d'ISSUES.md
```

Pi draws the flow above the prompt as it progresses. The remark card appears after the impact note; then, everything you used to do by hand happens automatically.

At the end, perform your own checks, those from the previous module: `npm test`, the list of exports, `git diff`, and the trace in `runs/<timestamp>/`. Do not rely solely on the flow's verdict.
:::

An interrupted run resumes with `/run resume`, from where it stopped.

### Adapting the harness to your needs

This flow is a starting point. Each subsequent modification only takes a few lines, and `/flows issue2` tells you if it is valid before any launch.

The flow stops at the audit and you are the one committing. To have it suggest the commit, add a question, a branch, and the commit at the end:

![arrêt humain](/figures/workflows/human-stop-light.en.svg){.only-light}
![arrêt humain](/figures/workflows/human-stop-dark.en.svg){.only-dark}

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

Add a `## message` section that tells the committer what to write. The `committer` is provided with combo, the commit goes to a branch specific to the run, and nothing is pushed. With `default: false`, a run with no one at the screen will not commit.

A working flow also becomes a building block. A `flow` node calls another entire flow: your `issue2` can be used in a larger flow without being copied.

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

The rest follows the same logic. A larger model for the planner and the auditor is configured in their agent files. An audit that adds nothing to a small ticket can be removed by deleting its node and simplifying the loop condition. Independent steps can run in parallel, each in its own copy of the repository (`concurrency: 2` and `copies: true` on the `map`).

::: info Exercise (self-guided)
Add the stop before the commit and rerun the ticket. Then try a modification of your own: a different breakdown of roles, a larger model where judgment is required, or a flow for another type of ticket. The question to ask yourself is always the same: what manual step were you repeating, and what line of code would automate it?
:::

### And the measurement? (To be done with trysquare)


## Generalizing

Automating a loop requires having performed it manually or finely analyzing the traces. The flow in this module is a rewrite of your log from the previous module: each line corresponds to a decision you made yourself, which is why you know where to place it.

The harness is built through successive corrections. Every failure read in the trace becomes a modification to the flow.

Tests have the final say but only verify what they constrain. A green suite does not prove that the ticket is completed.

A decision deserves its own channel. As long as a verdict is read as prose, it depends on how the model writes a word such as `APPROVED`. Whenever possible, give it a tool to respond. You can use https://laya.convaiinnovations.com/, which allows for much finer decisions than a classic LLM.

Human stops are design choices. Place them where an error is more expensive to undo than to prevent, and nowhere else. In our case, a Q&A discussion on the ticket to enrich the plan could be a good addition.

## Deliverable

This module produces three pieces.

1. Your `.pi/flows/issue2.md` flow and the `.pi/checks/test.sh` script, versioned with your agents, in the version you adapted.
2. The trace of a complete run, the `runs/<timestamp>/` directory of a `/run issue2` on ticket #2.
3. The "workflows" line of the decision sheet, below.

::: tip Success criterion
You can say, trace in hand, why a run succeeded or not: which step did not converge, if the rest was red, what the auditor left open. You can evolve your workflow to try and obtain a harness that follows your way of working and be confident in the result.
:::


## Further reading

- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), the distinction between workflows / agents and the patterns of this module in their general form.
- [The combo documentation](https://github.com/AI-for-dev/combo/tree/main/docs), particularly the page on flows and the `build` and `build-attended` flows delivered with combo, which do in a more generic way what this module does on a ticket.
- [herdr](https://herdr.dev), to watch a flow working, one pane per agent.
