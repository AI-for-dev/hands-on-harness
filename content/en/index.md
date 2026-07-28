# Hands-on Harness

*A training course to introduce you to harnesses and how to master them*

## Context

The use of Large Language Models (LLMs) in our daily tasks is becoming increasingly important, whether for meeting transcription, document analysis, or application coding. In the following sections, we will focus on their impact within a software development framework.

The evolution of LLMs and their ecosystem has developed at a breakneck pace. As a reminder, ChatGPT was released to the general public in late November 2022. Since then, a multitude of techniques and tools have emerged:

- **2022: intelligent completion** - Models began predicting and completing code on the fly, directly in the editor. It is like classic autocompletion, but powered by LLMs trained on billions of lines of public code.
- **2022-2023: prompt engineering** - With ChatGPT accessible to the general public, developers discovered that how a question is formulated greatly impacts the quality of the LLM's response. Prompt engineering consists of building very precise and structured instructions to obtain better results.
- **2023-2024: RAG (Retrieval-Augmented Generation)** - An LLM alone does not know your specific codebase or internal documentation. RAG makes it possible to augment the model's knowledge by providing it with relevant documents before it responds.
- **2023-2024: agent (LLM + tools)** - Instead of just posting a question and receiving an answer, we create intelligent agents that can act: execute code, query a database, call an API, read files.
- **Late 2024: MCP (Model Context Protocol)** - An open standard from Anthropic that normalizes how LLMs communicate with external tools. MCP defines a unified protocol: any LLM implementing the protocol can use any tool implementing MCP (files, APIs, databases, etc.).
- **2025: context engineering** - An evolution of prompt engineering. It is no longer just about formulating the question well; you must optimize the context provided to the model: choice of documents, structuring of information, relevance of examples, history management. It is a more holistic approach to maximizing the quality of responses.
- **2025: harness** - A framework or infrastructure that integrates all previous concepts cohesively. The harness automatically manages the context, available tools, code execution, permissions, etc. It is the logical evolution: after learning the individual building blocks, assembling them into an integrated and intelligent system. Its role is to build a system that is as autonomous as possible to be able to work on complex and lengthy tasks.

Tools have also evolved significantly to meet these advancements: ChatGPT, Copilot, Claude Code, OpenCode or more recently Pi.

## Challenges

In just 4 years, the landscape of language models for coding has continuously changed, becoming more powerful but also more complex. Before you have even mastered a concept or a tool, you already have to learn another. Developers (and non-developers) are riding this giant wave at the risk of software quality. Because today, that is where we stand: how can these tools be used effectively without losing control? In what ways can these tools help us on a daily basis?

Major announcements led us to believe we were at least 50% more productive thanks to language models. The reality is much more nuanced. Studies show that, on complex code, the use of language models can be counter-productive [1]. For common use, studies show that developers spend more time redoing work after realizing that the additions by language models to the codebase were wrong [2]. We see more and more Pull Requests being opened on open-source software where the quality is lacking. The maintainer then becomes a reviewer completely consumed by re-reading the verbose, and often unstructured, work produced by agents and not reviewed by the contributor who has not familiarized themselves with the code they claim to contribute to. If the review work is poorly done, refactoring processes appear that are once again limiting, or even negatively impacting productivity [3].

We observe more and more open-source projects that disable Pull Request submissions by default and require starting a discussion with potential contributors before granting them rights.

Regarding the use of MCP, the reality is even more nuanced than the initial promises. Despite the increase in the total number of tokens available in the context window of new language models (we recently moved to 1M tokens), it has been known for a while that models react very poorly as soon as 40% of the overall context size is filled [4]. Other studies are even more alarmist and show that it is not a percentage, but rather a number of tokens not to exceed, which is around 100K tokens [5]. You will see this area referred to as the "dumb zone" [6], "context-rot" or, as in the original paper, "lost in the middle". The use of MCPs and all the tools that exist today adds a preamble to the context that can land you in the "dumb zone" before you have even started asking your first question. The answers you receive will then no longer be reliable.

So, is it possible to regain mastery of AI within the context of software development? How can you avoid losing your critical thinking and continue to exercise it in the face of such ease of code generation? How do you become an orchestrator rather than a simple observer?

## Objectives

Software development is a fundamental pillar of progress in research and industry. Consequently, it is essential to support developers in the face of the professional changes brought about by the integration of LLMs and AI agents.

This course aims to provide an overview of the tools, existing models, and their operational mechanisms. It also aims to develop critical thinking regarding potential pitfalls related to their use, in order to promote the ethical and responsible use of these technologies.

The program will include many practical parts so that participants can integrate these tools into their daily practices upon completion of the course.

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
