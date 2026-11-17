import { useCallback, useEffect, useState } from 'react';
import { AdminView } from './components/AdminView';
import { ChangePasswordModal, LoginScreen } from './components/AuthModals';
import { ConfirmModal } from './components/ConfirmModal';
import { HomeView } from './components/HomeView';
import { JadwalView } from './components/JadwalView';
import { LaporanView } from './components/LaporanView';
import { PerangkatView } from './components/PerangkatView';
import { SaranaPrasaranaView } from './components/SaranaPrasaranaView';
import { Sidebar } from './components/Sidebar';
import { SpreadsheetConnectModal } from './components/SpreadsheetConnectModal';
import { TeknisiView } from './components/TeknisiView';
import { TopBar } from './components/TopBar';
import {
  clearGoogleAccessToken,
  getGoogleAccessToken,
  initGoogleAuth,
  signInWithGoogleSheets,
  signOutGoogleSheets,
} from './services/googleSheetsAuth';
import {
  createUnifiedDatabaseSpreadsheet,
  fetchBundledMatrixScheduleCsv,
  fetchScheduleFromSpreadsheet,
  fetchUnifiedSpreadsheetDb,
  getConfiguredDbSpreadsheetId,
  getConfiguredScheduleSpreadsheetId,
  getCurrentIndonesianMonthName,
  pingSpreadsheetConnection,
  setConfiguredDbSpreadsheetId,
  setConfiguredScheduleSpreadsheetId,
  syncUnifiedSpreadsheetDb,
} from './services/googleSheetsDb';
import {
  AppNotification,
  DeviceCategory,
  DeviceCondition,
  DeviceItem,
  EmploymentStatus,
  GenderCode,
  InfrastructureItem,
  MaintenanceReport,
  NavSection,
  ReportPriority,
  ScheduleAssignment,
  Station,
  Technician,
  TicketStatus,
  TransmisiDatabase,
  UserAccount,
  UserRole,
} from './types/transmisi';
import { formatNowWIB } from './utils/stationHelpers';

const STORAGE_DB_KEY = 'simontrans_tvri_sumsel_db_v3';
const STORAGE_USER_KEY = 'simontrans_tvri_user_v3';
const STORAGE_THEME_KEY = 'simontrans_sumsel_theme_v1';

const normalizeShiftLabel = (shift?: string): string => {
  if (!shift) return 'Shift 2 (08.00 - 16.00)';
  if (shift.startsWith('Malam') || shift.includes('23:00 - 07:00')) {
    return 'Shift 1 (00.00 - 08.00)';
  }
  if (shift.startsWith('Pagi') || shift.includes('07:00 - 15:00')) {
    return 'Shift 2 (08.00 - 16.00)';
  }
  if (shift.startsWith('Sore') || shift.includes('15:00 - 23:00')) {
    return 'Shift 3 (16.00 - 24.00)';
  }
  return shift;
};

interface PendingSheetSync {
  nextDb: TransmisiDatabase;
  summary: string;
  isDestructive?: boolean;
}

export default function App() {
  const [db, setDb] = useState<TransmisiDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_USER_KEY);
  });
  const [activeNav, setActiveNav] = useState<NavSection>('home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Google Spreadsheet API State
  const [spreadsheetModalOpen, setSpreadsheetModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [dbSpreadsheetId, setDbSpreadsheetIdState] = useState<string>(() =>
    getConfiguredDbSpreadsheetId()
  );
  const [scheduleSpreadsheetId, setScheduleSpreadsheetIdState] = useState<string>(() =>
    getConfiguredScheduleSpreadsheetId()
  );
  const [spreadsheetConnected, setSpreadsheetConnected] = useState(false);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string | null>(null);
  const [activeScheduleSheetTitle, setActiveScheduleSheetTitle] = useState<string | null>(
    () => getCurrentIndonesianMonthName()
  );
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingSheetSync, setPendingSheetSync] = useState<PendingSheetSync | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(STORAGE_THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = initGoogleAuth((session) => {
      setGoogleEmail(session.email);
      setHasGoogleToken(session.hasToken);
      if (!session.hasToken && !dbSpreadsheetId) {
        setSpreadsheetConnected(false);
        setSpreadsheetTitle(null);
      }
    });
    return () => unsubscribe();
  }, [dbSpreadsheetId]);

  const loadBaselineData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let baseDb: TransmisiDatabase;
      const cached = localStorage.getItem(STORAGE_DB_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as TransmisiDatabase;
        baseDb = {
          ...parsed,
          technicians: parsed.technicians.map((t) => ({
            ...t,
            shift: normalizeShiftLabel(t.shift),
          })),
          users: parsed.users.map((u) => ({
            ...u,
            shift: normalizeShiftLabel(u.shift),
          })),
          schedules: (parsed.schedules ?? []).map((s) => ({
            ...s,
            shift: normalizeShiftLabel(s.shift),
          })),
          infrastructure: parsed.infrastructure ?? [],
        };
      } else {
        let data: TransmisiDatabase;
        try {
          const res = await fetch('./data/transmisi.json');
          if (!res.ok) {
            throw new Error(`Gagal memuat data awal (${res.status})`);
          }
          data = (await res.json()) as TransmisiDatabase;
        } catch {
          data = await new Promise<TransmisiDatabase>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', './data/transmisi.json', true);
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText) as TransmisiDatabase);
                } catch (parseErr) {
                  reject(parseErr);
                }
              } else {
                reject(new Error(`Gagal memuat data awal (${xhr.status})`));
              }
            };
            xhr.onerror = () => reject(new Error('Gagal memuat data awal'));
            xhr.send();
          });
        }
        baseDb = {
          ...data,
          schedules: data.schedules ?? [],
          infrastructure: data.infrastructure ?? [],
        };
      }

      // Attempt live DB Spreadsheet read first if DB Spreadsheet ID is configured
      const initialDbId = getConfiguredDbSpreadsheetId();
      if (initialDbId) {
        try {
          const token = getGoogleAccessToken();
          const ping = await pingSpreadsheetConnection(initialDbId, token);
          setSpreadsheetConnected(ping.connected);
          setSpreadsheetTitle(ping.title ?? null);
          if (ping.connected) {
            baseDb = await fetchUnifiedSpreadsheetDb(initialDbId, token, baseDb);
          }
        } catch {
          // Keep baseline data if private or offline
        }
      }

      // Attempt live public schedule read if Schedule Spreadsheet ID is configured
      const initialSchedId = getConfiguredScheduleSpreadsheetId();
      if (initialSchedId) {
        try {
          const liveSched = await fetchScheduleFromSpreadsheet(
            initialSchedId,
            getGoogleAccessToken(),
            new Date(),
            baseDb.technicians,
            baseDb.stations
          );
          setActiveScheduleSheetTitle(liveSched.sheetTitle);
          if (liveSched.schedules.length > 0) {
            baseDb = { ...baseDb, schedules: liveSched.schedules };
          }
        } catch {
          // Fallback silently to matrix CSV or cached schedules until OAuth sign-in
        }
      }

      if (baseDb.schedules.length === 0) {
        const matrixFallback = await fetchBundledMatrixScheduleCsv(
          new Date(),
          baseDb.technicians,
          baseDb.stations
        );
        if (matrixFallback.length > 0) {
          baseDb = { ...baseDb, schedules: matrixFallback };
        }
      }

      setDb(baseDb);
      localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(baseDb));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Gagal memuat data awal aplikasi'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBaselineData();
  }, [loadBaselineData]);

  // Ping Spreadsheet API periodically whenever DB Spreadsheet ID exists (OAuth or API-key read)
  const runPingCheck = useCallback(
    async (targetDbId: string, token: string | null) => {
      if (!targetDbId) {
        setSpreadsheetConnected(false);
        setSpreadsheetTitle(null);
        return false;
      }
      const res = await pingSpreadsheetConnection(targetDbId, token);
      setSpreadsheetConnected(res.connected);
      setSpreadsheetTitle(res.title ?? null);
      if (!res.connected && token && res.error) {
        if (res.error.toLowerCase().includes('credential') || res.error.includes('401')) {
          clearGoogleAccessToken();
          setHasGoogleToken(false);
        }
      }
      return res.connected;
    },
    []
  );

  useEffect(() => {
    if (!dbSpreadsheetId) {
      setSpreadsheetConnected(false);
      setSpreadsheetTitle(null);
      return;
    }
    const token = getGoogleAccessToken();
    void runPingCheck(dbSpreadsheetId, token);

    const timer = window.setInterval(() => {
      const currentToken = getGoogleAccessToken();
      void runPingCheck(dbSpreadsheetId, currentToken);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [hasGoogleToken, dbSpreadsheetId, runPingCheck]);

  const applyLocalDb = (nextDb: TransmisiDatabase) => {
    setDb(nextDb);
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(nextDb));
  };

  const commitDbChange = (
    nextDb: TransmisiDatabase,
    sheetWriteSummary?: string,
    isDestructive = false
  ) => {
    const token = getGoogleAccessToken();
    if (spreadsheetConnected && dbSpreadsheetId && token && sheetWriteSummary) {
      setPendingSheetSync({
        nextDb,
        summary: sheetWriteSummary,
        isDestructive,
      });
      return;
    }
    applyLocalDb(nextDb);
  };

  const handleConfirmSheetWrite = async () => {
    if (!pendingSheetSync) return;
    const { nextDb } = pendingSheetSync;
    setPendingSheetSync(null);

    applyLocalDb(nextDb);
    const token = getGoogleAccessToken();
    if (!token || !dbSpreadsheetId) return;

    setSyncBusy(true);
    setSyncError(null);
    try {
      await syncUnifiedSpreadsheetDb(dbSpreadsheetId, nextDb, token);
      setSpreadsheetConnected(true);
    } catch (err) {
      setSyncError(
        err instanceof Error
          ? `Gagal menyinkronkan ke Google Spreadsheet: ${err.message}`
          : 'Gagal menyinkronkan ke Google Spreadsheet.'
      );
      setSpreadsheetConnected(false);
    } finally {
      setSyncBusy(false);
    }
  };

  const pullFromSpreadsheets = useCallback(
    async (
      targetDbId: string,
      targetScheduleId: string,
      token: string | null
    ) => {
      if (!db) return;
      setSyncBusy(true);
      setSyncError(null);
      try {
        let nextDb = db;
        if (targetDbId) {
          const ping = await pingSpreadsheetConnection(targetDbId, token);
          setSpreadsheetConnected(ping.connected);
          setSpreadsheetTitle(ping.title ?? null);
          if (!ping.connected) {
            throw new Error(ping.error || 'Gagal terhubung ke Spreadsheet Database.');
          }
          nextDb = await fetchUnifiedSpreadsheetDb(targetDbId, token, db);
        }

        if (targetScheduleId) {
          const schedRes = await fetchScheduleFromSpreadsheet(
            targetScheduleId,
            token,
            new Date(),
            nextDb.technicians,
            nextDb.stations
          );
          setActiveScheduleSheetTitle(schedRes.sheetTitle);
          if (schedRes.schedules.length > 0) {
            nextDb = { ...nextDb, schedules: schedRes.schedules };
          }
        }

        applyLocalDb(nextDb);
      } catch (err) {
        setSyncError(
          err instanceof Error ? err.message : 'Gagal menarik data dari Spreadsheet.'
        );
        setSpreadsheetConnected(false);
      } finally {
        setSyncBusy(false);
      }
    },
    [db]
  );

  const handleSignInGoogle = async () => {
    setSyncBusy(true);
    setSyncError(null);
    try {
      const { email, accessToken } = await signInWithGoogleSheets();
      setGoogleEmail(email);
      setHasGoogleToken(true);
      if (dbSpreadsheetId || scheduleSpreadsheetId) {
        await pullFromSpreadsheets(dbSpreadsheetId, scheduleSpreadsheetId, accessToken);
      }
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Login Google Sheets dibatalkan atau gagal.'
      );
    } finally {
      setSyncBusy(false);
    }
  };

  const handleSignOutGoogle = async () => {
    setSyncBusy(true);
    try {
      await signOutGoogleSheets();
      setHasGoogleToken(false);
      setGoogleEmail(null);
      setSpreadsheetConnected(false);
      setSpreadsheetTitle(null);
    } finally {
      setSyncBusy(false);
    }
  };

  const handleSaveSpreadsheetIds = async (newDbId: string, newScheduleId: string) => {
    const cleanDb = setConfiguredDbSpreadsheetId(newDbId);
    const cleanSched = setConfiguredScheduleSpreadsheetId(newScheduleId);
    setDbSpreadsheetIdState(cleanDb);
    setScheduleSpreadsheetIdState(cleanSched);

    const token = getGoogleAccessToken();
    if (cleanDb || cleanSched) {
      await pullFromSpreadsheets(cleanDb, cleanSched, token);
      if (!cleanDb) {
        setSpreadsheetConnected(false);
        setSpreadsheetTitle(null);
      }
    } else {
      setSpreadsheetConnected(false);
      setSpreadsheetTitle(null);
    }
  };

  const handleCreateUnifiedSpreadsheet = async () => {
    if (!db) return;
    const token = getGoogleAccessToken();
    if (!token) {
      setSyncError('Silakan Sign in with Google terlebih dahulu.');
      return;
    }
    setSyncBusy(true);
    setSyncError(null);
    try {
      const created = await createUnifiedDatabaseSpreadsheet(db, token);
      const savedId = setConfiguredDbSpreadsheetId(created.spreadsheetId);
      setDbSpreadsheetIdState(savedId);
      setSpreadsheetConnected(true);
      setSpreadsheetTitle(created.title);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Gagal membuat spreadsheet baru.'
      );
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePushLocalToSpreadsheet = async () => {
    if (!db || !dbSpreadsheetId) return;
    const token = getGoogleAccessToken();
    if (!token) {
      setSyncError('Silakan Sign in with Google terlebih dahulu.');
      return;
    }
    setSyncBusy(true);
    setSyncError(null);
    try {
      await syncUnifiedSpreadsheetDb(dbSpreadsheetId, db, token);
      await runPingCheck(dbSpreadsheetId, token);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Gagal mengirim data ke Spreadsheet.'
      );
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRefreshFromSpreadsheet = async () => {
    const token = getGoogleAccessToken();
    await pullFromSpreadsheets(dbSpreadsheetId, scheduleSpreadsheetId, token);
  };

  const handleRefreshScheduleSheet = async () => {
    if (!db) return;
    const token = getGoogleAccessToken();
    if (scheduleSpreadsheetId && token) {
      await pullFromSpreadsheets(dbSpreadsheetId, scheduleSpreadsheetId, token);
      return;
    }
    const matrixFallback = await fetchBundledMatrixScheduleCsv(
      new Date(),
      db.technicians,
      db.stations
    );
    if (matrixFallback.length > 0) {
      applyLocalDb({ ...db, schedules: matrixFallback });
    }
  };

  const currentUser = db?.users.find((u) => u.id === currentUserId) ?? null;

  useEffect(() => {
    if (currentUser && currentUser.role !== 'Admin' && activeNav === 'admin') {
      setActiveNav('home');
    }
  }, [currentUser, activeNav]);

  const handleLogin = (user: UserAccount) => {
    setCurrentUserId(user.id);
    localStorage.setItem(STORAGE_USER_KEY, user.id);
    setActiveNav('home');
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    setActiveNav('home');
  };

  const handleUpdatePower = (
    stationId: string,
    forwardKw: number,
    reflectedW: number
  ) => {
    if (!db || !currentUser) return;
    const nowLabel = formatNowWIB();
    const shortTime = nowLabel.slice(11, 16);
    const st = db.stations.find((s) => s.id === stationId);

    const nextStations = db.stations.map((s) => {
      if (s.id !== stationId) return s;
      const nextHistory = [
        ...s.powerHistory.slice(1),
        { time: shortTime, powerKw: forwardKw, reflectedW },
      ];
      return {
        ...s,
        forwardPowerKw: forwardKw,
        reflectedPowerW: reflectedW,
        lastPowerInputBy: currentUser.fullName,
        lastPowerUpdatedAt: nowLabel,
        powerHistory: nextHistory,
      };
    });

    commitDbChange(
      { ...db, stations: nextStations },
      `Tab "Data Menara": Update daya pemancar ${st?.region ?? stationId} (${forwardKw} kW / ${reflectedW} W)`
    );
  };

  const handleUpdateDeviceCondition = (
    deviceId: string,
    nextCondition: DeviceCondition
  ) => {
    if (!db) return;
    const nowLabel = formatNowWIB().replace(' WIB', '');
    const dev = db.devices.find((d) => d.id === deviceId);
    const nextDevices: DeviceItem[] = db.devices.map((d) => {
      if (d.id !== deviceId) return d;
      return {
        ...d,
        condition: nextCondition,
        active: nextCondition !== 'Rusak',
        lastChecked: nowLabel,
        notes:
          nextCondition === 'Normal'
            ? 'Perangkat dipulihkan dan beroperasi normal'
            : nextCondition === 'Proses Perbaikan'
            ? 'Dalam proses perbaikan oleh tim teknis'
            : 'Ditandai rusak oleh petugas monitoring',
      };
    });
    commitDbChange(
      { ...db, devices: nextDevices },
      `Tab "Data Perangkat": Ubah kondisi "${dev?.name ?? deviceId}" menjadi ${nextCondition}`
    );
  };

  const handleAddDevice = (payload: {
    name: string;
    category: DeviceCategory;
    stationId: string;
    brandModel: string;
    notes: string;
    condition: DeviceCondition;
  }) => {
    if (!db) return;
    const nowLabel = formatNowWIB().replace(' WIB', '');
    const newDevice: DeviceItem = {
      id: `dev-${Date.now()}`,
      stationId: payload.stationId,
      name: payload.name,
      category: payload.category,
      brandModel: payload.brandModel,
      condition: payload.condition,
      active: payload.condition !== 'Rusak',
      lastChecked: nowLabel,
      notes: payload.notes,
    };
    commitDbChange(
      {
        ...db,
        devices: [newDevice, ...db.devices],
      },
      `Tab "Data Perangkat": Tambah perangkat baru "${payload.name}"`
    );
  };

  const handleDeleteDevice = (deviceId: string) => {
    if (!db) return;
    const dev = db.devices.find((d) => d.id === deviceId);
    commitDbChange(
      {
        ...db,
        devices: db.devices.filter((d) => d.id !== deviceId),
      },
      `Tab "Data Perangkat": Hapus perangkat "${dev?.name ?? deviceId}"`,
      true
    );
  };

  const handleSubmitReport = (payload: {
    stationId: string;
    subject: string;
    description: string;
    attachmentName: string | null;
    attachmentDataUrl: string | null;
    priority: ReportPriority;
  }) => {
    if (!db || !currentUser) return;
    const nowLabel = formatNowWIB();
    const nextNum = db.reports.length + 38;
    const newId = `TIK-2026-${String(nextNum).padStart(3, '0')}`;
    const station = db.stations.find((s) => s.id === payload.stationId);

    const newReport: MaintenanceReport = {
      id: newId,
      stationId: payload.stationId,
      subject: payload.subject,
      description: payload.description,
      attachmentName: payload.attachmentName,
      attachmentDataUrl: payload.attachmentDataUrl,
      priority: payload.priority,
      status: 'Pengajuan',
      submittedBy: currentUser.fullName,
      createdAt: nowLabel,
      updatedAt: nowLabel,
      adminNote: '',
      history: [
        {
          status: 'Pengajuan',
          timestamp: nowLabel,
          actor: currentUser.fullName,
          note: 'Laporan dikirim dari lapangan.',
        },
      ],
    };

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      reportId: newId,
      title: `Pengajuan Baru · ${station?.region ?? 'Lokasi'}`,
      message: `${currentUser.fullName} mengirim ${newId}: ${payload.subject}`,
      status: 'Pengajuan',
      timestamp: nowLabel,
      read: false,
    };

    commitDbChange(
      {
        ...db,
        reports: [newReport, ...db.reports],
        notifications: [newNotif, ...db.notifications],
      },
      `Tab "Data Riwayat Laporan": Simpan tiket laporan baru ${newId}`
    );
  };

  const handleUpdateReportStatus = (
    reportId: string,
    newStatus: TicketStatus,
    adminNote: string
  ) => {
    if (!db || !currentUser) return;
    const nowLabel = formatNowWIB();
    let updatedStationRegion = 'Sumsel';

    const nextReports = db.reports.map((rep) => {
      if (rep.id !== reportId) return rep;
      const st = db.stations.find((s) => s.id === rep.stationId);
      if (st) updatedStationRegion = st.region;

      return {
        ...rep,
        status: newStatus,
        adminNote,
        updatedAt: nowLabel,
        history: [
          ...rep.history,
          {
            status: newStatus,
            timestamp: nowLabel,
            actor: `${currentUser.fullName} (Admin)`,
            note: adminNote || `Status diubah ke ${newStatus}`,
          },
        ],
      };
    });

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      reportId,
      title: `Status Diperbarui · ${updatedStationRegion}`,
      message: `Tiket ${reportId} diperbarui menjadi "${newStatus}". ${adminNote ? `Catatan: ${adminNote}` : ''}`,
      status: newStatus,
      timestamp: nowLabel,
      read: false,
    };

    commitDbChange(
      {
        ...db,
        reports: nextReports,
        notifications: [newNotif, ...db.notifications],
      },
      `Tab "Data Riwayat Laporan": Update status tiket ${reportId} menjadi "${newStatus}"`
    );
  };

  const handleDeleteReport = (reportId: string) => {
    if (!db) return;
    commitDbChange(
      {
        ...db,
        reports: db.reports.filter((r) => r.id !== reportId),
        notifications: db.notifications.filter((n) => n.reportId !== reportId),
      },
      `Tab "Data Riwayat Laporan": Hapus tiket laporan ${reportId}`,
      true
    );
  };

  const handleAddUser = (payload: {
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    stationId: string;
    gender: GenderCode;
    employmentStatus: EmploymentStatus;
    jabatan: string;
    shift: string;
    phone: string;
  }) => {
    if (!db) return;
    const st = db.stations.find((s) => s.id === payload.stationId);
    const region = st?.region ?? 'Palembang';
    const newId = `usr-${Date.now()}`;
    const avatarKey =
      payload.role === 'Admin'
        ? 'coord_admin'
        : payload.gender === 'P'
        ? 'tech_female_1'
        : 'tech_male_2';

    const newUser: UserAccount = {
      id: newId,
      username: payload.username,
      password: payload.password,
      fullName: payload.fullName,
      role: payload.role,
      stationId: payload.stationId,
      region,
      gender: payload.gender,
      employmentStatus: payload.employmentStatus,
      jabatan: payload.jabatan,
      onDuty: true,
      shift: payload.shift || 'Shift 2 (08.00 - 16.00)',
      phone: payload.phone || '0812-7000-0000',
      avatarKey,
    };

    const newTech: Technician = {
      id: newId,
      name: payload.fullName,
      stationId: payload.stationId,
      region,
      gender: payload.gender,
      employmentStatus: payload.employmentStatus,
      jabatan: payload.jabatan,
      onDuty: true,
      shift: payload.shift || 'Shift 2 (08.00 - 16.00)',
      phone: payload.phone || '0812-7000-0000',
      avatarKey,
    };

    commitDbChange(
      {
        ...db,
        users: [...db.users, newUser],
        technicians: [...db.technicians, newTech],
      },
      `Tab "Data Pegawai Transmisi": Tambah user "${payload.fullName}"`
    );
  };

  const handleUpdateUser = (payload: {
    id: string;
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    stationId: string;
    gender: GenderCode;
    employmentStatus: EmploymentStatus;
    jabatan: string;
    shift: string;
    phone: string;
    onDuty: boolean;
    avatarDataUrl?: string | null;
  }) => {
    if (!db) return;
    const oldUser = db.users.find((u) => u.id === payload.id);
    const st = db.stations.find((s) => s.id === payload.stationId);
    const region = st?.region ?? 'Palembang';

    const nextUsers = db.users.map((u) =>
      u.id === payload.id
        ? {
            ...u,
            username: payload.username,
            password: payload.password,
            fullName: payload.fullName,
            role: payload.role,
            stationId: payload.stationId,
            region,
            gender: payload.gender,
            employmentStatus: payload.employmentStatus,
            jabatan: payload.jabatan,
            shift: payload.shift || u.shift,
            onDuty: payload.onDuty,
            phone: payload.phone,
            avatarDataUrl: payload.avatarDataUrl ?? u.avatarDataUrl ?? null,
          }
        : u
    );

    const hasMatchingTech = db.technicians.some(
      (t) => t.id === payload.id || (oldUser && t.name === oldUser.fullName)
    );

    const nextTechs = hasMatchingTech
      ? db.technicians.map((t) => {
          if (t.id === payload.id || (oldUser && t.name === oldUser.fullName)) {
            return {
              ...t,
              name: payload.fullName,
              stationId: payload.stationId,
              region,
              gender: payload.gender,
              employmentStatus: payload.employmentStatus,
              jabatan: payload.jabatan,
              shift: payload.shift || t.shift,
              onDuty: payload.onDuty,
              phone: payload.phone || t.phone,
              avatarDataUrl: payload.avatarDataUrl ?? t.avatarDataUrl ?? null,
            };
          }
          return t;
        })
      : [
          ...db.technicians,
          {
            id: payload.id,
            name: payload.fullName,
            stationId: payload.stationId,
            region,
            gender: payload.gender,
            employmentStatus: payload.employmentStatus,
            jabatan: payload.jabatan,
            onDuty: payload.onDuty,
            shift: payload.shift || oldUser?.shift || 'Shift 2 (08.00 - 16.00)',
            phone: payload.phone || '0812-7000-0000',
            avatarKey: oldUser?.avatarKey ?? 'tech_male_1',
            avatarDataUrl: payload.avatarDataUrl ?? oldUser?.avatarDataUrl ?? null,
          },
        ];

    commitDbChange(
      {
        ...db,
        users: nextUsers,
        technicians: nextTechs,
      },
      `Tab "Data Pegawai Transmisi": Perbarui profil "${payload.fullName}"`
    );
  };

  const handleDeleteUser = (userId: string) => {
    if (!db || userId === currentUserId) return;
    const targetUser = db.users.find((u) => u.id === userId);
    commitDbChange(
      {
        ...db,
        users: db.users.filter((u) => u.id !== userId),
        technicians: db.technicians.filter(
          (t) => t.id !== userId && (!targetUser || t.name !== targetUser.fullName)
        ),
      },
      `Tab "Data Pegawai Transmisi": Hapus user "${targetUser?.fullName ?? userId}"`,
      true
    );
  };

  const handleAddStation = (payload: {
    code: string;
    name: string;
    region: string;
    address: string;
    latitude: number;
    longitude: number;
    channelFreq: string;
    maxCapacityKw: number;
    forwardPowerKw: number;
  }) => {
    if (!db || !currentUser) return;
    const nowLabel = formatNowWIB();
    const id = `st-${Date.now()}`;

    const newStation: Station = {
      id,
      code: payload.code,
      name: payload.name,
      region: payload.region,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      channelFreq: payload.channelFreq,
      maxCapacityKw: payload.maxCapacityKw,
      forwardPowerKw: payload.forwardPowerKw,
      reflectedPowerW: 18,
      lastPowerInputBy: currentUser.fullName,
      lastPowerUpdatedAt: nowLabel,
      powerHistory: [
        { time: '02:00', powerKw: payload.forwardPowerKw, reflectedW: 16 },
        { time: '03:00', powerKw: payload.forwardPowerKw, reflectedW: 17 },
        { time: '04:00', powerKw: payload.forwardPowerKw, reflectedW: 18 },
        { time: '05:00', powerKw: payload.forwardPowerKw, reflectedW: 18 },
        { time: '06:00', powerKw: payload.forwardPowerKw, reflectedW: 18 },
        { time: '07:00', powerKw: payload.forwardPowerKw, reflectedW: 18 },
      ],
    };

    const defaultDevices: DeviceItem[] = [
      {
        id: `dev-${id}-1`,
        stationId: id,
        name: 'Encoder & STL Receiver',
        category: 'Input / Headend',
        brandModel: 'Appear TV XC',
        condition: 'Normal',
        active: true,
        lastChecked: nowLabel.replace(' WIB', ''),
        notes: 'Inisialisasi awal site baru',
      },
      {
        id: `dev-${id}-2`,
        stationId: id,
        name: `Pemancar UHF ${payload.maxCapacityKw} kW`,
        category: 'Pemancar',
        brandModel: 'GatesAir Maxiva',
        condition: 'Normal',
        active: true,
        lastChecked: nowLabel.replace(' WIB', ''),
        notes: `Output ${payload.forwardPowerKw} kW`,
      },
      {
        id: `dev-${id}-3`,
        stationId: id,
        name: 'Cooling & Antena Panel',
        category: 'Pendukung',
        brandModel: 'Spinner UHF Panel',
        condition: 'Normal',
        active: true,
        lastChecked: nowLabel.replace(' WIB', ''),
        notes: 'Operasional normal',
      },
      {
        id: `dev-${id}-4`,
        stationId: id,
        name: 'UPS & Genset Standby',
        category: 'Kelistrikan',
        brandModel: 'Eaton + Perkins ATS',
        condition: 'Normal',
        active: true,
        lastChecked: nowLabel.replace(' WIB', ''),
        notes: 'Suplai daya stabil',
      },
    ];

    commitDbChange(
      {
        ...db,
        stations: [...db.stations, newStation],
        devices: [...db.devices, ...defaultDevices],
      },
      `Tab "Data Menara" & "Data Perangkat": Tambah lokasi baru "${payload.name}"`
    );
  };

  const handleUpdateStationCoords = (
    stationId: string,
    latitude: number,
    longitude: number
  ) => {
    if (!db) return;
    const st = db.stations.find((s) => s.id === stationId);
    commitDbChange(
      {
        ...db,
        stations: db.stations.map((s) =>
          s.id === stationId ? { ...s, latitude, longitude } : s
        ),
      },
      `Tab "Data Menara": Update koordinat ${st?.region ?? stationId} (${latitude}, ${longitude})`
    );
  };

  const handleImportSchedules = (
    newSchedules: ScheduleAssignment[],
    replaceExisting: boolean
  ) => {
    if (!db) return;
    applyLocalDb({
      ...db,
      schedules: replaceExisting
        ? newSchedules
        : [...newSchedules, ...db.schedules],
    });
  };

  const handleUpdateInfrastructure = (updated: InfrastructureItem) => {
    if (!db) return;
    commitDbChange(
      {
        ...db,
        infrastructure: db.infrastructure.map((item) =>
          item.id === updated.id ? updated : item
        ),
      },
      `Tab "Data Sarana Prasarana": Update kondisi sarana ${updated.stationName}`
    );
  };

  const handleChangePassword = (newPassword: string) => {
    if (!db || !currentUser) return;
    commitDbChange(
      {
        ...db,
        users: db.users.map((u) =>
          u.id === currentUser.id ? { ...u, password: newPassword } : u
        ),
      },
      `Tab "Data Pegawai Transmisi": Update password akun ${currentUser.username}`
    );
  };

  const handleMarkAllRead = () => {
    if (!db) return;
    applyLocalDb({
      ...db,
      notifications: db.notifications.map((n) => ({ ...n, read: true })),
    });
  };

  const handleSelectNotification = (notif: AppNotification) => {
    if (!db) return;
    applyLocalDb({
      ...db,
      notifications: db.notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n
      ),
    });
    setActiveNav('laporan');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Memuat data SIMONTRANS TVRI Sumsel...
        </div>
      </div>
    );
  }

  if (loadError || !db) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-3">
          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
            Gagal Memuat Data Aplikasi
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void loadBaselineData()}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        users={db.users}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onLoginSuccess={handleLogin}
      />
    );
  }

  const openReportCount = db.reports.filter((r) => r.status !== 'Selesai').length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        userRole={currentUser.role}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        openReportCount={openReportCount}
        spreadsheetConnected={spreadsheetConnected}
        dbSpreadsheetId={dbSpreadsheetId}
        onOpenSpreadsheetModal={() => setSpreadsheetModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeNav={activeNav}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          spreadsheetConnected={spreadsheetConnected}
          onOpenSpreadsheetModal={() => setSpreadsheetModalOpen(true)}
          notifications={db.notifications}
          onMarkAllRead={handleMarkAllRead}
          onSelectNotification={handleSelectNotification}
          currentUser={currentUser}
          onOpenChangePassword={() => setChangePasswordOpen(true)}
          onLogout={handleLogout}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {activeNav === 'home' && (
            <HomeView
              stations={db.stations}
              devices={db.devices}
              technicians={db.technicians}
              reports={db.reports}
              currentUser={currentUser}
              onUpdatePower={handleUpdatePower}
              onNavigateReports={() => setActiveNav('laporan')}
            />
          )}

          {activeNav === 'perangkat' && (
            <PerangkatView
              stations={db.stations}
              devices={db.devices}
              userRole={currentUser.role}
              onUpdateDeviceCondition={handleUpdateDeviceCondition}
            />
          )}

          {activeNav === 'sarana' && (
            <SaranaPrasaranaView
              infrastructure={db.infrastructure}
              userRole={currentUser.role}
              onUpdateInfrastructure={handleUpdateInfrastructure}
            />
          )}

          {activeNav === 'teknisi' && (
            <TeknisiView stations={db.stations} technicians={db.technicians} />
          )}

          {activeNav === 'jadwal' && (
            <JadwalView
              schedules={db.schedules}
              stations={db.stations}
              technicians={db.technicians}
              userRole={currentUser.role}
              activeSheetTitle={activeScheduleSheetTitle}
              spreadsheetConnected={spreadsheetConnected}
              onRefreshScheduleSheet={handleRefreshScheduleSheet}
              onImportSchedules={handleImportSchedules}
            />
          )}

          {activeNav === 'laporan' && (
            <LaporanView
              stations={db.stations}
              reports={db.reports}
              technicians={db.technicians}
              users={db.users}
              currentUser={currentUser}
              onSubmitReport={handleSubmitReport}
            />
          )}

          {activeNav === 'admin' && currentUser.role === 'Admin' && (
            <AdminView
              stations={db.stations}
              devices={db.devices}
              technicians={db.technicians}
              infrastructure={db.infrastructure}
              reports={db.reports}
              users={db.users}
              currentUser={currentUser}
              onUpdateReportStatus={handleUpdateReportStatus}
              onDeleteReport={handleDeleteReport}
              onAddDevice={handleAddDevice}
              onUpdateDeviceCondition={handleUpdateDeviceCondition}
              onDeleteDevice={handleDeleteDevice}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onAddStation={handleAddStation}
              onUpdateStationCoords={handleUpdateStationCoords}
              onOpenSpreadsheetSettings={() => setSpreadsheetModalOpen(true)}
            />
          )}
        </main>
      </div>

      {changePasswordOpen && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setChangePasswordOpen(false)}
          onChangePassword={handleChangePassword}
        />
      )}

      <SpreadsheetConnectModal
        open={spreadsheetModalOpen}
        onClose={() => setSpreadsheetModalOpen(false)}
        connected={spreadsheetConnected}
        spreadsheetTitle={spreadsheetTitle}
        googleEmail={googleEmail}
        hasGoogleToken={hasGoogleToken}
        dbSpreadsheetId={dbSpreadsheetId}
        scheduleSpreadsheetId={scheduleSpreadsheetId}
        activeScheduleSheetTitle={activeScheduleSheetTitle}
        syncBusy={syncBusy}
        syncError={syncError}
        onSignInGoogle={handleSignInGoogle}
        onSignOutGoogle={handleSignOutGoogle}
        onSaveSpreadsheetIds={handleSaveSpreadsheetIds}
        onCreateUnifiedSpreadsheet={handleCreateUnifiedSpreadsheet}
        onPushLocalToSpreadsheet={handlePushLocalToSpreadsheet}
        onRefreshFromSpreadsheet={handleRefreshFromSpreadsheet}
      />

      {/* Explicit Confirmation Modal Before Writing to Connected Google Spreadsheet */}
      <ConfirmModal
        open={pendingSheetSync !== null}
        variant={pendingSheetSync?.isDestructive ? 'danger' : 'primary'}
        message={
          pendingSheetSync?.isDestructive
            ? 'Konfirmasi Hapus & Update Google Spreadsheet?'
            : 'Simpan Perubahan ke Google Spreadsheet?'
        }
        detail={
          pendingSheetSync
            ? `${pendingSheetSync.summary}. Perubahan ini akan langsung ditulis ke Google Spreadsheet yang sedang terhubung.`
            : undefined
        }
        confirmLabel="Ya, Sinkronkan ke Sheet"
        cancelLabel="Batal"
        onCancel={() => setPendingSheetSync(null)}
        onConfirm={() => void handleConfirmSheetWrite()}
      />
    </div>
  );
}
