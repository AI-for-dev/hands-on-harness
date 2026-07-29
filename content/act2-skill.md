# Les skills : une capacité que le modèle peut ignorer

::: tip Objectifs de ce module
- Savoir ce qu'est un skill sur Pi, et surtout ce qu'il n'est pas
- Écrire un skill qui rende des faits exploitables plutôt qu'un avis
- Mesurer si le modèle s'en sert réellement, et constater que ça ne va pas de soi
- Savoir reconnaître le moment où une suggestion ne suffit plus et où il faut une garantie
:::

Le module précédent a épuisé ce qu'on gagne en s'y prenant mieux : choisir un modèle, régler un curseur, écrire un prompt, tenir un fichier de règles. Nous passons maintenant à ce qui s'ajoute au harnais sous forme de code. Le skill est la plus petite de ces briques, la plus facile à écrire, et celle dont l'efficacité réelle est la plus surprenante.

Nous suivons l'ordre habituel : comprendre ce qu'est un skill dans le harnais, en écrire un sur une vraie question, puis mesurer s'il sert à quelque chose.

## Comprendre

### Deux mécanismes que tout le monde confond

Pi expose deux façons d'ajouter une capacité, et elles n'ont presque rien en commun.

Un **skill** est un fichier `SKILL.md` posé dans `.pi/skills/<nom>/`, au format du standard ouvert [Agent Skills](https://agentskills.io). C'est du markdown : un frontmatter et des instructions. Il n'a ni schéma d'entrée, ni fonction d'exécution, ni garde de permission.

Une **extension** est un module TypeScript posé dans `.pi/extensions/`, qui appelle `pi.registerTool({ name, ... })`. Là, on a un vrai outil : un nom, une description, un schéma JSON, une fonction, et la possibilité d'intercepter les appels d'outils pour y insérer une permission.

La confusion coûte cher, parce que la littérature sur les outils d'agents décrit l'anatomie d'un outil — nom, description lue par le modèle, schéma d'entrée, fonction d'exécution, permission entre la validation et l'exécution — et que le skill n'en réalise que les deux premiers éléments.

::: danger `allowed-tools` n'existe pas
On lit souvent qu'un skill déclare les outils qu'il s'autorise via un champ `allowed-tools` dans son frontmatter. Vérifiez avant de le croire.

Le type que Pi 0.80.6 lit effectivement est celui-ci :

```ts
export interface SkillFrontmatter {
    name?: string;
    description?: string;
    "disable-model-invocation"?: boolean;
    [key: string]: unknown;
}
```

Trois champs. La chaîne `allowed-tools` apparaît **zéro fois** dans l'intégralité du paquet, alors que `disable-model-invocation` y est bien lue. Le `[key: string]: unknown` accepte silencieusement tout ce que vous ajouterez, sans jamais s'en servir ni vous prévenir.

C'est exactement le piège du `--thinking medium` du module précédent, sous une autre forme : **un champ accepté n'est pas un champ lu**. Un skill n'a donc aucun mécanisme de permission propre, et si vous en voulez un, il faut une extension.

Le comble est que la documentation officielle renvoie à un fichier `docs/skills.md` qui n'est pas livré avec le paquet. Nous avons dû lire le code pour établir ce qui précède, et c'est un réflexe à prendre.
:::

### Ce que le modèle voit de votre skill

Un point de mécanique décide de tout le reste. Pi injecte dans le prompt système, **à chaque tour**, le nom, la description et le chemin de chaque skill disponible :

```
The following skills provide specialized instructions for specific tasks.
Use the read tool to load a skill's file when the task matches its description.

<available_skills>
  <skill>
    <name>profile</name>
    <description>Measures where the per-frame JavaScript time actually goes...</description>
    <location>/chemin/vers/.pi/skills/profile/SKILL.md</location>
  </skill>
</available_skills>
```

Le **corps** du `SKILL.md`, lui, n'est pas dans le contexte : le modèle doit décider de l'ouvrir avec l'outil de lecture. Deux conséquences.

La première est que la description est la **seule** chose sur laquelle le modèle s'appuie pour décider s'il vous lira. Tout le soin qu'on met dans le corps du skill ne sert à rien si la description ne déclenche pas.

La seconde est qu'un skill ne coûte presque rien tant qu'il n'est pas déclenché, ce qui rend tentant d'en accumuler. La contrepartie est que chaque description ajoutée entre dans la zone cacheable du contexte à chaque tour, et que vingt skills font un préambule.

::: info Exercice (en salle)
Installez un skill quelconque, ouvrez une session, exportez-la avec `\export`, et cherchez le bloc `<available_skills>` dans le prompt système. Comparez ce qui y figure et ce qui n'y figure pas.

Puis posez au modèle une question que votre skill devrait couvrir, et regardez dans `\tree` s'il a lu le fichier. C'est cette lecture, et rien d'autre, qui signale qu'un skill a servi.
:::

## Reconstruire

### La question : le ticket #2 a-t-il raison ?

Le module précédent a passé quatre-vingts exécutions sur l'issue #2 de NÉON, qui affirme que « la collision scanne toutes les briques à chaque frame » et demande que ça cesse. Aucun agent, dans aucune configuration, n'a jamais vérifié cette affirmation avant d'y obéir.

C'est notre sujet. Nous allons écrire la capacité qui permet de la vérifier, et découvrir ce que ça change — ou non.

### Un micro-banc correct tient à quatre exigences

Chronométrer du JavaScript est un exercice où l'on obtient très facilement un chiffre faux qui a l'air juste. Quatre précautions sont nécessaires, et en sauter une suffit.

L'**échauffement**, d'abord : les premiers appels d'une fonction sont interprétés, et l'optimiseur ne la compile qu'après l'avoir vue tourner. Mesurer sans échauffer, c'est mesurer un régime dans lequel le code ne passera jamais en production.

Un **puits**, ensuite : le résultat de chaque appel doit être accumulé dans une variable lue à la fin. Sans cela, l'optimiseur a le droit de supprimer un calcul dont personne ne consomme le résultat, et vous chronométrez une boucle vide.

Des **répétitions**, puisqu'un échantillon unique mesure l'humeur de la machine — c'est la leçon du module précédent, et elle vaut pour les nanosecondes comme pour les dollars.

Une **médiane** plutôt qu'une moyenne, parce que la moyenne suit les valeurs extrêmes et que les valeurs extrêmes d'un chronométrage sont des interruptions du système d'exploitation.

::: info Exercice (en salle)
Avant de lire le script, demandez au modèle de mesurer lui-même le coût du scan de collision, puis relisez le banc qu'il écrit et cherchez-y les quatre exigences.

Nous avons fait l'expérience en préparant ce module, en nous attendant à un bench naïf et faux. Le résultat nous a démentis : trois exécutions du bench improvisé donnent 0,000092, 0,000076 et 0,000075 ms par frame, et la méthode correcte donne 0,000087 ms. **Le même chiffre.** L'optimiseur de V8 n'avait rien supprimé, et l'improvisation tombait juste.

Gardez ce résultat en tête : nous voulions ouvrir ce module sur l'incompétence du modèle en matière de mesure, et la mesure nous a dit qu'il était compétent.
:::

### Le profileur

Le voici en entier. Il ne rend que des faits — durée médiane par poste, part du budget de frame, croissance avec le nombre de briques — et ne dit jamais quoi corriger. Comme le banc du module précédent, il concentre en un seul endroit ce qu'il faut réécrire pour un autre dépôt : la fonction `postes()`, en bas de fichier.

<<<@/../scripts/skills/profile/profile.mjs{js}

Un mot sur le choix de langue, qui n'est pas une inadvertance. Le banc du module précédent est en Python parce qu'il appartient à l'outillage de la formation ; ce profileur est en JavaScript parce qu'il importe `game/neon.js`. **Le script d'un skill parle la langue du code qu'il mesure**, et c'est une contrainte, pas une préférence.

### Ce que le profil dit du ticket #2

```bash
node .pi/skills/profile/profile.mjs --scale
```

Sur NÉON, à 60 Hz, le budget d'une frame est de 16,67 ms :

| poste                 | médiane (ms) | % du budget | % du JS de la frame |
| --------------------- | ------------ | ----------- | ------------------- |
| carte de halo         | 3,8908       | **23,34 %** | **99,99 %**         |
| liste des émetteurs   | 0,000124     | 0,00074 %   | 0,0032 %            |
| scan de collision     | 0,000064     | 0,00038 %   | 0,0016 %            |
| physique (`step`)     | 0,0000086    | 0,00005 %   | 0,00022 %           |
| test de fin de niveau | 0,0000038    | 0,00002 %   | 0,0001 %            |

Et la croissance avec le nombre de briques :

| poste                 | croissance                | briques pour 1 % du budget | briques pour le saturer |
| --------------------- | ------------------------- | -------------------------- | ----------------------- |
| scan de collision     | ×662 pour ×1000 briques   | 131 946                    | 13 194 603              |
| test de fin de niveau | plat                      | ne suit pas le nombre de briques | —                 |
| carte de halo         | ×87,9 pour ×100 briques   | 2                          | **181**                 |

Trois faits en découlent, et le premier suffit à trancher le ticket.

**La collision ne coûte rien.** Elle représente 0,0016 % du travail JavaScript d'une frame, et il faudrait **131 946 briques** pour qu'elle atteigne un centième du budget. Le jeu en livre quarante. La moitié « performance » du ticket #2 demande d'optimiser cinq dix-millièmes de pourcent d'une frame.

**Le coût réel est ailleurs, et aucun ticket n'en parle.** La carte de halo de `game/bloom.js` pèse 99,99 % du travail JavaScript par frame et près d'un quart du budget à 60 Hz — la moitié sur un écran à 120 Hz, où le budget tombe à 8,33 ms. Le jeu ne trahit rien : il tient ses images sans saccade, et rien dans le backlog ne mentionne ce fichier.

**Le vrai risque d'échelle est là aussi.** Le halo remplit une frame entière de 60 Hz dès **181 briques**, contre treize millions pour la collision. Si NÉON grossit, c'est le halo qui cassera, et c'est la collision qu'on nous demande d'optimiser.

::: info Exercice (en salle)
Lancez le profileur, puis écrivez la note de triage qui clôt la moitié performance de #2 : la mesure, le seuil, et le refus motivé. Écrivez-la dans `ISSUES.md`, là où le prochain lecteur du backlog la trouvera.

Puis ouvrez une issue #7 pour le halo, avec son coût mesuré et l'échelle de corrections ci-dessous. **L'aboutissement d'un profilage est une décision de triage, pas un rapport de plus.**
:::

### Ce que le modèle propose, et ce qu'il ne propose pas

Le profileur ne dit pas quoi corriger : c'est le travail du modèle, et c'est la frontière que ce module veut faire sentir. Voici l'échelle des corrections du halo, mesurée sur la même carte de 160×120 :

| étape                                             | médiane/frame | % du budget | gain cumulé |
| ------------------------------------------------- | ------------- | ----------- | ----------- |
| tel que livré                                     | 3,596 ms      | 21,6 %      | 1×          |
| `Math.hypot` → distance au carré                  | 0,822 ms      | 4,9 %       | 4,4×        |
| + rayon de coupure à 140 px                       | 0,235 ms      | 1,4 %       | 15,3×       |
| + contribution statique des briques mise en cache | 0,033 ms      | 0,2 %       | **109×**    |

La première marche mérite un mot, parce que c'est une faute qu'on rencontre partout. Le code calcule `Math.hypot(dx, dy)` pour obtenir une distance, puis la remet au carré dans la formule de décroissance : il paie une racine carrée pour l'annuler aussitôt. Et `Math.hypot` est particulièrement lent, parce qu'il effectue une mise à l'échelle pour éviter les débordements dont ce code n'a aucun besoin.

Nous avons demandé à quatre agents ce qui coûtait cher dans une frame, sans leur donner le skill pour l'un d'eux et avec pour les trois autres. Les quatre ont désigné `computeGlow` correctement, **par simple lecture du code** : une triple boucle de 787 200 itérations par frame, ça se voit. Et les quatre ont proposé les trois premières corrections du tableau.

**Aucun des quatre n'a proposé la quatrième**, celle qui porte le gain de 15× à 109×. Elle ne se lit pas dans la boucle : elle demande de remarquer que quarante des quarante et un émetteurs sont des briques immobiles, et que seule la balle bouge. C'est un fait sur le jeu, pas sur le code.

Leurs chiffres, quand ils s'en risquent, sont lâches : l'un annonce que le halo coûte « ~5-8 ms » là où la mesure donne 3,9 ms, un autre estime le gain du `Math.hypot` à « ×2 à ×3 » là où il vaut 4,4×.

::: warning Ce que ce module a cessé de prétendre
Nous voulions écrire que lire le code trouve ce qui *a l'air* cher et que mesurer trouve ce qui l'*est*. C'est faux sur ce cas, et la mesure nous l'a dit avant vous : la lecture a trouvé le bon coupable quatre fois sur quatre.

Ce qui reste vrai est plus étroit et plus utile. Le modèle **trouve** le point chaud, **classe mal** les corrections, **rate** celle qui demande de raisonner sur le domaine, et **chiffre à la louche**. Le profileur ne le remplace pas : il le corrige sur les trois derniers points.
:::

### Le `SKILL.md`

Reste à écrire le fichier qui décide si tout ce qui précède servira un jour. Le corps donne la marche à suivre et, surtout, **ce qu'il faut faire du chiffre** : rapporter la part mesurée de tout poste que le ticket accuse, y compris et surtout quand la réponse est « trop petit pour compter ».

<<<@/../scripts/skills/profile/SKILL.md{md}

::: info Exercice (en salle)
Écrivez la description avant de lire la nôtre, puis comparez. C'est la seule ligne du fichier que le modèle lira à coup sûr, et c'est donc la seule dont la formulation compte.

Un critère utile : votre description dit-elle **quand** s'en servir, ou seulement **ce que** l'outil fait ? Les deux formulations paraissent équivalentes à la relecture. La section suivante mesure si elles le sont.
:::

### Est-ce que le modèle s'en sert ?

Nous avons donné le ticket #2 à cinq configurations, dix fois chacune, avec le même prompt que le banc du module précédent — celui qui affirme que la collision est lente et ordonne de la corriger. Les colonnes comptent ce que l'agent a **réellement fait** : ouvert le `SKILL.md`, exécuté le profileur, chronométré quoi que ce soit, et contesté la moitié performance du ticket.

| cellule                          | n  | skill lue | profileur lancé | a mesuré  | refuse la moitié perf |
| -------------------------------- | -- | --------- | --------------- | --------- | --------------------- |
| sans skill                       | 10 | —         | —               | **0/10**  | 0/10                  |
| description mécanique            | 10 | 0/10      | 0/10            | **0/10**  | 0/10                  |
| description précise              | 10 | 2/10      | 2/10            | **2/10**  | 0/10                  |
| précise + règle dans `AGENTS.md` | 10 | 4/10      | 2/10            | **2/10**  | 0/10                  |
| portail d'extension              | 10 | 0/10      | **10/10**       | **10/10** | **2/10**              |

La description « mécanique » décrit ce que le script *fait* — *« Runs profile.mjs and prints a table of per-frame timings for the game »* — là où la « précise » dit *quand* s'en servir. La dernière ligne, le portail, est le sujet de la section suivante.

Quatre résultats, et trois font mal.

**Sans la capacité, le modèle ne mesure jamais.** Zéro sur dix, et pas une seule tentative d'écrire son propre banc. Le ticket affirme un coût, l'agent le croit et obéit.

**Une description qui décrit l'outil ne déclenche rien.** Zéro sur dix, exactement comme si le skill n'existait pas. La description gouverne bien l'usage — et une description mécanique le gouverne vers zéro. C'est le seul endroit de ce module où la littérature avait raison, et elle avait raison dans le mauvais sens : on ne parle pas assez de ce qu'une mauvaise description **annule** l'outil qu'elle décrit.

**Une bonne description ne suffit pas.** Deux sur dix. C'est mieux que rien et c'est inutilisable : huit fois sur dix, la capacité que vous venez d'écrire dort pendant que l'agent optimise à l'aveugle.

**La règle dans l'`AGENTS.md` crée de la curiosité, pas de l'action.** Elle fait **ouvrir** le `SKILL.md` deux fois plus souvent — 4/10 contre 2/10 — sans faire **lancer** le profileur davantage : 2/10 de part et d'autre. L'agent va lire la notice, puis passe à autre chose. C'est un résultat que nous n'attendions pas et qui se défend : la règle attire l'attention sans changer la décision.

**Et même après avoir mesuré, l'agent ne se sert presque jamais du chiffre.** Sur les quatre premières cellules, zéro sur quarante contestent la moitié performance du ticket, y compris les quatre qui ont vu le profil. Ils ont lu que le scan pesait 0,0016 % d'une frame, puis ont fait le refactor sans le mentionner, alors que le corps du `SKILL.md` leur demande explicitement de rapporter la part mesurée de tout poste accusé.

::: danger Le résultat central de ce module
Le skill est bien écrit, son script est correct, son chiffre est décisif, et le modèle l'ignore **huit fois sur dix**. Quand il ne l'ignore pas, il n'en tire rien.

**Un skill est une suggestion, pas une garantie.** Vous avez ajouté une capacité au harnais ; vous n'avez pas ajouté un comportement. La différence est invisible tant qu'on ne mesure pas — c'est précisément pour ça qu'on mesure, et c'est ce qui sépare une brique de harnais d'une bonne intention.
:::

::: warning Nous avons mesuré deux fois pour rien, et voici pourquoi
Notre première version de ce tableau donnait 2/10 pour la description mécanique **comme** pour la précise, et nous en avions conclu que la description ne gouvernait rien. C'était faux, et la cause est un drapeau.

Nous avions recopié les options du banc du module précédent, qui contient `-ns`. Or `-ns` vaut `--no-skills` : *« Disable skills discovery and loading »*. Les skills n'étaient donc **jamais chargés**, aucune description n'atteignait le prompt système, et les 2/10 étaient des agents qui étaient tombés sur `.pi/skills/profile/SKILL.md` en explorant le dépôt avec `ls`, comme sur un fichier ordinaire.

Le drapeau est parfaitement à sa place dans le banc du 2.1, qui exclut délibérément les skills de ses mesures. Il était exactement à contre-emploi dans une mesure *sur* les skills. Quatre-vingts exécutions perdues, 0,35 $.

C'est le piège du `--thinking medium`, pour la troisième fois dans cette formation, et cette fois c'est nous qui sommes tombés dedans. **Relisez les drapeaux que vous recopiez d'un banc à l'autre** : ils encodent les hypothèses de la mesure d'origine, pas de la vôtre.
:::

### Du skill au hook : de la suggestion à la garantie

Si le comportement compte, il ne faut pas le suggérer. Une extension peut faire deux choses qu'un skill ne peut pas : enregistrer un **vrai** outil, avec son schéma d'entrée validé et sa fonction d'exécution, et **intercepter** les appels d'outils pour les bloquer.

La seconde est celle qui nous intéresse. Le hook `tool_call` reçoit chaque appel avant exécution et peut retourner `{ block: true, reason }`. Nous en faisons un portail : la première tentative de modifier une source du jeu est bloquée, le profil est mesuré à cet instant, et ses chiffres sont rendus au modèle **dans le motif du refus**. Les modifications suivantes passent.

<<<@/../scripts/extensions/profile-gate.ts{ts}

Le résultat est sans ambiguïté : **10/10**. Le modèle ne peut plus optimiser sans avoir vu la mesure, non parce qu'on l'a prié de la lire, mais parce que le harnais refuse tant qu'elle n'est pas là. Et c'est la seule des cinq cellules où un agent conteste le ticket — deux fois sur dix, ce qui est peu, mais infiniment plus que zéro sur quarante.

Notez la colonne « skill lue » du portail : **0/10**. Le modèle n'a jamais ouvert le `SKILL.md`, et il a mesuré dix fois sur dix. La capacité n'avait pas besoin d'être choisie, seulement d'être imposée.

::: info Exercice (en autonomie)
Reprenez le portail et déplacez sa condition. Bloquez sur autre chose : une modification de `game/bloom.js` sans profil récent, un `git commit` sans tests verts, une écriture hors du périmètre du ticket.

Vous venez d'écrire votre premier mécanisme déterministe de harnais. Le module sur les permissions généralisera le procédé — un hook qui bloque est un hook qui bloque, que ce soit pour exiger une mesure ou pour refuser la lecture d'un secret.
:::

::: warning Ce que le portail ne règle pas
Deux sur dix seulement contestent le ticket, alors que les dix ont le chiffre sous les yeux. Garantir la **mesure** ne garantit pas la **conclusion**.

Nous ne savons pas encore combler cet écart avec un hook, parce qu'un hook sait bloquer une action et non exiger un raisonnement. Ce qu'il faudrait ici est un relecteur indépendant, à qui l'on demande « le diff est-il justifié par le profil ? » — et c'est le sujet des modules sur la délégation et les workflows. Le harnais ne se termine pas à cette brique.
:::

## Généraliser

**Un outil rend des faits, le jugement reste au modèle.** Le profileur ne dit jamais quoi corriger, et c'est ce qui le rend réutilisable : un seuil codé en dur (« au-delà de 5 % du budget, proposer un index spatial ») répondrait à la question « est-ce que ça *ressemble* à un goulot » plutôt qu'à « est-ce que c'en est un », et serait spécifique à un dépôt. Séparez la mesure de l'avis, et gardez l'avis du côté qui sait raisonner.

**Une capacité que le modèle peut ignorer n'est pas une brique de harnais.** C'est la leçon que ce module a payée en cent trente exécutions. Un skill bien décrit fait passer la mesure de 0/10 à 2/10 ; un hook la fait passer à 10/10. Quand le comportement est indispensable — mesurer avant d'optimiser, lancer les tests avant de livrer, refuser la lecture d'un secret — il faut un mécanisme déterministe, pas une invitation en markdown. Gardez les skills pour ce qui est utile quand le modèle y pense, et les hooks pour ce qui doit arriver même quand il n'y pense pas.

**Une mauvaise description n'affaiblit pas un outil, elle l'annule.** 0/10 contre 2/10 : la description qui dit ce que le script fait vaut exactement autant que l'absence de skill. On répète volontiers que la description gouverne l'usage ; on dit moins souvent qu'elle peut le gouverner jusqu'à zéro.

**Garantir la mesure ne garantit pas la conclusion.** Le portail met le chiffre sous les yeux du modèle dix fois sur dix ; il en tire la bonne conclusion deux fois. Un hook contraint une action, il n'impose pas un raisonnement — ce qui borne précisément ce qu'on peut attendre de cette brique, et annonce celles qui suivent.

**Un champ accepté n'est pas un champ lu.** `allowed-tools` n'existe pas dans Pi, et le frontmatter l'avale sans broncher. Vous rencontrerez la même chose ailleurs, d'autant plus facilement que la documentation renvoie parfois à des fichiers absents. Le code est la seule source qui ne se trompe pas.

**Le contenu du dépôt est peut-être un levier de harnais.** Il ne figure sur aucune liste de réglages. L'arrivée de `game/bloom.js` coïncide avec un passage de 4/20 à 10/20 sur la moitié performance du ticket #2, ce qui donne p ≈ 0,10 : suggestif, pas établi, et nous le laissons ouvert. Retenez la question plutôt que la réponse — ce que votre dépôt raconte à l'agent avant qu'il ne lise votre ticket est un paramètre, et vous ne l'avez pas choisi.

**Mesurer sert autant à démolir ses idées qu'à les confirmer.** Ce module s'est ouvert sur deux thèses que la mesure a tuées, et le module précédent a publié six conclusions fausses. C'est le fonctionnement normal du travail expérimental, et le seul moyen de ne pas s'en apercevoir est de ne pas mesurer.

## Livrable

Quatre pièces.

**1. Le skill `profile`**, dans `.pi/skills/profile/`, avec sa description écrite par vous et son script fonctionnel.

**2. La note de triage sur #2** dans `ISSUES.md` : la mesure, le seuil, le refus motivé.

**3. L'issue #7** sur le halo : coût mesuré, part du budget, échelle de corrections chiffrée.

**4. La ligne « outils » de la fiche de décision** :

| levier                         | effet mesuré | adopté ? | pourquoi |
| ------------------------------ | ------------ | -------- | -------- |
| skill (markdown)               |              |          |          |
| description du skill           |              |          |          |
| règle de déclenchement dans `AGENTS.md` |     |          |          |
| outil d'extension              |              |          |          |
| hook de déclenchement          |              |          |          |

::: tip Critère de réussite
Vous savez dire à quelle condition vous écririez un skill plutôt qu'un hook, et vous savez citer le chiffre qui vous a fait choisir.

Ce critère est impossible à satisfaire de mémoire : il demande d'avoir vu un skill correct être ignoré.
:::

## Les pièges

**Croire qu'ajouter une capacité ajoute un comportement.** Le skill existe, il est bon, et il ne sert pas. C'est le piège principal de ce module et il est invisible sans mesure.

**Soigner le corps du `SKILL.md` en négligeant la description.** Le corps n'est lu que si la description a déclenché. L'inverse n'est pas vrai.

**Faire décider le script.** Un seuil codé en dur transforme un outil de mesure en outil d'opinion, et une opinion codée en dur ne se discute pas.

**Chronométrer sans échauffement, sans puits, sans répétitions ou en moyenne.** Quatre façons d'obtenir un chiffre faux qui a l'air juste.

**Obéir à un ticket qui affirme un coût.** Un ticket est une donnée, y compris quand il est écrit par un collègue compétent, et y compris quand il est écrit par vous six mois plus tôt.

**Accumuler les skills.** Chacun est bon marché tant qu'il dort, mais leurs descriptions entrent toutes dans le contexte à chaque tour.

## Pour aller plus loin

- [Agent Skills](https://agentskills.io), le standard ouvert que Pi implémente, et sa page sur l'intégration dans un prompt système.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- Schick et al., [Toolformer](https://arxiv.org/abs/2302.04761), sur l'idée qu'un modèle apprenne quand et comment appeler un outil — à lire en gardant en tête nos 2/10.
- Yao et al., [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629), la boucle qui alterne raisonnement et action.
- La [documentation des extensions de Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), pour la suite du module.
