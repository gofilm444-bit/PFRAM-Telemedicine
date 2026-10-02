import {
  createMotherConsultationApi,
  createMotherVideoConsultationApi,
  createMotherHomeVisitApi,
} from "@pfram/api-client";
import type {
  ConsultationMessageCreateInput,
  ConsultationMessageItem,
  ConsultationQuery,
  ConsultationThreadSummary,
  HomeVisitItem,
  HomeVisitQuery,
} from "@pfram/shared-types";
import { api } from "./auth";

export const consultationApi = createMotherConsultationApi(api);
export const videoConsultationApi = createMotherVideoConsultationApi(api);
export const homeVisitApi = createMotherHomeVisitApi(api);

export const getMotherConsultationThread = (): Promise<ConsultationThreadSummary> =>
  consultationApi.getThread();

export const getMotherConsultationMessages = (
  query?: ConsultationQuery,
): Promise<{ items: ConsultationMessageItem[]; total: number }> =>
  consultationApi.getMessages(query);

export const sendMotherConsultationMessage = (
  input: ConsultationMessageCreateInput,
): Promise<ConsultationMessageItem> => consultationApi.sendMessage(input);

export const markMotherConsultationRead = (): Promise<{ markedCount: number }> =>
  consultationApi.markAsRead();

export const getMotherHomeVisits = (
  query?: HomeVisitQuery,
): Promise<{ items: HomeVisitItem[]; total: number }> =>
  homeVisitApi.getHomeVisits(query);

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function formatMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export function isValidMeetingUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatMeetingDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return "";
  }
}
