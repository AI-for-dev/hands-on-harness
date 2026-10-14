# The context levers, measured

::: tip Objectives for this module
- Know which context levers the `issue1-context` matrix varies
- Read the results of three models on the same task, with twenty repetitions per configuration
- Check the state of a campaign before citing its numbers
- Tell apart what depends on the lever from what depends on the model
:::

In [module 2.1](./act2-contexte), you manipulated by hand the levers that fill the context window: the prompt, the reasoning, the files the agent finds in the repository. One or two runs were enough to see what a lever changes in the session, but not to know whether that change reproduces. [Module 3.0](./act3-trysquare) then introduced [trysquare](https://github.com/AI-for-dev/trysquare), which repeats each configuration and says whether a difference is down to the randomness of sampling.

This module puts the two together. We take up issue #1 of NÉON, cross four levers, and run the full matrix on three models. The question is twofold: which levers really change the result, and is the answer the same from one model to another?

## The experiment

### The task

Issue #1 is the one you know: the ball passes through the bricks instead of bouncing.

The `BUG (#1)` comment in `game/neon.js` describes the basic fix: make the ball bounce according to the face hit, then push it out of the brick's rectangle. `ISSUES.md` takes up this fix and adds everything else: the brick corner, the junction between two neighbouring bricks, the tunneling of a fast ball, and the request to write the red tests first. An agent that has not read `ISSUES.md` therefore has no reason to handle the corners, and that difference explains most of the results that follow.

### What counts as success

Each run is scored without LLM-as-a-judge. A probe, `probe.test.js`, is dropped at the end into a copy of the agent's tree: it places a ball against a brick, calls `frame()`, and looks at which velocity component reverses. The other metrics are read from the session or from the diff.

| metric                 | what it says                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `delivered`            | the agent modified at least one file                                                  |
| `suite_run`            | it ran `npm test` itself                                                              |
| `tests_added`          | the suite counts more cases than at the start                                         |
| `probe_intact`         | when given the probe, it did not modify it                                            |
| **`bounce_bricks`**    | **the criterion**: on each of the four faces, the touched axis flips and the other does not |
| `bounce_corners`       | in the corner, both components flip                                                   |
| `bounce_exit`          | after the bounce, the ball has left the brick's rectangle                             |
| `bounce_neighbors`     | at the junction of two bricks, the bounce applies only once                           |
| `bounce_tunneling`     | a fast ball no longer crosses the brick without touching it                           |

In what follows, we focus on four columns: the criterion, the corner, tunneling and the added tests. `bounce_exit` and `bounce_neighbors` closely follow the criterion and add little more here.

### The four levers

We kept four levers, each with two values:

| lever        | without                                       | with                                                                      |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------- |
| the ticket   | `nothing`: the neglected request              | `well_crafted`: a ticket that links to the issue and sets the scope       |
| `blind`      | `no-blind`: the repo as is                    | `blind`: neither git history nor `ISSUES.md`                              |
| reasoning    | `off`                                         | `thinking_medium`                                                         |
| `add_tests`  | `no-add_tests`                                | `add_tests`: the probe is placed in `game/probe.test.js` from the start   |

The neglected request fits in one line:

```
The ball goes through the bricks instead of bouncing. Fix that.
```

The well-crafted ticket does not copy `ISSUES.md`. It says where the description is, asks to think about the different possible interactions, and sets the scope and the stopping criterion:

```
The ball goes through the bricks instead of bouncing. The problem and the
expected behaviour are described in `ISSUE.md`, under issue #1. Read the code
carefully and think about the different interactions the ball can have with
the bricks. The behaviour must be worthy of the best arcade games. Only modify
`game/neon.js` and `game/neon.test.js`. You are done when `npm test` passes and
the already exported functions have kept their name and their signature.
```

`blind` removes the git history and deletes `ISSUES.md` before the agent starts. All that remains then is the code comment. `add_tests` gives the agent the very file that grades it, which amounts to handing it the tests we would like to see pass.

A four-line `AGENTS.md` file (one ticket at a time, don't rename exports, zero dependencies, run the tests with `npm test`) is present in every configuration. So it isn't a lever in this matrix.

The four levers are crossed, giving 2 × 2 × 2 × 2 = 16 configurations. Each is repeated twenty times, so 320 runs per model. In the scenario, this plan fits in a few lines:

```toml
[presets]
well_crafted = { prompt = "../materials/issue1-well-crafted-prompt.md" }
add_tests = { harness = ["provided-probe"] }
blind = { history = false, setup = "../materials/remove-issues-md.sh" }
thinking_medium = { thinking = "medium" }

[axes]
lever = ["nothing", "well_crafted"]
blind = ["no-blind", "blind"]
thinking = ["off", "thinking_medium"]
add_tests = ["no-add_tests", "add_tests"]
```

::: warning Notes
We wanted to clarify a few points that could look like mistakes but are intentional.

1. The well-written ticket points to `ISSUE.md`, while the file is named `ISSUES.md`. That's deliberate: we want to see whether the model searches or stops there and doesn't use the file.
2. In `blind`, it points to a file that no longer exists, which shows how curious the model is:
   - looking at neighbouring directories
   - trying to recover the git history that was reset
   - ...
    and at what point it gives up.
3. `add_tests` gives the agent the file that grades it. The idea is to see how the results change when the tests are already there. You can see this as [TDD](https://en.wikipedia.org/wiki/Test-driven_development) development.
4. `thinking_medium` doesn't map to the same setting from one model to the next (see the model table).
:::

### The models

The three models are served by two providers, ILaaS and GRICAD:

| model                 | provider    | what `thinking_medium` means                   | output cap    |
| --------------------- | ----------- | ---------------------------------------------- | ------------- |
| `gemma-4-31b`         | ILaaS       | `reasoning_effort = on`                        | 16 384 tokens |
| `qwen-3.8-27b`        | ILaaS/GRICAD      | `reasoning_effort = medium`                    | 32 768 tokens |
| `DeepSeek-V4.1-Flash` | GRICAD      | `reasoning_effort = medium`                    | 32 768 tokens |

The three campaigns were run on 13 and 14 October 2026, against NÉON's `etalon-v1` tag, with a 30-minute timeout per run. Model and provider change together from one column to the next: a gap between two models can come from either.

::: info Exercise (in class, then on your own)
Go into the [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter) repository installed in [module 3.0](./act3-trysquare). Open `scenarios/issue1-context.toml`, adapt the `[agent]` section to the provider you use, then run the matrix with three repetitions:

```bash
uv run trysquare run scenarios/issue1-context.toml --output results --repetitions 3
```

That's 48 runs, which you can leave running during the rest of the module. The following subcommands don't call the model and are used to analyse the results:

```bash
# refabriquer les tables
uv run trysquare render scenarios/issue1-context.toml --output results --repetitions 3
# renoter sans rejouer
uv run trysquare replay results/issue1-context_... --scenario scenarios/issue1-context.toml --rescore
# joindre deux matrices
uv run trysquare compare results/... results/...
```

**On your own**, change the model in `[agent]` and compare your matrix with ours.
:::

## Can we trust the campaigns?

Before looking at a single score, you need to check that the runs went smoothly. The [3.0 module](./act3-trysquare) showed it: an incident at the provider or a flaw in the validation is easily read as agent behaviour.

|                                         | gemma   | qwen    | DeepSeek |
| --------------------------------------- | ------- | ------- | -------- |
| runs with no file modified               | 3       | 18      | 1        |
| runs stopped by the timeout              | 25      | 181     | 1        |
| retries on the provider side             | 974     | 9       | 0        |
| probe left intact (`add_tests` cells)    | 160/160 | 158/160 | 160/160 |
| median output throughput                 | 21 tokens/s | 8 tokens/s | 49 tokens/s |

DeepSeek is clean: no retries, a single run cut off by the timeout.

gemma is usable, but ILaaS was unstable during the measurement: more than 1,200 `Stream ended without finish_reason` errors, absorbed by 974 retries. A retry replays the turn with all the accumulated context, so gemma's cost columns are not readable. The 25 timeouts are scored on a partial tree and cluster on the cells with reasoning or a well-written ticket, which penalises them a little.

qwen calls for the most caution. A first campaign at ILaaS was partly unusable: with no declared output cap, the reasoning filled the default 16,384 tokens in a single turn, and 23 runs looped (`-\n-\n-\n…`) from the first turns. We relaunched it at GRICAD with a 32,768-token cap, and both problems disappeared. The provider is slow, however, and more than half the runs hit the 30-minute timeout, sometimes after only three turns because a call never returns. These runs are scored on the state of the tree at the moment of the cut-off. qwen's numbers therefore say what it achieves in 30 minutes at this provider.

::: tip Our scoring convention
All the numbers on this page are given over the twenty runs of each configuration: a run that delivered nothing counts as a failure. The trysquare summary removes these runs from the denominator, which hides the failures of a model like qwen.
:::

## The results

### Configuration by configuration

Each grid groups the sixteen configurations of a model. The rows cross the ticket and the presence of `ISSUES.md`, the columns cross reasoning and the probe, and each cell counts the successful runs out of twenty. The choice of colours lets you quickly see what succeeds and what fails: the more a cell stands out against the background, the more the model succeeded. It is on the corner of the brick that the rows and columns which change as a block are the clearest.

```chart
issue1-matrix
```

::: details The same numbers as a table
Each cell gives, over twenty runs: `bounce_bricks / bounce_corners / bounce_tunneling / tests_added`.

| ticket         | `blind` | reasoning | probe | gemma         | qwen          | DeepSeek      |
| -------------- | ------- | --------- | ----- | ------------- | ------------- | ------------- |
| `nothing`      | no      | off       | no    | 8 / 0 / 0 / 0     | 12 / 12 / 1 / 16  | 20 / 19 / 19 / 19 |
| `nothing`      | no      | off       | yes   | 16 / 12 / 9 / 0   | 16 / 16 / 7 / 0   | 20 / 20 / 20 / 2  |
| `nothing`      | no      | medium    | no    | 18 / 0 / 1 / 12   | 14 / 4 / 5 / 14   | 20 / 20 / 20 / 20 |
| `nothing`      | no      | medium    | yes   | 20 / 19 / 10 / 7  | 18 / 18 / 18 / 1  | 20 / 20 / 20 / 0  |
| `nothing`      | yes     | off       | no    | 13 / 0 / 0 / 0    | 13 / 0 / 0 / 8    | 19 / 0 / 0 / 7    |
| `nothing`      | yes     | off       | yes   | 15 / 10 / 6 / 0   | 10 / 10 / 7 / 0   | 20 / 20 / 20 / 0  |
| `nothing`      | yes     | medium    | no    | 19 / 0 / 0 / 11   | 19 / 0 / 0 / 10   | 19 / 0 / 1 / 10   |
| `nothing`      | yes     | medium    | yes   | 19 / 17 / 9 / 10  | 20 / 20 / 17 / 5  | 20 / 20 / 20 / 0  |
| `well_crafted` | no      | off       | no    | 17 / 16 / 3 / 16  | 8 / 9 / 7 / 15    | 20 / 20 / 20 / 20 |
| `well_crafted` | no      | off       | yes   | 18 / 17 / 16 / 0  | 16 / 16 / 8 / 10  | 20 / 20 / 20 / 20 |
| `well_crafted` | no      | medium    | no    | 16 / 17 / 13 / 20 | 8 / 8 / 8 / 12    | 19 / 19 / 19 / 19 |
| `well_crafted` | no      | medium    | yes   | 18 / 17 / 18 / 16 | 15 / 15 / 14 / 14 | 20 / 20 / 20 / 20 |
| `well_crafted` | yes     | off       | no    | 15 / 0 / 0 / 13   | 12 / 1 / 4 / 18   | 19 / 5 / 18 / 20  |
| `well_crafted` | yes     | off       | yes   | 18 / 16 / 11 / 0  | 13 / 13 / 6 / 4   | 20 / 20 / 20 / 17 |
| `well_crafted` | yes     | medium    | no    | 18 / 0 / 0 / 20   | 14 / 1 / 2 / 18   | 19 / 4 / 12 / 20  |
| `well_crafted` | yes     | medium    | yes   | 19 / 19 / 19 / 9  | 18 / 16 / 16 / 16 | 20 / 20 / 20 / 9  |
:::

### The effect of each lever

Since the levers are crossed, we measure the average effect of each by comparing the 160 runs that have it with the 160 that don't, with the other three levers distributed the same way on both sides. Each symbol gives the gap in percentage points, and its bar the 95% interval obtained by resampling. A filled symbol has an interval that excludes zero, a hollow symbol does not (without correction for multiple comparisons). The four panels share the same scale, so the length of a gap can be compared from one lever to another.

```chart
issue1-effects
```

::: details The same numbers as a table
The gap is followed by its 95% interval. `*` marks an interval that excludes zero.

| lever | metric | gemma | qwen | DeepSeek |
| --- | --- | --- | --- | --- |
| `add_tests` | `bounce_bricks` | +12 \* [+4, +20] | +16 \* [+6, +26] | +3 \* [+1, +6] |
|  | `bounce_corners` | +59 \* [+49, +68] | +56 \* [+46, +64] | +46 \* [+38, +53] |
|  | `bounce_tunneling` | +51 \* [+42, +59] | +41 \* [+31, +51] | +32 \* [+25, +39] |
|  | `tests_added` | -31 \* [-41, -21] | -38 \* [-48, -28] | -42 \* [-51, -32] |
| `well_crafted` | `bounce_bricks` | +7 [-1, +15] | -11 \* [-21, -2] | -1 [-4, +2] |
|  | `bounce_corners` | +27 \* [+17, +38] | -1 [-11, +10] | +6 [-4, +15] |
|  | `bounce_tunneling` | +28 \* [+18, +38] | +6 [-4, +17] | +18 \* [+11, +26] |
|  | `tests_added` | +34 \* [+23, +44] | +33 \* [+22, +44] | +54 \* [+46, +63] |
| reasoning | `bounce_bricks` | +17 \* [+9, +25] | +16 \* [+6, +26] | -1 [-3, +2] |
|  | `bounce_corners` | +11 \* [+1, +22] | +3 [-8, +14] | -1 [-10, +9] |
|  | `bounce_tunneling` | +16 \* [+6, +26] | +25 \* [+15, +35] | -3 [-11, +5] |
|  | `tests_added` | +48 \* [+38, +56] | +12 \* [+1, +23] | -4 [-15, +6] |
| `blind` | `bounce_bricks` | +3 [-4, +11] | +8 [-3, +17] | -2 [-5, +1] |
|  | `bounce_corners` | -23 \* [-33, -12] | -23 \* [-34, -12] | -43 \* [-51, -35] |
|  | `bounce_tunneling` | -16 \* [-26, -5] | -10 [-21, 0] | -29 \* [-37, -22] |
|  | `tests_added` | -5 [-16, +6] | -2 [-12, +9] | -23 \* [-33, -13] |
:::

### What we take away

**The criterion mostly separates the models.** DeepSeek passes `bounce_bricks` in 315 runs out of 320, whatever the configuration: there is no margin left for measuring a lever on this column. gemma is at 267 out of 320 and qwen at 226. The levers show up on the difficult cases (the corner, the tunneling) and on the added tests.

**The probe is the only lever that helps all three models.** With `add_tests`, the corner is passed in 79% of runs for gemma, 78% for qwen and 100% for DeepSeek, and tunneling also rises for all three models. The trade-off is the same everywhere: the agent no longer writes its own tests, with a drop of 31 to 42 points on `tests_added`. It has the cases right in front of it and no longer has any reason to rewrite them. Only two runs out of 480 touched the probe, both for qwen.

**A well-written ticket makes the model write tests.** `tests_added` gains between 33 and 54 points across the three models. On gemma, it also improves the corner and tunneling, because it is what sends it to read `ISSUES.md`. On DeepSeek, the sentence "think about the different interactions… worthy of the best arcade games" is enough to get tunneling handled even without `ISSUES.md` (18/20 in `blind` versus 0/20 with the neglected request), but not the corner (5/20). On qwen, the well-written ticket lowers the criterion by 11 points. The drop is concentrated where `ISSUES.md` is present and the probe is missing (8/20 with or without reasoning), and the 24 runs that fail there all hit the timeout: qwen reads `ISSUES.md`, launches into a long investigation, writes tests, and no longer has time to finish the fix.

**Reasoning helps gemma and qwen, and changes nothing on DeepSeek.** gemma gains 17 points on the criterion and 48 on the added tests. qwen gains 16 points on the criterion and 25 on tunneling, partly because reasoning replaces its long series of simulations and makes it hit the timeout less often (54 runs out of 160 versus 127 without reasoning). DeepSeek is already at the ceiling: reasoning only costs it time, 482 seconds median versus 335.

**`blind` only costs what `ISSUES.md` brings, and only to the models that read it.** On the criterion, removing `ISSUES.md` and the history changes nothing, whatever the model, because the code comment is enough. On the corner, the effect depends on the model's propensity to go read this file without being asked:

| corners passed, without probe | neglected request: with → without `ISSUES.md` | well-written ticket: with → without `ISSUES.md` |
| ----------------------------- | -------------------------------------------- | ----------------------------------------------- |
| gemma                         | 0/40 → 0/40                                  | 33/40 → 0/40                                    |
| qwen                          | 16/40 → 0/40                                 | 17/40 → 2/40                                    |
| DeepSeek                      | 39/40 → 0/40                                 | 39/40 → 9/40                                    |

With the neglected request, gemma only opens `ISSUES.md` in 2 runs out of 80: removing it therefore costs it nothing. qwen opens it in 58 runs out of 80, DeepSeek in 79, and both lose the corner as soon as it disappears.

**The git history brings nothing.** qwen and DeepSeek consult it, DeepSeek even going as far as running `git log` and `git show` in most `blind` runs, and neither draws any useful information from it.

## How do the models work?

The sessions show how each model reaches its results, which explains why the same lever does not have the same effect everywhere.

::: info Method
Each session is reduced to a sequence of actions (read a file, open `ISSUES.md`, run `npm test`, edit `neon.js`, write a test, run a simulation script…). These classifications rely on regular expressions: they're trends, not measurements.
:::

|                                                                   | gemma | qwen  | DeepSeek |
| ----------------------------------------------------------------- | ----- | ----- | -------- |
| tool calls (median), base configuration                           | 5     | 27    | 22       |
| same configuration, in `blind`                                    | 5     | 9     | 11       |
| opens `ISSUES.md` with the neglected request                      | 2/80  | 58/80 | 79/80    |
| median duration without reasoning / with                          | 269 s / 556 s | 1,800 s / 1,422 s | 335 s / 482 s |

### gemma does what it's shown

With the neglected request and without the probe, 35 runs out of 40 follow exactly the same path: `ls -R`, read `neon.js`, `npm test`, apply the fix described in the comment, `npm test`. These five calls take about forty seconds and add no test. It's the only truly deterministic behavior among the three models.

Each lever then triggers a recognizable behavior. The well-crafted ticket, with `ISSUES.md` present, produces TDD in 18 to 20 runs out of 20, with red tests written before the fix. The probe is discovered by running the tests: gemma sees the failure, reads the probe and chains fixes. Reasoning adds simulations and makes every path different. Its weak point appears when the prompt refers to a missing file: in `well_crafted / blind / off / add_tests`, 18 runs out of 20 turn into long fix loops, with about forty calls and about ten edits to `neon.js`.

### qwen explores and debugs through simulation

Without reasoning, qwen writes throwaway scripts, looks at the ball speeds, tweaks `neon.js` and starts over. The paths are all different, but the method stays the same. It's time-consuming, and with a slow provider it often leads to a timeout. qwen also sometimes forgets its debug files in the tree, which makes `in_scope` fail, the metric that checks the agent only touched the allowed files.

It's `ISSUES.md` that triggers the long investigation. In `blind`, the base session drops from 27 to 9 tool calls and qwen settles for the comment's fix. With reasoning, simulations become rare: qwen thinks instead of trying, and more often finishes on time.

### DeepSeek works like a methodical developer

DeepSeek reads all the available context without being asked, `ISSUES.md` included, and uses git like a developer (`git diff`, `git status`, `git log`). It follows the instructions in `ISSUES.md` without being reminded: in the base configuration, 15 runs out of 20 write the failing tests before fixing, and 19 out of 20 handle the corner, the junctions, and the tunneling.

When the probe is present, it reads it during exploration, before even running the tests, and the fix becomes short and direct. It almost always verifies its work, re-running the tests after its last change in 317 runs out of 319, and produces the most complete fixes, with a median of 147 lines added to `neon.js` when it has the probe.

## Generalizing

The path the agent takes is a poor predictor of the outcome. For each of the three models, the success rate on the criterion varies little from one session type to another. What decides the corner and the tunneling is the information the agent has read: `ISSUES.md` or the probe.

What separates the models most is their tendency to go and fetch context on their own. gemma only reads what it is pointed to, whereas qwen and DeepSeek explore the repository without being asked. This tendency decides the effect of `blind` and of the well-written ticket. A lever measured on a single model therefore says nothing about its effect on another: the same ticket is decisive for gemma and changes almost nothing about the corner for DeepSeek, which has already read `ISSUES.md`.

Putting the tests in the agent's loop is the only lever that acts on all models, because it brings the information where the agent consults it anyway. It has a cost: the agent stops writing its own tests, and on a real ticket, nobody will provide you with the probe. The question the [module on skills](./act2-skill) asks is whether a work procedure written once can achieve the same result without giving the tests.

Finally, check a campaign before reading its scores. Of the three matrices in this module, one lost its cost columns because of the retries, another was relaunched with a different provider because the first was unusable, and the relaunch itself is only readable by accounting for 181 timeouts. None of these incidents was visible in the score table.

::: tip What you learned
You can name a lever whose effect changes from one model to another, and explain why from the sessions. Our example is the well-written ticket: it makes gemma read `ISSUES.md`, which it would not have opened on its own, and changes almost nothing about the corner for DeepSeek, which reads it in every case.
:::

## Going further

- [trysquare](https://github.com/AI-for-dev/trysquare), the measurement tool used in this module, and its [documentation](https://ai-for-dev.github.io/trysquare/).
- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), which contains the `issue1-context` scenario, its hypothesis written before the measurement, the prompts, the probe, and the validation script.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), on the idea that a well-crafted harness matters as much as the model.
