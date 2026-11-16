import { useState } from 'react';
import { MapPin, Phone, Search } from 'lucide-react';
import { Station, Technician } from '../types/transmisi';
import { TechAvatar } from './TechAvatar';

interface TeknisiViewProps {
  stations: Station[];
  technicians: Technician[];
}

export function TeknisiView({ stations, technicians }: TeknisiViewProps) {
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Koordinator Daerah' | 'Operator'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTechs = technicians.filter((t) => {
    if (regionFilter !== 'all' && t.stationId !== regionFilter) return false;
    if (roleFilter !== 'all' && t.roleStatus !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.education.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by station/region
  const groupedStations = stations.filter(
    (s) => regionFilter === 'all' || s.id === regionFilter
  );

  return (
    <div className="space-y-6">
      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, pendidikan, daerah..."
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
          {(['all', 'Koordinator Daerah', 'Operator'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                roleFilter === r
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {r === 'all' ? 'Semua Status' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped by Region */}
      <div className="space-y-6">
        {groupedStations.map((station) => {
          const regionTechs = filteredTechs.filter((t) => t.stationId === station.id);
          if (regionTechs.length === 0 && searchQuery.trim()) return null;

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
                  Tidak ada petugas yang sesuai filter di daerah ini.
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
                            Status:{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {tech.roleStatus}
                            </span>
                          </div>
                          <div>Pendidikan: {tech.education}</div>
                          <div>Gender: {tech.gender}</div>
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
