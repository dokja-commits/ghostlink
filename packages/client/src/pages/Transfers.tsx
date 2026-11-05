import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  FileText,
  Upload,
  Download,
  ShieldCheck,
  XCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useHistoryStore } from '../stores/historyStore.js';
import { useTransferStore } from '../stores/transferStore.js';
import { formatFileSize } from '@p2p-share/shared';

export const Transfers: React.FC = () => {
  const { rawEntries, loadEntries, removeEntry, clearAll } = useHistoryStore();
  const {
    fileName,
    fileSize,
    progressPercent,
    currentSpeedBps,
    etaMs,
    transferPhase,
    chunksSent,
    totalChunks,
    reset: resetActiveTransfer,
  } = useTransferStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const hasActiveTransfer = transferPhase === 'transferring' || transferPhase === 'verifying' || transferPhase === 'hashing';

  const filteredEntries = useMemo(() => {
    return rawEntries.filter((entry) => {
      if (activeFilter === 'completed') return entry.status === 'completed';
      if (activeFilter === 'failed') return entry.status === 'error' || entry.status === 'cancelled' || entry.status === 'interrupted';
      return true;
    });
  }, [rawEntries, activeFilter]);

  const formatSpeed = (bps: number) => {
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatEta = (ms: number) => {
    if (!ms || ms <= 0) return 'Estimating...';
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transfers</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Monitor active streaming progress and past transfer history.
          </p>
        </div>

        {rawEntries.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    clearAll();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white"
                >
                  Confirm Clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Transfer Card (if currently running) */}
      {hasActiveTransfer && (
        <div className="rounded-3xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 p-6 shadow-md animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Upload className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                  {transferPhase}
                </span>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 truncate max-w-sm sm:max-w-md">
                  {fileName || 'Transferring files...'}
                </h3>
              </div>
            </div>
            <button
              onClick={() => resetActiveTransfer()}
              className="text-stone-400 hover:text-rose-600 p-1 rounded-full transition-colors"
              title="Cancel Transfer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-teal-200/50 dark:bg-teal-900/60 overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-mono text-stone-600 dark:text-stone-400">
              <span>{progressPercent}% Complete ({chunksSent} / {totalChunks} chunks)</span>
              <span>{fileSize ? formatFileSize(fileSize) : ''}</span>
            </div>
          </div>

          {/* Speed & ETA stats */}
          <div className="flex items-center justify-between pt-2 border-t border-teal-200/60 dark:border-teal-800/60 text-xs">
            <div className="flex items-center gap-4">
              <span>Speed: <strong className="font-semibold text-stone-900 dark:text-stone-100">{formatSpeed(currentSpeedBps)}</strong></span>
              <span>ETA: <strong className="font-semibold text-stone-900 dark:text-stone-100">{formatEta(etaMs)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Verifying SHA-256</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs (Material 3 Filter Chips) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeFilter === 'all'
              ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          All Transfers ({rawEntries.length})
        </button>
        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeFilter === 'completed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setActiveFilter('failed')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeFilter === 'failed'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          Failed / Cancelled
        </button>
      </div>

      {/* Transfers List */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
        {filteredEntries.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              No transfers in this view
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Start a transfer in Nearby or Anywhere to see history recorded here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {filteredEntries.map((entry) => {
              const dateStr = new Date(entry.startedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={entry.id} className="py-4 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        entry.role === 'sender'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                      }`}
                    >
                      {entry.role === 'sender' ? (
                        <Upload className="w-5 h-5" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate max-w-xs sm:max-w-md">
                        {entry.fileName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        <span className="font-mono">{formatFileSize(entry.fileSize)}</span>
                        <span>•</span>
                        <span className="capitalize">{entry.role}</span>
                        <span>•</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {entry.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {entry.status}
                      </span>
                    )}

                    <button
                      onClick={() => entry.id && removeEntry(entry.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default Transfers;
