# Steel-Kit

A dual-agent AI development framework that orchestrates multiple LLM CLIs (Claude Code, Gemini CLI, OpenAI Codex) in a spec-driven development workflow.

## How It Works

Steel-Kit implements a **Forge + Gauge** pattern:

- **Forge** (primary LLM) executes tasks: writes specs, plans, code
- **Gauge** (inspector LLM) reviews every Forge output against quality criteria
- The loop continues until the Gauge approves or max iterations are reached
- Every iteration is documented and git-committed

## Setup And Workflow

Inspired by [github/spec-kit](https://github.com/github/spec-kit):

Setup is required once per project:

| Setup Step    | Command                |
|---------------|------------------------|
| Init          | `steel init`           |
| Constitution  | `steel constitution`   |

The staged workflow begins only after the constitution is set:

| Stage          | Command                  | Human Approval      |
|----------------|--------------------------|---------------------|
| Specification  | `steel specify "<desc>"` | Required to advance |
| Clarification  | `steel clarify`          | Required to advance |
| Planning       | `steel plan`             | Automatic           |
| Task Breakdown | `steel tasks`            | Automatic           |
| Implementation | `steel implement`        | Automatic           |
| Validation     | `steel validate`         | Automatic           |
| Retrospect     | `steel retrospect`       | Automatic           |

Check progress anytime with `steel status`.

**Shortcut commands** (available after specification stage):
- `steel next` — run the next stage automatically
- `steel run-all` — run all remaining stages in sequence (stops if human approval is declined)

**Utility commands**:
- `steel update` — refresh Claude/Gemini/Codex command files in the current project
- `steel upgrade` — upgrade the Steel-Kit CLI itself to the latest npm release
- `steel clean` — remove artifacts of current workflow and reset state

## Installation

### Preferred install

```bash
npm install -g @steel-kit/core
```

### From source (local development only)

```bash
git clone https://github.com/ezchi/steel-kit.git
cd steel-kit
npm install
npm run build
npm link
```

This makes the `steel` command available globally from your checkout. Use this path only if you are actively developing Steel-Kit itself.

### Prerequisites

At least one LLM CLI must be installed and authenticated:

- **Claude Code**: `npm install -g @anthropic-ai/claude-code` + `ANTHROPIC_API_KEY` or `claude login`
- **Gemini CLI**: `npm install -g @anthropic-ai/gemini-cli` + `GEMINI_API_KEY` or `gemini login`
- **Codex CLI**: `npm install -g @openai/codex` + `CODEX_API_KEY` or `codex login`

## Quick Start

### 1. Initialize (`steel init`)

Run `steel init` inside your project (must be a git repo). You will be prompted for exactly **2 choices**, then everything else is automatic:

1. **Select Forge (primary) LLM provider** — `claude`, `gemini`, or `codex`
2. **Select Gauge (inspector) LLM provider** — `claude`, `gemini`, or `codex`

After selection, the tool will automatically:
- Verify both CLIs are installed and authenticated (warns if not)
- Create `.steel/` directory with `config.json`, `constitution.md`, and `.gitignore`
- Install workflow commands for:
  - Claude Code in `.claude/commands/`
  - Gemini CLI in `.gemini/commands/`
  - Codex CLI skills in `.agents/skills/`
- Auto-commit the initialization to git

No LLM calls are made during init — it completes instantly.

After init, generate or write your project constitution before starting the workflow:

```bash
steel constitution
```

This calls the Forge LLM to analyze your project and generate `.steel/constitution.md` with governing principles, coding standards, and constraints. Requires LLM auth to be set up. You can also skip this and edit `.steel/constitution.md` manually.

`steel specify` will refuse to start until `.steel/constitution.md` contains a real project constitution rather than the placeholder template.
All later workflow stages are blocked by the same gate as well, including `steel next` and `steel run-all`.

### 2. Run the workflow

```bash
# Create a feature specification
steel specify "Add user authentication with OAuth2"

# Clarify ambiguities
steel clarify

# Generate implementation plan
steel plan

# Break into tasks
steel tasks

# Implement (Forge writes code, Gauge reviews each task)
steel implement

# Validate the implementation
steel validate

# Capture learnings and follow-ups
steel retrospect
```

## Configuration

`steel init` creates `.steel/config.json` interactively. You can also use a `steel.config.yaml`:

```yaml
forge:
  provider: claude    # claude | gemini | codex
gauge:
  provider: gemini    # claude | gemini | codex
maxIterations: 5
autoCommit: true
specsDir: specs
```

Environment variables override config:
- `STEEL_FORGE_PROVIDER`, `STEEL_FORGE_MODEL`
- `STEEL_GAUGE_PROVIDER`, `STEEL_GAUGE_MODEL`
- `STEEL_MAX_ITERATIONS`

## Updating Steel-Kit

Use these two commands separately:

```bash
# Upgrade the installed Steel-Kit CLI
steel upgrade

# Refresh command files in the current project
steel update
```

`steel update` installs or refreshes:
- Claude Code commands in `.claude/commands/`
- Gemini CLI commands in `.gemini/commands/`
- Codex skills in `.agents/skills/`

## Codex CLI Notes

Steel-Kit derives Codex skills from the same canonical workflow command files used for Claude Code and Gemini CLI, so the three agent surfaces stay aligned.

After running `steel init` or `steel update`:
- Restart Codex CLI if it was already open
- Use `$steel-init`, `$steel-constitution`, `$steel-specify`, `$steel-plan`, and the other `$steel-*` skills inside Codex
- The installed skills live in `.agents/skills/`

## CLI Command Integration

Steel-Kit installs matching workflow commands for Claude Code and Gemini CLI, plus matching skills for Codex CLI, from the same canonical source files in `resources/commands/`:

- `steel-init` / `/steel-init` / `$steel-init` — Initialize Steel-Kit
- `steel-constitution` / `/steel-constitution` / `$steel-constitution` — Generate project constitution via LLM
- `steel-specify` / `/steel-specify` / `$steel-specify` — Create a specification
- `steel-clarify` / `/steel-clarify` / `$steel-clarify` — Clarify the spec
- `steel-plan` / `/steel-plan` / `$steel-plan` — Generate a plan
- `steel-tasks` / `/steel-tasks` / `$steel-tasks` — Break down tasks
- `steel-implement` / `/steel-implement` / `$steel-implement` — Run implementation
- `steel-validate` / `/steel-validate` / `$steel-validate` — Validate results
- `steel-retrospect` / `/steel-retrospect` / `$steel-retrospect` — Generate a retrospect
- `steel-status` / `/steel-status` / `$steel-status` — Check progress
- `steel-next` / `/steel-next` / `$steel-next` — Run the next stage
- `steel-run-all` / `/steel-run-all` / `$steel-run-all` — Run all remaining stages
- `steel-clean` / `/steel-clean` / `$steel-clean` — Remove artifacts and reset workflow

## Project Structure

```
your-project/
├── .steel/
│   ├── .gitignore           # Ignores ephemeral state files
│   ├── config.json          # Runtime configuration (committed)
│   ├── constitution.md      # Project principles (committed)
│   ├── state.json           # Workflow state machine (gitignored, auto-recovered)
│   └── tasks.json           # Parsed task list (gitignored)
└── specs/                  # Or custom specsDir from config
    └── 001-feature-name/
        ├── spec.md           # Specification
        ├── clarifications.md # Resolved ambiguities
        ├── plan.md           # Implementation plan
        ├── tasks.md          # Task breakdown
        ├── validation.md     # Validation report
        ├── retrospect.md     # Retrospect and learnings
        └── artifacts/        # Forge/Gauge outputs per stage
            ├── specification/
            │   ├── iter1-forge.md
            │   └── iter1-gauge.md
            ├── planning/
            │   ├── iter1-forge.md
            │   └── iter1-gauge.md
            └── implementation/
                ├── iter1-forge.md
                └── iter1-gauge.md
```

## How the Forge-Gauge Loop Works

```
┌─────────────────────────────────────────┐
│  1. Forge receives task + context       │
│  2. Forge produces output               │
│  3. Output committed to git             │
│  4. Gauge reviews the stage artifact    │
│     (for implementation: real git diff) │
│  5. Review committed to git             │
│  6. If APPROVE → advance to next stage  │
│     If REVISE → feedback sent to Forge  │
│  7. Repeat until approved or max iter   │
└─────────────────────────────────────────┘
```

Git commits follow the pattern:
- `forge(<stage>): iteration N output`
- `gauge(<stage>): iteration N review — approve/revise`

## State Recovery

`state.json` and `tasks.json` are gitignored because they change every iteration and would cause merge conflicts. On a fresh checkout, the tool automatically reconstructs `state.json` from:

1. **Git tags** — each completed stage is tagged `steel/<stage>-complete`
2. **Spec files** — presence of `spec.md`, `plan.md`, etc. indicates stage completion
3. **Branch name** — `spec/<specId>` convention identifies the active spec

This means you can freely switch branches or do fresh clones without losing track of progress.

## License

AGPL-3.0
