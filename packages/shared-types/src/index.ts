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
  pregnancyPublicId?: string | undefined;
  recordedAt?: string | undefined;
  source?: MonitoringSource | undefined;
  weightKg?: number | undefined;
  systolicBp?: number | undefined;
  diastolicBp?: number | undefined;
  notes?: string | undefined;
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


export interface WeightChartPoint {
  id: string;
  recordedAt: string;
  weightKg: number;
  source: MonitoringSource;
  gestationalAge?: { weeks: number; days: number } | null;
}

export interface BloodPressureChartPoint {
  id: string;
  recordedAt: string;
  systolicBp: number;
  diastolicBp: number;
  source: MonitoringSource;
  gestationalAge?: { weeks: number; days: number } | null;
}

export type MonitoringPeriodFilter = "7_days" | "30_days" | "active_pregnancy";

// ==========================================
// TAHAP 5A — SMART ANC REMINDER & KEPATUHAN
// ==========================================

export type AncVisitStatus = "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
export type AncVisitType = "ANC" | "DOCTOR_ANC";
export type ReminderType = "ANC_VISIT" | "IRON_TABLET";
export type ReminderStatus = "PENDING" | "COMPLETED" | "SNOOZED" | "MISSED" | "CANCELLED";

export interface AncSchedule {
  publicId: string;
  motherPublicId: string;
  pregnancyPublicId: string;
  facility?: { publicId: string; name: string } | null;
  scheduledAt: string;
  visitType: AncVisitType;
  doctorRequired: boolean;
  status: AncVisitStatus;
  notes?: string | null;
  completedAt?: string | null;
  createdBy?: { publicId: string; role: UserRole; name?: string | null } | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface AncScheduleCreateInput {
  scheduledAt: string;
  visitType?: AncVisitType;
  doctorRequired?: boolean;
  facilityPublicId?: string | null;
  notes?: string | null;
}

export interface AncScheduleUpdateInput {
  scheduledAt?: string;
  visitType?: AncVisitType;
  doctorRequired?: boolean;
  status?: AncVisitStatus;
  facilityPublicId?: string | null;
  notes?: string | null;
}

export interface Reminder {
  publicId: string;
  motherPublicId: string;
  pregnancyPublicId?: string | null;
  ancSchedulePublicId?: string | null;
  type: ReminderType;
  scheduledAt: string;
  reminderTime: string;
  status: ReminderStatus;
  snoozedUntil?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MotherReminderSettings {
  ironTabletEnabled: boolean;
  ironTabletTime: string;
  ancReminderEnabled: boolean;
  ancReminderDaysBefore: number;
  ancReminderTime: string;
}

export interface ReminderSettingsUpdateInput {
  ironTabletEnabled?: boolean;
  ironTabletTime?: string;
  ancReminderEnabled?: boolean;
  ancReminderDaysBefore?: number;
  ancReminderTime?: string;
}

export interface ReminderSnoozeInput {
  minutes: 10 | 30 | 60;
}

export interface AdherenceHistoryItem {
  id: string;
  date: string;
  type: ReminderType | "ANC";
  label: string;
  status: string;
  completedAt?: string | null;
}

export interface AdherenceSummary {
  ironTabletsTotal: number;
  ironTabletsCompleted: number;
  ironTabletsAdherencePercentage: number;
  ancTotalScheduled: number;
  ancCompleted: number;
  ancMissedUnconfirmed: number;
  nextAncSchedule?: AncSchedule | null;
  recentHistory: AdherenceHistoryItem[];
}

export interface AncRuleTrimesterDistribution {
  trimester1: { minVisits: number; minDoctorVisits: number; idealWeeks: string };
  trimester2: { minVisits: number; minDoctorVisits: number; idealWeeks: string };
  trimester3: { minVisits: number; minDoctorVisits: number; idealWeeks: string };
}

export interface AncRuleSet {
  publicId: string;
  version: string;
  active: boolean;
  effectiveFrom: string;
  minimumVisits: number;
  minimumDoctorVisits: number;
  trimesterDistribution: AncRuleTrimesterDistribution;
  sourceReference?: string | null;
}

// ==========================================
// TAHAP 6A — TANDA BAHAYA & SCREENING DASAR
// ==========================================

export type DangerScreeningStatus =
  | "NO_DANGER_REPORTED"
  | "DANGER_SIGN_REPORTED"
  | "REQUIRES_IMMEDIATE_CARE";

export type DangerFollowUpStatus =
  | "PENDING"
  | "CONTACTED"
  | "REFERRED_TO_FACILITY"
  | "ARRIVED_AT_FACILITY"
  | "RESOLVED";

export interface DangerSignRule {
  publicId: string;
  code: string;
  title: string;
  description?: string | null;
  trimesterApplicability: number[];
  question: string;
  severityCategory: "URGENT" | "WARNING" | string;
  sortOrder: number;
  active: boolean;
}

export interface DangerSignRuleSet {
  publicId: string;
  version: string;
  name: string;
  sourceReference: string;
  effectiveFrom: string;
  active: boolean;
  rules?: DangerSignRule[];
}

export interface DangerScreeningResponseItem {
  ruleCode: string;
  title: string;
  question: string;
  answer: boolean;
  severityCategory: "URGENT" | "WARNING" | string;
}

export interface DangerScreening {
  publicId: string;
  motherPublicId: string;
  pregnancyPublicId: string;
  motherName?: string;
  screenedAt: string;
  status: DangerScreeningStatus;
  reportedSignsCount: number;
  summary?: string | null;
  ruleSetVersion: string;
  followUpStatus: DangerFollowUpStatus;
  followUpNotes?: string | null;
  followUpUpdatedAt?: string | null;
  responses?: DangerScreeningResponseItem[];
  facility?: { publicId: string; name: string } | null;
  midwife?: { publicId: string; fullName: string; phoneNumber?: string } | null;
  createdAt: string;
}

export interface DangerScreeningCreateInput {
  ruleSetVersion: string;
  responses: Array<{
    ruleCode: string;
    answer: boolean;
  }>;
}

export interface DangerFollowUpUpdateInput {
  status: DangerFollowUpStatus;
  notes?: string | null;
}

export interface DangerFollowUpListItem {
  publicId: string;
  mother: {
    publicId: string;
    fullName: string;
    phoneNumber: string;
  };
  facility: {
    publicId: string;
    name: string;
  } | null;
  gestationalAge?: { weeks: number; days: number } | null;
  trimester?: number | null;
  screenedAt: string;
  status: DangerScreeningStatus;
  reportedSignsCount: number;
  reportedSigns: string[];
  followUpStatus: DangerFollowUpStatus;
  followUpNotes?: string | null;
  followUpUpdatedAt?: string | null;
}

// ==========================================
// TAHAP 7 — EDUKASI, GIZI & PERUBAHAN TUBUH
// ==========================================

export type EducationCategory =
  | "PREGNANCY"
  | "NUTRITION"
  | "BODY_CHANGES"
  | "IRON_TABLET"
  | "NAUSEA"
  | "ANEMIA_KEK"
  | "PREPARATION"
  | "OTHER";

export type EducationTrimester =
  | "ALL"
  | "TRIMESTER_1"
  | "TRIMESTER_2"
  | "TRIMESTER_3";

export interface EducationArticle {
  publicId: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: EducationCategory;
  trimester: EducationTrimester;
  featured: boolean;
  sourceName: string;
  sourceReference: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface EducationArticleCreateInput {
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: EducationCategory;
  trimester?: EducationTrimester | undefined;
  featured?: boolean | undefined;
  sourceName: string;
  sourceReference?: string | null | undefined;
  published?: boolean | undefined;
  sortOrder?: number | undefined;
}

export interface EducationArticleUpdateInput {
  slug?: string | undefined;
  title?: string | undefined;
  summary?: string | undefined;
  content?: string | undefined;
  category?: EducationCategory | undefined;
  trimester?: EducationTrimester | undefined;
  featured?: boolean | undefined;
  sourceName?: string | undefined;
  sourceReference?: string | null | undefined;
  published?: boolean | undefined;
  sortOrder?: number | undefined;
}

export interface EducationQuery {
  category?: EducationCategory | undefined;
  trimester?: EducationTrimester | undefined;
  featured?: boolean | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

// ==========================================
// TAHAP 8 — P4K DIGITAL & RENCANA RUJUKAN
// ==========================================

export interface BloodDonorItem {
  name: string;
  bloodType: string;
  phone: string;
}

export interface P4kChecklistItem {
  publicId: string;
  itemKey: string;
  title: string;
  category: string;
  checked: boolean;
  checkedAt?: string | null | undefined;
  sortOrder: number;
}

export interface P4kPlan {
  publicId: string;
  motherPublicId: string;
  pregnancyPublicId: string;
  estimatedDueDate?: string | null | undefined;
  deliveryFacility?: {
    publicId: string;
    name: string;
  } | null | undefined;
  customDeliveryFacilityName?: string | null | undefined;
  deliveryAttendant: string;
  birthCompanionName?: string | null | undefined;
  birthCompanionPhone?: string | null | undefined;
  transportation?: string | null | undefined;
  fundingSource?: string | null | undefined;
  bpjsNumber?: string | null | undefined;
  bloodDonors: BloodDonorItem[];
  emergencyContactName?: string | null | undefined;
  emergencyContactPhone?: string | null | undefined;
  preparationNotes?: string | null | undefined;
  checklistItems?: P4kChecklistItem[] | undefined;
  checklistProgress?: {
    total: number;
    checked: number;
    percentage: number;
  } | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface P4kPlanInput {
  deliveryFacilityPublicId?: string | null | undefined;
  customDeliveryFacilityName?: string | null | undefined;
  deliveryAttendant?: string | undefined;
  birthCompanionName?: string | null | undefined;
  birthCompanionPhone?: string | null | undefined;
  transportation?: string | null | undefined;
  fundingSource?: string | null | undefined;
  bpjsNumber?: string | null | undefined;
  bloodDonors?: BloodDonorItem[] | undefined;
  emergencyContactName?: string | null | undefined;
  emergencyContactPhone?: string | null | undefined;
  preparationNotes?: string | null | undefined;
}

export interface P4kChecklistPatchItem {
  itemKey: string;
  checked: boolean;
}

export interface P4kChecklistPatchInput {
  items: P4kChecklistPatchItem[];
}

export interface ReferralPlan {
  publicId: string;
  motherPublicId: string;
  pregnancyPublicId: string;
  sourceFacility?: {
    publicId: string;
    name: string;
  } | null | undefined;
  customSourceFacilityName?: string | null | undefined;
  destinationFacility?: {
    publicId: string;
    name: string;
  } | null | undefined;
  customDestinationFacilityName?: string | null | undefined;
  transportType: string;
  transportOperatorName?: string | null | undefined;
  transportContactNumber?: string | null | undefined;
  estimatedTravelTimeMinutes?: number | null | undefined;
  manualDepartureSchedule?: string | null | undefined;
  departurePoint?: string | null | undefined;
  companions?: string | null | undefined;
  rtkName?: string | null | undefined;
  rtkAddress?: string | null | undefined;
  rtkPhone?: string | null | undefined;
  alternativeNotes?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralPlanInput {
  sourceFacilityPublicId?: string | null | undefined;
  customSourceFacilityName?: string | null | undefined;
  destinationFacilityPublicId?: string | null | undefined;
  customDestinationFacilityName?: string | null | undefined;
  transportType?: string | undefined;
  transportOperatorName?: string | null | undefined;
  transportContactNumber?: string | null | undefined;
  estimatedTravelTimeMinutes?: number | null | undefined;
  manualDepartureSchedule?: string | null | undefined;
  departurePoint?: string | null | undefined;
  companions?: string | null | undefined;
  rtkName?: string | null | undefined;
  rtkAddress?: string | null | undefined;
  rtkPhone?: string | null | undefined;
  alternativeNotes?: string | null | undefined;
}

// ==========================================
// TAHAP 9 — TELEKONSULTASI IBU & BIDAN
// ==========================================

export type ConsultationThreadStatus = "OPEN" | "CLOSED";
export type ConsultationAttentionFlag = "NORMAL" | "NEEDS_ATTENTION";
export type ConsultationMessageType = "TEXT" | "IMAGE" | "VOICE";
export type ConsultationSenderRole = "MOTHER" | "MIDWIFE";

export interface ConsultationAttachmentItem {
  publicId: string;
  fileType: ConsultationMessageType;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number | null | undefined;
  downloadUrl: string;
  createdAt: string;
}

export interface ConsultationAttachmentInput {
  originalFilename: string;
  mimeType: string;
  fileData: string;
  durationSeconds?: number | null | undefined;
}

export interface ConsultationMessageItem {
  publicId: string;
  threadPublicId?: string | undefined;
  senderRole: ConsultationSenderRole;
  messageType: ConsultationMessageType;
  body?: string | null | undefined;
  text?: string | null | undefined;
  readAt?: string | null | undefined;
  createdAt: string;
  attachments?: ConsultationAttachmentItem[] | undefined;
  attachment?: ConsultationAttachmentItem | null | undefined;
}

export interface ConsultationThreadSummary {
  publicId: string;
  status: ConsultationThreadStatus;
  attentionFlag: ConsultationAttentionFlag;
  unreadCount: number;
  unreadMidwifeCount?: number | undefined;
  unreadMotherCount?: number | undefined;
  lastMessageAt?: string | null | undefined;
  lastMessagePreview?: string | null | undefined;
  lastMessage?: {
    publicId?: string | undefined;
    senderRole?: ConsultationSenderRole | undefined;
    messageType?: ConsultationMessageType | undefined;
    body?: string | null | undefined;
    text?: string | null | undefined;
    createdAt?: string | undefined;
  } | null | undefined;
  createdAt: string;
  updatedAt: string;
  mother: {
    publicId: string;
    fullName: string;
    phoneNumber?: string | null | undefined;
  };
  midwife: {
    publicId: string;
    fullName: string;
    position?: string | null | undefined;
    phoneNumber?: string | null | undefined;
    whatsappNumber?: string | null | undefined;
    serviceStartTime?: string | null | undefined;
    serviceEndTime?: string | null | undefined;
    estimatedResponseMinutes?: number | null | undefined;
    primaryFacilityName?: string | null | undefined;
  };
  pregnancy?: {
    publicId: string;
    gestationalAgeWeeks?: number | null | undefined;
  } | undefined;
  gestationalAge?: { weeks: number; days: number } | null | undefined;
  trimester?: number | null | undefined;
  estimatedDueDate?: string | null | undefined;
  // Backward compatibility flat properties
  motherPublicId?: string | undefined;
  motherName?: string | undefined;
  motherPhone?: string | null | undefined;
  midwifePublicId?: string | undefined;
  midwifeName?: string | undefined;
  midwifePhone?: string | null | undefined;
  midwifeWhatsapp?: string | null | undefined;
  facilityName?: string | null | undefined;
  serviceStartTime?: string | undefined;
  serviceEndTime?: string | undefined;
  estimatedResponseMinutes?: number | undefined;
}

export interface ConsultationMessageCreateInput {
  messageType: ConsultationMessageType;
  body?: string | null | undefined;
  attachment?: ConsultationAttachmentInput | undefined;
}

export interface ConsultationAttentionUpdateInput {
  attentionFlag: ConsultationAttentionFlag;
}

export interface ConsultationStatusUpdateInput {
  status: ConsultationThreadStatus;
}

export interface ConsultationQuery {
  status?: ConsultationThreadStatus | undefined;
  attentionFlag?: ConsultationAttentionFlag | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

// ==========================================
// TAHAP 10 — VIDEO CALL
// ==========================================

export type VideoConsultationStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface VideoConsultationItem {
  publicId: string;
  motherPublicId: string;
  motherName: string;
  motherPhone?: string | null | undefined;
  midwifePublicId: string;
  midwifeName: string;
  midwifePhone?: string | null | undefined;
  midwifeWhatsapp?: string | null | undefined;
  pregnancyPublicId: string;
  threadPublicId?: string | null | undefined;
  scheduledAt: string;
  meetingUrl: string;
  title: string;
  notes?: string | null | undefined;
  status: VideoConsultationStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null | undefined;
  cancelledAt?: string | null | undefined;
  midwife?: {
    publicId: string;
    fullName: string;
    phoneNumber?: string | null | undefined;
    whatsappNumber?: string | null | undefined;
  } | undefined;
  mother?: {
    publicId: string;
    fullName: string;
    phoneNumber?: string | null | undefined;
  } | undefined;
}

export interface VideoConsultationCreateInput {
  motherPublicId?: string | undefined;
  threadPublicId?: string | undefined;
  scheduledAt: string;
  meetingUrl: string;
  title?: string | undefined;
  notes?: string | null | undefined;
}

export interface VideoConsultationUpdateInput {
  scheduledAt?: string | undefined;
  meetingUrl?: string | undefined;
  title?: string | undefined;
  notes?: string | null | undefined;
  status?: VideoConsultationStatus | undefined;
}

export interface VideoConsultationStatusUpdateInput {
  status: VideoConsultationStatus;
  notes?: string | null | undefined;
}

export interface VideoConsultationQuery {
  motherPublicId?: string | undefined;
  threadPublicId?: string | undefined;
  status?: VideoConsultationStatus | undefined;
  upcomingOnly?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}


// ==========================================
// TAHAP 11 — DASHBOARD BIDAN LANJUTAN & KUNJUNGAN RUMAH
// ==========================================

export type HomeVisitStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface HomeVisitItem {
  publicId: string;
  motherPublicId: string;
  motherName: string;
  motherPhone?: string | null | undefined;
  motherAddress?: string | null | undefined;
  pregnancyPublicId?: string | null | undefined;
  midwifePublicId: string;
  midwifeName: string;
  scheduledAt: string;
  purpose: string;
  notes?: string | null | undefined;
  status: HomeVisitStatus;
  completedAt?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface HomeVisitCreateInput {
  motherPublicId: string;
  scheduledAt: string;
  purpose: string;
  notes?: string | null | undefined;
}

export interface HomeVisitUpdateInput {
  scheduledAt?: string | undefined;
  purpose?: string | undefined;
  notes?: string | null | undefined;
  status?: HomeVisitStatus | undefined;
}

export interface HomeVisitQuery {
  motherPublicId?: string | undefined;
  status?: HomeVisitStatus | undefined;
  upcomingOnly?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface MidwifeMonthlyRecap {
  totalAssignedMothers: number;
  completedAncThisMonth: number;
  unconfirmedAncTotal: number;
  screeningsThisMonth: number;
  dangerFollowUpsCompletedThisMonth: number;
  activeConsultationThreads: number;
  completedP4kPlans: number;
  completedHomeVisitsThisMonth: number;
}

export interface MidwifeDashboardSummary {
  activeMothersCount: number;
  todayMonitoringCount: number;
  todayAncCount: number;
  unconfirmedAncCount: number;
  pendingDangerScreeningCount: number;
  unreadConsultationCount: number;
  todayVideoCallCount: number;
  todayHomeVisitCount: number;
  monthlyRecap: MidwifeMonthlyRecap;
}

export type MidwifeAttentionType =
  | "OVERDUE_ANC"
  | "PENDING_DANGER"
  | "CONSULTATION_ATTENTION"
  | "UNREAD_MESSAGE"
  | "INCOMPLETE_P4K"
  | "TODAY_HOME_VISIT";

export type MidwifeAttentionUrgency = "HIGH" | "MEDIUM" | "LOW";

export interface MidwifeAttentionItem {
  id: string;
  type: MidwifeAttentionType;
  urgency: MidwifeAttentionUrgency;
  title: string;
  description: string;
  motherPublicId: string;
  motherName: string;
  targetDate?: string | null | undefined;
  actionUrl: string;
}

export type MidwifeScheduleItemType = "ANC" | "VIDEO_CALL" | "HOME_VISIT";

export interface MidwifeTodayScheduleItem {
  id: string;
  time: string;
  type: MidwifeScheduleItemType;
  title: string;
  motherPublicId: string;
  motherName: string;
  locationOrLink: string;
  status: string;
  actionUrl: string;
}

export type MidwifeMotherFilter =
  | "ALL"
  | "TRIMESTER_1"
  | "TRIMESTER_2"
  | "TRIMESTER_3"
  | "HAS_FOLLOW_UP"
  | "MISSED_ANC";

export interface MidwifeEnrichedMotherItem {
  publicId: string;
  userId: string;
  fullName: string;
  phoneNumber?: string | null | undefined;
  address?: string | null | undefined;
  age?: number | null | undefined;
  facility?: { publicId: string; name: string } | null | undefined;
  activePregnancy?: {
    publicId: string;
    gestationalAge: { weeks: number; days: number } | null | undefined;
    trimester: number | null | undefined;
    estimatedDueDate: string;
  } | null | undefined;
  nextAnc?: {
    publicId: string;
    scheduledAt: string;
    visitType: string;
  } | null | undefined;
  lastMonitoring?: {
    recordedAt: string;
    systolicBp?: number | null | undefined;
    diastolicBp?: number | null | undefined;
    weightKg?: number | null | undefined;
  } | null | undefined;
  p4kStatus: {
    isComplete: boolean;
    checkedCount: number;
    totalCount: number;
  };
  hasFollowUp: boolean;
  followUpReasons: string[];
  unreadMessagesCount: number;
  hasMissedAnc: boolean;
}
