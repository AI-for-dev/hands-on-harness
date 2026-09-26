# The sandbox: isolating the agent from your machine

::: tip Objectives of this module
- Know what a code agent can do on your machine
- Compare the disposable clone, the container and the micro virtual machine: what each protects, and what it costs
- Launch Pi in Docker Sandboxes with a kit versioned in this repository
- Leave with a sandbox in which the exercises of the following modules run unattended
:::

The following modules launch Pi twenty times on the same task without human intervention, give it sub-agents that have a shell, then chain sub-agents into pipelines. Pi has no mechanism for asking your consent before executing a command, and its [security documentation](https://pi.dev/docs/latest/security) says it clearly: the tools read, write and run commands "with the permissions of the pi process", and "Pi does not include a built-in sandbox". Anything you can do from your terminal, the agent can do too: read `~/.ssh`, read `~/.pi/agent/auth.json` where your API keys are stored, run `git push --force`, or send the content of a file to any domain with `curl`.

The natural reaction is to write an instruction, "only modify `game/neon.js`", "read nothing outside the repository". An instruction is text, and we remind you that using an LLM is always non-deterministic, which means you will never have a 100% guarantee that it will be followed. In the module on skills, you will observe that an instruction to clean up temporary files placed in a `SKILL.md` is followed less than one time in three. Before the first unattended run, you therefore need a boundary that does not depend on the model's obedience. The sandbox is a deterministic way to ensure the LLM is in a closed environment where the boundaries are set by you and that the model cannot cross.

## Understanding

### What does the agent have access to?

A code agent running on your machine has access to your files, that is, the repository it works on and, with the same rights, your home directory, where the SSH keys, the model provider tokens and the `.env` files of your other projects live. The network lets it install any package, run a `curl | sh` found in a README, or broadcast what it has just read. Finally, it launches processes with your identity, which covers the Docker daemon, the `rm` command and write access to the remote repository. If you also have sudo privileges on your machine, nothing stops it.

These actions do not even require the model to make a mistake. A file in the repository can contain instructions written for the agent, and that is the role of NÉON's `SUPPORT.md`, whose text mimics a support procedure but asks the agent to read the `.env` and send its contents to an external address: the agent that opens this file to answer a question treats the instruction as if it came from you, and the permissions module will deal with this case. An extension installed from the community directory runs, as the module on Pi reminded us, with all of your rights. In both cases, the flaw is in the harness, and a guardrail written inside AGENTS.md will not protect you.

Pi's documentation concludes: "For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task." Our twenty runs on issue #1 are exactly unattended automation. And eventually, we want autonomous agents that can work for hours without us having to monitor them.

### Three levels of isolation

The cheapest of the three is the **disposable clone**. The measurement tool of the next module clones NÉON at a tag, into a temporary directory, on every run, which protects the repository's history and working tree at little or no cost. Still, the process runs under your identity, with your home directory and your network, so a disposable clone only protects the repository. And even then, nothing stops the model from pushing to your remote repository if it has the rights, which is the case if it has access to the `gh` command (to work on your GitHub).

One step further, the **container** runs Pi in a Docker image where only the repository is mounted, putting your home directory out of reach. It shares the host kernel, its network is open by default, and above all the model provider's API key must be added to it so that Pi can call the model, which the [Pi page on containerization](https://pi.dev/docs/latest/containerization) notes in one sentence: "Provider API keys enter the container". So everything the agent runs has access to this key.

The third level is the **policy micro-VM** with [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Each sandbox has its own kernel behind a hypervisor, all outbound TCP traffic passes through a proxy on the host that only accepts domains from an allowlist, and this proxy injects the API keys into the HTTP headers, so that, to quote the [security page](https://docs.docker.com/ai/sandboxes/security/), "Credential values never enter the VM". The working directory is mounted into the VM at the same absolute path as on the host. The cost is a 700 MB image to build, a daemon to run, a list of allowed domains to maintain. It may seem complicated, but your favorite AI can help you set up this infrastructure easily.

| what is protected             | disposable clone | container                       | Docker Sandboxes                               |
| ----------------------------- | ---------------- | ------------------------------- | ---------------------------------------------- |
| the repository's working tree | yes              | no                              | no by default, yes with `--clone`              |
| your home directory           | no               | yes, if only the repository is mounted | yes                                      |
| outbound network              | no               | no by default                   | yes, denied by default with an allowlist       |
| your API keys                 | no               | no, they get into the image     | yes, only the host's proxy sees them           |

These three levels isolate Pi's process from the host machine, but nothing inside the sandbox yet stops Pi from running `rm -rf` on the repository or reading a `.env` lying around in NÉON. The [`pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) extension adds this filter inside the sandbox itself: it hooks into the `tool_call` event of Pi's extension API, a hook that intercepts every tool call, every bash command, every MCP call, and every skill invocation before it executes, and compares the request against `allow` / `deny` / `ask` rules written in JSON.

The trade-off lies in where this filter runs. It lives in the same Node process as Pi, not in the kernel that isolates the sandbox, so an extension that compromised this process before the rule is evaluated would disable the guard along with everything else. `pi-permission-system` tightens what Pi can do once launched in the sandbox; it doesn't replace any of the three levels in the table above.

### What the sandbox doesn't protect

In direct mode, the default one, the agent edits your working tree in place, and the Docker Sandboxes documentation reminds us that it can therefore modify a git hook, a `Makefile` or a continuous integration configuration, which will run later on the host when you launch them yourself. The sandbox protects the machine while the agent works, and it does not spare you from reviewing the diff.

The `balanced` network policy, the one that `sbx policy init` recommends, allows domains with broad wildcards like `*.googleapis.com`, which cover far more than model APIs. We start from `deny-all` and then only open the domains that appear in the denial log.

Finally, inside the VM, the agent is an administrator, with passwordless `sudo` and its own Docker daemon, which we accept, since nothing that happens there ever leaves it and the VM itself is disposable.

## Rebuilding

We offer you two approaches below: using an extension in Pi that adds a hook (which we will suggest rebuilding in another module) and using Docker Sandboxes. The first solution requires no special installation on your system, and will therefore be used for the classroom training. But bear in mind that it has its limits and that it is clearly not sufficient for daily work with agents.

### Installing and configuring `pi-permission-system`

The extension installs with one command, like any package from Pi's directory:

```bash
pi install npm:@gotgenes/pi-permission-system
```

The rules live in a JSON file, read at three scopes: global (`~/.pi/agent/extensions/pi-permission-system/config.json`), project (`.pi/extensions/pi-permission-system/config.json`, ignored if the project is not approved) and per agent, in the YAML header of an agent file, which overrides the first two. For NÉON, a project configuration is enough to stop the most dangerous instruction in `SUPPORT.md`, since reading a `.env` is refused by construction:

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

Finally, remove the `path` block from the configuration and replace it with the instruction "never read a `.env` file" in the repo's `AGENTS.md`, then resubmit the same request five times in five different sessions. Count the refusals you get: you now have your own figure for what a text instruction is worth against a guardrail in code.
:::

#### Install and configure `sbx`

`sbx` is the command for using Docker Sandboxes. `sbx` has a list of agents it can launch as-is (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode`, and a few others). Unfortunately, Pi is not one of them. You therefore need to create [a kit](https://docs.docker.com/ai/sandboxes/customize/): a directory described by a `spec.yaml` whose `kind: sandbox` variant defines an agent from scratch: the image, the startup command, the instructions added to the context file, the keys to inject, and the network permissions. Ours is versioned at https://github.com/AI-for-dev/pi-sandbox and contains only three files.

```
pi-sandbox
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

The versions listed below are the ones with which this kit was verified at the time of writing: `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2.

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

The image starts from the `shell-docker` template provided by Docker, installs an explicit version of Node because Pi requires at least version 22.19, then pins the Pi version.

The Docker Sandboxes daemon pulls its images from a registry different from the local images available to Docker. Without a registry, you go through an archive:

```bash
git clone https://github.com/AI-for-dev/pi-sandbox
cd pi-sandbox
docker build --platform linux/arm64 -t pi-sandbox:0.85.2 .
docker image save pi-sandbox:0.85.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

For a team, you'll prefer to push the image to a registry.

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

The `sandbox` block names the image created in the previous step and launches `pi -a`. The `-a` option declares the project files as safe for this run, which answers the question that `trust.json` asked in the module on Pi: inside the VM, a skill or extension found in the repository can only touch what the VM contains.

`agentInstructions` adds a few lines to the `AGENTS.md` the model reads: a denied domain is not a network failure, which keeps it from retrying ten times, and the provider key is not in the VM.

The `credentials` block declares a key managed by the proxy (`proxyManaged: true`). Pi finds in `ILAAS_API_KEY` a **sentinel**, a dummy value, and the host's proxy replaces it with the real key in the `Authorization` header of requests to `llm.ilaas.fr`, and nowhere else.

Under `permissions.network`, the kit opens, on top of the global policy, the model provider, GitHub for cloning NÉON, and PyPI for the measurement tools. The `PI_SKIP_VERSION_CHECK` and `PI_TELEMETRY` variables disable some of Pi's startup network operations.

The `files/home/.pi/agent/settings.json` file, which the kit drops into the agent's home directory, sets the default provider and model, and the reasoning level. It replaces your host's `~/.pi/agent/settings.json`, which is not mounted in the VM. It is fairly simple here and looks like this

```json
{
  "defaultProvider": "ilaas",
  "defaultModel": "deepseek-v4-flash",
  "defaultThinkingLevel": "high"
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

::: warning In non-interactive mode, nobody answers
With `sbx create` or from a script, nobody is asked the binding question. The sandbox starts anyway, `sbx` only issuing a warning, and the environment variable contains the `proxy-managed` sentinel: the real key is never injected by the proxy. The error therefore only appears at runtime, as a `401`, and `pi auth check` nevertheless announces `ready`. A binding per declared service is necessary. Write the file beforehand:

```yaml
bindings:
  ilaas:
    apiKey:
      domains: [llm.ilaas.fr]
```
:::

#### Setting the network policy

This setting is global, `sbx` requires it before the first sandbox, and it is done once and for all:

```bash
sbx policy init deny-all
```

The kit's `permissions.network.allow` rules apply on top, for its sandboxes only.

#### Launching

```bash
cd pi-sandbox
sbx kit validate .
cd /chemin/vers/neon
sbx run /chemin/vers/pi-sandbox
```

::: info Exercise (on your own)
Walk through the previous five steps on your machine, from installing `sbx` to the first `sbx run`. In the Pi session that opens, ask for the value of the `ILAAS_API_KEY` variable: you will see the sentinel, not your key. Then run a `curl https://example.com`: the request fails, because the domain is not on any list. Finally, have a NÉON file modified: the change appears on the host side as soon as Pi has written.

Go back to the host and read `sbx policy log`, where every refusal is logged with the domain requested. To finish, redo the `pi-permission-system` exercise, this time inside the sandbox: the two guards stack without getting in each other's way, and the `rm -rf` refusal keeps all its usefulness, since in direct mode the repository Pi would erase is the one on your host.
:::

#### Tightening the allowlist

::: info Exercise (on your own)
Work a full session inside the sandbox, then reread `sbx policy log`. Add to `permissions.network.allow` only the domains whose refusal actually blocked you, rerunning `sbx kit validate` after each change.
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

## Pitfalls

**Believing the sandbox protects the repository.** In direct mode the agent writes in your working tree, hooks and `Makefile` included. Review the diff, or use `--clone` to work on a private copy.

**Copying a key into `models.json`.** It enters the VM with the file. Any key goes through `sbx secret` and a substitution variable.

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
