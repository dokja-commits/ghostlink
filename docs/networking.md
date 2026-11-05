# GhostLink — Networking Specification

## 1. Network Transports Overview

GhostLink uses a dual-transport strategy designed for maximum connectivity in any network condition:

1. **Nearby (Local LAN) Transport**: Direct high-speed connection between devices on the same Wi-Fi, hotspot, or local wired network. 100% offline capable without internet or cloud signaling.
2. **Anywhere (Remote Internet) Transport**: Cross-network connection using WebRTC DataChannels, STUN for NAT traversal, and WebSocket signaling with relay fallback.

---

## 2. Nearby Sharing Protocol

### 2.1 Discovery Protocol (UDP Broadcast / Multicast)
- **Port:** UDP `53317` (LocalSend discovery port compatibility / standard LAN beacon)
- **Multicast Group:** `224.0.0.167`
- **Broadcast Fallback:** Subnet broadcast (e.g., `192.168.1.255`)
- **Beacon Message Schema (JSON):**
  ```json
  {
    "proto": "ghostlink-discovery-v1",
    "deviceId": "d4f8-9a2c-11e0",
    "deviceName": "Harman-PC (Windows)",
    "deviceType": "desktop",
    "platform": "windows",
    "port": 3001,
    "version": "1.0.0",
    "fingerprint": "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    "timestamp": 1730825000000
  }
  ```
- **Heartbeat & Liveness:**
  - Devices broadcast an announcement packet every 3 seconds.
  - An HTTP discovery endpoint `/api/ghostlink/discover` allows direct polling/scanning across local subnet IPs when UDP multicast is blocked by host firewalls or router client isolation.
  - A peer is considered offline if no announcement is received for 10 seconds.

### 2.2 Direct LAN Transfer Protocol
- **Transport:** HTTP/1.1 or HTTP/2 TCP streaming directly between sender and receiver.
- **Workflow:**
  1. **Preparation / Request (`POST /api/ghostlink/prepare`):**
     - Sender submits file metadata (name, size, SHA-256 hash, mime-type).
     - Receiver UI prompts the user with an approval dialog: Accept or Decline.
     - Receiver returns a transfer session token upon user acceptance.
  2. **Streaming Transfer (`POST /api/ghostlink/transfer/:sessionId`):**
     - Sender streams binary chunks with backpressure.
     - Receiver writes chunks to disk or streaming blob, computing SHA-256 hash incrementally.
  3. **Verification & Completion:**
     - Upon receiving all chunks, receiver compares calculated hash with manifest hash.
     - Returns verification status.

---

## 3. Anywhere Sharing Protocol (Remote)

### 3.1 Signaling Protocol
- **Transport:** Socket.IO over WSS / HTTPS.
- **Pairing Codes:** 6-character alphanumeric room code (or secure link containing encryption secret in fragment: `https://ghostlink.app/#/room/XYZ123#<aes-key>`).
- **Events:**
  - `create-room`: Initiates a transfer session.
  - `join-room`: Peer joins with pairing code.
  - `offer` / `answer`: SDP offer/answer exchange.
  - `ice-candidate`: Trickle ICE candidate exchange.

### 3.2 WebRTC DataChannel Transfer
- Direct peer-to-peer data channel (`p2p-transfer`, ordered mode).
- STUN servers: `stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`.
- End-to-end encrypted with AES-256-GCM.
- Streaming SHA-256 hash verification.
