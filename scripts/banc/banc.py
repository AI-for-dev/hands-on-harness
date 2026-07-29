#!/usr/bin/env python3
"""Banc de mesure du module 2.1 - « Le contexte et la fenêtre ».

Rejoue la même tâche sur une matrice de configurations, plusieurs fois
chacune, et agrège coût, tokens et notation. Zéro dépendance, Python >= 3.9.

  python banc.py --dry-run       estime le coût sans rien lancer
  python banc.py                 lance la matrice
  REPEATS=1 python banc.py       surcharge le nombre de répétitions
  ONLY=base,+rtk python banc.py  ne relance que ces cellules
  PROVIDER=ilaas MODELE=gemma-4-31b python banc.py
                                 rejoue la matrice sur un autre fournisseur

Le seul endroit à réécrire pour un autre dépôt que NÉON est la fonction
`noter()`, tout en bas.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

# ─── Configuration ───────────────────────────────────────────────────────────

REPO = Path(os.environ.get("NEON", "../neon"))
PROVIDER = os.environ.get("PROVIDER", "opencode-go")
# Surcharge le modèle de toutes les cellules, ce qui permet de rejouer la même
# matrice sur un autre fournisseur sans toucher au code :
#   PROVIDER=ilaas MODELE=gemma-4-31b python banc.py
# Les cellules qui comparent deux modèles (`pro (négligé)`) perdent alors leur
# sens : filtrez-les avec ONLY.
MODELE = os.environ.get("MODELE")
REPEATS = int(os.environ.get("REPEATS", 3))
CONCURRENCY = int(os.environ.get("CONCURRENCY", 4))
TIMEOUT_S = float(os.environ.get("TIMEOUT_S", 6 * 60))
ATTEMPTS = 2
WORKDIR = Path(tempfile.gettempdir()) / "banc-contexte"

# Profil de référence, mesuré en juillet 2026, servant à l'estimation de coût
# avant lancement. À réajuster si vos runs s'en écartent nettement.
REF_TOKENS = {"input": 20_000, "output": 9_000}

PROMPT_VAGUE = (
    "La collision scanne toutes les briques a chaque frame et "
    "son code est mele a la boucle de rendu. Corrige ca."
)

PROMPT_CADRE = (
    "La collision scanne toutes les briques a chaque frame et "
    "son code est mele a la boucle de rendu (issue #2). Sors la detection de "
    "collision de la boucle de rendu ET arrete de scanner toutes les briques. "
    "Ne modifie que game/neon.js, ne touche pas aux tests, ne traite aucune "
    "autre issue. Tu as fini quand npm test passe et que les fonctions deja "
    "exportees ont gardé leur nom et leur signature."
)

AGENTS_MD = """# NÉON

- Une tâche = un ticket. Ne traite pas d'autre issue en passant.
- Ne renomme ni ne supprime un export de `game/neon.js` : les tests en dépendent.
- Zéro dépendance : aucun paquet, aucun CDN.
- Les tests se lancent avec `npm test`.
"""

SYSTEM_MIN = """You are a coding assistant working in the current directory.
Use the available tools (read, write, edit, bash) to inspect and modify files.
Answer in the language of the user.
"""


@dataclass(frozen=True)
class Cellule:
    nom: str
    modele: str
    thinking: str | None = None
    prompt: str | None = None
    agents: str | None = None
    system: str | None = None
    extension: str | None = None


# La matrice. Une cellule = une configuration. `base` est la référence dont
# toutes les autres ne diffèrent que par une variable, sauf la dernière qui
# les cumule (c'est la moitié « bien outillée » du 2x2, dont `pro` est la
# moitié « mal outillée »).
TOUTES_LES_CELLULES = [
    Cellule("base", "deepseek-v4-flash"),
    Cellule("+thinking", "deepseek-v4-flash", thinking="high"),
    Cellule("+prompt cadré", "deepseek-v4-flash", prompt=PROMPT_CADRE),
    Cellule("+AGENTS.md", "deepseek-v4-flash", agents=AGENTS_MD),
    Cellule("-prompt sys.", "deepseek-v4-flash", system=SYSTEM_MIN),
    Cellule("+rtk", "deepseek-v4-flash", extension="npm:pi-rtk-optimizer"),
    Cellule("pro (négligé)", "deepseek-v4-pro"),
    Cellule("flash (soigné)", "deepseek-v4-flash", thinking="high",
            prompt=PROMPT_CADRE, agents=AGENTS_MD),
]

filtre = [s.strip() for s in os.environ.get("ONLY", "").split(",") if s.strip()]
CELLS = [c for c in TOUTES_LES_CELLULES if c.nom in filtre] if filtre else TOUTES_LES_CELLULES


# ─── Estimation de coût ──────────────────────────────────────────────────────

def modele_de(cell):
    return MODELE or cell.modele


def tarifs(modele):
    f = Path.home() / ".pi" / "agent" / "models-store.json"
    if not f.exists():
        return None
    store = json.loads(f.read_text())
    for p in store.values():
        for m in p.get("models", []):
            if m["id"] == modele and m.get("cost"):
                return m["cost"]
    return None


def estimation():
    total = 0.0
    lignes = []
    for c in CELLS:
        t = tarifs(modele_de(c))
        u = None
        if t:
            u = (REF_TOKENS["input"] * t["input"]
                 + REF_TOKENS["output"] * t["output"]) / 1e6 * REPEATS
            total += u
        montant = "tarif inconnu" if u is None else f"~{u:.4f} $"
        lignes.append(f"  {c.nom:<16} {modele_de(c):<20} {montant}")
    return lignes, total


# ─── Exécution ───────────────────────────────────────────────────────────────

def preparer(ident, cell):
    d = WORKDIR / ident
    shutil.rmtree(d, ignore_errors=True)
    d.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(REPO, d)
    if cell.agents:
        (d / "AGENTS.md").write_text(cell.agents)
    if cell.system:
        (d / ".pi").mkdir(exist_ok=True)
        (d / ".pi" / "SYSTEM.md").write_text(cell.system)
    return d


def args(cell):
    a = ["-p", "--mode", "json", "--provider", PROVIDER, "--model", modele_de(cell),
         "--no-session", "-a", "-ns", "-np", "-ne"]
    # Les fichiers de contexte ne sont chargés que si la cellule en fournit un,
    # pour qu'un AGENTS.md personnel resté dans un répertoire parent ne vienne
    # pas polluer la mesure.
    if not cell.agents:
        a.append("-nc")
    if cell.thinking:
        a += ["--thinking", cell.thinking]
    if cell.extension:
        a += ["-e", cell.extension]
    a.append(cell.prompt or PROMPT_VAGUE)
    return a


def lancer_pi(d, cell):
    t0 = time.monotonic()
    # L'entrée standard doit être fermée : avec un tuyau ouvert, `pi -p`
    # attend indéfiniment de quoi lire et le run se fige sans rien émettre.
    try:
        p = subprocess.run(["pi", *args(cell)], cwd=d, stdin=subprocess.DEVNULL,
                           capture_output=True, text=True, timeout=TIMEOUT_S)
        out, err, code = p.stdout, p.stderr, p.returncode
    except subprocess.TimeoutExpired as e:
        # `TimeoutExpired.stdout` reste en octets même avec `text=True`. Sans ce
        # décodage, le dépouillement lève un TypeError qui remonte à travers le
        # ThreadPoolExecutor et emporte les résultats de toute la matrice : une
        # seule exécution figée fait perdre les soixante-dix-neuf autres.
        brut = e.stdout or b""
        out = brut.decode("utf-8", "replace") if isinstance(brut, bytes) else brut
        err, code = f"timeout après {TIMEOUT_S:.0f} s", None
    except OSError as e:
        out, err, code = "", str(e), -1
    return out, err, code, round(time.monotonic() - t0)


def depouiller(flux):
    u = {"input": 0, "output": 0, "cacheRead": 0, "cout": 0.0, "tours": 0}
    for ligne in flux.split("\n"):
        if not ligne.startswith("{"):
            continue
        try:
            e = json.loads(ligne)
        except json.JSONDecodeError:
            continue
        if e.get("type") != "message_end":
            continue
        usage = (e.get("message") or {}).get("usage")
        if not usage:
            continue
        u["tours"] += 1
        u["input"] += usage.get("input", 0)
        u["output"] += usage.get("output", 0)
        u["cacheRead"] += usage.get("cacheRead", 0)
        u["cout"] += (usage.get("cost") or {}).get("total", 0.0)
    return u


# Un run figé sans un octet de sortie est un incident observé en pratique :
# on retente une fois avant de renoncer, plutôt que d'empoisonner la cellule.
def un_run(ident, cell):
    for essai in range(1, ATTEMPTS + 1):
        d = preparer(ident, cell)
        out, err, code, duree = lancer_pi(d, cell)
        mesure = depouiller(out)
        if mesure["tours"] > 0:
            return {**mesure, "duree": duree, "dir": d, "essais": essai}
        detail = f" - {err.strip().splitlines()[0]}" if err.strip() else ""
        print(f"  ! {ident} : aucune mesure (code={code}), "
              f"essai {essai}/{ATTEMPTS}{detail}", file=sys.stderr)
    return None


# ─── Agrégation ──────────────────────────────────────────────────────────────

def nombre(x):
    """10.0 -> « 10 », 10.5 -> « 10.5 »."""
    return f"{x:g}"


# Les tokens sont la grandeur physique, toujours disponible ; le coût n'en est
# qu'une conversion, et il vaut zéro sur un fournisseur dont on n'a pas les
# tarifs. On publie donc les trois postes de tokens, et le coût en une colonne.
#
# `in` et `cache` sont séparés à dessein : l'entrée facturée plein tarif est ce
# qui n'était pas déjà dans le cache, et c'est leur rapport qui dit si votre
# préfixe est stable. `out` est la production du modèle, et c'est là que vit la
# dispersion — d'où l'étendue calculée sur elle plutôt que sur le coût.
def tableau(resultats):
    l = [""]
    l.append("| cellule | n | in méd. | cache méd. | out méd. | étendue out "
             "| coût méd. | tours méd. | tests | API | périmètre | perf* |")
    l.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for cell, runs in resultats:
        ok = [r for r in runs if r]
        if not ok:
            l.append(f"| {cell.nom} | 0 | - | - | - | - | - | - | - | - | - | - |")
            continue
        sorties = [r["output"] for r in ok]
        smin, smax = min(sorties), max(sorties)
        etendue = smax / (smin or smax) if smax else 1
        cout = statistics.median([r["cout"] for r in ok])
        compte = lambda clef: f"{sum(1 for r in ok if r['note'][clef])}/{len(ok)}"
        med = lambda clef: f"{statistics.median([r[clef] for r in ok]):.0f}"
        l.append(
            f"| {cell.nom} | {len(ok)} | {med('input')} | {med('cacheRead')} "
            f"| {med('output')} | x{etendue:.2f} "
            f"| {'-' if cout == 0 else f'{cout:.4f} $'} "
            f"| {nombre(statistics.median([r['tours'] for r in ok]))} "
            f"| {compte('tests')} | {compte('apiStable')} | {compte('perimetre')} "
            f"| {compte('perf')} |")
    l.append("")
    l.append("* La colonne « perf » est une approximation par motif, pas une vérité.")
    l.append("  Relisez les diffs qu'elle classe comme traités avant de vous y fier.")
    return "\n".join(l)


# ─── Notation ────────────────────────────────────────────────────────────────
# LE SEUL ENDROIT À RÉÉCRIRE POUR UN AUTRE DÉPÔT.
#
# Les trois premiers critères sont mécaniques et fiables : les tests passent ou
# non, un export a disparu ou non, un fichier hors périmètre a été touché ou
# non.
#
# Le quatrième est celui qui décide si le ticket est vraiment traité, et il
# n'est mécanique qu'en apparence. `perf_traitee()` cherche un calcul d'indices
# de grille, qui est la façon dont on attend que la collision cesse de
# parcourir toutes les briques. Cette approximation a deux défauts connus,
# rencontrés en préparant le module :
#
#   1. elle a d'abord classé comme « non traité » un diff qui faisait pourtant
#      le bon calcul, parce qu'il nommait ses bornes autrement ;
#   2. elle ne sait pas juger une solution d'une autre forme, comme la liste
#      des briques encore vivantes, qui allège le cas courant sans rien changer
#      au pire cas et qui demande donc un avis plutôt qu'un test.
#
# Autrement dit, un motif textuel répond à « ce diff ressemble-t-il à la
# solution attendue » quand la question posée est « ce diff résout-il le
# problème ». C'est précisément l'écart que le LLM-juge du module 3.2 vient
# combler, et la raison pour laquelle cette colonne est marquée d'une étoile
# dans le tableau.

EXPORT_RE = re.compile(r"^export\s+(?:function|const|class|let)\s+(\w+)", re.M)


def exports_de(fichier):
    return set(EXPORT_RE.findall(Path(fichier).read_text()))


def commande(cmd, cwd):
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True,
                              timeout=60).returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False


def git(git_args, cwd):
    try:
        p = subprocess.run(["git", *git_args], cwd=cwd, capture_output=True,
                           text=True, timeout=60)
        return p.stdout if p.returncode == 0 else ""
    except (subprocess.TimeoutExpired, OSError):
        return ""


# Approximation, voir l'avertissement ci-dessus. On cherche un bornage
# d'indices de grille sur les constantes de briques, ce qui est la signature
# du seul type de solution que nous savons reconnaître sans lire le code.
INDICE_RE = re.compile(r"Math\.(floor|max|min)\(.*(BRICK_W|BRICK_H|BRICK_COLS|BRICK_ROWS)")


def perf_traitee(diff):
    ajouts = [l for l in diff.split("\n") if l.startswith("+") and not l.startswith("+++")]
    return sum(1 for l in ajouts if INDICE_RE.search(l)) >= 2


def noter(d):
    avant = exports_de(REPO / "game/neon.js")
    apres = exports_de(d / "game/neon.js")
    touches = [f for f in git(["diff", "--name-only"], d).split("\n") if f]

    return {
        "tests": commande(["npm", "test"], d),
        # Ajouter un export est permis, en retirer ou en renommer un ne l'est pas.
        "apiStable": avant <= apres,
        "perimetre": bool(touches) and all(f == "game/neon.js" for f in touches),
        "perf": perf_traitee(git(["diff", "--", "game/neon.js"], d)),
        "touches": touches,
    }


# ─── Programme principal ─────────────────────────────────────────────────────

def tache(ident, cell):
    # Une exception ici remonterait à travers le ThreadPoolExecutor et ferait
    # perdre toute la matrice, y compris les runs déjà payés. Une cellule
    # manquante vaut mieux qu'un tableau perdu.
    try:
        r = un_run(ident, cell)
        if not r:
            return cell, None
        r["note"] = noter(r["dir"])
        print(f"  {ident:<24} {r['duree']}s  "
              f"{r['input']}+{r['cacheRead']} in / {r['output']} out  "
              f"{r['tours']} tours  {'tests ok' if r['note']['tests'] else 'TESTS KO'}")
        return cell, r
    except Exception as e:  # noqa: BLE001 - on veut vraiment tout attraper
        print(f"  ! {ident} : {type(e).__name__} : {e}", file=sys.stderr)
        return cell, None


def main():
    lignes, total = estimation()
    print(f"\nMatrice : {len(CELLS)} cellules x {REPEATS} répétitions "
          f"= {len(CELLS) * REPEATS} runs\n")
    print("\n".join(lignes))
    print(f"\n  Coût estimé : ~{total:.3f} $ "
          f"(profil de référence {REF_TOKENS['input']} in / "
          f"{REF_TOKENS['output']} out par run)\n")

    if "--dry-run" in sys.argv:
        return

    taches = [(f"{re.sub(r'[^a-z0-9]+', '-', cell.nom, flags=re.I)}-{i}", cell)
              for cell in CELLS for i in range(REPEATS)]

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        bruts = list(ex.map(lambda t: tache(*t), taches))

    par_cellule = [(cell, [r for c, r in bruts if c is cell]) for cell in CELLS]

    rendu = tableau(par_cellule)
    print(rendu)
    Path("banc-resultats.md").write_text(rendu + "\n")
    print("\nÉcrit dans banc-resultats.md\n")


if __name__ == "__main__":
    main()
