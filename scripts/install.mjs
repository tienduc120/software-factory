#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { install, listHooks, listStacks } from './lib/installer.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    stack: { type: 'string', default: 'typescript' },
    hooks: { type: 'string' },
    owner: { type: 'string' },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || positionals.length !== 1) {
  console.log(`Usage: node scripts/install.mjs <target-dir> [--stack <name>] [--hooks <name>] [--owner <user>] [--force]

  --stack   one of: ${listStacks().join(', ')} (default: typescript)
  --hooks   git hook runner, one of: ${listHooks(values.stack).join(', ')}
            (default: husky if the project already uses it, otherwise lefthook)
  --owner   GitHub user or org/team for CODEOWNERS
            (default: the owner of the GitHub "origin" remote)
  --force   overwrite files that already exist (package.json, .gitignore and
            .gitattributes are always merged, never overwritten)`);
  process.exit(values.help ? 0 : 1);
}

const target = resolve(positionals[0]);
const result = install({
  target,
  stack: values.stack,
  hooks: values.hooks,
  owner: values.owner,
  force: values.force,
});

const section = (title, items) => {
  if (items.length)
    console.log(`\n${title} (${items.length})\n${items.map((i) => `  ${i}`).join('\n')}`);
};
console.log(`Stack: ${values.stack}, hooks: ${result.hooks}, owner: ${result.owner ?? 'unknown'}`);
section('Created', result.created);
section('Merged', result.merged);
section('Overwritten', result.overwritten);
section('Skipped, already exists (use --force to overwrite)', result.skipped);
section('Skipped, needs --owner <github-user>', result.needsOwner);
section('Dependency versions kept from the project', result.conflicts);

if (!existsSync(join(target, '.git'))) {
  console.log(
    '\nWarning: target is not a git repository. Run `git init` before `pnpm install` so hooks can install.',
  );
}
console.log(`\nNext:\n  cd ${target}\n  pnpm install\n  pnpm verify`);
