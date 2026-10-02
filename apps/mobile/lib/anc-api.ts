import { createMotherAncApi } from "@pfram/api-client";
import type {
  AdherenceSummary,
  AncRuleSet,
  AncSchedule,
  MotherReminderSettings,
  PaginatedResponse,
  Reminder,
  ReminderSettingsUpdateInput,
  ReminderSnoozeInput,
} from "@pfram/shared-types";
import { api } from "./auth";

export const ancApi = createMotherAncApi(api);

export const getMotherUpcomingAnc = (): Promise<AncSchedule | null> =>
  ancApi.getUpcomingSchedule();

export const getMotherAncSchedules = (query?: {
  status?: string;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}): Promise<PaginatedResponse<AncSchedule>> => ancApi.getSchedules(query);

export const getMotherAncDetail = (publicId: string): Promise<AncSchedule> =>
  ancApi.getScheduleDetail(publicId);

export const confirmAncAttendance = (publicId: string): Promise<AncSchedule> =>
  ancApi.confirmAttendance(publicId);

export const getMotherReminders = (query?: {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Reminder>> => ancApi.getReminders(query);

export const getMotherReminderSettings = (): Promise<MotherReminderSettings> =>
  ancApi.getReminderSettings();

export const updateMotherReminderSettings = (
  input: ReminderSettingsUpdateInput,
): Promise<MotherReminderSettings> => ancApi.updateReminderSettings(input);

export const completeMotherReminder = (publicId: string): Promise<Reminder> =>
  ancApi.completeReminder(publicId);

export const snoozeMotherReminder = (
  publicId: string,
  input: ReminderSnoozeInput,
): Promise<Reminder> => ancApi.snoozeReminder(publicId, input);

export const getMotherAdherenceSummary = (): Promise<AdherenceSummary> =>
  ancApi.getAdherenceSummary();

export const getMotherRecommendations = (): Promise<{
  estimatedDueDate: string | null;
  recommendations: unknown[];
  ruleSet: AncRuleSet;
}> => ancApi.getRecommendations();

export function formatAncDateShort(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
}

export function formatAncTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m} WIB`;
  } catch {
    return "";
  }
}

export const ANC_STATUS_BADGES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  SCHEDULED: { label: "Terjadwal", bg: "#EFF6FF", text: "#1D4ED8" },
  COMPLETED: { label: "Sudah Hadir", bg: "#ECFDF5", text: "#047857" },
  MISSED: { label: "Belum Dikonfirmasi", bg: "#FFFBEB", text: "#B45309" },
  CANCELLED: { label: "Dibatalkan", bg: "#F1F5F9", text: "#64748B" },
};
