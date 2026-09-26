# The method

This training rests on a pedagogical choice we want to make explicit from the outset. We could have offered you a catalog of tools with installation recipes. We won't, because that kind of content goes stale in a few months: packages change names, configuration options evolve, and there is little left to take away a year later.

We take the opposite approach. The backbone of the training is the harness itself, that is, the set of functional building blocks it must include to work: context management, tools, delegation, orchestration, memory, safety, and verification. We first establish *which* building blocks are necessary and *why*, then we rebuild each of them by hand with open source software. Finally, we work up to the transferable principle, the one you will keep no matter what the tool of the moment is.

The goal is not to build a competitor to Claude Code, and the reconstruction is deliberately minimal. What you take away at the end, rather than a piece of software, is the understanding you need to build your own harness, adapted to your use cases, and to steer the harnesses you use daily with full awareness.

## The three-stage pattern

Each reconstruction module unfolds in three stages that we repeat throughout the training.

The first stage, **Understand**, starts from the need. What is the building block for, why is it essential, and how does a real harness implement it?

The second stage, **Rebuild**, consists of writing the minimal equivalent of the building block by hand, on Pi. This is what allows you to put the concept to the test. Implementation is always more effective than passive reading. We remind you that the code is an illustration, not the lesson. A harness is not a recipe that works for any use case. It feeds on your needs.

The third stage, **Generalize**, brings out the principle that is independent of the tool used. It provides the design rules you would apply elsewhere. This is the stage that really matters, because it is the only one that never goes stale.

In addition to these three stages, each module begins with its objectives, a description of the deliverable when relevant, and references to explore the concepts further.

## The structure

The training is organized into four acts.

| Act                                | Content                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1. Foundations                     | LLMs and their ecosystem, the building blocks of a harness, the Pi starter harness, and the method              |
| 2. Rebuilding brick by brick       | Context, tools, agents, workflows, memory, permissions                                                          |
| 3. Verify, evaluate, observe       | Tests, multi-model evaluations, observability                                                                   |
| 4. Build your own harness          | A personal use case, and the durable / disposable sorting                                                       |

We wanted this document to be as detailed as possible so that you can experiment fully independently.
