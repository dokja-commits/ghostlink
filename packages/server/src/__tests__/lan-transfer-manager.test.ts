import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { LanTransferManager } from '../services/lan-transfer-manager.js';

describe('LanTransferManager', () => {
  let manager: LanTransferManager;

  beforeEach(() => {
    manager = new LanTransferManager();
  });

  it('should create a session in pending state', () => {
    const session = manager.createSession({
      sender: { deviceId: 'dev-1', deviceName: 'Sender', ip: '192.168.1.10' },
      receiver: { deviceId: 'dev-2', deviceName: 'Receiver' },
      files: [
        { id: 'f-1', name: 'photo.jpg', size: 1024, type: 'image/jpeg', sha256Hash: 'hash1' },
      ],
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe('pending');
    expect(session.totalBytes).toBe(1024);
    expect(manager.getSession(session.id)).toBeDefined();
  });

  it('should accept and reject sessions', () => {
    const s1 = manager.createSession({
      sender: { deviceId: 'dev-1', deviceName: 'Sender', ip: '192.168.1.10' },
      receiver: { deviceId: 'dev-2', deviceName: 'Receiver' },
      files: [{ id: 'f-1', name: 'a.txt', size: 10, type: 'text/plain', sha256Hash: '' }],
    });

    const accepted = manager.respondSession(s1.id, true);
    expect(accepted.status).toBe('accepted');

    const s2 = manager.createSession({
      sender: { deviceId: 'dev-1', deviceName: 'Sender', ip: '192.168.1.10' },
      receiver: { deviceId: 'dev-2', deviceName: 'Receiver' },
      files: [{ id: 'f-2', name: 'b.txt', size: 20, type: 'text/plain', sha256Hash: '' }],
    });

    const rejected = manager.respondSession(s2.id, false, 'User declined');
    expect(rejected.status).toBe('rejected');
    expect(rejected.error).toBe('User declined');
  });

  it('should stream chunks, verify SHA-256, and complete transfer', () => {
    const content = Buffer.from('GhostLink High Speed Local Transfer Test Payload 1234567890');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    const session = manager.createSession({
      sender: { deviceId: 'dev-1', deviceName: 'Sender', ip: '192.168.1.10' },
      receiver: { deviceId: 'dev-2', deviceName: 'Receiver' },
      files: [{ id: 'f-1', name: 'test.dat', size: content.length, type: 'application/octet-stream', sha256Hash: hash }],
    });

    manager.respondSession(session.id, true);

    // Split content into two chunks
    const chunk1 = content.subarray(0, 20);
    const chunk2 = content.subarray(20);

    const r1 = manager.appendChunk(session.id, 'f-1', 0, chunk1);
    expect(r1.bytesReceived).toBe(20);
    expect(r1.fileComplete).toBe(false);

    const r2 = manager.appendChunk(session.id, 'f-1', 1, chunk2);
    expect(r2.bytesReceived).toBe(content.length);
    expect(r2.fileComplete).toBe(true);

    const finalRes = manager.finalizeFile(session.id, 'f-1');
    expect(finalRes.verified).toBe(true);

    const updatedSession = manager.getSession(session.id);
    expect(updatedSession?.status).toBe('completed');

    const buffer = manager.getFileBuffer(session.id, 'f-1');
    expect(buffer).toBeDefined();
    expect(buffer?.toString('utf8')).toBe(content.toString('utf8'));
  });

  it('should fail verification if file content does not match expected hash', () => {
    const content = Buffer.from('Original content');
    const wrongHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const session = manager.createSession({
      sender: { deviceId: 'dev-1', deviceName: 'Sender', ip: '192.168.1.10' },
      receiver: { deviceId: 'dev-2', deviceName: 'Receiver' },
      files: [{ id: 'f-bad', name: 'bad.dat', size: content.length, type: 'text/plain', sha256Hash: wrongHash }],
    });

    manager.respondSession(session.id, true);
    manager.appendChunk(session.id, 'f-bad', 0, content);

    const res = manager.finalizeFile(session.id, 'f-bad');
    expect(res.verified).toBe(false);

    const updatedSession = manager.getSession(session.id);
    expect(updatedSession?.status).toBe('failed');
    expect(updatedSession?.error).toContain('SHA-256 verification failed');
  });

  it('should handle transfer cancellation cleanly', () => {
    const session = manager.createSession({
      sender: { deviceId: 'dev-1', deviceName: 'Sender', ip: '192.168.1.10' },
      receiver: { deviceId: 'dev-2', deviceName: 'Receiver' },
      files: [{ id: 'f-1', name: 'cancel.txt', size: 100, type: 'text/plain', sha256Hash: '' }],
    });

    manager.cancelSession(session.id, 'Receiver aborted');
    expect(manager.getSession(session.id)?.status).toBe('cancelled');
    expect(manager.getSession(session.id)?.error).toBe('Receiver aborted');
  });
});
