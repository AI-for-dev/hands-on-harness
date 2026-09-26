# The Method

This training is based on a pedagogical choice that we want to make explicit from the start. We could have offered you a catalog of tools accompanied by installation recipes. We will not do that, because this kind of content becomes obsolete in a few months: packages change names, configuration options evolve, and there is little left to gain from them a year later.

We take the opposite approach. The backbone of the training is the harness itself, meaning the set of functional building blocks it must include to operate: context management, tools, delegation, orchestration, memory, safety, and verification. We first establish *which* blocks are necessary and *why*, then we rebuild each of them by hand using open-source software. Finally, we work back to the transferable principle, the one you will keep regardless of the tool of the moment.

The goal is not to build a competitor to Claude Code, and the reconstruction is intentionally minimal. In the end, rather than a piece of software, you will take away the understanding necessary to build your own harness, adapted to your needs, and to knowingly manage the harnesses you use daily.

## The Triptych

Each reconstruction module takes place in three stages that we repeat throughout the training.

The first stage, **Understand**, starts with the need. What is the building block for, why is it indispensable, and how does a real harness implement it?

The second stage, **Rebuild**, consists of writing the minimal equivalent of the building block on Pi, by hand. This allows you to experience the concept rather than just reading about it. This code is an illustration, not the lesson: it makes the idea tangible, and it is replaceable.

The third stage, **Generalize**, extracts the principle that survives a change in tools, the design rule you would apply elsewhere. This stage is what really matters, as it is the only one that does not become obsolete.

This distinction between the durable and the disposable structures the training. The principles of the third stage are to be retained; the package versions and configuration details of the second stage are destined to change, and we treat them as such.

## Module Structure

To help you find your way, each module of the reconstruction act follows the same structure: its duration, its objectives expressed in terms of skills, its prerequisites, the Understand / Rebuild / Generalize triptych, a practical exercise based on a real artifact, a deliverable with its success criterion, and finally the pitfalls to avoid.

## Course Outline (To be reviewed)

The training represents approximately 13.5 hours of in-person instruction. It is organized into four acts.

| Act                                | Content                                                                                       | Duration |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| 1. Foundations                      | LLMs and their ecosystem, the building blocks of a harness, the Pi starter harness, and the method | 3h30     |
| 2. Brick-by-brick reconstruction    | Context, tools, agents, workflows, memory, permissions                                        | 6h30     |
| 3. Verify, evaluate, observe        | Tests, multi-model evaluations, observability                                              | 2h00     |
| 4. Building your own harness        | A personal use case, and sorting what is durable / disposable                                | 1h30     |

Act 2 contains most of the value. It is intentionally more extensive in written content than its duration suggests, so it remains useful on your own once the training is over.
