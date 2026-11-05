import { useEffect, useCallback } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket.js';
import { useConnectionStore } from '../stores/connectionStore.js';
import { useTransferStore } from '../stores/transferStore.js';
import { useRoomStore } from '../stores/roomStore.js';
import { useNearbyStore } from '../stores/nearbyStore.js';
import type { NearbyDevice } from '@p2p-share/shared';

// This hook handles global socket events including LAN discovery and remote signaling.
export function useSocket() {
  const { setConnectionState } = useConnectionStore();
  const { setFileMetadata, setTransferPhase, setTransferError } = useTransferStore();
  const { setRoomId, setRoomPhase } = useRoomStore();
  const { setPeers, setSelfDevice, setIncomingTransfer } = useNearbyStore();

  const cleanup = useCallback(() => {
    disconnectSocket();
  }, []);

  useEffect(() => {
    const socket = connectSocket();

    // Nearby Discovery & LAN Transfer events
    socket.on('nearby:peers', (peers: NearbyDevice[]) => {
      setPeers(peers);
    });

    socket.on('nearby:self', (device: NearbyDevice) => {
      setSelfDevice(device);
    });

    socket.on('lan-transfer:incoming', (session: any) => {
      setIncomingTransfer(session);
    });

    socket.on('room-created', (data: { roomId: string; expiresAt: number }) => {
      setRoomId(data.roomId);
      setRoomPhase('waiting');
    });

    socket.on('peer-disconnected', () => {
      setConnectionState('disconnected');
    });

    socket.on('file-metadata', (data: { fileName: string; fileSize: number; fileType: string }) => {
      setFileMetadata(data);
    });

    socket.on('transfer-complete', () => {
      setTransferPhase('complete');
    });

    socket.on('transfer-error', (data: { error: string }) => {
      setTransferError(data.error);
      setTransferPhase('error');
    });

    // Also trigger initial fetch of nearby peers
    useNearbyStore.getState().fetchNearby();

    return cleanup;
  }, []);

  return { cleanup };
}
