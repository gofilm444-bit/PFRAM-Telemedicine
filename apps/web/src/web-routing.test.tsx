import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthenticatedUser } from "@pfram/shared-types";

let mockCurrentUser: AuthenticatedUser | null = null;
export const mockRequest = vi.fn();

vi.mock("./auth", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    request: mockRequest,
  }),
  api: {
    request: (...args: unknown[]) => mockRequest(...args),
    setAccessToken: vi.fn(),
    refresh: vi.fn().mockResolvedValue(true),
  },
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import App from "./App";
import { AdminUsersPage } from "./AdminUsersPage";
import { navigationForRole } from "./components";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderAppAt(path: string) {
  window.history.pushState({}, "Test page", path);
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

const mockUsers = [
  {
    publicId: "USR-ADMIN-01",
    phoneNumber: "081111111111",
    role: "ADMIN",
    status: "ACTIVE",
    displayName: "Administrator Dinkes",
    fullName: "Administrator Dinkes",
    lastLoginAt: "2026-10-02T08:00:00.000Z",
    failedLoginCount: 0,
    lockedUntil: null,
    isLocked: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    deactivatedAt: null,
  },
  {
    publicId: "USR-MIDWIFE-01",
    phoneNumber: "081222222222",
    role: "MIDWIFE",
    status: "ACTIVE",
    displayName: "Bdn. Siti Nurhaliza",
    fullName: "Bdn. Siti Nurhaliza",
    lastLoginAt: "2026-10-01T10:00:00.000Z",
    failedLoginCount: 0,
    lockedUntil: null,
    isLocked: false,
    createdAt: "2026-02-01T00:00:00.000Z",
    deactivatedAt: null,
  },
  {
    publicId: "USR-MOTHER-01",
    phoneNumber: "081333333333",
    role: "MOTHER",
    status: "ACTIVE",
    displayName: "Ibu Rahmawati",
    fullName: "Ibu Rahmawati",
    lastLoginAt: null,
    failedLoginCount: 5,
    lockedUntil: "2026-10-02T12:00:00.000Z",
    isLocked: true,
    createdAt: "2026-03-01T00:00:00.000Z",
    deactivatedAt: null,
  },
];

const mockFacilities = [
  {
    publicId: "FAC-001",
    name: "Puskesmas Banda",
    type: "PUSKESMAS",
  },
];

describe("Web Routing & Authorization Coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockImplementation((url: string) => {
      if (url.includes("/users/summary")) {
        return Promise.resolve({
          counts: { ADMIN: 1, MIDWIFE: 1, MOTHER: 1 },
        });
      }
      if (url.includes("/reference/facilities")) {
        return Promise.resolve({ items: mockFacilities });
      }
      if (url.includes("/admin/users") || url.includes("/users")) {
        return Promise.resolve({
          items: mockUsers,
          total: mockUsers.length,
          page: 1,
          pageSize: 15,
        });
      }
      return Promise.resolve({ items: [], total: 0, counts: {}, audit: [] });
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("ADMIN Role Routes", () => {
    beforeEach(() => {
      mockCurrentUser = {
        publicId: "USR-ADMIN-01",
        displayName: "Administrator Dinkes",
        phoneNumber: "081111111111",
        role: "ADMIN",
        status: "ACTIVE",
        phoneVerifiedAt: "2026-01-01T00:00:00.000Z",
      };
    });

    it("1. route /education me-render halaman AdminEducationListPage tanpa 404", async () => {
      renderAppAt("/education");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Kelola Edukasi/i }),
      ).toBeInTheDocument();
    });

    it("2. route /regions me-render halaman Wilayah tanpa 404", async () => {
      renderAppAt("/regions");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Wilayah Administrasi/i }),
      ).toBeInTheDocument();
    });

    it("3. route /facilities me-render halaman Fasilitas Kesehatan tanpa 404", async () => {
      renderAppAt("/facilities");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Fasilitas Kesehatan" }),
      ).toBeInTheDocument();
    });

    it("4. route /midwives me-render halaman Daftar Bidan tanpa 404", async () => {
      renderAppAt("/midwives");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Daftar Bidan" }),
      ).toBeInTheDocument();
    });

    it("5. route /assignments me-render halaman Penugasan Bidan tanpa 404", async () => {
      renderAppAt("/assignments");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Penugasan Bidan" }),
      ).toBeInTheDocument();
    });

    it("6. route /dashboard me-render Dashboard Administrator", async () => {
      renderAppAt("/dashboard");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Dashboard Administrator" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Status Sistem")).toBeInTheDocument();
    });

    it("7. route /users me-render halaman Manajemen Akun Pengguna tanpa 404", async () => {
      renderAppAt("/users");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Manajemen Akun Pengguna" }),
      ).toBeInTheDocument();
    });
  });

  describe("MIDWIFE Role Routes", () => {
    beforeEach(() => {
      mockCurrentUser = {
        publicId: "USR-MIDWIFE-01",
        displayName: "Bidan Siti Rahma",
        phoneNumber: "081222222222",
        role: "MIDWIFE",
        status: "ACTIVE",
        phoneVerifiedAt: "2026-01-01T00:00:00.000Z",
      };
    });

    it("1. route /danger-follow-ups me-render halaman Perlu Tindak Lanjut tanpa 404", async () => {
      renderAppAt("/danger-follow-ups");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /Antrean Perlu Tindak Lanjut/i,
        }),
      ).toBeInTheDocument();
    });

    it("2. route /anc-missed me-render halaman Jadwal ANC Belum Dikonfirmasi Hadir tanpa 404", async () => {
      renderAppAt("/anc-missed");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /Jadwal ANC Belum Dikonfirmasi Hadir/i,
        }),
      ).toBeInTheDocument();
    });

    it("3. route /consultations me-render halaman Telekonsultasi Bidan tanpa 404", async () => {
      renderAppAt("/consultations");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Konsultasi Bidan" }),
      ).toBeInTheDocument();
    });

    it("4. route /midwife-profile me-render Profil Bidan tanpa 404", async () => {
      renderAppAt("/midwife-profile");
      expect(
        screen.queryByText(/404 — Halaman Tidak Ditemukan/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Profil Bidan" }),
      ).toBeInTheDocument();
    });

    it("5. route /users ditolak untuk peran MIDWIFE dengan 403", async () => {
      renderAppAt("/users");
      expect(screen.getByText(/403 — Akses Ditolak/i)).toBeInTheDocument();
    });
  });

  describe("Admin User Management Component Interactive Tests", () => {
    beforeEach(() => {
      mockCurrentUser = {
        publicId: "USR-ADMIN-01",
        displayName: "Administrator Dinkes",
        phoneNumber: "081111111111",
        role: "ADMIN",
        status: "ACTIVE",
        phoneVerifiedAt: "2026-01-01T00:00:00.000Z",
      };
    });

    it("1. navigasi admin memuat tautan Manajemen Akun", () => {
      const adminNav = navigationForRole("ADMIN");
      const paths = adminNav.map((n) => n[0]);
      const labels = adminNav.map((n) => n[1]);

      expect(paths).toContain("/users");
      expect(labels).toContain("Manajemen Akun");
    });

    it("2. AdminUsersPage me-render daftar akun pengguna dengan metadata aman", async () => {
      render(
        <MemoryRouter initialEntries={["/users"]}>
          <Routes>
            <Route path="/users" element={<AdminUsersPage />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText("Manajemen Akun Pengguna")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Bdn. Siti Nurhaliza")).toBeInTheDocument();
      });

      expect(screen.getByText("Ibu Rahmawati")).toBeInTheDocument();
      expect(screen.getByText(/Terkunci/)).toBeInTheDocument();
    });

    it("3. modal tambah akun baru membedakan peran Admin dan Bidan", async () => {
      render(
        <MemoryRouter initialEntries={["/users"]}>
          <Routes>
            <Route path="/users" element={<AdminUsersPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Tambah Akun Baru")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Tambah Akun Baru"));

      expect(screen.getByText("Tambah Akun Pengguna Baru")).toBeInTheDocument();
      expect(screen.getByText("Pilih Peran Akun")).toBeInTheDocument();
      expect(screen.getByText(/Akun Ibu Hamil didaftarkan secara khusus/)).toBeInTheDocument();
    });

    it("4. modal reset kata sandi menampilkan peringatan pencabutan sesi aktif", async () => {
      render(
        <MemoryRouter initialEntries={["/users"]}>
          <Routes>
            <Route path="/users" element={<AdminUsersPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Bdn. Siti Nurhaliza")).toBeInTheDocument();
      });

      const resetButtons = screen.getAllByRole("button", { name: "Reset Sandi" });
      const midwifeReset = resetButtons[1];
      expect(midwifeReset).toBeDefined();
      fireEvent.click(midwifeReset!);

      expect(screen.getByText("Reset Kata Sandi")).toBeInTheDocument();
      expect(screen.getByText(/mencabut seluruh sesi login aktif/)).toBeInTheDocument();
    });

    it("5. tombol nonaktifkan admin sendiri disabled dan akun lain dapat membuka dialog", async () => {
      render(
        <MemoryRouter initialEntries={["/users"]}>
          <Routes>
            <Route path="/users" element={<AdminUsersPage />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Bdn. Siti Nurhaliza")).toBeInTheDocument();
      });

      const deactivateButtons = screen.getAllByRole("button", { name: "Nonaktifkan" });
      const adminDeact = deactivateButtons[0];
      const midwifeDeact = deactivateButtons[1];
      expect(adminDeact).toBeDefined();
      expect(midwifeDeact).toBeDefined();

      expect(adminDeact!).toBeDisabled();
      expect(midwifeDeact!).not.toBeDisabled();

      fireEvent.click(midwifeDeact!);
      expect(screen.getByText("Konfirmasi Penonaktifan Akun")).toBeInTheDocument();
      expect(screen.getByText(/Data & riwayat klinis tidak dihapus/)).toBeInTheDocument();
    });
  });
});
