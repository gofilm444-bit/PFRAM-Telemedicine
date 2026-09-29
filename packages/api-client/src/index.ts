import type {
  ApiError,
  ApiSuccess,
  MonitoringCreateInput,
  MonitoringEntry,
  MonitoringListItem,
  MonitoringQuery,
  MonitoringSummary,
  MonitoringUpdateInput,
  PaginatedResponse,
  SessionInfo,
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
          { method: "POST" },
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

