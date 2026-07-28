# The starting harness: Pi

::: tip Module objectives
- Why use Pi
- Launching Pi and understanding the role of the `.pi/` directory
- Locating the four extensions we will use to embody the brick grid
- Honestly framing the reconstruction exercise
:::

We previously saw that a harness was a set of tools on top of LLM models. Each can play an essential role in completing a task autonomously. You have a set of pre-built harnesses at your disposal: Claude Code, codex, opencode, Pi... But in most cases, you lack control and you are guided, hoping it does what you asked. If something goes wrong, it is not necessarily easy to understand why. Yet, our goal is precisely to understand how a harness works in the smallest detail. We want to be able to easily add or remove an element from it and test the consequences.

Moving forward, we will use [Pi](https://pi.dev), an open, extensible, and minimalist command-line coding agent. What will interest us is precisely the possibility of adding extensions to it simply and understanding everything that happens inside without surprises: end-to-end control.

## What Pi is

Pi is a coding agent that runs in your terminal, originally created by Mario Zechner. Its primary goal was precisely to have control over its harness. Pi relies on a handful of basic tools - reading a file, writing one, editing it, executing a shell command - and on an agentic loop that chains model calls, tool execution, and result review. This is exactly the loop we described in the previous module, reduced to its simplest expression.

Around this core, Pi exposes a system of extensions and events. You can hook into key moments of the loop with `pi.on(...)`, the same way you plug in hooks in Claude Code.

Just as Claude Code relies on a `.claude/` directory, Pi relies on a `.pi/` directory. This is where configuration, skills, agents, and permission rules live. You can think of it as the Pi equivalent of what you may already know from Claude Code.

Pi knows itself very well and is therefore able to help you extend its functionality. Everything is described in its "system prompt" as you will see in a moment.

## First steps

To install Pi, simply go to the official site https://pi.dev and follow the instructions.

Next, you need to install the models you will use throughout your experiments. There are several ways to specify your model provider: https://pi.dev/docs/latest/providers. We encourage you to use a model powerful enough for high-quality planning and a faster model to write the code for the tasks established by the planner.

For those attending this training in person, we suggest using the models provided by [ILaaS](https://www.ilaas.fr/), a shared platform aiming for trustworthy, robust, ethical, and sustainable generative AI. This service comes from the French academic community.

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
                    "reasoning": true,
                    "cost": { "input": 0.14, "output": 0.28, "cacheRead": 0.0028, "cacheWrite": 0 }
                },
                {
                    "id": "qwen-3.6-35b-instruct",
                    "contextWindow": 256000,
                    "cost": { "input": 0.14, "output": 0.28, "cacheRead": 0.0028, "cacheWrite": 0 }
                }
            ]
        },
    }
}
```

You will need to provide the API key that was given to you. The models listed are those available during the training. Feel free to visit the IlaaS page for updates (https://www.ilaas.fr/liste-des-modeles-llms/).

::: info The cost block is not provider data
The `cost` field is optional and defaults to zero. Without it, the `/session` command will report a cost of €0.00 for all your sessions, depriving you of a metric we will use frequently later on.

The rates above, expressed per million tokens, are market rates for a model of comparable size. They do not correspond to actual billing: your use of ILaaS is not billed per token. They are only there to provide a ballpark figure.

Keep this in mind especially, as it is already a harness lesson: the cost displayed by a code agent is not information received from the provider, but a calculation based on a configuration field that you wrote yourself.
:::

If everything went well, you should be able to use Pi. Start your first interactive session with `pi` in your terminal and verify that you have a prompt. Something like

![](/figures/pi.png)

You can see the different elements that make up Pi (context, skills, extensions) as well as the default model used at the bottom right (here `(ilaas) qwen-3.6-35b-instruct`).

You can play with it by asking questions, observing the loop, and seeing how it responds. Then try the non-interactive mode with `pi -p`, which executes a request and returns control.

## First useful commands

- Tools

    As mentioned in the introduction to this section, Pi comes with 4 tools. To get the list, simply type

    ```
    /tools
    ```

    You should see at least these tools: read, bash edit, write.

    ::: info Exercise
    From the prompt, try to trigger each of these tools through your questions.
    :::

- Your session tree

    It can be useful to navigate your session and go back to one of the steps in your discussion. To do this, use the command

    ```
    \tree
    ```

    ::: info Exercise
    Try going back to a point in your discussion thread.
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
    Export your session to HTML (default format) and open the file.
    :::

We have covered the main commands we consider useful for now. We will see others during this journey.

## Understanding the contents of Pi directories

Pi distinguishes between two directories with the same name `.pi/`, and you need to learn how to differentiate them right away to avoid getting lost.

The first one lives in your home directory, `~/.pi/agent/`. This is the global configuration, which applies by default to all your projects: you've already interacted with it by editing `~/.pi/agent/models.json` to declare your model providers. You'll also find `settings.json` for general preferences (default provider and model, theme, proxy...), and `trust.json`, which remembers from one session to the next the projects you have chosen to trust.

The second one lives at the root of your project, `.pi/`, which is the one you version along with the rest of the repository. It contains elements specific to the current project: a `settings.json` that overrides the global one (nested objects are merged, not replaced entirely), and especially the directories that we will fill ourselves throughout the training, starting with `skills/` for the tools we will write.

This distinction is not just for organization. Skills declared in the global directory load without any particular verification: they follow you everywhere. Project skills, however, only load once the project is marked as safe, specifically in the `trust.json` mentioned above. This is a very concrete first glimpse of the security building block we will reconstruct later: a harness that indiscriminately executes code found in any cloned repository would be a flaw in itself.

Keep this simple rule in mind for the future: what should apply everywhere goes in `~/.pi/agent/`, what is specific to the NÉON repository goes in its local `.pi/`, and it is this second directory that we will populate as we go through the following modules.

## Extensions

Pi is not limited to its four basic tools and is completely extensible. You can add any action to it via the previously mentioned `pi.on(...)` mechanism, which allows modifying the behavior of the agentic loop. You can also change the user interface, the TUI, by adding information to its different areas. These two mechanisms make you the architect of your harness: simply write an extension for your needs, distribute it, or use those written by the community. To find some, the official gallery at [pi.dev/packages](https://pi.dev/packages) is the best resource.

An extension is distributed as an npm package or a git repository, and is installed using `pi install`:

```
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

By default, installation is global: the package is placed in `~/.pi/agent/npm/` (or `~/.pi/agent/git/<host>/<path>` for a git repository), and the extension becomes available in all your Pi sessions, across all your projects. Add `-l` to the command to install it locally instead: the package then lands in `.pi/npm/`, and the extension is only active for this project, once it has been marked as safe, exactly as we saw in the previous paragraph for skills. To remove a package, the corresponding command is `pi remove npm:@foo/bar`.

To try an extension without installing it, whether it's a package or a simple local file, the `-e` (or `--extension`) option loads it for the current session only:

```
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

This is the habit to adopt before committing to an extension found in the community directory. Keep in mind, however, that an extension runs with all of your system permissions: only install and test what you are comfortable running.

## The four extensions

We could have had you build your own extensions, but given the limited time and the fact that you are not yet familiar with the Pi tool or the structure of a harness, it would have been a waste of time and motivation. We hope that by the end of this training, you will have a clear enough understanding to envision your own improvements to your harness in the form of new Pi extensions.

To build our harness, we will rely on four extensions:

- `pi-rtk-optimizer` will handle context and compaction,
- `@tintinweb/pi-subagents` will provide delegation,
- `pi-hermes-memory` will handle memory,
- `pi-lens` will complete the observability and code tooling.

Permissions and tools, on the other hand, will be rebuilt by hand in `.pi/skills/`.

::: info Exercise
Install one of the four extensions presented below locally (`-l`), and verify that it appears in `.pi/npm/`. Launch Pi; you should see it in the extensions section. You can try removing it with `pi remove`.
:::

## Going further

- The [official Pi site](https://pi.dev/) and its [documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
