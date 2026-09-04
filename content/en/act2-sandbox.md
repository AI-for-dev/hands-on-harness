# The Sandbox: Where the Agent is Allowed to Act

::: tip Module Objectives
- Understand what a coding agent can access from your machine when there are no restrictions
- Distinguish between three levels of isolation, from disposable clones to micro-VMs, and identify what each protects and its cost
- Run Pi in a Docker Sandbox using a versioned kit in this repository
- Set up a sandbox where manipulations in the following modules can run unattended
:::

The following modules run Pi twenty times on the same task unattended, entrust it with sub-agents that have shell access, and then chain these sub-agents into pipelines. Pi has no mechanism to ask for your consent before executing a command, and its [security documentation](https://pi.dev/docs/latest/security) is blunt: tools read, write, and launch commands "with the permissions of the pi process", and "Pi does not include a built-in sandbox". Therefore, anything you can do from your terminal, the agent can do too: read `~/.ssh`, read `~/.pi/agent/auth.json` where your API keys are stored, run `git push --force`, or send the contents of a file to any domain using `curl`.

The natural reaction is to write an instruction, such as "only modify `game/neon.js`" or "do not read anything outside the repository". An instruction is just text, and the module on skills will demonstrate that a housekeeping instruction placed in a `SKILL.md` is followed less than one third of the time. Before the first unattended execution, you need a limit that does not depend on the model's obedience; that is the limit we are building now, so that the rest of the act runs within it.

## Understanding

### What can the agent access?

A coding agent running on your workstation has access to your **files**, meaning the repository it is working on and, with the same permissions, your home directory, where SSH keys, model provider tokens, and `.env` files for your other projects reside. The **network** allows it to install any package, execute a `curl | sh` found in a README, or exfiltrate what it has just read. Finally, it launches **processes** under your identity, which includes the Docker daemon, the `rm` command, and write access to the remote repository.

These actions do not even require the model to make a mistake. A file in the repository can contain instructions written for the agent, and the module on permissions will set exactly this trap in NÉON's `SUPPORT.md`. As the module on Pi reminded us, an extension installed from the community directory runs with your full permissions. In both cases, the harness itself is the vulnerability, and a guardrail written inside the harness would change nothing.

Pi's documentation draws the conclusion from this situation: "For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task." Our twenty runs on issue #1 are exactly that: unattended automation.

### Three levels of isolation

The first level is the **disposable clone**. The measurement tool in the following module clones NÉON at a tag into a temporary directory for each run, which protects the repository's history and working tree and costs almost nothing. However, the process still runs under your identity, using your home directory and your network, so a disposable clone only protects the repository.

The second level is the **container**. Pi runs in a Docker image where only the repository is mounted, putting your home directory out of reach. The container shares the host kernel, its network is open by default, and most importantly, the model provider key must enter the container for Pi to call the model, as the [Pi page on containerization](https://pi.dev/docs/latest/containerization) notes in one sentence: "Provider API keys enter the container". Everything the agent executes therefore has access to this key.

The third level is the **policy-controlled micro-virtual machine**, and this is the one we use with [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Each sandbox has its own kernel behind a hypervisor, all outgoing TCP traffic passes through a proxy on the host that only accepts domains from an allowlist, and API keys are injected into HTTP headers by this proxy, so that, to quote the [security page](https://docs.docker.com/ai/sandboxes/security/), "Credential values never enter the VM". The working directory is mounted in the VM at the same absolute path as on the host. The cost is a seven-hundred-megabyte image to build, a daemon to run, an allowlist of domains to maintain, and the impossibility of connecting to a local provider like LM Studio on `127.0.0.1`, since the VM has its own network stack.

| what is protected | disposable clone | container | Docker Sandbox |
| ----------------- | ---------------- | ------------- | ---------------- |
| repository working tree | yes | no | no by default, yes with `--clone` |
| your home directory | no | yes, if only the repository is mounted | yes |
| outbound network | no | no by default | yes, denied by default with an allowlist |
| your API keys | no | no, they are baked into the image | yes, only the host proxy sees them |

### What the sandbox does not protect

In direct mode, the default one, the agent edits your working tree in place, and the Docker Sandboxes documentation notes that it can therefore modify a git hook, a `Makefile`, or a continuous integration configuration, which will execute later on the host when you run them yourself. The sandbox protects the machine during execution, and you remain responsible for reviewing the diff afterward. This is why the measurement tool in the next module keeps its disposable clone inside the sandbox.

The `balanced` network policy, which `sbx policy init` recommends, allows domains via broad wildcards like `*.googleapis.com`, which cover much more than model APIs. We start from `deny-all` and only open what the denial log requires.

Inside the VM, finally, the agent is an administrator, with passwordless `sudo` and its own Docker daemon, which we accept since the boundary is the VM and everything inside it is disposable.

## Rebuilding

### Why a kit

`sbx` knows a list of agents it can launch as is (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` and a few others), and Pi is not one of them. The intended extension point for this case is the **kit**, a directory described by a `spec.yaml` whose `kind: sandbox` variant defines an agent from scratch: the image, the startup command, the instructions added to the context file, the keys to inject, and network permissions. Ours is versioned in `scripts/pi-kit/` of this repository and consists of three files.

```
scripts/pi-kit/
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

The versions cited below are those with which this kit was verified on August 16, 2026: `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2. The kit is an artifact of the second stage of the method, and these numbers will change.

### Installing `sbx`

The command-line tool is called `sbx`, and pages that still describe a `docker sandbox` plugin refer to a deprecated version:

```bash
brew trust docker/tap
brew install docker/tap/sbx
sbx login
```

### Building the image

<<<@/../scripts/pi-kit/Dockerfile{dockerfile}

The image starts from the `shell-docker` template provided by Docker, installs an explicit Node version because Pi requires at least 22.19 and the version embedded in the base image is not guaranteed, then pins the Pi version. The image is the reproducible unit: running `npm install` every time a sandbox is created would not guarantee the same version twice.

The Docker Sandboxes daemon pulls its images from a registry and does not share the local Docker store. Without a registry, an archive is used:

```bash
cd scripts/pi-kit
docker build --platform linux/arm64 -t pi-sandbox:0.84.2 .
docker image save pi-sandbox:0.84.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

For a team, you push the image to a registry and pin `sandbox.image` by its digest, for the reason the next module will detail regarding tags: a name can be moved, a digest cannot.

### Declaring the kit

<<<@/../scripts/pi-kit/spec.yaml

The `sandbox` block names the image loaded in the previous step and runs `pi -a`. The `-a` option declares project files as safe for this execution, which answers the question `trust.json` asked in the module on Pi: inside the VM, a skill or extension found in the repository can only access what the VM contains, and the trust decision changes scale.

The `agentInstructions` block adds a few lines to the `AGENTS.md` that the model reads. These tell it that a denied domain is not a network failure, preventing it from retrying ten times, and that the provider key is not in the VM.

The `credentials` block declares a key managed by the proxy (`proxyManaged: true`). Pi finds a **sentinel** in `OPENCODE_API_KEY`, a dummy value, and the host proxy replaces it with the real key in the `Authorization` header of requests to `opencode.ai`, and nowhere else. A single key covers `opencode-go` and opencode Zen, since Pi reads the same variable for both.

The `permissions.network` block lists the domains the kit opens on top of the global policy: the model provider, GitHub to clone NÉON, PyPI for measurement tools. Explicitly denying `pi.dev`, combined with the `PI_SKIP_VERSION_CHECK` and `PI_TELEMETRY` variables, cuts Pi's startup network operations.

The `files/home/.pi/agent/settings.json` file, which the kit places in the agent's home directory, sets the default provider and model, the reasoning level, and a silent startup. It serves as your host's `~/.pi/agent/settings.json`, which is not mounted in the VM.

### Saving the key

`opencode-go` authenticates via API key, and Pi stores it on your host in `~/.pi/agent/auth.json`. You entrust it to `sbx` under the name of the service declared by the kit:

```bash
python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.pi/agent/auth.json')))['opencode-go']['key'])" \
  | sbx secret set opencode-go
sbx secret ls
```

On the first run, `sbx` asks you to approve **credential binding**, the authorization given to a third-party kit to use this secret on the domains it declares. The response is saved in `~/.config/sbx/credentials.yaml`.

::: warning In non-interactive mode, no one answers
With `sbx create` or from a script, the binding question is not asked; the sandbox starts without the key and only issues a warning. Write the file first:

```yaml
bindings:
  opencode-go:
    apiKey:
      domains: [opencode.ai]
```
:::

### Set the network policy

This is a global setting, required before the first sandbox, and is done once and for all:

```bash
sbx policy init deny-all
```

The kit's `permissions.network.allow` rules apply on top, for its sandboxes only.

### Launch

```bash
sbx kit validate scripts/pi-kit
cd /chemin/vers/neon
sbx run --kit /chemin/vers/hands-on-harness/scripts/pi-kit pi
```

::: info Exercise (in-class)
In the Pi session that opens, ask for three things. First, the value of the `OPENCODE_API_KEY` variable: you will see the sentinel, not your key. Next, a `curl https://example.com`: the request fails because the domain is not on any list. Finally, a modification to a NEON file: it appears on the host side as soon as Pi has written it.

Return to the host and read `sbx policy log`, where every refusal is logged with the requested domain.
:::

Here is what was verified on this kit on August 16, 2026, with the versions mentioned above: the image construction, `sbx kit validate`, `sbx template load`, and the sandbox creation; the key injection, with a `POST /zen/go/v1/chat/completions` carrying the sentinel returning `200`; a response from `pi -p` via `opencode-go` and `deepseek-v4-flash`; and an edit requested to Pi visible in the host repository.

### Tighten the authorization list

::: info Exercise (self-paced)
Work an entire session in the sandbox, then reread `sbx policy log`. Add only the domains to `permissions.network.allow` whose refusal actually blocked you, running `sbx kit validate` after each modification.
:::

Never use wildcards in `inject[].domain`: the proxy would then switch to TLS interception for all concerned sub-domains, for a key that only needs a single host.

::: warning Two `sbx` 0.38.0 pitfalls
The documentation presents `scheme: bearer` as a shortcut for `header: Authorization` and `format: "Bearer %s"`. `sbx` 0.38.0 does not convert it: the proxy injects nothing, removes the sentinel from the request, and the gateway responds with `401 Missing API key`. The symptom can be found in `~/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/daemon.log`:

```
WARN "skipping empty service auth config" service=opencode-go
WARN "proxy: no header mapping for service" service=opencode-go
```

On `opencode-go`, models served by an `anthropic-messages` API (`minimax-m3`, `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max`) expect the key in an `x-api-key` header rather than `Authorization`. The second `inject` entry, commented in `spec.yaml`, is for this case. `sbx kit validate` accepts two entries for the same domain, but the proxy behavior when both apply to the same request is not documented and remains to be confirmed with a real call. The header-independent alternative is a custom secret, `sbx secret set-custom --host opencode.ai --env OPENCODE_API_KEY`, which replaces the sentinel wherever it appears in the request, using a mechanism that Docker documents as experimental.
:::

::: info And with ILaaS?
The provided kit targets `opencode-go`, as it is the provider on which it was verified. For a manually declared provider like [ILaaS](https://www.ilaas.fr/), the recipe follows the same mechanism: a `files/home/.pi/agent/models.json` where the `apiKey` field is set to `"$ILAAS_API_KEY"`, a `credentials` entry for this variable with `llm.ilaas.fr` as the injection domain, and this domain in the allowlist. We have not yet run this variant on a real call.

A key written in plain text in `models.json` would enter the VM with the file and negate what the proxy provides.
:::

## Generalizing

**A limit that does not depend on obedience.** A permission written in text, in an `AGENTS.md` or a `SKILL.md`, is a suggestion that the model may or may not follow. The module on permissions will build code-based guardrails inside the harness that refuse a tool call before it executes. The sandbox is the outer layer, the one that holds when the harness itself fails, because a malicious extension or a trapped file only reaches what the VM contains.

**The secret remains where the request leaves.** The agent never needed the key; it needs its requests to a specific domain to be authenticated. Separating the two, by keeping the key on the host and placing it in the header when the request passes through, removes the key from everything the agent can read, execute, or send. This principle applies to any harness, regardless of the tool implementing it.

**Refuse by default, then open from the log.** A kit's allowlist is not written upfront: we start with refusal and add what `sbx policy log` requests, just as the rest of the act starts with a measurement before deciding.

**The reproducible unit is a pinned image.** The kit freezes Node and Pi in an image, just as the measurement tool in the next module freezes NÉON to a tag, and the following module will show that a tag itself can be moved, which only a digest or a commit can prevent.

## Deliverable

By the end of this module, Pi will be running in a sandbox on your NÉON clone, and that is where all manipulations in the following modules will take place.

The success criterion consists of four checks:

- the `OPENCODE_API_KEY` variable read from the sandbox is the sentinel;
- a request to a domain absent from the list fails;
- an edit made by Pi appears in the repository on the host side;
- `sbx policy log` shows no refusals that your list did not intentionally choose.

## Pitfalls

**Believing that the sandbox protects the repository.** In direct mode, the agent writes to your worktree, including hooks and `Makefile`. Review the diff, or use `--clone` to work on a private copy.

**Copying a key into `models.json`.** It enters the VM with the file. Every key must go through `sbx secret` and a substitution variable.

**Write `scheme: bearer`.** Nothing is injected and the provider returns `401`. Write `header` and `format`.

**Don't mistake `balanced` for a restrictive policy.** Its wildcards open much more than model APIs. Start from `deny-all`.

**Don't forget the binding in non-interactive mode.** The sandbox starts without the key with a simple warning, and the error only appears on the first call to the model.

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
