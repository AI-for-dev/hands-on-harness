# playtest contre playtest-court, sur le rebond de l'issue #1

- etalon `etalon-v1`, provider `ilaas`, model `gemma-4-31b`, thinking `high`
- 20 repetitions, concurrency 5, timeout 1800s

### Scores, cell by test

| cell | delivered | suite_lancee | skill_invoque | in_scope | tests_ajoutes | rebond_briques | rebond_angles | rebond_sortie | rebond_voisines | rebond_traversee |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| +agents+skill | 19/20 | 18/20 | 20/20 | 9/20 | 13/20 | 14/20 | 4/20 | 12/20 | 13/20 | 8/20 |
| +agents+skill_court | 20/20 | 19/20 | 20/20 | 20/20 | 20/20 | 17/20 | 8/20 | 16/20 | 17/20 | 6/20 |

`x/n`: the test was true in `x` of the `n` runs that could judge it.
A run that produced no measurement is in no denominator here.
Declared but not scored here, having no `x/n` to show: `sonde_intacte`, `touched` - a number or a diagnostic, readable per run in `measures.json`.

### Cost, median and 95% interval by resampling

10000 draws, seed 20260729: the interval is reproducible.

| cell | n | in | out | duration (s) |
| --- | --- | --- | --- | --- |
| +agents+skill | 19 | 969 426 [567 252, 1 340 414] | 21 016 [15 716, 25 901] | 499 [403, 771] |
| +agents+skill_court | 20 | 429 108 [369 100, 565 138] | 14 498 [13 422, 17 134] | 350 [262, 448] |

Over the runs the verdict rests on: valid, and passing `[verdict].validity`.
A level carries no verdict - two intervals that do not overlap are not a
result, and the gap that would be one is in the table below.

### Gap to `+agents+skill`, 95% interval by resampling

10000 draws, seed 20260729: the verdict is reproducible.

| cell | in | out | turns | duration | rebond_briques |
| --- | --- | --- | --- | --- | --- |
| +agents+skill_court | -540 318 * | -6 518 * | -15 * | -148 * | +11 pts o |

`*` established, the interval excludes zero - `o` inconclusive.

**No sentence may rest on an `o`.** The table shows them anyway:
hiding a measurement would be another dishonesty, and the dispersion
is precisely what this is for.

#### What is publishable

- `+agents+skill_court`: **in -540 318**, interval [-916 565, -135 466]
- `+agents+skill_court`: **out -6 518**, interval [-10 993, -808]
- `+agents+skill_court`: **turns -15**, interval [-26, -3]
- `+agents+skill_court`: **duration -148**, interval [-450, -18]

:warning: **The cost columns (in, out, turns, duration) must not be read here.** 490 retries across the matrix, in +agents+skill, +agents+skill_court. A retry replays the turn with the whole accumulated context, so these columns reflect our own load on the provider rather than the configuration - including any of them marked established.

