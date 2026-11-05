import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  RefreshCw,
  Send,
  Plus,
  ShieldCheck,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { useNearbyStore } from '../stores/nearbyStore.js';
import { PlatformIcon } from '../components/md3/PlatformIcon.js';
import { formatFileSize } from '@p2p-share/shared';

export const Nearby: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPeer, setSelectedPeer] = useState<any>(null);
  const [manualIp, setManualIp] = useState('');
  const [isPinging, setIsPinging] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const { selfDevice, peers, isScanning, scanSubnet, sendFilesToPeer } = useNearbyStore();

  const handleSelectFilesForPeer = (peer: any) => {
    setSelectedPeer(peer);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedPeer) {
      const files = Array.from(e.target.files);
      await sendFilesToPeer(selectedPeer, files);
      navigate('/transfers');
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    setIsPinging(true);
    setManualError(null);

    try {
      const cleanIp = manualIp.trim().replace(/^http:\/\//, '');
      const url = `http://${cleanIp}:3001/api/ghostlink/device`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('Device not responding on port 3001');
      const dev = await res.json();
      useNearbyStore.getState().setPeers([
        ...peers.filter((p) => p.id !== dev.id),
        { ...dev, ip: cleanIp, lastSeen: Date.now() },
      ]);
      setManualIp('');
    } catch (err: unknown) {
      setManualError(err instanceof Error ? err.message : 'Could not reach device at that IP');
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Header and Radar Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Nearby Devices</h2>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Discovered over local Wi-Fi UDP beacon. No internet connection needed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scanSubnet()}
            disabled={isScanning}
            className="px-4 py-2 rounded-2xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-2 text-stone-700 dark:text-stone-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Subnet...' : 'Subnet Scan'}
          </button>
        </div>
      </div>

      {/* Discovered Devices Grid */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Active Peers ({peers.length})
          </span>
          {selfDevice && (
            <span className="text-xs text-stone-400 font-mono">
              Your IP: {selfDevice.ip}
            </span>
          )}
        </div>

        {peers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center mb-4">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="font-bold text-base text-stone-800 dark:text-stone-200 mb-1">
              Listening for local announcements...
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
              When another GhostLink or LocalSend device is opened on your Wi-Fi or mobile hotspot, it will be detected here automatically.
            </p>
            <button
              onClick={() => scanSubnet()}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors"
            >
              Trigger Active Subnet Scan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 hover:border-teal-500/60 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                      <PlatformIcon platform={peer.platform} deviceType={peer.deviceType} className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight text-stone-900 dark:text-stone-100">
                        {peer.name}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                        {peer.ip}:{peer.port || 3001}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                        {peer.platform}
                      </span>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Online" />
                </div>

                <div className="pt-3 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                    <span>Direct HTTP Stream</span>
                  </div>
                  <button
                    onClick={() => handleSelectFilesForPeer(peer)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Files
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual IP Connect / Subnet Probe */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
        <h3 className="font-bold text-base mb-1">Manual IP Connect</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          If your Wi-Fi router isolates UDP multicast, enter the device's IP address directly:
        </p>
        <form onSubmit={handleManualConnect} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            placeholder="e.g. 192.168.1.55"
            className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={isPinging || !manualIp.trim()}
            className="px-6 py-2.5 rounded-2xl text-sm font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isPinging ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Connect to IP
          </button>
        </form>
        {manualError && (
          <p className="text-xs text-rose-500 mt-2 font-medium">{manualError}</p>
        )}
      </div>
    </div>
  );
};
export default Nearby;
