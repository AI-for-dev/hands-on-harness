# briques

Ce qu'un scénario injecte dans le clone ou passe à l'agent, un fichier par pièce.

**Le matériau de tâche n'est pas de la documentation.** Les prompts, l'`AGENTS.md`
et le prompt système minimal sont des **entrées expérimentales** : changer un mot
change la mesure et périme les tables déjà publiées dans `../results/`. Si une
formulation doit évoluer, créez une brique à côté et déclarez-la comme une cellule
de plus, plutôt que de réécrire celle-ci.

| fichier | ce que c'est |
| --- | --- |
| `issue1-simple-prompt.md` | la tâche de base : le symptôme en une phrase, et rien d'autre |
| `issue1-well-crafted-prompt.md` | le même travail, demandé correctement : l'issue nommée, le périmètre, le critère d'arrêt |
| `issue1-simple-prompt-with-skill.md` | le prompt de base préfixé de `/skill:playtest`, et l'interdiction de lire `ISSUES.md` |
| `issue1-simple-prompt-with-skill-court.md` | le même, avec `/skill:playtest-court` |
| `AGENTS.md` | une convention de projet, en fichier de contexte permanent |
| `SYSTEM-minimal.md` | le prompt système de l'agent réduit à trois lignes |
| `skills/playtest/` | une compétence : décomposer un symptôme de jouabilité en défauts distincts, un cas rouge par défaut, consignés dans `.scratch/to_fix.md` avant l'implémentation |
| `skills/playtest-court/` | la même méthode sans le détour par `.scratch`, sans recherche web et sans double rouge |
| `sonde-fournie/sonde.test.js` | la sonde de notation, déposée dans l'arbre et commitée sur l'étalon pour la seule cellule `+sonde` |

`skills/` est un répertoire parce qu'une compétence en est un : trysquare la copie dans
`.pi/skills/<nom>` du clone et la passe en `--skill`, donc elle peut porter des fichiers
à côté de son `SKILL.md`.

Une brique déclare ce qu'elle est par `kind = "skills"`, `"agents"` ou `"files"`, et son
nom est libre : `[harness.skills-playtest]` avec `kind = "skills"` est la forme correcte.
Le nom décidait de tout avant que `kind` existe, une brique appelée autrement que `skills`
étant alors injectée comme une définition de sous-agent. Ce n'est plus le cas, mais une
brique **sans** `kind` retombe encore sur cette règle, et un répertoire de compétence y
deviendrait silencieusement un agent : déclarez toujours `kind`.

## Pourquoi le prompt cadré ne répète pas le mécanisme

`ISSUES.md` décrit déjà, sous l'issue #1, comment corriger le bug : comparer les
pénétrations horizontale et verticale, inverser l'axe de la face touchée. Ce texte
est dans le dépôt que l'agent a sous la main.

Le prompt cadré ne le recopie pas. Il nomme l'issue, le périmètre et le critère
d'arrêt, et rien de plus. Un prompt qui dicte la solution transforme le critère en
test d'obéissance et le sature, ce qui est exactement l'erreur commise sur le
prompt de l'issue #2 : il contenait « ne traite aucune autre issue », soit la
négation exacte de ce que le critère mesurait.

Ce qui est mesuré ici est donc : **est-ce que pointer un ticket écrit suffit à ce
qu'il soit lu**, et non est-ce qu'un agent sait suivre une consigne qu'on vient de
lui donner.

## Pourquoi les cellules à compétence interdisent `ISSUES.md`

Les deux prompts à compétence portent une phrase que les autres n'ont pas, « tu n'as
pas le droit de lire `ISSUES.md` ». Sans elle, la cellule mesurerait le cumul de deux
leviers, la compétence et le ticket écrit, et ne se lirait plus contre rien : le
prompt de base, lui, ne défend pas cette lecture. L'interdiction est donc ce qui
maintient la compétence seule dans la colonne.

C'est aussi une consigne, avec tout ce que la formation en dit, et le validateur ne
vérifie pas qu'elle a été suivie. Une cellule où l'agent aurait lu le fichier malgré
l'interdiction mesurerait la pile complète sans le dire ; la métrique qui le
trancherait reste à écrire.

## Ce que les deux compétences mesurent

`playtest` et `playtest-court` connaissent NÉON. Elles nomment `frame()`, les faces
d'une brique, `vx` et `vy`, et portent un tableau des familles de défaillances d'un
casse-brique. Ce n'est pas un oubli de retenue : ce qui se compare ici n'est pas
« une méthode sans domaine fait-elle trouver le cas », mais **ce que le protocole
d'une compétence coûte à budget de modèle constant**.

L'écart entre les deux est procédural, pas doctrinal. `playtest` fait naître les cas
dans `.scratch/to_fix.md`, demande une recherche web, un double rouge et un format de
bloc imposé. `playtest-court` supprime les quatre et fait écrire chaque cas
directement dans `game/neon.test.js`. Le diagnostic qui a motivé la version courte est
dans `../hypotheses/issue1-skills.md` : sur gemma, le transfert de `.scratch` vers la
suite est l'étape perdue douze fois sur vingt, et la consigne de ménage détruit le
livrable deux fois sur vingt.

Une compétence chargée n'est pas une compétence employée, et c'est la colonne
`skill_invoque` qui les sépare : pi ne met que le nom et la description dans le prompt
système, le corps du `SKILL.md` restant à la charge de l'agent qui décide de l'ouvrir.
