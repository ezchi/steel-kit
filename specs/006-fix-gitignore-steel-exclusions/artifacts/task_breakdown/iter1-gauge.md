# Gauge Review — Task Breakdown Iteration 1

**BLOCKING:** Task 1 and Task 6 rely on shell variables surviving across tasks. If executed in separate shells, AC-4 cannot be verified. Persist baseline to a temp file or require a single shell session.

**WARNING:** No explicit verification that removed paths remain on disk after `git rm --cached` (NFR-1). Add filesystem existence checks like `test -f .steel/config.json`.

**WARNING:** `xargs git rm --cached` is only safe for paths without whitespace. Use `git ls-files -z` with `xargs -0` for robustness.

**NOTE:** `grep -v steel-` returns exit status 1 when no lines match. In `set -e` context this can abort the flow.

VERDICT: REVISE
