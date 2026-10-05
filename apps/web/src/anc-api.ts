import { createMidwifeAncApi, createMotherAncApi } from "@pfram/api-client";
import { api } from "./auth";
import {
  DEFAULT_FACILITY_TIMEZONE,
  DEFAULT_FACILITY_TIMEZONE_LABEL,
} from "@pfram/validation";

export const midwifeAncApi = createMidwifeAncApi(api);
export const motherAncApi = createMotherAncApi(api);

export function formatAncDateShort(
  isoDate: string,
  timeZone: string = DEFAULT_FACILITY_TIMEZONE,
): string {
  if (!isoDate) return "-";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return new Intl.DateTimeFormat("id-ID", {
      timeZone,
      day: "numeric",
      month: "long",
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
  if (!isoDate || !isoDate.includes("T")) return "";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("id-ID", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(d)
      .replace(":", ".");
  } catch {
    return "";
  }
}

export function formatAncDateTime(
  isoDate: string,
  timeZone: string = DEFAULT_FACILITY_TIMEZONE,
): string {
  const dateStr = formatAncDateShort(isoDate, timeZone);
  const timeStr = formatAncTime(isoDate, timeZone);
  return timeStr ? `${dateStr} · ${timeStr} ${DEFAULT_FACILITY_TIMEZONE_LABEL}` : dateStr;
}

export const ANC_VISIT_TYPE_OPTIONS: Array<{ value: "ANC" | "DOCTOR_ANC"; label: string }> = [
  { value: "ANC", label: "Pemeriksaan Rutin Bidan (ANC)" },
  { value: "DOCTOR_ANC", label: "Pemeriksaan Dokter (Trimester 1 / 3)" },
];

export const ANC_STATUS_BADGES: Record<
  string,
  { label: string; className: string }
> = {
  SCHEDULED: {
    label: "Terjadwal",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  COMPLETED: {
    label: "Sudah Hadir",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  MISSED: {
    label: "Belum Dikonfirmasi",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  },
};
