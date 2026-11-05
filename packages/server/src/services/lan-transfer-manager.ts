import crypto from 'crypto';

export interface LanFileManifest {
  id: string;
  name: string;
  size: number;
  type: string;
  sha256Hash: string;
}

export interface LanTransferSession {
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
  files: LanFileManifest[];
  status: 'pending' | 'accepted' | 'rejected' | 'transferring' | 'verifying' | 'completed' | 'failed' | 'cancelled';
  bytesTransferred: number;
  totalBytes: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

interface InProgressFileState {
  manifest: LanFileManifest;
  receivedChunks: Map<number, Buffer>;
  hasher: crypto.Hash;
  bytesReceived: number;
}

export type TransferEventListener = (session: LanTransferSession) => void;

export class LanTransferManager {
  private sessions = new Map<string, LanTransferSession>();
  private fileBuffers = new Map<string, Buffer>(); // transferId:fileId -> Buffer
  private activeFiles = new Map<string, InProgressFileState>(); // transferId:fileId -> InProgressFileState
  private listeners = new Set<TransferEventListener>();

  public createSession(params: {
    sender: { deviceId: string; deviceName: string; ip: string };
    receiver: { deviceId: string; deviceName: string };
    files: LanFileManifest[];
  }): LanTransferSession {
    const id = crypto.randomUUID();
    const totalBytes = params.files.reduce((sum, f) => sum + f.size, 0);

    const session: LanTransferSession = {
      id,
      sender: params.sender,
      receiver: params.receiver,
      files: params.files,
      status: 'pending',
      bytesTransferred: 0,
      totalBytes,
      createdAt: Date.now(),
    };

    this.sessions.set(id, session);
    this.notify(session);
    return session;
  }

  public getSession(id: string): LanTransferSession | undefined {
    return this.sessions.get(id);
  }

  public respondSession(id: string, accept: boolean, reason?: string): LanTransferSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    if (session.status !== 'pending') {
      throw new Error(`Session ${id} is not pending (status: ${session.status})`);
    }

    session.status = accept ? 'accepted' : 'rejected';
    if (!accept && reason) {
      session.error = reason;
    }

    this.notify(session);
    return session;
  }

  public prepareFile(transferId: string, fileId: string): void {
    const session = this.sessions.get(transferId);
    if (!session) throw new Error(`Session ${transferId} not found`);

    const manifest = session.files.find((f) => f.id === fileId);
    if (!manifest) throw new Error(`File ${fileId} not in session ${transferId}`);

    session.status = 'transferring';
    const key = `${transferId}:${fileId}`;
    this.activeFiles.set(key, {
      manifest,
      receivedChunks: new Map(),
      hasher: crypto.createHash('sha256'),
      bytesReceived: 0,
    });
    this.notify(session);
  }

  public appendChunk(transferId: string, fileId: string, chunkIndex: number, chunkData: Buffer): {
    bytesReceived: number;
    fileComplete: boolean;
  } {
    const session = this.sessions.get(transferId);
    if (!session) throw new Error(`Session ${transferId} not found`);

    const key = `${transferId}:${fileId}`;
    let fileState = this.activeFiles.get(key);
    if (!fileState) {
      this.prepareFile(transferId, fileId);
      fileState = this.activeFiles.get(key)!;
    }

    if (!fileState.receivedChunks.has(chunkIndex)) {
      fileState.receivedChunks.set(chunkIndex, chunkData);
      fileState.hasher.update(chunkData);
      fileState.bytesReceived += chunkData.length;
      session.bytesTransferred += chunkData.length;
    }

    const fileComplete = fileState.bytesReceived >= fileState.manifest.size;
    this.notify(session);

    return {
      bytesReceived: fileState.bytesReceived,
      fileComplete,
    };
  }

  public finalizeFile(transferId: string, fileId: string): { verified: boolean; calculatedHash: string } {
    const session = this.sessions.get(transferId);
    if (!session) throw new Error(`Session ${transferId} not found`);

    const key = `${transferId}:${fileId}`;
    const fileState = this.activeFiles.get(key);
    if (!fileState) throw new Error(`File ${fileId} was not started`);

    session.status = 'verifying';
    this.notify(session);

    // Reconstruct buffer in sorted chunk order
    const sortedIndices = Array.from(fileState.receivedChunks.keys()).sort((a, b) => a - b);
    const chunks: Buffer[] = sortedIndices.map((i) => fileState.receivedChunks.get(i)!);
    const completeBuffer = Buffer.concat(chunks);

    const calculatedHash = crypto.createHash('sha256').update(completeBuffer).digest('hex');
    const verified = !fileState.manifest.sha256Hash || calculatedHash.toLowerCase() === fileState.manifest.sha256Hash.toLowerCase();

    if (!verified) {
      session.status = 'failed';
      session.error = `SHA-256 verification failed (expected: ${fileState.manifest.sha256Hash}, got: ${calculatedHash})`;
      this.notify(session);
      return { verified: false, calculatedHash };
    }

    this.fileBuffers.set(key, completeBuffer);
    this.activeFiles.delete(key);

    // Check if all files in session are complete
    const allFilesComplete = session.files.every((f) => this.fileBuffers.has(`${transferId}:${f.id}`));
    if (allFilesComplete) {
      session.status = 'completed';
      session.completedAt = Date.now();
    }

    this.notify(session);
    return { verified: true, calculatedHash };
  }

  public getFileBuffer(transferId: string, fileId: string): Buffer | undefined {
    return this.fileBuffers.get(`${transferId}:${fileId}`);
  }

  public cancelSession(transferId: string, reason = 'Transfer cancelled'): LanTransferSession {
    const session = this.sessions.get(transferId);
    if (!session) throw new Error(`Session ${transferId} not found`);

    session.status = 'cancelled';
    session.error = reason;
    this.notify(session);
    return session;
  }

  public onSessionUpdate(listener: TransferEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(session: LanTransferSession): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...session });
      } catch (err) {
        console.error('[LanTransferManager] listener error:', err);
      }
    }
  }
}
