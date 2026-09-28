# Hands-on Harness

*A training to help you discover harnesses and tame them*

## Context and positioning

This material was created for the [IA4Dev training](https://ia4dev-2026.sciencesconf.org/), which takes place from October 19 to 22, 2026. Using Large Language Models (LLMs), for coding as for other tasks, raises significant legal (for example, ownership of the produced code), social, and environmental questions. During the training, we invited several people to speak on these subjects, but we do not develop them in this material; interested readers will nevertheless find some references on these questions in the appendix.

Building training on AI applied to software development therefore raises a question: are we implicitly promoting the use of AI for coding? Our choice not to address the legal, social, and environmental aspects here makes it even more critical, since it relegates to the appendix what should perhaps be the primary information, the one that lets everyone take an informed stance.

We were fortunate to bring together in the organizing committee of this training very different positions, and this diversity fueled many discussions. This training has absolutely no objective of convincing anyone to use or not to use AI, even if, by showing how to do it, we participate in the diffusion of this practice.

On July 14, 2026, in a message to a kernel mailing list, Linus Torvalds, the creator of Linux, made a statement close to the positioning of this material, which we translate here:

> […] AI is a tool, just like other tools we use. And it's clearly a useful one.
> It may not have been that "clearly" even just a year ago, but it's no longer in question today.
> There are other questions around AI (like what the economy of it will actually look like in the end), but "is it useful" is no longer one of those questions. Anybody who doubts that clearly hasn't actually used it.
> Yes, it can also be a somewhat painful tool, both for maintainer workloads and just from a "it keeps finding embarrassing bugs" standpoint.
> But the solution is not to put your head in the sand and sing "La La La, I can't hear you" at the top of your voice like some people seem to do.
> The solution is to make sure those LLM tools *help* maintainers instead of just causing them pain. There's no question on that side.
> We're not forcing anybody to use it, but I will very loudly ignore people who try to argue against other people from using it.
> And no, AI isn't perfect. But Christ, anybody who points to the problems at AI had better be looking in the mirror and pointing at themselves at the same time.
> Because it's not like natural intelligence is always all that great either.
>
> Linus Torvalds, [Re: Linking Patchwork with Sashiko?](https://lore.kernel.org/all/CAHk-=wi4zC+Ze8e+p3tMv8TtG_80KzsZ1syL9anBtmEh5Z40vg@mail.gmail.com/)

```quote en
[…] AI is a tool, just like other tools we use. And it's clearly a useful one.
It may not have been that "clearly" even just a year ago, but it's no longer in question today.
There are other questions around AI (like what the economy of it will actually look like in the end), but "is it useful" is no longer one of those questions. Anybody who doubts that clearly hasn't actually used it.
Yes, it can also be a somewhat painful tool, both for maintainer workloads and just from a "it keeps finding embarrassing bugs" standpoint.
But the solution is not to put your head in the sand and sing "La La La, I can't hear you" at the top of your voice like some people seem to do.
The solution is to make sure those LLM tools *help* maintainers instead of just causing them pain. There's no question on that side.
We're not forcing anybody to use it, but I will very loudly ignore people who try to argue against other people from using it.
And no, AI isn't perfect. But Christ, anybody who points to the problems at AI had better be looking in the mirror and pointing at themselves at the same time.
Because it's not like natural intelligence is always all that great either.

Linus Torvalds, [Re: Linking Patchwork with Sashiko?](https://lore.kernel.org/all/CAHk-=wi4zC+Ze8e+p3tMv8TtG_80KzsZ1syL9anBtmEh5Z40vg@mail.gmail.com/)
```

We want to help beyond just the maintainers: people who already use AI, those who would like to use it, and even those who aren't sure they will use it but want to understand how it works. Organizing this training has shown us that this demand is strong. We therefore truly leave it to you to judge whether you should use AI, and we address the question that follows: how to use it appropriately in higher education and research (ESR) if you wish.

Using a harness, which takes up most of this material, corresponds to a rather advanced use. You can already connect your development environment (IDE) to an AI provider and use the chat, edit and agent commands, often built in or available through plugins. The choice of provider is a fundamental question, whose answer depends on the context in which you work and is likely to evolve over time; we invite you to look into this.

In this training, we rely on the [ILaaS](https://www.ilaas.fr/) offering, which gives access to bigger and more powerful models than those that the vast majority of us can [install locally](https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/). Not all universities are part of ILaaS, and for people in ESR who simply want to access a model to test it, without necessarily building a harness, we refer them to the [Albert API](https://ia.numerique.gouv.fr/outils-ia/albert-api/) from DINUM.

Before getting to the heart of the training, the harness and its use, Act 1 looks back at the [history](./historique) of the techniques, at [the models](./act1-llm), those that are fairly easily accessible as well as those we target in the near future, a dynamic this training helped set in motion, then at [what a harness is](./act1-harness) and the reasons that led us to choose [Pi](./act1-pi).
