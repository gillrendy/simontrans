import { useEffect, useState } from 'react';
import { Calendar, Printer, X } from 'lucide-react';
import {
  MaintenanceReport,
  Station,
  Technician,
  UserAccount,
} from '../types/transmisi';

interface TicketPrintModalProps {
  report: MaintenanceReport | null;
  onClose: () => void;
  stations: Station[];
  technicians: Technician[];
  users: UserAccount[];
}

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const BULAN_SHORT_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  mei: '05',
  jun: '06',
  jul: '07',
  agu: '08',
  ags: '08',
  sep: '09',
  okt: '10',
  nov: '11',
  des: '12',
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
};

function formatTanggalIndonesia(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(monthIdx) || Number.isNaN(day) || !BULAN_ID[monthIdx]) {
    return isoDate;
  }
  return `${day} ${BULAN_ID[monthIdx]} ${year}`;
}

function parseReportDateToIso(createdAt: string): string {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (!createdAt) return todayIso;

  // Match YYYY-MM-DD
  const isoMatch = createdAt.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Match DD Mon YYYY or DD Month YYYY (e.g., "16 Nov 2026 08:30 WIB" or "16 Agu 2026")
  const idMatch = createdAt.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (idMatch) {
    const day = idMatch[1].padStart(2, '0');
    const monKey = idMatch[2].toLowerCase();
    const month = BULAN_SHORT_MAP[monKey];
    const year = idMatch[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return todayIso;
}

export function TicketPrintModal({
  report,
  onClose,
  stations,
  technicians,
  users,
}: TicketPrintModalProps) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [signatureDate, setSignatureDate] = useState(todayIso);
  const [reportDate, setReportDate] = useState(todayIso);

  useEffect(() => {
    if (report) {
      setSignatureDate(new Date().toISOString().slice(0, 10));
      setReportDate(parseReportDateToIso(report.createdAt));
    }
  }, [report]);

  if (!report) return null;

  const station = stations.find((s) => s.id === report.stationId);
  const submitterUser = users.find(
    (u) => u.fullName.toLowerCase() === report.submittedBy.trim().toLowerCase()
  );
  const submitterTech = technicians.find(
    (t) => t.name.toLowerCase() === report.submittedBy.trim().toLowerCase()
  );

  const locationRegion =
    station?.region ?? submitterUser?.region ?? submitterTech?.region ?? 'Palembang';

  const teamLead =
    technicians.find(
      (t) =>
        (t.stationId === report.stationId ||
          t.region.toLowerCase() === locationRegion.toLowerCase()) &&
        t.jabatan.toLowerCase().includes('ketua tim')
    ) ??
    technicians.find(
      (t) =>
        (t.stationId === report.stationId ||
          t.region.toLowerCase() === locationRegion.toLowerCase()) &&
        t.jabatan.toLowerCase().includes('koordinator')
    );

  const teamLeadName = teamLead?.name ?? report.submittedBy;

  const cleanDesc = report.description.trim().replace(/\.+$/, '');
  const tanggalLaporanText = formatTanggalIndonesia(reportDate);
  const tanggalTandaTanganText = formatTanggalIndonesia(signatureDate);

  const handlePrintPdf = () => {
    document.body.classList.add('printing-ticket-report');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-ticket-report');
    }, 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-print-modal-title"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3
              id="ticket-print-modal-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Cetak Laporan ({report.id})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih tanggal tanda tangan lalu klik Cetak untuk menyimpan atau mencetak PDF
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Tutup cetak laporan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date Input & Print Action Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-end justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tanggal Laporan
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tanggal Tanda Tangan
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  className="h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>

        {/* Printable Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
          <div
            id="ticket-report-printable"
            className="bg-white text-slate-900 p-8 sm:p-10 rounded-lg border border-slate-200 shadow-sm text-sm leading-relaxed space-y-5"
          >
            {/* Title centered */}
            <h1 className="text-center font-bold text-base tracking-wider uppercase">
              LAPORAN
            </h1>

            {/* Header Metadata aligned left */}
            <table className="w-full text-sm text-left border-collapse">
              <tbody>
                <tr>
                  <td className="py-0.5 pr-3 w-28 align-top">Kepada Yth</td>
                  <td className="py-0.5 pr-2 w-4 align-top">:</td>
                  <td className="py-0.5 align-top">
                    Ketua Tim PP Teknik TVRI Stasiun Sumatera Selatan
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-3 align-top">Dari</td>
                  <td className="py-0.5 pr-2 align-top">:</td>
                  <td className="py-0.5 align-top">
                    Koordinator Satuan Transmisi {locationRegion}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-3 align-top">Hal</td>
                  <td className="py-0.5 pr-2 align-top">:</td>
                  <td className="py-0.5 align-top">{report.subject}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-3 align-top">Sifat</td>
                  <td className="py-0.5 pr-2 align-top">:</td>
                  <td className="py-0.5 align-top">{report.priority}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-3 align-top">Tanggal</td>
                  <td className="py-0.5 pr-2 align-top">:</td>
                  <td className="py-0.5 align-top">{tanggalLaporanText}</td>
                </tr>
              </tbody>
            </table>

            {/* Horizontal Border */}
            <hr className="border-t-2 border-slate-900 my-4" />

            {/* Letter Body */}
            <div className="space-y-3 text-sm leading-relaxed text-justify">
              <p>Bersama surat ini kami melaporkan bahwa {cleanDesc}.</p>
              <p>Untuk itu mohon bantuannya untuk diproses dan ditindaklanjuti.</p>
              <p>
                Demikian kami sampaikan, atas perhatian bapak, kami ucapkan terima
                kasih.
              </p>
            </div>

            {/* Right-aligned Signature Block */}
            <div className="pt-8 text-right text-sm leading-relaxed">
              <div>
                {locationRegion}, {tanggalTandaTanganText}
              </div>
              <div>Koordinator Satuan Transmisi {locationRegion},</div>
              <br />
              <br />
              <br />
              <div className="font-bold">{teamLeadName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
