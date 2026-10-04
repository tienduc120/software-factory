#!/usr/bin/env node
// Blocks the actions AGENTS.md forbids before they run. Hooks and CI can't stop these alone:
// `--no-verify` skips hooks, and comments or merges happen outside CI.
//   node .agents/guards/guard.mjs claude-hook   Claude Code PreToolUse hook (event JSON on stdin)
//   node .agents/guards/guard.mjs pre-push      git pre-push hook (ref lines on stdin)
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const PROTECTED_BRANCHES = new Set(['main', 'master']);
const ZERO_OID = /^0+$/;

// Checked on each command with quoted text masked, so a commit message can mention these.
const HOOK_BYPASSES = [
  { pattern: /(^|\s)--no-verify(\s|=|$)/, name: '--no-verify' },
  {
    pattern: /^git\s+(?:(?:-[cC]\s+\S+|--\S+)\s+)*commit\b.*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/,
    name: 'git commit -n',
  },
  { pattern: /\bcore\.hooksPath\b/i, name: 'core.hooksPath' },
];
const HOOK_BYPASS_ENV = /\b(HUSKY|LEFTHOOK)\s*=\s*['"]?0\b|\bLEFTHOOK_EXCLUDE\b/;

const SQL_CLIENT =
  /\b(psql|pgcli|mysql|mariadb|mycli|sqlite3|sqlcmd|duckdb|clickhouse-client|cockroach\s+sql)\b/i;
const DESTRUCTIVE_SQL = [
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA|VIEW|INDEX)\b/i, name: 'DROP' },
  { pattern: /\bTRUNCATE\b/i, name: 'TRUNCATE' },
  { pattern: /\bALTER\s+TABLE\b/i, name: 'ALTER TABLE' },
  { pattern: /\bSELECT\s+\*/i, name: 'SELECT *' },
];

const GIT_PUSH = /^git\s+(?:(?:-[cC]\s+\S+|--\S+)\s+)*push\b(.*)$/;
const PUSH_VALUE_FLAGS = new Set(['--repo', '-o', '--push-option', '--receive-pack', '--exec']);
const PUSH_ALL_FLAGS = new Set(['--all', '--mirror', '--branches']);

const GH_MERGE = /^gh\s+pr\s+merge\b/;
const GH_POST = /^gh\s+(pr\s+(comment|review)|issue\s+comment)\b/;
const GH_API_MERGE = /^gh\s+api\b.*\bpulls\/\d+\/merge\b/;
const GH_API_POST =
  /^gh\s+api\b.*\b(pulls\/\d+\/(reviews|comments)|pulls\/comments\/\d+|issues\/\d+\/comments|issues\/comments\/\d+)\b/;
const GH_API_WRITE =
  /\s(-X|--method)[\s=]*(POST|PUT|PATCH|DELETE)\b|\s(-f|-F|--field|--raw-field|--input)(\s|$)/i;
// GraphQL mutations live inside the quoted query, so these run on the raw command.
const GH_GRAPHQL_MERGE =
  /\bgh\s+api\s+graphql\b.*\b(mergePullRequest|enablePullRequestAutoMerge)\b/;
const GH_GRAPHQL_POST =
  /\bgh\s+api\s+graphql\b.*\b(addComment|addPullRequestReview|submitPullRequestReview|addPullRequestReviewThread)\b/;

/** Keeps simple quoted words (branch names) and blanks quoted prose (commit messages, SQL). */
function maskQuoted(command) {
  return command.replace(/"([^"]*)"|'([^']*)'/g, (_match, double, single) => {
    const content = double ?? single ?? '';
    return /^[\w./:+@-]*$/.test(content) ? content : '""';
  });
}

function listSegments(command) {
  return maskQuoted(command)
    .split(/&&|\|\||[;|\n]/)
    .map((segment) => segment.trim().replace(/^(?:[A-Za-z_]\w*=\S*\s+)*/, ''));
}

function listPushTargets(args, readCurrentBranch) {
  const tokens = args.split(/\s+/).filter(Boolean);
  if (tokens.some((token) => PUSH_ALL_FLAGS.has(token))) return [...PROTECTED_BRANCHES];
  const positionals = tokens.filter(
    (token, index) => !token.startsWith('-') && !PUSH_VALUE_FLAGS.has(tokens[index - 1] ?? ''),
  );
  const refspecs = positionals.slice(1);
  if (refspecs.length === 0) return tokens.includes('--tags') ? [] : [readCurrentBranch()];
  return refspecs.map((refspec) => {
    const destination = refspec.replace(/^\+/, '').split(':').at(-1) ?? '';
    return destination === 'HEAD' ? readCurrentBranch() : destination.replace(/^refs\/heads\//, '');
  });
}

function findUnboundedWrite(command) {
  return command
    .split(';')
    .some(
      (statement) =>
        /\b(DELETE\s+FROM|UPDATE\s+\S+\s+SET)\b/i.test(statement) && !/\bWHERE\b/i.test(statement),
    );
}

export function findCommandViolation(command, { readCurrentBranch, isCi }) {
  const segments = listSegments(command);

  const bypass = HOOK_BYPASSES.find(({ pattern }) =>
    segments.some((segment) => pattern.test(segment)),
  );
  if (bypass || HOOK_BYPASS_ENV.test(command)) {
    return `${bypass?.name ?? 'Turning hooks off'} skips the git hooks. Fix what the hook reports instead (AGENTS.md, hard rules).`;
  }

  const protectedBranch = segments
    .map((segment) => GIT_PUSH.exec(segment))
    .flatMap((push) => (push ? listPushTargets(push[1] ?? '', readCurrentBranch) : []))
    .find((branch) => PROTECTED_BRANCHES.has(branch));
  if (protectedBranch) {
    return `Pushing to ${protectedBranch} is not allowed. Push a branch and open a pull request (standards/git.md).`;
  }

  const isMerging =
    GH_GRAPHQL_MERGE.test(command) ||
    segments.some(
      (segment) =>
        GH_MERGE.test(segment) || (GH_API_MERGE.test(segment) && GH_API_WRITE.test(segment)),
    );
  if (isMerging) {
    return 'Agents never merge pull requests. A human merges after the checks and the review pass.';
  }

  const isPosting =
    GH_GRAPHQL_POST.test(command) ||
    segments.some(
      (segment) =>
        GH_POST.test(segment) || (GH_API_POST.test(segment) && GH_API_WRITE.test(segment)),
    );
  if (isPosting && !isCi) {
    return 'Local sessions never post PR or issue comments or reviews: they would appear under your name. Print the review in the session instead.';
  }

  if (SQL_CLIENT.test(command)) {
    const destructive = DESTRUCTIVE_SQL.find(({ pattern }) => pattern.test(command));
    const name =
      destructive?.name ??
      (findUnboundedWrite(command) ? 'UPDATE or DELETE without WHERE' : undefined);
    if (name) {
      return `${name} is blocked (standards/database.md). Change the schema through a migration and list columns instead of *. If this is a disposable local database, ask the user to run it.`;
    }
  }
  return undefined;
}

export function findPushViolation(refLines) {
  for (const line of refLines.split('\n')) {
    const [, localOid = '', remoteRef = '', remoteOid = ''] = line.trim().split(/\s+/);
    const branch = remoteRef.replace(/^refs\/heads\//, '');
    if (!PROTECTED_BRANCHES.has(branch)) continue;
    // Creating the branch on an empty remote is the only way to bootstrap a repository.
    if (ZERO_OID.test(remoteOid) && !ZERO_OID.test(localOid)) continue;
    return `Pushing to ${branch} is not allowed. Push a branch and open a pull request (standards/git.md).`;
  }
  return undefined;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function runClaudeHook() {
  const event = JSON.parse(readStdin());
  const command = event.tool_input?.command;
  if (typeof command !== 'string') return 0;
  const violation = findCommandViolation(command, {
    readCurrentBranch: () =>
      spawnSync('git', ['branch', '--show-current'], {
        cwd: event.cwd ?? process.cwd(),
        encoding: 'utf8',
      }).stdout?.trim() ?? '',
    isCi: process.env.GITHUB_ACTIONS === 'true',
  });
  if (!violation) return 0;
  process.stderr.write(`Blocked by .agents/guards/guard.mjs: ${violation}\n`);
  // Exit code 2 makes Claude Code block the call and show stderr to the model.
  return 2;
}

function runPrePush() {
  const violation = findPushViolation(readStdin());
  if (!violation) return 0;
  process.stderr.write(`Blocked by .agents/guards/guard.mjs: ${violation}\n`);
  return 1;
}

const MODES = { 'claude-hook': runClaudeHook, 'pre-push': runPrePush };
const runMode = MODES[process.argv[2] ?? ''];
if (runMode) process.exitCode = runMode();
