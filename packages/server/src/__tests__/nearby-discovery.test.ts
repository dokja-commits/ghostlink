import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NearbyDiscoveryService } from '../services/nearby-discovery.js';
import type { NearbyDevice } from '@p2p-share/shared';

describe('NearbyDiscoveryService', () => {
  let serviceA: NearbyDiscoveryService;
  let serviceB: NearbyDiscoveryService;

  beforeEach(() => {
    serviceA = new NearbyDiscoveryService({
      deviceId: 'dev-aaa-111',
      deviceName: 'Device Alpha',
      udpPort: 54321,
      port: 3001,
      peerTtlMs: 500,
      broadcastIntervalMs: 200,
    });

    serviceB = new NearbyDiscoveryService({
      deviceId: 'dev-bbb-222',
      deviceName: 'Device Beta',
      udpPort: 54322,
      port: 3002,
      peerTtlMs: 500,
      broadcastIntervalMs: 200,
    });
  });

  afterEach(async () => {
    await serviceA.stop();
    await serviceB.stop();
  });

  it('should initialize with correct default properties and self device info', () => {
    const self = serviceA.getSelfDevice();
    expect(self.id).toBe('dev-aaa-111');
    expect(self.name).toBe('Device Alpha');
    expect(self.protocolVersion).toBe('1.0.0');
    expect(self.port).toBe(3001);
    expect(self.isSelf).toBe(true);
    expect(self.fingerprint).toBeDefined();
    expect(self.platform).toBeDefined();
  });

  it('should register and retrieve peers', () => {
    const peer: NearbyDevice = {
      id: 'dev-peer-999',
      name: 'Phone Pixel',
      deviceType: 'mobile',
      platform: 'android',
      ip: '192.168.1.55',
      port: 3001,
      protocolVersion: '1.0.0',
      lastSeen: Date.now(),
    };

    serviceA.registerPeer(peer);
    expect(serviceA.getDiscoveredPeers()).toHaveLength(1);
    expect(serviceA.getPeer('dev-peer-999')).toBeDefined();
    expect(serviceA.getPeer('dev-peer-999')?.name).toBe('Phone Pixel');
  });

  it('should not register self as a discovered peer', () => {
    const self = serviceA.getSelfDevice();
    serviceA.registerPeer(self);
    expect(serviceA.getDiscoveredPeers()).toHaveLength(0);
  });

  it('should notify listeners when peers change', () => {
    const listener = vi.fn();
    const unsubscribe = serviceA.onPeersChange(listener);

    const peer: NearbyDevice = {
      id: 'dev-peer-123',
      name: 'Laptop Linux',
      deviceType: 'desktop',
      platform: 'linux',
      ip: '192.168.1.77',
      port: 3001,
      protocolVersion: '1.0.0',
      lastSeen: Date.now(),
    };

    serviceA.registerPeer(peer);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'dev-peer-123' })]));

    serviceA.removePeer('dev-peer-123');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    serviceA.registerPeer(peer);
    expect(listener).toHaveBeenCalledTimes(2); // no more calls after unsubscribe
  });

  it('should parse incoming UDP beacons and ignore malformed or self beacons', () => {
    // Valid foreign beacon
    const validBeacon = Buffer.from(
      JSON.stringify({
        proto: 'ghostlink-discovery-v1',
        deviceId: 'dev-incoming-456',
        deviceName: 'iPad Air',
        deviceType: 'tablet',
        platform: 'ios',
        port: 3001,
        version: '1.0.0',
        fingerprint: 'abc',
        timestamp: Date.now(),
      })
    );

    serviceA.handleIncomingUdpMessage(validBeacon, '192.168.1.99');
    expect(serviceA.getDiscoveredPeers()).toHaveLength(1);
    expect(serviceA.getPeer('dev-incoming-456')?.name).toBe('iPad Air');

    // Self beacon (must be ignored)
    const selfBeacon = Buffer.from(
      JSON.stringify({
        proto: 'ghostlink-discovery-v1',
        deviceId: 'dev-aaa-111',
        deviceName: 'Device Alpha',
      })
    );
    serviceA.handleIncomingUdpMessage(selfBeacon, '127.0.0.1');
    expect(serviceA.getDiscoveredPeers()).toHaveLength(1);

    // Malformed packet (must not throw)
    serviceA.handleIncomingUdpMessage(Buffer.from('not-json'), '192.168.1.200');
    expect(serviceA.getDiscoveredPeers()).toHaveLength(1);
  });

  it('should clean up stale peers when peerTtlMs expires', async () => {
    const peer: NearbyDevice = {
      id: 'dev-stale-001',
      name: 'Stale Device',
      deviceType: 'mobile',
      platform: 'android',
      ip: '192.168.1.150',
      port: 3001,
      protocolVersion: '1.0.0',
      lastSeen: Date.now() - 600, // already expired (ttl is 500ms)
    };

    serviceA.registerPeer(peer);
    expect(serviceA.getDiscoveredPeers()).toHaveLength(1);

    // Trigger internal cleanup
    (serviceA as any).cleanupStalePeers();
    expect(serviceA.getDiscoveredPeers()).toHaveLength(0);
  });
});
