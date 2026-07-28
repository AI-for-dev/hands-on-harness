# LLMs in 2026

::: tip Module Objectives
- Know how to categorize a model: its size, architecture, context window, reasoning level, and tool-calling capability
- Understand just enough about how an LLM works to choose the right model for a given role later on
:::

This module is part of the prerequisites, and we are treating it as such. The subject is covered in depth elsewhere, often better than we could do here. Our goal is not to compete with those resources, but to get everyone on the same page before starting the reconstruction. Therefore, we are intentionally staying at the surface level, and we refer you to reference readings for those who wish to dive deeper - starting with [Andrej Karpathy's introduction to large language models][karpathy], a one-hour primer on the question "what is an LLM", followed by his [2025 deep dive][karpathy-deepdive] for anyone who wants the complete training stack.

## What a model actually does

A language model predicts the next word. More precisely, it predicts the next *token*—meaning the next fragment of text—based on everything that precedes it. The text you provide is first broken down into tokens, then the model produces one token at a time, each being added back to the input to predict the next one. The ability to answer a question, write code, or reason emerges from this simple mechanism applied at a very large scale.

This way of working explains two things that will be useful throughout the training. First, the model only "knows" what is in its input or what it learned during training. Second, the quality of what you put in directly affects the quality of what comes out. This is where [« prompt engineering »][weng-prompting] becomes crucial.

However, the landscape has shifted since the first guides. Classic techniques—few-shot examples, chain-of-thought, self-consistency—remain a useful foundation, but their weight has changed: reasoning models now produce the chain-of-thought themselves, which [makes manual guidance less necessary][wolfe-reasoning]; tool calling has become a native feature rather than a phrasing trick; and focus has shifted from optimizing a single prompt to organizing the entire context of an agent, what is now called [« context engineering »][context-engineering]. This is a thread that leads directly to [agent construction][huyen-agents], which we will pick up in Act 2.

## The context window

The model cannot take an infinitely long text into account. It has a **context window**, a maximum number of tokens it can consider at once. This window has grown significantly in recent years, exceeding a million tokens in some recent models.

You might think the problem is solved. It isn't. We've known for a while that models struggle to leverage information located in the middle of a long context, a phenomenon described as [*lost in the middle*][lost-in-the-middle]. In other words, filling the window isn't enough: what matters is what you put in it, and where. This observation alone motivates a large part of the work on context that we will carry out in Act 2.

::: info Nuance regarding recent models
*Lost in the middle* is no longer entirely verified on the latest models. In *needle in a haystack* retrieval tests, recent Anthropic models achieve nearly perfect recall, [over 99% starting with Claude 3 Opus][claude-3-recall], regardless of the information's position in the context. The phenomenon is therefore greatly attenuated for simple fact retrieval; it remains more pronounced as soon as the task requires reasoning over several pieces of information scattered throughout the context. The practical lesson remains the same: being careful about what you put in the window, and where, still pays off.
:::

## Mixture of Experts

Many recent models rely on what is called a **mixture of experts** (*Mixture of Experts*, or MoE) architecture, for which Hugging Face provides an [illustrated presentation][hf-moe]. The idea is not to activate the entire network for every token, but only a small part, [dynamically chosen][wolfe-moe]. A model can thus have a very high total number of parameters while activating only a fraction of them at each step.

The practical consequence is that a distinction must be made between total parameters and active parameters. The former provide information on the model's capacity and the memory required to load it; the latter on its computational cost and speed. Two models announced with the same number of parameters can behave very differently based on this distinction.

A few examples among open models, where the gap between total and active parameters is obvious for MoE models:

| Year | Model                   | Architecture | Total parameters | Active parameters |
| ----- | ------------------------ | ------------ | ----------------- | ----------------- |
| 2025  | Kimi K2 (Moonshot AI)    | MoE          | 1,000 B          | 32 B             |
| 2024  | DeepSeek-V3              | MoE          | 671 B            | 37 B             |
| 2025  | Llama 4 Maverick (Meta)  | MoE          | 400 B            | 17 B             |
| 2025  | Qwen3-235B-A22B          | MoE          | 235 B            | 22 B             |
| 2026  | Gemma 4 26B A4B (Google) | MoE          | 26 B             | 4 B              |
| 2026  | Gemma 4 31B (Google)     | Dense        | 31 B             | 31 B             |
| 2025  | Qwen3-32B                | Dense        | 32 B             | 32 B             |
| 2025  | Mistral Small 3          | Dense        | 24 B             | 24 B             |

On a dense model, both columns are identical: the entire network is activated for every token. On an MoE, the gap can be considerable - DeepSeek-V3 loads 671 billion parameters but only activates 37 billion at each step. Large proprietary models (GPT, Claude, Gemini) are widely assumed to also rely on MoE, but since their architecture is not disclosed, we will stick to open models here.

The model name often provides the first clue. The `A<n>B` suffix, for *Active `<n>` Billion*, indicates the number of active parameters: "Gemma 4 26B A4B" denotes 26 billion total parameters but 4 billion active, and "Qwen3-235B-A22B" 235 billion total with 22 billion active. A dense model never carries this suffix, as active and total parameters are the same. However, be careful: this convention is not universal - Kimi K2 or DeepSeek-V3 are indeed MoEs without showing it in their name. The reliable approach remains checking the model card, where both counts are listed.

## Reasoning level

A model can respond instantly or take time to "think" before concluding. Since late 2024, a family of **reasoning models** has turned this second approach into a full mode: before producing its answer, the model generates a long chain of intermediate tokens - step-by-step reasoning - which is not necessarily shown to the user, but significantly improves results on difficult tasks: mathematics, code, planning, and multi-step problems.

This is a fundamental shift. Until then, a model was primarily improved by training it longer on more data. Here, quality is gained by letting it spend more compute *at response time* - what is called [*test-time compute*][wolfe-reasoning]. The movement evolved quickly: [OpenAI o1][openai-reasoning] in September 2024, [DeepSeek-R1][deepseek-r1] in January 2025, then Claude 3.7 Sonnet's *extended thinking* in February 2025. In a few months, inference-time reasoning became a standard.

This extra reasoning comes at a cost: it consumes many tokens and increases response time. As a result, most of these models allow you to adjust the reasoning effort, from a fast and economical mode to deep thinking. The key is to use it only when it adds value. This is directly linked to the choice of model according to the role, discussed below: a planner benefits from reasoning at length, while a constrained executor does not need it and would be unnecessarily expensive.

## Tool calling

A model that only produces text cannot act. To become an agent, it must be able to trigger actions: reading a file, executing a command, querying an API. This is the role of **tool calling**. The model does not perform the action itself; it produces a structured request, which the harness executes, before sending the result back to it.

This capability is recent in the history of LLMs. It was first explored in research—the [*ReAct*][react] paradigm (reason then act) in late 2022, then [*Toolformer*][toolformer] in early 2023—before becoming a full-fledged API feature: OpenAI introduced [*function calling*][openai-function-calling] in June 2023, and Anthropic opened tool calling for Claude in beta in late 2023, before its [general availability in May 2024][claude-tool-use-ga]. In less than two years, we have thus moved from a simple text model to an agent capable of acting.

This capability is the prerequisite for everything that follows. A harness is precisely what organizes this loop between the model and the tools, and a significant part of the training consists of rebuilding its inner workings.

## Where to find models and their specifications?

All the figures from the previous table, and many others, can be found in the same place. Open models are now published on the [Hugging Face *Hub*][hf-hub], a platform that hosts model weights, documentation, and ways to try them. This is the first place to look when trying to locate a model.

Each model there has a **model card**, a README written by the publisher. It contains the essentials of what interests us in this module: model size, architecture (dense or MoE, number of experts), context window, supported languages and modalities, results on major benchmarks, and the license. The latter is not a minor detail: a permissive license like Apache 2.0 does not allow the same uses as a "community" license with restrictions, and it must be read before considering deployment.

For technical details that the model card sometimes omits, the model's `config.json` file provides the raw configuration: internal dimensions, number of layers, number of experts, and the number of active experts for an MoE. This is where the gap between total and active parameters mentioned above is confirmed, with figures to back it up.

Finally, the Hub is not just for consulting. Its filters allow exploring models by task, size, or license; comparative rankings help navigate a fast-moving offering; and quantized versions (often in GGUF format), which are lighter, make some models executable on modest machines. We will return to this when it comes to running a model locally.

## Choosing a model according to the role

All of this is for practical purposes. When we build agents, we will assign them distinct roles, and these roles do not require the same model. An agent responsible for planning benefits from relying on a solid model capable of extensive reasoning. An agent executing a repetitive and well-defined task, on the other hand, benefits from using a fast and cost-effective model.

The best way to develop an intuition is still to try it out. Free websites allow you to submit the same prompt to two models and compare their responses side-by-side. The most useful is [LMArena][lmarena] (formerly *Chatbot Arena*): its *side-by-side* mode lets you choose the two models to compare without even creating an account; its *battle* mode, where two anonymous models respond and you vote, also feeds a comparative leaderboard. [Hugging Face Chat][hf-chat] and [OpenRouter][openrouter] offer the same kind of trials across a wide catalog. Nothing beats running your own prompt on both a fast model and a reasoning model to concretely feel what each brings and what it costs. This is what we will see, moreover, in the first part of the training.

## References

- Andrej Karpathy, [Intro to Large Language Models][karpathy] - a one-hour introduction to the question "what is an LLM".
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive] - a 3.5-hour deep dive (2025) into the entire training stack, for further exploration.
- Lilian Weng, [Prompt Engineering][weng-prompting] - an overview of classic prompting techniques, to be read as a historical foundation.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering] - the shift from prompt optimization to agent context architecture.
- Chip Huyen, [Agents][huyen-agents] - a recent and neutral guide on agents: tools, planning, failure modes.
- Liu et al., [Lost in the Middle][lost-in-the-middle] - the paper that highlighted the poor utilization of the middle of the context.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall] - nearly perfect recall (over 99%) on the *needle in a haystack* test, regardless of position in the context.
- Hugging Face, [Mixture of Experts Explained][hf-moe] - an illustrated presentation of the mixture of experts.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe] - a technical deep dive into the routing and functioning of MoE architectures.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning] - how o1 and DeepSeek-R1 reason via long chains of thought and inference-time compute.
- OpenAI, [Learning to reason with LLMs][openai-reasoning] - the presentation of reasoning models (o1) and *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1] - the paper describing an open reasoning model.
- Yao et al., [ReAct][react] - the "reason then act" paradigm.
- Schick et al., [Toolformer][toolformer] - a model that learns to call tools.
- OpenAI, [Function calling and other API updates][openai-function-calling] - the introduction of API-side tool calling (June 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga] - the general availability of tool calling on Claude (May 2024).
- Hugging Face, [Model Hub][hf-hub] - the platform where open models and their cards are published.

## Tools

- [LMArena][lmarena] - compare two models side-by-side on the same prompt.
- Hugging Face, [Chat][hf-chat] - try open models online.
- [OpenRouter][openrouter] - access a large catalog of models via a single interface.

[karpathy]: https://www.youtube.com/watch?v=zjkBMFhNj_g
[karpathy-deepdive]: https://www.youtube.com/watch?v=7xTGNNLPyMI
[weng-prompting]: https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/
[context-engineering]: https://www.philschmid.de/context-engineering
[huyen-agents]: https://huyenchip.com/2025/01/07/agents.html
[lost-in-the-middle]: https://arxiv.org/abs/2307.03172
[claude-3-recall]: https://www.anthropic.com/news/claude-3-family
[hf-moe]: https://huggingface.co/blog/moe
[wolfe-moe]: https://cameronrwolfe.substack.com/p/moe-llms
[wolfe-reasoning]: https://cameronrwolfe.substack.com/p/demystifying-reasoning-models
[react]: https://arxiv.org/abs/2210.03629
[toolformer]: https://arxiv.org/abs/2302.04761
[openai-function-calling]: https://openai.com/index/function-calling-and-other-api-updates/
[claude-tool-use-ga]: https://www.anthropic.com/news/tool-use-ga
[hf-hub]: https://huggingface.co/models
[openai-reasoning]: https://openai.com/index/learning-to-reason-with-llms/
[deepseek-r1]: https://arxiv.org/abs/2501.12948
[lmarena]: https://lmarena.ai
[hf-chat]: https://huggingface.co/chat
[openrouter]: https://openrouter.ai
