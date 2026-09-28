# Hands-on Harness

*A training to help you discover harnesses and tame them*

## Context

The use of Large Language Models (LLMs) in our daily tasks is becoming increasingly important, whether for transcribing meetings, analyzing documents, or coding applications. In what follows, we focus on their impact in a software development setting.

LLMs and their ecosystem have evolved at breakneck speed. Recall that ChatGPT was made available to the general public in late November 2022. Since then, techniques and tools have multiplied:

- **2022: intelligent completion**. Models begin predicting and completing code on the fly, directly in the editor, like classic autocompletion, but powered by LLMs trained on billions of lines of public code.
- **2022-2023: prompt engineering**. With ChatGPT accessible to the general public, developers discover that the way a question is phrased greatly changes the quality of the LLM's response. Prompt engineering consists of building very precise, structured instructions to get better results.
- **2023-2024: RAG (Retrieval-Augmented Generation)**. The LLM alone does not know your specific codebase or your internal documentation. RAG augments the model's knowledge by providing it with relevant documents before answering.
- **2023-2024: agent (LLM + tools)**. Instead of asking a question and receiving an answer, the model is given the means to act: run code, query a database, call an API, read files.
- **Late 2024: MCP (Model Context Protocol)**. An open standard from Anthropic that standardizes how LLMs communicate with external tools. MCP defines a unified protocol: any LLM implementing the protocol can use any tool implementing MCP (files, APIs, databases, etc.).
- **2025: context engineering**. An extension of prompt engineering: it is no longer just about phrasing the question well, but about optimizing the whole context provided to the model, from document selection to history management, including information structuring and the relevance of examples.
- **2025: harness**. A framework that assembles all the previous concepts into a coherent system. The harness manages context, available tools, code execution, and permissions, with the goal of a system autonomous enough to work on complex, long-running tasks.

Tools have followed these advances: ChatGPT, Copilot, Claude Code, OpenCode, or, more recently, Pi.

## Stakes

In four years, LLMs for coding have kept changing, gaining in performance and becoming more complex. Before you even master a concept or a tool, you already have to learn another one, and developers, like non-developers, follow this wave at the peril of software quality. Two questions now arise: how to use these tools effectively without losing control, and how can they help us on a daily basis?

Big announcements dangled a productivity gain of at least 50&nbsp;% thanks to LLMs. The reality is much more nuanced: a METR study conducted on experienced developers concludes that, on complex codebases, the use of LLMs can be counterproductive [1], and the GitClear report on code quality observes that developers spend more time redoing work after realizing that what an LLM had added to the codebase was wrong [2]. Pull Requests of insufficient quality are multiplying on open source software, and the maintainer becomes a reviewer overwhelmed by verbose, often poorly structured work, produced by agents and not reviewed by a contributor who has not familiarized themselves with the code they claim to contribute to. When this review is done poorly, the ensuing rewrite in turn limits productivity, if it does not reduce it [3].

We increasingly see open source projects that close Pull Request submissions by default and require contributors to start a discussion before granting them the rights.

The use of MCP is here again more nuanced than the initial promises. The context windows of new LLMs have grown, recently reaching one million tokens, but models react very poorly as soon as 40&nbsp;% of the overall context size is occupied [4]. Other, more alarming measurements place the threshold in absolute value rather than percentage, around 100K tokens [5]. You will see this zone referred to as "dumb zone" [6], "context-rot" or, as in the original article, "lost in the middle". MCP and all the tools that exist today add to the context a preamble that can bring you there before you have even asked your first question, and the answers you get will then no longer be reliable.

The remaining question is that of control: keeping a critical mind in the face of this ease of code generation, and becoming an orchestrator instead of remaining a simple observer. This is what this training seeks to build.

## Objectives

Research and industry alike rely on software development; developers must therefore be supported in the face of the changes to the profession brought about by LLMs and AI agents.

This training provides an overview of the tools, the existing models, and their operating mechanisms. It also seeks to develop a critical mindset toward the possible misuse of these tools, to promote their ethical and responsible use.

The program includes many hands-on segments, so that participants can, by the end of the training, integrate these tools into their daily practices.

## Target audience and prerequisites

- **Audience**: anyone with a software development activity.
- **Prerequisites**: programming experience (at least 1-2 years); no AI expertise required, though minimal experience is a plus.
- **Level**: from juniors to experienced developers.

## References

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)
