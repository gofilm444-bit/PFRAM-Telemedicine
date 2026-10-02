/** @vitest-environment jsdom */
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
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Tahap 8 — Web Dashboard Bidan P4K & Rencana Rujukan", () => {
  const mockMother = {
    publicId: "MOTH-001",
    fullName: "Ibu Siti Rahmawati",
    age: 28,
    phoneNumber: "08123456789",
    facility: { publicId: "FAC-001", name: "Puskesmas Kepulauan Banda" },
    activePregnancy: {
      publicId: "PREG-001",
      gestationalAge: { weeks: 28, days: 2 },
      trimester: 3,
      estimatedDueDate: "2026-12-15",
    },
  };

  const mockP4k = {
    publicId: "P4K-001",
    motherProfileId: "MP-001",
    pregnancyId: "PREG-001",
    estimatedDueDate: "2026-12-15",
    plannedFacilityId: "FAC-001",
    plannedFacilityName: "Puskesmas Kepulauan Banda",
    deliveryAttendant: "BIDAN",
    birthCompanionName: "Ahmad Suhendar",
    birthCompanionPhone: "081234567899",
    transportation: "SPEEDBOAT",
    fundingSource: "BPJS",
    bpjsNumber: "0001234567890",
    bloodDonors: [
      { name: "Budi Santoso", bloodType: "O+", phone: "08111222333" },
    ],
    emergencyContactName: "Pak RT Hendra",
    emergencyContactPhone: "08555666777",
    preparationNotes: "Siap berangkat H-7 menjelang HPL",
    deliveryFacility: { publicId: "FAC-001", name: "Puskesmas Kepulauan Banda" },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    checklistItems: [
      { publicId: "chk-1", itemKey: "identity_documents", title: "Dokumen identitas (KTP / KK)", category: "DOKUMEN", checked: true, checkedAt: "2026-08-01T00:00:00.000Z", sortOrder: 1 },
      { publicId: "chk-2", itemKey: "bpjs_card", title: "Kartu JKN / BPJS Kesehatan", category: "DOKUMEN", checked: true, checkedAt: "2026-08-01T00:00:00.000Z", sortOrder: 2 },
      { publicId: "chk-3", itemKey: "kia_book", title: "Buku KIA (Kesehatan Ibu dan Anak)", category: "DOKUMEN", checked: false, checkedAt: null, sortOrder: 3 },
      { publicId: "chk-4", itemKey: "mother_clothing", title: "Pakaian ganti ibu", category: "PAKAIAN", checked: false, checkedAt: null, sortOrder: 4 },
      { publicId: "chk-5", itemKey: "baby_clothing", title: "Pakaian bayi baru lahir & bedong", category: "PAKAIAN", checked: false, checkedAt: null, sortOrder: 5 },
      { publicId: "chk-6", itemKey: "hygiene_kit", title: "Perlengkapan mandi & kebersihan", category: "KEBERSIHAN", checked: false, checkedAt: null, sortOrder: 6 },
      { publicId: "chk-7", itemKey: "breastfeeding_supplies", title: "Perlengkapan menyusui", category: "MENYUSUI", checked: false, checkedAt: null, sortOrder: 7 },
      { publicId: "chk-8", itemKey: "prescribed_medication", title: "Obat pribadi / vitamin sesuai anjuran nakes", category: "OBAT", checked: false, checkedAt: null, sortOrder: 8 },
      { publicId: "chk-9", itemKey: "other_essentials", title: "Perlengkapan darurat lain (kain, dsb)", category: "LAINNYA", checked: false, checkedAt: null, sortOrder: 9 },
    ],
    checklistProgress: {
      total: 9,
      checked: 2,
      percentage: 22.2,
    },
  };

  const mockReferralPlan = {
    publicId: "REF-001",
    motherProfileId: "MP-001",
    pregnancyId: "PREG-001",
    sourceFacility: { publicId: "FAC-001", name: "Puskesmas Kepulauan Banda" },
    destinationFacility: { publicId: "FAC-002", name: "RSUD Dr. M. Haulussy Ambon" },
    customSourceFacilityName: null,
    customDestinationFacilityName: null,
    transportType: "SPEEDBOAT",
    transportOperatorName: "Kapten Ali Speedboat",
    transportContactNumber: "081299887766",
    estimatedTravelTimeMinutes: 180,
    manualDepartureSchedule: "Setiap hari pukul 07.00 WIT atau sewa darurat 24 jam",
    departurePoint: "Dermaga Pelabuhan Banda Neira",
    companions: "Suami & Bidan Pendamping",
    rtkName: "Rumah Tunggu Kelahiran Sehati Ambon",
    rtkAddress: "Jl. Christina Martha Tiahahu No. 12, Ambon",
    rtkPhone: "082133445566",
    alternativeNotes: "Bila cuaca buruk atau gelombang tinggi, koordinasikan dengan pos syahbandar & helipad darurat",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/midwife/mothers/MOTH-001") {
        return Promise.resolve(mockMother);
      }
      if (path === "/midwife/mothers/MOTH-001/monitoring/summary") {
        return Promise.resolve({ totalLogs: 5, lastLogDate: "2026-08-01" });
      }
      if (path.startsWith("/midwife/mothers/MOTH-001/monitoring?")) {
        return Promise.resolve({ items: [], total: 0 });
      }
      if (path.startsWith("/midwife/mothers/MOTH-001/monitoring/chart")) {
        return Promise.resolve({ bloodPressures: [], weights: [] });
      }
      if (path === "/midwife/mothers/MOTH-001/p4k" && (!options || options.method === "GET")) {
        return Promise.resolve(mockP4k);
      }
      if (path === "/midwife/mothers/MOTH-001/referral-plan" && (!options || options.method === "GET")) {
        return Promise.resolve(mockReferralPlan);
      }
      if (path === "/midwife/mothers/MOTH-001/p4k" && options?.method === "PUT") {
        return Promise.resolve({
          ...mockP4k,
          ...((options.body as Record<string, unknown>) || {}),
        });
      }
      if (path === "/midwife/mothers/MOTH-001/referral-plan" && options?.method === "PUT") {
        return Promise.resolve({
          ...mockReferralPlan,
          ...((options.body as Record<string, unknown>) || {}),
        });
      }
      return Promise.reject(new Error(`Unhandled mock path: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("merender tab P4K & Rujukan dan menampilkan data perencanaan persalinan serta checklist", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);

    // Tunggu profil ibu termuat
    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    // Klik tab P4K & Rujukan
    const p4kTab = await screen.findByRole("tab", { name: /P4K & Rujukan/i });
    expect(p4kTab).toBeInTheDocument();
    fireEvent.click(p4kTab);

    // Verifikasi data P4K ditampilkan
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Perencanaan Persalinan \(P4K\)/i })).toBeInTheDocument();
      expect(screen.getByText(/Ahmad Suhendar/i)).toBeInTheDocument();
      expect(screen.getByText(/Budi Santoso/i)).toBeInTheDocument();
      expect(screen.getByText(/Pak RT Hendra/i)).toBeInTheDocument();
    });

    // Verifikasi checklist administratif persalinan (non-diagnostik)
    expect(screen.getByText(/2 dari 9 item siap/i)).toBeInTheDocument();
    expect(screen.getByText("Dokumen identitas (KTP / KK)")).toBeInTheDocument();
    expect(screen.getByText("Kartu JKN / BPJS Kesehatan")).toBeInTheDocument();
    expect(screen.getByText("Buku KIA (Kesehatan Ibu dan Anak)")).toBeInTheDocument();
  });

  it("dapat beralih ke subtab Rencana Rujukan Kepulauan dan melihat rincian rujukan transportasi air & RTK", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    // Pindah ke tab P4K
    const p4kTab = await screen.findByRole("tab", { name: /P4K & Rujukan/i });
    fireEvent.click(p4kTab);

    // Tunggu data selesai dimuat
    await waitFor(() => {
      expect(screen.queryByText("Memuat data P4K dan rencana rujukan...")).not.toBeInTheDocument();
    }, { timeout: 10000 });

    // Tunggu tab P4K muncul lalu klik subtab Rencana Rujukan Wilayah Kepulauan
    const referralTab = await screen.findByRole("tab", { name: /Rencana Rujukan/i }, { timeout: 10000 });
    fireEvent.click(referralTab);

    // Verifikasi rincian rujukan laut dan RTK
    await waitFor(() => {
      expect(screen.getByText("RSUD Dr. M. Haulussy Ambon")).toBeInTheDocument();
      expect(screen.getByText(/Kapten Ali Speedboat/i)).toBeInTheDocument();
      expect(screen.getByText("Dermaga Pelabuhan Banda Neira")).toBeInTheDocument();
      expect(screen.getByText("Rumah Tunggu Kelahiran Sehati Ambon")).toBeInTheDocument();
      expect(screen.getByText(/180 menit/i)).toBeInTheDocument();
    });
  });

  it("dapat membuka modal pembaruan P4K dan mengirimkan data yang diperbarui", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const p4kTab = await screen.findByRole("tab", { name: /P4K & Rujukan/i }, { timeout: 10000 });
    fireEvent.click(p4kTab);

    await waitFor(() => {
      expect(screen.queryByText("Memuat data P4K dan rencana rujukan...")).not.toBeInTheDocument();
    }, { timeout: 10000 });

    const editBtn = await screen.findByRole("button", { name: /Perbarui Data P4K/i }, { timeout: 10000 });
    fireEvent.click(editBtn);

    expect(screen.getByText("Perbarui Perencanaan Persalinan (P4K)")).toBeInTheDocument();

    // Simpan perubahan
    const saveButton = screen.getByRole("button", { name: /Simpan Perubahan/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/mothers/MOTH-001/p4k",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
  });

  it("dapat membuka modal pembaruan Rencana Rujukan dan mengirimkan data rujukan laut", async () => {
    renderWithProviders(<MidwifeMotherDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const p4kTab = await screen.findByRole("tab", { name: /P4K & Rujukan/i }, { timeout: 10000 });
    fireEvent.click(p4kTab);

    await waitFor(() => {
      expect(screen.queryByText("Memuat data P4K dan rencana rujukan...")).not.toBeInTheDocument();
    }, { timeout: 10000 });

    const referralTab = await screen.findByRole("tab", { name: /Rencana Rujukan/i }, { timeout: 10000 });
    fireEvent.click(referralTab);

    const editBtn = await screen.findByRole("button", { name: /Perbarui Rencana Rujukan/i }, { timeout: 10000 });
    fireEvent.click(editBtn);

    expect(screen.getByText("Perbarui Rencana Rujukan Kepulauan")).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /Simpan Perubahan/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/mothers/MOTH-001/referral-plan",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
  });
});
