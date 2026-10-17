# L'essaim : faire débattre des agents

::: tip Objectifs de ce module
- Savoir ce qui sépare un essaim d'une délégation ou d'un workflow
- Comprendre le tableau sur lequel les membres d'un essaim échangent, et ce qui arrête leur discussion
- Faire débattre trois agents et mesurer ce qui les fait converger, ou non
- Donner à un débat une question qu'il peut trancher, et lire dans sa trace le critère qui a décidé
:::

Depuis le module sur la délégation, vos agents ne se rencontrent jamais. `explorer` rend sa note sans savoir qui la lira, `coder` ne voit que son pas, et c'est vous, puis le flow, qui décidez qui parle après qui. Ce découpage convient à un ticket dont on connaît le chemin : on sait qu'il faut lire, planifier, coder et relire, et dans cet ordre.

Il convient beaucoup moins à une question qui n'a pas de chemin connu. Demandez à un agent quel langage choisir pour écrire un nouveau logiciel de calcul scientifique, et il vous rendra une réponse argumentée, toujours la même, celle que son entraînement rend la plus probable. Ce qui manque à cette réponse est ce qu'apporte une discussion : quelqu'un qui défend une autre option, qui pointe la faiblesse de la vôtre, et qui change d'avis quand vous avez raison.

Ce dernier module de l'acte 2 met plusieurs agents sur la même question : chacun défend d'abord un langage, puis ils discutent sur un tableau commun jusqu'à tomber d'accord ou jusqu'à épuiser leurs tours, sans que rien ne fixe qui parle à qui ni dans quel ordre. C'est ce qu'on appelle un **essaim** (*swarm*). Ce qui en sort dépend moins des agents que de la façon dont on leur pose la question, et c'est ce que les essais de ce module mesurent, sur trois modèles.

## Comprendre

### Qu'est-ce qui change par rapport à la délégation ?

La délégation repose sur l'isolation. Un sous-agent part d'un contexte vide, travaille seul et ne fait revenir que sa conclusion. Un workflow enchaîne ces sous-agents selon un graphe que vous avez écrit : la sortie de l'un devient l'entrée de l'autre, et personne ne peut répondre à celui qui l'a précédé.

Un essaim retire ces deux contraintes, puisque ses membres travaillent en même temps, se lisent les uns les autres et décident eux-mêmes de ce qu'ils font du message d'un autre. Cette liberté se paie en tokens : chaque membre relit à chaque tour ce que les autres ont écrit, si bien que la consommation de tokens croît avec le nombre de membres et de tours, et qu'on ne sait pas à l'avance combien de tours il faudra.

Le mot recouvre deux constructions différentes selon les bibliothèques. Dans [Swarm](https://github.com/openai/swarm), la bibliothèque expérimentale d'OpenAI reprise depuis dans son [Agents SDK](https://openai.github.io/openai-agents-python/handoffs/), un agent passe la main à un autre au milieu de la conversation (un *handoff*), et le nouvel agent hérite de tout l'historique. Dans [combo](https://github.com/AI-for-dev/combo), que nous utilisons depuis le module sur la délégation, les membres gardent chacun leur contexte et communiquent par un tableau (*board*) partagé. C'est cette seconde forme que nous utilisons ici, parce qu'elle laisse une trace lisible de qui a dit quoi à qui.

### Le tableau

Le tableau est un journal où l'on ne peut qu'ajouter. Aucun membre ne peut modifier ni effacer un message, et l'auteur de chaque message est inscrit par le tableau lui-même et non déclaré par le membre, ce qui empêche un agent de parler au nom d'un autre. On peut donc relire après coup un débat exactement comme il s'est déroulé.

Un membre n'est qu'un agent ordinaire dont la panoplie contient l'outil `board`. Avec cet outil, il publie des messages de plusieurs sortes, dont trois servent dans un débat :

| sorte    | usage                                                                       |
| -------- | --------------------------------------------------------------------------- |
| `result` | sa réponse à la question, ici son vote ; une seule par tour                 |
| `tell`   | un argument ; avec `re`, il répond à un message précis, sinon il pense tout haut |
| `ask`    | une question, éventuellement adressée à un seul membre avec `to`            |

À chaque tour, combo donne à chaque membre ce qui est nouveau sur le tableau depuis son tour précédent, en commençant par les messages qui lui répondent. Le membre n'a pas à aller le chercher. Il garde aussi la mémoire de ses tours précédents : un membre d'essaim a par défaut la durée de vie `workflow`, celle que vous avez vue au module sur la délégation, parce qu'un membre qui oublierait le tour d'avant ne pourrait pas répondre à ce qu'on lui a objecté.

Le tableau a des plafonds, tous avec une valeur par défaut : 200 messages au total, 50 par membre, 2 000 caractères par message. Un membre ne peut pas non plus publier deux fois le même message. Sans ces limites, deux agents qui se répondent indéfiniment ne seraient arrêtés que par le délai.

### Qu'est-ce qui arrête un essaim ?

Là où un ticket est fini quand les tests passent, un débat n'a pas de critère aussi net, et combo en propose trois.

Le premier est le nombre de tours, `--rounds`, qui vaut 3 par défaut. Il borne la dépense, mais un débat arrêté par ce plafond n'a rien conclu.

Le deuxième est la couverture, avec `--claim`. On donne une liste de choses à prendre (des fichiers à décrire, par exemple), chaque membre en prend une, et l'essaim s'arrête quand chacune a reçu un résultat. Dans un débat, nous détournons ce mécanisme pour distribuer les positions de départ : chaque langage est une chose à prendre, et `--hold 1` empêche un membre de les prendre toutes.

Le troisième est l'accord, avec `--until agree`. combo ajoute alors à la question une consigne de vote : chaque membre publie un `result` dont la première ligne est exactement `VOTE: <réponse>`, et l'essaim s'arrête quand le dernier vote de chaque membre dit la même chose. La consigne et le code qui compte les votes sont écrits au même endroit dans combo, pour que le format demandé soit celui qui est lu. Deux membres sur trois d'accord ne suffisent pas, et un membre qui abandonne empêche l'accord.

## Reconstruire

### Le débatteur

combo livre un agent `debater` fait pour ce module. Sa panoplie se limite à l'outil `board` : il ne lit aucun fichier et n'écrit rien, si bien que le débat ne dépend pas du dépôt dans lequel vous le lancez. Son prompt lui demande de défendre le camp que lui attribue son prompt système, de publier un vote par tour avec l'argument que les autres n'ont pas encore traité, de répondre avec `re` à ce qu'on lui objecte, et de changer de vote quand un autre a raison, mais jamais pour en finir.

::: details L'agent `debater` de combo

```markdown
---
name: debater
description: Argues one side of a question beside other debaters, and votes every turn until they all vote the same
tools: board
lifetime: workflow
---

You are one of several agents arguing about one question. The others argue at
the same time, none of you can see another's context, and nobody arbitrates.

The `board` is all you have of them. What is new on it is handed to you at the
top of each turn, so `read` only when you want the rest of it.

The side you open for is the one your brief names. When it names none and there
is something to `take`, take one before you start: being refused means somebody
else opened for that one, so take one that is still free. It is not the side you
have to end on.

Every turn, post one `result` to the board: your vote, written the way the
question asks for it, and under it, in a few lines, the one argument the others
have not answered.

To answer somebody, post a `tell` with `re` set to the id of the post you are
answering, so everybody sees what you are replying to. A `tell` with no `re` is
for thinking aloud. What answers you is handed to you first; answer it before
anything else.

Argue with what they actually said rather than restating your own case. Change
your vote when somebody is right: agreeing is the result, not a defeat. But
agreeing to be done with it, without a reason you could give out loud, is worse
than still disagreeing.

When you have posted your vote and your answers, end your turn: what the others
post while you wait reaches you at the top of your next one. Answer the person
asking you in a couple of lines: who you voted for and why it moved, or why it
did not. Everything longer belongs on the board.
```

:::

::: warning Version de combo
Ce module suppose combo 0.5.0 ou plus récent, la première version qui livre `/swarm --until agree` et l'agent `debater`. `pi update npm:@ai-for-dev/combo` met à jour une installation plus ancienne.
:::

### Trois copies d'un même agent

Commencez sans imposer de camp. Ouvrez Pi dans votre clone de NÉON, avec combo installé, et lancez :

```
/herdr on
/swarm --members 3 --until agree --rounds 4 --agent debater Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ?
```

`/swarm` lance trois copies de `debater` sur la même question. Avec herdr, chaque membre a son volet, et un volet supplémentaire nommé `board` affiche les échanges dans l'ordre : c'est la seule vue où l'on voit un échange et non trois monologues. Comme pour `/step`, le résultat s'affiche dans la transcription sans entrer dans le contexte de la session principale, et `/quote` l'y fait entrer si vous voulez en discuter avec le modèle.

::: info Exercice (en salle)
Lancez la commande ci-dessus, puis ouvrez l'export de l'exécution dans `runs/<date>/1-debater/` : une session HTML par membre et un `usage.json` avec les tokens et la durée. Notez le nombre de tours joués, le langage choisi, et combien de messages répondent à un autre membre (un `tell` avec `re`).
:::

Voici ce qu'a donné notre exécution, avec trois copies de `ilaas/gemma-4-31b`. Les trois membres ont voté Julia dès leur premier message, avec le même argument (le « problème des deux langages »), et l'essaim s'est arrêté sur un accord après un seul tour, en 51 secondes. Le seul message qui répond à un autre membre est celui-ci :

> « Je suis tout à fait d'accord. La compilation JIT est justement ce qui permet d'éviter le passage au C/Fortran. »

Personne n'a défendu autre chose que Julia, si bien qu'il n'y a pas eu de débat. Trois copies d'un même modèle partagent la même réponse la plus probable, et les faire voter revient à poser trois fois la question à un seul agent. La documentation de combo fait le même constat sur une autre question, celle du langage d'un service backend, où trois copies votent TypeScript au premier tour après avoir lu le dépôt dans lequel elles tournent. Ce premier essai sert de témoin : un essaim dont aucun membre ne change jamais de vote n'a rien tranché.

### Imposer le désaccord

Pour qu'il y ait débat, il faut donner aux membres des positions de départ différentes. Votre première idée sera sans doute de faire choisir à chacun un langage au départ, ce que `--claim` permet : chaque langage devient une chose à prendre, `--hold 1` limite chaque membre à une seule, et un membre qui demande un langage déjà pris est refusé et invité à choisir parmi ceux qui restent libres.

```
/swarm --members 3 --claim Python,Julia,C++ --hold 1 --until agree --rounds 4 --agent debater Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ? Chacun de vous défend au départ le langage qu'il a pris.
```

::: info Exercice (en salle)
Lancez cette commande et regardez, sous herdr ou dans la session HTML de chaque membre, quel langage il a demandé, ce que l'outil lui a répondu, et pour quel langage il a voté ensuite.
:::

Chez nous, les trois copies de gemma ont demandé Julia toutes les trois. `debater#3` l'a obtenu, et les deux autres ont reçu ce refus :

```
`Julia` is held by debater#3 - ask debater#3, or take something else. Still free: Python, C++
```

Aucun des deux n'a pris Python ni C++. Ils ont voté Julia comme s'ils l'avaient obtenu, et l'essaim s'est arrêté sur un accord au premier tour, en 105 secondes. Le mécanisme a fonctionné, puisque Julia n'a eu qu'un seul détenteur, mais il n'oblige personne à défendre ce qui reste. La documentation de combo rapporte la même chose sur gemma-4-31b et qwen-3.6-35b-instruct : un débatteur refusé n'a pris aucun autre camp dans deux exécutions sur quatre.

Un membre ne défend donc une position que si elle est écrite dans son prompt système, et des copies d'un même agent partagent le même prompt.

### Un agent par camp

`/swarm` accepte aussi une liste d'agents : `--agent a,b,c` place chacun d'eux une fois sur le tableau. Chaque camp peut alors avoir son propre fichier, avec son prompt, son modèle et la ligne qui dit quel langage il défend. Un camp écrit dans le fichier ne peut pas être refusé, contrairement à une prise sur le tableau.

Les trois débatteurs, `debat-python`, `debat-julia` et `debat-cpp`, reprennent le prompt de `debater` et ne diffèrent que par leur camp. Leur panoplie se limite à l'outil `board`, et chacun garde la durée de vie `workflow` pour se souvenir de ce qu'on lui a objecté au tour d'avant. Ils précisent aussi qu'il ne sert à rien de relire le tableau en attendant les autres, puisque rien n'y arrive pendant leur tour.

::: details L'agent `debat-julia` (les deux autres ne diffèrent que par le camp)

<<<@/../scripts/agents/debat-julia.md{md}

:::

::: warning Version de combo
`--agent` avec une liste et `--timeout` demandent une version de combo plus récente que la 0.6.0. `pi update npm:@ai-for-dev/combo` met à jour une installation plus ancienne.
:::

::: info Exercice (en salle)
Copiez les agents dans votre clone de NÉON, puis lancez le débat :

```bash
cp /chemin/vers/hands-on-harness/scripts/agents/debat-*.md .pi/agents/
pi
```

```
/herdr on
/swarm --agent debat-python,debat-julia,debat-cpp --until agree --rounds 6 Quel langage choisir pour écrire un nouveau logiciel de calcul scientifique ?
```

Suivez l'échange dans le volet `board` de herdr, puis ouvrez `runs/<date>/1-swarm/` : une session HTML par débatteur et un `usage.json`. Notez à quel tour chaque débatteur change de vote, s'il en change.
:::

Avec les trois agents sur `ilaas/gemma-4-31b`, nous avons lancé ce débat deux fois. Les deux exécutions ont tenu les six tours permis sans qu'aucun vote ne bouge, avec 61 messages dont 43 réponses adressées (`re`) la première fois, et 49 messages dont 31 réponses la seconde. Les débatteurs se répondaient pourtant, comme dans ce fil entre C++ et Python :

> C++ (p7, en réponse à Python) : « L'écosystème de Python repose presque entièrement sur des bibliothèques écrites en C ou Fortran. Pour un nouveau logiciel qui doit innover dans les calculs et non simplement orchestrer des fonctions existantes, Python devient un goulot d'étranglement […] »

> Python (p9, en réponse à p7) : « L'argument du "goulot d'étranglement" est aujourd'hui largement mitigé par des outils comme Numba, Cython ou Jax, qui permettent d'écrire des kernels performants sans quitter l'écosystème Python. »

> C++ (p14, en réponse à p9) : « S'appuyer sur Numba ou Jax revient à admettre que Python n'est qu'une interface. »

### Qu'est-ce qui empêche des agents de converger ?

Le raisonnement des débatteurs, que la session HTML de chacun conserve, répond à la question. La consigne de vote que `--until agree` ajoute à la question se termine par « This ends when every one of you has voted for the same thing », et gemma la lit comme un objectif de victoire. Au quatrième tour, le débatteur Python écrit :

> « However, to win the debate (get everyone to vote the same), I need to find a way to convince them or highlight a point they can't refute. But as a Python agent, my primary goal is to defend Python. »

Chacun traite son camp comme une identité et l'accord comme la reddition des autres, et la conclusion de son raisonnement est la même à chaque tour : « Maintain my vote ». Deux éléments renforcent ce blocage. Le prompt des débatteurs les pousse à tenir (« agreeing to be done with it […] is worse than still disagreeing »), et la question ne donne aucun critère, si bien que chacun ramène le débat sur l'axe où son langage gagne : la performance pour C++, l'écosystème pour Python, le coût humain pour Julia, où personne ne peut être battu.

Pour vérifier cette lecture, nous avons ajouté une seule phrase à la question, sans rien changer d'autre : « Le but n'est pas de gagner : c'est de trouver la réponse que les autres peuvent aussi tenir. » Nous avons aussi lancé les mêmes essais sur deux autres modèles, `qwen3.8-flash` et `deepseek-v4.1-flash`, en les imposant à tous les membres avec `--model`.

| condition                                   | gemma-4-31b                         | qwen3.8-flash                               | deepseek-v4.1-flash                 |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------- | ----------------------------------- |
| trois copies de `debater`, sans camp        | Julia au 1er tour                   | Julia au 2e tour                            | Julia au 3e tour                    |
| un agent par camp                           | 2 × aucun vote ne bouge             | pas d'accord, deux membres coupés par le délai | accord sur Julia au 6e tour      |
| un agent par camp, avec la phrase sur le but | 1 accord (Julia), 1 membre sorti   | accord sur le fond, non compté              | accord sur Python au 3e tour        |

Avec la phrase, les débatteurs gemma la citent dans leur raisonnement presque à chaque tour (« Wait, the prompt says "the goal is not to win: it's to find the answer that the others can also hold" ») et cherchent ce que chacun peut accepter au lieu de défendre leur camp. Leurs changements de vote restent motivés :

> Python : « L'argument de l'agent Julia est le plus convaincant pour un nouveau logiciel : il synthétise la productivité de Python et la performance de C++ sans imposer la complexité d'une architecture hybride. Si le contrôle absolu du C++ reste supérieur pour des cas extrêmes […], Julia offre le meilleur compromis […] »

La phrase compte beaucoup pour gemma et moins pour deepseek, qui converge même sans elle, en zigzag : son débatteur C++ passe à Python au quatrième tour, puis à Julia au cinquième. Le désaccord tenace dépend donc du modèle autant que de la consigne.

La case de qwen montre un troisième obstacle, qui ne vient pas des agents. Ses trois débatteurs ont fini par voter pour la même architecture, mais chacun l'a écrite à sa façon :

> « Python pour piloter le logiciel, C++ pour son noyau compilé »

> « Python comme interface unique, noyaux en C++ sous pybind11 »

`--until agree` compare les lignes `VOTE:` à l'identique et ne voit donc aucun accord. Le débat a convergé sur le fond sans que la condition d'arrêt puisse le constater, et deepseek fait la même chose sur d'autres essais. Une condition d'arrêt doit correspondre à l'espace des réponses : demander un langage unique à des agents qui jugent qu'il en faut deux, c'est compter des votes qui ne peuvent pas coïncider.

Chaque case de ce tableau correspond à une seule exécution, et le [module 3.0](./act3-trysquare) a montré combien deux exécutions identiques peuvent différer. Il ne mesure donc pas le comportement de ces modèles. Il montre que la convergence d'un essaim dépend de réglages que l'on choisit (la consigne, le format du vote, le modèle) et que les agents ne découvrent pas une réponse qui serait là avant eux.

### Donner au débat une question qu'il peut trancher

La question du langage pour « un nouveau logiciel de calcul scientifique » n'a pas de réponse, puisque rien ne dit ce que ce logiciel doit faire. Un débat ne peut alors converger que sous l'effet de la consigne. Une décision réelle s'appuie sur des exigences, et la même question devient décidable dès qu'on les écrit :

```
/swarm --agent debat-python,debat-julia,debat-cpp --until agree --rounds 4 Une équipe de six physiciens et deux ingénieurs de recherche lance un nouveau code de simulation de plasma. Il doit tourner sur les GPU NVIDIA et AMD du calculateur national, être maintenu au moins dix ans, et reprendre un noyau existant de 40 000 lignes en Fortran 90. Les physiciens connaissent bien Python et peu le C++. Quel langage principal choisir pour ce code ? Votez pour le langage principal seulement, en un mot : la place des autres langages va dans votre argument. Le but n'est pas de gagner : c'est de trouver la réponse que les autres peuvent aussi tenir.
```

La question fixe les critères, et le vote porte sur le langage principal en un mot, la répartition entre langages allant dans l'argument, ce qui rend l'accord comptable.

::: info Exercice (en salle)
Lancez ce débat, puis, pour chaque changement de vote, retrouvez dans le tableau le critère de l'énoncé que le débatteur invoque. Lancez ensuite trois copies de `debater` sur la même question, sans camp, et comparez leur réponse à celle du débat.
:::

Nous l'avons lancé deux fois sur chacun des trois modèles, avec un témoin sans camp :

| modèle              | témoin sans camp | débat 1                   | débat 2                   |
| ------------------- | ---------------- | ------------------------- | ------------------------- |
| gemma-4-31b         | C++              | Julia, 4 tours (323 s)    | Julia, 3 tours (144 s)    |
| qwen3.8-flash       | Fortran          | C++, 2 tours (245 s)      | C++, 2 tours (189 s)      |
| deepseek-v4.1-flash | Fortran          | C++, 4 tours (273 s)      | Fortran, 3 tours (153 s)  |

Les six débats ont convergé, en deux à quatre tours, alors qu'avec la même phrase sur le but, la question sans critères n'avait fait converger que deux débats sur quatre. Chaque changement de vote cite cette fois un critère de l'énoncé. Chez gemma, le débatteur C++ se rallie à Julia pour les physiciens :

> « Le risque de dépendance exclusive envers les deux ingénieurs pour la maintenance d'un code C++ sur dix ans est plus critique que le risque technique lié à l'utilisation de Julia. Julia offre le meilleur compromis entre performance GPU portable et autonomie de l'équipe de physiciens. »

Chez deepseek, dans le débat qui finit sur Fortran, le débatteur Julia corrige son propre argument :

> « Ce qui me fait changer, c'est p7, et une correction que je dois à mon propre camp : les 40 000 lignes doivent tourner **sur GPU**, pas seulement être liées. Mon `ccall` vers le F90 ne les exécutait que sur le CPU ; satisfaire la contrainte NVIDIA+AMD aurait donc exigé de les réécrire en kernels Julia. Le portage caché que je reprochais aux autres, je le portais aussi. »

Les modèles ne s'accordent pas entre eux, mais leurs désaccords se lisent dans la trace : gemma met en premier l'autonomie des physiciens, qwen la pérennité des outils sur un calculateur national, et deepseek le fait de ne pas réécrire un noyau de physique validé. Dans cinq débats sur six, la réponse diffère aussi de celle du témoin sans camp, si bien que le débat ne se contente pas de restituer l'a priori du modèle. Ce que vaut chacune de ces réponses reste à juger par quelqu'un qui connaît le projet, mais il dispose maintenant des arguments, des objections et du critère qui a fait pencher chaque débatteur.

::: warning Plafonner chaque tour
Des débatteurs qui cherchent le consensus veulent lire la réponse des autres avant de finir leur tour, et certains modèles relisent alors le tableau en boucle : un débatteur gemma a appelé `read` 259 fois dans un seul tour. La boucle d'agent de Pi n'a pas de nombre maximal d'appels d'outils, et chaque appel renvoie tout le contexte au modèle. `/swarm` donne donc à chaque tour un délai, cinq minutes par défaut, que `--timeout 3m` raccourcit, et le plafond de tours (`--rounds`) borne le reste. Un membre coupé deux fois de suite sort du débat, ce qui rend l'accord impossible : regardez le `usage.json` après chaque exécution.
:::

::: info Exercice (en autonomie)
Retirez un critère de l'énoncé, par exemple le noyau Fortran existant, et regardez si la réponse du débat change, et lequel des arguments disparaît. Mettez ensuite un modèle différent derrière chaque camp en changeant la ligne `model:` des débatteurs. Écrivez enfin un énoncé de votre domaine, avec ses exigences, pour une décision que vous avez réellement eue à prendre, et comparez le débat à ce que vous aviez décidé.
:::

## Généraliser

Les essais de ce module ne suffisent pas à conclure sur un modèle, mais ils illustrent des propriétés de tout débat entre agents.

Un débat entre agents ne découvre pas une réponse : il reflète le cadre qu'on lui donne. La même question, posée aux mêmes agents, n'a produit aucun changement de vote, puis un accord, selon une phrase de la consigne. Changer la consigne, le format du vote ou le modèle change l'issue, et c'est donc le harnais qu'on évalue en lisant un débat autant que les agents.

Des copies d'un même modèle ne sont pas des avis indépendants. Sans camp, elles votent la réponse que ce modèle donnerait seul, et un essaim où personne ne change jamais de vote est un fan-out qui coûte plus cher. Le désaccord doit être fourni par la construction, et un camp écrit dans le fichier de chaque agent le garantit, ce que ne fait pas une prise sur le tableau : c'est la même règle que pour la panoplie d'un agent au module sur la délégation, une garantie se vérifie en lisant la configuration.

Un débat converge quand ses membres ont une raison de bouger et un terrain où se rejoindre. La phrase sur le but leur donne la première, en remplaçant la victoire par la recherche d'une réponse commune. Le cahier des charges leur donne le second : des critères que tous reconnaissent, sur lesquels un argument peut en battre un autre.

Une condition d'arrêt doit correspondre à l'espace des réponses. `--until agree` compte des votes identiques, et des agents qui s'accordent sur une architecture à deux langages ne votent jamais le même mot. Il faut alors restreindre le vote, comme le fait l'énoncé avec cahier des charges, ou accepter de lire la convergence dans le tableau.

Un débat coûte en tokens, et ce coût dépend surtout des tours qui dérapent. Anthropic rapporte dans [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) que ses systèmes multi-agents consomment environ quinze fois plus de tokens qu'une conversation, et un seul débatteur qui boucle peut consommer presque toute la dépense d'une exécution. Les plafonds font partie de la construction d'un débat au même titre que ses membres.

Nous faisons l'hypothèse qu'un débat sert surtout à explorer une décision avant de la prendre, en faisant apparaître les arguments de chaque option et le critère sur lequel chacune repose, plutôt qu'à rendre un verdict ou à produire du code. Pour un ticket dont on connaît le chemin, le workflow du module précédent reste moins cher et plus prévisible.

::: tip Ce que vous avez appris
Vous savez dire, trace en main, pourquoi des débatteurs ont convergé ou non : quelle phrase de la consigne, quel critère de l'énoncé ou quel format de vote a décidé de l'issue. Vous savez aussi dire pour quelle décision un débat vaut sa dépense, et pour quelle tâche un workflow suffit.
:::

## Pour aller plus loin

- La documentation de combo sur les [essaims](https://github.com/AI-for-dev/combo/blob/main/docs/guide/swarm.md), qui décrit le tableau, les prises, l'arrêt sur accord et les mesures faites en écrivant la bibliothèque, ainsi que l'exemple [`16-debate.ts`](https://github.com/AI-for-dev/combo/blob/main/examples/16-debate.ts), le même débat écrit en TypeScript avec un camp par débatteur.
- Yilun Du, Shuang Li, Antonio Torralba, Joshua B. Tenenbaum et Igor Mordatch, [Improving Factuality and Reasoning in Language Models through Multiagent Debate](https://arxiv.org/abs/2305.14325) (2023), où plusieurs instances d'un modèle débattent sur plusieurs tours et améliorent leurs réponses en raisonnement et en exactitude factuelle.
- Tian Liang et al., [Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate](https://arxiv.org/abs/2305.19118) (2023), qui nomme *Degeneration-of-Thought* le fait qu'un modèle sûr de lui ne remette plus sa réponse en cause, et oppose des débatteurs devant un juge.
- Cognition, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents), le contrepoint déjà cité au module sur la délégation : ce que la fragmentation du contexte fait perdre.
- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), pour le coût en tokens d'un système multi-agents et les cas où il en vaut la peine.
- OpenAI, [Swarm](https://github.com/openai/swarm), l'autre forme d'essaim, où un agent passe la main à un autre avec tout l'historique.
