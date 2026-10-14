# Débuter avec la formation

::: tip Objectifs de cette page
- Savoir ce qu'il faut connaître et installer avant de commencer
- Corriger un premier ticket avec un agent et relire son travail
- Choisir, dans chaque module, ce qu'il faut faire en premier et ce qui peut attendre
:::

Cette formation va loin : elle reconstruit un harnais pièce par pièce et mesure l'effet de chaque pièce. Si vous n'avez encore jamais utilisé un agent de code, tout faire d'un coup demande beaucoup d'outils et de temps. Cette page vous propose un chemin plus court. Vous gardez l'essentiel de chaque module, et vous reviendrez au reste plus tard.

## Que faut-il savoir avant de commencer ?

Vous n'avez pas besoin de connaître l'IA. En revanche, vous devez être à l'aise avec trois choses.

- **Le terminal.** Tous les exercices se font en ligne de commande : se déplacer dans un dossier, lancer une commande, lire sa sortie.
- **git.** Vous allez cloner des dépôts, regarder ce qui a changé avec `git status` et `git diff`, annuler une modification avec `git restore`, et créer une branche. Ce sont ces commandes qui vous permettront de vérifier ce que l'agent a fait.
- **Lire du JavaScript.** Le dépôt d'exercice, [NÉON](./fil-rouge), est un petit jeu écrit en JavaScript. Vous n'aurez pas à l'écrire vous-même, mais vous devrez comprendre les modifications de l'agent.

Le module sur les hooks demande d'écrire un peu de TypeScript. Si vous ne le connaissez pas, Pi peut vous aider à écrire ces quelques lignes.

## Que faut-il installer ?

- **git**, pour cloner NÉON et suivre les modifications.
- **[Node.js](https://nodejs.org/) 22 ou plus récent.** NÉON n'a aucune dépendance, et ses tests se lancent avec `npm test`, qui utilise le lanceur de tests intégré à Node. Nous avons vérifié les exercices avec Node 22.
- **[Pi](https://pi.dev)**, l'agent de code de la formation. Le module [Le harnais de départ : Pi](./act1-pi) explique comment l'installer et déclarer vos modèles.
- **Un accès à un modèle.** En salle, une clé d'API [ILaaS](https://www.ilaas.fr/) vous est fournie. Seul, vous pouvez utiliser n'importe quel fournisseur que Pi sait appeler.

D'autres outils ne servent que dans certaines parties : [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) pour la seconde moitié du bac à sable, [uv](https://docs.astral.sh/uv/) pour l'acte 3, [herdr](https://herdr.dev) pour regarder les sous-agents travailler. Vous pouvez les laisser de côté pour commencer.

Vérifiez votre installation avec ces commandes :

```bash
git --version
node --version   # v22 ou plus
pi --version
```

## Quel chemin suivre dans les modules ?

Suivez les modules dans l'ordre du sommaire, mais en ne gardant d'abord que la colonne « à faire ». La colonne « peut attendre » contient ce qui demande plus d'outils ou plus de temps.

| module                                         | à faire                                                                     | peut attendre                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| [Les LLM en 2026](./act1-llm)                  | tout                                                                        | les lectures de « Références »                   |
| [Pourquoi un harnais](./act1-harness)          | tout, en lisant vite « Les sept briques »                                   |                                                  |
| [Pi](./act1-pi)                                | l'installation, les premières commandes, l'installation de combo            |                                                  |
| [2.0 Le bac à sable](./act2-sandbox)           | « Comprendre » et l'exercice avec `pi-permission-system`                    | Docker Sandboxes (`sbx`)                         |
| Premier ticket                                 | l'exercice ci-dessous                                                       |                                                  |
| [2.1 Le contexte](./act2-contexte)             | « Comprendre », le choix du modèle, l'effort de raisonnement et `AGENTS.md` | le prompt système, la fenêtre bridée, `codemode` |
| [2.2 Les skills](./act2-skill)                 | « Comprendre » et la version 1 de `playtester`                              | la version 2 (`dynamic-playtester`)              |
| [2.3 La délégation](./act2-delegation)         | « Comprendre » et l'exercice sur les outils de chaque agent                 | le tour de boucle complet                        |
| [2.4 Les workflows](./act2-workflows)          | « Comprendre »                                                              | le flow du ticket #2 et son adaptation           |
| [2.5 Les hooks](./act2-hooks)                  | les deux extensions                                                         |                                                  |
| [3.0 Mesurer un agent](./act3-trysquare)       | l'introduction et « Comment lire un écart ? »                               | l'installation de trysquare                      |
| [3.1 Les leviers du contexte](./act3-contexte) | « Les résultats » et « Généraliser »                                        | l'exercice qui relance la matrice                |

Le [glossaire](./annexes#glossaire) explique les termes de la formation.

## Comment corriger un premier ticket avec un agent ?

Avant d'entrer dans l'acte 2, faites travailler Pi sur un ticket simple, puis vérifiez vous-même ce qu'il a fait. Nous prenons l'issue #5 de NÉON : les fonctions `comboMultiplier` et `scoreForBrick` n'ont pas de tests, et le multiplicateur de combo n'a pas de plafond.

::: info Exercice (en salle)
1. Clonez NÉON, créez une branche et lancez les tests. Les six tests doivent passer.

   ```bash
   git clone https://github.com/AI-for-dev/neon neon-debut
   cd neon-debut
   git switch -c issue-5
   npm test
   ```

2. Lancez `pi` et posez d'abord une question qui ne demande aucune modification :

   ```
   Explique-moi en trois phrases ce que font comboMultiplier et scoreForBrick dans game/neon.js.
   ```

   Regardez les lignes d'outils qui s'affichent : l'agent a lu le fichier avant de répondre.

3. Demandez-lui ensuite de traiter le ticket :

   ```
   Traite l'issue #5 d'ISSUES.md.
   ```

4. Quittez Pi et relisez son travail vous-même.
   - `git status` et `git diff` : quels fichiers a-t-il modifiés, et chaque ligne changée a-t-elle une raison ?
   - Le ticket ne donne pas de valeur pour le plafond. Laquelle l'agent a-t-il choisie ? Vous convient-elle ?
   - `npm test` : les tests passent-ils chez vous, et pas seulement d'après le résumé de l'agent ?

5. Si le travail vous convient, commitez-le sur la branche :

   ```bash
   git add game/ && git commit -m "Test and clamp the combo multiplier (#5)"
   ```

   Sinon, jetez-le avec `git restore .` et reprenez à l'étape 3 avec une demande plus précise.

6. Vérifiez que les nouveaux tests vérifient vraiment quelque chose. Retirez le plafond à la main dans `comboMultiplier` et relancez `npm test` : au moins un test doit échouer. Si tout reste vert, les tests ne protègent pas le comportement attendu. Revenez ensuite à la version commitée avec `git restore game/neon.js`.
:::

Sur notre essai avec `gemma-4-31b`, Pi a ajouté deux tests, plafonné le multiplicateur à 10 et annoncé une suite verte, le tout en moins d'une minute. Il a aussi rattaché à l'issue #5 un commentaire `TODO` qui ne la concernait pas. C'est le genre de détail que seule la relecture du diff fait voir. Votre exécution sera différente : le modèle ne fait pas deux fois la même chose, et le [module 3.0](./act3-trysquare) montre comment mesurer cette variation.

## Quels réflexes garder ?

Ces réflexes reviennent dans tous les modules. Prenez-les dès maintenant.

- **Relisez le diff.** Le résumé de l'agent dit ce qu'il pense avoir fait. Le diff dit ce qu'il a fait.
- **Lancez les tests vous-même.** Une suite verte indiquée par l'agent n'est pas une suite verte.
- **Vérifiez que les tests ajoutés.** L'agent peut ajouter des tests triviaux et passer à coté de l'essentiel.
- **Travaillez sur une branche, dans un clone ou un worktree.** Vous devez pouvoir tout annuler à tout moment.
- **Ne commitez pas ce que vous ne comprenez pas.** Si une modification vous échappe, demandez à l'agent de l'expliquer, ou jetez-la.

::: tip Ce que vous avez appris
Vous savez ce qu'il faut installer pour suivre la formation et par où passer dans les modules. Vous avez fait corriger un ticket par un agent, et vous savez vérifier son travail : relire le diff, lancer les tests vous-même et vous assurer qu'un test écrit à du sens.
:::
