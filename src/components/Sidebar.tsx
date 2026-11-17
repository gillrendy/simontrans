import {
  Building2,
  CalendarDays,
  Cpu,
  FileSpreadsheet,
  FileText,
  Home,
  Radio,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { NavSection, UserRole } from '../types/transmisi';

interface SidebarProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  userRole: UserRole;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  openReportCount: number;
  spreadsheetConnected: boolean;
  dbSpreadsheetId: string;
  onOpenSpreadsheetModal: () => void;
}

export function Sidebar({
  activeNav,
  onSelectNav,
  userRole,
  mobileOpen,
  onCloseMobile,
  openReportCount,
  spreadsheetConnected,
  dbSpreadsheetId,
  onOpenSpreadsheetModal,
}: SidebarProps) {
  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: typeof Home;
    adminOnly?: boolean;
    meta?: string;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'perangkat', label: 'Perangkat', icon: Cpu },
    { id: 'sarana', label: 'Sarana Prasarana', icon: Building2 },
    { id: 'teknisi', label: 'Teknisi', icon: Users },
    { id: 'jadwal', label: 'Jadwal', icon: CalendarDays },
    {
      id: 'laporan',
      label: 'Laporan',
      icon: FileText,
      meta: openReportCount > 0 ? `${openReportCount} aktif` : undefined,
    },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'Admin'
  );

  const sidebarBody = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64 select-none">
      {/* Brand header */}
      <div className="relative overflow-hidden flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white">
        <img
          src="./assets/aistudio/TVRI-logo-baru-1400x788_4f43fbbb.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-white/80 pointer-events-none"
        />
        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              SIMONTRANS TVRI
            </div>
            <div className="text-[11px] font-medium text-slate-700 whitespace-nowrap truncate">
              Sumsel · Transmisi &amp; MUX
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="relative z-10 lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
          aria-label="Tutup navigasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Menu Utama">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectNav(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </span>
              {item.meta && (
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  {item.meta}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Spreadsheet Database Connector */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed truncate">
          Database:{' '}
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {dbSpreadsheetId ? `${dbSpreadsheetId.slice(0, 14)}…` : 'Google Sheets API'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            onOpenSpreadsheetModal();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <FileSpreadsheet
            className={`w-3.5 h-3.5 ${
              spreadsheetConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            }`}
          />
          <span>Atur Spreadsheet API</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block shrink-0">{sidebarBody}</aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}
