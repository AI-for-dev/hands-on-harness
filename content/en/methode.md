# The Method

This training is based on a pedagogical choice that we want to make explicit from the start. We could have offered you a catalog of tools accompanied by installation recipes. We won't do that, because this kind of content becomes obsolete in a few months: packages change names, configuration options evolve, and there is little left to gain from them a year later.

We are taking the opposite approach. The backbone of the training is the harness itself-that is, the set of functional building blocks it must include to work: context management, tools, delegation, orchestration, memory, safety, and verification. We first establish *which* building blocks are necessary and *why*, then we reconstruct each of them by hand using open-source software. Finally, we return to the transferable principle, the one you will keep regardless of the tool of the moment.

The goal is not to build a competitor to Claude Code, and the reconstruction is intentionally minimal. In the end, rather than a piece of software, you will gain the understanding necessary to build your own harness, adapted to your needs, and to operate informedly the harnesses you use daily.

## The Triptych

Each reconstruction module takes place in three steps that we repeat throughout the training.

The first step, **Understand**, starts with the need. What is the purpose of the building block, why is it indispensable, and how does a real harness implement it?

The second step, **Reconstruct**, consists of writing the minimal equivalent of the building block on Pi, by hand. This allows you to test the concept rather than just reading about it. This code is an illustration and not the lesson: it makes the idea tangible, and it is replaceable.

The third step, **Generalize**, identifies the principle that survives the change of tool, the design rule you would apply elsewhere. This is the step that really matters, as it is the only one that does not become obsolete.

This distinction between the durable and the disposable structures the training. The principles of the third step are to be remembered; the package versions and configuration details of the second step are destined to change, and we treat them as such.

## Module Structure

To help you navigate, each module of the reconstruction act follows the same structure: its duration, its objectives expressed in terms of skills, its prerequisites, the Understand / Reconstruct / Generalize triptych, a practical exercise based on a real artifact, a deliverable with its success criterion, and finally the pitfalls to avoid.

## Roadmap (To be reviewed)

The training represents approximately 13h30 in person. It is organized into four acts.

| Act | Content | Duration |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| 1. Foundations | LLMs and their ecosystem, the building blocks of a harness, the Pi starter harness, and the methodology | 3h30  |
| 2. Rebuilding block by block | Context, tools, agents, workflows, memory, permissions                                    | 6h30  |
| 3. Verify, evaluate, observe | Tests, multi-model evaluations, observability                                              | 2h00  |
| 4. Building your own harness | A personal use case, and sustainable vs. disposable sorting                                        | 1h30  |

Act 2 concentrates most of the value. It is intentionally more extensive in written content than its duration suggests, to remain useful for self-study once the training is over.
