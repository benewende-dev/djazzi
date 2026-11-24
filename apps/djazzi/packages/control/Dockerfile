# The Djazzi control plane (architecture §3.5, roadmap phase 0).
# Build context = repo root:
#   fly deploy --config apps/djazzi/packages/control/fly.toml \
#     --dockerfile apps/djazzi/packages/control/Dockerfile .
#
# Runtime env: OPENROUTER_API_KEY, DJAZZI_INSTANCE_TOKEN, DATABASE_URL
# (secrets), DJAZZI_PUBLIC_URL, DJAZZI_PLAN_ID. See apps/djazzi/AGENTS.md.

FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /src

COPY apps/harbor/package.json apps/harbor/pnpm-lock.yaml apps/harbor/pnpm-workspace.yaml apps/harbor/tsconfig.base.json apps/harbor/
COPY apps/harbor/packages/protocol apps/harbor/packages/protocol
COPY apps/harbor/packages/server/package.json apps/harbor/packages/server/
RUN cd apps/harbor && pnpm install --frozen-lockfile --filter @rowboat/spaces-protocol \
 && pnpm --filter @rowboat/spaces-protocol build

# Only @x/shared: the control plane reads its schemas and constants.
COPY apps/x apps/x
RUN cd apps/x && pnpm install --frozen-lockfile --filter @x/shared \
 && (cd packages/shared && npm run build)

COPY apps/djazzi/package.json apps/djazzi/pnpm-lock.yaml apps/djazzi/pnpm-workspace.yaml apps/djazzi/tsconfig.base.json apps/djazzi/
COPY apps/djazzi/packages/control apps/djazzi/packages/control
COPY apps/djazzi/packages/instance/package.json apps/djazzi/packages/instance/
RUN cd apps/djazzi && pnpm install --frozen-lockfile --filter @djazzi/control \
 && pnpm --filter @djazzi/control build

# No prune: links into apps/x and apps/harbor must survive. Correct beats small.
FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /src
COPY --from=build /src ./
EXPOSE 8080
CMD ["node", "apps/djazzi/packages/control/dist/main.js"]
