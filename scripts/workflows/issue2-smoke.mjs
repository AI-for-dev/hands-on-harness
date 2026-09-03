// Preuve de mécanisme du pipeline issue2, rejouable sans modèle : le vrai code
// de combo (parseur, runPipeline, deliver), le vrai `npm test` de NÉON comme
// gate, et un faux modèle dont le coder applique la correction de référence.
//
//   node scripts/workflows/issue2-smoke.mjs /chemin/vers/neon /chemin/vers/combo
//
// Node 23.6 ou plus récent (combo est importé en TypeScript, sans build).
// Le clone de NÉON doit porter les agents et le pipeline dans son `.pi/`.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [neonArg, comboArg] = process.argv.slice(2);
if (!neonArg || !comboArg) {
	console.error("usage: issue2-smoke.mjs <neon> <combo>");
	process.exit(1);
}
const NEON = path.resolve(neonArg);
const COMBO = path.resolve(comboArg);
const PATCH = path.join(here, "issue2-reference.patch");

const { checkPipelineAgents, commandVerifier, findPipeline, loadAgents, loadPipelines, runPipeline } =
	await import(pathToFileURL(path.join(COMBO, "src", "index.ts")).href);
const { fakeSpawn } = await import(pathToFileURL(path.join(COMBO, "test", "fixtures", "fake-subagent.ts")).href);

const reset = () => execFileSync("git", ["checkout", "--", "game"], { cwd: NEON });
const applyPatch = () => execFileSync("git", ["apply", PATCH], { cwd: NEON });
const applyPatchThenSabotage = () => {
	applyPatch();
	appendFileSync(path.join(NEON, "game", "neon.test.js"),
		"\ntest('sabotage: unrelated red test', () => { assert.equal(1, 2); });\n");
};

const ticket = "Ticket #2 of ISSUES.md: extract a pure brickHit(ball, bricks) out of frame(), public API unchanged.";
const planJson = JSON.stringify([{ agent: "coder", task: "Extract brickHit and add its two red tests first." }]);
const planHuman = [
	"1. Extract brickHit out of frame()",
	"   files: game/neon.js, game/neon.test.js",
	"   test:  given a live brick overlapped / when brickHit runs / then it is returned",
	"   done:  npm test green, 8 cases",
].join("\n");

// S1 - le fichier parse, chaque nom d'agent résout, avant toute session.
const agents = loadAgents({ cwd: NEON, scope: "project" });
const pipeline = findPipeline(loadPipelines({ cwd: NEON, scope: "project" }), "issue2");
checkPipelineAgents(pipeline, agents);
console.log("S1 parse+resolve            OK  ", pipeline.steps.map((s) => `${s.id}(${s.kind})`).join(" -> "));

const verify = commandVerifier({ cwd: NEON, command: "npm", args: ["test"] });

function cast({ plannerSays = planJson, reviewerSays = "LGTM", coderDoes = applyPatch } = {}) {
	let coderRan = false;
	return fakeSpawn((task, agent) => {
		switch (agent.name) {
			case "explorer": return { output: "Impact note: game/neon.js:213 frame() brick loop; suite in game/neon.test.js." };
			case "tester": return { output: "Missing cases: brickHit returns the overlapped live brick; a dead brick is never hit." };
			case "planner": return { output: plannerSays };
			case "coder": {
				if (!coderRan) { coderDoes(); coderRan = true; }
				return { output: "Done: brickHit extracted, two tests added in game/neon.test.js." };
			}
			case "reviewer": return { output: reviewerSays };
			case "auditor": return { output: "APPROVED" };
			default: return { output: "?" };
		}
	});
}

const delivery = (done) => done.steps.find((s) => s.id === "work")?.delivery;

// S2 - le chemin vert : diff de référence appliqué, suite verte, tout le monde signe.
reset();
const green = await runPipeline({ pipeline, agents, input: ticket, verify, spawn: cast().spawn });
assert.equal(green.ok, true);
assert.equal(delivery(green).approved, true);
assert.match(delivery(green).verification.output, /pass 9/);
console.log("S2 chemin vert              OK   approved=true, npm test: 9 cas verts");

// S3 - le gate : même diff plus un test saboté ; pair et audit approuvent quand même.
reset();
const gate = await runPipeline({ pipeline, agents, input: ticket, verify,
	spawn: cast({ coderDoes: applyPatchThenSabotage }).spawn });
assert.equal(delivery(gate).approved, false, "une approbation ne doit pas battre un check rouge");
assert.equal(delivery(gate).verification.ok, false);
console.log("S3 gate                     OK   pair LGTM + audit APPROVED, check rouge => approved=false");

// S4 - le planner parle le format « humain » du module précédent : aucun plan exploitable.
reset();
const human = await runPipeline({ pipeline, agents, input: ticket, verify,
	spawn: cast({ plannerSays: planHuman }).spawn });
assert.equal(human.ok, false);
assert.match(human.error ?? "", /no runnable plan/i);
console.log("S4 plan au format humain    OK   'no runnable plan' - la forme appartient à l'appelant");

// S5 - le reviewer approuve avec APPROVED là où le pair attend LGTM.
reset();
const wrongWord = await runPipeline({ pipeline, agents, input: ticket, verify,
	spawn: cast({ reviewerSays: "APPROVED" }).spawn });
const pairResult = delivery(wrongWord).tasks?.[0] ?? delivery(wrongWord).results?.[0];
assert.equal(pairResult.approved, false, "APPROVED ne doit pas approuver un pair qui attend LGTM");
console.log("S5 mauvais mot d'accord     OK   pair jamais approuvé ; le tout reste sauvé par audit + check :",
	"approved(deliver) =", delivery(wrongWord).approved);

reset();
console.log("\nTous les scénarios passent : le mécanisme tient, il ne reste au modèle que le travail.");
