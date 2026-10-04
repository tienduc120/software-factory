import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { FACTORY_ROOT, install } from '../scripts/lib/installer.mjs';

// Expected values come from the factory's own files, so the tests follow the payload.
const readFactory = (rel) => readFileSync(join(FACTORY_ROOT, rel), 'utf8');
const factoryJson = (rel) => JSON.parse(readFactory(rel));
const lines = (text) => text.trimEnd().split('\n');
const STACK_PKG = factoryJson('stacks/typescript/package.json');
const LEFTHOOK_PKG = factoryJson('stacks/typescript/hooks/lefthook/package.json');
const HUSKY_PKG = factoryJson('stacks/typescript/hooks/husky/package.json');
const GITIGNORE_UNION = [
  ...new Set([
    ...lines(readFactory('core/.gitignore')),
    ...lines(readFactory('stacks/typescript/.gitignore')),
  ]),
];

let target;
const read = (rel) => readFileSync(join(target, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const existing = (rels) => rels.filter((rel) => existsSync(join(target, rel)));

beforeEach(() => {
  target = mkdtempSync(join(tmpdir(), 'factory-'));
});
afterEach(() => {
  rmSync(target, { recursive: true, force: true });
});

describe('install into an empty directory', () => {
  it('copies core, stack, hook, and starter files', () => {
    install({ target, stack: 'typescript' });
    const expected = [
      'AGENTS.md',
      'CLAUDE.md',
      'standards/principles.md',
      'standards/architecture.md',
      'standards/database.md',
      'standards/workflow.md',
      'standards/observability.md',
      'standards/stack.md',
      'standards/react.md',
      '.github/pull_request_template.md',
      'docs/adr/0000-template.md',
      'docs/architecture/context-map.md',
      'docs/runbooks/README.md',
      'docs/runbooks/database.md',
      'docs/runbooks/node-profiling.md',
      'eslint.config.mjs',
      'eslint-rules/architecture.mjs',
      '.vscode/settings.json',
      'lefthook.yml',
      'src/main.ts',
      'src/modules/ordering/domain/order.ts',
      'src/modules/billing/infrastructure/acl/order-placed-consumer.ts',
      'src/platform/messaging/outbox-dispatcher.ts',
    ];

    assert.deepStrictEqual(existing(expected), expected);
    assert.deepStrictEqual(existing(['starter', 'hooks', '.husky']), []);
  });

  it('names the package after the directory and combines every layer', () => {
    install({ target, stack: 'typescript' });
    const pkg = readJson('package.json');

    assert.deepStrictEqual(
      {
        name: pkg.name,
        verify: pkg.scripts.verify,
        prepare: pkg.scripts.prepare,
        lefthook: pkg.devDependencies.lefthook,
        eslint: pkg.devDependencies.eslint,
        inversify: pkg.dependencies.inversify,
      },
      {
        name: basename(target),
        verify: STACK_PKG.scripts.verify,
        prepare: 'lefthook install',
        lefthook: LEFTHOOK_PKG.devDependencies.lefthook,
        eslint: STACK_PKG.devDependencies.eslint,
        inversify: STACK_PKG.dependencies.inversify,
      },
    );
  });

  it('installs husky instead of lefthook when asked', () => {
    install({ target, stack: 'typescript', hooks: 'husky' });
    const pkg = readJson('package.json');

    assert.deepStrictEqual(existing(['.husky/pre-commit', '.lintstagedrc.json', 'lefthook.yml']), [
      '.husky/pre-commit',
      '.lintstagedrc.json',
    ]);
    assert.deepStrictEqual(
      {
        prepare: pkg.scripts.prepare,
        husky: pkg.devDependencies.husky,
        lefthook: pkg.devDependencies.lefthook,
      },
      { prepare: 'husky', husky: HUSKY_PKG.devDependencies.husky, lefthook: undefined },
    );
  });

  it('rejects an unknown hook runner', () => {
    assert.throws(() => install({ target, stack: 'typescript', hooks: 'pre-commit' }), {
      message: 'Unknown hooks "pre-commit". Available: husky, lefthook',
    });
  });

  it('combines .gitignore lines from core and stack', () => {
    install({ target, stack: 'typescript' });

    assert.deepStrictEqual(lines(read('.gitignore')), GITIGNORE_UNION);
  });

  it('records the factory version, stack, and hook runner', () => {
    install({ target, stack: 'typescript' });

    assert.deepStrictEqual(readJson('.factory.json'), {
      factoryVersion: factoryJson('package.json').version,
      stack: 'typescript',
      hooks: 'lefthook',
    });
  });
});

it('keeps a project that already uses husky on husky', () => {
  mkdirSync(join(target, '.husky'));

  const result = install({ target, stack: 'typescript' });

  assert.strictEqual(result.hooks, 'husky');
  assert.deepStrictEqual(existing(['lefthook.yml']), []);
});

describe('install into an existing project', () => {
  beforeEach(() => {
    mkdirSync(join(target, 'src'));
    writeFileSync(join(target, 'src', 'main.ts'), 'export const main = 1;\n');
    writeFileSync(join(target, 'CLAUDE.md'), '# mine\n');
    writeFileSync(join(target, '.gitignore'), 'node_modules/\n.cache/\n');
    writeFileSync(
      join(target, 'package.json'),
      JSON.stringify({
        name: 'existing-app',
        scripts: { test: 'jest', seed: 'node seed.js' },
        devDependencies: { typescript: '^5.4.0' },
      }),
    );
  });

  it('keeps existing files unless forced', () => {
    const result = install({ target, stack: 'typescript' });

    assert.strictEqual(read('CLAUDE.md'), '# mine\n');
    assert.strictEqual(result.skipped.includes('CLAUDE.md'), true);
  });

  it('overwrites existing files with force', () => {
    install({ target, stack: 'typescript', force: true });

    assert.strictEqual(read('CLAUDE.md'), readFactory('core/CLAUDE.md'));
  });

  it('does not add starter source or starter dependencies when src/ exists', () => {
    install({ target, stack: 'typescript' });

    assert.strictEqual(read('src/main.ts'), 'export const main = 1;\n');
    assert.deepStrictEqual(existing(['src/modules']), []);
    assert.strictEqual(readJson('package.json').dependencies.pino, undefined);
    assert.strictEqual(
      read('docs/architecture/context-map.md'),
      readFactory('core/docs/architecture/context-map.md'),
    );
  });

  it('merges package.json without overriding project choices', () => {
    const result = install({ target, stack: 'typescript' });
    const pkg = readJson('package.json');

    assert.deepStrictEqual(
      {
        name: pkg.name,
        test: pkg.scripts.test,
        seed: pkg.scripts.seed,
        verify: pkg.scripts.verify,
        typescript: pkg.devDependencies.typescript,
        eslint: pkg.devDependencies.eslint,
      },
      {
        name: 'existing-app',
        test: 'jest',
        seed: 'node seed.js',
        verify: STACK_PKG.scripts.verify,
        typescript: '^5.4.0',
        eslint: STACK_PKG.devDependencies.eslint,
      },
    );
    assert.deepStrictEqual(result.conflicts, [
      `typescript: kept ^5.4.0, factory wants ${STACK_PKG.devDependencies.typescript}`,
    ]);
  });

  it('merges package.json even with force', () => {
    install({ target, stack: 'typescript', force: true });

    assert.strictEqual(readJson('package.json').scripts.seed, 'node seed.js');
  });

  it('appends missing .gitignore lines after the project lines, without duplicates', () => {
    install({ target, stack: 'typescript' });

    assert.deepStrictEqual(lines(read('.gitignore')), [
      'node_modules/',
      '.cache/',
      ...GITIGNORE_UNION.filter((line) => line !== 'node_modules/'),
    ]);
  });

  it('is idempotent', () => {
    install({ target, stack: 'typescript' });
    const before = read('.gitignore') + read('package.json');

    install({ target, stack: 'typescript' });

    assert.strictEqual(read('.gitignore') + read('package.json'), before);
  });
});

it('rejects an unknown stack', () => {
  assert.throws(() => install({ target, stack: 'cobol' }), {
    message: 'Unknown stack "cobol". Available: typescript',
  });
});
