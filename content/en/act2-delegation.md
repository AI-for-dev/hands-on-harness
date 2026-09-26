# Delegation: splitting the work into sub-agents

::: tip Module objectives
- Know what a sub-agent receives upon creation, what it does not receive, and what it returns
- Write an agent whose guarantee relies on its set of tools, and verify this guarantee in the trace
- Manage the explore → plan → code → evaluate loop yourself on a real ticket
- Know how to determine which agent actually ran, and with which model, rather than relying on a ✓
- Leave with a log of what the orchestration taught you, which the next module will need to automate the loop
:::

The previous two modules ended with two observations. The first is that refining the prompt text by explicitly stating the desired behavior improves results in certain columns. Our scoped ticket improves the edge case from 0/20 to 14/20 because ISSUES.md describes it. Nevertheless, with or without the detailed description of the bugs in issue #1, the "bricks" fix is 11/20 and 13/20 respectively, which is not a fundamental change. Conversely, providing the desired unit tests upfront improves this result from 11/20 to 18/20 without changing a single line of the prompt. The second observation is that a skill consists only of text, without an input schema, execution function, or permission guard, meaning nothing it requests is guaranteed: its instruction to clean up at the end went ignored in eleven out of twenty executions, and its only established effects were shifts in work, never an improvement in the fix.

The agent alone has its limits, and we can see that it cannot always succeed on its own. But imagine a sub-agent that adds relevant unit tests for this agent; would we be able to regain that 18/20 result? We will therefore try to split the work using agents specialized in specific tasks.

This module splits the work into four roles (**explore**, **plan**, **code**, and **evaluate**), each executed in a separate context, with its own list of tools and model. You will not use any orchestration mechanism: you are the one who launches each role, decides what passes from one to another, and runs the tests in between. A command transports the deliverables for you, but no code chooses the next step. The next module will automate this loop. But before automating, you must first know which actions to replace or arrange differently. This list is established by managing the loop yourself, and it is part of the module deliverables.

## Understanding

### A sub-agent is a fresh context

A **sub-agent** is a session opened by the main session, with its own system prompt, its own tool list, its own model, and an empty context window at the start. It receives a task as text, works, and returns a final text. Everything else - its file reads, its tool calls, and its reasoning - disappears when its session ends, and only its conclusion returns to the context of the session that launched it.

Three properties of this definition motivate delegation.

The first is context isolation. The work of a sub-task is almost always larger than its conclusion: determining which files a ticket touches requires reading about ten of them, meaning several thousand tool output tokens, while the resulting note fits in thirty lines. If you do this work in the main session, the ten files remain in your window until the end. If you delegate it, only the note enters.

The second is tool restriction. The previous module showed that an instruction doesn't guarantee anything, since the cleanup instruction in `SKILL.md` is followed in fewer than one in three executions. An agent whose toolkit doesn't contain a writing tool cannot write, and the question of obedience is no longer an issue.

The third is the separation of the generator and the evaluator. A model that reviews its own work tends to be biased, and for good reason: its window contains all the reasoning that led to that code, so it reviews its intentions rather than its diff. A reviewer in a fresh context only knows the ticket, the plan, and the diff, and is therefore more objective.

### Anatomy of an agent

In Pi, delegation is not in the tool's core: it comes through [combo](https://github.com/AI-for-dev/combo), a library written for this course on top of the Pi SDK. A Markdown file becomes an **agent**, an agent becomes a **sub-agent** whose lifetime is controlled by the caller, and sub-agents are composed into workflows written in TypeScript or once again in Markdown.

::: info Where combo comes from, and which extensions to prefer
combo was born from the needs of this course, and its design choices reflect that. We cannot say this tool is an architectural masterpiece for managing sub-agents. We shaped it our own way, and it will certainly evolve based on our future needs, perhaps eventually becoming useful for building complex pipelines. Above all, we wanted you to be able to explore sub-agent discussions and write complex workflows easily.

Its integration with [herdr](https://herdr.dev) provides a pane per sub-agent, allowing you to watch the work happen instead of waiting in front of a counter. We have also added an orchestration set to create composed pipelines with richer forms than a single isolated call. And like everything else in the course, execution tracks the time and tokens of each sub-agent, and can be exported in full as readable HTML and replayable JSONL. These measurements are possible without instrumenting child processes because sub-agents run within the Pi process via the SDK, and Pi already has all this information.

Note that combo is not currently a production library, and several extensions in the Pi ecosystem are more proven for daily use.

The [Pi repository's `subagent` example](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent) is the most direct point of comparison: same Markdown files in the same directories, and three modes: single, parallel, and chain. It launches each sub-agent in a separate `pi` process, and when `model:` is missing, the sub-agent inherits the model from the calling session. combo, on the other hand, falls back to your settings: the warning in the following section therefore describes combo and not Pi.

[pi-subagents](https://github.com/nicobailon/pi-subagents) is the most advanced of the three for common use. It is installed with a single command, `pi install npm:pi-subagents`, and provides ready-to-use agents (`scout`, `researcher`, `reviewer`, `oracle`) where combo asks you to write your own. It adds background tasks, which continue in a detached process while you work, and saved workflows.

[pi-envoy](https://github.com/jmnargi/pi-envoy) approaches the problem through governance. Each child receives a delegation contract before starting, with its goal, scope, acceptance criteria, and verification commands, and the parent has a terminal dashboard, a message bus between agents, dollar budgets, and the ability to stop a child in progress.

If you are building a chain you depend on, start with one of these three. We keep combo here for pedagogical reasons: its agents are Markdown files that you read in full, tool restriction is verified in the trace, and the library's operations remain visible. Everything established in this module transposes to the others.
:::

The library can be used in two ways: from a script or from Pi via its **extension**, loaded with `-e`, which registers a `subagent` tool that the main session model can call. The sub-agent is thus added to the main session's tools, just like `read` or `edit`, rather than forming an orchestration engine alongside the harness. combo also provides nine orchestrators, `chain`, `fanOut`, `loop`, `orchestrate` and others, none of which are used in this module: one agent at a time, since you are the one managing the loop between agents.

An agent is defined in a Markdown file with a structure similar to a skill. Here is the smallest complete agent:

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

The header contains the name, the description, the **toolset** (`tools:`) and the **model**. The body becomes the sub-agent's **system prompt**: each `reader` session starts with this text as its only framework, whereas a skill remains a procedure that the model chooses whether or not to open.

The difference with a skill is therefore twofold. The body is guaranteed to be read, and the `tools:` line determines the tools the sub-agent session registers, meaning an agent without `write` has no way to write, regardless of the task it receives.

A file that omits `tools:` gets the read-only toolset, `read, grep, find, ls`, which is the sensible default for exploration. However, we prefer to list the available tools to make the file and the sub-agent's possible actions easier to read.

::: warning Agent file structure
The first Markdown file example we introduced corresponds to the classic sub-agent structuring that you will also find in other harness libraries such as Claude, Codex, OpenCode, Cursor, etc.

In the following paragraph, we will introduce metadata specific to combo that you will not find in others. Nevertheless, these files should still work with other tools since unrecognized metadata will simply be ignored.
:::

In combo, we have an additional field in the metadata. The `lifetime` field sets the sub-agent's lifespan: `task`, the default value, causes it to be created and destroyed with each task, while `workflow` allows it to survive from one iteration to the next. This module uses `task` throughout.

A sub-agent inherits nothing from your environment: no extensions, no skills, and no context files. It only sees its definition, supplemented by a single line telling it where it is. This is what makes execution reproducible, and why everything a role needs to know must be in its prompt or the task you give it. If you need to provide skills to your agent, you can do so by adding the list in a `skills` field.

Project agent files are located in `.pi/agents/`, your local ones in `~/.pi/agent/agents/`, and the extension provides its own demonstration agents. You can have the same agent name globally and locally, and combo allows you to choose which one you want to use. We will see this later.

::: warning An agent without `model:` runs using current settings
A sub-agent's model is never inherited from the parent session. It comes from an argument passed to the call, falling back to the pipeline file, then to the agent header, and as a last resort, the Pi settings: the most specific setting takes precedence. An agent that declares nothing and is launched without arguments therefore runs using your `~/.pi/agent/settings.json` - that is, whatever is in there today.
:::

::: warning Your project agents are never loaded by default
`.pi/agents/` contains repository-controlled content, so its instructions are third-party instructions: combo refuses to load them unless explicitly requested. Scope is requested for each tool call.

You can list your agents using the command:

```
/agents
```
:::

::: warning View your agents' activity
The goal of this module is to break down orchestration and watch sub-agents work. Although you can view the Pi session trace afterwards with combo, it is always better to see events happening in real time. For this, you can use herdr.

You will then need to launch your Pi session in herdr and enter this line:

```
/herdr on
```

So that every sub-agent in combo opens its own window.
:::

## Rebuild

### The task: ticket #2

The entire practical part focuses on NÉON **issue #2**: collision is described as slow and tangled in the rendering, and the ticket asks to identify the critical path and optimize without changing the public API. Reading the `game/neon.js` file, you will see that the loop over the bricks in `frame()` handles collision, scoring, and drawing within the same block, meaning none of this can be tested separately. The expected output is a **pure** function, extracted from `frame()` and covered by new tests, without changing the name or signature of any exports in `game/neon.js`.

This ticket is suitable for this module for two reasons. First, each role has a falsifiable deliverable: an impact note is verified by opening the files it cites, a plan is verified step by step, a diff is verified by running the test suite, and a verdict is verified against the list of exports. Second, the ticket makes a claim that it does not measure, as "collision is slow" is a maintainer's statement rather than a metric. It is therefore necessary to verify if this is true and where it occurs.

The scope remains the same: only `game/neon.js` and `game/neon.test.js` can be modified, new tests go into the suite and nowhere else, and `npm test` must pass.

### Four roles, and what each is allowed to do

| agent      | deliverable                                | toolset                            | what its toolset forbids |
| ---------- | ------------------------------------------ | ---------------------------------- | ------------------------ |
| `explorer` | an impact note                             | `read, grep, find, ls`              | writing anything         |
| `planner`  | a step-by-step plan                        | `read, grep, find, ls`              | writing anything         |
| `coder`    | the diff for **one** step of the plan      | `read, grep, find, ls, edit, write` | running a command       |
| `reviewer` | `APPROVED` or `CHANGES REQUESTED`, justified | `read, grep, find, ls`              | correcting what it reviews |

The four files are versioned in `scripts/agents/` and are copied into the `.pi/agents/` of your NÉON clone. Here they are, along with the writing decisions that apply to any role breakdown.

<<<@/../scripts/agents/explorer.md{md}

The explorer provides a note, not an opinion, and its final section reminds it of this: a note that also contains the fix is no longer a note. Its prompt also tells it that the tickets in this repository are written by a maintainer who has sometimes been wrong about the code location; this is true and is enough to ensure the note verifies instead of copying.

<<<@/../scripts/agents/planner.md{md}

The planner applies the module's lesson on context: a language model has a budget, and describing more work does not increase it. Each step of the plan must therefore fit within a single coder invocation, following its explicit splitting rule: "if you hesitate, split." Each step begins with its red test, and the tests go directly into the test suite; this is the exact cut the previous module's procedure review had to make to clear its failing columns.

<<<@/../scripts/agents/coder.md{md}

The coder has the means to write but nothing to execute, as stated in its prompt: it does not run tests, it does not claim to have done so; you are the one who runs them afterward. We could have given it a shell, and the following exercise shows what its absence guarantees.

<<<@/../scripts/agents/reviewer.md{md}

The reviewer never makes corrections, because a reviewer who corrects becomes a second coder whose work is no longer reviewed. Its four checks are ordered, the most mechanical first, and two of them focus on the tree rather than the diff, because a diff shows what changed without showing what the change missed. Finally, its verdict can point to the plan rather than the code, in which case you will return to the planner.

Two other files, `tester.md` and `auditor.md`, are located alongside the four roles and will be copied with them. They play no part in the loop of this module: the first is the natural candidate for the parallel launch in the next module, and the second will review the completed work in its entirety there.


::: warning Using herdr
To track subagent activity, we strongly encourage you to launch Pi from herdr (https://herdr.dev/). combo knows how to open herdr windows to see the subagents at work and close them automatically when they are finished.
:::

::: info Exercise (in-class)
Before launching anything, have each agent state its own guarantee. Install the extension and deploy the agents:

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi
```

The extension does not add an explicit command to call an agent: `subagent` is a tool that the main session model calls when you ask it to. You only need to name the agent and what you want it to do. Ask the explorer like this:

```
utilise le subagent "explorer" pour la tâche "Nomme exactement les outils dont tu disposes."
```

Here is what ours returned:

> "I have the following tools:
> `read`: read the content of a file. `grep`: search for a pattern in file contents. `find`: search for files based on a pattern (glob). `ls`: list the contents of a directory."

The list contains no writing tools, and the agent states this itself.

Do the same with the coder, asking it this time to run the tests:

```
utilise le subagent "coder" pour la tâche "Lance `npm test` et rapporte le résultat."
```

> "The 'coder' subagent indicates that it does not have a tool that allows it to execute shell commands, and therefore cannot run npm test."

These two quotes are the outputs of two executions, and yours will be different: a model rephrases from one time to another, and the module on context quantified this dispersion. What remains consistent is the essence: the explorer listing four read tools and the coder referring the tests back to the orchestrator.
:::

::: warning Model choice
You can also specify in your request the model you wish to use, as in the following prompt:

```
utilise le subagent "coder" avec le modèle deepseek-v4-flash d'opencode-go pour la tâche "Lance npm test et rapporte le résultat."
```
:::

### The loop, by hand

You are now playing the role of the orchestrator that the next module will automate. Open the main session with the extension loaded, and go through the chain one step at a time using `/step`.

This `/step <agent> <instruction>` command runs the agent you name on what you type, plus the output of the previous step. Its response is **written in the transcript without entering the model context**: the main session sees the reports scroll by without reading them, and therefore cannot act on them. This is the difference that matters here. A session that reads an exploration report becomes an orchestrator that you do not control and that chooses the next steps based on conclusions you have not validated. However, we want you to decide what the next step is. The main window is therefore your console and not a conversation partner as you have seen so far. The `/quote` command allows you to bring the result of the previous step into the context, enabling a quick copy-paste when there is something to discuss.

The loop consists of six steps:

1. `/step explorer treats ticket #2 from ISSUES.md` produces the impact note;
2. you read it in the transcript, then `/step planner` receives it as is, along with the ticket, and produces the plan;
3. `/step coder` receives the plan; give it step 1 and nothing else by specifying it after the agent name. It produces its report, and the diff is in the tree;
4. you run **`npm test` yourself**, in a second terminal, and keep the output;
5. `/step reviewer` receives the coder's report; paste the ticket, the step, the diff (`git diff`), and the test output into it, and it produces its verdict;
6. depending on the verdict: next step to the coder, back to the coder with the reasons, or back to the planner if the step itself is the cause. `/step --from <id>` resumes the output of a step older than the last one, which is exactly the action of going back.

`/chain` lists the steps taken at any time; `/chain reset` starts over from scratch in a new directory. The log you used to keep by hand for the order of steps is now managed by the tool, leaving you to write only the part it cannot see: your decisions.

While a subagent is working, a dot appears above the prompt with its model, tokens, and a timer, and the tool line below keeps track of the call. If [herdr](https://herdr.dev) is running on your machine, `/herdr on` gives each subagent its own tab, allowing you to see the explorer reading while you prepare the next task. This view is for tracking work as it happens, without allowing you to draw any conclusions: for that, you will need the trace of the previous step.

While you perform these steps, keep a log of what `/chain` cannot see: not the order of the steps, which it already records, but what you decided between two of them and based on what criteria. Why this step rather than the next, why this return to the planner, what you reviewed before deciding. This log lists what the orchestrator of the next module will need to be able to do, and you are well positioned to write it since you have made each decision yourself.

::: info Exercise (in-class)
Run the loop until the first `APPROVED`, meaning until step 1 of the plan is delivered, tested, and reviewed. If the reviewer refuses, follow the refusal to the end: it is the most instructive half of the loop because it forces you to decide who to send the verdict back to.

If the session allows, continue until the end of the plan. The final criterion is that of the ticket: the extracted function is pure and covered by at least two new tests in the suite, all exported functions of `game/neon.js` are still exported, and `npm test` is green.
:::

### What isolation changes in your window

::: info Exercise (in-class)
Just after the return of the explorer's note, type `/session` in the main session and note what it contains: your frame, the tool call, the note. Then open a new session without the extension and ask the model to produce the same impact note itself by reading the repository. Compare the two `/session` results, then the two `\tree` results.

In the second session, every file read remained in the window and will stay there until the end, whereas the first one only brought in the note. Delegation pays for exploration in a context that disappears once the task is returned, instead of paying for it at every turn in the main window. The argument is the same as for the cache reading of the module on context: work is paid for at every turn as long as it remains in the window, and only once when it does not.
:::

### Checking the trace to see who ran

::: info Exercise (in-class)
Export the main session with `\export` and find every call to the `subagent` tool: the agent's name, the scope, the model, the transmitted task. This is the only reliable answer to the question of who ran if you did not see your agents' activity via herdr.
:::


### Why this module does not publish a matrix

The two previous modules established their claims over twenty repetitions, and this one publishes none. This absence is deliberate. We primarily wanted to show you how delegation works and what it can bring you in terms of your context size or the verification of changes in a fresh context.

You have also seen that it is easy to finely control what an agent can do via its tools and define the model you want for it.

This module cannot currently guarantee that splitting into roles improves the result - meaning that ticket #2 handled by this loop would be better resolved than the same ticket handled by a single agent. The question is legitimate; it is a matter of measurement. The next module establishes the protocol to perform this measurement. We will automate the loop you ran manually and observe the quality of the results.

## Generalizing

Delegating means isolating a context so that only the conclusion returns. The gain is less about the cost of work than the fact that it does not remain in the window: exploration done in the main session is re-read every turn until the end, whereas the same delegated exploration disappears with its context and leaves only thirty lines. Obviously, if what returns from the sub-agent is as large as what it read, you have isolated nothing.

An agent's guarantee comes from its toolkit rather than its prompt. The coder's prompt tells it not to run tests, but it is the absence of a shell that prevents it from doing so, and the agent knows the difference. Every time you hesitate between writing a prohibition and removing a tool, remove the tool: an absence is verified in the configuration, whereas a prohibition assumes the model will follow it.

A generator cannot evaluate itself. The value of a separate reviewer comes from what its context does not contain - namely, the reasoning that produced the code. This is also why a reviewer that fixes code destroys its own value by becoming a code generator again.

A field you do not declare is decided elsewhere. An agent without `model:` runs on the machine's current settings, a file without `tools:` gets the read-only toolkit, a file without `name` does not exist. This rule applies beyond agents: for every configuration field, ask yourself what happens when it is absent, and who then decides for you.

Splitting into roles distributes the model's work without increasing it. A model that failed on a long ticket will fail just as much on an entire plan passed at once. Working in small steps allows for higher-quality work. A planner that splits too coarsely reproduces exactly the failure measured in the context module.

Automating a loop requires having run it manually. Your log shows what the orchestrator must route, in what order, and on what criteria you decided on the returns. As a reminder, building your own harness requires experience, and as you acquire this experience, you will refine your harness to establish trust.

::: info Exercise (independent)
You can now test various combinations and see how they influence the results. Among these combinations, you can:
- write your own agents or modify the agents provided in this module,
- add skills to agents,
- change models and specifically observe the differences when using larger models for the planning and validation phases,
- ...
:::

## Deliverable

This module produces three items.

1. The four agents, versioned in your repository, each with its minimal toolset and declared `model:`. These are the ones the next module will connect to the orchestrator, without modifying them.
2. The log of one loop iteration: the exported main session trace, the diff delivered from the first step, the `npm test` output that the reviewer read, and your log.
3. The choices to be made between each step: you played the role of the main agent and organized the workflow. You now know what to expect for the complete automation of the loop.

::: tip Success criteria
You can demonstrate, trace in hand, which agent ran at each step of your loop, with which tools and which model. As the orchestrator, you have also seen which actions you would refuse to repeat twenty times. This understanding is important for finalizing the automation of your harness's first workflow.
:::

## Going further

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), on the orchestrator and researcher sub-agents, and on the token cost of parallelization.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), the counterpoint: what is lost through context fragmentation, and why sharing the full thread is sometimes preferable.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), the page that distinguishes workflows from agents; the following module implements these patterns.
- [combo](https://github.com/AI-for-dev/combo), the sub-agent and workflow library used here: its documentation on agents and lifetimes, and its `NEXT.md`, which lists common pitfalls.
- [herdr](https://herdr.dev), the live view of sub-agents, used in this module and the next.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), on the role of sub-agents among other components: re-injecting a clean summary rather than the reasoning that produced it.
