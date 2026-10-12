# Delegation: splitting work into sub-agents

::: tip Objectives of this module
- Know what a sub-agent receives at creation, what it does not receive, and what comes back from it
- Write an agent whose tool list limits what it can do, and verify it in the trace
- Run the explore → plan → code → evaluate loop yourself on a real ticket
- Know how to tell who actually ran, and with which model
- Keep a log of the decisions made between two steps, which the next module needs to automate the loop
:::

We now have a fairly clear picture of what can help us in the main context to solve complex problems, in particular through skills. Nevertheless, a skill is only text, and its description may be insufficient, or even ineffective, for the model to use it. Once used, the skill enters the context along with its result. Finally, you cannot finely tune the tools you want to use and those you do not.

So we will see how to start work sessions outside the main context, using what we call agents, which can themselves use skills. This module splits the work into four roles (**explore**, **plan**, **code** and **evaluate**), each run in a separate context, with its own tool list and model. You will use no orchestration mechanism: you launch each role, decide what passes from one to the next, and run the tests in between. A command, `/step`, passes one agent's result to the next, but you choose the next step. The next module will automate this loop, and to know what to automate, you have to have done it once by hand, noting the decisions made between two steps.

## Understand

### A sub-agent is a fresh context

A **sub-agent** is a session opened by the main session, with its own system prompt, its own tool list, its own model, and an initially empty context window. It receives a task as text, works, and returns a final text. Everything else, its file reads, its tool calls and its reasoning, disappears when its session ends, and only its conclusion comes back into the context of the session that launched it.

The first reason to delegate is context isolation. The work of a subtask is almost always bigger than its conclusion: establishing which files a ticket touches requires reading a dozen of them, several thousand tokens of tool output, whereas the resulting note fits in thirty lines. If you do this work in the main session, the ten files stay in your window until the end. If you delegate it, only the note enters it.

The second is tool restriction. A skill can ask the model not to write, but nothing forces it: the [Agent Skills](https://agentskills.io/specification) standard does define an `allowed-tools` field, which pre-authorizes tools rather than forbidding the others, but Pi ignores it. An agent whose toolkit does not include a writing tool cannot write, whatever instruction it receives.

The third is the separation between whoever writes the code and whoever reviews it. A model reviewing code it has just written still has the whole reasoning that led to it in its context, and tends to validate what it meant to do rather than what it actually wrote. A reviewer launched in a fresh context knows only the ticket, the plan, and the diff, and therefore judges the code as it is.

### The anatomy of an agent

On Pi, delegation is not in the core of the tool: it comes through [combo](https://github.com/AI-for-dev/combo), a library written for this training on top of the Pi SDK. In combo, an **agent** is described by a Markdown file. When the main session launches it, it runs as a subagent, and several subagents can be chained in a workflow written in TypeScript or Markdown, which the next module will do.

::: info Where combo comes from, and which extensions to prefer
combo was born from the needs of this course, and its choices follow from that. We cannot claim this tool is a design gem for orchestrating subagents. We shaped it our own way and it will certainly evolve with our future uses, perhaps one day becoming useful for building complex pipelines. Above all, we wanted you to be able to read the subagent exchanges in detail and easily write complex workflows.

Its integration with [herdr](https://herdr.dev) gives one pane per subagent, to watch the work happen instead of waiting in front of a counter. We also added orchestrators to compose richer pipelines than a single call. And since the whole rest of the training measures, a run there counts the time and tokens of each subagent, and exports entirely as readable HTML and replayable JSONL. These measurements require no instrumentation, because the subagents run in the Pi process, through its SDK, and Pi already knows the time and tokens of each call.

We recall that combo is not, for now, a production library, and several extensions of the Pi ecosystem are more battle-tested for everyday use.

The [`subagent` example from the Pi repository](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) is the most direct point of comparison: the same markdown files in the same directories, and three modes, single, parallel, and chain. It runs each sub-agent in a separate `pi` process, and when `model:` is absent, the sub-agent inherits the model from the calling session. combo, on the other hand, falls back on your settings: the warning in the following section therefore describes combo and not Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) is the most polished of the three for everyday use. It installs in one command, `pi install npm:pi-subagents`, and ships ready-to-use agents (`scout`, `researcher`, `reviewer`, `oracle`) where combo asks you to write your own. It adds background tasks, which keep running in a detached process while you work, and saved workflows.

[pi-envoy](https://github.com/jmnargi/pi-envoy) tackles the problem from a governance angle. Each child receives a delegation contract before starting, with its objective, scope, acceptance criteria and verification commands, and the parent gets a terminal dashboard, a message bus between agents, dollar budgets, and a way to stop a child mid-run.

If you build a chain you depend on, start from one of these three. We keep combo here for pedagogical reasons: its agents are markdown files you read in full, the tool restriction can be verified in the trace, and what the library does remains visible. Everything the module establishes carries over to the others.
:::

The library can be used in two ways: from a script, or from Pi through its **extension**, loaded with `-e`, which registers a `subagent` tool that the main session's model can call. For the model, launching a subagent is therefore a tool call like any other, just like `read` or `edit`. combo also provides nine orchestrators (`chain`, `fanOut`, `loop`, `orchestrate`...) that chain several agents together automatically. This module uses none of them: you launch one agent at a time, and you move from one to the next yourself.

An agent is defined in a Markdown file whose structure resembles that of a skill. Here is the smallest complete agent:

```markdown
---
name: reader
description: Reads one file and reports what it exports
tools: read
model: ilaas/gemma-4-31b
---

You read the file you are given and list its exported symbols,
one per line, with the line number. Nothing else.
```

The header gives the name, the description, the model and the **toolset**, that is, the list of tools the agent has available (`tools:`). The body of the file becomes the subagent's system prompt. Unlike a skill, which the model may never open, this text is therefore always read. The `tools:` line, for its part, fixes the only tools the subagent can call: `reader` can read, but it has no way to write, whatever task it is given.

A file that omits `tools:` gets the read-only toolset, `read, grep, find, ls`, which is the right default for anything that explores. We nevertheless always declare the list, so that reading the file shows what the agent can do.

::: warning Agent file structure
The first markdown file example we introduced matches the classic structure of a subagent that you will also find in other harnesses such as Claude Code, Codex, OpenCode or Cursor. It is therefore not tied to the `combo` library we mentioned above.

The fields presented below are specific to combo. Other tools in principle ignore fields they do not know, so a file containing them remains usable elsewhere.
:::

In combo, we have additional fields in the metadata. The `lifetime` field controls the subagent's lifespan. With `task`, the default value, the subagent is created for one task and disappears when it ends; with `workflow`, it keeps its context from one iteration of a workflow to the next. This module uses `task` everywhere.

A subagent inherits nothing from your environment: no extensions, no skills, no context files. It only sees its definition, completed by a single line telling it where it is. Its behavior therefore does not depend on your personal configuration, and everything it needs to know goes through its prompt or through the task you give it. If you need to provide skills to your agent, you can do so by adding the list in a `skills` field. This field also exists in Claude Code, but not necessarily in other harnesses. Beware: if you don't put the `read` tool in the toolkit and you fill in `skills`, the agent will fail because it won't be able to read the skills.

The project's agent files live in `.pi/agents/`, your machine's in `~/.pi/agent/agents/`, and the extension ships its own demo agents. An agent can share the same name in both directories, and combo lets you pick which one to use.

::: warning An agent without `model:` runs on today's settings
A sub-agent's model is never inherited from its parent session. It comes from an argument passed to the call, otherwise from the pipeline file, otherwise from the agent header, and as a last resort from Pi's settings: the closest to the work wins. An agent that declares nothing and is run without an argument therefore runs on your `~/.pi/agent/settings.json`, that is, on whatever is in there that day.
:::

::: warning Understanding the agent hierarchy
Like most Pi setups you have seen since the start of this training, combo loads project agents, your machine's agents, and its own by default. When two agents share a name, the project's wins. Since the files in `.pi/agents/` come from the repo you cloned and someone else may have written them, read them before answering `Trust` to the question Pi asks on first launch in a folder. If a project agent shadows an agent with the same name in `~/.pi/agent/agents/`, combo reports it in the call result, and you get yours back by requesting the `user` scope.

You can get the list of your agents via the command:

```
/agents
```
:::

::: warning See your agents' activity
The idea of this module is to break down orchestration and watch sub-agents work. Even though with combo you can see the Pi session trace afterwards, it is always more pleasant to watch events happen live. To do that, you can use herdr.

You will then need to launch your Pi session in herdr and type this line:

```
/herdr on
```

so that every sub-agent in combo opens its own window.
:::

## Rebuilding

### The task: issue #2

The whole practical part is about NÉON's **issue #2**: the collision is described as slow and tangled with rendering, and the issue asks you to identify the critical path and optimize without changing the public API. When you read `game/neon.js`, you will notice that the loop over bricks in `frame()` performs collision, scoring, and drawing in the same body, so none of it is testable separately. The expected output is a **pure** function, extracted from `frame()` and covered by new tests, without any of the exports of `game/neon.js` changing name or signature.

The path chosen here is very classic, and you'll probably find it again in "software factories". You'll watch several roles run during this bug's resolution phase and form your own opinion about each one's impact. We propose four, but in practice you may find that too many. Here too, this module lets you be the main actor and shape your harness however you like.

The frame doesn't change: only `game/neon.js` and `game/neon.test.js` can be modified, new tests go in the suite and nowhere else, and `npm test` must finish green. We recall that this is a strong constraint, present here only to test the model's obedience.

### Defining the four roles

The ticket passes successively between four agents. Each receives the previous one's output, produces a single deliverable, and has only the tools needed to produce it. None of the four has a shell: between `coder` and `reviewer`, you're the one who runs the tests.

| agent      | receives                        | returns                                   | toolkit                             | what its toolkit forbids it from doing |
| ---------- | ------------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- |
| `explorer` | the ticket                      | an impact note                            | `read, grep, find, ls`              | modifying anything                     |
| `planner`  | the ticket and the impact note  | a plan in small steps                     | `read, grep, find, ls`              | modifying anything                     |
| `coder`    | **one** step of the plan        | the code and test for that step           | `read, grep, find, ls, edit, write` | running a command                      |
| `reviewer` | the step, the diff and the test output | `APPROVED` or `CHANGES REQUESTED`, with justification | `read, grep, find, ls, verdict` | fixing what it reviews |

The four files are versioned in `scripts/agents/`, and you'll copy them into the `.pi/agents/` of your NÉON clone. The full text of each agent is collapsed under its description.

#### `explorer`: saying what the ticket will touch

`explorer` receives the ticket and returns an **impact note** in four parts: the places in the code the change will touch, with the file and lines; what depends on those places (callers, tests, imports); what the ticket leaves open; and what must not move, in particular the exports the tests import. It doesn't propose a fix, since that's the job of `planner` and then `coder`. Its prompt also warns it that the ticket author in this repo has sometimes been wrong about the location of the code, so it checks what the ticket claims in the files instead of copying it over. With only its reading tools, it can't modify anything, even by mistake.

::: details The `explorer` agent

<<<@/../scripts/agents/explorer.md{md}

:::

#### `planner`: break the work into small steps

`planner` receives the ticket and the impact note, and returns a **plan**, that is, an ordered list of steps. Each step states what to do, the only files it may touch, the red test to write first, and a completion criterion you can check with `npm test`. A step must be small enough for `coder` to finish it in a single invocation, and the prompt gives one simple rule: "if you hesitate, split it". That constraint comes from [module 3.1](./act3-contexte), where four runs out of twenty write the red tests a long ticket asks for, then stop without ever opening `game/neon.js`. If a step adds an export to `game/neon.js`, `planner` must write it on an `api:` line, so that `reviewer` can rule on it.

::: details The `planner` agent

<<<@/../scripts/agents/planner.md{md}

:::

#### `coder`: run one step, and only one

`coder` receives **a single step** from the plan. It writes the test in `game/neon.test.js` first, then the smallest change to `game/neon.js` that should make it pass, and ends with a short report: the files touched, the test name, and what it could not do. It is the only one of the four that can write, but it has no shell, so it cannot run the tests, and its prompt forbids it from claiming it did. You run `npm test` after it, and it is the output of that command, not its report, that says whether the step is done.

::: details The `coder` agent

<<<@/../scripts/agents/coder.md{md}

:::

#### `reviewer`: review the step without fixing it

`reviewer` receives the ticket, the step, and what you paste to it: the diff and the output of `npm test`. It does not trust `coder`'s report and re-reads the repository code directly to check four points in order: the tests pass and the new test appears in the output, the exports of `game/neon.js` have not changed, only the files the step planned were touched, and the new test actually constrains the result. It returns `APPROVED` or `CHANGES REQUESTED`, with one reason per line citing a file and a line. When combo gives it the `verdict` tool, it records its decision through that tool instead of writing it in the text. It never fixes anything itself, because no one would re-review its fixes. If it is the step in the plan that is poorly designed, it says so, and then you go back to `planner`.

::: details The `reviewer` agent

<<<@/../scripts/agents/reviewer.md{md}

:::

Two other files, `tester.md` and `auditor.md`, sit in the same directory and will be copied along with the four roles. This module does not use them. The next module does: `tester` produces a test plan that `planner` can receive in addition to the impact note, and `auditor` reviews the work once it is finished.

::: warning Combo version
This module assumes combo 0.5.0 or newer, because earlier versions only load project agents if the call specifies the scope. If you installed combo earlier, `pi update npm:@ai-for-dev/combo` will update it.
:::

::: info Exercise (in class)
Before starting the loop, check that each agent knows the limits of its toolkit. Install the extension and drop in the agents:

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi
```

The extension does not add an explicit command to call an agent: `subagent` is a tool the main session's model calls when you ask it to. You just name the agent and what you want it to do. So call `explorer` like this:

```
utilise le subagent "explorer" pour la tâche "Nomme exactement les outils dont tu disposes."
```

Here is what ours returned:

> "I have the following tools:
> `read`: read the contents of a file. `grep`: search for a pattern in file contents. `find`: search for files matching a pattern (glob). `ls`: list the contents of a directory."

The list contains no writing tool, and it is the agent itself that says so.

Do the same with `coder`, this time asking it to run the tests:

```
utilise le subagent "coder" pour la tâche "Lance `npm test` et rapporte le résultat."
```

> "The subagent 'coder' indicates that it does not have a tool allowing it to execute shell commands, and therefore cannot run npm test."

These two quotes are the outputs of two executions, and yours will be different: a model rephrases from one time to another, and [module 3.0](./act3-trysquare) quantified this dispersion. The content, however, remains the same: `explorer` lists four read tools, and `coder` responds that it cannot run the tests.

The main session, for its part, has access to `bash`, and the model may then run `npm test` itself to report a result to you. It is not `coder` that ran the tests, and the `bash` call following the `subagent` tool line shows this.
:::

::: warning Choice of model
You can also specify in your request the model you want to use, as in the following prompt:

```
utilise le subagent "coder" avec le modèle qwen-3.8-27b d'ilaas pour la tâche "Lance npm test et rapporte le résultat."
```

The model has to be declared in your `~/.pi/agent/models.json`, like those in the [Pi installation](./act1-pi), otherwise combo refuses the call with `Model "qwen-3.8-27b" not found for provider "ilaas"`. With `/step`, presented further on, the `--model ilaas/qwen-3.8-27b` option has the same effect.
:::

### Running the loop by hand

You now hold the orchestrator role that the next module will automate. Open the main session with the extension loaded, and walk the chain one step at a time with `/step`. This command is part of combo. If you do not have it in the Pi console, then it is not properly installed.

This `/step <agent> <instruction>` command runs the agent you name on what you type, plus the previous step's output (this happens automatically). Its answer is written to the transcript without entering the model's context: the main session sees the reports scroll by without reading them, so it cannot act on them. If the main session read the exploration report, it could choose the next move itself from conclusions you haven't validated, whereas we want you to decide the next step. When a result deserves to be discussed with the model, the `/quote` command brings the previous step's output into the context, with no copy-paste.

The loop has six steps:

1. `/step explorer handles ticket #2 from ISSUES.md` produces the impact note;
2. you read it in the transcript, then `/step planner breaks down ticket #2 from ISSUES.md into steps, based on this note` produces the plan. The ticket must be included in what you type, since `/step` only passes the output of the previous step;
3. `/step --from none coder`, followed by step 1 which you copy from the plan with its files and its exit criterion. Without `--from none`, `coder` would also receive the entire plan, whereas it should only see its specific step. It produces its report, and its modifications are in the repository;
4. you run **`npm test` yourself**, in a second terminal, and you save the output;
5. `/step reviewer` receives the report from `coder`; paste the ticket, the step, the diff (`git diff`), and the test output into it, and it produces its verdict;
6. depending on the verdict, you give the next step to `coder`, you send the same step back with the reasons for refusal, or you return to `planner` if the step is the issue. `/step --from <id>` starts again from the output of an older step, which allows you to go back.

`/chain` lists the steps taken at any time and provides the directory where the chain is exported; `/chain reset` starts over from scratch in a new directory. The tool thus records the order of steps for you, but not the reasons for your choices.

While a subagent is working, a dot appears above the prompt with its model, its tokens and a timer, and the tool line below keeps a record of the call. With herdr and `/herdr on`, described above, each subagent has its own tab, and you see `explorer` reading while you prepare the next task. This view lets you follow the work, but to conclude anything you have to read the step's trace.

During the loop, keep a log of the decisions you make between two steps and of the criterion that made you settle. Note for instance why you sent a step back to `coder`, why you returned to `planner`, or what you re-read before deciding. The next module will use it to write the orchestrator, since each logged decision is a rule it will have to apply on its own.

::: info Exercise (in class)
Run the loop through to the first `APPROVED`, that is, until step 1 of the plan is delivered, tested and reviewed. If `reviewer` rejects, follow the rejection through to the end: that is the most instructive case, because you have to decide who to send the verdict back to.

If the session allows, continue to the end of the plan. The final criterion is the one from the ticket: the extracted function is pure and covered by at least two new tests in the suite, all functions exported from `game/neon.js` still are, and `npm test` is green.
:::

### What isolation changes in your window

::: info Exercise (in-class)
Right after the `explorer` note is returned, type `/session` in the main session: it contains no messages, because `/step` displayed the note in the transcript without adding it to the context. Then open a new session without the extension, using `pi -ne` (combo is installed in the project, and a simple `pi` would load it), and ask the model to produce the same impact note itself, by reading the repository and without modifying anything. Compare the two `/session` outputs, then the two `/tree` outputs.

In the second session, each read file remained in the window and will stay there until the end, whereas the first one remains empty unless you use `/quote`, which would only add the note. With delegation, the files read by `explorer` remain in its own context, which disappears at the end of its task. This is the mechanism seen in [module 2.1](./act2-contexte): everything that remains in the window is sent back to the model in each turn.
:::

### Verify in the trace who ran

::: info Exercise (in-class)
Type `/chain`: its last line provides the directory where combo exported the chain, `runs/<date>/` at the root of NEON. Each step has its own folder (`1-explorer`, `2-planner`...) containing the sub-agent's session in JSONL and HTML, and a `usage.json` file specifying the agent's name, lifespan, model, assigned task, tokens, and duration. The HTML session shows every tool call, making it possible to verify that the agent stayed within its toolkit. This is the only reliable way to know who ran if you didn't see your agents' activity via herdr.
:::

::: warning `/export` after a loop using `/step`
`/export` exports the main session, which contains nothing after a loop made solely of `/step`: Pi then replies `Nothing to export yet`. On the other hand, agents launched by the `subagent` tool, as in the first exercise, are listed there, with each call showing the agent's name and task, and its result showing the model.
:::

## Generalizing

What we did with these four agents holds for any split into roles.

A subagent first serves to keep the main window light. `explorer` read several files, and only its note came back into the main session. That only works if the subagent returns a short result: if it copies back everything it read, you gained nothing.

To stop an agent from doing something, take the tool away instead of writing it in its prompt. `coder` does not run the tests because it has no shell, and not because its prompt asks it to. A tool list can be checked by reading the agent's file, whereas nothing guarantees that a model follows an instruction.

Have the code reviewed by an agent other than the one that wrote it. `reviewer` knows only the ticket, the step and the diff, so it judges what was written and not what was planned. Leave it without a writing tool, otherwise its own changes would be reviewed by no one.

Declare all the fields of an agent, even when the default value suits you. Without `model:`, the agent runs on the model configured that day in your settings; without `tools:`, it receives the reading tools; without `name`, it is not loaded at all.

Cut the work into steps small enough for an agent to finish them. Splitting into roles does not give the model more capacity, and a `coder` that received the whole plan at once would risk dropping out as in [module 3.1](./act3-contexte). We make the hypothesis that small steps give a better result, and the next module lets you measure it.

Finally, run the loop by hand before automating it. Your journal contains the decisions the orchestrator will have to make alone: which agent to hand over to, when to go back, and on what criterion.

::: info Exercise (on your own)
You can now test many combinations and try to see their influence on the results. Among these combinations, you can:
- write your own agents or modify the agents proposed in this module,
- add skills to the agents,
- change the models and in particular see the changes when you use larger models for the plan and validation phases,
- ...
:::

::: tip What you have learned
You can show, trace in hand, which agent ran at each step of your loop, with which tools and which model. You also know which decisions you made between two steps, the ones the orchestrator of the next module will have to make on your behalf.
:::

## To go further

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), about the orchestrator and researcher sub-agents, and about what parallelization costs in tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), the counterpoint: what context fragmentation makes you lose, and why sharing the full thread is sometimes preferable.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), the page that distinguishes workflows and agents; the next module puts these patterns into practice.
- [combo](https://github.com/AI-for-dev/combo), the library of sub-agents and workflows used here: its documentation on agents and lifetimes, and its `NEXT.md`, which lists the pitfalls already encountered.
- [herdr](https://herdr.dev), the live view of sub-agents, used in this module and the next one.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), for the place of sub-agents among the other building blocks: reinjecting a clean synthesis rather than the thinking that produced it.
