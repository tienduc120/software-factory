import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRuleset,
  buildRulesetStep,
  buildSettingsSteps,
  parseRepo,
} from '../scripts/lib/github-setup.mjs';

const check = (context) => ({ context, integration_id: 15368 });

describe('buildRuleset', () => {
  it('protects the default branch for a solo owner by default', () => {
    assert.deepStrictEqual(buildRuleset(), {
      name: 'protect-main',
      target: 'branch',
      enforcement: 'active',
      conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
      bypass_actors: [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'pull_request' }],
      rules: [
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        { type: 'required_linear_history' },
        {
          type: 'pull_request',
          parameters: {
            required_approving_review_count: 0,
            dismiss_stale_reviews_on_push: true,
            require_code_owner_review: false,
            require_last_push_approval: false,
            required_review_thread_resolution: true,
            allowed_merge_methods: ['squash'],
          },
        },
        {
          type: 'required_status_checks',
          parameters: {
            strict_required_status_checks_policy: false,
            do_not_enforce_on_create: false,
            required_status_checks: [check('ci-passed'), check('pr-title'), check('ai-review')],
          },
        },
      ],
    });
  });

  it('requires code owner approval once there is a second reviewer', () => {
    const pullRequest = buildRuleset({ approvals: 1 }).rules.find(
      (rule) => rule.type === 'pull_request',
    );

    assert.deepStrictEqual(pullRequest?.parameters, {
      required_approving_review_count: 1,
      dismiss_stale_reviews_on_push: true,
      require_code_owner_review: true,
      require_last_push_approval: true,
      required_review_thread_resolution: true,
      allowed_merge_methods: ['squash'],
    });
  });

  it('drops the ai-review check when asked', () => {
    const checks = buildRuleset({ aiReview: false }).rules.find(
      (rule) => rule.type === 'required_status_checks',
    );

    assert.deepStrictEqual(checks?.parameters.required_status_checks, [
      check('ci-passed'),
      check('pr-title'),
    ]);
  });
});

describe('setup steps', () => {
  it('creates the ruleset when none exists and updates it in place otherwise', () => {
    assert.deepStrictEqual(
      [buildRulesetStep('acme/shop', undefined).args, buildRulesetStep('acme/shop', 42).args],
      [
        ['api', '-X', 'POST', 'repos/acme/shop/rulesets', '--input', '-'],
        ['api', '-X', 'PUT', 'repos/acme/shop/rulesets/42', '--input', '-'],
      ],
    );
  });

  it('allows squash merges only and creates the agent label', () => {
    assert.deepStrictEqual(
      buildSettingsSteps('acme/shop').map((step) => step.args),
      [
        [
          'repo',
          'edit',
          'acme/shop',
          '--enable-squash-merge',
          '--enable-merge-commit=false',
          '--enable-rebase-merge=false',
          '--delete-branch-on-merge',
        ],
        [
          'api',
          '-X',
          'PATCH',
          'repos/acme/shop',
          '-f',
          'squash_merge_commit_title=PR_TITLE',
          '-f',
          'squash_merge_commit_message=PR_BODY',
        ],
        [
          'label',
          'create',
          'agent',
          '--repo',
          'acme/shop',
          '--color',
          '5319e7',
          '--description',
          'Claude implements this issue and opens a draft PR',
          '--force',
        ],
      ],
    );
  });

  it('rejects a repository that is not owner/name', () => {
    assert.throws(() => parseRepo('shop'), {
      message: 'Invalid repository "shop". Use owner/name, e.g. octocat/my-service.',
    });
  });
});
