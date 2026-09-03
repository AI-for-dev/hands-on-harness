# Hands-on Harness

*A training course to introduce you to harnesses and how to master them*

## Context

The use of Large Language Models (LLMs) in our daily tasks is becoming increasingly important, whether for meeting transcription, document analysis, or application coding. In the following sections, we will focus on their impact within a software development framework.

LLMs and their ecosystem have evolved at a breakneck speed. As a reminder, ChatGPT was released to the general public in late November 2022. Since then, techniques and tools have multiplied:

- **2022: intelligent completion**. Models began predicting and completing code on the fly, directly in the editor, like classic autocomplete, but powered by LLMs trained on billions of lines of public code.
- **2022-2023: prompt engineering**. With ChatGPT available to the general public, developers discovered that the phrasing of the question significantly changes the quality of the LLM's response. Prompt engineering consists of constructing very precise and structured instructions to obtain better results.
- **2023-2024: RAG (Retrieval-Augmented Generation)**. An LLM alone does not know your specific codebase or internal documentation. RAG augments the model's knowledge by providing it with relevant documents before it answers.
- **2023-2024: agent (LLM + tools)**. Instead of asking a question and receiving an answer, the model is given the means to act: execute code, query a database, call an API, read files.
- **Late 2024: MCP (Model Context Protocol)**. An open standard from Anthropic that normalizes how LLMs communicate with external tools. MCP defines a unified protocol: any LLM implementing the protocol can use any tool implementing MCP (files, APIs, databases, etc.).
- **2025: context engineering**. An extension of prompt engineering: it is no longer just about phrasing the question well, but about optimizing all the context provided to the model, from the choice of documents to history management, as well as information structuring and the relevance of examples.
- **2025: harness**. A framework that assembles all the previous concepts into a coherent system. The harness manages context, available tools, code execution, and permissions, with the goal of a system autonomous enough to work on complex and long tasks.

Tools have followed these advances: ChatGPT, Copilot, Claude Code, OpenCode or more recently Pi.

## Challenges

In four years, LLMs for coding have constantly changed, increased in performance, and become more complex. Even before you master a concept or a tool, you must already learn another, and developers, like non-developers, are following this wave at the expense of software quality. Two questions now arise: how can you effectively use these tools without losing control, and how can they help you in your daily work?

Major announcements promised productivity gains of at least 50% thanks to LLMs. The actual findings are much more nuanced: a METR study conducted with experienced developers concludes that, on complex codebases, the use of LLMs can be counterproductive [1], and the GitClear report on code quality observes that developers spend more time reworking after realizing that what an LLM added to the codebase was erroneous [2]. Low-quality Pull Requests are multiplying in open-source software, and maintainers become reviewers consumed by verbose, often poorly structured work produced by agents and not reviewed by a contributor who has not familiarized themselves with the code they claim to contribute to. When this review is poorly executed, the subsequent refactor limits productivity in turn, if it does not reduce it [3].

We are seeing more and more open-source projects disable Pull Request submissions by default and ask contributors to start a discussion before granting them rights.

The use of MCP is even more nuanced here than the initial promises. The context windows of new LLMs have grown, recently reaching a million tokens, but models perform poorly as soon as 40% of the overall context size is occupied [4]. Other, more alarmist measurements place the threshold in absolute value rather than as a percentage, around 100K tokens [5]. You will see this zone referred to as the "dumb zone" [6], "context-rot", or, as in the original article, "lost in the middle". MCPs and all existing tools add a preamble to the context that can land you there before you even ask your first question, and the answers you receive will then no longer be reliable.

The remaining question is one of mastery: maintaining a critical mind in the face of this ease of code generation, and becoming an orchestrator instead of remaining a simple observer. This is what this training seeks to build.

## Objectives

Both research and industry rely on software development; those who develop must therefore be supported in the face of the changes in the profession induced by LLMs and AI agents.

This training provides an overview of tools, existing models, and how they work. It also seeks to develop critical thinking regarding the potential pitfalls of their use to promote ethical and responsible utilization.

The program includes many practical sections, so that participants can integrate these tools into their daily practices by the end of the training.

## Target audience and prerequisites

- **Audience**: anyone involved in software development.
- **Prerequisites**: programming experience (at least 1-2 years); no AI expertise required, although minimal experience is a plus.
- **Level**: junior to experienced.

## References

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)
