# Hypothèse : le découpage en rôles sur l'extraction de l'issue #2

Écrite le 20 septembre 2026, avant toute mesure.

## Ce qui est comparé

Deux cellules, un seul levier. `agent-seul` reçoit le ticket cadré et la
convention du projet. `+roles` reçoit exactement le même brief, plus les six
rôles du module 2.4 dans `.pi/agents/` et l'outil `subagent` pour les appeler.
L'agent garde la barre : rien ne l'oblige à déléguer.

C'est une question voisine de celle que le module 2.4 laisse ouverte, et non la
même. Le module demande si **son pipeline** fait mieux qu'un agent seul, avec un
enchaînement écrit en code qu'aucun modèle ne réinterprète. Ici, c'est le modèle
qui décide de déléguer et à qui. Si les deux formes divergent, l'écart est un
résultat sur l'orchestration elle-même et non un artefact du banc, mais cette
matrice ne peut pas l'attribuer.

## Pourquoi ce ticket se note à l'envers du précédent

L'issue #1 demandait un comportement absent : la sonde était noire à l'étalon et
la correction la verdissait. L'issue #2 demande un déplacement de code à
comportement constant, donc `multi_briques` et `frame_inchange` sont **vertes
avant tout travail** et ne peuvent que noircir.

Le critère est `multi_briques`, et c'est un choix contre `extraction`. Le ticket
nomme la signature, donc `extraction` mesure l'obéissance et se saturera des
deux côtés. Ce que le ticket ne nomme pas, c'est qu'une balle peut recouvrir deux
briques dans la même passe, et qu'elles doivent toutes deux mourir. Une
exécution réelle de ce ticket a rendu une extraction qui ne cassait plus qu'une
brique par frame sans qu'aucun test du dépôt ne rougisse : c'est la forme d'échec
que ce critère attrape et que rien d'autre n'attrape.

## Prédictions

1. **`extraction` sature des deux côtés**, au moins 18/20 chacun. La signature
   est écrite dans le ticket et dans `ISSUES.md`. Si cette colonne sépare les
   deux cellules, c'est le brief qui a mal passé, pas le découpage.
2. **`multi_briques` ne monte pas de façon décisive avec les rôles**, et nous
   dirions que le découpage n'apporte rien sur ce ticket si l'écart reste sous
   3/20. Le raisonnement : le comportement à préserver se lit dans dix lignes de
   `frame()`, un contexte qu'un agent seul tient sans peine. Le découpage paie
   quand la lecture déborde la fenêtre, et ce ticket ne la remplit pas.
3. **`purete` sépare davantage que `multi_briques`.** C'est là que le relecteur
   séparé a quelque chose à voir qu'un générateur ne voit pas sur son propre
   code, et la pureté se contrôle en lisant la fonction plutôt qu'en tenant tout
   le fichier en tête.
4. **`in_scope` baisse du côté délégué.** Six rôles, dont un coder qui reçoit une
   sous-tâche sans le ticket entier, est une invitation au débordement de
   périmètre ; c'est la colonne que le module sur le contexte met en tête.
5. **Le coût monte nettement avec les rôles**, au moins le double en tokens
   d'entrée, parce que chaque délégation repaie le contexte de départ.

## Ce qui invaliderait la lecture

Si `+roles` délègue rarement, la matrice compare un agent seul à un agent seul
qui avait le droit d'appeler quelqu'un, et aucune colonne ne le dira : la
métrique qui compterait les délégations serait une métrique de procédé, et
`ToolCall.wrote` refuse de juger dès qu'un `subagent` apparaît. Cette lacune est
connue avant la dépense. En attendant qu'elle soit comblée, elle se vérifie à la
main dans les sessions archivées d'une poignée d'exécutions, et si la délégation
est rare la matrice ne répond pas à la question posée.

Vingt répétitions par cellule. Trois montreraient la dispersion et ne
départageraient rien.
