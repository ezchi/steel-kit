# Steel-Kit

A dual-agent AI development framework that orchestrates multiple LLM CLIs (Claude Code, Gemini CLI, OpenAI Codex) in a spec-driven development workflow.

## How It Works

Steel-Kit implements a **Forge + Gauge** pattern:

- **Forge** (primary LLM) executes tasks: writes specs, plans, code
- **Gauge** (inspector LLM) reviews every Forge output against quality criteria
- The loop continues until the Gauge approves or max iterations are reached
- Every iteration is documented and git-committed

## Workflow Stages

Inspired by [github/spec-kit](https://github.com/github/spec-kit):

| Stage          | Command                  | Human Approval      |
|----------------|--------------------------|---------------------|
| Init           | `steel init`             | -                   |
| Constitution   | `steel constitution`     | -                   |
| Specification  | `steel specify "<desc>"` | Required to advance |
| Clarification  | `steel clarify`          | Required to advance |
| Planning       | `steel plan`             | Automatic           |
| Task Breakdown | `steel tasks`            | Automatic           |
| Implementation | `steel implement`        | Automatic           |
| Validation     | `steel validate`         | Automatic           |

Check progress anytime with `steel status`.

**Shortcut commands** (available after specification stage):
- `steel next` — run the next stage automatically
- `steel run-all` — run all remaining stages in sequence (stops if human approval is declined)

**Utility commands**:
- `steel update` — update slash commands in the current project to the latest version from steel-kit

## Installation

### From source (local development)

```bash
git clone https://github.com/ezchi/steel-kit.git
cd steel-kit
npm install
npm run build
npm link
```

This makes the `steel` command available globally. To unlink later: `npm unlink -g @steel-kit/core`.

### From npm (once published)

```bash
npm install -g @steel-kit/core
```

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
- Create `.steel/` directory with `config.json`, `state.json`, and `constitution.md`
- Auto-commit the initialization to git

No LLM calls are made during init — it completes instantly.

After init, generate your project constitution:

```bash
steel constitution
```

This calls the Forge LLM to analyze your project and generate `.steel/constitution.md` with governing principles, coding standards, and constraints. Requires LLM auth to be set up. You can also skip this and edit `.steel/constitution.md` manually.

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

## Claude Code Integration

Steel-Kit includes slash commands for use within Claude Code:

- `/steel-init` — Initialize Steel-Kit
- `/steel-constitution` — Generate project constitution via LLM
- `/steel-specify` — Create a specification
- `/steel-clarify` — Clarify the spec
- `/steel-plan` — Generate a plan
- `/steel-tasks` — Break down tasks
- `/steel-implement` — Run implementation
- `/steel-validate` — Validate results
- `/steel-status` — Check progress
- `/steel-next` — Run the next stage
- `/steel-run-all` — Run all remaining stages

## Project Structure

```
your-project/
├── .steel/
│   ├── config.json          # Runtime configuration
│   ├── state.json           # Workflow state machine
│   ├── constitution.md      # Project principles
│   ├── tasks.json           # Parsed task list
│   └── artifacts/           # Forge/Gauge outputs per stage
│       ├── specification/
│       │   ├── iter1-forge.md
│       │   └── iter1-gauge.md
│       └── ...
└── specs/
    └── 001-feature-name/
        ├── spec.md           # Specification
        ├── clarifications.md # Resolved ambiguities
        ├── plan.md           # Implementation plan
        ├── tasks.md          # Task breakdown
        └── validation.md     # Validation report
```

## How the Forge-Gauge Loop Works

```
┌─────────────────────────────────────────┐
│  1. Forge receives task + context       │
│  2. Forge produces output               │
│  3. Output committed to git             │
│  4. Gauge reviews output                │
│  5. Review committed to git             │
│  6. If APPROVE → advance to next stage  │
│     If REVISE → feedback sent to Forge  │
│  7. Repeat until approved or max iter   │
└─────────────────────────────────────────┘
```

Git commits follow the pattern:
- `forge(<stage>): iteration N output`
- `gauge(<stage>): iteration N review — approve/revise`

## License

AGPL-3.0
