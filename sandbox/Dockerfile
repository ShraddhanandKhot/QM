FROM ghcr.io/yc-software/qm/sandbox-base@sha256:9c632c8359eb41a626880b4669328c8fbe2fe7e7d38b99e5cc37fd389c2d04ab

# Keep the scaffold example-tool working: with a custom Dockerfile
# the builder does NOT auto-COPY tool executables, so copy it manually.
COPY tools/example-tool/example-tool /usr/local/bin/example-tool

# Git + GitHub CLI for agent-operated GitHub workflows.
RUN if command -v apt-get >/dev/null 2>&1; then \
      apt-get update && \
      apt-get install -y --no-install-recommends git gh ca-certificates && \
      rm -rf /var/lib/apt/lists/*; \
    elif command -v apk >/dev/null 2>&1; then \
      apk add --no-cache git github-cli ca-certificates; \
    else echo "sandbox: no supported package manager (need apt-get or apk)" >&2; exit 1; fi

RUN chmod -R a+rx /usr/local/bin && \
    git --version && \
    gh --version
