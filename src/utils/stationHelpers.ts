import { DeviceItem, Station } from '../types/transmisi';

export type StationHealth = 'Normal' | 'Gangguan Parsial' | 'Kritis';

export function getStationHealth(
  station: Station,
  devices: DeviceItem[]
): {
  health: StationHealth;
  normalCount: number;
  faultCount: number;
  totalCount: number;
} {
  const stationDevices = devices.filter((d) => d.stationId === station.id);
  const faultCount = stationDevices.filter((d) => d.condition === 'Rusak').length;
  const normalCount = stationDevices.length - faultCount;

  const transmitterFault = stationDevices.some(
    (d) => d.category === 'Pemancar' && d.condition === 'Rusak'
  );

  let health: StationHealth = 'Normal';
  if (transmitterFault || station.forwardPowerKw <= 0 || faultCount >= 2) {
    health = faultCount > 0 && transmitterFault ? 'Kritis' : faultCount >= 2 ? 'Gangguan Parsial' : 'Kritis';
    if (!transmitterFault && station.forwardPowerKw > 0 && faultCount >= 1) {
      health = 'Gangguan Parsial';
    }
  } else if (faultCount > 0) {
    health = 'Gangguan Parsial';
  }

  return {
    health,
    normalCount,
    faultCount,
    totalCount: stationDevices.length,
  };
}

// Geographic projection bounds for Sumatera Selatan (SVG viewBox 0 0 880 540)
export const SUMSEL_BOUNDS = {
  minLon: 102.05,
  maxLon: 106.15,
  maxLat: -1.65,
  minLat: -4.95,
  width: 880,
  height: 540,
};

export function projectLatLonToSvg(lat: number, lon: number): { x: number; y: number } {
  const { minLon, maxLon, minLat, maxLat, width, height } = SUMSEL_BOUNDS;
  const x = ((lon - minLon) / (maxLon - minLon)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  return {
    x: Math.max(36, Math.min(width - 36, x)),
    y: Math.max(36, Math.min(height - 36, y)),
  };
}

export function formatNowWIB(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} WIB`;
}
