# The method

This training is based on a pedagogical choice we want to make explicit from the start. We could have offered you a catalog of tools alongside installation recipes. We will not, because this kind of content goes stale within a few months: packages change names, configuration options evolve, and not much is left to take away a year later.

We take the opposite approach. The backbone of the training is the harness itself, that is, the set of functional building blocks it must include to work: context management, tools, delegation, orchestration, memory, safety, and verification. We first establish *which* building blocks are necessary and *why*, then we rebuild each of them by hand using open source software. Finally, we work our way up to the transferable principle, the one you will keep regardless of the tool of the moment.

The goal is not to build a competitor to Claude Code, and the reconstruction is deliberately minimal. What you take away at the end, rather than software, is the understanding needed to build your own harness, adapted to your uses, and to knowingly operate the harnesses you will use every day.

## The triptych

Each reconstruction module unfolds in three steps that we repeat throughout the training.

The first step, **Understand**, starts from the need. What is the building block for, why is it essential, and how does a real harness implement it?

The second step, **Reconstruct**, consists in writing by hand, on Pi, the minimal equivalent of the building block. This is what puts the concept to the test. Hands-on implementation is always more effective than passive reading. We remind you that the code is an illustration, not the lesson. A harness is not a recipe that works for any use case. It feeds on your needs.

The third step, **Generalize**, brings out the principle that is independent of the tool used. It provides the design rules you would apply elsewhere. This is the step that truly counts, because it is the only one that never goes stale.

In addition to these three stages, each module states its objectives at the beginning, then, at the end, what you have learned and references for going deeper into the concepts.

## The structure

The training is organized into three acts, followed by a conclusion page.

| Act                                 | Content                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1. Foundations                      | The history of the techniques, LLMs in 2026, the building blocks of a harness and the starting harness Pi |
| 2. Rebuilding block by block        | The sandbox, context, skills, delegation to sub-agents, workflows and hooks                              |
| 3. Evaluating                       | Measuring an agent with trysquare, then measuring the context levers over twenty repetitions             |
| Your turn                           | Taking the approach to your own repository, and the more mature tools that already do what ours do       |

We wanted this document to be as detailed as possible so you can experiment on your own.
