import { useState } from 'react';
import { MapPin, Phone, Search, Users } from 'lucide-react';
import { EmploymentStatus, Station, Technician } from '../types/transmisi';
import { TechAvatar } from './TechAvatar';

interface TeknisiViewProps {
  stations: Station[];
  technicians: Technician[];
}

export function TeknisiView({ stations, technicians }: TeknisiViewProps) {
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EmploymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTechs = technicians.filter((t) => {
    if (regionFilter !== 'all' && t.stationId !== regionFilter) return false;
    if (statusFilter !== 'all' && t.employmentStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.jabatan.toLowerCase().includes(q) ||
        t.employmentStatus.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const groupedStations = stations.filter(
    (s) => regionFilter === 'all' || s.id === regionFilter
  );

  const totalPns = technicians.filter((t) => t.employmentStatus === 'PNS').length;
  const totalPppk = technicians.filter((t) => t.employmentStatus === 'PPPK').length;
  const totalOnDuty = technicians.filter((t) => t.onDuty).length;

  return (
    <div className="space-y-6">
      {/* Compact KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Total Personel Transmisi</span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {technicians.length} Orang
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tersinkronisasi dengan Kelola User
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Status PNS
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
            {totalPns} Orang
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pegawai Negeri Sipil
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Status PPPK
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {totalPppk} Orang
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pegawai Pemerintah dengan Perjanjian Kerja
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Aktif On Duty
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {totalOnDuty} Orang
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bertugas di {new Set(technicians.map((t) => t.stationId)).size} lokasi satuan
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, jabatan, daerah..."
              className="h-9 pl-9 pr-3 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            aria-label="Filter daerah satuan transmisi"
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Semua Daerah ({stations.length})</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.region}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(['all', 'PNS', 'PPPK'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped by Region */}
      <div className="space-y-6">
        {groupedStations.map((station) => {
          const regionTechs = filteredTechs.filter((t) => t.stationId === station.id);
          const hasAnyStaffInStation = technicians.some((t) => t.stationId === station.id);
          if (regionTechs.length === 0 && (searchQuery.trim() || statusFilter !== 'all')) {
            return null;
          }

          return (
            <section
              key={station.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Daerah {station.region} — {station.name}
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {regionTechs.length} personel · {regionTechs.filter((t) => t.onDuty).length} on duty
                </span>
              </div>

              {regionTechs.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  {hasAnyStaffInStation
                    ? 'Tidak ada petugas yang sesuai filter di daerah ini.'
                    : 'Belum ada petugas penempatan tetap pada satuan transmisi ini (pemantauan jarak jauh / off-air).'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-slate-200 dark:bg-slate-800">
                  {regionTechs.map((tech) => (
                    <div
                      key={tech.id}
                      className="bg-white dark:bg-slate-900 p-5 flex items-start gap-3.5"
                    >
                      <TechAvatar
                        name={tech.name}
                        avatarKey={tech.avatarKey}
                        avatarDataUrl={tech.avatarDataUrl}
                        sizeClass="w-12 h-12"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {tech.name}
                          </h3>
                          <span
                            className={`text-[11px] font-medium whitespace-nowrap shrink-0 ${
                              tech.onDuty
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {tech.onDuty ? 'On Duty' : 'Off Duty'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                          <div>
                            Jabatan:{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {tech.jabatan}
                            </span>
                          </div>
                          <div>
                            Status:{' '}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {tech.employmentStatus}
                            </span>
                          </div>
                          <div>
                            Gender:{' '}
                            <span>
                              {tech.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span>{tech.shift}</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {tech.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
