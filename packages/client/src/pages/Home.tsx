import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Wifi,
  Globe2,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useNearbyStore } from '../stores/nearbyStore.js';
import { useHistoryStore } from '../stores/historyStore.js';
import { PlatformIcon } from '../components/md3/PlatformIcon.js';
import { formatFileSize } from '@p2p-share/shared';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { selfDevice, peers, isScanning, scanSubnet, sendFilesToPeer } = useNearbyStore();
  const { rawEntries } = useHistoryStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSendToNearbyPeer = async (peer: any) => {
    if (selectedFiles.length === 0) {
      fileInputRef.current?.click();
      return;
    }
    await sendFilesToPeer(peer, selectedFiles);
    navigate('/transfers');
  };

  const recentTransfers = rawEntries.slice(0, 3);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Quick Send Hero Card (Material 3 Elevated Container) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-4">
            <UploadCloud className="w-3.5 h-3.5" /> Quick Share
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Share files with nearby devices or across the globe.
          </h2>
          <p className="text-teal-100 text-sm sm:text-base mb-6 leading-relaxed">
            GhostLink automatically detects local devices over Wi-Fi without internet access, and securely connects across networks using WebRTC.
          </p>

          {/* Selected Files Badge or File Picker Action */}
          {selectedFiles.length > 0 ? (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-teal-200">
                  {selectedFiles.length} file(s) selected ({formatFileSize(selectedFiles.reduce((s, f) => s + f.size, 0))})
                </span>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-white/80 hover:text-white underline"
                >
                  Clear
                </button>
              </div>
              <div className="text-sm font-medium truncate">
                {selectedFiles.map((f) => f.name).join(', ')}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-2xl font-semibold bg-white text-teal-900 shadow-md hover:bg-teal-50 hover:shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              {selectedFiles.length > 0 ? 'Change Selected Files' : 'Select Files to Send'}
            </button>
            <button
              onClick={() => navigate('/anywhere')}
              className="px-5 py-3 rounded-2xl font-medium bg-teal-800/60 hover:bg-teal-800/80 text-white border border-teal-500/30 transition-all flex items-center gap-2 text-sm"
            >
              <Globe2 className="w-4 h-4" />
              Remote Sharing
            </button>
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-12 top-6 w-32 h-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
      </div>

      {/* Grid: Nearby Devices & Remote Sharing Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Nearby Devices Section (2 Columns) */}
        <div className="md:col-span-2 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base">Nearby Devices</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Devices discovered on your local network
                </p>
              </div>
            </div>
            <button
              onClick={() => scanSubnet()}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5 text-stone-600 dark:text-stone-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan LAN'}
            </button>
          </div>

          {peers.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 mx-auto flex items-center justify-center mb-3">
                <Wifi className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                No nearby devices discovered yet
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                Open GhostLink on another phone, tablet, or laptop on the same Wi-Fi. It will appear here automatically.
              </p>
              <button
                onClick={() => navigate('/nearby')}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                Open Nearby Radar & Scanner <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {peers.map((peer) => (
                <div
                  key={peer.id}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 hover:border-teal-500/50 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                      <PlatformIcon platform={peer.platform} deviceType={peer.deviceType} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate">{peer.name}</h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                        {peer.ip}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendToNearbyPeer(peer)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-colors shrink-0"
                  >
                    Send
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remote Sharing Quick Option (1 Column) */}
        <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mb-4">
              <Globe2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1">Anywhere Sharing</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
              Connect to any device across mobile data or remote networks using a secure 6-character code.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate('/anywhere')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-2"
            >
              Enter Pairing Code
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transfers Summary */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base">Recent Transfers</h3>
          </div>
          <button
            onClick={() => navigate('/transfers')}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
          >
            View All
          </button>
        </div>

        {recentTransfers.length === 0 ? (
          <p className="text-xs text-stone-500 py-3 text-center">
            No transfers recorded yet. Send or receive a file to see it here.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {recentTransfers.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-stone-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-xs sm:text-sm truncate max-w-xs sm:max-w-md">
                      {item.fileName}
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-2">
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>•</span>
                      <span className="capitalize">{item.role}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default Home;
