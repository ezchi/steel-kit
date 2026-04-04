# Gauge Review — Specification Iteration 2

**WARNING:** AC-4 is still not fully testable as written. "Non-steel files under `.claude/commands/` and `.agents/skills/` remain tracked (if any exist)" depends on repository state that may not exist in a given checkout, and the spec does not define a concrete verification command or fixture setup for that case. The intent is clear, but the acceptance criterion should either add an explicit precondition/test fixture or move this into a non-functional safeguard rather than a strict AC.

**NOTE:** The testing section is slightly internally tense: it says "no unit tests are needed" because this is a git-configuration change, but V-9 and AC-5 correctly require `npm test` and acknowledge fixture updates in `doctor.test.ts` and `clean.test.ts`. This is not blocking, but it would read more cleanly if the spec said "no new feature tests are required, but existing tests/fixtures affected by `.steel/.gitignore` must be updated and the full suite must pass."

The iteration 1 blocking issues appear resolved:
- The scope is now explicit: durable ignore rules plus a one-time index cleanup, with `steel-init` behavior changes clearly out of scope.
- The brittle state-dependent counts are gone, replaced by pattern-based requirements and `git ls-files` / `git check-ignore` verification.
- Provider parity is addressed with a concrete explanation for why no `.gemini/` ignore rule is needed.
- AC-1 is now precise and anchored to specific commands.
- Test impact is now called out explicitly.

VERDICT: APPROVE
