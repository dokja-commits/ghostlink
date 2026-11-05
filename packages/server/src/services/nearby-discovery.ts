import dgram from 'dgram';
import os from 'os';
import crypto from 'crypto';
import type { NearbyDevice, DiscoveryBeacon, DeviceType, PlatformType } from '@p2p-share/shared';

export interface NearbyDiscoveryOptions {
  port?: number;             // HTTP server port (default 3001)
  udpPort?: number;          // UDP discovery port (default 53317)
  multicastAddress?: string; // Multicast group (default 224.0.0.167)
  broadcastIntervalMs?: number; // Broadcast frequency (default 3000ms)
  peerTtlMs?: number;        // Stale peer timeout (default 10000ms)
  deviceName?: string;
  deviceId?: string;
}

export type PeerChangeListener = (peers: NearbyDevice[]) => void;

export class NearbyDiscoveryService {
  private udpSocket: dgram.Socket | null = null;
  private udpBoundPort = 0;
  private broadcastTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private peers = new Map<string, NearbyDevice>();
  private listeners = new Set<PeerChangeListener>();

  public readonly deviceId: string;
  public deviceName: string;
  public readonly deviceType: DeviceType;
  public readonly platform: PlatformType;
  public readonly httpPort: number;
  public readonly udpPort: number;
  public readonly multicastAddress: string;
  public readonly broadcastIntervalMs: number;
  public readonly peerTtlMs: number;
  public readonly fingerprint: string;

  constructor(options: NearbyDiscoveryOptions = {}) {
    this.httpPort = options.port || 3001;
    this.udpPort = options.udpPort || 53317;
    this.multicastAddress = options.multicastAddress || '224.0.0.167';
    this.broadcastIntervalMs = options.broadcastIntervalMs || 3000;
    this.peerTtlMs = options.peerTtlMs || 10000;

    this.deviceId = options.deviceId || crypto.randomUUID();
    this.deviceName = options.deviceName || `${os.hostname()} (${this.getPlatformName()})`;
    this.platform = this.detectPlatform();
    this.deviceType = this.detectDeviceType();
    this.fingerprint = crypto.createHash('sha256').update(this.deviceId).digest('hex').slice(0, 16);
  }

  private detectPlatform(): PlatformType {
    const p = process.platform;
    if (p === 'win32') return 'windows';
    if (p === 'linux') return 'linux';
    if (p === 'darwin') return 'macos';
    if (p === 'android') return 'android';
    return 'web';
  }

  private getPlatformName(): string {
    const p = this.detectPlatform();
    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  private detectDeviceType(): DeviceType {
    return 'desktop';
  }

  public getLocalIpAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
    return addresses.length > 0 ? addresses : ['127.0.0.1'];
  }

  public getBroadcastAddresses(): string[] {
    const interfaces = os.networkInterfaces();
    const broadcasts = new Set<string>();
    broadcasts.add('255.255.255.255');

    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal && net.netmask) {
          try {
            const ipParts = net.address.split('.').map(Number);
            const maskParts = net.netmask.split('.').map(Number);
            const bcastParts = ipParts.map((part, i) => (part | (~maskParts[i] & 255)) >>> 0);
            broadcasts.add(bcastParts.join('.'));
          } catch {
            // fallback
          }
        }
      }
    }
    return Array.from(broadcasts);
  }

  public getSelfDevice(): NearbyDevice {
    const ips = this.getLocalIpAddresses();
    return {
      id: this.deviceId,
      name: this.deviceName,
      deviceType: this.deviceType,
      platform: this.platform,
      ip: ips[0] || '127.0.0.1',
      port: this.httpPort,
      protocolVersion: '1.0.0',
      fingerprint: this.fingerprint,
      lastSeen: Date.now(),
      isSelf: true,
    };
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        this.udpSocket = socket;

        socket.on('error', (err) => {
          console.warn('[NearbyDiscovery] UDP socket error:', err.message);
        });

        socket.on('message', (msg, rinfo) => {
          this.handleIncomingUdpMessage(msg, rinfo.address);
        });

        socket.bind(this.udpPort, () => {
          try {
            socket.setBroadcast(true);
            try {
              socket.addMembership(this.multicastAddress);
            } catch {
              // Multicast membership might fail on some loopback/VPN interfaces; broadcast will still work
            }
            this.udpBoundPort = this.udpPort;
            console.log(`[NearbyDiscovery] Bound to UDP port ${this.udpPort}`);
          } catch (bindErr) {
            console.warn('[NearbyDiscovery] Warning setting broadcast:', bindErr);
          }
          this.initTimers();
          this.sendAnnouncement();
          resolve();
        });

        socket.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
            console.warn(`[NearbyDiscovery] Port ${this.udpPort} in use. Binding to ephemeral port for broadcast.`);
            const fallbackSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.udpSocket = fallbackSocket;
            fallbackSocket.bind(0, () => {
              try {
                fallbackSocket.setBroadcast(true);
                this.udpBoundPort = fallbackSocket.address().port;
              } catch {}
              this.initTimers();
              this.sendAnnouncement();
              resolve();
            });
          }
        });
      } catch (err) {
        console.warn('[NearbyDiscovery] Failed to start UDP socket:', err);
        this.initTimers();
        resolve();
      }
    });
  }

  private initTimers(): void {
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);

    this.broadcastTimer = setInterval(() => {
      this.sendAnnouncement();
    }, this.broadcastIntervalMs);

    this.cleanupTimer = setInterval(() => {
      this.cleanupStalePeers();
    }, Math.floor(this.peerTtlMs / 2));
  }

  public sendAnnouncement(): void {
    if (!this.udpSocket) return;

    const ips = this.getLocalIpAddresses();
    const beacon: DiscoveryBeacon = {
      proto: 'ghostlink-discovery-v1',
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: this.deviceType,
      platform: this.platform,
      port: this.httpPort,
      ip: ips[0] || '127.0.0.1',
      version: '1.0.0',
      fingerprint: this.fingerprint,
      timestamp: Date.now(),
    };

    const message = Buffer.from(JSON.stringify(beacon));

    // Send to multicast group
    try {
      this.udpSocket.send(message, 0, message.length, this.udpPort, this.multicastAddress, () => {});
    } catch {}

    // Send to broadcast addresses
    for (const bcast of this.getBroadcastAddresses()) {
      try {
        this.udpSocket.send(message, 0, message.length, this.udpPort, bcast, () => {});
      } catch {}
    }
  }

  public handleIncomingUdpMessage(msg: Buffer, senderIp: string): void {
    try {
      const data = JSON.parse(msg.toString('utf8'));
      if (data.proto !== 'ghostlink-discovery-v1') return;
      if (data.deviceId === this.deviceId) return; // Ignore self

      this.registerPeer({
        id: data.deviceId,
        name: data.deviceName || 'Unknown Device',
        deviceType: data.deviceType || 'desktop',
        platform: data.platform || 'windows',
        ip: senderIp || data.ip || '127.0.0.1',
        port: data.port || 3001,
        protocolVersion: data.version || '1.0.0',
        fingerprint: data.fingerprint,
        lastSeen: Date.now(),
      });
    } catch {
      // Ignore malformed UDP packet
    }
  }

  public registerPeer(peer: NearbyDevice): void {
    if (peer.id === this.deviceId) return;

    const existing = this.peers.get(peer.id);
    const isNew = !existing;
    this.peers.set(peer.id, {
      ...existing,
      ...peer,
      lastSeen: peer.lastSeen || Date.now(),
    });

    if (isNew) {
      this.notifyListeners();
    }
  }

  public removePeer(peerId: string): void {
    if (this.peers.delete(peerId)) {
      this.notifyListeners();
    }
  }

  private cleanupStalePeers(): void {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > this.peerTtlMs) {
        this.peers.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.notifyListeners();
    }
  }

  public getDiscoveredPeers(): NearbyDevice[] {
    return Array.from(this.peers.values());
  }

  public getPeer(peerId: string): NearbyDevice | undefined {
    return this.peers.get(peerId);
  }

  public onPeersChange(listener: PeerChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getDiscoveredPeers();
    for (const listener of this.listeners) {
      try {
        listener(list);
      } catch (err) {
        console.error('[NearbyDiscovery] Listener error:', err);
      }
    }
  }

  public async scanSubnet(options: { timeoutMs?: number; targetPort?: number } = {}): Promise<NearbyDevice[]> {
    const targetPort = options.targetPort || this.httpPort;
    const timeoutMs = options.timeoutMs || 800;
    const localIps = this.getLocalIpAddresses();
    const discovered: NearbyDevice[] = [];

    for (const localIp of localIps) {
      if (localIp === '127.0.0.1') continue;
      const parts = localIp.split('.').map(Number);
      const subnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
      const selfLastOctet = parts[3];

      // Scan all 254 host addresses in parallel chunks of 32
      const octets = Array.from({ length: 254 }, (_, i) => i + 1).filter(o => o !== selfLastOctet);
      const chunkSize = 32;

      for (let i = 0; i < octets.length; i += chunkSize) {
        const batch = octets.slice(i, i + chunkSize);
        await Promise.all(
          batch.map(async (octet) => {
            const ip = `${subnetPrefix}.${octet}`;
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), timeoutMs);
              const res = await fetch(`http://${ip}:${targetPort}/api/ghostlink/device`, {
                signal: controller.signal,
              });
              clearTimeout(timer);
              if (res.ok) {
                const info = await res.json() as NearbyDevice;
                if (info && info.id && info.id !== this.deviceId) {
                  const peer: NearbyDevice = {
                    ...info,
                    ip,
                    port: targetPort,
                    lastSeen: Date.now(),
                  };
                  this.registerPeer(peer);
                  discovered.push(peer);
                }
              }
            } catch {
              // Host unreachable or port closed, ignore
            }
          })
        );
      }
    }

    return discovered;
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.broadcastTimer) {
        clearInterval(this.broadcastTimer);
        this.broadcastTimer = null;
      }
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
      }
      if (this.udpSocket) {
        try {
          this.udpSocket.close(() => {
            this.udpSocket = null;
            resolve();
          });
          return;
        } catch {
          this.udpSocket = null;
        }
      }
      resolve();
    });
  }
}
