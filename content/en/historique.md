# History

::: tip Objectives of this module
- Place on a timeline the techniques that have appeared since the release of ChatGPT, from code completion to the harness
:::

LLMs and their ecosystem have evolved at an incredible pace. Remember that ChatGPT was released to the general public in late November 2022. Since then, techniques and tools have multiplied:

- **2022: intelligent completion**. Models begin to predict and complete code on the fly, directly in the editor, like classic autocomplete, but powered by LLMs trained on billions of lines of public code.
- **2022-2023: prompt engineering**. With ChatGPT available to the general public, developers discover that the phrasing of the question significantly changes the quality of the LLM's response. Prompt engineering consists of building very precise and structured instructions to obtain better results.
- **2023-2024: RAG (Retrieval-Augmented Generation)**. The LLM alone does not know your specific codebase or your internal documentation. RAG augments the model's knowledge by providing it with relevant documents before it responds.
- **2023-2024: agent (LLM + tools)**. Instead of asking a question and receiving an answer, the model is given the means to act: execute code, query a database, call an API, read files.
- **Late 2024: MCP (Model Context Protocol)**. An open standard from Anthropic that standardizes how LLMs communicate with external tools. MCP defines a unified protocol: any LLM implementing the protocol can use any tool implementing MCP (files, APIs, databases, etc.).
- **2025: context engineering**. An extension of prompt engineering: it is no longer just about phrasing the question well, but about optimizing the entire context provided to the model, from the choice of documents to history management, the structuring of information, and the relevance of examples.
- **2025: harness**. A framework that assembles all previous concepts into a coherent system. The harness manages context, available tools, code execution, and permissions, with the goal of a system autonomous enough to work on complex and long tasks.
- **2026: software factory, or dark factory**. Agents write, test, and deliver software based on a specification, without a human writing or reviewing the code. The term *dark factory* comes from industry, where a fully automated factory can run with the lights off. [Dan Shapiro](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/) identifies this in January 2026 as the highest level of his scale of AI usage for programming.

The tools have followed these advances: ChatGPT, Copilot, Claude Code, OpenCode and more recently Pi. The module [Why a harness, and what is it made of?](./act1-harness) revisits this timeline to show which gap each step fills.
