import { useState } from 'react';
import {
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Radio,
  Search,
  Wind,
  XCircle,
} from 'lucide-react';
import {
  DeviceCategory,
  DeviceCondition,
  DeviceItem,
  Station,
} from '../types/transmisi';

interface PerangkatViewProps {
  stations: Station[];
  devices: DeviceItem[];
  onToggleDeviceCondition: (deviceId: string) => void;
}

const CATEGORIES: Array<{
  id: DeviceCategory;
  label: string;
  desc: string;
  icon: typeof Cpu;
}> = [
  {
    id: 'Input / Headend',
    label: 'Input / Headend',
    desc: 'Encoder, Multiplexer, IRD/Receiver, STL Link',
    icon: Cpu,
  },
  {
    id: 'Pemancar',
    label: 'Pemancar',
    desc: 'Transmitter Utama, Exciter, Power Amplifier',
    icon: Radio,
  },
  {
    id: 'Pendukung',
    label: 'Pendukung',
    desc: 'Cooling System, AC Presisi, Dehydrator, Dummy Load, Antena',
    icon: Wind,
  },
  {
    id: 'Kelistrikan',
    label: 'Kelistrikan',
    desc: 'UPS, Genset, ATS/AMF, Gardu PLN, Grounding',
    icon: BatteryCharging,
  },
];

export function PerangkatView({
  stations,
  devices,
  onToggleDeviceCondition,
}: PerangkatViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | 'all'>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | DeviceCondition>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDevices = devices.filter((dev) => {
    if (selectedCategory !== 'all' && dev.category !== selectedCategory) return false;
    if (selectedStation !== 'all' && dev.stationId !== selectedStation) return false;
    if (conditionFilter !== 'all' && dev.condition !== conditionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        dev.name.toLowerCase().includes(q) ||
        dev.brandModel.toLowerCase().includes(q) ||
        dev.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categoriesToRender =
    selectedCategory === 'all'
      ? CATEGORIES
      : CATEGORIES.filter((c) => c.id === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const catDevices = devices.filter(
            (d) =>
              d.category === cat.id &&
              (selectedStation === 'all' || d.stationId === selectedStation)
          );
          const normalCount = catDevices.filter((d) => d.condition === 'Normal').length;
          const faultCount = catDevices.filter((d) => d.condition === 'Rusak').length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setSelectedCategory((prev) => (prev === cat.id ? 'all' : cat.id))
              }
              className={`text-left p-4 rounded-xl border transition-colors ${
                isSelected
                  ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-500 dark:border-sky-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {cat.label}
                </span>
                <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {cat.desc}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {normalCount} Normal
                </span>
                <span
                  className={`font-medium ${
                    faultCount > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {faultCount} Rusak
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau model perangkat..."
              className="h-9 pl-9 pr-3 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            aria-label="Filter lokasi satuan transmisi"
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Semua Satuan Transmisi</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Segmented condition filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(['all', 'Normal', 'Rusak'] as const).map((cond) => (
            <button
              key={cond}
              type="button"
              onClick={() => setConditionFilter(cond)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                conditionFilter === cond
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {cond === 'all' ? 'Semua Kondisi' : cond}
            </button>
          ))}
        </div>
      </div>

      {/* Categorized Device Tables */}
      <div className="space-y-6">
        {categoriesToRender.map((cat) => {
          const rows = filteredDevices.filter((d) => d.category === cat.id);
          return (
            <section
              key={cat.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {cat.label}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {cat.desc}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {rows.length} unit
                </span>
              </div>

              {rows.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Tidak ada perangkat yang sesuai dengan filter pada kategori ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                        <th className="py-2.5 px-5">Perangkat</th>
                        <th className="py-2.5 px-4">Lokasi Satuan</th>
                        <th className="py-2.5 px-4">Merek / Tipe</th>
                        <th className="py-2.5 px-4">Catatan Teknis</th>
                        <th className="py-2.5 px-4">Status Kondisi</th>
                        <th className="py-2.5 px-5 text-right">Uji / Ubah Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {rows.map((dev) => {
                        const st = stations.find((s) => s.id === dev.stationId);
                        const isNormal = dev.condition === 'Normal';
                        return (
                          <tr
                            key={dev.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-5 font-semibold text-slate-900 dark:text-slate-100">
                              {dev.name}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {st?.region ?? dev.stationId}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {dev.brandModel}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                              {dev.notes}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 font-semibold ${
                                  isNormal
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {isNormal ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {dev.condition} - {dev.active ? 'Aktif' : 'Tidak Aktif'}
                                </span>
                              </span>
                            </td>
                            <td className="py-3 px-5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onToggleDeviceCondition(dev.id)}
                                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                {isNormal ? 'Tandai Rusak' : 'Pulihkan Normal'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
