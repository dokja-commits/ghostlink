import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Smartphone,
  FolderDown,
  Palette,
  ShieldCheck,
  Radio,
  Bell,
  HardDrive,
  Info,
  Check,
} from 'lucide-react';
import { useNearbyStore } from '../stores/nearbyStore.js';

export const Settings: React.FC = () => {
  const { selfDevice, setSelfDevice } = useNearbyStore();

  const [deviceName, setDeviceName] = useState(() => {
    return selfDevice?.name || localStorage.getItem('ghostlink-device-name') || 'GhostLink Device';
  });
  const [autoAccept, setAutoAccept] = useState(() => {
    return localStorage.getItem('ghostlink-auto-accept') === 'true';
  });
  const [discoveryEnabled, setDiscoveryEnabled] = useState(() => {
    return localStorage.getItem('ghostlink-discovery-enabled') !== 'false';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ghostlink-device-name', deviceName);
    localStorage.setItem('ghostlink-auto-accept', autoAccept ? 'true' : 'false');
    localStorage.setItem('ghostlink-discovery-enabled', discoveryEnabled ? 'true' : 'false');

    if (selfDevice) {
      setSelfDevice({
        ...selfDevice,
        name: deviceName,
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Configure device identity, transfer approval, and discovery behavior.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Device Identity Card */}
        <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Device Identity</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                How this device appears to nearby peers on the local network.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {selfDevice && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs text-stone-500 font-mono">
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                <span className="block text-[10px] text-stone-400 font-sans uppercase">IP Address</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{selfDevice.ip}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                <span className="block text-[10px] text-stone-400 font-sans uppercase">Platform</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200 capitalize">{selfDevice.platform}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
                <span className="block text-[10px] text-stone-400 font-sans uppercase">UDP Port</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{selfDevice.port || 3001} (53317)</span>
              </div>
            </div>
          )}
        </div>

        {/* Transfer & Discovery Preferences Card */}
        <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-sm divide-y divide-stone-100 dark:divide-stone-800">
          {/* UDP Local Discovery */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-stone-500 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Local Network Discovery (UDP)</h4>
                <p className="text-xs text-stone-500">
                  Broadcast presence beacon on UDP port 53317 for automatic nearby discovery.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={discoveryEnabled}
              onChange={(e) => setDiscoveryEnabled(e.target.checked)}
              className="w-5 h-5 accent-teal-600 rounded cursor-pointer shrink-0"
            />
          </div>

          {/* Incoming Transfer Approval */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-stone-500 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Incoming Transfer Approval</h4>
                <p className="text-xs text-stone-500">
                  Prompt user before accepting any incoming transfer from nearby or remote devices.
                </p>
              </div>
            </div>
            <select
              value={autoAccept ? 'auto' : 'ask'}
              onChange={(e) => setAutoAccept(e.target.value === 'auto')}
              className="px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold focus:outline-none"
            >
              <option value="ask">Ask Every Time (Recommended)</option>
              <option value="auto">Auto-Accept</option>
            </select>
          </div>

          {/* Downloads Directory Info */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FolderDown className="w-5 h-5 text-stone-500 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Download Location</h4>
                <p className="text-xs text-stone-500">
                  Browser default Downloads directory (configured in system settings).
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-stone-400">~/Downloads</span>
          </div>
        </div>

        {/* Security & Architecture Info Card */}
        <div className="rounded-3xl bg-stone-100/60 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 p-6 space-y-3">
          <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold text-sm">
            <Info className="w-4 h-4 text-teal-600" />
            <span>Privacy & Security Commitments</span>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            GhostLink does not require user accounts, cloud database sign-ins, or telemetry trackers. All local transfers operate directly over LAN without touching external networks. Remote transfers use authenticated WebRTC DataChannels encrypted with client-side AES-256-GCM.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Settings saved!
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-2xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md hover:shadow-lg transition-all"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
export default Settings;
