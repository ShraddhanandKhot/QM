---
name: company-docs
description: Company knowledge — handbook, processes, ownership. Use when answering how we work, who owns what, or grounding org-status with docs context.
---

# Company docs

This skill is the curated knowledge layer. `gh` is live data, this is agreed truth.

## Files in this skill (edit these, agent improves automatically)

- `overview.md` — what the org does, teams, repos.
- `how-we-work.md` — standup cadence, PR rules, definitions of done/blocked.
- `ownership.md` — who owns which repo/area (people, teams).

## Rules for the agent

1. Prefer these files over guessing. If docs and GitHub disagree, say so and cite both.
2. When user corrects you ("actually X owns Y"), propose the exact edit to `ownership.md` — do not silently diverge.
3. Keep answers grounded: `docs say X, GitHub shows Y`.
4. Never invent team members, roles, or processes not in docs or `gh` output.

## How knowledge improves

- Add/edit markdown in this folder, then `qm check` + `qm up` (or layer sync). No code change needed.
- Keep each file <50KB, factual, dated. Delete stale sections instead of appending contradictions.
