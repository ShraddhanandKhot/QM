---
name: github
description: Operate GitHub via gh CLI and git. Use whenever asked to list repos, manage issues/PRs/releases/actions, clone, branch, commit, or push.
---

# GitHub skill

Use `gh` for API operations and `git` for local repo work. Both are installed in the sandbox.

## Auth

1. Prefer the connected GitHub OAuth connector (user `/keychain`) — no token paste needed. Use the connector-vended credential / `GH_TOKEN` already present in the sandbox environment first.
2. Verify with `gh auth status`. Only if that fails, ask for a PAT fallback (`repo`, `read:org` minimal): `echo "$GH_TOKEN" | gh auth login --with-token` or export `GH_TOKEN` / `GITHUB_TOKEN`.
3. Never print tokens, never commit them. If you see `EAI_AGAIN github.com` or connector refresh failures, report connectivity — do not keep asking for new tokens.

## Safe workflows

- Read-only first: `gh repo list`, `gh issue list -R OWNER/REPO`, `gh pr list -R OWNER/REPO`, `gh pr view 123 -R OWNER/REPO`, `gh run list -R OWNER/REPO`.
- Clone: `git clone https://github.com/OWNER/REPO.git` (auth via gh: `gh repo clone OWNER/REPO`).
- Changes: branch with `git checkout -b feat/x`, commit, push, then `gh pr create --fill -R OWNER/REPO`.
- Mutating actions (merge, close, release, push to main, workflow dispatch) need explicit user confirmation in chat first.
- Default `OWNER/REPO` from `git remote get-url origin` when inside a checkout; otherwise require explicit `-R OWNER/REPO`.

## Examples

```bash
gh repo list --limit 20
gh issue create -R OWNER/REPO --title "Bug: ..." --body "..."
gh pr create -R OWNER/REPO --title "feat: ..." --body "Closes #123" --base main --head feat/x
gh pr merge 12 -R OWNER/REPO --squash
gh release create v0.2.0 --generate-notes -R OWNER/REPO
gh run watch <run-id> -R OWNER/REPO
```
