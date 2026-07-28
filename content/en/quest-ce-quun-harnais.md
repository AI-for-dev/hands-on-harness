# What is a harness?

A **harness** is a framework or infrastructure that cohesively integrates the individual building blocks that emerged with LLMs: context management, tool orchestration, code execution, permissions, etc.

It is the logical evolution after learning these blocks separately: assembling them into an integrated and intelligent system. Its role is to build a system that is as autonomous as possible, capable of working on complex and long tasks.

Claude Code is an example of a harness: it orchestrates a language model, a set of tools (file read/write, command execution, web search, etc.), and a permissions policy, to transform an LLM into an agent capable of carrying out a task from end to end.

## What a harness manages

- **Context**: what information is provided to the model, in what order, and with what freshness.
- **Tools**: what actions the model can trigger (read a file, run a command, call an API...).
- **Permissions**: what requires human confirmation and what can run autonomously.
- **The execution loop**: how the harness chains model calls, tool execution, and the review of results.

## Why it matters

The same language model produces very different results depending on the harness surrounding it: the quality of the provided context, the exposed tools, and the guardrails in place often have more impact on the final result than the choice of the model itself.
