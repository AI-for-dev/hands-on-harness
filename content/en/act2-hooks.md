# Hooks or deterministic events

In the previous modules, we mostly worked on files written in Markdown that were read (or not) by agents. In these files, we tried to describe development frameworks to help agents go where we wanted them to go. We recall that the randomness of LLMs means that it is not 100% certain that the directives given in these text files are actually carried out. They can get lost in the context.

In this module, we will look at making the actions we described in Markdown files deterministic. These actions can appear at different points in the workflow, and we will see that Pi can give you control at every level of the harness. This is done by building extensions. You have already installed some, and now you are going to build them. This is where we see all the power and flexibility of Pi.

These events can be called hooks.

## Understanding

### Why add deterministic events?

As we mentioned in the introduction, nothing prevents the LLM from ignoring a directive found in agent files or skills. There are therefore several benefits to adding deterministic events. We saw one at the very beginning of this training, in the sandbox module. Using an extension can prevent certain commands that we would not want the LLM to run in the session: reading a `.env` file, an ill-timed `rm -rf`... Another advantage is being able to guide the agent according to pre-established rules, particularly for the linter and unit tests.

The agent is forced to run it; it is not text. The response given by this deterministic action is then injected into the context and can steer the agent toward solving problems the right way (or rather your way). We can clearly see here that this is a new piece of the puzzle that allows for greater confidence and lets the model work fully autonomously. The idea is to have a final phase that matches our expectations and is easier to review and validate.

We recall that these deterministic events are complementary to the inference events seen in the previous modules. The idea is therefore to find the right balance between these two ways of interacting with the agent.

### When does this come into play?

These events can occur at any point in the development process

- at the start of the session to set up the development environment: uv, conda, ....
- at the end of the agent's work to check that the code produced correctly meets the project's development framework: linter, tests.
- at review time to check that there is no duplicated code, that the quality of the code produced is good...

In Pi, a hook is a TypeScript function registered with `pi.on("<event>", handler)` in an extension. Pi has no JSON configuration file that launches shell scripts with exit codes, like `settings.json` in Claude Code (see the [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks)).

Here are the events available in Pi.

#### At the start of the session (environment setup)

- `session_start` : prepare the environment (uv, conda) when a session starts. This is where you launch what must run during the session, and `session_shutdown` is where you stop it.
- `before_agent_start` : before each agent run. The handler can inject a message or replace the system prompt (`message`, `systemPrompt`).
- `resources_discover` : add paths for skills, prompts, etc.
- `project_trust` : decide whether to trust the project. Only user extensions or those passed on the command line take part in it.
- `input` : intercept the user's prompt, with three possible returns: `continue`, `transform` (rewrite the text) or `handled` (the prompt does not go to the model).

#### During the work (the guardrails)

- `tool_call` : this is the equivalent of Claude Code's `PreToolUse`. Returning `{ block: true, reason }` blocks the tool, and the reason is sent back to the model. You can also modify `event.input` in place. This is the right place for the `.env` and the `rm -rf`. If the handler crashes, the tool is blocked for safety.
- `tool_result` : this is the equivalent of Claude Code's `PostToolUse`. The handler can rewrite `content` or `isError`, for example to append the linter output after an edit.
- `user_bash` : the `!` commands typed by the user.
- `context` / `context_with_system` : transform the messages sent to the model.
- `message_end` : replace a finalized message.
- `session_before_compact`, `session_before_switch`, `session_before_fork`, `session_before_tree` : cancel the operation (`cancel`) or customize it.

#### At the end of the agent's work (linter, tests)

- `turn_end` and `agent_before_settle` : these are the only two boundaries where the handler can act. It returns `{ continue: true, entries }` to relaunch a request to the model with added context. This is the equivalent of the `Stop` hook: you run the tests, and if they fail you relaunch the agent with the output. The doc warns that an unconditional relaunch loops forever, so you need a stopping point.
- `agent_end` then `agent_settled` : notification only. `agent_settled` guarantees that Pi will not start again on its own.
- `session_shutdown` : cleanup, or automatic commit on exit.

You can see that you can really intervene at any moment and finely adapt your harness.

### A Pi extension

An extension is a TypeScript file. Pi loads it directly, with no compilation step. For a bigger extension, you can also use a directory containing an `index.ts`.

Here is an extension that stops the agent from reading the `.env` file:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event) => {
    if (event.toolName === "read" && event.input.path.endsWith(".env")) {
      return { block: true, reason: "Lecture du fichier .env interdite" };
    }
  });
}
```

On every tool call, Pi runs this function before the tool. If the agent tries to read a `.env`, the tool is not launched and the agent receives the `reason` message. In every other case, the function returns nothing and the call proceeds normally.

The directory where you drop the file determines its scope:

| Location | Scope |
|---|---|
| `~/.pi/agent/extensions/` | all your sessions, whatever the project |
| `.pi/extensions/` | this project only, once the project is approved |
| `pi --extension ./bloque-env.ts` | this session only, handy for testing |

## Rebuild

Here we propose to build two extensions for NÉON, each hooked into a different moment of the agent loop. The first runs before every tool call and rejects the shell commands listed in a rules file: it is a reduced version of [`pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system), installed in the module on the sandbox. The second runs when the agent is about to hand control back to you: it runs the syntax check and the tests, and if something fails, it sends the output back to the agent so it can fix it.

### How to reject a command run by the agent?

We want here to reproduce behaviours similar to [`pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system). The idea is to be able to describe rules for forbidden commands in `.pi/forbidden-commands.json`, at the root of NÉON. Each rule associates

- a pattern, which is a [JavaScript regular expression](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Regular_expressions) searched in the command
- a reason the agent will receive if its command matches the pattern

Here is what the rules file looks like

```json
{
  "forbidden": [
    { "pattern": "rm -rf", "reason": "recursive deletion, ask the user to run it themselves." },
    { "pattern": "git push.*--force", "reason": "rewrites the remote history." },
    { "pattern": "\\.env(\\s|$)", "reason": "the .env file contains secrets." },
    { "pattern": "curl|wget", "reason": "no network requests from the shell." }
  ]
}
```

JSON forces you to double the backslashes: the pattern `\\.env(\\s|$)` is read as the expression `\.env(\s|$)`, which matches `cat .env` without blocking `cat .env.example`.

The extension, `.pi/extensions/command-guard.ts`, fits in about twenty lines:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RULES_FILE = ".pi/forbidden-commands.json";

interface Rule {
  pattern: string;
  reason: string;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    // Re-read on every call: a new rule applies without restarting Pi.
    const text = readFileSync(join(ctx.cwd, RULES_FILE), "utf8");
    const rules: Rule[] = JSON.parse(text).forbidden;

    for (const rule of rules) {
      if (new RegExp(rule.pattern).test(event.input.command)) {
        return { block: true, reason: `Command refused by ${RULES_FILE}: ${rule.reason}` };
      }
    }
  });
}
```

The handler receives the event and a context `ctx`, of which only `ctx.cwd`, the project folder, is used here. `isToolCallEventType("bash", event)` lets all other tools through and tells TypeScript that `event.input.command` exists. The rules file is re-read on every call, which costs a disk read of a few bytes and lets you fix a rule while the session is running. When a pattern matches, the handler returns `{ block: true, reason }`: Pi does not run the command, and the reason reaches the model in place of the tool result. When nothing matches, the function returns nothing and the command runs.

The case where the file is missing, or contains invalid JSON, does not need to be handled by hand. `readFileSync` or `JSON.parse` then throws an exception, and Pi blocks the tool as soon as a `tool_call` handler fails. All shell commands are then refused and the model receives the error message (`ENOENT: no such file or directory…`), so an error in the rules file blocks the shell instead of letting everything through.

::: warning A regular expression does not understand the shell
This guardrail compares text. `rm -r -f game`, `find game -delete` or a Python script that deletes the folder all slip past the `rm -rf` pattern. `pi-permission-system` parses the bash command and refuses what it cannot classify, which makes it harder to bypass, and the sandbox remains the only limit that holds when the agent finds a path the rules did not anticipate. This extension serves to understand the mechanism and must be improved to be robust.
:::

::: info Exercise (in class)
In your NÉON clone, drop the two files above, then start Pi with the extension loaded for this session only:

```bash
pi -e .pi/extensions/command-guard.ts
```

Ask it to delete the `game/` folder, then to show you the contents of `.env` with `cat`. Both commands are refused, and you read the reason in the agent's reply. Without leaving the session, add a rule to the file that forbids `npm install`, then ask Pi to install a package: the rule applies right away.

Pi's `read` tool reads a file without going through the shell, so the rule on `.env` does not stop it. Extend the extension to also block `read` when `event.input.path` ends with `.env`, drawing on the example from the start of the module. Feel free to use Pi to help you implement this new feature.
:::

### How do you force the agent to pass the tests before handing back control?

NÉON's `CONTRIBUTING.md` forbids committing with red tests: `npm test` must pass. In the previous modules, you saw that a written instruction can be ignored, and an agent that stops after a change without re-running the tests leaves you to discover the regression. The following extension runs the checks itself, at the moment the agent has finished.

Two Pi events let you restart the agent with added context. `turn_end` fires after every model response, so after every edit, at a point where the code is often half-modified: tests would fail in the middle of a refactor that was going to bring them back to green. `agent_before_settle` fires once, when the agent has nothing left to do and is about to hand control back to you. It is the equivalent of Claude Code's `Stop` hook, and it is the one we use.

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const CHECKS = [
  { name: "tests", command: "npm test" },
];
const MAX_RETRIES = 3;
const MAX_OUTPUT = 3000; // output characters sent back to the model

export default function (pi: ExtensionAPI) {
  let codeChanged = false;
  let retries = 0;

  pi.on("tool_result", async (event) => {
    if (event.toolName === "edit" || event.toolName === "write") codeChanged = true;
  });

  pi.on("agent_before_settle", async (event, ctx) => {
    if (!codeChanged || event.outcome !== "completed") return;

    const failures: string[] = [];
    for (const { name, command } of CHECKS) {
      const r = await pi.exec("bash", ["-c", command], { cwd: ctx.cwd, timeout: 120_000 });
      if (r.code !== 0) {
        failures.push(`### ${name} (code ${r.code})\n${(r.stdout + r.stderr).slice(-MAX_OUTPUT)}`);
      }
    }

    if (failures.length === 0) {
      ctx.ui.notify("Checks: OK", "info");
      return;
    }
    if (retries >= MAX_RETRIES) {
      ctx.ui.notify(`Still failing after ${MAX_RETRIES} retries, handing control back to you.`, "warning");
      return;
    }

    retries += 1;
    return {
      continue: true,
      entries: [
        {
          type: "custom_message",
          customType: "checks",
          display: true,
          content: `The checks failed after your changes. Fix the code (not the tests), then finish.\n\n${failures.join("\n\n")}`,
        },
      ],
    };
  });

  pi.on("agent_settled", async () => {
    codeChanged = false;
    retries = 0;
  });
}
```

The extension registers three handlers that share two variables, `codeChanged` and `retries`.

The `tool_result` handler watches the tools that just ran and raises `codeChanged` as soon as an `edit` or a `write` took place. If you ask the agent a simple question, it changes nothing, and the tests are not run. Without this flag, a test already red before the session would force the agent to fix it on every question.

The `agent_before_settle` handler runs the checks, provided the code changed and the turn ended normally (`outcome` is `"aborted"` when you interrupt the agent, and we do not want to relaunch it against your wishes). It passes each command to `pi.exec`, which starts a process without a shell: hence the `bash -c`, needed for the `for` loop. The outputs of the failing commands are collected and truncated to their last 3,000 characters, because everything returned goes into the model's context and is paid for in tokens, and the summary of failing tests sits at the end of the `node --test` output.

The return `{ continue: true, entries }` asks Pi for a new request to the model, preceded by a `custom_message` that contains the check output. The model receives it as a user message and resumes the work. With `display: true`, the message also shows up in your terminal, which lets you follow what the harness told the agent. Both fields are needed: a `continue: true` without a message to process is rejected by Pi as an extension error, since the last message is the agent's and the model would have nothing new to read.

The `retries` counter exists because Pi does not limit the number of continuations. Claude Code stops after eight consecutive re-launches of a `Stop` hook, whereas Pi leaves that guardrail to the extension, and its documentation warns that an unconditional re-launch loops forever. After three attempts, the extension hands control back to you with a warning, which caps the token spend of an agent that cannot fix things. The `agent_settled` handler finally resets both variables to zero: this event fires only once the agent has actually stopped, after the last continuation, and the next request starts from a clean state.

::: info Exercise (in class)
Drop the extension into `.pi/extensions/final-checks.ts` and launch Pi with both extensions:

```bash
pi -e .pi/extensions/command-guard.ts -e .pi/extensions/final-checks.ts
```

Ask Pi to rename the function `collides` to `intersects` in `game/neon.js`, without touching `game/neon.test.js`. The tests import `collides` and therefore necessarily fail: you see the extension's message appear, then the agent's attempts, until the warning about the three retries. The extension's instruction ("Fix the code (not the tests)") contradicts yours, and only the counter ends the exchange. Watch whether the agent ends up modifying the test anyway: a guardrail in code can block a command, but it does not choose how the model resolves a conflict between two instructions.

Then submit a request that ends well, for example adding a test for the score (issue #5), and check that the "Checks: OK" notification appears at the end.
:::


## Generalizing

**A hook falls into the guides or the sensors category.** Birgitta Böckeler, in [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html), separates the controls that act before the agent, "Guides (feedforward controls) - anticipate the agent's behaviour and aim to steer it _before_ it acts.", from those that act after, "Sensors (feedback controls) - observe _after_ the agent acts and help it self-correct." She also distinguishes computed, or deterministic, controls (tests, linters, structure analysis) from inference controls (review by an LLM). With this vocabulary, `command-guard.ts` is a computed guide, `final-checks.ts` a computed sensor, and the `AGENTS.md` files and skills of the previous modules are inference guides. When a rule is not followed, this grid helps identify which family of control is missing.

**A hook only handles verifiable rules.** Matthews Wong ([Deterministic Hooks vs Agent Judgement in Claude Code](https://www.matthewswong.com/en/blog/deterministic-hooks-vs-agent-judgement/)) reserves for the hook the decisions that can be made from a file path, a diff, a command or an exit code ("Anything decidable from a path, a diff, a command string or an exit code"). In return, the hook never grants an exception ("It cannot be told that this edit is the exception, so it has no way to grant one"). A rule that requires judgement, such as "don't refactor beyond the ticket", therefore stays in `AGENTS.md`. Mitchell Hashimoto ([My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey)) applies this sorting: for each agent error, he adds either a rule in `AGENTS.md` or a programmed tool.

**A sensor's feedback is written for the model.** Addy Osmani ([Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/)) sums up the rule as "success is silent, failures are verbose". That is the choice made in `final-checks.ts`, which sends nothing to the model when everything passes and, on failure, sends it the truncated output along with a correction instruction. Böckeler sees in it "a positive kind of prompt injection": the error message is the only part of the check the model reads, and it lets the agent improve thanks to relevant feedback.

**A guardrail that inspects a command's text can be bypassed.** Tim Hopper ([How to stop AI agents from bypassing pre-commit hooks](https://pydevtools.com/handbook/how-to/how-to-stop-ai-agents-from-bypassing-pre-commit-hooks/)) starts from a real case, Claude Code's [issue #40117](https://github.com/anthropics/claude-code/issues/40117), where the agent bypasses pre-commit hooks with `--no-verify`, `git stash` and silent options. He shows that a refusal rule written as a pattern lets `git commit -m "wip" --no-verify` through, because the option is not where it is expected, which is exactly the weakness of our regular expression. He proposes five successive protections, from the instruction to CI, each catching what the previous one lets through. A hook only protects the tool that runs it ("A PreToolUse hook only catches Claude Code.") and CI remains the last net ("The agent cannot pass --no-verify to CI."). For NÉON, we find the same succession: instruction, `command-guard.ts`, sandbox, then the tests in CI.

**A feedback loop needs a stop condition and monitoring.** Pi relaunches the agent as many times as the extension asks, hence the `retries` counter. The relaunch also pushes the agent to make the tests pass by any means. Kent Beck ([Augmented Coding: Beyond the Vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes)) lists among his red flags "Any indication that the genie was cheating, for example by disabling or deleting tests.", and [ImpossibleBench](https://arxiv.org/abs/2510.20270) measures it on tasks impossible to solve honestly: allowing up to ten submissions with failing-test feedback raises the average cheating rate from 33% to 38%. The exercise on `collides` reproduces this situation on a small scale.

**The gap between a hook and an instruction remains a hypothesis.** We found no study that compares, with the harness held constant, a hook against the same rule written as an instruction. The closest measurement is [ContextCov](https://arxiv.org/abs/2603.00822), which adds executable checks to an agent, including interception of forbidden commands, and reports 88.3% compliance against 67.0% with `AGENTS.md` alone. The module's exercise on the sandbox, which counts the refusals obtained with an instruction and with a guardrail in code, gives you your own figure on NÉON.

## Deliverable

This module produces three pieces.

**1. The guardrail on commands**: `.pi/forbidden-commands.json` and `.pi/extensions/command-guard.ts`, extended to the `read` tool for `.env`, with at least one rule added by you after a command you saw the agent run.

**2. The end-of-work check**: `.pi/extensions/final-checks.ts`, whose `CHECKS` array holds your project's commands, not NÉON's if you apply it elsewhere.

**3. The "hooks" row of the decision sheet**:

| lever                                    | observed effect | adopted? | why |
| ---------------------------------------- | --------------- | -------- | --- |
| guardrail on commands (`tool_call`)      |                 |          |     |
| same rule written in `AGENTS.md`         |                 |          |     |
| end-of-work check (`agent_before_settle`) |                |          |     |
| retry ceiling                            |                 |          |     |
| protection of tests during a retry       |                 |          |     |

::: tip Success criterion
Faced with a rule your harness does not enforce, you know how to check it. If a command, a path, a diff or an exit code is enough, it is a hook's job. If it takes a model to judge, the check goes through inference, and therefore through `AGENTS.md` or a skill.
:::

## Going further

- Birgitta Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) (2026), the guides-and-sensors framework, computed or by inference, used in this module. Her follow-up post, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html), reports an experiment on maintainability sensors and discusses the choice of hooks that trigger them.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/) (2026), on the place of hooks in a harness and the shape of their return.
- Mitchell Hashimoto, [My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey) (2026), section "Step 5: Engineer the Harness", where the expression comes from.
- Kent Beck, [Augmented Coding: Beyond the Vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes) (2025), on the signals that show an agent is drifting, including the deletion of tests.
- Tim Hopper, [How to stop AI agents from bypassing pre-commit hooks](https://pydevtools.com/handbook/how-to/how-to-stop-ai-agents-from-bypassing-pre-commit-hooks/) (2026), the best before/after example: a rule bypassed, then five layers that catch it.
- Zarar Siddiqi, [Don't rely on instructions, use Agent Hooks to enforce guardrails](https://zarar.dev/agent-hooks-deterministic-guardrails-for-ai-generated-code/) (2026), two hooks tested on a design system, including a `Stop` hook that requires tests.
- Matthews Wong, [Deterministic Hooks vs Agent Judgement in Claude Code](https://www.matthewswong.com/en/blog/deterministic-hooks-vs-agent-judgement/) (2026), on the split between what a hook decides and what remains to the agent's judgement.
- Paddo, [Claude Code Hooks: Guardrails That Actually Work](https://paddo.dev/blog/claude-code-hooks-guardrails/) (2026), which presents hooks as one layer of a defense in depth. The incidents he cites come from other sources, to be checked before reusing them.
