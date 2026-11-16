import { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Home,
  LandPlot,
  RadioTower,
  Search,
  XCircle,
} from 'lucide-react';
import { InfrastructureItem } from '../types/transmisi';

interface SaranaPrasaranaViewProps {
  infrastructure: InfrastructureItem[];
}

function classifyCondition(text: string): 'baik' | 'rusak' | 'netral' {
  const lower = text.toLowerCase();
  if (!text || text.trim() === '-' || text.trim() === '0') return 'netral';
  if (
    lower.includes('rusak') ||
    lower.includes('bocor') ||
    lower.includes('pencurian') ||
    lower.includes('belum ada sertifikat') ||
    lower.includes('berlubang')
  ) {
    return 'rusak';
  }
  if (lower.includes('baik') || lower.includes('bersertifikat')) return 'baik';
  return 'netral';
}

export function SaranaPrasaranaView({
  infrastructure,
}: SaranaPrasaranaViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'baik' | 'perhatian'>('all');

  const filtered = infrastructure.filter((item) => {
    const hasIssue =
      classifyCondition(item.landStatus) === 'rusak' ||
      classifyCondition(item.txRoomCondition) === 'rusak' ||
      classifyCondition(item.officialHouseCondition) === 'rusak' ||
      classifyCondition(item.gensetRoomCondition) === 'rusak';

    if (conditionFilter === 'baik' && hasIssue) return false;
    if (conditionFilter === 'perhatian' && !hasIssue) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.stationName.toLowerCase().includes(q) ||
        item.landStatus.toLowerCase().includes(q) ||
        item.txRoomCondition.toLowerCase().includes(q) ||
        item.officialHouseCondition.toLowerCase().includes(q) ||
        item.gensetRoomCondition.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalHouses = infrastructure.reduce((acc, i) => acc + i.officialHouseCount, 0);
  const certifiedCount = infrastructure.filter((i) =>
    i.landStatus.toLowerCase().includes('bersertifikat')
  ).length;
  const issueSiteCount = infrastructure.filter(
    (i) =>
      classifyCondition(i.landStatus) === 'rusak' ||
      classifyCondition(i.txRoomCondition) === 'rusak' ||
      classifyCondition(i.officialHouseCondition) === 'rusak' ||
      classifyCondition(i.gensetRoomCondition) === 'rusak'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Total Satuan Transmisi</span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {infrastructure.length} Lokasi
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data Sarana &amp; Prasarana Agustus 2026
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <LandPlot className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Status Tanah Bersertifikat</span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {certifiedCount} / {infrastructure.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {infrastructure.length - certifiedCount} hibah belum sertifikat
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Total Rumah Dinas</span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {totalHouses} Unit
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tersebar di {infrastructure.filter((i) => i.officialHouseCount > 0).length} lokasi
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <RadioTower className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Lokasi Perlu Perbaikan</span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
            {issueSiteCount} Lokasi
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kerusakan bangunan / sertifikasi
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lokasi, status tanah, kondisi..."
            className="h-9 pl-9 pr-3 w-72 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {[
            { id: 'all', label: 'Semua Lokasi' },
            { id: 'baik', label: 'Kondisi Baik' },
            { id: 'perhatian', label: 'Perlu Perhatian' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setConditionFilter(tab.id as 'all' | 'baik' | 'perhatian')
              }
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                conditionFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Infrastructure Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((item) => {
          const landState = classifyCondition(item.landStatus);
          const txState = classifyCondition(item.txRoomCondition);
          const houseState = classifyCondition(item.officialHouseCondition);
          const gensetState = classifyCondition(item.gensetRoomCondition);

          const renderCondText = (text: string, state: 'baik' | 'rusak' | 'netral') => (
            <span
              className={`font-medium ${
                state === 'baik'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : state === 'rusak'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {text}
            </span>
          );

          return (
            <article
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {item.stationName}
                  </h2>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Menara {item.towerHeightM} m ({item.towerCondition}) · Luas Tanah{' '}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {item.landArea}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
                  {landState === 'rusak' ||
                  txState === 'rusak' ||
                  houseState === 'rusak' ||
                  gensetState === 'rusak' ? (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Ada Catatan</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Baik</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Status Tanah
                  </div>
                  <div>{renderCondText(item.landStatus, landState)}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Rumah Dinas ({item.officialHouseCount} Unit)
                  </div>
                  <div>
                    {renderCondText(
                      item.officialHouseCount === 0
                        ? 'Tidak ada (-)'
                        : item.officialHouseCondition,
                      houseState
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ruang TX ({item.txRoomArea})
                  </div>
                  <div className="leading-relaxed">
                    {renderCondText(item.txRoomCondition, txState)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ruang Genset ({item.gensetRoomArea})
                  </div>
                  <div className="leading-relaxed">
                    {renderCondText(item.gensetRoomCondition, gensetState)}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span>Antena: {item.antennaInfo}</span>
                <span>Jangkauan: {item.coverageArea}</span>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
            <XCircle className="w-6 h-6 text-slate-400" />
            <span>Tidak ada data sarana prasarana yang sesuai filter.</span>
          </div>
        )}
      </div>
    </div>
  );
}
