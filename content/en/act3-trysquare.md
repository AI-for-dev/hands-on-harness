# Measuring an agent: trysquare

::: tip Objectives of this module
- Understand why a single run says nothing about a configuration
- Distinguish a test, which answers yes or no, from an evaluation, which compares noisy behaviors
- Read a trysquare scenario and know what each of its sections decides
- Read a matrix: success rate, gap in points, interval, `*` or `o` mark
- Install the tool and check an experiment plan without spending a single token
:::

In act 2, you rebuilt each brick and tried it by hand: you ran the agent once or twice, read the session and the diff, and drew an impression from it. This way of working is enough to see what a brick changes in the course of a session, but it cannot tell whether one configuration does better than another, because two strictly identical runs do not produce the same result.

Here are six runs of the same configuration on NÉON's issue #1, the one that [module 2.1](./act2-contexte) calls the neglected request: same model, same reasoning effort, same prompt, same repository at the same commit.

| run            | 1      | 2      | 3      | 4       | 5      | 6       |
| -------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| input tokens   | 13,126 | 16,035 | 13,060 | 13,144  | 14,771 | 13,188  |
| turns          | 4      | 5      | 4      | 4       | 5      | 4       |
| duration       | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| criterion met  | yes    | yes    | yes    | **no**  | yes    | **no**  |

The cost varies by less than a quarter, the number of turns takes two values, and the answer changes one time in three. A single run of this configuration would have given you, depending on the draw, "the base fixes the bug" or "the base does not fix it". The dispersion can also bear on the cost rather than the answer: the best-equipped configuration of [module 3.1](./act3-contexte) consumes between 42,731 and 2,420,677 input tokens depending on the run, a spread of **×57**.

The modules in this act therefore measure the levers of act 2 with a tool that repeats each configuration and accounts for this dispersion.

## Definition of the tool

### A test or an evaluation?

A test answers yes or no to a closed question: `npm test` passes, or it does not. A test is reproducible. An evaluation compares behaviors on the same task, repeating each configuration and knowing that the measurement is noisy. The two combine, since an evaluation most often relies on tests to score each run, but they do not answer the same question: the test says whether that diff fixes the bug, the evaluation says whether this harness configuration gets the bug fixed more often than another.

### What is trysquare?

[trysquare](https://github.com/AI-for-dev/trysquare) is a tool written in Python and built for this training. It runs the configurations of a scenario, scores each run, aggregates the scores and produces a summary of the results. It knows nothing about NÉON, nothing about issue #1, nothing about this training: everything specific to an experiment is described in a scenario file and a set of validations it calls. Its English name refers to the carpenter's square, which is used to check that a joint is straight, and the tool serves the same way to check that a measured gap is due to resampling.

::: info Why trysquare rather than Inspect or Harbor?
More mature evaluation tools already know how to repeat a run, and some derive an uncertainty from it. [Inspect](https://inspect.aisi.org.uk/), the framework of the UK AI Security Institute, replays each sample with `--epochs`, aggregates the repetitions (`mean`, `pass_at_k`, `at_least_k`) and publishes a standard error, and its [Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/) package runs Claude Code, Codex CLI, Gemini CLI or OpenCode in a sandbox. [Harbor](https://github.com/harbor-framework/harbor), written by the Terminal-Bench team, runs agents on containerized tasks with `--n-attempts`, summarises the attempts as a mean, with no interval, and spreads the load across remote sandbox providers such as Daytona or Modal.

trysquare today only drives Pi and installs with [uv](https://docs.astral.sh/uv/). Each run starts from a throwaway clone of the repository at a frozen tag, and the agent runs either directly on the machine, which fits on a laptop in a classroom, in a [bubblewrap](https://github.com/containers/bubblewrap) sandbox on Linux, or in a Docker container built from the image the scenario declares. In the latter two cases, the provider key never enters the sandbox: a relay started on the machine substitutes it on every request. trysquare focuses mainly on the question these tools leave open: is the gap measured between two configurations real? It keeps the task fixed and varies the harness (prompt, `AGENTS.md`, system prompt, reasoning, skills), and a configuration can even launch an entire [combo](https://github.com/AI-for-dev/combo) flow. The provider, the model, the reasoning level and the number of repetitions are required in the scenario and are never inherited from the machine. trysquare also reads Pi's session logs to score the procedure followed in addition to the result, and `replay --rescore` rescores runs already paid for after a fix to the validation steps.
:::

## Using trysquare

### What does a scenario contain?

An experiment fits in a self-contained TOML file, the **scenario**, which describes the task, the configurations to compare, the protocol and how to score. Here is a reduced scenario, which compares the neglected request with a framed request and with the addition of an `AGENTS.md`:

```toml
[scenario]
name = "regle-contre-ticket"
title = "Un fichier de règles contre un ticket bien écrit"
hypothesis = "hypothese.md"       # écrite avant de mesurer

[task]
repo = "neon"                     # nom logique, résolu par trysquare.toml
etalon = "etalon-v1"              # un tag, cloné ; jamais l'arbre de travail
prompt = "briques/demande-negligee.md"

[agent]
provider = "ilaas"                # obligatoire, jamais hérité
model = "gemma-4-31b"             # obligatoire
thinking = "off"                  # obligatoire

[protocol]
repetitions = 20                  # déclaré à l'avance
concurrency = 5
timeout = 900

[variants.nothing]                # la base, sans aucun delta

[variants."+agents"]
context = "briques/AGENTS.md"     # déposé dans le clone

[variants."+well_crafted"]
prompt = "briques/demande-cadree.md"

[[validation]]
mode = "script"
command = "validateurs/noter.py"
metrics = ["delivered", "in_scope", "suite_lancee"]   # un contrat

[verdict]
criterion = "in_scope"
reference = "nothing"
```

Each **configuration**, or cell of the matrix, declares only what distinguishes it from the base, which makes the scenario readable at a glance: `+agents` adds a rules file, `+well_crafted` replaces the prompt, and the rest is shared. For a regular plan, trysquare also accepts a grid of axes and takes their product, but named variants suffice as soon as each configuration changes a single thing.

The machine paths, that is the address of the measured repository and the directory where the clones live, are in a second file, `trysquare.toml`. This file refuses at load time any key that would decide what is measured, such as the model or the reasoning effort, so that the same scenario measures the same thing on all machines.

::: warning Each run works on a throwaway clone
If the harness worked directly in the working tree, each run would modify the repository and the next one would measure those modifications rather than the configuration. So trysquare clones the repository **at the declared tag**, into a temporary directory, on each run, drops the configuration files there, then launches the agent.
:::

### What is a validation?

A **validation** is an executable, in the language of your choice, that receives the path of a `context.json` file describing the run (the clone, the diff, the agent's session) and writes to its standard output a JSON object with two fields: `metrics`, the measured values, and `reasons`, the justification for each. The type of a metric decides its aggregation: a boolean becomes a success rate and a number a median.

The scenario's `metrics` list is a contract: a validation that omits a declared metric makes the run invalid instead of scoring it false. The `reasons` field is optional, and we always fill it, because a column uniformly at zero looks like agent behaviour and may just as well be a flaw in the validation. [Module 3.1](./act3-contexte) shows an example, where the shape of the `npm test` command changes from one model to another.

The `context.json` file is archived with the run, which lets you rescore an already paid-for matrix after fixing a validation, without rerunning the model.

::: info And when no script can score?
A scenario can also declare a **judge**, that is a model that reads chosen pieces of the run (the prompt, the final answer, the diff) and returns its verdict through a tool whose parameters are the declared metrics. The judge does not know the name of the configuration it scores, and it must be a different model than the one being evaluated. Its verdict remains probabilistic and it costs tokens on each scoring, so trysquare does not replay it during a rescoring. We prefer an executable test whenever the criterion lends itself to it.
:::

### What does a matrix produce?

A matrix writes one directory per experiment, whose name carries the scenario, the reference, the provider, the model and the number of repetitions:

```
results/issue1-contexte_etalon-v1_ilaas_gemma-4-31b_n20/
  state.json        configurations, exécutions valides, vides ou en échec, reprises
  measures.json     une ligne par exécution
  synthesis.md      scores, coûts, écarts et verdicts
  synthesis.html    la même synthèse en page autonome, liée aux sessions
  runs/<configuration>/<id>/
    configuration.json   le cadre de l'exécution : modèle, harnais, validations
    diff.patch           ce que l'agent a modifié dans le dépôt
    validation/          la sortie de chaque validation, raisons comprises
    session/*.jsonl      la session de l'agent, un fichier par tentative
```

Re-running the same experiment overwrites this directory, and git keeps its previous versions. A directory timestamped per run would accumulate variants of the same experiment, among which you would end up picking whichever suits you.

### How to read a gap?

trysquare's tables speak in **points**, meaning percentage points of success. If a configuration meets the criterion 18 times out of 20, that is 90%, and the baseline 11 times out of 20, that is 55%, the gap is **+35 points**. Only valid runs count, which explains why a denominator can be lower than the number of repetitions.

For each gap, the tool resamples the runs of both configurations ten thousand times, with a fixed seed so the computation is redone identically, and derives a 95% interval from it. Reading a gap then comes down to asking a single question: **does this interval contain zero?** If it does not, the gap is marked `*` and it is **established**. If it does, it is marked `o` and is **not conclusive**, whatever the value at the center, and the tool knows no third state.

The interval also tells the precision of an established gap. The +35 points of the example come with an interval from +10 to +60: the gain is certainly positive, without being able to say whether it is worth ten points or sixty. Conversely, a gap of +17 points whose interval contains zero remains compatible with a lever that helps as well as with a lever that hurts. The `o` are displayed all the same, with a reminder under each table: no conclusion can rely on them.

The number of repetitions depends on what you are looking for. **Three are enough to see the dispersion**, which is the goal in the room. **Telling apart two close levers demands many more**, and the columns that count successes are the most demanding: a 2/3 against 3/3 means next to nothing, whereas an 8/20 against 20/20 holds up. The campaigns published in this act use twenty repetitions for this reason.

::: warning A duration can only be compared within a matrix
trysquare interleaves the runs of the different configurations, instead of running the first twenty times and then the next twenty times, so that all of them undergo the same provider load. Two matrices launched at different times do not have this guarantee, and their duration columns cannot be compared.
:::

::: info Exercise (in the room)
You must have [uv](https://docs.astral.sh/uv/getting-started/installation/) and Pi installed to continue.

We have extracted the experiments of this act into a dedicated repository, outside the training materials: [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter).

```bash
git clone https://github.com/AI-for-dev/trysquare-starter
cd trysquare-starter
uv sync
```

Open `trysquare.toml`, then `scenarios/issue1-contexte.toml`, and find in the second the task, the model, the number of repetitions, the configurations and the validations. Then check the scenario end to end, files and preconditions included, and display the full matrix plan. Neither of these two commands calls a model:

```bash
uv run trysquare validate scenarios/issue1-contexte.toml
uv run trysquare run scenarios/issue1-contexte.toml --output results --dry-run
```

Count the runs the plan announces and estimate what they would cost in time, from the durations in the table at the top of this module. That calculation decides the number of repetitions you will launch in the next module.
:::

The other subcommands work on an already measured matrix and also do not call a model: `render` rebuilds the tables, possibly against another reference, `replay --rescore` rescores the archived runs after a validation fix, `compare` puts two matrices side by side and refuses what is not comparable, and `watch` follows in the browser a matrix in progress and the session of each run while the agent writes it.

## Further reading

- The [trysquare documentation](https://ai-for-dev.github.io/trysquare/), in particular its pages on writing a scenario, writing a validation and measurement invariants.
- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), the exercise repository for this act.
- [Inspect](https://inspect.aisi.org.uk/) and [Harbor](https://github.com/harbor-framework/harbor), the evaluation frameworks to reach for when the question is about a model or an agent facing a set of tasks, and not about a harness variant.
