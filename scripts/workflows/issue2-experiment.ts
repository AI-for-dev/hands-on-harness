/**
 * La matrice du ticket #2 : le même pipeline, M modèles, N répétitions.
 *
 * C'est le corrigé de l'exercice « La comparaison qui reste à mesurer » de la
 * page workflows, monté avec la discipline d'un scénario trysquare : chaque
 * répétition part d'un clone frais de NÉON à l'étalon, les drapeaux sont
 * déclarés d'avance, et chacun se vérifie en exécutant quelque chose plutôt
 * qu'en lisant un rapport.
 *
 *   node scripts/workflows/issue2-experiment.ts /chemin/vers/neon /chemin/vers/combo \
 *     [--models a,b] [--repetitions 20] [--concurrency 1] [--workdir dir] [--runs dir]
 *
 * Les drapeaux, par cellule :
 *   ok         le workflow a tourné sans erreur fatale de fournisseur
 *   approved   le verdict de `deliver` (audit signé et check vert)
 *   check      la suite du run est verte (le gate)
 *   signature  `export function brickHit(ball, bricks)` existe dans l'arbre
 *   pure       sonde exécutée : briques gelées, brickHit ne mute pas et rend un tableau
 *   parity     le test de parité de référence (multi-chevauchement de frame())
 *              passe dans l'arbre livré, exécuté en isolation
 *   exports    tous les exports de l'étalon existent encore
 *   in_scope   le diff est borné à game/
 *   converged  tous les précédents à la fois : c'est le critère
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

// --- Arguments ----------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
	const at = args.indexOf(name);
	return at >= 0 ? (args[at + 1] as string) : fallback;
};
const positional = args.filter((value, at) => !value.startsWith("--") && !args[at - 1]?.startsWith("--"));
const [neonSrc, comboDir] = positional;

if (!neonSrc || !comboDir) {
	console.error("usage: issue2-experiment.ts <neon> <combo> [--models a,b] [--repetitions N] [--concurrency N] [--workdir dir] [--runs dir]");
	process.exit(1);
}

const models = flag("--models", "ilaas/gemma-4-31b,opencode-go/deepseek-v4-flash").split(",");
const repetitions = Number(flag("--repetitions", "20"));
const concurrency = Number(flag("--concurrency", "1"));
const workdir = path.resolve(flag("--workdir", path.join(process.env.TMPDIR ?? "/tmp", "issue2-experiment")));
const runsDir = path.resolve(flag("--runs", "tmp/experiment-issue2"));

const combo = await import(pathToFileURL(path.join(path.resolve(comboDir), "src", "index.ts")).href);
const { checkPipelineAgents, commandVerifier, experiment, findPipeline, loadAgents, loadPipelines, runPipeline } = combo;

const here = path.dirname(new URL(import.meta.url).pathname);
const AGENTS = path.join(here, "..", "agents");
const PIPELINES = path.join(here, "..", "pipelines");
const ETALON = "etalon-v1";
const INPUT = "traite le ticket #2 d'ISSUES.md";

// --- L'étalon : la liste d'exports que chaque arbre livré doit encore porter ---

const exportNames = (source: string) => [...source.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1] as string);

fs.rmSync(workdir, { recursive: true, force: true });
fs.mkdirSync(workdir, { recursive: true });
const pristine = path.join(workdir, "etalon");
await run("git", ["clone", "-q", path.resolve(neonSrc), pristine]);
await run("git", ["-C", pristine, "checkout", "-q", ETALON]);
const etalonExports = exportNames(fs.readFileSync(path.join(pristine, "game", "neon.js"), "utf8"));

// Le test de parité de référence, exécuté seul dans l'arbre livré. Fichier
// séparé plutôt qu'ajout au fichier de tests du run : ses imports ne dépendent
// pas de ce que le run a écrit.
const PARITY_TEST = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frame, createState, BRICK_GAP } from './neon.js';

test('parity: every live brick the ball overlaps dies in the same frame', () => {
  const ctx = { fillStyle: '', font: '', fillRect() {}, beginPath() {}, arc() {}, fill() {}, fillText() {} };
  const state = createState(1);
  const [a, b] = state.bricks;
  state.ball = { x: a.x + a.w + BRICK_GAP / 2, y: a.y + a.h / 2, r: 7, vx: 0, vy: 0 };
  frame(ctx, state);
  assert.equal(a.alive, false);
  assert.equal(b.alive, false);
  assert.equal(state.combo, 2);
});
`;

// --- Les vérifications, chacune exécutable -------------------------------------

const green = async (cwd: string, file?: string) => {
	try {
		await run("node", ["--test", file ?? "game/**/*.test.js"], { cwd, timeout: 60_000 });
		return true;
	} catch {
		return false;
	}
};

async function probePurity(clone: string): Promise<boolean> {
	try {
		const game = await import(pathToFileURL(path.join(clone, "game", "neon.js")).href);
		if (typeof game.brickHit !== "function") return false;
		const bricks = game.makeBricks(1).map((brick: object) => Object.freeze({ ...brick }));
		const target = bricks[0];
		const ball = Object.freeze({ x: target.x + target.w / 2, y: target.y + target.h / 2, r: 7 });
		const hits = game.brickHit(ball, bricks);
		return Array.isArray(hits) && hits.includes(target) && target.alive === true;
	} catch {
		return false;
	}
}

async function inScope(clone: string): Promise<boolean> {
	const { stdout } = await run("git", ["-C", clone, "status", "--porcelain"]);
	return stdout
		.split("\n")
		.filter(Boolean)
		.map((line) => line.slice(3))
		.filter((file) => !file.startsWith("runs/") && !file.startsWith(".pi/"))
		.every((file) => file.startsWith("game/"));
}

// --- La matrice -----------------------------------------------------------------

console.log(`modèles: ${models.join(", ")} | répétitions: ${repetitions} | concurrence: ${concurrency}`);
console.log(`clones: ${workdir} | rapport: ${runsDir}\n`);

const report = await experiment({
	models,
	repetitions,
	concurrency,
	runsDir,
	timeoutMs: 300_000,
	name: "issue2 : convergence du pipeline, gemma contre deepseek-flash",
	run: async (cell: { model: string; repetition: number; dir: string; options: object }) => {
		const clone = path.join(workdir, `${cell.model.replaceAll("/", "-")}-rep${cell.repetition}`);
		await run("git", ["clone", "-q", pristine, clone]);
		await run("git", ["-C", clone, "checkout", "-q", ETALON]);
		for (const [from, to] of [
			[AGENTS, path.join(clone, ".pi", "agents")],
			[PIPELINES, path.join(clone, ".pi", "pipelines")],
		] as const) {
			fs.mkdirSync(to, { recursive: true });
			for (const file of fs.readdirSync(from).filter((name) => name.endsWith(".md"))) {
				fs.copyFileSync(path.join(from, file), path.join(to, file));
			}
		}

		const agents = loadAgents({ cwd: clone, scope: "project" });
		const pipeline = findPipeline(loadPipelines({ cwd: clone, scope: "project" }), "issue2");
		checkPipelineAgents(pipeline, agents);
		const verify = commandVerifier({ cwd: clone, command: "npm", args: ["test"] });

		let done: { ok: boolean; error?: string; steps: { id: string; delivery?: { approved: boolean; verification?: { ok: boolean }; tasks?: { rounds?: number }[] } }[] };
		try {
			done = await runPipeline({ pipeline, agents, input: INPUT, verify, ...cell.options, cwd: clone });
		} catch (thrown) {
			fs.rmSync(clone, { recursive: true, force: true });
			return { ok: false, error: String(thrown) };
		}

		const delivery = done.steps.find((step) => step.id === "work")?.delivery;
		const source = fs.readFileSync(path.join(clone, "game", "neon.js"), "utf8");
		const delivered = exportNames(source);

		const flags = {
			approved: delivery?.approved ?? false,
			check: delivery?.verification?.ok ?? false,
			signature: /export function brickHit\(ball, bricks\)/.test(source),
			pure: await probePurity(clone),
			parity: false,
			exports: etalonExports.every((name) => delivered.includes(name)),
			in_scope: await inScope(clone),
			rounds: (delivery?.tasks ?? []).reduce((total, task) => total + (task.rounds ?? 0), 0),
		};
		fs.writeFileSync(path.join(clone, "game", "parity.test.js"), PARITY_TEST);
		flags.parity = await green(clone, "game/parity.test.js");

		const { stdout: diff } = await run("git", ["-C", clone, "diff"], { maxBuffer: 8 * 1024 * 1024 });
		fs.writeFileSync(path.join(cell.dir, "delivered.diff"), diff);
		fs.rmSync(clone, { recursive: true, force: true });

		const converged =
			flags.approved && flags.check && flags.signature && flags.pure && flags.parity && flags.exports && flags.in_scope;
		console.log(
			`[${cell.model} rep ${cell.repetition}] converged=${converged} approved=${flags.approved} check=${flags.check} ` +
				`signature=${flags.signature} pure=${flags.pure} parity=${flags.parity} rounds=${flags.rounds}` +
				(done.error ? ` | ${done.error.slice(0, 80)}` : ""),
		);
		return { ok: done.ok, error: done.error, ...flags, converged };
	},
});

console.log(`\nrapport : ${report.dir ?? runsDir}`);
