# Why a harness, and what is it made of?

::: tip Objectives of this module
- Reconstruct the chain that goes from prompt to harness, and say what gap each step fills
- Define precisely what a harness is, and understand why it is your own and never stops changing
- Be able to list the essential building blocks of a harness and, for each one, what problem it addresses
:::

The [History](./historique) page presented a timeline of techniques that have emerged since late 2022. We are revisiting it here from a different angle - no longer to tell a story, but to understand the underlying mechanics. Each step in this timeline addresses a gap in the previous one, and more importantly, each builds upon the others rather than replacing them. A harness does not make *prompt engineering* obsolete; it still requires it, but it organizes it.

At the beginning, there is the prompt. You quickly notice that the way you phrase a request radically changes the answer, and *prompt engineering* is about phrasing it better. But however well you query it, a model remains unaware of your codebase and your internal documentation. RAG fills that gap: it fetches the relevant documents and provides them to the model before it answers, at the cost of a setup that can be tedious.

The model can then answer better, but it still does nothing but answer. It cannot act. The agent fills that gap by giving it tools: running code, reading a file, calling an API. Since each tool has to be described and connected, the multiplication of integrations quickly becomes unmanageable, and MCP standardizes the way a model interacts with external tools. Tools can sometimes be good substitutes for RAG.

At this stage, you have a model capable of fetching information and acting. What remains is to decide what goes into its context window and in what order. This is *context engineering*, an extension of *prompt engineering*: it is no longer just about asking the question well, but about optimizing the entire context provided to the model.

## The harness: a software infrastructure

The harness is the link that brings all the previous ones together into a coherent system. [Vivek Trivedy][langchain-harness] defines it as follows: a harness is code, configuration, or execution logic, nothing more mysterious than that, but nothing less either. [Lilian Weng][weng-harness] goes a little further: it is the system that surrounds the model and decides how it thinks and plans, how it calls tools and acts, how it perceives and manages its context, where it stores what it produces, and how it evaluates its results. She takes care to distinguish it from the older formula "agent = LLM + memory + tools + planning + action": the harness adds to it the explicit design of work loops, evaluation, permission control, and long-term state persistence.

[Avi Chawla][ddods-harness] arranges these three levels into concentric circles. *Prompt engineering* shapes the instructions given to the model. *Context engineering* decides what the model sees, and when. *Harness engineering* encompasses both, and adds all the application infrastructure on top: tool orchestration, state persistence, error recovery, verification loops, permission control, the complete lifecycle of a task. A harness that boils down to a well-written system prompt is not a harness; the prompt is its most visible part, rarely the most decisive.

This infrastructure is anything but abstract: it is software you can open, read and modify, made up of a configuration file that declares the available models and the granted permissions, an `AGENTS.md` or `CLAUDE.md` file that carries the project rules, scripts that implement hooks, and a skills directory, all of it driven by a process that actually runs: the agentic loop itself, the one that chains model call, tool execution, and re-reading of the result. It is this materiality that explains why a harness is built, debugged and repaired like any other software: through modified files, tests and commits. We will see a concrete instance of it as early as the next module, with Pi's `.pi/` directory.

## A harness of your own, one that never stops moving

The way you should take in everything that follows depends on two ideas: your harness is yours alone, and it never stops moving.

The first is that your harness will never quite resemble your neighbor's. [Addy Osmani][osmani-harness] puts it this way: harness engineering is a discipline and not a framework you install as-is, because the right harness for your code is shaped by your history of failures, which cannot be downloaded like a package. You can draw inspiration from someone else's harness, but never copy it as-is hoping it covers the same blind spots, since it was shaped by incidents that are not your own.

The second is that the harness moves, for two reasons of a different nature.

The first stems from the model itself. [Avi Chawla][ddods-harness] calls this harness thickness: how much logic should live in the harness rather than in the model? Anthropic, the article says, bets on a thin harness and on model progress, to the point of regularly removing planning steps from Claude Code as new model versions internalize them, whereas other frameworks, built around explicit graphs, bet on control that remains hard-coded. A building block that makes sense today can therefore become dead weight in six months, for the sole reason that the model has evolved.

The second reason is about how you use it. [Osmani][osmani-harness] sums it up in what he presents as the most important habit of the trade: treat every agent failure as a permanent signal, not as an accident to excuse. He warns against the most tempting response: adding the lesson learned as one more line in an already long `AGENTS.md` file. Yet a rules file that grows without ever being reworked loses in readability what it thinks it gains in coverage. His takeaway: a harness is a living system, not a configuration file you write once for all. The pattern he proposes instead comes down to one question: which behavior do we want to obtain or correct, and which specific piece of the harness can deliver it? That is the pattern we will follow throughout the reconstruction.

So treat this module as a starting inventory, not a frozen architecture. Some of the building blocks that follow you will keep minimal; others you will build out as your own failures accumulate.

## The seven building blocks

The starting question is this. We have a model capable of predicting text and calling tools. What should we surround it with so that it works reliably, safely, and usefully on real tasks? Each building block that follows addresses a specific limitation of the bare model; it is this correspondence you should keep in mind, more than the list itself. It is the framework that organizes the rest of the training: each module of Act 2 rebuilds one of these building blocks.

**Context management** comes first. The window is finite, and we have seen that the model makes poor use of a context that is too long or poorly ordered. [Avi Chawla][ddods-harness] lists five practical strategies for keeping it in check: periodic purging, conversation summarization, masking observations that have become stale, structured note-taking, and delegation to a sub-agent. A study he cites (ACON) achieves up to 54% fewer tokens, with accuracy preserved above 95%, by preferring reasoning traces over raw tool outputs. The principle that emerges: select what goes into the window, order it to take advantage of the cache, and compact whatever inflates needlessly.

**Tools** come next, because a model that only produces text cannot act. [Vivek Trivedy][langchain-harness] sums it up in one image: bash and code execution give the agent "a computer at hand", to the point that it can use it to build its own tools along the way. But too large a catalog hurts as much as it helps: [Avi Chawla][ddods-harness] reports that Vercel removed 80% of the tools from its v0 agent and achieved better results, and that Claude Code cuts its context by 95% by only loading tools on demand. The principle: expose each capability as a tool described for the model and guarded by a permission, and expose only the strict minimum for the current step.

**Delegation** addresses a subtler problem, which [Vivek Trivedy][langchain-harness] puts this way: to keep a clean context, you need to deploy sub-agents on well-defined tasks, and feed only a summary of their work back into the main thread, rather than all the reasoning that led to it. The work of a subtask is indeed often much larger than its conclusion; if all that work accumulates in the main context, the latter degrades.

**Orchestration** organizes several agents among themselves. [Avi Chawla][ddods-harness] frames two recurring trade-offs. First, single agent or multi-agent: both Anthropic and OpenAI recommend pushing a single agent to its maximum before adding a second, and splitting only past around ten overlapping tools, or clearly distinct task domains. Then, once several agents are in play, should they reason and act at each step (the ReAct pattern), or separate planning from execution? Orchestration also carries the hardest ambition to deliver on, the one [Vivek Trivedy][langchain-harness] presents as the ultimate goal: getting an agent to work over a long horizon. [Osmani][osmani-harness] describes a concrete and surprisingly simple realization: a mechanism intercepts the agent's attempt to conclude, then relaunches a fresh session on the same objective; each iteration starts from a clean context, but recovers the state of the previous work only through what the file system has retained of it.

**Memory** persists decisions between sessions. [Vivek Trivedy][langchain-harness] puts it plainly: a model knows nothing other than its weights and whatever is in its current context; without a dedicated process, it forgets its past mistakes as readily as what it was working on the day before, hence the use of files like `AGENTS.md` or `CLAUDE.md`. [Osmani][osmani-harness] describes this kind of file as the most cost-effective configuration point of the harness, since it lands in the system prompt at every turn; he recommends keeping it short (some teams keep theirs under sixty lines) and treating it as a pilot's checklist rather than a style guide. The file system remains a good starting point for memory, but Osmani notes that it is not always enough: keeping a library's documentation up to date still requires web search or a dedicated MCP server.

**Safety**, materialized through permissions, bounds what the agent is allowed to do. [Avi Chawla][ddods-harness] presents it as a slider: a permissive architecture moves fast but takes risks, a restrictive architecture is safer but slows down every action, and the right setting depends on the deployment context. It often comes with physical isolation: [Vivek Trivedy][langchain-harness] reminds us that sandboxes give the agent a secure space, and allow several agents to work in parallel without one breaking what another is building. This is what distinguishes an autonomous system from a dangerous one, and we will see that this building block deserves particular care.

**Verification and evaluation**, finally, answer a simple question: does it work, and at what cost? [Avi Chawla][ddods-harness] distinguishes computational, deterministic verification (tests, linters, type checkers) from inferential verification entrusted to an LLM judge, which is more sensitive to semantic issues but slower to obtain. A cross-cutting principle recurs in [Osmani][osmani-harness]: a model that judges its own work tends to grade itself generously, and delegating the review to an agent other than the one that produced the result gives significantly more reliable verdicts. [Lilian Weng][weng-harness] closes the loop: in the most advanced harnesses, this verification no longer serves only to check a one-off task; it feeds a self-improvement loop for the model. A model that progresses this way, in turn, keeps the harness from over-complicating itself. Measuring your harness, its results and its costs, is the condition for steering it.

## In practice

These seven building blocks form a reading grid rather than a checklist: faced with any harness, you should be able to point to each block, say whether it is present, absent or minimal, and understand the consequences of that choice.

This grid has two uses. We will first apply it to Pi, to organize the reconstruction. You will then apply it to your own harness, in Act 4. Not all building blocks are mandatory for all uses: a harness dedicated to code review does not have the same needs as a migration harness. Knowing how to choose the useful building blocks is part of the skill we are trying to build.

Take a harness you know, or one we will use together: Claude Code, Cursor, or another. For each building block of the grid, try to point it out in the tool. Where is context managed? What tools are exposed? Is there a memory, and where does it live? Note the building blocks that seem absent or reduced to a minimum: they are often the most revealing of the tool's design choices. If you have already encountered a failure with this tool (an action it should not have taken, a repeated omission), try to tie that failure to one of the seven building blocks: that is exactly the exercise we will repeat throughout Act 2.

## To go further

This module is based on four recent texts that each, in their own way, attempt to define what a harness is and what makes it move. We will see them cited throughout the building blocks above.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering
