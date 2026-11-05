export interface FileMeta {
  name: string;
  size: number;
  type: string;
  sha256Hash: string;
  totalChunks: number;
  chunkSize: number;
}

export interface BatchFileInfo {
  name: string;
  size: number;
  type: string;
}

export interface TransferProgress {
  chunksSent: number;
  chunksAcknowledged: number;
  chunksReceived: number;
  bytesTransferred: number;
  currentSpeedBps: number;
  averageSpeedBps: number;
  etaMs: number;
  progressPercent: number;
}

export interface PeerInfo {
  id: string;
  connected: boolean;
}

export interface RoomInfo {
  id: string;
  createdAt: number;
  expiresAt: number;
  peerCount: number;
}

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'web' | 'server';
export type PlatformType = 'windows' | 'android' | 'linux' | 'macos' | 'ios' | 'web';

export interface NearbyDevice {
  id: string;
  name: string;
  deviceType: DeviceType;
  platform: PlatformType;
  ip: string;
  port: number;
  protocolVersion: string;
  fingerprint?: string;
  lastSeen: number;
  isSelf?: boolean;
}

export interface DiscoveryBeacon {
  proto: 'ghostlink-discovery-v1';
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  platform: PlatformType;
  port: number;
  ip?: string;
  version: string;
  fingerprint: string;
  timestamp: number;
}

export interface LanTransferPrepareRequest {
  transferId: string;
  sender: {
    deviceId: string;
    deviceName: string;
    ip: string;
  };
  files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    sha256Hash: string;
  }>;
}

export interface LanTransferPrepareResponse {
  transferId: string;
  status: 'pending' | 'accepted' | 'rejected';
  reason?: string;
}
