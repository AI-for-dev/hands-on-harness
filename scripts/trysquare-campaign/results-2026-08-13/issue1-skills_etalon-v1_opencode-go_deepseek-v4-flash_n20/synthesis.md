# playtest contre playtest-court, sur le rebond de l'issue #1

- etalon `etalon-v1`, provider `opencode-go`, model `deepseek-v4-flash`, thinking `high`
- 20 repetitions, concurrency 5, timeout 1800s

### Scores, cell by test

| cell | delivered | suite_lancee | skill_invoque | in_scope | tests_ajoutes | rebond_briques | rebond_angles | rebond_sortie | rebond_voisines | rebond_traversee |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| +agents+skill | 20/20 | 20/20 | 20/20 | 15/20 | 20/20 | 14/20 | 17/20 | 14/20 | 16/20 | 17/20 |
| +agents+skill_court | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 14/20 | 15/20 | 15/20 | 13/20 | 16/20 |

`x/n`: the test was true in `x` of the `n` runs that could judge it.
A run that produced no measurement is in no denominator here.
Declared but not scored here, having no `x/n` to show: `sonde_intacte`, `touched` - a number or a diagnostic, readable per run in `measures.json`.

### Cost, median and 95% interval by resampling

10000 draws, seed 20260729: the interval is reproducible.

| cell | n | in | out | duration (s) |
| --- | --- | --- | --- | --- |
| +agents+skill | 20 | 34 764 [29 012, 42 017] | 120 298 [107 460, 127 888] | 1 054 [1 002, 1 260] |
| +agents+skill_court | 20 | 12 861 [10 857, 15 892] | 81 256 [70 456, 95 985] | 692 [636, 1 034] |

Over the runs the verdict rests on: valid, and passing `[verdict].validity`.
A level carries no verdict - two intervals that do not overlap are not a
result, and the gap that would be one is in the table below.

### Gap to `+agents+skill`, 95% interval by resampling

10000 draws, seed 20260729: the verdict is reproducible.

| cell | in | out | turns | duration | rebond_briques |
| --- | --- | --- | --- | --- | --- |
| +agents+skill_court | -21 902 * | -39 043 * | -27 * | -362 * | +0 pts o |

`*` established, the interval excludes zero - `o` inconclusive.

**No sentence may rest on an `o`.** The table shows them anyway:
hiding a measurement would be another dishonesty, and the dispersion
is precisely what this is for.

#### What is publishable

- `+agents+skill_court`: **in -21 902**, interval [-29 979, -15 681]
- `+agents+skill_court`: **out -39 043**, interval [-52 684, -20 794]
- `+agents+skill_court`: **turns -27**, interval [-47, -16]
- `+agents+skill_court`: **duration -362**, interval [-573, -1]

:warning: **The cost columns (in, out, turns, duration) must not be read here.** 23 retries across the matrix, in +agents+skill, +agents+skill_court. A retry replays the turn with the whole accumulated context, so these columns reflect our own load on the provider rather than the configuration - including any of them marked established.
