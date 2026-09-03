# LLMs in 2026

::: tip Module Objectives
- Know how to categorize a model: its size, architecture, context window, reasoning level, and tool-calling capability
- Understand just enough about how an LLM works to later choose the right model based on the role assigned to it
:::

This module is part of the prerequisites, and we treat it as such. The subject is covered in depth elsewhere, often better than we could do here. Our goal is not to compete with these resources, but to get everyone on the same page to tackle the reconstruction. We therefore deliberately stay on the surface, and we point toward reference readings for those who wish to delve deeper, starting with [Andrej Karpathy's introduction to large language models][karpathy], a one-hour warm-up on the question "what is an LLM", followed by his [detailed 2025 course][karpathy-deepdive] for those who want the full training stack.

## What a Model Actually Does

A language model predicts the next word. More precisely, it predicts the next *token* - that is, the next fragment of text - based on everything that precedes it. The text you give it is first split into tokens, then the model produces one token at a time, each being added to the input to predict the next one. The ability to answer a question, write code, or reason emerges from this simple mechanism applied at a very large scale.

This way of functioning explains two things that will be useful throughout the course. On one hand, the model only "knows" what is in its input or what it learned during training. On the other hand, the quality of what you put in as input directly impacts the quality of what comes out. This is where ["prompt engineering"][weng-prompting] becomes crucial.

However, the landscape has shifted since the first guides. Classic techniques (few-shot prompting, chain-of-thought, self-consistency) remain a useful foundation, but their weight has changed: reasoning models now produce the chain-of-thought themselves, which [makes manual guidance less necessary][wolfe-reasoning]; tool use has become a native feature rather than a formulation trick; and the focus has shifted from optimizing a single prompt to organizing the agent's entire context, which is now called [context engineering][context-engineering]. This is a thread that leads straight to [agent construction][huyen-agents], which we will pick up in act 2.

## The Context Window

The model cannot process an infinitely long text. It has a **context window**, a maximum number of tokens it can consider at one time. This window has grown significantly in recent years, exceeding a million tokens in some recent models.

However, this growth does not solve the problem, as language models struggle to leverage information located in the middle of a long context, a phenomenon known as [*lost in the middle*][lost-in-the-middle]. Filling the window is therefore not enough: what matters is what we put in it, and where. This observation alone motivates much of the work on context that we will do in Act 2.

::: info Nuance regarding recent models
The *lost in the middle* effect is no longer entirely true for the latest models. In *needle in a haystack* retrieval tests, recent models from Anthropic achieve near-perfect recall, [above 99% starting with Claude 3 Opus][claude-3-recall], regardless of the information's position in the context. The phenomenon is therefore significantly reduced for simple fact retrieval; it remains more pronounced as soon as the task requires reasoning over several pieces of information scattered throughout the context. The practical lesson remains the same: carefully managing what you put in the window, and where, still pays off.
:::

## Mixture of Experts

Many recent models rely on what is called a **mixture of experts** (*Mixture of Experts*, or MoE) architecture, which Hugging Face provides an [illustrated presentation][hf-moe] of. The idea is not to activate the entire network for every token, but only a small part, [chosen dynamically][wolfe-moe]. A model can thus have a very high total number of parameters while only activating a fraction of them at each step.

The practical consequence is that you must distinguish between total parameters and active parameters. The former indicate the model's capacity and the memory required to load it; the latter indicate its compute cost and speed. Two models announced with the same number of parameters can behave very differently depending on this distinction.

A few examples among open models, where the gap between total and active parameters is striking as soon as it is a MoE:

| Year | Model                   | Architecture | Total parameters | Active parameters |
| ----- | ------------------------ | ------------ | ----------------- | ----------------- |
| 2025  | Kimi K2 (Moonshot AI)    | MoE          | 1,000 Bn         | 32 Bn            |
| 2024  | DeepSeek-V3              | MoE          | 671 Bn           | 37 Bn            |
| 2025  | Llama 4 Maverick (Meta)  | MoE          | 400 Bn           | 17 Bn            |
| 2025  | Qwen3-235B-A22B          | MoE          | 235 Bn           | 22 Bn            |
| 2026  | Gemma 4 26B A4B (Google) | MoE          | 26 Bn            | 4 Bn             |
| 2026  | Gemma 4 31B (Google)     | Dense        | 31 Bn            | 31 Bn            |
| 2025  | Qwen3-32B                | Dense        | 32 Bn            | 32 Bn            |
| 2025  | Mistral Small 3          | Dense        | 24 Bn            | 24 Bn            |

In a dense model, both columns are identical: the entire network is activated for each token. In an MoE, the gap can be considerable: DeepSeek-V3 loads 671 billion parameters but only activates 37 at each step. Large proprietary models (GPT, Claude, Gemini) are widely assumed to be based on MoE as well, but their architecture is not disclosed, so we will stick to open models here.

The model's name often provides an initial clue. The `A<n>B` suffix, for *Active `<n>` Billion*, indicates the number of active parameters: "Gemma 4 26B A4B" means 26 billion total parameters but 4 billion active, and "Qwen3-235B-A22B" means 235 billion with 22 active. A dense model never carries this suffix, as active and total parameters are the same. However, be aware that this convention is not universal: Kimi K2 or DeepSeek-V3 are indeed MoEs without showing it in their name. The reliable approach remains checking the model's datasheet, where both counts are listed.

## The reasoning level

A model can respond instantly, or take time to "think" before concluding. Since late 2024, a family of **reasoning models** has made this second approach a full-fledged mode: before producing its answer, the model generates a long chain of intermediate tokens—a step-by-step reasoning process that is not necessarily shown to the user, but which significantly improves results on difficult tasks (mathematics, code, planning, multi-step problems).

This is a fundamental shift. Until then, a model was primarily improved by training it longer on more data. Here, quality is gained by letting it spend more computation *at the time of responding*, which is called [*test-time compute*][wolfe-reasoning]. The movement evolved quickly: [OpenAI o1][openai-reasoning] in September 2024, [DeepSeek-R1][deepseek-r1] in January 2025, then *extended thinking* from Claude 3.7 Sonnet in February 2025. In a few months, inference-time reasoning became a standard.

This extra reflection comes at a cost: it consumes many tokens and increases response time. Therefore, most of these models allow you to adjust the reasoning effort, from a fast and economical mode to deep reflection. The art lies in only deploying it when it adds value. This is directly linked to the choice of model by role, further down: a planner benefits from reasoning at length, whereas a constrained executor does not need it and would be unnecessarily expensive.

## Tool calling

A model that only produces text cannot act. To become an agent, it must be able to trigger actions: read a file, execute a command, query an API. This is the role of **tool calling**. The model does not perform the action itself; it produces a structured request, which the harness executes, before sending the result back to it.

This capability is recent in the history of LLMs. It was first explored in research with the [*ReAct*][react] paradigm (reason then act) in late 2022, followed by [*Toolformer*][toolformer] in early 2023, before becoming a full API feature: OpenAI introduced [*function calling*][openai-function-calling] in June 2023, and Anthropic released tool use for Claude in beta in late 2023, before its [general availability in May 2024][claude-tool-use-ga]. In less than two years, we have moved from a simple text model to an agent capable of action.

This capability is the prerequisite for everything that follows. A harness is precisely what organizes this loop between the model and the tools, and a large part of the training consists of rebuilding its inner workings.

## Where to find models and their specifications?

All the figures from the previous table, and many others, can be found in the same place. Open models are now published on the [Hugging Face *Hub*][hf-hub], a platform that hosts model weights, their documentation, and ways to try them. This is the first instinct when trying to locate a model.

Each model has a **model card**, a README written by the publisher. It contains most of what interests us in this module: model size, architecture (dense or MoE, number of experts), context window, supported languages and modalities, results on major benchmarks, and the license. Read the license before considering deployment, as a permissive license like Apache 2.0 allows different uses than a "community" license with restrictions.

For the technical details that the model card sometimes omits, the model's `config.json` file provides the raw configuration: internal dimensions, number of layers, number of experts, and the number of active experts for a MoE. This is where we can confirm, with figures to back it up, the gap between total and active parameters mentioned above.

Finally, the Hub is not just for browsing. Its filters allow you to explore models by task, size, or license; comparative rankings help you find your way in a fast-moving landscape; and quantized versions (often in GGUF format), which are lighter, make some models runnable on a modest machine. We will come back to this when it comes to running a model locally.

## Choosing a model based on the role

All of this is for practical purposes. When we build agents, we will assign them distinct roles, and these roles do not call for the same model. An agent in charge of planning benefits from relying on a solid model capable of extensive reasoning. An agent performing a repetitive and well-defined task benefits, for its part, from relying on a fast and cost-effective model.

The best way to build an intuition is to try it out. Free websites allow you to submit the same prompt to two models and compare their responses side-by-side. The most useful is [LMArena][lmarena] (formerly *Chatbot Arena*): its *side-by-side* mode lets you choose the two models to compare, without even creating an account; its *battle* mode, where two anonymous models respond and you vote, also feeds a comparative leaderboard. [Hugging Face Chat][hf-chat] and [OpenRouter][openrouter] offer the same kind of testing across a large catalog. Nothing beats running your own prompt on a fast model and a reasoning model to get a concrete feel for what each provides and what it costs. This is what we will cover in the first part of the training.

## References

- Andrej Karpathy, [Intro to Large Language Models][karpathy]: a one-hour warm-up on "what is an LLM".
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive]: a 3.5-hour course (2025) on the entire training stack, for further study.
- Lilian Weng, [Prompt Engineering][weng-prompting]: an overview of classic prompting techniques, to be read as a historical foundation.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering]: the shift from prompt optimization toward agent context architecture.
- Chip Huyen, [Agents][huyen-agents]: a recent, neutral guide on agents: tools, planning, failure modes.
- Liu et al., [Lost in the Middle][lost-in-the-middle]: the paper that highlighted poor utilization of the middle of the context.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall]: near-perfect recall (over 99%) on the *needle in a haystack* test, regardless of position in the context.
- Hugging Face, [Mixture of Experts Explained][hf-moe]: an illustrated presentation of Mixture of Experts.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe]: a technical study of routing and the functioning of MoE architectures.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning]: how o1 and DeepSeek-R1 reason via long chains of thought and inference-time compute.
- OpenAI, [Learning to reason with LLMs][openai-reasoning]: the presentation of reasoning models (o1) and *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1]: the paper describing an open reasoning model.
- Yao et al., [ReAct][react]: the "reason then act" paradigm.
- Schick et al., [Toolformer][toolformer]: a model that learns to call tools.
- OpenAI, [Function calling and other API updates][openai-function-calling]: the introduction of tool calling on the API side (June 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga]: general availability of tool calling on Claude (May 2024).
- Hugging Face, [Model Hub][hf-hub]: the platform where open models and their model cards are published.

## Tools

- [LMArena][lmarena]: compare two models side-by-side using the same prompt.
- Hugging Face, [Chat][hf-chat]: try open models online.
- [OpenRouter][openrouter]: access a wide catalog of models via a single interface.

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
