import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { loadConfig, getSpecDir } from '../src/config.js';
import { loadState } from '../src/workflow.js';
import { die, log } from '../src/utils.js';

export interface SaveArtifactOpts {
  stage: string;
  iter: number;
  role: 'forge' | 'gauge' | 'forge-prompt' | 'gauge-prompt';
  content?: string;
  contentFile?: string;
  specId?: string;
}

export async function cmdSaveArtifact(opts: SaveArtifactOpts): Promise<void> {
  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);
  let specId = opts.specId;
  if (!specId) {
    const state = await loadState(projectRoot);
    specId = state.specId;
  }
  if (!specId) {
    die('No spec ID provided and none in state.json. Pass --spec-id explicitly.');
  }

  let content: string;
  if (opts.contentFile) {
    content = await readFile(opts.contentFile, 'utf-8');
  } else if (opts.content !== undefined) {
    content = opts.content;
  } else {
    die('Provide either --content or --content-file.');
  }

  const filename = `iter${opts.iter}-${opts.role}.md`;
  const path = resolve(
    getSpecDir(projectRoot, config, specId),
    'artifacts',
    opts.stage,
    filename,
  );
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content!, 'utf-8');
  log.success(`Saved artifact: ${path}`);
  process.stdout.write(path + '\n');
}
