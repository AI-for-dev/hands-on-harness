# Context and the window: what goes in and what it costs

::: tip Module Objectives
- Knowing how to state what is actually in the context window, and what each part costs
- Manipulating the levers that fill it: model, reasoning effort, prompt, `AGENTS.md`, system prompt
- Setting up a reproducible measurement system and using it to make decisions
- Leaving with a short `AGENTS.md` and a reasoned decision on each lever
:::

Context management is the building block that all others depend on, since a sub-agent is used to avoid polluting the main context, memory to avoid filling it with information that could be retrieved, and permissions to avoid dumping a file that should not have been read. Therefore, you must start by knowing what the window contains and what each part costs, otherwise the following modules will be nothing more than recipes applied without being understood.

We follow the usual order: understanding what is in the window, reconstructing the levers that fill it, then identifying what remains true when the tool changes.

::: info A reading convention
Each exercise is marked as **in-class** or **self-paced**. The in-class path is designed to fit within the session and to be sufficient for understanding the stakes of the module. The self-paced exercises go deeper and are written to be completed alone, later, on your own repository.
:::

## Understanding

### Five sources, one single window

When you type a question into Pi, the model receives a stack of which your question is only one line:

1. the **system prompt**, which describes the model's role, its tools, and its conventions;
2. the **context files**, `AGENTS.md` and `CLAUDE.md`, loaded from your home directory, then from each parent directory moving up, and then from the current directory;
3. the **tool descriptions**, in JSON, one for each available tool;
4. **your question**;
5. and, as the loop turns, the **history**, meaning every model response, every tool call, and every tool output.

The first four sources are stable from one turn to the next, while the fifth grows with each turn, which almost always makes it responsible for overflows.

::: info Exercise (in-class)
Open a session, ask any question, then export the session with `\export`. Open the resulting HTML file and read Pi's system prompt in full, which most coding agents do not allow you to do.

Identify what describes **capabilities** and what describes **conventions**: we will measure the actual weight of each of these two categories later.
:::

For a request as trivial as "just say OK", with no context file, no skill, and no extension, the input weighs **1,660 tokens**, and it drops to **1,110** if Pi's system prompt is replaced by three lines. Pi's system prompt therefore costs about **550 tokens**, which is little considering what tool outputs and history will add to it later. Most of what fills a context window does not come from the harness, but from what you and the agent pour into it throughout the session.

### How much does using an LLM cost?

A model call is billed in three categories, expressed per million tokens. Here are the rates for the two models from the opencode Go offer:

| model              | input | output | cache read |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0.14 $ | 0.28 $ | 0.0028 $         |
| `deepseek-v4-pro`   | 1.74 $ | 3.48 $ | 0.0145 $         |

These rates are those published by [opencode Zen](https://opencode.ai/docs/zen/). Our measurements below run on ILaaS, which does not charge participants in this course and therefore counts tokens rather than euros. Both are read the same way, except that a token counter does not warn you when you are spending.

Two gaps emerge. The first separates the two models, since the `pro` costs 12.4 times more than the `flash` at nominal rates. This is one way to realize that one model has more capabilities than another. The second gap, which is much wider, separates the input from the cache read: a factor of **50** on `flash` and **120** on `pro`.

This second gap is what makes a code agent economically viable, because an agent rereads its full history every turn and would otherwise pay twenty times the price of its context over a twenty-turn session.

::: info Exercise (in-class)
In an interactive session, ask five consecutive questions about the same file by typing `/session` after each one, and change the model with `/model` before the fourth. The questions must explicitly forbid any file rereading, otherwise a new tool output will be added to the context and blur the reading.

Here is the exact sequence we measured, provided here in non-interactive mode so that it is reproducible as is. The `-c` option continues the previous session, and accents are omitted in the commands without affecting the result:

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

These five turns produce six model calls, because the first one consumes two: one to request reading `theme.js`, and a second to respond once the tool output has returned.

| call | turn | prompt                     | model  | input | cache read | cost           |
| ----- | ---- | -------------------------- | ------- | ------ | ---------------- | -------------- |
| 1     | 1    | « Read `game/theme.js`... » | `flash` | 1 675  | 0                | 0.000254 $     |
| 2     | 1    | (continued, after reading)  | `flash` | 307    | 1 664            | 0.000081 $     |
| 3     | 2    | « cite a color... »         | `flash` | 66     | 2 048            | 0.000053 $     |
| 4     | 3    | « how many colors... »      | `flash` | 118    | 2 048            | 0.000087 $     |
| 5     | 4    | « confirm this number... »  | `pro`   | 2 521  | **0**            | **0.005455 $** |
| 6     | 5    | « repeat this number... »   | `pro`   | 148    | 2 432            | 0.000362 $     |

Caching is active starting from the second call, including within the same turn, and it reduces the cost by a factor of three to five. Switching the model in the fourth turn resets the cache read to zero and makes you pay full price for the entire prefix again: this single turn costs fifteen times more than the next one, with the same model.
:::

::: warning If `pi -p` freezes without displaying anything
From a script, redirect the standard input with `< /dev/null`. In non-interactive mode, `pi` waits on its standard input as long as it remains open, which blocks indefinitely when called from a bash script, for example. The trysquare measurement tool described below is aware of this pitfall and closes the standard input of each execution using `stdin=subprocess.DEVNULL` in a Python `subprocess.run` command.
:::

Caching only works on an **unchanged prefix**, from which the context scheduling rule follows: everything that varies must be placed after what is stable. A timestamp or a `git status` slipped into the system prompt invalidates everything that follows - including tools, questions, and history - and makes you pay full price at each turn, whereas the same data placed in the current turn's message costs nothing since it is already in the variable zone.

Also keep in mind that changing the model during a session is not free, which is worth remembering every time you switch from one model to another with `/model`.

## Rebuild

### The task, and what counts as success

All measurements in this module focus on the same task, NÉON's **issue #1**: the ball goes through the bricks instead of bouncing.

The ticket is described in `ISSUES.md` at the root of the NEON repository (https://github.com/AI-for-dev/neon). It explains that the ball passes through the bricks, as well as the various behaviors that need to be corrected to achieve normal ball behavior. We could give this ticket directly to the agent, but we won't do that for now. For the moment, we want to see how it behaves based on the prompt provided and the surrounding framework.

As you can see, this issue contains several subtleties that will be difficult for the agent to find alone. It will quickly identify the problem and suggest calculating the distance to the brick's edges. Depending on the side hit, it will invert one of the two velocities. However, there is unfortunately very little chance that it will spot the corner problem, which is rare but real, or the problem of a velocity that is too high, causing the ball to pass through the brick without even detecting it.

In addition to the bug fix, we want to start defining a framework and verify that the agent does not deviate from it. There are three main rules:

- The agent can only modify `game/neon.js` and `game/neon.test.js` and nothing else.
- The agent must run the tests to verify that nothing has been broken.
- The agent must add tests if the coverage is insufficient. This is the case here: there are no tests that verify the ball's behavior with the brick.

Here is what we propose to measure for each run:

| metric | what it indicates |
| :--- | :--- |
| `delivered` | the agent modified at least one file |
| `in_scope` | it only touched `game/neon.js` and `game/neon.test.js` |
| `suite_lancee` | it ran `npm test` itself, as seen in its session |
| `tests_ajoutes` | the suite contains more cases than the baseline |
| **`rebond_briques`** | **the criterion**: on each of the four faces, the axis hit is inverted and the other does not move |
| `rebond_angles` | in the corner, both components are inverted |
| `rebond_sortie` | after the bounce, the ball has exited the brick's rectangle |
| `rebond_voisines` | on a grid seam, the bounce is applied once and not twice |
| `rebond_traversee` | a fast ball no longer passes through the brick without touching it |

We will test all these points deterministically and without using LLM-as-a-judge. We have written the necessary tests in a probe file. Keep in mind that a test to verify is always much safer than using an LLM to confirm a desired behavior. The probabilistic nature of the LLM can lead you to believe it's correct when it is not at all.

::: warning Each run works on a disposable clone
If the setup worked directly in the working tree, each run would modify the repository and the next one would measure these modifications rather than the configuration. The tool we use below therefore clones NÉON **at a tag**, `etalon-v1`, into a temporary directory for each run. Without this precaution, `main` advances, a classroom fixes issue #1, and yesterday's measurements can no longer be compared to tomorrow's without anything signaling it.

This guard is not entirely sufficient, as a tag remains a name that its owner can move. We will return to this in the "Generalize" section.
:::

### The sliders, by hand

#### The model

::: info Exercise (in class)
Run the same request on two different model sizes: the one you normally use and the largest one you have access to. The request is intentionally minimal; it's the kind of request one naturally writes on the first day. We will call it a "negligent request" in the rest of this module:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Be sure to create two separate clones beforehand using the command

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

and work directly in these two directories depending on the model.

Read the two diffs, then the two `/session`. Note your observations without drawing conclusions: the section on repetitions will explain why two runs are not enough to distinguish between two models.
:::

#### The reasoning effort

`pi --help` lists seven reasoning levels, from `off` to `max`. This is a simple slider to manipulate, so it's tempting to start with it.

::: info Exercise (in class)
Run the same task with `--thinking minimal`, then with `--thinking max`, and compare the output tokens and the response. You will find no difference, because both flags produce exactly the same request if you use the `gemma-4-31b` model.

For this model, there are only two modes: thinking `on` or `off`.

Repeat the comparison between two truly distinct levels on your model, for example `off` and `high`, and measure the difference.
:::

Reasoning does have an effect when measured between two real levels, and our measurements below will show its magnitude. The general lesson is instead about the trust to place in settings: **a setting exposed by the harness is not necessarily passed to the model**, because between the configuration you type and the request that is sent lies a mapping table written by someone, which may be incomplete. You will encounter this situation several times in the course, and regularly in your work. Get into the habit of checking where a configuration or a flag ends up before trusting it.

### What we write

#### `AGENTS.md`, the global configuration point

The rules file placed at the root of the repository enters the context at each turn, making it a good candidate for defining the global framework of our project. When the agent makes a mistake, the natural reaction is to add a sentence, then another. However, you must be careful, as adding a new line every time has a cost, and the larger the file, the less the agent will see the whole picture. Furthermore, model improvements mean that some lines are true today but will be obsolete in a future update. There is a real need for continuous refactoring here that is important to do throughout the evolution of your project.

We will impose a strong constraint for this course.

::: danger Budget: 40 lines
NÉON's `AGENTS.md` will never exceed 40 lines, from the beginning to the end of the course. Each module that wants to add a rule must first remove one, or rephrase to fit both into one.

This constraint forces you to perform the continuous refactoring described above: every rule must earn its place, and a short file is much more likely to be actually followed than a long style guide.
:::

But we can also rely on other files and state this in `AGENTS.md` so that it reads them if needed. For example, we can tell it that conventions are in `CONTRIBUTING.md`, the architecture in `README.md`, and the history in git.

Out of our twenty executions of issue #1 with the neglected request, **none launched the test suite** and **none added a case**.

::: info Exercise (in-class)
Write NÉON's `AGENTS.md` based on your own executions rather than ours: review the diffs you just produced and look for what the agent did without being asked, or omitted when it was requested. Ensure that it runs the tests every time it modifies the code and adds them if there is no coverage.

Here is the starting base, to be discussed and amended. This is the very file that our measurements use, and it is versioned in the experiments below:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning One `AGENTS.md` can hide another
Pi loads these files cumulatively, starting from your personal `~/.pi/agent/AGENTS.md`, then from each parent directory upwards, and finally from the current directory. A personal rules file is thus invited into all your measurements without any signal.

The `--no-context-files` flag, shortened to `-nc`, disables this discovery, which is essential for clean measurement. The measurement tool below works in a disposable clone where only the `AGENTS.md` file of the current directory (NEON) is placed.
:::

#### The system prompt

Pi allows you to entirely replace its system prompt with a `.pi/SYSTEM.md` at the project root or a global `~/.pi/agent/SYSTEM.md`. The `--system-prompt` option follows a slightly different rule, as context files and skills continue to be added on top, meaning you never start from a completely blank page.

::: info Exercise (self-guided)
Create a three-line `.pi/SYSTEM.md`. This is the building block that our measurements place in the clone for the `-system_prompt` configuration:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Rerun the same task and compare the input tokens, turns, duration, and the contents of the diff.
:::


Pi's system prompt takes up 550 tokens. Everything else happens elsewhere, and we encourage you to modify it only for good reasons. We show it to you here to illustrate the flexibility Pi offers.

#### A throttled window, to observe compaction

When the context approaches the limit, Pi compacts, meaning it summarizes old messages and keeps only the most recent ones intact. Triggering follows the rule `contextTokens > contextWindow - reserveTokens`, where `reserveTokens` is 16,384 by default and represents the space left for the response. The cut is visible in `\tree`, and `/compact` allows you to force it, with optional instructions to guide the summary.

On NEON, compaction will never be triggered. The repository is 617 lines long, `gemma-4-31b` reports a window of about 128,000 tokens, which places the threshold around 112,000, and our most expensive experiment only reaches this total by accumulating thirteen turns, none of which weigh more than ten thousand tokens. Observing the mechanism therefore requires creating a constraint.

::: info Exercise (self-guided)
Declare a second entry in `~/.pi/agent/models.json`, pointing to the same service but announcing a 32,000 token window:

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

Add thresholds to NEON's `.pi/settings.json` that are consistent with this small window:

```json
{ "compaction": { "reserveTokens": 4000, "keepRecentTokens": 8000 } }
```

You then have both regimes in `/model`: the real model at 128K and the same one throttled to 32K. Have the agent work on several files with the second one until the trigger is hit, read the produced summary, then check in `\tree` where the cut occurred and if the agent still knows what it was asked at the start.
:::

This manipulation also shows that Pi compacts to 32,000 tokens not because the model is saturating, but because you told it to. The window a harness knows is a configuration line and not a property of the model. This finding will be useful the day when an agent starts compacting too early for no apparent reason.

### A more comprehensive experiment

#### The setup

We will study the influence of the different parts of the context more closely by launching Pi sessions with a set of repetitions to try to see the convergence of the results.

To do this, we will use [trysquare](https://github.com/AI-for-dev/trysquare), a tool written in Python and specifically designed for this training. It launches scenario configurations, records each execution, aggregates them, and provides a summary of the results. It knows nothing about NÉON, nothing about issue #1, and nothing about this training.

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

We will not go into the design and usage details. You can refer to the documentation: https://ai-for-dev.github.io/trysquare/.

We are providing you here with only the information sufficient for this training. In the `scenarios` directory, you will find the description of the experiments. In each of them, you will find the model used (the one you find in Pi) and the number of repetitions. You will also find the different configurations the experiment includes as well as the validation tests.

#### The experimental plan

The chosen plan is the simplest one that remains readable: a **base**, then a set of variants making micro-changes.

The base, called `nothing`, reproduces what someone does on the first day: the neglected request, no rules file, the agent's system prompt. We go just a bit further by not including reasoning. It contains the prompt that was provided to you a bit higher up during your first tests. Every other configuration simply adds elements to see the impact on the response.

| configuration                    | what changes                                                   |
| -------------------------------- | --------------------------------------------------------------- |
| `nothing`                        | nothing, this is the reference                                        |
| `+thinking`                      | `thinking = "high"`                                             |
| `+agents`                        | `brick/AGENTS.md` is placed in the clone                      |
| `+well_crafted`                  | the prompt properly describes the problem and refers to ISSUE.md |
| `-system_prompt`                 | the system prompt is replaced by three lines                 |
| `+agents+well_crafted`           | `AGENTS.md` + well-written prompt                                 |
| `+agents+add_tests+well_crafted` | the tests we want to see pass are added here                   |

An experiment is contained in a file: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

When you look at the results in the experiment directory, you will see other configurations than those in the table above. They belong to other modules. We will discuss them later.

The well-written prompt does not copy the ticket content. `ISSUES.md` already describes how to fix the bug in the repository that the agent has at hand. The prompt therefore specifies the issue, the scope, and the termination criterion, and nothing more:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

This configuration thus measures whether pointing to a written document is enough for the agent to read it and take it into account. If the prompt copied the solution, we would only be measuring the agent's ability to follow an instruction just given to it.

#### Validation tests

In order to judge the quality of the results, we must define a number of validation tests. We list them here, adding their description.

- **delivered**: the test ran to completion without interruption.
- **suite_lancee**: the agent thought to run the tests found in the `game` directory.
- **in_scope**: the agent only modified the files it was asked to modify and the lines corresponding to the problem.
- **tests_ajoutes**: the agent thought to add tests to check the ball bouncing off bricks.
- **`sonde.test.js`**: at the end of the modifications, we will run tests to verify that the changes made to the code correctly address the problem overall as described in `ISSUE.md`. This probe will also be used in the `+add_tests` configuration, where tests will be directly accessible from the start. The goal is to see if the agent is able to fix its errors based on the tests.

#### Traces

During the experiment, we save a number of traces to analyze more closely what happened during post-processing.

For each run, you have access to:

- a Pi session export in JSONL format that can be converted to HTML format (we will talk about this a bit later)
- a `validation` directory mentioning the status of the validation tests
- a `configuration.json` file reminding you of the run framework (model, harness, tests...)
- a patch (`diff.patch`) telling you what was modified in the NEON code during this run

At the end of the experiment, you have access to a summary in HTML and Markdown formats providing the validation success rates for each configuration as well as averages for token costs and run durations.

#### How many repetitions, and why

Each configuration is executed multiple times, and the reason is already very clear in the baseline configuration.

Here are the first six executions of `nothing`, strictly identical in their configuration: same model, same effort, same prompt, same repository at the same commit.

| execution       | 1      | 2      | 3      | 4       | 5      | 6       |
| --------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| input tokens    | 13,126 | 16,035 | 13,060 | 13,144  | 14,771 | 13,188  |
| turns           | 4      | 5      | 4      | 4       | 5      | 4       |
| duration        | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterion met  | yes    | yes    | yes    | **no**  | yes    | **no**  |

The cost varies by less than a quarter, the number of turns takes two values, and the response changes one out of three times. A single execution of this configuration would have given you, depending on the draw, "the baseline fixes the bug" or "the baseline does not fix it".

The best-equipped configuration shifts its dispersion to cost rather than response. On `+agents+add_tests+well_crafted`, input tokens range from 42,731 to 2,420,677, an extent of **×57**, and three consecutive executions yield 2,420,677, 2,147,526, then 594,786.

An agent is not deterministic, and the gap between two executions of the same configuration is of the same order of magnitude as the effect of most levers, meaning that a single execution per configuration measures the draw rather than the lever.

Given this dispersion, trysquare never publishes a single figure. Two notions are enough to read its tables.

**One point is one percentage point of success.** `+agents+add_tests+well_crafted` meets the criterion 18 out of 20 times, or 90%, and `nothing` 11 out of 20 times, or 55%: the difference is **+35 points**. Only valid executions count; those that delivered nothing are removed from both sides, which explains why a denominator might be lower than the number of repetitions.

**The interval comes from bootstrapping.** We randomly sample twenty executions from each group with replacement, recalculate the gap, and repeat this ten thousand times; the published bounds are the 2.5% and 97.5% percentiles of the ten thousand resulting gaps. Similar executions result in a narrow interval, while dispersed executions result in a wide interval. The seed is written in `trysquare.toml`, so the bounds are recalculated identically.

Reading a gap then comes down to asking a single question: **does this interval contain zero?** If it does not, the gap is marked `*` and is **established**. If it does, it is marked `o` and is **inconclusive**, regardless of the center value.

Both cases are in the matrix. The +35 points above come with an interval from +10 to +60, so the gain is certainly positive, although we cannot say if it is worth ten points or sixty. The `+well_crafted` configuration shows +17 points on this same criterion, but its interval contains zero: these executions remain compatible with a lever that helps as well as with one that hinders.

The `o` markers are still displayed in the tables, with a reminder under each one: no conclusion can be based on a gap marked `o`.

The number of repetitions remains a parameter, because the right choice depends on what you are looking for. **Three are enough to see the dispersion**, which is the goal in the classroom. **Distinguishing between two close levers requires much more**, and the columns counting successes are the most demanding: 2/3 versus 3/3 means almost nothing, whereas 8/20 versus 20/20 is significant. The tables published below use twenty repetitions for this reason.

::: info Exercise (in class, then independently)
Start with the full plan, which costs nothing:

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

The config is taken from the nearest `trysquare.toml`, so the one in `scripts/trysquare-campaign/` as long as you launch from this directory.

Then run the matrix with three repetitions and let it run while you discuss the sliders:

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

Sub-commands that cost nothing run immediately, and they are useful afterward:

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**Independently**, copy `scenarios/issue1-contexte.toml`, change a configuration, and run it again. You will not have touched the tool, the validator, or other configurations, and this is the only artifact of this module that will not become obsolete.
:::

#### Our measurements

You must have noticed during your first attempts with `trysquare`: taking measurements takes time. For about twenty repetitions, it will take you between 2h and 3h to get all the results including those from the next module. We have therefore preferred to provide you with a complete campaign carried out beforehand, in which you can navigate through the directories of each execution as you did previously.

Here is what we obtained in August 2026, on `ilaas` and `gemma-4-31b`, against NÉON commit `d62ccd1f`, with **twenty repetitions per configuration**. The two skill configurations are in the archive and belong to the following module; they are excluded from the tables below, except for a note at the end.

| configuration                    | `delivered` | `suite_run`    | `tests_added`   | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

And the probe columns, with the criterion at the top:

| configuration                    | bricks    | angles    | output    | neighbors | traversal |
| -------------------------------- | --------- | --------- | --------- | --------- | --------- |
| `nothing`                        | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                      | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                        | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                  | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                 | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`           | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

The denominators for `+well_crafted` and `+thinking` are 18 and 19 in the cost columns because ILaaS returned `Request timed out` during measurement, and the relevant executions produced nothing worth noting.

We draw five insights from these two tables, and the last one will transition to the following module. All discrepancies mentioned below come from the intervals described above, using the same mark `*` for a confirmed discrepancy and `o` for an inconclusive discrepancy. Comparisons not made against `nothing` are obtained by re-running the calculation against another reference, which costs nothing and requires no re-measurement. The verdict column relates to the sole metric declared by `[verdict].criterion`; reading a discrepancy in another column requires changing this line of the scenario before rendering:

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

The output goes into a `synthesis_ref-<référence>.md` next to the usual synthesis, which remains untouched.

**The scoped prompt ensures that everything specified in the ticket is done, and nothing more.** `tests_ajoutes` goes from 0/20 to 17/20 and `rebond_angles` from 0/20 to 14/20- two columns that were empty and are now being filled. Yet, the prompt says nothing about the bounce mechanism: it names the issue, the scope, and the stop criterion, while `ISSUES.md` describes the corner, exiting the rectangle, the grid seam, and tunneling. The corner remains at **0/20 across the four configurations that do not scope the ticket**, totaling eighty consecutive runs. Therefore, pointing to a written document is sufficient for it to be read, and the content of that document determines what will be processed.

**The rules file only shifts the process, and it no longer shifts anything once the ticket is correct.** `+agents` moves `suite_lancee` from 0/20 to 20/20, because one of its four lines names the command. On the criterion, it gives 9/20 compared to 11/20 baseline- an inconclusive gap- and on `tests_ajoutes` it remains at 0/20 since none of its lines mention tests. Added on top of the scoped prompt, it brings **absolutely nothing**: 11/20 vs 13/20 on the criterion, 12/20 vs 14/20 on the corner, 17/20 vs 17/20 on added tests, with none of these three gaps being distinguishable from zero. The rules file is a substitute for a good ticket rather than a supplement, which leads to a writing rule directly applicable to the forty-line budget: a line that a correct ticket would say anyway is a line to be removed.

**Reasoning shifts the criterion, and it is the only thing that does not trigger reading the ticket.** `+thinking` gives 16/20 on `rebond_briques`, a gap of +29 points whose interval excludes zero. It is the only lever in the matrix, aside from those affecting the ticket, that shifts the correction itself. Its corner column remains at 0/20 and its added tests at 3/20: reasoning improves what the model does with what is in front of it, but does not lead it to seek out what is missing.

**The well-crafted prompt leads to red tests being written, and one in five executions stops there.** The `touched` column says it unambiguously: for `+well_crafted` and `+agents+well_crafted`, four out of twenty executions never open `game/neon.js`, including two or three that only write to `game/neon.test.js` and one or two that deliver nothing at all. No other configuration shows this behavior; `nothing`, `+agents`, and `-system_prompt` touch the source in twenty out of twenty executions. The explanation is in the ticket, which lists five sub-cases and ends with "each case above added **first as a red test**, then green": `gemma-4-31b` writes the red tests and stops there, because it is unable to process the entire specification. This is also why the correctness criterion does not increase even though the corner cases do: the model has a work budget, and describing more work in the ticket does not increase it.

**Providing the tests fixes this drop-off.** The `+agents+add_tests+well_crafted` configuration is compared against `+agents+well_crafted`, the only one from which it differs only by the probe placed in the tree:

| column           | `+agents+well_crafted` | `+add_tests` | gap                  |
| ----------------- | ---------------------- | ------------ | ---------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | N/A                    | **20/20**    |                        |

The four correctness columns increase, and the four gaps are established. Therefore, the lever does more than just gain edge cases; it also catches up the criterion itself. Note the width of the intervals, and specifically the one for the corner, which starts at a single point: these gaps are established in the sense that they are positive, without being able to determine their size more accurately than by a factor of fifty.

`sonde_intacte` is 20/20, which means the model did not try to change the reference tests. And `tests_ajoutes` does not change, which is consistent with an agent that already has the cases in front of it and has no reason to rewrite them.

::: warning No gemma cost column is citable here
The matrix contains 1,151 retries—meaning turns that were restarted because the provider failed—and the box below shows how concentrated they are on the heaviest configurations. A retry replays the turn with all the accumulated context, so it inflates the cost columns and, above all, re-steers the agent.

The same scenario measured on `opencode-go` and `deepseek-v4-flash` records **37**, which makes theirs readable:

| configuration                    | turns | duration |
| -------------------------------- | ----- | -------- |
| `nothing`                        | 19    | 163 s    |
| `+agents`                        | 12    | 65 s     |
| `-system_prompt`                 | 17    | 142 s    |
| `+well_crafted`                  | 15    | 252 s    |
| `+thinking`                      | 19    | 490 s    |
| `+agents+well_crafted`           | 14    | 561 s    |
| `+agents+add_tests+well_crafted` | 13    | 410 s    |

The input tokens of the two matrices cannot be put in the same table, for a reason that has nothing to do with the model: ILaaS reports no cache, with `cacheRead` being zero across its one hundred and eighty runs, so its input column is the sum of full prefixes reread at each turn. opencode Zen reports cache, up to five million tokens read in a single run. The same configuration therefore shows 558,000 input tokens on one side and 15,000 on the other, without either being wrong. This is the practical half of what the first part of this module explains about caching: input cost depends on the model provider's configuration, and enabling cache allows for a drastic reduction in the bill.
:::

#### Three checks before citing a table

A matrix publishes tables, intervals, and verdicts, which can give the impression of solid conclusions. However, while developing this course, we encountered several phenomena that can discredit certain results.

::: warning The retry count
A retry is a turn that the tool had to relaunch because the provider failed. It replays this turn with all the accumulated context, thus inflating the cost columns, and above all, it restarts the agent: the workflow is no longer the same.

On the `gemma-4-31b` matrix, the count is **1,151**, and it is not evenly distributed:

| configuration                    | retries |
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

Nothing on short-context configurations, everything on high-reasoning ones, and all the more as the accumulated context grows: a single run of `+agents+add_tests+well_crafted` consumed 2.4 million input tokens over sixty-three turns and accumulated eighteen retries. The same scenario measured on `opencode-go` and `deepseek-v4-flash` has **thirty-seven** in total.
:::

::: warning The importance of the validation test
A uniformly black column looks like agent behavior and could be a validator flaw. The only way to distinguish them is for the metric to state **why** it responded false, and not just that it responded false.

Our validator does this for `suite_lancee`: when it recognizes no suite run, it copies all the commands the agent issued into its reasoning. This precaution is important because the form of the command varies between models much more than the command itself. `deepseek-v4-flash` prefixes every working directory call (`cd .../repo && npm test`, 664 times across the matrix) and readily redirects the output (`npm test 2>&1 | tail -30`, 80 times), whereas `gemma-4-31b` types `npm test` plainly. A validation test that only recognized the latter form would score the first model zero across the entire matrix.

In conclusion, **write your metrics carefully and test them on a test set**. They must be reliable. Note any strange behavior before jumping to hasty conclusions.
:::

::: warning What the comparison of the two models reveals, and what it does not
Both matrices (`gemma-4-31b` and `deepseek-v4-flash`) cover the same scenario, the same nine configurations, and the same NÉON commit, so their score columns can be read against each other. The model and the provider changed together, which makes it impossible to attribute a gap to one rather than the other, yet still reveals this in the corner column:

| configuration          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Both models react to the same lever and in the same direction, with the more capable one starting higher and climbing higher.
:::

These figures are not meant to be taken at face value or copied in a year. Rerun the matrix: that is precisely what it is for, and the one you obtain will replace this one.

Well-maintained context makes the agent disciplined and thorough regarding what the ticket mentions, without making it exhaustive: the edge of the brick is never reached where the ticket does not describe it, and tunneling remains the lowest column of all those the probe measures. Going beyond what the written material contains will require an independent reviewer and a verification loop, which is the subject of the modules on delegation and workflows.

::: warning Three tempting conclusions that the intervals do not allow
Each of the following sentences is based on an exact figure from the campaign published on this page, and none of them hold up.
:::

**"The rules file breaks the fix."** `+agents` gives 9/20 on the criterion versus 11/20 for the baseline. The gap is -10 points, but its interval contains zero: we cannot conclude anything, in either direction.

**"Removing the system prompt improves the bounce."** `-system_prompt` gives 14/20 versus 11/20, or +15 points, and the interval also contains zero. With only three well-chosen executions, we would have obtained 3/3 versus 1/3 and we might have believed it for a long time.

**"The well-crafted prompt fixes the bug better."** `+well_crafted` gives +17 points on the criterion, inconclusive. The real effect of this lever is seen elsewhere, on the added tests and on the corner, where the gaps are measured in tens of points and leave no doubt.

Repeating three times is therefore not enough: an effect that does not exceed the dispersion of its own configuration is not an effect. And an effect established for this task, with this ticket and this model, is established only within this framework.
:::

You have just performed an evaluation, in the sense that behaviors are compared on the same task, with repetitions and acknowledging the noisy measurement, whereas a test answers a closed question with yes or no. Module 3.2 will formalize this practice with evaluation files and an LLM-judge, for criteria that this module's probe could not handle.

### The stack versus the baseline

The levers in this module require attention and time, whereas a more capable model is simply obtained by paying more. It is therefore legitimate to wonder whether it is more cost-effective to refine your context or to change the model. The second half of this question is not measured here, and we explain why below. The first half is, for a constant model, by pitting the two extreme configurations of the matrix against each other.

::: info Exercise (in class)
Compare the `nothing` configuration, which receives a one-line request and nothing else, and the `+agents+add_tests+well_crafted` configuration, which has the reasoning, the well-crafted ticket, the `AGENTS.md` and the probe placed in the tree. Look first at the diffs, then at the probe columns, and only at the end at what each one cost.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | -------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, gap +35 points         |
| `rebond_sortie`    | 9/20      | **18/20**                        |
| `rebond_voisines`  | 7/20      | **18/20**                        |
| `rebond_angles`    | 0/20      | **18/20**                        |
| `rebond_traversee` | 0/20      | **17/20**                        |
| `suite_lancee`     | 0/20      | 20/20                            |
| `tests_ajoutes`    | 0/20      | 17/20                            |
| median turns       | 19        | 13                               |
| median duration     | 163 s     | 410 s                            |

The last two lines are taken from the `deepseek-v4-flash` matrix, whose thirty-seven runs make the cost columns readable, and the score columns from `gemma-4-31b`.

The complete harness reaches eighteen out of twenty on a criterion where the baseline peaks at eleven, and the most severe column of the probe goes from 7/20 to 18/20. This confirms Addy Osmani's thesis, *« a decent model with a great harness beats a great model with a bad harness »*, verified on its easiest half to establish: with a strictly constant model, the harness alone makes the difference between a fix that works half the time and a fix that works nine times out of ten.

The corner case goes from 0/20 to 18/20, and the framed prompt alone already obtained fourteen: the bulk of the gain comes from the fact that the prompt refers to a ticket in `ISSUES.md` that names the case, and the probe adds the perseverance that was missing to finish the job.

### What this module cannot achieve

The only lever that led the model to handle everything the ticket requests is the one that put the tests in front of it. This configuration is, however, somewhat artificial: the edge cases were written in advance, by us, in the very file that scores them. In a real ticket, no one will provide them to you.

What this configuration actually provides is perseverance. The model gives up on a long ticket because it exhausts its budget formulating the cases instead of fixing them; receiving the already formulated cases restores this budget. The question for the next module is therefore whether a **skill**, meaning a work procedure written once and reloaded on demand, can produce the same perseverance without providing the tests.


## Generalizing

Eight principles of this module remain valid beyond Pi, `ilaas`, and the version of the packages you just installed.

**What is stable in front, what varies behind.** The cache only works on an unchanged prefix and costs fifty times less than the input, so any volatile data placed early in the context, whether it be a timestamp, a git state, or a date, invalidates everything that follows.

**Pointing to a written document is enough for it to be read, and what is written there determines the result.** Our framed ticket does not describe the rebound mechanism: it names the issue, the scope, and the stop criterion. Seventeen out of twenty executions read `ISSUES.md`, found the request for edge cases as red tests, and executed it, whereas the neglected request obtained none. The brick corner provides the clearest example: it is described in `ISSUES.md` and in none of our prompts, and it scores 0/20 in the four configurations that do not name the issue versus 14/20 in the one that does. Write what you expect in a document you can point to, and re-read that document before concluding anything about the agent.

**A model has a budget, and describing more work does not expand it.** Our ticket lists five sub-cases and requests a red test for each; four out of twenty executions write these red tests and never open the source file. This observation conditions what follows: either you reduce the request to what the model can handle, or you give it the means to go the distance, which is the subject of the next module.

**The rules file changes what the agent does, not what it finds, and it is only useful for what the ticket does not say.** It enters the context at every turn, making it powerful and costly, hence the importance of keeping it short, sourcing every rule from an observed failure, and refactoring it rather than lengthening it. Our measurements precisely frame what it buys: the `+agents` configuration increases the number of executions that launch the test suite from 0/20 to 20/20, leaves the correction criterion unchanged, and adds nothing at all as soon as the framed prompt is present. The resulting writing rule is directly applicable to the forty-line budget: a line that a correct ticket would say anyway is a line to be removed.

**A setting exposed by the harness is not necessarily passed to the model.** Between the flag you type and the request that is sent lie code and mapping tables, as shown by `--thinking max`, which does not reach the model we use without anything warning you. The corollary for measurement is that what determines the experience must be written into the experience: a reasoning level inherited from a personal configuration made one of our configurations identical to its baseline in all published matrices.

**An effect that does not survive resampling is not an effect.** Repeating three times is not enough: as long as the interval of a gap contains zero, there is nothing to say. Of the nine configurations measured here, only three shift the correction criterion in an established way, while the other six each show a figure that might seem convincing. Furthermore, an established gap only exists for this task, with this ticket and this model.

**What is measured must be pinned by what does not move.** A tag is a name, and `git tag -f` moves it without leaving a trace on the measurement side, meaning two matrices can declare the same benchmark while having worked on two different versions of the code. Pin by the commit, which does not move, and if your tool does not yet allow it, at least archive what the name resolved at the time of measurement.

**A metric must say why, not just what.** A uniformly black column looks like agent behavior and could be a validator flaw, and nothing distinguishes the two as long as the metric only answers true or false. Have it write what it ruled on: ours copies the commands the agent issued under every "false," which allows you to verify a zero instead of taking it on faith.

**Write the hypothesis before measuring, and version it.** A hypothesis written after the measurements is nothing more than a disguised conclusion. Ours, `hypotheses/issue1-contexte.md`, contains a prediction that turned out to be false, and because it was written in advance, we published it as such instead of reformulating it as a discovery after the fact.

## Deliverable

Three items, the first two used throughout the day and the third to be used in Act 4.

**1. NÉON's `AGENTS.md`**, versioned in the repository, under 40 lines, with each rule justified by a failure you observed.

**2. The matrix directory** produced by `trysquare run`, along with its log line. The deliverable is not a copied table but the archive used to rebuild it: the raw measurements, sessions, diffs, and the revision of the tool that performed the measurement. Without this archive, the matrix can be neither verified nor rescored, and its figures are no better than an opinion.

**3. The decision sheet**, one line per lever:

| lever                     | measured effect | adopted? | why |
| -------------------------- | ------------ | -------- | -------- |
| model choice            |              |          |          |
| reasoning effort     |              |          |          |
| scoped ticket               |              |          |          |
| pointed ticket content   |              |          |          |
| `AGENTS.md`                |              |          |          |
| system prompt             |              |          |          |
| tests provided in advance     |              |          |          |
| scheduling / cache     |              |          |          |
| compaction                 |              |          |          |
| executable criterion (probe) |              |          |          |

Two lines were added to this sheet after our latest measurements. "Linked ticket content" is included because the rewrite of `ISSUES.md` shifted more columns than any harness setting, and "pre-provided tests" because it is the only lever that compensated for the model's performance drop on a long ticket.

This sheet constitutes the first actual entry in the "your harness?" column of the mapping table for the "context" row. The following five modules will do the same for their respective components, so that you will approach the capstone with a table already filled by your experiences.

::: tip Success Criterion
You can cite a lever that you measured as having no effect on NÉON, and state the precise condition under which it would have one elsewhere.

Our example is `AGENTS.md`: it does not shift the correctness criterion by a single point, and it would become decisive on a ticket whose usual failure is one of process rather than reasoning, or on a repository where the tickets are poorly written. Yours will be different, and that is the point. This criterion requires having seen the numbers and understood that the task and its material determine them. It therefore cannot be satisfied from memory.
:::

## Pitfalls

**Concluding from a single run**, which remains the main and most costly pitfall, as it produces lasting convictions based on noise.

**Injecting volatile data into the cacheable area.** A date, a `git status`, or a timestamp placed early in the context invalidates all subsequent cache, and makes you pay dearly for a saving you thought you had achieved.

**Forgetting your personal `AGENTS.md`**, loaded in addition to the project's one, invisible in the interface, and which skews all your measurements as long as you do not use `-nc`.

**Taking a flag at face value**, when `--thinking max` may have no effect without Pi warning you.

**Mistaking the absence of saturation for the absence of a problem.** In a comfortable window, nothing ever overflows, which only means the alarm signal will not sound and cost will be your only indicator.

**Judging based on a pattern when you can judge based on behavior.** Searching a diff to see if it looks like the expected solution answers a different question than "does this diff solve the problem", and it is in this gap that false greens reside. Look for the executable form before resigning to the pattern, and then to the judge.

**Not counting retries.** A matrix measured while the provider fails and retries does not measure the configuration, yet it gives a complete appearance: tables, intervals, verdicts. The retry count must therefore be read as a full-fledged result column.

**Believing a uniformly black column.** Zero across all configurations looks like model behavior and might be a comparator that is too strict, like the one that rejected `cd /tmp/x && npm test` because it only knew `npm test`. Check the reason attached to a false before drawing a conclusion.

**Trusting a tag.** It moves, and nothing in a table will tell you. The only way to know afterwards is the commit archived per execution, and the only way to avoid it is to pin by that commit.

**Comparing costs between two providers.** They don't count the same things: one reports cache and the other doesn't, so that one's "input" column is the sum of full prefixes and the other's is the part that wasn't already cached. The ratio between the two is meaningless.

## For further reading

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), the study that justifies why we shouldn't just fill the window.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), on the shift from isolated prompting toward context architecture.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), whose thesis is what the baseline stack comparison tests.
- [Pi documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), and specifically its pages on compaction, models, and settings.
- [trysquare](https://github.com/AI-for-dev/trysquare), the measurement tool used in this module, and its scenario writing guide.
- The training's trysquare campaign, `scripts/trysquare-campaign/`, with its hypotheses written before measurement and its archived matrices. This is the only place where the figures on this page are verifiable.
