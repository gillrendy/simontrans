import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileText,
  Layers,
  MapPin,
  Maximize2,
  Radio,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  DeviceItem,
  MaintenanceReport,
  Station,
  Technician,
  UserAccount,
} from '../types/transmisi';
import { getStationHealth } from '../utils/stationHelpers';
import { TechAvatar } from './TechAvatar';

export type PinMenuTab = 'power' | 'teknisi' | 'perangkat' | 'laporan';
type MapLayerMode = 'satellite' | 'street';

interface SouthSumatraMapProps {
  stations: Station[];
  devices: DeviceItem[];
  technicians: Technician[];
  reports: MaintenanceReport[];
  currentUser: UserAccount;
  onUpdatePower: (stationId: string, forwardKw: number, reflectedW: number) => void;
  onJumpToReports: (stationId: string) => void;
}

// Sumatera Selatan provincial boundary polygon [lat, lon]
const SUMSEL_BORDER_COORDS: L.LatLngExpression[] = [
  [-1.65, 102.35],
  [-1.78, 103.45],
  [-2.05, 104.35],
  [-2.28, 104.88],
  [-2.52, 105.62],
  [-3.22, 105.94],
  [-4.02, 105.84],
  [-4.62, 104.95],
  [-4.88, 104.05],
  [-4.72, 103.12],
  [-4.22, 102.52],
  [-3.52, 102.18],
  [-2.62, 102.08],
  [-1.65, 102.35],
];

export function SouthSumatraMap({
  stations,
  devices,
  technicians,
  reports,
  currentUser,
  onUpdatePower,
  onJumpToReports,
}: SouthSumatraMapProps) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    stations[0]?.id ?? null
  );
  const [dropdownStationId, setDropdownStationId] = useState<string | null>(null);
  const [activePinTab, setActivePinTab] = useState<PinMenuTab>('perangkat');
  const [layerMode, setLayerMode] = useState<MapLayerMode>('satellite');
  const [powerInput, setPowerInput] = useState<string>('');
  const [reflectedInput, setReflectedInput] = useState<string>('');
  const [powerSavedMsg, setPowerSavedMsg] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pinClickHandlerRef = useRef<(st: Station) => void>(() => {});

  const selectedStation =
    stations.find((s) => s.id === selectedStationId) ?? stations[0] ?? null;

  const handlePinClick = (station: Station) => {
    setSelectedStationId(station.id);
    setDropdownStationId((prev) => (prev === station.id ? null : station.id));
    setPowerInput(String(station.forwardPowerKw));
    setReflectedInput(String(station.reflectedPowerW));
    setPowerSavedMsg(null);
  };

  pinClickHandlerRef.current = handlePinClick;

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-3.35, 103.95],
      zoom: 8,
      minZoom: 6,
      maxZoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    const baseGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);

    // Subtle Sumatera Selatan provincial boundary highlight
    L.polygon(SUMSEL_BORDER_COORDS, {
      color: '#38bdf8',
      weight: 2,
      dashArray: '6 4',
      fillColor: '#0ea5e9',
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(map);

    mapInstanceRef.current = map;
    baseLayerGroupRef.current = baseGroup;
    markerLayerGroupRef.current = markerGroup;

    // Ensure Leaflet measures container properly after layout paint
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      baseLayerGroupRef.current = null;
      markerLayerGroupRef.current = null;
    };
  }, []);

  // Switch Base Layer (Satellite vs Street)
  useEffect(() => {
    const baseGroup = baseLayerGroupRef.current;
    if (!baseGroup) return;

    baseGroup.clearLayers();

    if (layerMode === 'satellite') {
      // Real Satellite Imagery (Esri World Imagery)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; World Imagery',
          maxZoom: 17,
        }
      ).addTo(baseGroup);

      // Regional Boundaries & City Labels overlay on top of satellite imagery
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 17,
          opacity: 0.9,
        }
      ).addTo(baseGroup);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(baseGroup);
    }
  }, [layerMode]);

  // Render & Update Transmitter Station Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markerLayerGroupRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    stations.forEach((station) => {
      const { health } = getStationHealth(station, devices);
      const isSelected = selectedStationId === station.id;

      const pinBg =
        health === 'Normal'
          ? '#16A34A'
          : health === 'Gangguan Parsial'
          ? '#D97706'
          : '#DC2626';

      const innerGlyph =
        health === 'Normal'
          ? '<span style="width:8px;height:8px;border-radius:9999px;background:#fff;display:block;"></span>'
          : health === 'Gangguan Parsial'
          ? '<span style="color:#fff;font-size:11px;font-weight:700;line-height:1;">!</span>'
          : '<span style="color:#fff;font-size:11px;font-weight:700;line-height:1;">&times;</span>';

      const ringStyle = isSelected
        ? 'box-shadow: 0 0 0 5px rgba(56,189,248,0.5), 0 4px 10px rgba(0,0,0,0.45); transform: scale(1.12);'
        : 'box-shadow: 0 3px 8px rgba(0,0,0,0.45);';

      const icon = L.divIcon({
        className: 'simontrans-pin-wrapper',
        html: `<div style="width:26px;height:26px;border-radius:9999px;background:${pinBg};border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;cursor:pointer;${ringStyle}">${innerGlyph}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([station.latitude, station.longitude], { icon });

      marker.bindTooltip(
        `${station.region} · ${station.forwardPowerKw.toFixed(1)} kW`,
        {
          permanent: true,
          direction: 'bottom',
          offset: [0, 10],
          className: 'simontrans-tooltip',
        }
      );

      marker.on('click', () => {
        pinClickHandlerRef.current(station);
      });

      marker.addTo(markerGroup);
    });
  }, [stations, devices, selectedStationId]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((s) => [s.latitude, s.longitude] as [number, number])
      );
      map.fitBounds(bounds.pad(0.22));
    } else {
      map.setView([-3.35, 103.95], 8);
    }
  };

  const handleSelectDropdownOption = (station: Station, tab: PinMenuTab) => {
    setSelectedStationId(station.id);
    setActivePinTab(tab);
    setDropdownStationId(null);
    setPowerInput(String(station.forwardPowerKw));
    setReflectedInput(String(station.reflectedPowerW));
    setPowerSavedMsg(null);
  };

  const handlePowerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;
    const fKw = parseFloat(powerInput);
    const rW = parseFloat(reflectedInput);
    if (Number.isNaN(fKw) || fKw < 0 || Number.isNaN(rW) || rW < 0) return;
    onUpdatePower(selectedStation.id, fKw, rW);
    setPowerSavedMsg(`Data daya ${selectedStation.region} diperbarui.`);
    setTimeout(() => setPowerSavedMsg(null), 3000);
  };

  const stationDevices = selectedStation
    ? devices.filter((d) => d.stationId === selectedStation.id)
    : [];
  const stationTechs = selectedStation
    ? technicians.filter((t) => t.stationId === selectedStation.id)
    : [];
  const stationReports = selectedStation
    ? reports.filter((r) => r.stationId === selectedStation.id)
    : [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Peta Satelit Interaktif Titik Transmisi TVRI Sumatera Selatan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Klik pin lokasi pada peta satelit untuk melihat data daya, teknisi, kondisi perangkat, dan riwayat laporan.
          </p>
        </div>

        {/* Map legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Normal</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Gangguan Parsial</span>
          </span>
          <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-medium">
            <XCircle className="w-3.5 h-3.5" />
            <span>Kritis / Off-Air</span>
          </span>
        </div>
      </div>

      {/* Main split: Satellite Map canvas (7 cols) + Inspector panel (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 items-stretch">
        {/* Leaflet Satellite Map viewport */}
        <div className="xl:col-span-7 relative border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 h-[440px] lg:h-[520px] overflow-hidden bg-slate-900">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Top-right Map Controls: Layer Switcher & Reset View */}
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-md">
              <button
                type="button"
                onClick={() => setLayerMode('satellite')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  layerMode === 'satellite'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Satelit</span>
              </button>
              <button
                type="button"
                onClick={() => setLayerMode('street')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  layerMode === 'street'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Peta Jalan
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetView}
              className="h-8 px-2.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium shadow-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
              title="Fokus seluruh titik Sumatera Selatan"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fokus Sumsel</span>
            </button>
          </div>

          {/* Bottom-left active coordinates pill */}
          <div className="absolute bottom-3 left-3 z-[400] text-[11px] font-mono tabular-nums text-slate-100 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-700/80 pointer-events-none">
            {selectedStation
              ? `${selectedStation.code} · ${selectedStation.latitude.toFixed(4)}, ${selectedStation.longitude.toFixed(4)}`
              : 'Provinsi Sumatera Selatan'}
          </div>

          {/* Floating Pin Dropdown Menu when a pin is clicked */}
          {dropdownStationId && (() => {
            const st = stations.find((s) => s.id === dropdownStationId);
            if (!st) return null;
            const { health } = getStationHealth(st, devices);
            return (
              <div className="absolute top-14 right-3 z-[450] w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {st.name}
                    </div>
                    <div
                      className={`text-[11px] font-medium ${
                        health === 'Normal'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : health === 'Gangguan Parsial'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      Status: {health}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDropdownStationId(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label="Tutup menu pin"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDropdownOption(st, 'power')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Data Power / Daya</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDropdownOption(st, 'teknisi')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Teknisi Lokasi</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDropdownOption(st, 'perangkat')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Kondisi Perangkat</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDropdownOption(st, 'laporan')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Riwayat Laporan Pemeliharaan</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Side: Station Detail Inspector Panel */}
        <div className="xl:col-span-5 flex flex-col bg-white dark:bg-slate-900">
          {selectedStation ? (
            <>
              {/* Selected station summary header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="font-mono">{selectedStation.code}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{selectedStation.channelFreq}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      {selectedStation.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {selectedStation.address}
                    </p>
                  </div>
                </div>

                {/* 4-option Pin Menu Tabs */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {[
                    { id: 'power' as PinMenuTab, label: 'Data Daya' },
                    { id: 'teknisi' as PinMenuTab, label: 'Teknisi' },
                    { id: 'perangkat' as PinMenuTab, label: 'Perangkat' },
                    { id: 'laporan' as PinMenuTab, label: 'Riwayat' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActivePinTab(tab.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activePinTab === tab.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspector Content */}
              <div className="p-5 flex-1 overflow-y-auto max-h-[380px] xl:max-h-[410px]">
                {/* TAB 1: DATA POWER / DAYA */}
                {activePinTab === 'power' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Total Daya TX
                        </div>
                        <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                          {selectedStation.forwardPowerKw.toFixed(2)} kW
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Maks {selectedStation.maxCapacityKw.toFixed(1)} kW
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Reflected Power
                        </div>
                        <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                          {selectedStation.reflectedPowerW} W
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ambang &lt; 100 W
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Utilisasi
                        </div>
                        <div className="text-xl font-semibold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-0.5">
                          {Math.round(
                            (selectedStation.forwardPowerKw /
                              selectedStation.maxCapacityKw) *
                              100
                          )}
                          %
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {selectedStation.lastPowerInputBy}
                        </div>
                      </div>
                    </div>

                    {/* Mini power history bar chart */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>Grafik Daya Pemancar (6 Jam Terakhir)</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {selectedStation.lastPowerUpdatedAt}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-2 items-end h-24 pt-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                        {selectedStation.powerHistory.map((pt, idx) => {
                          const pct = Math.min(
                            100,
                            Math.round((pt.powerKw / selectedStation.maxCapacityKw) * 100)
                          );
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                              <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                {pt.powerKw.toFixed(1)}
                              </span>
                              <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800 rounded-t h-14 flex items-end overflow-hidden">
                                <div
                                  className={`w-full rounded-t transition-all ${
                                    pt.powerKw === 0
                                      ? 'bg-red-500'
                                      : 'bg-sky-600 dark:bg-sky-500'
                                  }`}
                                  style={{ height: `${Math.max(pt.powerKw > 0 ? 12 : 4, pct)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                {pt.time}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Real-time field power input form */}
                    <form onSubmit={handlePowerSubmit} className="pt-1 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Input Pembacaan Daya Lapangan ({currentUser.fullName})
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            Forward Power (kW)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={selectedStation.maxCapacityKw}
                            value={powerInput}
                            onChange={(e) => setPowerInput(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            Reflected Power (W)
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={reflectedInput}
                            onChange={(e) => setReflectedInput(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                        >
                          Simpan Data Daya
                        </button>
                        {powerSavedMsg && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {powerSavedMsg}
                          </span>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 2: TEKNISI */}
                {activePinTab === 'teknisi' && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {stationTechs.length} petugas bertugas di {selectedStation.region}
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {stationTechs.map((tech) => (
                        <div key={tech.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <TechAvatar
                              name={tech.name}
                              avatarKey={tech.avatarKey}
                              avatarDataUrl={tech.avatarDataUrl}
                              sizeClass="w-10 h-10"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {tech.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {tech.roleStatus} · {tech.education} · {tech.gender}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                {tech.shift} · {tech.phone}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                              tech.onDuty
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {tech.onDuty ? 'On Duty' : 'Off Duty'}
                          </span>
                        </div>
                      ))}
                      {stationTechs.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          Belum ada data teknisi untuk lokasi ini.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: KONDISI PERANGKAT */}
                {activePinTab === 'perangkat' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
                      <span>Total {stationDevices.length} perangkat terpantau</span>
                      <span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {stationDevices.filter((d) => d.condition === 'Normal').length} Normal
                        </span>
                        {' · '}
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {stationDevices.filter((d) => d.condition === 'Rusak').length} Rusak
                        </span>
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {stationDevices.map((dev) => {
                        const isNormal = dev.condition === 'Normal';
                        return (
                          <div key={dev.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {dev.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {dev.category} · {dev.brandModel}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {dev.notes}
                              </div>
                            </div>
                            <div
                              className={`text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1 ${
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 4: RIWAYAT LAPORAN PEMELIHARAAN TEKNIS */}
                {activePinTab === 'laporan' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {stationReports.length} riwayat laporan di {selectedStation.region}
                      </span>
                      <button
                        type="button"
                        onClick={() => onJumpToReports(selectedStation.id)}
                        className="text-sky-600 dark:text-sky-400 font-medium hover:underline whitespace-nowrap"
                      >
                        Buka semua tiket
                      </button>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {stationReports.map((rep) => (
                        <div key={rep.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {rep.id} · {rep.priority}
                            </span>
                            <span
                              className={`text-xs font-semibold whitespace-nowrap ${
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
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {rep.subject}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {rep.description}
                          </p>
                          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            {rep.submittedBy} · {rep.updatedAt}
                          </div>
                        </div>
                      ))}
                      {stationReports.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          Belum ada riwayat laporan pemeliharaan untuk lokasi ini.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <Radio className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              Pilih pin lokasi transmisi pada peta untuk melihat detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
