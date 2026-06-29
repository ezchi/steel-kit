# Steel-Kit Observations

A running log of "felt heavy" or "felt off" data points from real Steel-Kit runs. **Not** a list of proposed changes. Each entry is one data point. Patterns emerge after several entries point the same direction; until then, resist building toggles, shortcuts, or new commands.

**Trigger to revisit:** when an observation has 3+ similar entries, promote it to `docs/roadmap-issues.md` with a concrete proposal.

---

## O-1 — Small bug-fix specs incur high ceremony cost

- **Date:** 2026-05-03
- **Source:** retrospect S-4
- **Spec scope:** 14 LOC change in one file (bug fix)
- **Process output:** 26 commits, 13 forge-gauge cycles, ~30 min wall-clock, ~30 artifact files
- **Quality outcome:** Each iteration caught real defects (no churn). Rigor was load-bearing — clarification surfaced over-specifications in FR-3 / NFR-1 / AC-4.

**The tension.** The process-to-code ratio is high, but the rigor that produces the ratio is also what produces the value. Stripping it for "small" specs is not a free lunch.

**Options floated (deliberately not built):**
- (a) `--fast` mode for `/steel-run-all` that skips clarification when spec has zero `[NEEDS CLARIFICATION]` markers AND merges planning+task_breakdown for single-file changes.
- (b) `/steel-bugfix "<one-line>"` shortcut: spec→plan→implementation→validation in one pass, reduced ceremony.

**Why not now:**
- n=1. Need 3+ similar entries before drawing a structural conclusion.
- Both proposals add user-facing surface (new commands/flags). Steel-Kit already exposes 14 steel-* commands; misuse risk is real (users will reach for `/steel-bugfix` on things that aren't one-file fixes).
- Bias toward "make rigor cheaper" over "let users skip rigor." S-3 (verification-task gauge template) is the example pattern: keep the gate, lower the cost.

**Cheaper-rigor levers worth watching for:**
- Auto-shorter gauge prompts when diff is < N LOC.
- Fold planning + task_breakdown templates when scope is single-file.
- Detect `[NEEDS CLARIFICATION]`-free specs and shorten the clarification gauge prompt rather than skipping the stage.

**Revisit when:** a second and third "small spec, heavy ceremony" entry land here, or when a user explicitly complains about ceremony cost on a one-file fix.
