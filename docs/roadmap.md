# GhostLink — Roadmap & Milestone Plan

## Milestone Tracking

| Milestone | Status | Description |
|---|---|---|
| **Milestone 1 — Foundation** | **DONE** | Inspect workspace, choose stack, establish unified transfer model, verify build and automated test suites (204 tests passing). |
| **Milestone 2 — Nearby Discovery** | **DONE** | Local device discovery via UDP broadcast/multicast (port 53317, group 224.0.0.167) and local subnet scanner; device announcements, presence heartbeat, disappearance detection. Tested live. |
| **Milestone 3 — Nearby File Transfer** | **DONE** | Direct LAN streaming transfer with peer approval modal, live progress/speed/ETA, SHA-256 verification, and 100% offline support. Tested live. |
| **Milestone 4 — Material 3 Integration** | **DONE** | Complete Material Design 3 adaptive UI with Home, Nearby, Anywhere, Transfers, and Settings views. Responsive navigation rail and bottom bar. |
| **Milestone 5 — Remote Pairing** | In Progress | WebRTC signaling with short 6-character pairing codes, QR codes, and expiring sessions. |
| **Milestone 6 — Remote File Transfer** | In Progress | End-to-end encrypted transfer over WebRTC DataChannels across different networks with STUN/TURN traversal. |
| **Milestone 7 — Reliability** | Next | Chunked resume from IndexedDB checkpoints, SHA-256 hash validation, sliding-window flow control. |
| **Milestone 8 — Production Readiness** | Next | Cross-platform optimizations, packaging scripts, security hardening. |
