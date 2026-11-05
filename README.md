# GhostLink — Share nearby. Share anywhere.

GhostLink is a cross-platform, unified file-sharing application combining **LocalSend-style Nearby Sharing** (automatic local network discovery and direct LAN streaming without internet access) and **Blip-style Anywhere Sharing** (cross-network remote transfer with short pairing codes, WebRTC DataChannels, and end-to-end encryption) in one Material Design 3 interface.

---

## Key Capabilities

- **Nearby Sharing (LocalSend-style):**
  - Discovers devices on local Wi-Fi or mobile hotspots automatically using UDP multicast / beacon.
  - Streams files directly between devices over LAN at full hardware speed.
  - Operates **100% offline** without internet access or external servers.
  - Requires explicit recipient approval with sender details and fingerprint.

- **Anywhere Sharing (Blip-style):**
  - Transfers files between devices on different networks (e.g. mobile 5G to home Wi-Fi).
  - Quick pairing with 6-character codes, direct links, or QR codes.
  - End-to-end encrypted with AES-256-GCM.
  - Direct P2P via WebRTC DataChannels with STUN NAT traversal.

- **Unified Transfer Experience:**
  - Single Material Design 3 interface for both nearby and remote transfers.
  - Real-time progress, speed (EMA), and remaining time estimates (ETA).
  - Streaming SHA-256 integrity verification before finalizing files.
  - Resumable transfers with persistent checkpoints via IndexedDB.
  - Unified transfer history and configuration.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development mode (local server + client)
npm run dev

# Or build all packages
npm run build

# Run automated test suites
npm test
```

Default development endpoints:
- **Client (Material 3 UI):** `http://localhost:5173`
- **Server (Signaling + LAN Discovery & Streaming):** `http://localhost:3001`
- **LAN Access:** Any phone or computer on the same Wi-Fi can open `http://<your-lan-ip>:5173` (or `3001` in production) to discover and transfer files immediately.

---

## Architecture & Documentation

- [Architecture Guide](docs/architecture.md)
- [Current State Assessment](docs/current-state.md)
- [Networking & Discovery Protocol](docs/networking.md)
- [Testing & Verification](docs/testing.md)
- [Security & Privacy](docs/security.md)
- [Project Roadmap](docs/roadmap.md)
- [Attribution & Licenses](docs/attribution.md)

---

## License

MIT
