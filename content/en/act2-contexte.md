# The context and the main window

::: tip Objectives of this module
- Know how to say what is really in the context window, and what each part costs
- Work the levers that fill it: model, reasoning effort, prompt, `AGENTS.md`, system prompt, `codemode`
- Know how to build and evolve your `AGENTS.md`
:::

Context management is the building block on which all the others depend, since a sub-agent serves to avoid polluting the main context, a memory to avoid filling it with what could be looked up again, and a permission to avoid dumping into it a file that should not have been read. We therefore need to start by understanding what the window contains and how it is fed over time. The following modules will present tools that take part in the context-filling process.

We proceed in the usual order: understand what is in the window, reconstruct the levers that fill it, then work out what still holds when the tool changes.

::: info A reading convention
Each exercise is marked **in class** or **on your own**. The in-class track is designed to fit in the session and to suffice for understanding the module's stakes. The on-your-own exercises go deeper, and are written to be redone alone, later, on your own repository.
:::

## Understand

### Five sources, one window

When you type a question into Pi, the model receives a stack in which your question is just one line:

1. the **system prompt**, which describes to the model its role, its tools, and its conventions;
2. the **context files**, `AGENTS.md` and `CLAUDE.md`, loaded from your home directory, then from each parent directory going up, then from the current directory;
3. the **tool descriptions**, in JSON, one per available tool;
4. **your question**;
5. and, as the loop runs, the **history**, that is, each response from the model, including the reasoning phase, each tool call, and each tool output.

The first four sources are stable from one turn to the next, while the fifth grows with every turn, which almost always makes it the one responsible for overflows.

::: info Exercise (in the room)
Open a session, ask any question, then export the session with `/export`. Open the resulting HTML file and read Pi's system prompt in full, which most coding agents don't let you see.

Identify what describes **capabilities** and what describes **conventions**: later, we will measure the real weight of each of the two categories.
:::

On a request as trivial as “just say OK”, with no context file, no skill, and no extension, the input weighs **1,660 tokens**, and it drops to **1,110** if you replace Pi's system prompt with three lines. Pi's system prompt therefore costs about **550 tokens**, which is little compared with what tool outputs and history will add to it later. Most of what fills a context window does not come from the harness but from what you and the agent pour into it over the course of the session.

### What does using an LLM cost?

A call to the model is billed in three line items, expressed per million tokens. Here are the rates for the two models taken from the opencode Go offering:

| model               | input | output | cache read |
| ------------------- | ------ | ------ | ---------------- |
| `deepseek-v4-flash` | 0.14 $ | 0.28 $ | 0.0028 $         |
| `deepseek-v4-pro`   | 1.74 $ | 3.48 $ | 0.0145 $         |

These rates are the ones published by [opencode Zen](https://opencode.ai/docs/zen/). The measurements of [act 3](./act3-trysquare) run on ILaaS, which bills nothing to the participants of this training, and therefore count tokens rather than euros. The two read the same way, except that a token counter does not warn you when you spend.

Two gaps stand out. The first separates the two models, since the `pro` costs 12.4 times more than the `flash` at list price. It is a first way to realize that a model has more capabilities than another. The second gap, far wider, separates input from cache reads: a factor of **50** on `flash` and **120** on `pro`.

This second gap is what makes a code agent economically viable, because an agent rereads its full history at every turn and would otherwise pay twenty times the price of its context over a session of twenty turns.

::: info Exercise (in class)
In an interactive session, ask five questions in a row on the same file, typing `/session` after each, and switch models with `/model` before the fourth. The questions must explicitly forbid any file rereading, otherwise a new tool output will land in the context and blur the reading.

Here is the exact sequence we measured, here in non-interactive mode so it can be reproduced as-is. The `-c` option continues the previous session, and accents are omitted in the commands without affecting the result:

```bash
git clone https://github.com/AI-for-dev/neon
cd neon

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
From a script, redirect standard input with `< /dev/null`. In non-interactive mode, `pi` waits on its standard input as long as it remains open, which blocks indefinitely when called from a bash script for example.
:::

The cache only works on an **unchanged prefix**, from which the context ordering rule derives: anything that varies must be placed after what is stable. A timestamp or a `git status` slipped into the system prompt invalidates everything that follows, tools, question and history included, and makes you pay the full rate again at every turn, whereas the same data placed in the current turn's message costs nothing, since it already sits in the zone that varies.

Also remember that switching models mid-session is not free, which is worth bearing in mind every time you switch from one model to another with `/model`.

## Rebuilding

### The task

Every hands-on exercise in this module works on the same task, NÉON's **issue #1**: the ball goes through the bricks instead of bouncing.

The issue is described in `ISSUES.md`, at the root of the [NÉON repository](https://github.com/AI-for-dev/neon): the ball passes through the bricks, and the issue details the expected behavior after the fix. We could give it directly to the agent, but we won't for now: we first want to see how the agent behaves depending on the prompt we give it and the surrounding framework.

This issue has several subtleties that are hard for an agent to spot on its own. The agent will quickly identify the problem and suggest computing the distance from the ball to the brick's sides, so as to reverse one of the two speeds depending on which side is hit. The corner case, rare but real, and the case of a speed large enough for the ball to cross the brick without ever overlapping it, however, have very little chance of being handled.

In addition to fixing the bug, we want to start defining a framework and check that the agent does not step out of it. This framework comes down to three rules:

- The agent may only modify `game/neon.js` and `game/neon.test.js` and nothing else.
- The agent must run the tests to check it hasn't broken anything.
- The agent must add tests if coverage isn't good. This is our case here: there are no tests that verify the ball's behavior with the brick.

The first constraint is too strong in a general setting. The point here is mostly to see how the model behaves and whether it respects this written constraint.

This module has you manipulate the levers by hand, on one or two runs, to see what each one changes in the session and in the diff. [Module 3.1](./act3-contexte) reuses the same task and the same levers with twenty repetitions per configuration, which makes it possible to say which ones actually change the result.

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

Read both diffs, then both `/session`. Note your observations without drawing any conclusion: [module 3.0](./act3-trysquare) explains why two runs are not enough to separate two models.
:::

#### The reasoning effort

`pi --help` lists seven reasoning levels, from `off` to `max`. It's a simple knob to turn, so it's tempting to start with it.

::: info Exercise (in class)
Run the same task with `--thinking minimal`, then with `--thinking max`, and compare the output tokens and the answer. You won't find any difference, because the two flags produce exactly the same request if you use the `gemma-4-31b` model.

For this model, there are only two modes: thinking `on` or `off`.

Redo the comparison between two genuinely distinct levels on your model, for example `off` and `high`, and measure the difference.
:::

Le raisonnement a bien un effet quand on le mesure entre deux niveaux réels. La leçon générale porte plutôt sur la confiance à accorder aux réglages : **un réglage exposé par le harnais n'est pas forcément transmis au modèle**, parce qu'entre la configuration que vous tapez et la requête qui part sur le serveur d'inférence se trouve une table de correspondance écrite par quelqu'un, qui peut être incomplète. Vous rencontrerez cette situation plusieurs fois dans la formation, et régulièrement dans votre travail. Prenez l'habitude de chercher où atterrit une configuration ou un flag avant de lui faire confiance.

#### `AGENTS.md`, the global configuration point

#### `AGENTS.md`, the global configuration point

The rules file at the root of the repository enters the context on every turn, making it a good candidate for defining our project's overall framework. When the agent makes a mistake, the natural reaction is to add a sentence to it, then another. Every added line has a cost, however: the larger the file grows, the less of it the agent sees as a whole; and as models improve, lines introduced earlier will become obsolete. This file therefore requires continuous refactoring throughout the project's life.

For this training, we set a strong constraint.

::: danger Budget: 40 lines
NÉON's `AGENTS.md` will never exceed 40 lines, from the start to the end of the training. Any module that wants to add a rule to it must first remove one, or rephrase to fit both into a single one.

This constraint forces you to do the continuous refactoring work described above: every rule must earn its place, and a short file is far more likely to actually be followed than a long style guide.
:::

We can also rely on other files and say so in `AGENTS.md`, so that the agent reads them when needed. For example, we can tell it that the conventions are in `CONTRIBUTING.md`, the architecture in `README.md`, and the history in git.

Of the twenty runs of issue #1 with the neglected request measured by [module 3.1](./act3-contexte), **none ran the test suite** and **none added a case**.

::: info Exercise (in class)
Write NÉON's `AGENTS.md` based on your own runs rather than ours: re-read the diffs you just produced and look for what the agent did without being asked, or omitted when it was asked. Make sure it runs the tests every time it modifies the code, and adds some if there is no coverage.

Here is the starting point, to discuss and amend. It is the very file [module 3.1](./act3-contexte)'s measurements use, versioned with the experiment:

<<<@/../scripts/trysquare-campaign/briques/AGENTS.md{md}

:::

::: warning One `AGENTS.md` can hide another
Pi accumulates these files, starting from your personal `~/.pi/agent/AGENTS.md`, then each parent directory going up, then the current directory. A personal rules file therefore slips into all your measurements without your knowledge.

The `--no-context-files` flag, abbreviated `-nc`, disables this discovery, which is essential to measure cleanly. The act 3 measurement tool works in a throwaway clone where only the current directory's (NÉON) `AGENTS.md` file is placed.
:::

#### The system prompt

Pi lets you replace its system prompt entirely with a `.pi/SYSTEM.md` at the project root or a global `~/.pi/agent/SYSTEM.md`. The `--system-prompt` option works slightly differently: context files and skills are still added on top, so you never quite start from a blank page.

::: info Exercise (on your own)
Create a three-line `.pi/SYSTEM.md`. It is the piece [module 3.1](./act3-contexte)'s measurements place in the clone for the `-system_prompt` configuration:

<<<@/../scripts/trysquare-campaign/briques/SYSTEM-minimal.md

Rerun the same task and compare input tokens, turns, duration, and what the diff contains.
:::

Pi's system prompt fits in 550 tokens. The rest of the work happens elsewhere, and we encourage you to change the system prompt only for good reasons. We show it here to illustrate the flexibility Pi offers.

#### A capped window, to see compaction

When the context approaches the limit, Pi compacts, meaning it summarizes older messages and keeps only the most recent ones intact. Triggering follows the rule `contextTokens > contextWindow - reserveTokens`, where `reserveTokens` defaults to 16,384 and represents the room left for the response. The cut is visible in `/tree`, and `/compact` lets you force it, with optional instructions to steer the summary.

On NÉON, depending on the model, compaction will never trigger. The repository is 617 lines, `gemma-4-31b` advertises a window of roughly 128,000 tokens, which places the threshold around 112,000, and our most expensive run only reaches this total by accumulating thirteen turns, none of which weighs more than about ten thousand tokens. Observing the mechanism therefore requires manufacturing the constraint to see its effects more quickly.

::: info Exercise (self-paced)
Declare a second provider in `~/.pi/agent/models.json`, `ilaas-bride`, which points at the same service but advertises a 32,000-token window. Add it to `providers`, alongside the `ilaas` provider you declared when [installing Pi](./act1-pi), without touching the latter:

```jsonc
// à ajouter dans "providers", à côté de "ilaas"
"ilaas-bride": {
  "baseUrl": "https://llm.ilaas.fr/v1",
  "api": "openai-completions",
  "apiKey": "XXXXX",
  "models": [
    {
      "id": "gemma-4-31b",
      "name": "Gemma 4 31B (fenêtre bridée)",
      "reasoning": true,
      "contextWindow": 32000,
      "maxTokens": 8000
    }
  ]
}
```

A second provider is needed because Pi identifies a model by its provider and its `id`. An entry that reuses the same `id` under the same provider replaces the first instead of adding to it, and the `id` cannot change since it is what Pi sends to the service.

In NÉON's `.pi/settings.json`, add thresholds consistent with this small window, reserved for the capped model:

```json
{
  "compaction": {
    "modelOverrides": {
      "ilaas-bride/gemma-4-31b": { "reserveTokens": 8000, "keepRecentTokens": 8000 }
    }
  }
}
```

Compaction then triggers beyond 24,000 tokens (32,000 minus 8,000) and leaves the last 8,000 tokens intact. `reserveTokens` equals the declared `maxTokens`, so that the reserved space matches the longest allowed response. The key `ilaas-bride/gemma-4-31b` limits these settings to the capped model, and the 128K model keeps the default values. Pi only reads this file if you trust the project: accept the prompt it shows at launch, or type `/trust`. In `pi -p` mode, where it cannot ask the question, it ignores the file without warning.

You then have both regimes in `/model`, `ilaas/gemma-4-31b` at 128K and `ilaas-bride/gemma-4-31b` capped at 32K. Have the agent work on several files with the second one until it triggers, read the summary it produces, then check in `/tree` where the cut happened and whether the agent still knows what it was originally asked to do.
:::

This manipulation also shows that Pi compacts around 24,000 tokens not because the model is saturating, but because you declared a 32,000 window to it. The window a harness knows about is a line of configuration and not a property of the model. This observation will serve you the day an agent starts compacting too early for no apparent reason.

### What to do when tool outputs fill the window?

The fifth source of the window, the history, grows mostly through tool outputs. When the agent reads ten files to find the function it needs, or runs a `grep` that returns three hundred lines to keep two, everything it read stays in the context and is re-read at every turn until the end of the session, including what was of no use to it. Compaction only handles this problem after the fact, by summarising what was useful.

At launch, Pi had no tool to call an MCP server, because its author considered that these servers filled the context window too easily. The discourse changed with version 1.0, notably with the arrival of `codemode`, which simplifies the use of MCPs and reduces their weight in the window ([You Said No MCP!](https://earendil.com/posts/you-said-no-mcp/)).

Instead of calling tools one by one and receiving each result in the window, `codemode` lets the model write a program that makes the calls, filters and combines the results, and only the program's output comes back into the context. [Cloudflare](https://blog.cloudflare.com/code-mode-mcp/) and [Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp) described this approach in late 2025 for MCP servers that expose hundreds of tools. Their figures, like the 150,000 tokens cut down to 2,000 that Anthropic advertises, describe the best case, a workflow that moves large volumes of data between two services. Mario Zechner, the author of Pi, argued for the same idea in [What if you don't need MCP at all?](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/): an agent that has `bash` and can write code has no need to route every intermediate result through its context.

Pi has offered this mode since version 1.0 as a tool, [`codemode`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/codemode.md), shipped with Pi but inactive by default. You add it to the base tools for a session with `pi --tools +codemode`, or for a project with `"defaultTools": ["+codemode"]` in `.pi/settings.json`. The model then writes a JavaScript script that calls the other tools (`tools.read(...)`, `tools.bash(...)`, the tools of the MCP servers) and returns what it finds useful with `text()` or `return`. The script runs in a [QuickJS](https://bellard.org/quickjs/) sandbox, with no access to the network or the filesystem other than through the tools, and its output is capped at 10,000 tokens by default: beyond that, Pi keeps the beginning and the end and writes the full text to a temporary file whose path it gives you.

This lever has a fixed cost, that of the tool description, which goes into the stable prefix at every turn. The Pi 1.0 changelog says that a GPT-5.6 request with the default tools and `codemode` active went from about 5,300 to 3,300 tokens after that description was trimmed, which gives the order of magnitude to amortize. On a task that reads little, such as NÉON's issue #1 (a source file of a few hundred lines and four tools), there is therefore a good chance that `codemode` increases input tokens instead of reducing them. It becomes interesting when the outputs are large and the essentials can be filtered in the script: searching for a pattern across a whole repository, aggregating the output of a test suite, querying an MCP server that returns entire documents.

::: warning What `codemode` does not change
Tool calls made from a script are real: a `tools.bash(...)` or a `tools.edit(...)` modifies the repository exactly as if it had been called directly, and a script that fails partway through does not undo the calls already made. The QuickJS sandbox isolates the script, not the tools it calls, and [module 2.0](./act2-sandbox) is still what bounds what the agent can touch.

Enable it at the start of a session too, rather than partway through: the tool list is part of the cached prefix, and changing it makes everything that follows be paid for again at full price, like a model change.
:::

::: info Exercise (self-paced)
In a clone of NÉON, ask the same question twice, one that forces you to walk through the repository, once with the default tools and once with `--tools +codemode`, for example:

```bash
pi -p -nc --session-dir ./runs/without-codemode --provider opencode-go --model deepseek-v4-flash \
  "Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4-flash \
  "Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4-flash \
  "Utilise l'outil codemode. Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

pi -p -nc --session-dir ./runs/with-codemode --tools +codemode --provider opencode-go --model deepseek-v4-flash \
  "Utilise l'outil codemode, en une seule commande. Pour chaque fichier de game/, \
   donne le nombre de lignes, la liste des imports, \
   la liste des fonctions exportées avec leur ligne, et les fonctions exportées \
   qui ne sont utilisées dans aucun autre fichier de game/." < /dev/null

```

Compare the input tokens of each call in the HTML export of the four sessions, then read what the script actually returned to the model.
:::

To export a session, just run:

```bash
pi --export runs/--path--/session.jsonl
```

In the previous exercise, you should find that if you do not explicitly ask to use `codemode`, the model decides there is not enough work to launch this tool. Check that it is in the list.

In the third case, the model calls `codemode` several times, which requires many more tokens and time than in the first case.

Finally, the last case should show you that you save time and tokens if you run only a single command.

::: info Other tools to reduce what the agent reads
Other tools tackle the same problem from another side. Repository maps like [Aider](https://aider.chat/docs/repomap.html)'s, language server (LSP) based servers like [Serena](https://github.com/oraios/serena), and code graphs exposed over MCP like [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) help the agent find the right lines without opening whole files; [RTK](https://github.com/rtk-ai/rtk) compresses command output before the agent reads it.

These tools should be handled with care, and you will find that they depend heavily on your use case. In some cases they will be useful, in others genuinely counterproductive. Here again, experimentation is your only weapon to judge their relevance.
:::

The manipulations in this module showed you what each lever changes on a single run, and one run does not say whether that change reproduces. [Module 3.1](./act3-contexte) takes the same levers on the same task, with twenty repetitions per configuration and an executable criterion, to separate what precisely moves the result from what comes from model variance.

## Generalizing

What we did on NÉON holds for any coding agent, not just Pi.

Context is re-read at every turn, and the cache bills fifty times less, on `deepseek-v4-flash`, for the part that has not changed since the previous turn. So place what stays stable at the start, the system prompt, the context files and the tools, and what varies at the end. A timestamp or a `git status` added to the system prompt makes everything after it be paid again at full price, at every turn.

Changing model or tool list mid-session resets the cache to zero. In the five-turn sequence at the start of the module, the first turn on `pro` costs fifteen times more than the next one, on the same model.

A setting proposed by the harness does not necessarily reach the model. With `gemma-4-31b`, `--thinking max` sends the same request as `--thinking minimal`, and the window Pi knows about is the one you declared in `models.json`. Before trusting a setting, look in the session at what it changed.

Tool output stays in the window until the end of the session. Better to filter it before it enters, with a script, a command or `codemode`, than to summarize it afterwards through compaction. This filtering also has a cost: the description of `codemode` enters the context at every turn, and on a small task like issue #1 it can cost more than it saves.

Finally, `AGENTS.md` also enters the context at every turn. Keep it short, only add a rule to it after seeing the agent fail without it, and point to the documents the agent can read when needed instead of copying them in. When you change models, read it again and remove what is no longer useful.

## Deliverable

This module produces two pieces.

**1. NÉON's `AGENTS.md`**, versioned in the repository, under 40 lines. For each rule, note the failure you observed during the exercises that made you add it.

**2. Your observations on each lever**, one line per lever, with the session or diff that shows it. [Module 3.1](./act3-contexte) takes up these levers again over twenty runs, and there you can compare your observations with the measurements.

| lever                             | what you observed        | session or diff |
| --------------------------------- | ------------------------ | --------------- |
| model choice                      |                          |                 |
| reasoning effort                  |                          |                 |
| `AGENTS.md`                       |                          |                 |
| system prompt (`.pi/SYSTEM.md`)   |                          |                 |
| constrained window and compaction |                          |                 |
| `codemode`                        |                          |                 |

::: tip Success criterion
You can say what the context window is made of. You know how it is initialized and how to change that initialization. You also understand how to limit the impact of tools or of the reasoning level. You can tell whether the inference infrastructure is well configured or whether it costs you more tokens than needed, which happens for example when the cache is misconfigured or not configured at all.
:::

## To go further

- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172), the study that justifies not settling for filling the window.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering](https://www.philschmid.de/context-engineering), on the shift from the isolated prompt to the architecture of the context.
- [Pi's documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs), and in particular its pages on compaction, models, and settings.
