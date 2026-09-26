# Why a harness, and what is it made of?

::: tip Module objectives
- Reconstruct the chain from prompt to harness, and identify the gap each step fills
- Precisely define what a harness is, and understand why it is specific to you and constantly evolving
- Be able to list the essential components of a harness and, for each, the problem it solves
:::

The introduction presented a timeline of techniques that have emerged since late 2022. We revisit it here from a different angle, no longer to tell a story, but to understand a mechanism. Each step in this timeline addresses a gap in the previous step, and more importantly, each builds upon the others rather than replacing them. A harness does not make *prompt engineering* obsolete; it still needs it, but it organizes it.

In the beginning, there is the prompt. You quickly realize that how a request is formulated radically changes the response, and *prompt engineering* consists of formulating it better. But a well-queried model remains ignorant of your codebase and your internal documentation. RAG fills this gap: it retrieves relevant documents and provides them to the model before it responds, at the cost of a construction process that can be tedious.

The model can then respond better, but it still only responds. It cannot act. The agent fills this gap by giving it tools: executing code, reading a file, calling an API. Since each tool must be described and connected, the multiplication of integrations quickly becomes unmanageable, and MCP standardizes how a model interacts with external tools. Tools can sometimes be good replacements for RAG.

At this stage, you have a model capable of retrieving information and acting. It remains to decide what to put in its context window and in what order. This is *context engineering*, an extension of *prompt engineering*: it is no longer just about asking the question well, but about optimizing the entire context provided to the model.

## The harness, a software infrastructure

The harness is the link that assembles all previous elements into a coherent system. [Vivek Trivedy][langchain-harness] defines it as follows: a harness is code, configuration, or execution logic, nothing more mysterious than that, but nothing less either. [Lilian Weng][weng-harness] goes a bit further: it is the system that surrounds the model and decides how it thinks and plans, how it calls tools and acts, how it perceives and manages its context, where it stores what it produces, and how it evaluates its results. She takes care to distinguish it from the older formula "agent = LLM + memory + tools + planning + action": the harness adds the explicit design of work loops, evaluation, permission control, and long-term state persistence.

[Avi Chawla][ddods-harness] arranges these three levels in concentric circles. Prompt engineering shapes the instructions given to the model. Context engineering decides what the model sees, and when. Harness engineering contains both and adds all the application infrastructure: tool orchestration, state persistence, error recovery, verification loops, permission control, and the complete lifecycle of a task. A harness that consists of nothing more than a well-written system prompt is not a harness; it is merely its most visible part, and rarely the most decisive.

This infrastructure is not abstract: it is software that can be opened, read, and modified, consisting of a configuration file that declares available models and granted permissions, an `AGENTS.md` or `CLAUDE.md` file containing the project rules, scripts that implement hooks, and a skills directory, all driven by a process that actually runs: the agentic loop itself, which sequences model calls, tool execution, and result review. This materiality explains why a harness is built, debugged, and repaired like any other software: through modified files, tests, and commits. We will see a concrete instance of this in the next module, with Pi's `.pi/` directory.

## A personal harness that is constantly evolving

How you should approach everything that follows depends on two ideas: your harness is personal, and it is constantly evolving.

The first is that your harness will never look exactly like your neighbor's. [Addy Osmani][osmani-harness] puts it this way: harness engineering is a discipline, not a framework that can be installed as-is, because the right harness for your code is shaped by your history of failures, which cannot be downloaded as a package. You can take inspiration from another's harness, but never copy it exactly hoping it covers the same blind spots, as it was shaped by incidents that were not your own.

The second is that the harness evolves, for two different reasons.

The first is due to the model itself. [Avi Chawla][ddods-harness] calls this *harness thickness*: how much logic should live in the harness rather than in the model? Anthropic, the article states, bets on a thin harness and on model progress, to the point of regularly removing planning steps from Claude Code as newer versions of the model internalize them, whereas other frameworks, built around explicit graphs, bet instead on control that remains hard-coded. A component that makes sense today can therefore become dead weight in six months, for the sole reason that the model has evolved.

The second reason relates to your usage. [Osmani][osmani-harness] summarizes it as the most important professional habit: treating every agent failure as a permanent signal rather than an accident to be excused. He warns against the most tempting response: adding the lesson learned as one more sentence in an already long `AGENTS.md` file. However, a rules file that grows without being reworked loses readability in exchange for perceived coverage. His core takeaway: a harness is a living system, not a configuration file written once and for all. The pattern he proposes instead boils down to one question: what behavior do we want to achieve or correct, and which specific piece of the harness can achieve it? This is the pattern we will follow throughout the reconstruction.

Consider this module a starting inventory rather than a fixed architecture. You will keep some of the following building blocks minimal; others, you will expand as you encounter your own failures.

## The seven building blocks

The starting question is this: we have a model capable of predicting text and calling tools. What should we surround it with so that it works reliably, safely, and usefully on real tasks? Each subsequent building block addresses a specific limitation of the raw model; keep this correspondence in mind, more than the list itself. This is the grid that organizes the rest of the course: each module in Act 2 rebuilds one of these building blocks.

**Context management** comes first. The window is finite, and we have seen that the model struggles with a context that is too long or poorly ordered. [Avi Chawla][ddods-harness] lists five practical strategies to manage it: periodic purging, conversation summarization, masking obsolete observations, structured note-taking, and delegation to a sub-agent. A study he cites (ACON) achieves up to 54% fewer tokens, while preserving accuracy above 95%, by preferring reasoning traces over raw tool outputs. The resulting principle: select what goes into the window, order it to leverage the cache, and compact anything that swells unnecessarily.

**Tools** come next, because a model that only produces text cannot act. [Vivek Trivedy][langchain-harness] summarizes this with an image: bash and code execution give the agent "a computer at hand," to the point where it can use it to build its own tools along the way. But a catalog that is too broad harms as much as it helps: [Avi Chawla][ddods-harness] reports that Vercel removed 80% of the tools from its v0 agent and obtained better results, and that Claude Code reduces its context by 95% by loading tools only on demand. The principle: each capability must be exposed as a tool described for the model and protected by a permission, and only the bare minimum necessary for the current step should be exposed.

**Delegation** addresses a more subtle problem, which [Vivek Trivedy][langchain-harness] formulates as follows: to keep a clean context, sub-agents must be deployed for very specific tasks, and only a summary of their work should be reinjected into the main thread, rather than all the reasoning that led to it. The work for a sub-task is indeed often much more voluminous than its conclusion; if all this work accumulates in the main context, the latter degrades.

**Orchestration** organizes multiple agents. [Avi Chawla][ddods-harness] poses two recurring trade-offs. First, single agent or multi-agent: Anthropic and OpenAI both recommend pushing a single agent to its limit before adding a second, and separating only after a dozen overlapping tools or clearly distinct task domains. Second, once multiple agents are involved, should they reason and act at each step (the ReAct pattern), or should planning be separated from execution? Orchestration also carries the most difficult ambition, which [Vivek Trivedy][langchain-harness] presents as the ultimate goal: making an agent work over a long horizon. [Osmani][osmani-harness] describes a concrete and surprisingly simple implementation: a mechanism intercepts the agent's attempt to conclude, then restarts a new session for the same objective; each iteration starts with a clean context but finds the state of the previous work only through what the file system has preserved.

**Memory** persists decisions between sessions. [Vivek Trivedy][langchain-harness] states it plainly: a model knows nothing beyond its weights and what is currently in its context; without a dedicated process, it forgets its past mistakes as well as what it was working on yesterday, hence the use of files like `AGENTS.md` or `CLAUDE.md`. [Osmani][osmani-harness] describes this type of file as the most cost-effective configuration point of the harness, since it lands in the system prompt at every turn; he recommends keeping it short (some teams keep theirs under sixty lines) and treating it as a pilot's checklist rather than a style guide. The file system remains a good starting point for memory, but Osmani notes that it is not always enough: for up-to-date library documentation, a web search or a dedicated MCP server remains necessary.

**Safety**, implemented through permissions, limits what the agent is allowed to do. [Avi Chawla][ddods-harness] presents it as a slider: a permissive architecture is fast but risky, a restrictive architecture is safer but slows down every action, and the right setting depends on the deployment context. It is often accompanied by physical isolation: [Vivek Trivedy][langchain-harness] notes that sandboxes give the agent a secure space and allow multiple agents to work in parallel without one breaking what another is building. This is what distinguishes an autonomous system from a dangerous one, and we will see that this building block deserves special attention.

**Verification and evaluation**, finally, answer a simple question: does it work, and at what cost? [Avi Chawla][ddods-harness] distinguishes computational and deterministic verification (tests, linters, type checkers) from inferential verification entrusted to an LLM-judge, which is more sensitive to semantic issues but slower to obtain. A cross-cutting principle recurs in [Osmani][osmani-harness]: a model that judges its own work tends to grade itself generously, and entrusting the review to an agent other than the one that produced the result yields significantly more reliable verdicts. [Lilian Weng][weng-harness] closes the loop: in the most advanced harnesses, this verification no longer serves only to control a one-off task; it feeds a model self-improvement loop. A model that progresses this way prevents the harness from becoming over-complex in return. Measuring your harness, both its results and its costs, is the condition for steering it.

## In practice

These seven building blocks form a conceptual framework rather than a checklist: when facing any harness, you should be able to point to each block, state whether it is present, absent or minimal, and understand the consequences of that choice.

This grid has two uses. We will first apply it to Pi to organize the reconstruction. You will then apply it to your own harness in Act 4. Not all building blocks are mandatory for every use case: a harness dedicated to code review does not have the same needs as a migration harness. Knowing how to choose the useful building blocks is part of the skill we are aiming to build.

Take a harness you know, or one we will work with together: Claude Code, Cursor, or another. For each building block of the grid, try to identify it in the tool. Where is the context managed? What are the exposed tools? Is there a memory, and where does it live? Note the building blocks that seem absent or reduced to a minimum: these are often the most revealing of the tool's design choices. If you have already encountered a failure with this tool (an action it should not have taken, a repeated omission), try to link this failure to one of the seven building blocks: this is exactly the exercise we will repeat throughout Act 2.

## For further reading

This module relies on four recent texts that, each in their own way, attempt to define what a harness is and what drives it. You will find them cited throughout the building blocks above.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering
