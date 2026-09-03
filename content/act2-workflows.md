# Les workflows : la boucle écrite en code

::: tip Objectifs de ce module
- Composer les rôles du module précédent avec les combinateurs de combo : chaîne, fan-out, boucle, livraison
- Écrire un pipeline : la structure dans le frontmatter, la prose par étape, et ce qu'un fichier ne peut pas exprimer
- Poser un gate exécutable dont le verdict bat toutes les approbations
- Lire un résultat de workflow : `ok`, `converged`, `approved`, et ce que chacun ne dit pas
- Rejouer le ticket #2 de bout en bout, sans intervention entre le brief et le verdict, et savoir prouver le mécanisme sans modèle
:::

Le module précédent s'est conclu sur deux limites : rien n'empêchait la session principale de faire le travail elle-même, puisque son rôle de relais reposait sur une consigne, et chaque geste de routage partait de votre mémoire de travail sans être archivé nulle part, ce qui interdisait de le rejouer, de le comparer ou de le mesurer.

Ce module automatise les gestes que votre journal de friction a recensés. Le routage devient du code qui appelle les rôles dans un ordre décidé à l'écriture, si bien qu'aucun modèle ne peut le réinterpréter, et le verdict devient l'exécution de la suite de tests, dont le résultat ne dépend d'aucune approbation. Il ne reste que deux interventions humaines, avant le travail et avant le commit, et la partie pratique montre pourquoi ces deux points d'arrêt sont des décisions de conception.

Nous suivons l'ordre habituel : comprendre ce qu'est un workflow dans combo, brancher les rôles du module précédent et rejouer le ticket #2 de bout en bout, puis dégager ce qui reste vrai quand l'outil change.

## Comprendre

### Un workflow est une fonction

Dans combo, un workflow est une fonction d'une entrée vers un `Result`, ou une liste de `Result` : le texte final d'un agent, ses messages, sa consommation, et un champ `ok` qui dit si le tour a tourné sans erreur de modèle. Les combinateurs composent parce qu'ils partagent ce contrat. Les agents restent les fichiers markdown du module précédent ; l'orchestration, elle, est du code : il n'y a pas de langage de description à apprendre, et la documentation de combo consigne ce choix dans ses décisions de conception.

Neuf combinateurs couvrent les formes utiles :

| combinateur   | forme                                                             |
| ------------- | ----------------------------------------------------------------- |
| `chain`       | 1 → 1 → 1, la sortie d'un pas nourrit le suivant                  |
| `fanOut`      | 1 → N branches en parallèle, un agent pour toutes ou un par branche |
| `loop`        | 1 → 1 jusqu'à une barre (`until`), plafond d'itérations           |
| `reduce`      | N → 1, un agent synthétise des branches                           |
| `route`       | un classifieur choisit la destination                             |
| `orchestrate` | un agent décide du découpage, plan validé avant tout lancement    |
| `pair`        | un travailleur et un relecteur, jusqu'à l'accord                  |
| `interview`   | l'agent questionne l'utilisateur, une question à la fois          |
| `deliver`     | plan, un pair par sous-tâche, check du projet, audit, correctifs  |

**`ok`, `converged` et `approved` répondent à trois questions différentes.** `ok` dit que les tours ont tourné sans erreur de fournisseur ; `converged`, sur un `loop`, dit que le travail a atteint la barre demandée plutôt qu'épuisé son plafond d'itérations ; `approved`, sur un `pair` ou un `deliver`, dit que quelqu'un a signé. Atteindre un plafond n'est pas une réussite, et la lecture d'un rapport commence par distinguer ces trois champs.

**Un échec ne fait pas s'effondrer le workflow.** Une branche de fan-out qui échoue devient un `Result` avec `ok: false` à sa place, les autres continuent, et un sous-agent qui a consommé douze mille tokens avant d'échouer a coûté douze mille tokens : sa consommation est comptée même quand `ok` est faux.

::: warning Une boucle d'agent n'a pas de limite propre
Un tour est un `session.prompt()`, et la boucle d'agent de Pi tourne tant que le modèle demande des outils. Un modèle faible qui hallucine un nom d'outil, reçoit « unknown tool » et redemande, boucle jusqu'à ce que quelque chose l'arrête : la documentation de combo rapporte 79 appels à un outil inexistant et environ 500 000 tokens d'entrée en un seul tour. `maxIterations` a un défaut (5), parce qu'une itération est une unité discrète et chère ; `timeoutMs` n'en a pas, parce qu'aucune valeur par défaut ne peut décider qu'une tâche légitime a trop duré. Posez un `timeoutMs` sur tout ce qui tourne sans surveillance : l'oubli d'un argument ne doit pas suffire à rendre possible une boucle sans fin.
:::

### Le pipeline : la partie linéaire, en markdown

Une suite linéaire de combinateurs peut s'écrire dans un fichier plutôt que dans du code : un **pipeline**, posé dans `.pi/pipelines/` à côté des agents. Le frontmatter porte la structure, c'est-à-dire les étapes, leurs agents, leurs plafonds et le check du projet, parce que c'est du vrai YAML et que l'imbrication y est naturelle ; le corps porte la prose, une section `## <id>` par étape. Aucun agent ne lit ce fichier pour décider de la suite : c'est le code de combo qui le déroule.

Les pipelines suivent les mêmes portées que les agents (livrés, machine, dépôt, le plus proche du travail l'emportant) et la même frontière de sécurité : ceux d'un dépôt ne sont jamais chargés par défaut. Le régime d'échec diffère en revanche de celui des agents, et cette différence corrige un piège du module précédent : un fichier d'agent incomplet est ignoré en silence, alors qu'un **pipeline malformé est refusé**, jamais remplacé sans bruit par le défaut. Un agent est découvert alors qu'un pipeline est demandé par son nom, si bien qu'un fichier présent mais illisible doit être signalé avec sa raison plutôt qu'ignoré.

Tout est validé **avant** d'ouvrir la moindre session : la forme de chaque étape, la correspondance entre les entrées du frontmatter et les sections du corps dans les deux sens, et chaque nom d'agent contre le roster. Une faute de frappe à l'étape quatre coûte ainsi une seconde au lieu de trois étapes de travail réel.

La limite est posée d'avance, et elle est volontaire : un pipeline n'a ni condition, ni branche, ni référence à l'étape deux. Chaque étape reçoit son instruction, la demande de départ et la sortie de l'étape précédente, rien d'autre. Au moment où une exécution a besoin d'un embranchement, elle devient un workflow en TypeScript, ce qui maintient la règle « les agents sont des données, les workflows du code » sans interdire d'écrire la partie linéaire en markdown.

### Le gate : la suite de tests comme verdict

`deliver` accepte une vérification, et la documentation de combo rapporte l'exécution qui l'a imposée : un pair a écrit une fonction et ses tests, le relecteur a approuvé, l'auditeur a approuvé, et le fichier de test importait `./slugify.js` pour un fichier nommé `slugify.ts`. La suite ne se chargeait même pas : les deux agents avaient lu le code, et aucun ne l'avait exécuté.

Le mécanisme est un **port** : le pipeline nomme le check (`verify: [npm, test]`), et c'est le code appelant qui l'exécute, par `execFile` et sans shell. Les arguments sont une liste, si bien que `"npm test && rm -rf /"` reste un argument et jamais deux commandes. La sortie est tronquée par la **queue** plutôt que par la tête, parce qu'un lanceur de tests dit à la fin ce qui a échoué. Enfin, **quand un check est configuré, son verdict est final** : aucune approbation, d'aucun agent, ne transforme un check rouge en réussite.

## Reconstruire

### Ce que le branchement a changé dans les rôles

Brancher les agents du module précédent sur `deliver` a fait apparaître deux collisions de convention, qui relèvent du même principe : la forme du livrable appartient à l'appelant.

La première touche le planner. `deliver` lui envoie sa propre demande de plan, un tableau JSON `[{"agent": …, "task": …}]`, et lit la réponse avec un parseur indulgent sur la forme, strict sur le fond : un nom d'agent inconnu est abandonné, jamais remplacé par un voisin plausible. Le plan « pour humain » du module précédent, avec ses `files:` et ses `done:`, ne contient rien que ce parseur sache lire : nous avons rejoué cette réponse contre le vrai parseur, et la livraison s'arrête avant d'ouvrir la moindre session, sur `no runnable plan`. La seconde touche le reviewer : sous `pair`, le mot d'accord est `LGTM`, seul sur sa ligne, et un relecteur qui répond `APPROVED` n'est jamais compté comme un accord, si bien que le pair épuise ses tours.

La correction tient en une règle ajoutée aux deux fichiers, la même : la forme par défaut sert l'orchestrateur humain, et quand l'appelant énonce la forme de réponse qu'il sait lire, c'est elle qui s'applique, parce qu'un plan que l'appelant ne peut pas analyser ne planifie rien. Les règles de fond, la taille des pas, le test rouge d'abord, l'API gelée, tiennent quelle que soit la forme.

Un rôle s'ajoute : l'auditeur. Le relecteur du pair voit une sous-tâche ; l'auditeur lit le tout fini, et cherche ce que la somme des pièces a oublié : une étape du plan que personne n'a faite, ou une exigence du ticket qu'aucune sous-tâche ne portait. C'est la version « ensemble » des vérifications que le reviewer du module précédent faisait pas à pas.

<<<@/../scripts/agents/auditor.md{md}

### Le pipeline du ticket #2

<<<@/../scripts/pipelines/issue2.md{md}

Cinq décisions de ce fichier demandent une justification. Le fan-out du module précédent s'écrit dans le fichier, deux agents, un par branche, avec des tâches **littérales** : un fan-out dont les branches viendraient de l'étape précédente serait un autre combinateur, `orchestrate`, où un agent décide du découpage, et garder les tâches littérales dispense le format de toute syntaxe de gabarit. `verify: [npm, test]` est déclaré une fois, au sommet : c'est le gate, que le pipeline nomme sans l'exécuter, l'exécution appartenant au code qui possède l'arbre de travail. `maxTasks: 2` et `concurrency: 1` sur la livraison, parce que les travailleurs écrivent dans le même arbre et que le travail du ticket #2 est séquentiel : un travail séquentiel tient dans une sous-tâche plutôt que dans trois, et deux coders concurrents sur un seul dépôt produiraient des écritures croisées que personne ne relit. `maxAuditRounds: 3` plutôt que 2, parce qu'un audit qui prescrit un correctif consomme un tour, le correctif un autre, et qu'il faut un tour restant pour signer : avec 2, un run dont le second audit demandait une retouche a fini `approved: false` sur un arbre pourtant vert et conforme. La prose de l'étape `work` énonce le **contrat** du livrable, c'est-à-dire la signature exacte, la pureté, la forme du retour et le comportement de `frame()` quand la balle chevauche plusieurs briques, parce que chaque liberté que la demande laisse ouverte devient une variante d'un run à l'autre : avant ce bloc, six runs sur ce ticket ont rendu trois signatures différentes, dont une qui ne cassait plus qu'une brique par frame sans qu'aucun test ne rougisse. Enfin la même prose impose le test rouge d'abord dans la suite, ce qui est la règle du planner redite à l'endroit où le plan se fabrique.

::: info Exercice (en salle)
Déposez le pipeline à côté des agents, puis vérifiez ce que Pi a réellement chargé avant de rien lancer :

```bash
cd /chemin/vers/neon
cp /chemin/vers/hands-on-harness/scripts/pipelines/issue2.md .pi/pipelines/
cp /chemin/vers/hands-on-harness/scripts/agents/*.md .pi/agents/
pi -e /chemin/vers/combo/extension
```

```
> /pipelines
```

La commande liste les pipelines chargés, la forme de chaque exécution, et les fichiers qui ne parsent pas avec leur raison. Cassez volontairement le YAML du frontmatter, relancez `/pipelines`, et constatez le régime d'échec : le fichier est refusé et nommé avec sa raison, au lieu d'être remplacé en silence.

Puis lancez la boucle :

```
> /build --pipeline issue2 --model ilaas/gemma-4-31b traite le ticket #2 d'ISSUES.md
```

`/build` s'arrête exactement deux fois, au brief avant tout travail et au commit à la fin. Entre les deux, tout ce que vous faisiez à la main au module précédent s'enchaîne sans vous : la note d'impact, le plan, le pair coder-reviewer, `npm test`, l'audit, les correctifs. Refuser un des deux arrêts ne défait rien, le travail restant dans l'arbre. À la fin, faites vos propres vérifications, celles du module précédent : `npm test`, la liste des exports, `git diff`, et la trace complète dans `runs/<horodatage>/`.
:::

Un run interrompu reprend avec `/build resume` : seules les sous-tâches **approuvées** sont conservées, le plan est réutilisé plutôt que refait, et rien de la conversation ne revient, si bien qu'un build repris relit le code au lieu de rejouer une transcription.

### La version script : ce que le pipeline ne peut pas exprimer

Le fan-out tient dans le fichier, mais trois choses n'y tiennent pas. La première est l'autonomie complète : `/build` s'arrête deux fois par conception et possède un terminal pendant qu'il tourne, alors qu'un harnais qui doit travailler seul, sous CI, sur un déclencheur ou dans la matrice d'une expérience, ne peut se permettre ni les arrêts ni le terminal. La forme autonome de la boucle est donc un processus, sans arrêt entre la demande et le verdict, avec un code de sortie exploitable par une machine.

La deuxième est la politique du verdict. La preuve à blanc plus bas montre que `approved` agrège l'audit et le check et non l'accord des pairs : un pair non convergé se lit dans le rapport, il ne bloque rien. Si votre politique exige l'accord du pair, cette exigence est une ligne de code dans l'appelant, un fichier n'ayant ni condition ni accès au rapport pour l'exprimer. La troisième est la mesure : comparer le parallèle au séquentiel demande de faire varier la concurrence d'un lancement à l'autre sans rien changer d'autre, et de lire `busyMs` contre `wallMs`.

C'est le second artefact du module, la même exécution que le pipeline, écrite avec la bibliothèque :

<<<@/../scripts/workflows/issue2.ts{ts}

Le script fait ce que le pipeline faisait, les deux mêmes branches, la même livraison, le même gate, et les trois choses s'y lisent : le code de sortie du processus combine `approved` et l'accord des pairs, si bien que la politique durcie tient dans les deux lignes au-dessus de l'`exit` et qu'une CI l'applique sans rien ajouter ; `--sequential` réduit la concurrence à un, et la ligne de parallélisme s'imprime. combo y est importé depuis son clone, en argument et jamais en variable d'environnement, parce qu'un état ambiant qui atteint un sous-agent est précisément ce que la conception de combo veut empêcher.

::: info Exercice (en autonomie)
Lancez le script deux fois, avec et sans `--sequential`, et comparez la ligne de parallélisme. Puis comparez ce que le fan-out a réellement rapporté sur la durée totale de la boucle, gate et audit compris : c'est la version chiffrée de la comparaison promise au module précédent.

Voici la nôtre, deux branches sur `ilaas/gemma-4-31b`, clone réinitialisé entre les deux lancements :

| | fan-out | séquentiel |
| --- | --- | --- |
| horloge / travail | 131 511 / 184 502 ms | 134 584 / 134 557 ms |
| ligne de parallélisme | **×1,40** | ×1,00 |
| explorer / tester | 53,0 s / 131,5 s | 75,9 s / 58,6 s |
| boucle complète | 298 s | 348 s |

**Le fan-out a fait gagner 3 secondes sur 134**, soit 2,3 %. Les deux branches vont individuellement 37 % plus lentement quand elles tournent ensemble, parce qu'elles se partagent le débit d'un seul fournisseur : le ×1,40 mesure donc le recouvrement des deux branches et non une accélération de la boucle. L'écart de 50 secondes sur la boucle complète vient de la dispersion du modèle d'un run à l'autre, plus grande ici que le gain mesuré, et non du parallélisme.

Reproduisez la mesure sur votre fournisseur avant de conclure, parce que ces chiffres décrivent un point d'entrée partagé et non une propriété du fan-out. Ce qui se transpose est la méthode, et le constat qu'un bon ratio de parallélisme ne prouve aucune économie sur la durée totale.
:::

### La preuve de mécanisme, sans modèle

Avant de payer un seul token, le mécanisme entier se vérifie à blanc, et le protocole se réutilise sur n'importe quel workflow : le vrai code de combo (parseur, `runPipeline`, `deliver`), le vrai `npm test` de NÉON comme gate, et un faux modèle injecté par le port `spawn`, dont le coder applique le diff de référence du ticket #2. Seul le modèle est simulé ; tout ce qui l'entoure est le code réel. C'est `scripts/workflows/issue2-smoke.mjs`, qui se lance sur un clone jetable portant les agents et le pipeline :

```bash
node scripts/workflows/issue2-smoke.mjs /chemin/vers/neon /chemin/vers/combo
```

Et voici sa sortie :

```
S1 parse+resolve            OK   note(fanOut) -> work(deliver)
S2 chemin vert              OK   approved=true, npm test: 9 cas verts
S3 gate                     OK   pair LGTM + audit APPROVED, check rouge => approved=false
S4 plan au format humain    OK   'no runnable plan' - la forme appartient à l'appelant
S5 mauvais mot d'accord     OK   pair jamais approuvé ; le tout reste sauvé par audit + check
```

Chaque ligne vérifie une propriété. S1 : le fichier parse et chaque nom résout avant toute session. S2 : sur le diff de référence, la suite passe de 6 à 9 cas et tout le monde signe. S3 est la démonstration centrale : le même diff plus un test saboté, le pair approuve, l'audit approuve, et `approved` reste faux parce que le check est rouge : une approbation ne bat pas un verdict exécutable. S4 et S5 rejouent les deux collisions de convention décrites plus haut, et prouvent qu'elles échouent là où elles doivent : avant le travail pour le plan, dans le pair pour le verdict.

::: warning Ce que `approved` agrège
S5 montre une subtilité de conception à connaître avant de lire un rapport de `deliver` : un pair qui épuise ses tours sans accord **n'est pas un veto**. Son propre `approved` reste faux et se lit dans le rapport, mais le verdict final de la livraison est « l'auditeur a signé **et** le check est vert ». Dans S5, le travail était fait dès le premier tour, l'audit et la suite l'ont confirmé, et la livraison est approuvée alors qu'aucun relecteur de pair n'a jamais dit le bon mot : le verdict final repose sur le check et sur la lecture du tout, et non sur l'accord de chaque étage. Si votre politique exige l'accord du pair, elle s'écrit dans le code appelant, et la version script de ce module le fait dans les deux lignes qui précèdent son code de sortie.
:::

Cette preuve ne dit rien de ce qu'un modèle réel fera du rôle de planner ou de coder sur ce ticket. Elle établit que si le modèle fait le travail, le harnais le laissera passer, et que s'il le fait mal, le gate l'arrêtera. Le comportement du modèle, lui, ne s'établit que par la mesure.

::: warning Un check vert ne dit pas que le ticket est fait
S3 établit qu'une approbation ne bat pas un verdict rouge, et la réciproque est fausse. Un run réel de ce pipeline l'a montré : `check: vert`, `approved: true`, douze cas verts, et dans l'arbre une fonction `export function brickHit(state)` qui mute l'état, là où le ticket demande `brickHit(ball, bricks)`, **pure**. L'auditeur avait prescrit le changement de signature, le relecteur l'avait laissé passer, et la suite l'a validé parce qu'aucun test ne contraint la signature demandée.

Un gate ne vérifie que ce que la suite contraint. `approved` veut dire « l'auditeur a signé et le check est vert », jamais « le ticket est satisfait », et la seule chose qui relie les deux est un test que quelqu'un a écrit exprès. C'est aussi ce qui justifie l'étape `tester` du fan-out : un plan de tests qui nomme la signature attendue transforme une exigence de prose en exigence exécutable.
:::

### La comparaison qui reste à mesurer

Le module précédent a laissé une question de mesure ouverte : le découpage en rôles améliore-t-il le résultat sur le ticket #2, contre un agent seul recevant le même brief ? Ce module pose le protocole sans publier de chiffres, et comme dans le reste de la formation, l'hypothèse s'écrit avant la mesure.

combo fournit la brique : `experiment` rejoue le même workflow sur M modèles et N répétitions, chaque cellule dans son répertoire avec ses mesures, et rend une table dont les colonnes de drapeaux sont ce que votre fonction retourne (`approved`, la suite verte, les exports intacts). Deux variantes suffisent : la boucle de ce module, et un `run` unique du coder avec le ticket cadré. Les colonnes de lecture sont celles du module sur le contexte, le débordement de périmètre en tête.

::: info Exercice (en autonomie)
Écrivez d'abord l'hypothèse : que prédisez-vous du découpage sur le débordement, et à quelle condition diriez-vous qu'il n'apporte rien ? Écrivez ensuite la fonction d'`experiment` qui la met à l'épreuve, à vingt répétitions par variante. La leçon du module sur le contexte s'applique inchangée : trois répétitions montrent la dispersion et ne départagent rien.
:::

## Généraliser

**Les agents sont des données, les workflows du code.** Un fichier décrit un rôle, du code décrit un enchaînement, et la frontière entre les deux est un contrat : la partie linéaire peut redevenir un fichier, la première condition la fait retourner au code. Un système qui range l'orchestration dans un langage de configuration finit par y réinventer un langage de programmation, sans l'outillage qui va avec.

**Un verdict exécutable bat toutes les approbations.** Deux agents ont approuvé un test qui ne se chargeait pas, et un check l'aurait dit en une commande. Le verdict du gate est le seul qui ne soit pas une opinion, et il est final par construction.

**`ok`, `converged` et `approved` répondent à trois questions différentes.** Des tours qui tournent ne disent pas que la barre est atteinte, un plafond épuisé n'est pas une réussite, et ce que le verdict final agrège se lit dans le code plutôt que dans son nom, comme S5 le démontre.

**La forme du livrable appartient à l'appelant.** Le même planner sert un humain et un parseur, à condition de dire dans son prompt à qui revient la forme. Les deux collisions de ce module se sont corrigées par une phrase chacune, parce que les rôles et les formats étaient séparés dès l'écriture ; s'ils avaient été mélangés, la correction aurait demandé une réécriture.

**Toute vérification déplaçable avant la première dépense doit y être déplacée.** Le pipeline est parsé, ses sections appariées, ses agents résolus et son plan borné avant la première session, si bien qu'une faute de frappe coûte une seconde au lieu de trois étapes de travail réel. La règle se transpose à tout enchaînement qui paie chaque étape.

**Les plafonds sans défaut se posent à la main.** Le plafond d'itérations a un défaut parce que l'unité est discrète et chère, le délai n'en a pas parce qu'il serait arbitraire, et c'est donc à vous de le poser sur tout ce qui tourne sans surveillance. Cherchez, dans chaque outil, ce que l'oubli d'un argument rend possible.

**Le mécanisme se vérifie sans modèle.** Un port d'injection, le `spawn` de combo, sépare le harnais du modèle : la preuve à blanc établit que le harnais route, gate et refuse comme prévu, en une seconde et pour zéro token, alors que ce que le modèle fera du rôle reste une question de matrice. Confondre les deux fait payer des répétitions pour vérifier du code, ou fait croire prouvé ce qui n'était que plausible.

**Les arrêts d'un harnais autonome sont des décisions de conception.** `/build` marque deux arrêts, le brief et le commit, et tout le reste s'enchaîne sans personne. Ces arrêts sont les deux endroits où une erreur coûte plus cher à défaire qu'à prévenir, choisis à l'écriture, et un harnais autonome se juge à la position de ses arrêts plutôt qu'à leur absence.

## Livrable

Ce module produit trois pièces.

**1. Le pipeline et le script**, `scripts/pipelines/issue2.md` et `scripts/workflows/issue2.ts`, versionnés avec les trois fichiers d'agents que le branchement a touchés : les deux règles de forme ajoutées au planner et au reviewer, et l'auditeur.

**2. La trace d'un run complet** : le répertoire `runs/<horodatage>/` d'un `/build` mené du brief au commit sur le ticket #2, et la sortie verte de `issue2-smoke.mjs`. La preuve de mécanisme et l'exécution réelle restent deux pièces séparées, parce qu'elles n'établissent pas la même chose.

**3. La ligne « workflows » de la fiche de décision** :

| levier                              | effet observé | adopté ? | pourquoi |
| ----------------------------------- | ------------- | -------- | -------- |
| pipeline markdown (partie linéaire) |               |          |          |
| workflow en code (branches, mesure) |               |          |          |
| gate exécutable (`verify`)          |               |          |          |
| fan-out explorer ∥ tester           |               |          |          |
| audit du tout, après les pairs      |               |          |          |
| plafonds (`maxRounds`, `timeoutMs`) |               |          |          |
| preuve de mécanisme sans modèle     |               |          |          |
| arrêts choisis (brief, commit)      |               |          |          |

::: tip Critère de réussite
Vous savez dire, rapport en main, pourquoi un run donné est `approved` ou ne l'est pas, c'est-à-dire quel étage a signé, ce que le check a rendu et ce qu'un plafond a épuisé, et vous savez citer la propriété du harnais que la preuve à blanc établit et celle qu'elle n'établit pas.

La première moitié demande d'avoir lu un rapport de `deliver` plutôt que son dernier mot, la seconde d'avoir fait tourner la preuve soi-même, et ni l'une ni l'autre ne se remplit de mémoire.
:::

## Les pièges

**Tout paralléliser.** Deux coders concurrents écrivent dans le même arbre, et le fan-out a un coût fixe que l'exploration seule amortit rarement : la comparaison chiffrée de ce module a mesuré un gain de 3 secondes sur 134. Le parallélisme se mesure avec `busyMs` contre `wallMs` avant d'être généralisé.

**Oublier `timeoutMs`.** C'est le seul garde-fou sans valeur par défaut : un tour peut boucler sur un outil halluciné jusqu'à des centaines de milliers de tokens, et aucun plafond d'itérations ne borne l'intérieur d'un tour.

**Lire `approved: true` comme « le ticket est fait ».** Le verdict agrège une signature et un check, et le check ne sait que ce que la suite contraint. Une livraison qui change la signature demandée par le ticket passe le gate tant qu'aucun test ne la contraint, et le remède est un test de plus plutôt qu'un rôle de plus.

**Lire `ok` comme une réussite.** `ok` dit que les tours ont tourné. Un `loop` peut être `ok` et non convergé, un `deliver` `ok` et non approuvé, et c'est `converged` et `approved` qui portent la réponse.

**Croire que le pair verrouille la livraison.** Le verdict final agrège l'audit et le check ; un pair non convergé se lit dans le rapport, il ne bloque pas. Si votre politique l'exige, écrivez-la dans le code appelant.

**Laisser un rôle imposer sa forme à l'appelant.** Un plan que l'appelant ne sait pas analyser et un verdict qu'il ne sait pas lire échouent tous deux en silence côté agent ; c'est le parseur qui vous le dira, avant le travail pour le plan, au prix d'un run pour le verdict.

**Prendre `/run` pour une version sûre de `/build`.** `/run` retire l'interview et l'arrêt de commit, rien d'autre : toute écriture d'une étape reste dans l'arbre, et ce qu'un agent peut faire reste décidé par sa panoplie.

**Vérifier le mécanisme à coups de répétitions.** Vingt runs de modèle pour constater qu'un gate arrête un test rouge coûtent des tokens là où une preuve à blanc rend le même verdict en une seconde, et la dispersion du modèle brouille ce qu'on voulait observer. Les répétitions servent à mesurer le modèle, et le code s'inspecte.

## Pour aller plus loin

- Anthropic, [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents), la distinction workflows / agents dont les combinateurs de ce module sont une mise en œuvre, et les motifs (chaînage, routage, parallélisation, orchestrateur-workers, évaluateur) dans leur forme générale.
- [La documentation de combo](https://github.com/AI-for-dev/combo/tree/main/docs) : les pages workflows, pipelines et « Deliver a change », ainsi que `docs/decisions.md`, qui consigne les décisions de conception et celles qui ont été annulées, une pratique à copier.
- [herdr](https://herdr.dev), pour regarder un `deliver` travailler : un volet par sous-agent, le pair et l'audit visibles pendant qu'ils tournent.
- Le `NEXT.md` de combo, qui liste ce qui reste à faire et les pièges déjà rencontrés : chaque défaut découvert y devient un test.
