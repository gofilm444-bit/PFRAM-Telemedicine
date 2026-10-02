import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import type { AuthenticatedUser, SessionInfo } from "@pfram/shared-types";
import { createApiClient } from "@pfram/api-client";
const adapter = {
  getRefreshToken: () => SecureStore.getItemAsync("pfram_refresh_token"),
  setRefreshToken: async (token: string | null) =>
    token
      ? SecureStore.setItemAsync("pfram_refresh_token", token, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      : SecureStore.deleteItemAsync("pfram_refresh_token"),
};
function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!envUrl) {
    return "http://10.0.2.2:3200/api";
  }
  const clean = envUrl.replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

export const api = createApiClient({
  baseUrl: resolveApiBaseUrl(),
  sessionAdapter: adapter,
});
type Auth = {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<AuthenticatedUser>;
  register: (data: Record<string, unknown>) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  request: ReturnType<typeof createApiClient>["request"];
  refreshProfile: () => Promise<void>;
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
          : undefined,
      )
      .finally(() => setLoading(false));
  }, []);
  const value = useMemo<Auth>(
    () => ({
      user,
      loading,
      request: api.request,
      refreshProfile: async () =>
        setUser(await api.request<AuthenticatedUser>("/auth/me")),
      login: async (phoneNumber, password) => {
        const s = await api.request<SessionInfo>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ phoneNumber, password, clientType: "mobile" }),
        });
        api.setAccessToken(s.accessToken);
        if (s.refreshToken) await adapter.setRefreshToken(s.refreshToken);
        setUser(s.user);
        return s.user;
      },
      register: async (data) => {
        const s = await api.request<SessionInfo>("/auth/register/mother", {
          method: "POST",
          body: JSON.stringify({ ...data, clientType: "mobile" }),
        });
        api.setAccessToken(s.accessToken);
        if (s.refreshToken) await adapter.setRefreshToken(s.refreshToken);
        setUser(s.user);
        return s.user;
      },
      logout: async () => {
        const token = await adapter.getRefreshToken();
        await api
          .request("/auth/logout", {
            method: "POST",
            body: JSON.stringify({ refreshToken: token, clientType: "mobile" }),
          })
          .catch(() => undefined);
        api.setAccessToken(null);
        await adapter.setRefreshToken(null);
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
