# Why a harness, and what is it made of?

::: tip Objectives of this module
- Reconstruct the chain from prompt to harness, and identify the gap each step fills
- Precisely define what a harness is, and understand why it is unique to you and constantly evolving
- List the essential building blocks of a harness, and for each, identify the problem it solves
:::

The introduction presented a timeline of techniques emerging since late 2022. We revisit it here from a different angle: not to tell a story, but to understand a mechanism. Each step in this timeline responds to a limitation of the previous step, and above all, each stacks onto the others rather than replacing them. A harness does not render *prompt engineering* obsolete; it still needs it, but it organizes it.

In the beginning, there is the prompt. It quickly becomes apparent that how a request is phrased radically changes the response, and *prompt engineering* is about phrasing it better. But a well-queried model remains ignorant of your codebase and internal documentation. RAG fills this gap: it retrieves relevant documents and provides them to the model before it responds, but it requires a potentially tedious construction.

The model can then answer better, but it still only answers. It cannot act. The agent fills this gap by giving it tools: executing code, reading a file, calling an API. Since each tool must be described and connected, the proliferation of integrations quickly becomes unmanageable, and MCP standardizes how a model dialogues with external tools. Tools can sometimes serve as good substitutes for RAG.

At this stage, you have a model capable of retrieving information and acting. What remains is deciding what to put in its context window and in what order. This is *context engineering*, an extension of *prompt engineering*: it is no longer just about asking the right question, but optimizing the entire context provided to the model.

## The harness, a software infrastructure

The harness is the link that assembles all the preceding elements into a coherent system. [Vivek Trivedy][langchain-harness] defines it as: a harness is code, configuration, or execution logic, no more mysterious than that, but no less either. [Lilian Weng][weng-harness] goes a bit further: it is the system surrounding the model that decides how it thinks and plans, how it calls tools and acts, how it perceives and manages its context, where it stores what it produces, and how it evaluates its results. She takes care to distinguish it from the older formula "agent = LLM + memory + tools + planning + action": the harness adds the explicit design of workflows, evaluation, permission control, and state persistence over time.

[Avi Chawla][ddods-harness] categorizes these three levels into concentric circles. *Prompt engineering* shapes the instructions given to the model. *Context engineering* decides what the model sees, and when. *Harness engineering* contains both, and adds the entire application infrastructure: tool orchestration, state persistence, error recovery, verification loops, permission control, and the complete lifecycle of a task. A harness that could be summarized as a well-written system prompt is not one; it is the most visible part, rarely the most decisive.

This infrastructure is not abstract: it is software that you can open, read, and modify. A configuration file declaring available models and granted permissions. An `AGENTS.md` or `CLAUDE.md` file carrying the project's rules. Scripts implementing hooks, a skills directory, and above all, a process that actually runs: the agentic loop itself, which chains model calls, tool execution, and result review. It is this materiality that changes everything: a harness is built, debugged, and repaired like any other software, using modified files, tests, and commits. We will see a concrete instance in the next module, with the `.pi/` directory of Pi.

## A unique harness, constantly evolving

Two ideas are worth presenting before going further, as they condition how you should receive everything that follows.

The first is that your harness will never quite look like your neighbor's. [Addy Osmani][osmani-harness] phrases it this way: harness engineering is a discipline, not a framework you would install as-is, because the right harness for your code is shaped by your history of failures. And a failure history cannot be downloaded. You can be inspired by another's harness, but never copy it verbatim in hopes that it covers the same blind spots, since it was shaped by incidents that are not yours.

The second is that the harness evolves, for two reasons of different natures.

The first relates to the model itself. [Avi Chawla][ddods-harness] calls this the *harness thickness*: how much logic must live in the harness rather than in the model? As the article states, Anthropic bets on a thin harness and model progress, to the point of regularly removing planning steps from Claude Code as newer model versions internalize them, while other frameworks, built around explicit graphs, bet on the contrary on control that remains hardcoded. A block that makes sense today may become dead weight in six months, solely because the model has evolved.

The second reason relates to your usage. [Osmani][osmani-harness] summarizes it in what he presents as the most important habit in the field: treat every agent failure as a permanent signal, not as an accident to excuse. He warns against the most tempting response: adding the learned lesson as another sentence in an already long `AGENTS.md` file. Yet, a rules file that grows without ever being revised loses readability what it claims to gain in coverage. His key formula: a harness is a living system, not a configuration file you write once and for all. The pattern he proposes instead boils down to a question: what behavior do we want to obtain or correct, and what specific piece of the harness can achieve it: this is exactly the pattern we will follow throughout the reconstruction.

Therefore, take this module as a starting inventory, not as a fixed architecture. Some of the following blocks, you will leave minimal; others, you will thicken over the course of your own failures.

## The seven building blocks

The starting question is as follows. We have a model capable of predicting text and calling tools. What must surround it so that it works reliably, safely, and usefully on real tasks? Each following block responds to a specific limitation of the bare model; keeping this correspondence in mind is more important than the list itself. It is the grid that organizes everything else in the training: each module in Act 2 reconstructs one of these blocks.

**Context management** comes first. The window is finite, and we have seen that the model handles a context that is too long or poorly ordered poorly. [Avi Chawla][ddods-harness] lists five practical strategies for keeping it under control: periodic purging, conversation summarization, masking outdated observations, structured note-taking, and delegation to a sub-agent. A study he cites (ACON) reduces tokens by up to 54%, while preserving accuracy above 95%, by favoring reasoning traces over raw tool outputs. The underlying principle: select what goes into the window, order it to leverage the cache, and compact what swells unnecessarily.

**Tools** come next, because a model that only produces text cannot act. [Vivek Trivedy][langchain-harness] sums it up in an image: bash and code execution give the agent "a computer in hand," to the point that it can use it to build its own tools on the fly. But a too-large catalog harms as much as it helps: [Avi Chawla][ddods-harness] reports that Vercel removed 80% of the tools from its v0 agent and achieved better results, and that Claude Code reduces its context by 95% by loading tools only on demand. The principle: each capability must be exposed as a tool described for the model and guarded by a permission, and expose only the strict minimum required for the current step.

**Delegation** addresses a more subtle problem, which [Vivek Trivedy][langchain-harness] phrases thus: to keep the context clean, you must deploy sub-agents on specific tasks, and reinject into the main thread only a synthesis of their work, rather than all the reasoning that led to it. The work of a sub-task is indeed often much larger than its conclusion; if all that work accumulates in the main context, it degrades.

**Orchestration** organizes multiple agents among themselves. [Avi Chawla][ddods-harness] poses two recurring trade-offs. First, single agent or multi-agents: Anthropic and OpenAI alike recommend pushing a single agent to the maximum before adding a second, and only separating once you have passed a dozen overlapping tools, or clearly distinct task domains. Second, once multiple agents are involved, should they reason and act at every step (the ReAct pattern), or separate planning from execution? Orchestration also carries the most difficult ambition to uphold, that which [Vivek Trivedy][langchain-harness] presents as the ultimate goal: having an agent work over a long horizon. [Osmani][osmani-harness] describes a concrete and surprisingly simple realization: a mechanism intercepts the agent's attempt to conclude, then relaunches a new session on the same objective; each iteration starts from a clean context, but retrieves the state of previous work only through what the file system has kept.

**Memory** persists decisions between sessions. [Vivek Trivedy][langchain-harness] reminds us bluntly: a model knows nothing beyond its weights and what is in its current context; without a dedicated process, it forgets as much its past mistakes as what it was working on the previous day, hence the use of files like `AGENTS.md` or `CLAUDE.md`. [Osmani][osmani-harness] designates this type of file as the most cost-effective configuration point in the harness, since it lands in the system prompt at every turn; he recommends keeping it short (some teams keep theirs under sixty lines) and treating it as a pilot's checklist, not as a style guide. The file system remains a good starting point for memory, but Osmani notes that it is not always sufficient: for up-to-date library documentation, a web search or a dedicated MCP server remain necessary.

**Safety**, materialized by permissions, bounds what the agent is allowed to do. [Avi Chawla][ddods-harness] presents it as a slider: a permissive architecture moves fast but takes risks, a restrictive architecture is safer but slows down every action, and the right setting depends on the deployment context. It is often accompanied by physical isolation: [Vivek Trivedy][langchain-harness] reminds that sandboxes give the agent a secure space, and allow multiple agents to work in parallel without one breaking what the other builds. This is what distinguishes an autonomous system from a dangerous one, and we will see that this block deserves particular care.

**Verification and evaluation**, finally, answers a simple question: does it work, and at what cost? [Avi Chawla][ddods-harness] distinguishes computational and deterministic verification (tests, linters, type checkers) from inferential verification entrusted to an LLM-judge, more sensitive to semantic issues but slower to obtain. A transversal principle recurs with [Osmani][osmani-harness]: a model judging its own work tends to grade it generously, and entrusting the review to an agent distinct from the one that produced the result yields much more reliable verdicts. [Lilian Weng][weng-harness] closes the loop: in the most advanced harnesses, this verification no longer serves only to control a single task, it feeds a model self-improvement loop. A model that progresses thus avoids, in turn, the harness from becoming over-complex. A harness that is not measured is a harness that is not piloted.

## In practice

It would be tempting to memorize these seven blocks as a checklist. That would be missing the point. What we want to convey is a reading grid: facing any harness, you must be able to point out each block, say whether it is present, absent, or minimal, and understand the consequences of that choice.

This grid has two uses. We will first apply it to Pi, to organize the reconstruction. You will then apply it to your own harness, in Act 4. Not all blocks are mandatory for all uses: a harness dedicated to code review does not have the same needs as a migration harness. Knowing how to choose useful blocks is part of the competency we seek to build.

Take a harness you know, or that we will manipulate together: Claude Code, Cursor, or another. For each block in the grid, try to point it out in the tool. Where is context managed? What tools are exposed? Is there memory, and where does it live? Note the blocks that seem absent or reduced to the minimum: these are often the most revealing of the tool's design choices. If you have already encountered a failure with this tool (an action it should not have taken, a repeated oversight), try to attach this failure to one of the seven blocks: this is exactly the exercise we will repeat throughout Act 2.

## Further reading

This module relies on four recent texts that each, in their own way, attempt to define what a harness is and what makes it move. We will find them cited throughout the blocks above.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering