export type DeviceCategory =
  | 'Input / Headend'
  | 'Pemancar'
  | 'Pendukung'
  | 'Kelistrikan';

export type DeviceCondition = 'Normal' | 'Rusak';

export interface DeviceItem {
  id: string;
  stationId: string;
  name: string;
  category: DeviceCategory;
  brandModel: string;
  condition: DeviceCondition;
  active: boolean;
  lastChecked: string;
  notes: string;
}

export interface PowerReadingPoint {
  time: string;
  powerKw: number;
  reflectedW: number;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  region: string;
  address: string;
  latitude: number;
  longitude: number;
  channelFreq: string;
  maxCapacityKw: number;
  forwardPowerKw: number;
  reflectedPowerW: number;
  lastPowerInputBy: string;
  lastPowerUpdatedAt: string;
  powerHistory: PowerReadingPoint[];
}

export type EmploymentStatus = 'PNS' | 'PPPK';
export type GenderCode = 'L' | 'P';

export interface Technician {
  id: string;
  name: string;
  stationId: string;
  region: string;
  gender: GenderCode;
  employmentStatus: EmploymentStatus;
  jabatan: string;
  onDuty: boolean;
  shift: string;
  phone: string;
  avatarKey: 'coord_admin' | 'tech_male_1' | 'tech_male_2' | 'tech_female_1';
  avatarDataUrl?: string | null;
}

export type TicketStatus =
  | 'Pengajuan'
  | 'Laporan diterima'
  | 'Laporan diproses'
  | 'Selesai';

export type ReportPriority = 'Biasa' | 'Urgent';

export interface TicketHistoryEntry {
  status: TicketStatus;
  timestamp: string;
  actor: string;
  note: string;
}

export interface MaintenanceReport {
  id: string;
  stationId: string;
  subject: string;
  description: string;
  attachmentName: string | null;
  attachmentDataUrl?: string | null;
  priority: ReportPriority;
  status: TicketStatus;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
  adminNote: string;
  history: TicketHistoryEntry[];
}

export type UserRole = 'Admin' | 'Teknisi';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  stationId: string;
  region: string;
  gender: GenderCode;
  employmentStatus: EmploymentStatus;
  jabatan: string;
  onDuty: boolean;
  shift: string;
  phone: string;
  avatarKey: 'coord_admin' | 'tech_male_1' | 'tech_male_2' | 'tech_female_1';
  avatarDataUrl?: string | null;
}

export interface AppNotification {
  id: string;
  reportId: string;
  title: string;
  message: string;
  status: TicketStatus;
  timestamp: string;
  read: boolean;
}

export type ScheduleDayBucket = 'Kemarin' | 'Hari Ini' | 'Besok';

export interface ScheduleAssignment {
  id: string;
  dayBucket: ScheduleDayBucket;
  dateLabel: string;
  stationRegion: string;
  technicianName: string;
  roleStatus: string;
  shift: string;
  notes?: string;
}

export interface InfrastructureItem {
  id: string;
  stationId: string;
  stationName: string;
  landArea: string;
  landStatus: string;
  txRoomArea: string;
  txRoomCondition: string;
  officialHouseCount: number;
  officialHouseCondition: string;
  gensetRoomArea: string;
  gensetRoomCondition: string;
  towerHeightM: number;
  towerCondition: string;
  antennaInfo: string;
  coverageArea: string;
}

export interface TransmisiDatabase {
  stations: Station[];
  devices: DeviceItem[];
  technicians: Technician[];
  reports: MaintenanceReport[];
  users: UserAccount[];
  notifications: AppNotification[];
  schedules: ScheduleAssignment[];
  infrastructure: InfrastructureItem[];
}

export type NavSection =
  | 'home'
  | 'perangkat'
  | 'sarana'
  | 'teknisi'
  | 'jadwal'
  | 'laporan'
  | 'admin';
