import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Wifi,
  Globe2,
  ArrowUpDown,
  Settings,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { useNearbyStore } from '../../stores/nearbyStore.js';
import { IncomingTransferModal } from './IncomingTransferModal.js';

interface NavigationShellProps {
  children: React.ReactNode;
}

export const NavigationShell: React.FC<NavigationShellProps> = ({ children }) => {
  const { selfDevice, peers } = useNearbyStore();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ghostlink-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ghostlink-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ghostlink-theme', 'light');
    }
  }, [isDark]);

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/nearby', label: 'Nearby', icon: Wifi, badge: peers.length > 0 ? peers.length : undefined },
    { to: '/anywhere', label: 'Anywhere', icon: Globe2 },
    { to: '/transfers', label: 'Transfers', icon: ArrowUpDown },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-200">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800/80 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-teal-600/20">
            GL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight">GhostLink</h1>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                MD3 Unified
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Share nearby. Share anywhere.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Network Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-stone-600 dark:text-stone-300">
              {selfDevice ? `${selfDevice.name} (${selfDevice.ip})` : 'LAN Online'}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar Navigation on Desktop + Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto pb-20 md:pb-6">
        {/* Desktop Navigation Rail */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-2xl font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-teal-600/15 dark:bg-teal-400/20 text-teal-800 dark:text-teal-300 font-semibold shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-600 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="pt-6 mt-auto">
            <div className="p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Offline Direct LAN & E2EE Remote P2P</span>
            </div>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (MD3 style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-xs font-medium transition-all ${
                  isActive
                    ? 'text-teal-700 dark:text-teal-300 font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`
              }
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full text-[10px] bg-teal-600 text-white flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Global Incoming Transfer Modal */}
      <IncomingTransferModal />
    </div>
  );
};
