import type {
  AdherenceSummary,
  AncRuleSet,
  AncSchedule,
  AncScheduleCreateInput,
  AncScheduleUpdateInput,
  ApiError,
  ApiSuccess,
  DangerFollowUpListItem,
  DangerFollowUpUpdateInput,
  DangerScreening,
  DangerScreeningCreateInput,
  DangerSignRule,
  DangerSignRuleSet,
  MonitoringCreateInput,
  MonitoringEntry,
  MonitoringListItem,
  MonitoringQuery,
  MonitoringSummary,
  MonitoringUpdateInput,
  MotherReminderSettings,
  PaginatedResponse,
  P4kChecklistItem,
  P4kChecklistPatchInput,
  P4kPlan,
  P4kPlanInput,
  ReferralPlan,
  ReferralPlanInput,
  Reminder,
  ReminderSettingsUpdateInput,
  ReminderSnoozeInput,
  SessionInfo,
  EducationArticle,
  EducationArticleCreateInput,
  EducationArticleUpdateInput,
  EducationQuery,
  EducationTrimester,
  ConsultationAttentionUpdateInput,
  ConsultationMessageCreateInput,
  ConsultationMessageItem,
  ConsultationQuery,
  ConsultationStatusUpdateInput,
  ConsultationThreadSummary,
  VideoConsultationCreateInput,
  VideoConsultationItem,
  VideoConsultationQuery,
  VideoConsultationStatusUpdateInput,
  VideoConsultationUpdateInput,
  HomeVisitCreateInput,
  HomeVisitItem,
  HomeVisitQuery,
  HomeVisitUpdateInput,
  MidwifeAttentionItem,
  MidwifeDashboardSummary,
  MidwifeEnrichedMotherItem,
  MidwifeMotherFilter,
  MidwifeTodayScheduleItem,
} from "@pfram/shared-types";
export interface SessionAdapter {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string | null): Promise<void>;
}
export class PframApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function createApiClient(options: {
  baseUrl: string;
  timeoutMs?: number;
  sessionAdapter?: SessionAdapter;
  webCookieSession?: boolean;
  getCsrfToken?: () => string | null;
}) {
  let accessToken: string | null = null;
  let csrfToken: string | null = null;
  let refreshing: Promise<boolean> | null = null;
  const base = options.baseUrl.replace(/\/$/, "");
  const raw = async <T>(
    path: string,
    init: RequestInit = {},
    retry = true,
  ): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 10000,
    );
    try {
      const headers = new Headers(init.headers);
      headers.set("accept", "application/json");
      if (init.body) headers.set("content-type", "application/json");
      if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
      if (
        options.webCookieSession &&
        init.method &&
        init.method !== "GET" &&
        path !== "/auth/login" &&
        path !== "/auth/register/mother"
      ) {
        const csrf = csrfToken ?? options.getCsrfToken?.();
        if (csrf) headers.set("x-csrf-token", csrf);
      }
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers,
        credentials: options.webCookieSession ? "include" : "omit",
        signal: controller.signal,
      });
      const body = (await res.json()) as ApiSuccess<T> | ApiError;
      if (!res.ok) {
        if (res.status === 401 && retry && path != "/auth/refresh") {
          const ok = await refresh();
          if (ok) return raw<T>(path, init, false);
        }
        const e = body as ApiError;
        throw new PframApiError(
          e.error?.code ?? "REQUEST_FAILED",
          e.error?.message ?? "Permintaan gagal",
          res.status,
          e.error?.details,
        );
      }
      const data = (body as ApiSuccess<T>).data;
      if (
        data &&
        typeof data === "object" &&
        "csrfToken" in data &&
        typeof data.csrfToken === "string"
      )
        csrfToken = data.csrfToken;
      return data;
    } finally {
      clearTimeout(timer);
    }
  };
  const refresh = async () => {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const token = await options.sessionAdapter?.getRefreshToken();
      try {
        const session = await raw<SessionInfo>(
          "/auth/refresh",
          {
            method: "POST",
            body: JSON.stringify({
              refreshToken: token ?? undefined,
              clientType: options.webCookieSession ? "web" : "mobile",
            }),
          },
          false,
        );
        accessToken = session.accessToken;
        if (session.refreshToken)
          await options.sessionAdapter?.setRefreshToken(session.refreshToken);
        return true;
      } catch {
        accessToken = null;
        await options.sessionAdapter?.setRefreshToken(null);
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };
  return {
    request: raw,
    getAccessToken: () => accessToken,
    getBaseUrl: () => base,
    fetchBlob: async (path: string): Promise<Blob> => {
      const headers = new Headers();
      if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
      const res = await fetch(`${base}${path}`, {
        headers,
        credentials: options.webCookieSession ? "include" : "omit",
      });
      if (!res.ok) {
        throw new PframApiError(
          "MEDIA_FETCH_FAILED",
          "Gagal memuat media",
          res.status,
        );
      }
      return res.blob();
    },
    setAccessToken: (token: string | null) => {
      accessToken = token;
    },
    refresh,
  };
}
export function createMonitoringClient(client: ReturnType<typeof createApiClient>) {
  return {
    mother: {
      list: (query?: MonitoringQuery) => {
        const sp = new URLSearchParams();
        if (query?.pregnancyPublicId) sp.set("pregnancyPublicId", query.pregnancyPublicId);
        if (query?.from) sp.set("from", query.from);
        if (query?.to) sp.set("to", query.to);
        if (query?.type) sp.set("type", query.type);
        if (query?.page) sp.set("page", String(query.page));
        if (query?.limit) sp.set("limit", String(query.limit));
        if (query?.sort) sp.set("sort", query.sort);
        const qs = sp.toString();
        return client.request<PaginatedResponse<MonitoringListItem>>(
          `/mother/monitoring${qs ? `?${qs}` : ""}`,
        );
      },
      get: (publicId: string) =>
        client.request<MonitoringEntry>(`/mother/monitoring/${publicId}`),
      getSummary: () => client.request<MonitoringSummary>("/mother/monitoring/summary"),
      create: (input: MonitoringCreateInput) =>
        client.request<MonitoringEntry>("/mother/monitoring", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (publicId: string, input: MonitoringUpdateInput) =>
        client.request<MonitoringEntry>(`/mother/monitoring/${publicId}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      archive: (publicId: string) =>
        client.request<{ publicId: string; archivedAt: string }>(
          `/mother/monitoring/${publicId}/archive`,
          { method: "POST", body: JSON.stringify({}) },
        ),
    },
    midwife: {
      list: (motherPublicId: string, query?: MonitoringQuery) => {
        const sp = new URLSearchParams();
        if (query?.pregnancyPublicId) sp.set("pregnancyPublicId", query.pregnancyPublicId);
        if (query?.from) sp.set("from", query.from);
        if (query?.to) sp.set("to", query.to);
        if (query?.type) sp.set("type", query.type);
        if (query?.page) sp.set("page", String(query.page));
        if (query?.limit) sp.set("limit", String(query.limit));
        if (query?.sort) sp.set("sort", query.sort);
        const qs = sp.toString();
        return client.request<PaginatedResponse<MonitoringListItem>>(
          `/midwife/mothers/${motherPublicId}/monitoring${qs ? `?${qs}` : ""}`,
        );
      },
      get: (motherPublicId: string, publicId: string) =>
        client.request<MonitoringEntry>(
          `/midwife/mothers/${motherPublicId}/monitoring/${publicId}`,
        ),
      getSummary: (motherPublicId: string) =>
        client.request<MonitoringSummary>(
          `/midwife/mothers/${motherPublicId}/monitoring/summary`,
        ),
      create: (motherPublicId: string, input: MonitoringCreateInput) =>
        client.request<MonitoringEntry>(
          `/midwife/mothers/${motherPublicId}/monitoring`,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        ),
    },
  };
}

export function createMotherMonitoringApi(
  client: ReturnType<typeof createApiClient>,
) {
  const monitoring = createMonitoringClient(client);
  return {
    getMonitoringList: (query?: MonitoringQuery) => monitoring.mother.list(query),
    getMonitoringDetail: (publicId: string) => monitoring.mother.get(publicId),
    getMonitoringSummary: () => monitoring.mother.getSummary(),
    createMonitoring: (input: MonitoringCreateInput) =>
      monitoring.mother.create(input),
    updateMonitoring: (publicId: string, input: MonitoringUpdateInput) =>
      monitoring.mother.update(publicId, input),
    archiveMonitoring: (publicId: string) => monitoring.mother.archive(publicId),
  };
}

export type MotherMonitoringApi = ReturnType<typeof createMotherMonitoringApi>;

export function createMidwifeMonitoringApi(
  client: ReturnType<typeof createApiClient>,
) {
  const monitoring = createMonitoringClient(client);
  return {
    getMidwifeMotherMonitoringList: (
      motherPublicId: string,
      query?: MonitoringQuery,
    ) => monitoring.midwife.list(motherPublicId, query),
    getMidwifeMotherMonitoringDetail: (
      motherPublicId: string,
      publicId: string,
    ) => monitoring.midwife.get(motherPublicId, publicId),
    getMidwifeMotherMonitoringSummary: (motherPublicId: string) =>
      monitoring.midwife.getSummary(motherPublicId),
    createMidwifeMotherMonitoring: (
      motherPublicId: string,
      input: MonitoringCreateInput,
    ) => monitoring.midwife.create(motherPublicId, input),
  };
}

export type MidwifeMonitoringApi = ReturnType<typeof createMidwifeMonitoringApi>;

// ==========================================
// TAHAP 5A — SMART ANC REMINDER CLIENT
// ==========================================

export function createAncClient(client: ReturnType<typeof createApiClient>) {
  return {
    mother: {
      getSchedules: (query?: { status?: string; page?: number; limit?: number; sort?: "asc" | "desc" }) => {
        const sp = new URLSearchParams();
        if (query?.status) sp.set("status", query.status);
        if (query?.page) sp.set("page", String(query.page));
        if (query?.limit) sp.set("limit", String(query.limit));
        if (query?.sort) sp.set("sort", query.sort);
        const qs = sp.toString();
        return client.request<PaginatedResponse<AncSchedule>>(`/mother/anc-schedules${qs ? `?${qs}` : ""}`);
      },
      getUpcomingSchedule: () =>
        client.request<AncSchedule | null>("/mother/anc-schedules/upcoming"),
      getScheduleDetail: (publicId: string) =>
        client.request<AncSchedule>(`/mother/anc-schedules/${publicId}`),
      confirmAttendance: (publicId: string) =>
        client.request<AncSchedule>(`/mother/anc-schedules/${publicId}/confirm-attendance`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      getReminders: (query?: { type?: string; status?: string; page?: number; limit?: number }) => {
        const sp = new URLSearchParams();
        if (query?.type) sp.set("type", query.type);
        if (query?.status) sp.set("status", query.status);
        if (query?.page) sp.set("page", String(query.page));
        if (query?.limit) sp.set("limit", String(query.limit));
        const qs = sp.toString();
        return client.request<PaginatedResponse<Reminder>>(`/mother/reminders${qs ? `?${qs}` : ""}`);
      },
      getReminderSettings: () =>
        client.request<MotherReminderSettings>("/mother/reminder-settings"),
      updateReminderSettings: (input: ReminderSettingsUpdateInput) =>
        client.request<MotherReminderSettings>("/mother/reminder-settings", {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      completeReminder: (publicId: string) =>
        client.request<Reminder>(`/mother/reminders/${publicId}/complete`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      snoozeReminder: (publicId: string, input: ReminderSnoozeInput) =>
        client.request<Reminder>(`/mother/reminders/${publicId}/snooze`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      getAdherenceSummary: () =>
        client.request<AdherenceSummary>("/mother/adherence-summary"),
      getRecommendations: () =>
        client.request<{
          estimatedDueDate: string | null;
          recommendations: unknown[];
          ruleSet: AncRuleSet;
        }>("/mother/anc-recommendations"),
    },
    midwife: {
      getMotherSchedules: (
        motherPublicId: string,
        query?: { status?: string; page?: number; limit?: number; sort?: "asc" | "desc" },
      ) => {
        const sp = new URLSearchParams();
        if (query?.status) sp.set("status", query.status);
        if (query?.page) sp.set("page", String(query.page));
        if (query?.limit) sp.set("limit", String(query.limit));
        if (query?.sort) sp.set("sort", query.sort);
        const qs = sp.toString();
        return client.request<PaginatedResponse<AncSchedule>>(
          `/midwife/mothers/${motherPublicId}/anc-schedules${qs ? `?${qs}` : ""}`,
        );
      },
      createMotherSchedule: (motherPublicId: string, input: AncScheduleCreateInput) =>
        client.request<AncSchedule>(`/midwife/mothers/${motherPublicId}/anc-schedules`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      updateMotherSchedule: (
        motherPublicId: string,
        publicId: string,
        input: AncScheduleUpdateInput,
      ) =>
        client.request<AncSchedule>(
          `/midwife/mothers/${motherPublicId}/anc-schedules/${publicId}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),
      getMotherAdherenceSummary: (motherPublicId: string) =>
        client.request<AdherenceSummary>(
          `/midwife/mothers/${motherPublicId}/adherence-summary`,
        ),
      getMissedAnc: () =>
        client.request<{ items: Array<{
          publicId: string;
          scheduledAt: string;
          visitType: string;
          doctorRequired: boolean;
          notes: string | null;
          statusLabel: string;
          daysOverdue: number;
          mother: { publicId: string; fullName: string };
          facility: { publicId: string; name: string } | null;
        }>; total: number }>("/midwife/anc-missed"),
    },
    admin: {
      getAncRules: () => client.request<AncRuleSet[]>("/admin/anc-rules"),
      upsertAncRule: (input: unknown) =>
        client.request<AncRuleSet>("/admin/anc-rules", {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
  };
}

export type AncClient = ReturnType<typeof createAncClient>;

export function createMotherAncApi(client: ReturnType<typeof createApiClient>) {
  const anc = createAncClient(client);
  return {
    getSchedules: anc.mother.getSchedules,
    getUpcomingSchedule: anc.mother.getUpcomingSchedule,
    getScheduleDetail: anc.mother.getScheduleDetail,
    confirmAttendance: anc.mother.confirmAttendance,
    getReminders: anc.mother.getReminders,
    getReminderSettings: anc.mother.getReminderSettings,
    updateReminderSettings: anc.mother.updateReminderSettings,
    completeReminder: anc.mother.completeReminder,
    snoozeReminder: anc.mother.snoozeReminder,
    getAdherenceSummary: anc.mother.getAdherenceSummary,
    getRecommendations: anc.mother.getRecommendations,
  };
}
export type MotherAncApi = ReturnType<typeof createMotherAncApi>;

export function createMidwifeAncApi(client: ReturnType<typeof createApiClient>) {
  const anc = createAncClient(client);
  return {
    getMotherSchedules: anc.midwife.getMotherSchedules,
    createMotherSchedule: anc.midwife.createMotherSchedule,
    updateMotherSchedule: anc.midwife.updateMotherSchedule,
    getMotherAdherenceSummary: anc.midwife.getMotherAdherenceSummary,
    getMissedAnc: anc.midwife.getMissedAnc,
  };
}
export type MidwifeAncApi = ReturnType<typeof createMidwifeAncApi>;

// ==========================================
// TAHAP 6A — TANDA BAHAYA & SCREENING DASAR
// ==========================================

export function createDangerScreeningClient(
  client: ReturnType<typeof createApiClient>,
) {
  return {
    mother: {
      getDangerSigns: () =>
        client.request<{
          ruleSet: DangerSignRuleSet;
          rules: DangerSignRule[];
          pregnancy: {
            gestationalAge: { weeks: number; days: number } | null;
            trimester: number;
          } | null;
        }>("/mother/danger-signs"),
      createScreening: (input: DangerScreeningCreateInput) =>
        client.request<DangerScreening>("/mother/danger-screenings", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      getScreenings: (query: { page?: number; limit?: number } = {}) => {
        const params = new URLSearchParams();
        if (query.page) params.set("page", String(query.page));
        if (query.limit) params.set("limit", String(query.limit));
        const qs = params.toString();
        return client.request<PaginatedResponse<DangerScreening>>(
          `/mother/danger-screenings${qs ? `?${qs}` : ""}`,
        );
      },
      getScreeningDetail: (publicId: string) =>
        client.request<DangerScreening>(`/mother/danger-screenings/${publicId}`),
    },
    midwife: {
      getMotherScreenings: (
        motherPublicId: string,
        query: { page?: number; limit?: number } = {},
      ) => {
        const params = new URLSearchParams();
        if (query.page) params.set("page", String(query.page));
        if (query.limit) params.set("limit", String(query.limit));
        const qs = params.toString();
        return client.request<PaginatedResponse<DangerScreening>>(
          `/midwife/mothers/${motherPublicId}/danger-screenings${qs ? `?${qs}` : ""}`,
        );
      },
      getMotherScreeningDetail: (motherPublicId: string, publicId: string) =>
        client.request<DangerScreening>(
          `/midwife/mothers/${motherPublicId}/danger-screenings/${publicId}`,
        ),
      getFollowUps: () =>
        client.request<{ items: DangerFollowUpListItem[]; total: number }>(
          "/midwife/danger-follow-ups",
        ),
      updateFollowUp: (publicId: string, input: DangerFollowUpUpdateInput) =>
        client.request<DangerScreening>(
          `/midwife/danger-screenings/${publicId}/follow-up`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),
    },
    admin: {
      getDangerRules: () =>
        client.request<DangerSignRuleSet[]>("/admin/danger-rules"),
    },
  };
}

export type DangerScreeningClient = ReturnType<typeof createDangerScreeningClient>;

export function createMotherDangerScreeningApi(
  client: ReturnType<typeof createApiClient>,
) {
  const ds = createDangerScreeningClient(client);
  return {
    getDangerSigns: ds.mother.getDangerSigns,
    createScreening: ds.mother.createScreening,
    getScreenings: ds.mother.getScreenings,
    getScreeningDetail: ds.mother.getScreeningDetail,
  };
}
export type MotherDangerScreeningApi = ReturnType<
  typeof createMotherDangerScreeningApi
>;

export function createMidwifeDangerScreeningApi(
  client: ReturnType<typeof createApiClient>,
) {
  const ds = createDangerScreeningClient(client);
  return {
    getMotherScreenings: ds.midwife.getMotherScreenings,
    getMotherScreeningDetail: ds.midwife.getMotherScreeningDetail,
    getFollowUps: ds.midwife.getFollowUps,
    updateFollowUp: ds.midwife.updateFollowUp,
  };
}
export type MidwifeDangerScreeningApi = ReturnType<
  typeof createMidwifeDangerScreeningApi
>;

// ==========================================
// TAHAP 8 — P4K & RENCANA RUJUKAN
// ==========================================

export function createP4kClient(client: ReturnType<typeof createApiClient>) {
  return {
    mother: {
      getP4k: () => client.request<P4kPlan>("/mother/p4k"),
      updateP4k: (input: P4kPlanInput) =>
        client.request<P4kPlan>("/mother/p4k", {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      getChecklist: () =>
        client.request<{ items: P4kChecklistItem[]; progress: { total: number; checked: number; percentage: number } }>(
          "/mother/p4k/checklist",
        ),
      patchChecklist: (input: P4kChecklistPatchInput) =>
        client.request<{ items: P4kChecklistItem[]; progress: { total: number; checked: number; percentage: number } }>(
          "/mother/p4k/checklist",
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),
      getReferralPlan: () => client.request<ReferralPlan>("/mother/referral-plan"),
      updateReferralPlan: (input: ReferralPlanInput) =>
        client.request<ReferralPlan>("/mother/referral-plan", {
          method: "PUT",
          body: JSON.stringify(input),
        }),
    },
    midwife: {
      getMotherP4k: (motherPublicId: string) =>
        client.request<P4kPlan>(`/midwife/mothers/${motherPublicId}/p4k`),
      updateMotherP4k: (motherPublicId: string, input: P4kPlanInput) =>
        client.request<P4kPlan>(`/midwife/mothers/${motherPublicId}/p4k`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      getMotherReferralPlan: (motherPublicId: string) =>
        client.request<ReferralPlan>(`/midwife/mothers/${motherPublicId}/referral-plan`),
      updateMotherReferralPlan: (motherPublicId: string, input: ReferralPlanInput) =>
        client.request<ReferralPlan>(`/midwife/mothers/${motherPublicId}/referral-plan`, {
          method: "PUT",
          body: JSON.stringify(input),
        }),
    },
  };
}

export type P4kClient = ReturnType<typeof createP4kClient>;

export function createMotherP4kApi(client: ReturnType<typeof createApiClient>) {
  const p4k = createP4kClient(client);
  return {
    getP4k: p4k.mother.getP4k,
    updateP4k: p4k.mother.updateP4k,
    getChecklist: p4k.mother.getChecklist,
    patchChecklist: p4k.mother.patchChecklist,
    getReferralPlan: p4k.mother.getReferralPlan,
    updateReferralPlan: p4k.mother.updateReferralPlan,
  };
}
export type MotherP4kApi = ReturnType<typeof createMotherP4kApi>;

export function createMidwifeP4kApi(client: ReturnType<typeof createApiClient>) {
  const p4k = createP4kClient(client);
  return {
    getMotherP4k: p4k.midwife.getMotherP4k,
    updateMotherP4k: p4k.midwife.updateMotherP4k,
    getMotherReferralPlan: p4k.midwife.getMotherReferralPlan,
    updateMotherReferralPlan: p4k.midwife.updateMotherReferralPlan,
  };
}
export type MidwifeP4kApi = ReturnType<typeof createMidwifeP4kApi>;

// ==========================================
// TAHAP 7 — EDUKASI
// ==========================================

export function createEducationClient(
  client: ReturnType<typeof createApiClient>,
) {
  const buildQuery = (
    query?: EducationQuery & { includeUnpublished?: boolean },
  ) => {
    if (!query) return "";
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.trimester) params.set("trimester", query.trimester);
    if (query.featured !== undefined)
      params.set("featured", String(query.featured));
    if (query.search) params.set("search", query.search);
    if (query.includeUnpublished !== undefined)
      params.set("includeUnpublished", String(query.includeUnpublished));
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    const str = params.toString();
    return str ? `?${str}` : "";
  };

  return {
    mother: {
      getArticles: (query?: EducationQuery) =>
        client.request<{
          items: EducationArticle[];
          total: number;
          page?: number;
          pageSize?: number;
          recommendedTrimester?: EducationTrimester | undefined;
          trimesterRecommendation?: EducationTrimester | undefined;
        }>(`/mother/education${buildQuery(query)}`),
      getFeaturedArticles: () =>
        client.request<EducationArticle[]>(
          "/mother/education/featured",
        ),
      getArticleDetail: (slug: string) =>
        client.request<EducationArticle>(`/mother/education/${slug}`),
    },
    admin: {
      getArticles: (
        query?: EducationQuery & { includeUnpublished?: boolean },
      ) =>
        client.request<{ items: EducationArticle[]; total: number }>(
          `/admin/education${buildQuery(query)}`,
        ),
      createArticle: (input: EducationArticleCreateInput) =>
        client.request<EducationArticle>("/admin/education", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      updateArticle: (publicId: string, input: EducationArticleUpdateInput) =>
        client.request<EducationArticle>(`/admin/education/${publicId}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      archiveArticle: (publicId: string) =>
        client.request<{ archived: boolean }>(
          `/admin/education/${publicId}/archive`,
          {
            method: "POST",
          },
        ),
    },
  };
}

export type EducationClient = ReturnType<typeof createEducationClient>;

export function createMotherEducationApi(
  client: ReturnType<typeof createApiClient>,
) {
  const education = createEducationClient(client);
  return {
    getArticles: education.mother.getArticles,
    getFeaturedArticles: education.mother.getFeaturedArticles,
    getArticleDetail: education.mother.getArticleDetail,
  };
}
export type MotherEducationApi = ReturnType<typeof createMotherEducationApi>;

export function createAdminEducationApi(
  client: ReturnType<typeof createApiClient>,
) {
  const education = createEducationClient(client);
  return {
    getArticles: education.admin.getArticles,
    createArticle: education.admin.createArticle,
    updateArticle: education.admin.updateArticle,
    archiveArticle: education.admin.archiveArticle,
  };
}
export type AdminEducationApi = ReturnType<typeof createAdminEducationApi>;

// ==========================================
// TAHAP 9 — TELEKONSULTASI
// ==========================================

export function createConsultationClient(
  client: ReturnType<typeof createApiClient>,
) {
  const buildQuery = (query?: ConsultationQuery) => {
    if (!query) return "";
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.attentionFlag) params.set("attentionFlag", query.attentionFlag);
    if (query.search) params.set("search", query.search);
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    if (query.offset !== undefined) params.set("offset", String(query.offset));
    const str = params.toString();
    return str ? `?${str}` : "";
  };

  return {
    mother: {
      getThread: () =>
        client.request<ConsultationThreadSummary>("/mother/consultation/thread"),
      getMessages: (query?: ConsultationQuery) =>
        client.request<{ items: ConsultationMessageItem[]; total: number }>(
          `/mother/consultation/messages${buildQuery(query)}`,
        ),
      sendMessage: (input: ConsultationMessageCreateInput) =>
        client.request<ConsultationMessageItem>(
          "/mother/consultation/messages",
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        ),
      markAsRead: () =>
        client.request<{ markedCount: number }>("/mother/consultation/read", {
          method: "POST",
        }),
    },
    midwife: {
      getThreads: (query?: ConsultationQuery) =>
        client.request<{ items: ConsultationThreadSummary[]; total: number }>(
          `/midwife/consultations${buildQuery(query)}`,
        ),
      getThread: (threadPublicId: string) =>
        client.request<ConsultationThreadSummary>(
          `/midwife/consultations/${threadPublicId}`,
        ),
      getMessages: (threadPublicId: string, query?: ConsultationQuery) =>
        client.request<{ items: ConsultationMessageItem[]; total: number }>(
          `/midwife/consultations/${threadPublicId}/messages${buildQuery(query)}`,
        ),
      sendMessage: (
        threadPublicId: string,
        input: ConsultationMessageCreateInput,
      ) =>
        client.request<ConsultationMessageItem>(
          `/midwife/consultations/${threadPublicId}/messages`,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        ),
      updateAttention: (
        threadPublicId: string,
        input: ConsultationAttentionUpdateInput,
      ) =>
        client.request<ConsultationThreadSummary>(
          `/midwife/consultations/${threadPublicId}/attention`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),
      updateStatus: (
        threadPublicId: string,
        input: ConsultationStatusUpdateInput,
      ) =>
        client.request<ConsultationThreadSummary>(
          `/midwife/consultations/${threadPublicId}/status`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),
      markAsRead: (threadPublicId: string) =>
        client.request<{ markedCount: number }>(
          `/midwife/consultations/${threadPublicId}/read`,
          {
            method: "POST",
          },
        ),
    },
  };
}

export type ConsultationClient = ReturnType<typeof createConsultationClient>;

export function createMotherConsultationApi(
  client: ReturnType<typeof createApiClient>,
) {
  const consultation = createConsultationClient(client);
  return {
    getThread: consultation.mother.getThread,
    getMessages: consultation.mother.getMessages,
    sendMessage: consultation.mother.sendMessage,
    markAsRead: consultation.mother.markAsRead,
  };
}
export type MotherConsultationApi = ReturnType<
  typeof createMotherConsultationApi
>;

export function createMidwifeConsultationApi(
  client: ReturnType<typeof createApiClient>,
) {
  const consultation = createConsultationClient(client);
  return {
    getThreads: consultation.midwife.getThreads,
    getThread: consultation.midwife.getThread,
    getMessages: consultation.midwife.getMessages,
    sendMessage: consultation.midwife.sendMessage,
    updateAttention: consultation.midwife.updateAttention,
    updateStatus: consultation.midwife.updateStatus,
    markAsRead: consultation.midwife.markAsRead,
  };
}
export type MidwifeConsultationApi = ReturnType<
  typeof createMidwifeConsultationApi
>;

// ==========================================
// TAHAP 10 — VIDEO CALL
// ==========================================

export function createVideoConsultationClient(
  client: ReturnType<typeof createApiClient>,
) {
  const buildQuery = (query?: VideoConsultationQuery) => {
    if (!query) return "";
    const params = new URLSearchParams();
    if (query.motherPublicId) params.set("motherPublicId", query.motherPublicId);
    if (query.threadPublicId) params.set("threadPublicId", query.threadPublicId);
    if (query.status) params.set("status", query.status);
    if (query.upcomingOnly !== undefined)
      params.set("upcomingOnly", String(query.upcomingOnly));
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    const str = params.toString();
    return str ? `?${str}` : "";
  };

  return {
    mother: {
      getUpcoming: () =>
        client.request<VideoConsultationItem | null>(
          "/mother/video-consultations/upcoming",
        ),
      getAll: (query?: VideoConsultationQuery) =>
        client.request<{ items: VideoConsultationItem[]; total: number }>(
          `/mother/video-consultations${buildQuery(query)}`,
        ),
    },
    midwife: {
      getAll: (query?: VideoConsultationQuery) =>
        client.request<{ items: VideoConsultationItem[]; total: number }>(
          `/midwife/video-consultations${buildQuery(query)}`,
        ),
      create: (input: VideoConsultationCreateInput) =>
        client.request<VideoConsultationItem>("/midwife/video-consultations", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      update: (publicId: string, input: VideoConsultationUpdateInput) =>
        client.request<VideoConsultationItem>(
          `/midwife/video-consultations/${publicId}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),
      updateStatus: (
        publicId: string,
        input: VideoConsultationStatusUpdateInput,
      ) =>
        client.request<VideoConsultationItem>(
          `/midwife/video-consultations/${publicId}/status`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          },
        ),
    },
  };
}

export type VideoConsultationClient = ReturnType<
  typeof createVideoConsultationClient
>;

export function createMotherVideoConsultationApi(
  client: ReturnType<typeof createApiClient>,
) {
  const vc = createVideoConsultationClient(client);
  return {
    getUpcoming: vc.mother.getUpcoming,
    getAll: vc.mother.getAll,
  };
}
export type MotherVideoConsultationApi = ReturnType<
  typeof createMotherVideoConsultationApi
>;

export function createMidwifeVideoConsultationApi(
  client: ReturnType<typeof createApiClient>,
) {
  const vc = createVideoConsultationClient(client);
  return {
    getAll: vc.midwife.getAll,
    create: vc.midwife.create,
    update: vc.midwife.update,
    updateStatus: vc.midwife.updateStatus,
  };
}
export type MidwifeVideoConsultationApi = ReturnType<
  typeof createMidwifeVideoConsultationApi
>;



// ==========================================
// TAHAP 11 — DASHBOARD BIDAN & KUNJUNGAN RUMAH
// ==========================================

export function createMidwifeDashboardClient(
  client: ReturnType<typeof createApiClient>,
) {
  return {
    getSummary: () =>
      client.request<MidwifeDashboardSummary>("/midwife/dashboard-summary"),
    getAttention: () =>
      client.request<{ items: MidwifeAttentionItem[] }>(
        "/midwife/dashboard-attention",
      ),
    getTodaySchedule: () =>
      client.request<{ items: MidwifeTodayScheduleItem[] }>(
        "/midwife/today-schedule",
      ),
    getEnrichedMothers: (params?: {
      search?: string;
      filter?: MidwifeMotherFilter;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.filter) q.set("filter", params.filter);
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      const qs = q.toString();
      const queryStr = qs ? "?" + qs : "";
      return client.request<{
        items: MidwifeEnrichedMotherItem[];
        total: number;
      }>("/midwife/enriched-mothers" + queryStr);
    },
    getHomeVisits: (params?: HomeVisitQuery) => {
      const q = new URLSearchParams();
      if (params?.motherPublicId) q.set("motherPublicId", params.motherPublicId);
      if (params?.status) q.set("status", params.status);
      if (params?.upcomingOnly !== undefined)
        q.set("upcomingOnly", String(params.upcomingOnly));
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      const qs = q.toString();
      const queryStr = qs ? "?" + qs : "";
      return client.request<{ items: HomeVisitItem[]; total: number }>(
        "/midwife/home-visits" + queryStr,
      );
    },
    createHomeVisit: (input: HomeVisitCreateInput) =>
      client.request<HomeVisitItem>("/midwife/home-visits", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    updateHomeVisit: (publicId: string, input: HomeVisitUpdateInput) =>
      client.request<HomeVisitItem>("/midwife/home-visits/" + publicId, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
  };
}

export type MidwifeDashboardClient = ReturnType<
  typeof createMidwifeDashboardClient
>;

export function createMidwifeDashboardApi(
  client: ReturnType<typeof createApiClient>,
) {
  return createMidwifeDashboardClient(client);
}
export type MidwifeDashboardApi = ReturnType<typeof createMidwifeDashboardApi>;

export function createMotherHomeVisitClient(
  client: ReturnType<typeof createApiClient>,
) {
  return {
    getHomeVisits: (params?: HomeVisitQuery) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      const qs = q.toString();
      const queryStr = qs ? "?" + qs : "";
      return client.request<{ items: HomeVisitItem[]; total: number }>(
        "/mother/home-visits" + queryStr,
      );
    },
  };
}

export type MotherHomeVisitClient = ReturnType<
  typeof createMotherHomeVisitClient
>;

export function createMotherHomeVisitApi(
  client: ReturnType<typeof createApiClient>,
) {
  return createMotherHomeVisitClient(client);
}
export type MotherHomeVisitApi = ReturnType<typeof createMotherHomeVisitApi>;
