# The Sandbox: Isolating the Agent from Your Machine

::: tip Module Objectives
- Understand what a code agent can do on your machine
- Compare disposable clones, containers, and micro-VMs: what each protects and its cost
- Launch Pi in Docker Sandboxes using a versioned kit in this repository
- Set up a sandbox where the operations in the following modules can run unsupervised
:::

The following modules run Pi twenty times on the same task without human intervention, assign it sub-agents with shell access, and then chain sub-agents into pipelines. Pi has no mechanism to ask for your consent before executing a command, and its [security documentation](https://pi.dev/docs/latest/security) states it clearly: tools read, write, and launch commands "with the permissions of the pi process," and "Pi does not include a built-in sandbox." Therefore, the agent can do anything you can do from your terminal: read `~/.ssh`, read `~/.pi/agent/auth.json` where your API keys are stored, run `git push --force`, or send the content of a file to any domain using `curl`.

The natural reaction is to write an instruction, "only modify `game/neon.js`," or "do not read anything outside the repository." An instruction is text, and we remind you that using an LLM is always non-deterministic, meaning you will never have a 100% guarantee that it will be followed. In the skills module, you will see that a temporary file cleanup instruction placed in a `SKILL.md` is followed less than one-third of the time. Before the first unsupervised execution, you therefore need a limit that does not depend on the model's obedience. A sandbox is a deterministic way to ensure that the LLM is in a closed environment where you determine the boundaries and the model cannot bypass them.

## Understanding

### What Does the Agent Have Access To?

A code agent running on your machine has access to your files—meaning the repository it is working on and, with the same permissions, your home directory, where SSH keys, model provider tokens, and `.env` files from your other projects live. Network access allows it to install any package, execute a `curl | sh` found in a README, or leak what it has just read. Finally, it launches processes with your identity, which covers the Docker daemon, the `rm` command, and write access to the remote repository. If you also have sudo privileges on your machine, nothing can stop it.

These actions don't even require the model to make a mistake. A repository file can contain instructions written for the agent, which is the purpose of NÉON's `SUPPORT.md`; its text mimics a support procedure but asks to read the `.env` file and send its contents to an external address: the agent opening this file to answer a question treats the instruction as if it came from you, and the permissions module will address this case. An extension installed from the community directory runs, as the Pi module recalled, with all your permissions. In both cases, the vulnerability is in the harness, and a guardrail written inside AGENTS.md will not protect you.

Pi's documentation concludes: "For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task." Our twenty runs on issue #1 are exactly unattended automation. Ultimately, we want autonomous agents capable of working for hours without us having to monitor them.

### Three levels of isolation

The cheapest of the three is the **disposable clone**. The measurement tool in the next module clones NÉON at a tag into a temporary directory for each run, protecting the repository's history and working tree at almost no cost. However, the process still runs under your identity, with your home directory and network, meaning a disposable clone only protects the repository. Furthermore, nothing prevents the model from pushing to your remote repository if it has the permissions, as is the case if it has access to the `gh` command (to work on your GitHub).

A step further, the **container** runs Pi in a Docker image where only the repository is mounted, putting your home directory out of reach. It shares the host kernel, its network is open by default, and most importantly, the provider's API key must be added so that Pi can call the model, as the [Pi page on containerization](https://pi.dev/docs/latest/containerization) notes in one sentence: "Provider API keys enter the container". Therefore, everything the agent executes has access to this key.

The third level is the **policy micro-virtual machine** with [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Each sandbox has its own kernel behind a hypervisor, all outgoing TCP traffic passes through a proxy on the host that only accepts domains from an allowlist, and API keys are injected into HTTP headers by this proxy, so that, to quote the [security page](https://docs.docker.com/ai/sandboxes/security/), "Credential values never enter the VM". The working directory is mounted in the VM at the same absolute path as on the host. The cost is a seven-hundred-megabyte image to build, a daemon to run, and an allowlist of domains to maintain. This may seem complicated, but your preferred AI can help you easily set up this infrastructure.

| what is protected          | disposable clone | container                       | Docker Sandboxes                               |
| --------------------------- | ---------------- | ------------------------------- | ---------------------------------------------- |
| the repository work tree    | yes              | no                              | no by default, yes with `--clone`             |
| your home directory         | no               | yes, if only the repository is mounted | yes                                            |
| outgoing network            | no               | no by default                  | yes, deny by default and allowlist |
| your API keys               | no               | no, they enter the image        | yes, only the host proxy sees them          |

These three levels isolate the Pi process from the host machine, but nothing inside the sandbox still prevents Pi from running `rm -rf` on the repository or reading a `.env` file left in NÉON. The [`pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) extension adds this filter inside the sandbox itself: it hooks into the `tool_call` event of the Pi extension API, a hook that intercepts every tool call, every bash command, every MCP call, and every invoked skill before execution, and compares the request to `allow` / `deny` / `ask` rules written in JSON.

The trade-off lies in where this filter runs. It lives in the same Node process as Pi, not in the kernel that isolates the sandbox, meaning an extension that compromises this process before the rule is evaluated would disable the guardrail along with the rest. `pi-permission-system` tightens what Pi can do once launched in the sandbox; it does not replace any of the three levels in the table above.

### What the sandbox does not protect

In direct mode (the default), the agent edits your working tree in place. The Docker Sandboxes documentation notes that it can therefore modify a git hook, a `Makefile`, or a CI configuration, which will then run on the host when you launch them yourself. The sandbox protects the machine while the agent works, but you must still review the diff.

The `balanced` network policy, recommended by `sbx policy init`, allows domains using broad wildcards like `*.googleapis.com`, which cover more than just model APIs. We start with `deny-all` and then open only the domains that appear in the denial log.

Inside the VM, the agent has administrator privileges, with passwordless `sudo` and its own Docker daemon. We accept this because nothing inside the VM escapes it and the VM itself is disposable.

## Rebuilding

We propose two approaches next: using a Pi extension that adds a hook (which you will rebuild in another module) and using Docker Sandboxes. The first requires no specific installation on your system and will be used for in-person training. However, it has limits and is not sufficient for daily work with agents.

### Installing and configuring `pi-permission-system`

The extension is installed with one command, like any other package from the Pi directory:

```bash
pi install npm:@gotgenes/pi-permission-system
```

Rules are stored in a JSON file read at three levels: global (`~/.pi/agent/extensions/pi-permission-system/config.json`), project (`.pi/extensions/pi-permission-system/config.json`, ignored if the project is not approved), and per agent, in the YAML header of an agent file, which overrides the other two. For NÉON, a project configuration is enough to block the most dangerous instruction in `SUPPORT.md`, as reading a `.env` file is refused by design:

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

The most specific rule wins: `bash.*` requests confirmation by default, `rm -rf *` is refused without asking, and paths outside the repository still require confirmation even when `path.*` allows everything else. If the extension's bash parser cannot classify a command, it is refused rather than allowed, and paths crossing a symbolic link are resolved before comparison.

::: info Exercise (in-class)
Work in a disposable clone of NÉON, since two of the requests below are destructive. Install the extension, place the configuration above in `.pi/extensions/pi-permission-system/config.json`, create a `.env` file at the root containing a fake key, then launch Pi and ask it for three things: to read the content of this `.env` file, to delete the `game/` folder with `rm -rf`, and to run the test suite. The first two requests are refused without Pi consulting you; the third opens a confirmation that you answer yourself.

Then, repeat the request to read the `.env` file three times in a row by rephrasing it, then explaining to Pi that you are the owner of the file and that you authorize it: the verdict does not change, because it comes from a rule evaluated before the tool call and not from a model arbitration.

Finally, remove the `path` block from the configuration and replace it with the instruction "never read .env files" in the repository's `AGENTS.md`, then repeat the same request five times in five different sessions. Count the refusals obtained: you then have your own figure on the value of a text instruction compared to a guardrail in code.
:::

#### Install and configure `sbx`

`sbx` is the command for using Docker Sandboxes. `sbx` knows a list of agents it can launch as is (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` and a few others). Unfortunately, Pi is not one of them. It is therefore necessary to create [a kit](https://docs.docker.com/ai/sandboxes/customize/): a directory described by a `spec.yaml` where the `kind: sandbox` variant defines an agent from scratch: the image, the startup command, instructions added to the context file, keys to inject, and network permissions. Ours is versioned in https://github.com/AI-for-dev/pi-sandbox and contains only three files.

```
pi-sandbox
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

The versions cited below are those with which this kit was verified at the time of writing: `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2.

#### Install `sbx`

The command-line tool is called `sbx`. To install it on your OS, simply go to the following page

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

The image starts from the `shell-docker` template provided by Docker, installs an explicit version of Node because Pi requires at least 22.19, and then pins the Pi version.

The Docker Sandboxes daemon pulls its images from a registry different from the local images available to Docker. Without a registry, you use an archive:

```bash
git clone https://github.com/AI-for-dev/pi-sandbox
cd pi-sandbox
docker build --platform linux/arm64 -t pi-sandbox:0.85.2 .
docker image save pi-sandbox:0.85.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

For a team, you would prefer to push the image to a registry.

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

The `sandbox` block names the image created in the previous step and runs `pi -a`. The `-a` option declares the project files as safe for this execution, which answers the question that `trust.json` posed to the Pi module: inside the VM, a skill or extension found in the repository can only access what the VM contains.

`agentInstructions` adds a few lines to the `AGENTS.md` file that the model reads: a denied domain is not a network failure, which prevents it from retrying ten times, and the provider key is not in the VM.

The `credentials` block declares a key managed by the proxy (`proxyManaged: true`). Pi finds a **sentinel** in `ILAAS_API_KEY`, a dummy value, and the host proxy replaces it with the actual key in the `Authorization` header of requests to `llm.ilaas.fr`, and nowhere else.

Under `permissions.network`, the kit opens the model provider, GitHub for cloning NÉON, and PyPI for measurement tools over the global policy. The `PI_SKIP_VERSION_CHECK` and `PI_TELEMETRY` variables cut certain network operations during Pi startup.

The `files/home/.pi/agent/settings.json` file, which the kit places in the agent's home directory, sets the provider, the default model, and the reasoning level. It replaces the `~/.pi/agent/settings.json` on your host, which is not mounted in the VM. It is quite simple here and looks like this:

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

#### Save the key

`ilaas` authenticates via an API key. You provide it to `sbx` using the service name declared by the kit:

```bash
sbx secret set ilaas
```

You must then enter your key. You can then verify that it is correctly saved using the command:

```bash
sbx secret ls
```

Upon the first launch, `sbx` asks to approve the **credential binding**, the authorization given to a third-party kit to use this secret on the domains it declares. The response is saved in `~/.config/sbx/credentials.yaml`.

::: warning In non-interactive mode, nobody answers
With `sbx create` or from a script, the binding question is not asked. The sandbox still starts, as `sbx` only issues a warning, and the environment variable contains the `proxy-managed` sentinel: the actual key is never injected by the proxy. The error therefore only appears during use as a `401`, and `pi auth check` still reports `ready`. A binding per declared service is required. Write the file beforehand:

```yaml
bindings:
  ilaas:
    apiKey:
      domains: [llm.ilaas.fr]
```
:::

#### Set the network policy

This setting is global, `sbx` requires it before the first sandbox, and it is done once and for all:

```bash
sbx policy init deny-all
```

The kit's `permissions.network.allow` rules are applied on top, for its sandboxes only.

#### Run

```bash
cd pi-sandbox
sbx kit validate .
cd /chemin/vers/neon
sbx run /chemin/vers/pi-sandbox
```

::: info Exercise (self-paced)
Go through the previous five steps on your machine, from installing `sbx` to the first `sbx run`. In the Pi session that opens, ask for the value of the `ILAAS_API_KEY` variable: you will see the sentinel, not your key. Then run `curl https://example.com`: the request fails because the domain is not on any list. Finally, have Pi modify a NÉON file: the change appears on the host side as soon as Pi has written.

Return to the host and read `sbx policy log`, where every refusal is logged with the requested domain. Resume and finish the `pi-permission-system` exercise, this time inside the sandbox: the two guards overlap without interfering, and the `rm -rf` refusal remains fully useful, since in direct mode the repository Pi would erase is your host's.
:::

#### Tightening the allowance list

::: info Exercise (self-paced)
Work an entire session in the sandbox, then re-read `sbx policy log`. Add only the domains whose refusal actually blocked you to `permissions.network.allow`, running `sbx kit validate` after each modification.
:::

## Generalizing

**An operational boundary that does not depend on obedience.** A permission written in text, in an `AGENTS.md` or `SKILL.md`, is a suggestion that the model may or may not follow. The permissions module will build guards in code inside the harness, which refuse a tool call before it executes. The sandbox is the outer layer, the one that holds when the harness itself fails, because a malicious extension or a trapped file can only damage the VM.

**The key remains on the host.** The agent does not need to read the key, only that its requests to a specific domain be authenticated; keeping the key on the host to place it in the header as the request passes removes it from everything the agent can read, execute, or send. This principle applies to any harness, regardless of the tool implementing it.

**Deny by default, then open from the log.** A kit's allowance list is not written in advance: start from denial, work a session, and only add domains whose refusal actually blocked something, as the rest of the act relies on measurement rather than intuition.

## Deliverable

At the end of this module, Pi runs in a sandbox on your NÉON clone, and all operations in the following modules can be performed there with optimal control.

Four checks confirm this:

- the `ILAAS_API_KEY` variable read from the sandbox is the sentinel;
- a request to a domain absent from the list fails;
- an edit made by Pi appears in the repository on the host side;
- `sbx policy log` shows no refusals that your list did not choose.

## Pitfalls

**Believing the sandbox protects the repository.** In direct mode, the agent writes to your working tree, including hooks and `Makefile`. Review the diff, or use `--clone` to work on a private copy.

**Copying a key into `models.json`.** It enters the VM with the file. Every key goes through `sbx secret` and a substitution variable.

## Further reading

### The threat model

- Kai Greshake, [How We Broke LLMs: Indirect Prompt Injection][greshake-blog] - the post accompanying the seminal paper by Greshake et al., [Not what you've signed up for][greshake]: data read by the model becomes an instruction, and Copilot is already being compromised by package documentation.
- Simon Willison, [The lethal trifecta for AI agents][trifecta] - access to private data, exposure to untrusted content, and the ability to communicate externally: the three together are enough for exfiltration.
- Simon Willison, [Agents Rule of Two and The Attacker Moves Second][sw-rule-of-two] - the "at most two out of three properties" rule formulated by Meta, and an article that dismantles twelve published prompt injection defenses under adaptive attack.
- Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections][design-patterns] - architectural patterns that constrain what the agent can do, at the cost of some of its utility.
- Korny Sietsma, [Agentic AI and Security][fowler-security] - the trifecta applied to code agents on martinfowler.com: containers, least privilege, task decomposition.
- OWASP, [Top 10 for Agentic Applications 2026][owasp-agentic] - ten risk families, including supply chain compromise and unforeseen code execution.
- Marchand et al., [Quantifying Frontier LLM Capabilities for Container Sandbox Escape][sandbox-escape] - a benchmark (2026) where agents find and exploit vulnerabilities in a vulnerable container to escape, providing a measured argument in favor of a separate kernel.

### Documented incidents

- Johann Rehberger, [The Month of AI Bugs][month-ai-bugs] - one flaw per day in August 2025 in coding agents (Claude Code, Codex, Cursor, Copilot, Devin, Jules, OpenHands), summarized by Simon Willison [here][summer-johann].
- Johann Rehberger, [Amazon Q Developer: Remote Code Execution with Prompt Injection][etr-amazon-q] - a `find -exec` classified as read-only is enough to execute code without approval.
- Will Vandevanter (Trail of Bits), [Prompt injection to RCE in AI agents][tob-rce] - argument injection in pre-approved commands, and the sandbox recommended as the primary defense instead of safe command lists.
- Kevin Higgs (Trail of Bits), [Prompt injection engineering for attackers: Exploiting GitHub Copilot][tob-copilot] - a trapped GitHub issue leads Copilot Agent to add a backdoor dependency.
- Pillar Security, [Rules File Backdoor][rules-file] - hidden instructions in a Cursor or Copilot rules file (March 2025), similar to the `SUPPORT.md` trap observed in real-world conditions.
- Nx, [S1ngularity postmortem][nx-postmortem] and Wiz, [attack analysis][wiz-nx] - a compromised npm package (August 2025) enrolls coding agents installed on the workstation, launched without confirmation, to locate secrets for exfiltration.
- Fortune, [Replit AI wiped a production database][replit] - an agent wipes a production database during a change freeze (July 2025), despite a written instruction prohibiting it.
- Pillar Security, [The Agent Security Paradox][cursor-paradox] - CVE-2026-22708 (January 2026): internal shell commands such as `export`, outside of Cursor's authorization list, poison the environment of approved commands.
- Unit 42, [OpenClaw's Skill Marketplace and the Emerging AI Supply Chain Threat][openclaw] - malicious Markdown skills on an agent's marketplace (2026), the same risk as for a package installed with `pi install`.
- Ken Huang, [Coding Agent Security: Lessons from Claude Code, Cowork, Codex, and Copilot in the Wild][ken-huang] - eight incidents from 2025 and 2026, and a comparison of sandboxes for Claude Code, Codex, Copilot, and Cursor (August 2026).
- Simon Willison, [Breaking Claude Code Opus 5 Auto Mode][sw-auto-mode] - an attack by Johann Rehberger successful four out of five times against Claude Code's automatic mode (August 2026), and the conclusion that a classifier is no replacement for a sandbox.

### Practices and isolation mechanisms

- Mario Zechner, [What I learned building an opinionated and minimal coding agent][zechner-pi] - the author of Pi explains why Pi has no permissions (« As soon as your agent can write code and run code, it's pretty much game over ») and recommends running it in a container.
- Armin Ronacher, [Agentic Coding Recommendations][ronacher] - the `claude-yolo` alias accepted, and the risk shifted to Docker.
- Simon Willison, [Designing agentic loops][sw-loops] - YOLO mode being both essential for productivity and dangerous, hence the sandbox, preferably on someone else's computer.
- Simon Willison, [Codex CLI sandbox investigation][codex-sandbox] - Seatbelt on macOS, Landlock and seccomp on Linux, or how another harness makes the same choice.
- sysid, [Your Agent Has Root][sysid] - built-in tools that bypass the kernel sandbox, and a Pi extension to bridge the gap.
- Andrew Lock, [Running AI agents safely in a microVM using docker sandbox][lock] - the full `sbx` journey on a developer workstation, including network policies.
- Michael Krämer, [Trust but Sandbox][innoq] - Docker Sandboxes from a team's perspective: policies, secrets proxy, custom images.
- Palaimon, [Coding Agents III: Sandboxing & Best Practices][palaimon] - dev containers, bubblewrap, and VMs compared, with quantified startup costs.
- Ry Walker, [Local AI Agent Sandboxes][rywalker] - eight local sandbox tools compared, and what remains for a third-party tool when harnesses integrate their own.
- Daniel Vaughan, [Agent Sandbox Comparison Matrix][vaughan] - Codex Seatbelt, OpenShell, and Docker `sbx`: isolation boundary, network, secrets.
- Agache et al., [Firecracker][firecracker] - the AWS Lambda micro-VM (NSDI 2020), the reference text on the trade-off between isolation and startup time.
- Emir Beganović, [Your Container Is Not a Sandbox: The State of MicroVM Isolation in 2026][emirb] - why a container is not a security boundary, the episode where Claude Code disables its own bubblewrap, and an overview of available micro-VMs (March 2026).
- Greg Hurrell, [List of coding agent sandboxes][wincent] - a catalog kept up-to-date in 2026, from system primitives to hosted platforms, across ten categories.
- Zheng et al., [ActPlane: Programmable OS-Level Policy Enforcement for Agent Harnesses][actplane] - a harness policy applied in the Linux kernel via eBPF (June 2026), with a measured overhead between 2 and 8%.

### Tools

- Docker Sandboxes: [architecture][docker-arch], [security model][docker-security] and [kits][docker-kits].
- Pi: [Security][pi-security] and [Containerization][pi-container].
- [pi-sandbox][pi-sandbox-repo] - a system sandbox per command for Pi, with authorization prompt, using `sandbox-exec` or bubblewrap.
- [pi-gondolin][pi-gondolin] and [Gondolin][gondolin] - Pi tools running in a local micro-VM; both projects are declared experimental.
- [OpenShell][openshell] - a declarative policy runtime (filesystem, network, processes, inference), cited by Pi documentation.

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
