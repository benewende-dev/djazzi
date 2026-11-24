# baarali-render: Chrome, FFmpeg and the HyperFrames producer (Studio Motion
# step 2, decided 08/10/2026). Build context = repo root:
#   fly deploy --config apps/djazzi/packages/render/fly.toml \
#     --dockerfile apps/djazzi/packages/render/Dockerfile --remote-only .
# Secret: DJAZZI_RENDER_SECRET, shared with the control plane only.

FROM node:22-trixie AS build
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /src
COPY apps/djazzi/package.json apps/djazzi/pnpm-lock.yaml apps/djazzi/pnpm-workspace.yaml apps/djazzi/tsconfig.base.json apps/djazzi/
COPY apps/djazzi/packages/render apps/djazzi/packages/render
RUN cd apps/djazzi && pnpm install --frozen-lockfile --filter @djazzi/render \
 && pnpm --filter @djazzi/render build \
 && pnpm --filter @djazzi/render deploy --prod --legacy /out

# Debian 13: FFmpeg 7. Noto covers the scripts our users write in, emoji included.
FROM node:22-trixie-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg iptables ca-certificates unzip fonts-noto-core fonts-noto-color-emoji fonts-liberation \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out ./
# The headless shell the producer's puppeteer expects, with its system
# libraries (--install-deps calls apt-get, hence the update; unzip extracts it).
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer
RUN apt-get update \
 && node "$(find node_modules/.pnpm -path '*/node_modules/puppeteer/lib/puppeteer/node/cli.js' | head -1)" \
      browsers install chrome-headless-shell --install-deps \
 && ln -s "$(find /opt/puppeteer -type f -name chrome-headless-shell | head -1)" /usr/local/bin/chrome-headless-shell \
 && chmod -R a+rX /opt/puppeteer \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=8080 \
    RENDER_DIR=/tmp/renders \
    HYPERFRAMES_FFMPEG_PATH=/usr/bin/ffmpeg \
    HYPERFRAMES_FFPROBE_PATH=/usr/bin/ffprobe \
    HYPERFRAMES_BROWSER_PATH=/usr/local/bin/chrome-headless-shell \
    PRODUCER_HEADLESS_SHELL_PATH=/usr/local/bin/chrome-headless-shell \
    HYPERFRAMES_FONT_CACHE_DIR=/tmp/fonts
COPY apps/djazzi/packages/render/entrypoint.sh /app/entrypoint.sh
EXPOSE 8080
CMD ["/app/entrypoint.sh"]
