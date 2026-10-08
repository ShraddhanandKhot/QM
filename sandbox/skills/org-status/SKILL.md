---
name: org-status
description: Answer who is working on what. Use for team status, open work by person, standup summaries, what shipped this week.
---

# Org status — who is working on what

You are the org layer. Source of truth is GitHub via `gh`. Never invent assignments.

## 0. Detect scope (no hardcoded org)

1. `gh auth status` — uses the connected GitHub OAuth connector, no paste needed. Only if it fails, ask for `GH_TOKEN` fallback (`repo`, `read:org`). If DNS/`EAI_AGAIN github.com` appears, report core connectivity instead.
2. `ME=$(gh api user --jq .login)` — the signed-in user.
3. List every organisation the user belongs to (this is the key step — never skip):
   `gh api user/orgs --jq '.[].login'`
   If empty, fall back to `gh org list`.
4. For each org, list its repos:
   `gh repo list ORG --limit 50 --json nameWithOwner,updatedAt --jq '.[].nameWithOwner'`
   Plus the user's personal repos: `gh repo list --limit 50 --json nameWithOwner,updatedAt`.
5. Track the recently-updated repos across all orgs. If more than 10 total, show the org/repo list and ask which org (or repos) to focus on; otherwise cover all.

## 1. Team status (open work by person)

For each tracked `OWNER/REPO`:

```bash
gh pr list -R OWNER/REPO --state open --limit 50 --json number,title,author,assignees,reviewRequests,url,createdAt
gh issue list -R OWNER/REPO --state open --limit 50 --json number,title,author,assignees,url,createdAt
```

Aggregate by person = author.login + assignees[].login + reviewRequests[].login.
Output table:

| Person | Open PRs | Open Issues | Oldest open | Links |
|---|---|---|---|---|

Rules:
- Group same person across repos into one row.
- Flag stale (>14d no update) with `(stale)`.
- Never print tokens. Links must be real `gh` URLs only.

## 2. Standup summary (shipped / in-progress)

Window defaults to last 7 days, `SINCE=$(date -u -d '7 days ago' +%Y-%m-%d)` (GNU) or adjust for BSD.

```bash
gh search prs --merged-at ">=SINCE" --owner ORG --limit 50 --json title,author,repository,url,mergedAt
gh search issues --closed ">=SINCE" --owner ORG --limit 50 --json title,author,repository,url,closedAt
```
Repeat per org from step 0. Group results by org, then repo.

If `gh search` is rate-limited, fall back per-repo:
`gh pr list -R OWNER/REPO --state merged --limit 20 --json ...`

Output:
- Shipped: merged PRs + closed issues grouped by repo, with author.
- In-progress: from section 1.
- Blocked: PRs with `reviewDecision=CHANGES_REQUESTED` or `isDraft`, issues labelled `blocked`.

Example prompts this handles:
- "who is working on what?"
- "standup summary for this week"
- "what did @user ship?"
- "what is stale?"
