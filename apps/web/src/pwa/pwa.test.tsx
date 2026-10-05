// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, act, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import { usePwaInstall, _resetPwaInstallStateForTesting } from "./usePwaInstall";
import { PwaUpdateNotification, _triggerNeedRefreshForTesting } from "./PwaUpdateNotification";
import { _setOnlineForTesting } from "./useOnlineStatus";
import { MotherAppShell } from "./MotherAppShell";
import { MotherBottomNav } from "./MotherBottomNav";
import { getMotherDestination } from "./mother-routing";
import { onboardingDraft } from "./onboarding-draft";
import type { AuthenticatedUser } from "@pfram/shared-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { WebWeightLineChart } from "../web-monitoring-charts";
import { isValidMeetingUrl } from "@pfram/validation";

let mockUser: AuthenticatedUser | null = null;
let mockLoading = false;

export const mockLogin = vi.fn();
export const mockLogout = vi.fn();
export const mockRegisterMother = vi.fn();
export const mockRefreshProfile = vi.fn();
export const mockRequest = vi.fn();

vi.mock("../auth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    login: mockLogin,
    logout: mockLogout,
    registerMother: mockRegisterMother,
    refreshProfile: mockRefreshProfile,
    request: mockRequest,
  }),
  api: {
    request: (...args: unknown[]) => mockRequest(...args),
    fetchBlob: vi.fn().mockImplementation(() => Promise.resolve(new Blob(["mock-blob"], { type: "image/jpeg" }))),
    setAccessToken: vi.fn(),
    refresh: vi.fn().mockResolvedValue(true),
  },
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import App from "../App";

describe("PWA-1 Infrastructure & App Identity", () => {
  const publicDir = path.resolve(__dirname, "../../public");
  const distDir = path.resolve(__dirname, "../../dist");

  function renderAppAt(path: string) {
    window.history.pushState({}, "Test page", path);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    mockUser = null;
    mockLoading = false;
    vi.clearAllMocks();
    _resetPwaInstallStateForTesting();
    window.localStorage.clear();
    window.sessionStorage.clear();
    onboardingDraft.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    mockLogin.mockImplementation(async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };
      return mockUser;
    });

    mockLogout.mockImplementation(async () => {
      mockUser = null;
    });

    mockRegisterMother.mockImplementation(async (data: Record<string, unknown>) => {
      mockUser = {
        publicId: "USR-NEW-01",
        phoneNumber: String(data.phoneNumber || "081234567890"),
        role: "MOTHER",
        displayName: String(data.fullName || "Ibu Baru"),
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "ACCOUNT_READY",
      };
      return mockUser;
    });

    mockRequest.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/users/summary")) {
        return Promise.resolve({
          counts: { ADMIN: 1, MIDWIFE: 1, MOTHER: 1 },
        });
      }
      if (typeof url === "string" && url.includes("/auth/consents")) {
        return Promise.resolve([
          {
            id: "00000000-0000-0000-0000-000000000001",
            title: "Persetujuan Layanan Telemedicine Maternal PFRAM",
          },
        ]);
      }
      if (typeof url === "string" && url.includes("/reference/regions?level=PROVINCE")) {
        return Promise.resolve({
          items: [{ publicId: "reg-prov-01", name: "Maluku Utara" }],
        });
      }
      if (typeof url === "string" && url.includes("/children")) {
        return Promise.resolve([
          { publicId: "reg-child-01", name: "Ternate" },
        ]);
      }
      if (typeof url === "string" && url.includes("/reference/facilities")) {
        return Promise.resolve({
          items: [
            {
              publicId: "fac-01",
              name: "Puskesmas Kalumata",
              type: "PUSKESMAS",
              address: "Jl. Pertiwi No. 1",
            },
          ],
        });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Web App Manifest (Canonical Source)", () => {
    it("1. verifies canonical manifest structure and properties from Vite build", () => {
      const manifestPath = path.join(distDir, "manifest.webmanifest");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifestContent = JSON.parse(
        fs.readFileSync(manifestPath, "utf-8"),
      );
      expect(manifestContent.name).toBe("PFRAM Telemedicine");
      expect(manifestContent.short_name).toBe("PFRAM");
      expect(manifestContent.description).toBe("Pantau Kehamilan, Lindungi Ibu dan Bayi");
      expect(manifestContent.start_url).toBe("/m");
      expect(manifestContent.scope).toBe("/");
      expect(manifestContent.display).toBe("standalone");
      expect(manifestContent.theme_color).toBe("#168C68");
      expect(manifestContent.background_color).toBe("#FFF8F2");
      expect(manifestContent.lang).toBe("id");

      const icon192 = manifestContent.icons.find(
        (i: { sizes: string; purpose: string }) =>
          i.sizes === "192x192" && i.purpose === "any",
      );
      const icon512 = manifestContent.icons.find(
        (i: { sizes: string; purpose: string }) =>
          i.sizes === "512x512" && i.purpose === "any",
      );
      const maskable192 = manifestContent.icons.find(
        (i: { sizes: string; purpose: string }) =>
          i.sizes === "192x192" && i.purpose === "maskable",
      );
      const maskable512 = manifestContent.icons.find(
        (i: { sizes: string; purpose: string }) =>
          i.sizes === "512x512" && i.purpose === "maskable",
      );

      expect(icon192).toBeDefined();
      expect(icon512).toBeDefined();
      expect(maskable192).toBeDefined();
      expect(maskable512).toBeDefined();
    });

    it("2. verifies physical PWA icon files exist on disk with valid sizes", () => {
      const requiredIcons = [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-192.png",
        "icons/icon-maskable-512.png",
        "apple-touch-icon.png",
      ];

      for (const relPath of requiredIcons) {
        const fullPath = path.join(publicDir, relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const stat = fs.statSync(fullPath);
        expect(stat.size).toBeGreaterThan(500);
      }
    });

    it("3. verifies index.html contains mobile metadata and exactly ONE manifest declaration", () => {
      const htmlPath = path.join(distDir, "index.html");
      expect(fs.existsSync(htmlPath)).toBe(true);

      const html = fs.readFileSync(htmlPath, "utf-8");
      expect(html).toContain('content="#168C68"');
      expect(html).toContain("viewport-fit=cover");
      expect(html).toContain('rel="apple-touch-icon"');

      const manifestMatches = html.match(/rel=["']manifest["']/g);
      expect(manifestMatches).not.toBeNull();
      expect(manifestMatches?.length).toBe(1);
    });

    it("4. verifies Workbox precache and service worker registration configuration", () => {
      const swPath = path.join(distDir, "sw.js");
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toContain("workbox");
      expect(swContent).not.toContain("/api/");
    });
  });

  describe("PWA Install Hook (usePwaInstall)", () => {
    function HookTestComponent() {
      const { canInstall, isInstalled, promptInstall } = usePwaInstall();
      return (
        <div>
          <span data-testid="can-install">{String(canInstall)}</span>
          <span data-testid="is-installed">{String(isInstalled)}</span>
          <button type="button" onClick={() => void promptInstall()}>
            Pasang
          </button>
        </div>
      );
    }

    it("5. detects beforeinstallprompt and triggers promptInstall", async () => {
      render(<HookTestComponent />);
      expect(screen.getByTestId("can-install").textContent).toBe("false");

      const promptSpy = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event("beforeinstallprompt") as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
      };
      mockEvent.prompt = promptSpy;
      mockEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

      act(() => {
        window.dispatchEvent(mockEvent as unknown as Event);
      });

      expect(screen.getByTestId("can-install").textContent).toBe("true");

      const button = screen.getByRole("button", { name: "Pasang" });
      await userEvent.click(button);

      expect(promptSpy).toHaveBeenCalled();
      expect(screen.getByTestId("is-installed").textContent).toBe("true");
    });
  });

  describe("PWA Update Notification", () => {
    it("6. renders safe update notification without crashing and provides non-aggressive controls", () => {
      render(<PwaUpdateNotification />);
      expect(screen.queryByText("Versi baru PFRAM tersedia")).toBeNull();
    });
  });

  describe("PWA /m Route Dispatcher", () => {
    it("7. unauthenticated user accessing /m is redirected to /login without 404", () => {
      mockUser = null;
      renderAppAt("/m");
      expect(screen.getByText("Masuk ke PFRAM")).toBeInTheDocument();
      expect(screen.queryByText(/404/)).toBeNull();
    });

    it("8. ADMIN accessing /m is redirected to /dashboard without 404", () => {
      mockUser = {
        publicId: "USR-ADMIN-01",
        phoneNumber: "081111111111",
        role: "ADMIN",
        displayName: "Administrator Dinkes",
        status: "ACTIVE",
        phoneVerifiedAt: null,
      };
      renderAppAt("/m");
      expect(screen.getByRole("heading", { name: "Dashboard Administrator" })).toBeInTheDocument();
      expect(screen.queryByText(/404/)).toBeNull();
    });

    it("9. MIDWIFE accessing /m is redirected to /dashboard without 404", () => {
      mockUser = {
        publicId: "USR-MIDWIFE-01",
        phoneNumber: "081222222222",
        role: "MIDWIFE",
        displayName: "Bdn. Siti Nurhaliza",
        status: "ACTIVE",
        phoneVerifiedAt: null,
      };
      renderAppAt("/m");
      expect(screen.getByRole("heading", { name: /Dashboard Bidan/ })).toBeInTheDocument();
      expect(screen.getAllByRole("link", { name: /Ibu Binaan/ }).length).toBeGreaterThan(0);
      expect(screen.queryByText(/404/)).toBeNull();
    });

    it("10. MOTHER accessing /m with complete profile renders official Mother home without 404", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };
      renderAppAt("/m");
      expect(screen.getByText(/Halo, Ibu Rahmawati/)).toBeInTheDocument();
      expect(screen.getByText(/Selamat datang di PFRAM Telemedicine/)).toBeInTheDocument();
      expect(screen.queryByText(/404/)).toBeNull();
    });
  });
});

describe("PWA-2 Authentication, Onboarding & Mother App Shell", () => {
  function renderAppAt(path: string) {
    window.history.pushState({}, "Test page", path);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    mockUser = null;
    mockLoading = false;
    vi.clearAllMocks();
    onboardingDraft.clear();

    mockLogin.mockImplementation(async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };
      return mockUser;
    });

    mockLogout.mockImplementation(async () => {
      mockUser = null;
    });

    mockRegisterMother.mockImplementation(async (data: Record<string, unknown>) => {
      mockUser = {
        publicId: "USR-NEW-01",
        phoneNumber: String(data.phoneNumber || "081234567890"),
        role: "MOTHER",
        displayName: String(data.fullName || "Ibu Baru"),
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "ACCOUNT_READY",
      };
      return mockUser;
    });

    mockRequest.mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("/users/summary")) {
        return Promise.resolve({
          counts: { ADMIN: 1, MIDWIFE: 1, MOTHER: 1 },
        });
      }
      if (typeof url === "string" && url.includes("/auth/consents")) {
        return Promise.resolve([
          {
            id: "00000000-0000-0000-0000-000000000001",
            title: "Persetujuan Layanan Telemedicine Maternal PFRAM",
          },
        ]);
      }
      if (typeof url === "string" && url.includes("/reference/regions?level=PROVINCE")) {
        return Promise.resolve({
          items: [{ publicId: "11111111-1111-4111-8111-111111111111", name: "Maluku Utara" }],
        });
      }
      if (typeof url === "string" && url.includes("/reference/regions/11111111-1111-4111-8111-111111111111/children")) {
        return Promise.resolve([
          { publicId: "22222222-2222-4222-8222-222222222222", name: "Kota Ternate" },
        ]);
      }
      if (typeof url === "string" && url.includes("/reference/regions/22222222-2222-4222-8222-222222222222/children")) {
        return Promise.resolve([
          { publicId: "33333333-3333-4333-8333-333333333333", name: "Ternate Selatan" },
        ]);
      }
      if (typeof url === "string" && url.includes("/children")) {
        return Promise.resolve([
          { publicId: "33333333-3333-4333-8333-333333333333", name: "Ternate Selatan" },
        ]);
      }
      if (typeof url === "string" && url.includes("/reference/facilities")) {
        return Promise.resolve({
          items: [
            {
              publicId: "44444444-4444-4444-8444-444444444444",
              name: "Puskesmas Kalumata",
              type: "PUSKESMAS",
              address: "Jl. Pertiwi No. 1",
            },
          ],
        });
      }
      if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
        return Promise.resolve({
          publicId: "anc-sch-01",
          motherPublicId: "USR-MOTHER-01",
          pregnancyPublicId: "preg-01",
          facility: { publicId: "44444444-4444-4444-8444-444444444444", name: "Puskesmas Kalumata" },
          scheduledAt: "2026-10-15T09:00:00Z",
          visitType: "ANC",
          doctorRequired: false,
          status: "SCHEDULED",
          notes: "Pemeriksaan rutin trimester 2",
          completedAt: null,
          createdAt: "2026-09-01T08:00:00Z",
          updatedAt: "2026-09-01T08:00:00Z",
        });
      }
      if (typeof url === "string" && url.includes("/mother/monitoring/summary")) {
        return Promise.resolve({
          latestWeight: 58.5,
          latestWeightRecordedAt: "2026-10-01T08:30:00Z",
          latestBloodPressure: { systolic: 118, diastolic: 78 },
          latestBloodPressureRecordedAt: "2026-10-01T08:30:00Z",
          previousWeight: 57.0,
          weightChange: 1.5,
          totalEntries: 4,
          activePregnancyPublicId: "preg-01",
        });
      }
      if (
        typeof url === "string" &&
        (url === "/mother/monitoring" || url.startsWith("/mother/monitoring?"))
      ) {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body || "{}"));
          return Promise.resolve({
            publicId: "mon-new-01",
            motherPublicId: "USR-MOTHER-01",
            pregnancyPublicId: "preg-01",
            recordedAt: body.recordedAt || new Date().toISOString(),
            source: body.source || "SELF",
            weightKg: body.weightKg ?? null,
            systolicBp: body.systolicBp ?? null,
            diastolicBp: body.diastolicBp ?? null,
            notes: body.notes ?? null,
            isArchived: false,
          });
        }
        return Promise.resolve({
          items: [
            {
              publicId: "mon-01",
              recordedAt: "2026-10-01T08:30:00Z",
              source: "SELF",
              weightKg: 58.5,
              systolicBp: 118,
              diastolicBp: 78,
              notes: "Pengukuran pagi hari",
              isArchived: false,
            },
            {
              publicId: "mon-02",
              recordedAt: "2026-09-24T09:00:00Z",
              source: "MIDWIFE",
              weightKg: 57.0,
              systolicBp: 116,
              diastolicBp: 76,
              notes: "Pemeriksaan di Puskesmas",
              isArchived: false,
            },
          ],
          total: 2,
          page: 1,
          pageSize: 10,
        });
      }
      if (typeof url === "string" && url.includes("/archive")) {
        return Promise.resolve({
          publicId: "mon-01",
          archivedAt: new Date().toISOString(),
        });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Auth & Role-Aware Routing", () => {
    it("11. universal login page allows MOTHER login and redirects to /m", async () => {
      renderAppAt("/login");
      expect(screen.getByText("Masuk ke PFRAM")).toBeInTheDocument();

      const phoneInput = screen.getByLabelText("Nomor Handphone");
      const passwordInput = screen.getByLabelText("Kata Sandi");
      const submitBtn = screen.getByRole("button", { name: "Masuk ke Dashboard" });

      await userEvent.type(phoneInput, "081333333333");
      await userEvent.type(passwordInput, "Rahasia1234");
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("6281333333333", "Rahasia1234");
      });
    });

    it("12. authenticated MOTHER entering staff routes (/dashboard) is redirected to /m", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };
      renderAppAt("/dashboard");
      expect(screen.queryByRole("heading", { name: "Dashboard Administrator" })).toBeNull();
      expect(screen.queryByRole("heading", { name: /Dashboard Bidan/ })).toBeNull();
      expect(screen.getByText(/Halo, Ibu Rahmawati!/)).toBeInTheDocument();
    });

    it("13. authenticated ADMIN/MIDWIFE entering /m is redirected to /dashboard", () => {
      mockUser = {
        publicId: "USR-ADMIN-01",
        phoneNumber: "081111111111",
        role: "ADMIN",
        displayName: "Administrator Dinkes",
        status: "ACTIVE",
        phoneVerifiedAt: null,
      };
      renderAppAt("/m/home");
      expect(screen.getByRole("heading", { name: "Dashboard Administrator" })).toBeInTheDocument();
    });

    it("14. session restoration displays AppLoadingScreen while loading is true", () => {
      mockLoading = true;
      renderAppAt("/m");
      expect(screen.getByText("Memulihkan sesi dan memuat data…")).toBeInTheDocument();
    });
  });

  describe("Mother Onboarding Dispatcher", () => {
    it("15. dispatches ACCOUNT_READY to /m/onboarding/personal", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "ACCOUNT_READY",
      };
      expect(getMotherDestination(mockUser)).toBe("/m/onboarding/personal");
      renderAppAt("/m");
      expect(screen.getByText("Identitas Calon Ibu")).toBeInTheDocument();
    });

    it("16. dispatches PERSONAL_PROFILE_INCOMPLETE to /m/onboarding/personal", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "PERSONAL_PROFILE_INCOMPLETE",
      };
      expect(getMotherDestination(mockUser)).toBe("/m/onboarding/personal");
    });

    it("17. dispatches FACILITY_NOT_SELECTED without draft to /m/onboarding/personal and with draft to /m/onboarding/facility", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "FACILITY_NOT_SELECTED",
      };
      expect(getMotherDestination(mockUser)).toBe("/m/onboarding/personal");

      onboardingDraft.setPersonal({
        fullName: "Ibu Rahmawati",
        dateOfBirth: "1995-05-15",
        address: "Jl. Teratai No. 5",
        provincePublicId: "11111111-1111-4111-8111-111111111111",
        regencyPublicId: "22222222-2222-4222-8222-222222222222",
        districtPublicId: "33333333-3333-4333-8333-333333333333",
      });

      expect(getMotherDestination(mockUser)).toBe("/m/onboarding/facility");
    });

    it("18. dispatches PREGNANCY_PROFILE_INCOMPLETE to /m/onboarding/pregnancy", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "PREGNANCY_PROFILE_INCOMPLETE",
      };
      expect(getMotherDestination(mockUser)).toBe("/m/onboarding/pregnancy");
      renderAppAt("/m");
      expect(screen.getByText("Perkiraan Usia Kehamilan")).toBeInTheDocument();
    });

    it("19. dispatches MIDWIFE_NOT_ASSIGNED and COMPLETE to /m/home", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "MIDWIFE_NOT_ASSIGNED",
      };
      expect(getMotherDestination(mockUser)).toBe("/m/home");

      mockUser.profileCompletionStatus = "COMPLETE";
      expect(getMotherDestination(mockUser)).toBe("/m/home");
    });
  });

  describe("Mother App Shell & Navigation", () => {
    it("20. MotherAppShell renders with top bar, mobile canvas, and bottom navigation", () => {
      render(
        <MemoryRouter initialEntries={["/m/home"]}>
          <MotherAppShell title="Beranda" subtitle="Subjudul">
            <p>Konten Utama</p>
          </MotherAppShell>
        </MemoryRouter>,
      );

      expect(screen.getByRole("heading", { name: "Beranda" })).toBeInTheDocument();
      expect(screen.getByText("Subjudul")).toBeInTheDocument();
      expect(screen.getByText("Konten Utama")).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Navigasi aplikasi ibu" })).toBeInTheDocument();
    });

    it("21. bottom nav contains exactly 5 tabs with min 48px touch targets", () => {
      render(
        <MemoryRouter initialEntries={["/m/home"]}>
          <MotherBottomNav />
        </MemoryRouter>,
      );

      const nav = screen.getByRole("navigation", { name: "Navigasi aplikasi ibu" });
      expect(nav).toBeInTheDocument();
      const links = screen.getAllByRole("link");
      expect(links.length).toBe(5);

      const labels = ["Beranda", "Pantau", "Konsultasi", "Edukasi", "Akun"];
      for (const label of labels) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }

      // Check min-height/min-width 48px
      for (const link of links) {
        expect(link.className).toContain("min-h-[48px]");
        expect(link.className).toContain("min-w-[48px]");
      }
    });

    it("22. desktop sidebar is NOT rendered in MotherAppShell", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };
      renderAppAt("/m/home");
      expect(screen.queryByLabelText("Menu utama")).toBeNull();
      expect(screen.queryByText("Menu Operasional")).toBeNull();
    });

    it("23. placeholders for monitoring, consultation, and education render without 404", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      const { unmount: u1 } = renderAppAt("/m/monitoring");
      expect(screen.getByText(/Pemantauan Fisik/)).toBeInTheDocument();
      u1();

      const { unmount: u2 } = renderAppAt("/m/consultation");
      expect(screen.getByText(/Telekonsultasi Bidan/)).toBeInTheDocument();
      u2();

      const { unmount: u3 } = renderAppAt("/m/education");
      expect(screen.getByText(/Edukasi Kehamilan|Materi Edukasi/)).toBeInTheDocument();
      u3();
    });

    it("24. MotherAccountPage displays user profile and triggers logout", async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      renderAppAt("/m/account");
      expect(screen.getByText("Ibu Rahmawati")).toBeInTheDocument();
      expect(screen.getByText("081333333333")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Keluar dari Akun" })).toBeInTheDocument();

      const logoutBtn = screen.getByRole("button", { name: "Keluar dari Akun" });
      await userEvent.click(logoutBtn);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe("Mother Registration Flow", () => {
    it("25. /register renders registration form with active consents", () => {
      renderAppAt("/register");
      expect(screen.getByRole("heading", { name: "Daftar Akun Ibu Hamil" })).toBeInTheDocument();
      expect(screen.getByLabelText("Nama Lengkap *")).toBeInTheDocument();
      expect(screen.getByLabelText("Nomor Handphone *")).toBeInTheDocument();
      expect(screen.getByLabelText("Kata Sandi *")).toBeInTheDocument();
      expect(screen.getByLabelText("Konfirmasi Kata Sandi *")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Daftar Akun Ibu" })).toBeDisabled();
    });

    it("26. /register enables submit when consent is checked and submits data", async () => {
      renderAppAt("/register");

      await userEvent.type(screen.getByLabelText("Nama Lengkap *"), "Ibu Siti Aisyah");
      await userEvent.type(screen.getByLabelText("Nomor Handphone *"), "081298765432");
      await userEvent.type(screen.getByLabelText("Kata Sandi *"), "RahasiaKuat123");
      await userEvent.type(screen.getByLabelText("Konfirmasi Kata Sandi *"), "RahasiaKuat123");

      const consentCheck = screen.getByRole("checkbox");
      await userEvent.click(consentCheck);

      const submitBtn = screen.getByRole("button", { name: "Daftar Akun Ibu" });
      expect(submitBtn).not.toBeDisabled();

      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockRegisterMother).toHaveBeenCalledWith(
          expect.objectContaining({
            fullName: "Ibu Siti Aisyah",
            phoneNumber: "081298765432",
            clientType: "web",
          }),
        );
      });
    });
  });

  describe("Onboarding Form Validation & Step Progression", () => {
    it("27. bottom nav applies active styles and aria-current to current destination", () => {
      render(
        <MemoryRouter initialEntries={["/m/consultation"]}>
          <MotherBottomNav />
        </MemoryRouter>,
      );

      const consultationLink = screen.getByRole("link", { name: /Konsultasi/ });
      expect(consultationLink.className).toContain("text-pfram-primary");
      expect(consultationLink.className).toContain("font-semibold");
    });

    it("28. personal profile form displays validation errors for missing required fields", async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "ACCOUNT_READY",
      };

      renderAppAt("/m/onboarding/personal");

      const submitBtn = screen.getByRole("button", { name: "Lanjut Pilih Fasilitas" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Nama wajib diisi")).toBeInTheDocument();
      });
    });

    it("29. personal profile form advances to facility selection when valid", async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "ACCOUNT_READY",
      };

      renderAppAt("/m/onboarding/personal");

      await userEvent.type(screen.getByLabelText("Nama Lengkap *"), "Ibu Rahmawati");
      await userEvent.type(screen.getByLabelText("Tanggal Lahir *"), "1995-05-15");
      await userEvent.type(screen.getByLabelText("Alamat Domisili *"), "Jl. Merdeka No. 10");

      // Wait for province options
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Maluku Utara" })).toBeInTheDocument();
      });

      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: "Provinsi *" }),
        "11111111-1111-4111-8111-111111111111",
      );

      // Wait for regency options
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Kota Ternate" })).toBeInTheDocument();
      });

      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: "Kabupaten / Kota *" }),
        "22222222-2222-4222-8222-222222222222",
      );

      // Wait for district options
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Ternate Selatan" })).toBeInTheDocument();
      });

      await userEvent.selectOptions(
        screen.getByRole("combobox", { name: "Kecamatan *" }),
        "33333333-3333-4333-8333-333333333333",
      );

      const submitBtn = screen.getByRole("button", { name: "Lanjut Pilih Fasilitas" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText("Fasilitas Pelayanan Primer")).toBeInTheDocument();
      });
    });
  });

  describe("PWA-3 Mother Home, Pregnancy Summary & Care Team", () => {
    it("30. complete Mother renders /m/home with greeting and active pregnancy hero card", async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
        activePregnancy: {
          publicId: "preg-01",
          status: "ACTIVE",
          pregnancyType: "SINGLETON",
          completedProfile: true,
          estimatedDueDate: "2027-01-18",
          gestationalAge: { weeks: 24, days: 3 },
          trimester: 2,
        },
        selectedFacility: {
          publicId: "fac-01",
          name: "Puskesmas Kalumata",
          phoneNumber: "0921-123456",
        },
        activeMidwifeAssignment: {
          publicId: "asg-01",
          midwife: {
            publicId: "mid-01",
            fullName: "Bidan Sri Wahyuni",
            whatsappNumber: "081234567890",
          },
          startedAt: "2026-08-01T00:00:00Z",
        },
      };

      renderAppAt("/m/home");
      expect(screen.getByText(/Halo, Ibu Rahmawati/)).toBeInTheDocument();
      expect(screen.getByText("Kehamilan Aktif")).toBeInTheDocument();
      expect(screen.getByText("24 Minggu 3 Hari")).toBeInTheDocument();
      expect(screen.getByText("Trimester II")).toBeInTheDocument();
      expect(screen.getByText(/18 Januari 2027/)).toBeInTheDocument();
    });

    it("31. upcoming ANC visit displays schedule, doctor/bidan type, and facility", async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
        activePregnancy: {
          publicId: "preg-01",
          status: "ACTIVE",
          pregnancyType: "SINGLETON",
          completedProfile: true,
          estimatedDueDate: "2027-01-18",
          gestationalAge: { weeks: 24, days: 3 },
          trimester: 2,
        },
      };

      renderAppAt("/m/home");

      await waitFor(() => {
        expect(screen.getByText(/15 Oktober 2026/)).toBeInTheDocument();
        expect(screen.getByText(/Pemeriksaan Bidan \(ANC\)/)).toBeInTheDocument();
        expect(screen.getByText(/Puskesmas Kalumata/)).toBeInTheDocument();
      });
    });

    it("32. upcoming ANC displays calm friendly empty state when no upcoming visit exists", async () => {
      mockRequest.mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
          return Promise.resolve(null);
        }
        if (typeof url === "string" && url.includes("/mother/monitoring/summary")) {
          return Promise.resolve({
            latestWeight: null,
            latestWeightRecordedAt: null,
            latestBloodPressure: null,
            latestBloodPressureRecordedAt: null,
            previousWeight: null,
            weightChange: null,
            totalEntries: 0,
            activePregnancyPublicId: null,
          });
        }
        return Promise.resolve({});
      });

      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      renderAppAt("/m/home");

      await waitFor(() => {
        expect(screen.getByText("Belum ada jadwal ANC mendatang")).toBeInTheDocument();
      });
    });

    it("33. health snapshot displays latest weight and blood pressure", async () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      renderAppAt("/m/home");

      await waitFor(() => {
        expect(screen.getByText("58,5 kg")).toBeInTheDocument();
        expect(screen.getByText("118/78 mmHg")).toBeInTheDocument();
      });
    });

    it("34. health snapshot displays friendly empty state when no entries exist", async () => {
      mockRequest.mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/mother/monitoring/summary")) {
          return Promise.resolve({
            latestWeight: null,
            latestWeightRecordedAt: null,
            latestBloodPressure: null,
            latestBloodPressureRecordedAt: null,
            previousWeight: null,
            weightChange: null,
            totalEntries: 0,
            activePregnancyPublicId: null,
          });
        }
        return Promise.resolve({});
      });

      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      renderAppAt("/m/home");

      await waitFor(() => {
        expect(screen.getByText("Belum ada catatan pemantauan")).toBeInTheDocument();
      });
    });

    it("35. care team renders facility name, phone call link, and assigned midwife", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
        selectedFacility: {
          publicId: "fac-01",
          name: "Puskesmas Kalumata",
          phoneNumber: "0921-123456",
        },
        activeMidwifeAssignment: {
          publicId: "asg-01",
          midwife: {
            publicId: "mid-01",
            fullName: "Bidan Sri Wahyuni",
            whatsappNumber: "081234567890",
          },
          startedAt: "2026-08-01T00:00:00Z",
        },
      };

      renderAppAt("/m/home");
      expect(screen.getByText("Puskesmas Kalumata")).toBeInTheDocument();
      expect(screen.getByText("Bidan Sri Wahyuni")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /0921-123456/ })).toHaveAttribute("href", "tel:0921123456");
      expect(screen.queryByText("fac-01")).toBeNull();
      expect(screen.queryByText("mid-01")).toBeNull();
    });

    it("36. care team renders neutral state when MIDWIFE_NOT_ASSIGNED without raw UUID", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "MIDWIFE_NOT_ASSIGNED",
        selectedFacility: {
          publicId: "fac-01",
          name: "Puskesmas Kalumata",
          phoneNumber: null,
        },
        activeMidwifeAssignment: null,
      };

      renderAppAt("/m/home");
      expect(screen.getByText("Puskesmas Kalumata")).toBeInTheDocument();
      expect(screen.getByText("Sedang Diproses")).toBeInTheDocument();
      expect(screen.getByText(/Bidan pendamping sedang diproses/)).toBeInTheDocument();
    });

    it("37. quick action cards link to monitoring, consultation, education, and account", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      renderAppAt("/m/home");
      const quickActions = screen.getByLabelText("Aksi Cepat");
      expect(within(quickActions).getByRole("link", { name: /Pantau Fisik/ })).toHaveAttribute("href", "/m/monitoring");
      expect(within(quickActions).getByRole("link", { name: /Konsultasi/ })).toHaveAttribute("href", "/m/consultation");
      expect(within(quickActions).getByRole("link", { name: /Edukasi KIA/ })).toHaveAttribute("href", "/m/education");
      expect(within(quickActions).getByRole("link", { name: /Akun & Profil/ })).toHaveAttribute("href", "/m/account");
    });

    it("38. clinical safety advisory renders warning to immediately visit health facility", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      renderAppAt("/m/home");
      expect(screen.getByText("Peringatan Medis & Kedaruratan")).toBeInTheDocument();
      expect(
        screen.getByText("Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi."),
      ).toBeInTheDocument();
    });

    it("39. user-facing UI polish: no internal PWA-x labels in placeholders or home", () => {
      mockUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      const { unmount: uHome } = renderAppAt("/m/home");
      expect(screen.queryByText(/PWA-3|PWA-4|PWA-5|PWA-6|PWA-7/i)).toBeNull();
      uHome();

      const { unmount: uCons } = renderAppAt("/m/consultation");
      expect(screen.queryByText(/PWA-3|PWA-4|PWA-5|PWA-6|PWA-7/i)).toBeNull();
      expect(screen.getByText(/Telekonsultasi Bidan/)).toBeInTheDocument();
      uCons();
    });

    it("40. account page hides raw UUID and renders subtle app version info", () => {
      mockUser = {
        publicId: "12345678-1234-4234-8234-123456789012",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      renderAppAt("/m/account");
      expect(screen.queryByText("12345678-1234-4234-8234-123456789012")).toBeNull();
      expect(screen.queryByText("Versi PWA: 0.1.0")).toBeNull();
      expect(screen.getByText(/Sistem Terintegrasi Buku KIA Kemenkes RI · Versi 0.1.0/)).toBeInTheDocument();
      expect(screen.getByText("Keamanan Akun")).toBeInTheDocument();
      expect(screen.getByText("Sesi masuk dilindungi sistem autentikasi aman")).toBeInTheDocument();
    });
  });

  describe("PWA-4 Mother Physical Monitoring Module", () => {
    const defaultMotherUser: AuthenticatedUser = {
      publicId: "USR-MOTHER-01",
      phoneNumber: "081333333333",
      role: "MOTHER",
      displayName: "Ibu Rahmawati",
      status: "ACTIVE",
      phoneVerifiedAt: null,
      profileCompletionStatus: "COMPLETE",
      activePregnancy: {
        publicId: "preg-01",
        status: "ACTIVE",
        pregnancyType: "SINGLETON",
        completedProfile: true,
        estimatedDueDate: "2027-01-18",
        gestationalAge: { weeks: 24, days: 3 },
        trimester: 2,
      },
    };

    it("41. /m/monitoring renders real module, header, safety advisory, and Pantau bottom nav is active", () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      expect(screen.getByRole("heading", { name: "Pemantauan Fisik" })).toBeInTheDocument();
      expect(screen.getByText("Catat dan pantau perubahan selama kehamilan")).toBeInTheDocument();
      expect(screen.getByText("Peringatan Medis & Kedaruratan")).toBeInTheDocument();
      expect(screen.getByText(/Segera menuju fasilitas kesehatan/)).toBeInTheDocument();

      const pantauLink = screen.getByRole("link", { name: /Pantau/i });
      expect(pantauLink).toHaveAttribute("aria-current", "page");
      expect(screen.queryByText(/Fitur ini sedang disiapkan/i)).toBeNull();
    });

    it("42. latest summary snapshot displays weight, BP, and friendly empty state when no data", async () => {
      mockUser = defaultMotherUser;
      const { unmount } = renderAppAt("/m/monitoring");

      await waitFor(() => {
        const summaryCard = screen.getByLabelText("Ringkasan Pemantauan");
        expect(within(summaryCard).getByText("58,5 kg")).toBeInTheDocument();
        expect(within(summaryCard).getByText("118/78 mmHg")).toBeInTheDocument();
        expect(within(summaryCard).getByText("4 Catatan")).toBeInTheDocument();
        expect(within(summaryCard).getByText("+1,5 kg")).toBeInTheDocument();
      });
      unmount();

      // Empty summary state
      mockRequest.mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/mother/monitoring/summary")) {
          return Promise.resolve({
            latestWeight: null,
            latestWeightRecordedAt: null,
            latestBloodPressure: null,
            latestBloodPressureRecordedAt: null,
            previousWeight: null,
            weightChange: null,
            totalEntries: 0,
            activePregnancyPublicId: null,
          });
        }
        if (typeof url === "string" && (url === "/mother/monitoring" || url.startsWith("/mother/monitoring?"))) {
          return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10 });
        }
        return Promise.resolve({});
      });

      renderAppAt("/m/monitoring");
      await waitFor(() => {
        expect(screen.getAllByText("Belum ada catatan pemantauan").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("0 Catatan")).toBeInTheDocument();
      });
    });

    it("43. quick action button toggles self-entry form", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      expect(screen.queryByText("Catat Pemantauan Mandiri")).toBeNull();

      const toggleBtn = screen.getByRole("button", { name: "+ Catat Pemantauan" });
      await userEvent.click(toggleBtn);

      expect(screen.getByText("Catat Pemantauan Mandiri")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Simpan Catatan" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tutup Formulir" })).toBeInTheDocument();

      const cancelBtn = screen.getByRole("button", { name: "Batal" });
      await userEvent.click(cancelBtn);

      expect(screen.queryByText("Catat Pemantauan Mandiri")).toBeNull();
    });

    it("44. form validates and submits valid weight-only entry", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const weightInput = screen.getByLabelText("Berat Badan (kg) — Opsional");
      await userEvent.type(weightInput, "59,2");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          "/mother/monitoring",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"weightKg":59.2'),
          }),
        );
      });
    });

    it("45. form validates and submits valid blood-pressure-only entry", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const systolicInput = screen.getByPlaceholderText("Sistolik (120)");
      const diastolicInput = screen.getByPlaceholderText("Diastolik (80)");

      await userEvent.type(systolicInput, "120");
      await userEvent.type(diastolicInput, "80");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          "/mother/monitoring",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"systolicBp":120'),
          }),
        );
      });
    });

    it("46. form validates and submits valid combined weight and blood pressure entry", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const weightInput = screen.getByLabelText("Berat Badan (kg) — Opsional");
      const systolicInput = screen.getByPlaceholderText("Sistolik (120)");
      const diastolicInput = screen.getByPlaceholderText("Diastolik (80)");

      await userEvent.type(weightInput, "60");
      await userEvent.type(systolicInput, "125");
      await userEvent.type(diastolicInput, "82");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          "/mother/monitoring",
          expect.objectContaining({
            method: "POST",
            body: expect.stringMatching(/"weightKg":60.*"systolicBp":125.*"diastolicBp":82/),
          }),
        );
      });
    });

    it("47. form validation rejects empty entry (neither weight nor BP)", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Minimal salah satu harus diisi: berat badan atau tekanan darah"),
        ).toBeInTheDocument();
      });
    });

    it("48. form validation rejects invalid weight (< 20 kg or > 300 kg)", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const weightInput = screen.getByLabelText("Berat Badan (kg) — Opsional");
      await userEvent.type(weightInput, "15");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Masukkan berat badan antara 20–300 kg."),
        ).toBeInTheDocument();
      });
    });

    it("49. form validation rejects unpaired BP (systolic without diastolic or vice versa)", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const systolicInput = screen.getByPlaceholderText("Sistolik (120)");
      await userEvent.type(systolicInput, "120");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Tekanan diastolik wajib diisi jika tekanan sistolik diisi"),
        ).toBeInTheDocument();
      });
    });

    it("50. form validation rejects systolic <= diastolic", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const systolicInput = screen.getByPlaceholderText("Sistolik (120)");
      const diastolicInput = screen.getByPlaceholderText("Diastolik (80)");

      await userEvent.type(systolicInput, "80");
      await userEvent.type(diastolicInput, "120");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Tekanan sistolik harus lebih besar dari diastolik"),
        ).toBeInTheDocument();
      });
    });

    it("51. form submission prevents duplicate action while pending", async () => {
      mockUser = defaultMotherUser;

      let resolveApi: (v: unknown) => void;
      mockRequest.mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/mother/monitoring" && init?.method === "POST") {
          return new Promise((res) => {
            resolveApi = res;
          });
        }
        if (typeof url === "string" && url.includes("/mother/monitoring/summary")) {
          return Promise.resolve({
            latestWeight: 58.5,
            latestWeightRecordedAt: "2026-10-01T08:30:00Z",
            latestBloodPressure: { systolic: 118, diastolic: 78 },
            latestBloodPressureRecordedAt: "2026-10-01T08:30:00Z",
            previousWeight: 57.0,
            weightChange: 1.5,
            totalEntries: 4,
            activePregnancyPublicId: "preg-01",
          });
        }
        return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 10 });
      });

      renderAppAt("/m/monitoring");
      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const weightInput = screen.getByLabelText("Berat Badan (kg) — Opsional");
      await userEvent.type(weightInput, "59");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      expect(screen.getByRole("button", { name: "Menyimpan…" })).toBeDisabled();

      await act(async () => {
        resolveApi({
          publicId: "mon-new",
          recordedAt: new Date().toISOString(),
          source: "SELF",
          weightKg: 59,
        });
      });
    });

    it("52. history renders entries with friendly source badges", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await waitFor(() => {
        expect(screen.getByText("Dicatat sendiri")).toBeInTheDocument();
        expect(screen.getByText("Dicatat oleh bidan")).toBeInTheDocument();
        expect(screen.getByText("116/76 mmHg")).toBeInTheDocument();
        expect(screen.getByText("57 kg")).toBeInTheDocument();
      });
    });

    it("53. history allows edit and archive on self-recorded entry, but hides edit/archive on midwife entry", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await waitFor(() => {
        expect(screen.getByText("Dicatat sendiri")).toBeInTheDocument();
      });

      // There are 2 records in mock: mon-01 (SELF) and mon-02 (MIDWIFE)
      // Exactly ONE edit button and ONE archive button should exist (only for SELF)
      expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: "Arsipkan" })).toHaveLength(1);

      // Clicking archive opens confirmation dialog
      const archiveBtn = screen.getByRole("button", { name: "Arsipkan" });
      await userEvent.click(archiveBtn);

      expect(screen.getByRole("heading", { name: "Arsipkan Catatan?" })).toBeInTheDocument();
      expect(
        screen.getByText(/Catatan ini tidak akan tampil lagi dalam riwayat aktif/),
      ).toBeInTheDocument();
    });

    it("54. trend charts render weight and blood pressure SVG charts with period filter", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Grafik Perkembangan" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Grafik Perkembangan Berat Badan" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Grafik Perkembangan Tekanan Darah" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "7 Hari" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "30 Hari" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Kehamilan Ini" })).toBeInTheDocument();
      });
    });

    it("55. privacy & cache safety: clinical data is not persisted to localStorage or sessionStorage", () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      // Verify localStorage does not contain clinical monitoring data
      const localKeys = Object.keys(window.localStorage);
      for (const k of localKeys) {
        expect(k).not.toMatch(/monitoring|weight|bloodPressure|systolic|diastolic/i);
      }

      // Verify sessionStorage does not contain clinical monitoring data
      const sessionKeys = Object.keys(window.sessionStorage);
      for (const k of sessionKeys) {
        expect(k).not.toMatch(/monitoring|weight|bloodPressure|systolic|diastolic/i);
      }
    });

    it("56. mother self-entry form strictly enforces source integrity (no clinical dropdown, displays Dicatat sendiri, submits source: SELF)", async () => {
      mockUser = defaultMotherUser;
      renderAppAt("/m/monitoring");

      await userEvent.click(screen.getByRole("button", { name: "+ Catat Pemantauan" }));

      const formSection = screen.getByText("Catat Pemantauan Mandiri").closest("section")!;

      // Form must not contain editable source dropdown/combobox
      expect(within(formSection).queryByRole("combobox")).toBeNull();
      expect(within(formSection).queryByLabelText(/sumber/i)).toBeNull();

      // Displays subtle non-editable badge indicating self-recording
      expect(within(formSection).getByText("Dicatat sendiri")).toBeInTheDocument();

      // Enter weight and submit
      const weightInput = screen.getByLabelText("Berat Badan (kg) — Opsional");
      await userEvent.type(weightInput, "59,5");

      const submitBtn = screen.getByRole("button", { name: "Simpan Catatan" });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          "/mother/monitoring",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"source":"SELF"'),
          }),
        );
      });
    });

    it("57. trend chart auto-selects newly added point upon data update while preserving manual point selection", async () => {
      const initialPoints = [
        {
          id: "pt-1",
          recordedAt: "2026-10-01T08:00:00Z",
          weightKg: 58,
          source: "SELF" as const,
        },
        {
          id: "pt-2",
          recordedAt: "2026-10-02T08:00:00Z",
          weightKg: 58.5,
          source: "SELF" as const,
        },
      ];

      const { rerender } = render(<WebWeightLineChart points={initialPoints} />);

      // Initially, the latest point (pt-2, 58.5 kg) is selected in the tooltip card
      const tooltip = screen.getByRole("region", { name: "Rincian titik berat badan terpilih" });
      expect(within(tooltip).getByText("58,5 kg")).toBeInTheDocument();

      // User manually clicks the earlier point (pt-1, 58 kg)
      const firstPointBtn = screen.getByRole("button", { name: /Titik berat 58 kg/i });
      await userEvent.click(firstPointBtn);
      expect(within(tooltip).getByText("58 kg")).toBeInTheDocument();

      // Rerender with the same points: manual selection is preserved
      rerender(<WebWeightLineChart points={initialPoints} />);
      expect(within(tooltip).getByText("58 kg")).toBeInTheDocument();

      // Rerender with a newly appended point (pt-3, 59.2 kg):
      // latestId changes, so selectedId automatically updates to the newest point
      const updatedPoints = [
        ...initialPoints,
        {
          id: "pt-3",
          recordedAt: "2026-10-03T08:00:00Z",
          weightKg: 59.2,
          source: "SELF" as const,
        },
      ];
      rerender(<WebWeightLineChart points={updatedPoints} />);
      expect(within(tooltip).getByText("59,2 kg")).toBeInTheDocument();
    });
  });

  describe("PWA-5 Mother Clinical Modules: ANC, Danger Screening & P4K", () => {
    function renderAppAt(path: string) {
      window.history.pushState({}, "Test page", path);
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });
      return render(
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>,
      );
    }

    const defaultMotherUser: AuthenticatedUser = {
      publicId: "USR-MOTHER-01",
      phoneNumber: "081333333333",
      role: "MOTHER",
      displayName: "Ibu Rahmawati",
      status: "ACTIVE",
      phoneVerifiedAt: null,
      profileCompletionStatus: "COMPLETE",
      selectedFacility: {
        publicId: "fac-01",
        name: "Puskesmas Kalumata",
        phoneNumber: "081234567890",
      },
      activeMidwifeAssignment: {
        publicId: "assign-01",
        midwife: {
          publicId: "usr-midwife-01",
          fullName: "Bidan Siti Nurhaliza",
          whatsappNumber: "081234567890",
        },
        startedAt: "2026-08-01T08:00:00Z",
      },
      activePregnancy: {
        publicId: "preg-01",
        status: "ACTIVE",
        pregnancyType: "SINGLETON",
        completedProfile: true,
        estimatedDueDate: "2027-01-18",
        gestationalAge: { weeks: 24, days: 3 },
        trimester: 2,
      },
    };

    beforeEach(() => {
      mockUser = defaultMotherUser;
      mockLoading = false;
      vi.clearAllMocks();

      mockRequest.mockImplementation((url: string, init?: RequestInit) => {
        // 1. ANC upcoming
        if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
          return Promise.resolve({
            publicId: "anc-01",
            motherPublicId: "USR-MOTHER-01",
            pregnancyPublicId: "preg-01",
            contactNumber: 1,
            scheduledAt: "2026-10-20T08:30:00Z",
            visitType: "DOCTOR_ANC",
            doctorRequired: true,
            status: "SCHEDULED",
            facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
            notes: "Pemeriksaan pertama dan USG Trimester 1",
            completedAt: null,
            createdAt: "2026-09-01T08:00:00Z",
            updatedAt: "2026-09-01T08:00:00Z",
          });
        }

        // 2. ANC adherence summary
        if (
          typeof url === "string" &&
          (url.includes("/mother/anc-schedules/adherence-summary") ||
            url.includes("/mother/adherence-summary"))
        ) {
          return Promise.resolve({
            totalTargetVisits: 6,
            completedVisits: 1,
            scheduledVisits: 1,
            missedVisits: 0,
            adherencePercentage: 50,
            ironSupplementationPercentage: 90,
            ironTabletsTotal: 90,
            ironTabletsCompleted: 81,
            ironTabletsAdherencePercentage: 90,
            ancTotalScheduled: 2,
            ancCompleted: 1,
            ancMissedUnconfirmed: 0,
            recentHistory: [],
          });
        }

        // 3. ANC recommendations
        if (typeof url === "string" && url.includes("/mother/anc-recommendations")) {
          return Promise.resolve({
            estimatedDueDate: "2027-01-18",
            recommendations: [
              {
                id: "rec-1",
                title: "USG Trimester 1",
                description: "Pemeriksaan USG oleh dokter obstetri atau umum terlatih",
                isDoctorVisit: true,
              },
            ],
            ruleSet: { publicId: "rs-1", version: "1.0", active: true },
          });
        }

        // 4. ANC confirm attendance
        if (typeof url === "string" && url.includes("/confirm-attendance")) {
          return Promise.resolve({
            publicId: "anc-01",
            status: "COMPLETED",
            completedAt: "2026-10-20T09:00:00Z",
          });
        }

        // 5. ANC schedules list
        if (
          typeof url === "string" &&
          (url.includes("/mother/anc-schedules") || url.startsWith("/mother/anc-schedules?"))
        ) {
          return Promise.resolve({
            items: [
              {
                publicId: "anc-01",
                contactNumber: 1,
                scheduledAt: "2026-10-20T08:30:00Z",
                visitType: "DOCTOR_ANC",
                doctorRequired: true,
                status: "SCHEDULED",
                facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
                notes: "Pemeriksaan pertama dokter",
              },
              {
                publicId: "anc-02",
                contactNumber: 2,
                scheduledAt: "2026-08-10T08:30:00Z",
                visitType: "ANC",
                doctorRequired: false,
                status: "COMPLETED",
                facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
                completedAt: "2026-08-10T09:00:00Z",
              },
            ],
            total: 2,
            page: 1,
            limit: 20,
          });
        }

        // 6. Danger Signs questions
        if (typeof url === "string" && url.includes("/mother/danger-signs")) {
          return Promise.resolve({
            ruleSet: {
              publicId: "rs-ds-1",
              name: "Standar Kemenkes RI 2024",
              version: "1.0",
              sourceReference: "Kemenkes",
              effectiveFrom: "2024-01-01",
              active: true,
            },
            rules: [
              {
                publicId: "rule-1",
                code: "BLEEDING",
                title: "Perdarahan",
                question: "Apakah Ibu mengalami perdarahan dari jalan lahir?",
                questionText: "Apakah Ibu mengalami perdarahan dari jalan lahir?",
                trimesterApplicability: [1, 2, 3],
                severityCategory: "URGENT",
                sortOrder: 1,
                active: true,
              },
              {
                publicId: "rule-2",
                code: "SEVERE_HEADACHE",
                title: "Sakit Kepala Hebat",
                question: "Apakah Ibu mengalami sakit kepala hebat yang tidak mereda?",
                questionText: "Apakah Ibu mengalami sakit kepala hebat yang tidak mereda?",
                trimesterApplicability: [1, 2, 3],
                severityCategory: "URGENT",
                sortOrder: 2,
                active: true,
              },
            ],
            pregnancy: {
              gestationalAge: { weeks: 24, days: 3 },
              trimester: 2,
            },
          });
        }

        // 7. Danger Screenings (create or list)
        if (typeof url === "string" && url.includes("/mother/danger-screenings")) {
          if (init?.method === "POST") {
            const body = JSON.parse(String(init.body || "{}"));
            const hasUrgent = body.responses?.some(
              (r: { ruleCode: string; answer: boolean }) => r.answer === true,
            );
            return Promise.resolve({
              publicId: "ds-new-01",
              motherPublicId: "USR-MOTHER-01",
              pregnancyPublicId: "preg-01",
              screenedAt: new Date().toISOString(),
              status: hasUrgent ? "REQUIRES_IMMEDIATE_CARE" : "NO_DANGER_REPORTED",
              followUpStatus: hasUrgent ? "PENDING" : "RESOLVED",
              reportedSignsCount: hasUrgent ? 1 : 0,
              ruleSetVersion: "1.0",
            });
          }
          return Promise.resolve({
            items: [
              {
                publicId: "ds-past-01",
                motherPublicId: "USR-MOTHER-01",
                pregnancyPublicId: "preg-01",
                screenedAt: "2026-09-20T10:00:00Z",
                status: "NO_DANGER_REPORTED",
                followUpStatus: "RESOLVED",
                reportedSignsCount: 0,
                ruleSetVersion: "1.0",
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          });
        }

        // 8. P4K plan & checklist & referral
        if (typeof url === "string" && url.includes("/mother/p4k/checklist")) {
          if (init?.method === "PATCH") {
            return Promise.resolve({
              items: [
                {
                  itemKey: "buku_kia",
                  title: "Buku KIA disiapkan",
                  category: "DOKUMEN",
                  checked: true,
                  sortOrder: 1,
                },
                {
                  itemKey: "ktp_bpjs",
                  title: "KTP dan Kartu BPJS aktif",
                  category: "DOKUMEN",
                  checked: true,
                  sortOrder: 2,
                },
              ],
              progress: { total: 2, checked: 2, percentage: 100 },
            });
          }
          return Promise.resolve({
            items: [
              {
                itemKey: "buku_kia",
                title: "Buku KIA disiapkan",
                category: "DOKUMEN",
                checked: true,
                sortOrder: 1,
              },
              {
                itemKey: "ktp_bpjs",
                title: "KTP dan Kartu BPJS aktif",
                category: "DOKUMEN",
                checked: false,
                sortOrder: 2,
              },
            ],
            progress: { total: 2, checked: 1, percentage: 50 },
          });
        }

        if (typeof url === "string" && url.includes("/mother/referral-plan")) {
          if (init?.method === "PUT") {
            const body = JSON.parse(String(init.body || "{}"));
            return Promise.resolve({
              publicId: "ref-01",
              motherPublicId: "USR-MOTHER-01",
              pregnancyPublicId: "preg-01",
              destinationFacility: {
                publicId: "fac-ref-01",
                name: body.customDestinationFacilityName || "RSUD Dr. H. Chasan Boesoirie Ternate",
              },
              customDestinationFacilityName:
                body.customDestinationFacilityName || "RSUD Dr. H. Chasan Boesoirie Ternate",
              transportType: body.transportType || "Speedboat Ambulans",
              transportContactNumber: body.transportContactNumber || "08123444555 (Pak Ali)",
              rtkName: body.rtkName || "RTK Kota Ternate",
              estimatedTravelTimeMinutes: body.estimatedTravelTimeMinutes ?? 45,
              createdAt: "2026-09-01T08:00:00Z",
              updatedAt: new Date().toISOString(),
            });
          }
          return Promise.resolve({
            publicId: "ref-01",
            motherPublicId: "USR-MOTHER-01",
            pregnancyPublicId: "preg-01",
            destinationFacility: {
              publicId: "fac-ref-01",
              name: "RSUD Dr. H. Chasan Boesoirie Ternate",
            },
            customDestinationFacilityName: "RSUD Dr. H. Chasan Boesoirie Ternate",
            transportType: "Speedboat Ambulans",
            transportContactNumber: "08123444555 (Pak Ali)",
            rtkName: "RTK Kota Ternate",
            estimatedTravelTimeMinutes: 45,
            createdAt: "2026-09-01T08:00:00Z",
            updatedAt: "2026-09-01T08:00:00Z",
          });
        }

        if (typeof url === "string" && (url === "/mother/p4k" || url.startsWith("/mother/p4k?"))) {
          if (init?.method === "PUT") {
            const body = JSON.parse(String(init.body || "{}"));
            return Promise.resolve({
              publicId: "p4k-01",
              motherPublicId: "USR-MOTHER-01",
              pregnancyPublicId: "preg-01",
              deliveryAttendant: body.deliveryAttendant || "Bidan Siti",
              customDeliveryFacilityName: body.customDeliveryFacilityName || "Puskesmas Kalumata",
              birthCompanionName: body.birthCompanionName || "Suami (Budi)",
              bloodDonors: body.bloodDonors || [
                { name: "Ahmad", bloodType: "O", phone: "08123456789" },
              ],
              createdAt: "2026-09-01T08:00:00Z",
              updatedAt: new Date().toISOString(),
            });
          }
          return Promise.resolve({
            publicId: "p4k-01",
            motherPublicId: "USR-MOTHER-01",
            pregnancyPublicId: "preg-01",
            deliveryAttendant: "Bidan Siti",
            customDeliveryFacilityName: "Puskesmas Kalumata",
            birthCompanionName: "Suami (Budi)",
            bloodDonors: [{ name: "Ahmad", bloodType: "O", phone: "08123456789" }],
            estimatedDueDate: "2027-01-18",
            createdAt: "2026-09-01T08:00:00Z",
            updatedAt: "2026-09-01T08:00:00Z",
          });
        }

        // Monitoring fallback
        if (typeof url === "string" && url.includes("/mother/monitoring/summary")) {
          return Promise.resolve({
            latestWeight: 58.5,
            latestWeightRecordedAt: "2026-10-01T08:30:00Z",
            latestBloodPressure: { systolic: 118, diastolic: 78 },
            latestBloodPressureRecordedAt: "2026-10-01T08:30:00Z",
            previousWeight: 57.0,
            weightChange: 1.5,
            totalEntries: 4,
            activePregnancyPublicId: "preg-01",
          });
        }

        return Promise.resolve({});
      });
    });

    it("58. /m/anc renders ANC schedule, adherence summary cards, and Kemenkes target progress", async () => {
      renderAppAt("/m/anc");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Jadwal & Kepatuhan ANC" })).toBeInTheDocument();
        expect(screen.getByText("50%")).toBeInTheDocument();
      });

      expect(screen.getByText(/Kepatuhan TTD:/)).toBeInTheDocument();
      expect(screen.getByText("Target Kemenkes RI (6 Kunjungan)")).toBeInTheDocument();
      expect(screen.getByText("Trimester 1")).toBeInTheDocument();
      expect(screen.getByText("Trimester 2")).toBeInTheDocument();
      expect(screen.getByText("Trimester 3")).toBeInTheDocument();
    });

    it("59. /m/anc highlights next upcoming ANC contact with doctor-required USG badge", async () => {
      renderAppAt("/m/anc");

      await waitFor(() => {
        const upcomingCard = screen.getByLabelText("Kunjungan Berikutnya");
        expect(within(upcomingCard).getByText("Kontak ke-1")).toBeInTheDocument();
        expect(within(upcomingCard).getByText("Wajib Dokter + USG")).toBeInTheDocument();
        expect(within(upcomingCard).getByText(/Puskesmas Kalumata/)).toBeInTheDocument();
        expect(within(upcomingCard).getAllByText(/USG Trimester 1/).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("60. /m/anc renders schedule list with filter tabs and neutral status badges", async () => {
      renderAppAt("/m/anc");

      await waitFor(() => {
        expect(screen.getByText("Terjadwal")).toBeInTheDocument();
        expect(screen.getByText("Sudah Hadir")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: "Semua" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mendatang" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Selesai" })).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Selesai" }));

      expect(screen.queryByText("Terjadwal")).toBeNull();
      expect(screen.getByText("Sudah Hadir")).toBeInTheDocument();
    });

    it("61. /m/anc allows mother to confirm attendance for scheduled ANC visit on appointment day", async () => {
      mockRequest.mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
          return Promise.resolve({
            publicId: "anc-01",
            motherPublicId: "USR-MOTHER-01",
            pregnancyPublicId: "preg-01",
            contactNumber: 1,
            scheduledAt: new Date().toISOString(),
            visitType: "DOCTOR_ANC",
            doctorRequired: true,
            status: "SCHEDULED",
            facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
            notes: "Pemeriksaan pertama dan USG Trimester 1",
            completedAt: null,
            createdAt: "2026-09-01T08:00:00Z",
            updatedAt: "2026-09-01T08:00:00Z",
          });
        }
        if (typeof url === "string" && url.includes("/confirm-attendance")) {
          return Promise.resolve({
            publicId: "anc-01",
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
          });
        }
        if (typeof url === "string" && (url.includes("/mother/anc-schedules") || url.startsWith("/mother/anc-schedules?"))) {
          return Promise.resolve({
            items: [
              {
                publicId: "anc-01",
                contactNumber: 1,
                scheduledAt: new Date().toISOString(),
                visitType: "DOCTOR_ANC",
                doctorRequired: true,
                status: "SCHEDULED",
                facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          });
        }
        return Promise.resolve({});
      });

      renderAppAt("/m/anc");

      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: "Konfirmasi Saya Sudah Datang" }).length).toBeGreaterThanOrEqual(1);
      });

      const confirmBtn = screen.getAllByRole("button", { name: "Konfirmasi Saya Sudah Datang" })[0]!;
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          expect.stringContaining("/confirm-attendance"),
          expect.anything(),
        );
      });
    });

    it("62. /m/anc displays friendly empty state when no schedules exist", async () => {
      mockRequest.mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
          return Promise.resolve(null);
        }
        if (typeof url === "string" && (url.includes("/mother/anc-schedules") || url.startsWith("/mother/anc-schedules?"))) {
          return Promise.resolve({ items: [], total: 0, page: 1, limit: 20 });
        }
        return Promise.resolve({});
      });

      renderAppAt("/m/anc");

      await waitFor(() => {
        expect(screen.getByText("Belum Ada Jadwal ANC")).toBeInTheDocument();
        expect(
          screen.getByText(/Jadwal pemeriksaan kehamilan akan dibuat oleh bidan/),
        ).toBeInTheDocument();
      });
    });

    it("63. /m/danger-screening renders canonical screening questions with >= 48px touch targets and progress indicator", async () => {
      renderAppAt("/m/danger-screening");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Skrining Tanda Bahaya" })).toBeInTheDocument();
        expect(screen.getByText("Apakah Ibu mengalami perdarahan dari jalan lahir?")).toBeInTheDocument();
      });

      expect(screen.getByText(/Pertanyaan 1 dari 2/)).toBeInTheDocument();

      const yaBtn = screen.getByRole("button", { name: "Ya" });
      const tidakBtn = screen.getByRole("button", { name: "Tidak" });

      expect(yaBtn.className).toContain("min-h-[48px]");
      expect(tidakBtn.className).toContain("min-h-[48px]");
    });

    it("64. /m/danger-screening validates that all questions are answered before submission", async () => {
      renderAppAt("/m/danger-screening");

      await waitFor(() => {
        expect(screen.getByText("Apakah Ibu mengalami perdarahan dari jalan lahir?")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));

      expect(screen.getByText("Pilih salah satu jawaban untuk melanjutkan.")).toBeInTheDocument();
    });

    it("65. /m/danger-screening urgent outcome displays exact locked emergency guidance and emergency call action without diagnosis", async () => {
      renderAppAt("/m/danger-screening");

      await waitFor(() => {
        expect(screen.getByText("Apakah Ibu mengalami perdarahan dari jalan lahir?")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Ya" }));
      await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));

      await waitFor(() => {
        expect(
          screen.getByText("Apakah Ibu mengalami sakit kepala hebat yang tidak mereda?"),
        ).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Tidak" }));
      await userEvent.click(screen.getByRole("button", { name: "Kirim Hasil Skrining" }));

      await waitFor(() => {
        expect(screen.getByRole("region", { name: "Hasil Skrining" })).toBeInTheDocument();
      });

      const resultCard = screen.getByRole("region", { name: "Hasil Skrining" });
      expect(within(resultCard).getByText("Segera ke Fasilitas Kesehatan")).toBeInTheDocument();
      expect(
        within(resultCard).getByText(
          "Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.",
        ),
      ).toBeInTheDocument();
      expect(
        within(resultCard).getByRole("link", { name: /Hubungi Faskes \/ Bidan Sekarang/ }),
      ).toBeInTheDocument();

      // Diagnostic negative assertions: strictly no diagnosis claims
      expect(screen.queryByText(/preeklamsia|solusio|abortus|diagnosis klinis/i)).toBeNull();
    });

    it("66. /m/danger-screening non-urgent outcome displays neutral confirmation without safety claim", async () => {
      renderAppAt("/m/danger-screening");

      await waitFor(() => {
        expect(screen.getByText("Apakah Ibu mengalami perdarahan dari jalan lahir?")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Tidak" }));
      await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));

      await waitFor(() => {
        expect(
          screen.getByText("Apakah Ibu mengalami sakit kepala hebat yang tidak mereda?"),
        ).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Tidak" }));
      await userEvent.click(screen.getByRole("button", { name: "Kirim Hasil Skrining" }));

      await waitFor(() => {
        expect(screen.getByRole("region", { name: "Hasil Skrining" })).toBeInTheDocument();
      });

      const resultCard = screen.getByRole("region", { name: "Hasil Skrining" });
      expect(within(resultCard).getByText("Hasil skrining telah dicatat.")).toBeInTheDocument();

      // Safety claim negative assertions: strictly no absolute reassurance
      expect(screen.queryByText(/bebas risiko|pasti aman|tidak ada risiko/i)).toBeNull();
    });

    it("67. /m/danger-screening renders past screening history and midwife follow-up badges", async () => {
      renderAppAt("/m/danger-screening");

      await waitFor(() => {
        expect(screen.getByText("Riwayat Skrining")).toBeInTheDocument();
        expect(screen.getByText("Tidak Ada Tanda Bahaya")).toBeInTheDocument();
        expect(screen.getByText("Selesai")).toBeInTheDocument();
      });
    });

    it("68. /m/p4k renders 3 tabs: Rencana Persalinan, Rujukan & Laut, and Checklist", async () => {
      renderAppAt("/m/p4k");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Perencanaan Persalinan (P4K)" })).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: "Rencana Persalinan" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Rujukan & Laut" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Checklist" })).toBeInTheDocument();
      expect(screen.getByText("P4K Aktif")).toBeInTheDocument();
      expect(screen.getByText("Transportasi Laut")).toBeInTheDocument();
    });

    it("69. /m/p4k edits and saves birth plan (penolong, tempat, pendamping, donor darah)", async () => {
      renderAppAt("/m/p4k");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Ubah Rencana Persalinan" })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Ubah Rencana Persalinan" }));

      const placeInput = screen.getByLabelText("Tempat Bersalin *");
      await userEvent.clear(placeInput);
      await userEvent.type(placeInput, "RSUD Dr. H. Chasan Boesoirie");

      await userEvent.click(screen.getByRole("button", { name: "Simpan Rencana" }));

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          "/mother/p4k",
          expect.objectContaining({
            method: "PUT",
            body: expect.stringContaining("RSUD Dr. H. Chasan Boesoirie"),
          }),
        );
      });
    });

    it("70. /m/p4k edits and saves island referral plan (transportasi laut, motoris, RTK, waktu tempuh)", async () => {
      renderAppAt("/m/p4k");

      await userEvent.click(screen.getByRole("button", { name: "Rujukan & Laut" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Ubah Rencana Rujukan" })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Ubah Rencana Rujukan" }));

      const motorisInput = screen.getByLabelText("Kontak Motoris / Sopir Ambulans Laut");
      await userEvent.clear(motorisInput);
      await userEvent.type(motorisInput, "081299998888 (Pak Harun)");

      await userEvent.click(screen.getByRole("button", { name: "Simpan Rencana Rujukan" }));

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          "/mother/referral-plan",
          expect.objectContaining({
            method: "PUT",
            body: expect.stringContaining("081299998888 (Pak Harun)"),
          }),
        );
      });
    });

    it("71. /m/p4k checklist toggles items, updates progress bar, and sends patch request", async () => {
      renderAppAt("/m/p4k");

      await userEvent.click(screen.getByRole("button", { name: "Checklist" }));

      await waitFor(() => {
        expect(screen.getByText("1 dari 2 selesai (50%)")).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[1]!);

      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith(
          "/mother/p4k/checklist",
          expect.objectContaining({
            method: "PATCH",
            body: expect.stringContaining('"itemKey":"ktp_bpjs"'),
          }),
        );
      });
    });

    it("72. /m/p4k handles network error gracefully without losing entered form values", async () => {
      renderAppAt("/m/p4k");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Ubah Rencana Persalinan" })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: "Ubah Rencana Persalinan" }));

      const attendantInput = screen.getByLabelText("Penolong Persalinan *");
      await userEvent.clear(attendantInput);
      await userEvent.type(attendantInput, "Bidan Fatimah");

      mockRequest.mockImplementationOnce(() => Promise.reject(new Error("Network Error")));

      await userEvent.click(screen.getByRole("button", { name: "Simpan Rencana" }));

      await waitFor(() => {
        expect(
          screen.getByText("Gagal menyimpan rencana persalinan. Silakan coba kembali."),
        ).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Penolong Persalinan *")).toHaveValue("Bidan Fatimah");
    });

    it("73. /m/home quick action grid provides clickable navigation to /m/anc, /m/danger-screening, and /m/p4k", async () => {
      renderAppAt("/m/home");

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /Jadwal ANC/ })).toBeInTheDocument();
      });

      expect(screen.getByRole("link", { name: /Jadwal ANC/ })).toHaveAttribute("href", "/m/anc");
      expect(screen.getByRole("link", { name: /Tanda Bahaya/ })).toHaveAttribute(
        "href",
        "/m/danger-screening",
      );
      expect(screen.getByRole("link", { name: /P4K & Rujukan/ })).toHaveAttribute("href", "/m/p4k");
      expect(screen.getByRole("link", { name: /Lihat Jadwal/ })).toHaveAttribute("href", "/m/anc");
    });

    it("74. role guard blocks and redirects non-MOTHER users (MIDWIFE / ADMIN) away from /m/anc, /m/danger-screening, and /m/p4k", () => {
      mockUser = {
        publicId: "USR-MIDWIFE-01",
        role: "MIDWIFE",
        phoneNumber: "081233333333",
        displayName: "Bidan Siti",
        status: "ACTIVE",
        phoneVerifiedAt: null,
      };

      const { unmount: u1 } = renderAppAt("/m/anc");
      expect(screen.queryByRole("heading", { name: "Jadwal & Kepatuhan ANC" })).toBeNull();
      u1();

      mockUser = {
        publicId: "USR-ADMIN-01",
        role: "ADMIN",
        phoneNumber: "081244444444",
        displayName: "Admin Faskes",
        status: "ACTIVE",
        phoneVerifiedAt: null,
      };

      const { unmount: u2 } = renderAppAt("/m/danger-screening");
      expect(screen.queryByRole("heading", { name: "Skrining Tanda Bahaya" })).toBeNull();
      u2();
    });

    it("75. strict privacy: no clinical ANC, danger screening, or P4K data is persisted in localStorage or sessionStorage", () => {
      localStorage.clear();
      sessionStorage.clear();

      const { unmount: uAnc } = renderAppAt("/m/anc");
      uAnc();

      const { unmount: uDs } = renderAppAt("/m/danger-screening");
      uDs();

      const { unmount: uP4k } = renderAppAt("/m/p4k");
      uP4k();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || "";
        expect(key).not.toMatch(/anc|screening|danger|p4k|referral|gestational/i);
        const val = localStorage.getItem(key) || "";
        expect(val).not.toMatch(/BLEEDING|USG|Speedboat|Chasan/i);
      }

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i) || "";
        expect(key).not.toMatch(/anc|screening|danger|p4k|referral|gestational/i);
        const val = sessionStorage.getItem(key) || "";
        expect(val).not.toMatch(/BLEEDING|USG|Speedboat|Chasan/i);
      }
    });

    describe("PWA-5 Security Audit — Auth Storage & Session Security", () => {
      it("76. login does NOT write access JWT to localStorage", async () => {
        mockUser = null;
        mockLoading = false;
        localStorage.clear();
        renderAppAt("/login");

        const phoneInput = screen.getByLabelText("Nomor Handphone");
        const passwordInput = screen.getByLabelText("Kata Sandi");
        const submitBtn = screen.getByRole("button", { name: "Masuk ke Dashboard" });

        await userEvent.type(phoneInput, "081333333333");
        await userEvent.type(passwordInput, "Rahasia1234");
        await userEvent.click(submitBtn);

        await waitFor(() => {
          expect(mockLogin).toHaveBeenCalled();
        });

        expect(localStorage.getItem("pfram_token")).toBeNull();
        expect(localStorage.getItem("pfram_user")).toBeNull();
        expect(localStorage.getItem("accessToken")).toBeNull();
        expect(localStorage.length).toBe(0);
      });

      it("77. login does NOT write access JWT to sessionStorage", async () => {
        mockUser = null;
        mockLoading = false;
        sessionStorage.clear();
        renderAppAt("/login");

        expect(sessionStorage.getItem("pfram_token")).toBeNull();
        expect(sessionStorage.getItem("pfram_user")).toBeNull();
        expect(sessionStorage.getItem("accessToken")).toBeNull();
        expect(sessionStorage.length).toBe(0);
      });

      it("78. refresh token is not accessible to JavaScript (HttpOnly cookie architecture)", () => {
        expect(document.cookie).not.toContain("pfram_refresh");
      });

      it("79. session restoration works through refresh-cookie flow", async () => {
        mockLoading = true;
        mockUser = null;
        const { unmount } = renderAppAt("/m");
        expect(screen.getByText("Memulihkan sesi dan memuat data…")).toBeInTheDocument();
        unmount();

        mockLoading = false;
        mockUser = defaultMotherUser;
        renderAppAt("/m/home");
        await waitFor(() => {
          expect(screen.getByText(/Halo, Ibu Rahmawati!/)).toBeInTheDocument();
        });
        expect(localStorage.getItem("pfram_token")).toBeNull();
      });

      it("80. logout clears in-memory session and invalidates refresh session", async () => {
        mockUser = defaultMotherUser;
        mockLoading = false;
        renderAppAt("/m/account");

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Keluar dari Akun/ })).toBeInTheDocument();
        });

        const logoutBtn = screen.getByRole("button", { name: /Keluar dari Akun/ });
        await userEvent.click(logoutBtn);

        expect(mockLogout).toHaveBeenCalled();
        expect(localStorage.getItem("pfram_token")).toBeNull();
        expect(sessionStorage.getItem("pfram_token")).toBeNull();
      });

      it("81. Mother PWA still restores authenticated session after F5 (page reload)", async () => {
        mockUser = defaultMotherUser;
        mockLoading = false;
        renderAppAt("/m/home");

        await waitFor(() => {
          expect(screen.getByText(/Halo, Ibu Rahmawati!/)).toBeInTheDocument();
        });

        // Storage remains 100% empty of credentials or PII
        expect(localStorage.getItem("pfram_token")).toBeNull();
        expect(sessionStorage.getItem("pfram_token")).toBeNull();
      });

      it("82. ADMIN/MIDWIFE web auth remains functional under unified cookie security model", () => {
        mockUser = {
          publicId: "USR-STAFF-01",
          phoneNumber: "081222222222",
          role: "MIDWIFE",
          displayName: "Bidan Pendamping",
          status: "ACTIVE",
          phoneVerifiedAt: "2026-09-01T00:00:00.000Z",
        };
        mockLoading = false;
        renderAppAt("/dashboard");
        expect(screen.getByRole("heading", { name: /Dashboard Bidan/ })).toBeInTheDocument();

        expect(localStorage.getItem("pfram_token")).toBeNull();
        expect(localStorage.getItem("pfram_user")).toBeNull();
      });

      it("83. no pfram_token bearer token persists in browser storage", () => {
        const localKeys = Object.keys(window.localStorage);
        const sessionKeys = Object.keys(window.sessionStorage);

        expect(localKeys).not.toContain("pfram_token");
        expect(localKeys).not.toContain("pfram_user");
        expect(sessionKeys).not.toContain("pfram_token");
        expect(sessionKeys).not.toContain("pfram_user");

        expect(localStorage.getItem("pfram_token")).toBeNull();
        expect(sessionStorage.getItem("pfram_token")).toBeNull();
      });
    });

    describe("PWA-5 Manual UAT Patch: Clinical Accuracy, Premature Confirmation Guard, & Hierarchy", () => {
      it("84. /m/anc renders ANC trimester visit requirements directly from ruleSet without implying all visits require doctor", async () => {
        renderAppAt("/m/anc");

        await waitFor(() => {
          expect(screen.getByText("Trimester 1")).toBeInTheDocument();
        });

        // T1 and T3 require min. 2 visits, 1x Doctor + USG
        expect(screen.getAllByText("Min. 2 kunjungan").length).toBeGreaterThanOrEqual(3);
        expect(screen.getAllByText("1x Dokter + USG").length).toBe(2);

        // Verify T2 does not demand Doctor + USG
        const t2Heading = screen.getByText("Trimester 2");
        const t2Card = t2Heading.closest("div");
        expect(t2Card).not.toBeNull();
        expect(t2Card?.textContent).toContain("Trimester 2");
        expect(t2Card?.textContent).toContain("Min. 2 kunjungan");
        expect(t2Card?.textContent).not.toContain("Dokter + USG");
      });

      it("85. /m/anc prevents premature confirmation for future appointments and renders availability notice", async () => {
        mockRequest.mockImplementation((url: string) => {
          if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
            return Promise.resolve({
              publicId: "anc-future-01",
              motherPublicId: "USR-MOTHER-01",
              pregnancyPublicId: "preg-01",
              contactNumber: 1,
              scheduledAt: "2026-12-25T08:30:00Z",
              visitType: "DOCTOR_ANC",
              doctorRequired: true,
              status: "SCHEDULED",
              facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
              notes: "Pemeriksaan mendatang",
              completedAt: null,
            });
          }
          if (typeof url === "string" && (url.includes("/mother/anc-schedules") || url.startsWith("/mother/anc-schedules?"))) {
            return Promise.resolve({
              items: [
                {
                  publicId: "anc-future-01",
                  contactNumber: 1,
                  scheduledAt: "2026-12-25T08:30:00Z",
                  visitType: "DOCTOR_ANC",
                  doctorRequired: true,
                  status: "SCHEDULED",
                  facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
                },
              ],
              total: 1,
              page: 1,
              limit: 20,
            });
          }
          return Promise.resolve({});
        });

        renderAppAt("/m/anc");

        await waitFor(() => {
          expect(screen.getByText(/Konfirmasi kehadiran mandiri akan tersedia pada hari pemeriksaan/)).toBeInTheDocument();
        });

        // Confirmation button must NOT be rendered for future appointments
        expect(screen.queryByRole("button", { name: "Konfirmasi Saya Sudah Datang" })).toBeNull();
        expect(screen.getByText("Terjadwal")).toBeInTheDocument();
      });

      it("86. routine ANC and P4K pages render compact neutral safety note without prominent red emergency banner", async () => {
        renderAppAt("/m/anc");

        await waitFor(() => {
          expect(screen.getByText("Jadwal & Kepatuhan ANC")).toBeInTheDocument();
        });

        // Routine ANC page must NOT render alert role banner
        expect(screen.queryByRole("alert")).toBeNull();
        const ancSafetyNote = screen.getByRole("note", { name: "Catatan Keselamatan Medis" });
        expect(ancSafetyNote).toBeInTheDocument();
        expect(ancSafetyNote.textContent).toContain("Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.");

        cleanup();

        renderAppAt("/m/p4k");

        await waitFor(() => {
          expect(screen.getByText("Perencanaan Persalinan (P4K)")).toBeInTheDocument();
        });

        // Routine P4K page must NOT render alert role banner
        expect(screen.queryByRole("alert")).toBeNull();
        const p4kSafetyNote = screen.getByRole("note", { name: "Catatan Keselamatan Medis" });
        expect(p4kSafetyNote).toBeInTheDocument();
        expect(p4kSafetyNote.textContent).toContain("Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.");
      });

      it("87. /m/danger-screening strictly retains prominent red emergency banner with role='alert'", async () => {
        renderAppAt("/m/danger-screening");

        await waitFor(() => {
          expect(screen.getByText("Skrining Tanda Bahaya")).toBeInTheDocument();
        });

        const alertBanner = screen.getByRole("alert");
        expect(alertBanner).toBeInTheDocument();
        expect(alertBanner.textContent).toContain("Peringatan Medis & Kedaruratan");
        expect(alertBanner.textContent).toContain("Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.");
      });

      it("88. /m/p4k renders 'Rencana Persalinan Tersusun' and contains no false-assurance wording ('Aman')", async () => {
        renderAppAt("/m/p4k");

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Rencana Persalinan Tersusun" })).toBeInTheDocument();
        });

        expect(screen.queryByText(/Rencana Persalinan Aman/i)).toBeNull();
      });

      it("89. ANC time display strictly shows WIT and formats consistently across /m/home and /m/anc", async () => {
        mockRequest.mockImplementation((url: string) => {
          if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
            return Promise.resolve({
              publicId: "anc-wit-01",
              motherPublicId: "USR-MOTHER-01",
              pregnancyPublicId: "preg-01",
              contactNumber: 1,
              scheduledAt: "2026-10-14T23:00:00.000Z", // 15 Okt 08:00 WIT
              visitType: "DOCTOR_ANC",
              doctorRequired: true,
              status: "SCHEDULED",
              facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
              notes: "Pemeriksaan pertama dan USG",
              completedAt: null,
            });
          }
          if (typeof url === "string" && (url.includes("/mother/anc-schedules") || url.startsWith("/mother/anc-schedules?"))) {
            return Promise.resolve({
              items: [
                {
                  publicId: "anc-wit-01",
                  contactNumber: 1,
                  scheduledAt: "2026-10-14T23:00:00.000Z",
                  visitType: "DOCTOR_ANC",
                  doctorRequired: true,
                  status: "SCHEDULED",
                  facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
                },
              ],
              total: 1,
              page: 1,
              limit: 20,
            });
          }
          return Promise.resolve({});
        });

        // 1. Verify /m/home
        const { unmount: unmountHome } = renderAppAt("/m/home");
        await waitFor(() => {
          expect(screen.getByText("15 Oktober 2026")).toBeInTheDocument();
          expect(screen.getByText(/Pukul 08\.00 WIT/)).toBeInTheDocument();
        });
        expect(screen.queryByText(/WIB/)).toBeNull();
        unmountHome();

        // 2. Verify /m/anc
        const { unmount: unmountAnc } = renderAppAt("/m/anc");
        await waitFor(() => {
          expect(screen.getAllByText(/15 Oktober 2026 · 08\.00 WIT/).length).toBeGreaterThanOrEqual(1);
        });
        expect(screen.queryByText(/WIB/)).toBeNull();
        unmountAnc();
      });

      it("90. /m/anc evaluates appointment-day eligibility using canonical WIT calendar date regardless of client/browser timezone", async () => {
        // Current WIT date calculation
        const now = new Date();
        const witDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jayapura", year: "numeric", month: "2-digit", day: "2-digit" });
        const todayWitStr = witDateFormatter.format(now);
        const todayScheduledAt = `${todayWitStr}T08:30:00+09:00`;
        const futureScheduledAt = "2029-12-31T08:30:00+09:00";

        // 1. Future appointment in WIT: button not shown, availability notice shown
        mockRequest.mockImplementation((url: string) => {
          if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
            return Promise.resolve({
              publicId: "anc-wit-future",
              motherPublicId: "USR-MOTHER-01",
              pregnancyPublicId: "preg-01",
              contactNumber: 1,
              scheduledAt: futureScheduledAt,
              visitType: "DOCTOR_ANC",
              doctorRequired: true,
              status: "SCHEDULED",
              facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
              notes: "Pemeriksaan mendatang",
              completedAt: null,
            });
          }
          if (typeof url === "string" && (url.includes("/mother/anc-schedules") || url.startsWith("/mother/anc-schedules?"))) {
            return Promise.resolve({
              items: [
                {
                  publicId: "anc-wit-future",
                  contactNumber: 1,
                  scheduledAt: futureScheduledAt,
                  visitType: "DOCTOR_ANC",
                  doctorRequired: true,
                  status: "SCHEDULED",
                  facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
                },
              ],
              total: 1,
              page: 1,
              limit: 20,
            });
          }
          return Promise.resolve({});
        });

        const { unmount: u1 } = renderAppAt("/m/anc");
        await waitFor(() => {
          expect(screen.getByText(/Konfirmasi kehadiran mandiri akan tersedia pada hari pemeriksaan/)).toBeInTheDocument();
        });
        expect(screen.queryByRole("button", { name: "Konfirmasi Saya Sudah Datang" })).toBeNull();
        u1();

        // 2. Same-day appointment in WIT: button IS available
        mockRequest.mockImplementation((url: string) => {
          if (typeof url === "string" && url.includes("/mother/anc-schedules/upcoming")) {
            return Promise.resolve({
              publicId: "anc-wit-today",
              motherPublicId: "USR-MOTHER-01",
              pregnancyPublicId: "preg-01",
              contactNumber: 1,
              scheduledAt: todayScheduledAt,
              visitType: "DOCTOR_ANC",
              doctorRequired: true,
              status: "SCHEDULED",
              facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
              notes: "Pemeriksaan hari ini",
              completedAt: null,
            });
          }
          if (typeof url === "string" && (url.includes("/mother/anc-schedules") || url.startsWith("/mother/anc-schedules?"))) {
            return Promise.resolve({
              items: [
                {
                  publicId: "anc-wit-today",
                  contactNumber: 1,
                  scheduledAt: todayScheduledAt,
                  visitType: "DOCTOR_ANC",
                  doctorRequired: true,
                  status: "SCHEDULED",
                  facility: { publicId: "fac-01", name: "Puskesmas Kalumata" },
                },
              ],
              total: 1,
              page: 1,
              limit: 20,
            });
          }
          return Promise.resolve({});
        });

        const { unmount: u2 } = renderAppAt("/m/anc");
        await waitFor(() => {
          expect(screen.getAllByRole("button", { name: "Konfirmasi Saya Sudah Datang" }).length).toBeGreaterThanOrEqual(1);
        });
        u2();
      });
    });

    describe("PWA-6 Mother Consultation & Login Install App CTA", () => {
      const defaultMotherUser: AuthenticatedUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      const mockThreadData = {
        publicId: "th-01",
        motherPublicId: "USR-MOTHER-01",
        midwifePublicId: "USR-MIDWIFE-01",
        status: "ACTIVE",
        lastMessageAt: "2026-10-04T08:00:00.000Z",
        unreadCount: 0,
        midwife: {
          publicId: "USR-MIDWIFE-01",
          fullName: "Bidan Siti Rahayu, S.Tr.Keb",
          registrationNumber: "STR-BDN-12345",
          whatsappNumber: "6281234567890",
          phoneNumber: "081234567890",
          facilityName: "Puskesmas Kalumata",
        },
      };

      const mockMessagesData = {
        items: [
          {
            publicId: "msg-01",
            threadPublicId: "th-01",
            senderPublicId: "USR-MIDWIFE-01",
            senderRole: "MIDWIFE",
            senderName: "Bidan Siti Rahayu",
            messageType: "TEXT",
            body: "Halo Ibu Rahma, bagaimana kondisi janin hari ini?",
            createdAt: "2026-10-04T08:00:00.000Z",
            sentAt: "2026-10-04T08:00:00.000Z",
            attachments: [],
          },
          {
            publicId: "msg-02",
            threadPublicId: "th-01",
            senderPublicId: "USR-MOTHER-01",
            senderRole: "MOTHER",
            senderName: "Ibu Rahmawati",
            messageType: "TEXT",
            body: "Alhamdulillah gerakan janin aktif dan sehat bidan.",
            createdAt: "2026-10-04T08:05:00.000Z",
            sentAt: "2026-10-04T08:05:00.000Z",
            attachments: [],
          },
        ],
        total: 2,
      };

      beforeEach(() => {
        _resetPwaInstallStateForTesting();
        mockUser = defaultMotherUser;
        mockRequest.mockImplementation((url: string, init?: RequestInit) => {
          if (typeof url === "string" && url.includes("/mother/consultation/thread")) {
            return Promise.resolve(mockThreadData);
          }
          if (typeof url === "string" && url.includes("/mother/consultation/messages")) {
            if (init?.method === "POST") {
              const parsed = JSON.parse((init.body as string) || "{}");
              return Promise.resolve({
                publicId: "msg-new-01",
                threadPublicId: "th-01",
                senderPublicId: "USR-MOTHER-01",
                senderRole: "MOTHER",
                messageType: parsed.messageType || "TEXT",
                body: parsed.body || "",
                sentAt: new Date().toISOString(),
                attachments: parsed.attachments || [],
              });
            }
            return Promise.resolve(mockMessagesData);
          }
          if (typeof url === "string" && url.includes("/mother/video-consultations/upcoming")) {
            return Promise.resolve({
              publicId: "vc-01",
              scheduledAt: "2026-10-15T01:00:00.000Z", // 10.00 WIT
              meetingUrl: "https://meet.jit.si/pfram-consult-123",
              status: "SCHEDULED",
              notes: "Konsultasi USG dan nutrisi Trimester 2",
              midwife: {
                publicId: "USR-MIDWIFE-01",
                fullName: "Bidan Siti Rahayu, S.Tr.Keb",
              },
            });
          }
          if (typeof url === "string" && url.includes("/mother/video-consultations")) {
            return Promise.resolve({ items: [], total: 0 });
          }
          return Promise.resolve({});
        });
      });

      it("91. /m/consultation displays prominent maternal safety alert with locked emergency guidance", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Telekonsultasi Bidan" })).toBeInTheDocument();
        });

        const alertNote = screen.getByRole("note", { name: "Perhatian Keselamatan Maternal" });
        expect(alertNote).toBeInTheDocument();
        expect(alertNote.textContent).toContain("Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.");
        expect(alertNote.textContent).toContain("Konsultasi ini bukan saluran darurat medis");
      });

      it("92. /m/consultation renders assigned Midwife profile card with WIT working hours and SLA estimate", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByText("Bidan Siti Rahayu, S.Tr.Keb")).toBeInTheDocument();
        });

        expect(screen.getByText(/Puskesmas Kalumata/)).toBeInTheDocument();
        expect(screen.getByText(/08\.00–16\.00 WIT/)).toBeInTheDocument();
        expect(screen.getByText(/Estimasi balasan: 1-2 jam kerja/)).toBeInTheDocument();
      });

      it("93. assigned Midwife card provides verified WhatsApp fallback and phone call links", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByText("Bidan Siti Rahayu, S.Tr.Keb")).toBeInTheDocument();
        });

        const waLink = screen.getByRole("link", { name: /WhatsApp Bidan/i });
        expect(waLink).toHaveAttribute("href", "https://wa.me/6281234567890");
        expect(waLink).toHaveAttribute("target", "_blank");

        const telLink = screen.getByRole("link", { name: /Telepon Bidan/i });
        expect(telLink).toHaveAttribute("href", "tel:081234567890");
      });

      it("94. /m/consultation handles MIDWIFE_NOT_ASSIGNED with neutral non-alarmist message and retry", async () => {
        mockRequest.mockImplementation((url: string) => {
          if (typeof url === "string" && url.includes("/mother/consultation/thread")) {
            return Promise.reject({
              code: "MIDWIFE_NOT_ASSIGNED",
              message: "Bidan pendamping belum ditetapkan",
              status: 404,
            });
          }
          return Promise.resolve({});
        });

        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByText("Bidan pendamping sedang diproses oleh puskesmas.")).toBeInTheDocument();
        });

        expect(screen.getByText("Bidan Pendamping Belum Ditugaskan")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Coba Lagi/i })).toBeInTheDocument();
      });

      it("95. message thread renders role-differentiated chat messages and timestamps", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByText("Halo Ibu Rahma, bagaimana kondisi janin hari ini?")).toBeInTheDocument();
        });

        expect(screen.getByText("Alhamdulillah gerakan janin aktif dan sehat bidan.")).toBeInTheDocument();
        expect(screen.getAllByText(/WIT/).length).toBeGreaterThanOrEqual(2);
      });

      it("96. composer sends text message and prevents empty submission", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByPlaceholderText("Tulis pesan untuk bidan…")).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText("Tulis pesan untuk bidan…");
        const sendBtn = screen.getByRole("button", { name: "Kirim pesan" });

        // Empty message cannot be sent (send button disabled when empty and no attachment)
        expect(sendBtn).toBeDisabled();

        // Type valid message
        await userEvent.type(textarea, "Selamat pagi bidan, mau tanya jadwal vitamin");
        expect(sendBtn).not.toBeDisabled();

        await userEvent.click(sendBtn);

        await waitFor(() => {
          expect(mockRequest).toHaveBeenCalledWith(
            expect.stringContaining("/mother/consultation/messages"),
            expect.objectContaining({
              method: "POST",
              body: expect.stringContaining("Selamat pagi bidan, mau tanya jadwal vitamin"),
            }),
          );
        });
      });

      it("97. composer retains entered message text upon failure allowing mother to retry", async () => {
        mockRequest.mockImplementation((url: string, init?: RequestInit) => {
          if (typeof url === "string" && url.includes("/mother/consultation/messages") && init?.method === "POST") {
            return Promise.reject(new Error("Jaringan terputus saat mengirim pesan"));
          }
          if (typeof url === "string" && url.includes("/mother/consultation/thread")) {
            return Promise.resolve(mockThreadData);
          }
          if (typeof url === "string" && url.includes("/mother/consultation/messages")) {
            return Promise.resolve(mockMessagesData);
          }
          return Promise.resolve({});
        });

        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByPlaceholderText("Tulis pesan untuk bidan…")).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText("Tulis pesan untuk bidan…");
        await userEvent.type(textarea, "Pesan darurat tidak boleh hilang");

        const sendBtn = screen.getByRole("button", { name: "Kirim pesan" });
        await userEvent.click(sendBtn);

        await waitFor(() => {
          expect(screen.getByText(/Jaringan terputus saat mengirim pesan/i)).toBeInTheDocument();
        });

        // The text MUST remain in the composer
        expect(textarea).toHaveValue("Pesan darurat tidak boleh hilang");
      });

      it("98. photo attachment enforces 5 MB limit and allowed image MIME types", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByLabelText("Lampirkan Foto")).toBeInTheDocument();
        });

        const fileInput = screen.getByLabelText("Lampirkan Foto");

        // 1. Oversized file (> 5 MB)
        const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "foto_besar.jpg", {
          type: "image/jpeg",
        });
        await userEvent.upload(fileInput, bigFile);

        await waitFor(() => {
          expect(screen.getByText(/Ukuran foto melebihi batas maksimal 5 MB/i)).toBeInTheDocument();
        });

        // 2. Disallowed MIME type
        const pdfFile = new File(["test pdf"], "dokumen.pdf", {
          type: "application/pdf",
        });
        Object.defineProperty(fileInput, "files", {
          value: [pdfFile],
          configurable: true,
        });
        fireEvent.change(fileInput);

        await waitFor(() => {
          expect(screen.getByText(/Format foto tidak didukung/i)).toBeInTheDocument();
        });
      });

      it("99. voice recording handles microphone denial gracefully", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByRole("button", { name: "Rekam Pesan Suara" })).toBeInTheDocument();
        });

        const micBtn = screen.getByRole("button", { name: "Rekam Pesan Suara" });
        await userEvent.click(micBtn);

        await waitFor(() => {
          expect(screen.getByText(/Izin mikrofon ditolak atau perangkat mikrofon tidak tersedia/i)).toBeInTheDocument();
        });
      });

      it("100. video consultation tab displays scheduled session in WIT and validates HTTPS link", async () => {
        renderAppAt("/m/consultation");

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Video Konsultasi/i })).toBeInTheDocument();
        });

        const videoTab = screen.getByRole("button", { name: /Video Konsultasi/i });
        await userEvent.click(videoTab);

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Konsultasi Video Mendatang" })).toBeInTheDocument();
        });

        expect(screen.getByText(/10\.00 WIT/)).toBeInTheDocument();
        const joinLink = screen.getByRole("link", { name: /Gabung Video Sekarang/i });
        expect(joinLink).toHaveAttribute("href", "https://meet.jit.si/pfram-consult-123");
        expect(joinLink).toHaveAttribute("target", "_blank");
      });

      it("101. login screen displays prominent 'Pasang Aplikasi PFRAM' CTA when canInstall is true", async () => {
        mockUser = null;
        renderAppAt("/login");

        act(() => {
          const installEvent = new Event("beforeinstallprompt") as unknown as {
            prompt: () => Promise<void>;
            userChoice: Promise<{ outcome: string; platform: string }>;
            platforms: string[];
          };
          installEvent.prompt = vi.fn().mockResolvedValue(undefined);
          installEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
          window.dispatchEvent(installEvent as unknown as Event);
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeInTheDocument();
        });
      });

      it("102. login screen hides install CTA completely when app is running in standalone mode", async () => {
        mockUser = null;
        const originalMatchMedia = window.matchMedia;
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
          matches: query.includes("display-mode: standalone"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));

        renderAppAt("/login");

        expect(screen.queryByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeNull();
        expect(screen.queryByText(/Cara memasang aplikasi/i)).toBeNull();

        window.matchMedia = originalMatchMedia;
      });

      it("103. login screen provides expandable 'Cara memasang aplikasi' guidance for iOS and unsupported browsers", async () => {
        mockUser = null;
        renderAppAt("/login");

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Cara memasang aplikasi/i })).toBeInTheDocument();
        });

        const guideBtn = screen.getByRole("button", { name: /Cara memasang aplikasi/i });
        await userEvent.click(guideBtn);

        await waitFor(() => {
          expect(screen.getByText(/Pasang PFRAM di Perangkat Anda:/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/Buka menu opsi peramban/i)).toBeInTheDocument();
      });

      it("104. consultation module strictly maintains browser storage isolation (no chat messages or credentials persisted)", () => {
        const localKeys = Object.keys(window.localStorage);
        const sessionKeys = Object.keys(window.sessionStorage);

        expect(localKeys).not.toContain("consultation_messages");
        expect(localKeys).not.toContain("consultation_thread");
        expect(localKeys).not.toContain("pfram_token");
        expect(sessionKeys).not.toContain("consultation_messages");
        expect(sessionKeys).not.toContain("pfram_token");
      });

      it("105. beforeinstallprompt captured before Login component mounts renders 'Pasang Aplikasi PFRAM' immediately", async () => {
        mockUser = null;
        _resetPwaInstallStateForTesting();

        const earlyPromptSpy = vi.fn().mockResolvedValue(undefined);
        const earlyEvent = new Event("beforeinstallprompt") as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string; platform: string }>;
          platforms: string[];
        };
        earlyEvent.prompt = earlyPromptSpy;
        earlyEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

        act(() => {
          window.dispatchEvent(earlyEvent as unknown as Event);
        });

        renderAppAt("/login");

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeInTheDocument();
        });
      });

      it("106. clicking direct install CTA calls prompt() exactly once and accepted outcome marks app as installed and clears CTA", async () => {
        mockUser = null;
        _resetPwaInstallStateForTesting();

        const promptSpy = vi.fn().mockResolvedValue(undefined);
        const installEvent = new Event("beforeinstallprompt") as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string; platform: string }>;
          platforms: string[];
        };
        installEvent.prompt = promptSpy;
        installEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

        act(() => {
          window.dispatchEvent(installEvent as unknown as Event);
        });

        renderAppAt("/login");

        const installBtn = await screen.findByRole("button", { name: /Pasang Aplikasi PFRAM/i });
        await userEvent.click(installBtn);

        expect(promptSpy).toHaveBeenCalledTimes(1);

        await waitFor(() => {
          expect(screen.queryByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeNull();
          expect(screen.queryByText(/Cara memasang aplikasi/i)).toBeNull();
        });
      });

      it("107. dismissed install flow does not throw error, clears prompt, and displays 'Cara memasang aplikasi' fallback", async () => {
        mockUser = null;
        _resetPwaInstallStateForTesting();

        const promptSpy = vi.fn().mockResolvedValue(undefined);
        const installEvent = new Event("beforeinstallprompt") as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string; platform: string }>;
          platforms: string[];
        };
        installEvent.prompt = promptSpy;
        installEvent.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });

        act(() => {
          window.dispatchEvent(installEvent as unknown as Event);
        });

        renderAppAt("/login");

        const installBtn = await screen.findByRole("button", { name: /Pasang Aplikasi PFRAM/i });
        await userEvent.click(installBtn);

        expect(promptSpy).toHaveBeenCalledTimes(1);

        await waitFor(() => {
          expect(screen.queryByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeNull();
          expect(screen.getByRole("button", { name: /Cara memasang aplikasi/i })).toBeInTheDocument();
        });
      });

      it("108. appinstalled event on window immediately hides install CTA and marks installed", async () => {
        mockUser = null;
        _resetPwaInstallStateForTesting();

        const installEvent = new Event("beforeinstallprompt") as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string; platform: string }>;
          platforms: string[];
        };
        installEvent.prompt = vi.fn().mockResolvedValue(undefined);
        installEvent.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });

        act(() => {
          window.dispatchEvent(installEvent as unknown as Event);
        });

        renderAppAt("/login");

        await screen.findByRole("button", { name: /Pasang Aplikasi PFRAM/i });

        act(() => {
          window.dispatchEvent(new Event("appinstalled"));
        });

        await waitFor(() => {
          expect(screen.queryByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeNull();
          expect(screen.queryByText(/Cara memasang aplikasi/i)).toBeNull();
        });
      });

      it("109. new subsequent beforeinstallprompt event re-enables 'Pasang Aplikasi PFRAM' after a previous dismissal", async () => {
        mockUser = null;
        _resetPwaInstallStateForTesting();

        const promptSpy1 = vi.fn().mockResolvedValue(undefined);
        const installEvent1 = new Event("beforeinstallprompt") as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string; platform: string }>;
          platforms: string[];
        };
        installEvent1.prompt = promptSpy1;
        installEvent1.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });

        act(() => {
          window.dispatchEvent(installEvent1 as unknown as Event);
        });

        renderAppAt("/login");

        const installBtn1 = await screen.findByRole("button", { name: /Pasang Aplikasi PFRAM/i });
        await userEvent.click(installBtn1);

        await waitFor(() => {
          expect(screen.queryByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeNull();
        });

        const promptSpy2 = vi.fn().mockResolvedValue(undefined);
        const installEvent2 = new Event("beforeinstallprompt") as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string; platform: string }>;
          platforms: string[];
        };
        installEvent2.prompt = promptSpy2;
        installEvent2.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

        act(() => {
          window.dispatchEvent(installEvent2 as unknown as Event);
        });

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeInTheDocument();
        });
      });

      it("110. unmounting and remounting Login retains unused globally captured prompt without losing CTA", async () => {
        mockUser = null;
        _resetPwaInstallStateForTesting();

        const promptSpy = vi.fn().mockResolvedValue(undefined);
        const installEvent = new Event("beforeinstallprompt") as unknown as {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string; platform: string }>;
          platforms: string[];
        };
        installEvent.prompt = promptSpy;
        installEvent.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

        act(() => {
          window.dispatchEvent(installEvent as unknown as Event);
        });

        const { unmount } = renderAppAt("/login");
        expect(await screen.findByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeInTheDocument();

        unmount();

        renderAppAt("/login");

        await waitFor(() => {
          expect(screen.getByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeInTheDocument();
        });
      });

      it("111. verify install event and deferred prompt are NEVER persisted to localStorage or sessionStorage", () => {
        const localKeys = Object.keys(window.localStorage);
        const sessionKeys = Object.keys(window.sessionStorage);

        expect(localKeys).not.toContain("beforeinstallprompt");
        expect(localKeys).not.toContain("deferredPrompt");
        expect(localKeys).not.toContain("pwa_install_event");
        expect(sessionKeys).not.toContain("beforeinstallprompt");
        expect(sessionKeys).not.toContain("deferredPrompt");
      });

      it("112. verify standalone display-mode hides both direct CTA and manual fallback guidance", () => {
        mockUser = null;
        const originalMatchMedia = window.matchMedia;
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
          matches: query.includes("display-mode: standalone"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));

        _resetPwaInstallStateForTesting();

        renderAppAt("/login");

        expect(screen.queryByRole("button", { name: /Pasang Aplikasi PFRAM/i })).toBeNull();
        expect(screen.queryByText(/Cara memasang aplikasi/i)).toBeNull();

        window.matchMedia = originalMatchMedia;
      });

      it("113. Web API baseUrl defaults safely to same-origin /api without leaking localhost:3200", () => {
        expect(import.meta.env.VITE_API_URL || "/api").toMatch(/^\/api/);
        expect(import.meta.env.VITE_API_URL || "/api").not.toContain("localhost:3200");
      });
    });

    describe("PWA-7 Mother Education, Safe Offline, Update UX & Web Notifications", () => {
      const mockEducationArticlesList = {
        items: [
          {
            publicId: "ART-01",
            slug: "nutrisi-kehamilan",
            title: "Gizi Seimbang Ibu Hamil & Konsumsi Daun Kelor",
            summary: "Panduan asupan makronutrien dan mikronutrien berbasis pangan lokal.",
            content: "## Pentingnya Gizi Seimbang\n\nIbu hamil membutuhkan gizi yang cukup untuk tumbuh kembang janin.\n\n### Manfaat Pangan Lokal\n\n- Daun kelor kaya zat besi\n- Ikan cakalang kaya omega 3\n\n> Konsultasikan bila memiliki riwayat alergi tertentu.",
            category: "NUTRITION",
            trimester: "ALL",
            featured: true,
            sourceName: "Buku KIA Kemenkes RI 2024",
            sourceReference: "Halaman 18-22",
            published: true,
            sortOrder: 1,
            createdAt: "2026-09-01T00:00:00.000Z",
            updatedAt: "2026-09-01T00:00:00.000Z",
          },
          {
            publicId: "ART-02",
            slug: "tablet-tambah-darah",
            title: "Pentingnya Minum Tablet Tambah Darah (TTD)",
            summary: "Cegah anemia dan KEK dengan konsumsi rutin minimal 90 tablet selama kehamilan.",
            content: "## Aturan Minum TTD\n\nMinum 1 tablet setiap hari.\n\n- Jangan minum dengan teh atau kopi\n- Minum dengan air putih atau jus jeruk",
            category: "IRON_TABLET",
            trimester: "TRIMESTER_1",
            featured: false,
            sourceName: "Kemenkes RI",
            sourceReference: "Pedoman Anemia 2023",
            published: true,
            sortOrder: 2,
            createdAt: "2026-09-02T00:00:00.000Z",
            updatedAt: "2026-09-02T00:00:00.000Z",
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        trimesterRecommendation: "TRIMESTER_1",
      };

      beforeEach(() => {
        mockUser = {
          publicId: "USR-MOTHER-01",
          phoneNumber: "081333333333",
          role: "MOTHER",
          displayName: "Ibu Rahmawati",
          status: "ACTIVE",
          phoneVerifiedAt: null,
          profileCompletionStatus: "COMPLETE",
          selectedFacility: {
            publicId: "FAC-01",
            name: "Puskesmas Gamalama",
            phoneNumber: "0921-123456",
          },
          activeMidwifeAssignment: {
            publicId: "ASG-01",
            startedAt: "2026-09-01T00:00:00.000Z",
            midwife: {
              publicId: "MID-01",
              fullName: "Bidan Nur",
              whatsappNumber: "081234567890",
            },
          },
        };

        mockRequest.mockImplementation((url: string) => {
          if (typeof url === "string" && url.includes("/mother/education/featured")) {
            return Promise.resolve([mockEducationArticlesList.items[0]]);
          }
          if (typeof url === "string" && url.includes("/mother/education/nutrisi-kehamilan")) {
            return Promise.resolve(mockEducationArticlesList.items[0]);
          }
          if (typeof url === "string" && url.includes("/mother/education/tablet-tambah-darah")) {
            return Promise.resolve(mockEducationArticlesList.items[1]);
          }
          if (typeof url === "string" && url.includes("/mother/education/not-found")) {
            return Promise.reject(new Error("Artikel tidak ditemukan"));
          }
          if (typeof url === "string" && url.includes("/mother/education")) {
            return Promise.resolve(mockEducationArticlesList);
          }
          return Promise.resolve({});
        });
      });

      it("114. /m/education renders real education experience with header, search bar, and category chips", async () => {
        renderAppAt("/m/education");

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Edukasi Kehamilan" })).toBeInTheDocument();
        });

        expect(screen.getByText("Panduan Resmi Buku KIA Kemenkes RI")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Cari artikel/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Semua Kategori" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Gizi & Nutrisi" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Tablet Tambah Darah" })).toBeInTheDocument();
      });

      it("115. displays personalized trimester recommendation banner when recommendation is available", async () => {
        renderAppAt("/m/education");

        await waitFor(() => {
          expect(screen.getByText("Rekomendasi Minggu Ini")).toBeInTheDocument();
        });

        expect(screen.getAllByText("Trimester 1").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/disesuaikan dengan perkiraan usia kehamilan/i)).toBeInTheDocument();
      });

      it("116. renders featured articles section and allows navigation to article detail", async () => {
        renderAppAt("/m/education");

        await waitFor(() => {
          expect(screen.getByText("Topik Pilihan Utama")).toBeInTheDocument();
        });

        expect(screen.getAllByText("Gizi Seimbang Ibu Hamil & Konsumsi Daun Kelor").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Buku KIA Kemenkes RI 2024").length).toBeGreaterThanOrEqual(1);
      });

      it("117. filters article list by category and trimester options", async () => {
        renderAppAt("/m/education");

        await waitFor(() => {
          expect(screen.getByRole("button", { name: "Tablet Tambah Darah" })).toBeInTheDocument();
        });

        await userEvent.click(screen.getByRole("button", { name: "Tablet Tambah Darah" }));

        await waitFor(() => {
          expect(screen.getByText(/Materi: Tablet Tambah Darah/i)).toBeInTheDocument();
        });

        expect(screen.getByRole("button", { name: "Trimester 1" })).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Trimester 1" }));
      });

      it("118. search bar updates and allows clearing search query", async () => {
        renderAppAt("/m/education");

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/Cari artikel/i)).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Cari artikel/i);
        await userEvent.type(searchInput, "Kelor");
        expect(searchInput).toHaveValue("Kelor");

        const clearBtn = screen.getByRole("button", { name: "Hapus pencarian" });
        await userEvent.click(clearBtn);
        expect(searchInput).toHaveValue("");
      });

      it("119. article reader view /m/education/:slug renders formatted markdown, source info, and reading time", async () => {
        renderAppAt("/m/education/nutrisi-kehamilan");

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Gizi Seimbang Ibu Hamil & Konsumsi Daun Kelor" })).toBeInTheDocument();
        });

        expect(screen.getByText(/Sumber Resmi: Buku KIA Kemenkes RI 2024/i)).toBeInTheDocument();
        expect(screen.getByText("Halaman 18-22")).toBeInTheDocument();
        expect(screen.getByText("Pentingnya Gizi Seimbang")).toBeInTheDocument();
        expect(screen.getByText("Manfaat Pangan Lokal")).toBeInTheDocument();
        expect(screen.getByText(/Daun kelor kaya zat besi/i)).toBeInTheDocument();
        expect(screen.getByText(/Konsultasikan bila memiliki riwayat alergi tertentu/i)).toBeInTheDocument();
        expect(screen.getByText(/menit baca/i)).toBeInTheDocument();
      });

      it("120. article reader view strictly displays locked non-diagnostic disclaimer and emergency action", async () => {
        renderAppAt("/m/education/nutrisi-kehamilan");

        await waitFor(() => {
          expect(screen.getByText("Informasi Kesehatan Edukatif")).toBeInTheDocument();
        });

        expect(screen.getByText(/tidak menggantikan diagnosis medis langsung/i)).toBeInTheDocument();
        expect(screen.getByText(/Bila ibu merasakan keluhan tidak wajar atau tanda bahaya/i)).toBeInTheDocument();

        const dangerBtn = screen.getByRole("button", { name: /Skrining Tanda Bahaya →/i });
        expect(dangerBtn).toBeInTheDocument();
        await userEvent.click(dangerBtn);

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Skrining Tanda Bahaya" })).toBeInTheDocument();
        });
      });

      it("121. article reader view handles not-found state gracefully with retry and back button", async () => {
        renderAppAt("/m/education/not-found");

        await waitFor(() => {
          expect(screen.getByText("Artikel Tidak Ditemukan")).toBeInTheDocument();
        });

        expect(screen.getByRole("button", { name: "Coba Muat Ulang" })).toBeInTheDocument();
        const backBtn = screen.getByRole("button", { name: /Kembali ke Daftar Artikel/i });
        await userEvent.click(backBtn);

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Edukasi Kehamilan" })).toBeInTheDocument();
        });
      });

      it("122. calm offline banner renders in MotherAppShell when offline event fires and hides when online", async () => {
        renderAppAt("/m/home");

        await waitFor(() => {
          expect(screen.getByText(/Halo, Ibu Rahmawati!/i)).toBeInTheDocument();
        });

        act(() => {
          _setOnlineForTesting(false);
        });

        await waitFor(() => {
          expect(screen.getByRole("status")).toBeInTheDocument();
          expect(screen.getByText(/Anda sedang offline\./i)).toBeInTheDocument();
          expect(screen.getByText(/Beberapa fitur membutuhkan koneksi internet\./i)).toBeInTheDocument();
        });

        act(() => {
          _setOnlineForTesting(true);
        });

        await waitFor(() => {
          expect(screen.queryByText(/Anda sedang offline\./i)).toBeNull();
        });
      });

      it("123. Workbox configuration verifies app shell static assets are cached while strictly zero runtime caching exists for /api/", () => {
        const viteConfigContent = fs.readFileSync(
          path.resolve(__dirname, "../../vite.config.ts"),
          "utf-8",
        );

        expect(viteConfigContent).toContain('globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"]');
        expect(viteConfigContent).toContain('navigateFallbackDenylist: [/^\\/api\\//]');
        expect(viteConfigContent).not.toContain('runtimeCaching');
      });

      it("124. PwaUpdateNotification prompt displays 'Versi baru PFRAM tersedia' with 'Perbarui' and 'Nanti', and safe update guards against interrupting active forms", async () => {
        render(<PwaUpdateNotification />);

        // Initially no prompt
        expect(screen.queryByText("Versi baru PFRAM tersedia")).toBeNull();

        // Trigger update notification
        act(() => {
          _triggerNeedRefreshForTesting?.();
        });

        expect(screen.getByText("Versi baru PFRAM tersedia")).toBeInTheDocument();
        expect(screen.getByText(/Pembaruan sistem siap diterapkan/i)).toBeInTheDocument();

        const perbaruiBtn = screen.getByRole("button", { name: "Perbarui" });
        const nantiBtn = screen.getByRole("button", { name: "Nanti" });
        expect(perbaruiBtn).toBeInTheDocument();
        expect(nantiBtn).toBeInTheDocument();

        // Verify safe check when active recording is on
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
        (window as unknown as { __pfram_active_recording: boolean }).__pfram_active_recording = true;

        await userEvent.click(perbaruiBtn);
        expect(confirmSpy).toHaveBeenCalledWith(
          expect.stringContaining("Ada input atau formulir yang sedang aktif"),
        );

        (window as unknown as { __pfram_active_recording: boolean }).__pfram_active_recording = false;
        confirmSpy.mockRestore();

        // Dismiss with "Nanti"
        await userEvent.click(nantiBtn);
        expect(screen.queryByText("Versi baru PFRAM tersedia")).toBeNull();
      });

      it("125. /m/account renders Web Notifications section with explicit action 'Aktifkan Pengingat', neutral privacy copy, and WIT timezone", async () => {
        const originalNotification = window.Notification;
        const mockRequestPermission = vi.fn().mockResolvedValue("granted");
        // @ts-expect-error mock Notification for jsdom
        window.Notification = vi.fn();
        Object.defineProperty(window.Notification, "permission", {
          value: "default",
          writable: true,
          configurable: true,
        });
        window.Notification.requestPermission = mockRequestPermission;

        renderAppAt("/m/account");

        await waitFor(() => {
          expect(screen.getByRole("heading", { name: /Pengingat & Notifikasi Web/i })).toBeInTheDocument();
        });

        expect(screen.getByText(/zona waktu operasional Maluku Utara \(WIT\)/i)).toBeInTheDocument();
        const enableBtn = screen.getByRole("button", { name: /Aktifkan Pengingat/i });
        expect(enableBtn).toBeInTheDocument();

        await userEvent.click(enableBtn);
        expect(mockRequestPermission).toHaveBeenCalled();

        await waitFor(() => {
          expect(screen.getByText("Notifikasi Aktif")).toBeInTheDocument();
        });

        expect(screen.getByText(/Waktu Indonesia Timur · WIT/i)).toBeInTheDocument();
        expect(screen.getByText(/Isi pengingat bersifat netral dan dirancang menjaga kerahasiaan medis ibu/i)).toBeInTheDocument();
        expect(screen.getByText(/"Pengingat Jadwal PFRAM: Waktunya pemeriksaan kehamilan \/ minum TTD\."/i)).toBeInTheDocument();

        window.Notification = originalNotification;
      });
    });

    describe("PWA-8 Production Hardening, Security, Routing & Cache Hygiene Suite", () => {
      const distDir = path.resolve(__dirname, "../../dist");
      const pwa8MotherUser: AuthenticatedUser = {
        publicId: "USR-MOTHER-01",
        phoneNumber: "081333333333",
        role: "MOTHER",
        displayName: "Ibu Rahmawati",
        status: "ACTIVE",
        phoneVerifiedAt: null,
        profileCompletionStatus: "COMPLETE",
      };

      it("126. verifies service worker configuration and script strictly excludes /api/ from navigation fallback and runtime caching", () => {
        const swPath = path.join(distDir, "sw.js");
        if (fs.existsSync(swPath)) {
          const swContent = fs.readFileSync(swPath, "utf-8");
          expect(swContent).not.toContain('url.pathname.startsWith("/api")');
        }
        const viteConfigPath = path.resolve(__dirname, "../../vite.config.ts");
        const viteConfig = fs.readFileSync(viteConfigPath, "utf-8");
        expect(viteConfig).toContain("navigateFallbackDenylist: [/^\\/api\\//]");
      });

      it("127. verifies safe video meeting URL validation accepts valid HTTPS meetings and strictly rejects javascript:, data:, and file: schemes", () => {
        expect(isValidMeetingUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
        expect(isValidMeetingUrl("https://meet.jit.si/pfram-consultation-123")).toBe(true);
        expect(isValidMeetingUrl("javascript:alert(1)")).toBe(false);
        expect(isValidMeetingUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
        expect(isValidMeetingUrl("file:///etc/passwd")).toBe(false);
        expect(isValidMeetingUrl("http://insecure-meeting.example.com")).toBe(false);
        expect(isValidMeetingUrl("")).toBe(false);
      });

      it("128. verifies storage hygiene: no clinical data or auth tokens written to localStorage or sessionStorage during mother session", () => {
        mockUser = pwa8MotherUser;
        renderAppAt("/m/home");
        expect(localStorage.getItem("accessToken")).toBeNull();
        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("refreshToken")).toBeNull();
        expect(localStorage.getItem("clinical_data")).toBeNull();
        expect(sessionStorage.getItem("accessToken")).toBeNull();
        expect(sessionStorage.getItem("token")).toBeNull();
      });

      it("129. role guard strictly blocks MOTHER from accessing staff routes and redirects to /m", async () => {
        mockUser = pwa8MotherUser;
        const { unmount } = renderAppAt("/dashboard");
        await waitFor(() => {
          expect(screen.getByText(/Halo, Ibu Rahmawati!/)).toBeInTheDocument();
        });
        expect(screen.queryByRole("heading", { name: "Dashboard Administrator" })).toBeNull();
        expect(screen.queryByRole("heading", { name: /Dashboard Bidan/ })).toBeNull();
        unmount();
      });

      it("130. role guard strictly blocks MIDWIFE/ADMIN from accessing mother routes (/m/*) and redirects to /dashboard", async () => {
        mockUser = {
          publicId: "USR-ADMIN-01",
          phoneNumber: "081111111111",
          role: "ADMIN",
          displayName: "Administrator Dinkes",
          status: "ACTIVE",
          phoneVerifiedAt: null,
        };
        const { unmount } = renderAppAt("/m/home");
        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Dashboard Administrator" })).toBeInTheDocument();
        });
        expect(screen.queryByText("Pantau Kehamilan")).toBeNull();
        unmount();
      });

      it("131. verifies consultation attachment delivery requires authenticated session and rejects unauthorized access", async () => {
        mockUser = null;
        const { unmount } = renderAppAt("/m/consultation");
        await waitFor(() => {
          expect(screen.getByRole("heading", { name: "Masuk ke PFRAM" })).toBeInTheDocument();
        });
        unmount();
      });

      it("132. verifies error boundaries and fallbacks provide actionable calm Indonesian messages without technical stack traces", () => {
        const { unmount } = renderAppAt("/403");
        expect(screen.getByRole("heading", { name: "403 — Akses Ditolak" })).toBeInTheDocument();
        expect(screen.getByText("Peran akun Anda tidak memiliki izin untuk membuka halaman ini.")).toBeInTheDocument();
        expect(screen.queryByText(/Error: /)).toBeNull();
        expect(screen.queryByText(/Prisma/)).toBeNull();
        unmount();
      });

      it("133. verifies production build bundle hygiene: no hardcoded backend localhost, LAN IP, or tunnel URLs in client assets", () => {
        const assetsDir = path.join(distDir, "assets");
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
          for (const file of files) {
            const content = fs.readFileSync(path.join(assetsDir, file), "utf-8");
            expect(content).not.toContain("localhost:3200");
            expect(content).not.toContain("127.0.0.1:3200");
            expect(content).not.toContain("192.168.5.145:3200");
          }
        }
      });

      it("134. verifies install lifecycle state is kept in-memory singleton without polluting persistent web storage", () => {
        _resetPwaInstallStateForTesting();
        expect(localStorage.getItem("pwa_install_prompt")).toBeNull();
        expect(sessionStorage.getItem("pwa_install_prompt")).toBeNull();
      });

      it("135. verifies canonical timezone rendering consistency: WIT / Asia/Jayapura across mother surfaces", async () => {
        mockUser = pwa8MotherUser;
        const { unmount } = renderAppAt("/m/account");
        await waitFor(() => {
          expect(screen.getByRole("heading", { name: /Pengingat & Notifikasi Web/i })).toBeInTheDocument();
        });
        expect(screen.getByText(/zona waktu operasional Maluku Utara \(WIT\)/i)).toBeInTheDocument();
        unmount();
      });

      it("136. /login renders dynamic title and meta robots index, follow for public SEO", async () => {
        mockUser = null;
        const { unmount } = renderAppAt("/login");
        expect(document.title).toBe("Masuk ke PFRAM — Layanan Telemedicine Maternal");
        const metaRobots = document.querySelector('meta[name="robots"]');
        expect(metaRobots?.getAttribute("content")).toBe("index, follow");
        unmount();
      });

      it("137. /login brand logo renders with explicit width, height, and eager loading for LCP/CLS optimization", () => {
        mockUser = null;
        const { unmount } = renderAppAt("/login");
        const logo = screen.getByAltText("Logo PFRAM");
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute("width", "40");
        expect(logo).toHaveAttribute("height", "40");
        expect(logo).toHaveAttribute("loading", "eager");
        unmount();
      });

      it("138. /login interactive tap targets have compliant touch dimensions and legible font sizing", () => {
        mockUser = null;
        const { unmount } = renderAppAt("/login");
        const registerLink = screen.getByRole("link", { name: /Daftar Akun Ibu/i });
        expect(registerLink.className).toContain("min-h-[44px]");
        const installHelpBtn = screen.getByRole("button", { name: /Cara memasang aplikasi/i });
        expect(installHelpBtn.className).toContain("min-h-[44px]");
        unmount();
      });

      it("139. protected maternal routes strictly enforce noindex, nofollow meta tag for clinical privacy", async () => {
        mockUser = pwa8MotherUser;
        const { unmount } = renderAppAt("/m/home");
        await waitFor(() => {
          const metaRobots = document.querySelector('meta[name="robots"]');
          expect(metaRobots?.getAttribute("content")).toBe("noindex, nofollow");
        });
        unmount();
      });

      it("140. robots.txt exists and explicitly permits login/register while disallowing private maternal /m/ routes", () => {
        const publicRobots = path.resolve(__dirname, "../../public/robots.txt");
        expect(fs.existsSync(publicRobots)).toBe(true);
        const content = fs.readFileSync(publicRobots, "utf-8");
        expect(content).toContain("Allow: /login");
        expect(content).toContain("Allow: /register");
        expect(content).toContain("Disallow: /m/");
        expect(content).toContain("Disallow: /m/*");
        expect(content).toContain("Disallow: /api/");
      });

      it("141. index.html contains descriptive meta description, OpenGraph, JSON-LD, and logo preload", () => {
        const indexPath = path.resolve(__dirname, "../../index.html");
        expect(fs.existsSync(indexPath)).toBe(true);
        const html = fs.readFileSync(indexPath, "utf-8");
        expect(html).toContain('name="description"');
        expect(html).toContain('property="og:title"');
        expect(html).toContain('type="application/ld+json"');
        expect(html).toContain('rel="preload" as="image" href="/brand/logo-symbol.png"');
      });
    });
  });
});
