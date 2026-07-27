# The starting harness: Pi

::: tip Module objectives
- Why use Pi
- Launch Pi and understand the role of the `.pi/` directory
- Locate the four extensions we will use to embody the bricks grid
- Honestly frame the reconstruction exercise
:::

We previously saw that a harness is a set of tools on top of LLMs. Each can play an essential role in accomplishing a task autonomously. You have access to a set of pre-built harnesses: Claude Code, Codex, OpenCode, Pi... But in most cases, you master nothing and let yourself be guided, hoping it does what you asked. If something goes wrong, it is not always easy to understand why. Yet, our goal is precisely to understand how a harness works in every detail. We want to be able to easily add or remove an element from it and test the consequences.

In the following sections, we will use [Pi](https://pi.dev), a minimalist, open, and extensible command-line code agent. What interests us specifically is the ability to add extensions to it simply and understand everything happening inside without surprises: end-to-end mastery.

## What Pi is

Pi is a code agent that runs in your terminal, originally created by Mario Zechner. Its primary goal was precisely to have mastery over its harness. Pi relies on a handful of basic tools — reading a file, writing one, editing it, executing a shell command — and on an agentic loop that chains model calls, tool execution, and result review. This is exactly the loop we described in the previous module, reduced to its simplest expression.

Around this core, Pi exposes an extension and event system. You can hook into key moments of the loop with `pi.on(...)`, similar to how hooks are attached in Claude Code.

Just as Claude Code relies on a `.claude/` directory, Pi relies on a `.pi/` directory. This is where configuration, skills, agents, and permission rules live. You can consider this Pi's equivalent of what you may already know on the Claude Code side.

Pi knows itself well and is therefore able to help you extend its functionality. Everything is described in its "system prompt," as you will see shortly.

## Getting started

To install Pi, simply visit the official site at https://pi.dev and follow the prompts.

Next, you need to install models that you will use throughout your experiments. There are several ways to configure your model provider: https://pi.dev/docs/latest/providers. We encourage you to have a fairly powerful model for high-quality planning and a faster model that will code incrementally based on the tasks established by the planner.

For those following this training in person, we propose using the models provided by [ILaaS](https://www.ilaas.fr/), a shared platform aimed at trustworthy, robust, ethical, and efficient generative AI. This service comes from the French academic world.

You must edit the `~/.pi/agent/models.json` file and populate it as follows:

```json
{
    "providers": {
        "ilaas": {
            "baseUrl": "https://llm.ilaas.fr/v1",
            "api": "openai-completions",
            "apiKey": "XXXXX",
            "models": [
                {
                    "id": "gemma-4-31b",
                    "contextWindow": 128000,
                    "reasoning": true
                },
                {
                    "id": "qwen-3.6-35b-instruct",
                    "contextWindow": 256000
                }
            ]
        },
    }
}
```

You will need to enter the API key provided to you. The models listed are those available during the training. Feel free to check the ILaaS page for updates (https://www.ilaas.fr/liste-des-modeles-llms/).

If everything went well, you should be able to use Pi. Launch your first interactive session with `pi` in your terminal and verify that you have a prompt. Something like

![](/figures/pi.png)

You can observe the different elements composing Pi (context, skills, extensions) as well as the default model used in the bottom right corner (here `(ilaas) qwen-3.6-35b-instruct`).

You can experiment with it by asking questions, observing the loop, and seeing how it responds to you. Then try the non-interactive mode with `pi -p`, which executes a request and returns control.

## The first useful commands

- Tools
    As mentioned in the introduction to this section, Pi comes with 4 tools. To get the list, simply type

    ```
    /tools
    ```

    You should see at least the tools: read, bash edit, write.

    ::: info Exercise
    From the prompt, try to trigger each of these tools through your questions.
    :::

- Your session tree

    It can be useful to navigate through your session and return to a previous step in your discussion. To do this, use the command

    ```
    \tree
    ```

    ::: info Exercise
    Try returning to a point in your discussion thread.
    :::

- Resuming a previous session

    You can resume from any previous sessions using the command

    ```
    \resume
    ```

    ::: info Exercise
    Try resuming a previous session.
    :::

- Exporting your session

    Finally, you can export your session in HTML or JSON format using the command

    ```
    \export
    ```

    ::: info Exercise
    Export your session in HTML (default format) and open the file. You can finally see what Pi's minimal "system prompt" looks like!
    :::

We have covered the main commands we consider useful for now. We will see others during this journey.

## Understanding the contents of Pi directories

## Installing an extension

## The four extensions

To embody the bricks grid, we will rely on four extensions, each corresponding to a brick. `pi-rtk-optimizer` will handle context and compaction. `@tintinweb/pi-subagents` will provide delegation. `pi-hermes-memory` will carry memory. `pi-lens` will complete observability and code tooling. Permissions and tools, however, will be rebuilt manually in `.pi/skills/`.

We introduce them here as an inventory; each extension will be presented in detail when its brick is rebuilt.

## The mapping table

The training's guiding thread lies in a three-column table. The first recalls the invariant, i.e., the enduring principle of each brick. The second shows how a real harness implements it, based on what the *leak* teaches us about Claude Code. The third indicates how we rebuild it on Pi. A fourth column remains empty: it is yours, to be filled with your own usage intentions.

| Invariant           | In Claude Code                 | Rebuilt on Pi                   | Your harness? |
| ------------------- | -------------------------------- | ------------------------------------ | --------------- |
| Context and cache   | static / dynamic boundary   | `pi-rtk-optimizer`                   |                 |
| Tools               | plugins guarded by permission | skills in `.pi/skills/`            |                 |
| Delegation          | isolated sub-agent, exposed as tool | `@tintinweb/pi-subagents`           |                 |
| Memory              | read/write + filtering      | `pi-hermes-memory`                   |                 |
| Safety              | modes and refusal rules     | `.pi/skills/permissions/` pipeline  |                 |

## An honest framing

Two points must be stated clearly before starting.

The first is that our goal is not to equal Claude Code. The reconstruction we are undertaking is minimal, and it will remain so. What we seek is to understand each brick well enough to be able to build one tailored to our needs.

The second is a tension we prefer to address head-on. Claude Code can now write its own harness on the fly, depending on the task. One might then ask what the point is of learning to build it manually. The answer lies in one sentence: you only pilot, audit, and adapt what you understand. Knowing how to build manually remains the condition for keeping control over what the agent does on your behalf.

## In practice

Retrieve the state of the training repository, get Pi to respond via model access, and fill in the fourth column of the table with your own usage: on what type of tasks would you like to make your work more reliable? This column will accompany you until the capstone of Act 4.

::: warning A trap to know
The `input` event triggers *before* skills expansion. If you prefix your inputs with a `/` command, it may not be recognized when your hook executes. We will return to this when we attach hooks to this event.
:::

## For further reading

- The [official Pi site](https://pi.dev/) and its [documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
- [Awesome Pi Coding Agent](https://awesome-pi.site/extensions/), the community directory of extensions and resources around Pi.
- The [`@earendil-works/pi-coding-agent`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) package on npm, for versions and installation.
- Anthropic, [A harness for every task](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code), on Claude Code's ability to write its own harness.
