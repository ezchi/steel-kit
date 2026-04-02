# Repository Guidelines

## Project Structure & Module Organization

Steel-Kit is a TypeScript CLI. Core runtime code lives in `src/`, with one file per concern such as providers, workflow orchestration, config, and utilities. User-facing command handlers live in `commands/` and are wired into [`src/cli.ts`](/Users/ezchi/Projects/steel-kit/src/cli.ts). Prompt and document templates live in `prompts/`, `templates/`, and `resources/commands/`. Repository docs go in `docs/`. Build output is generated in `dist/` and should not be edited manually.

## Build, Test, and Development Commands

- `npm install`: install dependencies for local development.
- `npm run build`: compile TypeScript to `dist/` using `tsc`.
- `npm run dev`: run the TypeScript compiler in watch mode.
- `npm test`: run the Vitest suite.
- `npm run lint`: run `tsc --noEmit` for type-checking.
- `npm link`: expose the local `steel` CLI globally after a successful build.

Use Node.js 20+ as declared in `package.json`.

## Coding Style & Naming Conventions

Use TypeScript with ES modules and explicit `.js` import suffixes in source files. Follow the existing style: 2-space indentation, single quotes, semicolons, trailing commas where the formatter would naturally keep them, and small focused modules. Use `camelCase` for variables/functions, `PascalCase` for classes, and kebab-case for command filenames such as `run-all.ts`. Keep command entrypoints in `commands/` named `cmdX`.

## Testing Guidelines

Vitest is the test framework. Keep tests close to the code they cover and name them `*.test.ts`; see [`src/command-installer.test.ts`](/Users/ezchi/Projects/steel-kit/src/command-installer.test.ts). Prefer fast unit tests around command rendering, config loading, and workflow state behavior. Run `npm test` before opening a PR, and run `npm run lint` for type safety.

## Commit & Pull Request Guidelines

Recent history uses conventional prefixes such as `fix(installer): ...`, `chore(release): ...`, and operational merges like `merge: release v0.5.1`. Follow that pattern with short imperative subjects. PRs should include the purpose, affected commands or modules, linked issues when applicable, and terminal output or screenshots when changing CLI behavior or generated artifacts.

## Configuration Notes

Repository-level defaults live in `steel.config.yaml`. When changing prompts, templates, or command resources, update the canonical source file rather than generated output, then rebuild and test.
