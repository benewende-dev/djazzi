# A Djazzi instance: the headless rowboat-server behind the gate
# (architecture §3.1, roadmap phase 0). Build context = repo root:
#   fly deploy --config apps/djazzi/packages/instance/fly.toml \
#     --dockerfile apps/djazzi/packages/instance/Dockerfile .
#
# Runtime env: DJAZZI_INSTANCE_TOKEN (secret), API_URL (the control plane),
# DJAZZI_SERVER_KEY (set by the control plane on the instances it creates).

# DJAZZI(15/10/2026): REA uses its own Node 24 (including the SQLite API)
# and lockfile. Djazzi's Node 22 workspace and dependency graph stay separate.
FROM node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS rea
WORKDIR /opt/djazzi-rea
COPY apps/djazzi/engines/rea/package.json apps/djazzi/engines/rea/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
 && mkdir bin && cp /usr/local/bin/node bin/node

FROM eclipse-temurin:21-jdk-jammy@sha256:e0c60c487345d1dc9d0fc7b6f0496f3cc941e5132e09296cc17a6decc71b902b AS rea-java

FROM python:3.12-slim-bookworm AS rea-providers
COPY apps/djazzi/engines/rea/providers.json /providers.json
COPY apps/djazzi/engines/rea/install-providers.py /install-providers.py
RUN python3 /install-providers.py /providers.json /opt/djazzi-analysis

FROM node:22-bookworm AS build
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate \
 && apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src

# 1. Harbor's protocol package: @x/shared links it.
COPY apps/harbor/package.json apps/harbor/pnpm-lock.yaml apps/harbor/pnpm-workspace.yaml apps/harbor/tsconfig.base.json apps/harbor/
COPY apps/harbor/packages/protocol apps/harbor/packages/protocol
COPY apps/harbor/packages/server/package.json apps/harbor/packages/server/
RUN cd apps/harbor && pnpm install --frozen-lockfile --filter @rowboat/spaces-protocol \
 && pnpm --filter @rowboat/spaces-protocol build

# 2. rowboat-server and what it needs, then its self-contained bundle. The
# agent speaks of itself as Djazzi: the brand is applied to this copy of
# core only, the repository keeps the upstream text (desktop/scripts/brand.mjs).
COPY apps/x apps/x
COPY apps/djazzi/packages/desktop/scripts/brand.mjs apps/djazzi/packages/desktop/scripts/brand.mjs
COPY apps/djazzi/packages/desktop/scripts/desktop-layout.mjs apps/djazzi/packages/desktop/scripts/desktop-layout.mjs
# DJAZZI(13/10/2026): core branding also installs the shared Work policy.
COPY apps/djazzi/packages/desktop/assets/mobile/work-access.ts apps/djazzi/packages/desktop/assets/mobile/work-access.ts
COPY apps/djazzi/packages/desktop/assets/mobile/work-policy.ts apps/djazzi/packages/desktop/assets/mobile/work-policy.ts
COPY apps/djazzi/packages/desktop/assets/work-runtime.ts apps/djazzi/packages/desktop/assets/work-runtime.ts
COPY apps/djazzi/packages/desktop/assets/rea-config.ts apps/djazzi/packages/desktop/assets/rea-config.ts
COPY apps/djazzi/packages/desktop/assets/rea-runtime.ts apps/djazzi/packages/desktop/assets/rea-runtime.ts
COPY apps/djazzi/packages/desktop/assets/rea-scope.ts apps/djazzi/packages/desktop/assets/rea-scope.ts
RUN node apps/djazzi/packages/desktop/scripts/brand.mjs --yes --only core
# DJAZZI(24/11/2026): core and the server import @x/spaces-client (Rowboat, 23/11), built after shared.
RUN cd apps/x && pnpm install --frozen-lockfile --filter "@x/server..." \
 && (cd packages/shared && npm run build) \
 && (cd packages/spaces-client && npm run build) \
 && (cd packages/core && npm run build) \
 && (cd apps/server && npm run build && node scripts/build-headless.mjs) \
 && (cd apps/server/dist-headless && npm install --omit=dev)

# 3. The Djazzi launcher and gate.
COPY apps/djazzi/package.json apps/djazzi/pnpm-lock.yaml apps/djazzi/pnpm-workspace.yaml apps/djazzi/tsconfig.base.json apps/djazzi/
COPY apps/djazzi/packages/instance apps/djazzi/packages/instance
COPY apps/djazzi/packages/control/package.json apps/djazzi/packages/control/
RUN cd apps/djazzi && pnpm install --frozen-lockfile --filter @djazzi/instance \
 && pnpm --filter @djazzi/instance build
# The skill library (library.ts): fetched at the pinned commits, only the
# folders it borrows, then the clones are dropped.
COPY apps/djazzi/scripts/skill-library.py apps/djazzi/scripts/library-sources.json apps/djazzi/scripts/
RUN python3 -I apps/djazzi/scripts/skill-library.py /tmp/library-cache apps/djazzi/packages/instance/library \
 && rm -rf /tmp/library-cache

FROM node:22-bookworm-slim
# The Chat builds projects here (03/10/2026): git and Python beside Node.
# HOME on the volume: git's identity, caches and an engine's sign-in
# survive a restart, like the work itself.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git python3 python3-pip python3-venv ca-certificates procps chromium libgl1 libglu1-mesa libxrender1 libxext6 libgomp1 \
 && rm -rf /var/lib/apt/lists/*
COPY apps/djazzi/packages/instance/requirements-cad.txt /tmp/requirements-cad.txt
RUN python3 -m venv /opt/djazzi-cad \
 && /opt/djazzi-cad/bin/pip install --no-cache-dir -r /tmp/requirements-cad.txt \
 && /opt/djazzi-cad/bin/python -c "import cadquery; print(cadquery.__version__)" \
 && rm /tmp/requirements-cad.txt
ENV NODE_ENV=production \
    ROWBOAT_WORKDIR=/data \
    ROWBOAT_SERVER_ENTRY=/app/server/rowboat-server.cjs \
    HOME=/data/home \
    DJAZZI_CAD_PYTHON=/opt/djazzi-cad/bin/python \
    DJAZZI_REA_ROOT=/opt/djazzi-rea \
    DJAZZI_REA_NODE=/opt/djazzi-rea/bin/node \
    GHIDRA_INSTALL_DIR=/opt/djazzi-analysis/ghidra \
    JAVA_HOME=/opt/djazzi-java \
    REA_JADX_MCP_JAR=/opt/djazzi-analysis/jadx-headless-mcp.jar \
    REA_BROWSER_EXECUTABLE=/usr/bin/chromium \
    PORT=8080
WORKDIR /app
COPY --from=rea /opt/djazzi-rea /opt/djazzi-rea
COPY --from=rea-java /opt/java/openjdk /opt/djazzi-java
COPY --from=rea-providers /opt/djazzi-analysis /opt/djazzi-analysis
COPY --from=build /src/apps/x/apps/server/dist-headless ./server
COPY --from=build /src/apps/djazzi/packages/instance/package.json ./instance/package.json
COPY --from=build /src/apps/djazzi/packages/instance/dist ./instance/dist
# The skill library (library.ts): copied into the workdir on boot.
COPY --from=build /src/apps/djazzi/packages/instance/library ./instance/library
EXPOSE 8080
CMD ["node", "/app/instance/dist/main.js"]
