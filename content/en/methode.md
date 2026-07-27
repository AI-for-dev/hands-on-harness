# The Method

This training is built on a pedagogical choice we want to clarify from the outset. We could have offered you a catalog of tools accompanied by installation recipes. We will not do this, because content of that kind becomes obsolete within months: package names change, configuration options evolve, and a year later there is little left to extract from it.

We take the opposite approach. The backbone of the training is the harness itself, meaning the entire set of functional bricks it must contain to operate: context management, tools, delegation, orchestration, memory, safety, and verification. We first establish *which* bricks are necessary and *why*, then we rebuild each one manually using open source software. Finally, we move up to the transferable principle—the one you will retain regardless of the tool of the moment.

The goal is not to build a competitor to Claude Code. The reconstruction is deliberately minimal. What you take away at the end is not a software application, but the understanding needed to build your own harness, tailored to your usage, and to pilot with full awareness the harnesses you use daily.

## The Triptych

Each reconstruction module unfolds in three steps, which we repeat throughout the training.

The first step, **Understand**, starts from the need. What is the brick for, why is it indispensable, and how does a real harness implement it?

The second step, **Reconstruct**, consists of writing the minimal equivalent of the brick on Pi, by hand. This is what allows you to stress-test the concept rather than merely read about it. Keep in mind that this code is an illustration, not the lesson: it exists to make the idea tangible, and it is replaceable.

The third step, **Generalize**, extracts the principle that survives tool changes, the design rule you would apply elsewhere. This step is what truly matters, as it is the only one that does not become obsolete.

This distinction between the durable and the disposable is central to the training. The principles from the third step are what you must remember; the package versions and configuration details from the second step are destined to change, and we treat them as such.

## Module Structure

To help you navigate, each module in the reconstruction act follows the same structure: its duration, its learning objectives expressed in terms of skills, prerequisites, the Understand / Reconstruct / Generalize triptych, a hands-on exercise grounded in a real artifact, a deliverable with its success criteria, and finally, pitfalls to avoid.

## Schedule (To be reviewed)

The training lasts approximately 13.5 hours of in-person instruction. It is organized into four acts.

| Act | Content | Duration |
| --- | --- | --- |
| 1. Foundations | LLMs and their ecosystem, harness bricks, the starting Pi harness, and the method | 3.5h |
| 2. Brick-by-brick reconstruction | Context, tools, agents, workflows, memory, permissions | 6.5h |
| 3. Verify, evaluate, observe | Tests, multi-model evaluations, observability | 2h |
| 4. Build your own harness | A personal use case, and the durable / disposable triptych | 1.5h |

Act 2 concentrates the bulk of the value. It is intentionally denser in written content than its duration suggests, so that it remains useful for self-study after the training ends.
