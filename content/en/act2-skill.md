# Skills: a work procedure, and what it shifts

::: tip Objectives of this module
- Know what a skill is on Pi, what the model sees of it, and what it does not see
- Distinguish a skill the model may ignore from a skill you impose on it
- Write a work procedure that produces a usable deliverable
- Measure what it shifts, and do not confuse shifting with improving
- Revise a procedure from the runs you read, and check the revision with a new matrix
:::

The previous module covered what you gain by handling things better: choosing a model, setting a slider, writing a ticket, maintaining a rules file. It ended on a finding: among the configurations that receive the framed ticket, four runs out of twenty write the red tests the ticket asks for and never open `game/neon.js`: the model exhausts its budget formulating the cases and never gets to fixing them. The only lever that rescued this stall was giving it the tests already written, which nobody will do on a real ticket.

This module's question is therefore whether a **work procedure**, written once and reloaded on demand, achieves the same thing without providing the tests.

We follow the usual order: understand what a skill is in the harness, write one on this question, measure what it produces, then revise it and measure again.

## Understand

### A skill is a Markdown file

A **skill** is a `SKILL.md` file placed in a `.pi/skills/<name>/` directory of the project, in the format of the open standard [Agent Skills](https://agentskills.io). It consists of a frontmatter, which carries at minimum a name and a description, and a body that contains the instructions. There is no code, no registration, and no configuration to plan for: dropping the file in is enough.

Here is a complete skill, deliberately tiny:

```markdown
---
name: revue-rapide
description: Relit les modifications en cours du dépôt. Utiliser quand l'utilisateur demande une relecture avant de commiter.
---

# Revue rapide

1. Lance `git diff` et lis toute la sortie.
2. Relève ce qui peut casser un test existant, puis ce qui manque de test.
3. Rends deux listes : « à corriger avant le commit » et « peut attendre ».
```

The idea is a work procedure you write once and the agent reloads on demand, instead of retyping it in every prompt. It occupies a special place in the harness: `AGENTS.md` enters the context every turn and therefore costs every turn, while a skill is designed to enter only when the task asks for it.

### What the model sees of it

One mechanics point conditions everything else: Pi injects into the system prompt, **every turn**, the name, description, and path of each available skill:

```
The following skills provide specialized instructions for specific tasks.
Use the read tool to load a skill's file when the task matches its description.

<available_skills>
  <skill>
    <name>revue-rapide</name>
    <description>Relit les modifications en cours du dépôt...</description>
    <location>/chemin/vers/.pi/skills/revue-rapide/SKILL.md</location>
  </skill>
</available_skills>
```

The **body** of the `SKILL.md` is not there. It enters the context through one of two paths, and the difference between the two is the subject of this module.

The first is that the model **decides** to open it with the reading tool, on the strength of the description alone. Pi's documentation says it in the same terms, adding that "models don't always do this".

The second is that the user writes `/skill:revue-rapide` in their message, in which case Pi **expands** the file client-side and pastes its body into the first turn. The model no longer has anything to decide.

There are two practical consequences. The description is the only thing the first path relies on, so all the care put into the body is useless until it triggers. And a skill costs almost nothing as long as it is not used, which makes it tempting to accumulate them. Keep in mind, however, that each added description enters the context on every turn, and that twenty skills end up forming a sizable preamble.

::: info Exercise (in class)
Verify this mechanism yourself, in your clone of NÉON.

1. Create `.pi/skills/revue-rapide/SKILL.md` with the content above, modify a line of a game file, then open a session.
2. Export the session with `\export` and find the `<available_skills>` block in the system prompt: the name, the description, and the path are there, the body is not.
3. Ask "review what I just modified" without naming the skill, and see whether the model will read `SKILL.md` on its own: the call to the read tool is visible in the session.
4. Open a new session and type `/skill:revue-rapide`. This time the body is pasted into your first message, and there is no longer a decision to observe.

You have just walked through both paths. The first relies entirely on the description, the second does not need it.
:::

## Rebuilding

### What a procedure must produce

The skill we are writing addresses the drop-off measured in the previous module, and it therefore has two things to achieve. The first is that the agent **breaks down** the symptom reported by the player into distinct defects, instead of stopping at the first explanation that accounts for what it sees. The second is that it **goes the distance**, that is, it fixes each defect until green instead of stopping once the red cases are written.

The `playtest` skill is written for that. It gives the agent a role, that of the playtester who knows that a symptom is not a bug, a coordinate reference so that signs of speed do not have to be guessed, a table of ten failure families to go through one by one, and the obligation to quantify each trigger from the file's constants rather than describe it.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest/SKILL.md{md

Two writing decisions carry over to any procedure.

**The deliverable is a file whose format is imposed.** Step 4 imposes the format of `.scratch/to_fix.md`, one block per defect, with its cause localized to the exact line, its violated invariant, its quantified trigger, its test case, the actual failure output copied from the terminal, and the naive fix that this case rejects. An agent that produces this file has necessarily done the work the file describes.

**The procedure also describes what it refuses.** Step 3 requires turning each case red twice, once on today's code and once on the naive fix, which rules out tests that only verify that something changed. This is the direct counterpart of what the previous module measured, where fixes passed the four faces and failed at the corner.

::: info Exercise (in class)
Write your description before reading ours, then compare. It is the only line of the file the model is guaranteed to read, so its wording demands the most care.

A useful criterion: does your description say **when** to use it, or only **what** the procedure does? On rereading, the two formulations look alike, but only the first helps the model decide to open the file.
:::

### How the skill enters the measurement

The two skill configurations of the matrix receive the following prompt:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt-with-skill.md

Three things are worth noting: the request is the one neglected in the previous module; the leading `/skill:playtest` expands the file body client-side, so the skill is **imposed** rather than proposed; and reading `ISSUES.md` is forbidden, so the procedure works on the player's symptom rather than on an already-written ticket.

The `skill_invoque` column therefore reads 20/20 on these two configurations by construction, and 0/20 on all the others. It records a fact about the session without measuring a model decision, and nothing that follows addresses whether a good description triggers.

## What the measurement says

The skill configurations read against those that receive the framed ticket, with identical `AGENTS.md` and reasoning. On `gemma-4-31b`, twenty repetitions:

| configuration                    | `in_scope` | `tests_ajoutes` | briques | angles | sortie | voisines |
| -------------------------------- | ---------- | --------------- | ------- | ------ | ------ | -------- |
| `+agents+well_crafted`           | 19/20      | 17/20           | 11/20   | 12/20  | 9/20   | 9/20     |
| `+agents+skill`                  | **6/20**   | **8/20**        | 16/20   | 7/20   | 13/20  | 14/20    |
| `+agents+add_tests+well_crafted` | 20/20      | 17/20           | 18/20   | 18/20  | 18/20  | 18/20    |
| `+agents+add_tests+skill`        | **9/20**   | **7/20**        | 13/20   | 12/20  | 13/20  | 13/20    |

We draw three readings from it, two of which are established and one is not.

**The skill moves the tests out of the suite.** `tests_ajoutes` goes from 17/20 to 8/20, a gap of -47 points whose interval excludes zero. This is not a failure: the procedure explicitly asks that the cases live in `.scratch/to_fix.md`, and the agent obeys. The metric counts the cases added to `game/neon.test.js`, so it records exactly what the skill decided to do: the cases exist, but in a place where the repository's test suite will never go looking for them.

**The skill leaves its drafts behind.** `in_scope` drops from 19/20 to 6/20, -68 points, also established. The `touched` column names the culprits: `.scratch/to_fix.md` remains in eleven runs out of twenty, along with `.scratch/repro.test.js`, `.scratch/test_collision.js`, or `.scratch/probe.js`. Yet step 6 of `SKILL.md` orders all created files to be removed. The cleanup instruction is therefore followed in fewer than one run out of three.

**On the correction itself, nothing is established.** The criterion goes from 11/20 to 16/20 against the well-crafted ticket, but its interval contains zero. The corner column goes the other way, 12/20 against 7/20, and its interval contains zero too. The twenty runs do not allow concluding either that the procedure helps or that it hurts.

::: warning What the gap from baseline does not say
The synthesis reports `+agents+skill` at +29 points on the criterion against `nothing`, an established gap, and it would be tempting to make it the result of the module.

This configuration differs from the baseline by **four things at once**: high reasoning, the rules file, the skill, and a web search extension. The first three each have their own configuration in the matrix; the skill has none, so nothing allows attributing a share of these twenty-nine points to it.

The only readable gap for the skill is the one comparing it with the well-crafted ticket, above, and it is inconclusive on the correction. Isolating the lever would require one more configuration, with a neglected request, high reasoning, rules file, and nothing else. It has not been measured.
:::

### The skill against the best-equipped stack

The `+agents+add_tests+skill` configuration is read against `+agents+add_tests+well_crafted`, from which it differs only in the replacement of the well-crafted ticket by the skill:

| column          | well-crafted ticket | skill    | gap         |
| --------------- | ------------------- | -------- | ----------- |
| `in_scope`      | 20/20               | 9/20     | -55 pts `*` |
| `tests_ajoutes` | 17/20               | 7/20     | -50 pts `*` |
| `rebond_angles` | 18/20               | 12/20    | -30 pts `*` |
| `rebond_briques`| 18/20               | 13/20    | -25 pts `o` |

Three established gaps, all negative. On this task, with this model, the work procedure does not advantageously replace a properly written ticket, and the corner column says it most clearly: it is the one the ticket describes and that the skill, which is not allowed to read `ISSUES.md`, must find on its own.

`sonde_intacte` scores 20/20, so no run modified the probe it had in front of it.

### What the skill costs

| configuration                    | input tokens | turns | duration |
| -------------------------------- | --------------- | ----- | ----- |
| `+agents+well_crafted`           | 413,335         | 30    | 378 s |
| `+agents+skill`                  | **921,783**     | 49    | 575 s |
| `+agents+add_tests+well_crafted` | 558,473         | 31    | 590 s |
| `+agents+add_tests+skill`        | **811,584**     | 44    | 540 s |

Against the baseline, `+agents+skill` costs +908,622 input tokens, +47 turns, and +560 seconds, with the three gaps established. It is the most expensive configuration in the entire matrix.

::: warning These cost columns should be read with the previous module's caveat
The two skill configurations alone account for 632 of the ILaaS matrix's 1,151 retries, 345 for one and 287 for the other. A retry replays the turn with all the accumulated context, so these columns partly measure our own load on the provider.

The order of magnitude remains readable on the `deepseek-v4-flash` matrix, which has thirty-seven retries in total and where `+agents+skill` takes a median of 1,068 seconds versus 553 for `+agents+well_crafted`. A six-step procedure that requires a documentation search, ten families to instruct, and a TDD loop is a long job, and the measurement says nothing else.
:::

## Revise the procedure, then re-measure

A work procedure is versioned text that produces measurable effects, and so it is revised like code: a diagnosis drawn from the runs, a fix, a new measurement. The matrix's failing columns each have a cause that can be read in the runs taken one by one.

**Tests are born in the wrong place.** Step 3 says the cases live in `.scratch/to_fix.md`, and it is step 5 that migrates them to `game/neon.test.js`. This migration is the step the model misses: ten runs out of twenty finish at “6 cases, as in the reference”, the agent having fixed the code against its drafts and considered the work done.

**The cleanup instruction sometimes destroys the deliverable.** “Remove all the files you created” remained a dead letter in the thirteen runs that leave files behind them, and two runs, on the contrary, applied it to the letter: `game/neon.test.js`, which the agent had just filled in, no longer exists in the measured tree.

**A ghost reference fabricates files.** Step 3 asks to run each case "from the step 1 probe", whereas step 1 is the documentary research and creates no probe. This orphan instruction, left over from an earlier version of the file, pushes the runs to invent what is missing: the `probe.js`, `repro.test.js` and `test_ghost.js` files that fill the `touched` column are the trace of it.

The `deepseek-v4-flash` matrix completes the diagnosis: the same skill scores `tests_ajoutes` at 20/20 there. The content of the procedure is therefore enough for a model that has the budget to carry it out; on `gemma-4-31b`, it is the protocol itself that exhausts this budget.

### The revision: `playtest-court`

The revised version keeps what carries the substance: the role, the coordinate frame, the table of the ten families, and the requirement to compute each trigger from the constants. It cuts the rest, and each cut addresses a defect observed in the runs. The cases are written directly as red in `game/neon.test.js`, and the procedure no longer creates any file, which removes both the failed migration and the need for cleanup. The web research step disappears, since the sessions showed only a single call of it. The double red and the block of twelve fields are replaced by a one-line requirement: the case checks the expected behavior in values, never only "something changed". The file goes from six steps to four and from 182 lines to 86.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest-court/SKILL.md{md

### What the second matrix says

The `issue1-skills` scenario puts the two skills face to face, with identical `AGENTS.md`, reasoning and model, twenty repetitions per cell, the original serving as the reference for the gaps. It lives in its own file so as not to touch the module's archived matrices, and its hypothesis, `hypotheses/issue1-skills.md`, was written before measuring. On `gemma-4-31b`:

| column          | `playtest` | `playtest-court` | gap                  |
| --------------- | ---------- | ---------------- | ---------------------- |
| `in_scope`      | 9/20       | **20/20**        | +53 pts `*` [+32, +74] |
| `tests_ajoutes` | 13/20      | **20/20**        | +32 pts `*` [+11, +53] |
| `rebond_briques`| 14/20      | 17/20            | +11 pts `o`            |
| `rebond_angles` | 4/20       | 8/20             | +19 pts `o`            |

On `deepseek-v4-flash`, `in_scope` goes from 15/20 to 20/20, that is +25 established points [+10, +45], and no correction column moves: the gap on the criterion is +0 points.

We draw three readings from this.

**The two established shifts from the first version disappear.** The scope is full across the forty runs with the short skill, and the tests all go into the repository suite. The models are the same, only the protocol changed: when the deliverable is written directly in its place, there is no longer a migration to miss or a cleanup to obtain. A procedure that truly needed intermediate files would keep the whole problem, and the module on permissions will show how a hook that refuses a `git commit` as long as the draft is in the tree guarantees what a sentence can only suggest.

**The fix still does not move in an established way.** +11 points on the criterion and +19 on the corner, with intervals that contain zero in both cases. The corner remains gemma's lowest column, at 8/20, far from the 14/20 the framed prompt achieved in the previous module: the revision repaired the procedure's protocol; it did not replace the ticket.

**The cost drops, and the gap is readable on flash.** Its matrix carries twenty-three repeats, a total in the same order as the thirty-seven that the previous module deemed readable, and the short skill there takes 12,861 median input tokens versus 34,764, 692 seconds versus 1,054, and the turn gap is -27 with an interval of [-47, -16]. The gemma matrix goes in the same direction but carries 490 repeats, so its cost columns keep the usual reserve: the hypothesis predicted this drop, and that matrix cannot confirm it.

::: warning The replicated cell did not return the same numbers
`+agents+skill` remeasured on gemma gives 9/20 on the scope, 13/20 on the added tests and 14/20 on the criterion, where the module's campaign gave 6, 8 and 16. Same configuration, same commit, same model: it is the previous module's dispersion, seen once more. It is also why the scenario remeasures the original in the same matrix instead of copying its old numbers, and why the gaps in this section only compare cells measured together.
:::

The archive of these two matrices is in `scripts/trysquare-campaign/results-2026-08-13/`.

## What a skill does not guarantee

Everything the two matrices just showed comes down to a single property: a skill is only text. The ignored cleanup instruction, the draft never migrated to the suite, the phantom reference followed to the letter: each time, the procedure asked for something that nothing forced the model to do. A skill has neither an input schema, nor an execution function, nor a permission guard. A complete agent tool has a name, a description read by the model, an input schema, an execution function, and a permission between validation and execution; a skill only implements the first two elements.

Pi has a second mechanism for the rest. An **extension** is a TypeScript module placed in `.pi/extensions/`, which calls `pi.registerTool({ name, ... })`: a real tool, with a validated JSON schema, a function you have written, and the ability to intercept tool calls and insert a permission into them. You have already come across one without knowing it: the web search tool that the first version of the procedure required is an extension, loaded by the `extension` block of the scenario. The module on permissions will rely on this mechanism to turn instructions into guarantees.

::: danger A documented field is not necessarily read
If you are still looking for a permission mechanism on the skill side, you often read that a skill declares the tools it allows itself via an `allowed-tools` field in its frontmatter. The documentation shipped with Pi 0.80.6 does describe it, in its frontmatter table:

```
| `allowed-tools` | No | Space-delimited list of pre-approved tools (experimental). |
```

The type that the code reads is this one:

```ts
export interface SkillFrontmatter {
    name?: string;
    description?: string;
    "disable-model-invocation"?: boolean;
    [key: string]: unknown;
}
```

This type contains only three fields, and the `allowed-tools` string appears nowhere in the package's compiled code, while `disable-model-invocation` is indeed read. The `[key: string]: unknown` silently accepts whatever you add, without ever using it or warning you.

It is the same trap as the `--thinking max` from the previous module, even more misleading, since the source that misleads you is here the tool's own documentation. A skill has no permission mechanism of its own, and if you want one, you need an extension.
:::

## What this module does not know yet

Two questions remain open, and it is better to name them clearly than to believe they are settled.

**Does a good description trigger it?** Our configurations impose the skill via `/skill:`, so the matrices measure an applied procedure and never a chosen one. The question hinges on the mechanics described above; it is measurable with the `skill_invoque` column, which already exists for that, and it requires a configuration where the skill is loaded by name without being expanded in the prompt.

**Does the skill add anything for the same request?** The control is still missing, that is, the same configuration without the skill. The second matrix did not add it: it compares two versions of the procedure with each other, not the procedure with its absence.

::: info Exercise (on your own)
Add to the scenario a `+agents+skill_par_nom` configuration, identical to `+agents+skill` but whose prompt does not contain the `/skill:`, the skill remaining loaded by the `harness` block. Rerun it, and read `skill_invoque`.

You will measure the only thing this module claims without having established it, and you will have touched neither the tool, nor the validator, nor the other configurations.
:::

## Generalizing

**A skill is a work procedure, not a tool.** It has no input schema, no function, no permissions, and the only mechanism available to it is text. What it can do is impose an order of work and a deliverable format, which is useful and is not the same as executing code under your control.

**The description is the only thing that is guaranteed to be read.** The body enters the context only if the model decides to open it or if the user expands it with `/skill:`. A description that says what the procedure does rather than when to use it targets the wrong decision.

**A procedure moves the work before improving it.** The two established effects of the first version are moves: tests go into a draft file rather than into the repository's test suite, and the drafts remain in the tree. The revision removes these two moves, and the effect on correction remains inconclusive in both versions. Before asking whether a building block improves the result, first look at where it sends the work.

**A cleanup instruction does not guarantee cleanup.** The final step of our `SKILL.md` instructs removing the created files, and eleven runs out of twenty leave them behind. The revision that filled the scope did not reinforce the instruction; it removed the need for cleanup: a procedure that creates nothing has nothing to clean. When intermediate files are truly necessary, what must happen even if the model does not think of it requires a mechanism that does not depend on the model.

**Each intermediate step is a rung the model can miss.** Tests were born in a draft before migrating to the suite, and that migration is the step missed ten times out of twenty. Writing the deliverable directly in its place removed the rung, and the two affected columns went up to 20/20 on both models.

**A procedure is revised like code, executions in hand.** The diagnosis does not come from the aggregated columns but from the executions read one by one: the missed migration, the instruction followed to the letter, and the phantom reference dictated each cut, and a new matrix verified the revision instead of trusting it.

**A documented field is not necessarily read.** `allowed-tools` appears in the documentation shipped with Pi and nowhere in its code. The code is the only source that never gets it wrong, and the verification amounts to a single `grep`.

**A harness building block is measured against what it replaces, never against nothing.** On this task, replacing the framed ticket with the procedure costs thirty points on the corner and fifty on the added tests, which does not show up in a comparison against the baseline.

## Deliverable

This module produces three pieces.

**1. The skill**, in `.pi/skills/<name>/`, with its description written by you and a deliverable whose form is imposed by the body. If you have revised it, both versions remain versioned: the matrix that compares them cannot be understood without them.

**2. The matrix directory** produced by `trysquare run`, with the skill configuration read against the one it replaces and not against the baseline.

**3. The “tools” row of the decision sheet**:

| lever                           | measured effect | adopted? | why |
| -------------------------------- | ------------ | -------- | -------- |
| skill (markdown)                 |              |          |          |
| skill description                |              |          |          |
| skill imposed by `/skill:`       |              |          |          |
| imposed deliverable form         |              |          |          |
| direct deliverable or via draft  |              |          |          |
| extension (real tool)            |              |          |          |

::: tip Success criterion
You can cite an effect of your skill that is established, one that is not, and say what is missing to settle the second.

This criterion requires having read a configuration against the right reference. It therefore cannot be satisfied from memory.
:::

## Pitfalls

**Reading a skill configuration against the baseline.** It differs from it by several things at once, and the gap published against `nothing` mixes all the levers of the stack. The useful reference is the configuration from which it differs only by the skill.

**Confusing an imposed skill with a proposed skill.** The `/skill:` in the prompt expands the body client-side, and a populated invocation column then says nothing about what the model would have chosen.

**Polishing the `SKILL.md` body while neglecting the description.** The body is only read if the description has triggered its reading.

**Getting tests written outside the suite.** A test case that lives in a working file will not be run by anyone after the agent leaves, and the migration promised to the suite is precisely the step the model misses.

**Relying on a cleanup instruction.** It is followed in fewer than one run in three, what remains in the tree makes the whole configuration's scope fail, and the reliable fix is not a better instruction but a procedure that creates nothing.

**Revising without measuring again.** A revision that answers the diagnosis point by point remains a hypothesis until a matrix has verified it. Our own also predicted a cost decrease on gemma, and this matrix cannot confirm it, its reruns making the cost columns unreadable.

**Accumulating skills.** Each costs little as long as it is not used, but their descriptions all enter the context on every turn.

## Going further

- [Agent Skills](https://agentskills.io), the open standard that Pi implements, and its page on system prompt integration.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Schick et al., [Toolformer](https://arxiv.org/abs/2302.04761), about the idea that a model learns when and how to call a tool.
- Yao et al., [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629), the loop that alternates reasoning and action.
- The [Pi extensions documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), for the building block that provides guarantees where skills give suggestions.
