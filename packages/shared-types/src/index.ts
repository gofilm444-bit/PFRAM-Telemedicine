export type UserRole = "MOTHER" | "MIDWIFE" | "ADMIN";
export type UserStatus =
  "PENDING" | "ACTIVE" | "DISABLED" | "BLOCKED" | "ARCHIVED";
export interface PublicUser {
  publicId: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  displayName: string;
}
export interface AuthenticatedUser extends PublicUser {
  phoneVerifiedAt: string | null;
  profileCompletionStatus?:
    | "ACCOUNT_READY"
    | "PERSONAL_PROFILE_INCOMPLETE"
    | "PREGNANCY_PROFILE_INCOMPLETE"
    | "FACILITY_NOT_SELECTED"
    | "MIDWIFE_NOT_ASSIGNED"
    | "COMPLETE";
  profileCompleted?: boolean;
  activePregnancy?: PregnancySummary | null;
  selectedFacility?: {
    publicId: string;
    name: string;
    phoneNumber?: string | null;
  } | null;
  activeMidwifeAssignment?: {
    publicId: string;
    midwife: {
      publicId: string;
      fullName: string;
      whatsappNumber?: string | null;
    };
    startedAt: string;
  } | null;
}
export interface PregnancySummary {
  publicId: string;
  status: string;
  pregnancyType: string;
  completedProfile: boolean;
  estimatedDueDate: string;
  gestationalAge: { weeks: number; days: number } | null;
  trimester: 1 | 2 | 3 | null;
}
export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}
export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
  requestId: string;
}
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  version: string;
  timestamp: string;
  database?: "up" | "down";
}
export interface SessionInfo {
  accessToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
  refreshToken?: string;
  csrfToken?: string;
}

export type MonitoringSource =
  | "SELF"
  | "POSYANDU"
  | "PUSKESMAS"
  | "HOSPITAL"
  | "CLINIC"
  | "MIDWIFE"
  | "OTHER";

export interface MonitoringEntry {
  publicId: string;
  motherPublicId: string;
  pregnancyPublicId: string;
  recordedAt: string;
  source: MonitoringSource;
  weightKg: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  notes: string | null;
  createdBy: {
    publicId: string;
    role: UserRole;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface MonitoringListItem {
  publicId: string;
  recordedAt: string;
  source: MonitoringSource;
  weightKg: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  notes: string | null;
  createdByName: string;
  isArchived: boolean;
}

export interface MonitoringSummary {
  latestWeight: number | null;
  latestWeightRecordedAt: string | null;
  latestBloodPressure: {
    systolic: number;
    diastolic: number;
  } | null;
  latestBloodPressureRecordedAt: string | null;
  previousWeight: number | null;
  weightChange: number | null;
  totalEntries: number;
  activePregnancyPublicId: string | null;
}

export interface MonitoringCreateInput {
  pregnancyPublicId?: string;
  recordedAt?: string;
  source?: MonitoringSource;
  weightKg?: number;
  systolicBp?: number;
  diastolicBp?: number;
  notes?: string;
}

export interface MonitoringUpdateInput {
  recordedAt?: string;
  source?: MonitoringSource;
  weightKg?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  notes?: string | null;
}

export interface MonitoringQuery {
  pregnancyPublicId?: string;
  from?: string;
  to?: string;
  type?: "all" | "weight" | "blood_pressure" | "both";
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}
