// End-to-end proof that an installed project's gates work. Needs network for pnpm install.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { install } from './lib/installer.mjs';

const keep = process.argv.includes('--keep');
const runners = process.argv.includes('--hooks=husky')
  ? ['husky']
  : process.argv.includes('--hooks=lefthook')
    ? ['lefthook']
    : ['lefthook', 'husky'];
let failures = 0;

const DOMAIN = 'src/modules/ordering/domain';
const APPLICATION = 'src/modules/ordering/application';
const INFRASTRUCTURE = 'src/modules/ordering/infrastructure';

// Each probe must fail lint, and fail because of `rule`, so a crashing config can't pass it.
const LINT_PROBES = [
  { rule: 'no-explicit-any', file: 'src/probe.ts', source: 'export const value: any = 1;\n' },
  {
    rule: 'consistent-type-assertions',
    file: 'src/probe.ts',
    source: 'export const value = JSON.parse("1") as number;\n',
  },
  {
    rule: 'no-non-null-assertion',
    file: 'src/probe.ts',
    source: 'export function readFirst(items: string[]): string {\n  return items[0]!;\n}\n',
  },
  {
    rule: 'prefer-const',
    file: 'src/probe.ts',
    source: 'export function countItems(): number {\n  let total = 1;\n  return total;\n}\n',
  },
  {
    rule: 'no-floating-promises',
    file: 'src/probe.ts',
    source: 'export function runTask(): void {\n  Promise.resolve(1);\n}\n',
  },
  {
    rule: 'no-restricted-syntax',
    file: 'src/probe.ts',
    source: 'export default function runTask(): number {\n  return 1;\n}\n',
  },
  {
    rule: 'no-restricted-syntax',
    file: 'src/probe.ts',
    source: 'export enum Color {\n  Red,\n}\n',
  },
  {
    rule: 'no-restricted-syntax',
    file: 'src/probe.js',
    source: 'export const value = 1;\n',
  },
  {
    rule: 'no-console',
    file: 'src/probe.ts',
    source: "export function logValue(): void {\n  console.log('x');\n}\n",
  },
  {
    rule: 'naming-convention',
    file: 'src/probe.ts',
    source: 'export const active: boolean = Math.random() > 0.5;\n',
  },
  {
    rule: 'naming-convention',
    file: 'src/probe.ts',
    source: 'export const parseJSON = (raw: string): unknown => JSON.parse(raw);\n',
  },
  {
    rule: 'prefer-readonly',
    file: 'src/probe.ts',
    source:
      'export class Counter {\n  private count = 0;\n  readCount(): number {\n    return this.count;\n  }\n}\n',
  },
  {
    rule: 'no-misused-spread',
    file: 'src/probe.ts',
    source:
      'class Box {\n  value = 1;\n  readValue(): number {\n    return this.value;\n  }\n}\nexport const copy = { ...new Box() };\n',
  },
  {
    rule: 'no-restricted-syntax',
    file: `${INFRASTRUCTURE}/probe.ts`,
    source: "export function failLoudly(): never {\n  throw new Error('x');\n}\n",
  },
  {
    rule: 'no-restricted-syntax',
    file: `${APPLICATION}/probe.ts`,
    source: "export function failLoudly(): never {\n  throw new TypeError('x');\n}\n",
  },
  {
    rule: 'no-restricted-syntax',
    file: `${DOMAIN}/probe.ts`,
    source: 'export const findNothing = (): string | null => null;\n',
  },
  {
    rule: 'architecture/layers',
    file: `${DOMAIN}/probe.ts`,
    source:
      "export { InMemoryOrderRepository } from '../infrastructure/in-memory-order-repository.ts';\n",
  },
  {
    rule: 'no-restricted-imports',
    file: `${DOMAIN}/probe.ts`,
    source: "import { readFileSync } from 'node:fs';\nexport const readFile = readFileSync;\n",
  },
  {
    rule: 'architecture/layers',
    file: 'src/modules/billing/application/probe.ts',
    source: "export { Order } from '../../ordering/domain/order.ts';\n",
  },
  {
    rule: 'architecture/layers',
    file: 'src/modules/billing/application/probe.ts',
    source: "export { isOrderPlacedV1 } from '../../ordering/contracts/order-placed-v1.ts';\n",
  },
  {
    rule: 'architecture/layers',
    file: 'src/platform/probe.ts',
    source: "export { Order } from '../modules/ordering/domain/order.ts';\n",
  },
  {
    rule: 'architecture/entity-shape',
    file: `${DOMAIN}/probe.ts`,
    source: 'export class Coupon {\n  constructor(readonly code: string) {}\n}\n',
  },
  {
    rule: 'architecture/single-execute',
    file: `${APPLICATION}/probe.ts`,
    source:
      'export class ApplyCouponUseCase {\n  execute(): number {\n    return 1;\n  }\n  validate(): boolean {\n    return true;\n  }\n}\n',
  },
  {
    rule: 'vitest/expect-expect',
    file: 'src/probe.test.ts',
    source:
      "import { describe, it } from 'vitest';\ndescribe('nothing', () => {\n  it('always passes', () => {\n    void (1 + 1);\n  });\n});\n",
  },
  {
    rule: 'vitest/no-conditional-expect',
    file: 'src/probe.test.ts',
    source:
      "import { describe, expect, it } from 'vitest';\ndescribe('maybe', () => {\n  it('may skip its assertion', () => {\n    const value = Math.random();\n    if (value > 2) {\n      expect(value).toBe(3);\n    }\n  });\n});\n",
  },
  {
    rule: 'vitest/no-restricted-matchers',
    file: 'src/probe.test.ts',
    source:
      "import { describe, expect, it, vi } from 'vitest';\ndescribe('calls', () => {\n  it('counts calls loosely', () => {\n    const handle = vi.fn();\n    handle();\n    expect(handle).toHaveBeenCalledTimes(1);\n  });\n});\n",
  },
  {
    rule: 'no-restricted-syntax',
    file: 'src/probe.test.ts',
    source:
      "import { describe, expect, it } from 'vitest';\ndescribe('partial', () => {\n  it('checks part of an object', () => {\n    expect({ a: 1, b: 2 }).toStrictEqual(expect.objectContaining({ a: 1 }));\n  });\n});\n",
  },
  {
    rule: 'vitest/prefer-strict-equal',
    file: 'src/probe.test.ts',
    source:
      "import { describe, expect, it } from 'vitest';\ndescribe('loose', () => {\n  it('compares loosely', () => {\n    expect({ a: 1 }).toEqual({ a: 1 });\n  });\n});\n",
  },
];

function run(project, command, input, env = {}) {
  // shell: true resolves pnpm.cmd on Windows.
  const res = spawnSync(command, {
    cwd: project,
    shell: true,
    encoding: 'utf8',
    input,
    env: { ...process.env, ...env },
    timeout: 300_000,
  });
  return { ok: res.status === 0, output: `${res.stdout}${res.stderr}` };
}

function report(label, passed, output = '') {
  if (!passed) failures++;
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`);
  if (!passed) console.log(output.split('\n').slice(-30).join('\n'));
}

function expect(project, label, command, shouldPass, input) {
  const { ok, output } = run(project, command, input);
  report(label, ok === shouldPass, output);
}

function withFile(project, rel, source, action) {
  const file = join(project, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
  try {
    action();
  } finally {
    rmSync(file);
  }
}

const COMMIT = 'git -c user.name=smoke -c user.email=smoke@example.com commit -q';

function smoke(hooks) {
  const project = mkdtempSync(join(tmpdir(), `factory-smoke-${hooks}-`));
  console.log(`\n== ${hooks}: ${project}`);
  run(project, 'git init -q');
  install({ target: project, stack: 'typescript', hooks });

  expect(project, 'pnpm install', 'pnpm install', true);
  expect(project, 'pnpm verify passes on the starter project', 'pnpm verify', true);
  expect(
    project,
    'tsc build output runs with real decorators',
    'node -e "import(\'./dist/main.js\').then(m=>m.createContainer())"',
    true,
  );

  const telemetry = run(
    project,
    'node --import ./dist/platform/observability/register-telemetry.js -e "setTimeout(() => {}, 200)"',
    undefined,
    { OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:4318', OTEL_SERVICE_NAME: 'smoke' },
  );
  report('telemetry starts and the process still exits on its own', telemetry.ok, telemetry.output);

  run(project, 'git add -A');
  expect(
    project,
    'commit-msg hook rejects a free-form message',
    `${COMMIT} -m "fixed stuff"`,
    false,
  );
  expect(
    project,
    'hooks accept a conventional commit',
    `${COMMIT} -m "chore: initial commit"`,
    true,
  );

  for (const { rule, file, source } of LINT_PROBES) {
    withFile(project, file, source, () => {
      const { ok, output } = run(project, `pnpm eslint ${file}`);
      report(
        `lint ${rule} rejects ${file}: ${source.split('\n')[0]}`,
        !ok && output.includes(rule),
        output,
      );
    });
  }
  withFile(
    project,
    'src/modules/billing/infrastructure/acl/probe.ts',
    "export { isOrderPlacedV1 } from '../../../ordering/contracts/order-placed-v1.ts';\n",
    () =>
      expect(
        project,
        "the anti-corruption layer can use another module's contracts",
        'pnpm eslint src/modules/billing',
        true,
      ),
  );
  withFile(
    project,
    `${DOMAIN}/probe.ts`,
    [
      'export function classifyOrderSize(quantity: number): string {',
      '  if (quantity > 50) return "bulk";',
      '  if (quantity > 10) return "large";',
      '  if (quantity > 5) return "medium";',
      '  if (quantity > 1) return "small";',
      '  return "single";',
      '}',
      '',
    ].join('\n'),
    () => {
      const { ok, output } = run(project, 'pnpm test:coverage');
      report(
        'coverage gate rejects untested domain logic',
        !ok && /threshold/i.test(output),
        output,
      );
    },
  );

  if (!keep) rmSync(project, { recursive: true, force: true });
}

for (const hooks of runners) smoke(hooks);
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
