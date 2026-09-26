# LLMs in 2026

::: tip Module objectives
- Know how to situate a model: its size, its architecture, its context window, its reasoning level, its ability to call tools
- Understand just enough of how an LLM works to choose the right model later, depending on the role you assign it
:::

This module is part of the prerequisites, and we treat it as such. The topic is covered in depth elsewhere, often better than we could do here. Our goal is not to compete with those resources, but to bring everyone to the same level before tackling the reconstruction. We therefore deliberately stay at the surface, and point to reference reading for those who want to go deeper, starting with [Andrej Karpathy's introduction to large language models][karpathy], a one-hour warm-up on the question "what is an LLM", extended by his [detailed 2025 course][karpathy-deepdive] for anyone who wants the full training stack.

## What a model does, fundamentally

A language model predicts the next word. More precisely, it predicts the next *token*, that is, the next fragment of text, based on everything that precedes it. The text you give it is first split into tokens, then the model produces one token at a time, each one added to the input to predict the next. The ability to answer a question, write code, or reason emerges from this simple mechanism applied at very large scale.

This way of working explains two things that will serve us throughout the training. On the one hand, the model only "knows" what is in its input or what it learned during training. On the other hand, the quality of what you put in bears directly on the quality of what comes out. That is where ["prompt engineering"][weng-prompting] really matters.

The ground has nonetheless shifted since the early guides. The classic techniques (in-context examples, chain of thought, self-consistency) remain a useful foundation, but their weight has changed: reasoning models now produce the chain of thought on their own, which [makes manual guidance less necessary][wolfe-reasoning]; tool calling has become a native feature rather than a phrasing trick; and attention has shifted from optimizing an isolated prompt to organizing an agent's entire context, what is now called ["context engineering"][context-engineering]. It is a thread that leads straight to [building agents][huyen-agents], and that we will pick up again in act 2.

## The context window

The model cannot take an infinitely long text into account. It has a **context window**, a maximum number of tokens it can consider at once. This window has grown considerably in recent years, to the point of exceeding a million tokens on some recent models.

Yet this growth does not solve the problem, because models make poor use of information located in the middle of a long context, a phenomenon known as [*lost in the middle*][lost-in-the-middle]. Filling the window is therefore not enough: what matters is what you put in it, and where. This observation alone drives much of the work on context that we will carry out in Act 2.

::: info A nuance about recent models
The *lost in the middle* effect no longer fully holds on the latest models. On *needle-in-a-haystack* retrieval tests, Anthropic's recent models achieve near-perfect recall, [above 99% as early as Claude 3 Opus][claude-3-recall], regardless of where the information sits in the context. The effect therefore weakens considerably for simple fact retrieval; it remains more pronounced as soon as the task requires reasoning over several pieces of information scattered across the context. The practical lesson does not change: being careful about what you put in the window, and where, still pays off.
:::

## Mixture of experts

Many recent models rely on an architecture called **mixture of experts** (*Mixture of Experts*, or MoE), for which Hugging Face offers an [illustrated overview][hf-moe]. The idea is not to activate the whole network at each token, but only a small part, [chosen dynamically][wolfe-moe]. A model can therefore advertise a very high total parameter count while activating only a fraction of them at each step.

The practical consequence is that you need to distinguish total parameters from active parameters. The former provide information about the model's capacity and the memory needed to load it; the latter about its compute cost and speed. Two models announced with the same number of parameters can behave very differently depending on this distinction.

A few examples from open models, where the gap between total and active parameters is obvious whenever a MoE is involved:

| Year | Model                   | Architecture | Total parameters | Active parameters |
| ----- | ------------------------ | ------------ | ----------------- | ----------------- |
| 2025  | Kimi K2 (Moonshot AI)    | MoE          | 1T                | 32B               |
| 2024  | DeepSeek-V3              | MoE          | 671B              | 37B               |
| 2025  | Llama 4 Maverick (Meta)  | MoE          | 400B              | 17B               |
| 2025  | Qwen3-235B-A22B          | MoE          | 235B              | 22B               |
| 2026  | Gemma 4 26B A4B (Google) | MoE          | 26B               | 4B                |
| 2026  | Gemma 4 31B (Google)     | Dense        | 31B               | 31B               |
| 2025  | Qwen3-32B                | Dense        | 32B               | 32B               |
| 2025  | Mistral Small 3          | Dense        | 24B               | 24B               |

On a dense model, the two columns are identical: the whole network is activated at each token. On a MoE, the gap can be considerable: DeepSeek-V3 loads 671 billion parameters but only activates 37 at each step. Large proprietary models (GPT, Claude, Gemini) are widely assumed to rely on MoE too, but their architecture is not disclosed, so here we stick to open models.

The model name often gives a first hint. The `A<n>B` suffix, for *Active `<n>` Billion*, announces the number of active parameters: “Gemma 4 26B A4B” refers to 26 billion parameters in total but 4 billion active, and “Qwen3-235B-A22B” 235 billion for 22 active. A dense model never carries this suffix, since active and total parameters are one and the same. Note, however, that this convention is not universal: Kimi K2 or DeepSeek-V3 are indeed MoE without displaying it in their name. The reliable reflex is to check the model card, where both counts are stated.

## The reasoning level

A model can answer on the spot, or take the time to “think” before concluding. Since late 2024, a family of **reasoning models** has made this second way a mode of its own: before producing its answer, the model generates a long chain of intermediate tokens, a step-by-step reflection that is not necessarily shown to the user, but that clearly improves results on difficult tasks (mathematics, code, planning, multi-step problems).

This is a fundamental change. Until then, you improved a model mainly by training it longer on more data. Here, you gain quality by letting it spend more computation *at answer time*, what is called [*test-time compute*][wolfe-reasoning]. The movement unfolded quickly: [OpenAI o1][openai-reasoning] in September 2024, [DeepSeek-R1][deepseek-r1] in January 2025, then the *extended thinking* of Claude 3.7 Sonnet in February 2025. Within a few months, inference-time reasoning became a standard.

This extra thinking has a cost: it consumes many tokens and lengthens response time. That is why most of these models let you adjust the reasoning effort, from a fast and economical mode up to deep thinking. The whole art is to use it only when it adds something. This is directly linked to choosing the model by role, below: a planner benefits from reasoning at length, a constrained executor does not need it and would be needlessly expensive.

## Tool calling

A model that only produces text cannot act. For it to become an agent, it must be able to trigger actions: read a file, run a command, query an API. This is the role of **tool calling**. The model does not perform the action itself; it produces a structured request, which the harness executes, before sending the result back to it.

This capability is recent by the standards of LLM history. It was first explored on the research side, with the [ReAct][react] paradigm (reason then act) in late 2022, then [Toolformer][toolformer] in early 2023, before becoming a full-fledged API feature: OpenAI introduced [function calling][openai-function-calling] in June 2023, and Anthropic launched tool calling on Claude in beta in late 2023, before its [general availability in May 2024][claude-tool-use-ga]. In less than two years, we thus went from a simple text model to an agent capable of acting.

This capability is the prerequisite for everything that follows. A harness is precisely what organizes this loop between the model and the tools, and a good part of the training consists in rebuilding its inner workings.

## Where to find models and their specifics?

All the figures in the previous table, and many more, can be read in the same place. Open models are now published on the [Hugging Face Hub][hf-hub], a platform that hosts the model weights, their documentation, and a way to try them out. It's the first reflex when you're trying to situate a model.

Each model has a **model card** there, a README written by the publisher. There you'll find the essentials of what interests us in this module: the model's size, its architecture (dense or MoE, number of experts), its context window, the languages and modalities supported, the results on the major benchmarks, and the usage license. You read the license before considering deployment, because a permissive license like Apache 2.0 does not open up the same uses as a "community" license with restrictions.

For the technical details the model card sometimes omits, the model's `config.json` file gives the raw configuration: internal dimensions, number of layers, number of experts and number of active experts for an MoE. That's where you confirm, numbers in hand, the gap between total and active parameters mentioned earlier.

Finally, the Hub is not just for browsing. Its filters let you explore models by task, size, or license; comparative leaderboards help you get your bearings in a fast-moving offering; and the quantized versions (often in GGUF format), being lighter, make certain models runnable on a modest machine. We'll come back to this when it comes to running a model locally.

## Choosing a model according to its role

All of this has a practical aim. When we build agents, we will assign them distinct roles, and these roles do not call for the same model. An agent tasked with planning benefits from relying on a solid model, capable of reasoning at length. An agent that executes a repetitive, well-scoped task benefits, for its part, from a fast and economical model.

The best way to build an intuition is still to try things out. Free websites let you submit the same prompt to two models and compare their answers side by side. The most useful is [LMArena][lmarena] (formerly *Chatbot Arena*): its *side-by-side* mode lets you choose the two models to compare, without even creating an account; its *battle* mode, where two anonymous models respond and you vote, also feeds a comparative leaderboard. [Hugging Face Chat][hf-chat] and [OpenRouter][openrouter] offer the same kind of testing across a large catalog. Nothing beats running your own prompt on a fast model and on a reasoning model to feel, concretely, what each brings and what it costs. This is precisely what we will see in the first part of the training.

## References

- Andrej Karpathy, [Intro to Large Language Models][karpathy]: a one-hour warm-up on the question "what is an LLM".
- Andrej Karpathy, [Deep Dive into LLMs like ChatGPT][karpathy-deepdive]: a 3.5-hour course (2025) covering the entire training stack, for going deeper.
- Lilian Weng, [Prompt Engineering][weng-prompting]: an overview of classic prompting techniques, to read as a historical foundation.
- Philipp Schmid, [The New Skill in AI is Not Prompting, It's Context Engineering][context-engineering]: the shift from optimizing a prompt to architecting an agent's context.
- Chip Huyen, [Agents][huyen-agents]: a recent, neutral guide to agents: tools, planning, failure modes.
- Liu et al., [Lost in the Middle][lost-in-the-middle]: the paper that highlighted poor use of the middle of the context.
- Anthropic, [Introducing the next generation of Claude][claude-3-recall]: near-perfect recall (above 99%) on the *needle in a haystack* test, regardless of position in the context.
- Hugging Face, [Mixture of Experts Explained][hf-moe]: an illustrated presentation of mixture of experts.
- Cameron R. Wolfe, [Mixture-of-Experts (MoE) LLMs][wolfe-moe]: a technical study of routing and how MoE architectures work.
- Cameron R. Wolfe, [Demystifying Reasoning Models][wolfe-reasoning]: how o1 and DeepSeek-R1 reason through long chains of thought and inference-time compute.
- OpenAI, [Learning to reason with LLMs][openai-reasoning]: the presentation of reasoning models (o1) and *test-time compute*.
- DeepSeek-AI, [DeepSeek-R1][deepseek-r1]: the paper describing an open reasoning model.
- Yao et al., [ReAct][react]: the "reason then act" paradigm.
- Schick et al., [Toolformer][toolformer]: a model that learns to call tools.
- OpenAI, [Function calling and other API updates][openai-function-calling]: the introduction of tool calling on the API side (June 2023).
- Anthropic, [Claude can now use tools][claude-tool-use-ga]: general availability of tool calling on Claude (May 2024).
- Hugging Face, [Model Hub][hf-hub]: the platform where open models and their model cards are published.

## Tools

- [LMArena][lmarena]: compare two models side by side on the same prompt.
- Hugging Face, [Chat][hf-chat]: try open models online.
- [OpenRouter][openrouter]: access a wide catalog of models through a single interface.

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
