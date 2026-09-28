#!/usr/bin/env python3
"""Validateur de l'issue #2 de NÉON : extraire `brickHit(ball, bricks)` de `frame()`.

Écrit sur `trysquare.assay`, qui porte le contrat - un argument, du JSON sur stdout, et
trois états séparés : j'ai jugé, je n'ai pas pu juger *cette métrique*, je n'ai pas pu
juger *cette exécution*. Ce qui reste ici est le domaine.

Ce ticket se note autrement que l'issue #1, et la différence vaut d'être dite. L'issue #1
demandait un comportement absent : la sonde était noire à l'étalon et verdissait avec la
correction. L'issue #2 demande un **déplacement** de code à comportement constant, si bien
que la moitié des colonnes sont vertes à l'étalon et ne peuvent que noircir. Ce ne sont
pas des colonnes de réussite mais des colonnes de non-régression, et `multi_briques` est
la principale : elle porte le comportement qu'une extraction rate en silence.

Aucune métrique de procédé ici, et c'est une contrainte du banc plutôt qu'un choix.
`ToolCall.wrote` refuse de juger dès qu'un appel `subagent` apparaît dans la session, donc
toute colonne lue dans les appels d'outil serait « sans objet » dans le bras délégué et
pleine dans l'autre. Une colonne qui ne veut dire la même chose que d'un côté de la
matrice ne compare rien : tout ce qui est noté ici se lit dans l'arbre.
"""

from __future__ import annotations

import re
from pathlib import Path

from trysquare.assay import Assay, CannotJudge, Metric, ProbeTimeout, validator

ICI = Path(__file__).resolve().parent

# La sonde de notation, jamais injectée dans une cellule : contrairement à celle de
# l'issue #1, aucun bras ne la reçoit, donc elle vit avec le code de notation plutôt
# qu'avec les briques.
SONDE = ICI / "sonde-issue2.test.js"
FICHIER_SONDE = "game/sonde-issue2.test.js"

# Le rapporteur `node:test` qui rend le résultat en JSON. Il reste ici et n'entre pas dans
# la copie : c'est de la mécanique de mesure.
RAPPORT = ICI / "rapport.mjs"

FICHIER_SOURCE = "game/neon.js"
FICHIER_TEST = "game/neon.test.js"
PERIMETRE = frozenset({FICHIER_SOURCE, FICHIER_TEST})

# `export function nom`, `export const nom`, `export class nom`. La forme
# `export { a, b }` n'existe pas dans ce dépôt à l'étalon ; si un agent l'introduit pour
# réexporter ce qu'il a déplacé, elle est lue aussi, sans quoi un refactor honnête se
# lirait comme une rupture d'API.
EXPORTE = re.compile(r"^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)", re.M)
REEXPORTE = re.compile(r"^export\s*\{([^}]*)\}", re.M)

# Un `describe` de la sonde par colonne. Les noms sont ceux du fichier.
GROUPES = {
    "extraction": "extraction",
    "purete": "purete",
    "multi_briques": "multi_briques",
    "frame_inchange": "frame_inchange",
}


@validator
def evaluate(run: Assay) -> dict:
    dehors = run.touched - PERIMETRE

    return {
        "delivered": Metric(
            bool(run.touched),
            "" if run.touched else "aucun fichier modifié : l'agent n'a pas travaillé",
        ),
        # Un agent qui n'a rien touché n'a pas respecté le périmètre, il n'a pas
        # travaillé : sans cette garde, `not dehors` serait vrai sur un ensemble vide.
        "in_scope": Metric(
            bool(run.touched) and not dehors,
            f"a aussi touché {', '.join(sorted(dehors))}" if dehors else "",
        ),
        "touched": run.touched,
        "api_intacte": or_unjudged(lambda: api_intacte(run)),
        "suite_verte": run.tests(),
        **sonde(run),
    }


def or_unjudged(lire) -> Metric:
    """Une métrique que cette exécution ne peut pas répondre, dite comme telle.

    Sans ça, une seule métrique sans réponse refuse l'exécution et emporte toutes les
    autres avec elle, y compris celle qui porte le verdict.
    """
    try:
        return lire()
    except CannotJudge as pourquoi:
        return Metric.unjudged(str(pourquoi))


def exports(texte: str) -> set[str]:
    """Les noms que ce module expose, quelle que soit la forme de l'export."""
    noms = set(EXPORTE.findall(texte))
    for bloc in REEXPORTE.findall(texte):
        for piece in bloc.split(","):
            # `a as b` expose `b`, et c'est `b` que l'appelant importe.
            nom = piece.split(" as ")[-1].strip()
            if nom:
                noms.add(nom)
    return noms


def api_intacte(run: Assay) -> Metric:
    """Tout ce que `game/neon.js` exportait à l'étalon est-il encore exporté ?

    C'est la contrainte que le ticket écrit en toutes lettres, « sans changer l'API
    publique », et la seule qu'un agent peut rompre en croyant bien faire : la collision
    vit dans `frame()`, et déplacer la logique invite à déplacer aussi ce qui l'entoure.

    La comparaison porte sur les noms et pas sur les signatures. Une signature se lit mal
    dans une source, et la sonde couvre déjà celles qui comptent, `frame` par son effet et
    `brickHit` par son arité. **Ajouter** un export est attendu, puisque le ticket demande
    un nom de plus : seule une disparition est notée.
    """
    avant = exports(run.sources_at_etalon(FICHIER_SOURCE))
    if not avant:
        raise CannotJudge(f"aucun export lu dans le {FICHIER_SOURCE} de l'étalon")

    fichier = run.repo / FICHIER_SOURCE
    if not fichier.exists():
        return Metric(False, f"{FICHIER_SOURCE} n'existe plus")

    perdus = avant - exports(fichier.read_text(errors="replace"))
    return Metric(not perdus, f"exports disparus : {', '.join(sorted(perdus))}" if perdus else "")


def sonde(run: Assay) -> dict:
    """Les quatre colonnes de la sonde, d'une seule exécution.

    Un comportement s'exécute au lieu de se reconnaître : pas de motif dans le diff, pas
    de juge, pas de jetons. La sonde tourne sur une copie de l'arbre mesuré, après tout le
    travail de l'agent, avec les tests de l'agent retirés - ce qu'ils valent est la colonne
    `suite_verte`, qui les lance là où c'est leur travail.

    Contrairement à l'issue #1, rien n'est ajouté au `game/neon.js` de l'agent : le dépôt
    exporte `frame` à l'étalon, donc la sonde l'atteint sans alias.

    Vérifié sur quatre arbres, sans dépenser un jeton, et cette table est le livrable de
    cette vérification :

      étalon intact                              0/2  0/3  2/2  2/2
      correction de référence                    2/2  3/3  2/2  2/2
      extraction qui ne rend que la première     2/2  1/3  0/2  2/2
      extraction impure, jeu correct             2/2  1/3  2/2  2/2

    La première ligne dit ce que ce ticket a de particulier : `multi_briques` et
    `frame_inchange` sont **vertes avant tout travail**, parce que l'étalon casse déjà
    toutes les briques recouvertes. Elles ne récompensent donc rien et ne peuvent que
    noircir, ce qui est exactement leur emploi.

    La troisième ligne est celle qui justifie le critère. Une extraction qui ne rend que
    la première brique touchée laisse la suite du dépôt verte et le jeu presque correct,
    et c'est la forme qu'une exécution réelle de ce ticket a rendue. `multi_briques` est la
    seule colonne qui la noircit.

    La quatrième isole `purete` : le jeu se comporte correctement, `multi_briques` est
    verte, et la fonction rendue n'est pas celle que le ticket demande.
    """
    try:
        resultat = run.probe(
            # La commande du dépôt, celle que `npm test` lance. Le rapporteur ne change pas
            # ce qui tourne, seulement la façon dont le résultat s'imprime.
            ["node", "--test", f"--test-reporter={RAPPORT}", "game/**/*.test.js"],
            write={FICHIER_SONDE: SONDE.read_text()},
            drop="*.test.js",
        )
    except ProbeTimeout as e:
        # Une sonde est de l'ordre de la milliseconde. La dépasser veut dire que le code de
        # l'agent boucle, ce qui est un échec de l'agent et pas du harnais.
        return {nom: Metric(False, f"le code ne termine pas : {e}") for nom in GROUPES.values()}
    except CannotJudge as e:
        return {nom: Metric.unjudged(str(e)) for nom in GROUPES.values()}

    if resultat.get("erreur"):
        return {
            nom: Metric.unjudged(f"sonde impossible : {resultat['erreur']}")
            for nom in GROUPES.values()
        }

    joues = resultat.get("cas") or []
    return {nom: groupe(joues, cle) for cle, nom in GROUPES.items()}


def groupe(joues: list[dict], cle: str) -> Metric:
    """Un groupe de cas, et le nom de ceux qui ont échoué.

    Dire quel cas a échoué et pas seulement qu'il y en a eu un : « 1 brique(s) cassée(s)
    dans la frame au lieu de 2 » nomme l'extraction qui perd les recouvrements multiples,
    et cette exécution ne se lit pas comme une qui n'a rien fait.
    """
    cas = [c for c in joues if c.get("groupe") == cle]
    if not cas:
        return Metric.unjudged(f"la sonde n'a joué aucun cas de {cle}")
    echoues = [c for c in cas if not c.get("ok")]
    notables = echoues or [c for c in cas if c.get("detail")]
    return Metric(
        not echoues,
        " ; ".join(f"{c.get('nom')} : {c.get('detail')}" for c in notables),
    )


if __name__ == "__main__":
    raise SystemExit(evaluate.cli())
