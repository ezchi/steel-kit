import chalk from 'chalk';
import { runDoctor } from '../src/doctor.js';
import type { Diagnostic, DoctorResult } from '../src/doctor.js';

export async function cmdDoctor(opts: { json?: boolean }): Promise<void> {
  const projectRoot = process.cwd();
  const result = await runDoctor(projectRoot);

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanReadable(result);
  }

  process.exit(result.status === 'fail' ? 1 : 0);
}

function printHumanReadable(result: DoctorResult): void {
  console.error(chalk.cyan('Steel-Kit Doctor'));
  console.error(chalk.cyan('────────────────'));
  console.error();

  // Group diagnostics by category
  const categories: Array<{
    name: string;
    prefixes: string[];
  }> = [
    { name: 'Initialization', prefixes: ['init-'] },
    { name: 'Constitution', prefixes: ['constitution-'] },
    { name: 'Workflow Drift', prefixes: ['drift-'] },
    { name: 'Stage Files', prefixes: ['stage-files-', 'state-recovery'] },
    { name: 'Canonical Sources', prefixes: ['canonical-'] },
    { name: 'Generated Surfaces', prefixes: ['surface-'] },
    { name: 'Providers', prefixes: ['provider-'] },
  ];

  const used = new Set<number>();

  for (const cat of categories) {
    const catDiags = result.diagnostics.filter((d, i) => {
      const match = cat.prefixes.some((p) => d.id.startsWith(p));
      if (match) used.add(i);
      return match;
    });
    if (catDiags.length === 0) continue;

    console.error(chalk.bold(`  ${cat.name}`));
    for (const d of catDiags) {
      printDiagnostic(d);
    }
    console.error();
  }

  // Any uncategorized
  const uncategorized = result.diagnostics.filter((_, i) => !used.has(i));
  if (uncategorized.length > 0) {
    console.error(chalk.bold('  Other'));
    for (const d of uncategorized) {
      printDiagnostic(d);
    }
    console.error();
  }

  // Summary
  const statusIcon =
    result.status === 'pass'
      ? chalk.green('✓ PASS')
      : result.status === 'warn'
        ? chalk.yellow('⚠ WARN')
        : chalk.red('✗ FAIL');

  console.error(
    `${statusIcon}  ${chalk.green(result.counts.pass)} pass  ${chalk.yellow(result.counts.warn)} warn  ${chalk.red(result.counts.fail)} fail`,
  );
}

function printDiagnostic(d: Diagnostic): void {
  const icon =
    d.status === 'pass'
      ? chalk.green('  ✓')
      : d.status === 'warn'
        ? chalk.yellow('  ⚠')
        : chalk.red('  ✗');

  console.error(`${icon} ${d.summary}`);
  if (d.details) {
    console.error(chalk.gray(`      ${d.details}`));
  }
  if (d.remediation) {
    console.error(chalk.gray(`      → ${d.remediation}`));
  }
}
