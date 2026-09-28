# Delegation: splitting work into sub-agents

::: tip Objectives of this module
- Know what a sub-agent receives when it is created, what it does not receive, and what comes back from it
- Write an agent whose guarantee rests on its tool set, and verify that guarantee in the trace
- Run the explore → plan → code → evaluate loop yourself on a real ticket
- Know how to tell who actually ran, and with which model, rather than trusting a ✓
- Leave with the journal of what the orchestration taught you, which the next module needs to automate the loop
:::

The two previous modules ended on two findings. The first is that polishing the prompt text by explicitly stating the expected behavior improves results on certain columns. Our scoped ticket takes the corner case from 0/20 to 14/20 because ISSUES.md describes it. Nevertheless, with or without the fine-grained description of the bugs in issue #1, the "bricks" correction is respectively 11/20 and 13/20, which is not a fundamental change. In contrast, submitting the unit tests we want upfront moves this result from 11/20 to 18/20 without changing a line of the prompt. The second finding is that a skill only has text, with no input schema, no execution function and no permission guard, so nothing it asks for is guaranteed: its instruction to clean up at the end remained a dead letter in eleven runs out of twenty, and its only established effects were shifts of work, never an improvement in the correction.

The agent alone has its limits, and we can only note that it does not necessarily succeed on its own. But imagine a sub-agent that adds relevant unit tests for this agent: would we be able to recover this 18/20 result? We will therefore try to split the work across agents specialized in certain tasks.

This module splits the work into four roles (**explore**, **plan**, **code**, and **evaluate**), each run in a separate context, with its own tool list and model. You will use no orchestration mechanism: you launch each role yourself, decide what passes from one to the next, and run the tests in between. A command transports the deliverables for you, but no code chooses the next step. The next module will automate this loop. But before automating, you first have to know which moves to replace or sequence differently. This list is built by running the loop yourself, and it is part of the module's deliverables.

## Understand

### A sub-agent is a fresh context

A **sub-agent** is a session opened by the main session, with its own system prompt, its own tool list, its own model, and an initially empty context window. It receives a task as text, works, and returns a final text. Everything else, its file reads, its tool calls and its reasoning, disappears when its session ends, and only its conclusion comes back into the context of the session that launched it.

Three properties of this definition motivate delegation.

The first is context isolation. A sub-task's work is almost always bigger than its conclusion: establishing which files a ticket touches requires reading about ten of them, that is, several thousand tokens of tool outputs, whereas the resulting note fits in thirty lines. If you do this work in the main session, the ten files stay in your window until the end. If you delegate it, only the note enters it.

The second is tool restriction. The previous module showed that an instruction does not compel anything, since the cleanup instruction in `SKILL.md` is followed in fewer than one run in three. An agent whose toolkit contains no writing tool cannot write, and the question of obedience no longer arises.

The third is the separation of generator and evaluator. A model that re-reads its own work leans toward the favorable side, and that is understandable: its window contains all the reasoning that led it to this code, so much so that it re-reads its intentions rather than its diff. A reviewer in a fresh context knows only the ticket, the plan, and the diff, and is therefore more objective.

### The anatomy of an agent

On Pi, delegation is not at the core of the tool: it comes through [combo](https://github.com/AI-for-dev/combo), a library written for this training on top of Pi's SDK. A markdown file becomes an **agent**, an agent becomes a **sub-agent** whose lifetime is controlled by the caller, and sub-agents compose into workflows written in TypeScript or, once again, in Markdown.

::: info Where combo comes from, and which extensions to prefer over it
combo was born from the needs of this course, and that explains its choices. We cannot say that this tool is a jewel of design for driving sub-agents. We shaped it our own way, and it will certainly evolve according to our future uses, perhaps one day becoming useful for building complex pipelines. Above all, we wanted you to be able to dive into the sub-agents' discussions, and to write complex workflows easily.

Its [herdr](https://herdr.dev) integration gives one panel per subagent, so you can watch the work being done instead of waiting in front of a counter. We also added an orchestration toolkit to create pipelines made of richer shapes than an isolated call. And like everything else the training measures, an execution here records the time and tokens of each subagent and exports entirely as readable HTML and replayable JSONL. These measurements are possible without instrumenting child processes because the subagents run inside Pi's process, through the SDK, and Pi already holds all its information.

We recall that combo is not, for now, a production library, and several extensions of the Pi ecosystem are more battle-tested for everyday use.

The [`subagent` example from the Pi repository](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) is the most direct point of comparison: the same markdown files in the same directories, and three modes, single, parallel, and chain. It runs each sub-agent in a separate `pi` process, and when `model:` is absent, the sub-agent inherits the model from the calling session. combo, on the other hand, falls back on your settings: the warning in the following section therefore describes combo and not Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) is the most polished of the three for everyday use. It installs in one command, `pi install npm:pi-subagents`, and ships ready-to-use agents (`scout`, `researcher`, `reviewer`, `oracle`) where combo asks you to write your own. It adds background tasks, which keep running in a detached process while you work, and saved workflows.

[pi-envoy](https://github.com/jmnargi/pi-envoy) tackles the problem from a governance angle. Each child receives a delegation contract before starting, with its objective, scope, acceptance criteria and verification commands, and the parent gets a terminal dashboard, a message bus between agents, dollar budgets, and a way to stop a child mid-run.

If you build a chain you depend on, start from one of these three. We keep combo here for pedagogical reasons: its agents are markdown files you read in full, the tool restriction can be verified in the trace, and what the library does remains visible. Everything the module establishes carries over to the others.
:::

The library can be used two ways: from a script, or from Pi through its **extension**, loaded with `-e`, which registers a `subagent` tool that the main session's model can call. The sub-agent is thus added to the main session's tools, just like `read` or `edit`, instead of forming an orchestration engine alongside the harness. combo also provides nine orchestrators, `chain`, `fanOut`, `loop`, `orchestrate` and the others, none of which this module uses: one agent at a time, since you are the one driving the loop between agents.

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

The header carries the name, the description, the **toolset** (`tools:`) and the **model**. The body becomes the **system prompt** of the sub-agent: every `reader` session starts with this text as its only frame, whereas a skill remains a procedure that the model decides whether to open or not.

The difference from a skill is therefore twofold. The body is always read, and the `tools:` line decides which tools the sub-agent's session registers, so an agent without `write` has no way to write, whatever task it receives.

A file that omits `tools:` gets the read-only toolkit, `read, grep, find, ls`, which is the right default for anything that explores. We will nevertheless prefer to list the available tools, to make this file and the sub-agent's possible actions easier to read.

::: warning Structure of agent files
The first example Markdown file we introduced matches the classic structure of a sub-agent that you will also find in other harness libraries such as Claude, Codex, OpenCode, Cursor, ...

In the next paragraph, we will introduce metadata specific to combo that you will not find in the others. Nevertheless, these files should still work with other tools, since unrecognized metadata will simply be ignored.
:::

In combo, we have an extra field in the metadata. The `lifetime` field controls the sub-agent's lifetime: `task`, the default value, makes it live and die with each task, while `workflow` makes it survive from one iteration to the next. This module uses `task` everywhere.

A sub-agent inherits nothing from your environment: no extensions, no skills, no context files. It only sees its definition, completed with a single line telling it where it is. This is what makes an execution reproducible, and that is why everything a role needs to know goes through its prompt or the task you give it. If you need to provide skills to your agent, you can do so by adding the list in a `skills` field.

The project's agent files live in `.pi/agents/`, those on your machine in `~/.pi/agent/agents/`, and the extension ships its own demo agents. You can have the same agent name globally and locally, and combo lets you choose which one you want to use. We will see this later.

::: warning An agent without `model:` runs on today's settings
A sub-agent's model is never inherited from its parent session. It comes from an argument passed to the call, otherwise from the pipeline file, otherwise from the agent header, and as a last resort from Pi's settings: the closest to the work wins. An agent that declares nothing and is run without an argument therefore runs on your `~/.pi/agent/settings.json`, that is, on whatever is in there that day.
:::

::: warning Your project agents are never loaded by default
`.pi/agents/` is content controlled by the repository, so its instructions are third-party instructions: combo refuses to load them unless you ask. The scope is requested at each tool call.

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

This issue fits this module for two reasons. The first is that each role has a falsifiable deliverable: an impact note is checked by opening the files it cites, a plan is checked step by step, a diff is checked by running the test suite, a verdict is checked against the export list. The second is that the issue claims something it does not measure, since "the collision is slow" is a maintainer's statement, not a number. It is therefore necessary to verify that this is true and where it occurs.

The framework stays the same: only `game/neon.js` and `game/neon.test.js` may be modified, the new tests go in the test suite and nowhere else, and `npm test` must finish green.

### Four roles, and what each is allowed to do

| agent      | deliverable                                    | toolkit                                   | what its toolkit forbids |
| ---------- | ---------------------------------------------- | ----------------------------------------- | ------------------------ |
| `explorer` | an impact note                                 | `read, grep, find, ls`                    | writing anything at all  |
| `planner`  | a plan in small steps                          | `read, grep, find, ls`                    | writing anything at all  |
| `coder`    | the diff of **one** step of the plan           | `read, grep, find, ls, edit, write`       | running a command        |
| `reviewer` | `APPROVED` or `CHANGES REQUESTED`, with reasons | `read, grep, find, ls`                   | fixing what it reviews   |

The four files are versioned in `scripts/agents/` and copied into the `.pi/agents/` of your NÉON clone. Here they are, with the writing decisions that carry over to any role split.

<<<@/../scripts/agents/explorer.md{md}

The explorer produces a note, not an opinion, and its last section reminds it of that: a note that also contains the fix ceases to be a note. Its system prompt also tells it that the tickets in this repo are written by a maintainer who has sometimes been wrong about where the code lives, which is true, and enough to make the note verify rather than copy.

<<<@/../scripts/agents/planner.md{md}

The planner applies the lesson from the module on context: a model has a budget, and describing more work does not enlarge it. Each step of the plan must therefore fit in a single invocation of the coder, with its explicit split rule, "if you hesitate, split". Each step starts with its red test, and the tests go directly into the suite, which is exactly the cut that the review of the previous module's procedure had to make to empty its failing columns.

<<<@/../scripts/agents/coder.md{md}

The coder has what it needs to write and nothing to execute, and its prompt states it: it does not run the tests, it does not claim to have done so, it is you who run them after it. We could have given it a shell, and the exercise that follows shows what its absence guarantees.

<<<@/../scripts/agents/reviewer.md{md}

The reviewer never fixes, because a reviewer that fixes becomes a second coder whose work is no longer reviewed. Its four checks are ordered, the most mechanical first, and two of them look at the tree rather than the diff, because a diff shows what changed without showing what the change forgot. Its verdict, finally, can point at the plan rather than the code, in which case it is to the planner that you will return.

Two other files, `tester.md` and `auditor.md`, live alongside the four roles and will be copied with them. They play no role in this module's loop: the first is the natural candidate for the parallel launch in the next module, the second will re-read the finished work as a whole there.


::: warning Using herdr
To keep track of subagent activity, we strongly encourage you to launch Pi from herdr (https://herdr.dev/). combo can open herdr windows to watch subagents work and close them automatically once they are done.
:::

::: info Exercise (in class)
Before launching anything, have each agent state its own guarantee. Install the extension and place the agents:

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi
```

The extension does not add an explicit command to call an agent: `subagent` is a tool that the main session model calls when you ask it to. You just need to name the agent and what you want it to do. So ask the explorer this way:

```
utilise le subagent "explorer" pour la tâche "Nomme exactement les outils dont tu disposes."
```

Here is what ours returned:

> "I have the following tools:
> `read`: read the contents of a file. `grep`: search for a pattern in file contents. `find`: search for files matching a pattern (glob). `ls`: list the contents of a directory."

The list contains no writing tool, and it is the agent itself that says so.

Do the same with the coder, this time asking it to run the tests:

```
utilise le subagent "coder" pour la tâche "Lance `npm test` et rapporte le résultat."
```

> "The subagent 'coder' indicates that it does not have a tool allowing it to execute shell commands, and therefore cannot run npm test."

These two quotes are the outputs of two runs, and yours will be different: a model rephrases from one run to the next, and the context module has quantified this dispersion. What recurs is the substance: the explorer listing four read tools and the coder returning the tests to the orchestrator.
:::

::: warning Choosing the model
You can also specify in your request the model you want to use, as in the following prompt:

```
utilise le subagent "coder" avec le modèle deepseek-v4-flash d'opencode-go pour la tâche "Lance npm test et rapporte le résultat."
```
:::

### Running the loop by hand

You now play the role of orchestrator that the next module will automate. Open the main session with the extension loaded, and walk through the chain one step at a time with `/step`.

The `/step <agent> <instruction>` command runs the agent you name on what you type, plus the output of the previous step. Its response is **written into the transcript without entering the model's context**: the main session sees the reports scroll by without reading them, so it cannot act on them. That is the difference that matters here. A session that reads an exploration report becomes an orchestrator you do not control, one that decides what comes next based on conclusions you have not validated. We want you to be the one deciding what the next step is. The main window is therefore your console, not a conversational partner as you have seen so far. The `/quote` command lets you bring the result of the previous step into the context, for a quick copy-paste when there is something to discuss.

The loop has six steps:

1. `/step explorer handles ticket #2 from ISSUES.md` produces the impact note;
2. you read it in the transcript, then `/step planner` receives it as-is, with the ticket, and produces the plan;
3. `/step coder` receives the plan; give it step 1 and nothing else, dictating it after the agent's name. It produces its report, and the diff is in the working tree;
4. you run **`npm test` yourself**, in a second terminal, and keep the output;
5. `/step reviewer` receives the coder's report; paste in the ticket, the step, the diff (`git diff`), and the test output, and it produces its verdict;
6. depending on the verdict: next step to the coder, back to the coder with the reasons, or back to the planner if the step itself is at fault. `/step --from <id>` resumes the output of a step older than the last one, which is exactly the move for going back.

`/chain` lists the steps gone through at any time; `/chain reset` starts from scratch in a new directory. The journal you kept by hand for the step order is now already kept by the tool, so you only write the part it cannot see, your decisions.

While a sub-agent is working, a dot appears above the prompt with its model, its tokens, and a timer, and the tool line below keeps track of the call. If [herdr](https://herdr.dev) is running on your machine, `/herdr on` gives each sub-agent its own tab, and you can watch the explorer read while you prepare the next task. This view is for following the work as it happens, without letting you conclude anything: for that, you need the trace of the previous step.

While you perform these steps, keep a journal of what `/chain` cannot see: not the order of the steps, which it already records, but what you decided in between and on what criterion. Why this step rather than the next, why this return to the planner, what you re-read before deciding. This journal lists what the orchestrator of the next module will need to know how to do, and you are well placed to write it since you will have made each decision yourself.

::: info Exercise (in class)
Run the loop until the first `APPROVED`, that is, until step 1 of the plan is delivered, tested and reviewed. If the reviewer rejects, play the rejection out to the end: it is the most instructive half of the loop, because it forces you to decide who to send the verdict back to.

If the session allows, continue to the end of the plan. The final criterion is the one from the ticket: the extracted function is pure and covered by at least two new tests in the suite, all functions exported from `game/neon.js` still are, and `npm test` is green.
:::

### What isolation changes in your window

::: info Exercise (in class)
Right after the explorer returns its note, type `/session` in the main session and note what it contains: your frame, the tool call, the note. Then open a new session without the extension and ask the model to produce the same impact note itself, by reading the repository. Compare the two `/session` outputs, then the two `\tree` outputs.

In the second session, each file read stayed in the window and will stay there until the end, whereas the first one only brought the note in. Delegation pays for the exploration in a context that disappears once the task is returned, instead of paying for it at every turn in the main window. The argument is the same as for cache reading in the context module: work is paid at every turn as long as it stays in the window, and only once when it does not enter it.
:::

### Verify in the trace who ran

::: info Exercise (in class)
Export the main session with `\export` and find each call of the `subagent` tool: the agent's name, the scope, the model, the task passed. It is the only reliable answer to the question of who ran if you have not seen your agents' activity via herdr.
:::


### Why this module publishes no matrix

The two previous modules based their claims on twenty repetitions, and this one publishes none. This absence is deliberate. We wanted above all to show you how delegation works and what it can bring you regarding the size of your context or the verification of changes in a fresh context.

You also saw that it is easy to finely control what an agent can do via its tools, and to define the model you want for it.

This module therefore cannot yet guarantee that splitting into roles improves the result, that is, that ticket #2 handled by this loop would be fixed better than the same ticket handled by a single agent. The question is legitimate, and it is a matter of measurement. The next module sets out the protocol that makes this measurement possible. We will automate the loop you ran by hand and observe the quality of the results.

## Generalizing

Delegating comes down to isolating a context so that only its conclusion comes back. The gain lies less in the cost of the work than in the fact that it does not remain in the window: an exploration done in the main session gets re-read at every turn until the end, whereas the same exploration, delegated, disappears with its context and leaves only thirty lines. Obviously, if what comes back from the subagent is as large as what it read, you have isolated nothing.

An agent's guarantee comes from its toolkit rather than its prompt. The coder's prompt tells it not to run the tests, but it is the absence of a shell that makes it unable to do so, and the agent itself can tell the difference. Every time you hesitate between writing a prohibition and removing a tool, remove the tool: an absence is visible in the configuration, whereas a prohibition assumes the model will follow it.

A generator does not evaluate itself. The value of a separate reviewer comes from what its context does not contain, namely the reasoning that produced the code. That is also why a reviewer that fixes destroys its own value, turning back into a code generator.

A field you do not declare is decided elsewhere. An agent without `model:` runs on whatever the machine is set to that day, a file without `tools:` gets the read-only toolkit, a file without `name` does not exist. The rule holds beyond agents: for every field of a configuration, ask yourself what happens when it is absent, and who then decides in your place.

Splitting into roles distributes the model's work without increasing it. The model that lost track on the long ticket will lose track just as much on an entire plan passed in one go. Working in small steps allows for better-quality work. A planner that splits too coarsely reproduces exactly the loss of track that the context module measured.

Automating a loop requires having run it by hand. Your journal says what the orchestrator will have to route, in what order, and on what criteria you decided to send work back. We remind you that building your own harness requires experience, and it is as you gain this experience that you will refine your harness so that trust takes hold.

::: info Exercise (on your own)
You can now test many combinations and try to see their influence on the results. Among these combinations, you can:
- write your own agents or modify the agents proposed in this module,
- add skills to the agents,
- change the models and in particular see the changes when you use larger models for the plan and validation phases,
- ...
:::

## Deliverable

This module produces three artifacts.

1. The four agents, versioned in your repository, each with its minimal toolkit and its declared `model:`. These are the ones the next module will connect to the orchestrator, without modifying them.
2. The journal of one loop iteration: the exported trace of the main session, the diff delivered by the first step, the `npm test` output the reviewer read, and your journal.
3. The choices to make between each step: you played the role of the main agent and organized the workflow. You now know what to expect for the full automation of the loop.

::: tip Success criterion
You can show, with the trace in hand, which agent ran at each step of your loop, with which tools and which model. As an orchestrator, you could also see which actions you would refuse to redo twenty times. This understanding is important for finalizing the automation of your first workflow in your harness.
:::

## To go further

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), about the orchestrator and researcher sub-agents, and about what parallelization costs in tokens.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), the counterpoint: what context fragmentation makes you lose, and why sharing the full thread is sometimes preferable.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), the page that distinguishes workflows and agents; the next module puts these patterns into practice.
- [combo](https://github.com/AI-for-dev/combo), the library of sub-agents and workflows used here: its documentation on agents and lifetimes, and its `NEXT.md`, which lists the pitfalls already encountered.
- [herdr](https://herdr.dev), the live view of sub-agents, used in this module and the next one.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), for the place of sub-agents among the other building blocks: reinjecting a clean synthesis rather than the thinking that produced it.
