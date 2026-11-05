# GhostLink — Architecture Documentation

## 1. System Vision & Product Architecture

GhostLink is a unified file-sharing application combining **Nearby Sharing** (LocalSend-style automatic discovery and direct LAN streaming without internet access) and **Anywhere Sharing** (Blip-style remote cross-network transfer with pairing codes and WebRTC DataChannels).

Both modes operate through a single unified transfer model, common chunking engine, consistent Material Design 3 UI, and shared persistence store.

```
+-------------------------------------------------------------+
|                     GhostLink UI (MD3)                      |
|       [Home]   [Nearby]   [Anywhere]   [Transfers]  [Settings]|
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|                Transfer Session Manager                     |
|  - Unified State Machine (Idle, Requesting, Transferring,  |
|    Verifying, Complete, Failed, Cancelled)                  |
|  - Speed Calculation (EMA), Progress, ETA                   |
|  - Transfer History & Checkpoint Persistence                |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|                 Transport Selection Layer                   |
|              (Abstract Transport Interface)                 |
+------------------------------+------------------------------+
               |                                              |
               v                                              v
+-------------------------------+   +-------------------------------+
|     Local LAN Transport       |   |   Remote Internet Transport   |
| - UDP Multicast/Broadcast     |   | - WebRTC DataChannels         |
|   Beacon & mDNS Discovery     |   | - WebSocket Signaling Server  |
| - Direct HTTP/TCP Streaming   |   | - STUN/TURN NAT Traversal     |
| - Peer Approval Handshake     |   | - Short Pairing Codes / Links |
| - Fully Offline Capable       |   | - End-to-End Encryption       |
+-------------------------------+   +-------------------------------+
               |                                              |
               +----------------------+-----------------------+
                                      |
                                      v
+-------------------------------------------------------------+
|                Chunking & Integrity Engine                  |
|  - File Chunking (~16 KB / 64 KB binary frames)             |
|  - Sliding-window flow control & Backpressure               |
|  - Streaming SHA-256 Checksum Verification                  |
|  - Resumable Transfer Checkpoints                           |
+-------------------------------------------------------------+
```

---

## 2. Technology Selection Evaluation

Target platforms: **Windows, Linux, Android**.

### Evaluated Stacks:
1. **Flutter with Material 3:**
   - *Pros:* Native UI rendering, existing LocalSend reference is built in Flutter.
   - *Cons:* Flutter SDK and Dart toolchain are completely absent from the host environment. Compiling native Windows, Linux, and Android binaries requires gigabytes of SDK downloads, C++ toolchains, and environment configuration that cannot be cleanly managed without external tools.
2. **Kotlin Multiplatform / Compose Multiplatform:**
   - *Pros:* Strong native integration on Android and JVM desktop.
   - *Cons:* High build complexity, limited desktop ecosystem tooling in headless environments.
3. **Node.js + TypeScript Engine + Material Design 3 Web/PWA Shell (Selected):**
   - *Pros:*
     - The environment natively provides Node.js 26.13 and npm 11.20 with zero installation hurdles.
     - The verified foundation (`@p2p-share/shared`, `@p2p-share/server`, `@p2p-share/client`) provides 204 passing automated tests covering binary framing, WebRTC signaling, chunking, and crypto.
     - **True Cross-Platform Zero-Install Access:** The local Node.js daemon hosts both the Local Discovery engine (UDP multicast on LAN) and the HTTP server. Any device on the local network (Android phone, iPhone, Linux machine, Windows laptop) can discover the host or connect directly in a browser or PWA with full Material Design 3 fidelity.
     - **Offline Capability:** LAN transfers run directly over HTTP streaming on the local Wi-Fi subnet without any cloud or internet dependency.
     - Can be packaged into native desktop wrappers (Electron / Tauri / PWA) or Android WebViews (Capacitor) without duplicating core networking logic.

---

## 3. Core Components

### 3.1 GhostLink Engine (`@ghostlink/server` & Local Services)
- **Local Discovery Service:**
  - Listens on UDP port `53317` (multicast `224.0.0.167` or broadcast subnet).
  - Broadcasts device announcements containing device name, model, platform, port, and fingerprint.
  - Maintains active peer registry with heartbeat timeouts.
- **Local Transfer Server:**
  - Express/HTTP endpoint `/api/ghostlink/transfer` for direct LAN file upload/download streaming.
  - Endpoints for transfer preparation and peer authorization (`/api/ghostlink/prepare`, `/api/ghostlink/accept`, `/api/ghostlink/reject`).
- **Remote Signaling Service:**
  - Socket.IO signaling server managing room pairing codes, SDP offer/answer exchange, and ICE candidates for cross-network WebRTC transfers.

### 3.2 Client Core & Material 3 Interface (`@ghostlink/client`)
- **Navigation Shell:** Material Design 3 top app bar, navigation drawer / bottom bar for Home, Nearby, Anywhere, Transfers, Settings.
- **Unified Transfer Hook (`useUnifiedTransfer`):** Exposes a unified API for sending and receiving regardless of whether transport is LAN or Remote.
- **Storage Layer:** IndexedDB for history log and chunk resumption checkpoints.
- **Crypto & Integrity:** Web Crypto API for SHA-256 file hashing and AES-GCM encryption.

---

## 4. Transfer Protocol Specification

All transfers share the common binary frame format defined in `@p2p-share/shared`:

```
+---------------+---------------+---------------+-------------------+
|  Magic (2B)   |  Version (1B) | MsgType (1B)  | Payload Len (4B)  |
|  0x50 0x32    |     0x01      |  (0x00..0x08) |    uint32 Big-End |
+---------------+---------------+---------------+-------------------+
|                           Payload Data                            |
|             (FILE_META, CHUNK, CHUNK_ACK, RESUME, etc.)           |
+-------------------------------------------------------------------+
```

Message Types:
- `0x00`: `FILE_META` (file ID, name, size, type, chunk size, total chunks, sha256)
- `0x01`: `FILE_META_ACK`
- `0x02`: `CHUNK` (chunk index, data bytes)
- `0x03`: `CHUNK_ACK` (acknowledged chunk index)
- `0x04`: `TRANSFER_COMPLETE`
- `0x05`: `ERROR`
- `0x06`: `CANCEL`
- `0x07`: `RESUME`
- `0x08`: `RESUME_ACK`
