import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  AuthenticatedUser,
  ConsultationMessageItem,
  ConsultationThreadSummary,
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
export const mockFetchBlob = vi.fn();

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
    fetchBlob: (...args: unknown[]) => mockFetchBlob(...args),
    getAccessToken: () => "mock-access-token",
    getBaseUrl: () => "http://localhost:3200/api",
    setAccessToken: vi.fn(),
    refresh: vi.fn().mockResolvedValue(true),
  },
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { MidwifeConsultationPage } from "./MidwifeConsultationPage";
import { formatDuration, formatMessageDateTime } from "./consultation-api";
import { navigationForRole } from "./components";

const mockThreads: ConsultationThreadSummary[] = [
  {
    publicId: "TH-001",
    status: "OPEN",
    attentionFlag: "NEEDS_ATTENTION",
    unreadCount: 2,
    unreadMotherCount: 0,
    unreadMidwifeCount: 2,
    serviceStartTime: "08:00",
    serviceEndTime: "16:00",
    estimatedResponseMinutes: 30,
    createdAt: "2026-08-10T08:00:00.000Z",
    updatedAt: "2026-08-12T09:00:00.000Z",
    lastMessageAt: "2026-08-12T09:00:00.000Z",
    mother: {
      publicId: "MTH-001",
      fullName: "Ibu Nurhayati",
      phoneNumber: "081333333333",
    },
    midwife: {
      publicId: "MW-001",
      fullName: "Bidan Siti Rahma",
    },
    gestationalAge: { weeks: 24, days: 3 },
    trimester: 2,
    estimatedDueDate: "2026-12-15",
    lastMessage: {
      publicId: "MSG-001",
      senderRole: "MOTHER",
      messageType: "TEXT",
      text: "Selamat pagi Bu Bidan, kepala saya agak pusing.",
      createdAt: "2026-08-12T09:00:00.000Z",
    },
  },
  {
    publicId: "TH-002",
    status: "CLOSED",
    attentionFlag: "NORMAL",
    unreadCount: 0,
    unreadMotherCount: 0,
    unreadMidwifeCount: 0,
    serviceStartTime: "08:00",
    serviceEndTime: "16:00",
    estimatedResponseMinutes: 30,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
    lastMessageAt: "2026-08-05T10:00:00.000Z",
    mother: {
      publicId: "MTH-002",
      fullName: "Ibu Fatimah",
      phoneNumber: "081444444444",
    },
    midwife: {
      publicId: "MW-001",
      fullName: "Bidan Siti Rahma",
    },
    gestationalAge: { weeks: 14, days: 0 },
    trimester: 2,
    estimatedDueDate: "2027-02-01",
    lastMessage: {
      publicId: "MSG-002",
      senderRole: "MIDWIFE",
      messageType: "TEXT",
      text: "Terima kasih Ibu, jaga kesehatan selalu.",
      createdAt: "2026-08-05T10:00:00.000Z",
    },
  },
];

const mockMessages: ConsultationMessageItem[] = [
  {
    publicId: "MSG-001",
    threadPublicId: "TH-001",
    senderRole: "MOTHER",
    messageType: "TEXT",
    body: "Selamat pagi Bu Bidan, kepala saya agak pusing.",
    text: "Selamat pagi Bu Bidan, kepala saya agak pusing.",
    createdAt: "2026-08-12T09:00:00.000Z",
    readAt: null,
  },
];

function renderWithProviders(ui: React.ReactElement, initialPath = "/consultations") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/consultations" element={ui} />
          <Route path="/consultations/:threadPublicId" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Stage 9 — Web Midwife Teleconsultation Suite", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockRequest.mockReset();
    mockFetchBlob.mockReset();

    mockRequest.mockImplementation((path: string, options?: { method?: string; body?: string }) => {
      // 1. GET threads list
      if (path.startsWith("/midwife/consultations") && !path.includes("/messages") && !path.includes("/attention") && !path.includes("/status") && !path.includes("/read") && (!options || options.method === "GET")) {
        // If specific thread detail
        if (path === "/midwife/consultations/TH-001") {
          return Promise.resolve(mockThreads[0]);
        }
        if (path === "/midwife/consultations/TH-002") {
          return Promise.resolve(mockThreads[1]);
        }
        return Promise.resolve({
          items: mockThreads,
          total: mockThreads.length,
          page: 1,
          limit: 20,
          totalPages: 1,
        });
      }

      // 2. GET messages
      if (path === "/midwife/consultations/TH-001/messages") {
        return Promise.resolve({
          items: mockMessages,
          total: mockMessages.length,
        });
      }

      // 3. POST send message
      if (path === "/midwife/consultations/TH-001/messages" && options?.method === "POST") {
        const body = JSON.parse(options.body ?? "{}");
        return Promise.resolve({
          publicId: "MSG-003",
          threadPublicId: "TH-001",
          senderRole: "MIDWIFE",
          messageType: body.messageType ?? "TEXT",
          text: body.text,
          createdAt: new Date().toISOString(),
          readAt: null,
        });
      }

      // 4. POST mark as read
      if (path.endsWith("/read") && options?.method === "POST") {
        return Promise.resolve({ markedCount: 2 });
      }

      // 5. PATCH attention
      if (path.endsWith("/attention") && options?.method === "PATCH") {
        const body = JSON.parse(options.body ?? "{}");
        return Promise.resolve({
          ...mockThreads[0],
          attentionFlag: body.attentionFlag,
        });
      }

      // 6. PATCH status
      if (path.endsWith("/status") && options?.method === "PATCH") {
        const body = JSON.parse(options.body ?? "{}");
        return Promise.resolve({
          ...mockThreads[0],
          status: body.status,
        });
      }

      return Promise.reject(new Error(`Unhandled mock path: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Sidebar navigation bidan mencakup menu Konsultasi", () => {
    const midwifeLinks = navigationForRole("MIDWIFE");
    expect(midwifeLinks).toContainEqual(["/consultations", "Konsultasi"]);

    const adminLinks = navigationForRole("ADMIN");
    expect(adminLinks).not.toContainEqual(["/consultations", "Konsultasi"]);
    expect(adminLinks).toContainEqual(["/education", "Materi Edukasi"]);
  });

  it("2. Helper formatting durasi dan tanggal waktu akurat", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(184)).toBe("3:04");

    const d = new Date(2026, 7, 12, 9, 30);
    const formatted = formatMessageDateTime(d.toISOString());
    expect(formatted).toMatch(/^\d{2}\/\d{2}\s\d{2}:\d{2}$/);
    expect(formatMessageDateTime("invalid")).toBe("");
  });

  it("3. MidwifeConsultationPage me-render daftar thread dan badge konsultasi", async () => {
    renderWithProviders(<MidwifeConsultationPage />);

    expect(screen.getByText("Konsultasi Bidan")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Ibu Nurhayati")).toBeInTheDocument();
      expect(screen.getByText("Ibu Fatimah")).toBeInTheDocument();
    });

    // Periksa badge unread dan perhatian
    expect(screen.getByText("Perhatian")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Unread count
    expect(screen.getAllByText("Selesai").length).toBeGreaterThan(0); // Status CLOSED
  });

  it("4. Membuka thread menampilkan detail ibu, banner peringatan medis, dan riwayat pesan", async () => {
    renderWithProviders(<MidwifeConsultationPage />, "/consultations/TH-001");

    await waitFor(() => {
      expect(screen.getAllByText("Ibu Nurhayati").length).toBeGreaterThan(0);
      expect(screen.getByText(/Peringatan Keselamatan Medis/i)).toBeInTheDocument();
      expect(screen.getAllByText("Selamat pagi Bu Bidan, kepala saya agak pusing.").length).toBeGreaterThan(0);
    });

    // Periksa tombol aksi cepat kontak dan status
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Telepon")).toBeInTheDocument();
    expect(screen.getByText("Hapus Tanda Perhatian")).toBeInTheDocument();
    expect(screen.getByText("Tutup Konsultasi")).toBeInTheDocument();
  });

  it("5. Bidan dapat mengirim pesan balasan ke ibu hamil", async () => {
    renderWithProviders(<MidwifeConsultationPage />, "/consultations/TH-001");

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ketik balasan untuk ibu hamil...")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Ketik balasan untuk ibu hamil...");
    fireEvent.change(input, {
      target: { value: "Halo Bu Nurhayati, istirahat cukup ya dan ukur tekanan darah." },
    });

    const sendBtn = screen.getByRole("button", { name: "Kirim" });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/consultations/TH-001/messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            messageType: "TEXT",
            body: "Halo Bu Nurhayati, istirahat cukup ya dan ukur tekanan darah.",
          }),
        }),
      );
    });
  });

  it("6. Bidan dapat mengubah status perhatian dan status konsultasi", async () => {
    renderWithProviders(<MidwifeConsultationPage />, "/consultations/TH-001");

    await waitFor(() => {
      expect(screen.getByText("Hapus Tanda Perhatian")).toBeInTheDocument();
      expect(screen.getByText("Tutup Konsultasi")).toBeInTheDocument();
    });

    // Toggle attention
    fireEvent.click(screen.getByText("Hapus Tanda Perhatian"));
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/consultations/TH-001/attention",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ attentionFlag: "NORMAL" }),
        }),
      );
    });

    // Toggle status
    fireEvent.click(screen.getByText("Tutup Konsultasi"));
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/midwife/consultations/TH-001/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "CLOSED" }),
        }),
      );
    });
  });
});
