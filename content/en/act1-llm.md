# LLMs in 2026

::: tip Module objectives
- Know how to position a model: its size, architecture, context window, reasoning level, and ability to call tools
- Understand just enough about how an LLM works to later choose the right model according to the role assigned to it
:::

This module is part of the prerequisites, and we treat it as such. The subject is covered in depth elsewhere, often better than we could do here. Our goal is not to compete with these resources, but to bring everyone to the same level to tackle the reconstruction. We therefore deliberately stay on the surface, and refer to reference readings for those who wish to go deeper - starting with Andrej Karpathy's [introduction to large language models][karpathy], a one-hour primer on the question "what is an LLM", followed by his [2025 deep dive][karpathy-deepdive] for those who want the complete training stack.

## What a model does, fundamentally

A language model predicts the next word. More precisely, it predicts the next *token*, i.e. the next fragment of text, based on everything that precedes it. The text you give it is first split into tokens, then the model produces one token at a time, each one being added to the input to predict the next one. The ability to answer a question, write code, or reason emerges from this simple mechanism applied at a very large scale.

This way of operating explains two things that will serve us throughout the course. First, the model only "knows" what is in its input or what it has learned during training. Second, the quality of what you put in directly weighs on the quality of what comes out. This is where [prompt engineering][weng-prompting] is crucial.

The landscape has moved on since the first guides. Classic techniques - in-context examples, chain of thought, self-consistency - remain a useful foundation, but their weight has changed: reasoning models now produce the chain of thought themselves, which [makes manual guidance less necessary][wolfe-reasoning]; tool calling has become a native feature rather than a prompt formatting trick; and attention has shifted from optimizing an isolated prompt to organizing the entire context of an agent, known today as [context engineering][context-engineering]. This thread leads straight to [agent construction][huyen-agents], which we will revisit in Part 2.

## The context window

The model cannot take into account an infinitely long text. It has a **context window**, a maximum number of tokens it can consider at once. This window has grown significantly in recent years, exceeding one million tokens on some recent models.

One might think the problem is solved. It is not. We have known for a while that models exploit information located in the middle of a long context poorly, a phenomenon described as [*lost in the middle*][lost-in-the-middle]. In other words, filling the window is not enough: what matters is what you put in it, and where. This observation alone motivates much of the context-related work we will carry out in Part 2.

::: info Nuance on recent models
*Lost in the middle* is no longer entirely true for the latest models. On *needle in a haystack* retrieval tests, recent Anthropic models achieve near-perfect recall, [exceeding 99% with Claude 3 Opus][claude-3-recall], regardless of the information's position in the context. The phenomenon is therefore strongly attenuated for simple fact retrieval; it remains more pronounced when the task requires reasoning over multiple pieces of information dispersed in the context. The practical lesson does not change: caring about what you put in the window, and where, remains worthwhile.
:::

## Mixture of Experts

Many recent models are based on an architecture called **mixture of experts** (MoE), which Hugging Face presents in an [illustrated overview][hf-moe]. The idea is not to activate the entire network for each token, but only a small part, [chosen dynamically][wolfe-moe]. A model can thus display a very high total number of parameters while activating only a fraction of them at each step.

The practical consequence is that one must distinguish between total parameters and active parameters. The former inform on the model's capacity and the memory needed to load it; the latter on its computation cost and speed. Two models announced with the same number of parameters may behave very differently depending on this distinction.

Some examples among open models, where the gap between total and active parameters jumps out when it comes to an MoE:

| Year  | Model                    | Architecture | Total Parameters | Active Parameters |
| ----- | ------------------------ | ------------ | ---------------- | ----------------- |
| 2025  | Kimi K2 (Moonshot AI)    | MoE          | 1,000B           | 32B               |
| 2024  | DeepSeek-V3              | MoE          | 671B             | 37B               |
| 2025  | Llama 4 Maverick (Meta)  | MoE          | 400B             | 17B               |
| 2025  | Qwen3-235B-A22B          | MoE          | 235B             | 22B               |
| 2026  | Gemma 4 26B A4B (Google) | MoE          | 26B              | 4B                |
| 2026  | Gemma 4 31B (Google)     | Dense        | 31B              | 31B               |
| 2025  | Qwen3-32B                | Dense        | 32B              | 32B               |
| 2025  | Mistral Small 3          | Dense        | 24B              | 24B               |

On a dense model, the two columns are identical: the entire network is activated for each token. On an MoE, the gap can be considerable - DeepSeek-V3 loads 671 billion parameters but activates only 37 at each step. Major proprietary models (GPT, Claude, Gemini) are widely assumed to also rely on MoE, but their architecture is not disclosed, and we therefore stick here to open models.

The model name often gives a first clue. The `A<n>B` suffix, for *Active `<n>` Billion*, indicates the number of active parameters: "Gemma 4 26B A4B" designates 26 billion parameters in total but 4 billion active, and "Qwen3-235B-A22B" 235 billion for 22 active. A dense model never carries this suffix, as active and total coincide. However, be careful: this convention is not universal - Kimi K2 or DeepSeek-V3 are indeed MoEs without displaying it in their name. The reliable reflex remains to check the model card, where both counts are announced.

## The reasoning level

A model can answer on the spot, or take the time to "think" before concluding. Since late 2024, a family of **reasoning models** has made this second manner a distinct mode: before producing its answer, the model generates a long chain of intermediate tokens - a step-by-step reflection - which is not necessarily shown to the user, but significantly improves results on difficult tasks: mathematics, code, planning, multi-step problems.

This is a fundamental shift. Until then, one improved a model mainly by training it longer on more data. Here, one gains quality by letting it spend more computation *at the time of answering* - what is called [*test-time compute*][wolfe-reasoning]. The movement happened quickly: [OpenAI o1][openai-reasoning] in September 2024, [DeepSeek-R1][deepseek-r1] in January 2025, followed by Claude 3.7 Sonnet's *extended thinking* in February 2025. In just a few months, reasoning at inference became a standard.

This extra reflection comes at a cost: it consumes many tokens and increases response time. Therefore, most of these models allow tuning the reasoning effort, from a fast and economical mode to deep reflection. The art lies in mobilizing it only when it brings value. This is directly linked to the model choice according to the role, below: a planner benefits from reasoning at length, while a constrained executor does not need it and would cost unnecessarily.

## Tool calling

A model that only produces text cannot act. For it to become an agent, it must be able to trigger actions: read a file, execute a command, query an API. This is the role of **tool calling**. The model does not perform the action itself; it produces a structured request, which the harness executes, before sending the result back to it.

This capability is recent on the scale of LLM history. It was first explored in research - the [*ReAct*][react] paradigm (reason then act) in late 2022, then [*Toolformer*][toolformer] in early 2023 - before becoming a distinct API feature: OpenAI introduced [*function calling*][openai-function-calling] in June 2023, and Anthropic opened tool calling on Claude in beta in late 2023, before its [general availability in May 2024][claude-tool-use-ga]. In less than two years, we have thus gone from a simple text model to an agent capable of acting.

This capability is the prerequisite for everything that follows. A harness is precisely what organizes this loop between the model and the tools, and much of the training consists in rebuilding its mechanisms.

## Where to find models and their specifics?

All the figures in the previous table, and many others, can be read in the same place. Open models are today published on the [*Hugging Face Hub*][hf-hub], a platform that hosts both model weights, their documentation, and means to try them. It is the first reflex when trying to locate a model.

Each model has a **model card** on the Hub, a README written by the publisher. There you will find the essentials that interest us in this module: the model size, its architecture (dense or MoE, number of experts), its context window, supported languages and modalities, results on benchmarks, and the usage license. This last point is not trivial: a permissive license like Apache 2.0 does not open the same uses as a "community" license with restrictions, and it must be read before considering deployment.

For technical details that the model card sometimes glosses over, the model's `config.json` file gives the raw configuration: internal dimensions, number of layers, number of experts, and number of active experts for an MoE. This is where one confirms, with numbers, the gap between total and active parameters mentioned above.

Finally, the Hub is not just for viewing. Its filters allow exploring models by task, size, or license; comparative rankings help navigate an offer that moves quickly; and quantized versions (often in GGUF format), which are lighter, make some models executable on a modest machine. We will return to this when it comes to running a model locally.

## Choosing a model according to the role

All of this has a practical aim. When we build agents, we will assign them distinct roles, and these roles do not call for the same model. An agent tasked with planning benefits from relying on a solid model, capable of long reasoning. An agent that executes a repetitive and well-defined task benefits, for its part, from relying on a fast and economical model.

The best way to build intuition remains to try. Free sites allow submitting the same prompt to two models and comparing their responses side by side. The most useful is [LMArena][lmarena] (formerly *Chatbot Arena*): its *side-by-side* mode lets you choose the two models to confront, without even creating an account; its *battle* mode, where two anonymous models answer and you vote, feeds a comparative ranking. [Hugging Face Chat][hf-chat] and [OpenRouter][openrouter] offer the same kind of trial on a large catalog. Nothing beats replaying your own prompt on a fast model and on a reasoning model to feel, concretely, what each brings and what it costs. This is what we will see in the first part of the course.

## References

- Andrej Karpathy, [Intro to Large Language Models][karpathy] - a one-hour primer on the question "what is an LLM".
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive] - a 3h30 (2025) deep dive into the entire training stack, to go deeper.
- Lilian Weng, [Prompt Engineering][weng-prompting] - a panorama of classic prompting techniques, to read as a historical foundation.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering] - the shift from optimizing a prompt to architecting an agent's context.
- Chip Huyen, [Agents][huyen-agents] - a recent and neutral guide on agents: tools, planning, failure modes.
- Liu et al., [Lost in the Middle][lost-in-the-middle] - the article that highlighted the poor exploitation of the middle of the context.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall] - near-perfect recall (over 99%) on the *needle in a haystack* test, regardless of position in the context.
- Hugging Face, [Mixture of Experts Explained][hf-moe] - an illustrated presentation of mixture of experts.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe] - a technical deep dive into the routing and functioning of MoE architectures.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning] - how o1 and DeepSeek-R1 reason via long chains of thought and inference-time compute.
- OpenAI, [Learning to reason with LLMs][openai-reasoning] - the presentation of reasoning models (o1) and *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1] - the paper describing an open reasoning model.
- Yao et al., [ReAct][react] - the "reason then act" paradigm.
- Schick et al., [Toolformer][toolformer] - a model that learns to call tools.
- OpenAI, [Function calling and other API updates][openai-function-calling] - the introduction of tool calling on the API side (June 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga] - general availability of tool calling on Claude (May 2024).
- Hugging Face, [the model Hub][hf-hub] - the platform where open models and their cards are published.

## Tools

- [LMArena][lmarena] - compare two models side by side on the same prompt.
- Hugging Face, [Chat][hf-chat] - try open models online.
- [OpenRouter][openrouter] - access a wide catalog of models via a single interface.

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