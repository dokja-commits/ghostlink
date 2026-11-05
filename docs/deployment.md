# GhostLink — Global Deployment Guide

Deploy GhostLink so that anyone in the world can share files across different networks with end-to-end encryption.

---

## Why Hosting GhostLink Is Inexpensive

Unlike cloud drives (Google Drive, Dropbox) or file-locker services that store files on servers, GhostLink uses **WebRTC DataChannels for peer-to-peer transfers**:

```
[ Sender (Tokyo) ]  <======== Encrypted WebRTC DataChannel ========>  [ Receiver (New York) ]
        |                                                                     |
        +-----> (Signaling Server: ~2 KB handshake for SDP offer/answer) <----+
```

- **Files never pass through or get stored on your server.**
- The server only exchanges lightweight JSON signaling messages (room creation, SDP offer/answer, ICE candidates).
- A free or $4/mo server can easily coordinate thousands of peer transfers simultaneously without bandwidth exhaustion.

---

## Deployment Options

### Option 1: Render.com (Recommended — Free & Easiest)

Render offers a free tier that supports persistent WebSockets and HTTPS.

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "chore: ready for deployment"
   git remote add origin https://github.com/<your-username>/ghostlink.git
   git push -u origin main
   ```

2. **Create Web Service on Render:**
   - Go to [render.com](https://render.com) and click **New + > Web Service**.
   - Connect your GitHub repository.
   - Configure settings:
     - **Name:** `ghostlink`
     - **Environment:** `Node`
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npm start`
     - **Instance Type:** `Free`
   - Click **Create Web Service**.

3. **Render will build the app and give you a public URL:**
   - `https://ghostlink.onrender.com`
   - Anyone in the world can open this link on their phone, laptop, or desktop, enter a 6-character room code, and start transferring files directly!

---

### Option 2: Railway.app (Instant 1-Click)

1. Go to [railway.app](https://railway.app) and click **New Project > Deploy from GitHub repo**.
2. Select your repository.
3. Railway detects `npm run build` and `npm start` automatically.
4. Under **Settings > Networking**, click **Generate Domain**.
5. Your app is live at `https://ghostlink.up.railway.app`.

---

### Option 3: VPS Self-Hosting (DigitalOcean / Hetzner / AWS / Oracle Cloud Free Tier)

If you have a Linux VPS (Ubuntu/Debian), you can run GhostLink with Docker and Caddy for automatic free HTTPS:

1. **Clone and run with Docker Compose:**
   ```bash
   git clone https://github.com/<your-username>/ghostlink.git
   cd ghostlink
   docker compose up -d --build
   ```

2. **Set up Caddy for automatic HTTPS:**
   Install Caddy:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install caddy
   ```

   Edit `/etc/caddy/Caddyfile`:
   ```caddy
   share.yourdomain.com {
       reverse_proxy localhost:3001
   }
   ```
   Reload Caddy:
   ```bash
   sudo systemctl reload caddy
   ```
   Caddy will automatically provision a free Let's Encrypt SSL certificate!

---

### Option 4: Cloudflare Tunnel (Host From Your Own PC — 100% Free, No Public IP Needed)

You can share your local GhostLink server with the entire world without port forwarding using Cloudflare Tunnels:

1. Install Cloudflare `cloudflared`:
   - Windows: `winget install Cloudflare.cloudflared`
   - Linux: `sudo apt install cloudflared`
2. Start your local GhostLink server:
   ```bash
   npm run build
   node packages/server/dist/index.js
   ```
3. Run a quick tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```
4. Cloudflare outputs a free public HTTPS address (e.g. `https://random-words.trycloudflare.com`). Anyone worldwide can open that address and send files!

---

## Ensuring 100% Connectivity: STUN & TURN Configuration

WebRTC connections use STUN to discover public IP addresses. GhostLink includes Google's public STUN servers:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

STUN connects ~85% of peers directly. For the remaining ~15% on strict symmetric NAT cellular networks (e.g. some mobile carriers or corporate firewalls), a TURN relay ensures 100% connection success:

1. Sign up for a free TURN account at [metered.ca/tools/openrelay](https://www.metered.ca/tools/openrelay) (50 GB free relay bandwidth every month).
2. Add your TURN credentials to `packages/client/src/hooks/useWebRTC.ts` under `iceServers`.
