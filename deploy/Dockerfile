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

# ─── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:24-alpine AS runner

# Install wget for healthcheck
RUN apk add --no-cache wget ca-certificates tzdata

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built output from builder (Nitro bundles all deps into .output/)
COPY --from=builder /app/.output /app/.output

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
