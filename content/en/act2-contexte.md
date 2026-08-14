# Context and the window: what goes in, what it costs

::: tip Module Objectives
- Know how to state what is actually in the context window, and what each part costs
- Manipulate the levers that fill it: model, reasoning effort, prompt, `AGENTS.md`, system prompt
- Set up a reproducible measurement bench and use it to decide
- Leave with a short `AGENTS.md` and a reasoned decision for each lever
:::

Context management is the building block all the others depend on, since a subagent exists to avoid polluting the main context, a memory to avoid filling it with what could be looked up again, and a permission to avoid dumping into it a file that should not have been read. We must therefore start by knowing what the window contains and what each part costs, otherwise the modules that follow will be nothing more than recipes applied without being understood.

We proceed in the usual order: understand what is in the window, rebuild the levers that fill it, then identify what remains true when the tool changes.

::: info A reading convention
Each exercise is marked **in-class** or **on your own**. The in-class path is designed to fit within the session and to be enough to understand the module's stakes. The exercises done on your own go deeper, and are written to be redone alone, later, on your own repository.
:::

## Understanding

### Five sources, one single window

When you type a question into Pi, the model receives a stack in which your question is only one line:

1. the **system prompt**, which describes to the model its role, its tools, and its conventions;
2. the **context files**, `AGENTS.md` and `CLAUDE.md`, loaded from your home directory, then from each parent directory going up, then from the current directory;
3. the **tool descriptions**, in JSON, one per available tool;
4. **your question**;
5. and, as the loop turns, the **history**, meaning every response from the model, every tool call, and every tool output.

The first four sources are stable from one turn to the next, while the fifth grows with each turn, which makes it almost always the cause of overflows.

::: info Exercise (in-class)
Open a session, ask any question, then export the session with `\export`. Open the resulting HTML file and read Pi's system prompt in full, which most coding agents do not let you do.

Identify what describes **capabilities** and what describes **conventions**: we will measure further on the actual weight of each of these two categories.
:::

On a request as trivial as "just say OK", with no context file, no skill, and no extension, the input weighs **1,660 tokens**, and it drops to **1,110** if the Pi system prompt is replaced with three lines. Pi's system prompt therefore costs about **550 tokens**, which is little compared to what tool outputs and history will add to it afterward. Most of what fills a context window does not come from the harness but from what you and the agent pour into it over the course of the session.

### What does using an LLM cost?

A call to the model is billed in three categories, expressed per million tokens. Here are the rates for the two models taken from the opencode Go offering:

| model               | input  | output | cache read       |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0,14 $ | 0,28 $ | 0,0028 $         |
| `deepseek-v4-pro`   | 1,74 $ | 3,48 $ | 0,0145 $         |

These rates are the ones published by [opencode Zen](https://opencode.ai/docs/zen/). Our measurements further down run on ILaaS, which charges nothing to the participants of this training, and therefore count tokens rather than euros. The two read the same way, except that a token counter does not warn you when you are spending.

Two gaps stand out. The first separates the two models, since the `pro` costs 12.4 times more than the `flash` at nominal rates. This is a first way of realizing that one model has more capability than another. The second gap, much wider, separates input from cache read: a factor of **50** on `flash` and **120** on `pro`.

This second gap is what makes a coding agent economically viable, because an agent rereads its full history at every turn and would otherwise pay twenty times the price of its context over a twenty-turn session.

::: info Exercise (in-class)
In an interactive session, run five questions in a row about the same file, typing `/session` after each one, and switch models with `/model` before the fourth. The questions must explicitly forbid any file rereading, otherwise a new tool output will be added to the context and blur the reading.

Here is the exact sequence we measured, presented here in non-interactive mode so it is reproducible as is. The `-c` option continues the previous session, and accents are omitted from the commands without affecting the result:

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

These five turns produce six model calls, because the first one consumes two: one to request reading `theme.js`, a second to respond once the tool output has come back.

| call  | turn | prompt                     | model   | input  | cache read        | cost           |
| ----- | ---- | -------------------------- | ------- | ------ | ---------------- | -------------- |
| 1     | 1    | "Read `game/theme.js`..." | `flash` | 1 675  | 0                | 0,000254 $     |
| 2     | 1    | (continued, after the read)  | `flash` | 307    | 1 664            | 0,000081 $     |
| 3     | 2    | "name a color..."    | `flash` | 66     | 2 048            | 0,000053 $     |
| 4     | 3    | "how many colors in total..." | `flash` | 118    | 2 048            | 0,000087 $     |
| 5     | 4    | "confirm this number..."  | `pro`   | 2 521  | **0**            | **0,005455 $** |
| 6     | 5    | "repeat this number..."     | `pro`   | 148    | 2 432            | 0,000362 $     |

Caching kicks in from the second call onward, including within the same turn, and it brings the cost down by a factor of three to five. Switching models on the fourth turn resets the cache read to zero and makes the whole prefix payable again at the full rate: this single turn costs fifteen times more than the next one, with the same model.
:::

::: warning If `pi -p` freezes without displaying anything
From a script, redirect standard input with `< /dev/null`. In non-interactive mode, `pi` waits on its standard input as long as it stays open, which blocks indefinitely when it is called from a bash script, for instance. The trysquare measurement tool described further down knows this trap and closes the standard input of each run using `stdin=subprocess.DEVNULL` in a Python `subprocess.run` command.
:::

Caching only works on an **unchanged prefix**, which is where the context ordering rule comes from: everything that varies must be placed behind what is stable. A timestamp or a `git status` slipped into the system prompt invalidates everything that follows, tools, question, and history included, and makes you pay full price again at every turn, whereas the same data placed in the current turn's message costs nothing since it is already in the zone that varies.

Also remember that switching models mid-session is not free, which is worth keeping in mind every time you switch from one model to another with `/model`.

## Rebuilding

### The task, and what counts as success

All the measurements in this module cover the same task, NÉON's **issue #1**: the ball goes through bricks instead of bouncing off them.

The ticket is described in `ISSUES.md` at the root of the NEON repository (https://github.com/AI-for-dev/neon). It explains that the ball passes through bricks, along with the various behaviors that need fixing to get normal ball behavior. We could hand this ticket directly to the agent, but we will not do so for now. For the moment, we want to see how it behaves depending on the prompt we give it and the framework around it.

As you can see, this issue contains several subtleties that will be hard for the agent to find on its own. It will quickly spot the problem and propose computing a distance to the sides of the brick. Depending on which side is hit, it will flip one of the two velocities. But the problem at the corner, which is rare but real, or the problem of a velocity too high that would let the ball pass through the brick without even seeing it, there is unfortunately very little chance it will spot those.

In addition to fixing the bug, we want to start defining a framework and check that the agent does not step outside it. There are mainly three:

- The agent may only modify `game/neon.js` and `game/neon.test.js` and nothing else.
- The agent must run the tests to check that it has not broken anything.
- The agent must add tests if coverage is not good. This is our case here: there are no tests that check the ball's behavior with the brick.

Here is what we propose to measure on each run:

| metric                | what it says                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `delivered`          | the agent modified at least one file                                                         |
| `in_scope`           | it only touched `game/neon.js` and `game/neon.test.js`                                       |
| `suite_lancee`       | it ran `npm test` itself, as read from its session                                            |
| `tests_ajoutes`      | the suite has more cases than the baseline                                                     |
| **`rebond_briques`** | **the criterion**: on each of the four sides, the axis that was hit flips and the other does not move |
| `rebond_angles`      | in the corner, both components flip                                                |
| `rebond_sortie`      | after the bounce, the ball has come back out of the brick's rectangle                             |
| `rebond_voisines`    | on a seam of the grid, the bounce applies once and not twice                       |
| `rebond_traversee`   | a fast ball no longer passes through the brick without touching it                                 |

We will test all of these points deterministically and without using an LLM-as-a-judge. We wrote the tests that should exist in a probe file. Keep in mind that a test to check is always far more reliable than using an LLM to confirm a desired behavior. The probabilistic nature of the LLM can make you believe something is fine when it is not at all.

::: warning Each run works on a disposable clone
If the bench worked directly in the working tree, each run would modify the repository and the next one would measure these modifications rather than the configuration. The tool we use further down therefore clones NÉON **at a tag**, `etalon-v1`, into a temporary directory, on every run. Without this precaution, `main` moves forward, a workshop fixes issue #1, and yesterday's measurements no longer compare to tomorrow's without anything flagging it.

This guard is not entirely sufficient, since a tag is still a name that its owner can move. We will come back to this in the "Generalizing" section.
:::

### The sliders, by hand

#### The model

::: info Exercise (in-class)
Run the same request on two models of different sizes, the one you usually use and the largest one you have access to. The request is deliberately minimal, the kind you naturally write on day one. We will call it the "neglected request" for the rest of this module:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt.md

Be sure to first make two separate clones using the command

```bash
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-xxx
git clone --branch etalon-v1 git@github.com:AI-for-dev/neon.git neon-model-yyy
```

and work directly in these two directories, one per model.

Read both diffs, then both `/session`. Note your observations without drawing conclusions from them: the section on repetitions will explain why two runs are not enough to distinguish between two models.
:::

#### Reasoning effort

`pi --help` lists seven reasoning levels, from `off` to `max`. It is a simple slider to manipulate, which makes it tempting to start with it.

::: info Exercise (in-class)
Run the same task with `--thinking minimal`, then with `--thinking max`, and compare the output tokens and the response. You will find no difference, because both flags produce exactly the same request if you are using the `gemma-4-31b` model.

For this model, there are only two modes: thinking `on` or `off`.

Redo the comparison between two genuinely distinct levels on your model, for instance `off` and `high`, and measure the gap.
:::

Reasoning does have an effect when measured between two real levels, and our measurements further down will give its size. The general lesson is rather about the trust to place in settings: **a setting exposed by the harness is not necessarily passed on to the model**, because between the configuration you type and the request that is sent lies a mapping table written by someone, which can be incomplete. You will run into this situation several times during the training, and regularly in your work. Get into the habit of checking where a setting or a flag actually lands before trusting it.

### What we write

#### `AGENTS.md`, the global configuration point

The rules file placed at the root of the repository enters the context at every turn, which makes it a good candidate for defining the global framework of our project. When the agent makes a mistake, the natural reaction is to add a sentence to it, then another. Still, you have to stay vigilant, because adding a new line each time has a cost, and the larger the file, the less the agent will see the whole of it. Moreover, as models improve, some lines that are true today will become obsolete at a future update. There is a real ongoing refactoring job here, one that matters to do throughout the life of your project.

We will set a strong constraint here for this training.

::: danger Budget: 40 lines
NÉON's `AGENTS.md` will never exceed 40 lines, from the beginning to the end of the training. Any module wanting to add a rule to it must first remove one, or rephrase to fit both into a single line.

This constraint forces you to do the ongoing refactoring work described above: each rule must earn its place, and a short file has much better odds of actually being followed than a long style guide.
:::

But we can also rely on other files and say so in `AGENTS.md` so that the agent goes and reads them if needed. For instance, we can tell it that conventions are in `CONTRIBUTING.md`, architecture in `README.md`, and history in git.

On our twenty runs of issue #1 with the neglected request, **none ran the test suite** and **none added a test case**.

::: info Exercise (in-class)
Write NÉON's `AGENTS.md` starting from your own runs rather than ours: reread the diffs you just produced and look for what the agent did without being asked, or omitted when it was asked. Make sure it runs the tests every time it modifies the code, and adds tests when there is no coverage.

Here is the starting point, to discuss and amend. It is the exact file our measurements use, and it is versioned in the experiments further down:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning One `AGENTS.md` can hide another
Pi loads these files cumulatively, starting from your personal `~/.pi/agent/AGENTS.md`, then from each parent directory going up, then from the current directory. A personal rules file thus sneaks into all your measurements without anything signaling it.

The `--no-context-files` flag, shortened to `-nc`, disables this discovery, which is essential for measuring cleanly. The measurement tool further down works in a disposable clone where only the current directory's (NEON's) `AGENTS.md` file is placed.
:::

#### The system prompt

Pi lets you entirely replace its system prompt with a `.pi/SYSTEM.md` at the root of the project or a global `~/.pi/agent/SYSTEM.md`. The `--system-prompt` option follows a slightly different rule, since context files and skills keep being added on top, so you never quite start from a blank page.

::: info Exercise (on your own)
Create a three-line `.pi/SYSTEM.md`. This is the piece our measurements place in the clone for the `-system_prompt` configuration:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Rerun the same task and compare the input tokens, the turns, the duration, and what the diff contains.
:::


Pi's system prompt fits in 550 tokens. All the rest of the work happens elsewhere, and we encourage you to modify it only for good reasons. We show it to you here to illustrate the flexibility Pi offers.

#### A throttled window, to see compaction

When the context approaches the limit, Pi compacts, meaning it summarizes old messages and keeps only the most recent ones intact. Triggering follows the rule `contextTokens > contextWindow - reserveTokens`, where `reserveTokens` defaults to 16 384 and represents the room left for the response. The cutoff is visible in `\tree`, and `/compact` lets you force it, with optional instructions to steer the summary.

On NÉON, compaction will never trigger. The repository is 617 lines, `gemma-4-31b` advertises a window of about 128 000 tokens, which puts the threshold around 112 000, and our most expensive experiment only reaches this total by accumulating thirteen turns none of which weighs more than about ten thousand tokens. Observing the mechanism therefore requires manufacturing the constraint.

::: info Exercise (on your own)
Declare a second entry in `~/.pi/agent/models.json`, pointing to the same service but announcing a 32,000-token window:

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

You then have both regimes available in `/model`, the real model at 128K and the same one throttled to 32K. Have the agent work on several files with the second one until it triggers, read the resulting summary, then check in `\tree` where the cutoff happened and whether the agent still knows what it was originally asked.
:::

This exercise also shows that Pi compacts at 32,000 tokens not because the model is saturating, but because you declared it as such. The window a harness knows is a configuration line and not a property of the model. This observation will be useful to you the day an agent starts compacting too early for no apparent reason.

### A more complete experiment

#### The setup

We are going to study more finely the influence of the different parts of the context by launching Pi sessions with a set of repetitions to try to see the results converge.

To do this, we will use [trysquare](https://github.com/AI-for-dev/trysquare), a tool written in Python and specially designed for this training. It runs the configurations of a scenario, scores each run, aggregates, and provides a summary of the results. It knows nothing of NÉON, nothing of issue #1, nothing of this training.

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

Here we give you just enough information for this training. In the `scenarios` directory, you have the description of the experiments. In each of them, you will find the model used (the one you find in Pi) and the number of repetitions. You will also find the different configurations the experiment includes, as well as the validation tests.

#### The experimental design

The chosen design is the simplest one that remains readable: a **base**, then a set of variants making micro changes.

The base, called `nothing`, reproduces what someone does on day one: the neglected request, no rules file, the agent's system prompt. We go just a little further by leaving reasoning off. It uses the prompt given to you earlier during your first tests. Every other configuration only adds elements to see the impact on the response.

| configuration                     | what changes                                                    |
| --------------------------------- | ---------------------------------------------------------------- |
| `nothing`                         | nothing, this is the reference                                        |
| `+thinking`                       | `thinking = "high"`                                             |
| `+agents`                         | `brick/AGENTS.md` is placed in the clone                      |
| `+well_crafted`                   | the prompt properly describes the problem and refers to ISSUE.md |
| `-system_prompt`                  | the system prompt is replaced by three lines                 |
| `+agents+well_crafted`            | `AGENTS.md` + well-written prompt                                 |
| `+agents+add_tests+well_crafted`  | here we additionally add the tests we want to see pass   |

An experiment fits in a single file: `scripts/trysquare-campaign/scenarios/issue1-contexte.toml`.

<!-- <<<@/../scripts/trysquare-campaign/scenarios/issue1-contexte.toml{toml} -->

When you look at the results in the experiment's directory, you will see other configurations than those in the table above. They belong to other modules. We will discuss them later.

The well-written prompt does not copy the content of the ticket. `ISSUES.md` already describes how to fix the bug, in the repository the agent has at hand. The prompt therefore names the issue, the scope, and the stopping criterion, and nothing more:

<<<@/../scripts/trysquare-campaign/briques/issue1-well-crafted-prompt.md

This configuration therefore measures whether pointing to a written document is enough for the agent to go read it and take it into account. If the prompt copied out the solution, we would only be measuring the agent's ability to follow an instruction just handed to it.

#### The validation tests

To judge the quality of the results, we need to define a number of validation tests. We list them here along with their description.

- **delivered**: the run went through to the end and there was no interruption.
- **suite_lancee**: the agent remembered to run the tests found in the `game` directory.
- **in_scope**: the agent only modified the files it was asked to modify, and only the lines that correspond to the problem.
- **tests_ajoutes**: the agent remembered to add tests to check the ball's bounces off bricks.
- **`sonde.test.js`**: at the end of the changes, we run tests to check that the changes made in the code do properly fix the problem in its entirety, as described in `ISSUE.md`. This probe will also be used in the `+add_tests` configuration, where the tests will be directly available from the start. The goal is to see whether the agent is able to fix its mistakes based on the tests.

#### The traces

During the experiment, we save a number of traces in order to analyze a little more finely what happened, during post-processing.

For each run, you have access to

- an export of the Pi session in JSONL format, which can be converted back to HTML (we will talk about this a bit later)
- a `validation` directory that records the state of the validation tests
- a `configuration.json` file that reminds you of the run's framework (model, harness, tests...)
- a patch (`diff.patch`) that tells you what was modified in the NEON code during this run

At the end of the experiment, you have access to a summary in html and markdown format that gives you the validation success rates for each configuration, as well as averages for token costs and run duration.

#### How many repetitions, and why

Each configuration is run several times, and the reason is already clearly visible on the base configuration.

Here are the first six runs of `nothing`, strictly identical in their configuration: same model, same effort, same prompt, same repository at the same commit.

| run             | 1      | 2      | 3      | 4       | 5      | 6       |
| --------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| input tokens    | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| turns           | 4      | 5      | 4      | 4       | 5      | 4       |
| duration        | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterion met   | yes    | yes    | yes    | **no** | yes    | **no** |

The cost varies by less than a quarter, the number of turns takes two values, and the answer changes one time out of three. A single run of this configuration would have given you, depending on the draw, "the base fixes the bug" or "the base does not fix the bug".

The best-equipped configuration shifts its dispersion onto cost rather than the answer. On `+agents+add_tests+well_crafted`, input tokens range from 42 731 to 2 420 677, a spread of **×57**, and three consecutive runs give 2 420 677, 2 147 526, then 594 786.

An agent is not deterministic, and the gap between two runs of the same configuration is of the same order of magnitude as the effect of most levers, which means a single run per configuration measures the draw rather than the lever.

Faced with this dispersion, trysquare never publishes a single figure on its own. Two notions are enough to read its tables.

**A point is a percentage point of success.** `+agents+add_tests+well_crafted` reaches the criterion 18 times out of 20, or 90%, and `nothing` 11 times out of 20, or 55%: the gap is **+35 points**. Only valid runs count, with those that delivered nothing removed from both sides, which explains why a denominator can be lower than the number of repetitions.

**The interval comes from the bootstrap.** Twenty runs are drawn at random with replacement from each group, the gap is recomputed, and this is repeated ten thousand times; the published bounds are the 2.5% and 97.5% ranks of the ten thousand gaps obtained. Runs that resemble each other give a tight interval, scattered runs a wide one. The seed is written in `trysquare.toml`, so the bounds recompute identically.

Reading a gap then comes down to asking a single question: **does this interval contain zero?** If it does not, the gap is marked `*` and is **established**. If it does, it is marked `o` and is **inconclusive**, whatever the value at the center.

Both cases occur in the matrix. The +35 points above come with an interval from +10 to +60, so the gain is certainly positive, though we cannot say whether it is worth ten points or sixty. The `+well_crafted` configuration shows +17 points on this same criterion, but its interval contains zero: these runs remain compatible with a lever that helps as much as with a lever that hurts.

The `o` marks are still shown in the tables, with a reminder under each of them: no conclusion can rest on a gap marked `o`.

The number of repetitions remains a parameter, because the right choice depends on what you are looking for. **Three are enough to see the dispersion**, which is the goal in-class. **Distinguishing between two close levers requires much more**, and the columns counting successes are the most demanding: a 2/3 versus 3/3 means almost nothing, whereas an 8/20 versus 20/20 holds up. The tables published further down use twenty repetitions for this reason.

::: info Exercise (in-class, then on your own)
Start with the full plan, which costs nothing:

```bash
coa harness                        # l'environnement conda où vit trysquare
cd scripts/trysquare-campaign
trysquare run scenarios/issue1-contexte.toml --output resultats --dry-run
```

The config is taken from the nearest `trysquare.toml`, so the workbench's, as long as you run from this directory.

Then launch the matrix at three repetitions and let it run while you discuss the sliders:

```bash
trysquare run scenarios/issue1-contexte.toml --output resultats --repetitions 3
```

The subcommands that cost nothing run directly, and they are useful afterward:

```bash
# refabriquer les tables
trysquare render scenarios/issue1-contexte.toml --output resultats --repetitions 3
# renoter sans rejouer
trysquare replay resultats/issue1-contexte_... --scenario scenarios/issue1-contexte.toml --rescore
# joindre deux matrices
trysquare compare resultats/... resultats/...
```

**On your own**, copy `scenarios/issue1-contexte.toml`, change one configuration, and rerun. You will not have touched the tool, the validator, or the other configurations, and it is the only artifact of this module that will not become obsolete.
:::

#### Our measurements

You must have noticed it during your first attempts with `trysquare`: taking measurements takes time. For about twenty repetitions, it will take you between 2 and 3 hours to get all the results together with those of the next module. We therefore preferred to give you a complete campaign carried out beforehand, in which you can browse the directories of each run just as you did previously.

Here is what we obtained in August 2026, on `ilaas` and `gemma-4-31b`, against NÉON's commit `d62ccd1f`, with **twenty repetitions per configuration**. The two skill-based configurations are present in the archive and belong to the next module; they are left out of the tables below, except for one remark at the end.

| configuration                     | `delivered` | `suite_lancee` | `tests_ajoutes` | `in_scope` |
| ---------------------------------- | ----------- | -------------- | --------------- | ---------- |
| `nothing`                          | 20/20       | 0/20           | 0/20            | 20/20      |
| `+thinking`                        | 19/20       | 15/20          | 3/20            | 19/20      |
| `+agents`                          | 20/20       | **20/20**      | 0/20            | 20/20      |
| `+well_crafted`                    | **18/20**   | 20/20          | 17/20           | 18/20      |
| `-system_prompt`                   | 20/20       | 0/20           | 0/20            | 20/20      |
| `+agents+well_crafted`             | 19/20       | 20/20          | 17/20           | 19/20      |
| `+agents+add_tests+well_crafted`   | 20/20       | 20/20          | 17/20           | 20/20      |

And the probe's columns, with the criterion leading:

| configuration                     | bricks    | corners   | exit      | neighbors | tunneling |
| ---------------------------------- | --------- | --------- | --------- | --------- | --------- |
| `nothing`                          | 11/20     | **0/20**  | 9/20      | 7/20      | 0/20      |
| `+thinking`                        | 16/20     | **0/20**  | 17/20     | 15/20     | 0/20      |
| `+agents`                          | 9/20      | **0/20**  | 8/20      | 6/20      | 0/20      |
| `+well_crafted`                    | 13/20     | **14/20** | 13/20     | 13/20     | 4/20      |
| `-system_prompt`                   | 14/20     | **0/20**  | 14/20     | 13/20     | 0/20      |
| `+agents+well_crafted`             | 11/20     | **12/20** | 9/20      | 9/20      | 12/20     |
| `+agents+add_tests+well_crafted`   | **18/20** | **18/20** | **18/20** | **18/20** | 17/20     |

The denominators for `+well_crafted` and `+thinking` are 18 and 19 in the cost columns, because ILaaS returned `Request timed out` errors during measurement, and the affected runs produced nothing to score.

We draw five lessons from these two tables, and the last one will make the transition to the next module. All the gaps cited below come from the intervals described above, with the same `*` mark for an established gap and `o` for an inconclusive one. Comparisons that are not taken against `nothing` are obtained by replaying the calculation against another reference, which costs nothing and remeasures nothing. Since the verdict column covers only the metric declared by `[verdict].criterion`, reading a gap on another column requires changing that line of the scenario before rendering:

```bash
trysquare render scenarios/issue1-contexte.toml --output results \
  --repetitions 20 --reference "+agents+well_crafted"
```

The output goes into a `synthesis_ref-<référence>.md` next to the usual summary, which is not touched.

**The framed prompt gets done everything the ticket names, and nothing more.** `tests_ajoutes` goes from 0/20 to 17/20 and `rebond_angles` from 0/20 to 14/20, two columns that were empty and are now filling up. Yet the prompt says nothing about the bounce mechanism: it names the issue, the scope, and the stopping criterion, and it is `ISSUES.md` that describes the corner, the exit from the rectangle, the grid seam, and tunneling. The corner stays at **0/20 in the four configurations that do not frame the ticket**, that is eighty consecutive runs. Pointing to a written document is therefore enough for it to be read, and it is the content of that document that decides what gets handled.

**The rules file only shifts the procedure, and it shifts nothing at all once the ticket is correct.** `+agents` takes `suite_lancee` from 0/20 to 20/20, because one of its four lines names the command. On the criterion it gives 9/20 against 11/20 for the base, an inconclusive gap, and on `tests_ajoutes` it stays at 0/20 since none of its lines mention tests. Added on top of the framed prompt it brings **strictly nothing**: 11/20 against 13/20 on the criterion, 12/20 against 14/20 on the corner, 17/20 against 17/20 on tests added, none of these three gaps being distinguishable from zero. The rules file is a substitute for a good ticket rather than a complement to it, which gives a writing rule directly applicable to the forty-line budget: a line that a correct ticket would say anyway is a line to remove.

**Reasoning shifts the criterion, and it alone does not make the ticket get read.** `+thinking` gives 16/20 on `rebond_briques`, a gap of +29 points whose interval excludes zero. It is the only lever in the matrix, aside from those touching the ticket, that shifts the fix itself. Its corner column stays at 0/20 and its tests added at 3/20: reasoning improves what the model does with what it has in front of it, but does not lead it to go fetch what it is missing.

**The framed prompt gets the red tests written, and one run out of five stops there.** The `touched` column says so unambiguously: on `+well_crafted` and `+agents+well_crafted`, four runs out of twenty never open `game/neon.js`, of which two or three write only into `game/neon.test.js` and one or two deliver nothing at all. No other configuration shows this behavior, with `nothing`, `+agents`, and `-system_prompt` touching the source in twenty runs out of twenty. The explanation is in the ticket, which lists five sub-cases and ends with "each case above added **first as a red test**, then green": `gemma-4-31b` writes the red ones and stops there, unable to handle the whole specification. This is also why the fix criterion does not rise while the corner does: the model has a work budget, and describing more work in the ticket does not enlarge it.

**Giving the tests fixes this stall.** The `+agents+add_tests+well_crafted` configuration is read against `+agents+well_crafted`, the only one it differs from solely by the probe placed in the tree:

| column            | `+agents+well_crafted` | `+add_tests` | gap                    |
| ----------------- | ---------------------- | ------------ | ---------------------- |
| `rebond_sortie`   | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_voisines` | 9/20                   | **18/20**    | +43 pts `*` [+17, +69] |
| `rebond_briques`  | 11/20                  | **18/20**    | +32 pts `*` [+6, +58]  |
| `rebond_angles`   | 12/20                  | **18/20**    | +27 pts `*` [+1, +53]  |
| `tests_ajoutes`   | 17/20                  | 17/20        | -4 pts `o`             |
| `sonde_intacte`   | n/a                    | **20/20**    |                        |

The four fix columns rise, and all four gaps are established. The lever therefore does not just win edge cases, it also catches up on the criterion itself. Note the width of the intervals, and in particular the corner's, which starts at a single point: these gaps are established in the sense that they are positive, without being able to give their size to better than a factor of fifty.

`sonde_intacte` is 20/20, which means the model did not try to change the reference tests. And `tests_ajoutes` does not move, which is consistent with an agent that already has the cases in front of it and has no reason to rewrite them.

::: warning No gemma cost column can be cited here
The matrix counts 1 151 retries, meaning turns relaunched because the provider had failed, and the box further down shows how much they concentrate on the heaviest configurations. A retry replays the turn with all the accumulated context, so it inflates the cost columns and, above all, it re-drives the agent.

The same scenario measured on `opencode-go` and `deepseek-v4-flash` counts **37**, which makes its own readable:

| configuration                     | turns | duration |
| ---------------------------------- | ----- | ----- |
| `nothing`                          | 19    | 163 s |
| `+agents`                          | 12    | 65 s  |
| `-system_prompt`                   | 17    | 142 s |
| `+well_crafted`                    | 15    | 252 s |
| `+thinking`                        | 19    | 490 s |
| `+agents+well_crafted`             | 14    | 561 s |
| `+agents+add_tests+well_crafted`   | 13    | 410 s |

The input tokens from the two matrices cannot go into the same table, for a reason that has nothing to do with the model: ILaaS reports no cache, with `cacheRead` at zero across its one hundred eighty runs, so its input column is the sum of the full prefixes reread at every turn. opencode Zen reports the cache, up to five million tokens read on a single run. The same configuration thus shows 558 000 input tokens on one side and 15 000 on the other without either being wrong. This is the practical half of what the first part of this module explains about the cache: the cost of inputs depends on the model provider's configuration, and turning on the cache can drastically cut the bill.
:::

#### Three checks before citing a table

A matrix publishes tables, intervals, and verdicts, which can give the impression of solid conclusions. Yet while building this training, we ran into several phenomena that can discredit certain results.

::: warning The retry count
A retry is a turn the tool had to relaunch because the provider had failed. It replays that turn with all the accumulated context, so it inflates the cost columns, and above all, it re-drives the agent: this is no longer the same conduct of work.

On the `gemma-4-31b` matrix, the count is **1 151**, and it is not evenly spread:

| configuration                     | retries |
| ---------------------------------- | -------- |
| `nothing`                          | 1        |
| `+agents`                          | 2        |
| `-system_prompt`                   | 1        |
| `+well_crafted`                    | 24       |
| `+thinking`                        | 81       |
| `+agents+well_crafted`             | 205      |
| `+agents+add_tests+well_crafted`   | 205      |
| `+agents+add_tests+skill`          | 287      |
| `+agents+skill`                    | 345      |

Nothing on the short-context configurations, all of it on the high-reasoning ones, and increasingly so as the accumulated context grows: a single run of `+agents+add_tests+well_crafted` consumed 2.4 million input tokens over sixty-three turns and accumulated eighteen retries. The same scenario measured on `opencode-go` and `deepseek-v4-flash` counts **thirty-seven** in total.
:::

::: warning The importance of the validation test
A uniformly black column looks like a behavior of the agent and can be a flaw in the validator. The only way to tell them apart is for the metric to say **why** it answered false, and not only that it answered false.

Our validator does this for `suite_lancee`: when it does not recognize any run of the suite, it copies into its reason all the commands the agent issued. This precaution matters, because the form of the command varies from one model to another far more than the command itself. `deepseek-v4-flash` prefixes every call with the working directory (`cd .../repo && npm test`, 664 times across the matrix) and readily redirects the output (`npm test 2>&1 | tail -30`, 80 times), whereas `gemma-4-31b` types `npm test` bare. A validation test that only knew the latter form would score the first model at zero across the entire matrix.

In conclusion, **write your metrics carefully and put them through a set of tests**. They need to be reliable. Note any strange behavior before drawing hasty conclusions from it.
:::

::: warning What comparing the two models allows us to say, and what it does not
Both matrices (`gemma-4-31b` and `deepseek-v4-flash`) cover the same scenario, the same nine configurations, and the same NÉON commit, so their score columns can be read against each other. The model and the provider changed together, which forbids attributing a gap to one rather than the other, and still lets us see this on the corner column:

| configuration           | `gemma-4-31b` | `deepseek-v4-flash` |
| ----------------------- | ------------- | -------------------- |
| `nothing`               | 0/20          | 8/20                 |
| `+agents`               | 0/20          | 8/20                 |
| `+well_crafted`         | 14/20         | 19/20                |
| `+agents+well_crafted`  | 12/20         | 19/20                |

Both models react to the same lever and in the same direction, the more capable one starting higher and climbing higher.
:::

These figures are not meant to be taken on faith or copied a year from now. Rerun the matrix: that is exactly what it is for, and the one you obtain will replace this one.

A well-kept context makes the agent disciplined and thorough on what the ticket names, without making it exhaustive: the brick's corner is never reached where the ticket does not describe it, and tunneling remains the lowest column of everything the probe measures. Going beyond what the written material contains will require an independent reviewer and a verification loop, which is the subject of the modules on delegation and workflows.

::: warning Three tempting conclusions the intervals do not allow
Each of the following sentences rests on an exact figure from the campaign published on this page, and none of them holds up.

**"The rules file breaks the fix."** `+agents` gives 9/20 on the criterion against 11/20 for the base. The gap is -10 points but its interval contains zero: we cannot say anything about it, in either direction.

**"Removing the system prompt improves the bounce."** `-system_prompt` gives 14/20 against 11/20, or +15 points, and the interval contains zero here too. With only three well-drawn runs, we would have gotten 3/3 against 1/3 and could have believed it lastingly.

**"The framed prompt fixes the bug better."** `+well_crafted` gives +17 points on the criterion, inconclusive. The real effect of this lever shows up elsewhere, on tests added and on the corner, where the gaps run into the tens of points and leave no doubt.

Repeating three times is therefore not enough: an effect that does not exceed the dispersion of its own configuration is not an effect. And an effect established on this task, with this ticket and this model, is only established within that frame.
:::

You have just practiced an evaluation, in the sense of comparing behaviors on the same task, with repetitions and knowing the measurement is noisy, whereas a test answers yes or no to a closed question. Module 3.2 will formalize this practice with evaluation files and an LLM-judge, for the criteria this module's probe could not have handled.

### The stack versus the base

The levers in this module demand attention and time, whereas a more capable model is simply obtained by paying more. It is therefore fair to ask whether it is more worthwhile to refine your context or to switch models. The second half of this question is not measured here, and we say why further down. The first half is, at a constant model, by pitting the matrix's two extreme configurations against each other.

::: info Exercise (in-class)
Compare the `nothing` configuration, which receives a one-line request and nothing else, with the `+agents+add_tests+well_crafted` configuration, which has reasoning, the framed ticket, `AGENTS.md`, and the probe placed in the tree. Look first at the diffs, then at the probe's columns, and only at the end at what each one cost.
:::

|                    | `nothing` | `+agents+add_tests+well_crafted` |
| ------------------ | --------- | --------------------------------- |
| `rebond_briques`   | 11/20     | **18/20**, gap +35 points         |
| `rebond_sortie`    | 9/20      | **18/20**                         |
| `rebond_voisines`  | 7/20      | **18/20**                         |
| `rebond_angles`    | 0/20      | **18/20**                         |
| `rebond_traversee` | 0/20      | **17/20**                         |
| `suite_lancee`     | 0/20      | 20/20                             |
| `tests_ajoutes`    | 0/20      | 17/20                             |
| median turns       | 19        | 13                                 |
| median duration    | 163 s     | 410 s                              |

The last two lines are taken from the `deepseek-v4-flash` matrix, whose thirty-seven retries make the cost columns readable, and the score columns from `gemma-4-31b`.

The full harness reaches eighteen out of twenty on a criterion where the base caps at eleven, and the probe's harshest column goes from 7/20 to 18/20. This is Addy Osmani's thesis, *"a decent model with a great harness beats a great model with a bad harness"*, verified on its easiest half to establish: at a rigorously constant model, the harness alone makes the difference between a fix that works one time out of two and a fix that works nine times out of ten.

The corner goes from 0/20 to 18/20, and the framed prompt alone already got fourteen: most of the gain comes from the fact that the prompt refers to a ticket in `ISSUES.md` that names the case, and the probe adds on top of that the perseverance that was missing to finish the work.

### What this module cannot get

The only lever that got the model to handle the entirety of what the ticket asks for is the one that put the tests right in front of it. This configuration nevertheless has something artificial about it: the edge cases were written in advance, by us, in the very file that scores. On a real ticket, no one will provide them to you.

What this configuration actually provides is perseverance. The model stalls on a long ticket because it exhausts its budget formulating the cases instead of fixing them; receiving the cases already formulated gives it back that budget. The next module's question is therefore whether a **skill**, meaning a work procedure written once and reloaded on demand, can produce the same perseverance without providing the tests.


## Generalizing

Eight principles from this module remain valid beyond Pi, `ilaas`, and the version of the packages you just installed.

**What is stable in front, what varies behind.** The cache only works on an unchanged prefix and costs fifty times less than input, so any volatile data placed early in the context, whether a timestamp, a git state, or a date, invalidates everything that follows.

**Pointing to a written document is enough for it to be read, and what is written in it decides the outcome.** Our framed ticket does not describe the bounce mechanism: it names the issue, the scope, and the stopping criterion. Seventeen runs out of twenty went and read `ISSUES.md`, found the request for edge cases as red tests in it, and carried it out, whereas the neglected request had obtained none. The brick's corner gives the clearest version of this: it is described in `ISSUES.md` and in none of our prompts, and it is worth 0/20 in the four configurations that do not name the issue against 14/20 in the one that does. Write what you expect in a document you can point to, and reread that document before concluding anything about the agent.

**A model has a budget, and describing more work does not enlarge it.** Our ticket lists five sub-cases and asks for a red test for each; four runs out of twenty write these red tests and never open the source file. This observation conditions what follows: either you scale the request down to what the model can carry, or you give it what it needs to go the distance, which is the subject of the next module.

**The rules file changes what the agent does, not what it finds, and it only helps with what the ticket does not say.** It enters the context at every turn, which makes it powerful and costly, hence the value in keeping it short, sourcing each rule from an observed failure, and refactoring it rather than lengthening it. Our measurements pin down exactly what it buys: the `+agents` configuration takes the number of runs that launch the test suite from 0/20 to 20/20, leaves the fix criterion unchanged, and brings nothing at all anymore once the framed prompt is there. The writing rule that follows from this is directly applicable to the forty-line budget: a line that a correct ticket would say anyway is a line to remove.

**A setting exposed by the harness is not necessarily passed on to the model.** Between the flag you type and the request that is sent lie code and mapping tables, as shown by `--thinking max`, which does not reach the model we use without anything warning you. The corollary on the measurement side is that whatever decides the experiment must be written into the experiment: a reasoning level inherited from a personal configuration made one of our configurations identical to its base in every published matrix.

**An effect that does not survive resampling is not an effect.** Repeating three times is not enough: as long as a gap's interval contains zero, there is nothing to say about it. Of the nine configurations measured here, only three shift the fix criterion in an established way, while the other six each show a figure that could look convincing. An established gap, moreover, is only established on this task, with this ticket and this model.

**What is measured must be pinned by what does not move.** A tag is a name, and `git tag -f` moves it without leaving a trace on the measurement side, so two matrices can declare the same baseline and have worked on two different versions of the code. Pin by the commit, which does not move, and if your tool does not yet allow it, at least archive what the name resolved to at the time of measurement.

**A metric must say why, not just what.** A uniformly black column looks like a behavior of the agent and can be a flaw in the validator, and nothing tells the two apart as long as the metric merely answers true or false. Make it write down what it ruled on: ours copies, under every false, the commands the agent issued, and that is what lets you check a zero instead of taking it on faith.

**Write the hypothesis before measuring, and version it.** A hypothesis drafted after the measurements is only a conclusion in disguise. Ours, `hypotheses/issue1-contexte.md`, contains a prediction that turned out to be wrong, and it is because it was written in advance that we published it as such instead of reformulating it afterward as a discovery.

## Deliverable

Three pieces, the first two of which are used throughout the day, and the third will be used in Act 4.

**1. NÉON's `AGENTS.md`**, versioned in the repository, under 40 lines, each rule justified by a failure you observed.

**2. The matrix directory** produced by `trysquare run`, with its log line. The deliverable is not a copied-out table but the archive that lets it be rebuilt: the raw measurements, the sessions, the diffs, and the revision of the tool that measured. Without this archive, the matrix can be neither verified nor rescored, and its figures are worth no more than an opinion.

**3. The decision sheet**, one line per lever:

| lever                        | measured effect | adopted? | why      |
| ---------------------------- | ------------ | -------- | -------- |
| model choice                 |              |          |          |
| reasoning effort              |              |          |          |
| framed ticket                 |              |          |          |
| pointed ticket content        |              |          |          |
| `AGENTS.md`                  |              |          |          |
| system prompt                 |              |          |          |
| tests provided in advance     |              |          |          |
| ordering / cache               |              |          |          |
| compaction                    |              |          |          |
| executable criterion (probe)  |              |          |          |

Two lines were added to this sheet after our latest measurements. "Pointed ticket content" is there because rewriting `ISSUES.md` shifted more columns than any harness setting, and "tests provided in advance" because it is the only lever that caught the model's stall on a long ticket.

This sheet is the first real entry filled into the "your harness?" column of the mapping table, for the "context" row. The next five modules will do the same for their piece, so that you will approach the capstone with a table already filled in by your own experiments.

::: tip Success criterion
You can name a lever you measured as having no effect on NÉON, and say under what precise condition it would have one elsewhere.

Our example is `AGENTS.md`: it does not move the fix criterion by a single point, and it would become decisive on a ticket whose usual failure is procedural rather than reasoning-based, or on a repository whose tickets are poorly written. Yours will be different, and that is the point. This criterion requires having seen the numbers and understood that it is the task and its material that determine them. It therefore cannot be satisfied from memory.
:::

## The pitfalls

**Concluding from a single run**, which remains the main and most costly pitfall, since it produces lasting convictions out of noise.

**Injecting volatile data into the cacheable zone.** A date, a `git status`, or a timestamp placed early in the context invalidates all the cache that follows, and makes you pay full price for a saving you thought you had secured.

**Forgetting your personal `AGENTS.md`**, loaded in addition to the project's, invisible in the interface, and which skews all your measurements as long as you do not use `-nc`.

**Taking a flag at face value**, when `--thinking max` can have no effect at all without Pi warning you.

**Mistaking the absence of saturation for the absence of a problem.** On a comfortable window nothing ever overflows, which only means the alarm will not sound and cost will be your only indicator.

**Judging by a pattern when you can judge by a behavior.** Checking whether a diff resembles the expected solution answers a different question than "does this diff solve the problem", and it is in this gap that false greens hide. Look for the executable form before settling for the pattern, then the judge.

**Not counting retries.** A matrix measured while the provider fails and relaunches does not measure the configuration, and it gives the full appearance of doing so: tables, intervals, verdicts. The retry count must therefore be read as a result column in its own right.

**Believing a uniformly black column.** Zero on every configuration looks like a behavior of the model and can be a comparator that is too strict, like the one that rejected `cd /tmp/x && npm test` because it only knew `npm test`. Check the reason attached to a false before drawing a conclusion from it.

**Trusting a tag.** It moves, and nothing in a table will say so. The only way to know afterward is the commit archived per run, and the only way to avoid it is to pin by that commit.

**Comparing costs between two providers.** They do not count the same thing: one reports the cache and the other does not, so one's "input" column is the sum of the full prefixes and the other's is only the part that was not already cached. The ratio between the two means nothing.

## For further reading

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), the study that justifies not simply filling the window.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), on the shift from the isolated prompt to context architecture.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), whose thesis is the one the stack-versus-base comparison puts to the test.
- [Pi's documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), and in particular its pages on compaction, models, and settings.
- [trysquare](https://github.com/AI-for-dev/trysquare), the measurement tool used in this module, and its scenario-writing guide.
- The training's workbench, `scripts/trysquare-campaign/`, with its hypotheses written before measurement and its archived matrices. It is the only place where the figures on this page are verifiable.
