# The Starting Harness: Pi

::: tip Objectives of this module

- Understand why we start from Pi
- Install Pi, declare its models and get to grips with its first commands
- Understand the role of the `~/.pi/agent/` and `.pi/` directories
- Install, try and remove an extension, starting with combo, the only one the training needs
:::

We saw earlier that a harness is a set of tools on top of LLM models, each of which contributes to completing a task autonomously. You have at your disposal a set of already-built harnesses: Claude Code, Codex, OpenCode, Pi... In most cases, however, you control none of it: you let yourself be guided, hoping the tool does what you asked it, and when something goes wrong, it is not always easy to understand why. Yet our goal is precisely to understand how a harness works in its smallest details, to be able to easily add or remove an element and test the consequences.

In what follows, we will use [Pi](https://pi.dev), a command-line coding agent, open, extensible and minimalist. It interests us precisely because we can add extensions to it simply and understand everything that happens inside, with no surprises: end-to-end control.

## What Pi is

Pi is a coding agent originally created by Mario Zechner, which runs in your terminal. Its primary goal was precisely to gain control of your harness. Pi rests on a handful of basic tools (read a file, write one, edit it, run a shell command) and on an agentic loop that chains model calls, tool execution and re-reading of results. This is exactly the loop we described in the previous module, reduced to its simplest expression.

Around this core, Pi exposes an extension and event system. You can hook into the important moments of the loop with `pi.on(...)`, the same way you hook into Claude Code.

Just as Claude Code relies on a `.claude/` directory, Pi relies on a `.pi/` directory. That is where configuration, skills, agents and permission rules live. You can think of it as the Pi-side equivalent of what you may already know on the Claude Code side.

Pi's system prompt describes its entire operation, as you will see in a moment; Pi can therefore help you extend its own features.

## First steps

To install Pi, go to the [official site](https://pi.dev) and let yourself be guided.

You then need to declare the models you will use throughout your experiments; the ways to configure your model provider are described in the [documentation](https://pi.dev/docs/latest/providers). We encourage you to have a strong model for good-quality planning and a faster model, which will code the tasks set by the planner as you go.

For those attending this training in person, we suggest using the models provided by [ILaaS](https://www.ilaas.fr/), a shared platform from the French academic world, for trusted generative AI.

Edit the `~/.pi/agent/models.json` file and fill it in as follows:

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
                    "id": "qwen-3.8-27b",
                    "contextWindow": 256000
                }
            ]
        }
    }
}
```

You will need to enter the API key that was provided to you. The models listed are those available during the training; the [up-to-date list](https://www.ilaas.fr/liste-des-modeles-llms/) is on the ILaaS website.

::: info The `cost` block is not provider data
The `cost` field is optional and defaults to zero. With the configuration above, `/session` will therefore report a zero cost on all your sessions. If you want an order of magnitude, add a block like this to each model (prices are per million tokens):

```json
"cost": { "input": 0.14, "output": 0.28, "cacheRead": 0.0028, "cacheWrite": 0 }
```

These rates are the market rates for a model of comparable size. You don't pay them: ILaaS does not bill you per token.

Remember this above all, it is already a harness lesson: the cost a coding agent displays does not come from the provider. It is a multiplication made from a configuration field you wrote yourself.
:::

If everything went well, you can use Pi. Launch a first interactive session with `pi` in your terminal and check that you get a prompt like this:

![](/figures/pi.png)

There you see the different elements that make up Pi (context, skills, extensions) along with the model used by default, at the bottom right.

You can play with it by asking it questions, observe the loop and see how it answers you. Then try the non-interactive mode with `pi -p`, which runs a request and returns control.

## The first useful commands

- The tools

  As said in the introduction to this part, Pi ships with four tools. To get the list, simply type

  ```
  /tools
  ```

  You should see at least the read, bash, edit and write tools.

  ::: info Exercise (in class)
  Starting from the prompt, try to trigger each of these tools with your question.
  :::
- The tree of your session

  It can be useful to navigate your session and start again from one of the steps in your discussion. To do this, use the command

  ```
  /tree
  ```

  ::: info Exercise (in class)
  Try to start again from a point in your thread.
  :::
- Resume a previous session

  You can restart from any previous session using the command

  ```
  /resume
  ```

  ::: info Exercise (in class)
  Try to restart from a previous session.
  :::
- Export your session

  Finally, you can export your session in HTML or JSON format via the command

  ```
  /export
  ```

  ::: info Exercise (in class)
  Export your session to HTML (default format) and open this file.
  :::

We have gone through the main commands that we consider useful for now; we will see others as the training progresses.

## Understanding the contents of the Pi directories

Pi distinguishes two directories with the same name `.pi/`, and you need to learn to tell them apart right away so you don't get lost.

The first lives in your home directory, `~/.pi/agent/`. It is the global configuration, the one that applies by default to all your projects: you have already touched it by editing `~/.pi/agent/models.json` to declare your model providers. It also contains `settings.json`, for general preferences (default provider and model, theme, proxy...), and `trust.json`, which remembers from one session to the next the projects you have chosen to trust.

The second lives at the root of your project, `.pi/`, the one you version with the rest of the repository. It contains the elements specific to the current project: a `settings.json` that overrides the global one (nested objects are merged and not replaced as a whole), and above all the directories that we will fill ourselves throughout the training, starting with `skills/` for the tools we will write.

This distinction is not just a storage convenience. The skills declared in the global directory load without any particular verification: they follow you everywhere. Those of the project, however, only load once this project is marked as trusted, precisely in that `trust.json` mentioned above. This is a first, very concrete glimpse of the safety brick that we will rebuild later: a harness that would execute without discernment code found in any cloned repository would be a flaw in itself.

Remember this simple rule for what follows: what must apply everywhere goes in `~/.pi/agent/`, what is specific to the NÉON repository goes in its local `.pi/`, and it is this second directory that we will populate through the modules that follow.

## The extensions

Pi is not limited to its four base tools and is fully extensible. You can add any action to it via the `pi.on(...)` mechanism already mentioned, which lets you change the behavior of the agentic loop. You can also change the user interface, the TUI, by adding information to its various areas. These two mechanisms make you the architect of your harness: you only have to write an extension for your needs, distribute it, or use the ones written by the community. To find them, the official gallery at [pi.dev/packages](https://pi.dev/packages) is the best entry point.

An extension is distributed as an npm package or as a git repository, and is installed with `pi install`:

```bash
pi install npm:@tintinweb/pi-subagents
pi install git:github.com/user/repo
```

By default, the installation is global: the package is placed in `~/.pi/agent/npm/` (or `~/.pi/agent/git/<host>/<path>` for a git repository), and the extension becomes available in all your Pi sessions, across all your projects. Add `-l` to the command to install it locally instead: the package then lands in `.pi/npm/`, and the extension is only active for that project, once it is marked as safe, exactly as we saw in the previous paragraph for skills. To remove a package, the symmetric command is `pi remove npm:@foo/bar`.

To try an extension without installing it, whether it is a package or a simple local file, the `-e` option (or `--extension`) loads it for the duration of the current session only:

```bash
pi -e npm:@tintinweb/pi-subagents
pi -e ./mon-extension.ts
```

It is the habit to adopt before committing to an extension found in the community directory. Keep in mind, however, that an extension runs with all your system permissions: only install, and test, what you are ready to trust.

::: warning The combo extension
In the rest of the training, you will only have to install one extension designed specifically for it. We strongly encourage you to look at what exists, to test, and to step back from your experiences. Sometimes an extension makes us lose control of our harness and triggers events that degrade results.
:::

::: info Exercise (in class)
Install the combo extension locally (`-l`):

```bash
pi install -l npm:@ai-for-dev/combo
```

then check that it does appear in `.pi/npm/`. Launch Pi: you should see it in the extensions section. You can then try to remove it with `pi remove`.
:::

## Going further

- The [official Pi website](https://pi.dev/) and its [documentation](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs).
