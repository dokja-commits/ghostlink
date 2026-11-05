import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe2,
  KeyRound,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  FileText,
  Lock,
} from 'lucide-react';
import { connectSocket } from '../services/socket.js';
import { useRoomStore } from '../stores/roomStore.js';
import { generateEncryptionKey, exportKey } from '../services/encryption.js';
import { setActiveFiles, setEncryptionKey } from '../services/data-channel-registry.js';
import { formatFileSize } from '@p2p-share/shared';

export const Anywhere: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { setRoomPhase } = useRoomStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setErrorMsg(null);
    }
  };

  const handleCreateRemoteRoom = async () => {
    if (selectedFiles.length === 0) {
      fileInputRef.current?.click();
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);
    setRoomPhase('creating');

    try {
      const key = await generateEncryptionKey();
      setEncryptionKey(key);
      const keyBase64 = await exportKey(key);

      const socket = connectSocket();
      if (!socket.connected) socket.connect();

      socket.once('room-created', (data: { roomId: string }) => {
        setActiveFiles(selectedFiles);
        setRoomPhase('waiting');
        navigate(`/room/${data.roomId}#key=${keyBase64}`, {
          state: {
            files: selectedFiles.map((f) => ({
              fileName: f.name,
              fileSize: f.size,
              fileType: f.type,
            })),
          },
        });
      });

      socket.once('room-error', (data: { message: string }) => {
        setErrorMsg(data.message);
        setRoomPhase('idle');
        setIsCreating(false);
      });

      socket.emit('create-room');

      setTimeout(() => {
        if (isCreating) {
          setErrorMsg('Room creation timed out. Check your connection.');
          setRoomPhase('idle');
          setIsCreating(false);
        }
      }, 15000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create room');
      setRoomPhase('idle');
      setIsCreating(false);
    }
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = pairingCodeInput.trim().toUpperCase();
    if (!code) return;

    if (code.startsWith('HTTP://') || code.startsWith('HTTPS://')) {
      try {
        const url = new URL(pairingCodeInput.trim());
        navigate(url.pathname + url.hash);
        return;
      } catch {}
    }

    navigate(`/room/${code}`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Anywhere Sharing</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Transfer files across different networks with end-to-end encryption via WebRTC.
        </p>
      </div>

      {/* Material 3 Segmented Button / Tabs */}
      <div className="inline-flex p-1 rounded-2xl bg-stone-200/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
        <button
          onClick={() => setActiveTab('send')}
          className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'send'
              ? 'bg-white dark:bg-stone-900 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Send Files
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'receive'
              ? 'bg-white dark:bg-stone-900 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Receive Files
        </button>
      </div>

      {/* Tab 1: Send Files */}
      {activeTab === 'send' && (
        <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-teal-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-800/30 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base mb-1">
              {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Select or drop files'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Any file type or size. Data is encrypted on your device and streams directly to the receiver.
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-stone-500">
                <span>Selected Files</span>
                <span>{formatFileSize(selectedFiles.reduce((s, f) => s + f.size, 0))}</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 border border-stone-100 dark:border-stone-800 rounded-2xl p-2 bg-stone-50 dark:bg-stone-800/50">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="py-1.5 px-2 flex justify-between items-center text-xs">
                    <span className="font-medium truncate max-w-xs">{file.name}</span>
                    <span className="text-stone-400">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Lock className="w-3.5 h-3.5 text-teal-600" />
              <span>AES-256-GCM WebRTC Encryption</span>
            </div>
            <button
              onClick={handleCreateRemoteRoom}
              disabled={isCreating}
              className="px-6 py-3 rounded-2xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isCreating ? 'Creating Room...' : 'Create Pairing Room'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Receive Files with Pairing Code */}
      {activeTab === 'receive' && (
        <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-1">Enter Remote Pairing Code</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Enter the 6-character room code or full invite URL provided by the sender.
            </p>
          </div>

          <form onSubmit={handleJoinWithCode} className="space-y-4">
            <div>
              <input
                type="text"
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value)}
                placeholder="e.g. XYZ123 or paste invite URL"
                className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-lg font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={!pairingCodeInput.trim()}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              Connect & Start Receiving
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Transfers connect peer-to-peer using WebRTC DataChannels. The signaling server coordinates connection metadata, but your files never pass through or get stored on any cloud server.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default Anywhere;
