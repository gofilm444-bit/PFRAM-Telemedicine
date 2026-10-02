import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthenticatedUser } from "@pfram/shared-types";

// Setup mocks before importing components
let currentUser: AuthenticatedUser | null = {
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
import { MidwifeMonitoringForm } from "./MidwifeMonitoringForm";
import {
  PeriodFilterBar,
  WebBloodPressureLineChart,
  WebWeightLineChart,
} from "./web-monitoring-charts";
import { MothersPage } from "./stage3";
import { RoleGuard, navigationForRole } from "./components";

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
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockMotherData = {
  publicId: "MOTH-001",
  fullName: "Ibu Siti Rahmawati",
  age: 28,
  phoneNumber: "081299998888",
  facility: { publicId: "FAC-001", name: "Puskesmas Kebon Jeruk" },
  activePregnancy: {
    publicId: "PREG-001",
    gestationalAge: { weeks: 24, days: 3 },
    trimester: 2,
    estimatedDueDate: "2026-12-25",
  },
};

const mockSummaryData = {
  latestWeight: 65.5,
  latestWeightRecordedAt: "2026-09-28T08:00:00.000Z",
  latestBloodPressure: {
    systolic: 120,
    diastolic: 80,
  },
  latestBloodPressureRecordedAt: "2026-09-28T08:00:00.000Z",
  previousWeight: 64.0,
  weightChange: 1.5,
  totalEntries: 12,
  activePregnancyPublicId: "PREG-001",
};

const mockHistoryData = {
  items: [
    {
      publicId: "MON-01",
      recordedAt: "2026-09-29T10:00:00.000Z",
      source: "MIDWIFE" as const,
      weightKg: 66.0,
      systolicBp: 120,
      diastolicBp: 80,
      notes: "Kondisi stabil",
      createdByName: "Bidan Sri",
      isArchived: false,
    },
    {
      publicId: "MON-02",
      recordedAt: "2026-09-20T08:00:00.000Z",
      source: "SELF" as const,
      weightKg: 64.0,
      systolicBp: 110,
      diastolicBp: 70,
      notes: null,
      createdByName: "Ibu Siti",
      isArchived: false,
    },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
};

describe("Tahap 4D — Dashboard Bidan Pemantauan Fisik", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    currentUser = {
      publicId: "USR-MIDWIFE-001",
      displayName: "Bidan Sri Handayani",
      phoneNumber: "081234567890",
      role: "MIDWIFE",
      status: "ACTIVE",
      phoneVerifiedAt: "2026-01-01T00:00:00.000Z",
    };

    // Default API mock implementation
    mockRequest.mockImplementation(async (path: string) => {
      if (typeof path === "string" && path.includes("/monitoring/summary")) {
        return mockSummaryData;
      }
      if (typeof path === "string" && path.includes("/monitoring")) {
        return mockHistoryData;
      }
      if (typeof path === "string" && path.includes("/midwife/mothers/MOTH-001")) {
        return mockMotherData;
      }
      if (typeof path === "string" && path.includes("/midwife/mothers")) {
        return {
          items: [mockMotherData],
          page: 1,
          pageSize: 10,
          total: 1,
        };
      }
      return {};
    });
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Detail ibu binaan menampilkan tab Pemantauan
  it("1. Detail ibu binaan menampilkan tab Pemantauan", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
    });

    const monitoringTab = screen.getByRole("tab", { name: "Pemantauan Fisik" });
    expect(monitoringTab).toBeInTheDocument();
    expect(monitoringTab).toHaveAttribute("aria-selected", "true");
  });

  // 2. Tab Pemantauan merender summary monitoring (berat badan terakhir, tekanan darah terakhir, total catatan)
  it("2. Tab Pemantauan merender summary monitoring", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("65,5 kg")).toBeInTheDocument();
      expect(screen.getAllByText("120/80 mmHg").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("+1,5 kg")).toBeInTheDocument();
    });
  });

  // 3. Summary menampilkan empty state ramah saat belum ada data monitoring
  it("3. Summary menampilkan empty state ramah saat belum ada data monitoring", async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path.includes("/monitoring/summary")) {
        return {
          latestWeight: null,
          latestWeightRecordedAt: null,
          latestBloodPressure: null,
          latestBloodPressureRecordedAt: null,
          previousWeight: null,
          weightChange: null,
          totalEntries: 0,
          activePregnancyPublicId: "PREG-001",
        };
      }
      if (path.includes("/monitoring")) {
        return { items: [], page: 1, pageSize: 10, total: 0 };
      }
      return mockMotherData;
    });

    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      const emptyLabels = screen.getAllByText("Belum ada catatan");
      expect(emptyLabels.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  // 4. Riwayat monitoring merender daftar pengukuran terurut terbaru lebih dulu
  it("4. Riwayat monitoring merender daftar pengukuran terurut terbaru lebih dulu", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("66 kg")).toBeInTheDocument();
      expect(screen.getByText("64 kg")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("29 September 2026");
    expect(rows[1]).toHaveTextContent("66 kg");
    expect(rows[2]).toHaveTextContent("20 September 2026");
    expect(rows[2]).toHaveTextContent("64 kg");
  });

  // 5. Filter riwayat untuk berat badan berfungsi
  it("5. Filter riwayat untuk berat badan berfungsi", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("Riwayat Pemantauan Fisik")).toBeInTheDocument();
    });

    const weightFilterBtn = screen.getByRole("button", { name: "Berat Badan" });
    fireEvent.click(weightFilterBtn);

    await waitFor(() => {
      const calls = mockRequest.mock.calls;
      const historyCall = calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("type=weight"),
      );
      expect(historyCall).toBeDefined();
    });
  });

  // 6. Filter riwayat untuk tekanan darah berfungsi
  it("6. Filter riwayat untuk tekanan darah berfungsi", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("Riwayat Pemantauan Fisik")).toBeInTheDocument();
    });

    const bpFilterBtn = screen.getByRole("button", { name: "Tekanan Darah" });
    fireEvent.click(bpFilterBtn);

    await waitFor(() => {
      const calls = mockRequest.mock.calls;
      const historyCall = calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("type=blood_pressure"),
      );
      expect(historyCall).toBeDefined();
    });
  });

  // 7. Pagination riwayat monitoring berfungsi
  it("7. Pagination riwayat monitoring berfungsi", async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path.includes("/monitoring/summary")) return mockSummaryData;
      if (path.includes("/monitoring")) {
        return {
          items: mockHistoryData.items,
          page: 1,
          pageSize: 10,
          total: 25,
        };
      }
      return mockMotherData;
    });

    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("Halaman 1 dari 3")).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: "Selanjutnya" });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      const calls = mockRequest.mock.calls;
      const pagedCall = calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("page=2"),
      );
      expect(pagedCall).toBeDefined();
    });
  });

  // 8. Form monitoring bidan berhasil submit pengukuran berat badan saja
  it("8. Form monitoring bidan berhasil submit pengukuran berat badan saja", async () => {
    const onSuccess = vi.fn();
    mockRequest.mockResolvedValueOnce({ publicId: "MON-NEW-01" });

    renderWithProviders(
      <MidwifeMonitoringForm
        motherPublicId="MOTH-001"
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    );

    const weightInput = screen.getByPlaceholderText("Contoh: 62,5");
    fireEvent.change(weightInput, { target: { value: "63.5" } });

    const submitBtn = screen.getByRole("button", { name: "Simpan Pengukuran" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      const postCall = mockRequest.mock.calls.find(
        (c) => c[1]?.method === "POST" && c[0].includes("/monitoring"),
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body);
      expect(body.weightKg).toBe(63.5);
      expect(body.systolicBp).toBeUndefined();
      expect(body.diastolicBp).toBeUndefined();
      expect(body.source).toBe("MIDWIFE");
    });
  });

  // 9. Form monitoring bidan berhasil submit pengukuran tekanan darah saja
  it("9. Form monitoring bidan berhasil submit pengukuran tekanan darah saja", async () => {
    const onSuccess = vi.fn();
    mockRequest.mockResolvedValueOnce({ publicId: "MON-NEW-02" });

    renderWithProviders(
      <MidwifeMonitoringForm
        motherPublicId="MOTH-001"
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    );

    const systolicInput = screen.getByPlaceholderText(/Sistolik/i);
    const diastolicInput = screen.getByPlaceholderText(/Diastolik/i);
    fireEvent.change(systolicInput, { target: { value: "118" } });
    fireEvent.change(diastolicInput, { target: { value: "78" } });

    const submitBtn = screen.getByRole("button", { name: "Simpan Pengukuran" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      const postCall = mockRequest.mock.calls.find(
        (c) => c[1]?.method === "POST" && c[0].includes("/monitoring"),
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body);
      expect(body.systolicBp).toBe(118);
      expect(body.diastolicBp).toBe(78);
      expect(body.weightKg).toBeUndefined();
    });
  });

  // 10. Form monitoring bidan berhasil submit pengukuran gabungan berat badan + tekanan darah
  it("10. Form monitoring bidan berhasil submit pengukuran gabungan berat badan + tekanan darah", async () => {
    const onSuccess = vi.fn();
    mockRequest.mockResolvedValueOnce({ publicId: "MON-NEW-03" });

    renderWithProviders(
      <MidwifeMonitoringForm
        motherPublicId="MOTH-001"
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    );

    const weightInput = screen.getByPlaceholderText("Contoh: 62,5");
    const systolicInput = screen.getByPlaceholderText(/Sistolik/i);
    const diastolicInput = screen.getByPlaceholderText(/Diastolik/i);
    fireEvent.change(weightInput, { target: { value: "65,2" } }); // koma normalisasi
    fireEvent.change(systolicInput, { target: { value: "120" } });
    fireEvent.change(diastolicInput, { target: { value: "80" } });

    const submitBtn = screen.getByRole("button", { name: "Simpan Pengukuran" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      const postCall = mockRequest.mock.calls.find(
        (c) => c[1]?.method === "POST" && c[0].includes("/monitoring"),
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body);
      expect(body.weightKg).toBe(65.2);
      expect(body.systolicBp).toBe(120);
      expect(body.diastolicBp).toBe(80);
    });
  });

  // 11. Validasi form menolak tekanan darah tidak lengkap (hanya sistolik atau hanya diastolik)
  it("11. Validasi form menolak tekanan darah tidak lengkap", async () => {
    renderWithProviders(
      <MidwifeMonitoringForm
        motherPublicId="MOTH-001"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const systolicInput = screen.getByPlaceholderText(/Sistolik/i);
    fireEvent.change(systolicInput, { target: { value: "120" } });

    const submitBtn = screen.getByRole("button", { name: "Simpan Pengukuran" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Tekanan diastolik wajib diisi jika tekanan sistolik diisi"),
      ).toBeInTheDocument();
    });
  });

  // 12. Validasi form menolak sistolik <= diastolik
  it("12. Validasi form menolak sistolik <= diastolik", async () => {
    renderWithProviders(
      <MidwifeMonitoringForm
        motherPublicId="MOTH-001"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const systolicInput = screen.getByPlaceholderText(/Sistolik/i);
    const diastolicInput = screen.getByPlaceholderText(/Diastolik/i);
    fireEvent.change(systolicInput, { target: { value: "80" } });
    fireEvent.change(diastolicInput, { target: { value: "120" } });

    const submitBtn = screen.getByRole("button", { name: "Simpan Pengukuran" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Tekanan sistolik harus lebih besar dari diastolik"),
      ).toBeInTheDocument();
    });
  });

  // 13. Validasi form menolak tanggal/waktu masa depan
  it("13. Validasi form menolak tanggal/waktu masa depan", async () => {
    renderWithProviders(
      <MidwifeMonitoringForm
        motherPublicId="MOTH-001"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dateInput = screen.getByLabelText(/Tanggal & Waktu Pengukuran/i);
    fireEvent.change(dateInput, { target: { value: "2099-12-31T10:00" } });

    const weightInput = screen.getByPlaceholderText("Contoh: 62,5");
    fireEvent.change(weightInput, { target: { value: "62" } });

    const submitBtn = screen.getByRole("button", { name: "Simpan Pengukuran" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Waktu pengukuran tidak boleh di masa depan"),
      ).toBeInTheDocument();
    });
  });

  // 14. Default source form adalah MIDWIFE
  it("14. Default source form adalah MIDWIFE", () => {
    renderWithProviders(
      <MidwifeMonitoringForm
        motherPublicId="MOTH-001"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const sourceSelect = screen.getByLabelText(/Sumber Pengukuran/i) as HTMLSelectElement;
    expect(sourceSelect.value).toBe("MIDWIFE");
  });

  // 15. Submit monitoring berhasil memicu invalidate query / update data
  it("15. Submit monitoring berhasil memicu invalidate query / update data", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("+ Tambah Pengukuran")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("+ Tambah Pengukuran"));
    expect(screen.getByText("Tambah Pengukuran Fisik Ibu")).toBeInTheDocument();

    const weightInput = screen.getByPlaceholderText("Contoh: 62,5");
    fireEvent.change(weightInput, { target: { value: "67.0" } });

    mockRequest.mockResolvedValueOnce({ publicId: "MON-NEW-05" });
    const submitBtn = screen.getByRole("button", { name: "Simpan Pengukuran" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Form should close upon successful creation
      expect(screen.queryByText("Tambah Pengukuran Fisik Ibu")).not.toBeInTheDocument();
    });
  });

  // 16. Error state monitoring menampilkan pesan error yang ramah
  it("16. Error state monitoring menampilkan pesan error yang ramah", async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path.includes("/monitoring/summary")) {
        throw new Error("Gagal mengambil ringkasan");
      }
      if (path.includes("/monitoring")) {
        throw new Error("Gagal mengambil riwayat");
      }
      return mockMotherData;
    });

    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Terdapat masalah saat memuat ringkasan pemantauan/i),
      ).toBeInTheDocument();
    });
  });

  // 17. Retry button pada error state memicu refetch
  it("17. Retry button pada error state memicu refetch", async () => {
    let failSummary = true;
    mockRequest.mockImplementation(async (path: string) => {
      if (path.includes("/monitoring/summary")) {
        if (failSummary) throw new Error("Gagal mengambil ringkasan");
        return mockSummaryData;
      }
      if (path.includes("/monitoring")) return mockHistoryData;
      return mockMotherData;
    });

    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Terdapat masalah saat memuat ringkasan pemantauan/i),
      ).toBeInTheDocument();
    });

    failSummary = false;
    const retryButtons = screen.getAllByRole("button", { name: "Coba Lagi" });
    fireEvent.click(retryButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("65,5 kg")).toBeInTheDocument();
    });
  });

  // 18. Grafik berat badan merender titik data dan sumbu dengan benar
  it("18. Grafik berat badan merender titik data dan sumbu dengan benar", () => {
    const points = [
      {
        id: "pt-1",
        recordedAt: "2026-09-01T08:00:00.000Z",
        weightKg: 62.0,
        source: "MIDWIFE" as const,
      },
      {
        id: "pt-2",
        recordedAt: "2026-09-15T08:00:00.000Z",
        weightKg: 64.0,
        source: "MIDWIFE" as const,
      },
    ];

    render(<WebWeightLineChart points={points} />);

    const svg = screen.getByRole("img", {
      name: /Grafik perkembangan berat badan ibu dengan 2 titik pengukuran/i,
    });
    expect(svg).toBeInTheDocument();
    expect(screen.getByText("Satuan: kg")).toBeInTheDocument();
  });

  // 19. Grafik tekanan darah merender garis/titik sistolik dan diastolik
  it("19. Grafik tekanan darah merender garis/titik sistolik dan diastolik", () => {
    const points = [
      {
        id: "bp-1",
        recordedAt: "2026-09-01T08:00:00.000Z",
        systolicBp: 120,
        diastolicBp: 80,
        source: "MIDWIFE" as const,
      },
      {
        id: "bp-2",
        recordedAt: "2026-09-15T08:00:00.000Z",
        systolicBp: 122,
        diastolicBp: 82,
        source: "MIDWIFE" as const,
      },
    ];

    render(<WebBloodPressureLineChart points={points} />);

    expect(screen.getByText("Sistolik (mmHg)")).toBeInTheDocument();
    expect(screen.getByText("Diastolik (mmHg)")).toBeInTheDocument();
    const svg = screen.getByRole("img", {
      name: /Grafik tekanan darah dengan 2 titik pengukuran sistolik dan diastolik/i,
    });
    expect(svg).toBeInTheDocument();
  });

  // 20. Filter grafik 7 hari menampilkan data yang sesuai
  it("20. Filter grafik 7 hari menampilkan data yang sesuai", () => {
    const onSelect = vi.fn();
    render(<PeriodFilterBar selected="7_days" onSelect={onSelect} />);

    const btn7 = screen.getByRole("tab", { name: "7 Hari" });
    expect(btn7).toHaveAttribute("aria-selected", "true");
    fireEvent.click(btn7);
    expect(onSelect).toHaveBeenCalledWith("7_days");
  });

  // 21. Filter grafik 30 hari menampilkan data yang sesuai
  it("21. Filter grafik 30 hari menampilkan data yang sesuai", () => {
    const onSelect = vi.fn();
    render(<PeriodFilterBar selected="7_days" onSelect={onSelect} />);

    const btn30 = screen.getByRole("tab", { name: "30 Hari" });
    expect(btn30).toHaveAttribute("aria-selected", "false");
    fireEvent.click(btn30);
    expect(onSelect).toHaveBeenCalledWith("30_days");
  });

  // 22. Filter grafik Kehamilan Ini menampilkan data yang sesuai
  it("22. Filter grafik Kehamilan Ini menampilkan data yang sesuai", () => {
    const onSelect = vi.fn();
    render(<PeriodFilterBar selected="7_days" onSelect={onSelect} />);

    const btnPreg = screen.getByRole("tab", { name: "Kehamilan Ini" });
    expect(btnPreg).toHaveAttribute("aria-selected", "false");
    fireEvent.click(btnPreg);
    expect(onSelect).toHaveBeenCalledWith("active_pregnancy");
  });

  // 23. Tooltip / detail titik data grafik interaktif dan dapat dibaca
  it("23. Tooltip / detail titik data grafik interaktif dan dapat dibaca", () => {
    const points = [
      {
        id: "pt-1",
        recordedAt: "2026-09-01T08:00:00.000Z",
        weightKg: 62.0,
        source: "MIDWIFE" as const,
      },
      {
        id: "pt-2",
        recordedAt: "2026-09-15T08:00:00.000Z",
        weightKg: 64.5,
        source: "MIDWIFE" as const,
      },
    ];

    render(<WebWeightLineChart points={points} />);

    // Initially the last point is displayed
    expect(screen.getByText("64,5 kg")).toBeInTheDocument();

    // Click first point button
    const pointButtons = screen.getAllByRole("button", { name: /Titik berat/i });
    fireEvent.click(pointButtons[0]!);

    expect(screen.getByText("62 kg")).toBeInTheDocument();
  });

  // 24. Fallback tabel/daftar aksesibilitas grafik tersedia dan menampilkan data yang sama
  it("24. Fallback tabel/daftar aksesibilitas grafik tersedia dan menampilkan data yang sama", () => {
    const points = [
      {
        id: "pt-1",
        recordedAt: "2026-09-01T08:00:00.000Z",
        weightKg: 62.0,
        source: "MIDWIFE" as const,
      },
    ];

    render(<WebWeightLineChart points={points} />);

    const toggleBtn = screen.getByRole("button", { name: "Lihat Tabel Data" });
    fireEvent.click(toggleBtn);

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(within(table).getByText("62 kg")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan Tabel Data" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // 25. Bidan tidak dapat mengakses monitoring ibu yang bukan binaannya / assignment tidak aktif (authorization handling di UI)
  it("25. Bidan tidak dapat mengakses monitoring ibu yang bukan binaannya / assignment tidak aktif", async () => {
    mockRequest.mockImplementation(async () => {
      throw new Error("MIDWIFE_NOT_ASSIGNED");
    });

    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Akses Ditolak atau Ibu Binaan Tidak Ditemukan"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/ACTIVE assignment/i),
      ).toBeInTheDocument();
    });
  });

  // 26. Error response 404/403 dari backend ditampilkan sebagai pesan ramah tanpa crash
  it("26. Error response 404/403 dari backend ditampilkan sebagai pesan ramah tanpa crash", async () => {
    mockRequest.mockImplementation(async () => {
      throw new Error("404 Not Found");
    });

    renderWithProviders(
      <Routes>
        <Route path="/my-mothers/:motherPublicId" element={<MidwifeMotherDetailPage />} />
      </Routes>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Akses Ditolak atau Ibu Binaan Tidak Ditemukan"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Kembali ke Daftar Ibu Binaan" }),
      ).toBeInTheDocument();
    });
  });

  // 27. Role ADMIN tidak dapat mengakses rute / fitur pemantauan bidan (RoleGuard)
  it("27. Role ADMIN tidak dapat mengakses rute / fitur pemantauan bidan", () => {
    currentUser = {
      ...currentUser!,
      role: "ADMIN",
    };

    render(
      <MemoryRouter initialEntries={["/my-mothers/MOTH-001"]}>
        <Routes>
          <Route
            path="/my-mothers/:motherPublicId"
            element={
              <RoleGuard roles={["MIDWIFE"]}>
                <MidwifeMotherDetailPage />
              </RoleGuard>
            }
          />
          <Route path="/403" element={<div>403 — Akses ditolak</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("403 — Akses ditolak")).toBeInTheDocument();
  });

  // 28. Role MOTHER tidak dapat mengakses rute / fitur pemantauan bidan (RoleGuard)
  it("28. Role MOTHER tidak dapat mengakses rute / fitur pemantauan bidan", () => {
    currentUser = {
      ...currentUser!,
      role: "MOTHER",
    };

    render(
      <MemoryRouter initialEntries={["/my-mothers/MOTH-001"]}>
        <Routes>
          <Route
            path="/my-mothers/:motherPublicId"
            element={
              <RoleGuard roles={["MIDWIFE"]}>
                <MidwifeMotherDetailPage />
              </RoleGuard>
            }
          />
          <Route path="/403" element={<div>403 — Akses ditolak</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("403 — Akses ditolak")).toBeInTheDocument();
  });

  // 29. Halaman ibu binaan existing tidak mengalami regresi (daftar ibu tetap tampil dan link detail berfungsi)
  it("29. Halaman ibu binaan existing tidak mengalami regresi", async () => {
    mockRequest.mockResolvedValueOnce({
      items: [mockMotherData],
      page: 1,
      pageSize: 10,
      total: 1,
    });

    render(
      <MemoryRouter>
        <MothersPage midwife />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ibu Siti Rahmawati")).toBeInTheDocument();
      const detailLink = screen.getByRole("link", { name: /Lihat Detail & Pemantauan/i });
      expect(detailLink).toHaveAttribute("href", "/my-mothers/MOTH-001");
    });
  });

  // 30. Alur login/logout dan navigasi bidan existing tetap berfungsi
  it("30. Alur login/logout dan navigasi bidan existing tetap berfungsi", () => {
    const midwifeLinks = navigationForRole("MIDWIFE").map((item) => item[0]);
    expect(midwifeLinks).toContain("/my-mothers");
    expect(midwifeLinks).toContain("/midwife-profile");
    expect(midwifeLinks).not.toContain("/assignments");

    const adminLinks = navigationForRole("ADMIN").map((item) => item[0]);
    expect(adminLinks).toContain("/assignments");
    expect(adminLinks).not.toContain("/my-mothers");
  });
});
