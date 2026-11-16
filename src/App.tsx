import { useEffect, useState } from 'react';
import { AdminView } from './components/AdminView';
import { ChangePasswordModal, LoginScreen } from './components/AuthModals';
import { HomeView } from './components/HomeView';
import { JadwalView } from './components/JadwalView';
import { LaporanView } from './components/LaporanView';
import { PerangkatView } from './components/PerangkatView';
import { Sidebar } from './components/Sidebar';
import { TeknisiView } from './components/TeknisiView';
import { TopBar } from './components/TopBar';
import {
  AppNotification,
  DeviceCategory,
  DeviceCondition,
  DeviceItem,
  GenderType,
  MaintenanceReport,
  NavSection,
  ReportPriority,
  ScheduleAssignment,
  Station,
  Technician,
  TechnicianRoleStatus,
  TicketStatus,
  TransmisiDatabase,
  UserAccount,
  UserRole,
} from './types/transmisi';
import { formatNowWIB } from './utils/stationHelpers';

const STORAGE_DB_KEY = 'simontrans_tvri_sumsel_db_v2';
const STORAGE_USER_KEY = 'simontrans_tvri_user_v2';
const STORAGE_THEME_KEY = 'simontrans_sumsel_theme_v1';

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

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(STORAGE_THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const loadInitialJson = async (forceFresh = false) => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!forceFresh) {
        const cached = localStorage.getItem(STORAGE_DB_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as TransmisiDatabase;
          const mapRole = (r: string) =>
            r === 'Ketua Tim' ? 'Koordinator Daerah' : r;
          setDb({
            ...parsed,
            technicians: parsed.technicians.map((t) => ({
              ...t,
              roleStatus: mapRole(t.roleStatus) as TechnicianRoleStatus,
            })),
            users: parsed.users.map((u) => ({
              ...u,
              roleStatus: mapRole(u.roleStatus) as TechnicianRoleStatus | 'Koordinator',
            })),
            schedules: (parsed.schedules ?? []).map((s) => ({
              ...s,
              roleStatus: mapRole(s.roleStatus),
            })),
          });
          setLoading(false);
          return;
        }
      }

      let data: TransmisiDatabase;
      try {
        const res = await fetch('./data/transmisi.json');
        if (!res.ok) {
          throw new Error(`Gagal memuat data JSON (${res.status})`);
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
              reject(new Error(`Gagal memuat data JSON (${xhr.status})`));
            }
          };
          xhr.onerror = () => reject(new Error('Gagal memuat data JSON'));
          xhr.send();
        });
      }

      const normalized: TransmisiDatabase = {
        ...data,
        schedules: data.schedules ?? [],
      };
      setDb(normalized);
      localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(normalized));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Gagal membaca file data/transmisi.json'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialJson(false);
  }, []);

  const persistDb = (nextDb: TransmisiDatabase) => {
    setDb(nextDb);
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(nextDb));
  };

  const currentUser =
    db?.users.find((u) => u.id === currentUserId) ?? null;

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

    persistDb({ ...db, stations: nextStations });
  };

  const handleToggleDeviceCondition = (deviceId: string) => {
    if (!db) return;
    const nowLabel = formatNowWIB().replace(' WIB', '');
    const nextDevices: DeviceItem[] = db.devices.map((d) => {
      if (d.id !== deviceId) return d;
      const nextCond = d.condition === 'Normal' ? 'Rusak' : 'Normal';
      return {
        ...d,
        condition: nextCond,
        active: nextCond === 'Normal',
        lastChecked: nowLabel,
        notes:
          nextCond === 'Normal'
            ? 'Perangkat dipulihkan dan beroperasi normal'
            : 'Ditandai rusak oleh petugas monitoring',
      };
    });
    persistDb({ ...db, devices: nextDevices });
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
      active: payload.condition === 'Normal',
      lastChecked: nowLabel,
      notes: payload.notes,
    };
    persistDb({
      ...db,
      devices: [newDevice, ...db.devices],
    });
  };

  const handleDeleteDevice = (deviceId: string) => {
    if (!db) return;
    persistDb({
      ...db,
      devices: db.devices.filter((d) => d.id !== deviceId),
    });
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

    persistDb({
      ...db,
      reports: [newReport, ...db.reports],
      notifications: [newNotif, ...db.notifications],
    });
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

    persistDb({
      ...db,
      reports: nextReports,
      notifications: [newNotif, ...db.notifications],
    });
  };

  const handleDeleteReport = (reportId: string) => {
    if (!db) return;
    persistDb({
      ...db,
      reports: db.reports.filter((r) => r.id !== reportId),
      notifications: db.notifications.filter((n) => n.reportId !== reportId),
    });
  };

  const handleAddUser = (payload: {
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    stationId: string;
    roleStatus: TechnicianRoleStatus | 'Koordinator';
    education: string;
    gender: GenderType;
    phone: string;
  }) => {
    if (!db) return;
    const st = db.stations.find((s) => s.id === payload.stationId);
    const region = st?.region ?? 'Palembang';
    const avatarKey =
      payload.role === 'Admin'
        ? 'coord_admin'
        : payload.gender === 'Perempuan'
        ? 'tech_female_1'
        : 'tech_male_2';

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      username: payload.username,
      password: payload.password,
      fullName: payload.fullName,
      role: payload.role,
      stationId: payload.stationId,
      region,
      roleStatus: payload.roleStatus,
      education: payload.education,
      gender: payload.gender,
      phone: payload.phone,
      avatarKey,
    };

    let nextTechs = db.technicians;
    if (payload.role === 'Teknisi') {
      const newTech: Technician = {
        id: `tec-${Date.now()}`,
        name: payload.fullName,
        stationId: payload.stationId,
        region,
        roleStatus:
          payload.roleStatus === 'Koordinator'
            ? 'Koordinator Daerah'
            : payload.roleStatus,
        education: payload.education,
        gender: payload.gender,
        onDuty: true,
        shift: 'Pagi (07:00 - 15:00)',
        phone: payload.phone || '0812-7000-0000',
        avatarKey,
      };
      nextTechs = [...db.technicians, newTech];
    }

    persistDb({
      ...db,
      users: [...db.users, newUser],
      technicians: nextTechs,
    });
  };

  const handleUpdateUser = (payload: {
    id: string;
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    stationId: string;
    roleStatus: TechnicianRoleStatus | 'Koordinator';
    education: string;
    gender: GenderType;
    phone: string;
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
            roleStatus: payload.roleStatus,
            education: payload.education,
            gender: payload.gender,
            phone: payload.phone,
            avatarDataUrl: payload.avatarDataUrl ?? u.avatarDataUrl ?? null,
          }
        : u
    );

    const nextTechs = db.technicians.map((t) => {
      if (oldUser && t.name === oldUser.fullName) {
        return {
          ...t,
          name: payload.fullName,
          stationId: payload.stationId,
          region,
          roleStatus:
            payload.roleStatus === 'Koordinator'
              ? 'Koordinator Daerah'
              : payload.roleStatus,
          education: payload.education,
          gender: payload.gender,
          phone: payload.phone || t.phone,
          avatarDataUrl: payload.avatarDataUrl ?? t.avatarDataUrl ?? null,
        };
      }
      return t;
    });

    persistDb({
      ...db,
      users: nextUsers,
      technicians: nextTechs,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!db || userId === currentUserId) return;
    persistDb({
      ...db,
      users: db.users.filter((u) => u.id !== userId),
    });
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

    persistDb({
      ...db,
      stations: [...db.stations, newStation],
      devices: [...db.devices, ...defaultDevices],
    });
  };

  const handleUpdateStationCoords = (
    stationId: string,
    latitude: number,
    longitude: number
  ) => {
    if (!db) return;
    persistDb({
      ...db,
      stations: db.stations.map((s) =>
        s.id === stationId ? { ...s, latitude, longitude } : s
      ),
    });
  };

  const handleImportSchedules = (
    newSchedules: ScheduleAssignment[],
    replaceExisting: boolean
  ) => {
    if (!db) return;
    persistDb({
      ...db,
      schedules: replaceExisting
        ? newSchedules
        : [...newSchedules, ...db.schedules],
    });
  };

  const handleChangePassword = (newPassword: string) => {
    if (!db || !currentUser) return;
    persistDb({
      ...db,
      users: db.users.map((u) =>
        u.id === currentUser.id ? { ...u, password: newPassword } : u
      ),
    });
  };

  const handleMarkAllRead = () => {
    if (!db) return;
    persistDb({
      ...db,
      notifications: db.notifications.map((n) => ({ ...n, read: true })),
    });
  };

  const handleSelectNotification = (notif: AppNotification) => {
    if (!db) return;
    persistDb({
      ...db,
      notifications: db.notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n
      ),
    });
    setActiveNav('laporan');
  };

  const handleExportJson = () => {
    if (!db) return;
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transmisi.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetLocalData = () => {
    localStorage.removeItem(STORAGE_DB_KEY);
    void loadInitialJson(true);
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
            Gagal Memuat Data Statis JSON
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void loadInitialJson(true)}
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
        onExportJson={handleExportJson}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeNav={activeNav}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
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
              onToggleDeviceCondition={handleToggleDeviceCondition}
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
              onImportSchedules={handleImportSchedules}
            />
          )}

          {activeNav === 'laporan' && (
            <LaporanView
              stations={db.stations}
              reports={db.reports}
              currentUser={currentUser}
              onSubmitReport={handleSubmitReport}
            />
          )}

          {activeNav === 'admin' && currentUser.role === 'Admin' && (
            <AdminView
              stations={db.stations}
              devices={db.devices}
              reports={db.reports}
              users={db.users}
              currentUser={currentUser}
              onUpdateReportStatus={handleUpdateReportStatus}
              onDeleteReport={handleDeleteReport}
              onAddDevice={handleAddDevice}
              onDeleteDevice={handleDeleteDevice}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onAddStation={handleAddStation}
              onUpdateStationCoords={handleUpdateStationCoords}
              onExportJson={handleExportJson}
              onResetLocalData={handleResetLocalData}
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
    </div>
  );
}
