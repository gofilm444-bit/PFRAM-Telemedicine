import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthenticatedUser } from "@pfram/shared-types";

const currentUser: AuthenticatedUser | null = {
  publicId: "USR-MIDWIFE-001",
  displayName: "Bidan Sri Handayani",
  phoneNumber: "081234567890",
  role: "MIDWIFE",
  status: "ACTIVE",
  phoneVerifiedAt: "2026-01-01T00:00:00.000Z",
};

export const mockRequest = vi.fn();

vi.mock("./auth", () => ({
  useAuth: () => ({
    user: currentUser,
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

import { MidwifeMotherDetailPage } from "./MidwifeMotherDetailPage";
import { MidwifeMissedAncPage } from "./MidwifeMissedAncPage";
import { navigationForRole } from "./components";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, initialRoute = "/my-mothers/MOTH-001") {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/my-mothers/:motherPublicId" element={ui} />
          <Route path="/anc-missed" element={<MidwifeMissedAncPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Tahap 5A — Web Dashboard Bidan ANC & Kepatuhan", () => {
  const mockMother = {
    publicId: "MOTH-001",
    fullName: "Ibu Siti Rahmawati",
    age: 28,
    phoneNumber: "08123456789",
    facility: { publicId: "FAC-001", name: "Puskesmas Melati" },
    activePregnancy: {
      publicId: "PREG-001",
      gestationalAge: { weeks: 24, days: 3 },
      trimester: 2,
      estimatedDueDate: "2026-12-15",
    },
  };

  const mockAdherence = {
    ironTabletsTotal: 30,
    ironTabletsCompleted: 26,
    ironTabletsAdherencePercentage: 86.7,
    ancTotalScheduled: 4,
    ancCompleted: 3,
    ancMissedUnconfirmed: 1,
    recentHistory: [],
  };

  const mockSchedules = {
    items: [
      {
        publicId: "SCHED-001",
        motherPublicId: "MOTH-001",
        pregnancyPublicId: "PREG-001",
        scheduledAt: "2026-10-15T09:00:00.000Z",
        visitType: "DOCTOR_ANC",
        doctorRequired: true,
        status: "SCHEDULED",
        notes: "USG Trimester 2",
        facility: { publicId: "FAC-001", name: "Puskesmas Melati" },
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        publicId: "SCHED-002",
        motherPublicId: "MOTH-001",
        pregnancyPublicId: "PREG-001",
        scheduledAt: "2026-09-10T09:00:00.000Z",
        visitType: "ANC",
        doctorRequired: false,
        status: "COMPLETED",
        notes: "Pemeriksaan rutin aman",
        facility: { publicId: "FAC-001", name: "Puskesmas Melati" },
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-10T10:00:00.000Z",
      },
    ],
    total: 2,
    page: 1,
    limit: 50,
  };

  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockImplementation((path: string) => {
      if (path === "/midwife/mothers/MOTH-001") {
        return Promise.resolve(mockMother);
      }
      if (path.includes("/monitoring/summary")) {
        return Promise.resolve({
          latestWeight: 60,
          latestBloodPressure: { systolic: 120, diastolic: 80 },
          totalEntries: 2,
        });
      }
      if (path.includes("/monitoring")) {
        return Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          limit: 10,
        });
      }
      if (path.includes("/adherence-summary")) {
        return Promise.resolve(mockAdherence);
      }
      if (path.includes("/anc-schedules")) {
        return Promise.resolve(mockSchedules);
      }
      if (path === "/midwife/anc-missed") {
        return Promise.resolve({
          items: [
            {
              publicId: "MISSED-001",
              scheduledAt: "2026-09-20T08:30:00.000Z",
              visitType: "ANC",
              doctorRequired: false,
              notes: "Kontrol bulanan",
              statusLabel: "Belum Dikonfirmasi",
              daysOverdue: 10,
              mother: { publicId: "MOTH-001", fullName: "Ibu Siti Rahmawati" },
              facility: { publicId: "FAC-001", name: "Puskesmas Melati" },
            },
          ],
          total: 1,
        });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. menampilkan tab 'Jadwal ANC & Kepatuhan' pada detail ibu binaan", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const ancTab = screen.getByRole("tab", { name: /Jadwal ANC & Kepatuhan/i });
    expect(ancTab).toBeInTheDocument();
  });

  it("2. menampilkan ringkasan kepatuhan TTD dan ANC saat tab aktif", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const ancTab = screen.getByRole("tab", { name: /Jadwal ANC & Kepatuhan/i });
    fireEvent.click(ancTab);

    await waitFor(() => {
      expect(screen.getByText(/86.7% Patuh/i)).toBeInTheDocument();
      expect(screen.getByText("26")).toBeInTheDocument();
      expect(screen.getByText(/30 tablet dikonfirmasi/i)).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("3. menampilkan daftar jadwal kunjungan ANC dan indikator wajib dokter", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const ancTab = screen.getByRole("tab", { name: /Jadwal ANC & Kepatuhan/i });
    fireEvent.click(ancTab);

    await waitFor(() => {
      // Check for elements that appear
      expect(screen.getByText("Jadwal Pemeriksaan ANC Ibu Binaan")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Pemeriksaan Dokter/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Wajib Dokter/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Terjadwal").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Sudah Hadir").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("4. membuka modal penjadwalan ANC baru saat tombol diklik", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const ancTab = screen.getByRole("tab", { name: /Jadwal ANC & Kepatuhan/i });
    fireEvent.click(ancTab);

    await waitFor(() => {
      const addBtn = screen.getByRole("button", {
        name: /\+ Jadwalkan Kunjungan Baru/i,
      });
      fireEvent.click(addBtn);
    });

    expect(
      screen.getByText("Jadwalkan Kunjungan ANC Baru"),
    ).toBeInTheDocument();
  });

  it("5. navigasi sidebar bidan mencakup link 'Jadwal Belum Hadir'", () => {
    const links = navigationForRole("MIDWIFE");
    expect(links).toContainEqual(["/anc-missed", "Jadwal Belum Hadir"]);
  });

  it("6. halaman Missed ANC menampilkan daftar kunjungan yang terlewat", async () => {
    renderWithProviders(<MidwifeMissedAncPage />, "/anc-missed");

    await waitFor(() => {
      expect(
        screen.getByText("Jadwal ANC Belum Dikonfirmasi Hadir"),
      ).toBeInTheDocument();
      expect(screen.getByText("Lewat 10 hari")).toBeInTheDocument();
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });
  });

  it("7. menampilkan banner standar Kemenkes 1-2-3 (6 kali total, 2x dokter + USG)", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const ancTab = screen.getByRole("tab", { name: /Jadwal ANC & Kepatuhan/i });
    fireEvent.click(ancTab);

    await waitFor(() => {
      expect(
        screen.getByText(/Standar Pelayanan Antenatal Terpadu Kemenkes RI/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Trimester 1: Min\. 1x/i)).toBeInTheDocument();
      expect(screen.getByText(/Trimester 2: Min\. 2x/i)).toBeInTheDocument();
      expect(screen.getByText(/Trimester 3: Min\. 3x/i)).toBeInTheDocument();
      expect(screen.getByText(/Kontak Dokter: Min\. 2x/i)).toBeInTheDocument();
    });
  });
});
