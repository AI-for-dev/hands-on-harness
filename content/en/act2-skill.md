# Skills: a work procedure, and what it shifts

::: tip Objectives of this module
- Know what a skill is on Pi, what the model sees, and what it doesn't see
- Distinguish between a skill the model can ignore and a skill that is imposed on it
- Write a work procedure that produces a usable deliverable
- Measure what it shifts, and do not confuse shifting with improving
- Revise a procedure based on the read executions, and verify the revision with a new matrix
:::

The previous module covered what is gained by doing things better: choosing a model, adjusting a slider, writing a ticket, maintaining a rules file. It ended with an observation. Across configurations receiving the scoped ticket, four out of twenty executions write the failing tests requested by the ticket and never open `game/neon.js`: the model exhausts its budget formulating the cases and fails to fix them. The only lever that corrected this drop-off was providing the tests already written, which no one will do on a real ticket.

The question for this module is therefore whether a **work procedure**, written once and reloaded on demand, achieves the same result without providing the tests.

We follow the usual order: understand what a skill is in the harness, write one for this issue, measure what it produces, then revise and re-measure it.

## Understand

### A skill is a markdown file

A **skill** is a `SKILL.md` file placed in a `.pi/skills/<name>/` directory of the project, following the [Agent Skills](https://agentskills.io) open standard. It consists of a frontmatter, which contains at least a name and a description, and a body containing the instructions. There is no code, registration, or configuration required: simply depositing the file is enough.

Here is a complete skill, intentionally tiny:

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

The idea is a work procedure that you write once and the agent reloads on demand, instead of retyping it in every prompt. It occupies a separate place in the harness: `AGENTS.md` enters the context every turn and thus costs every turn, whereas a skill is designed to enter only when the task requires it.

### What the model sees

There is a mechanical point to understand clearly, as it conditions everything else. Pi injects the name, description, and path of each available skill into the system prompt **every turn**:

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

The **body** of the `SKILL.md` is not included. It enters the context through one of the following two paths, and the difference between them is the subject of this module.

The first is that the model **decides** to open it using the read tool, based solely on the description. Pi's documentation states it in the same terms, adding that "models don't always do this".

The second is that the user writes `/skill:revue-rapide` in their message, in which case Pi **expands** the file on the client side and pastes its body into the first turn. The model no longer has anything to decide.

There are two practical consequences. The description is the only thing the first path relies on, so all the care put into the body is useless until it is triggered. And a skill costs almost nothing as long as it is not used, which makes it tempting to accumulate them. However, keep in mind that every added description enters the context in each turn, and twenty skills end up forming a substantial preamble.

::: info Exercise (in-class)
Verify this mechanism yourself, in your clone of NÉON.

1. Create `.pi/skills/revue-rapide/SKILL.md` with the content above, modify a line of a game file, then open a session.
2. Export the session with `\export` and find the `<available_skills>` block in the system prompt: the name, description, and path are there, the body is not.
3. Ask "read what I just modified" without naming the skill, and see if the model reads `SKILL.md` on its own: the call to the read tool is visible in the session.
4. Open a new session and type `/skill:revue-rapide`. This time the body is pasted into your first message, and there is no longer any decision to observe.

You have just gone through both paths. The first relies entirely on the description, the second does not need it.
:::

## Rebuilding

### What a procedure must produce

The skill we are writing addresses the gap measured in the previous module, and it therefore has two things to achieve. The first is that the agent **breaks down** the symptom reported by the player into distinct faults, instead of stopping at the first explanation that accounts for what it sees. The second is that it **stays the course**, meaning it corrects each fault until it is green instead of stopping once the red cases are written.

The `playtest` skill is written for this. It gives the agent a role - that of a playtester who knows that a symptom is not a bug - a coordinate reference so that speed signs are not guessed, a table of ten failure families to go through one by one, and the requirement to quantify each trigger from the file constants rather than describing it.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest/SKILL.md{md}

Two writing decisions are worth noting, because they can be applied to any procedure.

**The deliverable is a file with a mandatory format.** Step 4 prescribes the format of `.scratch/to_fix.md`: a default block, with its cause localized down to the line, its violated invariant, its quantified trigger, its test case, the actual failure output copied from the terminal, and the naive fix that this case rejects. An agent that produces this file has necessarily performed the work described in the file.

**The procedure also describes what it rejects.** Step 3 requires making each case fail twice: once on the current code and once on the naive fix, which prohibits tests that only verify that something has changed. This is the direct counterpart to what the previous module measured, where fixes passed the four faces but failed at the corner.

::: info Exercise (in-class)
Write the description before reading ours, then compare. This is the only line of the file that the model will certainly read, and its phrasing therefore requires the most care.

A useful criterion: does your description say **when** to use it, or only **what** the procedure does? Both phrasings look similar upon review, but only the first one helps the model decide to open the file.
:::

### How the skill enters the measurement

The two skill-based configurations in the matrix receive the following prompt:

<<<@/../scripts/trysquare-campaign/briques/issue1-simple-prompt-with-skill.md

Three things are to be noted. The request is the neglected request from the previous module. The `/skill:playtest` at the top causes the body of the file to be expanded on the client side, so the skill is **imposed** rather than suggested. And reading `ISSUES.md` is forbidden, so that the procedure works on the player's symptom and not on a ticket that has already been written.

The `skill_invoque` column therefore equals 20/20 for these two configurations by construction, and 0/20 for all others. It records a fact about the session without measuring a model decision, and nothing that follows concerns whether a good description triggers.

## What the measurement says

Skill-based configurations are compared against those that receive the scoped ticket, with identical `AGENTS.md` and reasoning. On `gemma-4-31b`, twenty repetitions:

| configuration                    | `in_scope` | `tests_added` | bricks | angles | output | neighbors |
| -------------------------------- | ---------- | --------------- | ------- | ------ | ------ | -------- |
| `+agents+well_crafted`           | 19/20      | 17/20           | 11/20   | 12/20  | 9/20   | 9/20     |
| `+agents+skill`                  | **6/20**   | **8/20**        | 16/20   | 7/20   | 13/20  | 14/20    |
| `+agents+add_tests+well_crafted` | 20/20      | 17/20           | 18/20   | 18/20  | 18/20  | 18/20    |
| `+agents+add_tests+skill`        | **9/20**   | **7/20**        | 13/20   | 12/20  | 13/20  | 13/20    |

We draw three interpretations from this, two of which are established and one that is not.

**The skill moves tests outside of the suite.** `tests_ajoutes` drops from 17/20 to 8/20, a gap of -47 points where the interval excludes zero. This is not a failure: the procedure explicitly asks for cases to live in `.scratch/to_fix.md`, and the agent obeys. The metric counts cases added to `game/neon.test.js`, so it records exactly what the skill decided to do: the cases exist, but in a location where the repository's test suite will never look for them.

**The skill leaves its drafts behind.** `in_scope` drops from 19/20 to 6/20, a -68 point difference, also established. The `touched` column names the culprits: `.scratch/to_fix.md` remains in eleven out of twenty runs, along with `.scratch/repro.test.js`, `.scratch/test_collision.js`, or `.scratch/probe.js`. However, step 6 of `SKILL.md` orders the removal of all created files. Consequently, the cleanup instruction is followed in fewer than one in three runs.

**Regarding the fix itself, nothing is established.** The criterion goes from 11/20 to 16/20 compared to the framed ticket, but its interval contains zero. The corner column goes the other way, 12/20 versus 7/20, and its interval also contains zero. The twenty runs do not allow concluding that the procedure helps or hinders.

::: warning What the gap from the baseline doesn't tell us
The synthesis shows `+agents+skill` at +29 points on the criterion compared to `nothing`, an established gap, and it would be tempting to treat this as the module's result.

This configuration differs from the baseline by **four things at once**: high reasoning, the rules file, the skill, and a web search extension. The first three each have their own configuration in the matrix; the skill does not, so nothing allows attributing a share of those twenty-nine points to it.

The only readable gap for the skill is the one comparing it to the framed ticket above, and it is inconclusive regarding the fix. Isolating the lever would require one more configuration—neglected request, high reasoning, rules file, and nothing else. It has not been measured.
:::

### The skill versus the best-equipped stack

The `+agents+add_tests+skill` configuration is read against `+agents+add_tests+well_crafted`, from which it differs only by the replacement of the framed ticket with the skill:

| column          | framed ticket | skill | gap       |
| ---------------- | ------------ | ---------- | ----------- |
| `in_scope`       | 20/20        | 9/20       | -55 pts `*` |
| `tests_ajoutes`  | 17/20        | 7/20       | -50 pts `*` |
| `rebond_angles`  | 18/20        | 12/20      | -30 pts `*` |
| `rebond_briques` | 18/20        | 13/20      | -25 pts `o` |

Three established gaps, all negative. For this task, with this model, the work procedure does not advantageously replace a well-written ticket, and the corner column says it most declares: it is the one that the ticket describes and that the skill, which is not allowed to read `ISSUES.md`, must find on its own.

`sonde_intacte` is 20/20, so no execution modified the probe it had in front of it.

### What the skill costs

| configuration                    | input tokens     | turns | duration |
| -------------------------------- | --------------- | ----- | -------- |
| `+agents+well_crafted`           | 413 335         | 30    | 378 s    |
| `+agents+skill`                  | **921 783**     | 49    | 575 s    |
| `+agents+add_tests+well_crafted` | 558 473         | 31    | 590 s    |
| `+agents+add_tests+skill`        | **811 584**     | 44    | 540 s    |

Compared to the baseline, `+agents+skill` costs +908,622 input tokens, +47 turns, and +560 seconds, with all three gaps established. It is the most expensive configuration in the entire matrix.

::: warning These cost columns should be read with the caveat from the previous module
The two skill-based configurations alone account for 632 of the 1,151 retries in the ILaaS matrix, 345 for one and 287 for the other. A retry replays the turn with all the accumulated context, so these columns partly measure our own load on the provider.

The order of magnitude remains visible on the `deepseek-v4-flash` matrix, which has thirty-seven retries in total and where `+agents+skill` has a median of 1,068 seconds compared to 553 for `+agents+well_crafted`. A six-step procedure that requires documentary research, ten families to instruct, and a TDD loop is a long piece of work, and the measurement says nothing else.
:::

## Revising the procedure, then re-measuring

A work procedure is versioned text that produces measurable effects, and it is therefore revised like code: a diagnosis drawn from executions, a correction, a new measurement. The failed columns in the matrix each have a cause that can be read in the executions taken one by one.

**Tests are created in the wrong place.** Step 3 says that cases live in `.scratch/to_fix.md`, and Step 5 migrates them to `game/neon.test.js`. This migration is the step the model misses: ten out of twenty executions end with "6 cases, same as the benchmark," the agent having corrected the code against its drafts and considered the work complete.

**The cleanup instruction sometimes destroys the deliverable.** "Remove all files you created" went unheeded in thirteen executions that leave files behind, and two executions, on the contrary, followed it to the letter: `game/neon.test.js`, which the agent had just filled, no longer exists in the measured tree.

**A ghost reference creates files.** Step 3 asks to run each case "from the step 1 probe," while step 1 is the documentary research and creates no probe. This orphaned instruction, left over from a previous version of the file, forces the executions to invent what is missing: the `probe.js`, `repro.test.js`, and `test_ghost.js` files that fill the `touched` column are evidence of this.

The `deepseek-v4-flash` matrix completes the diagnosis: the same skill achieves 20/20 for `tests_ajoutes` there. The content of the procedure is therefore sufficient for a model that has the budget to roll it out; on `gemma-4-31b`, the protocol itself exhausts this budget.

### The revision: `playtest-court`

The revised version keeps what carries the content: the role, the coordinate reference, the table of ten families, and the requirement to encode each trigger from constants. It cuts the rest, and each cut responds to a flaw observed in the executions. Cases are written directly as red in `game/neon.test.js` and the procedure no longer creates any files, which removes both the failed migration and the need for cleanup. The web search step disappears, as sessions only showed a single call. The double red and the twelve-field block are replaced by a one-line requirement: the case verifies the expected behavior in values, never just "something has changed." The file goes from six steps to four and from 182 lines to 86.

<<<@/../scripts/trysquare-campaign/briques/skills/playtest-court/SKILL.md{md}

### What the second matrix says

The `issue1-skills` scenario pits the two skills against each other, using `AGENTS.md`, identical reasoning and model, twenty repetitions per cell, with the original serving as a reference for gaps. It lives in its own file so as not to affect the module's archived matrices, and its hypothesis, `hypotheses/issue1-skills.md`, was written before measuring. On `gemma-4-31b`:

| column          | `playtest` | `playtest-court` | gap                   |
| ---------------- | ---------- | ---------------- | ---------------------- |
| `in_scope`       | 9/20       | **20/20**        | +53 pts `*` [+32, +74] |
| `tests_ajoutes`  | 13/20      | **20/20**        | +32 pts `*` [+11, +53] |
| `rebond_briques` | 14/20      | 17/20            | +11 pts `o`            |
| `rebond_angles`  | 4/20       | 8/20             | +19 pts `o`            |

On `deepseek-v4-flash`, `in_scope` goes from 15/20 to 20/20, which is +25 established points [+10, +45], and no correction column moves: the gap on the criterion is +0 points.

We draw three conclusions from this.

**The two established shifts of the first version disappear.** The scope is full across the forty short-skill executions, and the tests all go into the repository suite. The models are the same, only the protocol has changed: when the deliverable is written directly in its place, there is no longer a migration to miss or cleanup to obtain. A procedure that actually needed intermediate files would retain the entire problem, and the permissions module will show how a hook that refuses a `git commit` as long as the draft is in the tree guarantees what a sentence can only suggest.

**The correction still does not move in an established way.** +11 points on the criterion and +19 on the corner, with intervals containing zero in both cases. The corner remains gemma's lowest column, at 8/20, far from the 14/20 that the framed prompt obtained in the previous module: the revision repaired the procedure protocol, it did not replace the ticket.

**The cost drops, and the gap is readable on flash.** Its matrix includes twenty-three runs, a total similar to the thirty-seven that the previous module considered readable, and the short skill uses a median of 12,861 input tokens compared to 34,764, 692 seconds compared to 1,054, and the turn difference is -27 with an interval of [-47, -16]. The gemma matrix follows the same trend but includes 490 runs, so its cost columns maintain the usual caution: the hypothesis predicted this drop, and this particular matrix cannot confirm it.

::: warning The replicated cell did not yield the same figures
`+agents+skill` remeasured on gemma gives 9/20 on the scope, 13/20 on the added tests, and 14/20 on the criterion, whereas the module campaign gave 6, 8, and 16. Same configuration, same commit, same model: it is the dispersion of the previous module, seen once again. This is also why the scenario remeasures the original in the same matrix instead of copying its old figures, and why the gaps in this section only compare cells measured together.
:::

The archive of these two matrices is in `scripts/trysquare-campaign/results-2026-08-13/`.

## What a skill does not guarantee

Everything the two matrices have just shown comes down to a single property: a skill only has text. The ignored cleanup instruction, the draft never migrated to the suite, the ghost reference followed to the letter: each time, the procedure asked for something that nothing forced the model to do. A skill has no input schema, no execution function, and no permission guard. Literature on agent tools describes the anatomy of a tool, namely a name, a description read by the model, an input schema, an execution function, and a permission between validation and execution, and a skill only implements the first two elements.

Pi has a second mechanism for the rest. An **extension** is a TypeScript module located in `.pi/extensions/`, which calls `pi.registerTool({ name, ... })`: a real tool, with a validated JSON schema, a function you wrote, and the ability to intercept tool calls to insert a permission. You have already encountered one without knowing it: the web search tool that the first version of the procedure requested is an extension, loaded by the `extension` block of the scenario. The permissions module will rely on this mechanism to transform instructions into guarantees.

::: danger A documented field is not necessarily read
If you are still looking for a permission mechanism on the skill side, you often read that a skill declares the tools it allows itself via an `allowed-tools` field in its frontmatter. The documentation provided with Pi 0.80.6 indeed describes it in its frontmatter table:

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

This type contains only three fields, and the string `allowed-tools` does not appear anywhere in the package's compiled code, whereas `disable-model-invocation` is indeed read. The `[key: string]: unknown` silently accepts everything you add, without ever using it or notifying you.

It's the same trap as the `--thinking max` from the previous module, even more deceptive, since the source leading you astray here is the tool's own documentation. A skill has no inherent permission mechanism, and if you want one, you need an extension.
:::

## What this module does not know yet

Two questions remain open, and it is better to name them clearly than to believe they have been settled.

**Does a good description trigger it?** Our configurations enforce the skill via `/skill:`, so the matrices measure an applied procedure and never a chosen procedure. The question relates to the mechanics described above; it is measurable with the `skill_invoque` column, which already exists for that purpose, and it requires a configuration where the skill is loaded by its name without being expanded in the prompt.

**Does the skill provide anything for the same request?** The control is still missing, meaning the same configuration without the skill. The second matrix did not add it: it compares two versions of the procedure with each other, not the procedure against its absence.

::: info Exercise (self-study)
Add a `+agents+skill_par_nom` configuration to the scenario, identical to `+agents+skill` but where the prompt does not contain the `/skill:`, the skill remaining loaded by the `harness` block. Relaunch, and read `skill_invoque`.

You will measure the only thing that this module asserts without having established it, and you will have touched neither the tool, nor the validator, nor the other configurations.
:::

## Generalize

**A skill is a work procedure, not a tool.** It has no input schema, no function, no permission, and the only mechanism it has is text. What it can do is impose a work order and a deliverable format, which is useful and should not be confused with the execution of code that you control.

**The description is the only thing guaranteed to be read.** The body only enters the context if the model decides to open it or if the user expands it with `/skill:`. A description that says what the procedure does, rather than when to use it, targets the wrong decision.

**A procedure shifts the work before improving it.** The two established effects of the first version are shifts: tests go into a draft file instead of the repository's test suite, and drafts remain in the tree. The revision removes these two shifts, and the effect on correctness remains inconclusive in both versions. Before asking if a building block improves the result, first look at where it sends the work.

**A cleanup instruction does not guarantee cleanup.** The final step of our `SKILL.md` asks to remove the created files, and eleven out of twenty executions leave them. The revision that met the scope did not strengthen the instruction; it removed the need for cleanup: a procedure that creates nothing has nothing to clean up. When intermediate files are truly necessary, ensuring they are handled even if the model forgets requires a mechanism that does not depend on the model.

**Every intermediate step is a hurdle the model can miss.** Tests originated in a draft before migrating to the suite, and this migration is the step lost ten times out of twenty. Writing the deliverable directly in its place removed the hurdle, and the two concerned columns went to 20/20 on both models.

**A procedure is revised like code, with execution logs in hand.** The diagnosis does not come from aggregated columns but from executions read one by one: the failed migration, the literally applied instruction, and the ghost reference dictated every cut, and a new matrix verified the revision instead of trusting it.

**A documented field is not necessarily read.** `allowed-tools` appears in the documentation delivered with Pi and nowhere in its code. The code is the only source that doesn't lie, and the verification is a simple `grep`.

**A harness building block is measured against what it replaces, never against nothing.** On this task, replacing the scoped ticket with the procedure results in a loss of thirty points on the corner and fifty on added tests, which is not visible in a comparison against the baseline.

## Deliverable

Three pieces.

**1. The skill**, in `.pi/skills/<name>/`, with its description written by you and a deliverable whose form is imposed by the body. If you have revised it, both versions remain versioned: the matrix comparing them cannot be understood without them.

**2. The matrix directory** produced by `trysquare run`, with the skill configuration read against the one it replaces and not against the base.

**3. The "tools" line of the decision sheet**:

| lever                       | measured effect | adopted? | why      |
| --------------------------- | --------------- | -------- | -------- |
| skill (Markdown)             |                 |          |          |
| skill description            |                 |          |          |
| skill imposed by `/skill:`   |                 |          |          |
| imposed deliverable format   |                 |          |          |
| direct deliverable or draft  |                 |          |          |
| extension (actual tool)      |                 |          |          |

::: tip Success Criterion
You can cite an established effect of your skill, an effect that is not established, and state what is missing to decide the latter.

This criterion requires having read a configuration against the correct reference. Therefore, it cannot be satisfied from memory.
:::

## Pitfalls

**Reading a skill configuration against the base.** It differs from it in several ways at once, and the gap published against `nothing` mixes all the levers of the stack. The useful reference is the configuration from which it differs only by the skill.

**Confusing an imposed skill with a proposed skill.** The `/skill:` in the prompt expands the body on the client side, and a full invocation column then says nothing about what the model would have chosen.

**Polishing the body of `SKILL.md` while neglecting the description.** The body is only read if the description triggered its reading.

**Having tests written anywhere other than in the suite.** A test case living in a work file will not be run by anyone after the agent departs, and the promised migration to the suite is precisely the step the model misses.

**Relying on a cleanup instruction.** It is followed in fewer than one in three executions; whatever remains in the tree causes the scope of the entire configuration to fail, and the robust correction is not a better instruction but a procedure that creates nothing.

**Revising without remeasuring.** A revision that addresses the diagnostic point by point remains a hypothesis until a matrix has verified it. Ours also predicted a cost reduction on gemma, and that matrix cannot confirm it, as its retries make the cost columns unreadable.

**Accumulating skills.** Each costs little as long as it is not used, but all their descriptions enter the context every turn.

## Going further

- [Agent Skills](https://agentskills.io), the open standard that Pi implements, and its page on integration into a system prompt.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Schick et al., [Toolformer](https://arxiv.org/abs/2302.04761), on the idea of a model learning when and how to call a tool.
- Yao et al., [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629), the loop that alternates reasoning and action.
- The [Pi extensions documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), for the component that provides guarantees where the skill provides suggestions.
