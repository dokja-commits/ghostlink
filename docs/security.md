# GhostLink — Security & Privacy Architecture

## 1. Core Security Principles

1. **Explicit Incoming Approval:**
   - No file can be saved to the receiver's device without explicit human approval.
   - Incoming transfer prompts show file name, size, sender device name, IP/origin, and cryptographic fingerprint.

2. **Safe File Naming & Path Traversal Prevention:**
   - Incoming file paths are strictly sanitized. Any directory navigation sequences (`../`, `..\`, absolute root slashes) are stripped.
   - File names are sanitized to prevent shell injection or hidden file overwriting.

3. **End-to-End Encryption (E2EE) for Remote Sharing:**
   - AES-GCM 256-bit encryption.
   - Encryption keys are generated client-side via Web Crypto API.
   - Keys are distributed via URL hash fragments (`#<key>`), which are never transmitted to the signaling server (RFC 3986 specifies URL fragments are not sent in HTTP requests or WebSocket handshakes).

4. **Integrity Verification:**
   - Every file includes a SHA-256 manifest hash generated before or during sending.
   - The receiver recalculates the SHA-256 hash incrementally as chunks arrive.
   - The file is only finalized if the calculated hash matches the expected hash.

5. **Local Network Privacy:**
   - Local device announcements only broadcast the user-configured device name, platform identifier, and local port.
   - No private file paths, MAC addresses, or personal accounts are ever broadcast.
   - User can disable local network announcements in Settings.
