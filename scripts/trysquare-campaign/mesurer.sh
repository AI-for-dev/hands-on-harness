#!/usr/bin/env bash
#
# The workbench: point at the tool, point at the config, keep a record.
#
# trysquare pins the measured repository with a tag, but nothing pins trysquare
# itself, and an experiment on a harness that does not pin the harness measures
# the operator. This script exists for that journal line; everything else is
# arguments that could have been typed by hand.
#
#   ./mesurer.sh                             available scenarios
#   ./mesurer.sh issue1-contexte --dry-run   the full plan, without spending anything
#   ./mesurer.sh issue1-contexte             the matrix
#   ./mesurer.sh render results/<matrix>     the table, without spending anything
#   ./mesurer.sh compare results/a results/b the gap between two matrices
#
# Recognized variables, all optional:
#   TRYSQUARE  the tool's clone             (default: ../../../trysquare)
#   CONFIG     the paths file               (default: ./trysquare.toml)
#   RESULTS    the root of the matrices     (default: ./results)

set -euo pipefail

cd "$(dirname "$0")"

TRYSQUARE="${TRYSQUARE:-../../../trysquare}"
CONFIG="${CONFIG:-$PWD/trysquare.toml}"
RESULTS="${RESULTS:-results}"
JOURNAL="$RESULTS/journal.md"

# A blocking prompt in a scripted run is a measurement that sleeps all night.
# trysquare answers "overwrite" on its own outside a terminal; we set it here so
# that it is a choice of the script and not a side effect of having no tty.
export TRYSQUARE_NO_PROMPT="${TRYSQUARE_NO_PROMPT:-1}"

die() { printf '%s\n' "$*" >&2; exit 2; }

command -v uv >/dev/null || die "uv est absent du PATH : c'est le prérequis de l'outil."
[ -d "$TRYSQUARE" ] || die "trysquare est introuvable en '$TRYSQUARE'. Clonez-le à côté du dépôt, ou passez TRYSQUARE=/chemin."
[ -f "$CONFIG" ] || die "config introuvable : $CONFIG"

# `--with` on the clone rather than an installed tool: the validator is run by
# the harness interpreter and does `from trysquare.assay import ...`, so
# trysquare must be importable wherever trysquare runs.
py()  { uv run --no-project --with "$TRYSQUARE" python "$@"; }
cli() { uv run --no-project --with "$TRYSQUARE" python -m trysquare "$@"; }

# The revision, with the `-dirty` suffix that flags a non-reproducible measurement.
rev() { git -C "$1" describe --tags --always --dirty 2>/dev/null || printf 'inconnue'; }

# The output directory name, computed by trysquare's own functions rather than
# rewritten here: a copied slug drifts the day the rule changes.
experiment_dir() {
	py - "$1" "${2:-}" <<-'PY'
		import sys
		from trysquare.outputs import experiment_name
		from trysquare.scenario import load as load_scenario
		scenario = load_scenario(sys.argv[1])
		reps = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else None
		print(experiment_name(scenario, reps))
	PY
}

# Which scenario produced this matrix. We match on the scenario **name** and
# not its full identity: a file's provider and model change over the campaign,
# while already archived matrices keep the ones they ran with. The longest name
# wins, otherwise `issue1-contexte` would answer for `issue1-contexte-pro`.
scenario_of() {
	py - "$1" scenarios/*.toml <<-'PY'
		import sys
		from pathlib import Path
		from trysquare.outputs import slug
		from trysquare.scenario import load as load_scenario
		wanted = Path(sys.argv[1]).name
		best = ""
		found = ""
		for path in sys.argv[2:]:
		    try:
		        name = slug(load_scenario(path).name)
		    except Exception:
		        continue
		    if wanted.startswith(name + "_") and len(name) > len(best):
		        best, found = name, path
		if found:
		    print(found)
	PY
}

lister() {
	printf 'Scénarios disponibles :\n\n'
	for f in scenarios/*.toml; do
		[ -e "$f" ] || { printf '  (aucun)\n'; return; }
		printf '  %s\n' "$(basename "$f" .toml)"
	done
	printf '\n  ./mesurer.sh <scénario> [--dry-run]\n'
}

journaliser() {
	local scenario="$1" outdir="$2" commit="$3"
	mkdir -p "$RESULTS"
	[ -f "$JOURNAL" ] || printf '# Journal des mesures\n\nUne ligne par matrice lancée. La révision de trysquare et celle du harnais\nsont là parce que rien dans la matrice ne les enregistre.\n\n| date | scénario | matrice | trysquare | harnais | étalon |\n| --- | --- | --- | --- | --- | --- |\n' > "$JOURNAL"
	printf '| %s | %s | `%s` | `%s` | `%s` | `%s` |\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$scenario" "$outdir" \
		"$(rev "$TRYSQUARE")" "$(rev .)" "${commit:-inconnu}" >> "$JOURNAL"
}

# The commit behind the tag, read from the matrix: a tag name reconstructs
# nothing, and trysquare resolved it at the moment it mattered.
etalon_commit() {
	py - "$1" <<-'PY'
		import json, sys
		from pathlib import Path
		for path in sorted(Path(sys.argv[1]).glob("runs/*/*/configuration.json")):
		    try:
		        commit = json.loads(path.read_text()).get("etalon_commit")
		    except Exception:
		        continue
		    if commit:
		        print(commit)
		        break
	PY
}

case "${1:-}" in
	"" | -h | --help)
		lister
		;;

	render)
		shift
		[ $# -ge 1 ] || die "render : donnez le répertoire d'une matrice, par exemple results/issue1-contexte_etalon-v1_ilaas_gemma-4-31b_n20"
		dir="${1%/}"; shift
		[ -d "$dir" ] || die "matrice introuvable : $dir"
		# `render` wants a scenario and a root, not the matrix directory.
		reps="$(basename "$dir" | sed -n 's/.*_n\([0-9]\{1,\}\)$/\1/p')"
		[ -n "$reps" ] || die "le nom de '$dir' ne finit pas par _n<N> : ce n'est pas une matrice."
		scenario="$(scenario_of "$dir")"
		[ -n "$scenario" ] || die "aucun scénario de scenarios/ ne produit '$dir'."

		# `render` recomputes the matrix name from the scenario: it does not render
		# the directory it is given, it renders the one the file describes today.
		# When the scenario's provider or model has changed since the measurement,
		# the two diverge, and without this guard we would overwrite one matrix's
		# summary while believing we were reading another.
		attendu="$(experiment_dir "$scenario" "$reps")"
		if [ "$attendu" != "$(basename "$dir")" ]; then
			die "$(printf '%s\n  demandé : %s\n  produit : %s\n\n%s' \
				"$scenario ne décrit plus cette matrice." \
				"$(basename "$dir")" "$attendu" \
				"Remettez [agent].provider et [agent].model aux valeurs de la mesure, ou rendez l'autre matrice.")"
		fi

		cli render "$scenario" --output "$(dirname "$dir")" --config "$CONFIG" --repetitions "$reps" "$@"
		;;

	compare)
		shift
		# `compare` takes two matrix directories and does not accept --config.
		cli compare "$@"
		;;

	replay)
		shift
		[ $# -ge 1 ] || die "replay : donnez le répertoire d'une matrice ou d'une exécution."
		dir="${1%/}"; shift
		scenario="$(scenario_of "$dir")"
		[ -n "$scenario" ] || die "aucun scénario de scenarios/ ne produit '$dir'."
		cli replay "$dir" --scenario "$scenario" --config "$CONFIG" "$@"
		;;

	validate)
		shift
		[ $# -ge 1 ] || die "validate : donnez un nom de scénario."
		name="$1"; shift
		cli validate "scenarios/$name.toml" --config "$CONFIG" "$@"
		;;

	*)
		name="$1"; shift
		scenario="scenarios/$name.toml"
		[ -f "$scenario" ] || { printf "scénario inconnu : %s\n\n" "$name" >&2; lister >&2; exit 2; }

		# A repetition count forced on the command line changes the directory name.
		reps=""
		prev=""
		for arg in "$@"; do
			[ "$prev" = "--repetitions" ] && reps="$arg"
			case "$arg" in --repetitions=*) reps="${arg#*=}" ;; esac
			prev="$arg"
		done

		outdir="$RESULTS/$(experiment_dir "$scenario" "$reps")"

		cli run "$scenario" --output "$RESULTS" --config "$CONFIG" "$@"

		# A plan produced nothing: there is nothing to log.
		case " $* " in *" --dry-run "*) exit 0 ;; esac

		journaliser "$name" "$outdir" "$(etalon_commit "$outdir")"
		printf '\nJournal : %s\n' "$JOURNAL"
		;;
esac
