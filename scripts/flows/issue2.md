---
name: issue2
description: The previous module's loop, from the impact note to the audit
input: string
timeout: 15m

nodes:
  # The two readings of the ticket, at the same time: neither one writes.
  - id: survey
    parallel:
      impact:
        - id: note
          agent: explorer
          retry: 1
          reads: [input]
      cases:
        - id: cases
          agent: tester
          retry: 1
          reads: [input]

  # Back to the planner: a second round replans what the audit left open.
  - id: round
    loop: suite.output.passed && audit.output.approved
    max: 2
    ledger: round
    do:
      - id: plan
        agent: planner
        retry: 1
        reads: [input, survey.output.impact.output, survey.output.cases.output, round.ledger]
        output: { steps: [{ text: string }] }

      # One step after the other, in the same tree.
      - id: steps
        map-from: plan.output.steps
        max: 6
        do:
          # Back to the coder: up to three attempts per step.
          - id: step
            loop: tests.output.passed && review.output.approved
            max: 3
            ledger: step
            on-fail: continue
            do:
              - id: code
                agent: coder
                retry: 1
                memory: step
                reads: [input, item.text, step.previous.tests, step.previous.review, step.ledger]

              - id: tests
                check: .pi/checks/test.sh

              - id: review
                agent: reviewer
                retry: 1
                memory: step
                verdict: step
                reads: [input, item.text, code, diff, tests]

      - id: suite
        check: .pi/checks/test.sh

      - id: audit
        agent: auditor
        retry: 1
        verdict: round
        reads: [input, steps, suite, diff, round.ledger]
---

## note
Write the impact note for the ticket named under `input`.

## cases
List the test cases the ticket named under `input` needs, saying which ones
already exist. Start with the behaviours the extraction must not change.

## plan
Split the ticket named under `input` into small steps, using the impact note
and the test plan as your map. When `round.ledger` is not empty, this is a
second round: plan only what the audit raised and nobody closed.

The contract is the ticket's, not yours:

- the new function is `brickHit(ball, bricks)`, exported from `game/neon.js`;
- it is pure: it returns the array of every alive brick the ball overlaps,
  and changes nothing;
- `frame()` behaves exactly as before, including when the ball overlaps
  several bricks: each one dies in the same frame, with one combo increment
  each. A test pins this behaviour before the logic moves, with a ball of
  radius 7 centred in the gap between two neighbouring bricks.

The coder sees only the text of its step: name the files, restate the part of
the contract the step touches, and say what "done" looks like. Every step
starts with its red test, written in `game/neon.test.js`, and ends on a green
suite: the red test and the code that makes it pass go in the same step,
never in two.

## code
Carry out the step described under `item.text`, and only that step.

When `step.previous.review` follows, the reviewer did not approve your last
change: address every remark and every obligation in `step.ledger`, or say
plainly why you do not. `step.previous.tests` gives the suite's output after
that change.

## review
Review the change made for the step described under `item.text`. The coder's
report is under `code`, the change under `diff`, the suite's output under
`tests`. The report is a claim; the diff and the code are the evidence.
Approve, or raise what must still change.

## audit
Review the whole change under `diff` against the ticket named under `input`.
`steps` says how the review of each step ended: a step that did not converge
is not done until the code shows it. `suite` says whether the project's tests
pass. `round.ledger` holds what an earlier audit raised and nobody closed.

Approve the whole, or raise each correction on its own line.
