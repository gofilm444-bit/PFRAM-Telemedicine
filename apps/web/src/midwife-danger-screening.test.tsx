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
import { MidwifeAttentionListPage } from "./MidwifeAttentionListPage";
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
          <Route path="/danger-follow-ups" element={<MidwifeAttentionListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Tahap 6A — Web Dashboard Bidan Tanda Bahaya & Screening Suite", () => {
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

  const mockMonitoringSummary = {
    latestWeight: 62.5,
    previousWeight: 61.0,
    weightChange: 1.5,
    latestSystolicBp: 110,
    latestDiastolicBp: 75,
    totalRecords: 5,
    lastRecordedAt: "2026-09-20T08:00:00.000Z",
  };

  const mockScreenings = {
    items: [
      {
        publicId: "SCR-001",
        motherPublicId: "MOTH-001",
        pregnancyPublicId: "PREG-001",
        motherName: "Ibu Siti Rahmawati",
        screenedAt: "2026-09-28T09:00:00.000Z",
        status: "REQUIRES_IMMEDIATE_CARE",
        reportedSignsCount: 1,
        summary: "Perdarahan jalan lahir",
        ruleSetVersion: "KEMENKES-KIA-2023-V1",
        followUpStatus: "PENDING",
        followUpNotes: "Perlu segera dihubungi dan dirujuk.",
        followUpUpdatedAt: null,
        responses: [
          {
            ruleCode: "BLEEDING",
            title: "Perdarahan Jalan Lahir",
            question: "Apakah Ibu mengalami perdarahan?",
            answer: true,
            severityCategory: "URGENT",
          },
          {
            ruleCode: "HIGH_FEVER",
            title: "Demam Tinggi",
            question: "Apakah Ibu mengalami demam tinggi?",
            answer: false,
            severityCategory: "URGENT",
          },
        ],
        facility: { publicId: "FAC-001", name: "Puskesmas Melati" },
        createdAt: "2026-09-28T09:00:00.000Z",
      },
    ],
    total: 1,
  };

  const mockFollowUps = {
    items: [
      {
        publicId: "SCR-001",
        screenedAt: "2026-09-28T09:00:00.000Z",
        status: "REQUIRES_IMMEDIATE_CARE",
        reportedSignsCount: 1,
        reportedSigns: ["Perdarahan Jalan Lahir"],
        followUpStatus: "PENDING",
        followUpNotes: "Perlu segera dihubungi dan dirujuk.",
        mother: {
          publicId: "MOTH-001",
          fullName: "Ibu Siti Rahmawati",
          phoneNumber: "08123456789",
        },
        gestationalAge: { weeks: 24, days: 3 },
        trimester: 2,
        primaryFacility: { publicId: "FAC-001", name: "Puskesmas Melati" },
      },
    ],
    total: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockImplementation((path: string) => {
      if (path.includes("/midwife/mothers/MOTH-001/danger-screenings")) {
        return Promise.resolve(mockScreenings);
      }
      if (path.includes("/midwife/mothers/MOTH-001/monitoring-summary")) {
        return Promise.resolve(mockMonitoringSummary);
      }
      if (path.includes("/midwife/mothers/MOTH-001/monitoring")) {
        return Promise.resolve({ items: [], total: 0 });
      }
      if (path.includes("/midwife/mothers/MOTH-001/anc-schedules")) {
        return Promise.resolve({ items: [], total: 0 });
      }
      if (path.includes("/midwife/mothers/MOTH-001/adherence-summary")) {
        return Promise.resolve({
          ironTabletsTotal: 0,
          ironTabletsCompleted: 0,
          ironTabletsAdherencePercentage: 0,
          ancTotalScheduled: 0,
          ancCompleted: 0,
          ancMissedUnconfirmed: 0,
          recentHistory: [],
        });
      }
      if (path.includes("/midwife/mothers/MOTH-001")) {
        return Promise.resolve(mockMother);
      }
      if (path.includes("/midwife/danger-follow-ups")) {
        return Promise.resolve(mockFollowUps);
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Tab Rendering
  it("1. Tab Rendering: Tab 'Screening & Tanda Bahaya' tersedia di detail ibu binaan", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const tab = screen.getByRole("tab", { name: /Screening & Tanda Bahaya/i });
    expect(tab).toBeInTheDocument();
  });

  // 2. Latest Screening Summary
  it("2. Latest Screening Summary: Menampilkan skrining terbaru beserta tanggal dan status", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    // Switch to danger-screening tab
    const tab = screen.getByRole("tab", { name: /Screening & Tanda Bahaya/i });
    fireEvent.click(tab);

    await waitFor(() => {
      expect(screen.getByText("Skrining Mandiri Terakhir")).toBeInTheDocument();
      expect(
        screen.getAllByText("Segera ke Fasilitas Kesehatan").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("Menunggu Tindak Lanjut").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("1 Gejala")).toBeInTheDocument();
    });
  });

  // 3. History Table
  it("3. History Table: Menampilkan daftar riwayat skrining ibu binaan", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /Screening & Tanda Bahaya/i }));

    await waitFor(() => {
      expect(screen.getByText(/Riwayat Skrining Tanda Bahaya/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Rincian/i })).toBeInTheDocument();
    });
  });

  // 4. Detail Modal / Drawer
  it("4. Detail Modal: Menampilkan butir jawaban yang dilaporkan ibu", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /Screening & Tanda Bahaya/i }));

    await waitFor(() => {
      expect(screen.getByText("Lihat Jawaban & Tindak Lanjut")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lihat Jawaban & Tindak Lanjut"));

    await waitFor(() => {
      expect(
        screen.getByText("Rincian Jawaban Skrining Tanda Bahaya"),
      ).toBeInTheDocument();
      expect(screen.getByText("Perdarahan Jalan Lahir")).toBeInTheDocument();
      expect(screen.getByText("Demam Tinggi")).toBeInTheDocument();
      expect(screen.getByText("Pembaruan Tindak Lanjut Bidan")).toBeInTheDocument();
    });
  });

  // 5. Follow-Up Queue Navigation
  it("5. Follow-Up Queue Navigation: Tautan 'Perlu Tindak Lanjut' tersedia di navigasi bidan", () => {
    const links = navigationForRole("MIDWIFE");
    const followUpLink = links.find((l) => l[0] === "/danger-follow-ups");
    expect(followUpLink).toBeDefined();
    expect(followUpLink?.[1]).toBe("Perlu Tindak Lanjut");
  });

  // 6. Follow-Up Queue List
  it("6. Follow-Up Queue List: Menampilkan daftar ibu yang butuh tindak lanjut aktif", async () => {
    renderWithProviders(<MidwifeAttentionListPage />, "/danger-follow-ups");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Antrean Perlu Tindak Lanjut" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
      expect(
        screen.getByText(/Gejala yang Dilaporkan/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Perdarahan Jalan Lahir")).toBeInTheDocument();
    });
  });

  // 7. Action Mark Contacted
  it("7. Action Mark Contacted: Memperbarui status menjadi CONTACTED", async () => {
    mockRequest.mockImplementation((path: string, options?: RequestInit) => {
      if (options?.method === "PATCH" && path.includes("/danger-screenings/SCR-001/follow-up")) {
        return Promise.resolve({
          ...mockScreenings.items[0],
          followUpStatus: "CONTACTED",
          followUpNotes: "Sudah ditelepon",
        });
      }
      if (path.includes("/midwife/danger-follow-ups")) {
        return Promise.resolve(mockFollowUps);
      }
      return Promise.resolve({});
    });

    renderWithProviders(<MidwifeAttentionListPage />, "/danger-follow-ups");

    await waitFor(() => {
      expect(screen.getByText("Tindak Lanjut")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Tindak Lanjut"));

    await waitFor(() => {
      expect(
        screen.getByText(/Tindak Lanjut — Ibu Siti Rahmawati/i),
      ).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Status Tindak Lanjut/i);
    fireEvent.change(select, { target: { value: "CONTACTED" } });

    const textarea = screen.getByPlaceholderText(/Keterangan tindakan bidan/i);
    fireEvent.change(textarea, { target: { value: "Sudah ditelepon" } });

    fireEvent.click(screen.getByRole("button", { name: "Simpan Status" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/danger-screenings/SCR-001/follow-up",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            status: "CONTACTED",
            notes: "Sudah ditelepon",
          }),
        }),
      );
    });
  });

  // 8. Action Mark Referred
  it("8. Action Mark Referred: Memperbarui status menjadi REFERRED_TO_FACILITY", async () => {
    mockRequest.mockImplementation((path: string, options?: RequestInit) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({
          ...mockScreenings.items[0],
          followUpStatus: "REFERRED_TO_FACILITY",
        });
      }
      if (path.includes("/midwife/danger-follow-ups")) return Promise.resolve(mockFollowUps);
      return Promise.resolve({});
    });

    renderWithProviders(<MidwifeAttentionListPage />, "/danger-follow-ups");

    await waitFor(() => {
      expect(screen.getByText("Tindak Lanjut")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Tindak Lanjut"));
    const select = screen.getByLabelText(/Status Tindak Lanjut/i);
    fireEvent.change(select, { target: { value: "REFERRED_TO_FACILITY" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Status" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/danger-screenings/SCR-001/follow-up",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            status: "REFERRED_TO_FACILITY",
            notes: "Perlu segera dihubungi dan dirujuk.",
          }),
        }),
      );
    });
  });

  // 9. Action Mark Arrived
  it("9. Action Mark Arrived: Memperbarui status menjadi ARRIVED_AT_FACILITY", async () => {
    mockRequest.mockImplementation((path: string, options?: RequestInit) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({
          ...mockScreenings.items[0],
          followUpStatus: "ARRIVED_AT_FACILITY",
        });
      }
      if (path.includes("/midwife/danger-follow-ups")) return Promise.resolve(mockFollowUps);
      return Promise.resolve({});
    });

    renderWithProviders(<MidwifeAttentionListPage />, "/danger-follow-ups");
    await waitFor(() => expect(screen.getByText("Tindak Lanjut")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Tindak Lanjut"));
    const select = screen.getByLabelText(/Status Tindak Lanjut/i);
    fireEvent.change(select, { target: { value: "ARRIVED_AT_FACILITY" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Status" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/danger-screenings/SCR-001/follow-up",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            status: "ARRIVED_AT_FACILITY",
            notes: "Perlu segera dihubungi dan dirujuk.",
          }),
        }),
      );
    });
  });

  // 10. Action Mark Resolved
  it("10. Action Mark Resolved: Memperbarui status menjadi RESOLVED", async () => {
    mockRequest.mockImplementation((path: string, options?: RequestInit) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({
          ...mockScreenings.items[0],
          followUpStatus: "RESOLVED",
        });
      }
      if (path.includes("/midwife/danger-follow-ups")) return Promise.resolve(mockFollowUps);
      return Promise.resolve({});
    });

    renderWithProviders(<MidwifeAttentionListPage />, "/danger-follow-ups");
    await waitFor(() => expect(screen.getByText("Tindak Lanjut")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Tindak Lanjut"));
    const select = screen.getByLabelText(/Status Tindak Lanjut/i);
    fireEvent.change(select, { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Status" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/danger-screenings/SCR-001/follow-up",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            status: "RESOLVED",
            notes: "Perlu segera dihubungi dan dirujuk.",
          }),
        }),
      );
    });
  });

  // 11. Unauthorized Mother Access
  it("11. Unauthorized Mother Access: Bidan ditolak jika mencoba membuka profil ibu non-binaan", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Akses ditolak: penugasan tidak aktif"));

    renderWithProviders(<MidwifeMotherDetailPage />, "/my-mothers/UNASSIGNED-MOTHER");

    await waitFor(() => {
      expect(
        screen.getByText("Akses Ditolak atau Ibu Binaan Tidak Ditemukan"),
      ).toBeInTheDocument();
    });
  });

  // 12. Error State & Retry
  it("12. Error State & Retry: Tampilan galat dan tombol muat ulang berfungsi saat gagal jaringan", async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path.includes("/midwife/mothers/MOTH-001/danger-screenings")) {
        return Promise.reject(new Error("Gagal terhubung"));
      }
      if (path.includes("/midwife/mothers/MOTH-001")) {
        return Promise.resolve(mockMother);
      }
      return Promise.resolve({});
    });

    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: /Screening & Tanda Bahaya/i }));

    await waitFor(() => {
      expect(screen.getByText("Gagal Memuat Data Skrining")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Coba Lagi" })).toBeInTheDocument();
    });
  });

  // 13. Existing ANC Tab Intact
  it("13. Existing ANC Tab Intact: Tab Jadwal ANC tetap berfungsi normal", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument());

    const ancTab = screen.getByRole("tab", { name: /Jadwal ANC & Kepatuhan/i });
    fireEvent.click(ancTab);

    await waitFor(() => {
      expect(ancTab).toHaveAttribute("aria-selected", "true");
    });
  });

  // 14. Existing Monitoring Tab Intact
  it("14. Existing Monitoring Tab Intact: Tab Pemantauan Fisik tetap berfungsi normal", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);
    await waitFor(() => expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument());

    const monitoringTab = screen.getByRole("tab", { name: /Pemantauan Fisik/i });
    expect(monitoringTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getAllByText(/Perkembangan Berat Badan/i).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
