# Why a harness, and what is it made of?

::: tip Module Objectives
- Reconstruct the chain from the prompt to the harness, and identify the gap each step fills
- Precisely define what a harness is, and understand why it is specific to you and constantly evolving
- Be able to list the essential components of a harness and, for each, the problem it solves
:::

The introduction presented a timeline of techniques that have appeared since late 2022. We revisit it here from another angle—not to tell a story, but to understand a mechanism. Each step in this timeline addresses a shortcoming of the previous step, and more importantly, each one builds upon the others rather than replacing them. A harness does not make *prompt engineering* obsolete; it still needs it, but it organizes it.

In the beginning, there is the prompt. You quickly realize that the way you word a request radically changes the response, and *prompt engineering* consists of wording it better. But a well-queried model remains ignorant of your codebase and internal documentation. RAG fills this gap: it retrieves relevant documents and provides them to the model before it responds, though the setup can be tedious.

The model can then respond better, but it is still only responding. It cannot act. The agent fills this gap by giving it tools: executing code, reading a file, calling an API. Since each tool must be described and connected, the multiplication of integrations quickly becomes unmanageable, and MCP standardizes how a model interacts with external tools. Tools can sometimes be effective replacements for RAG.

At this stage, we have a model capable of retrieving information and taking action. It remains to decide what to put in its context window and in what order. This is *context engineering*, an extension of *prompt engineering*: it is no longer just about asking the question correctly, but about optimizing the entire context provided to the model.

## The harness, a software infrastructure

The harness is the link that assembles all previous elements into a coherent system. [Vivek Trivedy][langchain-harness] defines it as follows: a harness is code, configuration, or execution logic—nothing more mysterious than that, but nothing less either. [Lilian Weng][weng-harness] goes a bit further: it is the system surrounding the model that decides how it thinks and plans, how it calls tools and acts, how it perceives and manages its context, where it stores what it produces, and how it evaluates its results. She takes care to distinguish it from the older formula "agent = LLM + memory + tools + planning + action": the harness adds the explicit design of work loops, evaluation, permission control, and long-term state persistence.

[Avi Chawla][ddods-harness] arranges these three levels as concentric circles. *Prompt engineering* shapes the instructions given to the model. *Context engineering* decides what the model sees, and when. *Harness engineering* encompasses both and adds the entire application infrastructure: tool orchestration, state persistence, error recovery, verification loops, permission control, and the complete lifecycle of a task. A harness that consists merely of a well-written system prompt is not one; the system prompt is its most visible part, but rarely the most decisive.

This infrastructure is not abstract: it is software that you can open, read, and modify, consisting of a configuration file that declares the available models and granted permissions, an `AGENTS.md` or `CLAUDE.md` file that carries the project rules, scripts that implement hooks, and a skills directory, all powered by a process that actually runs: the agentic loop itself, which chains model calls, tool execution, and result review. This tangibility is why a harness is built, debugged, and repaired like any other piece of software: through modified files, tests, and commits. We will see a concrete instance of this in the next module, with Pi's `.pi/` directory.

## A unique harness that never stops evolving

How you should approach everything that follows depends on two ideas: your harness is unique to you, and it is constantly evolving.

The first is that your harness will never look exactly like your neighbor's. [Addy Osmani][osmani-harness] puts it this way: harness engineering is a discipline, not a framework that you install as-is, because the right harness for your code is shaped by your history of failures, which cannot be downloaded as a package. You can draw inspiration from someone else's harness, but you can never copy it as-is hoping it covers the same blind spots, since it was shaped by incidents that are not your own.

The second is that the harness evolves, for two different reasons.

The first relates to the model itself. [Avi Chawla][ddods-harness] calls this harness thickness: how much logic should reside in the harness rather than in the model? Anthropic, the article notes, bets on a thin harness and on the model's progress, to the point of regularly removing planning steps from Claude Code as new model versions internalize them, while other frameworks, built around explicit graphs, instead bet on control that remains hard-coded. A component that makes sense today could therefore become dead weight in six months, for the sole reason that the model has evolved.

The second reason is your usage. [Osmani][osmani-harness] summarizes this as what he calls the most important habit in the profession: treating every agent failure as a permanent signal rather than an accident to be excused. He warns against the most tempting response: adding the lesson learned as just another sentence in an already long `AGENTS.md` file. Yet a rules file that grows without ever being reworked loses readability for what it thinks it gains in coverage. His key takeaway: a harness is a living system and not a configuration file written once and for all. The pattern he proposes instead comes down to one question: what behavior do we want to obtain or correct, and which precise part of the harness can achieve it? This is the pattern we will follow throughout the reconstruction.

Consider this module, then, as a starting inventory rather than a fixed architecture. You will keep some of the following building blocks minimal, while others you will expand through your own failures.

## The seven bricks

The starting question is as follows. We have a model capable of predicting text and calling tools. What should surround it so that it works reliably, safely, and usefully on real tasks? Each brick that follows addresses a specific limitation of the raw model; this correspondence is what should be kept in mind, more than the list itself. This is the framework that organizes the rest of the training: each module of act 2 reconstructs one of these bricks.

**Context management** comes first. The window is finite, and we have seen that the model struggles with a context that is too long or poorly ordered. [Avi Chawla][ddods-harness] lists five practical strategies to manage it: periodic purging, conversation summarization, masking of obsolete observations, structured note-taking, and delegation to a sub-agent. A study he cites (ACON) achieves up to 54% fewer tokens, while maintaining accuracy above 95%, by preferring reasoning traces over raw tool outputs. The resulting principle: select what goes into the window, order it to take advantage of the cache, and compact what unnecessarily inflates.

**Tools** come next, because a model that only produces text cannot act. [Vivek Trivedy][langchain-harness] summarizes this with an image: bash and code execution give the agent "a computer at hand," to the point where it can use it to build its own tools along the way. But an overly broad catalog is as harmful as it is helpful: [Avi Chawla][ddods-harness] reports that Vercel removed 80% of the tools from its v0 agent and achieved better results, and that Claude Code reduces its context by 95% by loading tools only on demand. The principle: each capability must be exposed as a tool described for the model and guarded by a permission, and only the bare minimum should be exposed for the current step.

**Delegation** addresses a more subtle problem, which [Vivek Trivedy][langchain-harness] formulates as follows: to keep a clean context, you must deploy sub-agents on very specific tasks and only reinject a synthesis of their work into the main thread, rather than all the reasoning that led to it. The work of a sub-task is indeed often much larger than its conclusion; if all this work accumulates in the main context, the latter degrades.

**Orchestration** organizes multiple agents among themselves. [Avi Chawla][ddods-harness] poses two recurring trade-offs. First, single agent or multi-agent: both Anthropic and OpenAI recommend pushing a single agent to the limit before adding a second, and only separating them after a dozen overlapping tools or clearly distinct task domains. Next, once multiple agents are involved, should they reason and act at every step (the ReAct pattern), or should planning be separated from execution? Orchestration also carries the most difficult ambition, which [Vivek Trivedy][langchain-harness] presents as the ultimate goal: making an agent work over a long horizon. [Osmani][osmani-harness] describes a concrete and surprisingly simple implementation: a mechanism intercepts the agent's attempt to conclude, then restarts a fresh session on the same objective; each iteration starts with a clean context but recovers the state of the previous work only through what the file system has retained.

**Memory** persists decisions between sessions. [Vivek Trivedy][langchain-harness] puts it bluntly: a model knows nothing other than its weights and what is in its current context; without a dedicated process, it forgets its past mistakes as well as what it was working on the day before, which is why files like `AGENTS.md` or `CLAUDE.md` are used. [Osmani][osmani-harness] describes this type of file as the most cost-effective configuration point of the harness, since it lands in the system prompt every turn; he recommends keeping it short (some teams keep theirs under sixty lines) and treating it like a pilot's checklist rather than a style guide. The file system remains a good starting point for memory, but Osmani notes that it is not always enough: for the up-to-date documentation of a library, a web search or a dedicated MCP server remains necessary.

**Safety**, implemented through permissions, limits what the agent is allowed to do. [Avi Chawla][ddods-harness] presents it as a slider: a permissive architecture moves fast but takes risks, a restrictive architecture is safer but slows down every action, and the right setting depends on the deployment context. It is often accompanied by physical isolation: [Vivek Trivedy][langchain-harness] reminds us that sandboxes give the agent a secure space and allow multiple agents to work in parallel without one breaking what another is building. This is what distinguishes an autonomous system from a dangerous one, and we will see that this component deserves particular attention.

**Verification and evaluation**, finally, answer a simple question: does it work, and at what cost? [Avi Chawla][ddods-harness] distinguishes deterministic computational verification (tests, linters, type checkers) from inferential verification handled by an LLM-judge, which is more sensitive to semantic issues but slower to obtain. An overarching principle reappears in [Osmani][osmani-harness]: a model judging its own work tends to grade itself generously, and assigning the review to an agent distinct from the one that produced the result yields significantly more reliable verdicts. [Lilian Weng][weng-harness] closes the loop: in the most sophisticated harnesses, this verification no longer serves only to check a one-off task, but feeds a model self-improvement loop. A model that progresses this way, in turn, prevents the harness from becoming over-complex. Measuring your harness, both its results and its costs, is the prerequisite for steering it.

## In practice

These seven blocks form a framework rather than a checklist: when facing any harness, you must be able to point to each block, state whether it is present, absent, or minimal, and understand the consequences of that choice.

This framework has two uses. First, we will apply it to Pi to organize the reconstruction. Then, you will apply it to your own harness in Act 4. Not all blocks are mandatory for every use case: a harness dedicated to code review does not have the same needs as a migration harness. Knowing how to choose the useful blocks is part of the skill we are looking to build.

Take a harness you are familiar with, or one that we will work with together: Claude Code, Cursor, or another. For each block of the framework, try to identify it within the tool. Where is the context managed? What are the exposed tools? Is there a memory, and where does it reside? Note the blocks that seem absent or reduced to a minimum: these are often the most revealing of the tool's design choices. If you have already encountered a failure with this tool (an action it should not have taken, a repeated omission), try to link this failure to one of the seven blocks: this is exactly the exercise we will repeat throughout Act 2.

## Going further

This module is based on four recent texts that, each in their own way, attempt to define what a harness is and what drives it. You will find them cited throughout the blocks above.

- Vivek Trivedy, [The Anatomy of an Agent Harness][langchain-harness]
- Addy Osmani, [Agent Harness Engineering][osmani-harness]
- Avi Chawla, [The Anatomy of an Agent Harness][ddods-harness]
- Lilian Weng, [posts/2026-07-04-harness][weng-harness]

[langchain-harness]: https://www.langchain.com/blog/the-anatomy-of-an-agent-harness
[osmani-harness]: https://addyosmani.com/blog/agent-harness-engineering/
[ddods-harness]: https://blog.dailydoseofds.com/p/the-anatomy-of-an-agent-harness
[weng-harness]: https://lilianweng.github.io/posts/2026-07-04-harness/
[awesome-harness]: https://github.com/ai-boost/awesome-harness-engineering
