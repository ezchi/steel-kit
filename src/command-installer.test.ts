import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderAgentSkill } from './command-installer.js';

describe('renderAgentSkill', () => {
  it('converts canonical command markdown into a provider-neutral agent skill', () => {
    const markdown = `Create a feature specification.

Feature description: $ARGUMENTS

Run /steel-init first, then /steel-plan.
`;

    const skill = renderAgentSkill('steel-specify.md', markdown);

    expect(skill).toContain('name: steel-specify');
    expect(skill).toContain('Use this skill when the user invokes `/steel-specify`');
    expect(skill).toContain('Feature description: the user-provided input');
    expect(skill).toContain('Run /steel-init first, then /steel-plan.');
    expect(skill).not.toContain('$ARGUMENTS');
  });

  it('preserves /steel- prefixed cross-references', () => {
    const markdown = `Run /steel-plan after /steel-specify.`;
    const skill = renderAgentSkill('steel-run-all.md', markdown);

    expect(skill).toContain('/steel-plan');
    expect(skill).toContain('/steel-specify');
    expect(skill).not.toContain('$steel-');
  });

  it('contains no Codex-specific guidance', () => {
    const markdown = `Some command.`;
    const skill = renderAgentSkill('steel-status.md', markdown);

    expect(skill).not.toContain('in Codex');
    expect(skill).not.toContain('$steel-');
  });

  it('preserves the FR-3 prompt string from steel-specify.md (FR-8 propagation)', () => {
    const canonical = readFileSync(
      resolve(__dirname, '..', 'resources/commands/steel-specify.md'),
      'utf-8',
    );
    const skill = renderAgentSkill('steel-specify.md', canonical);
    expect(skill).toContain(
      'A previous workflow (`<previous specId>`) is fully complete. Start a new workflow with this prompt? [y / clean / cancel]',
    );
  });
});
