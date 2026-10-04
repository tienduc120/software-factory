// Only checks reported by GitHub Actions can satisfy the ruleset, so no other app can fake them.
export const GITHUB_ACTIONS_APP_ID = 15368;
export const REPOSITORY_ADMIN_ROLE_ID = 5;
export const RULESET_NAME = 'protect-main';
export const REQUIRED_CHECKS = ['ci-passed', 'pr-title', 'ai-review'];

const REPO_FORMAT = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

export function parseRepo(repo) {
  if (!REPO_FORMAT.test(repo ?? '')) {
    throw new Error(`Invalid repository "${repo}". Use owner/name, e.g. octocat/my-service.`);
  }
  return repo;
}

/**
 * With no second reviewer, approvals stay at 0: GitHub never lets authors approve their own
 * pull request, and the required checks (including the AI review) still gate every merge.
 */
export function buildRuleset({ approvals = 0, aiReview = true } = {}) {
  const hasReviewers = approvals > 0;
  return {
    name: RULESET_NAME,
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    // Admins can merge a PR whose checks can't run (a fork, paused agents); direct pushes stay blocked.
    bypass_actors: [
      {
        actor_id: REPOSITORY_ADMIN_ROLE_ID,
        actor_type: 'RepositoryRole',
        bypass_mode: 'pull_request',
      },
    ],
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      { type: 'required_linear_history' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: approvals,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: hasReviewers,
          require_last_push_approval: hasReviewers,
          required_review_thread_resolution: true,
          allowed_merge_methods: ['squash'],
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          // Not strict: requiring an up-to-date branch would rerun every check, including the
          // AI review, on each open PR after every merge. CI on main catches what slips through.
          strict_required_status_checks_policy: false,
          do_not_enforce_on_create: false,
          required_status_checks: REQUIRED_CHECKS.filter(
            (check) => aiReview || check !== 'ai-review',
          ).map((context) => ({ context, integration_id: GITHUB_ACTIONS_APP_ID })),
        },
      },
    ],
  };
}

export function buildSettingsSteps(repo) {
  return [
    {
      description: 'Allow squash merges only, and delete merged branches',
      args: [
        'repo',
        'edit',
        repo,
        '--enable-squash-merge',
        '--enable-merge-commit=false',
        '--enable-rebase-merge=false',
        '--delete-branch-on-merge',
      ],
    },
    {
      description: 'Use the PR title and body as the squash commit message',
      args: [
        'api',
        '-X',
        'PATCH',
        `repos/${repo}`,
        '-f',
        'squash_merge_commit_title=PR_TITLE',
        '-f',
        'squash_merge_commit_message=PR_BODY',
      ],
    },
    {
      description: 'Create the label that hands an issue to the cloud agent',
      args: [
        'label',
        'create',
        'agent',
        '--repo',
        repo,
        '--color',
        '5319e7',
        '--description',
        'Claude implements this issue and opens a draft PR',
        '--force',
      ],
    },
  ];
}

/** Updates the ruleset in place when it exists, so running setup twice never duplicates it. */
export function buildRulesetStep(repo, existingId) {
  return existingId === undefined
    ? {
        description: `Create ruleset ${RULESET_NAME}`,
        args: ['api', '-X', 'POST', `repos/${repo}/rulesets`, '--input', '-'],
      }
    : {
        description: `Update ruleset ${RULESET_NAME} (id ${existingId})`,
        args: ['api', '-X', 'PUT', `repos/${repo}/rulesets/${existingId}`, '--input', '-'],
      };
}

export function buildManualSteps(repo) {
  return [
    'Install the Claude GitHub App on the repository: https://github.com/apps/claude',
    'Create a token from your Claude subscription: claude setup-token',
    `Store it as a secret (gh prompts for the value): gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo ${repo}`,
    `Kill switch, when needed: gh variable set AGENTS_PAUSED --body true --repo ${repo}`,
  ];
}
