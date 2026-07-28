# Context and the window: what goes in, what it costs

::: tip Module Objectives
- Know how to identify what is actually in the context window, and what each part costs
- Manipulate the levers that fill it: model, reasoning effort, prompt, `AGENTS.md`, system prompt
- Set up a measurement bench and use it to make decisions
- Leave with a concise `AGENTS.md` and a reasoned decision for each lever
:::

Context management is the foundation that all others depend on, as a subagent is used to avoid polluting the main context, memory to avoid filling it with information that could be rediscovered, and permission to avoid dumping a file into it that should not have been read. Until you know what the window contains and what it costs, the next five modules will remain recipes applied without being understood.

We follow the usual order: understand what is in the window, reconstruct the levers that fill it, and then identify what remains true when the tool changes.

::: info A reading convention
Each exercise is marked **in-class** or **self-paced**. The in-class path is designed to fit within the session and to be sufficient for understanding the module's challenges. The self-paced exercises provide deeper dives and are written to be done alone, later, on your own repository.
:::

## Understanding

### Five sources, one single window

When you type a question into Pi, the model receives a stack in which your question is only one line:

1. the **system prompt**, which describes the model's role, its tools, and its conventions;
2. the **context files**, `AGENTS.md` and `CLAUDE.md`, loaded from your home directory, then from each parent directory while moving up, and finally from the current directory;
3. the **tool descriptions**, in JSON, one for each available tool;
4. **your question**;
5. and, as the loop progresses, the **history**, meaning every model response, every tool call, and every tool output.

The first four sources are stable from one turn to the next, while the fifth grows with each turn, making it almost always the cause of overflows.

::: info Exercise (in-class)
Open a session, ask any question, then export the session using `\export`. Open the resulting HTML file and read Pi's full system prompt, which most coding agents do not allow you to do.

Identify what describes **capabilities** and what describes **conventions**: we will measure the actual weight of each of these two categories later.
:::

For a request as trivial as "just say OK", without context files, skills, or extensions, the input weighs **1,660 tokens**, and it drops to **1,110** if we replace Pi's system prompt with three lines. Pi's system prompt therefore costs about **550 tokens**, which is little compared to what tool outputs and history will add later. Most of what fills a context window does not come from the harness but from what you and the agent pour into it throughout the session.

### Three prices, one of which is very low

A model call is billed in three categories, expressed per million tokens. Here are the rates for the two models we will compare throughout the module:

| model | input | output | cache read |
| --- | --- | --- | --- |
| `deepseek-v4-flash` | 0.14 $ | 0.28 $ | 0.0028 $ |
| `deepseek-v4-pro` | 1.74 $ | 3.48 $ | 0.0145 $ |

These rates are those published by [opencode Zen](https://opencode.ai/docs/zen/), the service used by the training. Pi copies them into `~/.pi/agent/models-store.json`, where the benchmark tool will read them.

Two gaps emerge. The first separates the two models, as the `pro` costs 12.4 times more than the `flash` at nominal rates. The second, much wider, separates input from cache reading: a factor of **50** for `flash` and **120** for `pro`.

This second gap is what makes a coding agent economically viable, because an agent re-reads its full history every turn and would otherwise pay twenty times the price of its context over a twenty-turn session.

::: info Exercise (in-class)
In a session, ask three consecutive questions about the same file and type `/session` after each one, observing the token line: cache reading increases while the turn cost collapses.

Here is what we measured over a session of six calls, intentionally switching models on the fifth:

| call | model | input | cache read | cost |
| --- | --- | --- | --- | --- |
| 1 | `flash` | 1,675 | 0 | 0.000254 $ |
| 2 | `flash` | 307 | 1,664 | 0.000081 $ |
| 3 | `flash` | 66 | 2,048 | 0.000053 $ |
| 4 | `flash` | 118 | 2,048 | 0.000087 $ |
| 5 | `pro` | 2,521 | **0** | **0.005455 $** |
| 6 | `pro` | 148 | 2,432 | 0.000362 $ |

The cache activates as early as the second call, even within the same turn, and it reduces the cost by a factor of three to five. Switching models on the fifth call resets the cache read to zero and makes the entire prefix paid for at full price: this single turn costs fifteen times more than the next one with the same model.
:::

Caching only works on an **unchanged prefix**, which leads to the context ordering rule: everything that varies must be placed after what is stable. A timestamp or a `git status` slipped into the system prompt invalidates everything that follows—including tools, the question, and history—meaning you pay full price every turn, whereas the same data placed in the current turn's message costs nothing since it is already in the varying zone.

Also keep in mind that switching models mid-session is not free, which is worth remembering throughout this module where you will be switching back and forth between `flash` and `pro` frequently.

## Rebuilding

### The task, and what counts as success

All measurements in this module focus on the same task, **issue #2** of NÉON, where collisions scan all bricks every frame and the code is mixed with the rendering loop.

We chose it because it consists of two halves of which only one might be completed: separating the rendering logic is easy, whereas stopping the scanning of all bricks requires having read the ticket thoroughly. An agent that stops at the first half produces a clean diff and green tests for a half-finished job, which a too-coarse criterion would overlook.

We use four criteria:

| criterion | mechanical? |
| --- | --- |
| `npm test` passes | yes |
| no exports from `game/neon.js` renamed or deleted | yes |
| only `game/neon.js` is modified, so the ticket scope is respected | yes |
| the "performance" half of the ticket has been addressed | **no** |

The first three are computable, while the fourth, which nonetheless determines if the work is done, requires reading the diff. Keep this friction in mind: it will return in the module conclusion, and module 3.2 will address it.

::: warning Each run works on a disposable copy
A benchmark that modifies the repository measures the last modification rather than the configuration. The script provided below copies NÉON into a temporary directory upon each execution, and you must do the same if you are measuring manually.
:::

### The sliders, by hand

#### The model

::: info Exercise (in-class)
Run the same request on `deepseek-v4-flash` and then on `deepseek-v4-pro`:

```
La collision scanne toutes les briques à chaque frame et son code est mêlé
à la boucle de rendu. Corrige ça.
```

Read both diffs, then both `/session`. Note your observations without drawing conclusions: the section on repetitions will explain why two executions are not enough to distinguish between two models.
:::

#### Reasoning effort

`pi --help` lists seven reasoning levels, from `off` to `max`, making it the most immediately tempting slider in the harness.

::: info Exercise (in-class)
Run the same task with `--thinking low`, then with `--thinking medium`, and compare the output tokens and the response. You will find no difference, because both flags produce exactly the same request.
:::

Open `~/.pi/agent/models-store.json` and look for the `thinkingLevelMap` field of the model you are using. For `deepseek-v4-flash`, it is:

```json
{ "minimal": null, "low": null, "medium": null, "high": "high", "max": "max" }
```

Three of these levels are not associated with anything: Pi accepts the flag, does not send it, and does not notify you. For most other models in the catalog, there is no `thinkingLevelMap`.

Then, repeat the comparison between the absence of the flag and `--thinking high`, which correspond to two truly distinct regimes, and measure the gap.
:::

Reasoning does have an effect when measured between two real levels, and this effect is not always in the expected direction, as the benchmark results will show. The general lesson is rather about the trust to place in settings: **a setting exposed by the harness is not necessarily a setting understood by the model**, because between the flag you type and the request that is sent lies a mapping table written by someone, which may be incomplete. You will encounter this situation several times during the training, and regularly in your work, which is why you should get into the habit of checking where a flag actually lands before trusting it.

### What we write

#### `AGENTS.md`, the most cost-effective configuration point

The rules file placed at the root of the repository is included in the context at every turn, making it both the most effective lever of the harness and the easiest to sabotage. When the agent makes a mistake, the natural reaction is to add a sentence, then another, until after a few weeks you have a three-hundred-line file that no one reads anymore and half of which the agent ignores. We are therefore introducing a hard constraint, valid for the rest of the training.

::: danger Budget: 40 lines
NÉON's `AGENTS.md` shall never exceed 40 lines, from the beginning to the end of the training. Any module wishing to add a rule must first remove one, or rephrase to fit both into one.

This constraint is the only way to concretely experience the difference between a pilot's checklist, which is read, and a style guide, which is ignored.
:::

The file should not repeat what the repository already says, since conventions are in `CONTRIBUTING.md`, the architecture in `README.md`, and the history in git. It contains the rules that the agent actually violated. In our four executions of issue #2 without `AGENTS.md`, two corrected another issue they weren't asked to, three only handled half of the ticket, and all had to discover the test command on their own, which provides three rules without having to invent them.

::: info Exercise (in class)
Write NÉON's `AGENTS.md` based on your own executions rather than ours: review the diffs you just produced and look for what the agent did without being asked, or omitted when it was requested.

Here is a starting point, to be discussed and amended:

```markdown
# NÉON

- Une tâche = un ticket. Ne traite pas d'autre issue en passant.
- Ne renomme ni ne supprime un export de `game/neon.js` : les tests en dépendent.
- Zéro dépendance : aucun paquet, aucun CDN.
- Les tests se lancent avec `npm test`.
```

Four lines used, thirty-six left for the next five modules.
:::

::: warning One `AGENTS.md` can hide another
Pi loads these files cumulatively, starting from your personal `~/.pi/agent/AGENTS.md`, then from each parent directory going up, and finally from the current directory. A personal rules file thus sneaks into all your measurements without any indication.

The `--no-context-files` flag, shortened to `-nc`, disables this discovery, which is essential for clean measurements of what the benchmark does.
:::

#### The system prompt

Pi allows you to entirely replace its system prompt with a `.pi/SYSTEM.md` at the project root or a global `~/.pi/agent/SYSTEM.md`. The `--system-prompt` option follows a slightly different rule, as context files and skills continue to be added on top, meaning you never truly start from a blank slate.

::: info Exercise (self-study)
Create a three-line `.pi/SYSTEM.md`:

```
You are a coding assistant working in the current directory.
Use the available tools (read, write, edit, bash) to inspect and modify files.
Answer in the language of the user.
```

Relaunch the same task and compare. Here is what we obtained with the same model and reasoning effort:

| | Pi system prompt | stripped system prompt | ratio |
| --- | --- | --- | --- |
| turns | 9 | 26 | ×2.9 |
| tool calls | 10 | 27 | ×2.7 |
| output tokens | 2,551 | 16,162 | ×6.3 |
| cost | $0.0025 | $0.0087 | **×3.5** |
| duration | 128 s | 126 s | equal |
| files touched | `neon.js` | `neon.js` and `neon.test.js` | spills over |

The task is completed successfully in both cases, with green tests, the refactor performed, and the API preserved, meaning no capability was lost. The stripped agent simply groped around three times longer before succeeding, and it started rewriting the tests without being asked.
:::

The result can be put this way: the system prompt adds no capability, since tools are declared to the model via their JSON schema and not through prose, but it adds discipline, and discipline is what determines the cost. Here, 550 well-written tokens divide the cost by three and a half. This is also why a harness is not just a well-crafted system prompt: Pi's fits in 550 tokens, and the rest of the work happens elsewhere.

#### A throttled window to observe compaction

When the context approaches the limit, Pi compacts, meaning it summarizes old messages and keeps only the most recent ones intact. Triggering follows the rule `contextTokens > contextWindow - reserveTokens`, where `reserveTokens` defaults to 16,384 and represents the space left for the response. The cut is visible in `\tree`, and `/compact` allows you to force it, with optional instructions to guide the summary.

On NÉON, compaction will never trigger, since the repository is 617 lines long and our models advertise a one-million token window, which would place the threshold at 984,000 tokens. Observing the mechanism therefore requires creating a constraint.

::: info Exercise (self-guided)
Declare a second provider in `~/.pi/agent/models.json`, pointing to the same service but announcing a 32,000-token window:

```json
{
  "providers": {
    "banc": {
      "baseUrl": "https://opencode.ai/zen/go/v1",
      "api": "openai-completions",
      "apiKey": "$OPENCODE_API_KEY",
      "models": [
        {
          "id": "deepseek-v4-flash",
          "name": "DeepSeek V4 Flash (fenêtre bridée)",
          "reasoning": true,
          "input": ["text"],
          "contextWindow": 32000,
          "maxTokens": 8000,
          "cost": {
            "input": 0.14, "output": 0.28,
            "cacheRead": 0.0028, "cacheWrite": 0
          },
          "compat": {
            "supportsStore": false,
            "supportsDeveloperRole": false,
            "maxTokensField": "max_tokens",
            "requiresReasoningContentOnAssistantMessages": true,
            "thinkingFormat": "deepseek"
          },
          "thinkingLevelMap": {
            "minimal": null, "low": null, "medium": null,
            "high": "high", "max": "max"
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

You then have both regimes in `/model`, the actual 1M model and the same one capped at 32K. Have the agent work on several files with the second one until the trigger occurs, read the produced summary, then check in `\tree` where the cutoff happened and if the agent still knows what you asked for initially.
:::

Taking a detour through this capped provider teaches as much as the demonstration itself, since Pi compacts at 32,000 tokens not because the model is saturated, but because you declared it as such. The window that a harness knows is a configuration line rather than a model property, which will be useful to you the day an agent starts compacting too early for no apparent reason.

### The Bench

#### The experimental design

The chosen plan is the simplest that remains readable: a **base**, then one variable at a time.

The base reproduces what someone discovering the tool does, with the fast model, no reasoning effort requested, a vague prompt, no `AGENTS.md`, the default system prompt, the normal window, and no extensions. Every other cell changes only one thing and is read as a deviation from this base.

| cell | what changes |
| --- | --- |
| base | nothing, it is the reference |
| `+thinking` | `--thinking high` |
| `+framed prompt` | the prompt specifies the scope and the stop criterion |
| `+AGENTS.md` | the rules file is present |
| `-sys. prompt` | the system prompt is replaced by three lines |
| `+rtk` | the `pi-rtk-optimizer` extension is loaded |
| `pro (neglected)` | the large model, everything else unchanged |
| `flash (careful)` | the small model with reasoning, framed prompt, and `AGENTS.md` |

The last two lines form the 2x2 on which the conclusion of the module depends.

The framed prompt differs from the vague prompt by three additions rather than its length: the **scope**, which forbids touching tests or handling another issue; the **two halves of the work**, which explicitly ask to remove the rendering collision and stop scanning all bricks; and the **stop criterion**, which states that the work is finished when the tests pass and the exports have kept their name. This last addition is the most profitable of the three, since most of our failures come from overruns rather than errors.

#### Three repetitions, and why

Each cell is executed three times, for a reason we discovered the hard way. Here are three strictly identical executions: same model, same effort, same prompt, same repository:

| | run a | run b | run c | median | range |
| --- | --- | --- | --- | --- | --- |
| cost | $0.0104 | $0.0052 | $0.0050 | $0.0052 | **×2.08** |

By expanding to four executions, the range rises to **×4.2**, the turns vary from 7 to 23, the `bash` calls from 2 to 13, and the diff from 34 to 167 inserted lines.

An agent is not deterministic, and the gap between two runs of the same configuration is of the same order of magnitude as the effect of most levers, meaning a single run per cell measures noise rather than the lever. The benchmark therefore displays a minimum, a median, and a maximum, and never a single figure, which forces you to look at the dispersion before drawing a conclusion.

#### The script

Here it is in full. It works without dependencies, estimates its cost before starting, retries once any execution that freezes, and concentrates its scoring in a single function at the bottom of the file, which is the only place to rewrite to apply it to a repository other than NÉON.

<<<@/../scripts/banc/banc.mjs{js}

::: info Exercise (in class, then independently)
Start with the estimation, which costs nothing:

```bash
node banc.mjs --dry-run
```

Then launch the matrix and let it run while you discuss the sliders:

```bash
node banc.mjs
```

Expect two to four minutes per run, about fifteen minutes for the twenty-four run four in parallel. The result is written to `banc-resultats.md`.

To restart only one cell, for example after modifying your `AGENTS.md`:

```bash
ONLY='+AGENTS.md' REPEATS=3 node banc.mjs
```

**Independently**, take the script and change the matrix, using other models, other reasoning levels, or your own repository. This is the only artifact of this module that will not become obsolete.
:::

::: warning What the benchmark must account for
A `pi` run can freeze without producing a single byte or the slightest error message, which we encountered several times during the preparation of this module. The script therefore provides a maximum timeout per run and a second attempt; otherwise, a blocked run poisons an entire row of the table.

In our case, the cause was an open standard input, which `spawn` provides by default and on which `pi -p` waits indefinitely. The corresponding comment is in the script, and the same trap awaits you if you call `pi` from your own tools.
:::

#### Our measurements

Here is what we obtained in July 2026, on `opencode-go`, with NÉON, excluding context files, skills, and unrequested extensions.

RESULTATS_BANC

These figures are not intended to be taken at face value or copied in a year. Rerun the benchmark: that is precisely what it is for, and the table you obtain will replace this one.

What these measurements allow us to say, and nothing more:

- The gap between `flash` and `pro` is measured in tens, well above the dispersion, making it a real effect.
- Removing the system prompt multiplies the cost by 3.5, which exceeds the dispersion, but only slightly.
- The effect of `rtk` on the median cost is around 10%, which remains within the dispersion and allows for no conclusion.

You have just practiced an evaluation, in the sense that you compare behaviors on the same task, with repetitions and knowing that the measurement is noisy, whereas a test answers yes or no to a closed question. Module 3.2 will formalize this practice with evaluation files and an LLM-judge, but you already grasp the essentials.

### The 2x2

The levers in this module cost attention and time, while the model is bought, which raises the question of whether it is more profitable to refine your context or to pay more.

::: info Exercise (in-class)
Compare the two extreme cells of the matrix: the well-equipped `flash` that has reasoning, a framed prompt, and an `AGENTS.md`, and the poorly equipped `pro` that receives a vague prompt and nothing else. Look at the cost, then the four criteria, then the diffs.
:::

We expect the former to win, in accordance with Addy Osmani's thesis that *"a decent model with a great harness beats a great model with a bad harness"*, which is also the thesis of this entire course.

This comparison may nevertheless fail, and its failure in your case would be a result to note rather than an incident to hide, since a significantly more capable model can absorb a neglected context and it is useful to know at what capacity gap this becomes true. The question deserves to be asked again with each new model generation.

## Generalizing

Five principles survive Pi, `opencode-go`, and the version of the packages you have just installed.

**What is stable in front, what varies behind.** The cache only works on an unchanged prefix and costs fifty times less than the input, meaning that any volatile data placed early in the context—whether it be a timestamp, a git state, or a date—invalidates everything that follows.

**Saying when to stop is half of a good prompt.** Our executions failed more often due to overflow than incompetence, and an explicit stopping criterion costs one sentence to avoid having to reread an entire diff.

**The rules file is a checklist, not a style guide.** It enters the context at every turn, which makes it powerful and costly; hence the interest in keeping it short, sourcing each rule from an observed failure, and refactoring it rather than lengthening it. A line budget remains the simplest way to stick to it.

**An exposed setting is not an understood setting.** Between the flag you type and the request that is sent, there is code and mapping tables, as shown by `--thinking medium`, which does not exist on half of the models without any warning being given.

**An agent is noisy, and without repetitions you measure nothing.** We observed a factor of 4 between two identical executions, which makes any gap smaller than this order of magnitude uninterpretable. Three repetitions and three numbers—minimum, median, and maximum—constitute the honest minimum.

### The `rtk` case, and the transition to Act 2

`pi-rtk-optimizer` is the recommended extension for managing context on Pi, as it rewrites `bash` commands to a dedicated tool and compacts tool outputs before they enter the context. On NÉON, we were unable to show that it provides any gain.

The reason is arithmetic: `rtk` targets tool outputs, but `bash` outputs only represent 6 to 22% of the total on this repository, with the rest coming from file reads. A repository of 617 lines does not produce verbose builds, ten-minute test suites, or `git logs` of three hundred commits, so there is almost nothing to compact.

Only one result emerges, and it is not the one we were looking for: the dispersion is lower with `rtk`, at ×1.33 versus ×2.08 without, which suggests that the extension would make the agent more predictable rather than cheaper. With three repetitions, we cannot state this as a fact.

The takeaway is that a harness component is only as valuable as the workload you give it to process, and that the calculation will likely reverse on a repository with a verbose build and chatty continuous integration. You will be able to redo this, as you have the benchmark.

This case also marks a change in the nature of the levers. Everything we have manipulated so far relates to usage—whether choosing a model, adjusting a slider, writing a prompt, or maintaining a rules file—whereas `rtk` is the first lever consisting of code added to the harness. This is the pivot for all of Act 2: we have exhausted the gains from simply doing things better, and we will now modify the machine.

## Deliverable

Three pieces: the first two are used throughout the day, and the third will be used in Act 4.

**1. NÉON's `AGENTS.md`**, versioned in the repository, under 40 lines, each rule justified by a failure you have observed.

**2. The measurement table**, with minimum, median, and maximum per cell.

**3. The decision sheet**, one line per lever:

| lever | measured effect | adopted? | why |
| --- | --- | --- | --- |
| model choice | | | |
| reasoning effort | | | |
| framed prompt | | | |
| `AGENTS.md` | | | |
| system prompt | | | |
| scheduling / cache | | | |
| compaction | | | |
| `rtk` | | | |

This sheet constitutes the first actual entry in the "your harness?" column of the mapping table, for the "context" row. The following five modules will do the same for their respective components, so that you will approach the capstone with a table informed by experience rather than a blank page.

::: tip Success criterion
You can name a lever that you measured as ineffective on NÉON and state the precise condition under which it would become profitable on your own repository.

This criterion requires having seen the numbers and understood that the workload determines them, making it impossible to satisfy from memory.
:::

## The pitfalls

**Concluding from a single execution**, which remains the main and costliest trap, as it produces lasting convictions from noise.

**Injecting volatile data into the cacheable zone.** A date, a `git status`, or a timestamp placed early in the context invalidates all subsequent cache, making you pay a high price for a saving you thought you'd achieved.

**Forgetting your personal `AGENTS.md`**, loaded in addition to the project's, invisible in the interface, and which skews all your measurements as long as you don't use `-nc`.

**Taking a flag at face value**, when `--thinking medium` may have no effect without Pi warning you.

**Mistaking a lack of saturation for a lack of problems.** With a one-million-token window, nothing ever overflows, which only means the alarm will not sound and cost will be your only indicator.

**Installing an extension because it is recommended**, without measuring it on your repository and with your workload.

## For further reading

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), the study that justifies not simply filling the window.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), on the shift from isolated prompting to context architecture.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/), whose thesis is what the 2x2 tests.
- [Pi documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), and particularly its pages on compaction, models, and settings.
