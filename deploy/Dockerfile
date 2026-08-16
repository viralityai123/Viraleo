# =============================================================================
# Dockerfile — Production build for Oracle Cloud ARM VM (Ampere A1)
# =============================================================================
# Build:  docker build -t viraleo -f deploy/Dockerfile .
# Run:    docker run -d --name viraleo -p 3000:3000 --env-file .env viraleo
# =============================================================================

# ─── Stage 1: Install deps + Build ───────────────────────────────────────────
# node:24 matches the validated local environment (npm 11 accepts the lockfile;
# npm 10 in node:22 rejects the unstorage optional-peer entry for lru-cache)
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Copy dependency manifests first (maximizes Docker layer cache)
COPY package.json package-lock.json bun.lock* bunfig.toml* ./
COPY scripts/ ./scripts/
RUN npm ci

# Copy all source code
COPY tsconfig.json vite.config.ts ./
COPY public/ ./public/
COPY src/ ./src/
COPY server/ ./server/

# Build with Node.js server preset. The marker file is how vite.config.ts picks
# the preset (env vars are unreliable inside Render's BuildKit runner).
RUN touch /app/.render-node && ./node_modules/.bin/vite build

# Fail fast with a clear message if the preset did not apply
RUN test -f /app/.output/server/index.mjs || (echo "FAILED: node-server preset not applied (.output missing)" && exit 1)

# Apply the nitro lazy-service patch (required for the 24/7 monitor to boot)
ENV POSTBUILD_SKIP_PING=1
RUN timeout 90 node scripts/postbuild.mjs

# Install Playwright Chromium (glibc) into the build stage cache so the runner
# can use it for the auto-relogin bot
RUN npx playwright install chromium --with-deps || npx playwright install chromium || echo "WARN: chromium install failed"

# Drop the stray .vercel scaffolding the build leaves behind (cosmetic)
RUN rm -rf /app/.vercel

# Trim dev dependencies — runtime deps (playwright, upstash, ...) are copied
# to the runner so the bundled server can require() them
RUN npm prune --omit=dev

# Stage 2: Production runtime (glibc — matches the chromium built above)
FROM node:24-bookworm-slim AS runner

# System libraries required by Playwright Chromium + wget for the healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libasound2 libpango-1.0-0 libcairo2 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built output from builder
COPY --from=builder /app/.output /app/.output

# Copy runtime dependencies (playwright & co are externalized by Nitro)
COPY --from=builder /app/node_modules /app/node_modules

# Copy Playwright chromium browsers (installed in the build stage)
COPY --from=builder /root/.cache/ms-playwright /app/.cache/ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

# Copy env template (actual values injected via --env-file at runtime)
COPY deploy/.env.production /app/.env.example

# Set correct permissions
RUN chown -R appuser:appgroup /app

USER appuser

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# Health check — verifies the server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the Nitro standalone Node.js server
CMD ["node", ".output/server/index.mjs"]
