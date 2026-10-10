# The context levers, measured

::: tip Objectives of this module
- Measure with trysquare the effect of each lever from [module 2.1](./act2-contexte) on the same task
- Read a matrix of twenty repetitions and keep only the established gaps
- Check the retry count and the reasons behind the metrics before citing a table
- Leave with a reasoned decision on each lever
:::

[Module 2.1](./act2-contexte) had you handle by hand the levers that fill the context window: the model, the reasoning effort, the prompt, `AGENTS.md`, and the system prompt. Each manipulation fit into one or two runs, which is enough to see what a lever changes within the session and leaves open the question of whether that change reproduces. This module takes the same task, NÉON issue #1, and measures the same levers with [trysquare](https://github.com/AI-for-dev/trysquare), whose operation and table reading are described in [module 3.0](./act3-trysquare).

## The experiment

### What counts as success

The setting is that of [module 2.1](./act2-contexte): the agent only modifies `game/neon.js` and `game/neon.test.js`, it runs the tests to check that it broke nothing, and it adds tests since the suite does not cover the ball bouncing off bricks. Here is what we measure on each run:


| metric               | what it says                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`          | the agent modified at least one file                                                          |
| `in_scope`           | it touched only `game/neon.js` and `game/neon.test.js`                                        |
| `suite_lancee`       | it ran `npm test` itself, read from its session                                               |
| `tests_ajoutes`      | the suite has more cases than the baseline                                                    |
| **`rebond_briques`** | **the criterion**: on each of the four faces, the axis hit reverses and the other does not move |
| `rebond_angles`      | in the corner, both components invert                                                         |
| `rebond_sortie`      | after the bounce, the ball has exited the brick's rectangle                                   |
| `rebond_voisines`    | on a grid seam, the bounce applies once and not twice                                         |
| `rebond_traversee`   | a fast ball no longer crosses the brick without touching it                                   |

We test all of these points deterministically, without LLM-as-a-judge: the tests we'd need are written in a probe file. An executable test is safer than an LLM tasked with confirming a desired behavior, whose probabilistic verdict can make you believe it's good when it isn't.

### The experiment plan

The plan we settled on is the simplest one that stays readable: a **base**, then a set of variants, each changing little.

The base, called `nothing`, reproduces what someone does on their first day: the neglected request from your first attempts in [module 2.1](./act2-contexte), no rules file, the agent's system prompt and reasoning turned off. Each other configuration adds one element to see its effect on the response.

| configuration                    | what changes                                                       |
| -------------------------------- | ------------------------------------------------------------------ |
| `nothing`                        | nothing, this is the reference                                     |
| `+thinking`                      | `thinking = "high"`                                                |
| `+agents`                        | `briques/AGENTS.md` is placed in the clone                         |
| `+well_crafted`                  | the prompt cleanly describes the problem and refers to `ISSUES.md` |
| `-system_prompt`                 | the system prompt is replaced by three lines                       |
| `+agents+well_crafted`           | `AGENTS.md` + well-written prompt                                  |
| `+agents+add_tests+well_crafted` | here we additionally add the tests we want to see pass             |

One experiment fits in one file: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

The experiment directory contains other configurations than those in the table above; they belong to other modules, and we'll discuss them later.

The well-written prompt doesn't copy the content of the ticket. `ISSUES.md` already describes how to fix the bug, in the repo the agent has at hand. The prompt therefore names the issue, the scope and the stopping criterion, and nothing more:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

This configuration therefore measures whether pointing at a written document is enough for the agent to go read it and take it into account. If the prompt copied the solution, we'd only measure the agent's ability to follow an instruction we just gave it.

### The validation tests

To judge the quality of the results, the scenario declares validation tests:

- **delivered**: the run went through to the end, without interruption.
- **suite_lancee**: the agent remembered to run the tests located in the `game` directory.
- **in_scope**: the agent only modified the files it was asked to modify, and only the lines that correspond to the problem.
- **tests_ajoutes**: the agent remembered to add tests on the ball bouncing off the bricks.
- **`sonde.test.js`**: at the end of the run, this probe checks that the code changes fix the problem as a whole, as described in `ISSUES.md`. It is also placed there from the start in the `+add_tests` configuration, to see whether the agent is able to fix its mistakes based on the tests.

Each run leaves in its directory the agent session, the diff and the validation output, described in [module 3.0](./act3-trysquare). That is where to go read when a column surprises you.

::: info Exercise (in the room, then on your own)
Move into the [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) repository installed in [module 3.0](./act3-trysquare), where you already looked at this scenario's plan with `--dry-run`.

Run the matrix with three repetitions and let it run while you discuss the sliders:

```bash
uv run trysquare run scenarios/issue1-contexte.toml --output results --repetitions 3
```

You have a set of subcommands that do not launch any models and are mainly used to analyse the results:

```bash
# refabriquer les tables
uv run trysquare render scenarios/issue1-contexte.toml --output results --repetitions 3
# renoter sans rejouer
uv run trysquare replay results/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
uv run trysquare compare results/... results/...
```

**On your own**, copy `scenarios/issue1-contexte.toml`, change one configuration, and run again. You will not have touched the tool, the validation, or the other configurations, and it is the only artefact of this module that will not go stale.
:::

## What our measurements say

You must have noticed it during your first tries with `trysquare`: taking measurements takes time. For about twenty repetitions, you will need between 2 h and 3 h to get the full set of results, skill configurations included. So we preferred to give you a complete campaign run beforehand, in which you can browse each run's directories as you did earlier.

Here is what we got in August 2026, on `ilaas` and `gemma-4-31b`, against commit `d62ccd1f` of NÉON, with **twenty repetitions per configuration**. The two skill configurations are in the archive and belong to the [module on skills](./act2-skill); they are left out of the tables below, except for a remark at the end.

| configuration                    | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

And the probe columns, with the criterion at the head:

| configuration                    | `briques` | `angles`  | `sortie`  | `voisines` | `traversée` |
| -------------------------------- | --------- | --------- | --------- | ---------- | ----------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20       | 0/20        |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20      | 0/20        |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20       | 0/20        |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20      | 4/20        |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20      | 0/20        |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20       | 12/20       |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20**  | 17/20       |

The denominators for `+well_crafted` and `+thinking` are 18 and 19 in the cost columns, because ILaaS returned `Request timed out` during the measurement and the runs in question produced nothing.

We draw five lessons from these two tables. All the gaps cited below come from the intervals described in [module 3.0](./act3-trysquare), with the same mark `*` for an established gap and `o` for an inconclusive gap. Gaps are computed against a reference configuration, the first one in the scenario (here `nothing`) when you don't specify another. Redoing the calculations against another reference only changes this pointer, without calling the model or re-measuring anything.

```bash
uv run trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

The output goes into a `synthesis_ref-<référence>.md` next to the usual synthesis, which is not touched.

**The framed prompt makes the agent do everything the ticket names, and nothing more.** `tests_ajoutes` goes from 0/20 to 17/20 and `rebond_angles` from 0/20 to 14/20, two columns that were empty and that fill up. The prompt says nothing about the bounce mechanism, though: it names the outcome, the scope and the stopping criterion, and it is `ISSUES.md` that describes the corner, the exit from the rectangle, the neighbouring bricks and the tunneling. The corner stays at **0/20 in the four configurations that do not frame the ticket**, that is eighty consecutive runs. Pointing at a written document is therefore enough for it to be read, and it is the content of that document that decides what will be handled.

**The rules file only moves the procedure, and it no longer moves anything as soon as the ticket is correct.** `+agents` takes `suite_lancee` from 0/20 to 20/20, because one of its four lines names the command. On the criterion, it gives 9/20 against 11/20 for the baseline, an inconclusive gap, and on `tests_ajoutes` it stays at 0/20 since none of its lines talks about tests. Added on top of the framed prompt, it brings **strictly nothing**: 11/20 against 13/20 on the criterion, 12/20 against 14/20 on the corner, 17/20 against 17/20 on the added tests, none of these three gaps being distinguishable. The rules file is a substitute for a good ticket rather than a complement to it, which gives a writing rule directly applicable to the forty-line budget: a line that a correct ticket would say anyway is a line to remove.

**Reasoning moves the criterion, and on its own does not make the ticket get read.** `+thinking` gives 16/20 on `rebond_briques`, a gap of +29 points whose interval excludes zero. It is the only lever in the matrix, apart from those that touch the ticket, to move correctness itself. Its corner column stays at 0/20 and its added tests at 3/20: reasoning improves what the model does with what it has in front of it, but does not lead it to go and fetch what it is missing.

**The framed prompt makes the agent write the red tests, and one run in five stops there.** The `touched` column says it unambiguously: on `+well_crafted` and `+agents+well_crafted`, four runs out of twenty never open `game/neon.js`, of which two or three write only in `game/neon.test.js` and one or two deliver nothing at all. No other configuration shows this behavior, `nothing`, `+agents` and `-system_prompt` touching the source in twenty runs out of twenty. The explanation is in the ticket, which lists five sub-cases and ends with "each case above added **first as a red test**, then green": `gemma-4-31b` writes the reds and stops there, for lack of being able to process the whole specification. This is also why the correctness criterion does not rise while the corner does: the model has a work budget, and describing more work in the ticket does not enlarge it.

**Adding the tests fixes this dropout.** The configuration `+agents+add_tests+well_crafted` is read against `+agents+well_crafted`, the only one it differs from by just the probe placed in the tree:

| column            | `+agents+well_crafted` | `+add_tests` | gap                    |
| ----------------- | ---------------------- | ------------ | ---------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | not applicable         | **20/20**    |                        |

The four columns of the correction rise, and the four gaps are established. So the lever does more than win edge cases, it also recovers the criterion itself. Note the width of the intervals, and in particular the one for the corner that starts at a single point: these gaps are established in the sense that they are positive, without their size being given to better than a factor of fifty.

`sonde_intacte` is 20/20, which means the model did not try to change the reference tests. And `tests_ajoutes` does not move, which is consistent with an agent that already has the cases in front of it and has no reason to rewrite them.

::: warning No gemma cost column is quotable here
The matrix counts 1,151 retries, that is, turns re-run because the provider had failed, and the box further down shows how concentrated they are on the heaviest configurations. A retry replays the turn with all the accumulated context, so it inflates the cost columns, and above all, it re-drives the agent.

The same scenario measured on `opencode-go` and `deepseek-v4-flash` counts **37**, which makes its own readable:

| configuration                    | turns | duration |
| -------------------------------- | ----- | -------- |
| `nothing`                        | 19    | 163 s    |
| `+agents`                        | 12    | 65 s     |
| `-system_prompt`                 | 17    | 142 s    |
| `+well_crafted`                  | 15    | 252 s    |
| `+thinking`                      | 19    | 490 s    |
| `+agents+well_crafted`           | 14    | 561 s    |
| `+agents+add_tests+well_crafted` | 13    | 410 s    |

The input tokens of the two matrices cannot go in the same table, for a reason that has nothing to do with the model: ILaaS reports no cache, `cacheRead` being zero over its one hundred and eighty runs, so its input column is the sum of the full prefixes re-read at every turn. opencode Zen reports the cache, up to five million tokens read in a single run. The same configuration therefore shows 558,000 input tokens on one side and 15,000 on the other, without either being wrong. This is the practical half of what [module 2.1](./act2-contexte) explains about the cache: the cost of inputs depends on the model provider's configuration, and enabling the cache cuts the bill drastically.
:::

### Three checks before quoting a table

A matrix publishes tables, intervals, and verdicts, which can give the impression of solid conclusions. Still, while building this training, we ran into several phenomena that can discredit some results.

::: warning The retry count
A retry is a turn the tool had to relaunch because the provider had failed. It replays that turn with all the accumulated context, so it inflates the cost columns, and above all it re-drives the agent: it is no longer the same working behaviour.

On the `gemma-4-31b` matrix, the count is **1,151**, and it is not spread evenly:

| configuration                    | retries |
| -------------------------------- | ------- |
| `nothing`                        | 1       |
| `+agents`                        | 2       |
| `-system_prompt`                 | 1       |
| `+well_crafted`                  | 24      |
| `+thinking`                      | 81      |
| `+agents+well_crafted`           | 205     |
| `+agents+add_tests+well_crafted` | 205     |
| `+agents+add_tests+skill`        | 287     |
| `+agents+skill`                  | 345     |

Nothing on the short-context configurations, everything on the high-reasoning ones, and all the more so as the accumulated context grows: a single run of `+agents+add_tests+well_crafted` consumed 2.4 million input tokens over sixty-three turns and accumulated eighteen retries. The same scenario measured on `opencode-go` and `deepseek-v4-flash` counts **thirty-seven** in total.
:::

::: warning The importance of the validation test
A uniformly black column looks like agent behaviour and can be a flaw in the validation. The only way to tell them apart is for the metric to say **why** it answered false, and not only that it answered false.

Our validation test does this for `suite_lancee`: when it recognizes no launch of the suite, it copies into its reason every command the agent ran. This precaution matters, because the shape of the command varies far more from one model to another than the command itself. `deepseek-v4-flash` prefixes each call with the working directory (`cd .../repo && npm test`, 664 times across the matrix) and readily redirects the output (`npm test 2>&1 | tail -30`, 80 times), whereas `gemma-4-31b` types bare `npm test`. A validation test that knew only the latter shape would score the former model at zero across the whole matrix.

In closing, **write your metrics carefully and test them on a test set**. They have to be reliable. Note any strange behavior before drawing hasty conclusions.
:::

::: warning What comparing the two models lets you say, and what it does not
The two matrices (`gemma-4-31b` and `deepseek-v4-flash`) cover the same scenario, the same nine configurations and the same NÉON commit, so their score columns can be read against each other. The model and the provider changed together, which rules out attributing a gap to one rather than the other, and still shows this in the corner column:

| configuration          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Both models respond to the same lever and in the same direction, the more capable one starting higher and climbing higher.
:::

These figures are not meant to be taken on faith or copied a year from now. Rerun the matrix: that is precisely what it is for, and the one you get will replace this one.

Well-maintained context makes the agent disciplined and complete on what the ticket names, without making it exhaustive: the corner of the brick is never reached where the ticket does not describe it, and tunneling remains the lowest column of all those the probe measures. Going beyond what the written material contains will require an independent reviewer and a verification loop, which is the subject of the modules on delegation and workflows.

::: warning Three tempting conclusions the intervals do not allow
Each of the following sentences rests on an exact figure from the campaign published on this page, and none of them holds.

**"The rules file breaks correctness."** `+agents` gives 9/20 on the criterion against 11/20 at baseline. The gap is -10 points but its interval contains zero: we can say nothing about it, in either direction.

**"Removing the system prompt improves rebound."** `-system_prompt` gives 14/20 against 11/20, i.e. +15 points, and the interval contains zero there too. With only three lucky runs, we would have gotten 3/3 against 1/3 and we could have believed it for good.

**"The well-framed prompt fixes the bug better."** `+well_crafted` gives +17 points on the criterion, not conclusive. The real effect of this lever shows up elsewhere, on the added tests and on the corner, where the gaps count in tens of points and leave no doubt.

Repeating three times is therefore not enough: an effect that does not exceed the dispersion of its own configuration is not an effect. And an effect established on this task, with this ticket and this model, is established only within that scope.
:::

## The stack versus the baseline

The levers of this module demand attention and time, whereas a more capable model is obtained simply by paying more. It is therefore legitimate to ask whether it is more profitable to take care of your context or to change model. The second half of this question is not measured here, for the reason given in the box on the comparison of the two models: the model and the provider change together there. The first half is, with the model held constant, by putting the two extreme configurations of the matrix face to face.

::: info Exercise (in class)
Compare the `nothing` configuration, which receives a one-line request and nothing else, and the `+agents+add_tests+well_crafted` configuration, which has the reasoning, the well-framed ticket, the `AGENTS.md` and the probe deposited in the tree. Look first at the diffs, then at the probe columns, then only at the end at what each one cost.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, gap +35 points        |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| median turns       | 19        | 13                               |
| median duration    | 163 s     | 410 s                            |

The last two lines are taken from the `deepseek-v4-flash` matrix, whose thirty-seven repeats make the cost columns readable, and the score columns from `gemma-4-31b`.

The full harness reaches eighteen out of twenty on a criterion where the base tops out at eleven, and the harshest column of the probe goes from 7/20 to 18/20. This is Addy Osmani's thesis, *"a decent model with a great harness beats a great model with a bad harness"*, verified on its easiest half to establish: at a rigorously constant model, the harness alone makes the difference between a fix that works one time in two and a fix that works nine times in ten.

The corner goes from 0/20 to 18/20, and the framed prompt alone already obtained fourteen: the bulk of the gain comes from the fact that the prompt references a ticket in `ISSUES.md` that names the case, and the probe adds on top the perseverance that was missing to finish the job.

## What this module does not know how to obtain

The only lever that led the model to address everything the ticket asks for is the one that put the tests in front of it. This configuration has something artificial about it, however: the edge cases were written in advance, by us, in the very file that grades. On a real ticket, no one will provide them to you.

What this configuration actually brings is perseverance. The model gives up on a long ticket because it exhausts its budget formulating the cases instead of fixing them; receiving the cases already formulated gives it back that budget. The question the [module on skills](./act2-skill) raises is therefore whether a **skill**, that is, a work procedure written once and reloaded on demand, can produce the same perseverance without providing the tests.

## Generalizing

The principles that follow concern the levers themselves, those that concern the measurement method being gathered in [module 3.0](./act3-trysquare).

**Pointing to a written document is enough for it to be read, and what is written in it decides the outcome.** Our framed ticket does not describe the rebound mechanism: it names the issue, the scope and the stopping criterion. Seventeen runs out of twenty went to read `ISSUES.md`, found there the request for edge cases as red tests, and executed it, where the neglected request had obtained none. The corner of the brick gives the sharpest version: it is described in `ISSUES.md` and in none of our prompts, and it scores 0/20 in the four configurations that do not name the issue against 14/20 in the one that names it. Write what you expect in a document you can point to, and re-read that document before concluding anything about the agent.

**A model has a budget, and describing more work does not enlarge it.** Our ticket lists five sub-cases and asks for a red test for each; four runs out of twenty write those red tests and never open the source file. This observation shapes what follows: either you reduce the request to what the model can carry, or you give it what it needs to go the distance, which is the subject of the [module on skills](./act2-skill).

**The rules file changes what the agent does, not what it finds, and it only applies to what the ticket does not say.** It enters the context at every turn, which makes it both a strong lever and a costly one, hence the value of keeping it short, sourcing each rule from an observed failure, and refactoring it rather than making it longer. Our measurements pin down exactly what it buys: the `+agents` configuration takes the number of runs that launch the test suite from 0/20 to 20/20, leaves the correctness criterion unchanged, and adds nothing at all once the framed prompt is there. The writing rule that follows applies directly to the forty-line budget: a line that a correct ticket would say anyway is a line to remove.

## Deliverable

This module produces two pieces, and the second will serve act 4.

**1. The matrix directory** produced by `trysquare run`, with its log line. The deliverable is not a copied table but the archive that allows rebuilding it: the raw measurements, the sessions, the diffs, and the revision of the tool that measured. Without that archive, the matrix can be neither verified nor re-scored, and its numbers are worth no more than an opinion.

**2. The decision sheet**, one line per lever:

| lever                      | measured effect | adopted? | why |
| -------------------------- | --------------- | -------- | --- |
| model choice               |                 |          |     |
| reasoning effort           |                 |          |     |
| framed ticket              |                 |          |     |
| content of the pointed ticket |              |          |     |
| `AGENTS.md`                |                 |          |     |
| system prompt              |                 |          |     |
| tests provided in advance  |                 |          |     |
| scheduling / cache         |                 |          |     |
| compaction                 |                 |          |     |
| executable criterion (probe) |               |          |     |

Two lines were added to this sheet after our latest measurements. "Content of the pointed ticket" appears there because rewriting `ISSUES.md` moved more columns than any harness setting, and "tests provided in advance" because it is the only lever that caught the model's drop-off on a long ticket.

This sheet is the first real filling of the "your harness?" column of the correspondence table, for the "context" row. The following modules will do the same for their building block, so you will approach the capstone with a table already filled in by your experiments.

::: tip Success criterion
You can name a lever you measured as having no effect on NÉON, and say under what precise condition it would have one elsewhere.

Notre exemple est `AGENTS.md` : il ne déplace pas d'un point le critère de correction, et il deviendrait décisif sur un ticket dont l'échec habituel est de procédé plutôt que de raisonnement, ou sur un dépôt dont les tickets sont mal écrits. Le vôtre sera différent, et c'est le but. Ce critère demande d'avoir vu les chiffres et d'avoir compris que c'est la tâche et son matériau qui les déterminent. Il ne peut donc pas être satisfait de mémoire.
:::

## Going further

- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), whose thesis is the one that the comparison of the stack to the base puts to the test.
- [trysquare](https://github.com/AI-for-dev/trysquare), the measurement tool used in this module, and its [documentation](https://ai-for-dev.github.io/trysquare/).
- The training's trysquare campaign, `scripts/trysquare-campaign/`, with its hypotheses written before measurement and its archived matrices. This is the only place where the numbers on this page can be verified.
