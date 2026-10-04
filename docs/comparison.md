# How this differs from pstack and other stacks

Short version: the well-known stacks make **the agent** behave better. This factory makes **the repository** refuse bad code, whoever wrote it, and gives agents the instructions to get it right the first time.

|                                   | pstack (Lauren Tan)                             | superpowers               | gstack                    | everything-claude-code                        | this factory                                                            |
| --------------------------------- | ----------------------------------------------- | ------------------------- | ------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| What it is                        | agent discipline: principles, playbooks, skills | dev-methodology skills    | role-based slash commands | large library of agents, skills, hooks, rules | a project kit: standards, enforced gates, agent instructions            |
| Where it runs                     | Cursor plugin + cloud agents                    | your local Claude session | your local agent session  | many agent tools, locally                     | inside each repo, and on GitHub from phase 2                            |
| Where safety lives                | in the playbook the agent follows               | in the skills             | in the skills             | local hooks and rules                         | lint, types, tests, git hooks, then GitHub rulesets and required checks |
| Ships lint, CI, and branch rules  | no                                              | no                        | no                        | partly (hooks)                                | yes                                                                     |
| Enforced architecture (DDD/Clean) | no                                              | no                        | no                        | as prose rules                                | yes, a lint rule fails layer and module violations                      |
| Works with any agent              | Cursor first                                    | Claude first              | several                   | several                                       | yes, through `AGENTS.md`                                                |
| Versioned per project             | plugin version                                  | plugin version            | repo version              | repo version                                  | `.factory.json` in each project, with sync in phase 6                   |

## What we take from them

- From pstack: one-rule principles, the author never approves their own merge, evidence before merge, a hold order that stops every agent, lessons encoded into structure.
- From superpowers: plan before code, test first, a fresh context per task.
- From gstack: separate roles (implement, review, QA, ship) as separate skills.
- From everything-claude-code: hooks that block mistakes as they happen, not only at review.

## Where we overlap and won't compete

The phase 3 agent skills (ship an issue, open a PR, review, verify) overlap with all of the above. Those skills stay thin and point at `standards/`, because the standards and gates are what this repo uniquely provides. If one of those stacks has a better workflow skill, use it alongside the factory; its output still has to pass the same gates.

## Building blocks, not alternatives

- `anthropics/claude-code-action` runs Claude in GitHub Actions. Phase 4 uses it.
- Hosted factories (Factory.ai, Warp, Devin, the Copilot coding agent) run the agents for you. This factory works with them too, since they all read `AGENTS.md` and all have to pass the same CI.
