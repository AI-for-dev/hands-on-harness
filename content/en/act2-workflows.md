# Workflows: the loop written in code

::: tip Module objectives
- Compose roles from the previous module using combo combinators: chain, fan-out, loop, delivery
- Write a pipeline: structure in the frontmatter, prose per step, and what a file cannot express
- Set an executable gate whose verdict overrides all approvals
- Read a workflow result: `ok`, `converged`, `approved`, and what each one does not say
- Replay ticket #2 end-to-end, without intervention between the brief and the verdict, and be able to prove the mechanism without a model
:::

The previous module concluded with two limits: nothing prevented the main session from doing the work itself, since its role as a relay relied on an instruction, and every routing action came from your working memory without being archived anywhere, making it impossible to replay, compare, or measure.

This module automates the actions recorded in your friction log. Routing becomes code that calls roles in an order decided at write-time, so that no model can reinterpret it, and the verdict becomes the execution of the test suite, the result of which does not depend on any approval. Only two human interventions remain, before the work and before the commit, and the practical part shows why these two stopping points are design decisions.

We follow the usual order: understand what a workflow is in combo, connect the roles from the previous module and replay ticket #2 end-to-end, then identify what remains true when the tool changes.

## Understanding

### A workflow is a function

In combo, a workflow is a function from an input to a `Result`, or a list of `Result`: the final text of an agent, its messages, its consumption, and an `ok` field that indicates if the turn completed without a model error. Combinators compose because they share this contract. Agents remain the Markdown files from the previous module; orchestration, however, is code: there is no description language to learn, and the combo documentation records this choice in its design decisions.

Nine combinators cover the useful forms:

| combinator   | form                                                             |
| ------------- | ----------------------------------------------------------------- |
| `chain`       | 1 → 1 → 1, the output of one step feeds the next                  |
| `fanOut`      | 1 → N branches in parallel, one agent for all or one per branch |
| `loop`        | 1 → 1 until a bar (`until`), iteration ceiling                   |
| `reduce`      | N → 1, an agent synthesizes branches                           |
| `route`       | a classifier chooses the destination                             |
| `orchestrate` | an agent decides the breakdown, plan validated before any launch |
| `pair`        | a worker and a reviewer, until agreement                      |
| `interview`   | the agent questions the user, one question at a time           |
| `deliver`     | plan, one pair per sub-task, project check, audit, fixes      |

**`ok`, `converged` and `approved` answer three different questions.** `ok` means turns executed without provider error; `converged`, on a `loop`, means the work reached the requested bar rather than exhausting its iteration ceiling; `approved`, on a `pair` or `deliver`, means someone signed off. Hitting a ceiling is not a success, and reading a report begins by distinguishing these three fields.

**A failure does not collapse the workflow.** A failing fan-out branch becomes a `Result` with `ok: false` in its place, while others continue, and a sub-agent that consumed twelve thousand tokens before failing still cost twelve thousand tokens: its consumption is counted even when `ok` is false.

::: warning An agent loop has no limit of its own
A turn is a `session.prompt()`, and the Pi agent loop runs as long as the model requests tools. A weak model that hallucinates a tool name, receives « unknown tool », and asks again, loops until something stops it: combo documentation reports 79 calls to a non-existent tool and approximately 500,000 input tokens in a single turn. `maxIterations` has a default (5), because an iteration is a discrete and expensive unit; `timeoutMs` does not have one, because no default value can decide that a legitimate task has run too long. Set a `timeoutMs` on everything running unsupervised: forgetting an argument should not be enough to enable an infinite loop.
:::

### The pipeline: the linear part, in Markdown

A linear sequence of combinators can be written in a file rather than in code: a **pipeline**, placed in `.pi/pipelines/` alongside the agents. The frontmatter contains the structure - the steps, their agents, their ceilings, and the project check - because it is actual YAML and nesting is natural there; the body contains the prose, one `## <id>` section per step. No agent reads this file to decide what comes next: the combo code unfolds it.

Pipelines follow the same scopes as agents (delivered, machine, repository, with the one closest to the work taking precedence) and the same security boundary: those from a repository are never loaded by default. The failure behavior differs, however, from that of agents, and this difference corrects a pitfall from the previous module: an incomplete agent file is silently ignored, whereas a **malformed pipeline is rejected**, never silently replaced by the default. An agent is discovered while a pipeline is requested by name, meaning that a file that is present but unreadable must be flagged with the reason rather than ignored.

Everything is validated **before** opening any session: the shape of each step, the correspondence between frontmatter entries and body sections in both directions, and each agent name against the roster. A typo in step four thus costs a second instead of three steps of actual work.

The limit is set in advance, and it is intentional: a pipeline has no condition, no branch, and no reference to step two. Each step receives its instruction, the starting request, and the output of the previous step, and nothing else. When an execution requires branching, it becomes a TypeScript workflow, which maintains the rule "agents are data, workflows are code" without prohibiting writing the linear part in Markdown.

### The gate: the test suite as verdict

`deliver` accepts a check, and the combo documentation reports the execution that imposed it: a peer wrote a function and its tests, the reviewer approved, the auditor approved, and the test file imported `./slugify.js` for a file named `slugify.ts`. The suite wouldn't even load: the two agents had read the code, and neither had executed it.

The mechanism is a **port**: the pipeline names the check (`verify: [npm, test]`), and the calling code executes it, via `execFile` and without a shell. Arguments are a list, so that `"npm test && rm -rf /"` remains a single argument and never two commands. Output is truncated from the **tail** rather than the head, because a test runner says what failed at the end. Finally, **when a check is configured, its verdict is final**: no approval, from any agent, turns a red check into a success.

## Rebuild

### What branching changed in roles

Connecting the agents from the previous module to `deliver` revealed two convention collisions, which stem from the same principle: the shape of the deliverable belongs to the caller.

The first one affects the planner. `deliver` sends its own plan request, a JSON array `[{"agent": …, "task": …}]`, and reads the response with a parser that is lenient on form but strict on substance: an unknown agent name is dropped, never replaced by a plausible alternative. The "for humans" plan from the previous module, with its `files:` and `done:`, contains nothing this parser knows how to read: we replayed this response against the actual parser, and delivery stops before opening a single session, with `no runnable plan`. The second one affects the reviewer: under `pair`, the agreement word is `LGTM`, alone on its line, and a reviewer who responds with `APPROVED` is never counted as an agreement, meaning the pair exhausts its turns.

The fix consists of a single rule added to both files: the default format serves the human orchestrator, and when the caller specifies the response format it knows how to read, that format applies, because a plan the caller cannot parse plans nothing. The fundamental rules—step size, red test first, frozen API—remain regardless of the format.

A new role is added: the auditor. The pair reviewer sees a sub-task; the auditor reads the finished whole and looks for what the sum of the parts missed: a step in the plan that no one performed, or a ticket requirement that no sub-task addressed. This is the "ensemble" version of the checks the reviewer from the previous module performed step-by-step.

<<<@/../scripts/agents/auditor.md{md}

### The pipeline for ticket #2

<<<@/../scripts/pipelines/issue2.md{md}

Five decisions in this file require justification. The fan-out from the previous module is written in the file, two agents, one per branch, with **literal** tasks: a fan-out whose branches come from the previous step would be another combinator, `orchestrate`, where an agent decides the split, and keeping the tasks literal removes the need for any template syntax in the format. `verify: [npm, test]` is declared once, at the top: this is the gate, which the pipeline names without executing it, as execution belongs to the code that owns the worktree. `maxTasks: 2` and `concurrency: 1` for delivery, because the workers write to the same tree and the work for ticket #2 is sequential: sequential work fits in one sub-task rather than three, and two concurrent coders on a single repository would produce overlapping writes that no one reviews. `maxAuditRounds: 3` instead of 2, because an audit that prescribes a fix consumes one round, the fix another, and one round must remain to sign off: with 2, a run where the second audit required a tweak ended as `approved: false` on a tree that was nonetheless green and compliant. The prose for the `work` step states the **contract** of the deliverable - namely the exact signature, purity, return format, and the behavior of `frame()` when the ball overlaps multiple bricks - because every freedom left open in the request becomes a variant from one run to another: before this block, six runs on this ticket produced three different signatures, including one that only broke one brick per frame without any test turning red. Finally, the same prose requires the red test first in the suite, which is the planner's rule repeated where the plan is created.

::: info Exercise (in-class)
Place the pipeline next to the agents, then check what Pi actually loaded before launching anything:

```bash
cd /chemin/vers/neon
cp /chemin/vers/hands-on-harness/scripts/pipelines/issue2.md .pi/pipelines/
cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi -e /chemin/vers/combo/extension
```

```
> /pipelines
```

The command lists the loaded pipelines, the format of each execution, and the files that fail to parse along with the reason. Intentionally break the frontmatter YAML, run `/pipelines` again, and observe the failure mode: the file is rejected and named with its reason, instead of being replaced silently.

Then start the loop:

```
> /build --pipeline issue2 --model ilaas/gemma-4-31b traite le ticket #2 d'ISSUES.md
```

`/build` stops exactly twice: at the brief before any work and at the commit at the end. Between the two, everything you did manually in the previous module happens automatically: the impact note, the plan, the coder-reviewer pair, `npm test`, the audit, and the fixes. Refusing one of the two stops doesn't undo anything, as the work remains in the tree. At the end, perform your own checks, those from the previous module: `npm test`, the list of exports, `git diff`, and the full trace in `runs/<timestamp>/`.
:::

An interrupted run resumes with `/build resume`: only **approved** sub-tasks are kept, the plan is reused rather than recreated, and nothing from the conversation is restored, meaning a resumed build reads the code again instead of replaying a transcription.

### The script version: what the pipeline cannot express

Fan-out fits in the file, but three things do not. The first is complete autonomy: `/build` stops twice by design and has a terminal while it runs, whereas a harness that must work alone, under CI, on a trigger, or in an experiment matrix, cannot afford either the stops or the terminal. The autonomous form of the loop is therefore a process, with no stops between the request and the verdict, and a machine-readable exit code.

The second is the verdict policy. The dry-run below shows that `approved` aggregates the audit and the check and not peer agreement: a non-converged peer appears in the report, but it does not block anything. If your policy requires peer agreement, this requirement is a line of code in the caller, a file that has neither conditions nor access to the report to express it. The third is measurement: comparing parallel vs sequential requires varying concurrency from one run to another without changing anything else, and reading `busyMs` against `wallMs`.

This is the second artifact of the module, the same execution as the pipeline, written with the library:

<<<@/../scripts/workflows/issue2.ts{ts}

The script does what the pipeline did, the same two branches, the same delivery, the same gate, and the three things can be seen there: the process exit code combines `approved` and peer agreement, so that the hardened policy fits in the two lines above the `exit` and a CI applies it without adding anything; `--sequential` reduces concurrency to one, and the parallelism line is printed. combo is imported from its clone, as an argument and never as an environment variable, because ambient state reaching a sub-agent is precisely what the combo design aims to prevent.

::: info Exercise (independently)
Run the script twice, with and without `--sequential`, and compare the parallelism line. Then compare what the fan-out actually provided for the total duration of the loop, including gate and audit: this is the quantified version of the comparison promised in the previous module.

Here is ours, two branches on `ilaas/gemma-4-31b`, clone reset between the two runs:

| | fan-out | sequential |
| --- | --- | --- |
| clock / work | 131 511 / 184 502 ms | 134 584 / 134 557 ms |
| parallelism line | **×1.40** | ×1.00 |
| explore / test | 53.0 s / 131.5 s | 75.9 s / 58.6 s |
| complete loop | 298 s | 348 s |

**Fan-out saved 3 seconds out of 134**, or 2.3%. The two branches individually run 37% slower when running together because they share a single provider's throughput: the x1.40 therefore measures the overlap of the two branches and not a loop acceleration. The 50-second gap in the full loop comes from model variance between runs, which is greater here than the measured gain, and not from parallelism.

Reproduce the measurement on your provider before concluding, because these figures describe a shared entry point and not a property of fan-out. What transfers is the method, and the finding that a good parallelism ratio does not prove any savings in total duration.
:::

### Mechanism proof, without a model

Before paying for a single token, the entire mechanism is dry-run, and the protocol can be reused for any workflow: the actual combo code (parser, `runPipeline`, `deliver`), the actual `npm test` of NÉON as a gate, and a fake model injected via the `spawn` port, whose coder applies the reference diff from ticket #2. Only the model is simulated; everything around it is the real code. This is `scripts/workflows/issue2-smoke.mjs`, which runs on a disposable clone containing the agents and the pipeline:

```bash
node scripts/workflows/issue2-smoke.mjs /chemin/vers/neon /chemin/vers/combo
```

And here is its output:

```
S1 parse+resolve            OK   note(fanOut) -> work(deliver)
S2 chemin vert              OK   approved=true, npm test: 9 cas verts
S3 gate                     OK   pair LGTM + audit APPROVED, check rouge => approved=false
S4 plan au format humain    OK   'no runnable plan' - la forme appartient à l'appelant
S5 mauvais mot d'accord     OK   pair jamais approuvé ; le tout reste sauvé par audit + check
```

Each line verifies a property. S1: the file parses and every name resolves before any session. S2: on the reference diff, the suite goes from 6 to 9 cases and everyone signs off. S3 is the central demonstration: with the same diff plus a sabotaged test, the peer approves, the audit approves, and `approved` remains false because the check is red: an approval does not override an executable verdict. S4 and S5 replay the two convention collisions described above, and prove that they fail where they should: before the work for the plan, in the peer for the verdict.

::: warning What `approved` aggregates
S5 shows a design subtlety to know before reading a `deliver` report: a peer who runs out of turns without agreement **is not a veto**. Their own `approved` remains false and is visible in the report, but the final delivery verdict is "the auditor signed off **and** the check is green". In S5, the work was done in the first turn, the audit and the suite confirmed it, and the delivery is approved even though no peer reviewer ever gave the right word: the final verdict relies on the check and on the overall reading, not on the agreement of every stage. If your policy requires peer agreement, it is written in the calling code, and the script version of this module does so in the two lines preceding its exit code.
:::

This proof says nothing about how a real model will handle the planner or coder role for this ticket. It establishes that if the model does the work, the harness will let it through, and if it does it poorly, the gate will stop it. The model's behavior itself is established only through measurement.

::: warning A green check doesn't mean the ticket is done
S3 establishes that an approval doesn't override a red verdict, and the reverse is not true. A real run of this pipeline showed this: `check: vert`, `approved: true`, twelve green cases, and in the tree a function `export function brickHit(state)` that mutates the state, whereas the ticket requires `brickHit(ball, bricks)`, **pure**. The auditor had prescribed the signature change, the reviewer let it slide, and the test suite validated it because no test constrains the required signature.

A gate only verifies what the test suite constrains. `approved` means "the auditor signed off and the check is green", never "the ticket is satisfied", and the only thing connecting the two is a test that someone wrote specifically for it. This also justifies the `tester` step of the fan-out: a test plan that specifies the expected signature transforms a prose requirement into an executable requirement.
:::

### The comparison left to measure

The previous module left an open question of measurement: does breaking the task into roles improve the result for ticket #2, compared to a single agent receiving the same brief? This module sets the protocol without publishing figures, and as in the rest of the training, the hypothesis is written before the measurement.

combo provides the building block: `experiment` replays the same workflow over M models and N repetitions, each cell in its own directory with its measurements, and returns a table where the flag columns are what your function returns (`approved`, the green suite, the intact exports). Two variants are enough: the loop from this module, and a single `run` of the coder with the framed ticket. The analysis columns are those from the module on context, with scope creep at the top.

::: info Exercise (independent)
First, write the hypothesis: what do you predict about the impact of role-splitting on scope creep, and under what condition would you say it brings nothing? Then, write the `experiment` function to test it, with twenty repetitions per variant. The lesson from the context module still applies: three repetitions show the variance and settle nothing.
:::

## Generalize

**Agents are data, workflows are code.** A file describes a role, code describes a sequence, and the boundary between the two is a contract: the linear part can become a file again, while the first condition forces it back into code. A system that stores orchestration in a configuration language ends up reinventing a programming language within it, without the accompanying tooling.

**An executable verdict beats all approvals.** Two agents approved a test that wouldn't load, and a check would have revealed it in a single command. The gate's verdict is the only one that is not an opinion, and it is final by construction.

**`ok`, `converged` and `approved` answer three different questions.** Loops that keep running do not mean the bar has been reached, an exhausted cap is not a success, and what the final verdict aggregates is read in the code rather than its name, as S5 demonstrates.

**The form of the deliverable belongs to the caller.** The same planner serves both a human and a parser, provided the prompt specifies who determines the form. The two collisions in this module were fixed with a single sentence each because roles and formats were separated from the start; if they had been mixed, the fix would have required a rewrite.

**Any check that can be moved before the first expenditure must be moved.** The pipeline is parsed, its sections paired, its agents resolved, and its plan bounded before the first session, so that a typo costs a second instead of three steps of actual work. This rule applies to any sequence where each step incurs a cost.

**Caps without defaults must be set manually.** The iteration cap has a default because the unit is discrete and expensive; the timeout does not because it would be arbitrary, so it is up to you to set it on anything running unattended. In every tool, look for what omitting an argument makes possible.

**The mechanism is verified without a model.** An injection port, the combo `spawn`, separates the harness from the model: a dry run proves that the harness routes, gates, and refuses as expected, in one second and for zero tokens, while what the model does with the role remains a question of the matrix. Confusing the two leads to paying for repetitions to verify code, or believing something is proven when it was only plausible.

**The stops in an autonomous harness are design decisions.** `/build` marks two stops, the brief and the commit, and everything else follows automatically. These stops are the two points where an error is more expensive to undo than to prevent, chosen during design, and an autonomous harness is judged by the position of its stops rather than their absence.

## Deliverable

This module produces three items.

**1. The pipeline and the script**, `scripts/pipelines/issue2.md` and `scripts/workflows/issue2.ts`, versioned with the three agent files affected by the branching: the two form rules added to the planner and the reviewer, and the auditor.

**2. The trace of a full run**: the `runs/<timestamp>/` directory of a `/build` carried out from brief to commit on ticket #2, and the green output of `issue2-smoke.mjs`. Proof of mechanism and actual execution remain two separate items because they establish different things.

**3. The "workflows" line of the decision sheet**:

| lever                               | observed effect | adopted? | why |
| ------------------------------------- | ------------- | -------- | ---  |
| markdown pipeline (linear part)       |               |          |      |
| code workflow (branches, measurement) |               |          |      |
| executable gate (`verify`)            |               |          |      |
| fan-out explorer ∥ tester             |               |          |      |
| full audit, after peers                |               |          |      |
| caps (`maxRounds`, `timeoutMs`)       |               |          |      |
| mechanism proof without model         |               |          |      |
| chosen stops (brief, commit)         |               |          |      |

::: tip Success criterion
With the report in hand, you can explain why a given run is `approved` or not—meaning which stage signed off, what the check returned, and which cap was reached—and you can cite the harness property that the dry run proves and the one it does not.

The first part requires having read a `deliver` report rather than just its final word; the second requires having run the proof yourself; neither can be answered from memory.
:::

## Pitfalls

**Parallelizing everything.** Two concurrent coders write to the same tree, and fan-out has a fixed cost that exploration alone rarely offsets: the quantified comparison in this module measured a gain of 3 seconds out of 134. Parallelism should be measured using `busyMs` vs. `wallMs` before being generalized.

**Forgetting `timeoutMs`.** It is the only guardrail without a default value: a round can loop on a hallucinated tool for hundreds of thousands of tokens, and no iteration cap limits the inside of a round.

**Reading `approved: true` as "the ticket is done".** The verdict aggregates a signature and a check, and the check only knows what the suite constrains. A delivery that changes the signature requested by the ticket passes the gate as long as no test constrains it; the remedy is an additional test rather than an additional role.

**Reading `ok` as success.** `ok` means the rounds ran. A `loop` can be `ok` and not converged, a `deliver` `ok` and not approved; `converged` and `approved` are what carry the answer.

**Believing the peer locks the delivery.** The final verdict aggregates the audit and the check; a non-converged peer appears in the report, but it does not block. If your policy requires it, implement it in the calling code.

**Letting a role impose its form on the caller.** A plan that the caller cannot analyze and a verdict it cannot read both fail silently on the agent side; the parser will tell you—before the work for the plan, but at the cost of a run for the verdict.

**Consider `/run` as a safe version of `/build`.** `/run` removes the interview and the commit stop, and nothing else: all writes from a step remain in the tree, and what an agent can do is still decided by its toolkit.

**Verify the mechanism through repetition.** Twenty model runs to confirm that a gate stops a failing test cost tokens where a dry run proof gives the same verdict in a second, and model variance blurs what you wanted to observe. Repetitions are for measuring the model; code is for inspection.

## Further reading

- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), the distinction between workflows and agents (which this module's combinators implement), and the patterns (chaining, routing, parallelization, orchestrator-workers, evaluator) in their general form.
- [The combo documentation](https://github.com/AI-for-dev/combo/tree/main/docs): the workflows, pipelines, and "Deliver a change" pages, as well as `docs/decisions.md`, which records design decisions and those that were reversed - a practice worth copying.
- [herdr](https://herdr.dev), to watch a `deliver` in action: one pane per sub-agent, with the peer and audit views visible while they run.
- The combo `NEXT.md`, which lists remaining tasks and pitfalls already encountered: every discovered flaw becomes a test.
