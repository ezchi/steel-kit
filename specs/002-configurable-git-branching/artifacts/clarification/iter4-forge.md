# Forge — Iteration 4

Addressing Gauge iteration 3 feedback.

## Changes Made

### AC-34: Slugification parity across modes

**Gauge feedback:** FR-15b says the algorithm applies identically whether `--id` is provided or omitted, but no AC explicitly asserts cross-mode parity.

**Action:** Added AC-34: `generateSpecId` with `--id PROJ-21` and description `"  Spaced  Out!!  "` produces the same semantic-name portion (`spaced-out`) as without `--id` and the same description.
