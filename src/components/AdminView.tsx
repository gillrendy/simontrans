import { useState } from 'react';
import {
  Cpu,
  Download,
  FileBarChart2,
  FileCheck2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import {
  DeviceCategory,
  DeviceCondition,
  DeviceItem,
  EmploymentStatus,
  GenderCode,
  InfrastructureItem,
  MaintenanceReport,
  Station,
  Technician,
  TicketStatus,
  UserAccount,
  UserRole,
} from '../types/transmisi';
import { ConfirmModal } from './ConfirmModal';
import { MonthlyReportModal } from './MonthlyReportModal';
import { TechAvatar } from './TechAvatar';

interface AdminViewProps {
  stations: Station[];
  devices: DeviceItem[];
  technicians: Technician[];
  infrastructure: InfrastructureItem[];
  reports: MaintenanceReport[];
  users: UserAccount[];
  currentUser: UserAccount;
  onUpdateReportStatus: (
    reportId: string,
    newStatus: TicketStatus,
    adminNote: string
  ) => void;
  onDeleteReport: (reportId: string) => void;
  onAddDevice: (payload: {
    name: string;
    category: DeviceCategory;
    stationId: string;
    brandModel: string;
    notes: string;
    condition: DeviceCondition;
  }) => void;
  onUpdateDeviceCondition: (deviceId: string, condition: DeviceCondition) => void;
  onDeleteDevice: (deviceId: string) => void;
  onAddUser: (payload: {
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
  }) => void;
  onUpdateUser: (payload: {
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
  }) => void;
  onDeleteUser: (userId: string) => void;
  onAddStation: (payload: {
    code: string;
    name: string;
    region: string;
    address: string;
    latitude: number;
    longitude: number;
    channelFreq: string;
    maxCapacityKw: number;
    forwardPowerKw: number;
  }) => void;
  onUpdateStationCoords: (
    stationId: string,
    latitude: number,
    longitude: number
  ) => void;
  onExportJson: () => void;
  onResetLocalData: () => void;
}

type AdminTab = 'laporan' | 'peralatan' | 'users' | 'koordinat';

const STATUS_FLOW: TicketStatus[] = [
  'Pengajuan',
  'Laporan diterima',
  'Laporan diproses',
  'Selesai',
];

const DEVICE_CATEGORIES: DeviceCategory[] = [
  'Input / Headend',
  'Pemancar',
  'Pendukung',
  'Kelistrikan',
];

const SHIFT_OPTIONS = [
  'Shift 1 (00.00 - 08.00)',
  'Shift 2 (08.00 - 16.00)',
  'Shift 3 (16.00 - 24.00)',
];

export function AdminView({
  stations,
  devices,
  technicians,
  infrastructure,
  reports,
  users,
  currentUser,
  onUpdateReportStatus,
  onDeleteReport,
  onAddDevice,
  onUpdateDeviceCondition,
  onDeleteDevice,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddStation,
  onUpdateStationCoords,
  onExportJson,
  onResetLocalData,
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('laporan');
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false);

  // Report processing & delete confirmation state
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, TicketStatus>>({});
  const [confirmDeleteReportId, setConfirmDeleteReportId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Device management ("Kelola Peralatan") state
  const [devName, setDevName] = useState('');
  const [devCategory, setDevCategory] = useState<DeviceCategory>('Pemancar');
  const [devStationId, setDevStationId] = useState(stations[0]?.id ?? '');
  const [devBrandModel, setDevBrandModel] = useState('');
  const [devNotes, setDevNotes] = useState('');
  const [devCondition, setDevCondition] = useState<DeviceCondition>('Normal');
  const [devFilterStation, setDevFilterStation] = useState<string>('all');
  const [confirmDeleteDeviceId, setConfirmDeleteDeviceId] = useState<string | null>(null);

  // User management form state
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('teknisi123');
  const [uFullName, setUFullName] = useState('');
  const [uRole, setURole] = useState<UserRole>('Teknisi');
  const [uStationId, setUStationId] = useState(stations[0]?.id ?? '');
  const [uEmploymentStatus, setUEmploymentStatus] = useState<EmploymentStatus>('PNS');
  const [uJabatan, setUJabatan] = useState('Operator');
  const [uGender, setUGender] = useState<GenderCode>('L');
  const [uShift, setUShift] = useState(SHIFT_OPTIONS[1]);
  const [uPhone, setUPhone] = useState('0812-7000-0000');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStationFilter, setUserStationFilter] = useState<string>('all');

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Teknisi');
  const [editStationId, setEditStationId] = useState('');
  const [editEmploymentStatus, setEditEmploymentStatus] = useState<EmploymentStatus>('PNS');
  const [editJabatan, setEditJabatan] = useState('Operator');
  const [editGender, setEditGender] = useState<GenderCode>('L');
  const [editShift, setEditShift] = useState(SHIFT_OPTIONS[1]);
  const [editPhone, setEditPhone] = useState('');
  const [editOnDuty, setEditOnDuty] = useState(true);
  const [editAvatarDataUrl, setEditAvatarDataUrl] = useState<string | null>(null);

  // Station coordinate form state
  const [stCode, setStCode] = useState('TX-OKI-08');
  const [stName, setStName] = useState('');
  const [stRegion, setStRegion] = useState('');
  const [stAddress, setStAddress] = useState('');
  const [stLat, setStLat] = useState('-3.3958');
  const [stLon, setStLon] = useState('104.8236');
  const [stChannel, setStChannel] = useState('MUX Ch 36 UHF · 594 MHz');
  const [stMaxKw, setStMaxKw] = useState('3.0');
  const [stForwardKw, setStForwardKw] = useState('2.5');
  const [coordEdits, setCoordEdits] = useState<
    Record<string, { lat: string; lon: string }>
  >({});

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSaveTicket = (rep: MaintenanceReport) => {
    const nextStatus = statusDrafts[rep.id] ?? rep.status;
    const nextNote = noteDrafts[rep.id] ?? rep.adminNote;
    onUpdateReportStatus(rep.id, nextStatus, nextNote);
    showFeedback(`Status tiket ${rep.id} diperbarui menjadi "${nextStatus}".`);
  };

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devName.trim() || !devBrandModel.trim() || !devStationId) return;
    onAddDevice({
      name: devName.trim(),
      category: devCategory,
      stationId: devStationId,
      brandModel: devBrandModel.trim(),
      notes:
        devNotes.trim() ||
        (devCondition === 'Normal'
          ? 'Beroperasi normal'
          : devCondition === 'Proses Perbaikan'
          ? 'Sedang dalam proses perbaikan teknis'
          : 'Memerlukan perbaikan'),
      condition: devCondition,
    });
    setDevName('');
    setDevBrandModel('');
    setDevNotes('');
    setDevCondition('Normal');
    showFeedback(`Perangkat "${devName.trim()}" berhasil ditambahkan.`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uUsername.trim() || !uFullName.trim() || !uPassword.trim()) return;
    onAddUser({
      username: uUsername.trim().toLowerCase(),
      password: uPassword,
      fullName: uFullName.trim(),
      role: uRole,
      stationId: uStationId,
      gender: uGender,
      employmentStatus: uEmploymentStatus,
      jabatan: uJabatan.trim() || 'Operator',
      shift: uShift,
      phone: uPhone.trim() || '0812-7000-0000',
    });
    setUUsername('');
    setUFullName('');
    showFeedback(`Akun & profil teknisi "${uFullName.trim()}" berhasil ditambahkan.`);
  };

  const openEditUserModal = (user: UserAccount) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditPassword(user.password);
    setEditRole(user.role);
    setEditStationId(user.stationId);
    setEditEmploymentStatus(user.employmentStatus);
    setEditJabatan(user.jabatan);
    setEditGender(user.gender);
    setEditShift(SHIFT_OPTIONS.includes(user.shift) ? user.shift : SHIFT_OPTIONS[1]);
    setEditPhone(user.phone || '0812-7000-0000');
    setEditOnDuty(user.onDuty);
    setEditAvatarDataUrl(user.avatarDataUrl ?? null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatarDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editFullName.trim() || !editUsername.trim()) return;
    onUpdateUser({
      id: editingUser.id,
      username: editUsername.trim().toLowerCase(),
      password: editPassword,
      fullName: editFullName.trim(),
      role: editRole,
      stationId: editStationId,
      gender: editGender,
      employmentStatus: editEmploymentStatus,
      jabatan: editJabatan.trim() || 'Operator',
      shift: editShift,
      phone: editPhone.trim(),
      onDuty: editOnDuty,
      avatarDataUrl: editAvatarDataUrl,
    });
    setEditingUser(null);
    showFeedback(`Data user "${editFullName.trim()}" berhasil diperbarui & disinkronkan.`);
  };

  const handleCreateStation = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(stLat);
    const lon = parseFloat(stLon);
    const maxKw = parseFloat(stMaxKw);
    const fwdKw = parseFloat(stForwardKw);
    if (
      !stName.trim() ||
      !stRegion.trim() ||
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      Number.isNaN(maxKw)
    ) {
      return;
    }

    onAddStation({
      code: stCode.trim() || `TX-NEW-${stations.length + 1}`,
      name: stName.trim(),
      region: stRegion.trim(),
      address: stAddress.trim() || `Wilayah ${stRegion.trim()}, Sumatera Selatan`,
      latitude: lat,
      longitude: lon,
      channelFreq: stChannel.trim(),
      maxCapacityKw: maxKw,
      forwardPowerKw: Number.isNaN(fwdKw) ? 0 : fwdKw,
    });
    setStName('');
    setStRegion('');
    setStAddress('');
    showFeedback(`Pin lokasi "${stName.trim()}" ditambahkan ke peta satelit.`);
  };

  const filteredDevices = devices.filter(
    (d) => devFilterStation === 'all' || d.stationId === devFilterStation
  );

  const filteredUsers = users.filter((u) => {
    if (userStationFilter !== 'all' && u.stationId !== userStationFilter) return false;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.jabatan.toLowerCase().includes(q) ||
        u.employmentStatus.toLowerCase().includes(q) ||
        u.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Admin Tabs + Export JSON */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('laporan')}
            className={`px-3.5 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'laporan'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Proses Laporan ({reports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('peralatan')}
            className={`px-3.5 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'peralatan'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Kelola Peralatan ({devices.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Kelola User ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('koordinat')}
            className={`px-3.5 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'koordinat'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Titik Koordinat Pemancar ({stations.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetLocalData}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Reset ke JSON Awal
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor transmisi.json</span>
          </button>
          <button
            type="button"
            onClick={() => setMonthlyReportOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <FileBarChart2 className="w-3.5 h-3.5" />
            <span>Buat Laporan Bulanan</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {feedbackMsg}
        </div>
      )}

      {/* TAB 1: PROSES LAPORAN (dengan tombol Hapus Laporan + konfirmasi) */}
      {activeTab === 'laporan' && (
        <div className="space-y-4">
          {reports.map((rep) => {
            const st = stations.find((s) => s.id === rep.stationId);
            const selectedStatus = statusDrafts[rep.id] ?? rep.status;
            const draftNote = noteDrafts[rep.id] ?? rep.adminNote;

            return (
              <div
                key={rep.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {rep.id} · {st?.name ?? rep.stationId} · Pelapor: {rep.submittedBy} ·{' '}
                      <span
                        className={
                          rep.priority === 'Urgent'
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : ''
                        }
                      >
                        {rep.priority}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      {rep.subject}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                      {rep.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Update: {rep.updatedAt}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteReportId(rep.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Laporan</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Ubah Status Tiket
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) =>
                        setStatusDrafts((prev) => ({
                          ...prev,
                          [rep.id]: e.target.value as TicketStatus,
                        }))
                      }
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                    >
                      {STATUS_FLOW.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-7">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Catatan Tindak Lanjut Admin / Koordinator
                    </label>
                    <input
                      type="text"
                      value={draftNote}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [rep.id]: e.target.value,
                        }))
                      }
                      placeholder="Masukkan catatan progres penanganan..."
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleSaveTicket(rep)}
                      className="w-full h-9 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Simpan &amp; Notifikasi
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {reports.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada data laporan pemeliharaan.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KELOLA PERALATAN */}
      {activeTab === 'peralatan' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Form Tambah Perangkat */}
          <form
            onSubmit={handleCreateDevice}
            className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3.5"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
              Tambah Perangkat Baru
            </h2>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Nama Perangkat
              </label>
              <input
                type="text"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="mis. Pemancar Utama UHF 5 kW"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Jenis Perangkat
                </label>
                <select
                  value={devCategory}
                  onChange={(e) => setDevCategory(e.target.value as DeviceCategory)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                >
                  {DEVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Lokasi Satuan
                </label>
                <select
                  value={devStationId}
                  onChange={(e) => setDevStationId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  required
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.region}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Merk / Tipe
              </label>
              <input
                type="text"
                value={devBrandModel}
                onChange={(e) => setDevBrandModel(e.target.value)}
                placeholder="mis. Rohde & Schwarz THU9evo"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Catatan
              </label>
              <input
                type="text"
                value={devNotes}
                onChange={(e) => setDevNotes(e.target.value)}
                placeholder="mis. Output stabil 4.2 kW / perlu cek modul"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Status / Kondisi
              </label>
              <select
                value={devCondition}
                onChange={(e) => setDevCondition(e.target.value as DeviceCondition)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="Normal">Normal - Aktif</option>
                <option value="Proses Perbaikan">Proses Perbaikan - Aktif Parsial</option>
                <option value="Rusak">Rusak - Tidak Aktif</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Perangkat</span>
            </button>
          </form>

          {/* Daftar Perangkat + Hapus */}
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daftar Peralatan Terdaftar ({filteredDevices.length})
              </h2>
              <select
                value={devFilterStation}
                onChange={(e) => setDevFilterStation(e.target.value)}
                aria-label="Filter lokasi peralatan"
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="all">Semua Lokasi</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.region}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                    <th className="py-2.5 px-4">Perangkat</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3">Lokasi</th>
                    <th className="py-2.5 px-3">Merk / Tipe</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredDevices.map((dev) => {
                    const st = stations.find((s) => s.id === dev.stationId);
                    const isNormal = dev.condition === 'Normal';
                    const isRepair = dev.condition === 'Proses Perbaikan';
                    return (
                      <tr key={dev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {dev.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {dev.notes}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {dev.category}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {st?.region ?? dev.stationId}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {dev.brandModel}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={dev.condition}
                            onChange={(e) => {
                              const nextCond = e.target.value as DeviceCondition;
                              onUpdateDeviceCondition(dev.id, nextCond);
                              showFeedback(
                                `Status "${dev.name}" diubah menjadi "${nextCond}".`
                              );
                            }}
                            aria-label={`Status perangkat ${dev.name}`}
                            className={`h-8 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                              isNormal
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isRepair
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            <option value="Normal">Normal - Aktif</option>
                            <option value="Proses Perbaikan">
                              Proses Perbaikan - Aktif Parsial
                            </option>
                            <option value="Rusak">Rusak - Tidak Aktif</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDeviceId(dev.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDevices.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        Tidak ada peralatan pada lokasi ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KELOLA USER (dengan ikon Pensil untuk Edit User & Upload Foto Profil) */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Form Add User */}
          <form
            onSubmit={handleCreateUser}
            className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3.5"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
              Tambah User / Teknisi Baru
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Username Login
                </label>
                <input
                  type="text"
                  value={uUsername}
                  onChange={(e) => setUUsername(e.target.value)}
                  placeholder="mis. arif_btr"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Password Awal
                </label>
                <input
                  type="text"
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={uFullName}
                onChange={(e) => setUFullName(e.target.value)}
                placeholder="mis. Arif Darmawan"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Hak Akses (Role)
                </label>
                <select
                  value={uRole}
                  onChange={(e) => setURole(e.target.value as UserRole)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Teknisi">Teknisi</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Lokasi Penempatan
                </label>
                <select
                  value={uStationId}
                  onChange={(e) => setUStationId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.region}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Jabatan
                </label>
                <select
                  value={uJabatan}
                  onChange={(e) => setUJabatan(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="Koordinator Teknik">Koordinator Teknik</option>
                  <option value="Ketua Tim Palembang">Ketua Tim Palembang</option>
                  <option value="Ketua Tim">Ketua Tim</option>
                  <option value="Operator">Operator</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Status Kepegawaian
                </label>
                <select
                  value={uEmploymentStatus}
                  onChange={(e) => setUEmploymentStatus(e.target.value as EmploymentStatus)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Gender
                </label>
                <select
                  value={uGender}
                  onChange={(e) => setUGender(e.target.value as GenderCode)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="L">L (Laki-laki)</option>
                  <option value="P">P (Perempuan)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  No. Telepon / HP
                </label>
                <input
                  type="text"
                  value={uPhone}
                  onChange={(e) => setUPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Jam Kerja Shift
              </label>
              <select
                value={uShift}
                onChange={(e) => setUShift(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
              >
                {SHIFT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah User</span>
            </button>
          </form>

          {/* Users table with Edit (Pencil) & Delete (Trash) icons */}
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daftar Akun &amp; Teknisi ({filteredUsers.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Cari nama, jabatan..."
                    className="h-8 pl-8 pr-2.5 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <select
                  value={userStationFilter}
                  onChange={(e) => setUserStationFilter(e.target.value)}
                  aria-label="Filter lokasi user"
                  className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="all">Semua Lokasi</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.region}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TechAvatar
                      name={u.fullName}
                      avatarKey={u.avatarKey}
                      avatarDataUrl={u.avatarDataUrl}
                      sizeClass="w-10 h-10"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {u.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        @{u.username} · {u.role} · {u.region} · {u.employmentStatus} · {u.jabatan} · {u.gender}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditUserModal(u)}
                      className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label={`Edit profil ${u.fullName}`}
                      title="Edit profil & foto"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {u.id !== currentUser.id ? (
                      <button
                        type="button"
                        onClick={() => onDeleteUser(u.id)}
                        className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        aria-label={`Hapus user ${u.fullName}`}
                        title="Hapus user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 px-1.5">
                        Aktif
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Tidak ada user yang sesuai filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INPUT PIN TITIK KOORDINAT PEMANCAR */}
      {activeTab === 'koordinat' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Add New Pin Form */}
          <form
            onSubmit={handleCreateStation}
            className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3.5"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
              Tambah Pin Titik Koordinat Pemancar
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Kode Site
                </label>
                <input
                  type="text"
                  value={stCode}
                  onChange={(e) => setStCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Daerah / Kabupaten
                </label>
                <input
                  type="text"
                  value={stRegion}
                  onChange={(e) => setStRegion(e.target.value)}
                  placeholder="mis. Kayu Agung (OKI)"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Nama Satuan Transmisi
              </label>
              <input
                type="text"
                value={stName}
                onChange={(e) => setStName(e.target.value)}
                placeholder="mis. Satuan Transmisi Kayu Agung"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Alamat Lengkap Lokasi
              </label>
              <input
                type="text"
                value={stAddress}
                onChange={(e) => setStAddress(e.target.value)}
                placeholder="Alamat tower / gedung pemancar"
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Latitude (-1.65 s/d -4.95)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={stLat}
                  onChange={(e) => setStLat(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Longitude (102.05 s/d 106.15)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={stLon}
                  onChange={(e) => setStLon(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 sm:col-span-1">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Kapasitas (kW)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={stMaxKw}
                  onChange={(e) => setStMaxKw(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Daya Awal (kW)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={stForwardKw}
                  onChange={(e) => setStForwardKw(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Kanal MUX
                </label>
                <input
                  type="text"
                  value={stChannel}
                  onChange={(e) => setStChannel(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>Tambahkan Pin ke Peta</span>
            </button>
          </form>

          {/* Existing Station Coordinates Table */}
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daftar Titik Koordinat Lokasi Pemancar
              </h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {stations.map((st) => {
                const draft = coordEdits[st.id] ?? {
                  lat: String(st.latitude),
                  lon: String(st.longitude),
                };
                return (
                  <div
                    key={st.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {st.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {st.code} · {st.region} · {st.channelFreq}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={draft.lat}
                        onChange={(e) =>
                          setCoordEdits((prev) => ({
                            ...prev,
                            [st.id]: { ...draft, lat: e.target.value },
                          }))
                        }
                        aria-label={`Latitude ${st.name}`}
                        className="w-24 h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={draft.lon}
                        onChange={(e) =>
                          setCoordEdits((prev) => ({
                            ...prev,
                            [st.id]: { ...draft, lon: e.target.value },
                          }))
                        }
                        aria-label={`Longitude ${st.name}`}
                        className="w-24 h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const lat = parseFloat(draft.lat);
                          const lon = parseFloat(draft.lon);
                          if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                            onUpdateStationCoords(st.id, lat, lon);
                            showFeedback(`Koordinat ${st.region} diperbarui.`);
                          }
                        }}
                        className="h-8 px-3 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        Update Pin
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit User & Upload Foto Profil */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Edit Profil User &amp; Foto
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Tutup edit user"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              {/* Upload Foto Profil */}
              <div className="flex items-center gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <TechAvatar
                  name={editFullName || editingUser.fullName}
                  avatarKey={editingUser.avatarKey}
                  avatarDataUrl={editAvatarDataUrl}
                  sizeClass="w-16 h-16"
                />
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:border-sky-500">
                    <Upload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Upload Foto Profil</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Format JPG/PNG. Foto tersinkronisasi ke profil teknisi.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Hak Akses (Role)
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Teknisi">Teknisi</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Lokasi Penempatan
                  </label>
                  <select
                    value={editStationId}
                    onChange={(e) => setEditStationId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.region}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Jabatan
                  </label>
                  <select
                    value={editJabatan}
                    onChange={(e) => setEditJabatan(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Koordinator Teknik">Koordinator Teknik</option>
                    <option value="Ketua Tim Palembang">Ketua Tim Palembang</option>
                    <option value="Ketua Tim">Ketua Tim</option>
                    <option value="Operator">Operator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Status Kepegawaian
                  </label>
                  <select
                    value={editEmploymentStatus}
                    onChange={(e) =>
                      setEditEmploymentStatus(e.target.value as EmploymentStatus)
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as GenderCode)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="L">L (Laki-laki)</option>
                    <option value="P">P (Perempuan)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    No. Telepon / HP
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Jam Kerja Shift
                </label>
                <select
                  value={editShift}
                  onChange={(e) => setEditShift(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
                >
                  {SHIFT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={editOnDuty}
                  onChange={(e) => setEditOnDuty(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Status Bertugas (On Duty)</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Hapus Perangkat */}
      <ConfirmModal
        open={confirmDeleteDeviceId !== null}
        message="Yakin ingin hapus perangkat ini?"
        detail="Perangkat akan dihapus dari inventaris lokasi dan tidak lagi tampil di peta monitoring."
        onCancel={() => setConfirmDeleteDeviceId(null)}
        onConfirm={() => {
          if (confirmDeleteDeviceId) {
            onDeleteDevice(confirmDeleteDeviceId);
            showFeedback('Perangkat berhasil dihapus.');
          }
          setConfirmDeleteDeviceId(null);
        }}
      />

      {/* Confirmation Modal: Hapus Laporan */}
      <ConfirmModal
        open={confirmDeleteReportId !== null}
        message="Yakin ingin hapus laporan ini?"
        detail="Riwayat tiket laporan akan dihapus secara permanen dari daftar."
        onCancel={() => setConfirmDeleteReportId(null)}
        onConfirm={() => {
          if (confirmDeleteReportId) {
            onDeleteReport(confirmDeleteReportId);
            showFeedback(`Laporan ${confirmDeleteReportId} berhasil dihapus.`);
          }
          setConfirmDeleteReportId(null);
        }}
      />

      {/* Modal Buat Laporan Bulanan */}
      <MonthlyReportModal
        open={monthlyReportOpen}
        onClose={() => setMonthlyReportOpen(false)}
        stations={stations}
        devices={devices}
        infrastructure={infrastructure}
        technicians={technicians}
      />
    </div>
  );
}
