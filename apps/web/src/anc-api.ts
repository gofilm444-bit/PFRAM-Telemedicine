import { createMidwifeAncApi } from "@pfram/api-client";
import { api } from "./auth";
import { formatIndonesianDate, formatIndonesianTime } from "./monitoring-api";

export const midwifeAncApi = createMidwifeAncApi(api);

export function formatAncDateShort(isoDate: string): string {
  return formatIndonesianDate(isoDate);
}

export function formatAncDateTime(isoDate: string): string {
  const dateStr = formatIndonesianDate(isoDate);
  const timeStr = formatIndonesianTime(isoDate);
  return timeStr ? `${dateStr} • ${timeStr} WIB` : dateStr;
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
