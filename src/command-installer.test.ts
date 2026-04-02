import { describe, expect, it } from 'vitest';
import { renderCodexSkill } from './command-installer.js';

describe('renderCodexSkill', () => {
  it('converts canonical command markdown into a Codex skill', () => {
    const markdown = `Create a feature specification.

Feature description: $ARGUMENTS

Run /steel-init first, then /steel-plan.
`;

    const skill = renderCodexSkill('steel-specify.md', markdown);

    expect(skill).toContain('name: steel-specify');
    expect(skill).toContain('Use this skill when the user invokes `$steel-specify`');
    expect(skill).toContain('Feature description: the user-provided input');
    expect(skill).toContain('Run $steel-init first, then $steel-plan.');
    expect(skill).not.toContain('$ARGUMENTS');
  });
});
