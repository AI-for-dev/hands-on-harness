# The Sandbox: Isolating the Agent from Your Machine

::: tip Module Objectives
- Understand what a code agent can do on your machine
- Compare disposable clones, containers, and micro-VMs: what each protects and its cost
- Run Pi in Docker Sandboxes using a versioned kit in this repository
- Set up a sandbox where the tasks in the following modules can run unsupervised
:::

The following modules run Pi twenty times on the same task without human intervention, assigning it sub-agents with shell access, and then chaining sub-agents in pipelines. Pi has no mechanism to request your approval before executing a command, and its [security documentation](https://pi.dev/docs/latest/security) states it clearly: tools read, write, and run commands "with the permissions of the pi process," and "Pi does not include a built-in sandbox." Anything you can do from your terminal, the agent can also do: read `~/.ssh`, read `~/.pi/agent/auth.json` where your API keys are stored, run `git push --force`, or send a file's content to any domain using `curl`.

The natural reaction is to write a prompt, "only modify `game/neon.js`," "do not read anything outside the repository." A prompt is text, and we remind you that using an LLM is always non-deterministic, meaning you will never have a 100% guarantee that it will be followed. In the module on skills, you will see that a prompt for cleaning up temporary files placed in a `SKILL.md` is followed less than one-third of the time. Before the first unsupervised execution, you therefore need a limit that does not depend on the model's obedience. A sandbox is a deterministic way to ensure the LLM is in a closed environment where the boundaries are defined by you and cannot be bypassed by the model.

## Understanding

### What does the agent have access to?

A code agent running on your machine has access to your files-specifically the repository it is working on and, with the same permissions, your home directory, where SSH keys, model provider tokens, and `.env` files for your other projects are located. Network access allows it to install any package, execute a `curl | sh` found in a README, or broadcast what it has just read. Finally, it launches processes using your identity, which covers the Docker daemon, the `rm` command, and write access to the remote repository. If you also have sudo privileges on your machine, nothing can stop it.

These actions don't even require the model to make a mistake. A repository file can contain instructions written for the agent; this is the role of NÉON's `SUPPORT.md`, whose text mimics a support procedure but asks to read the `.env` and send its content to an external address. The agent that opens this file to answer a question treats the instruction as if it came from you, and the permissions module will cover this case. An extension installed from the community directory runs, as the Pi module recalled, with all your permissions. In both cases, the flaw is in the harness, and a guardrail written inside AGENTS.md will not protect you.

Pi's documentation concludes: "For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task." Our twenty runs on issue #1 are exactly unattended automation. Ultimately, we want autonomous agents that can work for hours without us having to monitor them.

### Three levels of isolation

The cheapest of the three is the **disposable clone**. The measurement tool in the next module clones NÉON at a tag into a temporary directory for each run, which protects the repository's history and working tree at almost no cost. However, the process still runs under your identity, with your home directory and network, meaning a disposable clone only protects the repository. Moreover, nothing prevents the model from pushing to your remote repository if it has the rights, as is the case if it has access to the `gh` command (to work on your GitHub).

One step further, the **container** runs Pi in a Docker image where only the repository is mounted, putting your home directory out of reach. It shares the host kernel, its network is open by default, and above all, the model provider key must be added so that Pi can call the model, which the [Pi containerization page](https://pi.dev/docs/latest/containerization) notes in one sentence: "Provider API keys enter the container". Everything the agent executes therefore has access to this key.

The third level is the **policy-based micro-virtual machine** with [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Each sandbox has its own kernel behind a hyperviseur, all outgoing TCP traffic passes through a proxy on the host that only accepts domains from an allowlist, and API keys are injected into HTTP headers by this proxy, so that, to quote the [security page](https://docs.docker.com/ai/sandboxes/security/), "Credential values never enter the VM". The working directory is mounted in the VM at the same absolute path as on the host. The cost is a seven-hundred-megabyte image to build, a daemon to run, and an allowlist of domains to maintain. This may seem complicated, but your favorite AI can assist you in easily setting up this infrastructure.

| what is protected | disposable clone | container | Docker Sandboxes |
| ----------------- | ---------------- | ------------- | ----------------- |
| repository work tree | yes | no | no by default, yes with `--clone` |
| your home directory | no | yes, if only the repository is mounted | yes |
| outgoing network | no | no by default | yes, default deny and allowlist |
| your API keys | no | no, they enter the image | yes, only the host proxy sees them |

These three levels isolate the Pi process from the host machine, but nothing inside the sandbox still prevents Pi from running `rm -rf` on the repository or reading a `.env` file left in NÉON. The [`pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) extension adds this filter inside the sandbox itself: it hooks into the `tool_call` event of Pi's extension API, a hook that intercepts every tool call, every bash command, every MCP call, and every invoked skill before execution, and compares the request to `allow` / `deny` / `ask` rules written in JSON.

The trade-off lies in where this filter runs. It lives in the same Node process as Pi, not in the kernel that isolates the sandbox, meaning an extension that compromises this process before the rule is evaluated would disable the guardrail along with the rest. `pi-permission-system` tightens what Pi can do once launched in the sandbox; it does not replace any of the three levels in the table above.

### What the sandbox does not protect

In direct mode, the default one, the agent edits your working tree in place, and the Docker Sandboxes documentation reminds you that it can therefore modify a git hook, a `Makefile`, or a continuous integration configuration, which will run later on the host when you run them yourself. The sandbox protects the machine while the agent works, and it does not exempt you from reviewing the diff.

The `balanced` network policy, which `sbx policy init` recommends, allows domains via broad wildcards like `*.googleapis.com`, which cover much more than model APIs. We start with `deny-all` and then only open domains that appear in the denial logs.

Inside the VM, finally, the agent is an administrator, with passwordless `sudo` and its own Docker daemon, which we accept since nothing happening inside leaves it and the VM itself is disposable.

## Rebuilding

We propose two approaches next: using a Pi extension that adds a hook (which we will invite you to rebuild in another module) and using Docker Sandboxes. The first solution requires no special installation on your system and will therefore be used for the in-person training. However, keep in mind that it has its limits and is clearly not sufficient for daily work with agents.

### Installing and configuring `pi-permission-system`

The extension is installed in one command, like any other package from the Pi directory:

```bash
pi install npm:@gotgenes/pi-permission-system
```

Rules live in a JSON file, read at three scopes: global (`~/.pi/agent/extensions/pi-permission-system/config.json`), project (`.pi/extensions/pi-permission-system/config.json`, ignored if the project is not approved) and per-agent, in the YAML header of an agent file, which overrides the first two. For NÉON, a project configuration is enough to block the most dangerous instruction in `SUPPORT.md`, since reading a `.env` file is denied by construction:

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

The most specific rule overrides others: `bash.*` asks for confirmation by default, `rm -rf *` is denied without asking, and a path outside the repository remains subject to confirmation even when `path.*` allows everything else. A command that the extension's bash parser cannot classify is denied rather than allowed, and a path that crosses a symbolic link is resolved before comparison.

::: info Exercise (in-person)
Work in a disposable clone of NÉON, as two of the requests below are destructive. Install the extension, place the configuration above in `.pi/extensions/pi-permission-system/config.json`, create a `.env` file at the root containing a fake key, then start Pi and ask it to do three things: read the contents of this `.env` file, delete the `game/` folder with `rm -rf`, and run the test suite. The first two requests are denied without Pi consulting you; the third opens a confirmation that you answer yourself.

Then request the `.env` file three times in a row, rephrasing each time, and explain to Pi that you are the file owner and authorize the action: the result does not change, because it comes from a rule evaluated before the tool call rather than the model's decision.

Finally, remove the `path` block from the configuration and replace it with the instruction "never read .env files" in the repository's `AGENTS.md`, then repeat the same request five times across five different sessions. Count the refusals: you will then have your own data on the value of a text instruction compared to a code-level guardrail.
:::

#### Install and configure `sbx`

`sbx` is the command for using Docker Sandboxes. `sbx` recognizes a list of agents that it can launch as is (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` and a few others). Unfortunately, Pi is not one of them. You must therefore create [a kit](https://docs.docker.com/ai/sandboxes/customize/): a directory described by a `spec.yaml` where the `kind: sandbox` variant defines an agent from scratch: the image, the startup command, instructions added to the context file, keys to inject, and network permissions. Ours is versioned at https://github.com/AI-for-dev/pi-sandbox and contains only three files.

```
pi-sandbox
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

The versions listed below are those with which this kit was verified at the time of writing: `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2.

#### Install `sbx`

The command-line tool is called `sbx`. To install it on your OS, simply visit the following page:

https://docs.docker.com/ai/sandboxes/install/

#### Build the image

```dockerfile
FROM docker/sandbox-templates:shell-docker
USER root

ARG NODE_VERSION=22.21.1
ARG PI_VERSION=0.85.1
# Ubuntu names the package fd-find and ships the binary as fdfind, to avoid a
# name collision. pi looks for fd then fdfind, so /usr/bin/fdfind is enough and
# pi stops downloading its own copy into ~/.pi/agent/bin.
ARG FD_PACKAGE_VERSION=10.3.0-2ubuntu1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    xz-utils ca-certificates curl "fd-find=${FD_PACKAGE_VERSION}" \
    && fdfind --version \
    && rm -rf /var/lib/apt/lists/*

# Explicit Node install instead of inheriting from the template: pi requires
# >= 22.19, and the base image's bundled version is not a contract.
RUN set -eux; \
    case "$(dpkg --print-architecture)" in \
    amd64) a=x64 ;; \
    arm64) a=arm64 ;; \
    *) echo "unsupported architecture" >&2; exit 1 ;; \
    esac; \
    cd /tmp; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${a}.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " node-v${NODE_VERSION}-linux-${a}.tar.xz$" SHASUMS256.txt | sha256sum -c -; \
    mkdir -p /opt/node; \
    tar -xJf "node-v${NODE_VERSION}-linux-${a}.tar.xz" -C /opt/node --strip-components=1; \
    rm -f /tmp/*.tar.xz /tmp/SHASUMS256.txt

ENV PATH="/opt/node/bin:${PATH}"

RUN npm install -g "@earendil-works/pi-coding-agent@${PI_VERSION}" \
    && pi --version

USER agent
```

The image starts from the `shell-docker` template provided by Docker, installs an explicit version of Node, because Pi requires at least 22.19, and then pins the Pi version.

The Docker Sandboxes daemon pulls its images from a different registry than the local images available to Docker. Without a registry, you use an archive:

```bash
git clone https://github.com/AI-for-dev/pi-sandbox
cd pi-sandbox
docker build --platform linux/arm64 -t pi-sandbox:0.85.2 .
docker image save pi-sandbox:0.85.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

For a team, pushing the image to a registry is preferred.

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
  image: "pi-sandbox:0.85.1"
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
          header: Authorization
          format: "Bearer %s"

permissions:
  network:
    allow:
      - github.com
      - raw.githubusercontent.com
      - pypi.org
      - files.pythonhosted.org
      - pi.dev
```

The `sandbox` block names the image created in the previous step and runs `pi -a`. The `-a` option declares project files as safe for this execution, answering the question `trust.json` asked the Pi module: inside the VM, any skill or extension found in the repository can only access the VM's contents.

`agentInstructions` adds a few lines to the `AGENTS.md` file that the model reads: a refused domain is not a network failure, which prevents it from retrying ten times, and the provider key is not inside the VM.

The `credentials` block declares a proxy-managed key (`proxyManaged: true`). Pi finds a **sentinel**, a dummy value, in `ILAAS_API_KEY`, and the host proxy replaces it with the actual key in the `Authorization` header of requests to `llm.ilaas.fr`, and nowhere else.

Under `permissions.network`, the kit adds the model provider, GitHub for cloning NÉON, and PyPI for measurement tools on top of the global policy. The `PI_SKIP_VERSION_CHECK` and `PI_TELEMETRY` variables disable some of Pi's startup network operations.

The `files/home/.pi/agent/settings.json` file, which the kit places in the agent's home directory, sets the default provider, model, and reasoning level. It replaces your host's `~/.pi/agent/settings.json`, which is not mounted in the VM. It is quite simple here and looks like this:

```json
{
  "defaultProvider": "ilaas",
  "defaultModel": "deepseek-v4-flash",
  "defaultThinkingLevel": "high"
}
```

Similarly, the `files/home/.pi/agent/models.json` file lists the models available in the sandbox.

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

#### Saving the key

`ilaas` authenticates via an API key. You provide it to `sbx` using the service name declared by the kit:

```bash
sbx secret set ilaas
```

You must then enter your key. You can then verify that it is correctly saved using the command:

```bash
sbx secret ls
```

On the first run, `sbx` asks you to approve **credential binding**, the authorization given to a third-party kit to use this secret on the domains it declares. The response is saved in `~/.config/sbx/credentials.yaml`.

::: warning Non-interactive mode: no one answers
With `sbx create` or from a script, the binding question is not asked. The sandbox still starts, with `sbx` only issuing a warning, and the environment variable contains the `proxy-managed` sentinel: the actual key is never injected by the proxy. The error only appears during use as a `401`, even though `pi auth check` reports `ready`. A binding for each declared service is required. Write the file beforehand:

```yaml
bindings:
  ilaas:
    apiKey:
      domains: [llm.ilaas.fr]
```
:::

#### Setting the network policy

This setting is global; `sbx` requires it before the first sandbox, and it is done once and for all:

```bash
sbx policy init deny-all
```

The kit's `permissions.network.allow` rules apply on top, for its sandboxes only.

#### Launch

```bash
cd pi-sandbox
sbx kit validate .
cd /chemin/vers/neon
sbx run /chemin/vers/pi-sandbox
```

::: info Exercise (on your own)
Go through the five previous steps on your own, from installing `sbx` to the first `sbx run`. In the Pi session that opens, ask for the value of the `ILAAS_API_KEY` variable: you will see the sentinel, not your key. Then run `curl https://example.com`: the request fails because the domain is not in any list. Finally, have a NÉON file modified: the change appears on the host side as soon as Pi writes it.

Return to the host and read `sbx policy log`, where every refusal is logged with the requested domain. Finish the exercise on `pi-permission-system`, this time inside the sandbox: the two guards overlap without interfering, and the `rm -rf` refusal remains fully effective, since in direct mode, the repository Pi would delete is the one on your host.
:::

#### Tightening the permissions list

::: info Exercise (self-paced)
Work an entire session in the sandbox, then reread `sbx policy log`. Add only the domains to `permissions.network.allow` whose refusal actually blocked you, running `sbx kit validate` after each modification.
:::

## Generalizing

**A usage boundary that does not depend on obedience.** A text-based permission in an `AGENTS.md` or `SKILL.md` is a suggestion that the model may or may not follow. The permissions module will build code-based guards inside the harness, which refuse a tool call before it executes. The sandbox is the outer layer, the one that holds when the harness itself fails, because a malicious extension or a booby-trapped file can only damage the VM.

**The key remains on the host.** The agent does not need to read the key, only that its requests to a specific domain are authenticated; keeping the key on the host to insert it into the header as the request passes removes it from everything the agent can read, execute, or send. This principle applies to any harness, regardless of the tool implementing it.

**Deny by default, then open from the log.** A kit's permissions list is not written in advance: start with the refusal, work a session, and only add domains whose refusal actually blocked something, just as the rest of the act relies on measurement rather than intuition.

## Deliverable

By the end of this module, Pi runs in a sandbox on your NÉON clone, and all manipulations in the following modules can be done there with optimal control.

Four checks confirm this:

- the `ILAAS_API_KEY` variable read from the sandbox is the sentinel;
- a request to a domain not in the list fails;
- an edit made by Pi appears in the repository on the host side;
- `sbx policy log` shows no refusals except those intentionally set by your list.

## Pitfalls

**Believing that the sandbox protects the repository.** In direct mode, the agent writes to your worktree, including hooks and `Makefile`. Review the diff, or use `--clone` to work on a private copy.

**Copying a key into `models.json`.** It enters the VM with the file. Every key must go through `sbx secret` and a substitution variable.

## For further reading

### The Threat Model

- Kai Greshake, [How We Broke LLMs: Indirect Prompt Injection][greshake-blog] - the blog post accompanying the seminal paper by Greshake et al., [Not what you've signed up for][greshake]: data read by the model becomes an instruction, and Copilot can already be compromised by a package's documentation.
- Simon Willison, [The lethal trifecta for AI agents][trifecta] - access to private data, exposure to untrusted content, and the ability to communicate externally: these three combined are enough for exfiltration.
- Simon Willison, [Agents Rule of Two and The Attacker Moves Second][sw-rule-of-two] - the "at most two out of three properties" rule formulated by Meta, and an article that brings down twelve published defenses against prompt injection under adaptive attack.
- Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections][design-patterns] - architectural patterns that constrain what the agent can do, at the cost of some of its utility.
- Korny Sietsma, [Agentic AI and Security][fowler-security] - the trifecta applied to coding agents on martinfowler.com: containers, least privilege, and task decomposition.
- OWASP, [Top 10 for Agentic Applications 2026][owasp-agentic] - ten risk families, including supply chain compromise and unplanned code execution.
- Marchand et al., [Quantifying Frontier LLM Capabilities for Container Sandbox Escape][sandbox-escape] - a benchmark (2026) where agents find and exploit vulnerabilities in a vulnerable container to escape, providing a measured argument in favor of a separate kernel.

### Documented Incidents

- Johann Rehberger, [The Month of AI Bugs][month-ai-bugs] - one vulnerability per day in August 2025 in coding agents (Claude Code, Codex, Cursor, Copilot, Devin, Jules, OpenHands), which Simon Willison [summarizes][summer-johann].
- Johann Rehberger, [Amazon Q Developer: Remote Code Execution with Prompt Injection][etr-amazon-q] - a `find -exec` classified as read-only is enough to execute code without approval.
- Will Vandevanter (Trail of Bits), [Prompt injection to RCE in AI agents][tob-rce] - argument injection in pre-approved commands, and the sandbox recommended as the primary defense instead of safe command lists.
- Kevin Higgs (Trail of Bits), [Prompt injection engineering for attackers: Exploiting GitHub Copilot][tob-copilot] - a trapped GitHub issue leads the Copilot Agent to add a backdoor dependency.
- Pillar Security, [Rules File Backdoor][rules-file] - hidden instructions in a Cursor or Copilot rules file (March 2025), or the `SUPPORT.md` trap observed in real conditions.
- Nx, [S1ngularity postmortem][nx-postmortem] and Wiz, [attack analysis][wiz-nx] - a compromised npm package (August 2025) enrolls coding agents installed on the workstation, launched without confirmation, to identify secrets to exfiltrate.
- Fortune, [Replit AI wiped a production database][replit] - an agent wipes a production database during a change freeze (July 2025), despite a written instruction forbidding it.
- Pillar Security, [The Agent Security Paradox][cursor-paradox] - CVE-2026-22708 (January 2026): internal shell commands like `export`, outside the Cursor authorization list, poison the environment of approved commands.
- Unit 42, [OpenClaw's Skill Marketplace and the Emerging AI Supply Chain Threat][openclaw] - malicious Markdown skills on an agent's marketplace (2026), the same risk as for a package installed with `pi install`.
- Ken Huang, [Coding Agent Security: Lessons from Claude Code, Cowork, Codex, and Copilot in the Wild][ken-huang] - eight incidents from 2025 and 2026, and a comparison of the sandboxes for Claude Code, Codex, Copilot and Cursor (August 2026).
- Simon Willison, [Breaking Claude Code Opus 5 Auto Mode][sw-auto-mode] - an attack by Johann Rehberger successful four out of five times against Claude Code's automatic mode (August 2026), and the conclusion that a classifier is no replacement for a sandbox.

### Isolation practices and mechanisms

- Mario Zechner, [What I learned building an opinionated and minimal coding agent][zechner-pi] - the author of Pi explains why Pi has no permissions ("As soon as your agent can write code and run code, it's pretty much game over") and recommends running it in a container.
- Armin Ronacher, [Agentic Coding Recommendations][ronacher] - the `claude-yolo` alias accepted, and the risk shifted to Docker.
- Simon Willison, [Designing agentic loops][sw-loops] - YOLO mode is both essential for productivity and dangerous, hence the sandbox, preferably on someone else's computer.
- Simon Willison, [Codex CLI sandbox investigation][codex-sandbox] - Seatbelt on macOS, Landlock and seccomp on Linux, or how another harness makes the same choice.
- sysid, [Your Agent Has Root][sysid] - built-in tools that bypass the kernel sandbox, and a Pi extension to bridge the gap.
- Andrew Lock, [Running AI agents safely in a microVM using docker sandbox][lock] - the complete `sbx` workflow on a developer workstation, including network policies.
- Michael Krämer, [Trust but Sandbox][innoq] - Docker Sandboxes from a team perspective: policies, secrets proxy, custom images.
- Palaimon, [Coding Agents III: Sandboxing & Best Practices][palaimon] - dev containers, bubblewrap, and VMs compared, with measured boot costs.
- Ry Walker, [Local AI Agent Sandboxes][rywalker] - eight local sandbox tools compared, and what remains for a third-party tool when harnesses integrate their own.
- Daniel Vaughan, [Agent Sandbox Comparison Matrix][vaughan] - Codex Seatbelt, OpenShell, and Docker `sbx`: isolation boundary, network, secrets.
- Agache et al., [Firecracker][firecracker] - the AWS Lambda micro-VM (NSDI 2020), the reference text on the trade-off between isolation and boot time.
- Emir Beganović, [Your Container Is Not a Sandbox: The State of MicroVM Isolation in 2026][emirb] - why a container is not a security boundary, the episode where Claude Code disables its own bubblewrap, and an overview of available micro-VMs (March 2026).
- Greg Hurrell, [List of coding agent sandboxes][wincent] - a catalog updated in 2026, from system primitives to hosted platforms, across ten categories.
- Zheng et al., [ActPlane: Programmable OS-Level Policy Enforcement for Agent Harnesses][actplane] - a harness policy applied in the Linux kernel via eBPF (June 2026), with a measured overhead between 2% and 8%.

### Tools

- Docker Sandboxes: [architecture][docker-arch], [security model][docker-security], and [kits][docker-kits].
- Pi: [Security][pi-security] and [Containerization][pi-container].
- [pi-sandbox][pi-sandbox-repo] - a per-command system sandbox for Pi, with an authorization prompt, on `sandbox-exec` or bubblewrap.
- [pi-gondolin][pi-gondolin] and [Gondolin][gondolin] - Pi tools running in a local micro-VM; both projects are declared experimental.
- [OpenShell][openshell] - a declarative policy runtime (file system, network, processes, inference), cited by the Pi documentation.

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
