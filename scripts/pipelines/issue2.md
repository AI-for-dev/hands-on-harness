---
name: issue2
description: Impact note and test plan in parallel, then plan, pair and audit on the ticket, gated by the test suite
verify: [npm, test]
steps:
  - id: note
    fanOut: [explorer, tester]
    tasks:
      - Produce the impact note for this ticket.
      - List the test cases this ticket needs, saying which ones already exist. Start with the behaviours the extraction must not change.
    concurrency: 2
    openInHerdr: true
  - id: work
    deliver: planner
    workers: [coder]
    reviewer: reviewer
    auditor: auditor
    maxTasks: 2
    concurrency: 1
    maxRounds: 3
    maxAuditRounds: 3
---

## note

Work on the ticket in the request below.

## work

Deliver what the ticket below asks for, using the impact note and the test
plan as the map of where things live and what must be pinned down.

The contract is the ticket's, not yours to redesign:

- the new function is `brickHit(ball, bricks)`, exported from `game/neon.js`;
- it is pure: it returns the array of every alive brick the ball overlaps,
  and mutates nothing;
- `frame()` behaves exactly as before, including when the ball overlaps
  several bricks at once: every one of them dies in that same frame, with one
  combo increment each. Pin that behaviour with a test before moving the
  logic; it starts green and stays green through the move. Build the case
  with a ball of radius 7 centred in the gap between two adjacent bricks:
  it overlaps exactly those two, and nothing else.

The steps of this ticket are sequential, so keep the plan to a single subtask
unless two pieces are genuinely independent. Every behaviour change starts
with its red test, written in `game/neon.test.js`.
