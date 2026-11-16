import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  DeviceItem,
  MaintenanceReport,
  Station,
  Technician,
  TicketStatus,
  UserAccount,
} from '../types/transmisi';
import { getStationHealth } from '../utils/stationHelpers';
import { SouthSumatraMap } from './SouthSumatraMap';
import { TechAvatar } from './TechAvatar';

interface HomeViewProps {
  stations: Station[];
  devices: DeviceItem[];
  technicians: Technician[];
  reports: MaintenanceReport[];
  currentUser: UserAccount;
  onUpdatePower: (stationId: string, forwardKw: number, reflectedW: number) => void;
  onNavigateReports: () => void;
}

export function HomeView({
  stations,
  devices,
  technicians,
  reports,
  currentUser,
  onUpdatePower,
  onNavigateReports,
}: HomeViewProps) {
  const [chartStationFilter, setChartStationFilter] = useState<string>('all');
  const [dutyStationFilter, setDutyStationFilter] = useState<string>('all');

  // Infographic 1 data: Transmission status chart
  const chartStations =
    chartStationFilter === 'all'
      ? stations
      : stations.filter((s) => s.id === chartStationFilter);

  const totalNormalDevices = devices.filter(
    (d) =>
      (chartStationFilter === 'all' || d.stationId === chartStationFilter) &&
      d.condition === 'Normal'
  ).length;
  const totalFaultDevices = devices.filter(
    (d) =>
      (chartStationFilter === 'all' || d.stationId === chartStationFilter) &&
      d.condition === 'Rusak'
  ).length;

  // Infographic 2 data: Technicians On Duty
  const onDutyTechs = technicians.filter(
    (t) =>
      t.onDuty && (dutyStationFilter === 'all' || t.stationId === dutyStationFilter)
  );

  // Infographic 3 data: Active Reports Summary
  const stageCounts: Record<TicketStatus, number> = {
    Pengajuan: reports.filter((r) => r.status === 'Pengajuan').length,
    'Laporan diterima': reports.filter((r) => r.status === 'Laporan diterima').length,
    'Laporan diproses': reports.filter((r) => r.status === 'Laporan diproses').length,
    Selesai: reports.filter((r) => r.status === 'Selesai').length,
  };

  const activeReports = reports.filter((r) => r.status !== 'Selesai');

  // Overall top summary strip (clean single-line KPIs)
  const totalPowerKw = stations.reduce((acc, s) => acc + s.forwardPowerKw, 0);
  const totalMaxKw = stations.reduce((acc, s) => acc + s.maxCapacityKw, 0);
  const totalOnDutyAll = technicians.filter((t) => t.onDuty).length;

  return (
    <div className="space-y-6">
      {/* Compact top metrics strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Titik Satuan Transmisi
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stations.length} Lokasi
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sumatera Selatan
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Daya Pancar Aktif
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
            {totalPowerKw.toFixed(2)} kW
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            Kapasitas {totalMaxKw.toFixed(1)} kW
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Kondisi Perangkat
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            <span className="text-emerald-600 dark:text-emerald-400">
              {devices.filter((d) => d.condition === 'Normal').length}
            </span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-red-600 dark:text-red-400">
              {devices.filter((d) => d.condition === 'Rusak').length}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Normal / Rusak
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Teknisi On Duty &amp; Tiket Aktif
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {totalOnDutyAll} / {activeReports.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Petugas bertugas · Tiket berjalan
          </div>
        </div>
      </div>

      {/* Primary Focal Anchor: Interactive South Sumatra Map */}
      <SouthSumatraMap
        stations={stations}
        devices={devices}
        technicians={technicians}
        reports={reports}
        currentUser={currentUser}
        onUpdatePower={onUpdatePower}
        onJumpToReports={() => onNavigateReports()}
      />

      {/* Below Map: 3 Infographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infografis 1: Grafik Status Transmisi dengan Dropdown Lokasi */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Grafik Status Transmisi</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rasio perangkat normal &amp; beban daya pancar
              </p>
            </div>
            <select
              value={chartStationFilter}
              onChange={(e) => setChartStationFilter(e.target.value)}
              aria-label="Filter lokasi grafik status transmisi"
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-[140px]"
            >
              <option value="all">Semua Lokasi</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.region}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{totalNormalDevices}</span> Normal
            </span>
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
              <XCircle className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{totalFaultDevices}</span> Rusak
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {chartStations.map((st) => {
              const { health, normalCount, totalCount } = getStationHealth(st, devices);
              const devicePct =
                totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0;
              const powerPct = Math.round(
                (st.forwardPowerKw / st.maxCapacityKw) * 100
              );
              return (
                <div key={st.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {st.region}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {st.forwardPowerKw.toFixed(1)}/{st.maxCapacityKw.toFixed(0)} kW ·{' '}
                      <span
                        className={
                          health === 'Normal'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : health === 'Gangguan Parsial'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {devicePct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        health === 'Normal'
                          ? 'bg-emerald-500'
                          : health === 'Gangguan Parsial'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(powerPct, devicePct > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Infografis 2: Teknisi On Duty dengan Dropdown Lokasi */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Teknisi On Duty</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {onDutyTechs.length} petugas aktif di lokasi
              </p>
            </div>
            <select
              value={dutyStationFilter}
              onChange={(e) => setDutyStationFilter(e.target.value)}
              aria-label="Filter lokasi teknisi on duty"
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-[140px]"
            >
              <option value="all">Semua Lokasi</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.region}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 overflow-y-auto max-h-[260px] flex-1">
            {onDutyTechs.map((tech) => (
              <div
                key={tech.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TechAvatar
                    name={tech.name}
                    avatarKey={tech.avatarKey}
                    avatarDataUrl={tech.avatarDataUrl}
                    sizeClass="w-8 h-8"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {tech.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {tech.region} · {tech.roleStatus}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                  Aktif
                </span>
              </div>
            ))}
            {onDutyTechs.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Tidak ada teknisi on duty di lokasi terpilih.
              </div>
            )}
          </div>
        </div>

        {/* Infografis 3: Summary Laporan yang Sedang Berjalan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Summary Laporan Berjalan</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Alur tiket pemeliharaan teknis
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateReports}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Kelola</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-4 mb-3 border-b border-slate-200 dark:border-slate-800">
            {(
              [
                'Pengajuan',
                'Laporan diterima',
                'Laporan diproses',
                'Selesai',
              ] as TicketStatus[]
            ).map((st) => (
              <div
                key={st}
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2"
              >
                <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                  {st}
                </span>
                <span className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {stageCounts[st]}
                </span>
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 overflow-y-auto max-h-[175px] flex-1">
            {activeReports.map((rep) => {
              const st = stations.find((s) => s.id === rep.stationId);
              return (
                <div key={rep.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {rep.id} · {st?.region}
                    </span>
                    <span
                      className={`font-semibold whitespace-nowrap ${
                        rep.priority === 'Urgent'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {rep.priority}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {rep.subject}
                  </div>
                  <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-0.5">
                    Status: {rep.status}
                  </div>
                </div>
              );
            })}
            {activeReports.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Semua tiket pemeliharaan telah selesai.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
