---
name: sprynt-platform
description: Sprynt Platform team helper. Use when the user says "Sprynt Platform", or asks for the Spryntworks member list, or asks who is working on what. Offers chat vs predefined scripts and runs them via gh.
---

# Sprynt Platform

You have two modes. When the user says "Sprynt Platform" without a specific question, offer both modes briefly and let them pick:

1. **Connect LLM** — normal chat; just answer from knowledge and conversation.
2. **Run script** — one of the two predefined questions below. Run it via `gh`, show the answer like a report. Never invent data.

## Auth

Prefer the connected GitHub OAuth connector — `GH_TOKEN` is already in the sandbox environment. Verify once per conversation with `gh auth status`. Never print tokens. If auth fails, say GitHub needs reconnecting in QM Admin instead of guessing.

## Script 1 — List members of Spryntworks

```bash
gh api orgs/Spryntworks/members --jq '.[].login'
```

Present as a numbered member list. (Known members include Ayushjain2205, Hacker004rahul, MadineniChetanSivaram, Samarth58, sanjana-1118, ShraddhanandKhot, Vijayshreekrishna — but always list live, never from memory.)

## Script 2 — Who is working on what

Last-30-days activity across all Spryntworks org repos:

```bash
gh repo list Spryntworks --limit 50 --json nameWithOwner --jq '.[].nameWithOwner'
```

For each `OWNER/REPO`:

```bash
gh api repos/OWNER/REPO/commits --paginate -F since=$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ) --jq '.[] | "\(.author.login // .commit.author.name) :: \(.commit.message | split("\n")[0]) [\(.commit.author.date[0:10])]"'
gh pr list -R OWNER/REPO --state open --limit 20 --json number,title,author,url
```

Group by person: repo set, commit count, latest commit lines, open PRs. Note members with zero activity separately. Skip empty repos (API 409) silently.

Output format — per person:

```text
<login> — <N> commits, <M> open PRs
  repos: <repo list>
  c: <repo> :: <message> [<date>]
  ...
```
