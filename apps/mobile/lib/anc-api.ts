import { createMotherAncApi } from "@pfram/api-client";
import {
  DEFAULT_FACILITY_TIMEZONE,
  DEFAULT_FACILITY_TIMEZONE_LABEL,
  getCalendarDateInTimezone,
  isAncAppointmentDayArrived,
} from "@pfram/validation";
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

export {
  DEFAULT_FACILITY_TIMEZONE,
  DEFAULT_FACILITY_TIMEZONE_LABEL,
  getCalendarDateInTimezone,
  isAncAppointmentDayArrived,
};

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

export function formatAncDateShort(
  isoDate: string,
  timeZone: string = DEFAULT_FACILITY_TIMEZONE,
): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat("id-ID", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return isoDate;
  }
}

export function formatAncTime(
  isoDate: string,
  timeZone: string = DEFAULT_FACILITY_TIMEZONE,
): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    const timeStr = new Intl.DateTimeFormat("id-ID", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(d)
      .replace(":", ".");
    return `${timeStr} ${DEFAULT_FACILITY_TIMEZONE_LABEL}`;
  } catch {
    return "";
  }
}

export function formatAncDateTime(
  isoDate: string,
  timeZone: string = DEFAULT_FACILITY_TIMEZONE,
): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const dateStr = new Intl.DateTimeFormat("id-ID", {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    const timeStr = formatAncTime(isoDate, timeZone);
    return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
  } catch {
    return isoDate;
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
