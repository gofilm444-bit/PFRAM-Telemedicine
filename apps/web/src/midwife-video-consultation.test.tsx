import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  AuthenticatedUser,
  ConsultationMessageItem,
  ConsultationThreadSummary,
  VideoConsultationItem,
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
import { formatVideoDateTime, isValidMeetingUrl } from "./consultation-api";
import { midwifeVideoConsultationKeys } from "./consultation-queries";

const mockThread: ConsultationThreadSummary = {
  publicId: "TH-001",
  status: "OPEN",
  attentionFlag: "NORMAL",
  unreadCount: 0,
  unreadMotherCount: 0,
  unreadMidwifeCount: 0,
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
    text: "Halo Bu Bidan.",
    createdAt: "2026-08-12T09:00:00.000Z",
  },
};

const mockVideoConsultation: VideoConsultationItem = {
  publicId: "VC-001",
  motherPublicId: "MTH-001",
  motherName: "Ibu Nurhayati",
  midwifePublicId: "MW-001",
  midwifeName: "Bidan Siti Rahma",
  pregnancyPublicId: "PRG-001",
  threadPublicId: "TH-001",
  scheduledAt: "2026-08-20T10:00:00.000Z",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  title: "Konsultasi Video Ibu Hamil",
  notes: "Siapkan buku KIA ya bu",
  status: "SCHEDULED",
  createdAt: "2026-08-15T08:00:00.000Z",
  updatedAt: "2026-08-15T08:00:00.000Z",
};

function renderWithProviders(ui: React.ReactElement, initialRoute = "/consultations") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/consultations" element={ui} />
          <Route path="/consultations/:threadPublicId" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Stage 10 — Web Midwife Video Consultation Suite", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockRequest.mockReset();
    mockFetchBlob.mockReset();

    mockRequest.mockImplementation((path: string, options?: { method?: string; body?: string }) => {
      // 1. Thread queries
      if (path.startsWith("/midwife/consultations") && !path.includes("/messages") && (!options || options.method === "GET")) {
        if (path === "/midwife/consultations/TH-001") {
          return Promise.resolve(mockThread);
        }
        return Promise.resolve({
          items: [mockThread],
          total: 1,
          page: 1,
          limit: 20,
        });
      }

      // 2. Messages
      if (path === "/midwife/consultations/TH-001/messages") {
        return Promise.resolve({
          items: [
            {
              publicId: "MSG-001",
              threadPublicId: "TH-001",
              senderRole: "MOTHER",
              messageType: "TEXT",
              text: "Halo Bu Bidan.",
              createdAt: "2026-08-12T09:00:00.000Z",
            } as ConsultationMessageItem,
          ],
          total: 1,
        });
      }

      // 3. Mark read
      if (path.endsWith("/read") && options?.method === "POST") {
        return Promise.resolve({ markedCount: 0 });
      }

      // 4. Video consultation list
      if (path.startsWith("/midwife/video-consultations") && (!options || options.method === "GET")) {
        return Promise.resolve({
          items: [mockVideoConsultation],
          total: 1,
        });
      }

      // 5. Video consultation create
      if (path === "/midwife/video-consultations" && options?.method === "POST") {
        const body = JSON.parse(options.body ?? "{}");
        return Promise.resolve({
          ...mockVideoConsultation,
          ...body,
          publicId: "VC-NEW-999",
        });
      }

      // 6. Video consultation update status
      if (path === `/midwife/video-consultations/${mockVideoConsultation.publicId}/status` && options?.method === "PATCH") {
        const body = JSON.parse(options.body ?? "{}");
        return Promise.resolve({
          ...mockVideoConsultation,
          status: body.status,
          completedAt: body.status === "COMPLETED" ? new Date().toISOString() : null,
          cancelledAt: body.status === "CANCELLED" ? new Date().toISOString() : null,
        });
      }

      return Promise.reject(new Error(`Unhandled mock path: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. isValidMeetingUrl memvalidasi protokol HTTPS dan menolak scheme tidak aman", () => {
    expect(isValidMeetingUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isValidMeetingUrl("https://meet.jit.si/polsand-room-123")).toBe(true);
    expect(isValidMeetingUrl("https://teams.microsoft.com/l/meetup-join")).toBe(true);

    expect(isValidMeetingUrl("http://insecure-site.com")).toBe(false);
    expect(isValidMeetingUrl("javascript:alert(1)")).toBe(false);
    expect(isValidMeetingUrl("data:text/html,hack")).toBe(false);
    expect(isValidMeetingUrl("vbscript:test")).toBe(false);
    expect(isValidMeetingUrl("")).toBe(false);
  });

  it("2. formatVideoDateTime memformat tanggal dan jam ke bahasa Indonesia", () => {
    const d = new Date(2026, 7, 20, 10, 0); // 20 Ags 2026, 10:00
    const formatted = formatVideoDateTime(d.toISOString());
    expect(formatted).toMatch(/20 Ags 2026, 10:00/);
    expect(formatVideoDateTime("invalid-date")).toBe("");
  });

  it("3. midwifeVideoConsultationKeys menghasilkan react-query keys yang konsisten", () => {
    expect(midwifeVideoConsultationKeys.all).toEqual(["midwife-video-consultation"]);
    expect(midwifeVideoConsultationKeys.list()).toEqual([
      "midwife-video-consultation",
      "list",
      "all",
    ]);
    expect(midwifeVideoConsultationKeys.list({ status: "SCHEDULED" })).toEqual([
      "midwife-video-consultation",
      "list",
      { status: "SCHEDULED" },
    ]);
  });

  it("4. MidwifeConsultationPage me-render banner jadwal video call untuk ibu aktif", async () => {
    renderWithProviders(<MidwifeConsultationPage />, "/consultations/TH-001");

    await waitFor(() => {
      expect(screen.getByText("Konsultasi Video Ibu Hamil")).toBeInTheDocument();
      expect(screen.getByText("TERJADWAL")).toBeInTheDocument();
      expect(screen.getByText("Buka Link Video Call")).toBeInTheDocument();
      expect(screen.getByText("Ubah Jadwal")).toBeInTheDocument();
      expect(screen.getByText("Tandai Selesai")).toBeInTheDocument();
      expect(screen.getByText("Batalkan")).toBeInTheDocument();
    });

    const link = screen.getByText("Buka Link Video Call").closest("a");
    expect(link).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("5. Bidan dapat membuka modal jadwal video call dan menyimpannya", async () => {
    renderWithProviders(<MidwifeConsultationPage />, "/consultations/TH-001");

    await waitFor(() => {
      expect(screen.getByText("Ubah Jadwal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Ubah Jadwal"));

    await waitFor(() => {
      expect(screen.getByText("Ubah Jadwal Video Call")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://meet.google.com/abc-defg-hij")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Simpan Jadwal" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });
  });
});
