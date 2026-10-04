#!/usr/bin/env node
// Prints the repository settings and ruleset by default; changes GitHub only with --apply.
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import {
  RULESET_NAME,
  buildManualSteps,
  buildRuleset,
  buildRulesetStep,
  buildSettingsSteps,
  parseRepo,
} from './lib/github-setup.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  allowNegative: true,
  options: {
    apply: { type: 'boolean', default: false },
    approvals: { type: 'string', default: '0' },
    'ai-review': { type: 'boolean', default: true },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || positionals.length !== 1) {
  console.log(`Usage: node scripts/setup-github.mjs <owner/repo> [--apply] [--approvals <n>] [--no-ai-review]

  Protects the default branch and configures merging for the factory's workflow.
  Without --apply it only prints what it would do.

  --approvals      required approving reviews (default 0; set 1 once a second person reviews)
  --no-ai-review   don't require the ai-review check (before the Claude token is set up)`);
  process.exit(values.help ? 0 : 1);
}

const repo = parseRepo(positionals[0]);
const approvals = Number(values.approvals);
if (!Number.isInteger(approvals) || approvals < 0) {
  console.error(`--approvals must be a whole number, got "${values.approvals}".`);
  process.exit(1);
}
const ruleset = buildRuleset({ approvals, aiReview: values['ai-review'] });
const quote = (arg) => (/^[\w./:=@-]+$/.test(arg) ? arg : `'${arg}'`);
const show = ({ description, args }) =>
  console.log(`\n# ${description}\ngh ${args.map(quote).join(' ')}`);

function runGh({ description, args }, input) {
  console.log(`\n# ${description}`);
  const result = spawnSync('gh', args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function findRulesetId() {
  const result = spawnSync('gh', ['api', `repos/${repo}/rulesets`], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return JSON.parse(result.stdout).find((existing) => existing.name === RULESET_NAME)?.id;
}

if (values.apply) {
  for (const step of buildSettingsSteps(repo)) runGh(step);
  runGh(buildRulesetStep(repo, findRulesetId()), JSON.stringify(ruleset));
} else {
  console.log(`Dry run for ${repo}. Nothing is changed; rerun with --apply to run these commands.`);
  for (const step of buildSettingsSteps(repo)) show(step);
  show(buildRulesetStep(repo, undefined));
  console.log(`(updates ruleset "${RULESET_NAME}" in place if it exists) with this body:`);
  console.log(JSON.stringify(ruleset, null, 2));
}

console.log('\nThen, by hand:');
for (const step of buildManualSteps(repo)) console.log(`  - ${step}`);
