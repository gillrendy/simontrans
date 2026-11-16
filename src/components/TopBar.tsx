import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
import {
  AppNotification,
  NavSection,
  UserAccount,
} from '../types/transmisi';
import { TechAvatar } from './TechAvatar';

interface TopBarProps {
  activeNav: NavSection;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onSelectNotification: (notif: AppNotification) => void;
  currentUser: UserAccount;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  onOpenMobileNav: () => void;
}

const NAV_TITLES: Record<NavSection, string> = {
  home: 'Monitoring Peta Satelit & Ringkasan Transmisi',
  perangkat: 'Inventaris & Kondisi Perangkat',
  teknisi: 'Profil Teknisi Satuan Transmisi',
  jadwal: 'Jadwal Tugas Teknisi Transmisi',
  laporan: 'Tiket & Riwayat Laporan Pemeliharaan',
  admin: 'Panel Administrator & Koordinat Pemancar',
};

export function TopBar({
  activeNav,
  darkMode,
  onToggleDarkMode,
  notifications,
  onMarkAllRead,
  onSelectNotification,
  currentUser,
  onOpenChangePassword,
  onLogout,
  onOpenMobileNav,
}: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-30">
      {/* Left: Mobile drawer trigger + contextual breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">
            SIMONTRANS TVRI Sumsel · Transmisi &amp; Multipleksing
          </div>
          <h1 className="text-sm lg:text-base font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
            {NAV_TITLES[activeNav]}
          </h1>
        </div>
      </div>

      {/* Right: Dark/Light Switch, Notifications, Profile Dropdown */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dark / Light Mode Switch */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-medium whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label={darkMode ? 'Aktifkan Light Mode' : 'Aktifkan Dark Mode'}
          title={darkMode ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            className="relative h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Notifikasi pembaruan laporan"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Pembaruan Status Laporan
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    Belum ada pembaruan laporan.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => {
                        onSelectNotification(notif);
                        setNotifOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        !notif.read ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {notif.title}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                          {notif.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="mt-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        {notif.timestamp}
                        {!notif.read && ' · Baru'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            className="h-10 pl-2 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <TechAvatar
              name={currentUser.fullName}
              avatarKey={currentUser.avatarKey}
              avatarDataUrl={currentUser.avatarDataUrl}
              sizeClass="w-7 h-7"
            />
            <div className="hidden md:block text-left leading-tight">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap max-w-[140px] truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {currentUser.role} · {currentUser.region}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  @{currentUser.username} · {currentUser.role}
                </div>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenChangePassword();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  <span>Ubah Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
