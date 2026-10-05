import {
  createMidwifeDangerScreeningApi,
  createMotherDangerScreeningApi,
} from "@pfram/api-client";
import type {
  DangerFollowUpStatus,
  DangerScreeningStatus,
} from "@pfram/shared-types";
import { api } from "./auth";
import { formatIndonesianDate, formatIndonesianTime } from "./monitoring-api";

export const midwifeDangerScreeningApi = createMidwifeDangerScreeningApi(api);
export const motherDangerScreeningApi = createMotherDangerScreeningApi(api);

export function formatScreeningDate(isoDate: string): string {
  const dateStr = formatIndonesianDate(isoDate);
  const timeStr = formatIndonesianTime(isoDate);
  return timeStr ? `${dateStr} • ${timeStr} WIB` : dateStr;
}

export const SCREENING_STATUS_BADGES: Record<
  DangerScreeningStatus,
  { label: string; className: string }
> = {
  NO_DANGER_REPORTED: {
    label: "Tidak Ada Tanda Bahaya",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DANGER_SIGN_REPORTED: {
    label: "Perlu Perhatian (Gejala Terlaporkan)",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  REQUIRES_IMMEDIATE_CARE: {
    label: "Segera ke Fasilitas Kesehatan",
    className: "bg-red-50 text-red-700 border-red-200 font-semibold",
  },
};

export const FOLLOW_UP_STATUS_BADGES: Record<
  DangerFollowUpStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Menunggu Tindak Lanjut",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  CONTACTED: {
    label: "Sudah Dihubungi",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  REFERRED_TO_FACILITY: {
    label: "Dirujuk ke Faskes",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  ARRIVED_AT_FACILITY: {
    label: "Tiba di Faskes",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  RESOLVED: {
    label: "Selesai",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export const FOLLOW_UP_OPTIONS: Array<{
  value: DangerFollowUpStatus;
  label: string;
}> = [
  { value: "PENDING", label: "Menunggu Tindak Lanjut" },
  { value: "CONTACTED", label: "Sudah Dihubungi" },
  { value: "REFERRED_TO_FACILITY", label: "Dirujuk ke Fasilitas Kesehatan" },
  { value: "ARRIVED_AT_FACILITY", label: "Sudah Tiba di Fasilitas Kesehatan" },
  { value: "RESOLVED", label: "Selesai / Teratasi" },
];
