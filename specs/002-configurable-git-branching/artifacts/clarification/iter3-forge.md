# Forge — Iteration 3

Addressing Gauge iteration 2 feedback.

## Changes Made

### 1. AC-30: Full error message with remediation

**Gauge feedback:** AC-30 only checked the shorter prefix message; FR-15a requires the remediation tail.

**Action:** Updated AC-30 to include the full error: `"Spec directory 'specs/PROJ-21-add-auth' already exists. Use a different --id or remove the existing spec."`

### 2. AC-31/32/33: Full slugification coverage

**Gauge feedback:** AC-31 did not cover leading/trailing trim or 40-character truncation.

**Action:**
- AC-31 kept for lowercase + punctuation stripping + whitespace collapsing
- AC-32 added for leading/trailing whitespace trimming
- AC-33 added for 40-character truncation

All five steps of FR-15b are now covered by acceptance criteria.
