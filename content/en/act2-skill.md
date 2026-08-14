# Skills: a work procedure, and what it displaces

::: tip Module Objectives
- Know what a skill is on Pi, what the model sees of it, and what it does not see
- Distinguish a skill the model can ignore from a skill imposed on it
- Write a work procedure that produces a usable deliverable
- Measure what it displaces, and not confuse displacing with improving
- Revise a procedure based on runs read one by one, and verify the revision with a new matrix
:::

The previous module covered what is gained by doing things better: choosing a model, setting a slider, writing a ticket, keeping a rules file. It ended on an observation. On the configurations that receive the framed ticket, four runs out of twenty write the red tests that the ticket asks for and never open `game/neon.js`: the model exhausts its budget formulating the cases and fails to fix them. The only lever that made up for this drop-off was providing the tests already written, which nobody will do on a real ticket.

The question of this module is therefore whether a **work procedure**, written once and reloaded on demand, gets the same thing without providing the tests.

We follow the usual order: understand what a skill is in the harness, write one on this question, measure what it produces, then revise it and measure again.

## Understanding

### A skill is a markdown file

A **skill** is a `SKILL.md` file placed in a `.pi/skills/<name>/` directory of the project, in the format of the open standard [Agent Skills](https://agentskills.io). It consists of a frontmatter, which carries at minimum a name and a description, and a body that contains the instructions. There is no code, no registration, no configuration to plan: dropping the file is enough.

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

The idea is that of a work procedure written once that the agent reloads on demand, instead of retyping it in every prompt. It occupies a distinct place in the harness: `AGENTS.md` enters the context on every turn and therefore costs on every turn, whereas a skill is designed to enter only when the task calls for it.

### What the model sees of it

There is a mechanical point worth understanding well, because it conditions everything that follows. Pi injects into the system prompt, **on every turn**, the name, description, and path of each available skill:

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

The **body** of the `SKILL.md` is not there. It enters the context through one of the two following paths, and the difference between the two is the subject of this module.

The first is that the model **decides** to open it with the read tool, relying solely on the description. Pi's documentation says so in the same terms, adding that "models don't always do this".

The second is that the user writes `/skill:revue-rapide` in their message, in which case Pi **expands** the file client-side and pastes its body into the first turn. The model no longer has anything to decide.

There are two practical consequences. The description is the only thing the first path relies on, so all the care put into the body is useless as long as it does not trigger. And a skill costs almost nothing as long as it is not used, which makes it tempting to accumulate them. Keep in mind, however, that each added description enters the context on every turn, and that twenty skills end up forming a substantial preamble.

::: info Exercise (in-class)
Verify this mechanism yourself, in your NÉON clone.

1. Create `.pi/skills/revue-rapide/SKILL.md` with the content above, modify one line of a game file, then open a session.
2. Export the session with `\export` and find the `<available_skills>` block in the system prompt: the name, the description, and the path are there, the body is not.
3. Ask "review what I just changed" without naming the skill, and watch whether the model reads `SKILL.md` on its own: the call to the read tool is visible in the session.
4. Open a fresh session and type `/skill:revue-rapide`. The body is this time pasted into your first message, and there is no longer a decision to observe.

You have just walked through both paths. The first rests entirely on the description, the second does not need it.
:::

## Rebuilding

### What a procedure must produce

The skill we are writing addresses the drop-off measured in the previous module, and it therefore has two things to achieve. The first is that the agent **breaks down** the symptom reported by the player into distinct defects, instead of stopping at the first explanation that accounts for what it sees. The second is that it **goes the distance**, meaning that it fixes each defect through to green instead of stopping once the red cases are written.

The `playtest` skill is written for this. It gives the agent a role, that of the playtester who knows that a symptom is not a bug, a coordinate reference so that velocity signs are not guessed at, a table of ten failure families to go through one by one, and the obligation to give each trigger a numeric value from the file's constants rather than describe it.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest/SKILL.md{md}

Two drafting decisions deserve to be pointed out, because they carry over to any procedure.

**The deliverable is a file whose form is imposed.** Step 4 imposes the form of `.scratch/to_fix.md`, one block per defect, with its cause pinpointed to the line, its violated invariant, its numeric trigger, its test case, the actual failure output copied from the terminal, and the naive fix that this case rejects. An agent that produces this file has necessarily done the work the file describes.

**The procedure also describes what it rejects.** Step 3 asks to run each case red twice, once against today's code and once against the naive fix, which rules out tests that only verify that something changed. This is the direct counterpart to what the previous module measured, where fixes passed all four sides and failed at the corner.

::: info Exercise (in-class)
Write the description before reading ours, then compare. It is the only line of the file the model will read for certain, and its wording therefore demands the most care.

A useful criterion: does your description say **when** to use it, or only **what** the procedure does? The two formulations look alike on a re-read, but only the first helps the model decide to open the file.
:::

### How the skill enters the measurement

The two skill-based configurations in the matrix receive the following prompt:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt-with-skill.md

Three things are worth noting. The request is the neglected request from the previous module. The `/skill:playtest` at the head makes the file's body expand client-side, so the skill is **imposed** rather than offered. And reading `ISSUES.md` is forbidden, so that the procedure works on the player's symptom and not on an already drafted ticket.

The `skill_invoque` column is therefore 20/20 on these two configurations by construction, and 0/20 on all the others. It records a fact about the session without measuring a decision by the model, and nothing that follows bears on the question of whether a good description triggers.

## What the measurement says

The skill-based configurations are read against the ones that receive the framed ticket, with identical `AGENTS.md` and reasoning. On `gemma-4-31b`, twenty repetitions:

| configuration                    | `in_scope` | `tests_ajoutes` | bricks  | corners | output | neighbors |
| --------------------------------- | ---------- | ---------------- | ------- | ------- | ------ | --------- |
| `+agents+well_crafted`           | 19/20      | 17/20            | 11/20   | 12/20   | 9/20   | 9/20      |
| `+agents+skill`                  | **6/20**   | **8/20**         | 16/20   | 7/20    | 13/20  | 14/20     |
| `+agents+add_tests+well_crafted` | 20/20      | 17/20            | 18/20   | 18/20   | 18/20  | 18/20     |
| `+agents+add_tests+skill`        | **9/20**   | **7/20**         | 13/20   | 12/20   | 13/20  | 13/20     |

We draw three readings from this, two of which are established and one is not.

**The skill displaces the tests out of the suite.** `tests_ajoutes` goes from 17/20 to 8/20, a gap of -47 points whose interval excludes zero. This is not a failure: the procedure explicitly asks that the cases live in `.scratch/to_fix.md`, and the agent obeys. The metric counts the cases added to `game/neon.test.js`, so it records exactly what the skill decided to do: the cases exist, but in a place the repository's test suite will never go looking.

**The skill leaves its scratch files behind.** `in_scope` drops from 19/20 to 6/20, a gap of -68 points, also established. The `touched` column names the culprits: `.scratch/to_fix.md` remains in eleven runs out of twenty, accompanied by `.scratch/repro.test.js`, `.scratch/test_collision.js`, or `.scratch/probe.js`. Step 6 of the `SKILL.md` nonetheless orders the removal of every file created. The cleanup instruction is therefore followed in fewer than one run out of three.

**On the fix itself, nothing is established.** The criterion goes from 11/20 to 16/20 against the framed ticket, but its interval contains zero. The corner column goes the other way, 12/20 against 7/20, and its interval contains zero too. The twenty runs allow no conclusion, neither that the procedure helps, nor that it hurts.

::: warning What the gap against the base does not say
The summary publishes `+agents+skill` at +29 points on the criterion against `nothing`, an established gap, and it would be tempting to make it the result of the module.

This configuration differs from the base by **four things at once**: high reasoning, the rules file, the skill, and a web search extension. The first three each have their own configuration in the matrix, the skill does not, and nothing therefore allows attributing a share of these twenty-nine points to it.

The only readable gap for the skill is the one that compares it to the framed ticket, above, and it is inconclusive on the fix. Isolating the lever would require one more configuration, with the neglected request, high reasoning, the rules file, and nothing else. It has not been measured.
:::

### The skill against the best-equipped stack

The configuration `+agents+add_tests+skill` is read against `+agents+add_tests+well_crafted`, from which it differs only by the replacement of the framed ticket with the skill:

| column           | framed ticket | skill      | gap         |
| ----------------- | ------------- | ---------- | ----------- |
| `in_scope`       | 20/20         | 9/20       | -55 pts `*` |
| `tests_ajoutes`  | 17/20         | 7/20       | -50 pts `*` |
| `rebond_angles`  | 18/20         | 12/20      | -30 pts `*` |
| `rebond_briques` | 18/20         | 13/20      | -25 pts `o` |

Three established gaps, all negative. On this task, with this model, the work procedure does not advantageously replace a correctly written ticket, and the corner column says it most clearly: it is the one the ticket describes and that the skill, which is not allowed to read `ISSUES.md`, must find on its own.

`sonde_intacte` is 20/20, so no run modified the probe it had in front of it.

### What the skill costs

| configuration                    | input tokens | turns | duration |
| --------------------------------- | ------------- | ----- | -------- |
| `+agents+well_crafted`           | 413 335       | 30    | 378 s    |
| `+agents+skill`                  | **921 783**   | 49    | 575 s    |
| `+agents+add_tests+well_crafted` | 558 473       | 31    | 590 s    |
| `+agents+add_tests+skill`        | **811 584**   | 44    | 540 s    |

Against the base, `+agents+skill` costs +908 622 input tokens, +47 turns, and +560 seconds, all three gaps being established. It is the most expensive configuration in the entire matrix.

::: warning These cost columns should be read with the previous module's reservation
The two skill-based configurations alone carry 632 of the 1 151 retries in the ILaaS matrix, 345 for one and 287 for the other. A retry replays the turn with all the accumulated context, so these columns partly measure our own load on the provider.

The order of magnitude remains readable on the `deepseek-v4-flash` matrix, which counts thirty-seven retries in total and where `+agents+skill` takes a median of 1 068 seconds against 553 for `+agents+well_crafted`. A six-step procedure that imposes a documentation search, ten families to work through, and a TDD loop is a long piece of work, and the measurement says nothing else.
:::

## Revising the procedure, then measuring again

A work procedure is versioned text that produces measurable effects, and it is therefore revised like code: a diagnosis drawn from the runs, a fix, a new measurement. Each failing column in the matrix has a cause that can be read in the runs taken one by one.

**The tests are born in the wrong place.** Step 3 says the cases live in `.scratch/to_fix.md`, and it is step 5 that migrates them to `game/neon.test.js`. This migration is the step the model misses: ten runs out of twenty end up at "6 cases, same as the baseline", the agent having fixed the code against its scratch files and considered the work done.

**The cleanup instruction sometimes destroys the deliverable.** "Remove every file you created" went unheeded in the thirteen runs that leave files behind, and two runs instead applied it to the letter: `game/neon.test.js`, which the agent had just filled in, no longer exists in the measured tree.

**A ghost reference manufactures files.** Step 3 asks to run each case "from the probe in step 1", whereas step 1 is the documentation search and creates no probe. This orphaned instruction, left over from an earlier version of the file, pushes the runs to invent what is missing: the `probe.js`, `repro.test.js`, and `test_ghost.js` files that fill the `touched` column are the trace of it.

The `deepseek-v4-flash` matrix completes the diagnosis: the same skill scores `tests_ajoutes` at 20/20 there. The content of the procedure is therefore enough for a model that has the budget to run through it; on `gemma-4-31b`, it is the protocol itself that exhausts that budget.

### The revision: `playtest-court`

The revised version keeps what carries the content: the role, the coordinate reference, the table of ten families, and the obligation to give each trigger a numeric value from the constants. It cuts the rest, and each cut answers a defect read in the runs. The cases are written directly red in `game/neon.test.js` and the procedure no longer creates any file, which removes both the failed migration and the need for cleanup. The web search step disappears, since the sessions showed only a single call to it. The double-red pass and the twelve-field block are replaced by a one-line requirement: the case verifies the expected behavior in values, never just "something changed". The file goes from six steps to four and from 182 lines to 86.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest-court/SKILL.md{md}

### What the second matrix says

The `issue1-skills` scenario puts the two skills head to head, with identical `AGENTS.md`, reasoning, and model, twenty repetitions per cell, the original serving as the reference for the gaps. It lives in its own file so as not to touch the module's archived matrices, and its hypothesis, `hypotheses/issue1-skills.md`, was written before measuring. On `gemma-4-31b`:

| column           | `playtest` | `playtest-court` | gap                     |
| ----------------- | ---------- | ------------------ | ----------------------- |
| `in_scope`       | 9/20       | **20/20**          | +53 pts `*` [+32, +74]  |
| `tests_ajoutes`  | 13/20      | **20/20**          | +32 pts `*` [+11, +53]  |
| `rebond_briques` | 14/20      | 17/20               | +11 pts `o`              |
| `rebond_angles`  | 4/20       | 8/20                | +19 pts `o`              |

On `deepseek-v4-flash`, `in_scope` goes from 15/20 to 20/20, an established +25 points [+10, +45], and no fix column moves: the gap on the criterion is +0 point.

We draw three readings from this.

**The two established displacements of the first version disappear.** The scope is full across the forty runs with the short skill, and the tests all go into the repository's suite. The models are the same, only the protocol changed: when the deliverable is written directly in its place, there is no longer a migration to miss nor cleanup to obtain. A procedure that genuinely needed intermediate files would keep the problem intact, and the module on permissions will show how a hook that refuses a `git commit` as long as the scratch file is in the tree guarantees what a sentence can only suggest.

**The fix still does not move in an established way.** +11 points on the criterion and +19 on the corner, with intervals that contain zero in both cases. The corner remains gemma's lowest column, at 8/20, far from the 14/20 the framed prompt obtained in the previous module: the revision fixed the procedure's protocol, it did not replace the ticket.

**The cost drops, and the gap is readable on flash.** Its matrix carries twenty-three retries, a total of the same order as the thirty-seven the previous module judged readable, and the short skill takes a median of 12 861 input tokens there against 34 764, 692 seconds against 1 054, and the turn gap is -27 with an interval of [-47, -16]. The gemma matrix goes the same way but carries 490 retries, so its cost columns keep the usual reservation: the hypothesis predicted this drop, and that matrix cannot confirm it.

::: warning The replicated cell did not return the same numbers
`+agents+skill` remeasured on gemma gives 9/20 on scope, 13/20 on tests added, and 14/20 on the criterion, where the module's campaign had given 6, 8, and 16. Same configuration, same commit, same model: this is the dispersion from the previous module, seen once more. This is also why the scenario remeasures the original in the same matrix instead of copying its old numbers, and why the gaps in this section only compare cells measured together.
:::

The archive of these two matrices is in `scripts/trysquare-campaign/results-2026-08-13/`.

## What a skill does not guarantee

Everything the two matrices have just shown comes down to a single property: a skill is only text. The ignored cleanup instruction, the scratch file never migrated to the suite, the ghost reference followed to the letter: each time, the procedure asked for something that nothing obliged the model to do. A skill has no input schema, no execution function, no permission guard. The literature on agent tools describes the anatomy of a tool, namely a name, a description read by the model, an input schema, an execution function, and a permission between validation and execution, and a skill only realizes the first two of these elements.

Pi has a second mechanism for the rest. An **extension** is a TypeScript module placed in `.pi/extensions/`, which calls `pi.registerTool({ name, ... })`: a real tool, with a validated JSON schema, a function you wrote, and the ability to intercept tool calls to insert a permission there. You have already come across one without knowing it: the web search tool that the first version of the procedure required is an extension, loaded by the scenario's `extension` component. The module on permissions will build on this mechanism to turn instructions into guarantees.

::: danger A documented field is not necessarily read
If you are nonetheless looking for a permission mechanism on the skill side, it is often said that a skill declares the tools it authorizes itself via an `allowed-tools` field in its frontmatter. The documentation shipped with Pi 0.80.6 does indeed describe it, in its frontmatter table:

```
| `allowed-tools` | No | Space-delimited list of pre-approved tools (experimental). |
```

The type the code reads is this one:

```ts
export interface SkillFrontmatter {
    name?: string;
    description?: string;
    "disable-model-invocation"?: boolean;
    [key: string]: unknown;
}
```

This type contains only three fields, and the string `allowed-tools` appears nowhere in the package's compiled code, whereas `disable-model-invocation` is indeed read. The `[key: string]: unknown` silently accepts anything you add, without ever using it or warning you.

This is the same trap as the `--thinking max` from the previous module, even more deceptive still, since the source that misleads you here is the tool's own documentation. A skill has no permission mechanism of its own, and if you want one, you need an extension.
:::

## What this module does not yet know

Two questions remain open, and it is better to name them clearly than to believe them settled.

**Does a good description trigger?** Our configurations impose the skill via `/skill:`, so the matrices measure an applied procedure and never a chosen procedure. The question rests on the mechanics described above, it is measurable with the `skill_invoque` column that already exists for this, and it requires a configuration where the skill is loaded by its name without being expanded in the prompt.

**Does the skill contribute anything for an equal request?** The control is still missing, meaning the same configuration without the skill. The second matrix did not add it: it compares two versions of the procedure against each other, not the procedure against its absence.

::: info Exercise (on your own)
Add to the scenario a configuration `+agents+skill_par_nom`, identical to `+agents+skill` but whose prompt does not contain the `/skill:`, the skill remaining loaded by the `harness` component. Run it again, and read `skill_invoque`.

You will measure the only thing this module asserts without having established it, and you will have touched neither the tool, nor the validator, nor the other configurations.
:::

## Generalizing

**A skill is a work procedure, not a tool.** It has no input schema, no function, no permission, and the only mechanism it has is text. What it can do is impose a work order and a deliverable form, which is useful and should not be confused with executing code you control.

**The description is the only thing read for certain.** The body enters the context only if the model decides to open it or if the user expands it with `/skill:`. A description that says what the procedure does, rather than when to use it, addresses the wrong decision.

**A procedure displaces work before improving it.** The two established effects of the first version are displacements: the tests go into a scratch file rather than into the repository's suite, and the scratch files remain in the tree. The revision removes both displacements, and the effect on the fix remains inconclusive in both versions. Before asking whether a component improves the result, first look at where it sends the work.

**A cleanup instruction does not guarantee cleanup.** The final step of our `SKILL.md` asks to remove the created files, and eleven runs out of twenty leave them. The revision that filled the scope did not strengthen the instruction, it removed the need for cleanup: a procedure that creates nothing has nothing to clean up. When intermediate files are genuinely necessary, what must happen even if the model does not think of it requires a mechanism that does not depend on it.

**Every intermediate step is a step the model can miss.** The tests were born in a scratch file before migrating to the suite, and this migration is the step lost ten times out of twenty. Writing the deliverable directly in its place removed the step, and the two columns concerned rose to 20/20 on both models.

**A procedure is revised like code, runs in hand.** The diagnosis does not come from the aggregated columns but from the runs read one by one: the missed migration, the instruction applied to the letter, and the ghost reference each dictated a cut, and a new matrix verified the revision instead of just believing it.

**A documented field is not necessarily read.** `allowed-tools` appears in the documentation shipped with Pi and appears nowhere in its code. The code is the only source that is never wrong, and the verification comes down to a single `grep`.

**A harness component is measured against what it replaces, never against nothing.** On this task, replacing the framed ticket with the procedure loses thirty points on the corner and fifty on the tests added, which does not show up in a comparison against the base.

## Deliverable

Three pieces.

**1. The skill**, in `.pi/skills/<name>/`, with its description written by you and a deliverable whose form is imposed by the body. If you revised it, both versions stay versioned: the matrix that compares them cannot be understood without them.

**2. The matrix directory** produced by `trysquare run`, with the skill-based configuration read against the one it replaces and not against the base.

**3. The "tools" line of the decision sheet**:

| lever                             | measured effect | adopted? | why |
| ---------------------------------- | ---------------- | -------- | --- |
| skill (markdown)                  |                   |          |     |
| skill description                  |                   |          |     |
| skill imposed via `/skill:`        |                   |          |     |
| imposed deliverable form           |                   |          |     |
| direct deliverable or via scratch file |               |          |     |
| extension (real tool)              |                   |          |     |

::: tip Success criterion
You can name an effect of your skill that is established, an effect that is not, and say what is missing to settle the second one.

This criterion requires having read a configuration against the right reference. It cannot therefore be satisfied from memory.
:::

## The pitfalls

**Reading a skill-based configuration against the base.** It differs from it by several things at once, and the gap published against `nothing` mixes together all the levers of the stack. The useful reference is the configuration from which it differs only by the skill.

**Confusing an imposed skill with an offered skill.** The `/skill:` in the prompt expands the body client-side, and a full invocation column then says nothing about what the model would have chosen.

**Polishing the body of the `SKILL.md` while neglecting the description.** The body is read only if the description triggered its reading.

**Having the tests written somewhere other than in the suite.** A test case that lives in a working file will be run by nobody after the agent leaves, and the promised migration to the suite is precisely the step the model misses.

**Counting on a cleanup instruction.** It is followed in fewer than one run out of three, what remains in the tree fails the scope of the whole configuration, and the robust fix is not a better instruction but a procedure that creates nothing.

**Revising without measuring again.** A revision that answers the diagnosis point by point remains a hypothesis until a matrix has verified it. Ours also predicted a cost drop on gemma, and that matrix cannot confirm it, its retries making the cost columns unreadable.

**Accumulating skills.** Each one costs little as long as it is not used, but their descriptions all enter the context on every turn.

## For further reading

- [Agent Skills](https://agentskills.io), the open standard that Pi implements, and its page on integration into a system prompt.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Schick et al., [Toolformer](https://arxiv.org/abs/2302.04761), on the idea that a model learns when and how to call a tool.
- Yao et al., [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629), the loop that alternates reasoning and action.
- The [Pi extensions documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), for the component that gives guarantees where the skill gives suggestions.
