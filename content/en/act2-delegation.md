# Delegation: breaking down work into sub-agents

::: tip Module objectives
- Understand what a sub-agent receives upon creation, what it does not receive, and what it returns
- Write an agent whose guarantee is the toolset, and verify this guarantee in the trace
- Manually manage the explore → planner → coder → reviewer loop on a real ticket
- Know how to determine who actually ran, and with which model, rather than trusting a ✓
- Leave with a log of the cost of manual orchestration, which the next module needs to automate the loop
:::

Measurements from the previous two modules highlighted two limits. The first concerns the model's work budget: in configurations receiving the scoped ticket, four out of twenty executions write the red tests requested by the ticket and never open the source file, and describing more work in the ticket does not move this limit. The second concerns verification: a work procedure shifts what the agent produces, but no established effect has been measured on the fix itself, and nothing requested by a skill is guaranteed. These two limits share a common structural cause: all configurations measured so far work within a single context, where the same model reads the repository, writes the code, and reviews its own work, with each of these activities accumulating in the same window.

This module introduces the delegation building block. Work is broken down into four roles-explorer, planner, coder, and reviewer-each executed in a separate context, with its own list of tools and model. No orchestration mechanism is used in this module: you launch each role, pass the deliverables from one to another, and run the tests in between, because the next module will automate this loop, and automation requires a list of the actions to be replaced and their respective costs. This list is established by managing the loop yourself, and it is part of the module's deliverables.

We follow the usual order: understand what a sub-agent is in the harness, write four of them and run the loop on a real ticket, then identify what remains true when the tool changes.

## Understand

### A sub-agent is a fresh context

A **sub-agent** is a session opened by the main session, with its own system prompt, its own list of tools, its own model, and an initially empty context window. It receives a task as text, works on it, and returns a final text. Everything else-namely its file reads, tool calls, and reasoning-disappears when its session ends: only its conclusion returns to the context of the session that launched it.

Three properties of this definition motivate delegation.

**Context isolation.** The work for a sub-task is almost always larger than its conclusion. Determining which files a ticket affects requires reading a dozen files—meaning several thousand tokens of tool output—whereas the resulting note only takes thirty lines. When done in the main session, this work keeps those ten files in the window until the end of the session; when delegated, only the note enters it.

**Tool restriction.** The previous module showed that an instruction is not a guarantee; the cleanup directive in `SKILL.md` is followed less than once in three. An agent whose toolkit does not contain a writing tool **cannot** write, as nothing in its session registers that tool, and the question of obedience no longer arises. Combo's documentation reports the opposite case: an example from its repository gave the coder the full toolkit while asking it not to modify anything, and it modified a source file twice during a simple demonstration. This guarantee is verified in the trace, and it is what allows trusting an explorer or a reviewer.

**Separation of generator and evaluator.** A model reviewing its own work tends to be biased; this is understandable because its window contains all the reasoning that led to this code, so it reviews its intentions rather than its diff. A reviewer in a fresh context only knows the ticket, the plan, and the diff, and therefore judges the diff based on the evidence.

### Anatomy of an agent

On Pi, delegation is not part of the tool's core: it comes via [combo](https://github.com/AI-for-dev/combo), a library built on the Pi SDK. A Markdown file becomes an **agent**, an agent becomes a **sub-agent** whose lifespan is controlled by the caller, and sub-agents are composed into workflows written in TypeScript. The library is used in two ways: from a script, or from Pi via its **extension**, loaded with `-e`, which registers a `subagent` tool that the main session model can call. The sub-agent is thus added to the main session's tools, just like `read` or `edit`, rather than forming an orchestration engine alongside the harness. combo also provides nine combinators—`chain`, `fanOut`, `loop`, `orchestrate`, and others; this module uses none of them, one agent at a time, as the loop between agents is handled by you. Combinators are the subject of the next module.

An agent is defined in a Markdown file whose structure is similar to that of a skill. Here is the smallest complete agent:

```markdown
---
name: liseur
description: Reads one file and reports what it exports
tools: read
model: ilaas/gemma-4-31b
---

You read the file you are given and list its exported symbols,
one per line, with the line number. Nothing else.
```

The frontmatter contains the name, the description, the **toolset** (`tools:`), and the **model**. The body becomes the sub-agent's **system prompt**, not a procedure that a model decides whether to open or not: every `liseur` session starts with this text as its sole framework. The difference from a skill is therefore twofold. The body is guaranteed to be read, and the `tools:` line is not a declaration of intent: it determines the tools the sub-agent session registers, meaning an agent without `write` has no way to write, regardless of the task received. Two conventions are added: a file that omits `tools:` gets the read-only toolset, `read, grep, find, ls`, which is the correct default for everything involving exploration; and the `lifetime` field sets the sub-agent's lifespan, with `task` as the default value, causing it to be created and destroyed with each task. This module uses `task` throughout; `workflow`, which allows a sub-agent to persist from one iteration to another, is covered in the next module.

A sub-agent inherits nothing from your environment: no extensions, no skills, and no context files. It only sees its definition, supplemented by a single line telling it where it is located. This is what makes an execution reproducible, and why everything a role needs to know must be in its prompt or in the task you give it.

Project agent files live in `.pi/agents/`, your machine's files in `~/.pi/agent/agents/`, and the extension provides its own demonstration agents. Knowing which of these three sources is served for a given call determines the entire practical portion, and the following three warnings set the rules.

### What the agent declares, and what it inherits implicitly

Three loading behaviors condition how this module writes and launches its agents. They are documented by combo, and we encountered the first one while preparing this training.

::: warning An agent without `model:` runs on the settings of the day
A sub-agent's model is **never inherited from the parent session**. It comes from an argument passed to the call, failing that, the pipeline file, failing that, the agent's frontmatter, and as a last resort, Pi's settings: the one closest to the work takes precedence. An agent that declares nothing and is launched without arguments therefore runs on your `~/.pi/agent/settings.json`, meaning whatever is in there that day. During the preparation of this training, nine agents without `model:` were all sent to a provider that no one had chosen and returned as many 402 errors.

The rule, which combo states for itself, is that any agent whose numbers will be compared must declare its model. The four agents in this module declare theirs, so two participants running them will measure the same thing.
:::

::: warning Your project agents are never loaded by default
`.pi/agents/` is repository-controlled content, so its instructions are third-party instructions: combo refuses to load them unless requested, and this is a security boundary, not a preference. Scope must be requested with each tool call, and forgetting to do so produces different symptoms depending on the agent. For `explorer`, the call fails, but the error does not mention scope and instead lists what was loaded: `Unknown agent "explorer". Loaded agents: auditor, coder, committer, interviewer, planner, reviewer, router, scout, synthesiser`. The list allows you to correct yourself, since none of these nine names is yours, but the message never mentions the word scope. For `planner`, `coder`, and `reviewer`, the call does not fail: these three names also exist among the nine demo agents provided with the extension, served at the lowest priority, and the provided agent receives your task, under the name you thought was yours, with a different prompt and without a declared `model:`. As soon as the scope is requested, precedence works correctly: the repository definition overrides your machine's, which overrides the package's.

The solution is to request project scope at each launch and **check the trace to see who ran**, which is what the Rebuild section teaches.
:::

::: warning An incomplete agent file is silently ignored
A file missing `name` or `description` is not loaded, without error or warning: the agent simply does not exist, and the first symptom is a later call that fails, listing agents among which yours is missing. This is the behavior of Pi, which combo maintains. Agents are rediscovered on each call, so editing a file is enough to reload it, but only if the file is complete.
:::

## Rebuild

### The task: issue #2

All the practical work focuses on NÉON's **issue #2**: collision is described as slow and tangled in rendering, and the ticket asks to identify the critical path and optimize **without changing the public API**. The technical debt is evident when reading the file: the loop over the bricks in `frame()` handles collision, scoring, and drawing in the same body, meaning none of this can be tested separately. The expected output is a **pure** function, extracted from `frame()` and covered by new tests, without any of the exports in `game/neon.js` changing name or signature.

This ticket is suitable for this module for two reasons. First, every role has a falsifiable deliverable: an impact note is verified by opening the files it cites, a plan is verified step by step, a diff is verified by running the suite, and a verdict is verified against the export list. Second, the ticket **claims** something that it does not measure: "the collision is slow" is a statement from the maintainer, not a figure. The module on context showed that a linked document is read and followed; this one adds that a read document remains a piece of data, which must be verified before being propagated into a plan.

The framework does not change: only `game/neon.js` and `game/neon.test.js` can be modified, new tests go into the suite and nowhere else, and `npm test` must end green.

### Four roles, and what each is allowed to do

| agent      | deliverable                                    | toolset                             | what its toolset prohibits |
| ---------- | ---------------------------------------------- | ----------------------------------- | -------------------------- |
| `explorer` | an impact note                                | `read, grep, find, ls`               | writing anything            |
| `planner`  | a step-by-step plan                           | `read, grep, find, ls`               | writing anything            |
| `coder`    | the diff for **one** step of the plan        | `read, grep, find, ls, edit, write`  | running a command          |
| `reviewer` | `APPROVED` or `CHANGES REQUESTED`, with reasoning | `read, grep, find, ls`               | correcting what it reviews |

The four files are versioned in `scripts/agents/` and are copied into the `.pi/agents/` folder of your NÉON clone. Here they are, along with the writing decisions that apply to any role breakdown.

<<<@/../scripts/agents/explorer.md{md}

The explorer provides a note, not an opinion: its last section reminds the agent that a note containing the fix is no longer a note. And its system prompt tells it that tickets in this repository are written by a maintainer who has sometimes been mistaken about the location of the code, which is true, and is enough to ensure the note verifies instead of copying.

<<<@/../scripts/agents/planner.md{md}

The planner applies the lesson from the context module: a model has a budget, and describing more work does not increase it. Each step of the plan must therefore fit within a single invocation of the coder, following its explicit splitting rule, "if you hesitate, split". Each step begins with its red test, and tests go directly into the suite, which is the exact cut that the procedure review in the previous module had to make to clear its failing columns.

<<<@/../scripts/agents/coder.md{md}

The coder has the means to write and nothing to execute, as stated in its prompt: it does not run tests, it does not claim to have done so, and you are the one who runs them afterwards. We could have given it a shell; the following exercise shows what its absence guarantees.

<<<@/../scripts/agents/reviewer.md{md}

The reviewer never corrects, because a reviewer who corrects becomes a second coder whose work is no longer reviewed. Its four checks are ordered, the most mechanical first, and two of them are performed against **the tree** and not the diff, because the diff shows what changed and not what the change missed. Finally, its verdict may point to the plan rather than the code, in which case you will return to the planner.

Two other files, `tester.md` and `auditor.md`, exist alongside the four roles and will be copied with them. They play no role in this module's loop: the first is the natural candidate for parallel execution in the next module, the second will review the finished work as a whole there, and leaving them in `.pi/agents/` costs only their descriptions.

::: info Exercise (in-class)
Before launching anything, have each agent state its own guarantee. Install the extension and deploy the agents:

```bash
git clone https://github.com/AI-for-dev/combo.git
cd combo && npm install       # Node 23.6 ou plus récent, pas d'étape de build

cd /chemin/vers/neon
mkdir -p .pi/agents && cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi -e /chemin/vers/combo/extension
```

Then, in the session, launch the explorer in project scope with the sole task: "State exactly the tools available to you." Here is what ours returned:

> "I have the following tools:
> `read`: read the contents of a file. `grep`: search for a pattern in file contents. `find`: search for files according to a pattern (glob). `ls`: list the contents of a directory."

The list contains no writing tools, and the agent states this itself.

Do the same with the coder by asking it to run the tests. Here, verbatim, is the response from ours:

> "I cannot execute shell commands, including `npm test`. According to my instructions, the orchestrator runs the tests after my response and provides the output. Since I cannot trigger the tests myself, I cannot report their result at this moment."

We had initially planned the inverse demonstration, which consists of ordering the explorer to correct a file and watching it fail. We did this, and it is less convincing than it seems, because the agent reasons about the contradiction and chooses to obey its prompt, so a skeptical participant could legitimately see it as obedience rather than impossibility. The set of tools stated by the agent does not suffer from this ambiguity.
:::

### The loop, by hand

You are now taking on the role that the following module will automate. Open the main session with the extension loaded, and provide its framework in the first message: it is a relay; it does not read the repository, modifies nothing, launches the agent you name in project scope with the task you dictate, and returns the sub-agent's deliverable **as is**. This framework is an instruction and not a guarantee; the section on the device's limitations returns to this point, and verification is done in the trace.

The loop consists of six steps:

1. **explorer** receives ticket #2 → it returns the impact note;
2. you read the note, then **planner** receives the ticket and the note as is → it returns the plan;
3. **coder** receives step 1 of the plan, and nothing else from the plan → it returns its report and the diff is in the tree;
4. you run **`npm test` yourself**, in a second terminal, and save the output;
5. **reviewer** receives the ticket, the step, the diff (`git diff`), and the test output, pasted by you → it returns its verdict;
6. depending on the verdict: next step to coder, back to coder with the reasons, or back to planner if the step itself is at fault.

While a sub-agent is working, a dot is displayed above the prompt with its model, tokens, and a timer, and the tool line below tracks the call. If [herdr](https://herdr.dev) is running on your machine, `/herdr on` gives each sub-agent its own pane, and you can see explorer reading while you prepare the next task. This view serves to track the work; the section on the trace explains why it does not allow for any conclusions.

While performing these steps, keep a friction log, one line per step: what you copied, from whom to whom, and what you decided along the way. Keep it wherever you like, except in the NÉON tree, the perimeter of which is noted. This log lists what the orchestrator of the following module will need to be able to do, and you are well-positioned to write it since you have performed each step yourself.

::: info Exercise (in class)
Run through the loop until the first `APPROVED`, meaning until step 1 of the plan is delivered, tested, and reviewed. If the reviewer refuses, follow the refusal to the end: this is the most instructive half of the loop, because it forces you to decide who to send the verdict back to.

If the session allows, continue until the end of the plan. The final criterion is that of the ticket: the extracted function is pure and covered by at least two new tests in the suite, all functions exported from `game/neon.js` are still exported, and `npm test` is green.
:::

### What isolation changes in your window

::: info Exercise (in-class)
Immediately after the explorer's note is returned, type `/session` in the main session and note its contents: your frame, the tool call, and the note. Then open a new session **without** the extension and ask the model to produce the same impact note itself by reading the repository. Compare the two `/session` outputs, then the two `\tree` outputs.

In the second session, every file read remains in the window until the end; the first session only brought in the note. Delegation pays for exploration in a context that disappears once the task is completed, instead of paying for it at every turn in the main window. The argument is the same as for the cache reading in the context module: work is paid for at every turn as long as it stays in the window, and only once when it does not.
:::

### Verify who ran in the trace

::: info Exercise (in-class)
Export the main session using `\export` and find every call to the `subagent` tool: the agent name, scope, model, and the assigned task. This is the only reliable answer to the question of who ran.

Then perform the counter-test twice. Request to launch the explorer **without** specifying the scope: the call fails, and the error lists the nine provided agents, among which yours is not listed, without the message ever mentioning the word "scope". Next, request the planner in the same terms: the call succeeds because a `planner` exists among the agents provided with the extension, and it is the one that received your task, using a different prompt and without a declared `model:`. Only the scope argument in the trace and the model used reveal the substitution; nothing in the rendered response would have told you.
:::

Another reason not to take indicators at face value: during the preparation of this training, a previous version of the delegation tooling displayed a green ✓ for a **dead** subagent because the closing function returned a hardcoded `ok: true`. The bug is fixed, and a test prevents its recurrence, but the lesson does not depend on the fix: a success indicator is just code like any other, written by someone, and only the trace is authoritative.

### Why this module does not publish a matrix

The previous two modules based their claims on twenty repetitions, and this one publishes none. This absence is deliberate, and the reason for it determines what is measured in a harness.

What this module asserts is **structural**: an agent without a writing tool cannot write, a reviewer with a fresh context cannot see the coder's intentions, a delegated exploration does not return to the window. A single execution, with the trace in hand, is enough to verify each of these properties, and twenty would add nothing, whereas twenty were not always enough to establish the effect of a prompt. Probabilistic effects are established through repetition, and structural properties through the inspection of a trace.

What this module cannot assert, on the other hand, is that splitting into roles **improves the result**: that ticket #2 handled by this loop overflows less, or is better corrected, than the same ticket handled by a single agent. This is a question of measurement; it is legitimate, and it is not settled here. The following module sets out the protocol to settle it-the automated loop versus the single agent on this same ticket within the same matrix-and the hypothesis will be written there before the figures.

### The limits of the setup

**Nothing prevents the main session from doing the work itself.** Your relay has a shell, writing tools, and an instruction not to use them: this is the situation measured in the previous module, with such an instruction being followed less than one time in three. If your loop worked well, it is because the task for each turn was sufficiently framed so that delegating was the path of least resistance, and nothing forced it. The guaranteed version-a control that denies the main session what belongs only to the roles-requires the mechanism of the module on permissions.

**Nothing you did between two agents is archived.** The note you skimmed, the step you passed on by reformulating it slightly, the test output you truncated while pasting: each of these actions came from your working memory, and none can be replayed, compared, or measured. This is what the following module automates, and your log provides the list.

## Generalizing

**Delegating means isolating a context and returning only the conclusion.** The gain is less about the cost of the work than the fact that it does not remain in the window: an exploration carried out in the main session is reread every turn until the end, whereas the same delegated exploration disappears with its context and leaves only thirty lines. If what returns from the sub-agent is as large as what it read, the delegation has isolated nothing at all.

**An agent's guarantee comes from its toolkit rather than its prompt.** The coder's prompt tells it not to run the tests, but it is the absence of a shell that makes it impossible, and the agent itself knows the difference. Whenever you hesitate between writing a prohibition and removing a tool, remove the tool, because an absence is noted in the configuration, whereas a prohibition assumes that the model will follow it.

**The generator does not evaluate itself.** The value of a separate reviewer comes from what their context does not contain - namely, the reasoning that produced the code. This is also why a reviewer who makes corrections destroys their own value, by becoming a generator that no one reviews.

**What is not declared is decided elsewhere.** An agent without `model:` runs on the machine's current settings, a file without `tools:` gets the read-only toolkit, a file without `name` does not exist. This rule applies beyond agents: for each field of a configuration, ask yourself what happens when it is missing, and who decides on your behalf.

**A configuration that the model can omit must be verified at every execution.** Your agents placed in `.pi/agents/` are only served if the call requests the project scope, and three of your roles have delivered namesakes that take their place without error when it is missing. This kind of configuration is verified in the trace at each execution, or enforced by a mechanism, and is never assumed to be a given.

**Only the trace says who ran.** A green ✓ appeared for a dead sub-agent because a function returned a hardcoded `true`, and nothing in the response of a substituted agent says that it was substituted. The question of who ran, with which tools and on which model, has only one reliable source: the session trace, and it can be read in a minute.

**Breaking it down into roles distributes the model budget without increasing it.** The model that struggled with the long ticket will struggle just as much with an entire plan passed at once: it is the plan step, sized to fit within a single invocation, that converts the breakdown into finished work. A planner that breaks things down too coarsely reproduces exactly the failure that the context module measured.

**Automating a loop requires having run it by hand.** Your friction log tells you what the orchestrator will need to route, in what order, and on what criteria you decided on the returns. An orchestrator adopted before running the loop manually automates a procedure that no one has verified.

## Deliverable

This module produces three pieces.

**1. The four agents**, versioned in your repository, each with its minimal toolkit and declared `model:`. These are the ones the next module will connect to the orchestrator, without modifying them.

**2. The log of one loop cycle**: the exported main session trace, the delivered diff of the first step, the `npm test` output read by the reviewer, and your friction log. This is the piece that proves who ran, and the one the next module needs.

**3. The "delegation" line of the decision sheet**:

| lever                            | observed effect | adopted ? | why |
| --------------------------------- | ------------- | -------- | -------- |
| role-isolated context           |               |          |          |
| reduced toolset (`tools:`)       |               |          |          |
| model declared per agent         |               |          |          |
| one planning step per invocation |               |          |          |
| reviewer separate from coder    |               |          |          |
| verdict that can bubble up to plan |               |          |          |
| human orchestration             |               |          |          |

The column is called "observed effect" rather than "measured effect" because this module verifies properties in traces and does not establish deviations over repetitions. The last row will be filled in two stages—here and then in the next module—once you know what the automation of each action has actually changed.

::: tip Success criterion
You can show, trace in hand, which agent ran at each step of your loop, with which tools and which model, and cite the action from your friction log that you would refuse to repeat twenty times.

The first half requires having read a trace rather than a ✓, the second requires having run the loop yourself, and neither can be completed from memory.
:::

## Pitfalls

**Forgetting the project scope.** The omission is silent precisely for roles that have a delivered namesake: `planner`, `coder`, and `reviewer` still respond, under a different prompt and using a different model, and only `explorer` fails, with an error listing the loaded agents without naming the scope. Request the scope on every call and verify it in the trace.

**Not declaring `model:`.** The agent then runs on your machine's current settings, meaning two participants executing the same module are no longer comparing the same thing. The nine test agents starting to return 402s from a provider that nobody had chosen are a prime example.

**Giving the entire plan to the coder.** This recreates, within the breakdown, the long ticket where the model loses track: it will write the beginning and then stop, and the reviewer will reject work that was not properly broken down. Provide one step per invocation and read the coder's report in between.

**Letting the reviewer make corrections.** A reviewer who corrects becomes a second coder whom no one reviews, and their subsequent `APPROVED` is worthless since it refers to their own work.

**Bubbling up the exploration instead of the conclusion.** Pasting the entire explorer session into the main context cancels the isolation you just paid for: only the note should bubble up. The criterion is verified mechanically: what returns must be small compared to what was read.

**Reformulating a deliverable by routing it.** An orchestrator that summarizes the note before giving it to the planner introduces an invisible step, neither versioned nor readable, exactly where the chain was intended to be traceable. Deliverables are passed as-is, which is why their format is imposed by the agents' prompts.

**Mistaking a refusal for discipline.** A read-only agent has not "refused" to write; it simply could not. Conversely, an agent that has the tool and promises not to use it has guaranteed nothing. The previous module quantified the value of such an instruction: it is followed less than one-third of the time.

**Trusting a ✓.** A green ✓ appeared for a dead sub-agent during the preparation of this module. The trace contains the actual tool calls, and it is the source of truth.

## Further reading

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), on the orchestrator and researcher sub-agents, and on the token cost of parallelization.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), the counterpoint: what is lost through context fragmentation, and why sharing the full thread is sometimes preferable.
- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), the page that distinguishes workflows from agents; the next module implements these patterns.
- [combo](https://github.com/AI-for-dev/combo), the sub-agent and workflow library used here: its documentation on agents and lifespans, and its `NEXT.md`, which lists pitfalls already encountered.
- [herdr](https://herdr.dev), the live view of sub-agents, used in this module and the next.
- LangChain, [The anatomy of an agent harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness), for the role of sub-agents among other components: re-injecting a clean synthesis rather than the reasoning that produced it.
