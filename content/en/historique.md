# History

::: tip Objectives of this module
- Place on a timeline the techniques that have appeared since the release of ChatGPT, from code completion to the harness
:::

LLMs and their ecosystem have evolved at an incredible pace. Remember that ChatGPT was released to the general public in late November 2022. Since then, techniques and tools have multiplied:

- **2022: intelligent completion**. Models start predicting and completing code on the fly, directly in the editor, like classic autocomplete, but powered by LLMs trained on billions of lines of public code.
- **2022-2023: prompt engineering**. With ChatGPT available to the general public, developers discover that the wording of the question greatly changes the quality of the LLM's answer. Prompt engineering consists of building very precise, structured instructions to get better results.
- **2023-2024: RAG (Retrieval-Augmented Generation)**. The LLM alone does not know your specific codebase or internal documentation. RAG augments the model's knowledge by providing it with relevant documents before answering.
- **2023-2024: agent (LLM + tools)**. Instead of asking a question and receiving an answer, you give the model the means to act: run code, query a database, call an API, read files.
- **Late 2024: MCP (Model Context Protocol)**. An open standard from Anthropic that normalizes how LLMs communicate with external tools. MCP defines a unified protocol: any LLM implementing the protocol can use any tool implementing MCP (files, APIs, databases, etc.).
- **2025: context engineering**. An extension of prompt engineering: it is no longer just about wording the question well, but about optimizing the whole context provided to the model, from document selection to history management, including the structuring of information and the relevance of examples.
- **2025: harness**. A framework that assembles all the previous concepts into a coherent system. The harness manages context, available tools, code execution and permissions, with the goal of a system autonomous enough to work on complex, long-running tasks.

The tools have followed these advances: ChatGPT, Copilot, Claude Code, OpenCode and more recently Pi. The module [Why a harness, and what is it made of?](./act1-harness) revisits this timeline to show which gap each step fills.
