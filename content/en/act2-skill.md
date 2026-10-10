# Skills: defining competencies

::: tip Objectives of this module
- Know what a skill is
- Distinguish a competency the model can ignore from one you impose on it
- Write a work procedure that produces an exploitable deliverable
- Revise a procedure from the sessions you read, by testing it with several models
:::

The previous module let you become familiar with the context and with how to interact with it. You could also see behavioral differences depending on the chosen model. You may also have noticed that the fact that issue #1 is very well specified in NÉON's `ISSUES.md` file lets fairly recent models easily fix the bug by adding all the necessary tests, because they read the whole repository and easily stumble upon it. You could use a very short prompt: the model would still find this file.

In the real world, you will ask to fix the bug without such a thorough explanation, because you won't necessarily know how to assess all the side effects of that bug.

The question of this module is therefore whether a competency (called a *skill*), written once and reloaded on demand, gets the same results as in the previous module without providing the tests.

We follow the usual order: understand what a skill is in the harness, write one on this question, measure what it produces.

## Understand

### A skill is a Markdown file

A **skill** is a `SKILL.md` file placed in a `.pi/skills/<nom>/` directory of the project or of Pi's global directory, in the format of the open [Agent Skills](https://agentskills.io) standard. It consists of a frontmatter, which carries at minimum a name and a description, and a body that contains the instructions. There is no code, no registration, no configuration to plan for: simply placing the file there is enough.

Here is a complete skill, deliberately tiny:

```markdown
---
name: revue-rapide
description: Relit les modifications en cours du dépôt.
Utiliser quand l'utilisateur demande une relecture avant de commiter.
---

# Revue rapide

1. Lance `git diff` et lis toute la sortie.
2. Relève ce qui peut casser un test existant, puis ce qui manque de test.
3. Rends deux listes : « à corriger avant le commit » et « peut attendre ».
```

A skill describes instructions and supporting files (scripts, references) that an agent loads on demand, rather than retyping them into every prompt. It holds a distinct place in the harness: `AGENTS.md` enters the context at every turn and therefore costs on every turn, whereas a skill is made to enter only when the task calls for it.

### What the model sees of it

One mechanics point conditions everything else: Pi injects into the system prompt, **every turn**, the name, description, and path of each available skill:

```
The following skills provide specialized instructions for specific tasks.
Use the read tool to load a skill's file when the task matches its description.

<available_skills>
  <skill>
    <name>revue-rapide</name>
    <description>Relit les modifications en cours du dépôt...</description>
    <location>/chemin/vers/.pi/skills/revue-rapide/SKILL.md</location>
  </skill>
</available_skills>
```

Other harnesses supply this list in a similar way, though not necessarily in the same place in the context.

The **body** of `SKILL.md` is not there. So how can the model use it? There are two possible paths.

The first is that the model **decides** to open it with the reading tool, on the strength of the description alone. Pi's documentation says it in the same terms, adding that "models don't always do this".

The second is that the user writes `/skill:revue-rapide` in their message, in which case Pi **expands** the file client-side and pastes its body into the first turn. The model no longer has anything to decide.

There are two practical consequences. The description is the only thing the first path relies on, so all the care put into the body is useless until it triggers. And a skill costs almost nothing as long as it is not used, which makes it tempting to accumulate them. Keep in mind, however, that each added description enters the context on every turn, and that twenty skills end up forming a sizable preamble.

::: info Exercise (in class)
Verify this mechanism yourself, in your clone of NÉON.

1. Create `.pi/skills/revue-rapide/SKILL.md` with the content above, modify one line of a file in the game, then open a session.
2. Export the session with `/export` and find the `<available_skills>` block in the system prompt: the name, the description, and the path are there, the body is not.
3. Ask "reread what I just changed" without naming the skill, and see whether the model reads `SKILL.md` on its own: the call to the read tool is visible in the session.
4. Open a fresh session and type `/skill:revue-rapide`. This time the body is pasted into your first message, and there is no longer any decision to observe.

You have just walked through both paths. The first relies entirely on the description, the second does not need it.
:::

::: warning User-invoked only
You can make your skill impossible to trigger from the model, and only from you, by putting this in the frontmatter:

```
disable-model-invocation: true
```

The skill's description will then not be added to the list of skills present in the context.
:::

### Full anatomy

So far we have only presented the `SKILL.md` file, but note that a whole tree structure is possible, offering many possibilities for your skill.

```
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

The three optional directories can be very useful as you continue building your harness.

- `scripts`: these are programs that come with the skill and are mentioned in `SKILL.md`. They make it possible to always follow the same path and to avoid letting the model create its scripts on the fly, because, as you know, it will never do it the same way twice.
- `references`: sometimes `SKILL.md` becomes too long and some parts are specific. You can then ask, in the skill's instructions, to look in those reference files. You can see this as a form of recursion. Imagine you have a skill for documentation. Documentation in a piece of software comes in different kinds: user, reference, API, how-to, tutorial... And it is not written the same way depending on the target. You could therefore list these different documentations in the skill with their description, and reference the files in `references` so the model reads only the one that concerns it.
- `assets`: this directory holds any document useful to the model that the skill needs: image, template...

We will use them in the second part of **Rebuilding**.

### Should I write my skill?

It all depends, once again, on the degree of control you want over your harness. You will find plenty of sites offering skills. The best known is probably https://www.skills.sh/. Still, you have to be careful, because, as we saw, a skill can ask your model to do things for it or run scripts. Security vigilance is therefore something to take into account.

We encourage you to start by writing them yourself, drawing inspiration from people with enough perspective on the use of skills who can be a source of inspiration. Here, in our view, are the three people offering the best skills in October 2026:

- Lauren Tan: https://github.com/cursor/plugins/tree/main/pstack
- Matt Pocock: https://github.com/mattpocock/skills
- Addy Osmani: https://github.com/addyosmani/agent-skills

You can also use Anthropic's [skill-creator skill](https://www.skills.sh/anthropics/skills/skill-creator) to build your first skeleton.

::: warning Agents are not humans
You have to be careful when writing a skill. It is not intended for a human, but for a model, and a model does not need the same information. A human tends to take what they believe in and set aside the paragraphs that seem less relevant to them. If in doubt, they will do some research to form their own opinion. A model or an agent will not do that at all. It will follow your instructions to the letter, and everything written will carry the same weight for it. An agent will not guess what you forgot to say either.

All of which is to say that you should get to the point and write the process you want to repeat again and again on every call to the skill.
:::

## Rebuilding

We will now try to create a skill suited to the NÉON project. As we mentioned in the introduction, the previous module showed that if the agent had a precise definition of the problems related to a bug and of the associated tests, then it should be able to give you a quality solution.

We therefore propose to do it in two steps. The first version lists all the problems encountered in a brick-breaker game related to issue #1. The problem with this first version is that it is far too specific to our case. The value of a skill is that it is specific to a problem, but general enough to be usable in other cases. The second version will therefore try to build a list of bugs for the arcade game under consideration before following the same process as the first solution.

### Version 1

We'll build this version in several steps. You need to understand that creating a skill is an iterative process. You'll test it, then improve it as you go through tests on it. The model also matters. You can have a skill that works very well on a fairly capable model and collapses on a lighter one. It's up to you to decide whether you want your skill to work across a set of models.

Models evolve very quickly, so the skill must not be frozen, and you have to make it evolve as part of improving your harness. Written instructions can become less useful, or even harmful, down the line.

You can build on the [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) skill provided by Anthropic, or try it step by step.

::: info Exercise (in class)
Start by writing the frontmatter and making the skill trigger every time a bug fix in NÉON is requested.

Test it with different models.
:::

We'll now define a list of known bugs. We could have had you build it yourselves, but we'd rather give you an example so you can focus on what matters. Here is the beginning of the skill we suggest:

::: details The beginning of the `playtester` skill

<<<@/../scripts/skills/playtester/SKILL.md#L1-77{md}

:::

::: info Exercise (in class)
Starting from this already fairly explicit file beginning, we ask you to write two more parts:

- **3. Red tests**: how the agent writes the tests from the list established in step 2;
- **4. Verification**: when the agent is done.

Then test your skill with at least two models, on the neglected request from the previous module, without letting the agent read `ISSUES.md`. Look at the tests produced and check that they cover all the problems in bug #1 described in `ISSUES.md`. If not, fix the procedure and start over.

Our version is in the solution below. Only open it after testing yours.
:::

::: details Solution: the complete `playtester` skill

<<<@/../scripts/skills/playtester/SKILL.md{md}

:::

### Version 2

The first version works on NÉON, but its catalog was written by hand for a brick breaker. If you use `playtester` on a shoot 'em up or a platformer, the procedure still holds, but the agent no longer has any entry to choose from. So we'll ask the agent to build the catalog for the genre itself from a web search. This catalog will be stored in the skill's `references` directory: it is built only once and read again on subsequent calls. The rest of the procedure hardly changes.

This is the occasion to use the optional directories we mentioned earlier. The `dynamic-playtester` skill has the following shape:

```
dynamic-playtester/
├── SKILL.md
├── references/
│   ├── consignes-catalogue.md   # consignes pour construire le catalogue
│   └── bugs-arcade.md           # le catalogue, écrit par le script
└── scripts/
    └── catalogue.sh             # construit le catalogue dans une session séparée
```

We'll write these files in order: the instructions for building the catalog, the script that runs them, then the skill that calls the script. Pi has no web search tool: its base tools are `read`, `write`, `edit` and `bash`. Search therefore goes through the `pi-web-access` extension, which provides the `web_search` and `fetch_content` tools, whatever model is used. Install it before you start:

```bash
pi install npm:pi-web-access
```

It works without an API key. The collection script we're about to write runs in Pi's `codemode` tool, available from version 1.0.

#### The catalog instructions

The file `references/consignes-catalogue.md` is not read by the agent fixing the bug. It holds the instructions given to another session, launched by the script, whose only job is to write `references/bugs-arcade.md`. These instructions only matter when building the catalog, which is why they live in `references` and not in `SKILL.md`.

This session knows only the instructions, the game genre, and the path of the file to write. So it must know what it's looking for, where to look, and in what form to return the result. Form is the most important point: the skill will reread this file, and each entry must have an invariant, since that's what the tests will check. Also keep in mind that the page text comes from the internet and anyone could have written it. The instructions must therefore state that this is data and not instructions.

For the search itself, you can let the model choose its queries and open pages one by one. It will then do one loop iteration per call, and two runs won't search for the same thing. The `codemode` tool, by contrast, runs a script that does all the searches and opens all the pages in a single iteration. It's the same idea as for the `scripts` directory: always follow the same path.

::: info Exercise (in class)
Write `references/consignes-catalogue.md`. The session must search for genre bugs for each of these components: movement and collision, player input, screen edges, timestep, score and state. It writes one entry per distinct cause, with its symptom, its cause, its invariant and the URL of the page it comes from, and it appends a section to the file without erasing the other genres.
:::

::: details Solution: `references/consignes-catalogue.md`

<<<@/../scripts/skills/dynamic-playtester/references/consignes-catalogue.md{md}

:::

#### The script that builds the catalog

You could ask the agent to do the search directly. The problem is that the agent receiving the ticket knows the symptom and will search around it: "the ball passes through the bricks" returns pages about tunneling, and the catalog will contain only that. That's exactly what we want to avoid. A session launched with `pi -p` starts from an empty context. It knows only the genre, and so searches across all components.

This session must not load anything other than the instructions: neither `AGENTS.md` nor the skills. Otherwise, it risks reproducing the symptom, or even calling `dynamic-playtester` itself. It needs only the search, read, and write tools, and it is best that it uses the same model as the session that calls it.

::: info Exercise (in class)
Write `scripts/catalogue.sh`, which takes the genre as an argument (`bash scripts/catalogue.sh "breakout"`), runs the session described above with the instructions from `references/consignes-catalogue.md`, then checks that `references/bugs-arcade.md` is not empty.

Run it alone on `breakout` and compare the result with the catalogue from version 1. Run it a second time: do you get the same catalogue?
:::

::: details Solution: `scripts/catalogue.sh`

<<<@/../scripts/skills/dynamic-playtester/scripts/catalogue.sh{bash}

:::

#### Adapting the skill

It remains to modify `playtester` so that it no longer depends on the brick-breaker. The hard-coded catalogue gives way to a first step that reads `references/bugs-arcade.md` and runs the script if the game's genre is not there yet. The genre must be written in English, since it serves as a keyword for the search.

The other steps remain in place, but several passages were written for balls and bricks: faces, corner, grid, direction of `y`... They must be generalized without losing the setup rules, which remain valid in a shoot 'em up. Finally, a catalogue pulled from the web mixes bugs and gameplay suggestions, such as "speed up the ball as the level progresses". The agent must know how to discard the latter.

::: info Exercise (in class)
Write `dynamic-playtester/SKILL.md` from `playtester`.

Test it on NÉON with the neglected request, without `ISSUES.md` and without `references/bugs-arcade.md`. The first call must build the catalogue and the second must reuse it. Do the tests produced cover the problems of issue #1 as well as with version 1?
:::

::: details Solution: the complete `dynamic-playtester` skill

<<<@/../scripts/skills/dynamic-playtester/SKILL.md{md}

:::

## Generalizing

What we built for NÉON holds for any skill.

A skill is a procedure written in text. It executes nothing by itself: it tells the model in what order to work and what it must return. When a step must always be done the same way, it is better to put it in a script in the `scripts` directory than to describe it, as we did for building the catalogue.

The description is the only part the model reads for certain. It must say when to use the skill, and not only what it does. If you want to be sure the skill is used, call it yourself with `/skill:<name>`.

The knowledge of a domain and the procedure that uses it do not have to live in the same file. In version 1, the catalogue was written in `SKILL.md`, and the skill was only good for one brick-breaker. In version 2, the catalogue is built by a script and stored in `references`, and the same procedure can serve other kinds of games.

A task that must not depend on what the agent knows can run in a separate session. The session launched by `catalogue.sh` does not know the symptom, and so it searches for bugs across the whole genre instead of stopping at the reported case.

A procedure must say when the work is done, with a criterion the agent can check on its own. Here, every retained entry has its tests, the existing tests still pass, and every new test fails with an `AssertionError`.

Finally, a skill is tested like code. Run it with several models, read the sessions to see where the agent deviates from what you wrote, fix it and start again. A skill that works with one model can fail with another, and it will have to evolve along with the models.

## Deliverable

This module produces three pieces.

**1. The `playtester` skill**, in `.pi/skills/playtester/` of your NÉON clone, with the brick-breaker catalogue in `SKILL.md`.

**2. The `dynamic-playtester` skill**, in `.pi/skills/dynamic-playtester/`, with the `references/consignes-catalogue.md` instructions, the `scripts/catalogue.sh` script and the `references/bugs-arcade.md` catalogue that it built. Also keep the red tests produced by each version on issue #1: they are what lets you compare the two.

**3. The "skills" row of the decision sheet**:

| lever                                 | measured effect | adopted? | why |
| ------------------------------------- | --------------- | -------- | --- |
| skill chosen by the model             |                 |          |     |
| skill imposed by `/skill:`            |                 |          |     |
| catalogue written by hand             |                 |          |     |
| catalogue built by web search         |                 |          |     |
| script in `scripts/`                  |                 |          |     |
| separate session                      |                 |          |     |

::: tip Success criterion
You can say which problems of issue #1 your tests cover with each version of the skill, which ones are missing, and what you changed in the skill after reading the sessions.
:::

## Going further

- The [Agent Skills specification](https://agentskills.io/specification), which describes the `SKILL.md` format, the optional `scripts`, `references`, and `assets` directories, and the rule that a skill's name is that of its directory.
- The [Pi skills documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md), for where skills live and how Pi loads them.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills), on progressive loading: the description first, then the body, and auxiliary files only when needed.
- Anthropic, [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices), writing advice that overlaps with this module's: get to the point, move detail into reference files, test with each target model.
- The [pi-web-access](https://pi.dev/packages/pi-web-access) page, for configuring search engines other than the default one.
