import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

export const FACTORY_ROOT = resolve(import.meta.dirname, '..', '..');

const LINE_MERGED = new Set(['.gitignore', '.gitattributes']);
const DEP_FIELDS = ['dependencies', 'devDependencies'];

export function listStacks() {
  return readdirSync(join(FACTORY_ROOT, 'stacks'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function walk(dir, skipDirs = []) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((rel) => !skipDirs.some((skip) => rel.startsWith(`${skip}/`)));
}

function unionLines(base, extra) {
  const lines = base.replace(/\n+$/, '').split('\n');
  const seen = new Set(lines);
  for (const line of extra.split('\n')) {
    if (line && !seen.has(line)) {
      lines.push(line);
      seen.add(line);
    }
  }
  return `${lines.join('\n')}\n`;
}

// Existing values win so an install never silently changes a project's choices.
function mergePackageJson(existing, incoming, fallbackName, conflicts) {
  const merged = { name: existing.name ?? fallbackName, ...incoming, ...existing };
  for (const field of ['scripts', 'engines', ...DEP_FIELDS]) {
    if (!incoming[field] && !existing[field]) continue;
    merged[field] = { ...incoming[field], ...existing[field] };
    if (!DEP_FIELDS.includes(field)) continue;
    for (const [dep, wanted] of Object.entries(incoming[field] ?? {})) {
      const kept = existing[field]?.[dep];
      if (kept && kept !== wanted) conflicts.push(`${dep}: kept ${kept}, factory wants ${wanted}`);
    }
  }
  return merged;
}

function combineLayers(rel, previous, content) {
  if (rel === 'package.json') {
    const [a, b] = [JSON.parse(previous), JSON.parse(content)];
    const combined = { ...a, ...b };
    for (const field of ['scripts', 'engines', ...DEP_FIELDS]) {
      if (a[field] || b[field]) combined[field] = { ...a[field], ...b[field] };
    }
    return JSON.stringify(combined);
  }
  return LINE_MERGED.has(basename(rel)) ? unionLines(previous, content) : content;
}

/** Later layers override earlier ones, except package.json and line-merged files, which combine. */
function planFiles(stack, hooks, includeStarter) {
  const stackDir = join(FACTORY_ROOT, 'stacks', stack);
  const layers = [
    { dir: join(FACTORY_ROOT, 'core'), skip: [] },
    { dir: stackDir, skip: ['starter', 'hooks'] },
    { dir: join(stackDir, 'hooks', hooks), skip: [] },
  ];
  if (includeStarter) layers.push({ dir: join(stackDir, 'starter'), skip: [] });

  const plan = new Map();
  for (const { dir, skip } of layers) {
    for (const rel of walk(dir, skip)) {
      const content = readFileSync(join(dir, rel), 'utf8');
      const previous = plan.get(rel);
      plan.set(rel, previous === undefined ? content : combineLayers(rel, previous, content));
    }
  }
  return plan;
}

export function listHooks(stack) {
  const dir = join(FACTORY_ROOT, 'stacks', stack, 'hooks');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/** Keeps a project on Husky if it already uses it; two hook managers would fight over core.hooksPath. */
export function detectHooks(targetDir) {
  if (existsSync(join(targetDir, '.husky'))) return 'husky';
  const pkgPath = join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) return 'lefthook';
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return pkg.devDependencies?.husky || pkg.dependencies?.husky ? 'husky' : 'lefthook';
}

export function install({ target, stack, hooks, force = false }) {
  if (!listStacks().includes(stack)) {
    throw new Error(`Unknown stack "${stack}". Available: ${listStacks().join(', ')}`);
  }
  const targetDir = resolve(target);
  const hookRunner = hooks ?? detectHooks(targetDir);
  if (!listHooks(stack).includes(hookRunner)) {
    throw new Error(`Unknown hooks "${hookRunner}". Available: ${listHooks(stack).join(', ')}`);
  }
  mkdirSync(targetDir, { recursive: true });

  const result = {
    hooks: hookRunner,
    created: [],
    merged: [],
    overwritten: [],
    skipped: [],
    conflicts: [],
  };
  const plan = planFiles(stack, hookRunner, !existsSync(join(targetDir, 'src')));

  for (const [rel, content] of plan) {
    const dest = join(targetDir, rel);
    mkdirSync(dirname(dest), { recursive: true });

    if (!existsSync(dest)) {
      const fresh =
        rel === 'package.json'
          ? `${JSON.stringify(mergePackageJson({}, JSON.parse(content), basename(targetDir), []), null, 2)}\n`
          : content;
      writeFileSync(dest, fresh);
      result.created.push(rel);
    } else if (rel === 'package.json') {
      const existing = JSON.parse(readFileSync(dest, 'utf8'));
      const merged = mergePackageJson(
        existing,
        JSON.parse(content),
        basename(targetDir),
        result.conflicts,
      );
      writeFileSync(dest, `${JSON.stringify(merged, null, 2)}\n`);
      result.merged.push(rel);
    } else if (LINE_MERGED.has(basename(rel))) {
      writeFileSync(dest, unionLines(readFileSync(dest, 'utf8'), content));
      result.merged.push(rel);
    } else if (force) {
      writeFileSync(dest, content);
      result.overwritten.push(rel);
    } else {
      result.skipped.push(rel);
    }
  }

  const { version } = JSON.parse(readFileSync(join(FACTORY_ROOT, 'package.json'), 'utf8'));
  writeFileSync(
    join(targetDir, '.factory.json'),
    `${JSON.stringify({ factoryVersion: version, stack, hooks: hookRunner }, null, 2)}\n`,
  );
  return result;
}
