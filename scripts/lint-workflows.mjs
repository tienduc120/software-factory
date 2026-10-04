#!/usr/bin/env node
// Lints the factory's own workflows and every workflow it ships. actionlint also runs
// shellcheck on `run:` scripts when shellcheck is on PATH (it is on GitHub's Ubuntu runners).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { FACTORY_ROOT } from './lib/installer.mjs';

const ACTIONLINT = 'github.com/rhysd/actionlint/cmd/actionlint@v1.7.12';
const WORKFLOW_DIRS = [
  '.github/workflows',
  'core/.github/workflows',
  'stacks/typescript/.github/workflows',
];

const files = WORKFLOW_DIRS.flatMap((dir) =>
  readdirSync(join(FACTORY_ROOT, dir))
    .filter((name) => name.endsWith('.yml'))
    .map((name) =>
      relative(FACTORY_ROOT, join(FACTORY_ROOT, dir, name))
        .split('\\')
        .join('/'),
    ),
);

const result = spawnSync('go', ['run', ACTIONLINT, ...process.argv.slice(2), ...files], {
  cwd: FACTORY_ROOT,
  stdio: 'inherit',
});
if (result.error) {
  process.stderr.write(
    `Could not run Go (${result.error.message}). actionlint needs Go 1.24 or later.\n`,
  );
}
process.exit(result.status ?? 1);
