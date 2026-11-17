import { useState } from 'react';
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import {
  getCurrentIndonesianMonthName,
  parseCsvMatrixText,
  parseMonthlyScheduleMatrix,
} from '../services/googleSheetsDb';
import {
  ScheduleAssignment,
  ScheduleDayBucket,
  Station,
  Technician,
  UserRole,
} from '../types/transmisi';
import { TechAvatar } from './TechAvatar';

interface JadwalViewProps {
  schedules: ScheduleAssignment[];
  stations: Station[];
  technicians: Technician[];
  userRole: UserRole;
  activeSheetTitle: string | null;
  spreadsheetConnected: boolean;
  onRefreshScheduleSheet: () => Promise<void>;
  onImportSchedules: (newSchedules: ScheduleAssignment[], replaceExisting: boolean) => void;
}

const DAY_ROWS: Array<{
  bucket: ScheduleDayBucket;
  subtitle: string;
}> = [
  { bucket: 'Kemarin', subtitle: 'Rekap petugas jaga hari sebelumnya' },
  { bucket: 'Hari Ini', subtitle: 'Petugas transmisi yang sedang bertugas aktif' },
  { bucket: 'Besok', subtitle: 'Rencana penugasan shift hari berikutnya' },
];

export function JadwalView({
  schedules,
  stations,
  technicians,
  userRole,
  activeSheetTitle,
  spreadsheetConnected,
  onRefreshScheduleSheet,
  onImportSchedules,
}: JadwalViewProps) {
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState(true);
  const [parsedPreview, setParsedPreview] = useState<ScheduleAssignment[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentMonth = getCurrentIndonesianMonthName();

  const normalizeBucket = (raw: string): ScheduleDayBucket => {
    const val = raw.trim().toLowerCase();
    if (val.includes('kemarin') || val === 'yesterday') return 'Kemarin';
    if (val.includes('besok') || val === 'tomorrow') return 'Besok';
    return 'Hari Ini';
  };

  const handleDownloadTemplate = () => {
    const csvEscape = (val: string) =>
      val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;

    const sampleTechs = technicians.slice(0, 6);
    const dayBuckets: ScheduleDayBucket[] = ['Kemarin', 'Hari Ini', 'Besok'];
    const dateMap: Record<ScheduleDayBucket, string> = {
      Kemarin: '15 Nov 2026',
      'Hari Ini': '16 Nov 2026',
      Besok: '17 Nov 2026',
    };

    const sampleRows =
      sampleTechs.length > 0
        ? sampleTechs.map((t, idx) => {
            const bucket = dayBuckets[idx % dayBuckets.length];
            const st = stations.find((s) => s.id === t.stationId);
            const loc = st?.region ?? t.region;
            return [
              bucket,
              dateMap[bucket],
              csvEscape(loc),
              csvEscape(t.name),
              csvEscape(t.jabatan),
              csvEscape(t.shift || 'Shift 2 (08.00 - 16.00)'),
              csvEscape(`Monitoring rutin Satuan Transmisi ${loc}`),
            ].join(',');
          })
        : [
            'Kemarin,15 Nov 2026,Palembang,Agil Yurendi,Operator,Shift 1 (00.00 - 08.00),Monitoring MUX',
            'Hari Ini,16 Nov 2026,Palembang,Sutio,Ketua Tim Palembang,Shift 2 (08.00 - 16.00),Koordinasi TX',
            'Besok,17 Nov 2026,Prabumulih,Karsim,Ketua Tim,Shift 3 (16.00 - 24.00),Pengecekan pemancar & genset',
          ];

    const csvLines = [
      'hari,tanggal,lokasi,nama_teknisi,peran,shift,catatan',
      ...sampleRows,
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_jadwal_tvri_sumsel.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '').trim();
        if (!text) {
          setParseError('File kosong.');
          setParsedPreview([]);
          return;
        }

        if (file.name.toLowerCase().endsWith('.json')) {
          const json = JSON.parse(text);
          if (!Array.isArray(json)) {
            throw new Error('Format JSON harus berupa array jadwal.');
          }
          const items: ScheduleAssignment[] = json.map((item, idx) => ({
            id: `sch-imp-${Date.now()}-${idx}`,
            dayBucket: normalizeBucket(String(item.dayBucket || item.hari || 'Hari Ini')),
            dateLabel: String(item.dateLabel || item.tanggal || '-'),
            stationRegion: String(item.stationRegion || item.lokasi || 'Palembang'),
            technicianName: String(item.technicianName || item.nama_teknisi || 'Teknisi'),
            roleStatus: String(item.roleStatus || item.peran || 'Operator'),
            shift: String(item.shift || 'Shift 2 (08.00 - 16.00)'),
            notes: item.notes || item.catatan || '',
          }));
          setParsedPreview(items);
          return;
        }

        // First try matrix schedule parser (TANGGAL 1..31 with M/S/P/L codes)
        const matrixRows = parseCsvMatrixText(text);
        const matrixParsed = parseMonthlyScheduleMatrix(
          matrixRows,
          new Date(),
          technicians,
          stations
        );
        if (matrixParsed.length > 0) {
          setParsedPreview(matrixParsed);
          return;
        }

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) {
          setParseError('Tidak ada baris data yang terbaca.');
          return;
        }

        const firstLine = lines[0];
        const delimiter = firstLine.includes(';')
          ? ';'
          : firstLine.includes('\t')
          ? '\t'
          : ',';

        const firstCols = parseCsvLine(firstLine, delimiter).map((c) =>
          c.toLowerCase()
        );
        const hasHeader =
          firstCols.some(
            (c) => c.includes('hari') || c.includes('teknisi') || c.includes('lokasi')
          );

        const dataLines = hasHeader ? lines.slice(1) : lines;
        const parsed: ScheduleAssignment[] = dataLines
          .map((line, idx) => {
            const cols = parseCsvLine(line, delimiter);
            if (cols.length < 3) return null;
            return {
              id: `sch-csv-${Date.now()}-${idx}`,
              dayBucket: normalizeBucket(cols[0] || 'Hari Ini'),
              dateLabel: cols[1] || '-',
              stationRegion: cols[2] || 'Palembang',
              technicianName: cols[3] || 'Teknisi',
              roleStatus: cols[4] || 'Operator',
              shift: cols[5] || 'Shift 2 (08.00 - 16.00)',
              notes: cols[6] || '',
            };
          })
          .filter(Boolean) as ScheduleAssignment[];

        if (parsed.length === 0) {
          setParseError(
            'Format kolom tidak dikenali. Gunakan matriks jadwal bulanan (1..31 dengan kode P/S/M/L) atau kolom: hari, tanggal, lokasi, nama_teknisi, peran, shift, catatan.'
          );
          setParsedPreview([]);
          return;
        }
        setParsedPreview(parsed);
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : 'Gagal memproses file jadwal.'
        );
        setParsedPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportSchedules(parsedPreview, replaceMode);
    setUploadOpen(false);
    setParsedPreview([]);
    setFileName(null);
    setImportSuccess(`${parsedPreview.length} entri jadwal berhasil diintegrasikan.`);
    setTimeout(() => setImportSuccess(null), 4000);
  };

  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefreshScheduleSheet();
    } finally {
      setRefreshing(false);
    }
  };

  const findTechnicianProfile = (name: string) =>
    technicians.find(
      (t) =>
        t.name.toLowerCase().replace(/\./g, '') ===
        name.trim().toLowerCase().replace(/\./g, '')
    );

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Jadwal Operasional Teknisi Transmisi
              </h2>
              <span className="text-[11px] font-mono text-sky-700 dark:text-sky-400">
                · Sheet Bulan: {activeSheetTitle || currentMonth}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-mono text-slate-600 dark:text-slate-300">
                P = Shift 1 (00.00 - 08.00) · S = Shift 2 (08.00 - 16.00) · M = Shift 3 (16.00 - 24.00) · L = Libur / Off Duty
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            aria-label="Filter lokasi jadwal"
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Semua Lokasi</option>
            {stations.map((s) => (
              <option key={s.id} value={s.region}>
                {s.region}
              </option>
            ))}
          </select>

          {spreadsheetConnected && (
            <button
              type="button"
              onClick={() => void handleRefreshClick()}
              disabled={refreshing}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Sheet</span>
            </button>
          )}

          {userRole === 'Admin' && (
            <button
              type="button"
              onClick={() => {
                setUploadOpen(true);
                setParseError(null);
              }}
              className="h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Input Jadwal</span>
            </button>
          )}
        </div>
      </div>

      {importSuccess && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {importSuccess}
        </div>
      )}

      {/* Three Explicit Day Rows: Kemarin, Hari Ini, Besok */}
      <div className="space-y-4">
        {DAY_ROWS.map((row) => {
          const items = schedules.filter(
            (s) =>
              s.dayBucket === row.bucket &&
              (regionFilter === 'all' ||
                s.stationRegion.toLowerCase() === regionFilter.toLowerCase())
          );
          const dateLabel = items[0]?.dateLabel;

          return (
            <section
              key={row.bucket}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        row.bucket === 'Hari Ini'
                          ? 'text-sky-700 dark:text-sky-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {row.bucket}
                    </h3>
                    {dateLabel && (
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        · {dateLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {row.subtitle}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {items.length} personel terjadwal
                </span>
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Belum ada jadwal teknisi untuk {row.bucket.toLowerCase()}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-slate-200 dark:bg-slate-800">
                  {items.map((item) => {
                    const matchedTech = findTechnicianProfile(item.technicianName);
                    const isOffDuty = item.shift.toLowerCase().includes('off duty');
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 p-4 flex items-start gap-3"
                      >
                        <TechAvatar
                          name={item.technicianName}
                          avatarKey={matchedTech?.avatarKey ?? 'tech_male_1'}
                          avatarDataUrl={matchedTech?.avatarDataUrl}
                          sizeClass="w-10 h-10"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.technicianName}
                            </span>
                            <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap shrink-0">
                              {item.stationRegion}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            {item.roleStatus} ·{' '}
                            <span
                              className={`font-mono ${
                                isOffDuty
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : 'font-semibold text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {item.shift}
                            </span>
                          </div>
                          {item.notes && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Admin Upload Schedule Window Modal */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Input Jadwal Teknisi (Matriks Bulanan CSV atau CSV Standar)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Tutup window upload jadwal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Mendukung Matriks Jadwal Bulanan (Kode P / S / M / L) maupun CSV Standar:
                </span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-sky-600 dark:text-sky-400 font-medium hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Contoh Template CSV</span>
                </button>
              </div>
              <code className="block font-mono text-[11px] text-slate-600 dark:text-slate-400 overflow-x-auto">
                P = Shift 1 (00.00 - 08.00) | S = Shift 2 (08.00 - 16.00) | M = Shift 3 (16.00 - 24.00) | L = Libur / Off Duty
              </code>
            </div>

            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 cursor-pointer hover:border-sky-500 transition-colors">
                <Upload className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {fileName ? `Berkas dipilih: ${fileName}` : 'Pilih file jadwal (.csv, .txt, atau .json)'}
                </span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv,.json"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={replaceMode}
                  onChange={(e) => setReplaceMode(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Ganti seluruh jadwal sebelumnya dengan isi file ini</span>
              </label>

              {parseError && (
                <div className="text-xs font-medium text-red-600 dark:text-red-400">
                  {parseError}
                </div>
              )}

              {parsedPreview.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Pratinjau Data Terbaca ({parsedPreview.length} baris)
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {parsedPreview.map((p, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          [{p.dayBucket}] {p.technicianName} · {p.stationRegion}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {p.shift}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedPreview.length === 0}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
              >
                Simpan ke Halaman Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
