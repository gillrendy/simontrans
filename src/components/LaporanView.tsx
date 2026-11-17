import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Paperclip,
  Printer,
  Send,
} from 'lucide-react';
import {
  MaintenanceReport,
  ReportPriority,
  Station,
  Technician,
  TicketStatus,
  UserAccount,
} from '../types/transmisi';
import { TicketPrintModal } from './TicketPrintModal';

interface LaporanViewProps {
  stations: Station[];
  reports: MaintenanceReport[];
  technicians: Technician[];
  users: UserAccount[];
  currentUser: UserAccount;
  onSubmitReport: (payload: {
    stationId: string;
    subject: string;
    description: string;
    attachmentName: string | null;
    attachmentDataUrl: string | null;
    priority: ReportPriority;
  }) => void;
}

const TICKET_STEPS: TicketStatus[] = [
  'Pengajuan',
  'Laporan diterima',
  'Laporan diproses',
  'Selesai',
];

export function LaporanView({
  stations,
  reports,
  technicians,
  users,
  currentUser,
  onSubmitReport,
}: LaporanViewProps) {
  const [stationId, setStationId] = useState<string>(
    currentUser.stationId || stations[0]?.id || ''
  );
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ReportPriority>('Biasa');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const [filterStation, setFilterStation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(reports[0]?.id ?? null);
  const [printingReport, setPrintingReport] = useState<MaintenanceReport | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAttachmentName(null);
      setAttachmentDataUrl(null);
      return;
    }
    setAttachmentName(file.name);
    if (file.type.startsWith('image/') && file.size <= 1_500_000) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachmentDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentDataUrl(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !stationId) return;

    onSubmitReport({
      stationId,
      subject: subject.trim(),
      description: description.trim(),
      attachmentName,
      attachmentDataUrl,
      priority,
    });

    setSubject('');
    setDescription('');
    setPriority('Biasa');
    setAttachmentName(null);
    setAttachmentDataUrl(null);
    setSubmittedNotice('Laporan berhasil dikirim dengan status Pengajuan.');
    setTimeout(() => setSubmittedNotice(null), 4000);
  };

  const filteredReports = reports.filter((r) => {
    if (filterStation !== 'all' && r.stationId !== filterStation) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Form Input Laporan Baru */}
      <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Input Laporan Pemeliharaan Baru
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pelapor aktif: {currentUser.fullName} ({currentUser.role})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Lokasi Satuan Transmisi
            </label>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.region})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Subjek Laporan
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Gangguan modul inverter UPS / pemeliharaan rutin"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Deskripsi Laporan
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kronologi gangguan, parameter pengukuran terakhir, dan tindakan awal di lapangan..."
              className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Keterangan Prioritas
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['Biasa', 'Urgent'] as ReportPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-md text-xs font-medium transition-colors ${
                      priority === p
                        ? p === 'Urgent'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Lampiran (Foto / Dokumen)
              </label>
              <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:border-sky-500 transition-colors">
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {attachmentName ? attachmentName : 'Pilih berkas lampiran...'}
                </span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Laporan</span>
            </button>

            {submittedNotice && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {submittedNotice}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Right: Riwayat Laporan Tiket */}
      <div className="xl:col-span-7 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Riwayat Tiket Laporan ({filteredReports.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alur status: Pengajuan → Laporan diterima → Laporan diproses → Selesai
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              aria-label="Filter lokasi tiket"
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Lokasi</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.region}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | TicketStatus)}
              aria-label="Filter status tiket"
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Status</option>
              {TICKET_STEPS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredReports.map((rep) => {
            const st = stations.find((s) => s.id === rep.stationId);
            const currentStepIdx = TICKET_STEPS.indexOf(rep.status);
            const isExpanded = expandedId === rep.id;

            return (
              <div
                key={rep.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((prev) => (prev === rep.id ? null : rep.id))
                  }
                  className="w-full text-left p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {rep.id} · {st?.region ?? rep.stationId} · {rep.createdAt}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold ${
                          rep.priority === 'Urgent'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {rep.priority}
                      </span>
                      <span
                        className={`font-semibold ${
                          rep.status === 'Selesai'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : rep.status === 'Laporan diproses'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1.5">
                    {rep.subject}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {rep.description}
                  </p>

                  {/* 4-step visual ticket progress bar */}
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {TICKET_STEPS.map((step, idx) => {
                      const done = idx <= currentStepIdx;
                      return (
                        <div key={step} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              done
                                ? rep.status === 'Selesai'
                                  ? 'bg-emerald-500'
                                  : 'bg-sky-600 dark:bg-sky-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <div
                            className={`text-[10.5px] truncate ${
                              done
                                ? 'font-semibold text-slate-800 dark:text-slate-200'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {step}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {rep.description}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>Pelapor: {rep.submittedBy}</span>
                        {rep.attachmentName && (
                          <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-mono">
                            <FileText className="w-3.5 h-3.5" />
                            {rep.attachmentName}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPrintingReport(rep)}
                        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Cetak Laporan</span>
                      </button>
                    </div>

                    {rep.attachmentDataUrl && (
                      <div className="pt-1">
                        <img
                          src={rep.attachmentDataUrl}
                          alt={`Lampiran ${rep.id}`}
                          className="max-h-44 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
                        />
                      </div>
                    )}

                    {rep.adminNote && (
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                          Catatan Koordinator / Admin
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          {rep.adminNote}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Jejak Pembaruan Tiket
                      </div>
                      {rep.history.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                        >
                          {h.status === 'Selesai' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {h.status}
                            </span>{' '}
                            · <span className="font-mono text-[11px]">{h.timestamp}</span> ·{' '}
                            <span>{h.actor}</span>
                            {h.note && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {h.note}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredReports.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Tidak ada tiket laporan yang cocok dengan filter saat ini.
            </div>
          )}
        </div>
      </div>

      <TicketPrintModal
        report={printingReport}
        onClose={() => setPrintingReport(null)}
        stations={stations}
        technicians={technicians}
        users={users}
      />
    </div>
  );
}
