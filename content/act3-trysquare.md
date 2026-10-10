# Mesurer un agent : trysquare

::: tip Objectifs de ce module
- Comprendre pourquoi une exécution unique ne dit rien d'une configuration
- Distinguer un test, qui répond par oui ou par non, d'une évaluation, qui compare des comportements bruités
- Lire un scénario trysquare et savoir ce que chacune de ses sections décide
- Lire une matrice : taux de réussite, écart en points, intervalle, marque `*` ou `o`
- Installer l'outil et vérifier un plan d'expérience sans dépenser un token
:::

Dans l'acte 2, vous avez reconstruit chaque brique et l'avez essayée à la main : vous lanciez l'agent une ou deux fois, vous lisiez la session et le diff, et vous en tiriez une impression. Cette manière de faire suffit pour voir ce qu'une brique change dans le déroulé d'une session, mais elle ne permet pas de dire si une configuration fait mieux qu'une autre, parce que deux exécutions strictement identiques ne rendent pas le même résultat.

Voici six exécutions de la même configuration sur l'issue #1 de NÉON, celle que le [module 2.1](./act2-contexte) appelle la demande négligée : même modèle, même effort de raisonnement, même prompt, même dépôt au même commit.

| exécution       | 1      | 2      | 3      | 4       | 5      | 6       |
| --------------- | ------ | ------ | ------ | ------- | ------ | ------- |
| tokens d'entrée | 13 126 | 16 035 | 13 060 | 13 144  | 14 771 | 13 188  |
| tours           | 4      | 5      | 4      | 4       | 5      | 4       |
| durée           | 16 s   | 38 s   | 50 s   | 31 s    | 20 s   | 9 s     |
| critère atteint | oui    | oui    | oui    | **non** | oui    | **non** |

Le coût varie de moins d'un quart, le nombre de tours prend deux valeurs, et la réponse change une fois sur trois. Une exécution unique de cette configuration vous aurait donné, selon le tirage, « la base corrige le bug » ou « la base ne le corrige pas ». La dispersion peut aussi porter sur le coût plutôt que sur la réponse : la configuration la mieux outillée du [module 3.1](./act3-contexte) consomme entre 42 731 et 2 420 677 tokens d'entrée selon l'exécution, soit une étendue de **×57**.

Les modules de cet acte mesurent donc les leviers de l'acte 2 avec un outil qui répète chaque configuration et tient compte de cette dispersion.

## Définition de l'outil

### Un test ou une évaluation ?

Un test répond par oui ou par non à une question fermée : `npm test` passe, ou il ne passe pas. Le test est reproductible. Une évaluation compare des comportements sur une même tâche, en répétant chaque configuration et en sachant que la mesure est bruitée. Les deux se combinent, puisqu'une évaluation s'appuie le plus souvent sur des tests pour noter chaque exécution, mais elles ne répondent pas à la même question : le test dit si ce diff-là corrige le bug, l'évaluation dit si cette configuration de harnais fait corriger le bug plus souvent qu'une autre.

### Qu'est-ce que trysquare ?

[trysquare](https://github.com/AI-for-dev/trysquare) est un outil écrit en Python et conçu pour cette formation. Il lance les configurations d'un scénario, note chaque exécution, agrège les notes et produit une synthèse des résultats. Il ne sait rien de NÉON, rien de l'issue #1, rien de cette formation : tout ce qui est propre à une expérience est décrit dans un fichier de scénario et un ensemble de validations qu'il appelle. Son nom anglais désigne l'équerre du menuisier, qui sert à vérifier qu'un assemblage est droit, et l'outil sert de la même façon à vérifier qu'un écart mesuré tient au rééchantillonnage.

::: info Pourquoi trysquare plutôt qu'Inspect ou Harbor ?
Des outils d'évaluation plus mûrs savent déjà répéter une exécution, et certains en tirent une incertitude. [Inspect](https://inspect.aisi.org.uk/), le framework de l'AI Security Institute britannique, rejoue chaque échantillon avec `--epochs`, agrège les répétitions (`mean`, `pass_at_k`, `at_least_k`) et publie une erreur standard, et son paquet [Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/) y fait tourner Claude Code, Codex CLI, Gemini CLI ou OpenCode dans un bac à sable. [Harbor](https://github.com/harbor-framework/harbor), écrit par l'équipe de Terminal-Bench, lance des agents sur des tâches en conteneurs avec `--n-attempts`, résume les essais par une moyenne, sans intervalle, et répartit la charge chez des fournisseurs de bacs à sable distants comme Daytona ou Modal.

trysquare ne pilote aujourd'hui que Pi et s'installe avec [uv](https://docs.astral.sh/uv/). Chaque exécution part d'un clone jetable du dépôt à un tag figé, et l'agent tourne au choix directement sur la machine, ce qui tient sur un portable en salle, dans un bac à sable [bubblewrap](https://github.com/containers/bubblewrap) sous Linux, ou dans un conteneur Docker construit à partir de l'image que déclare le scénario. Dans ces deux derniers cas, la clé du fournisseur n'entre jamais dans le bac à sable : un relais lancé sur la machine la substitue à chaque requête. trysquare se concentre surtout sur la question que ces outils laissent ouverte : l'écart mesuré entre deux configurations est-il réel ? Il garde la tâche fixe et fait varier le harnais (prompt, `AGENTS.md`, prompt système, raisonnement, compétences), et une configuration peut même lancer un flow [combo](https://github.com/AI-for-dev/combo) entier. Le fournisseur, le modèle, le niveau de raisonnement et le nombre de répétitions sont obligatoires dans le scénario et ne sont jamais hérités de la machine. trysquare lit aussi les journaux de session de Pi pour noter la procédure suivie en plus du résultat, et `replay --rescore` renote les exécutions déjà payées après une correction des étapes de validation.
:::

## Utilisation de trysquare

### Que contient un scénario ?

Une expérience tient dans un fichier TOML autonome, le **scénario**, qui décrit la tâche, les configurations à comparer, le protocole et la manière de noter. Voici un scénario réduit, qui compare la demande négligée à une demande cadrée et à l'ajout d'un `AGENTS.md` :

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

Chaque **configuration**, ou cellule de la matrice, ne déclare que ce qui la distingue de la base, ce qui rend le scénario lisible d'un coup d'œil : `+agents` ajoute un fichier de règles, `+well_crafted` remplace le prompt, et le reste est commun. Pour un plan régulier, trysquare accepte aussi une grille d'axes dont il fait le produit, mais les variantes nommées suffisent dès que chaque configuration change une seule chose.

Les chemins machine, c'est-à-dire l'adresse du dépôt mesuré et le répertoire où vivent les clones, sont dans un second fichier, `trysquare.toml`. Ce fichier refuse au chargement toute clé qui déciderait de ce qui est mesuré, comme le modèle ou l'effort de raisonnement, pour que le même scénario mesure la même chose sur toutes les machines.

::: warning Chaque exécution travaille sur un clone jeté
Si le dispositif travaillait directement dans l'arbre de travail, chaque exécution modifierait le dépôt et la suivante mesurerait ces modifications plutôt que la configuration. trysquare clone donc le dépôt **au tag déclaré**, dans un répertoire temporaire, à chaque exécution, y dépose les fichiers de la configuration, puis lance l'agent.
:::

### Qu'est-ce qu'une validation ?

Une **validation** est un exécutable, dans le langage de votre choix, qui reçoit le chemin d'un fichier `context.json` décrivant l'exécution (le clone, le diff, la session de l'agent) et écrit sur sa sortie standard un objet JSON avec deux champs : `metrics`, les valeurs mesurées, et `reasons`, la justification de chacune. Le type d'une métrique décide de son agrégation, un booléen devenant un taux de réussite et un nombre une médiane.

La liste `metrics` du scénario est un contrat : une validation qui omet une métrique déclarée rend l'exécution invalide au lieu de la noter fausse. Le champ `reasons` est facultatif, et nous le remplissons toujours, parce qu'une colonne uniformément à zéro ressemble à un comportement de l'agent et peut tout aussi bien être un défaut de la validation. Le [module 3.1](./act3-contexte) en montre un exemple, où la forme de la commande `npm test` change d'un modèle à l'autre.

Le fichier `context.json` est archivé avec l'exécution, ce qui permet de renoter une matrice déjà payée après avoir corrigé une validation, sans relancer le modèle.

::: info Et quand aucun script ne sait noter ?
Un scénario peut aussi déclarer un **juge**, c'est-à-dire un modèle qui lit des pièces choisies de l'exécution (le prompt, la réponse finale, le diff) et rend son verdict à travers un outil dont les paramètres sont les métriques déclarées. Le juge ne connaît pas le nom de la configuration qu'il note, et il doit être un autre modèle que celui qu'on évalue. Son verdict reste probabiliste et il coûte des tokens à chaque notation, si bien que trysquare ne le rejoue pas lors d'une renotation. Nous préférons un test exécutable chaque fois que le critère s'y prête.
:::

### Que produit une matrice ?

Une matrice écrit un répertoire par expérience, dont le nom porte le scénario, l'étalon, le fournisseur, le modèle et le nombre de répétitions :

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

Relancer la même expérience écrase ce répertoire, et c'est git qui en garde les versions précédentes. Un répertoire horodaté par lancement accumulerait les variantes d'une même expérience entre lesquelles on finirait par choisir celle qui arrange.

### Comment lire un écart ?

Les tables de trysquare parlent en **points**, au sens de points de pourcentage de réussite. Si une configuration atteint le critère 18 fois sur 20, soit 90 %, et la base 11 fois sur 20, soit 55 %, l'écart vaut **+35 points**. Seules les exécutions valides comptent, ce qui explique qu'un dénominateur puisse être inférieur au nombre de répétitions.

Pour chaque écart, l'outil rééchantillonne les exécutions des deux configurations dix mille fois, avec une graine fixe pour que le calcul se refasse à l'identique, et en tire un intervalle à 95 %. Lire un écart revient alors à poser une seule question : **cet intervalle contient-il zéro ?** S'il ne le contient pas, l'écart est marqué `*` et il est **établi**. S'il le contient, il est marqué `o` et n'est **pas concluant**, quelle que soit la valeur au centre, et l'outil ne connaît pas de troisième état.

L'intervalle dit aussi la précision d'un écart établi. Les +35 points de l'exemple viennent avec un intervalle de +10 à +60 : le gain est certainement positif, sans qu'on puisse dire s'il vaut dix points ou soixante. À l'inverse, un écart de +17 points dont l'intervalle contient zéro reste compatible avec un levier qui aide comme avec un levier qui nuit. Les `o` sont tout de même affichés, avec un rappel sous chaque table : aucune conclusion ne peut s'appuyer sur eux.

Le nombre de répétitions dépend de ce que vous cherchez. **Trois suffisent à voir la dispersion**, ce qui est l'objectif en salle. **Départager deux leviers proches en demande beaucoup plus**, et les colonnes qui comptent des succès sont les plus gourmandes : un 2/3 contre 3/3 ne veut à peu près rien dire, là où un 8/20 contre 20/20 se défend. Les campagnes publiées dans cet acte sont à vingt répétitions pour cette raison.

::: warning Une durée ne se compare qu'à l'intérieur d'une matrice
trysquare entrelace les exécutions des différentes configurations, au lieu de jouer vingt fois la première puis vingt fois la suivante, pour que toutes subissent la même charge du fournisseur. Deux matrices lancées à des moments différents n'ont pas cette garantie, et leurs colonnes de durée ne se comparent pas.
:::

::: info Exercice (en salle)
Vous devez avoir [uv](https://docs.astral.sh/uv/getting-started/installation/) et Pi installés pour continuer.

Nous avons extrait les expériences de cet acte dans un dépôt dédié, en dehors des supports de formation : [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter).

```bash
git clone https://github.com/AI-for-dev/trysquare-starter
cd trysquare-starter
uv sync
```

Ouvrez `trysquare.toml`, puis `scenarios/issue1-contexte.toml`, et retrouvez dans le second la tâche, le modèle, le nombre de répétitions, les configurations et les validations. Vérifiez ensuite le scénario de bout en bout, fichiers et préconditions compris, puis affichez le plan complet de la matrice. Aucune de ces deux commandes n'appelle de modèle :

```bash
uv run trysquare validate scenarios/issue1-contexte.toml
uv run trysquare run scenarios/issue1-contexte.toml --output results --dry-run
```

Comptez les exécutions que le plan annonce et estimez ce qu'elles coûteraient en temps, à partir des durées du tableau en tête de ce module. C'est ce calcul qui décide du nombre de répétitions que vous lancerez au module suivant.
:::

Les autres sous-commandes travaillent sur une matrice déjà mesurée et n'appellent pas non plus de modèle : `render` refabrique les tables, éventuellement contre une autre référence, `replay --rescore` renote les exécutions archivées après une correction de validation, `compare` met deux matrices côte à côte en refusant ce qui n'est pas comparable, et `watch` suit dans le navigateur une matrice en cours et la session de chaque exécution pendant que l'agent l'écrit.

## Pour aller plus loin

- La [documentation de trysquare](https://ai-for-dev.github.io/trysquare/), en particulier ses pages sur l'écriture d'un scénario, l'écriture d'une validation et les invariants de mesure.
- [trysquare-starter](https://github.com/AI-for-dev/trysquare-starter), le dépôt d'exercice de cet acte.
- [Inspect](https://inspect.aisi.org.uk/) et [Harbor](https://github.com/harbor-framework/harbor), les frameworks d'évaluation à prendre quand la question porte sur un modèle ou un agent face à un jeu de tâches, et non sur une variante de harnais.

