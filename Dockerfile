# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1.4.4 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# The install prepared Nuxt without the sources, whose types the build checks.
RUN bun run nuxt prepare
RUN bun run build

# Runtime stage: Node as in .nvmrc, plus the lutgen and vips commands
FROM node:24-trixie-slim

# The vips command with AVIF (libheif with AV1 plugins) and JPEG XL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libvips-tools \
    libheif-plugin-aomenc \
    libheif-plugin-dav1d \
  && rm -rf /var/lib/apt/lists/*

# lutgen's release build, as the AUR package lutgen-bin installs it.
ARG LUTGEN_VERSION=1.1.1
ADD --checksum=sha256:10610beeae51b3308b01d93be6c998dbda42c887c6ad85e4e22dd12ce6a21ba0 \
  --chmod=755 \
  https://github.com/ozwaldorf/lutgen-rs/releases/download/lutgen-v${LUTGEN_VERSION}/lutgen-cli-v${LUTGEN_VERSION}-x86_64-unknown-linux-gnu \
  /usr/local/bin/lutgen

# Any user may write the cache, so a named volume works whoever the container runs as.
# /data/users is where NUXT_USERS_DIR usually points.
RUN install -d -o node -g node /data/source /data/users \
  && install -d -m 1777 /data/cache

WORKDIR /app
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production \
  NUXT_SOURCE_DIR=/data/source \
  NUXT_CACHE_DIR=/data/cache

USER node
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
