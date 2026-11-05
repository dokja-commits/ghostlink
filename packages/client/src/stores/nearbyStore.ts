import { create } from 'zustand';
import type { NearbyDevice } from '@p2p-share/shared';
import { calculateSha256 } from '../services/sha256.js';
import { useTransferStore } from './transferStore.js';
import { useHistoryStore } from './historyStore.js';

export interface LanTransferManifest {
  id: string;
  name: string;
  size: number;
  type: string;
  sha256Hash: string;
}

export interface LanTransferSessionData {
  id: string;
  sender: {
    deviceId: string;
    deviceName: string;
    ip: string;
  };
  receiver: {
    deviceId: string;
    deviceName: string;
  };
  files: LanTransferManifest[];
  status: 'pending' | 'accepted' | 'rejected' | 'transferring' | 'verifying' | 'completed' | 'failed' | 'cancelled';
  bytesTransferred: number;
  totalBytes: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface NearbyState {
  selfDevice: NearbyDevice | null;
  peers: NearbyDevice[];
  isScanning: boolean;
  incomingTransfer: LanTransferSessionData | null;
  activeLanTransfer: LanTransferSessionData | null;

  setSelfDevice: (device: NearbyDevice) => void;
  setPeers: (peers: NearbyDevice[]) => void;
  fetchNearby: () => Promise<void>;
  scanSubnet: () => Promise<void>;
  setIncomingTransfer: (session: LanTransferSessionData | null) => void;
  respondIncomingTransfer: (sessionId: string, accept: boolean) => Promise<void>;
  sendFilesToPeer: (peer: NearbyDevice, files: File[]) => Promise<void>;
}

function getServerUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

export const useNearbyStore = create<NearbyState>((set, get) => ({
  selfDevice: null,
  peers: [],
  isScanning: false,
  incomingTransfer: null,
  activeLanTransfer: null,

  setSelfDevice: (device) => set({ selfDevice: device }),
  setPeers: (peers) => set({ peers }),

  fetchNearby: async () => {
    try {
      const res = await fetch(`${getServerUrl()}/api/ghostlink/nearby`);
      if (res.ok) {
        const data = await res.json();
        set({ selfDevice: data.self, peers: data.peers });
      }
    } catch (err) {
      console.warn('[NearbyStore] fetchNearby failed:', err);
    }
  },

  scanSubnet: async () => {
    set({ isScanning: true });
    try {
      const res = await fetch(`${getServerUrl()}/api/ghostlink/scan`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.peers) {
          set({ peers: data.peers });
        }
      }
    } catch (err) {
      console.warn('[NearbyStore] scanSubnet failed:', err);
    } finally {
      set({ isScanning: false });
    }
  },

  setIncomingTransfer: (session) => set({ incomingTransfer: session }),

  respondIncomingTransfer: async (sessionId: string, accept: boolean) => {
    try {
      const res = await fetch(`${getServerUrl()}/api/ghostlink/transfer/${sessionId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) {
        const data = await res.json();
        if (accept) {
          set({ activeLanTransfer: data.session, incomingTransfer: null });
        } else {
          set({ incomingTransfer: null });
        }
      }
    } catch (err) {
      console.error('[NearbyStore] respondIncomingTransfer failed:', err);
    }
  },

  sendFilesToPeer: async (peer: NearbyDevice, files: File[]) => {
    const transferStore = useTransferStore.getState();
    const historyStore = useHistoryStore.getState();
    transferStore.reset();
    transferStore.setTransferPhase('hashing');

    const peerBaseUrl = `http://${peer.ip}:${peer.port || 3001}`;
    const self = get().selfDevice;

    try {
      // 1. Calculate hashes and build manifests
      const fileManifests: LanTransferManifest[] = [];
      for (const file of files) {
        const hash = await calculateSha256(file);
        fileManifests.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          sha256Hash: hash,
        });
      }

      transferStore.setFileMetadata({
        fileName: files[0].name,
        fileSize: files[0].size,
        fileType: files[0].type,
      });
      transferStore.setSha256Hash(fileManifests[0].sha256Hash);
      transferStore.setTransferPhase('meta');

      // 2. Prepare transfer with target peer
      const prepRes = await fetch(`${peerBaseUrl}/api/ghostlink/transfer/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: {
            deviceId: self?.id || 'client-browser',
            deviceName: self?.name || 'GhostLink Web Client',
            ip: 'local',
          },
          receiver: {
            deviceId: peer.id,
            deviceName: peer.name,
          },
          files: fileManifests,
        }),
      });

      if (!prepRes.ok) {
        throw new Error('Target peer rejected prepare request or is unreachable');
      }

      const { session } = await prepRes.json();
      set({ activeLanTransfer: session });

      // 3. Poll for peer acceptance (timeout 60s)
      let accepted = false;
      const startTime = Date.now();
      while (Date.now() - startTime < 60000) {
        const pollRes = await fetch(`${peerBaseUrl}/api/ghostlink/transfer/${session.id}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.session.status === 'accepted') {
            accepted = true;
            break;
          }
          if (pollData.session.status === 'rejected') {
            throw new Error('Recipient declined the transfer request');
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!accepted) {
        throw new Error('Transfer acceptance timed out');
      }

      // 4. Stream chunks directly
      transferStore.setTransferPhase('transferring');
      const chunkSize = 32 * 1024; // 32 KB LAN chunk size

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const manifest = fileManifests[i];
        const totalChunks = Math.ceil(file.size / chunkSize) || 1;
        transferStore.setProgress({ totalChunks, chunksSent: 0, progressPercent: 0 });

        let offset = 0;
        let chunkIndex = 0;
        const sendStartTime = Date.now();

        while (offset < file.size) {
          const slice = file.slice(offset, offset + chunkSize);
          const chunkBuf = await slice.arrayBuffer();

          const chunkRes = await fetch(
            `${peerBaseUrl}/api/ghostlink/transfer/${session.id}/chunk?fileId=${manifest.id}&chunkIndex=${chunkIndex}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: chunkBuf,
            }
          );

          if (!chunkRes.ok) {
            throw new Error(`Failed to transmit chunk ${chunkIndex}`);
          }

          offset += chunkBuf.byteLength;
          chunkIndex++;
          transferStore.incrementChunksSent();
          transferStore.updateSpeed(chunkBuf.byteLength, Date.now() - sendStartTime);
        }

        // Finalize file
        transferStore.setTransferPhase('verifying');
        const finRes = await fetch(
          `${peerBaseUrl}/api/ghostlink/transfer/${session.id}/finalize?fileId=${manifest.id}`,
          { method: 'POST' }
        );
        const finData = await finRes.json();
        if (!finData.verified) {
          throw new Error('Integrity verification failed on receiver');
        }
      }

      transferStore.setTransferPhase('complete');

      // Record to persistent transfer history
      await historyStore.addEntry({
        roomId: session.id,
        role: 'sender',
        fileName: files.map((f) => f.name).join(', '),
        fileSize: files.reduce((s, f) => s + f.size, 0),
        fileType: files[0].type || 'application/octet-stream',
        totalChunks: fileManifests.length,
        chunksTransferred: fileManifests.length,
        status: 'completed',
        sha256Hash: fileManifests[0].sha256Hash,
        speedAvgBps: transferStore.averageSpeedBps,
        startedAt: startTime,
        completedAt: Date.now(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'LAN transfer failed';
      transferStore.setTransferError(msg);
      transferStore.setTransferPhase('error');
      console.error('[NearbyStore] sendFilesToPeer error:', err);
    }
  },
}));
