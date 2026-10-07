# Les hooks ou événements déterministes

::: tip Objectifs de ce module
- Savoir à quels moments de la boucle de l'agent Pi permet d'exécuter du code, et ce que ce code peut y changer
- Écrire une extension qui refuse les commandes shell décrites dans un fichier de règles
- Écrire une extension qui lance les tests quand l'agent s'apprête à rendre la main, et qui lui renvoie les échecs à corriger
- Distinguer une règle qu'un hook peut vérifier d'une règle qui demande le jugement d'un modèle
- Repartir avec deux extensions pour votre projet et la ligne « hooks » de la fiche de décision
:::

Dans les modules précédents, nous avons surtout travaillé sur des fichiers écrits en markdown qui étaient lus (ou pas) par des agents. Dans ces fichiers, nous avons essayé de décrire des cadres de développement pour aider les agents à aller là où nous souhaitions qu'ils aillent. Nous rappelons que le caractère aléatoire des LLM fait qu'il n'est pas sûr à 100% que les directives données dans ces fichiers texte soient réellement effectuées. Elles peuvent se perdre dans le contexte.

Dans ce module, nous allons nous intéresser à rendre déterministe les actions que nous décrivions dans les fichiers markdown. Ces actions peuvent apparaître à différent moment du flux de travail et nous verrons que Pi est capable de vous donner la main à tous les étages du harnais. Cela passe par la construction d'extensions. Vous en avez déjà installé certaines, vous allez maintenant les construire. C'est là que l'on voit toute la puissance et flexibilité de Pi.

Ces événements peuvent avoir le nom de hooks.

## Comprendre

### Pourquoi ajouter des événements déterministes ?

Comme nous l'avons mentionné en introduction, rien n'empêche le LLM de ne pas suivre une directive qui se trouve dans les fichiers agents ou dans les skills. Il y a donc plusieurs intérêts à mettre des événements déterministes. Nous avons pu en voir un au tout début de cette formation lors du module sur le bac à sable. L'utilisation d'une extension peut permettre d'éviter certaines commandes qu'on ne voudrait pas que le LLM lance dans la session: lecture d'un fichier `.env`, `rm -rf` malencontreux... Un autre avantage est de pouvoir guider l'agent selon des règles pré-établies notamment au niveau du linter et au niveau des tests unitaires.

L'agent est obligé de l'exécuter, ce n'est pas du texte. La réponse donnée par cette action déterministe est ensuite injectée dans le contexte et peut aiguiller l'agent à résoudre des problèmes de la bonne manière (ou plutôt à votre manière). Nous voyons bien ici que c'est une nouvelle pièce du puzzle qui permet d'avoir une meilleure confiance et laisser le modèle travailler en toute autonomie. L'idée est d'avoir une phase finale qui correspond à nos attentes et qui est plus facile à relire et à valider.

Nous rappelons que ces événements déterministes sont complémentaires aux événements d'inférence vus dans les précédents modules. L'idée est donc de trouver le bon équilibre entre ces deux façons d'interagir avec l'agent.

### À quel moment cela intervient-il ?

Ces événements peuvent intervenir à n'importe quel moment du processus de développement

- au début de la session pour mettre en place l'environnement de développement : uv, conda, ....
- à la fin du travail de l'agent pour vérifier que le code produit vérifie correctement le cadre de développement du projet : linter, tests.
- au moment de la revue pour vérifier qu'il n'y a pas de code dupliqué, que la qualité du code produit est bonne...

Dans Pi, un hook est une fonction TypeScript enregistrée avec `pi.on("<événement>", handler)` dans une extension. Pi n'a pas de fichier de configuration JSON qui lance des scripts shell avec des codes de sortie, comme `settings.json` dans Claude Code (voir la [documentation des hooks de Claude Code](https://code.claude.com/docs/en/hooks)).

Voici les événements disponibles dans Pi.

#### Au début de la session (mise en place de l'environnement)

- `session_start` : préparer l'environnement (uv, conda) au démarrage d'une session. C'est l'endroit où lancer ce qui doit tourner pendant la session, et `session_shutdown` celui où l'arrêter.
- `before_agent_start` : avant chaque exécution de l'agent. Le handler peut injecter un message ou remplacer le prompt système (`message`, `systemPrompt`).
- `resources_discover` : ajouter des chemins de skills, prompts, etc.
- `project_trust` : décider si on fait confiance au projet. Seules les extensions utilisateur ou passées en ligne de commande y participent.
- `input` : intercepter le prompt de l'utilisateur, avec trois retours possibles : `continue`, `transform` (réécrire le texte) ou `handled` (le prompt ne va pas au modèle).

#### Pendant le travail (les garde-fous)

- `tool_call` : c'est l'équivalent de `PreToolUse` de Claude Code. Retourner `{ block: true, reason }` bloque l'outil, et la raison est renvoyée au modèle. On peut aussi modifier `event.input` en place. C'est le bon endroit pour le `.env` et le `rm -rf`. Si le handler plante, l'outil est bloqué par sécurité.
- `tool_result` : c'est l'équivalent de `PostToolUse` de Claude Code. Le handler peut réécrire `content` ou `isError`, par exemple pour ajouter la sortie du linter après une édition.
- `user_bash` : les commandes `!` tapées par l'utilisateur.
- `context` / `context_with_system` : transformer les messages envoyés au modèle.
- `message_end` : remplacer un message finalisé.
- `session_before_compact`, `session_before_switch`, `session_before_fork`, `session_before_tree` : annuler l'opération (`cancel`) ou la personnaliser.

#### À la fin du travail de l'agent (linter, tests)

- `turn_end` et `agent_before_settle` : ce sont les deux seules frontières où le handler peut agir. Il retourne `{ continue: true, entries }` pour relancer une requête au modèle avec du contexte ajouté. C'est l'équivalent du hook `Stop` : on lance les tests, et s'ils échouent on relance l'agent avec la sortie. La doc avertit qu'une relance sans condition tourne en boucle, donc il faut un point d'arrêt.
- `agent_end` puis `agent_settled` : notification seulement. `agent_settled` garantit que Pi ne repartira pas tout seul.
- `session_shutdown` : nettoyage, ou commit automatique en sortie.

Vous pouvez constater que vous pouvez réellement intervenir à n'importe quel moment et adapter finement votre harnais.

### Une extension Pi

Une extension est un fichier TypeScript. Pi le charge directement, sans étape de compilation. Pour une extension plus grosse, on peut aussi utiliser un dossier qui contient un `index.ts`.

Voici une extension qui empêche l'agent de lire le fichier `.env` :

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event) => {
    if (event.toolName === "read" && event.input.path.endsWith(".env")) {
      return { block: true, reason: "Lecture du fichier .env interdite" };
    }
  });
}
```

À chaque appel d'outil, Pi exécute cette fonction avant l'outil. Si l'agent essaie de lire un `.env`, l'outil n'est pas lancé et l'agent reçoit le message `reason`. Dans tous les autres cas, la fonction ne retourne rien et l'appel se déroule normalement.

Le dossier où l'on dépose le fichier détermine sa portée :

| Emplacement | Portée |
|---|---|
| `~/.pi/agent/extensions/` | toutes vos sessions, quel que soit le projet |
| `.pi/extensions/` | ce projet seulement, une fois le projet approuvé |
| `pi --extension ./bloque-env.ts` | cette session seulement, pratique pour tester |

## Reconstruire

Nous proposons ici de construire deux extensions pour NÉON, chacune branchée sur un moment différent de la boucle de l'agent. La première intervient avant chaque appel d'outil et refuse les commandes shell listées dans un fichier de règles : c'est une version réduite de [`pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system), installée au module sur le bac à sable. La seconde intervient quand l'agent s'apprête à vous rendre la main : elle lance la vérification de syntaxe et les tests, et si quelque chose échoue, elle renvoie la sortie à l'agent pour qu'il corrige.

### Comment refuser une commande exécutée par l'agent ?

Nous voulons ici reproduire des comportements similaires à [`pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system). L'idée est de pouvoir décrire des règles des commandes interdites dans `.pi/forbidden-commands.json`, à la racine de NÉON. Chaque règle associe

- un motif qui est une [expression régulière JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Regular_expressions) cherchée dans la commande
- une raison que l'agent recevra si sa commande correspond au motif

Voici à quoi ressemble le fichier de règles

```json
{
  "forbidden": [
    { "pattern": "rm -rf", "reason": "recursive deletion, ask the user to run it themselves." },
    { "pattern": "git push.*--force", "reason": "rewrites the remote history." },
    { "pattern": "\\.env(\\s|$)", "reason": "the .env file contains secrets." },
    { "pattern": "curl|wget", "reason": "no network requests from the shell." }
  ]
}
```

Le JSON oblige à doubler les barres obliques inverses : le motif `\\.env(\\s|$)` est lu comme l'expression `\.env(\s|$)`, qui reconnaît `cat .env` sans bloquer `cat .env.example`.

L'extension, `.pi/extensions/command-guard.ts`, tient en une vingtaine de lignes :

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RULES_FILE = ".pi/forbidden-commands.json";

interface Rule {
  pattern: string;
  reason: string;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    // Re-read on every call: a new rule applies without restarting Pi.
    const text = readFileSync(join(ctx.cwd, RULES_FILE), "utf8");
    const rules: Rule[] = JSON.parse(text).forbidden;

    for (const rule of rules) {
      if (new RegExp(rule.pattern).test(event.input.command)) {
        return { block: true, reason: `Command refused by ${RULES_FILE}: ${rule.reason}` };
      }
    }
  });
}
```

Le handler reçoit l'événement et un contexte `ctx`, dont on n'utilise ici que `ctx.cwd`, le dossier du projet. `isToolCallEventType("bash", event)` laisse passer tous les autres outils et indique à TypeScript que `event.input.command` existe. Le fichier de règles est relu à chaque appel, ce qui coûte une lecture disque de quelques octets et permet de corriger une règle pendant que la session tourne. Quand un motif correspond, le handler retourne `{ block: true, reason }` : Pi n'exécute pas la commande, et la raison arrive au modèle à la place du résultat de l'outil. Quand rien ne correspond, la fonction ne retourne rien et la commande s'exécute.

Le cas où le fichier manque, ou contient un JSON invalide, n'a pas besoin d'être traité à la main. `readFileSync` ou `JSON.parse` lèvent alors une exception, et Pi bloque l'outil dès qu'un handler de `tool_call` échoue. Toutes les commandes shell sont alors refusées et le modèle reçoit le message d'erreur (`ENOENT: no such file or directory…`), si bien qu'une erreur dans le fichier de règles bloque le shell au lieu de tout laisser passer.

::: warning Une expression régulière ne comprend pas le shell
Ce garde-fou compare du texte. `rm -r -f game`, `find game -delete` ou un script Python qui efface le dossier passent tous à côté du motif `rm -rf`. `pi-permission-system` analyse la commande bash et refuse ce qu'il ne sait pas classer, ce qui le rend plus difficile à contourner, et le bac à sable reste la seule limite qui tient quand l'agent trouve un chemin que les règles n'ont pas prévu. Cette extension sert à comprendre le mécanisme et doit être améliorée pour être robuste.
:::

::: info Exercice (en salle)
Dans votre clone de NÉON, déposez les deux fichiers ci-dessus, puis lancez Pi avec l'extension chargée pour cette session seulement :

```bash
pi -e .pi/extensions/command-guard.ts
```

Demandez-lui d'effacer le dossier `game/`, puis de vous afficher le contenu du `.env` avec `cat`. Les deux commandes sont refusées, et vous lisez la raison dans la réponse de l'agent. Sans quitter la session, ajoutez au fichier une règle qui interdit `npm install`, puis demandez à Pi d'installer un paquet : la règle s'applique tout de suite.

L'outil `read` de Pi lit un fichier sans passer par le shell, donc la règle sur `.env` ne l'arrête pas. Étendez l'extension pour bloquer aussi `read` quand `event.input.path` se termine par `.env`, en vous inspirant de l'exemple du début du module. N'hésitez pas à utiliser Pi pour vous aider à implémenter cette nouvelle fonctionnalité.
:::

### Comment obliger l'agent à passer les tests avant de rendre la main ?

Le `CONTRIBUTING.md` de NÉON interdit de commiter avec des tests rouges : `npm test` doit passer. Dans les modules précédents, vous avez vu qu'une consigne écrite peut être ignorée, et un agent qui s'arrête après une modification sans relancer les tests vous laisse le soin de découvrir la régression. L'extension suivante lance les vérifications elle-même, au moment où l'agent a terminé.

Deux événements de Pi permettent de relancer l'agent avec du contexte ajouté. `turn_end` se déclenche après chaque réponse du modèle, donc après chaque édition, alors que le code est souvent à moitié modifié : les tests échoueraient en plein milieu d'un refactor qui allait les remettre au vert. `agent_before_settle` se déclenche une seule fois, quand l'agent n'a plus rien à faire et s'apprête à vous rendre la main. C'est l'équivalent du hook `Stop` de Claude Code, et c'est celui que nous utilisons.

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const CHECKS = [
  { name: "tests", command: "npm test" },
];
const MAX_RETRIES = 3;
const MAX_OUTPUT = 3000; // output characters sent back to the model

export default function (pi: ExtensionAPI) {
  let codeChanged = false;
  let retries = 0;

  pi.on("tool_result", async (event) => {
    if (event.toolName === "edit" || event.toolName === "write") codeChanged = true;
  });

  pi.on("agent_before_settle", async (event, ctx) => {
    if (!codeChanged || event.outcome !== "completed") return;

    const failures: string[] = [];
    for (const { name, command } of CHECKS) {
      const r = await pi.exec("bash", ["-c", command], { cwd: ctx.cwd, timeout: 120_000 });
      if (r.code !== 0) {
        failures.push(`### ${name} (code ${r.code})\n${(r.stdout + r.stderr).slice(-MAX_OUTPUT)}`);
      }
    }

    if (failures.length === 0) {
      ctx.ui.notify("Checks: OK", "info");
      return;
    }
    if (retries >= MAX_RETRIES) {
      ctx.ui.notify(`Still failing after ${MAX_RETRIES} retries, handing control back to you.`, "warning");
      return;
    }

    retries += 1;
    return {
      continue: true,
      entries: [
        {
          type: "custom_message",
          customType: "checks",
          display: true,
          content: `The checks failed after your changes. Fix the code (not the tests), then finish.\n\n${failures.join("\n\n")}`,
        },
      ],
    };
  });

  pi.on("agent_settled", async () => {
    codeChanged = false;
    retries = 0;
  });
}
```

L'extension enregistre trois handlers qui partagent deux variables, `codeChanged` et `retries`.

Le handler de `tool_result` observe les outils qui viennent de s'exécuter et lève `codeChanged` dès qu'un `edit` ou un `write` a eu lieu. Si vous posez une simple question à l'agent, il ne modifie rien, et les tests ne sont pas lancés. Sans ce drapeau, un test déjà rouge avant la session obligerait l'agent à le réparer à chaque question.

Le handler d'`agent_before_settle` lance les vérifications, à condition que le code ait changé et que le tour se soit terminé normalement (`outcome` vaut `"aborted"` quand vous interrompez l'agent, et nous ne voulons pas le relancer contre votre avis). Il passe chaque commande à `pi.exec`, qui lance un processus sans shell : d'où le `bash -c`, nécessaire pour la boucle `for`. Les sorties des commandes en échec sont réunies et tronquées à leurs 3 000 derniers caractères, parce que tout ce qui est renvoyé entre dans le contexte du modèle et se paie en tokens, et que le résumé des tests en échec se trouve à la fin de la sortie de `node --test`.

Le retour `{ continue: true, entries }` demande à Pi une nouvelle requête au modèle, précédée d'un message `custom_message` qui contient la sortie des vérifications. Le modèle le reçoit comme un message utilisateur et reprend le travail. Avec `display: true`, le message s'affiche aussi dans votre terminal, ce qui vous permet de suivre ce que le harnais a dit à l'agent. Les deux champs sont nécessaires : un `continue: true` sans message à traiter est rejeté par Pi comme une erreur d'extension, puisque le dernier message est celui de l'agent et que le modèle n'aurait rien de nouveau à lire.

Le compteur `retries` existe parce que Pi ne limite pas le nombre de continuations. Claude Code s'arrête après huit relances consécutives d'un hook `Stop`, alors que Pi laisse ce garde-fou à l'extension, et sa documentation prévient qu'une relance sans condition tourne en boucle. Au bout de trois tentatives, l'extension vous rend la main avec un avertissement, ce qui borne la dépense de tokens d'un agent qui n'arrive pas à corriger. Le handler d'`agent_settled` remet enfin les deux variables à zéro : cet événement ne se déclenche qu'une fois l'agent réellement arrêté, après la dernière continuation, et la prochaine demande repart d'un état propre.

::: info Exercice (en salle)
Déposez l'extension dans `.pi/extensions/final-checks.ts` et lancez Pi avec les deux extensions :

```bash
pi -e .pi/extensions/command-guard.ts -e .pi/extensions/final-checks.ts
```

Demandez à Pi de renommer la fonction `collides` en `intersects` dans `game/neon.js`, sans toucher à `game/neon.test.js`. Les tests importent `collides` et échouent donc forcément : vous voyez apparaître le message de l'extension, puis les tentatives de l'agent, jusqu'à l'avertissement des trois relances. La consigne de l'extension (« Fix the code (not the tests) ») contredit la vôtre, et seul le compteur met fin à l'échange. Regardez si l'agent finit par modifier le test malgré tout : un garde-fou en code peut empêcher une commande, mais il ne choisit pas comment le modèle résout un conflit entre deux consignes.

Reposez ensuite une demande qui se termine bien, par exemple l'ajout d'un test pour le score (issue #5), et vérifiez que la notification « Checks: OK » s'affiche à la fin.
:::


## Généraliser

**Un hook se range parmi les guides ou parmi les capteurs.** Birgitta Böckeler, dans [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html), sépare les contrôles qui agissent avant l'agent, "Guides (feedforward controls) - anticipate the agent's behaviour and aim to steer it _before_ it acts.", de ceux qui agissent après, "Sensors (feedback controls) - observe _after_ the agent acts and help it self-correct." Elle distingue aussi les contrôles calculés ou dits déterministes (tests, linters, analyse de structure) des contrôles par inférence (revue par un LLM). Avec ce vocabulaire, `command-guard.ts` est un guide calculé, `final-checks.ts` un capteur calculé, et les `AGENTS.md` et les skills des modules précédents sont des guides par inférence. Quand une règle n'est pas suivie, cette grille aide à repérer la famille de contrôle qui manque.

**Un hook ne traite que les règles vérifiables.** Matthews Wong ([Deterministic Hooks vs Agent Judgement in Claude Code](https://www.matthewswong.com/en/blog/deterministic-hooks-vs-agent-judgement/)) réserve au hook les décisions qui peuvent se prendre à partir d'un chemin de fichier, d'un diff, d'une commande ou d'un code de retour ("Anything decidable from a path, a diff, a command string or an exit code"). En contrepartie, le hook n'accorde jamais d'exception ("It cannot be told that this edit is the exception, so it has no way to grant one"). Une règle qui demande un jugement, comme « ne refactore pas au-delà du ticket », reste donc dans `AGENTS.md`. Mitchell Hashimoto ([My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey)) applique ce tri : à chaque erreur de l'agent, il ajoute soit une consigne dans `AGENTS.md`, soit un outil programmé.

**Le retour d'un capteur s'écrit pour le modèle.** Addy Osmani ([Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/)) résume la règle par "success is silent, failures are verbose". C'est le choix de `final-checks.ts`, qui n'envoie rien au modèle quand tout passe et, en cas d'échec, lui envoie la sortie tronquée accompagnée d'une consigne de correction. Böckeler y voit "a positive kind of prompt injection" : le message d'erreur est la seule partie du contrôle que le modèle lit, et il permet à l'agent de s'améliorer grâce à un retour pertinent.

**Un garde-fou qui vérifie le texte d'une commande se contourne.** Tim Hopper ([How to stop AI agents from bypassing pre-commit hooks](https://pydevtools.com/handbook/how-to/how-to-stop-ai-agents-from-bypassing-pre-commit-hooks/)) part d'un cas réel, l'[issue #40117](https://github.com/anthropics/claude-code/issues/40117) de Claude Code, où l'agent contourne les hooks pre-commit avec `--no-verify`, `git stash` et des options silencieuses. Il montre qu'une règle de refus écrite comme un motif laisse passer `git commit -m "wip" --no-verify`, parce que l'option n'est pas à l'endroit attendu, ce qui est exactement la faiblesse de notre expression régulière. Il propose cinq protections successives, de la consigne jusqu'à la CI, chacune rattrapant ce que la précédente laisse passer. Un hook ne protège que l'outil qui l'exécute ("A PreToolUse hook only catches Claude Code.") et la CI reste le dernier filet ("The agent cannot pass --no-verify to CI."). Pour NÉON, on retrouve la même succession : consigne, `command-guard.ts`, bac à sable, puis les tests en CI.

**Une boucle de retour a besoin d'un arrêt et d'une surveillance.** Pi relance l'agent autant de fois que l'extension le demande, d'où le compteur `retries`. La relance pousse aussi l'agent à faire passer les tests par tous les moyens. Kent Beck ([Augmented Coding: Beyond the Vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes)) cite parmi ses signaux d'alerte "Any indication that the genie was cheating, for example by disabling or deleting tests.", et [ImpossibleBench](https://arxiv.org/abs/2510.20270) le mesure sur des tâches impossibles à résoudre honnêtement : autoriser jusqu'à dix soumissions avec le retour des tests en échec fait passer le taux de triche moyen de 33 % à 38 %. L'exercice sur `collides` reproduit cette situation à petite échelle.

**L'écart entre hook et consigne reste une hypothèse.** Nous n'avons trouvé aucune étude qui compare, à harnais constant, un hook à la même règle écrite en consigne. La mesure la plus proche est [ContextCov](https://arxiv.org/abs/2603.00822), qui ajoute à un agent des vérifications exécutables, dont des interceptions de commandes interdites, et rapporte 88,3 % de conformité contre 67,0 % avec le seul `AGENTS.md`. L'exercice du module sur le bac à sable, qui compte les refus obtenus par une consigne et par un garde-fou en code, vous donne votre propre chiffre sur NÉON.

## Livrable

Ce module produit trois pièces.

**1. Le garde-fou sur les commandes** : `.pi/forbidden-commands.json` et `.pi/extensions/command-guard.ts`, étendue à l'outil `read` pour le `.env`, avec au moins une règle ajoutée par vous après une commande que vous avez vu l'agent lancer.

**2. La vérification de fin de travail** : `.pi/extensions/final-checks.ts`, dont le tableau `CHECKS` contient les commandes de votre projet, et non celles de NÉON si vous l'appliquez ailleurs.

**3. La ligne « hooks » de la fiche de décision** :

| levier                                      | effet observé | adopté ? | pourquoi |
| ------------------------------------------- | ------------- | -------- | -------- |
| garde-fou sur les commandes (`tool_call`)   |               |          |          |
| même règle écrite dans `AGENTS.md`          |               |          |          |
| vérification de fin (`agent_before_settle`) |               |          |          |
| plafond de relances                         |               |          |          |
| protection des tests pendant une relance    |               |          |          |

::: tip Critère de réussite
Face à une règle que votre harnais ne fait pas respecter, vous savez dire comment la vérifier. Si une commande, un chemin, un diff ou un code de sortie suffit, c'est le travail d'un hook. S'il faut un modèle qui juge, la vérification passe par l'inférence et donc par `AGENTS.md` ou un skill.
:::

## Pour aller plus loin

- Birgitta Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) (2026), le cadre guides et capteurs, calculés ou par inférence, utilisé dans ce module. Son billet de suite, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html), rapporte une expérience sur les capteurs de maintenabilité et discute du choix des hooks qui les déclenchent.
- Addy Osmani, [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/) (2026), sur la place des hooks dans un harnais et la forme de leur retour.
- Mitchell Hashimoto, [My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey) (2026), section « Step 5: Engineer the Harness », d'où vient l'expression.
- Kent Beck, [Augmented Coding: Beyond the Vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes) (2025), sur les signaux qui montrent qu'un agent dérive, dont la suppression de tests.
- Tim Hopper, [How to stop AI agents from bypassing pre-commit hooks](https://pydevtools.com/handbook/how-to/how-to-stop-ai-agents-from-bypassing-pre-commit-hooks/) (2026), le meilleur exemple avant/après : une règle contournée, puis cinq couches qui la rattrapent.
- Zarar Siddiqi, [Don't rely on instructions, use Agent Hooks to enforce guardrails](https://zarar.dev/agent-hooks-deterministic-guardrails-for-ai-generated-code/) (2026), deux hooks testés sur un design system, dont un hook `Stop` qui exige les tests.
- Matthews Wong, [Deterministic Hooks vs Agent Judgement in Claude Code](https://www.matthewswong.com/en/blog/deterministic-hooks-vs-agent-judgement/) (2026), sur le partage entre ce qu'un hook décide et ce qui reste au jugement de l'agent.
- Paddo, [Claude Code Hooks: Guardrails That Actually Work](https://paddo.dev/blog/claude-code-hooks-guardrails/) (2026), qui présente les hooks comme une couche d'une défense en profondeur. Les incidents qu'il cite viennent d'autres sources, à vérifier avant de les reprendre.
