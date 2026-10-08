# QM — shraddh deployment

One QM deployment: config + sandbox layer + docs. The `@yc-software/qm` npm package
(`package.json`, pinned at `0.1.12`) supplies the deployment engine; this repo owns
the org-specific config and agent customization.

Live repo: https://github.com/ShraddhanandKhot/QM

## What runs here

- `qm.config.jsonc` — the deployment. Current values: `target: "docker"`,
  `orgId: "shraddh"`, `modelProvider: "openrouter"`, model
  `thinkingmachines/inkling:free`, services `core, web-ui, admin, portal, auth`,
  sandbox backend `local` (each agent sandbox = a Docker container on the same host).
  Portal owns host port **8081** and fronts web chat + `/admin`.
- `sandbox/` — what the agent gets: `skills/<id>/SKILL.md` workflows and
  `tools/<id>/tool.json` executables, plus an optional `Dockerfile`.
- `apps/team-hub/` — small zero-dependency Node demo app (port 8091, data in `data.json`).
- `freeai-shim/` — local helper shim (untracked logs stay local).
- `slack-app-manifest.yml` — optional Slack bot app manifest.
- `.env.example` — secret catalog (names only). `.env` holds real values and is
  **gitignored — never commit it**.

## Prerequisites

- Node >= 24, npm, Git, OpenSSL
- Docker with Buildx + a running Docker daemon (the `docker` target and the
  `local` sandbox backend both need it)
- A VPS (e.g. Ubuntu 24.04, 2+ vCPU / 4GB+ RAM) with port 8081 reachable, or
  localhost for a local test drive

## Deploy on a VPS (docker target)

All commands run from the repo root.

```bash
# 1. Clone on the VPS
git clone https://github.com/ShraddhanandKhot/QM.git
cd QM

# 2. Reproducible install (package-lock.json exists)
npm ci
npm exec qm -- version

# 3. Secrets — never commit these
cp .env.example .env
chmod 600 .env
# Edit .env and fill the values `qm check` asks for, at minimum:
#   OPENROUTER_API_KEY=...        (bills the base model)
#   ADMIN_GRANTS=you@company.com:org_admin
#   plus generated signing keys, e.g.: openssl rand -hex 32
#   SMTP_* / AUTH_* only if you use the built-in auth email broker

# 4. Point the config at the VPS
# Edit qm.config.jsonc -> publicUrl:
#   local test:  "publicUrl": "http://localhost:8081"
#   VPS by IP:   "publicUrl": "http://<VPS-IP>:8081"
#   VPS by domain (recommended): "publicUrl": "https://qm.example.com"
# Sign-in links are minted against publicUrl, so it must be reachable
# from the browser that clicks them.

# 5. Validate, preview, bring up
npm exec qm -- check     # validates config + sandbox, verifies keys when present
npm exec qm -- plan      # dry run, changes nothing
npm exec qm -- up        # starts containers, prints the URLs
npm exec qm -- status    # what is running
npm exec qm -- logs      # all services; `logs core` / `logs portal` for one
```

Open the URLs printed by `up` (or `npm exec qm -- outputs`):
- Web chat (sign in, send a message, confirm a real model reply)
- Admin onboarding + connectors pages
- Portal on `:8081` is the front door

Update later:

```bash
git pull
npm ci
npm exec qm -- up
```

Stop: `npm exec qm -- down`. Secrets to a remote target: `npm exec qm -- secrets push`
(docker target reads `.env` directly and does not need it).

## VPS networking notes

- Firewall: allow `8081/tcp` (e.g. `sudo ufw allow 8081/tcp`). Close it again if
  you put a reverse proxy in front and only expose 80/443.
- Production: terminate HTTPS with Caddy/Nginx (proxy to `127.0.0.1:8081`), set
  `publicUrl` to the `https://` origin, re-run `check` + `up`, and re-render Slack
  manifests (`npm exec qm -- slack render`) if you use the Slack bot.
- A quick tunnel hostname changes on restart — update `publicUrl` and re-run `up`.
- Keep Docker running; the agent sandboxes are sibling containers via the Docker socket.

## Security

- `.env` is gitignored (`git check-ignore --quiet .env` must be silent-success).
  Never paste keys into chat, logs, or any committed file.
- If a secret ever lands in git (as happened once with a scratch note file), rotate
  it at the provider immediately — removing the file later does not un-expose it,
  since clones/caches may retain history.
- `.env.example` documents every known secret and the command that mints a value
  when one exists.

## Local test drive (optional)

Same steps on your own machine with `"publicUrl": "http://localhost:8081"`.
Sign-in links then only work in a browser on that same PC.
