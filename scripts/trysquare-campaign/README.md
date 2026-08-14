# L'établi

Les expériences de la formation, telles qu'elles ont réellement tourné, rejouables à
tout moment. L'outil de mesure est [trysquare](../../../trysquare), qui vit dans un
dépôt voisin ; ce répertoire n'en contient aucune copie, seulement le matériau : les
scénarios, les briques, les hypothèses, les validateurs et les résultats.

La séparation est celle de l'équerre et de l'établi. trysquare répond à « cet écart
est-il vrai » et ne sait rien de NÉON ; l'établi porte ce qui est propre à cette
formation et à ce dépôt.

## Lancer

```bash
cd scripts/trysquare-campaign
./mesurer.sh                             # les scénarios disponibles
./mesurer.sh issue1-contexte --dry-run   # le plan complet, sans rien dépenser
./mesurer.sh issue1-contexte             # la matrice
```

`mesurer.sh` pointe l'outil et la config, puis écrit une ligne dans
`resultats/journal.md` : la date, le scénario, le répertoire produit, et **la révision
de trysquare et du harnais au moment de la mesure**. trysquare épingle le dépôt mesuré
par un tag, mais rien n'épingle trysquare lui-même, et une expérience sur un harnais
qui n'épingle pas le harnais mesure l'opérateur. Un `-dirty` dans le journal signale une
mesure qu'on ne saura pas reproduire exactement.

Les sous-commandes qui ne dépensent rien passent directement :

```bash
./mesurer.sh render resultats/issue1-contexte_etalon-v1_ilaas_gemma-4-31b_n10
./mesurer.sh compare resultats/issue1-contexte_* resultats/issue1-contexte-pro_*
```

Prérequis : `uv`, le binaire `pi` sur le `PATH`, un fournisseur auquel vous avez accès,
et NÉON cloné à côté de ce dépôt. Tout le reste - chargement, notation, agrégation,
verdicts - tourne hors ligne. Si NÉON est ailleurs, copiez `trysquare.toml` et passez
`CONFIG=/chemin/vers/ma-config.toml ./mesurer.sh ...` plutôt que de modifier le fichier
versionné.

### NÉON doit être un clone local

```bash
git clone <url de NÉON> ../../../neon      # depuis scripts/trysquare-campaign
git -C ../../../neon tag -l etalon-v1      # doit répondre, sinon rien n'est mesurable
```

trysquare clone le dépôt mesuré **depuis un chemin de fichier** : il vérifie
`source.exists()` puis passe `source.resolve()` à `git clone`, donc une URL est refusée.
Ce n'est pas une limite qu'il faut contourner ici, parce que la notation en a besoin
aussi : le validateur lit sa référence dans le tag avec `git show`, sur un dépôt local.

Le tag `etalon-v1` doit donc exister dans le clone. Il vient avec un `git clone`
ordinaire, mais seulement s'il a été **poussé** (`git push origin etalon-v1`) : un tag
créé localement et jamais poussé rend l'expérience irrejouable par quelqu'un d'autre,
sans le moindre message d'erreur avant le premier lancement.

Publier NÉON est ce qui rend `resultats/` vérifiable ailleurs que sur cette machine :
une matrice archivée ne référence que le nom d'un tag, et un tag sur un dépôt local
n'est reconstituable par personne. C'est aussi pourquoi le journal enregistre le
**commit** derrière le tag et pas seulement son nom.

## Disposition

```
scripts/trysquare-campaign/
  trysquare.toml     chemins machine : où est NÉON, où vivent les clones jetables
  mesurer.sh         l'outil, la config, et la trace de ce qui a tourné
  scenarios/         une expérience = un fichier TOML autonome
  hypotheses/        ce qui est prédit, écrit avant de mesurer
  briques/           tickets, AGENTS.md, prompt système, compétences, sonde fournie
  validateurs/       ce qui note
  resultats/         une matrice par répertoire, versionnée, plus le journal
```

Les chemins d'un scénario sont relatifs au scénario, ce qui rend le répertoire
déplaçable d'un bloc.

## Les expériences

### `issue1-contexte` — les leviers de contexte, sur l'issue #1

Les six cellules du module 2.1, un levier à la fois contre une base, mais sur l'issue #1
de NÉON au lieu de l'issue #2. `issue1-contexte-pro` en reprend deux coins sur un modèle
plus gros, parce que le modèle est une constante de scénario dans trysquare et que le
2×2 est donc deux expériences jointes par `compare`.

Une septième cellule s'est ajoutée, `pile soignée +skill` : la pile soignée plus une
compétence, `briques/skills/test-gaps`, qui se déclenche sur une demande de
correction ou d'ajout, inventorie la suite existante, dit ce qu'il y manque pour
démontrer le changement, et porte une liste de cas limites. Elle **ne se lit pas contre
`rien`** mais contre `pile soignée`, la seule cellule dont elle ne diffère que par cette
brique. Le verdict de la matrice, lui, se prend contre `rien` pour toutes les cellules :
c'est `compare` ou la table qui donne l'écart utile ici, pas la colonne de verdict.

La compétence ne nomme ni `frame()`, ni les faces d'une brique. Ce qui est mesuré est
donc si une méthode de travail sans connaissance du domaine fait trouver le cas que la
demande ne nomme pas - et non si un agent sait appliquer un indice qu'on vient de lui
tendre (`briques/README.md`).

Une colonne l'accompagne, `skill_invoque`, et elle se lit **avant** le critère. pi ne met
que le nom et la description d'une compétence dans le prompt système ; le corps du
`SKILL.md`, l'agent va le lire lui-même quand la tâche lui paraît correspondre, et sa
propre documentation prévient que « models don't always do this ». Une brique chargée
n'est donc pas une brique employée, et sans cette colonne un `rebond_briques` inchangé se
lirait « la compétence ne sert à rien » là où il peut dire « la compétence n'a pas été
ouverte ». C'est une métrique de procédé lue dans la session, donc rejouable sur des
exécutions déjà payées.

Elle est **fausse dans les six autres cellules**, qui ne reçoivent aucune compétence, et
c'est un fait sur leur session plutôt qu'un reproche : aucun `SKILL.md` n'y a été lu. La
rendre « sans objet » demanderait de lire le nom de la cellule dans le validateur, donc de
noter chaque configuration avec son propre mètre.

Une cellule de plus pose la question inverse de toutes les autres, `pile soignée +sonde`.
Ailleurs on donne du contexte et on regarde si l'agent trouve le cas que la demande ne
nomme pas ; ici on lui donne **le test qui le juge**, rouge, dans l'arbre, avant qu'il
démarre - un modèle qui a déjà les tests qu'il faut se corrige-t-il ?

Elle tient à une brique `kind = "files"`, la seule dont le matériau s'adresse à la tâche
et non à la bibliothèque d'agent : trysquare dépose `briques/sonde-fournie/sonde.test.js`
en `game/sonde.test.js` et l'y **commite sur l'étalon**. Le commit est ce qui rend
l'injection gratuite dans `touched` tout en gardant trace de ce que l'agent en fait ;
sans lui, une sonde desserrée jusqu'à passer ne laisserait rien nulle part. La colonne
`sonde_intacte` lit exactement cela, et elle est « sans objet » dans les autres cellules
plutôt que fausse : il n'y a pas de valeur de vérité à « la sonde est intacte » là où il
n'y a pas de sonde. Elle se lit **avant** la colonne des rebonds.

La sonde fournie **est** la sonde de notation : un seul fichier,
`briques/sonde-fournie/sonde.test.js`, déposé tel quel dans la cellule qui reçoit la brique
et rejoué ensuite sur toutes les cellules. Deux fichiers jumeaux tenaient ce rôle avant, et
leurs onze cas communs devaient rester copiés fixture pour fixture sans quoi la cellule aurait
mesuré « l'agent devine-t-il un second barème » au lieu de « l'agent se corrige-t-il » - un
écart qui se creuse en silence, donc il n'y a plus qu'une source.

Reste ce qui les séparait vraiment : la source importe `frame` en direct, parce que l'exporter
est le premier geste du travail et que `frameInterne` est un nom du harnais qu'un agent
recopierait dans `game/neon.js`, où il ferait un doublon d'export. Les autres cellules, elles,
n'ont aucune raison d'exporter `frame` : les noter sur cet import rendrait injugeable toute
correction laissée dans `frame()`. `issue1.py` réécrit donc cette seule ligne dans sa copie de
notation, et `test_issue1.py` monte la garde sur les deux ancres de la réécriture.

La contrepartie assumée du fichier unique : la cellule qui reçoit la brique lit aussi les deux
groupes latents - tunneling et raquette - et peut les faire passer. Ces deux colonnes ne sont
donc comparables d'une cellule à l'autre que sur les quatre premières. Elle se lit contre
`pile soignée`, pas contre `rien`.

Le changement de tâche est le point de l'affaire. La moitié du ticket #2 qui décide si
le travail est fait - « arrêter de scanner toutes les briques » - n'a pas de forme
mécanique : le banc l'a approchée par un motif dans le diff, s'est trompé deux fois, et
a conclu qu'il fallait un juge. La moitié dure de l'issue #1 est un **comportement** :
un choc latéral inverse `vx`. Un comportement s'exécute au lieu de se reconnaître.

**État : le validateur est repris une métrique à la fois.** `validateurs/issue1.py` rend
`delivered`, `in_scope`, `touched`, `tests_ajoutes`, `suite_lancee`, `skill_invoque`,
`sonde_intacte` et les rebonds de la sonde ; les scénarios ne déclarent que celles-là, et une matrice lancée
maintenant est notable. Ce qui reste à écrire - le débordement et ses signatures, la
stabilité de l'API - n'est pas déclaré, donc rien ne le note en silence.

`validateurs/test_issue1.py` couvre `skill_invoque`, `sonde_intacte`, l'accord des deux
sondes cas par cas, et le contrat des métriques - chaque nom déclaré par un scénario est
bien rendu, vérifié en appelant le validateur, parce que c'est le seul oubli du lot qui ne
se découvre qu'après avoir dépensé une matrice :

```bash
cd validateurs && uv run --no-project --with ../../../../trysquare python -m unittest test_issue1
```

Le critère est `rebond_briques`, et c'est une sonde : `briques/sonde-fournie/sonde.test.js`
pose une balle déjà en recouvrement avec une brique, appelle `frame()`, et regarde quelle
composante de vitesse s'inverse. Quinze cas, six colonnes d'une seule exécution - les quatre
faces d'une brique, son coin, la sortie du rectangle, la couture de la grille, puis deux bugs
latents que le ticket ne nomme pas - et la sonde tourne **après** tout le travail de l'agent.

Une troisième colonne jouait les murs du champ. Elle est retirée : ils rebondissent déjà à
l'étalon, donc la colonne était verte partout et ne séparait aucune cellule.

Ce sont des tests `node:test` ordinaires, comme `game/neon.test.js` du dépôt, lancés comme
lui par la commande de `npm test`. Ils sont déposés dans une copie de l'arbre mesuré faite
hors du clone, à la place des tests de l'agent, et le validateur y ajoute une ligne : celle
qui exporte `frame()`, que le dépôt garde interne et où vit la collision. Ce que `node --test`
imprime pour des humains, `validateurs/rapport.mjs` le rend en JSON, une colonne par
`describe`. Une correction extraite dans `brickHit()` et appelée depuis `step()` au lieu de
`frame()` est notée juste, et la table dit qu'elle est passée par là.

Une métrique déclarée dans un scénario mais absente du validateur ne coûte pas la
matrice : elle fait échouer le **validateur**, l'exécution est gardée, et `replay` la
renote sans dépenser un jeton (`invariants.md:81`). C'est ce qui permet d'ajouter une
métrique après coup sur des exécutions déjà payées.

### Affiner `suite_lancee`

Les commandes qui comptent sont une **liste exacte** dans `issue1.py`, pas un motif : un
motif décide à l'avance de ce qu'on n'a pas encore vu. Quand la métrique est fausse, sa
raison recopie les commandes de l'exécution, donc la ligne à ajouter se lit dans la
table. Les quatre actuelles viennent des sessions archivées sous `results/`.
