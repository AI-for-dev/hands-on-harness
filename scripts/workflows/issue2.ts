/**
 * Le workflow du ticket #2 de NÉON, écrit en code : la même chose que le
 * pipeline `issue2.md`, plus ce qu'un fichier ne sait pas dire - aucun arrêt
 * entre la demande et le verdict et un code de sortie qu'une machine sait
 * lire, une politique de verdict qui appartient à l'appelant (ici, un pair
 * non convergé est un veto), et la mesure du parallélisme, la concurrence
 * étant décidée à l'exécution.
 *
 * Il laisse la même trace qu'un `/build` : un HTML et un JSONL par sous-agent,
 * et le `usage.json` du run, dans `runs/<horodatage>/`.
 *
 *   node scripts/workflows/issue2.ts \
 *     /chemin/vers/neon /chemin/vers/combo [--sequential] [--model <pattern>]
 *
 * combo est importé depuis son clone, sans installation : les deux chemins
 * sont des arguments, jamais des variables d'environnement.
 */

import * as path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const flag = args.indexOf("--model");
const model = flag >= 0 ? args[flag + 1] : undefined;
const positional = flag >= 0 ? [...args.slice(0, flag), ...args.slice(flag + 2)] : args;
const sequential = positional.includes("--sequential");
const [neonDir, comboDir] = positional.filter((value) => !value.startsWith("--"));

if (!neonDir || !comboDir) {
	console.error("usage: issue2.ts <neon> <combo> [--sequential] [--model <pattern>]");
	process.exit(1);
}

const combo = await import(pathToFileURL(path.join(comboDir, "src", "index.ts")).href);
const {
	combineReporters,
	commandVerifier,
	consoleReporter,
	createRunDir,
	createTuiCollector,
	deliver,
	fanOut,
	findAgent,
	loadAgents,
	usageReport,
	writeUsageReport,
} = combo;

const cwd = path.resolve(neonDir);
const agents = loadAgents({ cwd, scope: "project" });
const exportDir = createRunDir(path.join(cwd, "runs"));

// Two reporters on one bus: one prints, one collects. The collected picture is
// what `usage.json` is written from at the end, so the run directory of this
// script carries the same three things a `/build` leaves behind.
const collector = createTuiCollector();
const startedAt = Date.now();
const shared = {
	cwd,
	model,
	exportDir,
	timeoutMs: 300_000,
	onEvent: combineReporters(collector.reporter, consoleReporter()),
};

const ticket = [
	"Ticket #2 of ISSUES.md - collision entangled with rendering.",
	"Extract a pure, testable function brickHit(ball, bricks) out of frame(),",
	"without changing the public API (the already-exported functions of game/neon.js).",
	"",
	"The contract is the ticket's, not yours to redesign:",
	"- the new function is `brickHit(ball, bricks)`, exported from `game/neon.js`;",
	"- it is pure: it returns the array of every alive brick the ball overlaps, and mutates nothing;",
	"- `frame()` behaves exactly as before, including when the ball overlaps several bricks at once:",
	"  every one of them dies in that same frame, with one combo increment each. Pin that behaviour",
	"  with a test before moving the logic; it starts green and stays green through the move. Build",
	"  the case with a ball of radius 7 centred in the gap between two adjacent bricks: it overlaps",
	"  exactly those two, and nothing else.",
].join("\n");

// --- 1. Explorer et tester : deux branches, en parallèle ou l'une après l'autre

const {
	results: [note, testPlan],
	usage,
} = await fanOut({
	...shared,
	agents: [findAgent(agents, "explorer"), findAgent(agents, "tester")],
	tasks: [
		`Produce the impact note for this ticket.\n\n${ticket}`,
		`List the test cases this ticket needs, saying which ones already exist.\n\n${ticket}`,
	],
	concurrency: sequential ? 1 : 2,
});

console.log(`\nfan-out: ${usage.wallMs.toFixed(0)} ms d'horloge pour ${usage.busyMs.toFixed(0)} ms de travail (×${(usage.busyMs / usage.wallMs).toFixed(2)})`);

if (!note.ok || !testPlan.ok) {
	console.error("exploration failed:", note.error ?? testPlan.error);
	writeUsageReport(exportDir, usageReport(collector.snapshot(), Date.now() - startedAt));
	process.exit(1);
}

// --- 2. La livraison : plan, pair, gate, audit -------------------------------

const brief = [ticket, "", "## Impact note", "", note.output, "", "## Test plan", "", testPlan.output].join("\n");

const built = await deliver({
	...shared,
	planner: findAgent(agents, "planner"),
	workers: [findAgent(agents, "coder")],
	reviewer: findAgent(agents, "reviewer"),
	auditor: findAgent(agents, "auditor"),
	brief,
	maxTasks: 2,
	concurrency: 1,
	maxRounds: 3,
	maxAuditRounds: 3,
	verify: commandVerifier({ cwd, command: "npm", args: ["test"] }),
});

// La politique du verdict est du code appelant : `approved` agrège l'audit et
// le check, pas l'accord des pairs. Ici, un pair non convergé est un veto.
const pairsApproved = built.tasks.every((task) => task.approved);

console.log(`\nplan: ${built.plan.length} subtask(s)`);
for (const round of built.audits) console.log(`audit: ${round.review.output.split("\n")[0]}`);
console.log(`check: ${built.verification?.ok ? "green" : "red"}`);
console.log(`approved: ${built.approved} (pairs: ${pairsApproved})`);
console.log(`usage: ${writeUsageReport(exportDir, usageReport(collector.snapshot(), Date.now() - startedAt))}`);
console.log(`exports: ${exportDir}`);

process.exit(built.approved && pairsApproved ? 0 : 1);
