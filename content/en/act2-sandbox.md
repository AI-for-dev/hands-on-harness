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

- The [Security](https://pi.dev/docs/latest/security) page of the Pi documentation, on the trust granted to project files and the lack of a built-in sandbox, and the [Containerization](https://pi.dev/docs/latest/containerization) page, which presents two alternatives to Docker Sandboxes, Gondolin and OpenShell.
- The Docker Sandboxes documentation: [architecture](https://docs.docker.com/ai/sandboxes/architecture/), [security model](https://docs.docker.com/ai/sandboxes/security/), and [kits](https://docs.docker.com/ai/sandboxes/customize/kits/).
