import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { RoomManager, RoomError } from './services/room-manager.js';
import { NearbyDiscoveryService } from './services/nearby-discovery.js';
import { LanTransferManager } from './services/lan-transfer-manager.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
const nearbyDiscovery = new NearbyDiscoveryService({
  port: PORT,
  deviceName: process.env.DEVICE_NAME,
});
const lanTransferManager = new LanTransferManager();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve compiled Material Design 3 Web UI if dist exists
const clientDistPath = path.resolve(process.cwd(), 'packages/client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    activeRooms: roomManager.getActiveRoomCount(),
    nearbyPeers: nearbyDiscovery.getDiscoveredPeers().length,
  });
});

// GhostLink Nearby Device Endpoints
app.get('/api/ghostlink/device', (_req, res) => {
  res.json(nearbyDiscovery.getSelfDevice());
});

app.get('/api/ghostlink/nearby', (_req, res) => {
  res.json({
    self: nearbyDiscovery.getSelfDevice(),
    peers: nearbyDiscovery.getDiscoveredPeers(),
  });
});

app.post('/api/ghostlink/announce', (req, res) => {
  const peer = req.body;
  if (peer && peer.id) {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    nearbyDiscovery.registerPeer({
      ...peer,
      ip: peer.ip || clientIp.replace('::ffff:', ''),
      lastSeen: Date.now(),
    });
  }
  res.json(nearbyDiscovery.getSelfDevice());
});

app.post('/api/ghostlink/scan', async (_req, res) => {
  try {
    const peers = await nearbyDiscovery.scanSubnet();
    res.json({ peers });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Scan failed' });
  }
});

// GhostLink LAN Direct File Transfer Endpoints
app.post('/api/ghostlink/transfer/prepare', (req, res) => {
  try {
    const session = lanTransferManager.createSession(req.body);
    io.emit('lan-transfer:incoming', session);
    res.json({ session });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Prepare failed' });
  }
});

app.get('/api/ghostlink/transfer/:id', (req, res) => {
  const session = lanTransferManager.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session });
});

app.post('/api/ghostlink/transfer/:id/respond', (req, res) => {
  try {
    const { accept, reason } = req.body;
    const session = lanTransferManager.respondSession(req.params.id, Boolean(accept), reason);
    io.emit('lan-transfer:updated', session);
    res.json({ session });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Response failed' });
  }
});

app.post(
  '/api/ghostlink/transfer/:id/chunk',
  express.raw({ type: 'application/octet-stream', limit: '100mb' }),
  (req, res) => {
    try {
      const transferId = req.params.id;
      const fileId = req.query.fileId as string;
      const chunkIndex = parseInt(req.query.chunkIndex as string, 10);
      const chunkData = req.body as Buffer;

      const result = lanTransferManager.appendChunk(transferId, fileId, chunkIndex, chunkData);
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Chunk failed' });
    }
  },
);

app.post('/api/ghostlink/transfer/:id/finalize', (req, res) => {
  try {
    const transferId = req.params.id;
    const fileId = req.query.fileId as string;
    const result = lanTransferManager.finalizeFile(transferId, fileId);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Finalize failed' });
  }
});

app.get('/api/ghostlink/transfer/:id/download/:fileId', (req, res) => {
  try {
    const { id, fileId } = req.params;
    const session = lanTransferManager.getSession(id);
    const buffer = lanTransferManager.getFileBuffer(id, fileId);
    if (!session || !buffer) {
      return res.status(404).json({ error: 'File not found or transfer not completed' });
    }
    const file = session.files.find((f) => f.id === fileId);
    const fileName = file?.name || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', file?.type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Download failed' });
  }
});

nearbyDiscovery.onPeersChange((peers) => {
  io.emit('nearby:peers', peers);
});

lanTransferManager.onSessionUpdate((session) => {
  io.emit('lan-transfer:updated', session);
});

function emitRoomError(socket: Socket, code: string, message: string): void {
  socket.emit('room-error', { code, message });
}

function validateRoom(socket: Socket, roomId: string): string | null {
  const room = roomManager.getRoom(roomId);
  if (!room) {
    emitRoomError(socket, 'INVALID_ROOM', `Room ${roomId} does not exist`);
    return null;
  }
  if (Date.now() > room.expiresAt) {
    emitRoomError(socket, 'ROOM_EXPIRED', `Room ${roomId} has expired`);
    return null;
  }
  return roomId;
}

function forwardToPeer(
  socket: Socket,
  event: string,
  roomId: string,
  payload: Record<string, unknown>,
): void {
  const otherPeerId = roomManager.getOtherPeerSocketId(roomId, socket.id);
  if (!otherPeerId) {
    emitRoomError(socket, 'NO_PEER', 'No other peer in room');
    return;
  }
  socket.to(otherPeerId).emit(event, payload);
}

io.on('connection', (socket) => {
  console.log(`[connect] socket=${socket.id}`);

  // Emit current discovery state immediately upon client connection
  socket.emit('nearby:peers', nearbyDiscovery.getDiscoveredPeers());
  socket.emit('nearby:self', nearbyDiscovery.getSelfDevice());

  socket.on('nearby:scan', async () => {
    await nearbyDiscovery.scanSubnet();
    socket.emit('nearby:peers', nearbyDiscovery.getDiscoveredPeers());
  });

  socket.on('create-room', () => {
    console.log('[create-room]', socket.id, 'rooms=', [...socket.rooms]);
    try {
      const room = roomManager.createRoom();
      console.log('[CREATE] before join', socket.id, room.id);
      roomManager.joinRoom(room.id, socket.id);
      console.log('[CREATE] after join', socket.id, room.id);
      socket.join(room.id);
      socket.emit('room-created', {
        roomId: room.id,
        expiresAt: room.expiresAt,
      });
      console.log(`[create-room] socket=${socket.id} room=${room.id}`);
    } catch (err) {
      emitRoomError(
        socket,
        'CREATE_FAILED',
        err instanceof Error ? err.message : 'Failed to create room',
      );
    }
  });

  socket.on('join-room', (data: { roomId: string }) => {
    console.log('[join-room]', socket.id, data.roomId, 'rooms=', [...socket.rooms]);
    try {
      const existingRoom = roomManager.findRoomBySocketId(socket.id);
      console.log(
        '[JOIN REQUEST]',
        'socket=',
        socket.id,
        'target=',
        data.roomId,
        'existing=',
        existingRoom?.id ?? 'none',
      );
      const { room, peerCount } = roomManager.joinRoom(data.roomId, socket.id);
      socket.join(room.id);
      socket.emit('room-joined', {
        roomId: room.id,
        peerCount,
      });
      socket.to(room.id).emit('peer-joined', {
        peerId: socket.id,
      });
      console.log(`[join-room] socket=${socket.id} room=${room.id} peers=${peerCount}`);
    } catch (err) {
      if (err instanceof RoomError) {
        emitRoomError(socket, err.code, err.message);
      } else {
        emitRoomError(
          socket,
          'JOIN_FAILED',
          err instanceof Error ? err.message : 'Failed to join room',
        );
      }
    }
  });

  socket.on('leave-room', (data: { roomId: string }) => {
    const { removed, remainingPeers } = roomManager.leaveRoom(data.roomId, socket.id);
    if (removed) {
      socket.leave(data.roomId);
      socket.to(data.roomId).emit('peer-disconnected', {
        peerId: socket.id,
      });
      console.log(
        `[leave-room] socket=${socket.id} room=${data.roomId} remaining=${remainingPeers}`,
      );
    }
  });

  socket.on('offer', (data: { roomId: string; offer: RTCSessionDescriptionInit }) => {
    if (!validateRoom(socket, data.roomId)) return;
    forwardToPeer(socket, 'offer', data.roomId, { offer: data.offer });
    console.log(`[offer] socket=${socket.id} room=${data.roomId}`);
  });

  socket.on('answer', (data: { roomId: string; answer: RTCSessionDescriptionInit }) => {
    if (!validateRoom(socket, data.roomId)) return;
    forwardToPeer(socket, 'answer', data.roomId, { answer: data.answer });
    console.log(`[answer] socket=${socket.id} room=${data.roomId}`);
  });

  socket.on('ice-candidate', (data: { roomId: string; candidate: RTCIceCandidateInit }) => {
    if (!validateRoom(socket, data.roomId)) return;
    forwardToPeer(socket, 'ice-candidate', data.roomId, { candidate: data.candidate });
  });

  socket.on(
    'file-metadata',
    (data: { roomId: string; fileName: string; fileSize: number; fileType: string }) => {
      if (!validateRoom(socket, data.roomId)) return;
      roomManager.setFileMetadata(data.roomId, {
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      });
      forwardToPeer(socket, 'file-metadata', data.roomId, {
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      });
      console.log(`[file-metadata] socket=${socket.id} room=${data.roomId} file=${data.fileName}`);
    },
  );

  socket.on('transfer-complete', (data: { roomId: string; sha256Hash: string }) => {
    if (!validateRoom(socket, data.roomId)) return;
    forwardToPeer(socket, 'transfer-complete', data.roomId, { sha256Hash: data.sha256Hash });
    console.log(`[transfer-complete] socket=${socket.id} room=${data.roomId}`);
  });

  socket.on('transfer-error', (data: { roomId: string; error: string }) => {
    if (!validateRoom(socket, data.roomId)) return;
    forwardToPeer(socket, 'transfer-error', data.roomId, { error: data.error });
    console.log(`[transfer-error] socket=${socket.id} room=${data.roomId} error=${data.error}`);
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] socket=${socket.id}`);
    const room = roomManager.findRoomBySocketId(socket.id);
    if (room) {
      const { removed } = roomManager.leaveRoom(room.id, socket.id);
      if (removed) {
        socket.to(room.id).emit('peer-disconnected', {
          peerId: socket.id,
        });
      }
    }
  });
});

// Fallback to index.html for SPA routing
if (fs.existsSync(clientDistPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

httpServer.listen(PORT, async () => {
  console.log(`[GhostLink Engine] HTTP and signaling server listening on port ${PORT}`);
  try {
    await nearbyDiscovery.start();
    console.log(`[GhostLink Discovery] Active on UDP port ${nearbyDiscovery.udpPort}`);
  } catch (err) {
    console.warn('[GhostLink Discovery] UDP startup notice:', err);
  }
});
