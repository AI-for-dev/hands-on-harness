# Hands-on Harness

*A training course to help you discover and master harnesses*

## Context and positioning

This training material was created as part of the ANF IA4Dev held from October 19 to 22, 2026 [https://ia4dev-2026.sciencesconf.org/](https://ia4dev-2026.sciencesconf.org/). The use of Large Language Models (LLMs), whether for coding or other tasks, raises obvious significant issues from legal (code ownership...), social, and environmental perspectives. We chose to have several speakers address these topics during the ANF, but we did not develop these aspects in this material. Interested readers can, however, find some references on these questions in the appendix.

It is evident that building an AI training course to assist in software development raises questions. Is it implicitly promoting the use of AI for coding? Our choice not to develop legal, social, and environmental issues here raises the question even more critically: are we relegating to the appendix what should be the primary information and core of the training to position oneself with full knowledge of the situation?

We were lucky to have very different positions within the organizing committee of this ANF. This diversity was the source of numerous discussions, and this training course is in no way intended to convince anyone to use or not use AI.
It is true that by showing how to do it through this material, we contribute to spreading the practice.

At the time of writing these lines, Linus Torvalds, the founder of Linux, made a statement close to the positioning of this educational material:

> "AI is a tool, like other tools we use. And it's clearly a useful tool.
> It wasn't necessarily as 'clear' just a year ago, but it's no longer a question today.
> There are other questions around AI (like what the AI economy will actually look like at the end), but 'is it useful' is no longer one of those questions. Anyone who doubts this clearly hasn't really used AI.
> Yes, it can also be a somewhat painful tool, both for the workload of maintainers and from the perspective of 'it keeps finding embarrassing bugs'.
> But the solution is not to bury our heads in the sand and sing 'La La La, I can't hear you' at full voice as some seem to be doing.
> The solution is to ensure that these LLM tools *help* maintainers instead of causing them pain. There is no question on that side.
> We are not forcing anyone to use it, but I will very loudly ignore people who try to contradict others on their use.
> And no, AI is not perfect. But hell, anyone pointing out AI's problems had better look themselves in the mirror at the same time.
> Because natural intelligence is not always so great either."
> 
> —— Linus Torvalds [https://www.phoronix.com/news/Linux-Is-Not-Anti-AI](https://www.phoronix.com/news/Linux-Is-Not-Anti-AI)


In our case, it is about helping not only maintainers but more globally AI users, those who would like to use it or even those who are not really sure they will use it but who want to better understand and know how it works. The organization of this ANF showed us that there is a strong demand in this direction. The question is therefore not: should you use AI or not? (as we really leave you to judge this one) but if I want to use it relevantly within the context of ESR, how can I do it?

It is evident that what will be mainly presented in this material, namely the use of a harness, corresponds to a somewhat advanced usage. In a way, it is possible to simply connect your development environment (IDE) to an AI provider and use commands often integrated or accessible via plugins: chat, edit, and agent. The question of which AI provider is fundamental? Here, depending on the frameworks in which you work, answers will vary. Moreover, they are likely to evolve over time, and we invite you to investigate this question.

In this training course, we will rely on the IlaaS offering [https://www.ilaas.fr/](https://www.ilaas.fr/) because it allows using larger and more performant models than what is possible for the majority of us to install locally [https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/] (https://blog.stephane-robert.info/docs/developper/programmation/python/ollama/)). We are aware that not all universities are on IlaaS and for those in ESR who simply want access to a model to test without necessarily building a harness, we refer you to the Albert API from DINUM [https://ia.numerique.gouv.fr/outils-ia/albert-api/](https://ia.numerique.gouv.fr/outils-ia/albert-api/).

Before diving into the core of the training course, namely the harness and its usage, we will detail a bit of the history, the models (those that are fairly easily accessible and those we aim for in the near future since this training course served as an opportunity to set in motion a dynamic in this direction) and some available harnesses and why we chose Pi.

In a second part, we will look at how Pi works and create a first extension. The notions of


## Training plan

1. **Navigating the current landscape of LLMs and harnesses**
   - [History](./historique)
   - Models and providers
   - Harnesses
       - [What is a harness?](./quest-ce-quun-harnais)
       - Some harnesses

2. **Getting hands-on with Pi**
   - Install and configure Pi
   - Configure access to IlaaS
   - Discover Herdr 
   - Discover commands and some first Pi extensions

3. **Building and adapting your harness**
   - Create a first extension
   - ...