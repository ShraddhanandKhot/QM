---
name: team-hub
description: Team roster app data (developers, roles, status). Use when asked who is on the team, someone's role/status, or to add/update/remove a developer.
---

# Team Hub

Source of truth for the roster is `apps/team-hub/data.json` (also served by the local app at `http://localhost:8091`).

## Read

Read `apps/team-hub/data.json` and answer from it. Statuses: Available, Working, Blocked, On leave.

## Write (only on explicit request)

- Add: append `{id, name, role, status, updatedAt: YYYY-MM-DD}` to `members`. id = `m` + short unique suffix.
- Update: change `role`/`status` + `updatedAt` for the named member.
- Remove: delete by name (confirm which one if duplicates).
- Never invent members. If UI and file disagree, the file wins until the app is restarted.

## Combine with live GitHub

For "who is working on what", join this roster with the `org-status` skill (`gh` open PRs/issues by person).
