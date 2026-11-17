import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FolderPlus,
  LogOut,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  extractSpreadsheetId,
  getCurrentIndonesianMonthName,
  getSheetsApiBaseUrl,
  SHEET_TABS,
} from '../services/googleSheetsDb';
import { ConfirmModal } from './ConfirmModal';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SpreadsheetConnectModalProps {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  spreadsheetTitle: string | null;
  googleEmail: string | null;
  hasGoogleToken: boolean;
  dbSpreadsheetId: string;
  scheduleSpreadsheetId: string;
  activeScheduleSheetTitle: string | null;
  syncBusy: boolean;
  syncError: string | null;
  onSignInGoogle: () => Promise<void>;
  onSignOutGoogle: () => Promise<void>;
  onSaveSpreadsheetIds: (dbId: string, scheduleId: string) => Promise<void>;
  onCreateUnifiedSpreadsheet: () => Promise<void>;
  onPushLocalToSpreadsheet: () => Promise<void>;
  onRefreshFromSpreadsheet: () => Promise<void>;
}

export function SpreadsheetConnectModal({
  open,
  onClose,
  connected,
  spreadsheetTitle,
  googleEmail,
  hasGoogleToken,
  dbSpreadsheetId,
  scheduleSpreadsheetId,
  activeScheduleSheetTitle,
  syncBusy,
  syncError,
  onSignInGoogle,
  onSignOutGoogle,
  onSaveSpreadsheetIds,
  onCreateUnifiedSpreadsheet,
  onPushLocalToSpreadsheet,
  onRefreshFromSpreadsheet,
}: SpreadsheetConnectModalProps) {
  const [draftDbId, setDraftDbId] = useState(dbSpreadsheetId);
  const [draftScheduleId, setDraftScheduleId] = useState(scheduleSpreadsheetId);
  const [confirmAction, setConfirmAction] = useState<'create' | 'push' | null>(
    null
  );
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftDbId(dbSpreadsheetId);
      setDraftScheduleId(scheduleSpreadsheetId);
      setLocalMsg(null);
    }
  }, [open, dbSpreadsheetId, scheduleSpreadsheetId]);

  if (!open) return null;

  const currentMonth = getCurrentIndonesianMonthName();
  const cleanDbId = extractSpreadsheetId(draftDbId);
  const cleanSchedId = extractSpreadsheetId(draftScheduleId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMsg(null);
    await onSaveSpreadsheetIds(cleanDbId, cleanSchedId);
    setLocalMsg('Konfigurasi Spreadsheet ID tersimpan & disinkronkan.');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spreadsheet-modal-title"
      >
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2
                  id="spreadsheet-modal-title"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate"
                >
                  Koneksi Database Google Spreadsheet API
                </h2>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  Endpoint: {getSheetsApiBaseUrl()}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Tutup pengaturan spreadsheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            {/* Live Status Banner */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative flex h-3 w-3 shrink-0">
                  {connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      connected ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {connected ? 'Live spreadsheet' : 'Spreadsheet Disconnected'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {connected && spreadsheetTitle
                      ? `Terhubung ke: ${spreadsheetTitle}`
                      : hasGoogleToken
                      ? 'Login Google aktif — buat atau masukkan Spreadsheet ID di bawah.'
                      : 'Masuk dengan akun Google untuk mengaktifkan baca/tulis Google Sheets API.'}
                  </div>
                </div>
              </div>

              {hasGoogleToken ? (
                <div className="flex items-center gap-2">
                  {googleEmail && (
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {googleEmail}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void onSignOutGoogle()}
                    disabled={syncBusy}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Putus Akun</span>
                  </button>
                </div>
              ) : (
                <GoogleSignInButton
                  onClick={() => void onSignInGoogle()}
                  disabled={syncBusy}
                  label="Sign in with Google"
                />
              )}
            </div>

            {syncError && (
              <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {syncError}
              </div>
            )}

            {localMsg && (
              <div className="px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{localMsg}</span>
              </div>
            )}

            {/* Quick Generate Unified Database Spreadsheet */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    1. Buat Spreadsheet Database Terpadu (Otomatis 5 Sheet)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Membuat 1 file Google Spreadsheet baru berisi 5 sheet terpisah:{' '}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {SHEET_TABS.DEVICES}, {SHEET_TABS.INFRASTRUCTURE}, {SHEET_TABS.TOWERS},{' '}
                      {SHEET_TABS.PERSONNEL}, {SHEET_TABS.REPORTS}
                    </span>{' '}
                    serta langsung mengisi seluruh data terkini dan menghubungkan API-nya.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!hasGoogleToken || syncBusy}
                  onClick={() => setConfirmAction('create')}
                  className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Buat &amp; Hubungkan Spreadsheet</span>
                </button>
              </div>
            </div>

            {/* Spreadsheet ID Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    2. Spreadsheet Database Utama (ID atau URL Google Sheets)
                  </label>
                  {cleanDbId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${cleanDbId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Buka Spreadsheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={draftDbId}
                  onChange={(e) => setDraftDbId(e.target.value)}
                  placeholder="Tempel Spreadsheet ID atau URL lengkap https://docs.google.com/spreadsheets/d/..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    3. Spreadsheet Jadwal Dinas (ID atau URL Google Sheets)
                  </label>
                  {cleanSchedId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${cleanSchedId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Buka Sheet Jadwal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={draftScheduleId}
                  onChange={(e) => setDraftScheduleId(e.target.value)}
                  placeholder="Tempel Spreadsheet ID jadwal dinas (otomatis membaca sheet bulan berjalan)"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Deteksi otomatis sheet bulan hari ini:{' '}
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {activeScheduleSheetTitle || currentMonth}
                  </span>{' '}
                  · Konversi kode tabel: <span className="font-mono">P = Shift 1</span>,{' '}
                  <span className="font-mono">S = Shift 2</span>,{' '}
                  <span className="font-mono">M = Shift 3</span>,{' '}
                  <span className="font-mono">L = Libur / Off Duty</span>.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasGoogleToken || !cleanDbId || syncBusy}
                    onClick={() => void onRefreshFromSpreadsheet()}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${syncBusy ? 'animate-spin' : ''}`}
                    />
                    <span>Tarik Data dari Sheet</span>
                  </button>
                  <button
                    type="button"
                    disabled={!hasGoogleToken || !cleanDbId || syncBusy}
                    onClick={() => setConfirmAction('push')}
                    className="h-9 px-3 rounded-lg border border-sky-200 dark:border-sky-800 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 disabled:opacity-40 inline-flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Kirim Data Aplikasi ke Sheet</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={syncBusy}
                  className="h-9 px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-colors"
                >
                  Simpan ID &amp; Uji Koneksi
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Explicit Confirmation Modal for Workspace Write / Creation */}
      <ConfirmModal
        open={confirmAction === 'create'}
        variant="primary"
        message="Buat Google Spreadsheet Database Baru?"
        detail="Aplikasi akan membuat 1 file spreadsheet baru di Google Drive Anda dengan 5 tab (Data Perangkat, Data Sarana Prasarana, Data Menara, Data Pegawai Transmisi, dan Data Riwayat Laporan) serta mengisinya dengan data saat ini."
        confirmLabel="Buat Spreadsheet"
        cancelLabel="Batal"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void onCreateUnifiedSpreadsheet();
        }}
      />

      <ConfirmModal
        open={confirmAction === 'push'}
        variant="primary"
        message="Timpa Data Spreadsheet dengan Data Aplikasi?"
        detail="Seluruh baris pada 5 tab database di spreadsheet yang terhubung akan diperbarui sesuai kondisi data aplikasi saat ini."
        confirmLabel="Ya, Sinkronkan"
        cancelLabel="Batal"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void onPushLocalToSpreadsheet();
        }}
      />
    </>
  );
}
