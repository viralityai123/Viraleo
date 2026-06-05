#!/usr/bin/env bash
# =============================================================================
# setup.sh — One-command deployment for Oracle Cloud ARM VM
# =============================================================================
# Run this ONCE on a fresh Oracle Cloud Ubuntu 22.04/24.04 ARM VM.
# It installs everything needed and deploys your app.
#
# Usage:
#   ssh ubuntu@<your-vm-ip>
#   git clone <your-repo-url>
#   cd <your-repo>
#   bash deploy/setup.sh
# =============================================================================
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
APP_NAME="viraleo"
APP_DIR="$(pwd)"       # Use current directory (wherever the repo was cloned)
DOMAIN="viraleo.pro"  # ← Change this to your domain

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ─── Pre-flight checks ──────────────────────────────────────────────────────
if [ "$EUID" -eq 0 ]; then
    err "Do NOT run as root. Run as ubuntu user."
    exit 1
fi

if [ ! -f "$APP_DIR/deploy/Dockerfile" ]; then
    err "Run this script from the project root directory."
    err "Expected to find deploy/Dockerfile at: $APP_DIR/deploy/Dockerfile"
    exit 1
fi

# ─── 1. System updates + packages ────────────────────────────────────────────
echo ""
echo "========================================"
echo " Step 1: System packages"
echo "========================================"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    ufw \
    htop

log "System packages installed"

# ─── 2. Firewall ─────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Step 2: Firewall"
echo "========================================"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

log "Firewall configured (SSH, HTTP, HTTPS)"

# ─── 3. Install Node.js 22 ───────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Step 3: Node.js 22"
echo "========================================"
if command -v node &> /dev/null && [[ "$(node --version)" == v22* ]]; then
    log "Node.js $(node --version) already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
    log "Node.js $(node --version) installed"
fi

# ─── 4. Install PM2 ──────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Step 4: PM2 process manager"
echo "========================================"
if command -v pm2 &> /dev/null; then
    log "PM2 $(pm2 --version) already installed"
else
    sudo npm install -g pm2
    pm2 startup systemd -u "$USER" --hp "/home/$USER"
    log "PM2 installed and configured for auto-start on boot"
fi

# ─── 5. Install app dependencies + build ─────────────────────────────────────
echo ""
echo "========================================"
echo " Step 5: Build application"
echo "========================================"
cd "$APP_DIR"

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    if [ -f deploy/.env.production ]; then
        cp deploy/.env.production .env
        warn "Created .env from template. EDIT IT with your secrets!"
    else
        warn "No .env file found. Create one before starting the app."
    fi
fi

# Build
npm ci
NITRO_PRESET=node-server ./node_modules/.bin/vite build
npm prune --production

log "Application built"

# ─── 6. Configure nginx ──────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Step 6: Nginx"
echo "========================================"
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/$APP_NAME"
sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/"

# Create log directory
sudo mkdir -p /var/log/nginx
sudo touch "/var/log/nginx/$APP_NAME-access.log"
sudo touch "/var/log/nginx/$APP_NAME-error.log"

# Test nginx config
if sudo nginx -t 2>&1; then
    sudo systemctl reload nginx
    log "Nginx configured and running"
else
    err "Nginx config test failed. Fix manually: sudo nginx -t"
fi

# ─── 7. SSL certificate ──────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Step 7: SSL certificate (Let's Encrypt)"
echo "========================================"
if sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" 2>/dev/null; then
    log "SSL certificate obtained for $DOMAIN"
else
    warn "SSL setup skipped or failed. Run manually later:"
    warn "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# ─── 8. Create logs directory + start app ────────────────────────────────────
echo ""
echo "========================================"
echo " Step 8: Start application"
echo "========================================"
mkdir -p "$APP_DIR/logs"

# Stop existing if running
pm2 delete "$APP_NAME" 2>/dev/null || true

# Start with PM2
pm2 start "$APP_DIR/deploy/ecosystem.config.cjs"
pm2 save

log "Application started with PM2"

# ─── 9. Log rotation (prevent logs filling disk) ─────────────────────────────
echo ""
echo "========================================"
echo " Step 9: Log rotation"
echo "========================================"
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

log "Log rotation configured (100MB max, 7 days retention)"

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " 🎉 Deployment complete!"
echo "========================================"
echo ""
echo "  App:     https://$DOMAIN"
echo "  Manage:  pm2 logs $APP_NAME"
echo "           pm2 monit"
echo ""
echo "  IMPORTANT: If .env was just created, edit it:"
echo "    nano $APP_DIR/.env"
echo "    pm2 restart $APP_NAME"
echo ""
