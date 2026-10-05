import {
  createMidwifeConsultationApi,
  createMotherConsultationApi,
  createMidwifeVideoConsultationApi,
  createMotherVideoConsultationApi,
} from "@pfram/api-client";
import type {
  ConsultationAttentionFlag,
  ConsultationAttentionUpdateInput,
  ConsultationMessageCreateInput,
  ConsultationMessageItem,
  ConsultationQuery,
  ConsultationStatusUpdateInput,
  ConsultationThreadStatus,
  ConsultationThreadSummary,
  VideoConsultationCreateInput,
  VideoConsultationItem,
  VideoConsultationQuery,
  VideoConsultationStatusUpdateInput,
  VideoConsultationUpdateInput,
} from "@pfram/shared-types";
import {
  DEFAULT_FACILITY_TIMEZONE,
  DEFAULT_FACILITY_TIMEZONE_LABEL,
  isValidMeetingUrl,
} from "@pfram/validation";
import { api } from "./auth";

export const midwifeConsultationApi = createMidwifeConsultationApi(api);
export const motherConsultationApi = createMotherConsultationApi(api);

export const getMotherConsultationThread = (): Promise<ConsultationThreadSummary> =>
  motherConsultationApi.getThread();

export const getMotherConsultationMessages = (
  query?: ConsultationQuery,
): Promise<{ items: ConsultationMessageItem[]; total: number }> =>
  motherConsultationApi.getMessages(query);

export const sendMotherConsultationMessage = (
  input: ConsultationMessageCreateInput,
): Promise<ConsultationMessageItem> =>
  motherConsultationApi.sendMessage(input);

export const markMotherConsultationRead = (): Promise<{ markedCount: number }> =>
  motherConsultationApi.markAsRead();

export const getMidwifeConsultationThreads = (query?: {
  status?: ConsultationThreadStatus | undefined;
  attention?: ConsultationAttentionFlag | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}): Promise<{
  items: ConsultationThreadSummary[];
  total: number;
  page?: number | undefined;
  limit?: number | undefined;
}> => midwifeConsultationApi.getThreads(query);

export const getMidwifeConsultationThread = (
  threadPublicId: string,
): Promise<ConsultationThreadSummary> =>
  midwifeConsultationApi.getThread(threadPublicId);

export const getMidwifeConsultationMessages = (
  threadPublicId: string,
  query?: ConsultationQuery,
): Promise<{ items: ConsultationMessageItem[]; total: number }> =>
  midwifeConsultationApi.getMessages(threadPublicId, query);

export const sendMidwifeConsultationMessage = (
  threadPublicId: string,
  input: ConsultationMessageCreateInput,
): Promise<ConsultationMessageItem> =>
  midwifeConsultationApi.sendMessage(threadPublicId, input);

export const updateMidwifeConsultationAttention = (
  threadPublicId: string,
  input: ConsultationAttentionUpdateInput,
): Promise<ConsultationThreadSummary> =>
  midwifeConsultationApi.updateAttention(threadPublicId, input);

export const updateMidwifeConsultationStatus = (
  threadPublicId: string,
  input: ConsultationStatusUpdateInput,
): Promise<ConsultationThreadSummary> =>
  midwifeConsultationApi.updateStatus(threadPublicId, input);

export const markMidwifeConsultationRead = (
  threadPublicId: string,
): Promise<{ markedCount: number }> =>
  midwifeConsultationApi.markAsRead(threadPublicId);

export const fetchAttachmentBlob = (
  attachmentPublicId: string,
): Promise<Blob> =>
  api.fetchBlob(`/consultation/attachments/${attachmentPublicId}/file`);

// ==========================================
// TAHAP 10 — VIDEO CALL API (WEB MIDWIFE & MOTHER)
// ==========================================

export const midwifeVideoConsultationApi = createMidwifeVideoConsultationApi(api);
export const motherVideoConsultationApi = createMotherVideoConsultationApi(api);

export const getMidwifeVideoConsultations = (
  query?: VideoConsultationQuery,
): Promise<{ items: VideoConsultationItem[]; total: number }> =>
  midwifeVideoConsultationApi.getAll(query);

export const createMidwifeVideoConsultation = (
  input: VideoConsultationCreateInput,
): Promise<VideoConsultationItem> => midwifeVideoConsultationApi.create(input);

export const updateMidwifeVideoConsultation = (
  publicId: string,
  input: VideoConsultationUpdateInput,
): Promise<VideoConsultationItem> =>
  midwifeVideoConsultationApi.update(publicId, input);

export const updateMidwifeVideoConsultationStatus = (
  publicId: string,
  input: VideoConsultationStatusUpdateInput,
): Promise<VideoConsultationItem> =>
  midwifeVideoConsultationApi.updateStatus(publicId, input);

export const getMotherUpcomingVideoConsultation = (): Promise<VideoConsultationItem | null> =>
  motherVideoConsultationApi.getUpcoming();

export const getMotherVideoConsultations = (
  query?: VideoConsultationQuery,
): Promise<{ items: VideoConsultationItem[]; total: number }> =>
  motherVideoConsultationApi.getAll(query);

export { isValidMeetingUrl };

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function formatMessageDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month} ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export function formatVideoDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const day = d.getDate().toString().padStart(2, "0");
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
    ];
    const month = monthNames[d.getMonth()] || "";
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export function formatMotherMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: DEFAULT_FACILITY_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.format(d).replace(":", ".");
    return `${parts} ${DEFAULT_FACILITY_TIMEZONE_LABEL}`;
  } catch {
    return "";
  }
}

export function formatMotherVideoDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: DEFAULT_FACILITY_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const formatted = formatter.format(d).replace(":", ".");
    return `${formatted} ${DEFAULT_FACILITY_TIMEZONE_LABEL}`;
  } catch {
    return "";
  }
}
