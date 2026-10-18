# Skills, measured

::: tip Objectives of this module
- Measure what a skill changes in a bug fix and in the tests the agent writes
- Judge the agent's tests against fixes other than its own
- Spot a campaign where the skill makes the model fail before it has even worked
- Distinguish what the procedure brings from what the catalog brings
:::

[Module 3.1](./act3-contexte) ended on a question. Giving the probe to the agent is the only lever that helps the three models handle the brick corner and tunneling, but on a real ticket nobody will hand you the probe. Can a work procedure written once achieve the same result?

In [module 2.2](./act2-skill), you wrote this procedure in two forms: `playtester`, which carries a hand-written catalog of brick-breaker bugs, and `dynamic-playtester`, which builds its catalog through a web search. One or two sessions showed you that the tests produced covered more cases. This module repeats each configuration twenty times across three models to find out whether it reproduces, and what it changes in the fix.

## The experiment

### The task

The task is the one from module 3.1: NÉON's issue #1, the ball passing through bricks. The request is the neglected request:

```
The ball goes through the bricks instead of bouncing. Fix that.
```

All configurations run in `blind`: neither `ISSUES.md` nor git history. Module 3.1 showed it, `ISSUES.md` describes precisely the difficult cases (the corner, the junction, tunneling). An agent that could read it would be graded on what it copied, not on what the skill made it look for.

### The three configurations

| configuration        | what the agent receives                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `nothing`            | the neglected request alone                                                          |
| `playtester`         | `/skill:playtester` followed by the neglected request                                |
| `dynamic_playtester` | `/skill:dynamic-playtester` followed by the neglected request                        |

The skill is called by its name. Pi then pastes the body of `SKILL.md` into the first message, and there is no model decision to measure: we measure what the procedure does once loaded, not the quality of its description.

Both skills are those from module 2.2, translated into English, with one difference. The course version stops at the red tests ("You don't fix the game"). Here, a final step asks you to fix the game until the whole suite passes, changing the code and not the tests, except for a setup judged wrong when rereading the invariant, which must then be reported. Without this step, we could not compare the fix with the one from module 3.1.

```toml
[presets.playtester]
prompt = "../materials/issue1-simple-prompt-with-playtester.md"
harness = ["skills-playtester"]

[presets.dynamic_playtester]
prompt = "../materials/issue1-simple-prompt-with-dynamic-playtester.md"
harness = ["skills-dynamic-playtester", "web-access"]

[axes]
lever = ["nothing", "playtester", "dynamic_playtester"]
```

::: warning Remarks
1. The catalog of `playtester` was written by us, who know `ISSUES.md`. It contains an entry for the corner, the junction and the tunneling, with a precise invariant. This skill is therefore not neutral: it is genre knowledge written by someone who knew what to look for.
2. The catalog of `dynamic-playtester` was already present in `references/bugs-arcade.md` at the launch of the campaigns: 53 entries pulled from the web, with a `breakout` section. No run relaunched `catalogue.sh`. This configuration therefore measures the generic procedure with a catalog from a search, and not the search itself.
3. The introduction of the measured skill still says "You do not fix the game", while step 5 asks to fix. All the runs that delivered something modified `game/neon.js`: the models followed the numbered step.
:::

### What counts as a success

Two families of metrics are read, always without LLM-as-a-judge.

The correction is scored by the module 3.1 probe, placed at the end in a copy of the agent's tree: `bounce_bricks` (the bounce on each face), `bounce_corners`, `bounce_tunneling`.

The agent's tests are judged separately. Its test files are run against several reference trees: the gold standard, a complete correction, and five corrections each missing one part (the axis, the corner, the brick exit, the junction, the tunneling).

| metric                   | what it says                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `tests_sound`            | no test from the agent fails on the complete correction                               |
| **`detects_axis`**       | **the criterion**: a sound test fails on a correction that inverts `vy` on all faces  |
| `detects_corner`         | a sound test fails on the correction that forgets the corner                          |
| `detects_neighbors`      | a sound test fails on the correction that bounces twice at the junction               |
| `detects_tunneling`      | a sound test fails on the correction that lets a fast ball through                    |

This way of judging is demanding, since a test that checks the correction written by the agent instead of the expected behavior fails on the reference correction and no longer detects anything. This is the case, for example, of a test that requires a position to the pixel or that imports a function the agent has just created.

### The models

These are the three models from module 3.1, this time all served by GRICAD:

| model                 | reasoning    | timeout |
| --------------------- | ------------ | ------- |
| `gemma-4-31b`         | `high`       | 60 min  |
| `qwen-3.8-27b`        | `medium`     | 60 min  |
| `DeepSeek-V4.1-Flash` | `medium`     | 30 min  |

The campaigns were launched on 17 October 2026, against the tag `etalon-v1`, with an output cap of 32,768 tokens per turn. Each configuration is repeated twenty times, that is 60 runs per model. The timeout is longer than in module 3.1 because a skill keeps the agent working for longer. The raw results are in the `resultats/issue1-skill_*` directories of the [act's Zenodo archive](https://doi.org/10.5281/zenodo.23452689).

::: info Exercise (in class, then on your own)
Go into [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), open `scenarios/issue1-skill.toml` and adapt the `[agent]` section to your provider. Run the matrix with three repetitions:

```bash
uv run trysquare run scenarios/issue1-skill.toml --output results --repetitions 3
```

That makes 9 runs, longer than those in module 3.1. While they run, open the `diff.patch` of a `playtester` run and read the tests it added: can you find one catalog entry per `describe`?

**On your own**, delete `references/bugs-arcade.md` from the `dynamic-playtester` skill and rerun the single `dynamic_playtester` configuration (`--only dynamic_playtester`): the catalog is then built in each run, and you measure the search on top of the procedure.
:::

## Can we trust the campaigns?

As in module 3.1, we check the runs before reading a score.

|                                                          | gemma | qwen  | DeepSeek |
| -------------------------------------------------------- | ----- | ----- | -------- |
| runs with no file modified, without skill                | 0/20  | 2/20  | 0/20     |
| same, `playtester`                                       | 0/20  | 11/20 | 0/20     |
| same, `dynamic_playtester`                               | 0/20  | 12/20 | 0/20     |
| provider-side retries                                    | 4     | 0     | 0        |
| agent tests that cannot be run against the references    | 13    | 14    | 16       |

DeepSeek is clean: no retry, no timeout, every run delivers.

gemma is usable. The 4 retries all fall in `playtester`, so that configuration's cost columns cannot be read.

qwen delivers nothing in more than half of the runs with a skill, and this is not a provider incident. These 23 runs all stop the same way: qwen reads the skill and a few files from the repository, then, at the moment of writing, its reasoning fills the turn's 32,768 tokens (about 100,000 characters) without emitting a single tool call. Pi receives a truncated response (`stopReason: length`) and the session stops. The sessions suggest qwen tries to design all the tests in its reasoning before writing one. On this model and with this cap, the skill thus makes the task fail one time in two, which is part of the result. qwen's numbers that follow are still computed out of twenty, but keep in mind that with `playtester` its 9 delivered runs all fix the corner.

The last line needs an explanation. When the agent's tests import a function that the reference trees do not export (`bounceOffBrick`, `handleBrickCollisions`…), they do not run, and the metric is not scored. This happens mostly without a skill, where the agent fixes first and then tests the function it just wrote (16 runs out of 20 for DeepSeek), and for gemma with `playtester` (8 out of 20).

::: tip Our counting convention
As in module 3.1, all figures are given out of the twenty runs of each configuration. A run that delivered nothing, or whose tests do not run against the references, counts as a failure. A test that only runs on the agent's fix detects nothing on another. The trysquare summary removes these runs from the denominator: `detects_axis` there is 5/12 for gemma with `playtester`, against 5/20 here.
:::

## The results

### Configuration by configuration

The grid gives, for the chosen metric, the number of successful runs out of twenty, with one column per model. The buttons at the top separate the fix, scored by the probe, from the agent's tests, judged on the reference trees. For the fix, two indented rows repeat the module 3.1 configurations closest to `nothing`: neglected request, `blind`, medium reasoning, without then with the probe.

```chart
issue1-skill-matrix
```

The module 3.1 rows are not a strict reference, since gemma was served there by ILaaS and the reasoning of gemma and qwen was not set the same way. On corner and tunneling, `nothing` nonetheless matches the module 3.1 0/20 for all three models.

::: details The same figures as a table
The fix: each cell gives, out of twenty runs, `bounce_bricks / bounce_corners / bounce_tunneling`.

| configuration          | gemma          | qwen           | DeepSeek       |
| ---------------------- | -------------- | -------------- | -------------- |
| `nothing`              | 14 / 0 / 0     | 17 / 0 / 0     | 20 / 0 / 0     |
| `playtester`           | 20 / 20 / 17   | 9 / 9 / 8      | 20 / 20 / 19   |
| `dynamic_playtester`   | 16 / 0 / 12    | 5 / 4 / 1      | 20 / 12 / 17   |
| *3.1, without the probe* | *19 / 0 / 0* | *19 / 0 / 0*   | *19 / 0 / 1*   |
| *3.1, with the probe*  | *19 / 17 / 9*  | *20 / 20 / 17* | *20 / 20 / 20* |

The tests: each cell gives, out of twenty runs, `detects_axis / detects_corner / detects_neighbors / detects_tunneling`, then the number of runs that added tests that are all sound.

| configuration        | gemma                  | qwen                   | DeepSeek                    |
| -------------------- | ---------------------- | ---------------------- | --------------------------- |
| `nothing`            | 4 / 0 / 0 / 0, clean 3 | 0 / 0 / 0 / 0, clean 0 | 0 / 0 / 0 / 0, clean 0      |
| `playtester`         | 5 / 5 / 1 / 8, clean 1 | 9 / 9 / 7 / 7, clean 6 | 20 / 20 / 18 / 18, clean 16 |
| `dynamic_playtester` | 8 / 1 / 1 / 4, clean 4 | 7 / 4 / 0 / 1, clean 4 | 20 / 10 / 1 / 17, clean 5   |
:::

### The effect of each skill

Each panel compares two configurations across their twenty runs: each skill against the request alone, then the two skills against each other, which differ only in their catalogue. As in module 3.1, each symbol gives the difference in percentage points and its line the 95% interval obtained by resampling. A filled symbol has an interval that excludes zero, a hollow symbol does not (without correction for multiple comparisons). With twenty runs on each side, the intervals are wider than in module 3.1, where each lever was read on 160 against 160.

```chart
issue1-skill-effects
```

::: details The same numbers in a table
The difference is followed by its 95% interval. `*` marks an interval that excludes zero.

| comparison | metric | gemma | qwen | DeepSeek |
| --- | --- | --- | --- | --- |
| `playtester` against `nothing` | `bounce_corners` | +100 \* [+100, +100] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `bounce_tunneling` | +85 \* [+70, +100] | +40 \* [+20, +60] | +95 \* [+85, +100] |
|  | `detects_axis` | +5 [-20, +30] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `detects_corner` | +25 \* [+5, +45] | +45 \* [+25, +65] | +100 \* [+100, +100] |
|  | `detects_neighbors` | +5 [0, +15] | +35 \* [+15, +55] | +90 \* [+75, +100] |
| `dynamic_playtester` against `nothing` | `bounce_corners` | 0 [0, 0] | +20 \* [+5, +40] | +60 \* [+40, +80] |
|  | `bounce_tunneling` | +60 \* [+40, +80] | +5 [0, +15] | +85 \* [+70, +100] |
|  | `detects_axis` | +20 [-10, +45] | +35 \* [+15, +55] | +100 \* [+100, +100] |
|  | `detects_corner` | +5 [0, +15] | +20 \* [+5, +40] | +50 \* [+30, +70] |
|  | `detects_neighbors` | +5 [0, +15] | 0 [0, 0] | +5 [0, +15] |
| `dynamic_playtester` against `playtester` | `bounce_corners` | -100 \* [-100, -100] | -25 [-50, +5] | -40 \* [-60, -20] |
|  | `bounce_tunneling` | -25 [-50, 0] | -35 \* [-60, -10] | -10 [-30, +5] |
|  | `detects_axis` | +15 [-15, +45] | -10 [-40, +20] | 0 [0, 0] |
|  | `detects_corner` | -20 [-40, 0] | -25 [-50, +5] | -50 \* [-70, -30] |
|  | `detects_neighbors` | 0 [-15, +15] | -35 \* [-55, -15] | -85 \* [-100, -65] |
:::

The `detects_axis` criterion goes from 0 to 20 out of 20 for DeepSeek with either skill, and from 0 to 9 for qwen with `playtester`. For gemma, the difference on the criterion is not established for either skill, whereas the corner fix gains 100 points with `playtester`.

### What we take from this

**The procedure makes tests get written before the fix, across all models.** Without a skill, no run writes a test before modifying `neon.js`. With either skill, every delivered run does, and almost all run the tests in between to watch them fail. The agent also adds far more cases: 10 median with `playtester`, against 2 to 4 without a skill.

**`playtester` gets the corner without giving the probe.** gemma and DeepSeek pass the corner in 20 runs out of 20, and tunneling in 17 and 19. gemma even does better than with the module 3.1 probe on tunneling (17 against 9). qwen passes the corner in its 9 delivered runs. That answers the module 3.1 question, with one caveat: this catalogue was written by people who had read `ISSUES.md`.

**The catalogue matters as much as the procedure.** `dynamic_playtester` follows the same steps, but its web-sourced catalogue describes the corner vaguely: "the chosen reflection side must be the face the ball is actually penetrating". The `playtester` one gives a condition and a value: "when the ball penetrates as much on both axes, both components flip". With the vague invariant, gemma never fixes the corner again (0/20) and DeepSeek only 12 times out of 20. The junction between two bricks has no clear entry in the web catalogue, and `detects_neighbors` drops to 1 out of 20 for DeepSeek, against 18 with `playtester`. Tunneling, though, is well described in both catalogues, and the gap is small for DeepSeek (17 against 19).

**A test that passes on the agent's fix may detect nothing on a different one.** gemma fixes the corner in 20 runs out of 20 with `playtester`, but its tests only detect the corner defect in 5, and only one of its twenty test suites passes on the reference fix. The assertions are almost never the cause, since gemma removes only one of them, in a single run. Its tests follow the move of its code: to fix, gemma takes the collision out of `frame()` and puts it in `step()` or in a new function like `handleBrickCollisions`, then rewrites its tests to call this new location, which it does in 15 runs out of 20. The reference fix keeps the collision in `frame()`, so the tests that import gemma's function do not run there and those that now only call `step()` fail there. DeepSeek, with the same skill, writes sound tests in 16 runs out of 20.

**A skill costs time, and can make a model fail.** DeepSeek, whose campaign is the only one with readable cost columns, goes from 104 seconds median without a skill to 470 with `playtester`, and consumes roughly seven times more input tokens. For qwen, the skill pushes reasoning past its ceiling one time out of two, and the task fails before it even starts.

## How do the models work?

::: info Method
As in module 3.1, each session is reduced to a sequence of actions by regular expressions: these are trends, not measurements.
:::

### DeepSeek follows the procedure step by step

DeepSeek reads the catalog, keeps the entries from the ball-brick collision, writes one test per entry, runs the tests one by one to check that they fail on the expected assertion (17 runs out of 20 with `playtester`), then fixes. With a skill, its tests import only functions the game already exported, and they therefore run against all the reference fixes, whereas without a skill 16 runs out of 20 test a function it just created. It also looks for `ISSUES.md` in 14 to 17 runs out of 20, without finding it since it has been removed.

### gemma follows the procedure, but tests its own fix

gemma follows the order of the steps: tests, red run, fix. With `playtester`, it does a median of 45 turns and 24 file edits, 5 of which fail because the text to replace does not match the file, where DeepSeek does 10 with no failures at all. In 15 runs out of 20, its red tests call `frame()`, the function behind the symptom, then gemma moves the collision out of `frame()` to fix it, into `step()` (9 runs) or into a function it creates (8 runs, some doing both), and replaces `frame(ctx, state)` in its tests with `step(state, 1 / 60)` or `handleBrickCollisions(state)`. The skill only allows touching the tests during the fix to repair a faulty setup, and gemma uses that exception to adapt its tests to its code. Its tests therefore end up checking the organization of its fix instead of the expected behavior.

### qwen plans everything before acting

When qwen delivers with `playtester`, it fixes the corner every time (9 out of 9) and its tests are sound in 6 runs out of 9. But a long skill in the first message pushes it to design all the tests at once in its reasoning. One time out of two, this reasoning exceeds 32,768 tokens and the session stops without a line written. A skill that works on one model can thus block another for a reason that has nothing to do with its content.

## Generalize

A procedure written once changes the agent's way of working reproducibly. All three models write their tests before fixing as soon as they are given it, and none does so without it.

The procedure does not bring domain knowledge: `playtester` and `dynamic-playtester` differ only in their catalog, and it is the catalog that decides the corner and the junction. A useful invariant names a condition and a value that the agent can turn into an exact test. A vague invariant gives a vague test, and the agent fixes what that test checks.

To know what a test written by the agent detects, you have to run it against a fix other than its own. A test that fails before the fix and then passes after gives the impression of checking the expected behaviour, whereas the agent may have changed it along the way to match its code. With gemma, the assertions stay almost intact, but in 15 runs out of 20 the tests no longer call `frame()` once the collision has moved elsewhere: they pass on its fix, and only one of its twenty test suites passes on the validator's complete fix. On a real project, you don't always have a second fix at hand, and you then compare the red tests from the start with the green tests from the end, to check that they still call the code of the symptom and that they still check the initial invariant.

Measure a skill on each target model. The same file gives 20 corners out of 20 for DeepSeek and makes qwen fail one time out of two, for a reason (the length of the reasoning) that no review of the skill would have made visible.

Finally, check what the setup actually measures. Here, `dynamic_playtester` started from an already-written catalog, so it measures the procedure and that catalog, not web search. In the score table, only the `catalogue_built` column at 0/20 hinted at it, and reading the sessions was needed to confirm it.

::: tip What you learned
From the matrix, you can tell what the procedure brings (tests written before the fix, across all models) and what depends on the catalog (the corner and the junction). You also know why a green test on the agent's fix is not enough: you have to run it on another fix to know what it detects.
:::

## Going further

- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), which contains the `issue1-skill` scenario, its hypothesis, the two translated skills, and the validator that judges tests against the reference trees.
- [Module 2.2](./act2-skill), for building the two skills measured here.
- Anthropic, [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices), which recommends testing a skill with each target model.
