# Les workflows : la boucle écrite dans un fichier

::: tip Objectifs de ce module
- Reconnaître dans la boucle du module précédent les motifs d'un flux de travail
- Écrire cette boucle dans un fichier que Pi déroule seul
- Faire des tests le juge final, et choisir où l'humain garde la main
- Adapter ce fichier à ses propres besoins en quelques lignes
:::

Dans le module précédent, vous étiez l'orchestrateur. Vous lanciez chaque agent avec `/step`, vous relisiez la note, vous lanciez `npm test` dans un second terminal et vous décidiez, après chaque verdict, qui reprenait la main. C'est instructif une fois. Refaire ces gestes vingt fois l'est beaucoup moins, et c'est précisément le genre de tâche répétitive qu'il faut automatiser.

Ce module écrit ces gestes dans un fichier. combo appelle ce fichier un **flow** : un graphe de tâches décrit en YAML et en markdown, posé à côté de vos agents, et déroulé par le code plutôt que par un modèle. Nous allons voir qu'il n'y a pas de langage à apprendre et que votre harnais se modifie comme n'importe quel fichier de configuration.

Nous vous rappelons que l'outil combo a été écrit spécifiquement pour cette formation et qu'il n'est peut-être pas souhaitable de l'utiliser en production aujourd'hui. Ce ne sera peut-être plus le cas à terme. L'idée est toujours de vous permettre d'expérimenter rapidement et facilement.

## Comprendre

### Qu'est-ce qu'un flux de travail ?

Si nous prenons un peu de recul sur le module précédent, les étapes que nous avons enchaînées forment un graphe. Les rectangles sont les sous-agents lancés par `/step` et les formes arrondies les gestes que vous faisiez vous-même :

```mermaid
flowchart TD
    T([ticket #2]) --> E[explorer]
    E -- note d'impact --> L([vous relisez la note])
    L --> P[planner]
    P -- plan en pas --> C[coder]
    C -- rapport et diff --> N([vous lancez npm test])
    N -- sortie des tests --> R[reviewer]
    R --> V{verdict}
    V -- "APPROVED, pas suivant" --> C
    V -- "refus, le code est en cause" --> C
    V -- "refus, le pas est en cause" --> P
    V -- "APPROVED, dernier pas" --> F([ticket livré])
```

Ce graphe se décompose en quelques motifs que l'on retrouve dans la plupart des systèmes multi-agents. Chaque figure indique en haut à droite comment le motif s'écrit dans un flow. Deux motifs ont leur propre nœud, le fan-out et la boucle. Les trois autres sont simplement des nœuds mis bout à bout.

- **chain** : le planner reçoit la note de l'explorer, le coder reçoit le plan.

  ![chain](/figures/workflows/chain-light.svg){.only-light}
  ![chain](/figures/workflows/chain-dark.svg){.only-dark}

- **fan-out** : l'explorer et le tester lisent le ticket en même temps, puisque ni l'un ni l'autre n'écrit.

  ![fan-out](/figures/workflows/fan-out-light.svg){.only-light}
  ![fan-out](/figures/workflows/fan-out-dark.svg){.only-dark}

- **orchestrate** : le planner décide combien de pas il faut, puis chaque pas part au coder.

  ![orchestrate](/figures/workflows/orchestrate-light.svg){.only-light}
  ![orchestrate](/figures/workflows/orchestrate-dark.svg){.only-dark}

- **loop** : le coder et le reviewer recommencent tant que le pas n'est pas validé.

  ![loop](/figures/workflows/loop-light.svg){.only-light}
  ![loop](/figures/workflows/loop-dark.svg){.only-dark}

- **reduce** : un agent relit le résultat de plusieurs branches et en tire une seule réponse. Dans notre boucle, c'est le rôle de l'auditeur.

  ![reduce](/figures/workflows/reduce-light.svg){.only-light}
  ![reduce](/figures/workflows/reduce-dark.svg){.only-dark}

### Un flow : votre boucle dans un fichier

Regardons plutôt ce que cela donne avec combo sur un exemple concret, la chaîne explorer puis planner :

```md
---
name: impact-plan
description: La note d'impact, puis le plan
input: string
nodes:
  - id: note
    agent: explorer
    reads: [input]
  - id: plan
    agent: planner
    reads: [input, note]
---

## note
Rends la note d'impact du ticket désigné sous `input`.

## plan
Découpe le ticket désigné sous `input` en petits pas, avec la note sous `note` comme carte.
```

L'en-tête décrit la structure : les nœuds, dans l'ordre, et ce que chacun lit. Le corps donne à chaque agent sa consigne, une section `## <id>` par nœud. Chaque agent reçoit sa section et les éléments listés dans `reads:`, rien d'autre. C'est exactement ce que vous faisiez en collant à la main le ticket, le pas et le diff dans le message du reviewer.

Le fichier est vérifié en entier avant que le moindre modèle ne tourne.

::: info Exercice (en salle)
Si ce n'est déjà fait, installez l'extension combo

```bash
cd /chemin/vers/neon
pi install -l npm:@ai-for-dev/combo
pi
```

Ajoutez ce fichier dans `.pi/flows/impact-plan.md` et testez-le sur l'issue #2. Vous pouvez regarder les agents évoluer dans herdr.

```
/herdr on
/run impact-plan traite le ticket #2 d'ISSUES.md
```
:::

### Automatisation de l'orchestrateur

Au module précédent, vous avez mené l'orchestration des différentes étapes constituant la résolution d'un bug. Nous allons ici automatiser ce processus de la façon suivante :

| au module précédent                          | dans le flow                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `/step explorer`, et le tester à côté        | un `parallel` de deux agents                                                    |
| le planner rend un plan en pas               | un `agent` dont la sortie est une liste de pas                                  |
| vous donnez un pas au coder, puis le suivant | un `map` sur cette liste, un pas après l'autre                                  |
| vous lancez `npm test`                       | un `check` qui lance `.pi/checks/test.sh`                                       |
| le verdict, et le retour au coder            | une `loop` jusqu'à ce que les tests passent et que le reviewer approuve         |
| le retour au planner                         | un second tour : l'auditeur relit le tout et le planner replanifie ce qui reste |
| `/chain` et votre journal                    | le répertoire `runs/<horodatage>/`, avec la trace de chaque agent               |

Nous avons vu dans les modules précédents qu'il était important de faire chaque étape d'un plan de manière séparée. Il est possible de demander à combo de formater la sortie. C'est ce que nous ferons ici en demandant de faire une liste d'étapes.

### Les tests ont le dernier mot

Nous avons besoin d'une étape fiable pour savoir si les changements opérés répondent clairement à nos besoins. Nous pourrions le demander dans le prompt, mais vous avez vu qu'une consigne écrite n'est pas toujours suivie. Nous préférons donc définir un script bash qui représente les actions à faire après chaque changement. Dans un flow, le nœud `check` permet justement de faire cela en lançant un script de votre projet. Son résultat est une valeur que la boucle lit : avec `loop: tests.output.passed && review.output.approved`, le coder sait ce qu'il doit faire si le code qu'il a généré est faux ou s'il ne suit pas exactement le cadre de développement (linter par exemple).

![gate](/figures/workflows/gate-light.svg){.only-light}
![gate](/figures/workflows/gate-dark.svg){.only-dark}

## Reconstruire

### Le flow du ticket #2

Voici la boucle du module précédent écrite en entier, versionnée dans `scripts/flows/issue2.md`. Elle utilise sans les modifier les quatre agents du module précédent, ainsi que `tester` et `auditor`, copiés en même temps qu'eux.

<<<@/../scripts/flows/issue2.md{md}

Quelques remarques sur ce flow

- Les pas se suivent dans le même arbre, comme vos `/step`.
- Trois essais par pas et deux tours au plus. Un plafond est obligatoire sur chaque boucle : sans lui, un modèle qui ne converge jamais tournerait jusqu'à épuisement du budget. Si votre flow échoue en atteignant cette limite, combo vous le dira.
- Le contrat du ticket est écrit dans la section du planner pour s'assurer que les demandes de l'utilisateur y figurent bien. La phase d'exploration peut les occulter.
- `retry: 1` sur chaque agent. Au premier run réel de ce flow, le planner a écrit un très bon plan, mais en texte libre, sans utiliser l'outil prévu, et le run s'est arrêté. Un second essai, avec l'erreur nommée, a suffi. Le second essai ne suffit pas toujours : sur un run d'octobre 2026, le reviewer du premier pas a rendu deux fois un refus justifié en prose sans appeler `verdict`, et le pas a échoué sans que le coder ait eu de second essai. `on-fail: continue` a laissé passer aux pas suivants, qui ont repris ce travail, et l'audit a approuvé l'ensemble, ce que seule la trace permettait de comprendre.
- Chaque pas finit sur une suite verte. Un autre run a planifié un pas « écrire les tests rouges » seul, sans le code. La boucle exige une suite verte, ce pas ne pouvait donc pas aboutir et il a brûlé ses trois essais. Quand une boucle ne converge pas, regardez d'abord si sa condition était atteignable.

Deux rôles sont ajoutés ici. Le testeur (`scripts/agents/tester.md`) permet de vérifier si les tests existent et s'il faut en ajouter. L'auditeur (`scripts/agents/auditor.md`) s'assure que le travail est réalisé dans sa globalité et que rien n'a été oublié alors que le reviewer ne voit qu'un pas. Ce qu'il soulève reste ouvert tant que personne ne l'a traité, et le flow repart pour un second tour.

::: warning  Un point sur ces choix
Nous vous rappelons que l'objectif de cette formation est de vous donner tous les éléments pour construire votre harnais. Les choix faits ici sont donc contestables et peut-être pas optimaux pour avoir les meilleurs résultats. Mais vous avez toute la compréhension requise pour retirer des nœuds, en ajouter ou les modifier.
:::

::: info Exercice (en salle)
Déposez les agents, le flow et le script de tests dans votre clone de NÉON :

```bash
cd /chemin/vers/neon
mkdir -p .pi/agents .pi/flows .pi/checks
cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
cp /chemin/vers/hands-on-harness/scripts/flows/issue2.md .pi/flows/
printf '#!/usr/bin/env bash\nnpm test\n' > .pi/checks/test.sh

printf '.pi/\nruns/\n' >> .gitignore
git add .gitignore && git commit -m "ignorer .pi et runs"

pi install -l npm:@ai-for-dev/combo
pi
```

Les deux lignes ajoutées au `.gitignore` sont nécessaires, parce que le `diff` que lisent le reviewer et l'auditeur compte aussi les fichiers que git ne suit pas : sans elles, les agents, les paquets installés sous `.pi/` et les traces de `runs/` y entreraient.

Au premier lancement, Pi vous demande si vous faites confiance au dossier du projet : sans cela, il ne charge ni `.pi/` ni combo. Choisissez « Trust ».

Vérifiez ce que Pi a chargé avant de lancer quoi que ce soit :

```prompt
/flows
/flows issue2
```

La première commande liste les flows trouvés, la seconde affiche le plan de `issue2` nœud par nœud. Cassez ensuite le fichier exprès en remplaçant `agent: coder` par `agent: codeur`, relancez `/flows` et lisez le refus : il nomme le nœud et propose le bon nom. Remettez `coder`, puis lancez la boucle :

```prompt
/run issue2 traite le ticket #2 d'ISSUES.md
```

Pi dessine le flow au-dessus de l'invite pendant qu'il avance, et tout ce que vous faisiez à la main s'enchaîne sans vous. Comptez une vingtaine de minutes sur ILaaS avec gemma-4-31b : notre run d'octobre 2026 a duré 20 min 27 s.

À la fin, faites vos propres vérifications, celles du module précédent : `npm test`, la liste des exports, `git diff` et la trace dans `runs/<horodatage>/`. Ne vous contentez pas du verdict du flow.
:::

Un run interrompu reprend avec `/run resume`, là où il s'était arrêté.

### Adapter le harnais à vos besoins

Ce flow est un point de départ. Chaque modification qui suit tient en quelques lignes, et `/flows issue2` vous dit avant tout lancement si elle est valide.

Le flow s'arrête à l'audit et c'est vous qui commitez. Pour qu'il vous propose le commit, ajoutez à la fin une question, un branchement et le commit :

![arrêt humain](/figures/workflows/human-stop-light.svg){.only-light}
![arrêt humain](/figures/workflows/human-stop-dark.svg){.only-dark}

```yaml
  - id: go
    ask: "Commiter ce changement ?"
    confirm: true
    default: false
    reads: [diff]

  - id: ship
    choice:
      - when: go.output.yes
        do:
          - id: message
            agent: committer
            reads: [input, diff]
          - id: commit
            commit: message
    default: []
```

Ajoutez une section `## message` qui dit au committer ce qu'il doit écrire. Le `committer` est livré avec combo, le commit part sur une branche propre au run et rien n'est poussé. Avec `default: false`, un run sans personne devant l'écran ne commite pas.

Un flow qui marche devient aussi une brique. Un nœud `flow` appelle un autre flow en entier : votre `issue2` peut servir dans un flow plus large sans être recopié.

![composition](/figures/workflows/composition-light.svg){.only-light}
![composition](/figures/workflows/composition-dark.svg){.only-dark}

```md
---
name: ticket
description: Le flow issue2 comme une brique, puis le commit
input: string
nodes:
  - id: work
    flow: issue2
    input: input

  - id: message
    agent: committer
    retry: 1
    reads: [input, diff]

  - id: commit
    commit: message
---

## message
Écris le message de commit du changement sous `diff`, fait pour la demande sous `input`.
```

Le reste suit la même logique. Un modèle plus gros pour le planner et l'auditeur se règle dans leurs fichiers d'agents. Un audit qui n'apporte rien sur un petit ticket se retire en supprimant son nœud et en simplifiant la condition du tour. Des pas indépendants peuvent tourner en parallèle, chacun dans sa copie du dépôt (`concurrency: 2` et `copies: true` sur le `map`).

::: info Exercice (en autonomie)
Ajoutez l'arrêt avant le commit et rejouez le ticket. Essayez ensuite une modification qui vous est propre : un autre découpage des rôles, un modèle plus gros là où l'on juge, un flow pour un autre type de ticket. La question à vous poser est toujours la même : quel geste répétiez-vous à la main, et quelle ligne l'écrirait ?
:::

## Généraliser

Automatiser une boucle demande de l'avoir tenue à la main ou d'analyser finement les traces. Le flow de ce module est votre journal du module précédent réécrit : chaque ligne répond à une décision que vous avez prise vous-même, et c'est pour cela que vous savez où la placer.

Le harnais se construit par corrections successives. Chaque échec lu dans la trace devient une modification du flux.

Les tests ont le dernier mot mais ne vérifient que ce qu'ils contraignent. Une suite verte ne prouve pas que le ticket est fait.

Une décision mérite son propre canal. Tant qu'un verdict se lit dans de la prose, il dépend de la façon dont le modèle écrit un mot comme `APPROVED`. Quand c'est possible, donnez-lui un outil pour répondre. Au moment d'écrire cette formation, de nouveaux modèles voient le jour. Ce sont des modèles dits « de classification ». Ils utilisent très peu de tokens et peuvent répondre assez bien à des questions à choix multiples à partir du prompt que vous leur donnez. Le plus en vue en ce moment est [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), mais vous pouvez être sûr que d'autres modèles de classification vont voir le jour dans les mois à venir.

Les arrêts humains sont des choix de conception. Placez-les là où une erreur coûte plus cher à défaire qu'à prévenir, et pas ailleurs. Dans notre cas, une discussion questions-réponses sur le ticket pour enrichir le plan pourrait être une bonne chose.

::: tip Ce que vous avez appris
Vous savez dire, trace en main, pourquoi un run a abouti ou non : quel pas n'a pas convergé, si la suite était rouge, ce que l'auditeur a laissé ouvert. Vous savez faire évoluer votre flux de travail pour qu'il suive votre façon de travailler, et vérifier vous-même le résultat au lieu de vous fier au verdict du flow.
:::

## Pour aller plus loin

- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la distinction workflows / agents et les motifs de ce module dans leur forme générale.
- [La documentation de combo](https://github.com/AI-for-dev/combo/tree/main/docs), en particulier la page sur les flows et les flows `build` et `build-attended` livrés avec combo, qui font en plus générique ce que ce module fait sur un ticket.
- [herdr](https://herdr.dev), pour regarder un flow travailler, un volet par agent.
