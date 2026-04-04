import type { SteelConfig, GitWorkflow, GitConfig, ResolvedGitConfig } from './config.js';

const VALID_WORKFLOWS: GitWorkflow[] = ['steel', 'github-flow', 'gitflow'];

export const GIT_PRESETS: Record<GitWorkflow, Omit<ResolvedGitConfig, 'workflow'>> = {
  'steel': { branchPrefix: 'spec/', baseBranch: 'main' },
  'github-flow': { branchPrefix: 'feature/', baseBranch: 'main' },
  'gitflow': { branchPrefix: 'feature/', baseBranch: 'develop', developBranch: 'develop' },
};

// Characters/patterns forbidden in git refs (from git-check-ref-format)
const FORBIDDEN_CHARS = /[\x00-\x1f\x7f ~^:?*\[\\]/;
const DOUBLE_DOT = /\.\./;
const LOCK_SUFFIX = /\.lock$/;
const LEADING_DOT = /^\./;
const LEADING_DASH = /^-/;
const TRAILING_DOT = /\.$/;
const TRAILING_SLASH = /\/$/;
const DOUBLE_SLASH = /\/\//;
const AT_BRACE = /@\{/;

function describeViolation(value: string): string | null {
  if (value === '') return 'value must be non-empty';
  const forbiddenMatch = value.match(FORBIDDEN_CHARS);
  if (forbiddenMatch) return `invalid character '${forbiddenMatch[0]}'`;
  if (DOUBLE_DOT.test(value)) return "contains forbidden sequence '..'";
  if (LOCK_SUFFIX.test(value)) return "ends with '.lock'";
  if (AT_BRACE.test(value)) return "contains forbidden sequence '@{'";
  if (DOUBLE_SLASH.test(value)) return "contains '//'";
  return null;
}

export function validateBranchPrefix(value: string): void {
  if (value === '') {
    throw new Error('Invalid branchPrefix: value must be non-empty');
  }
  // Branch prefixes allow trailing / (e.g. "spec/", "feature/")
  // Check the value without trailing slash for other rules
  const check = value.endsWith('/') ? value.slice(0, -1) : value;
  if (check === '') return; // Just "/" alone — will fail composed-ref check
  const violation = describeViolation(check);
  if (violation && violation !== 'value must be non-empty') {
    throw new Error(`Invalid branchPrefix '${value}': ${violation}`);
  }
  if (LEADING_DOT.test(check)) {
    throw new Error(`Invalid branchPrefix '${value}': starts with '.'`);
  }
  if (LEADING_DASH.test(check)) {
    throw new Error(`Invalid branchPrefix '${value}': starts with '-'`);
  }
}

export function validateBranchName(value: string, fieldName: string): void {
  if (value === '') {
    throw new Error(`Invalid ${fieldName}: value must be non-empty`);
  }
  const violation = describeViolation(value);
  if (violation) {
    throw new Error(`Invalid ${fieldName} '${value}': ${violation}`);
  }
  if (TRAILING_SLASH.test(value)) {
    throw new Error(`Invalid ${fieldName} '${value}': ends with '/'`);
  }
  if (TRAILING_DOT.test(value)) {
    throw new Error(`Invalid ${fieldName} '${value}': ends with '.'`);
  }
  if (LEADING_DOT.test(value)) {
    throw new Error(`Invalid ${fieldName} '${value}': starts with '.'`);
  }
  if (LEADING_DASH.test(value)) {
    throw new Error(`Invalid ${fieldName} '${value}': starts with '-'`);
  }
}

export function validateSpecIdComponent(value: string): void {
  if (value === '') {
    throw new Error("Invalid spec ID: value must be non-empty");
  }
  // Spec IDs are single path segments — no / allowed
  if (value.includes('/')) {
    throw new Error(`Invalid spec ID '${value}': invalid character '/'`);
  }
  const violation = describeViolation(value);
  if (violation) {
    throw new Error(`Invalid spec ID '${value}': ${violation}`);
  }
  if (TRAILING_DOT.test(value)) {
    throw new Error(`Invalid spec ID '${value}': ends with '.'`);
  }
  if (LOCK_SUFFIX.test(value)) {
    throw new Error(`Invalid spec ID '${value}': ends with '.lock'`);
  }
  if (LEADING_DOT.test(value)) {
    throw new Error(`Invalid spec ID '${value}': starts with '.'`);
  }
  if (LEADING_DASH.test(value)) {
    throw new Error(`Invalid spec ID '${value}': starts with '-'`);
  }
}

export function validateComposedRef(prefix: string, specId: string): void {
  const composed = prefix + specId;
  const violation = describeViolation(composed);
  if (violation) {
    throw new Error(`Invalid branch name '${composed}': ${violation}`);
  }
  if (TRAILING_DOT.test(composed)) {
    throw new Error(`Invalid branch name '${composed}': ends with '.'`);
  }
  if (LOCK_SUFFIX.test(composed)) {
    throw new Error(`Invalid branch name '${composed}': ends with '.lock'`);
  }
}

const KNOWN_VALID_PREFIXES = new Set(['spec/', 'feature/']);

export function resolveGitConfig(config: SteelConfig): ResolvedGitConfig {
  const gitConfig = config.git ?? {};
  const workflow: GitWorkflow = gitConfig.workflow ?? 'steel';
  const preset = GIT_PRESETS[workflow] ?? GIT_PRESETS['steel'];

  const resolved: ResolvedGitConfig = {
    workflow,
    branchPrefix: gitConfig.branchPrefix ?? preset.branchPrefix,
    baseBranch: gitConfig.baseBranch ?? preset.baseBranch,
  };

  // Include developBranch if explicitly set or from preset
  const devBranch = gitConfig.developBranch ?? preset.developBranch;
  if (devBranch !== undefined) {
    resolved.developBranch = devBranch;
  }

  // Validate — skip for known-valid preset defaults
  const isPresetPrefix = !gitConfig.branchPrefix && KNOWN_VALID_PREFIXES.has(resolved.branchPrefix);
  if (!isPresetPrefix) {
    validateBranchPrefix(resolved.branchPrefix);
  }

  const isPresetBase = !gitConfig.baseBranch;
  if (!isPresetBase) {
    validateBranchName(resolved.baseBranch, 'baseBranch');
  }

  if (gitConfig.developBranch) {
    validateBranchName(resolved.developBranch!, 'developBranch');
  }

  // Composed-ref smoke test for non-preset prefixes
  if (!isPresetPrefix) {
    validateComposedRef(resolved.branchPrefix, '000-test');
  }

  return resolved;
}
