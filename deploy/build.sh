#!/usr/bin/env bash
# =============================================================================
# build.sh — Build Viraleo for production (Node.js server, NOT Vercel)
# =============================================================================
# This script builds the app using Nitro's node-server preset instead of the
# default Vercel preset. The output goes to .output/ instead of .vercel/output/
# =============================================================================
set -euo pipefail  # strict mode: exit on any error, undefined var, or pipefail

echo "==> Installing dependencies..."
npm ci

echo "==> Building for Node.js server (NITRO_PRESET=node-server)..."
NITRO_PRESET=node-server ./node_modules/.bin/vite build

echo "==> Applying post-build fixes (lazyService + monitor warm-up)..."
node scripts/postbuild.mjs

echo "==> Pruning dev dependencies..."
npm prune --production

echo ""
echo "✅ Build complete!"
echo "   Output: .output/"
echo "   Start:  node .output/server/index.mjs"
echo "   Or use: pm2 start deploy/ecosystem.config.cjs"
echo ""
