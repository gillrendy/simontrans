import { useState } from 'react';
import { Calendar, Download, FileBarChart2, Printer, X } from 'lucide-react';
import {
  DeviceItem,
  InfrastructureItem,
  Station,
  Technician,
} from '../types/transmisi';

interface MonthlyReportModalProps {
  open: boolean;
  onClose: () => void;
  stations: Station[];
  devices: DeviceItem[];
  infrastructure: InfrastructureItem[];
  technicians: Technician[];
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

function escapeHtml(val: string | number | null | undefined): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function MonthlyReportModal({
  open,
  onClose,
  stations,
  devices,
  infrastructure,
  technicians,
}: MonthlyReportModalProps) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [signatureDate, setSignatureDate] = useState(todayIso);
  const [generatedDateLabel, setGeneratedDateLabel] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerate = () => {
    setGeneratedDateLabel(formatTanggalIndonesia(signatureDate));
  };

  const handlePrint = () => {
    document.body.classList.add('printing-monthly-report');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-monthly-report');
    }, 300);
  };

  const towerRows = stations.map((st, idx) => {
    const infra = infrastructure.find((i) => i.stationId === st.id);
    return {
      no: idx + 1,
      stationName: st.name,
      code: st.code,
      coords: `${st.latitude.toFixed(5)}, ${st.longitude.toFixed(5)}`,
      channelFreq: st.channelFreq,
      power: `${st.forwardPowerKw.toFixed(2)} / ${st.maxCapacityKw.toFixed(1)} kW`,
      towerHeight: infra ? `${infra.towerHeightM} m` : '-',
      towerCondition: infra ? infra.towerCondition : '-',
      antenna: infra ? infra.antennaInfo : '-',
      coverage: infra ? infra.coverageArea : '-',
    };
  });

  const handleDownloadWord = () => {
    const dateText = generatedDateLabel ?? formatTanggalIndonesia(signatureDate);

    const peralatanRowsHtml = devices
      .map((dev, idx) => {
        const st = stations.find((s) => s.id === dev.stationId);
        const statusLabel =
          dev.condition === 'Normal'
            ? 'Normal - Aktif'
            : dev.condition === 'Proses Perbaikan'
            ? 'Proses Perbaikan - Aktif Parsial'
            : 'Rusak - Tidak Aktif';
        return `<tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${escapeHtml(st?.name ?? dev.stationId)}</td>
          <td>${escapeHtml(dev.category)}</td>
          <td>${escapeHtml(dev.name)}</td>
          <td>${escapeHtml(dev.brandModel)}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td>${escapeHtml(dev.notes)}</td>
        </tr>`;
      })
      .join('');

    const menaraRowsHtml = towerRows
      .map(
        (r) => `<tr>
          <td style="text-align:center;">${r.no}</td>
          <td>${escapeHtml(r.stationName)}</td>
          <td>${escapeHtml(r.code)}</td>
          <td>${escapeHtml(r.coords)}</td>
          <td>${escapeHtml(r.channelFreq)}</td>
          <td>${escapeHtml(r.power)}</td>
          <td style="text-align:center;">${escapeHtml(r.towerHeight)}</td>
          <td>${escapeHtml(r.towerCondition)}</td>
          <td>${escapeHtml(r.antenna)}</td>
          <td>${escapeHtml(r.coverage)}</td>
        </tr>`
      )
      .join('');

    const sarprasRowsHtml = infrastructure
      .map(
        (item, idx) => `<tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${escapeHtml(item.stationName)}</td>
          <td>${escapeHtml(item.landArea)}</td>
          <td>${escapeHtml(item.landStatus)}</td>
          <td>${escapeHtml(item.txRoomArea)} — ${escapeHtml(item.txRoomCondition)}</td>
          <td>${item.officialHouseCount} Unit (${escapeHtml(item.officialHouseCondition)})</td>
          <td>${escapeHtml(item.gensetRoomArea)} — ${escapeHtml(item.gensetRoomCondition)}</td>
        </tr>`
      )
      .join('');

    const pegawaiRowsHtml = technicians
      .map(
        (t, idx) => `<tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${escapeHtml(t.name)}</td>
          <td style="text-align:center;">${escapeHtml(t.gender)}</td>
          <td style="text-align:center;">${escapeHtml(t.employmentStatus)}</td>
          <td>${escapeHtml(t.jabatan)}</td>
          <td>${escapeHtml(t.region)}</td>
          <td>${escapeHtml(t.shift)}</td>
          <td>${escapeHtml(t.phone)}</td>
        </tr>`
      )
      .join('');

    const docHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Laporan Bulanan Data Transmisi TVRI Sumsel</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111827; margin: 24px; }
  h1, h2 { margin: 0; }
  .header { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #111827; padding-bottom: 10px; }
  .header h1 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.4px; }
  .header p { margin: 4px 0 0; font-size: 11px; color: #374151; }
  h3 { font-size: 12px; margin: 16px 0 6px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #4b5563; padding: 5px 6px; text-align: left; vertical-align: top; font-size: 10px; }
  th { background-color: #f3f4f6; font-weight: bold; }
  .sig-table { width: 100%; border: none; margin-top: 28px; }
  .sig-table td { border: none; width: 50%; vertical-align: top; font-size: 11px; padding: 4px 12px; }
</style>
</head>
<body>
  <div class="header">
    <h1>LAPORAN BULANAN DATA TRANSMISI</h1>
    <p>LPP TVRI STASIUN SUMATERA SELATAN · BIDANG TRANSMISI DAN MULTIPLEKSING</p>
    <p>Tanggal Laporan: ${escapeHtml(dateText)}</p>
  </div>

  <h3>1. Data Peralatan Transmisi (${devices.length} Unit)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:28px;text-align:center;">No</th>
        <th>Satuan Transmisi</th>
        <th>Kategori</th>
        <th>Nama Peralatan</th>
        <th>Merek / Tipe</th>
        <th>Status / Kondisi</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>${peralatanRowsHtml}</tbody>
  </table>

  <h3>2. Data Menara Transmisi (${towerRows.length} Lokasi)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:28px;text-align:center;">No</th>
        <th>Satuan Transmisi</th>
        <th>Kode</th>
        <th>Koordinat</th>
        <th>Kanal / Frekuensi</th>
        <th>Daya (Real/Maks)</th>
        <th>Tinggi</th>
        <th>Kondisi Menara</th>
        <th>Antena</th>
        <th>Jangkauan</th>
      </tr>
    </thead>
    <tbody>${menaraRowsHtml}</tbody>
  </table>

  <h3>3. Data Sarana Prasarana (${infrastructure.length} Lokasi)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:28px;text-align:center;">No</th>
        <th>Satuan Transmisi</th>
        <th>Luas Tanah</th>
        <th>Status Tanah</th>
        <th>Ruang TX</th>
        <th>Rumah Dinas</th>
        <th>Ruang Genset</th>
      </tr>
    </thead>
    <tbody>${sarprasRowsHtml}</tbody>
  </table>

  <h3>4. Data Pegawai Transmisi (${technicians.length} Personel)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:28px;text-align:center;">No</th>
        <th>Nama Pegawai</th>
        <th style="text-align:center;">L/P</th>
        <th style="text-align:center;">Status</th>
        <th>Jabatan</th>
        <th>Lokasi</th>
        <th>Shift</th>
        <th>No. HP</th>
      </tr>
    </thead>
    <tbody>${pegawaiRowsHtml}</tbody>
  </table>

  <table class="sig-table">
    <tr>
      <td>
        Mengetahui<br/>
        Ketua Tim PP Teknik<br/><br/><br/><br/>
        <strong>Abdur Rahman, S. SI</strong><br/>
        NIP. 199608092020121004
      </td>
      <td>
        Palembang, ${escapeHtml(dateText)}<br/>
        Ketua Tim Transmisi dan Multipleksing<br/><br/><br/><br/>
        <strong>Sutio, SE</strong><br/>
        NIP. 196906011998031011
      </td>
    </tr>
  </table>
</body>
</html>`;

    const blob = new Blob([docHtml], {
      type: 'application/msword;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Bulanan_Transmisi_TVRI_Sumsel_${signatureDate}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${
          generatedDateLabel ? 'max-w-6xl' : 'max-w-md'
        } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden`}
      >
        {/* Modal Top Control Bar */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileBarChart2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Buat Laporan Bulanan Data Transmisi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih tanggal tanda tangan lalu generate 4 tabel kategori data transmisi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Tutup modal laporan bulanan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date Picker & Generate Trigger Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-end justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tanggal Tanda Tangan
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => {
                    setSignatureDate(e.target.value);
                    if (generatedDateLabel) {
                      setGeneratedDateLabel(formatTanggalIndonesia(e.target.value));
                    }
                  }}
                  className="h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              className="h-9 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FileBarChart2 className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </div>

          {generatedDateLabel && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadWord}
                className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Dokumen (.doc)</span>
              </button>
            </div>
          )}
        </div>

        {/* Report Body Preview */}
        {!generatedDateLabel ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Pilih tanggal tanda tangan di atas dan klik{' '}
            <strong className="text-slate-800 dark:text-slate-200">Generate</strong>{' '}
            untuk menampilkan rekap 4 tabel laporan bulanan beserta kolom tanda tangan resmi.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950">
            <div
              id="monthly-report-printable"
              className="bg-white text-slate-900 p-8 rounded-lg border border-slate-200 shadow-sm space-y-6 text-xs"
            >
              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h1 className="text-base font-bold uppercase tracking-wide">
                  Laporan Bulanan Data Transmisi
                </h1>
                <div className="text-xs font-semibold text-slate-700 mt-1">
                  LPP TVRI Stasiun Sumatera Selatan · Bidang Transmisi dan Multipleksing
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Tanggal: {generatedDateLabel}
                </div>
              </div>

              {/* Tabel 1: Data Peralatan Transmisi */}
              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  1. Data Peralatan Transmisi ({devices.length} Perangkat)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-400 px-2 py-1.5 text-center w-9">No</th>
                        <th className="border border-slate-400 px-2 py-1.5">Satuan Transmisi</th>
                        <th className="border border-slate-400 px-2 py-1.5">Kategori</th>
                        <th className="border border-slate-400 px-2 py-1.5">Nama Peralatan</th>
                        <th className="border border-slate-400 px-2 py-1.5">Merek / Tipe</th>
                        <th className="border border-slate-400 px-2 py-1.5">Status / Kondisi</th>
                        <th className="border border-slate-400 px-2 py-1.5">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((dev, idx) => {
                        const st = stations.find((s) => s.id === dev.stationId);
                        const statusLabel =
                          dev.condition === 'Normal'
                            ? 'Normal - Aktif'
                            : dev.condition === 'Proses Perbaikan'
                            ? 'Proses Perbaikan - Aktif Parsial'
                            : 'Rusak - Tidak Aktif';
                        return (
                          <tr key={dev.id}>
                            <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 px-2 py-1">
                              {st?.name ?? dev.stationId}
                            </td>
                            <td className="border border-slate-300 px-2 py-1">{dev.category}</td>
                            <td className="border border-slate-300 px-2 py-1 font-medium">
                              {dev.name}
                            </td>
                            <td className="border border-slate-300 px-2 py-1 font-mono">
                              {dev.brandModel}
                            </td>
                            <td
                              className={`border border-slate-300 px-2 py-1 font-semibold ${
                                dev.condition === 'Normal'
                                  ? 'text-emerald-700'
                                  : dev.condition === 'Proses Perbaikan'
                                  ? 'text-orange-600'
                                  : 'text-red-700'
                              }`}
                            >
                              {statusLabel}
                            </td>
                            <td className="border border-slate-300 px-2 py-1">{dev.notes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Tabel 2: Data Menara Transmisi */}
              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  2. Data Menara Transmisi ({towerRows.length} Lokasi)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-400 px-2 py-1.5 text-center w-9">No</th>
                        <th className="border border-slate-400 px-2 py-1.5">Satuan Transmisi</th>
                        <th className="border border-slate-400 px-2 py-1.5">Kode</th>
                        <th className="border border-slate-400 px-2 py-1.5">Koordinat</th>
                        <th className="border border-slate-400 px-2 py-1.5">Kanal / Frekuensi</th>
                        <th className="border border-slate-400 px-2 py-1.5">Daya (Real / Maks)</th>
                        <th className="border border-slate-400 px-2 py-1.5 text-center">Tinggi</th>
                        <th className="border border-slate-400 px-2 py-1.5">Kondisi Menara</th>
                        <th className="border border-slate-400 px-2 py-1.5">Antena</th>
                        <th className="border border-slate-400 px-2 py-1.5">Jangkauan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {towerRows.map((row) => (
                        <tr key={row.code}>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                            {row.no}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-medium">
                            {row.stationName}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-mono">
                            {row.code}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-mono">
                            {row.coords}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">{row.channelFreq}</td>
                          <td className="border border-slate-300 px-2 py-1 font-mono">
                            {row.power}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                            {row.towerHeight}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            {row.towerCondition}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">{row.antenna}</td>
                          <td className="border border-slate-300 px-2 py-1">{row.coverage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Tabel 3: Data Sarana Prasarana */}
              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  3. Data Sarana Prasarana ({infrastructure.length} Lokasi)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-400 px-2 py-1.5 text-center w-9">No</th>
                        <th className="border border-slate-400 px-2 py-1.5">Satuan Transmisi</th>
                        <th className="border border-slate-400 px-2 py-1.5">Luas Tanah</th>
                        <th className="border border-slate-400 px-2 py-1.5">Status Tanah</th>
                        <th className="border border-slate-400 px-2 py-1.5">Ruang TX</th>
                        <th className="border border-slate-400 px-2 py-1.5">Rumah Dinas</th>
                        <th className="border border-slate-400 px-2 py-1.5">Ruang Genset</th>
                      </tr>
                    </thead>
                    <tbody>
                      {infrastructure.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-medium">
                            {item.stationName}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-mono">
                            {item.landArea}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">{item.landStatus}</td>
                          <td className="border border-slate-300 px-2 py-1">
                            {item.txRoomArea} — {item.txRoomCondition}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            {item.officialHouseCount} Unit ({item.officialHouseCondition})
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            {item.gensetRoomArea} — {item.gensetRoomCondition}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Tabel 4: Data Pegawai Transmisi */}
              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  4. Data Pegawai Transmisi ({technicians.length} Personel)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-400 px-2 py-1.5 text-center w-9">No</th>
                        <th className="border border-slate-400 px-2 py-1.5">Nama Pegawai</th>
                        <th className="border border-slate-400 px-2 py-1.5 text-center">Gender</th>
                        <th className="border border-slate-400 px-2 py-1.5 text-center">Status</th>
                        <th className="border border-slate-400 px-2 py-1.5">Jabatan</th>
                        <th className="border border-slate-400 px-2 py-1.5">Satuan Transmisi</th>
                        <th className="border border-slate-400 px-2 py-1.5">Shift</th>
                        <th className="border border-slate-400 px-2 py-1.5">No. HP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {technicians.map((tech, idx) => (
                        <tr key={tech.id}>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-medium">
                            {tech.name}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center">
                            {tech.gender}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center">
                            {tech.employmentStatus}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">{tech.jabatan}</td>
                          <td className="border border-slate-300 px-2 py-1">{tech.region}</td>
                          <td className="border border-slate-300 px-2 py-1 font-mono">
                            {tech.shift}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-mono">
                            {tech.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Official Signature Footer (Bottom Left & Bottom Right) */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs leading-relaxed">
                <div>
                  <div>Mengetahui</div>
                  <div>Ketua Tim PP Teknik</div>
                  <br />
                  <br />
                  <br />
                  <br />
                  <div className="font-bold">Abdur Rahman, S. SI</div>
                  <div>NIP. 199608092020121004</div>
                </div>

                <div>
                  <div>Palembang, {generatedDateLabel}</div>
                  <div>Ketua Tim Transmisi dan Multipleksing</div>
                  <br />
                  <br />
                  <br />
                  <br />
                  <div className="font-bold">Sutio, SE</div>
                  <div>NIP. 196906011998031011</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
