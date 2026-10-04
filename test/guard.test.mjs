import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { findCommandViolation, findPushViolation } from '../core/.agents/guards/guard.mjs';

const GUARD = join(import.meta.dirname, '..', 'core', '.agents', 'guards', 'guard.mjs');
const ZERO = '0'.repeat(40);
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

const NO_VERIFY =
  '--no-verify skips the git hooks. Fix what the hook reports instead (AGENTS.md, hard rules).';
const COMMIT_N =
  'git commit -n skips the git hooks. Fix what the hook reports instead (AGENTS.md, hard rules).';
const HOOKS_PATH =
  'core.hooksPath skips the git hooks. Fix what the hook reports instead (AGENTS.md, hard rules).';
const HOOKS_OFF =
  'Turning hooks off skips the git hooks. Fix what the hook reports instead (AGENTS.md, hard rules).';
const pushTo = (branch) =>
  `Pushing to ${branch} is not allowed. Push a branch and open a pull request (standards/git.md).`;
const MERGE =
  'Agents never merge pull requests. A human merges after the checks and the review pass.';
const POST =
  'Local sessions never post PR or issue comments or reviews: they would appear under your name. Print the review in the session instead.';
const sql = (name) =>
  `${name} is blocked (standards/database.md). Change the schema through a migration and list columns instead of *. If this is a disposable local database, ask the user to run it.`;

const check = (command, { branch = 'feat/12-export', isCi = false } = {}) =>
  findCommandViolation(command, { readCurrentBranch: () => branch, isCi });

describe('findCommandViolation', () => {
  const blocked = [
    ['git commit --no-verify -m "feat: add export"', NO_VERIFY],
    ['git push --no-verify origin feat/12-export', NO_VERIFY],
    ['git commit -nm "feat: add export"', COMMIT_N],
    ['git -c core.hooksPath=/dev/null commit -m "feat: add export"', HOOKS_PATH],
    ['HUSKY=0 git commit -m "feat: add export"', HOOKS_OFF],
    ['$env:LEFTHOOK = "0"; git commit -m "feat: add export"', HOOKS_OFF],
    ['LEFTHOOK_EXCLUDE=verify git push', HOOKS_OFF],
    ['git push origin main', pushTo('main')],
    ['git push origin "main"', pushTo('main')],
    ['git push origin HEAD:main', pushTo('main')],
    ['git push -u origin feat/12-export:refs/heads/master', pushTo('master')],
    ['git push --force origin +main', pushTo('main')],
    ['git push origin --delete main', pushTo('main')],
    ['git push origin :main', pushTo('main')],
    ['git push --all origin', pushTo('main')],
    ['git -C ../other push origin main', pushTo('main')],
    ['pnpm verify && git push origin main', pushTo('main')],
    ['gh pr merge 12 --squash', MERGE],
    ['gh pr merge --auto --squash 12', MERGE],
    ['gh api -X PUT repos/acme/shop/pulls/12/merge', MERGE],
    [
      "gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'",
      MERGE,
    ],
    ['gh pr comment 12 --body "Looks good"', POST],
    ['gh pr review 12 --approve', POST],
    ['gh issue comment 3 --body "Done"', POST],
    ['gh api repos/acme/shop/issues/12/comments -f body=done', POST],
    ['gh api --method POST repos/acme/shop/pulls/12/reviews --input review.json', POST],
    [
      "gh api graphql -f query='mutation { addPullRequestReview(input: {}) { clientMutationId } }'",
      POST,
    ],
    ['psql "$DATABASE_URL" -c "DROP TABLE orders"', sql('DROP')],
    ['psql -c "TRUNCATE invoices"', sql('TRUNCATE')],
    ['mysql -e "ALTER TABLE orders ADD COLUMN note text"', sql('ALTER TABLE')],
    ['psql -c "SELECT * FROM orders LIMIT 5"', sql('SELECT *')],
    ['psql -c "DELETE FROM orders"', sql('UPDATE or DELETE without WHERE')],
    [
      'psql -c "SELECT id FROM orders WHERE id = 1; UPDATE orders SET status = 2"',
      sql('UPDATE or DELETE without WHERE'),
    ],
  ];
  for (const [command, expected] of blocked) {
    it(`blocks ${command}`, () => {
      assert.strictEqual(check(command), expected);
    });
  }

  const allowed = [
    'git commit -m "docs: explain why --no-verify is banned"',
    'git commit -m "fix: stop gh pr merge in scripts and git push origin main"',
    'git push -u origin HEAD',
    'git push origin feat/12-export',
    'git push --force-with-lease origin feat/12-export',
    'git log --oneline main',
    'gh pr view 12 --comments',
    'gh pr diff 12',
    'gh pr create --draft --title "feat: add export" --body "Closes #12"',
    'gh api repos/acme/shop/pulls/12/comments',
    'psql -c "SELECT id, status FROM orders WHERE id = 1"',
    'psql -c "SELECT count(*) FROM orders"',
    'psql -c "UPDATE orders SET status = 2 WHERE id = 1"',
    'grep -rn "DROP TABLE" src',
    'pnpm verify',
  ];
  for (const command of allowed) {
    it(`allows ${command}`, () => {
      assert.strictEqual(check(command), undefined);
    });
  }

  it('blocks a bare push while main is checked out', () => {
    assert.deepStrictEqual(
      ['git push', 'git push -u origin HEAD', 'git push --force-with-lease'].map((command) =>
        check(command, { branch: 'main' }),
      ),
      [pushTo('main'), pushTo('main'), pushTo('main')],
    );
  });

  it('allows pushing only tags while main is checked out', () => {
    assert.strictEqual(check('git push --tags', { branch: 'main' }), undefined);
  });

  it('lets the cloud reviewer post comments in GitHub Actions, but never merge', () => {
    assert.deepStrictEqual(
      [
        check('gh pr comment 12 --body "Verdict: PASS"', { isCi: true }),
        check('gh pr merge 12', { isCi: true }),
      ],
      [undefined, MERGE],
    );
  });
});

describe('findPushViolation', () => {
  it('blocks updating or deleting main or master', () => {
    assert.deepStrictEqual(
      [
        findPushViolation(`refs/heads/main ${SHA_B} refs/heads/main ${SHA_A}\n`),
        findPushViolation(`refs/heads/x ${SHA_B} refs/heads/master ${SHA_A}\n`),
        findPushViolation(`(delete) ${ZERO} refs/heads/main ${SHA_A}\n`),
      ],
      [pushTo('main'), pushTo('master'), pushTo('main')],
    );
  });

  it('allows creating main on an empty remote, and pushing other branches', () => {
    assert.deepStrictEqual(
      [
        findPushViolation(`refs/heads/main ${SHA_B} refs/heads/main ${ZERO}\n`),
        findPushViolation(
          `refs/heads/feat/12-export ${SHA_B} refs/heads/feat/12-export ${SHA_A}\n`,
        ),
        findPushViolation(''),
      ],
      [undefined, undefined, undefined],
    );
  });
});

describe('guard command line', () => {
  const runGuard = (mode, input, env = {}) => {
    const result = spawnSync(process.execPath, [GUARD, mode], {
      input,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_ACTIONS: '', ...env },
    });
    return { status: result.status, stderr: result.stderr };
  };
  const hookEvent = (command, cwd) =>
    JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd });

  it('exits 2 with the reason on stderr so Claude Code blocks the call', () => {
    assert.deepStrictEqual(runGuard('claude-hook', hookEvent('gh pr merge 12', process.cwd())), {
      status: 2,
      stderr: `Blocked by .agents/guards/guard.mjs: ${MERGE}\n`,
    });
  });

  it('exits 0 silently for an allowed command', () => {
    assert.deepStrictEqual(runGuard('claude-hook', hookEvent('pnpm verify', process.cwd())), {
      status: 0,
      stderr: '',
    });
  });

  it('reads the current branch from the event cwd', () => {
    const repo = mkdtempSync(join(tmpdir(), 'guard-'));
    try {
      spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: repo });
      assert.deepStrictEqual(runGuard('claude-hook', hookEvent('git push', repo)), {
        status: 2,
        stderr: `Blocked by .agents/guards/guard.mjs: ${pushTo('main')}\n`,
      });
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('allows posting from GitHub Actions', () => {
    assert.deepStrictEqual(
      runGuard('claude-hook', hookEvent('gh pr comment 12 --body "PASS"', process.cwd()), {
        GITHUB_ACTIONS: 'true',
      }),
      { status: 0, stderr: '' },
    );
  });

  it('fails a pre-push to main with exit 1', () => {
    assert.deepStrictEqual(
      runGuard('pre-push', `refs/heads/main ${SHA_B} refs/heads/main ${SHA_A}\n`),
      {
        status: 1,
        stderr: `Blocked by .agents/guards/guard.mjs: ${pushTo('main')}\n`,
      },
    );
  });
});
