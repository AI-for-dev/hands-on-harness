# The starting harness: Pi

::: tip Module Objectives
- Why use Pi
- Launching Pi and understanding the role of the `.pi/` directory
- Locating the four extensions we will use to implement the building block grid
- Honestly framing the reconstruction exercise
:::

We have previously seen that a harness is a set of tools on top of LLM models. Each can play an essential role in completing a task autonomously. You have a set of pre-built harnesses at your disposal: Claude Code, codex, opencode, Pi... But in most cases, you have no control and let yourself be guided, hoping it does what you asked. If something goes wrong, it is not necessarily easy to understand why. Now, our goal is precisely to understand how a harness works in the smallest detail. We want to be able to easily add or remove an element and test the consequences.

Next, we will use [Pi](https://pi.dev), a minimalist, open, and extensible command-line code agent. What will interest us is precisely the possibility of simply adding extensions to it and understanding everything that happens inside without surprises: end-to-end control.

## What is Pi

Pi is a code agent that runs in your terminal, originally created by Mario Zechner. Its primary goal was precisely to have control over its harness. Pi relies on a handful of basic tools - reading a file, writing one, editing it, executing a shell command - and on an agentic loop that chains model calls, tool execution, and result review. This is exactly the loop we described in the previous module, reduced to its simplest expression.

Around this core, Pi exposes a system of extensions and events. You can hook into key moments of the loop with `pi.on(...)`, in the same way that hooks are connected in Claude Code.

Just as Claude Code relies on a `.claude/` directory, Pi relies on a `.pi/` directory. This is where the configuration, skills, agents, and permission rules live. You can consider it the Pi-side equivalent of what you may already know from Claude Code.

Pi knows itself very well and is therefore able to help you extend its functionality. Everything is described in its system prompt as you will see in a moment.

## Getting Started

To install Pi, simply go to the official site https://pi.dev and follow the instructions.

Next, you need to install models that will be used throughout your experiments. There are several ways to specify your model provider: https://pi.dev/docs/latest/providers. We encourage you to have a model powerful enough to perform high-quality planning and a faster model to code the tasks established by the planner.

For those attending this training in person, we suggest using the models provided by [ILaaS](https://www.ilaas.fr/), a shared platform aiming for trustworthy, robust, ethical, and sustainable generative AI. This service comes from the French academic world.

You must edit the `~/.pi/agent/models.json` file and fill it in as follows:

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

You will need to provide the API key that was given to you. The listed models are those available during the training. Feel free to visit the IlaaS page for updates (https://www.ilaas.fr/liste-des-modeles-llms/).

If everything went well, you should be able to use Pi. Start your first interactive session with `pi` in your terminal and verify that you have a prompt. Something like:

![](/figures/pi.png)

You can see the different components of Pi (context, skills, extensions) as well as the default model used in the bottom right (here `(ilaas) qwen-3.6-35b-instruct`).

You can play with it by asking questions, observing the loop, and seeing how it responds. Then, try the non-interactive mode with `pi -p`, which executes a request and returns control.

## First useful commands

- Tools

    As mentioned in the introduction to this section, Pi comes with 4 tools. To get the list, simply type:

    ```
    /tools
    ```

    You should see at least the following tools: read, bash, edit, write.

    ::: info Exercise
    From the prompt, try to trigger each of these tools with your question.
    :::

- Your session tree

    It can be useful to navigate through your session and return to one of the steps of your discussion. To do this, use the command:

    ```
    \tree
    ```

    ::: info Exercise
    Try returning to a point in your discussion thread.
    :::

- Resuming a previous session

    You can resume from any previous session using the command:

    ```
    \resume
    ```

    ::: info Exercise
    Try resuming a previous session.
    :::

- Exporting your session

    Finally, you can export your session in HTML or JSON format using the command:

    ```
    \export
    ```

    ::: info Exercise
    Export your session in HTML (default format) and open this file. You can finally see what Pi's minimal system prompt looks like!
    :::

We have covered the main commands that we consider useful for now. We will see others during this journey.

## Understanding the contents of Pi directories

Pi distinguishes between two directories with the same name `.pi/`, and you need to learn how to tell them apart right away to avoid getting lost.

The first one resides in your home directory, `~/.pi/agent/`. This is the global configuration, the one that applies by default to all your projects: you have already interacted with it by editing `~/.pi/agent/models.json` to declare your model providers. It also contains `settings.json` for general preferences (default provider and model, theme, proxy...), and `trust.json`, which remembers from one session to another the projects you have chosen to trust.

The second one lives at the root of your project, `.pi/`, which you version along with the rest of the repository. It contains elements specific to the current project: a `settings.json` that overrides the global one (nested objects are merged, not replaced as a whole), and above all, the directories that we will fill ourselves throughout the training, starting with `skills/` for the tools we will write.

This distinction is not just a matter of organization. Skills declared in the global directory load without any particular verification: they follow you everywhere. Those in the project only load once that project is marked as safe, specifically in the `trust.json` mentioned above. This is a very concrete first glimpse of the safety component we will rebuild later: a harness that would indiscriminately execute code found in any cloned repository would be a vulnerability in itself.

Keep this simple rule in mind for the future: whatever should apply everywhere goes in `~/.pi/agent/`, whatever is specific to the NÉON repository goes into its local `.pi/`, and it is this second directory that we will populate throughout the following modules.

## Extensions

Pi is not limited to its four basic tools and is completely extensible. You can add any actions via the `pi.on(...)` mechanism already mentioned, which allows you to modify the behavior within the agentic loop. You can also change the user interface, called TUI, by adding information to the different zones. These behavioral changes make Pi extremely interesting because you are the architect of your harness. You only need to create an extension for your needs. You can, of course, distribute it or use extensions created by the community. To find some, the official gallery at [pi.dev/packages](https://pi.dev/packages) is the best resource.

An extension is distributed as an npm package or a git repository, and is installed with `pi install`:

```
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

By default, the installation is global: the package is placed in `~/.pi/agent/npm/` (or `~/.pi/agent/git/<host>/<path>` for a git repository), and the extension becomes available in all your Pi sessions, across all your projects. Add `-l` to the command to install it locally instead: the package then lands in `.pi/npm/`, and the extension is only active for this project, once it has been marked as safe, exactly as we saw in the previous paragraph for skills. To remove a package, the symmetrical command is `pi remove npm:@foo/bar`.

To try an extension without installing it, whether it's a package or a simple local file, the `-e` (or `--extension`) option loads it only for the duration of the current session:

```
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

This is the habit to adopt before committing to an extension found in the community directory. However, keep in mind that an extension runs with all your system permissions: only install and test what you are ready to run with confidence.

## The Four Extensions

We could have had you build your own extensions, but given the time allotted and the fact that you likely know neither the Pi tool nor the structure of a harness, it would have been a waste of time and motivation. We hope that by the end of this training, you will have a clear enough understanding to come up with ideas to improve your harness through new Pi extensions.

To build our harness, we will rely on four extensions:

- `pi-rtk-optimizer` will handle context and compaction,
- `@tintinweb/pi-subagents` will provide delegation,
- `pi-hermes-memory` will handle memory,
- `pi-lens` will complete observability and code tooling.

Permissions and tools will be built by hand in `.pi/skills/`.

::: info Exercise
Install one of the four extensions presented below locally (`-l`), and verify that it appears in `.pi/npm/`. Launch Pi; you should see it in the extension section. You can try removing it with `pi remove`.
:::

## Going Further

- The [official Pi website](https://pi.dev/) and its [documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
