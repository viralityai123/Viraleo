# ☁️ Deploy Viraleo on Oracle Cloud ARM VM (Free — 24GB RAM)

> **Time:** ~1 hour  
> **Cost:** $0/month (forever)  
> **Capacity:** 50k-100k monthly active users

---

## 📋 Prerequisites

| What                     | Where to get it                                                           |
| ------------------------ | ------------------------------------------------------------------------- |
| **Oracle Cloud account** | https://cloud.oracle.com (needs credit card for identity — never charged) |
| **Your repo**            | `git clone <your-repo-url>`                                               |
| **A domain**             | viraleo.pro or any domain you own                                         |
| **Upstash Redis**        | https://upstash.com (free tier: 10k requests/day)                         |
| **YouTube API key**      | https://console.cloud.google.com                                          |
| **Gemini API key**       | https://aistudio.google.com                                               |

---

## 🥘 Cookbook — Step by Step

### Step 1: Create the Oracle Cloud VM

| Action                                                        | Screenshot / Command          |
| ------------------------------------------------------------- | ----------------------------- |
| 1. Log in to [Oracle Cloud Console](https://cloud.oracle.com) |                               |
| 2. Go to **Compute → Instances**                              |                               |
| 3. Click **Create Instance**                                  |                               |
| 4. Name: `viraleo-vm`                                         |                               |
| 5. **Image:** Ubuntu 24.04 (or 22.04)                         |                               |
| 6. **Shape:** Select **Ampere A1**                            | ⚠️ This is the FREE ARM shape |
| 7. **OCPU count:** 4 (max free)                               |                               |
| **Memory:** 24 GB (max free)                                  |                               |
| 8. **Add SSH key:** Generate or paste your public key         | 🔑 Save the private key!      |
| 9. Click **Create**                                           | ⏳ Wait 2-3 minutes           |

### Step 2: SSH into the VM

```bash
# From your local machine:
ssh -i ~/.ssh/oracle-key ubuntu@<YOUR_VM_IP>

# Example:
ssh -i ~/.ssh/oracle-key ubuntu@129.146.123.45
```

> **Where to find the IP:** Oracle Console → Compute → Instances → Your VM → Public IP Address

### Step 3: Deploy with ONE command

```bash
# On the VM, clone your repo:
git clone https://github.com/your-username/viraleo.git
cd viraleo

# Run the deploy script:
bash deploy/setup.sh
```

The script does **everything** automatically:

- ✅ Installs Node.js 22, nginx, certbot
- ✅ Configures firewall (SSH + HTTP + HTTPS only)
- ✅ Installs PM2 process manager
- ✅ Builds the app with `NITRO_PRESET=node-server`
- ✅ Configures nginx as reverse proxy
- ✅ Tries to get a free SSL certificate from Let's Encrypt
- ✅ Starts the app with PM2
- ✅ Sets up log rotation

> ⏳ The setup takes 5-10 minutes. Let it finish.

### Step 4: Set environment variables

```bash
# The setup created a template .env file. Edit it:
nano .env
```

Fill in **at minimum** these values:

```
JWT_SECRET=<run: openssl rand -hex 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
UPSTASH_REDIS_REST_URL=<from Upstash>
UPSTASH_REDIS_REST_TOKEN=<from Upstash>
YOUTUBE_API_KEY=<from Google Cloud Console>
GEMINI_KEYS=<from Google AI Studio>
LEMONSQUEEZY_API_KEY=<from Lemon Squeezy>
LEMONSQUEEZY_STORE_ID=<from Lemon Squeezy>
APP_URL=https://viraleo.pro
```

After editing, restart the app:

```bash
pm2 restart viraleo
```

### Step 5: Point your domain to the VM

| Where                                               | What to do                                  |
| --------------------------------------------------- | ------------------------------------------- |
| Your domain registrar (Namecheap, Cloudflare, etc.) | Add an **A record**: `@` → `<YOUR_VM_IP>`   |
|                                                     | Add an **A record**: `www` → `<YOUR_VM_IP>` |

> DNS changes take 5 minutes to 24 hours to propagate.

### Step 6: Get SSL certificate

If the setup script didn't get a cert (or you skipped it), run:

```bash
sudo certbot --nginx -d viraleo.pro -d www.viraleo.pro
```

Follow the prompts. Your site is now HTTPS-secured.

### Step 7: Verify it works

```bash
# Check app is running:
pm2 status

# Check logs:
pm2 logs viraleo

# Check nginx:
sudo nginx -t
sudo systemctl status nginx

# Visit in browser:
curl https://viraleo.pro
```

---

## 🔧 Day 2 Operations

```bash
# ── View logs ──
pm2 logs viraleo
pm2 logs viraleo --lines 200

# ── Monitor CPU/RAM ──
pm2 monit

# ── Restart ──
pm2 restart viraleo

# ── Restart daily (auto: PM2 cron at 4 AM) ──
pm2 restart viraleo --cron "0 4 * * *"

# ── Update the app ──
cd ~/viraleo
git pull
bash deploy/build.sh
pm2 restart viraleo

# ── Update with Docker ──
cd ~/viraleo
git pull
docker build -t viraleo -f deploy/Dockerfile .
docker stop viraleo && docker rm viraleo
docker run -d --name viraleo -p 3000:3000 --env-file .env viraleo

# ── System update ──
sudo apt update && sudo apt upgrade -y
sudo reboot
```

---

## 📊 Capacity Planning

| Metric        | What 2000 users consume | Still free? |
| ------------- | ----------------------- | ----------- |
| **CPU**       | 5-15% of 4 cores        | ✅ Yes      |
| **RAM**       | 500MB-1.5GB of 24GB     | ✅ Yes      |
| **Bandwidth** | 20-50GB of 10TB         | ✅ Yes      |
| **Storage**   | 1-2GB of 200GB          | ✅ Yes      |

Your 24GB RAM / 4 core VM is **massive overkill** for 2000 users. You'll hit 100k MAU before needing to upgrade.

---

## 🚨 Troubleshooting

| Problem                        | Fix                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `Connection refused` on SSH    | Check Oracle Console → Instance → Console Connection → Reboot                                                      |
| `502 Bad Gateway`              | Node server isn't running: `pm2 restart viraleo`                                                                   |
| `certbot` fails                | Make sure your domain's A record points to this VM's IP                                                            |
| Build fails with `Killed`      | VM ran out of memory during build: add swap `sudo fallocate -l 4G /swap && sudo mkswap /swap && sudo swapon /swap` |
| `UPSTASH_REDIS_REST_URL` error | Create a free Redis DB at upstash.com, copy the REST URL + token                                                   |
| Slow ML processing             | Move face-api.js + tesseract.js to client-side (browser loads models)                                              |
| Need to redeploy               | `cd ~/viraleo && git pull && bash deploy/build.sh && pm2 restart viraleo`                                          |

---

## 🆚 Why This Beats Vercel Free

|                    | Vercel Free         | Oracle ARM VM              |
| ------------------ | ------------------- | -------------------------- |
| **RAM**            | 1GB function limit  | **24GB**                   |
| **CPU**            | Shared              | **4 dedicated cores**      |
| **Timeout**        | 10 seconds          | **None**                   |
| **Bandwidth**      | 100 GB              | **10 TB**                  |
| **ML/AI friendly** | ❌ Timeout kills ML | ✅ face-api + OCR run fine |
| **Always-on**      | ✅ Yes (functions)  | **✅ Full server**         |
| **Cost**           | Free                | **Free forever**           |
| **Setup**          | 1-click             | 1 hour                     |
