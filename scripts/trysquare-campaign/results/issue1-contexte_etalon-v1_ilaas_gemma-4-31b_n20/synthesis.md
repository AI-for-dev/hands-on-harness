# Les leviers de contexte du module 2.1, contre le rebond de l'issue #1

- etalon `etalon-v1`, provider `ilaas`, model `gemma-4-31b`, thinking `off`
- 20 repetitions, concurrency 5, timeout 1800s
- overrides: {"repetitions": 20}

### Scores, cell by test

| cell | delivered | suite_lancee | skill_invoque | sonde_intacte | in_scope | tests_ajoutes | rebond_briques | rebond_angles | rebond_sortie | rebond_voisines | rebond_traversee |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nothing | 20/20 | 0/20 | 0/20 | - | 20/20 | 0/20 | 11/20 | 0/20 | 9/20 | 7/20 | 0/20 |
| +thinking | 19/20 | 15/20 | 0/20 | - | 19/20 | 3/20 | 16/20 | 0/20 | 17/20 | 15/20 | 0/20 |
| +agents | 20/20 | 20/20 | 0/20 | - | 20/20 | 0/20 | 9/20 | 0/20 | 8/20 | 6/20 | 0/20 |
| +well_crafted | 18/20 | 20/20 | 0/20 | - | 18/20 | 17/20 | 13/20 | 14/20 | 13/20 | 13/20 | 4/20 |
| -system_prompt | 20/20 | 0/20 | 0/20 | - | 20/20 | 0/20 | 14/20 | 0/20 | 14/20 | 13/20 | 0/20 |
| +agents+well_crafted | 19/20 | 20/20 | 0/20 | - | 19/20 | 17/20 | 11/20 | 12/20 | 9/20 | 9/20 | 12/20 |
| +agents+skill | 19/20 | 20/20 | 20/20 | - | 6/20 | 8/20 | 16/20 | 7/20 | 13/20 | 14/20 | 10/20 |
| +agents+add_tests+well_crafted | 20/20 | 20/20 | 0/20 | 20/20 | 20/20 | 17/20 | 18/20 | 18/20 | 18/20 | 18/20 | 17/20 |
| +agents+add_tests+skill | 20/20 | 20/20 | 20/20 | 20/20 | 9/20 | 7/20 | 13/20 | 12/20 | 13/20 | 13/20 | 10/20 |

`x/n`: the test was true in `x` of the `n` runs that could judge it.
A run that produced no measurement is in no denominator here.
Declared but not scored here, having no `x/n` to show: `touched` - a number or a diagnostic, readable per run in `measures.json`.

### Cost, median and 95% interval by resampling

10000 draws, seed 20260729: the interval is reproducible.

| cell | n | in | out | duration (s) |
| --- | --- | --- | --- | --- |
| nothing | 20 | 13 162 [13 138, 13 984] | 833 [767, 845] | 16 [10, 27] |
| +thinking | 19 | 43 849 [37 775, 71 540] | 5 711 [4 453, 7 631] | 116 [90, 160] |
| +agents | 20 | 24 810 [24 725, 24 838] | 811 [762, 860] | 23 [21, 25] |
| +well_crafted | 18 | 458 410 [239 329, 546 382] | 12 268 [7 569, 17 737] | 296 [230, 706] |
| -system_prompt | 20 | 10 725 [10 706, 10 753] | 868 [831, 892] | 25 [17, 28] |
| +agents+well_crafted | 19 | 413 335 [244 317, 578 147] | 20 027 [15 465, 25 071] | 378 [315, 616] |
| +agents+skill | 19 | 921 783 [634 212, 1 487 401] | 21 567 [16 016, 24 646] | 575 [460, 902] |
| +agents+add_tests+well_crafted | 20 | 558 473 [294 876, 770 306] | 20 215 [13 984, 26 976] | 590 [438, 943] |
| +agents+add_tests+skill | 20 | 811 584 [645 820, 1 123 646] | 16 704 [14 196, 28 724] | 540 [330, 847] |

Over the runs the verdict rests on: valid, and passing `[verdict].validity`.
A level carries no verdict - two intervals that do not overlap are not a
result, and the gap that would be one is in the table below.

### Gap to `nothing`, 95% interval by resampling

10000 draws, seed 20260729: the verdict is reproducible.

| cell | in | out | turns | duration | rebond_briques |
| --- | --- | --- | --- | --- | --- |
| +agents | +11 648 * | -22 o | +1 * | +8 o | -10 pts o |
| +agents+add_tests+skill | +798 423 * | +15 870 * | +40 * | +524 * | +10 pts o |
| +agents+add_tests+well_crafted | +545 312 * | +19 382 * | +27 * | +575 * | +35 pts * |
| +agents+skill | +908 622 * | +20 734 * | +47 * | +560 * | +29 pts * |
| +agents+well_crafted | +400 174 * | +19 194 * | +27 * | +362 * | +3 pts o |
| +thinking | +30 688 * | +4 878 * | +9 * | +100 * | +29 pts * |
| +well_crafted | +445 248 * | +11 434 * | +22 * | +280 * | +17 pts o |
| -system_prompt | -2 436 * | +36 o | +0 o | +10 o | +15 pts o |

`*` established, the interval excludes zero - `o` inconclusive.

**No sentence may rest on an `o`.** The table shows them anyway:
hiding a measurement would be another dishonesty, and the dispersion
is precisely what this is for.

#### What is publishable

- `+agents`: **in +11 648**, interval [+10 792, +11 685]
- `+agents`: **turns +1**, interval [+0.5, +1]
- `+agents+add_tests+skill`: **in +798 423**, interval [+632 638, +1 110 495]
- `+agents+add_tests+skill`: **out +15 870**, interval [+13 360, +27 890]
- `+agents+add_tests+skill`: **turns +40**, interval [+32, +45]
- `+agents+add_tests+skill`: **duration +524**, interval [+310, +834]
- `+agents+add_tests+well_crafted`: **in +545 312**, interval [+281 714, +757 150]
- `+agents+add_tests+well_crafted`: **out +19 382**, interval [+13 150, +26 168]
- `+agents+add_tests+well_crafted`: **turns +27**, interval [+21, +34]
- `+agents+add_tests+well_crafted`: **duration +575**, interval [+421, +932]
- `+agents+add_tests+well_crafted`: **rebond_briques +35 pts**, interval [+10 pts, +60 pts]
- `+agents+skill`: **in +908 622**, interval [+621 042, +1 474 243]
- `+agents+skill`: **out +20 734**, interval [+15 183, +23 826]
- `+agents+skill`: **turns +47**, interval [+39, +64]
- `+agents+skill`: **duration +560**, interval [+442, +887]
- `+agents+skill`: **rebond_briques +29 pts**, interval [+3 pts, +55 pts]
- `+agents+well_crafted`: **in +400 174**, interval [+231 154, +564 988]
- `+agents+well_crafted`: **out +19 194**, interval [+14 632, +24 262]
- `+agents+well_crafted`: **turns +27**, interval [+20, +35]
- `+agents+well_crafted`: **duration +362**, interval [+297, +601]
- `+thinking`: **in +30 688**, interval [+24 610, +58 380]
- `+thinking`: **out +4 878**, interval [+3 620, +6 811]
- `+thinking`: **turns +9**, interval [+6, +13]
- `+thinking`: **duration +100**, interval [+67, +147]
- `+thinking`: **rebond_briques +29 pts**, interval [+3 pts, +55 pts]
- `+well_crafted`: **in +445 248**, interval [+226 131, +533 194]
- `+well_crafted`: **out +11 434**, interval [+6 724, +16 688]
- `+well_crafted`: **turns +22**, interval [+17, +24]
- `+well_crafted`: **duration +280**, interval [+219, +671]
- `-system_prompt`: **in -2 436**, interval [-3 268, -2 400]

:warning: **The cost columns (in, out, turns, duration) must not be read here.** 1151 retries across the matrix, in +agents, +agents+add_tests+skill, +agents+add_tests+well_crafted, +agents+skill, +agents+well_crafted, +thinking, +well_crafted, -system_prompt, nothing. A retry replays the turn with the whole accumulated context, so these columns reflect our own load on the provider rather than the configuration - including any of them marked established.

