import {
  DeviceCategory,
  DeviceCondition,
  DeviceItem,
  EmploymentStatus,
  GenderCode,
  InfrastructureItem,
  MaintenanceReport,
  ReportPriority,
  ScheduleAssignment,
  ScheduleDayBucket,
  Station,
  Technician,
  TicketHistoryEntry,
  TicketStatus,
  TransmisiDatabase,
  UserAccount,
  UserRole,
} from '../types/transmisi';

import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    __SIMONTRANS_API_CONFIG__?: {
      sheetsApiBase?: string;
      dbSpreadsheetId?: string;
      scheduleSpreadsheetId?: string;
    };
  }
}

export const STORAGE_DB_SPREADSHEET_ID_KEY = 'simontrans_db_spreadsheet_id_v1';
export const STORAGE_SCHEDULE_SPREADSHEET_ID_KEY =
  'simontrans_schedule_spreadsheet_id_v1';

export const SHEET_TABS = {
  DEVICES: 'Data Perangkat',
  INFRASTRUCTURE: 'Data Sarana Prasarana',
  TOWERS: 'Data Menara',
  PERSONNEL: 'Data Pegawai Transmisi',
  REPORTS: 'Data Riwayat Laporan',
} as const;

const MONTHS_ID = [
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

const MONTHS_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function getSheetsApiBaseUrl(): string {
  const meta =
    typeof document !== 'undefined'
      ? document
          .querySelector('meta[name="simontrans-sheets-api"]')
          ?.getAttribute('content')
          ?.trim()
      : '';
  const globalUrl =
    typeof window !== 'undefined'
      ? window.__SIMONTRANS_API_CONFIG__?.sheetsApiBase?.trim()
      : '';
  return meta || globalUrl || 'https://sheets.googleapis.com/v4/spreadsheets';
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  const shortMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];
  return trimmed;
}

export function getConfiguredDbSpreadsheetId(): string {
  const saved = localStorage.getItem(STORAGE_DB_SPREADSHEET_ID_KEY)?.trim() ?? '';
  if (saved) return saved;
  const meta =
    document
      .querySelector('meta[name="simontrans-db-spreadsheet-id"]')
      ?.getAttribute('content')
      ?.trim() ?? '';
  const globalId =
    window.__SIMONTRANS_API_CONFIG__?.dbSpreadsheetId?.trim() ?? '';
  return extractSpreadsheetId(meta || globalId);
}

export function setConfiguredDbSpreadsheetId(idOrUrl: string): string {
  const id = extractSpreadsheetId(idOrUrl);
  if (id) {
    localStorage.setItem(STORAGE_DB_SPREADSHEET_ID_KEY, id);
  } else {
    localStorage.removeItem(STORAGE_DB_SPREADSHEET_ID_KEY);
  }
  return id;
}

export function getConfiguredScheduleSpreadsheetId(): string {
  const saved =
    localStorage.getItem(STORAGE_SCHEDULE_SPREADSHEET_ID_KEY)?.trim() ?? '';
  if (saved) return saved;
  const meta =
    document
      .querySelector('meta[name="simontrans-schedule-spreadsheet-id"]')
      ?.getAttribute('content')
      ?.trim() ?? '';
  const globalId =
    window.__SIMONTRANS_API_CONFIG__?.scheduleSpreadsheetId?.trim() ?? '';
  return extractSpreadsheetId(meta || globalId);
}

export function setConfiguredScheduleSpreadsheetId(idOrUrl: string): string {
  const id = extractSpreadsheetId(idOrUrl);
  if (id) {
    localStorage.setItem(STORAGE_SCHEDULE_SPREADSHEET_ID_KEY, id);
  } else {
    localStorage.removeItem(STORAGE_SCHEDULE_SPREADSHEET_ID_KEY);
  }
  return id;
}

export function getCurrentIndonesianMonthName(date = new Date()): string {
  return MONTHS_ID[date.getMonth()] ?? 'November';
}

async function sheetsFetch<T>(
  path: string,
  accessToken: string | null,
  init: RequestInit = {}
): Promise<T> {
  const base = getSheetsApiBaseUrl().replace(/\/$/, '');
  const method = (init.method || 'GET').toUpperCase();
  const isRead = method === 'GET';

  let url = `${base}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (isRead && firebaseConfig.apiKey) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}key=${encodeURIComponent(firebaseConfig.apiKey)}`;
  } else {
    throw new Error('Autentikasi Google Sheets diperlukan.');
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const json = (await res.json()) as {
        error?: { message?: string; status?: string };
      };
      if (json?.error?.message) {
        errText = json.error.message;
      }
    } catch {
      // ignore parse fallback
    }
    throw new Error(errText);
  }

  return (await res.json()) as T;
}

export async function pingSpreadsheetConnection(
  spreadsheetId: string,
  accessToken: string | null
): Promise<{
  connected: boolean;
  title?: string;
  error?: string;
}> {
  if (!spreadsheetId) {
    return {
      connected: false,
      error: 'Spreadsheet ID belum diisi',
    };
  }
  try {
    const meta = await sheetsFetch<{
      spreadsheetId: string;
      properties?: { title?: string };
    }>(
      `/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title`,
      accessToken
    );
    return {
      connected: Boolean(meta.spreadsheetId),
      title: meta.properties?.title || 'SIMONTRANS Spreadsheet',
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Koneksi gagal',
    };
  }
}

function buildDevicesTable(devices: DeviceItem[]): string[][] {
  const header = [
    'ID',
    'Station ID',
    'Nama Perangkat',
    'Kategori',
    'Merk / Tipe',
    'Kondisi',
    'Aktif',
    'Terakhir Dicek',
    'Catatan',
  ];
  const rows = devices.map((d) => [
    d.id,
    d.stationId,
    d.name,
    d.category,
    d.brandModel,
    d.condition,
    d.active ? 'TRUE' : 'FALSE',
    d.lastChecked,
    d.notes,
  ]);
  return [header, ...rows];
}

function buildInfrastructureTable(infra: InfrastructureItem[]): string[][] {
  const header = [
    'ID',
    'Station ID',
    'Lokasi Satuan',
    'Luas Tanah',
    'Status Tanah',
    'Luas Ruang TX',
    'Kondisi Ruang TX',
    'Jumlah Rumah Dinas',
    'Kondisi Rumah Dinas',
    'Luas Ruang Genset',
    'Kondisi Ruang Genset',
    'Tinggi Menara (m)',
    'Kondisi Menara',
    'Info Antena',
    'Cakupan Siaran',
  ];
  const rows = infra.map((item) => [
    item.id,
    item.stationId,
    item.stationName,
    item.landArea,
    item.landStatus,
    item.txRoomArea,
    item.txRoomCondition,
    String(item.officialHouseCount),
    item.officialHouseCondition,
    item.gensetRoomArea,
    item.gensetRoomCondition,
    String(item.towerHeightM),
    item.towerCondition,
    item.antennaInfo,
    item.coverageArea,
  ]);
  return [header, ...rows];
}

function buildTowersTable(
  stations: Station[],
  infrastructure: InfrastructureItem[]
): string[][] {
  const header = [
    'ID',
    'Kode Site',
    'Nama Satuan',
    'Wilayah',
    'Alamat',
    'Latitude',
    'Longitude',
    'Kanal / Frekuensi',
    'Kapasitas Maks (kW)',
    'Daya Forward (kW)',
    'Daya Reflected (W)',
    'Tinggi Menara (m)',
    'Kondisi Menara',
    'Antena',
    'Cakupan Layanan',
    'Input Daya Oleh',
    'Waktu Update Daya',
    'Riwayat Daya (JSON)',
  ];
  const rows = stations.map((st) => {
    const inf = infrastructure.find((i) => i.stationId === st.id);
    return [
      st.id,
      st.code,
      st.name,
      st.region,
      st.address,
      String(st.latitude),
      String(st.longitude),
      st.channelFreq,
      String(st.maxCapacityKw),
      String(st.forwardPowerKw),
      String(st.reflectedPowerW),
      String(inf?.towerHeightM ?? 75),
      inf?.towerCondition ?? 'Baik',
      inf?.antennaInfo ?? '-',
      inf?.coverageArea ?? st.region,
      st.lastPowerInputBy,
      st.lastPowerUpdatedAt,
      JSON.stringify(st.powerHistory ?? []),
    ];
  });
  return [header, ...rows];
}

function buildPersonnelTable(
  users: UserAccount[],
  technicians: Technician[]
): string[][] {
  const header = [
    'ID',
    'Username',
    'Password',
    'Nama Lengkap',
    'Role',
    'Station ID',
    'Wilayah',
    'Gender',
    'Status Kepegawaian',
    'Jabatan',
    'On Duty',
    'Shift',
    'Telepon',
    'Avatar Key',
  ];

  // Merge users & technicians cleanly so every technician/admin is preserved
  const rows = users.map((u) => {
    const tech = technicians.find(
      (t) => t.id === u.id || t.name.toLowerCase() === u.fullName.toLowerCase()
    );
    return [
      u.id,
      u.username,
      u.password,
      u.fullName,
      u.role,
      u.stationId,
      u.region,
      u.gender,
      u.employmentStatus,
      u.jabatan,
      (tech?.onDuty ?? u.onDuty) ? 'TRUE' : 'FALSE',
      tech?.shift ?? u.shift,
      tech?.phone ?? u.phone,
      u.avatarKey,
    ];
  });

  // Include any technician without a matching user row just in case
  technicians.forEach((t) => {
    const exists = users.some(
      (u) => u.id === t.id || u.fullName.toLowerCase() === t.name.toLowerCase()
    );
    if (!exists) {
      rows.push([
        t.id,
        t.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        'teknisi123',
        t.name,
        'Teknisi',
        t.stationId,
        t.region,
        t.gender,
        t.employmentStatus,
        t.jabatan,
        t.onDuty ? 'TRUE' : 'FALSE',
        t.shift,
        t.phone,
        t.avatarKey,
      ]);
    }
  });

  return [header, ...rows];
}

function buildReportsTable(reports: MaintenanceReport[]): string[][] {
  const header = [
    'ID Tiket',
    'Station ID',
    'Subjek',
    'Deskripsi',
    'Nama Lampiran',
    'Prioritas',
    'Status',
    'Pelapor',
    'Dibuat Pada',
    'Diperbarui Pada',
    'Catatan Admin',
    'Riwayat Status (JSON)',
  ];
  const rows = reports.map((r) => [
    r.id,
    r.stationId,
    r.subject,
    r.description,
    r.attachmentName ?? '',
    r.priority,
    r.status,
    r.submittedBy,
    r.createdAt,
    r.updatedAt,
    r.adminNote,
    JSON.stringify(r.history ?? []),
  ]);
  return [header, ...rows];
}

export async function syncUnifiedSpreadsheetDb(
  spreadsheetId: string,
  db: TransmisiDatabase,
  accessToken: string
): Promise<void> {
  const rangesToClear = [
    `'${SHEET_TABS.DEVICES}'!A:Z`,
    `'${SHEET_TABS.INFRASTRUCTURE}'!A:Z`,
    `'${SHEET_TABS.TOWERS}'!A:Z`,
    `'${SHEET_TABS.PERSONNEL}'!A:Z`,
    `'${SHEET_TABS.REPORTS}'!A:Z`,
  ];

  await sheetsFetch(
    `/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ ranges: rangesToClear }),
    }
  );

  const data = [
    {
      range: `'${SHEET_TABS.DEVICES}'!A1`,
      values: buildDevicesTable(db.devices),
    },
    {
      range: `'${SHEET_TABS.INFRASTRUCTURE}'!A1`,
      values: buildInfrastructureTable(db.infrastructure),
    },
    {
      range: `'${SHEET_TABS.TOWERS}'!A1`,
      values: buildTowersTable(db.stations, db.infrastructure),
    },
    {
      range: `'${SHEET_TABS.PERSONNEL}'!A1`,
      values: buildPersonnelTable(db.users, db.technicians),
    },
    {
      range: `'${SHEET_TABS.REPORTS}'!A1`,
      values: buildReportsTable(db.reports),
    },
  ];

  await sheetsFetch(
    `/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );
}

export async function createUnifiedDatabaseSpreadsheet(
  seedDb: TransmisiDatabase,
  accessToken: string
): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}> {
  const title = 'SIMONTRANS TVRI Sumsel - Database Live';
  const created = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
  }>('', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title,
        locale: 'id_ID',
      },
      sheets: [
        { properties: { title: SHEET_TABS.DEVICES, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.INFRASTRUCTURE, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.TOWERS, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.PERSONNEL, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.REPORTS, gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  await syncUnifiedSpreadsheetDb(created.spreadsheetId, seedDb, accessToken);

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl:
      created.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
    title: created.properties?.title || title,
  };
}

export async function fetchUnifiedSpreadsheetDb(
  spreadsheetId: string,
  accessToken: string | null,
  fallbackDb: TransmisiDatabase
): Promise<TransmisiDatabase> {
  const ranges = [
    `'${SHEET_TABS.DEVICES}'!A1:I500`,
    `'${SHEET_TABS.INFRASTRUCTURE}'!A1:O200`,
    `'${SHEET_TABS.TOWERS}'!A1:R200`,
    `'${SHEET_TABS.PERSONNEL}'!A1:N500`,
    `'${SHEET_TABS.REPORTS}'!A1:L500`,
  ];

  const query = ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&');

  const res = await sheetsFetch<{
    valueRanges?: Array<{ range?: string; values?: string[][] }>;
  }>(`/${encodeURIComponent(spreadsheetId)}/values:batchGet?${query}`, accessToken);

  const valueRanges = res.valueRanges ?? [];
  const devicesRows = (valueRanges[0]?.values ?? []).slice(1);
  const infraRows = (valueRanges[1]?.values ?? []).slice(1);
  const towersRows = (valueRanges[2]?.values ?? []).slice(1);
  const personnelRows = (valueRanges[3]?.values ?? []).slice(1);
  const reportsRows = (valueRanges[4]?.values ?? []).slice(1);

  const devices: DeviceItem[] =
    devicesRows.length > 0
      ? devicesRows
          .filter((r) => r[0] && r[2])
          .map((r) => {
            const condRaw = (r[5] || 'Normal').trim();
            const condition: DeviceCondition =
              condRaw === 'Rusak'
                ? 'Rusak'
                : condRaw === 'Proses Perbaikan'
                ? 'Proses Perbaikan'
                : 'Normal';
            return {
              id: r[0],
              stationId: r[1] || 'st-plg',
              name: r[2],
              category: (r[3] as DeviceCategory) || 'Pemancar',
              brandModel: r[4] || '-',
              condition,
              active: condition !== 'Rusak' && r[6] !== 'FALSE',
              lastChecked: r[7] || '-',
              notes: r[8] || '',
            };
          })
      : fallbackDb.devices;

  const infrastructure: InfrastructureItem[] =
    infraRows.length > 0
      ? infraRows
          .filter((r) => r[0] && r[1])
          .map((r) => ({
            id: r[0],
            stationId: r[1],
            stationName: r[2] || r[1],
            landArea: r[3] || '-',
            landStatus: r[4] || '-',
            txRoomArea: r[5] || '-',
            txRoomCondition: r[6] || '-',
            officialHouseCount: Number(r[7]) || 0,
            officialHouseCondition: r[8] || '-',
            gensetRoomArea: r[9] || '-',
            gensetRoomCondition: r[10] || '-',
            towerHeightM: Number(r[11]) || 0,
            towerCondition: r[12] || '-',
            antennaInfo: r[13] || '-',
            coverageArea: r[14] || '-',
          }))
      : fallbackDb.infrastructure;

  const stations: Station[] =
    towersRows.length > 0
      ? towersRows
          .filter((r) => r[0] && r[2])
          .map((r) => {
            const existing = fallbackDb.stations.find((s) => s.id === r[0]);
            let parsedHistory = existing?.powerHistory ?? [];
            if (r[17]) {
              try {
                const candidate = JSON.parse(r[17]);
                if (Array.isArray(candidate) && candidate.length > 0) {
                  parsedHistory = candidate;
                }
              } catch {
                // fallback to existing
              }
            }
            return {
              id: r[0],
              code: r[1] || r[0],
              name: r[2],
              region: r[3] || '-',
              address: r[4] || '-',
              latitude: parseFloat(r[5]) || existing?.latitude || -2.976,
              longitude: parseFloat(r[6]) || existing?.longitude || 104.775,
              channelFreq: r[7] || '-',
              maxCapacityKw: parseFloat(r[8]) || existing?.maxCapacityKw || 5,
              forwardPowerKw: parseFloat(r[9]) || 0,
              reflectedPowerW: parseFloat(r[10]) || 0,
              lastPowerInputBy: r[15] || 'Tim Transmisi',
              lastPowerUpdatedAt: r[16] || '-',
              powerHistory: parsedHistory,
            };
          })
      : fallbackDb.stations;

  const users: UserAccount[] =
    personnelRows.length > 0
      ? personnelRows
          .filter((r) => r[0] && r[3])
          .map((r) => {
            const existingUser = fallbackDb.users.find((u) => u.id === r[0]);
            const gender: GenderCode = r[7] === 'P' ? 'P' : 'L';
            const role: UserRole = r[4] === 'Admin' ? 'Admin' : 'Teknisi';
            const empStatus: EmploymentStatus =
              r[8] === 'PPPK' ? 'PPPK' : 'PNS';
            const avatarKey =
              (r[13] as UserAccount['avatarKey']) ||
              existingUser?.avatarKey ||
              (role === 'Admin'
                ? 'coord_admin'
                : gender === 'P'
                ? 'tech_female_1'
                : 'tech_male_1');
            return {
              id: r[0],
              username: r[1] || r[0],
              password: r[2] || 'teknisi123',
              fullName: r[3],
              role,
              stationId: r[5] || 'st-plg',
              region: r[6] || 'Palembang',
              gender,
              employmentStatus: empStatus,
              jabatan: r[9] || 'Operator',
              onDuty: r[10] !== 'FALSE',
              shift: r[11] || 'Shift 2 (08.00 - 16.00)',
              phone: r[12] || '0812-7000-0000',
              avatarKey,
              avatarDataUrl: existingUser?.avatarDataUrl ?? null,
            };
          })
      : fallbackDb.users;

  const technicians: Technician[] =
    personnelRows.length > 0
      ? users.map((u) => ({
          id: u.id,
          name: u.fullName,
          stationId: u.stationId,
          region: u.region,
          gender: u.gender,
          employmentStatus: u.employmentStatus,
          jabatan: u.jabatan,
          onDuty: u.onDuty,
          shift: u.shift,
          phone: u.phone,
          avatarKey: u.avatarKey,
          avatarDataUrl: u.avatarDataUrl ?? null,
        }))
      : fallbackDb.technicians;

  const reports: MaintenanceReport[] =
    reportsRows.length > 0
      ? reportsRows
          .filter((r) => r[0] && r[2])
          .map((r) => {
            const existing = fallbackDb.reports.find((rep) => rep.id === r[0]);
            let history: TicketHistoryEntry[] = existing?.history ?? [];
            if (r[11]) {
              try {
                const parsed = JSON.parse(r[11]);
                if (Array.isArray(parsed)) history = parsed;
              } catch {
                // ignore
              }
            }
            const status = (r[6] as TicketStatus) || 'Pengajuan';
            const priority = (r[5] as ReportPriority) === 'Urgent' ? 'Urgent' : 'Biasa';
            return {
              id: r[0],
              stationId: r[1] || 'st-plg',
              subject: r[2],
              description: r[3] || '',
              attachmentName: r[4] || null,
              attachmentDataUrl: existing?.attachmentDataUrl ?? null,
              priority,
              status,
              submittedBy: r[7] || 'Teknisi',
              createdAt: r[8] || '-',
              updatedAt: r[9] || '-',
              adminNote: r[10] || '',
              history,
            };
          })
      : fallbackDb.reports;

  return {
    ...fallbackDb,
    stations,
    devices,
    infrastructure,
    users,
    technicians,
    reports,
  };
}

export function mapMatrixShiftCode(codeRaw: string): {
  label: string;
  isOffDuty: boolean;
} {
  const code = codeRaw.trim().toUpperCase();
  if (code === 'M') {
    return { label: 'Shift 3 (16.00 - 24.00)', isOffDuty: false };
  }
  if (code === 'S') {
    return { label: 'Shift 2 (08.00 - 16.00)', isOffDuty: false };
  }
  if (code === 'P') {
    return { label: 'Shift 1 (00.00 - 08.00)', isOffDuty: false };
  }
  if (code === 'L') {
    return { label: 'Libur / Off Duty', isOffDuty: true };
  }
  if (code === 'DL') {
    return { label: 'Dinas Luar / Off Duty', isOffDuty: true };
  }
  if (code === 'C') {
    return { label: 'Cuti / Off Duty', isOffDuty: true };
  }
  return { label: code || 'Shift 2 (08.00 - 16.00)', isOffDuty: false };
}

function formatShortDateId(date: Date): string {
  const day = date.getDate();
  const mon = MONTHS_SHORT_ID[date.getMonth()] ?? 'Nov';
  const year = date.getFullYear();
  return `${day} ${mon} ${year}`;
}

export function parseMonthlyScheduleMatrix(
  rows: string[][],
  targetDate: Date,
  technicians: Technician[],
  stations: Station[]
): ScheduleAssignment[] {
  if (!rows || rows.length === 0) return [];

  // Find the row containing day numbers 1..31
  let dayHeaderRowIdx = -1;
  const dayColMap = new Map<number, number>(); // dayNumber (1..31) -> column index

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r] ?? [];
    const candidateMap = new Map<number, number>();
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? '').trim();
      if (/^\d{1,2}$/.test(cell)) {
        const num = Number(cell);
        if (num >= 1 && num <= 31 && !candidateMap.has(num)) {
          candidateMap.set(num, c);
        }
      }
    }
    if (candidateMap.size >= 15) {
      dayHeaderRowIdx = r;
      candidateMap.forEach((colIdx, dayNum) => dayColMap.set(dayNum, colIdx));
      break;
    }
  }

  if (dayHeaderRowIdx === -1 || dayColMap.size === 0) return [];

  const today = new Date(targetDate);
  const yesterday = new Date(targetDate);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(targetDate);
  tomorrow.setDate(today.getDate() + 1);

  const buckets: Array<{
    bucket: ScheduleDayBucket;
    dayNum: number;
    dateLabel: string;
  }> = [
    {
      bucket: 'Kemarin',
      dayNum: yesterday.getDate(),
      dateLabel: formatShortDateId(yesterday),
    },
    {
      bucket: 'Hari Ini',
      dayNum: today.getDate(),
      dateLabel: formatShortDateId(today),
    },
    {
      bucket: 'Besok',
      dayNum: tomorrow.getDate(),
      dateLabel: formatShortDateId(tomorrow),
    },
  ];

  // Detect name column (typically col 1)
  const assignments: ScheduleAssignment[] = [];
  for (let r = dayHeaderRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const noCell = (row[0] ?? '').trim();
    const nameCell = (row[1] ?? '').trim();

    if (!/^\d+$/.test(noCell) || !nameCell) continue;

    // Match against known technician profile for accurate region & role
    const normalizedName = nameCell.toLowerCase().replace(/\./g, '').trim();
    const matchedTech = technicians.find((t) => {
      const tNorm = t.name.toLowerCase().replace(/\./g, '').trim();
      return (
        tNorm === normalizedName ||
        normalizedName.startsWith(tNorm) ||
        tNorm.startsWith(normalizedName)
      );
    });
    const matchedStation = matchedTech
      ? stations.find((s) => s.id === matchedTech.stationId)
      : undefined;

    const region = matchedStation?.region ?? matchedTech?.region ?? 'Palembang';
    const roleStatus = matchedTech?.jabatan ?? 'Operator';

    buckets.forEach((b) => {
      const colIdx = dayColMap.get(b.dayNum);
      if (colIdx === undefined) return;
      const rawCode = (row[colIdx] ?? '').trim();
      if (!rawCode) return;

      const mapped = mapMatrixShiftCode(rawCode);
      assignments.push({
        id: `sch-sheet-${b.bucket}-${noCell}-${r}`,
        dayBucket: b.bucket,
        dateLabel: b.dateLabel,
        stationRegion: region,
        technicianName: matchedTech?.name ?? nameCell,
        roleStatus,
        shift: mapped.label,
        notes: `Kode Jadwal: ${rawCode.toUpperCase()} (${
          mapped.isOffDuty ? 'Off Duty' : 'Bertugas'
        })`,
      });
    });
  }

  return assignments;
}

export function parseCsvMatrixText(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export async function fetchScheduleFromSpreadsheet(
  scheduleSpreadsheetId: string,
  accessToken: string | null,
  targetDate: Date,
  technicians: Technician[],
  stations: Station[]
): Promise<{
  schedules: ScheduleAssignment[];
  sheetTitle: string;
  spreadsheetTitle: string;
}> {
  const meta = await sheetsFetch<{
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(
    `/${encodeURIComponent(
      scheduleSpreadsheetId
    )}?fields=properties.title,sheets.properties.title`,
    accessToken
  );

  const tabTitles = (meta.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  const targetMonth = getCurrentIndonesianMonthName(targetDate).toLowerCase();
  const shortMonth = MONTHS_SHORT_ID[targetDate.getMonth()]?.toLowerCase() ?? '';

  const matchedTab =
    tabTitles.find((t) => t.toLowerCase() === targetMonth) ||
    tabTitles.find((t) => t.toLowerCase().includes(targetMonth)) ||
    tabTitles.find((t) => shortMonth && t.toLowerCase().includes(shortMonth)) ||
    tabTitles[0];

  if (!matchedTab) {
    throw new Error('Sheet jadwal tidak ditemukan di spreadsheet jadwal.');
  }

  const valuesRes = await sheetsFetch<{ values?: string[][] }>(
    `/${encodeURIComponent(scheduleSpreadsheetId)}/values/${encodeURIComponent(
      `'${matchedTab}'!A1:AZ80`
    )}`,
    accessToken
  );

  const schedules = parseMonthlyScheduleMatrix(
    valuesRes.values ?? [],
    targetDate,
    technicians,
    stations
  );

  return {
    schedules,
    sheetTitle: matchedTab,
    spreadsheetTitle: meta.properties?.title || 'Spreadsheet Jadwal',
  };
}

export async function fetchBundledMatrixScheduleCsv(
  targetDate: Date,
  technicians: Technician[],
  stations: Station[]
): Promise<ScheduleAssignment[]> {
  try {
    const res = await fetch(
      './assets/aistudio/Jadwal_Dinas_Transmisi_TVRI_Sumatera_Selatan_2026_f116a3e3'
    );
    if (!res.ok) return [];
    const text = await res.text();
    const matrix = parseCsvMatrixText(text);
    return parseMonthlyScheduleMatrix(matrix, targetDate, technicians, stations);
  } catch {
    return [];
  }
}
