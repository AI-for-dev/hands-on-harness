# Les leviers de contexte du module 2.1, contre le rebond de l'issue #1

- etalon `etalon-v1`, provider `opencode-go`, model `deepseek-v4-flash`, thinking `off`
- 20 repetitions, concurrency 5, timeout 1800s

### Scores, cell by test

| cell | delivered | suite_lancee | skill_invoque | sonde_intacte | in_scope | tests_ajoutes | rebond_briques | rebond_angles | rebond_sortie | rebond_voisines | rebond_traversee |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nothing | 19/20 | 19/20 | 0/20 | - | 18/20 | 14/20 | 13/20 | 8/20 | 13/20 | 11/20 | 11/20 |
| +thinking | 20/20 | 20/20 | 0/20 | - | 12/20 | 20/20 | 15/20 | 15/20 | 15/20 | 15/20 | 16/20 |
| +agents | 20/20 | 20/20 | 0/20 | - | 20/20 | 11/20 | 17/20 | 8/20 | 18/20 | 17/20 | 7/20 |
| +well_crafted | 20/20 | 20/20 | 0/20 | - | 20/20 | 20/20 | 18/20 | 19/20 | 19/20 | 18/20 | 19/20 |
| -system_prompt | 20/20 | 20/20 | 0/20 | - | 20/20 | 12/20 | 19/20 | 15/20 | 19/20 | 19/20 | 6/20 |
| +agents+well_crafted | 19/20 | 19/20 | 0/20 | - | 19/20 | 19/20 | 19/20 | 19/20 | 19/20 | 19/20 | 19/20 |
| +agents+skill | 20/20 | 20/20 | 20/20 | - | 12/20 | 20/20 | 17/20 | 16/20 | 17/20 | 17/20 | 19/20 |
| +agents+add_tests+well_crafted | 20/20 | 20/20 | 0/20 | 20/20 | 20/20 | 18/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 |
| +agents+add_tests+skill | 19/20 | 20/20 | 20/20 | 20/20 | 7/20 | 10/20 | 19/20 | 19/20 | 19/20 | 19/20 | 19/20 |

`x/n`: the test was true in `x` of the `n` runs that could judge it.
A run that produced no measurement is in no denominator here.
Declared but not scored here, having no `x/n` to show: `touched` - a number or a diagnostic, readable per run in `measures.json`.

### Cost, median and 95% interval by resampling

10000 draws, seed 20260729: the interval is reproducible.

| cell | n | in | out | duration (s) |
| --- | --- | --- | --- | --- |
| nothing | 19 | 17 292 [9 616, 20 681] | 20 957 [14 050, 23 300] | 177 [128, 211] |
| +thinking | 20 | 13 225 [12 098, 15 730] | 53 979 [44 871, 66 196] | 490 [364, 565] |
| +agents | 20 | 8 553 [6 426, 15 638] | 6 917 [1 848, 19 424] | 66 [21, 178] |
| +well_crafted | 20 | 19 847 [17 236, 23 209] | 26 665 [22 717, 32 509] | 252 [192, 312] |
| -system_prompt | 20 | 15 358 [10 842, 16 666] | 15 656 [7 420, 20 744] | 142 [72, 192] |
| +agents+well_crafted | 19 | 9 878 [9 213, 10 982] | 69 557 [56 049, 79 990] | 553 [435, 609] |
| +agents+skill | 20 | 36 002 [33 870, 58 106] | 119 952 [111 884, 131 418] | 1 068 [912, 1 148] |
| +agents+add_tests+well_crafted | 20 | 15 465 [13 912, 16 716] | 48 394 [39 626, 58 564] | 410 [342, 448] |
| +agents+add_tests+skill | 19 | 33 123 [29 644, 36 841] | 81 326 [66 708, 86 413] | 667 [574, 781] |

Over the runs the verdict rests on: valid, and passing `[verdict].validity`.
A level carries no verdict - two intervals that do not overlap are not a
result, and the gap that would be one is in the table below.

### Gap to `nothing`, 95% interval by resampling

10000 draws, seed 20260729: the verdict is reproducible.

| cell | in | out | turns | duration | rebond_briques |
| --- | --- | --- | --- | --- | --- |
| +agents | -8 739 o | -14 040 o | -6 o | -112 o | +17 pts o |
| +agents+add_tests+skill | +15 831 * | +60 369 * | +7 * | +490 * | +32 pts * |
| +agents+add_tests+well_crafted | -1 827 o | +27 438 * | -6 * | +234 * | +32 pts * |
| +agents+skill | +18 710 * | +98 996 * | +26 * | +890 * | +17 pts o |
| +agents+well_crafted | -7 414 o | +48 600 * | -4 o | +376 * | +32 pts * |
| +thinking | -4 067 o | +33 022 * | +0 o | +313 * | +7 pts o |
| +well_crafted | +2 555 o | +5 708 * | -4 o | +75 * | +22 pts o |
| -system_prompt | -1 934 o | -5 302 o | -2 o | -34 o | +27 pts * |

`*` established, the interval excludes zero - `o` inconclusive.

**No sentence may rest on an `o`.** The table shows them anyway:
hiding a measurement would be another dishonesty, and the dispersion
is precisely what this is for.

#### What is publishable

- `+agents+add_tests+skill`: **in +15 831**, interval [+9 844, +23 597]
- `+agents+add_tests+skill`: **out +60 369**, interval [+45 575, +70 684]
- `+agents+add_tests+skill`: **turns +7**, interval [+1, +11]
- `+agents+add_tests+skill`: **duration +490**, interval [+394, +628]
- `+agents+add_tests+skill`: **rebond_briques +32 pts**, interval [+11 pts, +53 pts]
- `+agents+add_tests+well_crafted`: **out +27 438**, interval [+18 309, +40 490]
- `+agents+add_tests+well_crafted`: **turns -6**, interval [-12, -3]
- `+agents+add_tests+well_crafted`: **duration +234**, interval [+162, +316]
- `+agents+add_tests+well_crafted`: **rebond_briques +32 pts**, interval [+11 pts, +53 pts]
- `+agents+skill`: **in +18 710**, interval [+13 996, +41 245]
- `+agents+skill`: **out +98 996**, interval [+90 238, +114 854]
- `+agents+skill`: **turns +26**, interval [+17, +32]
- `+agents+skill`: **duration +890**, interval [+730, +1 002]
- `+agents+well_crafted`: **out +48 600**, interval [+33 530, +63 578]
- `+agents+well_crafted`: **duration +376**, interval [+251, +459]
- `+agents+well_crafted`: **rebond_briques +32 pts**, interval [+11 pts, +53 pts]
- `+thinking`: **out +33 022**, interval [+23 864, +48 016]
- `+thinking`: **duration +313**, interval [+178, +416]
- `+well_crafted`: **out +5 708**, interval [+192, +15 974]
- `+well_crafted`: **duration +75**, interval [+4, +165]
- `-system_prompt`: **rebond_briques +27 pts**, interval [+6 pts, +48 pts]

:warning: **The cost columns (in, out, turns, duration) must not be read here.** 37 retries across the matrix, in +agents, +agents+add_tests+skill, +agents+add_tests+well_crafted, +agents+skill, +agents+well_crafted, +thinking, +well_crafted, -system_prompt, nothing. A retry replays the turn with the whole accumulated context, so these columns reflect our own load on the provider rather than the configuration - including any of them marked established.
