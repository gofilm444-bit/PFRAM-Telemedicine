import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import type {
  AuthenticatedUser,
  HomeVisitItem,
  MidwifeAttentionItem,
  MidwifeDashboardSummary,
  MidwifeEnrichedMotherItem,
  MidwifeTodayScheduleItem,
} from "@pfram/shared-types";

const currentMidwife: AuthenticatedUser = {
  publicId: "USR-MIDWIFE-001",
  displayName: "Bidan Siti Rahma",
  phoneNumber: "081222222222",
  role: "MIDWIFE",
  status: "ACTIVE",
  phoneVerifiedAt: "2026-01-01T00:00:00.000Z",
};

export const mockRequest = vi.fn();

vi.mock("./auth", () => ({
  useAuth: () => ({
    user: currentMidwife,
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

import { MidwifeDashboardPage } from "./MidwifeDashboardPage";
import { MidwifeHomeVisitSection } from "./MidwifeHomeVisitSection";
import { MothersPage } from "./stage3";

const mockSummary: MidwifeDashboardSummary = {
  activeMothersCount: 12,
  todayMonitoringCount: 3,
  todayAncCount: 2,
  unconfirmedAncCount: 1,
  pendingDangerScreeningCount: 4,
  unreadConsultationCount: 5,
  todayVideoCallCount: 1,
  todayHomeVisitCount: 2,
  monthlyRecap: {
    totalAssignedMothers: 12,
    completedAncThisMonth: 18,
    unconfirmedAncTotal: 2,
    screeningsThisMonth: 25,
    dangerFollowUpsCompletedThisMonth: 20,
    activeConsultationThreads: 8,
    completedP4kPlans: 10,
    completedHomeVisitsThisMonth: 5,
  },
};

const mockAttentionItems: MidwifeAttentionItem[] = [
  {
    id: "att-1",
    type: "PENDING_DANGER",
    motherPublicId: "MOTH-001",
    motherName: "Ibu Rahmawati",
    title: "Skrining Tanda Bahaya",
    description: "Perlu konfirmasi tindak lanjut segera",
    urgency: "HIGH",
    actionUrl: "/danger-follow-ups",
  },
  {
    id: "att-2",
    type: "UNREAD_MESSAGE",
    motherPublicId: "MOTH-002",
    motherName: "Ibu Fatimah",
    title: "Pesan Masuk",
    description: "2 pesan belum dibaca",
    urgency: "HIGH",
    actionUrl: "/consultations",
  },
];

const mockScheduleItems: MidwifeTodayScheduleItem[] = [
  {
    id: "sch-1",
    type: "ANC",
    time: "09:00",
    motherName: "Ibu Rahmawati",
    motherPublicId: "MOTH-001",
    title: "Pemeriksaan ANC Trimester 3 (T4)",
    locationOrLink: "Puskesmas Gambir",
    status: "SCHEDULED",
    actionUrl: "/my-mothers",
  },
  {
    id: "sch-2",
    type: "HOME_VISIT",
    time: "14:00",
    motherName: "Ibu Siti Aminah",
    motherPublicId: "MOTH-003",
    title: "Kunjungan Rumah Evaluasi Persiapan Melahirkan",
    locationOrLink: "Jl. Merdeka No. 12",
    status: "SCHEDULED",
    actionUrl: "/my-mothers",
  },
];

const mockEnrichedMothers: MidwifeEnrichedMotherItem[] = [
  {
    publicId: "MOTH-001",
    userId: "USR-001",
    fullName: "Ibu Rahmawati",
    phoneNumber: "081234567890",
    address: "Jl. Gambir No. 5",
    age: 28,
    facility: { publicId: "FAC-001", name: "Puskesmas Gambir" },
    activePregnancy: {
      publicId: "PREG-001",
      gestationalAge: { weeks: 34, days: 2 },
      trimester: 3,
      estimatedDueDate: "2026-09-25",
    },
    nextAnc: {
      publicId: "ANC-001",
      scheduledAt: "2026-08-14T09:00:00.000Z",
      visitType: "ROUTINE_MIDWIFE",
    },
    lastMonitoring: {
      recordedAt: "2026-08-12T08:00:00.000Z",
      systolicBp: 120,
      diastolicBp: 80,
      weightKg: 62,
    },
    p4kStatus: {
      isComplete: true,
      checkedCount: 7,
      totalCount: 7,
    },
    hasFollowUp: true,
    followUpReasons: ["Tanda bahaya pusing"],
    unreadMessagesCount: 1,
    hasMissedAnc: false,
  },
  {
    publicId: "MOTH-002",
    userId: "USR-002",
    fullName: "Ibu Fatimah",
    phoneNumber: "081234567891",
    address: "Jl. Kebon Sirih No. 10",
    age: 24,
    facility: { publicId: "FAC-001", name: "Puskesmas Gambir" },
    activePregnancy: {
      publicId: "PREG-002",
      gestationalAge: { weeks: 10, days: 0 },
      trimester: 1,
      estimatedDueDate: "2027-03-10",
    },
    nextAnc: {
      publicId: "ANC-002",
      scheduledAt: "2026-08-20T09:00:00.000Z",
      visitType: "ROUTINE_MIDWIFE",
    },
    lastMonitoring: {
      recordedAt: "2026-08-10T08:00:00.000Z",
      systolicBp: 110,
      diastolicBp: 70,
      weightKg: 55,
    },
    p4kStatus: {
      isComplete: false,
      checkedCount: 2,
      totalCount: 7,
    },
    hasFollowUp: false,
    followUpReasons: [],
    unreadMessagesCount: 0,
    hasMissedAnc: false,
  },
];

const mockHomeVisits: HomeVisitItem[] = [
  {
    publicId: "HV-001",
    motherPublicId: "MOTH-001",
    motherName: "Ibu Ratna Dewi",
    midwifePublicId: "MW-001",
    midwifeName: "Bidan Siti Rahma",
    scheduledAt: "2026-08-15T10:00:00.000Z",
    purpose: "Pemantauan tensi & evaluasi Buku KIA",
    notes: "Ibu mengeluh pusing ringan",
    status: "SCHEDULED",
    completedAt: null,
    createdAt: "2026-08-14T08:00:00.000Z",
    updatedAt: "2026-08-14T08:00:00.000Z",
  },
];


describe("Tahap 11: Midwife Dashboard & Operational Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("1. renders all 8 real metric cards on MidwifeDashboardPage", async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path.includes("summary")) return Promise.resolve(mockSummary);
      if (path.includes("attention")) return Promise.resolve({ items: mockAttentionItems, total: 2 });
      if (path.includes("schedule")) return Promise.resolve({ items: mockScheduleItems, total: 2 });
      return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <MidwifeDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard Bidan Pendamping")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    expect(screen.getByText("Ibu Binaan Aktif")).toBeInTheDocument();
    expect(screen.getByText("Pemantauan Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("ANC Hari Ini")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ANC Belum Dikonfirmasi")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Skrining Perlu Tindak Lanjut")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Konsultasi Belum Dibaca")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Video Call Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("Kunjungan Rumah Hari Ini")).toBeInTheDocument();
  });

  it("2. renders priority attention items ('Perlu Ditindaklanjuti')", async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path.includes("summary")) return Promise.resolve(mockSummary);
      if (path.includes("attention")) return Promise.resolve({ items: mockAttentionItems, total: 2 });
      if (path.includes("schedule")) return Promise.resolve({ items: mockScheduleItems, total: 2 });
      return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <MidwifeDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Perlu Ditindaklanjuti")).toBeInTheDocument();
    });

    expect(screen.getByText("Ibu Rahmawati • Perlu konfirmasi tindak lanjut segera")).toBeInTheDocument();
    expect(screen.getByText("Ibu Fatimah • 2 pesan belum dibaca")).toBeInTheDocument();
  });

  it("3. renders today's schedule table ('Jadwal Hari Ini') with combined activities", async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path.includes("summary")) return Promise.resolve(mockSummary);
      if (path.includes("attention")) return Promise.resolve({ items: mockAttentionItems, total: 2 });
      if (path.includes("schedule")) return Promise.resolve({ items: mockScheduleItems, total: 2 });
      return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <MidwifeDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Jadwal Hari Ini")).toBeInTheDocument();
    });

    expect(screen.getByText(/Pemeriksaan ANC Trimester 3/)).toBeInTheDocument();
    expect(screen.getByText(/Kunjungan Rumah Evaluasi Persiapan Melahirkan/)).toBeInTheDocument();
  });

  it("4. handles zero-data / empty states gracefully on MidwifeDashboardPage", async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path.includes("summary")) {
        return Promise.resolve({
          activeMothersCount: 0,
          todayMonitoringCount: 0,
          todayAncCount: 0,
          unconfirmedAncCount: 0,
          pendingDangerScreeningCount: 0,
          unreadConsultationCount: 0,
          todayVideoCallCount: 0,
          todayHomeVisitCount: 0,
        });
      }
      if (path.includes("attention")) return Promise.resolve({ items: [], total: 0 });
      if (path.includes("schedule")) return Promise.resolve({ items: [], total: 0 });
      return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <MidwifeDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard Bidan Pendamping")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Semua tugas administratif dan tindak lanjut telah diselesaikan/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tidak ada agenda ANC, video call, atau kunjungan rumah hari ini/)
    ).toBeInTheDocument();
  });

  it("5. renders enriched mothers page with filter tabs and search", async () => {
    mockRequest.mockImplementation((path: string) => {
      if (path.includes("mothers")) {
        return Promise.resolve({ items: mockEnrichedMothers, total: 2 });
      }
      return Promise.resolve([]);
    });

    render(
      <BrowserRouter>
        <MothersPage midwife />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Ibu Rahmawati")).toBeInTheDocument();
    });

    expect(screen.getByText("Ibu Fatimah")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semua" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trimester 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trimester 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trimester 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ada Tindak Lanjut" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ANC Terlewat" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trimester 1" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("filter=TRIMESTER_1")
      );
    });
  });

  it("6. renders MidwifeHomeVisitSection and allows scheduling a home visit", async () => {
    mockRequest.mockImplementation((path: string, opts?: { method?: string }) => {
      if (path.includes("/midwife/home-visits") && (!opts || !opts.method || opts.method === "GET")) {
        return Promise.resolve({ items: mockHomeVisits, total: 1 });
      }
      if (path.includes("/midwife/home-visits") && opts?.method === "POST") {
        return Promise.resolve({
          publicId: "HV-002",
          motherId: "MOTH-001",
          midwifeId: "MW-001",
          scheduledAt: "2026-08-20T10:00:00.000Z",
          purpose: "Kunjungan Pasca Salin",
          notes: null,
          status: "SCHEDULED",
          completedAt: null,
          createdAt: "2026-08-14T08:00:00.000Z",
          updatedAt: "2026-08-14T08:00:00.000Z",
        });
      }
      return Promise.resolve({});
    });

    render(
      <BrowserRouter>
        <MidwifeHomeVisitSection motherPublicId="MOTH-001" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Kunjungan Rumah (Home Visit)")).toBeInTheDocument();
    });

    expect(screen.getByText(/Pemantauan tensi & evaluasi Buku KIA/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("+ Jadwalkan Kunjungan"));

    expect(screen.getByText("Jadwalkan Kunjungan Rumah Baru")).toBeInTheDocument();

    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: "2026-08-20" } });
    }

    fireEvent.change(screen.getByPlaceholderText("Contoh: Evaluasi kesiapan persalinan trimester 3 dan cek lingkungan"), {
      target: { value: "Kunjungan Pasca Salin" },
    });

    fireEvent.click(screen.getByText("Simpan Jadwal"));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/home-visits",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Kunjungan Pasca Salin"),
        })
      );
    });
  });
});
