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

declare global {
  interface Window {
    __SIMONTRANS_API_CONFIG__?: {
      sheetsApiBase?: string;
      dbSpreadsheetId?: string;
      scheduleSpreadsheetId?: string;
      sheetsWebhookUrl?: string;
    };
  }
}

export const STORAGE_DB_SPREADSHEET_ID_KEY = 'simontrans_db_spreadsheet_id_v1';
export const STORAGE_SCHEDULE_SPREADSHEET_ID_KEY =
  'simontrans_schedule_spreadsheet_id_v1';
export const STORAGE_SHEETS_WEBHOOK_URL_KEY = 'simontrans_sheets_webhook_url_v1';

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

export function getConfiguredSheetsWebhookUrl(): string {
  const saved =
    localStorage.getItem(STORAGE_SHEETS_WEBHOOK_URL_KEY)?.trim() ?? '';
  if (saved) return saved;
  const meta =
    typeof document !== 'undefined'
      ? document
          .querySelector('meta[name="simontrans-sheets-webhook"]')
          ?.getAttribute('content')
          ?.trim() ?? ''
      : '';
  const globalUrl =
    typeof window !== 'undefined'
      ? window.__SIMONTRANS_API_CONFIG__?.sheetsWebhookUrl?.trim() ?? ''
      : '';
  return meta || globalUrl;
}

export function setConfiguredSheetsWebhookUrl(rawUrl: string): string {
  const clean = rawUrl.trim();
  if (clean) {
    localStorage.setItem(STORAGE_SHEETS_WEBHOOK_URL_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_SHEETS_WEBHOOK_URL_KEY);
  }
  return clean;
}

export const APPS_SCRIPT_BRIDGE_CODE = `// Tempel kode ini di Google Spreadsheet Database -> Ekstensi -> Apps Script
// Lalu klik Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'SIMONTRANS Sheets Bridge' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var ss = body.spreadsheetId
      ? SpreadsheetApp.openById(body.spreadsheetId)
      : SpreadsheetApp.getActiveSpreadsheet();

    if (body.action === 'appendReport' && Array.isArray(body.row)) {
      var sheetName = body.sheetName || 'Data Riwayat Laporan';
      var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
      if (sheet.getLastRow() === 0 && Array.isArray(body.header)) {
        sheet.getRange(1, 1, 1, body.header.length).setValues([body.header]);
      }
      var targetId = String(body.row[0] || '');
      var lastRow = sheet.getLastRow();
      var updatedRow = false;
      if (lastRow >= 2 && targetId) {
        var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === targetId) {
            sheet.getRange(i + 2, 1, 1, body.row.length).setValues([body.row]);
            updatedRow = true;
            break;
          }
        }
      }
      if (!updatedRow) {
        if (lastRow >= 1) {
          sheet.insertRowAfter(1);
          sheet.getRange(2, 1, 1, body.row.length).setValues([body.row]);
        } else {
          sheet.getRange(1, 1, 1, body.row.length).setValues([body.row]);
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'appendReport', id: targetId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'syncTabs' && Array.isArray(body.tabs)) {
      for (var t = 0; t < body.tabs.length; t++) {
        var tab = body.tabs[t];
        var s = ss.getSheetByName(tab.sheetName) || ss.insertSheet(tab.sheetName);
        s.clearContents();
        if (Array.isArray(tab.values) && tab.values.length > 0 && tab.values[0].length > 0) {
          s.getRange(1, 1, tab.values.length, tab.values[0].length).setValues(tab.values);
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'syncTabs' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Aksi tidak dikenal' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export function getCurrentIndonesianMonthName(date = new Date()): string {
  return MONTHS_ID[date.getMonth()] ?? 'November';
}

async function sheetsFetch<T>(
  path: string,
  accessToken: string | null,
  init: RequestInit = {}
): Promise<T> {
  if (!accessToken) {
    throw new Error('Autentikasi Google Sheets diperlukan untuk operasi ini.');
  }
  const base = getSheetsApiBaseUrl().replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
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

interface GvizTable {
  parsedNumHeaders?: number;
  cols?: Array<{ id?: string; label?: string; type?: string }>;
  rows?: Array<{
    c?: Array<{ v?: unknown; f?: string | null } | null>;
  }>;
}

function gvizCellToString(
  cell: { v?: unknown; f?: string | null } | null | undefined,
  colType?: string
): string {
  if (!cell) return '';
  if (colType === 'boolean' && cell.v !== undefined && cell.v !== null) {
    return cell.v ? 'TRUE' : 'FALSE';
  }
  if (cell.f !== undefined && cell.f !== null && cell.f !== '') {
    // Prefer raw numeric v if it's a clean number without locale thousand separators
    if (typeof cell.v === 'number' && !String(cell.f).includes('Date')) {
      return String(cell.v);
    }
    return String(cell.f);
  }
  if (cell.v !== undefined && cell.v !== null) {
    return String(cell.v);
  }
  return '';
}

function gvizTableToRows(table: GvizTable): string[][] {
  const cols = table.cols ?? [];
  const rows: string[][] = [];

  if ((table.parsedNumHeaders ?? 0) > 0 && cols.some((c) => Boolean(c.label))) {
    rows.push(cols.map((c) => (c.label ?? '').trim()));
  }

  for (const r of table.rows ?? []) {
    const cells = r.c ?? [];
    rows.push(cols.map((col, idx) => gvizCellToString(cells[idx], col.type)));
  }

  return rows;
}

async function fetchGvizSheetRows(
  spreadsheetId: string,
  sheetTitle?: string,
  tqQuery?: string
): Promise<string[][]> {
  const params = new URLSearchParams({ tqx: 'out:json' });
  if (sheetTitle) params.set('sheet', sheetTitle);
  if (tqQuery) params.set('tq', tqQuery);

  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    spreadsheetId
  )}/gviz/tq?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match || !match[1]) {
    throw new Error(
      'Spreadsheet masih bersifat privat atau URL tidak dapat diakses publik.'
    );
  }

  const parsed = JSON.parse(match[1]) as {
    status?: string;
    errors?: Array<{ message?: string; detailed_message?: string }>;
    table?: GvizTable;
  };

  if (parsed.status === 'error' || !parsed.table) {
    const msg =
      parsed.errors?.[0]?.detailed_message ||
      parsed.errors?.[0]?.message ||
      'Gagal membaca sheet.';
    throw new Error(msg);
  }

  return gvizTableToRows(parsed.table);
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
    if (accessToken) {
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
    }

    // Without OAuth token, verify live access via Google Sheets public gviz endpoint
    await fetchGvizSheetRows(spreadsheetId, SHEET_TABS.DEVICES, 'select A limit 1');
    return {
      connected: true,
      title: `Spreadsheet ID ${spreadsheetId.slice(0, 12)}…`,
    };
  } catch (err) {
    // Fallback check on default first sheet if tab name differs
    if (!accessToken) {
      try {
        await fetchGvizSheetRows(spreadsheetId, undefined, 'select A limit 1');
        return {
          connected: true,
          title: `Spreadsheet ID ${spreadsheetId.slice(0, 12)}…`,
        };
      } catch (fallbackErr) {
        return {
          connected: false,
          error:
            fallbackErr instanceof Error ? fallbackErr.message : 'Koneksi gagal',
        };
      }
    }
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

export type UnifiedSheetTabKey =
  | typeof SHEET_TABS.DEVICES
  | typeof SHEET_TABS.INFRASTRUCTURE
  | typeof SHEET_TABS.TOWERS
  | typeof SHEET_TABS.PERSONNEL
  | typeof SHEET_TABS.REPORTS;

export async function syncSpreadsheetTabs(
  spreadsheetId: string,
  db: TransmisiDatabase,
  accessToken: string,
  tabs: UnifiedSheetTabKey[]
): Promise<void> {
  if (tabs.length === 0) return;

  const uniqueTabs = Array.from(new Set(tabs));
  const rangesToClear = uniqueTabs.map((tab) => `'${tab}'!A:Z`);

  await sheetsFetch(
    `/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ ranges: rangesToClear }),
    }
  );

  const tableBuilders: Record<UnifiedSheetTabKey, () => string[][]> = {
    [SHEET_TABS.DEVICES]: () => buildDevicesTable(db.devices),
    [SHEET_TABS.INFRASTRUCTURE]: () => buildInfrastructureTable(db.infrastructure),
    [SHEET_TABS.TOWERS]: () => buildTowersTable(db.stations, db.infrastructure),
    [SHEET_TABS.PERSONNEL]: () => buildPersonnelTable(db.users, db.technicians),
    [SHEET_TABS.REPORTS]: () => buildReportsTable(db.reports),
  };

  const data = uniqueTabs.map((tab) => ({
    range: `'${tab}'!A1`,
    values: tableBuilders[tab](),
  }));

  await sheetsFetch(
    `/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data,
      }),
    }
  );
}

function buildTableForTab(
  tab: UnifiedSheetTabKey,
  db: TransmisiDatabase
): string[][] {
  switch (tab) {
    case SHEET_TABS.DEVICES:
      return buildDevicesTable(db.devices);
    case SHEET_TABS.INFRASTRUCTURE:
      return buildInfrastructureTable(db.infrastructure);
    case SHEET_TABS.TOWERS:
      return buildTowersTable(db.stations, db.infrastructure);
    case SHEET_TABS.PERSONNEL:
      return buildPersonnelTable(db.users, db.technicians);
    case SHEET_TABS.REPORTS:
      return buildReportsTable(db.reports);
  }
}

async function sendWebhookPost(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat menghubungi Web App Apps Script`);
  }
  const text = await res.text();
  if (text) {
    try {
      const json = JSON.parse(text) as { ok?: boolean; error?: string };
      if (json.ok === false) {
        throw new Error(json.error || 'Apps Script menolak pembaruan data');
      }
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        // Non-JSON redirect output; ignore if HTTP 2xx
      } else {
        throw parseErr;
      }
    }
  }
}

export async function pingWebhookConnection(
  webhookUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const clean = webhookUrl.trim();
  if (!clean) {
    return { ok: false, error: 'URL Web App Apps Script belum diisi' };
  }
  try {
    const res = await fetch(clean, { method: 'GET' });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    const parsed = JSON.parse(text) as { ok?: boolean; error?: string };
    if (!parsed.ok) {
      return { ok: false, error: parsed.error || 'Respons Apps Script tidak valid' };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Gagal terhubung ke URL Web App Apps Script',
    };
  }
}

export async function postReportViaWebhook(
  webhookUrl: string,
  spreadsheetId: string,
  report: MaintenanceReport
): Promise<void> {
  const table = buildReportsTable([report]);
  await sendWebhookPost(webhookUrl, {
    action: 'appendReport',
    spreadsheetId,
    sheetName: SHEET_TABS.REPORTS,
    header: table[0],
    row: table[1],
  });
}

export async function syncSpreadsheetTabsViaWebhook(
  webhookUrl: string,
  spreadsheetId: string,
  db: TransmisiDatabase,
  tabs: UnifiedSheetTabKey[]
): Promise<void> {
  if (tabs.length === 0) return;
  const uniqueTabs = Array.from(new Set(tabs));
  await sendWebhookPost(webhookUrl, {
    action: 'syncTabs',
    spreadsheetId,
    tabs: uniqueTabs.map((tab) => ({
      sheetName: tab,
      values: buildTableForTab(tab, db),
    })),
  });
}

export async function syncUnifiedSpreadsheetDb(
  spreadsheetId: string,
  db: TransmisiDatabase,
  accessToken: string
): Promise<void> {
  await syncSpreadsheetTabs(spreadsheetId, db, accessToken, [
    SHEET_TABS.DEVICES,
    SHEET_TABS.INFRASTRUCTURE,
    SHEET_TABS.TOWERS,
    SHEET_TABS.PERSONNEL,
    SHEET_TABS.REPORTS,
  ]);
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
        timeZone: 'Asia/Jakarta',
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

function parseSheetDecimal(raw: string | undefined): number {
  const cleaned = (raw ?? '').trim();
  if (!cleaned) return Number.NaN;
  const normalized =
    cleaned.includes(',') && !cleaned.includes('.')
      ? cleaned.replace(',', '.')
      : cleaned;
  return parseFloat(normalized);
}

function normalizeLatitude(raw: string | undefined, fallback: number): number {
  const val = parseSheetDecimal(raw);
  if (Number.isNaN(val)) return fallback;
  if (val >= -10 && val <= 5) return val;
  if (Math.abs(val) > 20) {
    let factor = 1;
    while (Math.abs(val / factor) > 10) {
      factor *= 10;
    }
    const scaled = val / factor;
    if (scaled >= -10 && scaled <= 5) return scaled;
  }
  return fallback;
}

function normalizeLongitude(raw: string | undefined, fallback: number): number {
  const val = parseSheetDecimal(raw);
  if (Number.isNaN(val)) return fallback;
  if (val >= 95 && val <= 115) return val;
  if (val > 180) {
    let factor = 1;
    while (val / factor > 180) {
      factor *= 10;
    }
    const scaled = val / factor;
    if (scaled >= 95 && scaled <= 115) return scaled;
  }
  return fallback;
}

function normalizeMaxCapKw(raw: string | undefined, fallback: number): number {
  const val = parseSheetDecimal(raw);
  if (Number.isNaN(val) || val <= 0) return fallback;
  // Detect Google Sheets date serial corruption (e.g. "1.2" -> Feb 1 -> 46054)
  if (val > 10000) return fallback;
  if (val > 50) {
    let factor = 1;
    while (val / factor > 50) {
      factor *= 10;
    }
    return val / factor;
  }
  return val;
}

function normalizePowerKw(
  raw: string | undefined,
  maxCapKw: number,
  fallback: number
): number {
  const val = parseSheetDecimal(raw);
  if (Number.isNaN(val)) return fallback;
  if (maxCapKw > 0 && val > maxCapKw * 1.5) {
    let factor = 1;
    while (val / factor > maxCapKw * 1.5) {
      factor *= 10;
    }
    return val / factor;
  }
  return val;
}

export async function fetchUnifiedSpreadsheetDb(
  spreadsheetId: string,
  accessToken: string | null,
  fallbackDb: TransmisiDatabase
): Promise<TransmisiDatabase> {
  let devicesRaw: string[][] = [];
  let infraRaw: string[][] = [];
  let towersRaw: string[][] = [];
  let personnelRaw: string[][] = [];
  let reportsRaw: string[][] = [];

  if (accessToken) {
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
    devicesRaw = valueRanges[0]?.values ?? [];
    infraRaw = valueRanges[1]?.values ?? [];
    towersRaw = valueRanges[2]?.values ?? [];
    personnelRaw = valueRanges[3]?.values ?? [];
    reportsRaw = valueRanges[4]?.values ?? [];
  } else {
    const results = await Promise.allSettled([
      fetchGvizSheetRows(spreadsheetId, SHEET_TABS.DEVICES),
      fetchGvizSheetRows(spreadsheetId, SHEET_TABS.INFRASTRUCTURE),
      fetchGvizSheetRows(spreadsheetId, SHEET_TABS.TOWERS),
      fetchGvizSheetRows(spreadsheetId, SHEET_TABS.PERSONNEL),
      fetchGvizSheetRows(spreadsheetId, SHEET_TABS.REPORTS),
    ]);

    const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
    if (fulfilledCount === 0) {
      const firstErr = results.find(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      );
      throw firstErr?.reason ?? new Error('Gagal membaca data spreadsheet.');
    }

    devicesRaw = results[0].status === 'fulfilled' ? results[0].value : [];
    infraRaw = results[1].status === 'fulfilled' ? results[1].value : [];
    towersRaw = results[2].status === 'fulfilled' ? results[2].value : [];
    personnelRaw = results[3].status === 'fulfilled' ? results[3].value : [];
    reportsRaw = results[4].status === 'fulfilled' ? results[4].value : [];
  }

  const devicesRows = devicesRaw.filter(
    (r) =>
      r[0] &&
      r[2] &&
      r[0].trim() !== 'ID' &&
      r[2].trim() !== 'Nama Perangkat'
  );
  const infraRows = infraRaw.filter(
    (r) =>
      r[0] &&
      r[1] &&
      r[0].trim() !== 'ID' &&
      r[1].trim() !== 'Station ID'
  );
  const towersRows = towersRaw.filter(
    (r) =>
      r[0] &&
      r[2] &&
      r[0].trim() !== 'ID' &&
      r[2].trim() !== 'Nama Satuan'
  );
  const personnelRows = personnelRaw.filter(
    (r) =>
      r[0] &&
      r[3] &&
      r[0].trim() !== 'ID' &&
      r[3].trim() !== 'Nama Lengkap'
  );
  const reportsRows = reportsRaw.filter(
    (r) =>
      r[0] &&
      r[2] &&
      r[0].trim() !== 'ID Tiket' &&
      r[2].trim() !== 'Subjek'
  );

  const devices: DeviceItem[] =
    devicesRows.length > 0
      ? devicesRows.map((r) => {
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
            active: condition !== 'Rusak' && (r[6] || '').trim().toUpperCase() !== 'FALSE',
            lastChecked: r[7] || '-',
            notes: r[8] || '',
          };
        })
      : fallbackDb.devices;

  const infrastructure: InfrastructureItem[] =
    infraRows.length > 0
      ? infraRows.map((r) => ({
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
      ? towersRows.map((r) => {
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
          const maxCapacityKw = normalizeMaxCapKw(
            r[8],
            existing?.maxCapacityKw ?? 5
          );
          const forwardPowerKw = normalizePowerKw(
            r[9],
            maxCapacityKw,
            existing?.forwardPowerKw ?? 0
          );
          const parsedReflected = parseSheetDecimal(r[10]);
          return {
            id: r[0],
            code: r[1] || r[0],
            name: r[2],
            region: r[3] || '-',
            address: r[4] || '-',
            latitude: normalizeLatitude(r[5], existing?.latitude ?? -2.976),
            longitude: normalizeLongitude(r[6], existing?.longitude ?? 104.775),
            channelFreq: r[7] || '-',
            maxCapacityKw,
            forwardPowerKw,
            reflectedPowerW: Number.isNaN(parsedReflected)
              ? existing?.reflectedPowerW ?? 0
              : parsedReflected,
            lastPowerInputBy: r[15] || 'Tim Transmisi',
            lastPowerUpdatedAt: r[16] || '-',
            powerHistory: parsedHistory,
          };
        })
      : fallbackDb.stations;

  const users: UserAccount[] =
    personnelRows.length > 0
      ? personnelRows.map((r) => {
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
            onDuty: (r[10] || '').trim().toUpperCase() !== 'FALSE',
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

  const reportsHasHeader = reportsRaw.some(
    (r) => (r[0] ?? '').trim() === 'ID Tiket'
  );
  const reports: MaintenanceReport[] =
    reportsRows.length > 0
      ? reportsRows.map((r) => {
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
      : reportsHasHeader
      ? []
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

const WEEKDAY_ABBR_ID = ['min', 'sen', 'sel', 'rab', 'kam', 'jum', 'sab'];

function findDayHeaderRow(rows: string[][]): {
  dayHeaderRowIdx: number;
  dayColMap: Map<number, number>;
} {
  let dayHeaderRowIdx = -1;
  const dayColMap = new Map<number, number>();

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

  return { dayHeaderRowIdx, dayColMap };
}

function doesMatrixMatchTargetMonth(rows: string[][], targetDate: Date): boolean {
  const { dayHeaderRowIdx, dayColMap } = findDayHeaderRow(rows);
  if (dayHeaderRowIdx === -1 || dayColMap.size === 0) return false;

  // Reject if matrix has days exceeding the target month's length (e.g., 31 in November)
  const daysInMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  ).getDate();
  if (daysInMonth < 31 && dayColMap.has(31)) {
    return false;
  }

  // Validate day-1 Indonesian weekday abbreviation when present (e.g. 'min' for 1 Nov 2026)
  const day1Col = dayColMap.get(1);
  if (day1Col !== undefined) {
    const expectedPrefix =
      WEEKDAY_ABBR_ID[
        new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getDay()
      ];
    for (let r = dayHeaderRowIdx + 1; r <= Math.min(dayHeaderRowIdx + 3, rows.length - 1); r++) {
      const cell = (rows[r]?.[day1Col] ?? '').trim().toLowerCase().slice(0, 3);
      if (WEEKDAY_ABBR_ID.includes(cell)) {
        return cell === expectedPrefix;
      }
    }
  }

  return true;
}

function isFixedWeekdayShift2Role(personName: string, jabatan: string): boolean {
  const nameNorm = normalizePersonName(personName);
  const jabNorm = jabatan.toLowerCase();
  return (
    nameNorm === 'abdur rahman' ||
    nameNorm === 'sutio' ||
    jabNorm.includes('koordinator teknik') ||
    jabNorm.includes('ketua tim pp teknik') ||
    jabNorm.includes('ketua tim palembang')
  );
}

export function parseMonthlyScheduleMatrix(
  rows: string[][],
  targetDate: Date,
  technicians: Technician[],
  stations: Station[]
): ScheduleAssignment[] {
  if (!rows || rows.length === 0) return [];

  const { dayHeaderRowIdx, dayColMap } = findDayHeaderRow(rows);
  if (dayHeaderRowIdx === -1 || dayColMap.size === 0) return [];

  const today = new Date(targetDate);
  const yesterday = new Date(targetDate);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(targetDate);
  tomorrow.setDate(today.getDate() + 1);

  const buckets: Array<{
    bucket: ScheduleDayBucket;
    dateObj: Date;
    dayNum: number;
    dateLabel: string;
  }> = [
    {
      bucket: 'Kemarin',
      dateObj: yesterday,
      dayNum: yesterday.getDate(),
      dateLabel: formatShortDateId(yesterday),
    },
    {
      bucket: 'Hari Ini',
      dateObj: today,
      dayNum: today.getDate(),
      dateLabel: formatShortDateId(today),
    },
    {
      bucket: 'Besok',
      dateObj: tomorrow,
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

    const displayName = matchedTech?.name ?? nameCell;
    const region = matchedStation?.region ?? matchedTech?.region ?? 'Palembang';
    const roleStatus = matchedTech?.jabatan ?? 'Operator';
    const isFixedWeekdayS = isFixedWeekdayShift2Role(displayName, roleStatus);

    buckets.forEach((b) => {
      const colIdx = dayColMap.get(b.dayNum);
      if (colIdx === undefined) return;
      let rawCode = (row[colIdx] ?? '').trim().toUpperCase();

      if (isFixedWeekdayS) {
        const dayOfWeek = b.dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        rawCode = isWeekend ? 'L' : 'S';
      }

      if (!rawCode) return;

      const mapped = mapMatrixShiftCode(rawCode);
      assignments.push({
        id: `sch-sheet-${b.bucket}-${noCell}-${r}`,
        dayBucket: b.bucket,
        dateLabel: b.dateLabel,
        stationRegion: region,
        technicianName: displayName,
        roleStatus,
        shift: mapped.label,
        notes: `Kode Jadwal: ${rawCode} (${
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

function buildScheduleSheetCandidates(targetDate: Date): string[] {
  const fullMonth = getCurrentIndonesianMonthName(targetDate);
  const shortMonth = MONTHS_SHORT_ID[targetDate.getMonth()] ?? '';
  const yyyy = String(targetDate.getFullYear());
  const yy = yyyy.slice(-2);

  return Array.from(
    new Set(
      [
        `${fullMonth}${yy}`,
        `${fullMonth} ${yy}`,
        `${fullMonth}${yyyy}`,
        `${fullMonth} ${yyyy}`,
        `${shortMonth}${yy}`,
        `${shortMonth} ${yy}`,
        fullMonth,
        fullMonth.toUpperCase(),
        shortMonth,
      ].filter(Boolean)
    )
  );
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
  if (!accessToken) {
    const candidates = buildScheduleSheetCandidates(targetDate);
    let firstValidFallback: { rows: string[][]; title: string } | null = null;
    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        const rows = await fetchGvizSheetRows(scheduleSpreadsheetId, candidate);
        if (doesMatrixMatchTargetMonth(rows, targetDate)) {
          const schedules = parseMonthlyScheduleMatrix(
            rows,
            targetDate,
            technicians,
            stations
          );
          if (schedules.length > 0) {
            return {
              schedules,
              sheetTitle: candidate,
              spreadsheetTitle: 'Spreadsheet Jadwal Live',
            };
          }
        } else if (!firstValidFallback && rows.length > 0) {
          firstValidFallback = { rows, title: candidate };
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (firstValidFallback) {
      const schedules = parseMonthlyScheduleMatrix(
        firstValidFallback.rows,
        targetDate,
        technicians,
        stations
      );
      if (schedules.length > 0) {
        return {
          schedules,
          sheetTitle: firstValidFallback.title,
          spreadsheetTitle: 'Spreadsheet Jadwal Live',
        };
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error(
      `Sheet jadwal bulan ${getCurrentIndonesianMonthName(
        targetDate
      )} tidak ditemukan di spreadsheet.`
    );
  }

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
  const yy = String(targetDate.getFullYear()).slice(-2);

  const matchedTab =
    tabTitles.find((t) => t.toLowerCase() === `${targetMonth}${yy}`) ||
    tabTitles.find((t) => t.toLowerCase() === `${targetMonth} ${yy}`) ||
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

export function normalizePersonName(name: string): string {
  return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

export function isOffDutyShiftLabel(shiftLabel: string): boolean {
  const s = shiftLabel.toLowerCase();
  return (
    s.includes('off duty') ||
    s.includes('libur') ||
    s.includes('cuti') ||
    s.includes('dinas luar')
  );
}

export function shiftLabelToMatrixCode(shiftLabel: string): string {
  const s = shiftLabel.toLowerCase();
  if (s.includes('shift 1') || s.includes('00.00')) return 'P';
  if (s.includes('shift 2') || s.includes('08.00')) return 'S';
  if (s.includes('shift 3') || s.includes('16.00')) return 'M';
  if (s.includes('dinas luar')) return 'DL';
  if (s.includes('cuti')) return 'C';
  return 'L';
}

export function findTodayScheduleForPerson(
  personName: string,
  schedules: ScheduleAssignment[]
): ScheduleAssignment | undefined {
  const target = normalizePersonName(personName);
  if (!target) return undefined;
  const todayList = schedules.filter((s) => s.dayBucket === 'Hari Ini');
  return todayList.find((s) => {
    const sNorm = normalizePersonName(s.technicianName);
    return sNorm === target || sNorm.startsWith(target) || target.startsWith(sNorm);
  });
}

export function applySchedulesToPersonnel(
  db: TransmisiDatabase,
  schedules: ScheduleAssignment[]
): TransmisiDatabase {
  const todayList = schedules.filter((s) => s.dayBucket === 'Hari Ini');
  if (todayList.length === 0) {
    return { ...db, schedules };
  }

  const users = db.users.map((u) => {
    const matched = findTodayScheduleForPerson(u.fullName, todayList);
    if (!matched) return u;
    return {
      ...u,
      shift: matched.shift,
      onDuty: !isOffDutyShiftLabel(matched.shift),
    };
  });

  const technicians = db.technicians.map((t) => {
    const matched = findTodayScheduleForPerson(t.name, todayList);
    if (!matched) return t;
    return {
      ...t,
      shift: matched.shift,
      onDuty: !isOffDutyShiftLabel(matched.shift),
    };
  });

  return {
    ...db,
    schedules,
    users,
    technicians,
  };
}

export function buildScheduleSignature(schedules: ScheduleAssignment[]): string {
  return schedules
    .map((s) => `${s.dayBucket}|${s.technicianName}|${s.shift}|${s.dateLabel}`)
    .join(';;');
}

export function buildDbSignature(db: TransmisiDatabase): string {
  return JSON.stringify({
    stations: db.stations.map((s) => [
      s.id,
      s.code,
      s.name,
      s.region,
      s.latitude,
      s.longitude,
      s.forwardPowerKw,
      s.reflectedPowerW,
      s.lastPowerUpdatedAt,
    ]),
    devices: db.devices.map((d) => [
      d.id,
      d.stationId,
      d.name,
      d.category,
      d.brandModel,
      d.condition,
      d.active,
      d.lastChecked,
      d.notes,
    ]),
    infrastructure: db.infrastructure.map((i) => [
      i.id,
      i.landStatus,
      i.txRoomArea,
      i.txRoomCondition,
      i.officialHouseCount,
      i.officialHouseCondition,
      i.gensetRoomArea,
      i.gensetRoomCondition,
      i.towerHeightM,
      i.towerCondition,
    ]),
    users: db.users.map((u) => [
      u.id,
      u.username,
      u.password,
      u.fullName,
      u.role,
      u.stationId,
      u.employmentStatus,
      u.jabatan,
      u.gender,
      u.phone,
    ]),
    reports: db.reports.map((r) => [
      r.id,
      r.stationId,
      r.subject,
      r.priority,
      r.status,
      r.updatedAt,
      r.adminNote,
    ]),
  });
}
