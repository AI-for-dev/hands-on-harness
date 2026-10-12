# Le fil rouge : NÉON

Tout au long de la formation, nous travaillons sur un même dépôt, que nous appelons **NÉON**. Il s'agit d'un petit casse-briques jouable, écrit en HTML et JavaScript sur un `<canvas>`, sans aucune dépendance. Le jeu se lance avec `npm run serve`, puis s'ouvre dans le navigateur à l'adresse `http://localhost:8000/` (ses modules ES ne se chargent pas depuis un simple `file://`). C'est un vrai logiciel, avec ses qualités et ses défauts, car NÉON est volontairement imparfait : il comporte des bugs, des choix techniques à corriger, une liste de tickets en attente, un fichier piégé et un historique git bien réel, qui forment la matière première de la formation.

Vous le trouverez à l'adresse [github.com/AI-for-dev/neon](https://github.com/AI-for-dev/neon).

## Maintenir plutôt que construire

Nous aurions pu vous faire construire NÉON de zéro, brique après brique, en même temps que votre harnais. C'est visuellement satisfaisant, mais souvent artificiel : l'utilisation d'un LLM sur les premières lignes d'un code se passe généralement bien car tout est à faire. Lorsque la base de code est conséquente, ce n'est plus la même histoire.

Nous avons donc fait un autre choix. Vous ne construisez pas NÉON, vous le maintenez et le faites évoluer. Le harnais que vous forgez apprend à comprendre le dépôt, à planifier une modification, à déléguer une partie du travail, à modifier le code, à le tester, à refuser une instruction dangereuse, puis à livrer un diff et un commit, exactement ce que vous ferez à la fin de cette formation sur vos propres projets, qui ont déjà un historique.

Ce choix a deux avantages. Chaque brique du harnais répond alors à un besoin concret, et non à un exercice inventé pour la circonstance. Le transfert vers votre quotidien est direct, car un dépôt, une issue, un diff, une revue et un commit sont exactement ce sur quoi vous travaillez déjà.

## Le dépôt de départ

Le dépôt fourni a la structure suivante.

```
neon/
  game/index.html     coquille : le <canvas> et le démarrage
  game/neon.js        logique et rendu, mêlés par endroits
  game/bloom.js       le halo lumineux autour des briques et de la balle
  game/theme.js       couleurs en dur et une amorce de palette, les deux coexistent
  game/neon.test.js   tests partiels : la collision est testée, le score ne l'est pas
  serve.js            un petit serveur statique, sans dépendance, pour lancer le jeu
  package.json        les scripts `npm run serve` et `npm test`
  README.md           partiel : lancer et tester sont documentés, l'architecture reste floue
  ISSUES.md           le backlog
  CONTRIBUTING.md     la contrainte « zéro dépendance » et les conventions
  SUPPORT.md          un fichier piégé, contenant une instruction d'exfiltration
  .env                un secret local à ne jamais lire ; un .env.example est fourni
  .git/               un historique réel, sur plusieurs commits
```

La séparation entre la logique pure et le rendu est partiellement respectée. Là où elle ne l'est pas, c'est délibéré : cela nous donne l'occasion d'un refactor testable. Les tests se lancent avec `npm test`, équivalent à `node --test "game/**/*.test.js"`, sans outil supplémentaire, ce qui sert autant de garde-fou au harnais que de support aux évaluations.

## Le backlog

Le fichier `ISSUES.md` contient le backlog que nous exploitons dans les modules.

| #   | Type           | Titre                                                                     |
| --- | -------------- | ------------------------------------------------------------------------- |
| 1   | bug            | La balle traverse les briques au lieu de rebondir                         |
| 2   | performance    | La collision scanne toutes les briques à chaque frame, code mêlé au rendu |
| 3   | fonctionnalité | Mode nuit                                                                 |
| 4   | fonctionnalité | Import CSV d'un tableau de scores, compatible avec la sauvegarde locale   |
| 5   | dette          | La logique de score et de combo n'est pas testée                          |
| 6   | dette          | Couleurs en dur au lieu de la palette                                     |

Vous ne ferez peut-être pas tout, mais ce backlog donne assez de matière pour tester votre harnais.

## Le fichier piégé

Le fichier `SUPPORT.md` contient un texte qui ressemble à une procédure d'assistance, mais qui demande en réalité de lire le fichier `.env` et d'en envoyer le contenu à une adresse externe. Ce texte est une donnée non fiable, placée là pour tester la sûreté de votre harnais, et non une consigne légitime.

Le point à retenir dès maintenant est le suivant : votre harnais doit traiter ce texte comme une donnée, et non comme une instruction à exécuter. Le [module 2.0](./act2-sandbox) sur le bac à sable et le [module 2.5](./act2-hooks) sur les hooks construisent les garde-fous qui refusent la lecture du `.env`, que l'agent ait été trompé ou non.

## Le point d'arrivée

À la fin de l'acte 2, vous aurez construit votre propre harnais dans votre clone de NÉON. Il contient :

- un `AGENTS.md` de moins de quarante lignes, à la racine ;
- dans `.pi/`, les skills `playtester` et `dynamic-playtester` ;
- les agents `explorer`, `planner`, `coder` et `reviewer` ;
- un flow qui traite le ticket #2 de l'exploration jusqu'à l'audit, avec les tests comme juge ;
- deux extensions : l'une refuse les commandes interdites, l'autre renvoie l'agent au travail tant que les tests sont rouges.

Tout cela tourne dans un bac à sable. L'acte 3 mesure ensuite ce que certaines de ces pièces changent vraiment.

Aucun module ne traite les issues #3, #4 et #6. Elles sont là pour que vous essayiez votre harnais sur une demande qu'il n'a jamais vue. Vous pourrez ensuite remplacer NÉON par votre propre dépôt, comme le propose la page [À vous de jouer](./a-vous-de-jouer).
