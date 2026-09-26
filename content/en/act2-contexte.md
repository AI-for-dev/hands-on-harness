# The context and the window: what goes in, what it costs

::: tip Objectives of this module
- Be able to say what is actually in the context window, and what each part costs
- Work the levers that fill it: model, reasoning effort, prompt, `AGENTS.md`, system prompt
- Build a reproducible measurement setup and use it to make decisions
- Leave with a short `AGENTS.md` and a justified decision on each lever
:::

Context management is the building block all the others depend on: a subagent exists to keep the main context from being polluted, a memory to keep it from being filled with what you could find again, and a permission to keep a file you shouldn't have read from being dumped into it. So we have to start by knowing what the window contains and what each part costs, otherwise the modules that follow are just recipes applied without being understood.

We proceed in the usual order: understand what is in the window, reconstruct the levers that fill it, then work out what still holds when the tool changes.

::: info A reading convention
Each exercise is marked **in class** or **on your own**. The in-class track is designed to fit in the session and to suffice for understanding the module's stakes. The on-your-own exercises go deeper, and are written to be redone alone, later, on your own repository.
:::

## Understand

### Five sources, one window

When you type a question into Pi, the model receives a stack in which your question is just one line:

1. the **system prompt**, which describes to the model its role, its tools and its conventions;
2. the **context files**, `AGENTS.md` and `CLAUDE.md`, loaded from your home directory, then from each parent directory as you go up, then from the current directory;
3. the **tool descriptions**, in JSON, one per available tool;
4. **your question**;
5. and, as the loop runs, the **history**, that is, each model response, each tool call and each tool output.

The first four sources are stable from one turn to the next, while the fifth grows with every turn, which almost always makes it the one responsible for overflows.

::: info Exercise (in class)
Open a session, ask any question, then export the session with `\export`. Open the resulting HTML file and read Pi's system prompt in full, something most coding agents don't let you do.

Identify what describes **capabilities** and what describes **conventions**: later, we will measure the real weight of each of the two categories.
:::

On a request as trivial as “just say OK”, with no context file, no skill, and no extension, the input weighs **1,660 tokens**, and it drops to **1,110** if you replace Pi's system prompt with three lines. Pi's system prompt therefore costs about **550 tokens**, which is little compared with what tool outputs and history will add to it later. Most of what fills a context window does not come from the harness but from what you and the agent pour into it over the course of the session.

### What does using an LLM cost?

A call to the model is billed in three line items, expressed per million tokens. Here are the rates for the two models taken from the opencode Go offering:

| model               | input | output | cache read |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0.14 $ | 0.28 $ | 0.0028 $         |
| `deepseek-v4-pro`   | 1.74 $ | 3.48 $ | 0.0145 $         |

These rates are the ones published by [opencode Zen](https://opencode.ai/docs/zen/). Our measurements below run on ILaaS, which charges nothing to participants in this training, and therefore count tokens rather than euros. Both read the same way, except that a token counter does not warn you as you spend.

Two gaps stand out. The first separates the two models, since the `pro` costs 12.4 times more than the `flash` at list price. It is a first way to realize that one model has more capabilities than another. The second gap, much wider, separates input from cache read: a factor of **50** on `flash` and **120** on `pro`.

This second gap is what makes a code agent economically viable, because an agent rereads its full history at every turn and would otherwise pay twenty times the price of its context over a session of twenty turns.

::: info Exercise (in class)
In an interactive session, ask five questions in a row on the same file, typing `/session` after each, and switch models with `/model` before the fourth. The questions must explicitly forbid any file rereading, otherwise a new tool output will land in the context and blur the reading.

Here is the exact sequence we measured, here in non-interactive mode so it can be reproduced as-is. The `-c` option continues the previous session, and accents are omitted in the commands without affecting the result:

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

These five turns produce six model calls, because the first one consumes two: one to request the reading of `theme.js`, a second to answer once the tool's output is back.

| call | turn | prompt                         | model   | input | cache read      | cost           |
| ---- | ---- | ------------------------------ | ------- | ----- | --------------- | -------------- |
| 1    | 1    | "Read `game/theme.js`..."      | `flash` | 1,675 | 0               | 0.000254 $     |
| 2    | 1    | (continuation, after the read) | `flash` | 307   | 1,664           | 0.000081 $     |
| 3    | 2    | "name a color..."              | `flash` | 66    | 2,048           | 0.000053 $     |
| 4    | 3    | "how many colors..."           | `flash` | 118   | 2,048           | 0.000087 $     |
| 5    | 4    | "confirm this number..."       | `pro`   | 2,521 | **0**           | **0.005455 $** |
| 6    | 5    | "repeat this number..."        | `pro`   | 148   | 2,432           | 0.000362 $     |

The cache kicks in from the second call, including within a single turn, and brings the cost down by a factor of three to five. The model switch at the fourth turn resets the cache read to zero and charges the whole prefix again at full rate: this single turn costs fifteen times as much as the next one, with the same model.
:::

::: warning If `pi -p` hangs without displaying anything
When running from a script, redirect standard input with `< /dev/null`. In non-interactive mode, `pi` waits on its standard input as long as it remains open, which blocks indefinitely when it is called from a bash script, for example. The trysquare measurement tool, which we will describe below, knows about this trap and closes the standard input of each run by using `stdin=subprocess.DEVNULL` in a Python `subprocess.run` command.
:::

The cache only works on an **unchanged prefix**, from which the context ordering rule derives: anything that varies must be placed after what is stable. A timestamp or a `git status` slipped into the system prompt invalidates everything that follows, tools, question and history included, and makes you pay the full rate again at every turn, whereas the same data placed in the current turn's message costs nothing, since it already sits in the zone that varies.

Also remember that switching models mid-session is not free, which is worth bearing in mind every time you switch from one model to another with `/model`.

## Rebuilding

### The task, and what counts as success

All the measurements in this module relate to the same task, NÉON's **issue #1**: the ball goes through the bricks instead of bouncing.

The issue is described in `ISSUES.md`, at the root of the [NÉON repository](https://github.com/AI-for-dev/neon): the ball passes through the bricks, and the issue details the expected behavior after the fix. We could give it directly to the agent, but we won't for now: we first want to see how the agent behaves depending on the prompt we give it and the surrounding framework.

This issue has several subtleties that are hard for an agent to spot on its own. The agent will quickly identify the problem and suggest computing the distance from the ball to the brick's sides, so as to reverse one of the two speeds depending on which side is hit. The corner case, rare but real, and the case of a speed large enough for the ball to cross the brick without ever overlapping it, however, have very little chance of being handled.

In addition to fixing the bug, we want to start defining a framework and verifying that the agent doesn't step outside it. This framework comes down to three rules:

- The agent may only modify `game/neon.js` and `game/neon.test.js` and nothing else.
- The agent must run the tests to check it hasn't broken anything.
- The agent must add tests if coverage isn't good. This is our case here: there are no tests that verify the ball's behavior with the brick.

Here is what we propose to measure on each run:

| metric | what it says |
| --- | --- |
| `delivered` | the agent modified at least one file |
| `in_scope` | it only touched `game/neon.js` and `game/neon.test.js` |
| `suite_lancee` | it ran `npm test` itself, as read from its session |
| `tests_ajoutes` | the test suite has more cases than the baseline |
| **`rebond_briques`** | **the criterion**: on each of the four faces, the hit axis reverses and the other one stays unchanged |
| `rebond_angles` | at the corner, both components are reversed |
| `rebond_sortie` | after the bounce, the ball is back outside the brick's rectangle |
| `rebond_voisines` | at a grid seam, the bounce is applied once and not twice |
| `rebond_traversee` | a fast ball no longer passes through the brick without touching it |

We test all these points deterministically, without an LLM-as-a-judge: the tests that should exist are written in a probe file. An executable test is safer than an LLM tasked with confirming a desired behavior, whose probabilistic verdict can make you believe it's good when it isn't.

::: warning Each run works on a throwaway clone
If the setup worked directly in the working tree, each run would modify the repository and the next one would measure those modifications rather than the configuration. The tool we use below therefore clones NÉON **at a tag**, `etalon-v1`, into a temporary directory, on every run. Without this precaution, `main` advances, a class fixes issue #1, and yesterday's measurements can no longer be compared with tomorrow's, without anything signaling it.

This safeguard is not entirely sufficient, because a tag remains a name that its owner can move. We'll come back to this in the "Generalizing" section.
:::

### The knobs, by hand

#### The model

::: info Exercise (in class)
Run the same request on two models of different sizes: the one you usually use and the largest one you have access to. The request is deliberately minimal; it's the one you naturally write on the first day. We'll call it the "sloppy request" for the rest of this module:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Make sure to create two separate clones beforehand:

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

then work in the directory corresponding to the model being tested.

Read the two diffs, then the two `/session` files. Note your observations without drawing any conclusion: the section on repetitions will explain why two runs are not enough to tell two models apart.
:::

#### The reasoning effort

`pi --help` lists seven reasoning levels, from `off` to `max`. It's a simple knob to turn, so it's tempting to start with it.

::: info Exercise (in class)
Run the same task with `--thinking minimal`, then with `--thinking max`, and compare the output tokens and the answer. You won't find any difference, because the two flags produce exactly the same request if you use the `gemma-4-31b` model.

For this model, there are only two modes: thinking `on` or `off`.

Redo the comparison between two genuinely distinct levels on your model, for example `off` and `high`, and measure the difference.
:::

Reasoning does have an effect when you measure it between two real levels, and our measurements below will give its size. The general lesson is rather about how much trust to put in settings: **a setting exposed by the harness is not necessarily passed on to the model**, because between the configuration you type and the request that goes out lies a mapping table written by someone, which may be incomplete. You will run into this situation several times in the training, and regularly in your work. Get into the habit of finding where a configuration or a flag ends up before trusting it.

#### `AGENTS.md`, the global configuration point

#### `AGENTS.md`, the global configuration point

The rules file at the repository root enters the context at every turn, which makes it a good candidate for defining the overall framework of our project. When the agent makes a mistake, the natural reaction is to add a sentence to it, then another. Yet each line added has a cost, and the more the file grows, the less of it the agent sees; model improvements will moreover make lines that are true today obsolete. This file therefore requires continuous refactoring, throughout the life of the project.

For this training, we set a strong constraint.

::: danger Budget: 40 lines
NÉON's `AGENTS.md` will never exceed 40 lines, from the start to the end of the training. Any module that wants to add a rule to it must first remove one, or rephrase to fit both into a single one.

This constraint forces you to do the continuous refactoring work described above: every rule must earn its place, and a short file is far more likely to actually be followed than a long style guide.
:::

We can also rely on other files and say so in `AGENTS.md`, so that the agent reads them when needed. For example, we can tell it that the conventions are in `CONTRIBUTING.md`, the architecture in `README.md`, and the history in git.

Across our twenty runs of issue #1 with the careless request, **none launched the test suite** and **none added a test case**.

::: info Exercise (in class)
Write NÉON's `AGENTS.md` based on your own runs rather than ours: re-read the diffs you just produced and look for what the agent did without being asked, or omitted when it was asked. Make sure it runs the tests every time it modifies the code, and adds some if there is no coverage.

Here is the starting base, to discuss and amend. It is the very file our measurements use, and it is versioned in the experiments below:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning One `AGENTS.md` can hide another
Pi loads these files cumulatively, starting with your personal `~/.pi/agent/AGENTS.md`, then from each parent directory above, then from the current directory. A personal rules file therefore ends up in all your measurements without anything flagging it.

The `--no-context-files` flag, abbreviated `-nc`, disables this discovery, which is essential for measuring cleanly. The measurement tool below works in a disposable clone where only the `AGENTS.md` file from the current directory (NEON) is placed.
:::

#### The system prompt

Pi lets you replace its system prompt entirely with a `.pi/SYSTEM.md` at the project root or a global `~/.pi/agent/SYSTEM.md`. The `--system-prompt` option works slightly differently: context files and skills are still added on top, so you never quite start from a blank page.

::: info Exercise (on your own)
Create a three-line `.pi/SYSTEM.md`. This is the component our measurements place in the clone for the `-system_prompt` configuration:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Rerun the same task and compare input tokens, turns, duration, and what the diff contains.
:::


Pi's system prompt fits in 550 tokens. The rest of the work happens elsewhere, and we encourage you to change the system prompt only for good reasons. We show it here to illustrate the flexibility Pi offers.

#### A capped window, to see compaction

When the context approaches the limit, Pi compacts, meaning it summarizes older messages and keeps only the most recent ones intact. Triggering follows the rule `contextTokens > contextWindow - reserveTokens`, where `reserveTokens` defaults to 16,384 and represents the space left for the response. The cutoff is visible in `\tree`, and `/compact` lets you force it, with optional instructions to guide the summary.

On NÉON, compaction will never trigger. The repository has 617 lines, `gemma-4-31b` has a context window of about 128,000 tokens, which puts the threshold around 112,000, and our most token-hungry experiment only reaches that total by accumulating thirteen turns, none of which weighs more than about ten thousand tokens. Observing the mechanism therefore requires creating the constraint.

::: info Exercise (on your own)
In `~/.pi/agent/models.json`, declare a second entry pointing to the same service but with a 32,000-token window:

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

In NÉON's `.pi/settings.json`, add thresholds consistent with this small window:

```json
{ "compaction": { "reserveTokens": 4000, "keepRecentTokens": 8000 } }
```

You then have both modes in `/model`: the actual model at 128K and the same one capped at 32K. Put the agent to work on several files with the second one until compaction triggers, read the resulting summary, then use `\tree` to check where the cutoff happened and whether the agent still knows what it was originally asked to do.
:::

This experiment also shows that Pi compacts at 32,000 tokens not because the model saturates, but because you declared it so. The window a harness is aware of is a configuration line, not a property of the model. This observation will serve you well when an agent starts compacting too early for no apparent reason.

### A more complete experiment

#### The setup

We now study in finer detail the influence of the different parts of the context, running each configuration several times to account for the spread of the results.

To do this, we will use [trysquare](https://github.com/AI-for-dev/trysquare), a tool written in Python and designed specifically for this training. It runs a scenario's configurations, scores each run, aggregates, and provides a summary of the results. It knows nothing about NÉON, nothing about issue #1, nothing about this training.

`scripts/trysquare-campaign/` is the directory that holds the experiment. Here is its content:

```
scripts/trysquare-campaign/
  trysquare.toml     chemins machine : où est NÉON, où vivent les clones jetables
  scenarios/         une expérience = un fichier TOML autonome
  hypotheses/        ce qui est prédit, écrit avant de mesurer
  briques/           tickets, AGENTS.md, prompt système, compétences : le matériau
  validateurs/       ce qui note
  results/           une matrice par répertoire
```

We will not go into the design and usage details, which you can find in the [documentation](https://ai-for-dev.github.io/trysquare/). For this training, remember that the `scenarios/` directory describes the experiments: each file declares the model used (as Pi calls it), the number of repetitions, the experiment configurations, and the validation tests.

#### The experiment plan

The plan we kept is the simplest that stays readable: a **baseline**, then a set of variants that each change little.

The baseline, called `nothing`, reproduces what someone does on the first day: the sloppy request provided above during your first attempts, no rules file, the agent's system prompt, and reasoning turned off. Each other configuration adds one element to observe its effect on the response.

| configuration                    | what changes                                                 |
| -------------------------------- | --------------------------------------------------------------- |
| `nothing`                        | nothing, it's the reference                                      |
| `+thinking`                      | `thinking = "high"`                                              |
| `+agents`                        | `brick/AGENTS.md` is placed in the clone                         |
| `+well_crafted`                  | the prompt describes the problem properly and refers to `ISSUES.md` |
| `-system_prompt`                 | the system prompt is replaced by three lines                     |
| `+agents+well_crafted`           | `AGENTS.md` + well-written prompt                                |
| `+agents+add_tests+well_crafted` | we also add the tests we want to see pass                        |

An experiment fits in a single file: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

The experiment directory contains other configurations besides those in the table above; they belong to other modules, and we will discuss them later.

The well-crafted prompt does not copy the content of the ticket. `ISSUES.md` already describes how to fix the bug, in the repository the agent has at hand. The prompt therefore names the issue, the scope, and the stopping criterion, and nothing more:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

This configuration therefore measures whether pointing to a written document is enough for the agent to go read it and take it into account. If the prompt copied the solution, we would only be measuring the agent's ability to follow an instruction we just gave it.

#### Validation tests

To assess the quality of the results, the scenario declares validation tests:

- **delivered** : the run went all the way to the end, without interruption.
- **suite_lancee** : the agent remembered to run the tests in the `game` directory.
- **in_scope** : the agent modified only the files it was asked to modify, and only the lines that correspond to the problem.
- **tests_ajoutes** : the agent remembered to add tests for the ball bouncing off the bricks.
- **`sonde.test.js`** : at the end of the run, this probe checks that the code changes fix the problem in its entirety, as described in `ISSUES.md`. It is also placed from the start in the `+add_tests` configuration, to see whether the agent is able to fix its errors based on the tests.

#### Traces

The experiment saves traces that let you analyze afterwards what happened. For each run, you have access to:

- an export of the Pi session in JSONL format, which can be converted to HTML (we will get back to this a little later);
- a `validation` directory that reports the state of the validation tests;
- a `configuration.json` file that records the run's setup (model, harness, tests...);
- a patch (`diff.patch`) that shows what was modified in the NÉON code during the run.

At the end of the experiment, a summary in HTML and Markdown formats gives the validation pass rates for each configuration, along with averages of token costs and run durations.

#### How many repetitions, and why

Each configuration is run several times, and the reason for that is already clear in the base configuration.

Here are the first six runs of `nothing`, strictly identical in their configuration: same model, same effort, same prompt, same repository at the same commit.

| run            | 1      | 2      | 3      | 4       | 5      | 6       |
| -------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| input tokens   | 13,126 | 16,035 | 13,060 | 13,144  | 14,771 | 13,188  |
| turns          | 4      | 5      | 4      | 4       | 5      | 4       |
| duration       | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterion met  | yes    | yes    | yes    | **no**  | yes    | **no**  |

Cost varies by less than a quarter, the number of turns takes two values, and the answer changes one time out of three. A single run of this configuration would have given you, depending on the draw, "the base fixes the bug" or "the base does not fix it".

The best-equipped configuration shifts its dispersion onto cost rather than onto the answer. On `+agents+add_tests+well_crafted`, input tokens range from 42,731 to 2,420,677, a spread of **×57**, and three consecutive runs give 2,420,677, 2,147,526 then 594,786.

An agent is not deterministic, and the gap between two runs of the same configuration is the same order of magnitude as the effect of most levers, which means that a single run per configuration measures the draw rather than the lever.

Faced with this dispersion, trysquare never publishes a single number. Two concepts suffice to read its tables.

**A point is a percentage point of success.** `+agents+add_tests+well_crafted` meets the criterion 18 times out of 20, i.e. 90%, and `nothing` 11 times out of 20, i.e. 55%: the gap is **+35 points**. Only valid runs count, those that delivered nothing being removed from both sides, which is why a denominator can be lower than the number of repetitions.

**The interval comes from bootstrapping.** You draw twenty runs at random with replacement from each group, recompute the gap, and repeat ten thousand times; the published bounds are the 2.5% and 97.5% quantiles of the ten thousand gaps obtained. Similar runs give a tight interval, scattered runs a wide one. The seed is written in `trysquare.toml`, so the bounds are recomputed identically.

Reading a gap then comes down to a single question: **does this interval contain zero?** If it does not, the gap is marked `*` and is **established**. If it does, it is marked `o` and is **not conclusive**, whatever the value at the center.

Both cases are in the matrix. The +35 points above come with an interval from +10 to +60, so the gain is certainly positive, though one cannot say whether it is worth ten points or sixty. The `+well_crafted` configuration shows +17 points on the same criterion, but its interval contains zero: these runs remain compatible both with a lever that helps and with a lever that hurts.

The `o`s are still displayed in the tables, with a reminder under each of them: no conclusion can be based on a gap marked `o`.

The number of repetitions remains a parameter, because the right choice depends on what you are looking for. **Three suffice to see the spread**, which is the goal in class. **Telling two close levers apart requires much more**, and the columns that count successes are the most demanding: a 2/3 against 3/3 says almost nothing, whereas an 8/20 against 20/20 holds up. The tables published below use twenty repetitions for this reason.

::: info Exercise (in class, then on your own)
Start with the full plan, which spends nothing:

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

The config is taken from the nearest `trysquare.toml`, so the one in `scripts/trysquare-campaign/` as long as you launch from this directory.

Then launch the matrix with three repetitions and let it run while you discuss the knobs:

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

The subcommands that spend nothing pass directly, and they come in handy afterwards:

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**On your own**, copy `scenarios/issue1-contexte.toml`, change a configuration, and rerun. You will have touched neither the tool, nor the validator, nor the other configurations, and it is the only artifact of this module that will not become obsolete.
:::

#### Our measurements

You must have noticed it during your first tries with `trysquare`: making measurements takes time. For about twenty repetitions, you will need between 2 h and 3 h to get all the results, together with those of the next module. We therefore preferred to give you a complete campaign run in advance, in which you can browse the directories of each run as you did previously.

Here is what we obtained in August 2026, on `ilaas` and `gemma-4-31b`, against commit `d62ccd1f` of NÉON, with **twenty repetitions per configuration**. The two skill configurations appear in the archive and belong to the next module; they are left out of the tables below, except for a remark at the end.

| configuration                    | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| -------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                        | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                      | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                        | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                  | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                 | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`           | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted` | 20/20       | 20/20          | 17/20           | 20/20      |

And the probe columns, with the criterion at the top:

| configuration | bricks | corners | exit | neighbors | traversal |
| --- | --- | --- | --- | --- | --- |
| `nothing` | 11/20 | **0/20** | 9/20 | 7/20 | 0/20 |
| `+thinking` | 16/20 | **0/20** | 17/20 | 15/20 | 0/20 |
| `+agents` | 9/20 | **0/20** | 8/20 | 6/20 | 0/20 |
| `+well_crafted` | 13/20 | **14/20** | 13/20 | 13/20 | 4/20 |
| `-system_prompt` | 14/20 | **0/20** | 14/20 | 13/20 | 0/20 |
| `+agents+well_crafted` | 11/20 | **12/20** | 9/20 | 9/20 | 12/20 |
| `+agents+add_tests+well_crafted` | **18/20** | **18/20** | **18/20** | **18/20** | 17/20 |

The denominators for `+well_crafted` and `+thinking` are 18 and 19 in the cost columns, because ILaaS returned some `Request timed out` during the measurement and the affected runs produced nothing to grade.

We draw five lessons from these two tables, and the last one will transition to the next module. All the gaps cited below come from the intervals described above, with the same `*` mark for an established gap and `o` for an inconclusive gap. Comparisons that are not made against `nothing` are obtained by replaying the calculation against another reference, which costs nothing and does not remeasure anything. Since the verdict column is based solely on the metric declared by `[verdict].criterion`, reading a gap in another column requires changing that line of the scenario before rendering:

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

The output goes into a `synthesis_ref-<référence>.md` alongside the usual synthesis, which is left untouched.

**The scoped prompt gets everything the ticket names done, and nothing more.** `tests_ajoutes` goes from 0/20 to 17/20 and `rebond_angles` from 0/20 to 14/20, two columns that were empty and now fill. Yet the prompt says nothing about the bounce mechanism: it names the outcome, the scope, and the stopping criterion, and it is `ISSUES.md` that describes the corner, the exit from the rectangle, the grid seam, and tunneling. The corner stays at **0/20 in the four configurations that do not scope the ticket**, i.e. eighty consecutive runs. So pointing to a written document is enough for it to be read, and it is the content of that document that decides what will be handled.

**The rules file only moves the process, and it moves nothing more once the ticket is correct.** `+agents` takes `suite_lancee` from 0/20 to 20/20, because one of its four lines names the command. On the criterion it scores 9/20 against 11/20 at baseline, an inconclusive gap, and on `tests_ajoutes` it stays at 0/20 since none of its lines mention tests. Added on top of the framed prompt it brings **strictly nothing**: 11/20 against 13/20 on the criterion, 12/20 against 14/20 on the corner, 17/20 against 17/20 on the added tests, none of these three gaps being distinguishable from zero. The rules file is a substitute for the right ticket rather than a complement, which yields a writing rule directly applicable to the forty-line budget: a line that a correct ticket would say anyway is a line to remove.

**Reasoning moves the criterion, but on its own it does not get the ticket read.** `+thinking` scores 16/20 on `rebond_briques`, a gap of +29 points whose interval excludes zero. It is the only lever in the matrix, apart from those that touch the ticket, to move the correction itself. Its corner column stays at 0/20 and its added tests at 3/20: reasoning improves what the model does with what it has in front of it, but does not lead it to go fetch what it lacks.

**The framed prompt gets the red tests written, and one run in five stops there.** The `touched` column says it unambiguously: on `+well_crafted` and `+agents+well_crafted`, four runs out of twenty never open `game/neon.js`, of which two or three write only in `game/neon.test.js` and one or two deliver nothing at all. No other configuration shows this behavior, with `nothing`, `+agents` and `-system_prompt` touching the source in twenty runs out of twenty. The explanation is in the ticket, which lists five sub-cases and ends with "each case above added **first as a red test**, then green": `gemma-4-31b` writes the reds and stops there, unable to process the entire specification. That is also why the correction criterion does not rise while the corner rises: the model has a work budget, and describing more work in the ticket does not enlarge it.

**Providing the tests fixes this stall.** The configuration `+agents+add_tests+well_crafted` is read against `+agents+well_crafted`, the only one it differs from solely by the probe dropped into the tree:

| metric            | `+agents+well_crafted` | `+add_tests` | gap                   |
| ----------------- | ---------------------- | ------------ | --------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | n/a                    | **20/20**    |                        |

The four correction columns all rise, and the four gaps are established. So the lever doesn't only win edge cases; it also raises the criterion itself. Note the width of the intervals, especially the corner one that starts at a single point: these gaps are established in the sense that they are positive, but their size cannot be pinned down better than a factor of fifty.

`sonde_intacte` scores 20/20, meaning the model did not try to change the reference tests. And `tests_ajoutes` does not move, which is consistent with an agent that already has the cases in front of it and has no reason to rewrite them.

::: warning No gemma cost column can be cited here
The matrix contains 1,151 retries, that is, turns restarted because the provider failed, and the box below shows how heavily they are concentrated on the heaviest configurations. A retry replays the turn with all the accumulated context, so it inflates the cost columns and, above all, it re-drives the agent.

The same scenario measured on `opencode-go` and `deepseek-v4-flash` has **37** of them, which makes theirs readable:

| configuration                    | turns    | duration |
| -------------------------------- | -------- | -------- |
| `nothing`                        | 19       | 163 s    |
| `+agents`                        | 12       | 65 s     |
| `-system_prompt`                 | 17       | 142 s    |
| `+well_crafted`                  | 15       | 252 s    |
| `+thinking`                      | 19       | 490 s    |
| `+agents+well_crafted`           | 14       | 561 s    |
| `+agents+add_tests+well_crafted` | 13       | 410 s    |

The input tokens of the two matrices do not fit into the same table, for a reason that has nothing to do with the model: ILaaS reports no cache, `cacheRead` being zero across its one hundred and eighty runs, so its input column is the sum of the full prefixes re-read at each turn. opencode Zen reports the cache, up to five million tokens read on a single run. The same configuration therefore displays 558,000 input tokens on one side and 15,000 on the other, without either being wrong. This is the practical half of what the first part of this module explains about the cache: the cost of inputs depends on the model provider's configuration, and enabling the cache can drastically reduce the bill.
:::

#### Three checks before citing a table

A matrix publishes tables, intervals, and verdicts, which can give the impression of solid conclusions. However, while building this training, we encountered several phenomena that can discredit some results.

::: warning The retry count
A retry is a turn the tool had to relaunch because the provider had failed. It replays that turn with all the accumulated context, so it inflates the cost columns and, above all, re-runs the agent: this is no longer the same work behavior.

On the `gemma-4-31b` matrix, the count is **1,151**, and it is not evenly distributed:

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

Nothing on the short-context configurations, everything on the high-reasoning ones, and increasingly so as the accumulated context grows: a single run of `+agents+add_tests+well_crafted` consumed 2.4 million input tokens over 63 turns and accumulated 18 retries. The same scenario measured on `opencode-go` and `deepseek-v4-flash` records **37** in total.
:::

::: warning The importance of the validation test
A uniformly black column looks like agent behavior and can be a validator flaw. The only way to tell them apart is for the metric to say **why** it answered false, and not just that it answered false.

Our validator does this for `suite_lancee`: when it recognizes no launch of the suite, it copies into its reason all the commands the agent ran. This precaution is important, because the form of the command varies from one model to another far more than the command itself. `deepseek-v4-flash` prefixes every call with the working directory (`cd .../repo && npm test`, 664 times across the matrix) and readily redirects output (`npm test 2>&1 | tail -30`, 80 times), whereas `gemma-4-31b` types bare `npm test`. A validation test that only knew the latter form would score the first model zero across the whole matrix.

In conclusion, **write your metrics with care and run them against a set of tests**. They have to be reliable. Note any odd behavior before drawing hasty conclusions from it.
:::

::: warning What the comparison of the two models can tell us, and what it cannot
Both matrices (`gemma-4-31b` and `deepseek-v4-flash`) cover the same scenario, the same nine configurations, and the same NÉON commit, so their score columns can be read against each other. The model and the provider changed together, which rules out attributing a gap to one rather than the other, and still lets us see this on the corner column:

| configuration          | `gemma-4-31b` | `deepseek-v4-flash` |
| ---------------------- | ------------- | ------------------- |
| `nothing`              | 0/20          | 8/20                |
| `+agents`              | 0/20          | 8/20                |
| `+well_crafted`        | 14/20         | 19/20               |
| `+agents+well_crafted` | 12/20         | 19/20               |

Both models react to the same lever and in the same direction, the more capable one starting higher and climbing higher.
:::

These figures are not meant to be taken at face value or copied a year from now. Rerun the matrix: that is precisely what it is for, and the one you get will replace this one.

A well-maintained context makes the agent disciplined and thorough on what the ticket names, without making it exhaustive: the brick's corner is never reached where the ticket does not describe it, and tunneling remains the lowest column of all those the probe measures. Going beyond what the written material contains will require an independent reviewer and a verification loop, which is the subject of the modules on delegation and workflows.

::: warning Three tempting conclusions the intervals do not support
Each of the following sentences relies on an exact figure from the campaign published on this page, and none of them holds.

**"The rules file breaks correctness."** `+agents` scores 9/20 on the criterion versus 11/20 for the baseline. The gap is -10 points but its interval contains zero: we can say nothing about it, one way or the other.

**“Removing the system prompt improves the bounce.”** `-system_prompt` gives 14/20 against 11/20, or +15 points, and the interval contains zero there too. With only three well-drawn executions, we would have gotten 3/3 against 1/3 and might have believed in it for good.

**“The framed prompt fixes the bug better.”** `+well_crafted` gives +17 points on the criterion, inconclusive. The real effect of this lever shows up elsewhere, on the added tests and on the corner, where the gaps run into tens of points and leave no doubt.

Repeating three times is therefore not enough: an effect that does not exceed the dispersion of its own configuration is not an effect. And an effect established on this task, with this ticket and this model, is established only within that setting.
:::

You have just practiced evaluation, in the sense of comparing behaviors on the same task, with repetitions and knowing that the measurement is noisy, where a test answers a closed question with yes or no. Module 3.2 will formalize this practice with evaluation files and an LLM judge, for the criteria that this module's probe could not have handled.

### The stack against the baseline

The levers in this module require attention and time, while a more capable model is simply obtained by paying more. It is therefore legitimate to ask whether it is more cost-effective to refine one's context or to change models. The second half of that question is not measured here, and we explain why below. The first half is, holding the model constant, by pitting the two extreme configurations of the matrix against each other.

::: info Exercise (in class)
Compare the `nothing` configuration, which receives a one-line request and nothing else, with the `+agents+add_tests+well_crafted` configuration, which has the reasoning, the framed ticket, the `AGENTS.md`, and the probe placed in the tree. Look first at the diffs, then at the probe's columns, and only at the very end at what each one cost.
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

The last two rows come from the `deepseek-v4-flash` matrix, whose thirty-seven reruns make the cost columns readable, and the score columns from `gemma-4-31b`.

The full harness reaches eighteen out of twenty on a criterion where the baseline tops out at eleven, and the probe's strictest column goes from 7/20 to 18/20. This is Addy Osmani's thesis, *"a decent model with a great harness beats a great model with a bad harness"*, verified on the half that is easiest to establish: holding the model rigorously constant, the harness alone makes the difference between a fix that works half the time and a fix that works nine times out of ten.

The corner goes from 0/20 to 18/20, and the framed prompt alone already scored fourteen: most of the gain comes from the fact that the prompt refers to a ticket in `ISSUES.md` that names the case, and the probe adds, on top of that, the persistence that was missing to finish the job.

### What this module cannot achieve

The only lever that got the model to handle everything the ticket asks for is the one that put the tests in front of it. This configuration, however, has something artificial about it: the edge cases were written in advance, by us, in the very file that grades. On a real ticket, no one will provide them to you.

What this configuration actually brings is persistence. The model gives up on a long ticket because it exhausts its budget formulating the cases instead of fixing them; receiving the cases already formulated gives it that budget back. The question for the next module is therefore whether a **skill**, that is, a working procedure written once and reloaded on demand, can produce the same persistence without providing the tests.


## Generalizing

Eight principles from this module remain valid beyond Pi, `ilaas`, and the package versions you just installed.

**What is stable up front, what varies behind.** The cache only works on an unchanged prefix and costs fifty times less than the input, so any volatile data placed early in the context, whether a timestamp, a git state, or a date, invalidates everything that follows.

**Pointing to a written document is enough for it to be read, and what is written in it decides the result.** Our framed ticket does not describe the bounce mechanism: it names the issue, the scope, and the stopping criterion. Seventeen runs out of twenty went and read `ISSUES.md`, found there the request for edge cases as red tests, and carried it out, whereas the neglected request had obtained none. The brick corner gives the clearest illustration: it is described in `ISSUES.md` and in none of our prompts, and it scores 0/20 in the four configurations that do not name the issue against 14/20 in the one that does. Write what you expect in a document you can point to, and re-read that document before concluding anything about the agent.

**A model has a budget, and describing more work does not expand it.** Our ticket lists five sub-cases and asks for a red test for each one; four runs out of twenty write these red tests and never open the source file. This observation shapes what follows: either you reduce the request to what the model can carry, or you give it what it takes to go the distance, which is the subject of the next module.

**The rules file changes what the agent does, not what it finds, and it only helps with what the ticket does not say.** It enters the context at every turn, which makes it both a strong lever and a costly one, hence the value of keeping it short, grounding each rule in an observed failure, and refactoring it rather than extending it. Our measurements define precisely what it buys: the `+agents` configuration raises the number of runs that launch the test suite from 0/20 to 20/20, leaves the grading criterion unchanged, and adds nothing at all once the framed prompt is present. The writing rule that follows from this applies directly to the forty-line budget: a line that a correct ticket would state anyway is a line to remove.

**A setting exposed by the harness is not necessarily passed through to the model.** Between the flag you type and the request that goes out lie code and mapping tables, as `--thinking max` shows: it does not reach the model we use, and nothing warns you about it. The corollary on the measurement side is that what determines the experiment must be written into the experiment: a reasoning level inherited from a personal configuration made one of our configurations identical to its baseline in every published matrix.

**An effect that does not survive resampling is not an effect.** Repeating three times is not enough: as long as the interval for a difference contains zero, there is nothing to say about it. Of the nine configurations measured here, only three shift the grading criterion in an established way, while the other six each show a number that might look convincing. Moreover, an established difference holds only on this task, with this ticket and this model.

**What is measured must be pinned down by what does not move.** A tag is a name, and `git tag -f` moves it without leaving a trace on the measurement side, so that two matrices may declare the same reference and have worked on two different versions of the code. Pin it by the commit, which does not move, and if your tool does not allow it yet, at least archive what the name resolved to at the time of measurement.

**A metric must say why, not just what.** A uniformly black column looks like agent behavior but may be a validator defect, and nothing distinguishes the two as long as the metric merely answers true or false. Make it write what it ruled on: ours copies, under each false, the commands the agent ran, and that is what lets you verify a zero instead of taking it at face value.

**Write the hypothesis before measuring, and version it.** A hypothesis written after the measurements is only a disguised conclusion. Ours, `hypotheses/issue1-contexte.md`, contains a prediction that turned out to be false, and it is precisely because it was written in advance that we published it as such instead of reformulating it after the fact as a discovery.

## Deliverable

This module produces three pieces: the first two are used all day long, and the third will be used in act 4.

**1. NÉON's `AGENTS.md`**, versioned in the repository, kept under 40 lines, each rule justified by a failure you observed.

**2. The matrix directory** produced by `trysquare run`, with its log line. The deliverable is not a copied table but the archive that makes it possible to regenerate it: the raw measurements, the sessions, the diffs, and the revision of the tool that measured. Without this archive, the matrix can be neither verified nor re-scored, and its numbers are worth no more than an opinion.

**3. The decision sheet**, one row per lever:

| lever                      | measured effect | adopted? | why |
| -------------------------- | --------------- | -------- | --- |
| model choice               |                 |          |     |
| reasoning effort           |                 |          |     |
| scoped ticket              |                 |          |     |
| content of the pointed ticket |              |          |     |
| `AGENTS.md`                |                 |          |     |
| system prompt              |                 |          |     |
| tests provided in advance  |                 |          |     |
| scheduling / cache         |                 |          |     |
| compaction                 |                 |          |     |
| executable criterion (probe) |              |          |     |

Two rows were added to this sheet after our latest measurements. "Content of the pointed ticket" appears there because rewriting `ISSUES.md` moved more columns than any harness setting, and "tests provided in advance" because it is the only lever that made up for the model's drop-off on a long ticket.

This sheet constitutes the first real fill of the "your harness?" column of the correspondence table, for the "context" row. The next five modules will do the same for their building block, so you will approach the capstone with a table already filled by your experiments.

::: tip Success criterion
You can cite a lever you measured as having no effect on NÉON, and say under what precise condition it would have one elsewhere.

Our example is `AGENTS.md`: it does not move the grading criterion by a single point, and it would become decisive on a ticket whose usual failure is one of process rather than reasoning, or on a repository whose tickets are poorly written. Yours will be different, and that is the point. This criterion requires having seen the numbers and having understood that it is the task and its material that determine them. It therefore cannot be satisfied from memory alone.
:::

## The pitfalls

**Concluding from a single run**, which remains the main and most costly pitfall, since it produces lasting convictions from noise.

**Injecting volatile content into the cacheable zone.** A date, a `git status` or a timestamp placed early in the context invalidates all the cache that follows, and makes you pay full price for a saving you thought you had banked.

**Forgetting your personal `AGENTS.md`**, loaded in addition to the project's, invisible in the interface, and which skews all your measurements until you use `-nc`.

**Taking a flag at face value**, even though `--thinking max` can have no effect at all without Pi warning you.

**Mistaking the absence of saturation for an absence of problems.** On a comfortable window, nothing ever overflows, which only means no alarm will sound and cost will be your only indicator.

**Judging by pattern when you can judge by behavior.** Looking in a diff for whether it resembles the expected solution answers a different question than "does this diff solve the problem", and it is in that gap that false greens lie. Look for the executable form before resigning yourself to the pattern, then to the judge.

**Not counting retries.** A matrix measured while the provider fails and retries does not measure the configuration, and it gives it the full appearance of one: tables, intervals, verdicts. The retry count must therefore be read as a result column in its own right.

**Believing a uniformly black column.** Zero on all configurations looks like model behavior and can be an overly strict comparator, like the one that refused `cd /tmp/x && npm test` because it only knew `npm test`. Check the reason attached to a false before drawing a conclusion from it.

**Trusting a tag.** It moves, and nothing in a table will say so. The only way to know it after the fact is the commit archived per run, and the only way to avoid it is to pin by that commit.

**Comparing costs between two providers.** They do not count the same thing: one reports the cache and the other does not, so that the "input" column of one is the sum of full prefixes and that of the other the share that was not already cached. The ratio between the two means nothing.

## To go further

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), the study that justifies not just filling the window.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), on the shift from the isolated prompt toward context architecture.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), whose thesis is the one that comparing the stack to the base puts to the test.
- [Pi's documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), and in particular its pages on compaction, models, and settings.
- [trysquare](https://github.com/AI-for-dev/trysquare), the measurement tool used in this module, and its scenario writing guide.
- The training's trysquare campaign, `scripts/trysquare-campaign/`, with its hypotheses written before measurement and its archived matrices. It's the only place where this page's figures can be verified.
