---
name: playtest-court
description: Playtest un bug de jouabilité du casse-brique NÉON. Décompose le symptôme rapporté en défauts distincts, écrit un test rouge par défaut dans la suite du jeu, puis corrige chaque défaut jusqu'au vert. Utiliser quand l'utilisateur rapporte un comportement anormal en jeu.
---

# Playtest

Tu es le playtesteur du jeu. Ce que le joueur rapporte est un symptôme, pas un
bug : un symptôme de collision cache presque toujours plusieurs défauts, dont
certains ne se verront à l'écran qu'une fois le premier corrigé. Ton travail est
de tous les spécifier puis de tous les corriger, en toute autonomie, sans
revenir vers l'utilisateur.

Tu ne crées aucun fichier. Tout ton travail tient dans deux fichiers : les tests
dans `game/neon.test.js`, les corrections dans `game/neon.js`.

## Le repère

Origine en haut à gauche, `x` croît vers la droite, `y` croît vers le bas.
Un signe de vitesse ne se devine pas, il se lit ici :

- `vy < 0` : la balle monte vers les briques et le plafond (`y = 0`) ;
  `vy > 0` : elle descend vers le paddle (`PADDLE_Y = HEIGHT - 32`).
- Toucher la face haute d'une brique, c'est y arriver avec `vy > 0` et en
  repartir avec `vy < 0` ; la face basse, l'inverse.
- Une balle placée au-dessus d'une brique a un `y` plus petit que celui de la
  brique. Le `y` d'une brique est son bord supérieur, la rangée 0 est la plus
  haute (posée à `BRICK_TOP`, chaque rangée descend de `BRICK_H + BRICK_GAP`).
- Le pas de temps `dt` est plafonné à 50 ms et la balle accélère au fil des
  briques touchées (`ballSpeed(niveau)`).

## 1. Décomposer le symptôme

Lis `game/neon.js` en entier, puis passe le symptôme au filtre des dix familles
de défaillances. Chaque famille retenue devient un défaut numéroté ; chaque
famille écartée l'est par une raison tirée du code, pas par « non concerné ».
Un défaut que le jeu ne montre pas encore, parce qu'un autre le masque, se
spécifie quand même : tu le lis dans le code.

| Famille | Ce qui casse, et l'invariant |
| --- | --- |
| **Traversée** (*tunneling*) | Détection discrète : un pas plus long que l'obstacle le franchit sans jamais le toucher. Se règle par balayage entre les deux positions. *Aucun obstacle franchi sans rebond, quel que soit le pas.* |
| **Collant** | Vitesse inversée sans repositionnement : la balle recouvre encore au tour suivant et se ré-inverse. *Après résolution, la balle est hors du rectangle.* |
| **Double inversion** (*seam*) | Deux briques d'une même couture touchées dans la même passe : deux `vy = -vy` s'annulent et la balle traverse. *Un rebond par passe et par axe.* |
| **Face vs coin** | L'axe touché est celui de la plus petite pénétration. Pénétrations égales : c'est un coin. *Au coin, les deux composantes s'inversent.* |
| **Paddle** | Capture, traversée par le haut à grande vitesse, paddle téléporté par la souris. *La balle ressort toujours par le haut du paddle.* |
| **Angle mort** | `vx` ou `vy` proche de zéro : trajectoire injouable. *Toute trajectoire reste jouable.* |
| **Vitesse** | Norme non conservée au rebond. *La vitesse après un rebond est celle du niveau.* |
| **Dépendance à dt** | *La physique donne le même résultat à 30 fps et à 144 fps.* |
| **Score / combo** | *Combo remis à zéro au bon moment, multiplicateur borné, brique comptée une seule fois, une seule vie perdue par sortie.* |
| **Transitions** | *Fin de niveau balle en vol, relance après une vie perdue, dernière brique et dernière vie dans la même frame.* |

## 2. Chiffrer chaque déclencheur

Chiffre le déclencheur depuis les constantes du fichier, ne le décris pas. Une
traversée se démontre en comparant le pas maximal (`ballSpeed(niveau)` × `dt`
plafonné) à la distance à franchir (hauteur de l'obstacle + diamètre de la
balle) : le niveau où le premier dépasse la seconde est le déclencheur. Un
double recouvrement se démontre en comparant l'espacement de la grille au
diamètre de la balle. Tant que tu n'as pas les nombres, tu n'as qu'une
intuition.

## 3. Un défaut à la fois, en TDD

Traite les défauts dans l'ordre, celui qui masque les autres en premier, et
jamais deux défauts en vol à la fois. Pour chacun :

1. Écris le cas dans `game/neon.test.js`, en `node --test`, logique pure, sans
   DOM, zéro dépendance, comme le veut `CONTRIBUTING.md`. Le cas vérifie le
   comportement attendu en valeurs (quelle composante s'inverse, où ressort la
   balle), jamais seulement « quelque chose a changé ».
2. Lance `npm test` et vérifie que ce cas échoue. Un cas déjà vert ne décrit
   aucun défaut : soit la cause est ailleurs, soit le cas vise à côté.
3. Corrige `game/neon.js` jusqu'à ce que le cas passe, sans casser les autres.

## 4. Livraison

Relance `npm test` une dernière fois : tout doit être vert. Vérifie avec
`git status` que seuls `game/neon.js` et `game/neon.test.js` ont changé ; si tu
as créé un autre fichier malgré la consigne, supprime-le avant de conclure.
