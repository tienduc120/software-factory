import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { FACTORY_ROOT } from '../scripts/lib/installer.mjs';

const read = (rel) => readFileSync(join(FACTORY_ROOT, rel), 'utf8');

// The factory runs the agent workflows it ships, so a fix in one place reaches both.
const COPIES = [
  ['.github/workflows/ai-review.yml', 'core/.github/workflows/ai-review.yml'],
  ['.github/workflows/pr-title.yml', 'stacks/typescript/.github/workflows/pr-title.yml'],
  ['.github/workflows/claude.yml', 'stacks/typescript/.github/workflows/claude.yml'],
  ['.github/workflows/babysit.yml', 'stacks/typescript/.github/workflows/babysit.yml'],
  ['.github/pull_request_template.md', 'core/.github/pull_request_template.md'],
  ['commitlint.config.mjs', 'stacks/typescript/commitlint.config.mjs'],
  ['.nvmrc', 'stacks/typescript/.nvmrc'],
];

for (const [copy, source] of COPIES) {
  it(`keeps ${copy} identical to ${source}`, () => {
    assert.strictEqual(read(copy), read(source));
  });
}
