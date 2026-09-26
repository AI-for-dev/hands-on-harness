# Context and the window: what goes in, what it costs

::: tip Module Objectives
- Know how to describe what is actually in the context window, and what each part costs
- Manipulate the levers that fill it: model, reasoning effort, prompt, `AGENTS.md`, system prompt
- Set up a reproducible measurement system and use it to make decisions
- Leave with a short `AGENTS.md` and a reasoned decision on each lever
:::

Context management is the building block that all others depend on, since a sub-agent is used to avoid polluting the main context, memory to avoid filling it with information that could be retrieved elsewhere, and permissions to avoid dumping a file that should not have been read. You must therefore start by knowing what the window contains and what each part costs, otherwise the following modules will be mere recipes applied without being understood.

We proceed in the usual order: understand what is in the window, reconstruct the levers that fill it, then identify what remains true when the tool changes.

::: info A reading convention
Each exercise is marked as **in-class** or **self-paced**. The in-class path is designed to fit within the session and to be sufficient for understanding the module's challenges. Self-paced exercises provide deeper exploration and are written to be done alone, later, on your own repository.
:::

## Understanding

### Five sources, one window

When you type a question into Pi, the model receives a stack where your question is only one line:

1. the **system prompt**, which describes the model's role, its tools, and its conventions;
2. the **context files**, `AGENTS.md` and `CLAUDE.md`, loaded from your home directory, then from each parent directory moving upwards, then from the current directory;
3. the **tool descriptions**, in JSON, one for each available tool;
4. **your question**;
5. and, as the loop runs, the **history**, meaning every model response, every tool call, and every tool output.

The first four sources are stable from one turn to the next, while the fifth grows with each turn, which almost always makes it the cause of overflows.

::: info Exercise (in-class)
Start a session, ask any question, then export the session with `\export`. Open the resulting HTML file and read Pi's full system prompt, something most coding agents do not allow you to do.

Identify what describes **capabilities** and what describes **conventions**: we will measure the actual weight of each of these two categories later.
:::

For a request as trivial as "just say OK", with no context file, no skill, and no extension, the input weighs **1,660 tokens**, and it drops to **1,110** if Pi's system prompt is replaced by three lines. Pi's system prompt therefore costs about **550 tokens**, which is little compared to what tool outputs and history will add later. Most of what fills a context window does not come from the harness but from what you and the agent pour into it throughout the session.

### What does using an LLM cost?

A model call is billed in three parts, expressed per million tokens. Here are the rates for the two models from the opencode Go plan:

| model              | input | output | cache read |
| ------------------ | ----- | ------ | ---------- |
| `deepseek-v4-flash` | 0.14 $ | 0.28 $ | 0.0028 $   |
| `deepseek-v4-pro`   | 1.74 $ | 3.48 $ | 0.0145 $   |

These rates are those published by [opencode Zen](https://opencode.ai/docs/zen/). Our measurements below run on ILaaS, which charges nothing to participants of this training, and therefore count tokens rather than euros. Both are read the same way, except that a token counter does not warn you when you are spending.

Two gaps emerge. The first separates the two models, since `pro` costs 12.4 times more than `flash` at nominal rates. This is a first way to realize that one model has more capabilities than another. The second gap, much wider, separates input from cache reading: a factor of **50** on `flash` and **120** on `pro`.

This second gap is what makes a coding agent economically viable, because an agent re-reads its entire history at every turn and would otherwise pay twenty times the price of its context over a twenty-turn session.

::: info Exercise (in-class)
In an interactive session, ask five consecutive questions about the same file by typing `/session` after each one, and change models with `/model` before the fourth. Questions must explicitly forbid any file re-reading, otherwise a new tool output will be added to the context and blur the reading.

Here is the exact sequence we measured, presented here in non-interactive mode so it can be reproduced as is. The `-c` option continues the previous session, and accents are omitted in the commands without affecting the result:

```bash
cd /chemin/vers/neon

pi -p --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "Lis game/theme.js et dis en une phrase ce que fait ce fichier."

pi -p -c --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "En une phrase, cite une couleur qui y est definie. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-flash -nc -ns -np -ne \
  "En une phrase, combien de couleurs au total ? Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, confirme ce nombre. Ne relis aucun fichier."

pi -p -c --provider opencode-go --model deepseek-v4-pro -nc -ns -np -ne \
  "En une phrase, redis ce nombre. Ne relis aucun fichier."
```

These five turns produce six model calls, because the first one uses two: one to request the reading of `theme.js`, and a second to respond once the tool output is returned.

| call | turn | prompt                     | model   | input | cache read | cost           |
| ----- | ---- | -------------------------- | ------- | ----- | ---------- | -------------- |
| 1     | 1    | "Read `game/theme.js`..."   | `flash` | 1 675 | 0          | 0.000254 $     |
| 2     | 1    | (continuation, after reading) | `flash` | 307   | 1 664      | 0.000081 $     |
| 3     | 2    | "cite a color..."          | `flash` | 66    | 2 048      | 0.000053 $     |
| 4     | 3    | "how many colors..."       | `flash` | 118   | 2 048      | 0.000087 $     |
| 5     | 4    | "confirm this number..."    | `pro`   | 2 521 | **0**      | **0.005455 $** |
| 6     | 5    | "repeat this number..."     | `pro`   | 148   | 2 432      | 0.000362 $     |

The cache is activated from the second call onwards, including within a single turn, reducing the cost by a factor of three to five. The model switch on the fourth turn resets the cache read to zero and causes the entire prefix to be charged at the full rate: this single turn costs fifteen times more than the next one, using the same model.
:::

::: warning If `pi -p` freezes without displaying anything
When running from a script, redirect the standard input with `< /dev/null`. In non-interactive mode, `pi` waits on its standard input as long as it remains open, which causes it to block indefinitely when called from a bash script, for example. The trysquare measurement tool we will describe later is aware of this pitfall and closes the standard input of each execution using `stdin=subprocess.DEVNULL` in a Python `subprocess.run` command.
:::

Caching only works on an **unchanged prefix**, which leads to the context ordering rule: everything that varies must be placed after what is stable. A timestamp or a `git status` slipped into the system prompt invalidates everything that follows - including tools, the question, and the history - and causes you to pay the full price each turn, whereas the same data placed in the current turn's message costs nothing because it is already in the varying zone.

Also keep in mind that changing models during a session is not free, which is worth remembering every time you switch from one model to another with `/model`.

## Rebuilding

### The task and what counts as success

All measurements in this module focus on the same task, NÉON **issue #1**: the ball goes through the bricks instead of bouncing.

The ticket is described in `ISSUES.md`, at the root of the [NÉON repository](https://github.com/AI-for-dev/neon): the ball passes through the bricks, and the ticket details the expected behaviors after the fix. We could give it directly to the agent, but we won't for now: we first want to see how it behaves based on the prompt we provide and the framework surrounding it.

This issue contains several subtleties that are difficult for an agent to find on its own. It will quickly see the problem and propose calculating the distance from the ball to the sides of the brick to reverse one of the two velocities, depending on the side hit. The corner case, rare but real, and the case of a velocity high enough for the ball to cross the brick without ever overlapping it, however, are unlikely to be handled.

In addition to the bug fix, we want to start defining a framework and verify that the agent stays within it. This framework consists of three rules:

- The agent can only modify `game/neon.js` and `game/neon.test.js`, and nothing else.
- The agent must run the tests to verify it hasn't broken anything.
- The agent must add tests if the coverage is poor. That is the case here: there are no tests verifying the ball's behavior with the brick.

Here is what we propose to measure for each run:

| metric               | what it indicates                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`          | the agent modified at least one file                                                         |
| `in_scope`           | it only touched `game/neon.js` and `game/neon.test.js`                                       |
| `suite_lancee`       | it ran `npm test` itself, as read in its session                                            |
| `tests_ajoutes`      | the suite contains more cases than the baseline                                             |
| **`rebond_briques`** | **the criterion**: on each of the four faces, the touched axis is reversed and the other does not move |
| `rebond_angles`      | in the corner, both components are reversed                                                |
| `rebond_sortie`      | after the bounce, the ball has exited the brick's rectangle                             |
| `rebond_voisines`    | on a grid seam, the bounce is applied once and not twice                       |
| `rebond_traversee`   | a fast ball no longer crosses the brick without touching it                                   |

We test all these points deterministically, without LLM-as-a-judge: the tests we should have are written in a probe file. An executable test is safer than an LLM tasked with confirming a desired behavior, whose probabilistic verdict might make you believe it is correct when it is not.

::: warning Each execution works on a disposable clone
If the device worked directly in the working tree, each execution would modify the repository and the next would measure these modifications rather than the configuration. The tool we use further down therefore clones NÉON **at a tag**, `etalon-v1`, into a temporary directory for each execution. Without this precaution, `main` moves forward, a classroom fixes issue #1, and yesterday's measurements can no longer be compared to tomorrow's without any signal.

This safeguard is not entirely sufficient, as a tag remains a name that its owner can move. We will return to this in the "Generalizing" section.
:::

### The sliders, by hand

#### The model

::: info Exercise (in class)
Run the same request on two models of different sizes: the one you usually use and the largest one you have access to. The request is intentionally minimal, the kind one naturally writes on the first day. We will call it a "neglected prompt" for the rest of this module:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Be careful to first create two separate clones:

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

then work in the directory corresponding to the tested model.

Read both diffs, then both `/session` files. Note your observations without drawing conclusions: the section on repetitions will explain why two executions are not enough to distinguish between two models.
:::

#### The reasoning effort

`pi --help` announces seven reasoning levels, from `off` to `max`. It is a simple slider to manipulate, and it is therefore tempting to start with it.

::: info Exercise (in class)
Run the same task with `--thinking minimal`, then with `--thinking max`, and compare the output tokens and the response. You will find no difference, because both flags produce exactly the same request if you use the `gemma-4-31b` model.

For this model, there are only two modes: thinking `on` or `off`.

Repeat the comparison between two truly distinct levels on your model, for example `off` and `high`, and measure the difference.
:::

Reasoning does have an effect when measured between two actual levels, and our measurements below will show its magnitude. The general lesson is instead about the trust you place in settings: **a setting exposed by the harness is not necessarily passed to the model**, because between the configuration you type and the request that is sent lies a mapping table written by someone, which may be incomplete. You will encounter this situation several times during the training, and regularly in your work. Get into the habit of checking where a configuration or a flag ends up before trusting it.

### What we write

#### `AGENTS.md`, the global configuration point

The rules file placed at the repository root enters the context every turn, making it a good candidate for defining the global framework of our project. When the agent makes a mistake, the natural reaction is to add a sentence, then another. However, every added line has a cost, and the larger the file grows, the less the agent sees the whole picture; furthermore, model improvements will make lines that are true today obsolete. This file therefore requires continuous refactoring throughout the life of the project.

We are imposing a strong constraint for this training.

::: danger Budget: 40 lines
NÉON's `AGENTS.md` will never exceed 40 lines, from the beginning to the end of the training. Any module that wants to add a rule must first remove one, or rephrase to fit both into one.

This constraint forces you to do the continuous refactoring work described above: every rule must earn its place, and a short file is much more likely to be actually followed than a long style guide.
:::

We can also rely on other files and mention them in `AGENTS.md` so that the agent reads them when needed. For example, we can tell it that conventions are in `CONTRIBUTING.md`, the architecture in `README.md`, and the history in git.

In our twenty executions of issue #1 with the ignored request, **none ran the test suite** and **none added a case**.

::: info Exercise (in-class)
Write NÉON's `AGENTS.md` based on your own executions rather than ours: review the diffs you just produced and identify what the agent did without being asked, or omitted despite being asked. Ensure that it runs the tests every time it modifies the code and adds them if there is no coverage.

Here is the starting base, to be discussed and amended. This is the very file that our measurements use, and it is versioned in the experiments below:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning An `AGENTS.md` file can hide another
Pi loads these files cumulatively, starting from your personal `~/.pi/agent/AGENTS.md`, then from each parent directory going up, and finally from the current directory. A personal rules file is thus present in all your measurements without any notification.

The `--no-context-files` flag, shortened to `-nc`, disables this discovery, which is essential for clean measurement. The measurement tool below operates in a disposable clone where only the `AGENTS.md` file of the current directory (NEON) is deposited.
:::

#### The system prompt

Pi allows you to completely replace its system prompt with a `.pi/SYSTEM.md` at the project root or a global `~/.pi/agent/SYSTEM.md`. The `--system-prompt` option follows a slightly different rule, as context files and skills continue to be added on top, meaning you never start from a completely blank slate.

::: info Exercise (self-paced)
Create a three-line `.pi/SYSTEM.md`. This is the block that our measurements deposit into the clone for the `-system_prompt` configuration:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Run the same task again and compare the input tokens, turns, duration, and what the diff contains.
:::


Pi's system prompt is 550 tokens long. The rest of the work happens elsewhere, and we encourage you to modify it only for good reasons. We show it here to illustrate the flexibility Pi offers.

#### A throttled window to observe compaction

When the context approaches the limit, Pi compacts, meaning it summarizes old messages and keeps only the most recent ones intact. Triggering follows the rule `contextTokens > contextWindow - reserveTokens`, where `reserveTokens` is 16,384 by default and represents the space left for the response. The cut is visible in `\tree`, and `/compact` allows you to force it, with optional instructions to guide the summary.

On NÉON, compaction will never be triggered. The repository has 617 lines, `gemma-4-31b` reports a window of approximately 128,000 tokens, which places the threshold around 112,000, and our most expensive experiment only reaches this total by accumulating thirteen turns, none of which exceed ten thousand tokens. Observing the mechanism therefore requires creating a constraint.

::: info Exercise (self-paced)
Declare a second entry in `~/.pi/agent/models.json`, pointing to the same service, but announcing a window of 32,000 tokens:

```json
{
  "providers": {
    "ilaas": {
      "baseUrl": "https://llm.ilaas.fr/v1",
      "api": "openai-completions",
      "apiKey": "XXXXX",
      "models": [
        {
          "id": "gemma-4-31b",
          "name": "Gemma 4 31B (fenêtre bridée)",
          "reasoning": true,
          "contextWindow": 32000,
          "maxTokens": 8000,
          "cost": {
            "input": 0.14, "output": 0.28,
            "cacheRead": 0.0028, "cacheWrite": 0
          }
        }
      ]
    }
  }
}
```

Add thresholds to NÉON's `.pi/settings.json` that are consistent with this small window:

```json
{ "compaction": { "reserveTokens": 4000, "keepRecentTokens": 8000 } }
```

You then have both modes available in `/model`: the real model at 128K and the same one throttled to 32K. Have the agent work on several files using the second one until it triggers, read the resulting summary, then check `\tree` to see where the cut occurred and if the agent still knows what you asked at the start.
:::

This operation also shows that Pi compacts to 32,000 tokens not because the model is saturated, but because you declared it. The window a harness knows is a configuration line and not a property of the model. This observation will be useful when an agent starts compacting too early for no apparent reason.

### A more complete experiment

#### The setup

We are now studying the influence of different parts of the context more closely, by running each configuration several times to account for the dispersion of results.

To do this, we will use [trysquare](https://github.com/AI-for-dev/trysquare), a tool written in Python and specifically designed for this course. It launches scenario configurations, logs each run, aggregates, and provides a synthesis of the results. It knows nothing about NÉON, nothing about issue #1, and nothing about this course.

`scripts/trysquare-campaign/` is the directory containing the experiment. Here is its content:

```
scripts/trysquare-campaign/
  trysquare.toml     chemins machine : où est NÉON, où vivent les clones jetables
  scenarios/         une expérience = un fichier TOML autonome
  hypotheses/        ce qui est prédit, écrit avant de mesurer
  briques/           tickets, AGENTS.md, prompt système, compétences : le matériau
  validateurs/       ce qui note
  results/           une matrice par répertoire
```

We will not go into the design and usage details, for which you can refer to the [documentation](https://ai-for-dev.github.io/trysquare/). For this course, remember that the `scenarios/` directory describes the experiments: each file declares the model used (as named by Pi), the number of repetitions, the experiment configurations, and the validation tests.

#### The experimental design

The chosen plan is the simplest one that remains readable: a **base**, then a set of variants, each of which changes very little.

The base, called `nothing`, reproduces what someone would do on their first day: the neglected request provided earlier during your first attempts, no rules file, the agent's system prompt, and disabled reasoning. Each other configuration adds an element to see its effect on the response.

| configuration                    | what changes                                                   |
| -------------------------------- | --------------------------------------------------------------- |
| `nothing`                        | nothing, this is the reference                                        |
| `+thinking`                      | `thinking = "high"`                                             |
| `+agents`                        | `brick/AGENTS.md` is placed in the clone                      |
| `+well_crafted`                  | the prompt properly describes the problem and refers to `ISSUES.md` |
| `-system_prompt`                 | the system prompt is replaced by three lines                 |
| `+agents+well_crafted`           | `AGENTS.md` + well-written prompt                                 |
| `+agents+add_tests+well_crafted` | the tests we want to see pass are added here   |

An experiment fits in one file: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

The experiment directory contains other configurations than those in the table above; they belong to other modules, and we will discuss them later.

A well-written prompt does not copy the ticket content. `ISSUES.md` already describes how to fix the bug, in the repository the agent has at hand. The prompt therefore specifies the issue, the scope, and the stopping criterion, and nothing more:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

This configuration therefore measures whether pointing to a written document is enough for the agent to read it and take it into account. If the prompt copied the solution, we would only be measuring the agent's ability to follow an instruction it was just given.

#### Validation tests

To judge the quality of the results, the scenario declares validation tests:

- **delivered**: the execution went to completion, without interruption.
- **suite_lancee**: the agent remembered to run the tests located in the `game` directory.
- **in_scope**: the agent only modified the files it was asked to modify, and only the lines corresponding to the problem.
- **tests_ajoutes**: the agent remembered to add tests for the ball bouncing off the bricks.
- **`sonde.test.js`**: at the end of the execution, this probe verifies that the code modifications fix the problem as a whole, as described in `ISSUES.md`. It is also included from the start in the `+add_tests` configuration, to see if the agent is able to fix its errors based on the tests.

#### Traces

The experiment saves traces that allow you to analyze what happened afterwards. For each run, you have access to:

- a Pi session export in JSONL format, which can be converted to HTML format (we will talk about this a bit later);
- a `validation` directory that shows the state of the validation tests;
- a `configuration.json` file that summarizes the run framework (model, harness, tests...);
- a patch (`diff.patch`) that shows what was modified in the NÉON code during the run.

At the end of the experiment, a summary in HTML and Markdown formats gives the validation successes for each configuration, as well as averages for token costs and run duration.

#### How many repetitions, and why

Each configuration is executed several times, and the reason is already very clear in the base configuration.

Here are the first six executions of `nothing`, strictly identical in their configuration: same model, same effort, same prompt, same repository at the same commit.

| run            | 1      | 2      | 3      | 4       | 5      | 6       |
| -------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| input tokens   | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| turns          | 4      | 5      | 4      | 4       | 5      | 4       |
| duration       | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterion met  | yes    | yes    | yes    | **no**  | yes    | **no**  |

The cost varies by less than a quarter, the number of turns takes two values, and the response changes one time out of three. A single run of this configuration would have given you, depending on the draw, "the base fixes the bug" or "the base does not fix it".

The best-equipped configuration shifts its dispersion to cost rather than the response. On `+agents+add_tests+well_crafted`, input tokens range from 42,731 to 2,420,677, an extent of **×57**, and three consecutive runs result in 2,420,677, 2,147,526, then 594,786.

An agent is not deterministic, and the gap between two runs of the same configuration is of the same order of magnitude as the effect of most levers, meaning a single run per configuration measures the draw rather than the lever.

Given this dispersion, trysquare never publishes a single number. Two concepts are enough to read its tables.

**A point is a percentage point of success.** `+agents+add_tests+well_crafted` meets the criterion 18 times out of 20, or 90%, and `nothing` 11 times out of 20, or 55%: the gap is **+35 points**. Only valid runs count, those that delivered nothing are removed from both sides, which explains why a denominator may be lower than the number of repetitions.

**The interval comes from bootstrapping.** Twenty runs are randomly sampled with replacement from each group, the gap is recalculated, and this is repeated ten thousand times; the published bounds are the 2.5% and 97.5% ranks of the ten thousand gaps obtained. Runs that are similar result in a tight interval, while dispersed runs result in a wide interval. The seed is written in `trysquare.toml`, so the bounds are recalculated identically.

Reading a gap then amounts to asking a single question: **does this interval contain zero?** If it does not, the gap is marked `*` and it is **established**. If it does, it is marked `o` and is **inconclusive**, regardless of the central value.

Both cases are in the matrix. The +35 points above come with an interval from +10 to +60, so the gain is certainly positive without being able to say whether it is ten points or sixty. The `+well_crafted` configuration shows +17 points on this same criterion, but its interval contains zero: these runs remain compatible with a lever that helps as well as one that hinders.

The `o` symbols are still displayed in the tables, with a reminder under each one: no conclusion can rely on a gap marked `o`.

The number of repetitions remains a parameter because the right choice depends on what you are looking for. **Three are enough to see the dispersion**, which is the goal in the classroom. **Distinguishing between two similar levers requires much more**, and the columns counting successes are the most demanding: a 2/3 versus 3/3 means almost nothing, whereas an 8/20 versus 20/20 is more meaningful. The tables published below use twenty repetitions for this reason.

::: info Exercise (in class, then independently)
Start with the full plan, which costs nothing:

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

The config is taken from the nearest `trysquare.toml`, so the one in `scripts/trysquare-campaign/` as long as you run it from this directory.

Then run the matrix with three repetitions and let it run while you discuss the sliders:

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

Sub-commands that cost nothing run immediately and are useful afterwards:

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**Independently**, copy `scenarios/issue1-contexte.toml`, change a configuration, and run it again. You will have touched neither the tool, nor the validator, nor the other configurations, and this is the only artifact of this module that will not become obsolete.
:::

#### Our measurements

You must have noticed during your first attempts with `trysquare`: taking measurements takes time. For about twenty repetitions, it will take you between 2 and 3 hours to get all the results along with those from the next module. We therefore preferred to give you a complete campaign carried out in advance, in which you can navigate the directories of each execution as you did previously.

Here is what we obtained in August 2026, on `ilaas` and `gemma-4-31b`, against NÉON commit `d62ccd1f`, with **twenty repetitions per configuration**. The two skill-based configurations are in the archive and belong to the next module; they are excluded from the tables below, except for a remark at the end.

| configuration                    | `delivered` | `suite_launched` | `tests_added` | `in_scope` |
| -------------------------------- | ----------- | ---------------- | ------------- | ---------- |
| `nothing`                        | 20/20       | 0/20             | 0/20          | 20/20      |
| `+thinking`                      | 19/20       | 15/20            | 3/20          | 19/20      |
| `+agents`                        | 20/20       | **20/20**        | 0/20          | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20            | 17/20         | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20             | 0/20          | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20            | 17/20         | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20            | 17/20         | 20/20      |

And the probe columns, the primary criterion:

| configuration                    | bricks     | angles    | output    | neighbors | crossing |
| -------------------------------- | --------- | --------- | --------- | --------- | --------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

The denominators for `+well_crafted` and `+thinking` are 18 and 19 in the cost columns because ILaaS returned `Request timed out` during measurement and the corresponding executions produced nothing worth noting.

We draw five insights from these two tables, and the last one will transition to the next module. All gaps mentioned below come from the intervals described above, using the same `*` mark for an established gap and `o` for an inconclusive gap. Comparisons not made against `nothing` are obtained by re-running the calculation against another reference, which costs nothing and requires no re-measurement. With the verdict column based on the only metric declared by `[verdict].criterion`, reading a gap in another column requires changing this line of the scenario before rendering:

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

The output goes into a `synthesis_ref-<reference>.md` next to the usual synthesis, which remains untouched.

**The framed prompt gets everything the ticket specifies done, and nothing more.** `tests_ajoutes` goes from 0/20 to 17/20 and `rebond_angles` from 0/20 to 14/20 - two columns that were empty and are now being filled. The prompt says nothing about the bounce mechanism; it specifies the issue, the scope, and the stop criterion, while `ISSUES.md` describes the corner, the rectangle exit, the grid seam, and the tunneling. The corner remains at **0/20 in the four configurations that do not frame the ticket**, meaning eighty consecutive executions. Pointing to a written document is therefore enough for it to be read, and the content of that document determines what will be processed.

**The rules file only shifts the process, and it no longer shifts anything once the ticket is correct.** `+agents` moves `suite_lancee` from 0/20 to 20/20, because one of its four lines names the command. On the criterion it gives 9/20 versus 11/20 at baseline, an inconclusive gap, and on `tests_ajoutes` it remains at 0/20 since none of its lines mention tests. Added on top of the well-crafted prompt, it brings **absolutely nothing**: 11/20 versus 13/20 on the criterion, 12/20 versus 14/20 on the corner, 17/20 versus 17/20 on added tests, none of these three gaps being distinguishable from zero. The rules file is a substitute for a good ticket rather than a complement, which gives a writing rule directly applicable to the forty-line budget: a line that a correct ticket would say anyway is a line to be removed.

**Reasoning shifts the criterion, and reasoning alone does not lead to reading the ticket.** `+thinking` gives 16/20 on `rebond_briques`, a gap of +29 points whose interval excludes zero. It is the only lever in the matrix, excluding those affecting the ticket, to shift the correction itself. Its corner column remains at 0/20 and its added tests at 3/20: reasoning improves what the model does with what is in front of it, but does not lead it to seek out what it is missing.

**The well-crafted prompt leads to writing red tests, and one in five executions stops there.** The `touched` column states it unambiguously: on `+well_crafted` and `+agents+well_crafted`, four out of twenty executions never open `game/neon.js`, including two or three that write only in `game/neon.test.js` and one or two that deliver nothing at all. No other configuration shows this behavior, with `nothing`, `+agents`, and `-system_prompt` touching the source in twenty out of twenty executions. The explanation is in the ticket, which lists five sub-cases and ends with "each case above added **first as a red test**, then green": `gemma-4-31b` writes the red tests and stops there, as it is unable to process the entire specification. This is also why the correction criterion does not increase while the corner increases: the model has a work budget, and describing more work in the ticket does not increase it.

**Providing the tests fixes this drop-off.** The `+agents+add_tests+well_crafted` configuration is compared to `+agents+well_crafted`, the only one from which it differs solely by the probe placed in the tree:

| column           | `+agents+well_crafted` | `+add_tests` | gap                  |
| ----------------- | ---------------------- | ------------ | ---------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | N/A                    | **20/20**    |                        |

The four correction columns increase, and the four gaps are established. The leverage does not only win edge cases; it also catches up to the criterion itself. Note the width of the intervals, and particularly the one in the corner starting at a single point: these gaps are established in the sense that they are positive, without being able to determine their size better than a factor of fifty.

`sonde_intacte` is 20/20, which means the model did not try to change the reference tests. And `tests_ajoutes` does not change, which is consistent with an agent that already has the cases in front of it and has no reason to rewrite them.

::: warning No gemma cost column is citable here
The matrix contains 1,151 retries - meaning turns restarted because the provider failed - and the box below shows how concentrated they are on the heaviest configurations. A retry replays the turn with all the accumulated context, thus inflating the cost columns and, above all, re-steering the agent.

The same scenario measured on `opencode-go` and `deepseek-v4-flash` has **37**, which makes its results readable:

| configuration                    | turns | duration |
| -------------------------------- | ----- | -------- |
| `nothing`                        | 19    | 163 s    |
| `+agents`                        | 12    | 65 s     |
| `-system_prompt`                 | 17    | 142 s    |
| `+well_crafted`                  | 15    | 252 s    |
| `+thinking`                      | 19    | 490 s    |
| `+agents+well_crafted`           | 14    | 561 s    |
| `+agents+add_tests+well_crafted` | 13    | 410 s    |

The input tokens for the two matrices cannot be put in the same table, for a reason that has nothing to do with the model: ILaaS reports no cache, with `cacheRead` being zero over its one hundred and eighty runs, so its input column is the sum of full prefixes reread each turn. opencode Zen reports the cache, with up to five million tokens read in a single run. The same configuration therefore shows 558,000 input tokens on one side and 15,000 on the other without either being wrong. This is the practical side of what the first part of this module explains about caching: input costs depend on the model provider's configuration and enabling the cache allows for a drastic reduction in the bill.
:::

#### Three checks before citing a table

A matrix publishes tables, intervals, and verdicts, which may give the impression of solid conclusions. However, while developing this course, we encountered several phenomena that can discredit certain results.

::: warning Retry count
A retry is a turn that the tool had to restart because the provider failed. It replays the turn with all the accumulated context, which inflates the cost columns, and above all, it restarts the agent: the workflow is no longer the same.

In the `gemma-4-31b` matrix, the count is **1,151**, and it is not evenly distributed:

| configuration                    | retries  |
| -------------------------------- | -------- |
| `nothing`                        | 1        |
| `+agents`                        | 2        |
| `-system_prompt`                 | 1        |
| `+well_crafted`                  | 24       |
| `+thinking`                      | 81       |
| `+agents+well_crafted`           | 205      |
| `+agents+add_tests+well_crafted` | 205      |
| `+agents+add_tests+skill`        | 287      |
| `+agents+skill`                  | 345      |

None for short-context configurations, all for high-reasoning ones, and even more so as the accumulated context grows: a single run of `+agents+add_tests+well_crafted` consumed 2.4 million input tokens over sixty-three turns and accumulated eighteen retries. The same scenario measured on `opencode-go` and `deepseek-v4-flash` counts **thirty-seven** in total.
:::

::: warning The importance of the validation test
A uniformly black column looks like agent behavior but may be a validator defect. The only way to distinguish them is for the metric to say **why** it responded false, not just that it responded false.

Our validator does this for `suite_lancee`: when it doesn't recognize any suite run, it copies all the commands the agent issued into its reasoning. This precaution is important because the form of the command varies between models more than the command itself. `deepseek-v4-flash` prefixes every working directory call (`cd .../repo && npm test`, 664 times across the matrix) and often redirects the output (`npm test 2>&1 | tail -30`, 80 times), whereas `gemma-4-31b` simply types `npm test`. A validation test that only recognized the latter form would score the first model zero across the entire matrix.

In conclusion, **write your metrics with care and test them on a test set**. They must be reliable. Note any strange behavior before drawing hasty conclusions.
:::

::: warning What the comparison of the two models tells us, and what it does not
Both matrices (`gemma-4-31b` and `deepseek-v4-flash`) cover the same scenario, the same nine configurations, and the same NÉON commit, meaning their score columns can be read against each other. The model and the provider changed together, which makes it impossible to attribute a gap to one rather than the other, yet still reveals this in the corner column:

| configuration          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Both models react to the same lever and in the same direction, with the more capable one starting higher and reaching higher.
:::

These numbers are not meant to be taken at face value or copied years from now. Rerun the matrix: that is exactly what it is for, and the one you obtain will replace this one.

Well-maintained context makes the agent disciplined and thorough regarding what the ticket names, without making it exhaustive: the corner of the brick is never reached where the ticket does not describe it, and tunneling remains the lowest column of all those measured by the probe. Going beyond what the written material contains will require an independent reviewer and a verification loop, which is the subject of the modules on delegation and workflows.

::: warning Three tempting conclusions that the intervals do not support
Each of the following statements is based on an exact figure from the campaign published on this page, and none of them hold.

**"The rules file breaks the fix."** `+agents` results in 9/20 for the criterion compared to 11/20 for the baseline. The gap is -10 points but its interval includes zero: we cannot say anything about it, in either direction.

**"Removing the system prompt improves recovery."** `-system_prompt` gives 14/20 versus 11/20, a +15 point difference, and the interval contains zero here as well. With only three cherry-picked executions, we would have obtained 3/3 versus 1/3 and might have been convinced for a long time.

**"The well-crafted prompt fixes the bug better."** `+well_crafted` gives +17 points on the criterion, which is inconclusive. The actual effect of this lever is visible elsewhere, in the added tests and the coin metric, where the gaps are measured in dozens of points and leave no doubt.

Repeating three times is therefore not enough: an effect that does not exceed the variance of its own configuration is not an effect. And an effect established on this task, with this ticket and this model, is only established within that specific framework.
:::

You have just practiced an evaluation, in the sense of comparing behaviors on the same task, with repetitions and awareness of noisy measurements, whereas a test answers a closed question with yes or no. Module 3.2 will formalize this practice using evaluation files and an LLM-judge for criteria that this module's probe could not handle.

### The Stack vs. The Base

The levers in this module require attention and time, whereas a more capable model is obtained simply by paying more. It is therefore legitimate to wonder whether it is more cost-effective to polish your context or to change the model. The second half of this question is not measured here, and we explain why below. The first half is, while holding the model constant, by pitting the two extreme configurations of the matrix against each other.

::: info Exercise (in-class)
Compare the `nothing` configuration, which receives a single-line request and nothing else, and the `+agents+add_tests+well_crafted` configuration, which has the reasoning, the well-crafted ticket, the `AGENTS.md`, and the probe placed in the tree. Look at the diffs first, then the probe columns, and only at the end, what each one cost.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, diff +35 points       |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| median turns       | 19        | 13                               |
| median duration     | 163 s     | 410 s                            |

The last two lines are taken from the `deepseek-v4-flash` matrix, where the thirty-seven runs make the cost columns legible, and the score columns are from `gemma-4-31b`.

The complete harness reaches eighteen out of twenty on a criterion where the baseline caps at eleven, and the most severe column of the probe goes from 7/20 to 18/20. This is Addy Osmani's thesis, *"a decent model with a great harness beats a great model with a bad harness"*, verified on its easiest half to establish: with a strictly constant model, the harness alone makes the difference between a fix that works once in two and a fix that works nine times out of ten.

The corner case goes from 0/20 to 18/20, and the framed prompt alone already achieved fourteen: most of the gain comes from the fact that the prompt refers to a ticket in `ISSUES.md` that names the case, and the probe adds the perseverance that was missing to finish the job.

### What this module cannot achieve

The only lever that led the model to handle everything requested in the ticket was putting the tests right in front of it. However, this configuration is somewhat artificial: the edge cases were written in advance, by us, in the very file that records them. On a real ticket, no one will provide them to you.

What this configuration actually provides is perseverance. The model drops out on a long ticket because it exhausts its budget formulating the cases instead of fixing them; receiving the cases already formulated gives this budget back. The question for the next module is therefore whether a **skill** - that is, a work procedure written once and reloaded on demand - can produce the same perseverance without providing the tests.


## Generalizing

Eight principles from this module remain valid beyond Pi, `ilaas`, and the version of the packages you just installed.

**What is stable upfront, what varies downstream.** The cache only works on an unchanged prefix and costs fifty times less than the input, meaning that any volatile data placed early in the context - whether a timestamp, a git state, or a date - invalidates everything that follows.

**Pointing to a written document is enough for it to be read, and what is written there determines the result.** Our framed ticket does not describe the debounce mechanism: it names the issue, the scope, and the stop criterion. Seventeen out of twenty executions went to read `ISSUES.md`, found the request for edge cases as red tests, and executed it, whereas the neglected request obtained none. The brick corner case provides the clearest version: it is described in `ISSUES.md` and in none of our prompts, and it scores 0/20 in the four configurations that do not name the issue, versus 14/20 in the one that does. Write what you expect in a document you can point to, and reread this document before concluding anything about the agent.

**A model has a budget, and describing more work does not increase it.** Our ticket lists five sub-cases and asks for a red test for each; four out of twenty runs write these red tests and never open the source file. This observation dictates the next step: either you reduce the request to what the model can handle, or you give it the means to go the distance, which is the subject of the next module.

**The rules file changes what the agent does and not what it finds, and it only helps with what the ticket does not state.** It enters the context at every turn, making it both a powerful and costly lever; this is why it is important to keep it short, base every rule on an observed failure, and refactor it rather than lengthen it. Our measurements precisely frame what it buys: the `+agents` configuration increases the number of runs that launch the test suite from 0/20 to 20/20, leaves the correction criterion unchanged, and adds nothing further once the framed prompt is in place. The resulting writing rule applies directly to the forty-line budget: a line that a correct ticket would state anyway is a line to be removed.

**A setting exposed by the harness is not necessarily passed to the model.** Between the flag you type and the request that is sent are code and mapping tables, as shown by `--thinking max`, which does not reach the model we use without any warning. The corollary for measurement is that whatever determines the experiment must be written into the experiment: a reasoning level inherited from a personal configuration made one of our configurations identical to its baseline across all published matrices.

**An effect that does not survive resampling is not an effect.** Repeating three times is not enough: as long as the confidence interval contains zero, there is nothing to say about it. Of the nine configurations measured here, only three establish a shift in the correction criterion, while the other six each show a figure that might seem convincing. Moreover, an established gap exists only for this task, with this ticket and this model.

**What is measured must be pinned by what does not move.** A tag is a name, and `git tag -f` moves it without leaving a trace in the measurement, so two matrices can declare the same benchmark and have worked on two different versions of the code. Pin by the commit, which does not move, and if your tool does not yet allow this, at least archive what the name resolved at the time of measurement.

**A metric must say why, not just what.** A uniformly black column looks like agent behavior and could be a validator flaw, and nothing distinguishes the two as long as the metric only returns true or false. Make it write what it evaluated: ours copies the commands the agent executed under each failure, which allows you to verify a zero instead of taking it on faith.

**Write the hypothesis before measuring, and version it.** A hypothesis written after measurements is just a disguised conclusion. Ours, `hypotheses/issue1-contexte.md`, contains a prediction that proved false, and because it was written in advance, we published it as such instead of reframing it as a discovery after the fact.

## Deliverable

This module produces three items: the first two are used all day, the third will be used in act 4.

**1. NÉON's `AGENTS.md`**, versioned in the repository, under 40 lines, with each rule justified by a failure you observed.

**2. The matrix directory** produced by `trysquare run`, including its log line. The deliverable is not a copied table but the archive that allows it to be reproduced: the raw measurements, sessions, diffs, and the revision of the tool that performed the measurement. Without this archive, the matrix can be neither verified nor rescored, and its numbers are no better than an opinion.

**3. The decision sheet**, one line per lever:

| lever                     | measured effect | adopted? | why |
| -------------------------- | ------------ | -------- | -------- |
| model choice              |              |          |          |
| reasoning effort          |              |          |          |
| scoped ticket             |              |          |          |
| pointed ticket content    |              |          |          |
| `AGENTS.md`                |              |          |          |
| system prompt             |              |          |          |
| pre-provided tests        |              |          |          |
| scheduling / cache        |              |          |          |
| compaction                 |              |          |          |
| executable criterion (probe) |              |          |          |

Two lines were added to this sheet after our latest measurements. "Pointed ticket content" is included because the rewriting of `ISSUES.md` shifted more columns than any harness setting, and "pre-provided tests" because it is the only lever that recovered the model's drop-off on a long ticket.

This sheet constitutes the first actual entry for the "your harness?" column of the mapping table, for the "context" row. The following five modules will do the same for their respective building blocks, so that you will start the capstone with a table already filled by your experiments.

::: tip Success criterion
You can name a lever you measured as having no effect on NÉON, and explain under what precise conditions it would have one elsewhere.

Our example is `AGENTS.md`: it does not move the correction criterion by a single point, but it would become decisive for a ticket where the usual failure is one of process rather than reasoning, or for a repository with poorly written tickets. Yours will be different, and that is the point. This criterion requires you to have seen the numbers and understood that the task and its material determine them. Therefore, it cannot be satisfied from memory.
:::

## Pitfalls

**Concluding from a single execution**, which remains the primary and most costly pitfall, as it produces lasting convictions based on noise.

**Injecting volatile data into the cacheable zone.** A date, a `git status`, or a timestamp placed early in the context invalidates the entire subsequent cache, making you pay dearly for a saving you thought you had secured.

**Forgetting your personal `AGENTS.md`**, loaded in addition to the project one and invisible in the interface, which skews all your measurements unless you use `-nc`.

**Taking a flag at face value**, when `--thinking max` might have no effect without Pi warning you.

**Mistaking a lack of saturation for a lack of problems.** Within a comfortable window, nothing ever overflows, which only means the alarm will not sound and cost will be your only indicator.

**Judging by a pattern when you can judge by behavior.** Checking a diff to see if it resembles the expected solution answers a different question than "does this diff solve the problem", and this gap is where false positives reside. Look for the executable form before resigning yourself to the pattern, and then to the judge.

**Failing to count retries.** A matrix measured while the provider fails and retries does not measure the configuration, yet it gives the appearance of completeness: tables, intervals, verdicts. The retry count must therefore be read as a full-fledged result column.

**Trusting a uniformly black column.** Zero across all configurations looks like model behavior and may be an overly strict comparator, such as one that refused `cd /tmp/x && npm test` because it only knew `npm test`. Check the reason attached to a failure before drawing a conclusion.

**Trusting a tag.** Tags move, and nothing in a table will show it. The only way to know after the fact is the commit archived per execution, and the only way to avoid it is to pin to that commit.

**Comparing costs between two providers.** They do not count the same things: one reports the cache and the other does not, meaning the "input" column of one is the sum of full prefixes, while the other's is the part that was not already cached. The ratio between the two is meaningless.

## Going further

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), the study justifying why we shouldn't just fill the window.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), on the shift from isolated prompts to context architecture.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), whose thesis is what the initial stack comparison puts to the test.
- [Pi's documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), and in particular its pages on compaction, models, and settings.
- [trysquare](https://github.com/AI-for-dev/trysquare), the measurement tool used in this module, and its scenario writing guide.
- The training's trysquare campaign, `scripts/trysquare-campaign/`, with its hypotheses written before measurement and its archived matrices. This is the only place where the figures on this page are verifiable.
