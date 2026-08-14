# Hypothèse : la compétence raccourcie contre l'originale

Écrite le 13 août 2026, avant toute mesure.

Le diagnostic sur la matrice `issue1-contexte` (gemma, n=20) attribue l'échec de
`+agents+skill` au protocole de la compétence et non à son contenu : les tests
naissent dans `.scratch` et le transfert vers la suite est l'étape perdue
(12/20 finissent à « 6 cas, comme à l'étalon »), la consigne de ménage est
ignorée (13/20 laissent des brouillons) ou détruit le livrable (2/20 suppriment
`game/neon.test.js`), et la référence fantôme à « la sonde de l'étape 1 »
fabrique des fichiers parasites. Sur flash, la même compétence donne
`tests_ajoutes` 20/20 : le contenu suffit quand le budget suit.

`playtest-court` supprime le détour par `.scratch`, l'étape de recherche web,
le double rouge et le format de bloc imposé, et fait écrire chaque cas
directement rouge dans `game/neon.test.js`.

## Prédictions (gemma-4-31b, 3 répétitions)

1. `tests_ajoutes` et `in_scope` remontent nettement sur `+agents+skill_court`
   par rapport à `+agents+skill` : au moins 2/3 sur chacune, contre un ordre de
   grandeur attendu de 1/3 sur l'originale.
2. Le critère `rebond_briques` ne baisse pas.
3. Le coût baisse : moins de tours et moins de tokens d'entrée, la procédure
   ayant deux étapes de moins et aucun fichier intermédiaire.

Trois répétitions montrent la dispersion, pas un verdict : aucun intervalle ne
sera cité depuis cette matrice. Si la tendance est bonne, la matrice à vingt
répétitions suivra.
