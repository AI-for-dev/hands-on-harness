# Hands-on Harness

*A course to help you discover and master harnesses*

## Context

The use of Large Language Models (LLMs) in our daily tasks is becoming increasingly important, whether for meeting transcriptions, document analysis, or application coding. We will focus hereafter on their impact within a software development framework.

LLMs and their ecosystem have evolved at an incredible speed. As a reminder, ChatGPT was released to the general public in late November 2022. Since then, techniques and tools have proliferated:

- **2022: intelligent completion**. Models began predicting and completing code on the fly, directly in the editor, similar to classic autocompletion but powered by LLMs trained on billions of lines of public code.
- **2022-2023: prompt engineering**. With ChatGPT available to the general public, developers discovered that the phrasing of the question significantly changes the quality of the LLM's response. Prompt engineering involves constructing very precise and structured instructions to achieve better results.
- **2023-2024: RAG (Retrieval-Augmented Generation)**. An LLM alone does not know your specific codebase or internal documentation. RAG increases the model's knowledge by providing it with relevant documents before it responds.
- **2023-2024: agent (LLM + tools)**. Instead of asking a question and receiving an answer, the model is given the means to act: execute code, query a database, call an API, read files.
- **Late 2024: MCP (Model Context Protocol)**. An open standard from Anthropic that normalizes how LLMs communicate with external tools. MCP defines a unified protocol: any LLM implementing the protocol can use any tool implementing MCP (files, APIs, databases, etc.).
- **2025: context engineering**. An extension of prompt engineering: it is no longer just about phrasing the question well, but optimizing the entire context provided to the model, from the choice of documents to history management, information structuring, and example relevance.
- **2025: harness**. A framework that assembles all the previous concepts into a coherent system. The harness manages context, available tools, code execution, and permissions, aiming for a system autonomous enough to work on complex and long tasks.

Tools have followed these advances: ChatGPT, Copilot, Claude Code, OpenCode, or more recently Pi.

## Challenges

Over the last four years, LLMs for coding have constantly evolved, gained performance, and become more complex. Before you can even master one concept or tool, you must already learn another, and developers, as well as non-developers, are following this wave at the expense of software quality. Two questions now arise: how to use these tools effectively without losing control, and how can they help us on a daily basis?

Major announcements promised productivity gains of at least 50% thanks to LLMs. The reality is far more nuanced: a METR study of experienced developers concludes that using LLMs on complex code can be counterproductive [1], and the GitClear report on code quality observes that developers spend more time redoing work after realizing that what an LLM added to the codebase was incorrect [2]. Poor-quality Pull Requests are increasing in open-source software, and maintainers are becoming reviewers overwhelmed by verbose, often poorly structured work produced by agents and not reviewed by a contributor who has not familiarized themselves with the code they claim to contribute to. When this review is poorly executed, the subsequent refactoring in turn limits or even reduces productivity [3].

We are seeing more and more open-source projects that disable Pull Requests by default and ask contributors to start a discussion before granting them permissions.

The use of MCP is even more nuanced than initial promises. Context windows for new LLMs have grown, recently reaching one million tokens, but models perform poorly as soon as 40% of the overall context size is filled [4]. Other, more alarmist measurements place the threshold at an absolute value rather than a percentage, around 100K tokens [5]. You will see this zone referred to as the "dumb zone" [6], "context-rot," or, as in the original article, "lost in the middle." MCPs and all existing tools add a preamble to the context that can push you into this zone before you even ask your first question, making the resulting answers unreliable.

The remaining question is one of mastery: maintaining a critical mind despite the ease of code generation, and becoming an orchestrator instead of remaining a mere observer. This is what this course aims to build.

## Objectives

Both research and industry rely on software development; therefore, developers must be supported through the changes in the profession induced by LLMs and AI agents.

This course provides an overview of tools, existing models, and their inner workings. It also aims to develop a critical mindset regarding potential misuse to promote ethical and responsible use.

The program includes numerous practical sections so that participants can integrate these tools into their daily practices by the end of the course.

## Target Audience and Prerequisites

- **Audience**: anyone involved in software development.
- **Prerequisites**: programming experience (at least 1-2 years); no AI expertise required, although some minimal experience is a plus.
- **Level**: junior to advanced.

## References

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)
