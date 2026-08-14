# briques

Ce qu'un scénario injecte dans le clone ou passe à l'agent, un fichier par pièce.

**Le matériau de tâche n'est pas de la documentation.** Les tickets, l'`AGENTS.md`
et le prompt système minimal sont des **entrées expérimentales** : changer un mot
change la mesure et périme les tables déjà publiées dans `../resultats/`. Si une
formulation doit évoluer, créez une brique à côté et déclarez-la comme une cellule
de plus, plutôt que de réécrire celle-ci.

| fichier | ce que c'est |
| --- | --- |
| `issue1-ticket-vague.md` | la tâche de base : une demande réelle mais négligée |
| `issue1-ticket-cadre.md` | le même travail, demandé correctement |
| `AGENTS.md` | une convention de projet, en fichier de contexte permanent |
| `SYSTEM-minimal.md` | le prompt système de l'agent réduit à trois lignes |
| `skills/test-gaps/` | une compétence : inventorier la suite existante avant de corriger, et chercher les cas limites |
| `skills/tie-cases/` | une compétence plus étroite : le cas où la comparaison ne départage pas |

`skills/` est un répertoire parce qu'une compétence en est un : trysquare la copie dans
`.pi/skills/<nom>` du clone et la passe en `--skill`, donc elle peut porter des fichiers
à côté de son `SKILL.md`. Le scénario la cite par une brique **nommée `skills`**, et ce
nom décide de tout : sous n'importe quel autre nom, le même répertoire serait injecté
comme une définition de sous-agent.

Elle est **en anglais**, seule brique de ce répertoire à l'être, et c'est un choix et non
un oubli. Les tickets et l'`AGENTS.md` jouent le rôle de ce qu'écrit une équipe
francophone ; une compétence, elle, est une méthode de travail réutilisable, et elle se
lit dans la langue du dépôt qu'elle traverse - NÉON est anglophone jusque dans ses
noms de tests et ses `TODO`, que l'étape 2 demande justement de lire. C'est aussi la
langue de `scripts/skills/profile`. Le prompt système garde `Answer in the language of
the user`, donc ce que l'agent rend reste en français.

## Pourquoi le ticket cadré ne répète pas le mécanisme

`ISSUES.md` décrit déjà, sous l'issue #1, comment corriger le bug : comparer les
pénétrations horizontale et verticale, inverser l'axe de la face touchée. Ce texte
est dans le dépôt que l'agent a sous la main.

Le ticket cadré ne le recopie pas. Il nomme l'issue, le périmètre et le critère
d'arrêt, et rien de plus. Un prompt qui dicte la solution transforme le critère en
test d'obéissance et le sature, ce qui est exactement l'erreur commise sur le
ticket de l'issue #2 : il contenait « ne traite aucune autre issue », soit la
négation exacte de ce que le critère mesurait.

Ce qui est mesuré ici est donc : **est-ce que pointer un ticket écrit suffit à ce
qu'il soit lu**, et non est-ce qu'un agent sait suivre une consigne qu'on vient de
lui donner.

## Pourquoi la compétence ne connaît pas NÉON

Même retenue, et pour la même raison. `skills/test-gaps/SKILL.md` ne nomme ni
`frame()`, ni les faces d'une brique, ni `vx` : elle dit de lire la suite existante,
de nommer ce qui manque pour démontrer le changement, et elle porte une liste de cas
limites génériques. Deux de ses entrées - « deux grandeurs, et le cas où elles sont
égales », « ce qui ne doit pas changer » - sont exactement la forme du rebond par face
et de son coin, mais elles ne le disent pas et s'appliqueraient à un autre dépôt.

Une compétence qui décrirait le mécanisme du rebond mesurerait la même chose qu'un
prompt qui le dicte, en le déguisant en brique de harnais. La question ici est :
**est-ce qu'une méthode de travail, sans connaissance du domaine, fait trouver le cas
que la demande ne nomme pas.**

## `tie-cases`, la même question resserrée

`test-gaps` porte une liste de cas limites générique dont l'égalité entre deux
grandeurs n'est qu'une entrée parmi huit. `tie-cases` ne garde que celle-là et la
déroule : trouver les endroits où le code choisit une branche par comparaison,
produire l'entrée qui égalise, décider de la réponse attendue **avant** de regarder ce
que le code fait, et vérifier aussi ce qui ne doit pas bouger.

Elle ne nomme toujours ni brique, ni face, ni vitesse. Mais son étape 3 dit qu'une
égalité ne signifie pas forcément « choisir un camp » et que les deux branches peuvent
s'appliquer ensemble - ce qui est la forme exacte du rebond dans un coin, sans que le
mot soit écrit. Ce qui se mesure, en la comparant à `test-gaps` sur le même ticket :
**est-ce qu'une compétence étroite et directive fait tomber le cas plus souvent qu'une
méthode large**, ou est-ce qu'elle se contente de le rendre plus probable quand
l'agent l'avait déjà en vue.
