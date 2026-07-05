# What is a harness?

A **harness** is a framework or infrastructure that cohesively integrates the individual components that emerged with LLMs: context management, orchestration of available tools, code execution, permissions, etc.

It is the logical evolution after learning these components separately: assembling them into an integrated and intelligent system. Its role is to build a system that is as autonomous as possible, capable of working on complex and long tasks.

Claude Code is an example of a harness: it orchestrates a language model, a set of tools (reading/writing files, executing commands, web search, etc.) and a permissions policy, to transform an LLM into an agent capable of carrying out an end-to-end task.

## What a harness manages

- **Context**: which information is provided to the model, in what order, and with what freshness.
- **Tools**: which actions the model can trigger (reading a file, running a command, calling an API...).
- **Permissions**: what requires human confirmation, and what can execute autonomously.
- **Execution loop**: how the harness chains model calls, tool execution, and result review.

## Why it matters

The same language model produces very different results depending on the harness surrounding it: the quality of the provided context, the exposed tools, and the guardrails in place often weigh more on the final result than the choice of the model itself.
