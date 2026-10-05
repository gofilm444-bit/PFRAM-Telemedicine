import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthenticatedUser, SessionInfo } from "@pfram/shared-types";
import { createApiClient } from "@pfram/api-client";
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? "/api",
  webCookieSession: true,
  getCsrfToken: () =>
    document.cookie
      .split("; ")
      .find((v) => v.startsWith("pfram_csrf="))
      ?.split("=")[1] ?? null,
});
type Auth = {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (phoneNumber: string, password: string) => Promise<AuthenticatedUser>;
  registerMother: (data: Record<string, unknown>) => Promise<AuthenticatedUser>;
  refreshProfile: () => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  request: ReturnType<typeof createApiClient>["request"];
};
const C = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .refresh()
      .then((ok) =>
        ok
          ? api
              .request<AuthenticatedUser>("/auth/me")
              .then(setUser)
              .catch(() => setUser(null))
          : setUser(null),
      )
      .finally(() => setLoading(false));
  }, []);
  const value = useMemo<Auth>(
    () => ({
      user,
      loading,
      request: api.request,
      refreshProfile: async () => {
        const u = await api.request<AuthenticatedUser>("/auth/me");
        setUser(u);
        return u;
      },
      login: async (phoneNumber, password) => {
        const s = await api.request<SessionInfo>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ phoneNumber, password, clientType: "web" }),
        });
        api.setAccessToken(s.accessToken);
        setUser(s.user);
        return s.user;
      },
      registerMother: async (data: Record<string, unknown>) => {
        const s = await api.request<SessionInfo>("/auth/register/mother", {
          method: "POST",
          body: JSON.stringify({ ...data, clientType: "web" }),
        });
        api.setAccessToken(s.accessToken);
        setUser(s.user);
        return s.user;
      },
      logout: async () => {
        await api
          .request("/auth/logout", {
            method: "POST",
            body: JSON.stringify({ clientType: "web" }),
          })
          .catch(() => undefined);
        api.setAccessToken(null);
        setUser(null);
      },
    }),
    [user, loading],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useAuth = () => {
  const c = useContext(C);
  if (!c) throw new Error("AuthProvider diperlukan");
  return c;
};
