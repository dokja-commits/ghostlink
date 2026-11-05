# GhostLink — Attribution & Open Source Licenses

GhostLink incorporates concepts and architectural lessons from leading open-source file sharing implementations while maintaining its own unified architecture:

1. **LocalSend (MIT License)**
   - Reference for local network discovery concepts, UDP multicast beacon formats, peer approval workflows, and LAN offline transfer architectures.
   - Reference repository: https://github.com/localsend/localsend

2. **PairDrop / Snapdrop (GPLv3 / MIT)**
   - Reference for WebRTC browser-to-browser signaling and WebRTC DataChannel flow control patterns.

3. **P2P Web Share Foundation (MIT License)**
   - Base binary framing protocol (`@p2p-share/shared`), chunk serialization, Socket.IO signaling server foundation, and Web Crypto AES-GCM encryption helpers.

All open-source licenses and copyrights are strictly respected. No proprietary code, trade secrets, or copyrighted assets from Blip or any other commercial entity are used.
