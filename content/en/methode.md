# The Method

This training is based on a pedagogical choice that we want to make clear from the start. We could have offered you a catalog of tools accompanied by installation recipes. We will not do this, because this type of content becomes obsolete within a few months: packages change names, configuration options evolve, and there is little to be gained from it a year later.

We are taking the opposite approach. The backbone of the training is the harness itself, meaning the set of functional building blocks it must include to operate: context management, tools, delegation, orchestration, memory, safety, and verification. We first establish *which* building blocks are necessary and *why*, and then we rebuild each of them by hand using open-source software. Finally, we move back up to the transferable principle, the one you will keep regardless of the current tool.

The goal is not to build a competitor to Claude Code. The reconstruction is intentionally minimal. What you will take away at the end is not software, but the necessary understanding to build your own harness, tailored to your needs, and to knowingly operate the harnesses you use daily.

## The Triptych

Each reconstruction module takes place in three stages that we repeat throughout the training.

The first stage, **Understand**, starts with the need. What is the building block for, why is it essential, and how does a real harness implement it?

The second stage, **Rebuild**, consists of writing the minimal equivalent of the building block on Pi, by hand. This allows you to test the concept rather than just reading about it. Keep in mind that this code is an illustration, not the lesson: it is there to make the idea tangible, and it is replaceable.

The third stage, **Generalize**, identifies the principle that survives a change of tool, the design rule you would apply elsewhere. This is the stage that truly matters, as it is the only one that does not become obsolete.

This distinction between the durable and the disposable is at the heart of the training. The principles of the third stage should be remembered; the package versions and configuration details of the second stage are bound to change, and we treat them as such.

## Module Structure

To help you navigate, each module of the reconstruction act follows the same structure: its duration, its objectives expressed in terms of skills, its prerequisites, the Understand / Rebuild / Generalize triptych, a practical application based on a real artifact, a deliverable with its success criteria, and finally the pitfalls to avoid.

## The Course Outline (To be reviewed)

The training represents approximately 13h30 in person. It is organized into four acts.

| Act                                | Content                                                                                       | Duration |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| 1. Foundations                      | LLMs and their ecosystem, the building blocks of a harness, the Pi starter harness, and the method | 3h30  |
| 2. Brick by brick reconstruction   | Context, tools, agents, workflows, memory, permissions                                    | 6h30  |
| 3. Verify, evaluate, observe       | Tests, multi-model evaluations, observability                                              | 2h00  |
| 4. Build your own harness          | A personal use case, and the sustainable / disposable sorting                               | 1h30  |

Act 2 contains the core value. It intentionally provides more written content than its duration suggests, to remain useful as a standalone resource after the training is over.
