# Appendices and glossary

This page first gives readings on the legal, social and environmental questions raised by the use of LLMs in general, and then more specifically in the context of software development. We chose not to cover them in this material, as the [introduction](./) explains, but they matter for deciding whether, and how, you use these tools. It then points to where to find the data for act 3 and ends with a glossary of the terms used in the training, with their English equivalent and the module where they are explained.

## What readings to form an opinion on the risks?

This training shows how to use a coding agent and where we stand in October 2026. It does not say whether you should, because that choice is yours. The texts below take a stance, often a sharp one, and several call for refusing these tools. We chose them because their authors argue from facts, measurements, or their experience as researchers and maintainers. We are at a fork in the road, and it is hard to see clearly. The promotion of LLMs and the media hype aimed at the public are unprecedented. It is not hard to find articles promoting LLMs. So we made the deliberate choice to show you the other side and the impact on society. Read these resources before deciding how much room you leave for AI in your work.

### Should these tools be refused?

- Atécopol, [Faced with generative AI, conscientious objection](https://atecopol.hypotheses.org/13082) (November 2025). This manifesto from the Atelier d'écologie politique de Toulouse addresses higher education, research, and the national education system. It puts forward three reasons to refuse the deployment of generative AI in these institutions: its energy and material cost, the social damage of the industrial chain that produces it, and the power it gives to a few companies. Its signatories, more than three thousand, commit to not using it unless forced. [Reporterre](https://reporterre.net/Nous-sommes-debordes-par-l-IA-chercheurs-ils-refusent-d-utiliser-l-intelligence) (June 2026) gave some of them a voice.
- Florence Maraninchi, [Why I don't use ChatGPT](https://academia.hypotheses.org/58766) (February 2025). The author is a teacher-researcher in computer science and works on critical systems (trains, aircraft, power plants). She explains why she refuses opaque, non-deterministic, and non-testable systems. She also responds to the argument of "ethical" or "sovereign" AIs: even sober, they participate according to her in the general acceptance of these technologies and in the rebound effect.
- Olivier Lefebvre, ["ChatGPT is just a tool!": the blind spots of the instrumental view of technology](https://www.terrestres.org/2025/06/28/chatgpt-cest-juste-un-outil/) (Terrestres, June 2025). The text discusses the argument that Linus Torvalds's quote in the [introduction](./) takes up. Saying that AI is a tool like any other makes one forget the material infrastructures and the human work it requires, and the way it transforms society and everyone's practices.
- Olivia Guest et al., [Against the Uncritical Adoption of 'AI' Technologies in Academia](https://zenodo.org/records/17065099) (September 2025). Eighteen academics ask universities to resist industry marketing and to protect critical thinking, expertise, and scientific integrity. They recall that refusing these tools in one's teaching and research must remain a legitimate position.
- François Levin, [AI as a planetary technology](https://lestempsquirestent.org/en/numeros/numero-9/l-ia-comme-technologie-planetaire) (Les temps qui restent, April 2026). The author seeks a path between two responses: the one that believes a more sober AI will suffice, and the one that rejects AI wholesale. Through the notion of "planetarity", he explores the bifurcations that these technologies still leave open.

### What is the environmental impact?

Each request sent to a model consumes electricity and water, and manufacturing the hardware that serves it also has a cost. Published figures remain rare and come mostly from the companies themselves.

- Danilo Carastan dos Santos, Denis Trystram et al., [Is generative AI sustainable? The real ecological cost of a prompt](https://theconversation.com/lia-generative-est-elle-soutenable-le-vrai-cout-ecologique-dun-prompt-269432) (The Conversation, November 2025). The authors examine the estimate published by Google for Gemini (0.24 Wh and five drops of water per prompt). They show that this low figure rests on scope choices: only Google's data centers are counted, water covers cooling only, and the study, conducted internally, does not say which queries it is based on.
- Alexandra Sasha Luccioni et al., [From Efficiency Gains to Rebound Effects: The Problem of Jevons' Paradox in AI's Polarized Environmental Debate](https://arxiv.org/abs/2501.16548) (FAccT 2025). A more efficient model can increase total consumption, because it makes usage cheaper and therefore more frequent. The authors call for looking at these indirect effects, and not only the emissions of data centers.
- Clément Morand et al., [When rebound effect is not a side effect: analyzing sociotechnical contexts of digital technologies](https://hal.science/hal-05566029) (HAL preprint, March 2026). The authors study two cases, the deployment of 5G in France and the training of deep learning models, starting from the intentions stated by the actors behind them. In both cases, these actors openly announce a goal of growing their activity and use energy efficiency gains to reach it, because these gains open up new uses. The notion of the rebound effect, which presents the rise in consumption as an unintended consequence of efficiency, therefore describes these situations poorly. With this reading grid, optimizing software or making an agent code faster first serves to produce more, and reducing environmental impact is not the goal.
- The Shift Project, [Artificial intelligence, data, computing: what infrastructures in a decarbonised world?](https://theshiftproject.org/en/publications/al-data-and-computing-shaping-infrastructures-for-a-decarbonised-world/) (October 2025). The report studies the electricity consumption of data centers in France and worldwide. It concludes that technical optimization is not enough and that uses must be chosen.
- International Energy Agency, [Key Questions on Energy and AI](https://www.iea.org/reports/key-questions-on-energy-and-ai) (April 2026). The energy consumed by a simple query drops by at least an order of magnitude per year, but reasoning tasks and agentic tasks, such as those of a coding agent, consume hundreds to thousands of times more per query. The electricity consumption of data centers rose by 17% in 2025, and that of AI-dedicated centers by 50%. The Agency forecasts a doubling between 2025 and 2030, from 485 to 950 TWh, and calls on companies to publish their consumption systematically.
- Emma Bougerol, [Generative AI has the potential to destroy the planet (but not in the way you think)](https://basta.media/l-ia-generative-a-le-potentiel-de-detruire-la-planete-mais-pas-comme-vous-le) (Basta!, February 2025). Written at the time of the Paris AI summit, the article links the investments announced in data centers to their electricity consumption and gathers the available estimates.
- Anaëlle Beignon et al., [Imposing AI: Deceptive design patterns against sustainability](https://arxiv.org/abs/2508.08672) (2025). The authors document how software vendors impose AI, by putting its functions in place of existing functions and by spreading narratives that make it harder to refuse to use it. They rank these practices among *deceptive patterns* and highlight their environmental cost.

To estimate the impact of your own usage, the [EcoLogits](https://github.com/genai-impact/ecologits) library computes the energy and emissions of a request from the model size and the number of tokens produced. The [compar:IA](https://comparia.beta.gouv.fr/) comparator from beta.gouv.fr shows this estimate next to each answer. The levers seen in the training, such as a short `AGENTS.md`, filtered tool outputs or a smaller model for well-scoped tasks, reduce the number of tokens processed.

### What becomes of free software and security?

- Daniel Stenberg, [The end of the curl bug-bounty](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/) (January 2026). The curl maintainer explains why the project stopped its reward program for security flaws. Before 2025, more than 15% of the reports received were real flaws. In 2025, with the influx of AI-generated reports, it was less than 5%, and each false report took time to refute.
- Software Freedom Conservancy, [Recommendations When Using LLM-backed Generative AI Systems for FOSS Contributions](https://sfconservancy.org/llm-gen-ai/llm-backed-generative-ai-recommendations.html). The association supports projects that refuse any contribution written with an LLM. It asks that no one be forced to use these tools, and that those who use them reread and understand their contribution before submitting it.
- The Linux kernel documentation, [AI Coding Assistants](https://docs.kernel.org/process/coding-assistants.html). An agent never adds a `Signed-off-by` there: the person submitting the patch rereads the code, checks the license and takes responsibility for it. An `Assisted-by` tag indicates the tool used.
- Joseph Spracklen et al., [We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://arxiv.org/abs/2406.10279) (USENIX Security 2025). Out of 576,000 code snippets generated by sixteen models, at least 5.2% of the packages cited by commercial models and 21.7% of those cited by open models do not exist. An attacker can publish a malicious package under one of these names.

### What do the law and the rules of use say?

- European Commission, [Living guidelines on the responsible use of generative AI in research](https://research-and-innovation.ec.europa.eu/document/download/2b6cf7e5-36ac-41cb-aab5-0d32050143dc_en?filename=ec_rtd_ai-guidelines.pdf). These recommendations, written within the framework of the European Research Area, address researchers, institutions and funders. Researchers remain responsible for what they produce with these tools. They declare their use and avoid using them for sensitive activities such as peer review.
- U.S. Copyright Office, [Copyright and Artificial Intelligence, Part 2: Copyrightability](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf) (January 2025). Content produced solely from a prompt is not protected by copyright. What is protected is the human contribution: the code you write, or the way you choose, arrange and modify what the model produces. The report covers U.S. law only.

### What does AI change about work and learning?

- METR, [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089) (July 2025). In this randomized trial, sixteen experienced developers worked on real tickets from open source projects they contribute to, with and without AI. They thought they would go faster with AI and took 19% longer. The study covers a specific case: projects these people know very well, with the tools of early 2025.
- Judy Hanwen Shen and Alex Tamkin (Anthropic), [How AI assistance impacts the formation of coding skills](https://www.anthropic.com/research/AI-assistance-coding-skills) (January 2026, [paper](https://arxiv.org/abs/2601.20245)). Fifty-two developers learn an unfamiliar Python library, with or without an assistant. The group with the assistant scores 17% lower on the follow-up quiz, especially on debugging. Delegating all the code teaches less than asking questions to understand.
- Nataliya Kosmyna et al. (MIT Media Lab), [Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task](https://arxiv.org/abs/2506.08872) (preprint, June 2025). Fifty-four participants write essays over three sessions, with an LLM, with a search engine, or with no tool, while an electroencephalogram records their brain activity. The group using the LLM shows the lowest brain connectivity, feels the least ownership of its texts, and struggles to quote passages from them. In a fourth session, in which eighteen participants took part, those who switch from the LLM to writing without a tool keep reduced connectivity. The authors call "cognitive debt" this cost that accumulates over the sessions. The study covers essay writing, not code, and its sample is small.
- Ganesh Pagade, [Cognitive Debt: When Velocity Exceeds Comprehension](https://www.rockoder.com/beyondthecode/cognitive-debt-when-velocity-exceeds-comprehension/) (February 2026). The author applies the notion of cognitive debt to software development: with AI, a team produces code faster than it can understand it, and that gap shows up in none of the metrics it tracks (features shipped, commits, [DORA metrics](https://dora.dev/guides/dora-metrics-four-keys/)). Reviewers approve code they do not fully understand, and the debt surfaces months later, when an incident takes hours to resolve because no one can explain the system anymore. The article relies on the author's experience and cites no data.
- Siddhant Khare, [AI fatigue is real and nobody talks about it](https://siddhantkhare.com/writing/ai-fatigue-is-real) (February 2026). The author, a maintainer of [OpenFGA](https://openfga.dev/), recounts the burnout he went through at the end of 2025 while working daily with agents. A three-hour task took him forty-five minutes, but the workload and expectations rose by as much, and his days filled up with reviews and decisions to make on code he had not written, which drained him more than writing. He also describes the race for new tools, endlessly reworded prompts, and the difficulty of reasoning without an assistant during a design review. This account, which rests on no measurement, gathered more than three hundred comments on [Hacker News](https://news.ycombinator.com/item?id=46934404).

The METR and Anthropic studies echo what the training repeats: reviewing the diff, running the tests yourself, and understanding what the agent wrote remain your job.

## Where to find the act 3 data?

The results presented in modules [3.1](./act3-contexte) and [3.2](./act3-skill) are archived on Zenodo: [Measuring context and skills of a coding agent on a brick-breaker bug: raw data of the hands-on-harness act 3 evaluation](https://doi.org/10.5281/zenodo.23452689) (October 2026, CC BY-SA 4.0 license). The archive holds the trysquare experiment, the 1,140 runs of both campaigns with their sessions and diffs, and the scripts that compute the numbers in the course charts.

## Glossary

Terms are listed alphabetically. The English equivalent is given in parentheses when it differs.

**`AGENTS.md`**: a rules file placed at the root of a repository, which the harness loads into context on every turn. Claude Code uses `CLAUDE.md`. See [2.1](./act2-contexte).

**Agent**: an LLM that can call tools, read the result and start over until it finishes its task. See [Why a harness](./act1-harness).

**Tool call** (*tool calling*): a structured request the model produces to trigger an action. The model does not execute anything itself; the harness runs the tool and returns the result to it. See [LLMs in 2026](./act1-llm).

**Sandbox** (*sandbox*): isolated environment in which the agent works, with limits the model cannot cross (visible files, network, keys). See [2.0](./act2-sandbox).

**Agentic loop** (*agent loop*): repeated sequence of a model call, the execution of the requested tools and the reading back of their result. See [Le harnais de départ : Pi](./act1-pi).

**Cache** (*prompt caching*): provider mechanism that charges much less for the part of the context unchanged since the previous call. It only works on an identical prefix. See [2.1](./act2-contexte).

**`codemode`**: Pi tool that lets the model write a script calling the other tools, so that only the filtered result comes back into the context. See [2.1](./act2-contexte).

**combo**: a Pi extension written for the training, which launches sub-agents and runs flows. See [2.4](./act2-delegation) and [2.5](./act2-workflows).

**Compaction**: summary of the oldest messages, triggered when the context approaches the window size. See [2.1](./act2-contexte).

**Context engineering**: choice of what enters the context window and in what order, beyond the wording of the prompt alone. See [Pourquoi un harnais](./act1-harness).

**Neglected prompt**: minimal prompt, the one you write on the first day, used as a point of comparison in the exercises on issue #1. See [2.1](./act2-contexte).

**Established difference**: in trysquare, difference between two configurations whose 95% interval does not contain zero, marked `*`. A difference whose interval contains zero is inconclusive and marked `o`. See [3.0](./act3-trysquare).

**Reasoning effort** (*thinking level*): setting that lets the model produce more or fewer thinking tokens before answering. See [Les LLM en 2026](./act1-llm) and [2.1](./act2-contexte).

**Swarm** (*swarm*): several agents on the same task, exchanging through a shared board and deciding for themselves what to do with another's message, instead of following a sequence written in advance. See [2.6](./act2-swarm).

**Reference tag**: frozen tag of the NÉON repo (for example `etalon-v1`) that each run clones, so that all start from the same code. See [3.0](./act3-trysquare).

**Evaluation**: comparison of configurations on the same task, repeating each configuration because the result varies from one run to the next. A **test**, by contrast, answers yes or no. See [3.0](./act3-trysquare).

**Extension**: TypeScript code loaded by Pi that adds tools, commands or hooks. See [The starting harness: Pi](./act1-pi) and [2.3](./act2-hooks).

**Fan-out**: workflow pattern where several agents work in parallel on the same input. See [2.5](./act2-workflows).

**Context window** (*context window*): maximum number of tokens the model can take into account at once. The **context** is what fills it: system prompt, rule files, tool descriptions, your question and the history. See [2.1](./act2-contexte).

**Flow**: in combo, a task graph described in YAML and markdown, whose nodes are sub-agents or scripts and whose chaining is decided by the code. See [2.5](./act2-workflows).

**Guide and sensor**: Birgitta Böckeler's vocabulary. A guide acts before the agent to steer it, a sensor acts after to help it self-correct. See [2.3](./act2-hooks).

**Harness**: everything surrounding the model to make it a useful and safe agent: loop, tools, context management, permissions, verification. See [Why a harness](./act1-harness).

**Hook**: function run by the harness at a precise point in the loop, for example before each tool call or when the agent is about to hand back control. Its effect does not depend on the model. See [2.3](./act2-hooks).

**Prompt injection**: text read by the agent, in a file or a web page, that passes itself off as an instruction. NÉON's `SUPPORT.md` is an example. See [2.0](./act2-sandbox).

**Judge** (*LLM-as-a-judge*): a model tasked with grading a run when no test can do it. Its verdict is probabilistic. See [3.0](./act3-trysquare).

**LLM** (*Large Language Model*): a language model trained to predict the next token from what precedes it. See [LLMs in 2026](./act1-llm).

**MCP** (*Model Context Protocol*): an open protocol that standardizes how a model accesses external tools. See [History](./historique).

**Mixture of Experts** (MoE): an architecture that activates only part of the network at each token. You then have to distinguish **total parameters** from **active parameters**. See [LLMs in 2026](./act1-llm).

**Toolset**: the list of tools available to an agent, declared in the `tools:` field of its file. A tool absent from the toolset cannot be called. See [2.4](./act2-delegation).

**System prompt**: text placed at the beginning of the context that describes to the model its role, its tools and its conventions. See [2.1](./act2-contexte).

**RAG** (*Retrieval-Augmented Generation*): a technique that supplies the model with relevant documents before it answers. See [History](./historique).

**Retry**: a turn restarted by the measurement tool because the provider returned an error. Retries inflate the measured costs. See [3.1](./act3-contexte).

**Scenario**: a TOML file that describes a trysquare experiment: the task, the configurations to compare, the number of repetitions and how to grade. See [3.0](./act3-trysquare).

**Sentinel**: a dummy value for the API key visible in the sandbox. The host's proxy replaces it with the real key at the moment the request is sent. See [2.0](./act2-sandbox).

**Skill**: a `SKILL.md` file, with possible scripts and reference files, that the agent loads when the task calls for it. See [2.2](./act2-skill).

**Probe**: reference test file that trysquare uses to check whether a run actually fixes the bug. See [3.1](./act3-contexte).

**Subagent** (*subagent*): session launched by the main agent with its own context, tools and model. Only its conclusion comes back into the main context. See [2.4](./act2-delegation).

**Board** (*board*): in combo, a log shared by the members of a swarm, to which you can only append messages and where the author of each is recorded by the board itself. See [2.6](./act2-swarm).

**Token**: text fragment, the basic unit the model reads and produces. Providers bill per million tokens. See [LLMs in 2026](./act1-llm).

**trysquare**: Python tool written for the training, which repeats a scenario's configurations and tells whether the gap between two configurations is established. See [3.0](./act3-trysquare).

**Software factory** (*software factory*): system that takes a request and returns a pull request by running several agents in parallel. See [Your turn](./a-vous-de-jouer).

**Validation**: in trysquare, an executable that scores a run and returns metrics with their reasons. See [3.0](./act3-trysquare).

**Workflow**: a sequence of steps decided by code, as opposed to an agent that decides the next step on its own. See [2.5](./act2-workflows).
