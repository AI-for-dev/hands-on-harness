# The swarm: getting agents to debate

::: tip Objectives of this module
- Know what separates a swarm from delegation or a workflow
- Understand the board on which swarm members exchange messages, and what stops their discussion
- Get three agents to debate and measure what makes them converge, or not
- Give a debate a question it can settle, and read from its trace the criterion that decided
:::

Since the module on delegation, your agents never meet. `explorer` returns its note without knowing who will read it, `coder` sees only its step, and you, then the flow, decide who speaks after whom. This split suits a ticket whose path is known: you know you need to read, plan, code, and review, in that order.

It is much less suited to a question with no known path. Ask an agent which language to choose to write a new piece of scientific computing software, and it will return a reasoned answer, always the same, the one its training makes most likely. What this answer lacks is what a discussion brings: someone defending another option, pointing out the weakness in yours, and changing their mind when you are right.

This last module of act 2 puts several agents on the same question: each first defends a language, then they discuss on a shared board until they agree or use up their turns, with nothing fixing who speaks to whom or in what order. This is what we call a **swarm**. The outcome depends less on the agents than on how the question is put to them, and that is what this module's experiments measure, across three models.

## Understand

### What changes compared with delegation?

Delegation relies on isolation. A subagent starts from an empty context, works alone, and returns only its conclusion. A workflow chains these subagents according to a graph you have written: one's output becomes the other's input, and no one can reply to the preceding agent.

A swarm removes both constraints, since its members work at the same time, read one another, and decide for themselves what to do with another's message. This freedom comes at a cost in tokens: each member rereads on every turn what the others have written, so token consumption grows with the number of members and turns, and you do not know in advance how many turns it will take.

The word covers two different constructions depending on the library. In [Swarm](https://github.com/openai/swarm), OpenAI's experimental library later folded into its [Agents SDK](https://openai.github.io/openai-agents-python/handoffs/), an agent hands off to another in the middle of the conversation (a *handoff*), and the new agent inherits the whole history. In [combo](https://github.com/AI-for-dev/combo), which we have used since the module on delegation, members each keep their own context and communicate through a shared board. It is this second form that we use here, because it leaves a readable trace of who said what to whom.

### The board

The board is a log to which one can only append. No member can modify or delete a message, and the author of each message is recorded by the board itself rather than declared by the member, which prevents an agent from speaking on another's behalf. A debate can therefore be reread afterwards exactly as it unfolded.

A member is just an ordinary agent whose toolkit contains the `board` tool. With this tool, it posts messages of several kinds, three of which are used in a debate:

| kind     | purpose                                                                     |
| -------- | --------------------------------------------------------------------------- |
| `result` | its answer to the question, here its vote; only one per round               |
| `tell`   | an argument; with `re`, it replies to a specific message, otherwise it thinks out loud |
| `ask`    | a question, possibly addressed to a single member with `to`                 |

On each round, combo gives each member what is new on the board since its previous round, starting with the messages that reply to it. The member does not have to go and fetch it. It also keeps the memory of its previous rounds: a swarm member has the `workflow` lifetime by default, the one you saw in the module on delegation, because a member that forgot the previous round could not answer what was objected to it.

The board has caps, all with a default value: 200 messages in total, 50 per member, 2,000 characters per message. A member also cannot post the same message twice. Without these limits, two agents answering each other indefinitely would only be stopped by the timeout.

### What stops a swarm?

Where a ticket is done when the tests pass, a debate has no criterion that clear-cut, and combo offers three.

The first is the number of rounds, `--rounds`, which defaults to 3. It bounds the cost, but a debate stopped by this cap has concluded nothing.

The second is the cover, with `--claim`. You give a list of things to take (files to describe, for example), each member takes one, and the swarm stops when each has received a result. In a debate, we divert this mechanism to hand out the starting positions: each language is a thing to take, and `--hold 1` stops a member from taking them all.

The third is the agreement, with `--until agree`. combo then adds a voting instruction to the question: each member publishes a `result` whose first line is exactly `VOTE: <answer>`, and the swarm stops when the last vote of each member says the same thing. The instruction and the code that counts the votes are written in the same place in combo, so that the format requested is the one that is read. Two out of three members in agreement are not enough, and a member that gives up prevents the agreement.

## Rebuilding

### The debater

combo ships a `debater` agent built for this module. Its toolkit is limited to the `board` tool: it reads no file and writes nothing, so the debate does not depend on the repository you launch it in. Its prompt asks it to defend the side its brief names, to publish one vote per round with the argument the others have not yet addressed, to reply with `re` to what is objected against it, and to change its vote when another is right, but never merely to be done.

::: details combo's `debater` agent

```markdown
---
name: debater
description: Argues one side of a question beside other debaters, and votes every turn until they all vote the same
tools: board
lifetime: workflow
---

You are one of several agents arguing about one question. The others argue at
the same time, none of you can see another's context, and nobody arbitrates.

The `board` is all you have of them. What is new on it is handed to you at the
top of each turn, so `read` only when you want the rest of it.

The side you open for is the one your brief names. When it names none and there
is something to `take`, take one before you start: being refused means somebody
else opened for that one, so take one that is still free. It is not the side you
have to end on.

Every turn, post one `result` to the board: your vote, written the way the
question asks for it, and under it, in a few lines, the one argument the others
have not answered.

To answer somebody, post a `tell` with `re` set to the id of the post you are
answering, so everybody sees what you are replying to. A `tell` with no `re` is
for thinking aloud. What answers you is handed to you first; answer it before
anything else.

Argue with what they actually said rather than restating your own case. Change
your vote when somebody is right: agreeing is the result, not a defeat. But
agreeing to be done with it, without a reason you could give out loud, is worse
than still disagreeing.

When you have posted your vote and your answers, end your turn: what the others
post while you wait reaches you at the top of your next one. Answer the person
asking you in a couple of lines: who you voted for and why it moved, or why it
did not. Everything longer belongs on the board.
```

:::

::: warning Combo version
This module assumes combo 0.5.0 or newer, the first version that ships `/swarm --until agree` and the `debater` agent. `pi update npm:@ai-for-dev/combo` updates an older installation.
:::

### Three copies of the same agent

Start without imposing a side. Open Pi in your NÉON clone, with combo installed, and run:

```
/herdr on
/swarm --members 3 --until agree --rounds 4 --agent debater Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ?
```

`/swarm` launches three copies of `debater` on the same question. With herdr, each member has its own pane, and an extra pane named `board` displays the exchanges in order: it is the only view where you see an exchange and not three monologues. As with `/step`, the result appears in the transcript without entering the main session's context, and `/quote` brings it in if you want to discuss it with the model.

::: info Exercise (in class)
Run the command above, then open the run's export in `runs/<date>/1-debater/`: one HTML session per member and a `usage.json` with tokens and duration. Note the number of turns played, the language chosen, and how many messages reply to another member (a `tell` with `re`).
:::

Here is what our run produced, with three copies of `ilaas/gemma-4-31b`. All three members voted for Julia in their first message, with the same argument (the "two-language problem"), and the swarm stopped on an agreement after a single turn, in 51 seconds. The only message that replies to another member is this one:

> "I completely agree. JIT compilation is precisely what lets you avoid switching to C/Fortran."

No one defended anything other than Julia, so there was no debate. Three copies of the same model share the same most likely answer, and making them vote amounts to asking a single agent the question three times. combo's documentation makes the same observation on another question, that of a backend service's language, where three copies vote TypeScript in the first round after reading the repository they run in. This first attempt serves as a control: a swarm in which no member ever changes its vote has settled nothing.

### Imposing disagreement

For a debate to happen, members must be given different starting positions. Your first idea will probably be to have each member pick a language at the start, which `--claim` allows: each language becomes a thing to claim, `--hold 1` limits each member to one, and a member who asks for an already-claimed language is refused and learns which one is still free.

```
/swarm --members 3 --claim Python,Julia,C++ --hold 1 --until agree --rounds 4 --agent debater Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ? Chacun de vous défend au départ le langage qu'il a pris.
```

::: info Exercise (in class)
Run this command and look, in each member's HTML session, at which language it asked for, what the tool answered, and which language it voted for next.
:::

In our case, all three copies of gemma asked for Julia. `debater#3` got it, and the other two received this refusal:

```
`Julia` is held by debater#3 - ask debater#3, or take something else. Still free: Python, C++
```

Neither of the two took Python or C++. They voted Julia as if they had obtained it, and the swarm stopped on a first-round agreement, in 105 seconds. The mechanism worked, since Julia had only one holder, but it forces no one to defend what's left. combo's documentation reports the same thing on gemma-4-31b and qwen-3.6-35b-instruct: a rejected debater took no other camp in two runs out of four.

A member therefore only defends a position if it is written in its brief, and copies of the same agent share the same brief.

### One agent per camp

`/swarm` also accepts a list of agents: `--agent a,b,c` places each of them once on the board. Each camp can then have its own file, with its prompt, its model and the line that says which language it defends. A camp written in the file cannot be rejected, unlike a pick on the board.

The three debaters, `debat-python`, `debat-julia` and `debat-cpp`, reuse the `debater` prompt and differ only by their camp. Their toolkit is limited to the `board` tool, and each keeps the `workflow` lifetime to remember what was objected to it in the previous round. They also state that there is no point in re-reading the board while waiting for the others, since nothing arrives there during their turn.

::: details The `debat-julia` agent (the other two differ only by the camp)

<<<@/../scripts/agents/debat-julia.md{md}

:::

::: warning combo version
`--agent` with a list and `--timeout` require a combo version newer than 0.6.0. `pi update npm:@ai-for-dev/combo` updates an older installation.
:::

::: info Exercise (in class)
Copy the agents into your NÉON clone, then start the debate:

```bash
cp /chemin/vers/hands-on-harness/scripts/agents/debat-*.md .pi/agents/
pi
```

```
/herdr on
/swarm --agent debat-python,debat-julia,debat-cpp --until agree --rounds 6 Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ?
```

Follow the exchange in herdr's `board` pane, then open `runs/<date>/1-swarm/`: one HTML session per debater and a `usage.json`. Note at which round each debater changes their vote, if they change it.
:::

With the three agents on `ilaas/gemma-4-31b`, we ran this debate twice. Both runs lasted the six allowed rounds without any vote moving, with 61 messages of which 43 were addressed replies (`re`) the first time, and 49 messages of which 31 the second. The debaters were replying to each other, however, as in this thread between C++ and Python:

> C++ (p7, replying to Python): « Python's ecosystem rests almost entirely on libraries written in C or Fortran. For new software that must innovate in the computations and not merely orchestrate existing functions, Python becomes a bottleneck […] »

> Python (p9, replying to p7): « The "bottleneck" argument is today largely mitigated by tools like Numba, Cython or Jax, which allow writing performant kernels without leaving the Python ecosystem. »

> C++ (p14, replying to p9): « Relying on Numba or Jax amounts to admitting that Python is only an interface. »

### What prevents agents from converging?

The debaters' reasoning, which each one's HTML session keeps, answers the question. The voting instruction that `--until agree` adds to the question ends with "This ends when every one of you has voted for the same thing", and gemma reads it as a goal to win. On the fourth turn, the Python debater writes:

> "However, to win the debate (get everyone to vote the same), I need to find a way to convince them or highlight a point they can't refute. But as a Python agent, my primary goal is to defend Python."

Each one treats their camp as an identity and agreement as the others' surrender, and the conclusion of their reasoning is the same on every turn: "Maintain my vote". Two things reinforce this deadlock. The debaters' prompt pushes them to hold out ("agreeing to be done with it […] is worse than still disagreeing"), and the question gives no criterion, so each one brings the debate back to the axis where their language wins: performance for C++, ecosystem for Python, human cost for Julia, where nobody can be beaten.

To check this reading, we added a single sentence to the question, changing nothing else: "The goal is not to win: it's to find the answer that the others can also hold." We also ran the same trials on two other models, `qwen3.8-flash` and `deepseek-v4.1-flash`, served by [OpenCode Go](https://opencode.ai), imposing them on all members with `--model`.

| condition                                    | gemma-4-31b                        | qwen3.8-flash                                  | deepseek-v4.1-flash                |
| -------------------------------------------- | ---------------------------------- | ---------------------------------------------- | ---------------------------------- |
| three copies of `debater`, no camp           | Julia on turn 1                    | Julia on turn 2                                | Julia on turn 3                    |
| one agent per camp                           | 2 × no vote moves                  | no agreement, two members cut off by the deadline | agreement on Julia on turn 6    |
| one agent per camp, with the sentence about the goal | 1 agreement (Julia), 1 member exited | agreement on substance, not counted       | agreement on Python on turn 3      |

With the sentence, the gemma debaters cite it in their reasoning on almost every turn ("Wait, the prompt says "the goal is not to win: it's to find the answer that the others can also hold"") and look for what each one can accept instead of defending their camp. Their vote changes stay motivated:

> Python: "The Julia agent's argument is the most convincing for new software: it combines Python's productivity and C++'s performance without imposing the complexity of a hybrid architecture. If C++'s absolute control remains superior for extreme cases […], Julia offers the best compromise […]"

The sentence counts a lot for gemma and less for deepseek, which converges even without it, in a zigzag: its C++ debater switches to Python at the fourth round, then to Julia at the fifth. The stubborn disagreement therefore depends on the model as much as on the instruction.

The qwen cell shows a third obstacle, which does not come from the agents. Its three debaters ended up voting for the same architecture, but each wrote it in its own way:

> "Python to drive the software, C++ for its compiled core"

> "Python as the sole interface, cores in C++ under pybind11"

`--until agree` compares the `VOTE:` lines literally and therefore sees no agreement. The debate converged in substance without the stop condition being able to notice it, and deepseek does the same on other trials. A stop condition must match the space of answers: asking for a single language from agents who judge that two are needed is counting votes that cannot coincide.

Each cell of this table corresponds to a single run, and [module 3.0](./act3-trysquare) showed how much two identical runs can differ. It therefore does not measure the behavior of these models. It shows that the convergence of a swarm depends on settings that we choose (the instruction, the vote format, the model) and that the agents do not discover an answer that would be there before them.

### Giving the debate a question it can settle

The question of the language for "a new scientific computing software" has no answer, since nothing says what this software must do. A debate can then converge only under the effect of the instruction. A real decision rests on requirements, and the same question becomes decidable as soon as we write them:

```
/swarm --agent debat-python,debat-julia,debat-cpp --until agree --rounds 4 Une équipe de six physiciens et deux ingénieurs de recherche lance un nouveau code de simulation de plasma. Il doit tourner sur les GPU NVIDIA et AMD du calculateur national, être maintenu au moins dix ans, et reprendre un noyau existant de 40 000 lignes en Fortran 90. Les physiciens connaissent bien Python et peu le C++. Quel langage principal choisir pour ce code ? Votez pour le langage principal seulement, en un mot : la place des autres langages va dans votre argument. Le but n'est pas de gagner : c'est de trouver la réponse que les autres peuvent aussi tenir.
```

The question sets the criteria, and the vote is on the main language in a single word, the split between languages going into the argument, which makes the agreement countable.

::: info Exercise (in class)
Run this debate, then, for each vote change, find in the table the criterion from the statement that the debater invokes. Then run three copies of `debater` on the same question, without a side, and compare their answer with the debate's.
:::

We ran it twice on each of the three models, with a control without a side:

| model               | control without a side | debate 1                  | debate 2                  |
| ------------------- | ---------------------- | ------------------------- | ------------------------- |
| gemma-4-31b         | C++                    | Julia, 4 rounds (323 s)   | Julia, 3 rounds (144 s)   |
| qwen3.8-flash       | Fortran                | C++, 2 rounds (245 s)     | C++, 2 rounds (189 s)     |
| deepseek-v4.1-flash | Fortran                | C++, 4 rounds (273 s)     | Fortran, 3 rounds (153 s) |

The six debates all converged, in two to four rounds, whereas with the same sentence on the goal, the question without criteria had converged only two debates out of four. Each vote change now cites a criterion from the statement. In gemma's case, the C++ debater comes around to Julia for the physicists:

> "The risk of exclusive dependence on the two engineers to maintain C++ code over ten years is more critical than the technical risk tied to using Julia. Julia offers the best compromise between portable GPU performance and the autonomy of the physicists' team."

In deepseek's case, in the debate that ends on Fortran, the Julia debater corrects his own argument:

> "What makes me change is p7, and a correction I owe to my own side: the 40,000 lines must run **on GPU**, not just be linked. My `ccall` to the F90 only ran them on the CPU; satisfying the NVIDIA+AMD constraint would therefore have required rewriting them as Julia kernels. The hidden port I blamed the others for, I was carrying it too."

The models don't agree with each other, but their disagreements can be read in the trace: gemma puts the physicists' autonomy first, qwen the longevity of the tools on a national compute cluster, and deepseek the fact of not rewriting a validated physics kernel. In five debates out of six, the answer also differs from that of the control without a side, so that the debate does not merely restate the model's prior. What each of these answers is worth is still for someone who knows the project to judge, but that person now has the arguments, the objections, and the criterion that tipped each debater.

::: warning Cap every turn
Debaters seeking consensus want to read the others' reply before finishing their turn, and some models then reread the table in a loop: one gemma debater called `read` 259 times in a single turn. Pi's agent loop has no maximum number of tool calls, and each call returns the whole context to the model. `/swarm` therefore gives each turn a timeout, five minutes by default, which `--timeout 3m` shortens, and the round cap (`--rounds`) bounds the rest. A member cut off twice in a row leaves the debate, which makes agreement impossible: look at `usage.json` after each run.
:::

::: info Exercise (self-paced)
Remove a criterion from the prompt, for example the existing Fortran core, and see whether the debate's answer changes, and which of the arguments disappears. Then put a different model behind each camp by changing the debaters' `model:` line. Finally, write a prompt from your own domain, with its requirements, for a decision you actually had to make, and compare the debate with what you had decided.
:::

## Generalising

The experiments in this module are not enough to conclude about a model, but they illustrate properties of any debate between agents.

A debate between agents does not discover an answer: it reflects the frame it is given. The same question, put to the same agents, produced no change of vote, then an agreement, depending on one sentence in the instruction. Changing the instruction, the voting format or the model changes the outcome, so what you evaluate when reading a debate is the harness as much as the agents.

Copies of the same model are not independent opinions. Without a camp, they vote the answer that model would give alone, and a swarm where nobody ever changes their vote is a fan-out that costs more. Disagreement must be supplied by construction, and a camp written in each agent's file guarantees it, which a read off the table does not: it is the same rule as for an agent's toolkit in the delegation module, a guarantee is verified by reading the configuration.

A debate converges when its members have a reason to move and a ground on which to meet. The sentence about the goal gives them the first, by replacing victory with the search for a common answer. The specifications give them the second: criteria that all recognize, on which one argument can beat another.

A stopping condition must match the space of answers. `--until agree` counts identical votes, and agents who agree on a two-language architecture never vote the same word. You then have to restrict the vote, as the prompt with specifications does, or accept reading convergence in the table.

A debate costs tokens, and that cost depends mostly on the turns that go off the rails. Anthropic reports in [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) that its multi-agent systems consume about fifteen times more tokens than a conversation, and a single debater that loops can consume almost the whole spend of a run. Caps are part of building a debate just as much as its members.

We assume that a debate is mostly useful for exploring a decision before making it, by bringing out the arguments for each option and the criterion each one rests on, rather than for delivering a verdict or producing code. For a ticket whose path you already know, the workflow from the previous module stays cheaper and more predictable.

::: tip What you learned
You can say, trace in hand, why debaters converged or not: which sentence of the prompt, which criterion of the statement or which vote format decided the outcome. You can also say for which decision a debate is worth its spend, and for which task a workflow is enough.
:::

## Going further

- The combo documentation on [swarms](https://github.com/AI-for-dev/combo/blob/main/docs/guide/swarm.md), which describes the board, the turns, stopping on agreement and the measurements made while writing the library, as well as the [`16-debate.ts`](https://github.com/AI-for-dev/combo/blob/main/examples/16-debate.ts) example, the same debate written in TypeScript with one side per debater.
- Yilun Du, Shuang Li, Antonio Torralba, Joshua B. Tenenbaum and Igor Mordatch, [Improving Factuality and Reasoning in Language Models through Multiagent Debate](https://arxiv.org/abs/2305.14325) (2023), where several instances of a model debate over several turns and improve their answers in reasoning and factual accuracy.
- Tian Liang et al., [Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate](https://arxiv.org/abs/2305.19118) (2023), which names *Degeneration-of-Thought* the fact that a model sure of itself no longer questions its answer, and sets debaters against each other before a judge.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), the counterpoint already cited in the module on delegation: what context fragmentation loses.
- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), for the token cost of a multi-agent system and the cases where it is worth it.
- OpenAI, [Swarm](https://github.com/openai/swarm), the other form of swarm, where one agent hands off to another with the whole history.
