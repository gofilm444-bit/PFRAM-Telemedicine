import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthenticatedUser, EducationArticle } from "@pfram/shared-types";

const currentAdmin: AuthenticatedUser = {
  publicId: "USR-ADMIN-001",
  displayName: "Admin Dinkes",
  phoneNumber: "081111111111",
  role: "ADMIN",
  status: "ACTIVE",
  phoneVerifiedAt: "2026-01-01T00:00:00.000Z",
};

export const mockRequest = vi.fn();

vi.mock("./auth", () => ({
  useAuth: () => ({
    user: currentAdmin,
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

import { AdminEducationListPage } from "./AdminEducationListPage";
import { navigationForRole } from "./components";

const mockArticles: EducationArticle[] = [
  {
    publicId: "ART-001",
    slug: "makanan-lokal-kaya-gizi",
    title: "Pemanfaatan Makanan Lokal Kaya Gizi untuk Ibu Hamil",
    summary: "Ikan cakalang, kelor, sagu, dan pepaya untuk gizi ibu hamil.",
    content: "## Gizi Lokal\n\nIkan cakalang sangat kaya protein.",
    category: "NUTRITION",
    trimester: "ALL",
    featured: true,
    sourceName: "Buku KIA Kemenkes RI Edisi 2024",
    sourceReference: "Bab Gizi Halaman 12",
    published: true,
    sortOrder: 1,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    archivedAt: null,
  },
  {
    publicId: "ART-002",
    slug: "mual-muntah-trimester-1",
    title: "Mengenal dan Mengatasi Mual Muntah pada Awal Kehamilan",
    summary: "Panduan mengatasi emesis gravidarum secara aman.",
    content: "## Mual Muntah\n\nMakan porsi kecil tapi sering.",
    category: "NAUSEA",
    trimester: "TRIMESTER_1",
    featured: false,
    sourceName: "Buku KIA Kemenkes RI Edisi 2024",
    sourceReference: null,
    published: false,
    sortOrder: 2,
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
    archivedAt: null,
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/education"]}>
        <Routes>
          <Route path="/education" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Stage 7 — Web Admin Education Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockImplementation((path: string, options?: RequestInit) => {
      if (path.includes("/admin/education") && (!options || options.method === "GET")) {
        return Promise.resolve({
          items: mockArticles,
          page: 1,
          pageSize: 20,
          total: mockArticles.length,
        });
      }
      if (path.includes("/admin/education") && options?.method === "POST") {
        const base = mockArticles[0]!;
        return Promise.resolve({
          ...base,
          publicId: "ART-NEW-999",
          slug: "artikel-baru",
        });
      }
      if (path.includes("/admin/education/") && options?.method === "PATCH") {
        const base = mockArticles[0]!;
        return Promise.resolve({
          ...base,
          published: !base.published,
        });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Menu navigasi Admin mencakup link Materi Edukasi", () => {
    const adminLinks = navigationForRole("ADMIN");
    const educationLink = adminLinks.find(([path]) => path === "/education");
    expect(educationLink).toBeDefined();
    expect(educationLink![1]).toBe("Materi Edukasi");
  });

  it("2. AdminEducationListPage me-render judul dan tabel artikel", async () => {
    renderWithProviders(<AdminEducationListPage />);

    expect(
      screen.getByText("Kelola Edukasi & Gizi Kehamilan"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("Pemanfaatan Makanan Lokal Kaya Gizi untuk Ibu Hamil"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Mengenal dan Mengatasi Mual Muntah pada Awal Kehamilan"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("/makanan-lokal-kaya-gizi")).toBeInTheDocument();
    expect(screen.getByText("⭐ Pilihan")).toBeInTheDocument();
    expect(screen.getByText("✓ Tayang")).toBeInTheDocument();
    expect(screen.getByText("○ Draf")).toBeInTheDocument();
  });

  it("3. Filter pencarian menyaring daftar artikel", async () => {
    renderWithProviders(<AdminEducationListPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Pemanfaatan Makanan Lokal Kaya Gizi untuk Ibu Hamil"),
      ).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Cari judul, slug, atau ringkasan...",
    );
    fireEvent.change(searchInput, { target: { value: "mual" } });

    expect(
      screen.getByText("Mengenal dan Mengatasi Mual Muntah pada Awal Kehamilan"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Pemanfaatan Makanan Lokal Kaya Gizi untuk Ibu Hamil"),
    ).not.toBeInTheDocument();
  });

  it("4. Membuka modal pembuatan artikel baru", async () => {
    renderWithProviders(<AdminEducationListPage />);

    const createBtn = screen.getByText("+ Buat Artikel Baru");
    fireEvent.click(createBtn);

    expect(screen.getByText("Buat Artikel Edukasi Baru")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("kebutuhan-gizi-trimester-1")).toBeInTheDocument();
    expect(screen.getByText("Tandai sebagai Artikel Unggulan (⭐ Featured)")).toBeInTheDocument();
  });

  it("5. Tombol toggle publish memanggil API update", async () => {
    renderWithProviders(<AdminEducationListPage />);

    await waitFor(() => {
      expect(screen.getByText("✓ Tayang")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByText("✓ Tayang");
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/admin/education/ART-001"),
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });
  });
});
