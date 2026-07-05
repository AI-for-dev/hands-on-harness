# Hands-on Harness

*A course to help you discover and master harnesses*

## Context

The use of Large Language Models (LLMs) in our daily tasks is becoming increasingly important, whether it is for meeting transcription, document analysis, or application coding. In the following sections, we will focus on their impact within a software development framework.

The evolution of LLMs and their ecosystem has advanced at breakneck speed. Let us recall that ChatGPT was released to the public in late November 2022. Since then, a proliferation of techniques and tools has emerged:

- **2022: intelligent completion** — Models begin to predict and complete code on the fly, directly within the editor. This is like classic autocompletion, but powered by LLMs trained on billions of lines of public code.
- **2022-2023: prompt engineering** — With ChatGPT accessible to the general public, developers discovered that the formulation of the question significantly impacts the quality of the LLM's response. Prompt engineering involves constructing very precise and structured instructions to achieve better results.
- **2023-2024: RAG (Retrieval-Augmented Generation)** — The LLM alone does not know your specific codebase or internal documentation. A RAG system allows augmenting the model's knowledge by providing relevant documents before answering.
- **2023-2024: agent (LLM + tools)** — Instead of simply posting a question and receiving an answer, we create intelligent agents that can act: executing code, querying a database, calling an API, reading files.
- **Late 2024: MCP (Model Context Protocol)** — An open standard by Anthropic that normalizes how LLMs communicate with external tools. MCP defines a unified protocol: any LLM implementing the protocol can use any tool implementing MCP (files, APIs, databases, etc.).
- **2025: context engineering** — An evolution of prompt engineering. It is no longer just about formulating the question well; one must also optimize the context provided to the model: choice of documents, structuring of information, relevance of examples, management of history. This is a more holistic approach to maximize response quality.
- **2025: harness** — A framework or infrastructure that integrates all the previous concepts cohesively. The harness automatically manages context, available tools, code execution, permissions, etc. This is the logical evolution: after learning the individual building blocks, assemble them into an integrated and intelligent system. Its role is to build a system that is as autonomous as possible to handle complex and long tasks.

Tools have also evolved significantly to keep up with these advancements: ChatGPT, Copilot, Claude Code, OpenCode, or more recently Pi.

## Challenges

In just 4 years, the landscape of LLMs for coding has continuously changed, become more performant, but also more complex. Before you even master one concept or tool, you must already learn another. Developers (and non-developers) are riding this giant wave at the expense of software quality. For today, we are at a point where: how do we use these tools effectively without losing control? How can these tools help us in our daily work?

Big announcements promised that we would be at least 50% more productive thanks to LLMs. The reality is much more nuanced. Studies show that, on complex code, using LLMs can be counterproductive [1]. For everyday usage, studies show that developers spend more time redoing the work after realizing that the LLM-generated addition to the codebase was incorrect [2]. We see an increasing number of Pull Requests opening on open-source software where quality is lacking. The maintainer then becomes a reviewer completely overwhelmed by re-reading verbose, often unstructured work produced by agents, and which the contributor did not review themselves, having not familiarized themselves with the code they claim to contribute to. If the review process is poorly done, rework processes appear, which are again limiting or even negatively impact productivity [3].

We are seeing an increasing number of open-source projects closing access to opening Pull Requests by default and requiring engaging in a discussion with potential contributors before granting rights.

Regarding MCP usage, the reality is even more nuanced than the initial promises. Despite the increase in the total number of tokens available in the context window of new LLMs (we recently passed 1M tokens), it has been known for a while that models react very poorly as soon as we fill 40% of the total context size [4]. Other studies are even more alarmist and show that it is not a percentage, but rather a number of tokens not to exceed, which is around 100K tokens [5]. You will encounter this zone under the names of "dumb zone" [6], "context-rot," or, as in the original paper, "lost in the middle." The use of MCP and all tools existing today adds a preamble to the context that can bring you into the "dumb zone" before you even start asking your first question. The responses you receive will then no longer be reliable.

So, is it possible to regain mastery of AI within the framework of software development? How do we not lose our critical thinking and continue to exercise it in the face of this ease of code generation? How do we become an orchestrator and not just a simple observer?

## Objectives

Software development constitutes a fundamental pillar of progress in research and industry. It is therefore essential to support developers in the face of business changes induced by the integration of LLMs and AI agents.

This course aims to provide an overview of existing tools, models, and their operating mechanisms. It also aims to develop critical thinking regarding potential misuses associated with their usage, in order to promote ethical and responsible use of these technologies.

The program will include many practical sections so that participants can, at the end of the course, integrate these tools into their daily practices.

## Target Audience and Prerequisites

- **Audience**: anyone engaged in software development activities.
- **Prerequisites**: programming experience (at least 1-2 years); no AI expertise required, although minimal experience is a plus.
- **Level**: junior to advanced.

## References

1. [https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
2. [https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html](https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html)
3. [https://youtu.be/tbDDYKRFjhk?t=549](https://youtu.be/tbDDYKRFjhk?t=549)
4. [https://arxiv.org/abs/2307.03172](https://arxiv.org/abs/2307.03172)
5. [https://agentpatterns.ai/context-engineering/context-window-dumb-zone/](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
6. [https://www.youtube.com/watch?v=rmvDxxNubIg](https://www.youtube.com/watch?v=rmvDxxNubIg)