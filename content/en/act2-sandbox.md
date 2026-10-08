# The sandbox: isolating the agent from your machine

::: tip Objectives of this module
- Know what a code agent can do on your machine
- Compare the disposable clone, the container and the micro virtual machine: what each protects, and what it costs
- Launch Pi in Docker Sandboxes with a kit versioned in this repository
- Leave with a sandbox in which the exercises of the following modules run unattended
:::

The following modules launch Pi twenty times on the same task without human intervention, give it sub-agents that have a shell, then chain sub-agents into pipelines. Pi has no mechanism for asking your consent before executing a command, and its [security documentation](https://pi.dev/docs/latest/security) says it clearly: the tools read, write and run commands "with the permissions of the pi process", and "Pi does not include a built-in sandbox". Anything you can do from your terminal, the agent can do too: read `~/.ssh`, read `~/.pi/agent/auth.json` where your API keys are stored, run `git push --force`, or send the content of a file to any domain with `curl`.

The natural reaction is to write a prompt: "only modify `game/neon.js`", "don't read anything outside the repository". A prompt is text, and we remind you that using an LLM is always non-deterministic, which means you will never have a 100% guarantee that it will be followed. In the module on skills, you will observe that an instruction for cleaning up temporary files placed in a `SKILL.md` is followed less than one time in three. Before the first unattended run, you therefore need a limit that doesn't depend on the model's obedience. The sandbox is a deterministic way to ensure that the LLM is in a closed environment whose boundaries are defined by you and that the model cannot overstep.

## Understanding

### What does the agent have access to?

A code agent running on your machine has access to your files, that is, the repository it works on and, with the same rights, your home directory, where the SSH keys, the model provider tokens and the `.env` files of your other projects live. The network lets it install any package, run a `curl | sh` found in a README, or broadcast what it has just read. Finally, it launches processes with your identity, which covers the Docker daemon, the `rm` command and write access to the remote repository. If you also have sudo privileges on your machine, nothing stops it.

These actions don't even require the model to make a mistake. A repository file can contain instructions written for the agent: that is the role of NÉON's `SUPPORT.md`. Its text mimics a support procedure but asks the agent to read the `.env` and send its contents to an external address. An agent that opens this file to answer a question treats the instruction as if it came from you, and the module on permissions will work on this case. An extension installed from the community directory runs, as the module on Pi reminded you, with all of your permissions. In both cases, the flaw is in the harness, and a guardrail written inside `AGENTS.md` will not protect you.

Pi's documentation concludes: "For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task." Our twenty runs on issue #1 are exactly unattended automation. And eventually, we want autonomous agents that can work for hours without us having to monitor them.

### Three levels of isolation

The cheapest of the three is the **disposable clone**. The measurement tool in the next module clones NÉON at a tag, into a temporary directory, on each run, which protects the repository's history and working tree at almost no cost. The process still runs under your identity, with your home directory and your network, so a disposable clone only protects the repository. And even then, nothing stops the model from pushing to your remote repository if it has the rights.

One step further, the **container** runs Pi in a Docker image where only the repository is mounted, putting your home directory out of reach. It shares the host kernel, its network is open by default, and above all the model provider's API key must be added to it so that Pi can call the model, which the [Pi page on containerization](https://pi.dev/docs/latest/containerization) notes in one sentence: "Provider API keys enter the container". So everything the agent runs has access to this key.

Along the same lines, you can add a hook to Pi that, on each requested bash command, checks whether the command is allowed. Several Pi extensions offer this kind of configuration. This is the case, for example, of [`pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system), which, from a configuration file, lets you say which commands are allowed and which are not. It hooks into the `tool_call` event of Pi's extension API, a hook that intercepts each tool call, each bash command, each MCP call and each skill invoked before it runs, and compares the request against `allow` / `deny` / `ask` rules written in JSON. It does, however, require you to configure the permissions yourself. The `read` tool can still very well read your configuration files. You will see how to use it a bit further on in this module.

The third level is the **policy micro-VM** with [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Each sandbox has its own kernel behind a hypervisor, all outgoing TCP traffic goes through a proxy on the host that only accepts domains from an allow-list, and the API keys are injected into the HTTP headers by that proxy, so that, to quote the [security page](https://docs.docker.com/ai/sandboxes/security/), "Credential values never enter the VM". The working directory is mounted in the VM at the same absolute path as on the host. The cost is a six-hundred-and-fifty-megabyte image to download, a daemon to run, an allow-list of domains to maintain. This may seem complicated, but your favorite AI can help you set up this infrastructure easily.

[bubblewrap](https://github.com/containers/bubblewrap) (the `bwrap` command) on Linux and `sandbox-exec` on macOS confine a process without an image or a daemon, but they sit at the container level and inherit its two limits: the provider key stays in Pi's environment, where anything the agent runs can read it, and the network is either cut off entirely or left wide open, since filtering by domain requires a proxy on the host, which [sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime) from Anthropic adds.

| what is protected       | disposable clone | container                          | Docker Sandboxes                            |
| ----------------------- | ---------------- | ---------------------------------- | ------------------------------------------- |
| your home directory     | no               | yes, if only the repo is mounted   | yes                                         |
| outbound network        | no               | no by default                      | yes, deny by default and allowlist          |
| your API keys           | no               | no, they go into the image         | yes, only the host proxy sees them          |

### What the sandbox doesn't protect

In direct mode, the default one, the agent edits your working tree in place, and the Docker Sandboxes documentation reminds us that it can therefore modify a git hook, a `Makefile` or a continuous integration configuration, which will run later on the host when you launch them yourself. The sandbox protects the machine while the agent works, and it does not spare you from reviewing the diff.

The `balanced` network policy, the one that `sbx policy init` recommends, allows domains with broad wildcards like `*.googleapis.com`, which cover far more than model APIs. We start from `deny-all` and then only open the domains that appear in the denial log.

Finally, inside the VM, the agent is an administrator, with passwordless `sudo` and its own Docker daemon, which we accept, since nothing that happens there ever leaves it and the VM itself is disposable.

## Rebuilding

We propose two approaches below: using an extension in Pi that adds a hook (which we'll ask you to rebuild in another module) and using Docker Sandboxes. The first solution doesn't require any particular installation on your system and can therefore be used easily for the in-person training. But keep in mind that it has its limits and that it is clearly not sufficient for daily work with agents. For the more adventurous, you can choose the second solution based on Docker Sandboxes.

### Installing and configuring `pi-permission-system`

The extension installs with one command, like any package from Pi's directory:

```bash
pi install npm:@gotgenes/pi-permission-system
```

The rules live in a JSON file, read at three scopes: global (`~/.pi/agent/extensions/pi-permission-system/config.json`), project (`.pi/extensions/pi-permission-system/config.json`, ignored if the project is not approved), and per-agent, in the YAML header of an agent file, which takes precedence over the first two. For NÉON, a project configuration is enough to stop the most dangerous instruction in `SUPPORT.md`, since reading a `.env` is refused by construction:

```json
{
  "permission": {
    "*": "allow",
    "path": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny"
    },
    "bash": {
      "*": "ask",
      "rm -rf *": "deny",
      "sudo *": "ask"
    },
    "external_directory": "ask"
  }
}
```

The most specific rule wins: `bash.*` requires confirmation by default, `rm -rf *` refuses without asking, and a path outside the repository remains subject to confirmation even when `path.*` allows everything else. A command that the extension's bash parser cannot classify is refused rather than let through, and a path that traverses a symbolic link is resolved before comparison.

::: info Exercise (in class)
Work in a disposable clone of NÉON, since two of the requests below are destructive. Install the extension, place the configuration above in `.pi/extensions/pi-permission-system/config.json`, create a `.env` at the root containing a fake key, then launch Pi and ask it three things: to read you the contents of this `.env`, to delete the `game/` folder with `rm -rf`, and to run the test suite. The first two requests are refused without Pi consulting you; the third opens a confirmation prompt that you answer yourself.

Next, resubmit the request to read the `.env` three times in a row, rephrasing it, then explaining to Pi that you are the owner of the file and that you authorize it: the verdict does not change, because it comes from a rule evaluated before the tool call and not from model arbitration.

Enfin, remove the `path` block from the configuration and replace it with the instruction "never read any `.env` file" in the repository's `AGENTS.md`, then repeat the same request five times across five different sessions. Count the refusals you get: you then have your own figure on what a text instruction is worth compared with a guardrail in code. All of this obviously depends on the quality of the model, and the one you use may follow your written rule. But your context is empty, and that may no longer be the case if it is already well filled.
:::

### Installing and configuring `sbx`

`sbx` is the command for using Docker Sandboxes. `sbx` knows a list of agents it can launch as-is (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` and a few others), and Pi is not one of them. You therefore have to create [a kit](https://docs.docker.com/ai/sandboxes/customize/): a directory described by a `spec.yaml` whose `kind: sandbox` variant defines an agent from scratch, with the image, the startup command, the instructions added to the context file, the keys to inject and the network permissions. Ours is versioned in [AI-for-dev/ai4dev-pi-kit](https://github.com/AI-for-dev/ai4dev-pi-kit) and contains only four files.

```
ai4dev-pi-kit
├── spec.yaml
└── files/home/.pi/agent
    ├── extensions/pi-permission-system/config.json
    ├── models.json
    └── settings.json
```

The versions cited below are those with which this kit was verified at the time of writing the document: `sbx` 0.45.1, Docker Engine 29.7.2, Pi 1.1.0.

#### Install `sbx`

The command-line tool is called `sbx`. To install it on your OS, simply go to the following page

https://docs.docker.com/ai/sandboxes/install/

#### Choosing the image

Docker publishes [`docker.io/sbx/pi-image`](https://github.com/docker/sbx-kits-contrib/tree/main/pi), an image that adds Pi and `fd` (the file search tool that Pi calls) to the `shell-docker` template of the sandboxes, which already provides Node 22.22.1, `git`, `rg`, `python3` and `uv`. It is rebuilt every night from the latest version of Pi published on npm, so the kit has no `Dockerfile` to maintain and no image to build, and `sbx` downloads it from Docker Hub on first launch.

::: warning An image that changes every night
The `latest` tag follows Pi: two sandboxes created a week apart may be running two different versions. For a measurement campaign, where a difference in result must come from the variable being studied and not from an update to the harness, you pin the image by its digest, which `docker buildx imagetools inspect docker.io/sbx/pi-image:latest` gives, by writing for example `image: docker.io/sbx/pi-image@sha256:ae4a64715d2b8ba22f02eccf0d40cc484772661425e57801f242bea9eecb509a` in the `spec.yaml`.
:::

#### Declare the kit

```yaml
schemaVersion: "2"
kind: sandbox
name: pi
version: "0.1.0"
displayName: Pi
description: Pi coding agent (pi.dev) in a Docker sandbox.
sourceURL: https://github.com/earendil-works/pi

sandbox:
  image: docker.io/sbx/pi-image:latest
  entrypoint: [pi, -a]

agentInstructions:
  filename: AGENTS.md
  content: |
    ## Sandbox environment

    Tu tournes dans une microVM Docker Sandbox. `sudo` est sans mot de passe,
    Docker est disponible a l'interieur de la VM. Le reseau sortant est filtre
    par une allowlist: un domaine non autorise echoue, ce n'est pas une panne
    reseau. La cle du provider n'est pas dans la VM, seule une sentinelle l'est.

environment:
  variables:
    PI_SKIP_VERSION_CHECK: "1"
    PI_TELEMETRY: "0"
    NODE_OPTIONS: "--disable-warning=UNDICI-EHPA"

credentials:
  - service: ilaas
    description: ILAAS API KEY (llm.ilaas.fr)
    required: true
    apiKey:
      name: ILAAS_API_KEY
      proxyManaged: true
      inject:
        - domain: llm.ilaas.fr
          scheme: bearer

permissions:
  network:
    allow:
      - llm.ilaas.fr
      - github.com
      - raw.githubusercontent.com
      - pypi.org
      - files.pythonhosted.org
      - registry.npmjs.org
      - pi.dev
```

The `sandbox` block names the image chosen in the previous step and runs `pi -a`. The `-a` option declares the project files as trusted for this run, which answers the question that `trust.json` raised in the module on Pi: inside the VM, a skill or extension found in the repository can only touch what the VM contains.

`agentInstructions` adds a few lines to the `AGENTS.md` the model reads: a denied domain is not a network failure, which keeps it from retrying ten times, and the provider key is not in the VM.

The `credentials` block declares a key managed by the proxy (`proxyManaged: true`). Pi finds in `ILAAS_API_KEY` a **sentinel**, a dummy value, and the host's proxy replaces it with the real key in the `Authorization` header of requests to `llm.ilaas.fr`, and nowhere else.

Under `permissions.network`, the kit opens over the global policy the model provider, GitHub for cloning NÉON, PyPI for measurement tools and the npm registry for extensions installed with `pi install`. `llm.ilaas.fr` must appear in this list in addition to the `credentials` block, because `sbx` does not implicitly allow the domains where it injects a key: without this line, the `deny-all` policy would refuse every model call. The `PI_SKIP_VERSION_CHECK` and `PI_TELEMETRY` variables cut some of Pi's startup network operations.

The file `files/home/.pi/agent/settings.json`, which the kit drops into the agent's home directory, sets the provider, the default model, the reasoning level and the extensions to install. It replaces your host's `~/.pi/agent/settings.json`, which is not mounted in the VM. It is fairly simple here and looks like this

```json
{
  "defaultProvider": "ilaas",
  "defaultModel": "gemma-4-31b",
  "defaultThinkingLevel": "high",
  "packages": ["npm:@gotgenes/pi-permission-system@40.1.1"]
}
```

Likewise, the `files/home/.pi/agent/models.json` file lists the models available in the sandbox.

```json
{
    "providers": {
        "ilaas": {
            "baseUrl": "https://llm.ilaas.fr/v1",
            "api": "openai-completions",
            "apiKey": "$ILAAS_API_KEY",
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
        }
    }
}
```

Pi installs the packages listed under `packages` at startup, from `registry.npmjs.org`, so every sandbox created with this kit has `pi-permission-system` available without any manual step. The version is pinned, because an extension runs with all of Pi's privileges and a silent package update would change what runs in the VM. To add another extension to the kit, add its source `npm:<package>@<version>` to that list and recreate the sandbox.

The file `files/home/.pi/agent/extensions/pi-permission-system/config.json` gives the extension's global policy, which denies reading `.env` files and `rm -rf` and allows everything else:

```json
{
  "permission": {
    "*": "allow",
    "path": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny"
    },
    "bash": {
      "*": "allow",
      "rm -rf *": "deny"
    },
    "external_directory": "allow"
  }
}
```

::: warning No `ask` rule in the kit's policy
An `ask` rule waits for a response in Pi's interface. In non-interactive mode (`pi -p`, for example launched with `sbx exec`), the extension has no one to ask and denies the call with the message "requires approval, but no interactive UI is available". With the classroom exercise's configuration, where `bash.*` is `ask`, every bash command would therefore be denied. The kit's policy sticks to `allow` and `deny`, and a project that wants confirmations adds them in its own `.pi/extensions/pi-permission-system/config.json`, which takes precedence over the global policy.
:::

#### Registering the key

`ilaas` authenticates with an API key. You entrust it to `sbx` under the name of the service declared by the kit:

```bash
sbx secret set ilaas
```

You must then provide your key. You can then verify that it is properly registered with the command

```bash
sbx secret ls
```

On first launch, `sbx` asks you to approve the **credential binding**, the authorization given to a third-party kit to use this secret on the domains it declares. The answer is recorded in `~/.config/sbx/credentials.yaml`.

#### Setting the network policy

This setting is global, `sbx` requires it before the first sandbox, and it is done once and for all:

```bash
sbx policy init deny-all
```

The kit's `permissions.network.allow` rules apply on top, for its sandboxes only.

#### Launching

```bash
git clone https://github.com/AI-for-dev/ai4dev-pi-kit
cd ai4dev-pi-kit
sbx kit validate .
cd /chemin/vers/neon
sbx run /chemin/vers/ai4dev-pi-kit
```

::: info Exercise (on your own)
Walk through the previous five steps on your machine, from installing `sbx` to the first `sbx run`. In the Pi session that opens, ask for the value of the `ILAAS_API_KEY` variable: you will see the sentinel, not your key. Then run a `curl https://example.com`: the request fails, because the domain is not on any list. Finally, have a NÉON file modified: the change appears on the host side as soon as Pi has written.

Go back to the host and read `sbx policy log`, where each denial is recorded with the requested domain. Finish the exercise on `pi-permission-system`, this time inside the sandbox, where the kit has already installed the extension: ask Pi to read the `.env`, then to delete `game/` with `rm -rf`, two denials given by the kit's global policy, then drop the classroom exercise configuration into `.pi/extensions/pi-permission-system/config.json` and check that the test suite now opens a confirmation. This file is stored in the mounted repository and therefore stays on your host. The two guardrails overlap without interfering with each other, and the `rm -rf` denial keeps all its usefulness, since in direct mode the repository Pi would delete is your host's.
:::

## Generalizing

**A usage boundary that does not depend on obedience.** A permission written in text, in an `AGENTS.md` or a `SKILL.md`, is a suggestion the model may or may not follow. The permissions module will build guards in code inside the harness, which refuse a tool call before it executes. The sandbox is the outer layer, the one that holds when the harness itself is at fault, because a malicious extension or a booby-trapped file can only damage the VM.

**The key stays on the host.** The agent does not need to read the key, only that its requests to a specific domain be authenticated, and keeping the key on the host, to place it in the header as the request goes through, removes it from everything the agent can read, execute, or send. The principle holds for any harness, regardless of the tool that implements it.

**Deny by default, then open up from the log.** A kit's allowlist is not written in advance: you start from denial, work a session, and only add the domains whose refusal actually blocked something, just as the rest of the act decides on measurement rather than intuition.

## Deliverable

At the end of this module, Pi runs in a sandbox on your clone of NÉON, and all the operations of the following modules can be done there with optimal control.

Four checks confirm it:

- the `ILAAS_API_KEY` variable read from the sandbox is the sentinel;
- a request to a domain absent from the list fails;
- an edit made by Pi appears in the repository on the host side;
- `sbx policy log` shows no refusal your list did not choose.

## Going further

### The threat model

- Kai Greshake, [How We Broke LLMs: Indirect Prompt Injection][greshake-blog] - the blog post that accompanies the foundational article by Greshake et al., [Not what you've signed up for][greshake]: data read by the model becomes an instruction, and Copilot can already be compromised by a package's documentation.
- Simon Willison, [The lethal trifecta for AI agents][trifecta] - access to private data, exposure to untrusted content, and the ability to communicate outward: the three combined are enough for exfiltration.
- Simon Willison, [Agents Rule of Two and The Attacker Moves Second][sw-rule-of-two] - the "at most two of three properties" rule formulated by Meta, and an article that knocks down twelve published defenses against prompt injection under adaptive attack.
- Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections][design-patterns] - architecture patterns that constrain what the agent can do, at the cost of part of its utility.
- Korny Sietsma, [Agentic AI and Security][fowler-security] - the trifecta applied to coding agents on martinfowler.com: containers, least privilege, task decomposition.
- OWASP, [Top 10 for Agentic Applications 2026][owasp-agentic] - ten risk families, including supply chain compromise and unintended code execution.
- Marchand et al., [Quantifying Frontier LLM Capabilities for Container Sandbox Escape][sandbox-escape] - a 2026 benchmark where agents find and exploit vulnerabilities in a vulnerable container to escape it, i.e. the measured argument for a separate kernel.

### Documented incidents

- Johann Rehberger, [The Month of AI Bugs][month-ai-bugs] - one bug per day in August 2025 in code agents (Claude Code, Codex, Cursor, Copilot, Devin, Jules, OpenHands), which Simon Willison [summarized][summer-johann].
- Johann Rehberger, [Amazon Q Developer: Remote Code Execution with Prompt Injection][etr-amazon-q] - a `find -exec` classified as read-only is enough to execute code without approval.
- Will Vandevanter (Trail of Bits), [Prompt injection to RCE in AI agents][tob-rce] - argument injection into pre-approved commands, and the sandbox recommended as the main defense instead of lists of safe commands.
- Kevin Higgs (Trail of Bits), [Prompt injection engineering for attackers: Exploiting GitHub Copilot][tob-copilot] - a poisoned GitHub issue makes Copilot Agent add a backdoor dependency.
- Pillar Security, [Rules File Backdoor][rules-file] - hidden instructions in a Cursor or Copilot rules file (March 2025), i.e. the `SUPPORT.md` trap observed in real-world conditions.
- Nx, [S1ngularity postmortem][nx-postmortem] and Wiz, [attack analysis][wiz-nx] - a compromised npm package (August 2025) enlists the code agents installed on the workstation, launched without confirmation, to locate secrets to exfiltrate.
- Fortune, [Replit AI wiped a production database][replit] - an agent wipes a production database during a change freeze (July 2025), even though a written instruction forbade it.
- Pillar Security, [The Agent Security Paradox][cursor-paradox] - CVE-2026-22708 (January 2026): internal shell commands like `export`, outside Cursor's allowlist, poison the environment of approved commands.
- Unit 42, [OpenClaw's Skill Marketplace and the Emerging AI Supply Chain Threat][openclaw] - malicious markdown skills on an agent's marketplace (2026), the same risk as for a package installed with `pi install`.
- Ken Huang, [Coding Agent Security: Lessons from Claude Code, Cowork, Codex, and Copilot in the Wild][ken-huang] - eight incidents from 2025 and 2026, and a comparison of Claude Code, Codex, Copilot, and Cursor sandboxes (August 2026).
- Simon Willison, [Breaking Claude Code Opus 5 Auto Mode][sw-auto-mode] - a Johann Rehberger attack that succeeded four times out of five against Claude Code's auto mode (August 2026), and the conclusion that a classifier does not replace the sandbox.

### Isolation practices and mechanisms

- Mario Zechner, [What I learned building an opinionated and minimal coding agent][zechner-pi] - Pi's author explains why Pi has no permissions ("As soon as your agent can write code and run code, it's pretty much game over") and recommends running it in a container.
- Armin Ronacher, [Agentic Coding Recommendations][ronacher] - the openly embraced `claude-yolo` alias, and the risk moved into Docker.
- Simon Willison, [Designing agentic loops][sw-loops] - YOLO mode both essential to productivity and dangerous, hence the sandbox, preferably on someone else's computer.
- Simon Willison, [Codex CLI sandbox investigation][codex-sandbox] - Seatbelt on macOS, Landlock and seccomp on Linux, or how another harness makes the same choice.
- sysid, [Your Agent Has Root][sysid] - the built-in tools that escape the kernel sandbox, and a Pi extension to close the gap.
- Andrew Lock, [Running AI agents safely in a microVM using docker sandbox][lock] - the full `sbx` journey on a developer machine, network policies included.
- Michael Krämer, [Trust but Sandbox][innoq] - Docker Sandboxes from a team's perspective: policies, secrets proxy, custom images.
- Palaimon, [Coding Agents III: Sandboxing & Best Practices][palaimon] - dev containers, bubblewrap and VMs compared, with the startup cost quantified.
- Ry Walker, [Local AI Agent Sandboxes][rywalker] - eight local sandbox tools compared, and what is left for a third-party tool once harnesses integrate their own.
- Daniel Vaughan, [Agent Sandbox Comparison Matrix][vaughan] - Codex's Seatbelt, OpenShell and Docker `sbx`: isolation boundary, network, secrets.
- Agache et al., [Firecracker][firecracker] - the AWS Lambda micro-VM (NSDI 2020), the reference text on the trade-off between isolation and startup time.
- Emir Beganović, [Your Container Is Not a Sandbox: The State of MicroVM Isolation in 2026][emirb] - why a container is not a security boundary, the episode where Claude Code disables its own bubblewrap, and a tour of available micro-VMs (March 2026).
- Greg Hurrell, [List of coding agent sandboxes][wincent] - a catalogue kept up to date in 2026, from system primitives to hosted platforms, in ten categories.
- Zheng et al., [ActPlane: Programmable OS-Level Policy Enforcement for Agent Harnesses][actplane] - a harness policy enforced in the Linux kernel via eBPF (June 2026), with a measured overhead between 2 and 8%.

### Tools

- Docker Sandboxes: [architecture][docker-arch], [security model][docker-security] and [kits][docker-kits].
- Pi: [Security][pi-security] and [Containerization][pi-container].
- [pi-sandbox][pi-sandbox-repo] - a per-command system sandbox for Pi, with an authorization prompt, based on `sandbox-exec` or bubblewrap.
- [pi-gondolin][pi-gondolin] and [Gondolin][gondolin] - Pi's tools run in a local micro-VM; both projects describe themselves as experimental.
- [OpenShell][openshell] - a runtime with declarative policies (filesystem, network, processes, inference), cited by Pi's documentation.

[greshake-blog]: https://kai-greshake.de/posts/llm-malware/
[greshake]: https://arxiv.org/abs/2302.12173
[trifecta]: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
[sw-rule-of-two]: https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/
[design-patterns]: https://arxiv.org/abs/2506.08837
[fowler-security]: https://martinfowler.com/articles/agentic-ai-security.html
[owasp-agentic]: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
[month-ai-bugs]: https://embracethered.com/blog/posts/2025/announcement-the-month-of-ai-bugs/
[summer-johann]: https://simonwillison.net/2025/Aug/15/the-summer-of-johann/
[etr-amazon-q]: https://embracethered.com/blog/posts/2025/amazon-q-developer-remote-code-execution/
[tob-rce]: https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/
[tob-copilot]: https://blog.trailofbits.com/2025/08/06/prompt-injection-engineering-for-attackers-exploiting-github-copilot/
[rules-file]: https://www.pillar.security/blog/new-vulnerability-in-github-copilot-and-cursor-how-hackers-can-weaponize-code-agents
[nx-postmortem]: https://nx.dev/blog/s1ngularity-postmortem
[wiz-nx]: https://www.wiz.io/blog/s1ngularitys-aftermath
[replit]: https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure
[zechner-pi]: https://mariozechner.at/posts/2025-11-30-pi-coding-agent/
[ronacher]: https://lucumr.pocoo.org/2025/6/12/agentic-coding/
[sw-loops]: https://simonwillison.net/2025/Sep/30/designing-agentic-loops/
[codex-sandbox]: https://simonwillison.net/2025/Nov/9/codex-sandbox-investigation/
[sysid]: https://sysid.github.io/your-agent-has-root/
[lock]: https://andrewlock.net/running-ai-agents-safely-in-a-microvm-using-docker-sandbox/
[innoq]: https://www.innoq.com/en/blog/2026/07/trust-but-sandbox/
[palaimon]: https://blog.palaimon.io/posts/coding-agents-sandboxing-best-practices/
[rywalker]: https://rywalker.com/research/local-agent-sandboxes
[vaughan]: https://codex.danielvaughan.com/2026/04/24/agent-sandbox-comparison-codex-seatbelt-openshell-docker-sbx/
[firecracker]: https://www.usenix.org/conference/nsdi20/presentation/agache
[sandbox-escape]: https://arxiv.org/abs/2603.02277
[cursor-paradox]: https://www.pillar.security/blog/the-agent-security-paradox-when-trusted-commands-in-cursor-become-attack-vectors
[openclaw]: https://unit42.paloaltonetworks.com/openclaw-ai-supply-chain-risk/
[ken-huang]: https://kenhuangus.substack.com/p/coding-agent-security-lessons-from
[sw-auto-mode]: https://simonwillison.net/2026/Aug/27/breaking-claude-code-opus-5-auto-mode/
[emirb]: https://emirb.github.io/blog/microvm-2026/
[wincent]: https://gist.github.com/wincent/2752d8d97727577050c043e4ff9e386e
[actplane]: https://arxiv.org/abs/2606.25189
[docker-arch]: https://docs.docker.com/ai/sandboxes/architecture/
[docker-security]: https://docs.docker.com/ai/sandboxes/security/
[docker-kits]: https://docs.docker.com/ai/sandboxes/customize/kits/
[pi-security]: https://pi.dev/docs/latest/security
[pi-container]: https://pi.dev/docs/latest/containerization
[pi-sandbox-repo]: https://github.com/carderne/pi-sandbox
[pi-gondolin]: https://github.com/pasky/pi-gondolin
[gondolin]: https://github.com/earendil-works/gondolin
[openshell]: https://github.com/NVIDIA/OpenShell
