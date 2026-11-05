import React from 'react';
import { useNearbyStore } from '../../stores/nearbyStore.js';
import { FileDown, ShieldCheck, X, Check } from 'lucide-react';
import { formatFileSize } from '@p2p-share/shared';

export const IncomingTransferModal: React.FC = () => {
  const { incomingTransfer, respondIncomingTransfer } = useNearbyStore();

  if (!incomingTransfer) return null;

  const totalSize = incomingTransfer.files.reduce((acc, f) => acc + f.size, 0);

  const handleAccept = async () => {
    await respondIncomingTransfer(incomingTransfer.id, true);
  };

  const handleDecline = async () => {
    await respondIncomingTransfer(incomingTransfer.id, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl p-6 text-stone-900 dark:text-stone-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <FileDown className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Incoming Transfer</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              From <span className="font-semibold text-stone-700 dark:text-stone-200">{incomingTransfer.sender.deviceName}</span> ({incomingTransfer.sender.ip})
            </p>
          </div>
        </div>

        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4 my-4 border border-stone-100 dark:border-stone-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500 dark:text-stone-400">Files ({incomingTransfer.files.length})</span>
            <span className="font-medium">{formatFileSize(totalSize)}</span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {incomingTransfer.files.map((file) => (
              <div key={file.id} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-stone-100 dark:bg-stone-800">
                <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                <span className="text-stone-500">{formatFileSize(file.size)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-2 text-[11px] text-teal-600 dark:text-teal-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Integrity protected with streaming SHA-256 verification</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleDecline}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2.5 rounded-full text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Accept & Download
          </button>
        </div>
      </div>
    </div>
  );
};
