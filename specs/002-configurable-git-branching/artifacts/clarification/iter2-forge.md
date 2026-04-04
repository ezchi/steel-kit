# Forge — Iteration 2

Addressing Gauge iteration 1 feedback.

## Changes Made

### 1. CLR-1 promoted to [SPEC UPDATE]

**Gauge feedback:** CLR-1 should not remain `[NO SPEC CHANGE]` — slugification rules were left implicit in the normative spec, allowing implementation divergence.

**Action:** 
- Updated CLR-1 marker from `[NO SPEC CHANGE]` to `[SPEC UPDATE]` in clarifications.md
- Added FR-15b to spec.md codifying the slugification algorithm: (1) lowercase, (2) strip non-alphanumeric, (3) trim, (4) collapse whitespace to hyphens, (5) truncate to 40 chars
- Added AC-31 to verify slugification behavior with mixed-case/punctuation input

### 2. Added acceptance criterion for FR-15a

**Gauge feedback:** FR-15a (collision detection) has no matching acceptance criterion — quality evidence gap.

**Action:**
- Added AC-30: `generateSpecId` with `--id PROJ-21` when directory already exists → fails with clear error, no branch/file creation
