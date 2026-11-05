# GhostLink — Testing Strategy & Verification Procedures

## 1. Automated Test Suites

GhostLink maintains test suites across all packages with Vitest:
- **`@p2p-share/shared`**:
  - `protocol-io.test.ts`: Binary framing serialization, header boundaries, deserialization, corrupted payloads, CRC/length mismatches.
- **`@p2p-share/server`**:
  - `room-manager.test.ts`: Room creation, room capacity, peer tracking, TTL expiration, cleanup.
  - `signaling.test.ts`: Offer/answer routing, ICE candidate routing, error cases, disconnections.
- **`@p2p-share/client`**:
  - `file-chunker.test.ts`: Chunking algorithm, offsets, empty files, boundary chunks.
  - `sha256.test.ts`: Streaming hash calculation, zero-length files, multi-chunk hashing.
  - `encryption.test.ts`: AES-GCM key generation, encryption, decryption, authentication tag validation.
  - `checkpoint-store.test.ts`: IndexedDB resume checkpoints, chunk persistence, state restoration.
  - `history-store.test.ts`: Transfer history indexing, sorting, retrieval, deletion.
  - `stores.test.ts`: Zustand store state transitions, speed calculations (EMA), ETA logic, filter actions.
  - `useWebRTC.test.ts`: WebRTC peer connection configuration, STUN server setup, data channel creation.
  - `useFileTransfer.test.ts`: File transfer lifecycle, protocol messages, resume handshakes.

---

## 2. Integration & Physical Device Test Procedures

### Test 1: LAN Device Discovery (Two devices on same Wi-Fi / Hotspot)
1. Device A runs GhostLink on port 3001.
2. Device B opens GhostLink or runs the application.
3. Verify Device B appears in Device A's "Nearby" tab within 3 seconds.
4. Verify device name, platform icon, and IP address match.
5. Close Device B; verify Device A removes Device B from discovered list after 10 seconds.

### Test 2: LAN Direct File Transfer
1. Device A selects a test file (e.g., 5 MB image or 50 MB video).
2. Device A clicks Device B in Nearby tab to send.
3. Device B displays an incoming transfer prompt with file name and size.
4. Device B clicks "Accept".
5. Observe live transfer progress bar, speed in MB/s, and countdown ETA.
6. Verify file downloads on Device B, and SHA-256 integrity verification completes with success status.

### Test 3: Offline Transfer (Hotspot without Internet)
1. Turn off cellular data and disconnect internet router from WAN.
2. Connect Device A and Device B to a local Wi-Fi router or phone hotspot with no external internet connection.
3. Execute Test 1 and Test 2.
4. Verify transfer completes without any cloud dependency.

### Test 4: Remote Transfer (Different Networks)
1. Device A is on Home Wi-Fi; Device B is on Mobile Data / 4G / 5G.
2. Device A opens "Anywhere", creates a room, and shares the 6-character pairing code or link.
3. Device B enters the code in "Anywhere".
4. Devices establish a WebRTC DataChannel connection.
5. Transfer file; verify decryption and SHA-256 match.
