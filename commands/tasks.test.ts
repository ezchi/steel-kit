import { describe, it, expect } from 'vitest';
import { parseTasksMarkdown } from './tasks.js';

describe('parseTasksMarkdown', () => {
  it('defaults type to implementation when no Type: line is present', () => {
    const md = [
      '## Tasks',
      '',
      '1. Build the widget',
      '   Description: write src/widget.ts',
      '   Files: src/widget.ts',
      '   Dependencies: none',
      '   Verification: npm test passes',
    ].join('\n');

    const [task] = parseTasksMarkdown(md);
    expect(task.id).toBe(1);
    expect(task.title).toBe('Build the widget');
    expect(task.type).toBe('implementation');
  });

  it('reads Type: verification when declared', () => {
    const md = [
      '## Tasks',
      '',
      '1. Run typecheck',
      '   Description: confirm tsc passes',
      '   Files: none',
      '   Type: verification',
      '   Dependencies: none',
      '   Verification: tsc --noEmit reports 0 errors',
    ].join('\n');

    const [task] = parseTasksMarkdown(md);
    expect(task.type).toBe('verification');
  });

  it('treats unknown Type: values as implementation', () => {
    const md = [
      '## Tasks',
      '',
      '1. Mystery task',
      '   Type: bogus',
    ].join('\n');

    const [task] = parseTasksMarkdown(md);
    expect(task.type).toBe('implementation');
  });

  it('classifies multiple tasks independently', () => {
    const md = [
      '## Tasks',
      '',
      '1. Implement feature',
      '   Type: implementation',
      '',
      '2. Lint check',
      '   Type: verification',
      '',
      '3. Another implementation',
    ].join('\n');

    const tasks = parseTasksMarkdown(md);
    expect(tasks.map((t) => t.type)).toEqual([
      'implementation',
      'verification',
      'implementation',
    ]);
  });

  it('Type: line matching is case-insensitive', () => {
    const md = [
      '## Tasks',
      '',
      '1. Run typecheck',
      '   TYPE: VERIFICATION',
    ].join('\n');

    const [task] = parseTasksMarkdown(md);
    expect(task.type).toBe('verification');
  });
});
