import {
  createMidwifeMonitoringApi,
  createMotherMonitoringApi,
} from "@pfram/api-client";
import type {
  BloodPressureChartPoint,
  MonitoringCreateInput,
  MonitoringEntry,
  MonitoringListItem,
  MonitoringPeriodFilter,
  MonitoringQuery,
  MonitoringSource,
  MonitoringSummary,
  PaginatedResponse,
  PregnancySummary,
  WeightChartPoint,
} from "@pfram/shared-types";
import { calculateGestationalAge } from "@pfram/validation";
import { api } from "./auth";

export const midwifeMonitoringApi = createMidwifeMonitoringApi(api);
export const motherMonitoringApi = createMotherMonitoringApi(api);

export const getMidwifeMotherMonitoringList = (
  motherPublicId: string,
  query?: MonitoringQuery,
): Promise<PaginatedResponse<MonitoringListItem>> =>
  midwifeMonitoringApi.getMidwifeMotherMonitoringList(motherPublicId, query);

export const getMidwifeMotherMonitoringDetail = (
  motherPublicId: string,
  publicId: string,
): Promise<MonitoringEntry> =>
  midwifeMonitoringApi.getMidwifeMotherMonitoringDetail(motherPublicId, publicId);

export const getMidwifeMotherMonitoringSummary = (
  motherPublicId: string,
): Promise<MonitoringSummary> =>
  midwifeMonitoringApi.getMidwifeMotherMonitoringSummary(motherPublicId);

export const createMidwifeMotherMonitoring = (
  motherPublicId: string,
  input: MonitoringCreateInput,
): Promise<MonitoringEntry> =>
  midwifeMonitoringApi.createMidwifeMotherMonitoring(motherPublicId, input);

export const MONITORING_SOURCES: Array<{
  value: MonitoringSource;
  label: string;
}> = [
  { value: "MIDWIFE", label: "Bidan" },
  { value: "SELF", label: "Mandiri" },
  { value: "POSYANDU", label: "Posyandu" },
  { value: "PUSKESMAS", label: "Puskesmas" },
  { value: "HOSPITAL", label: "Rumah Sakit" },
  { value: "CLINIC", label: "Klinik" },
  { value: "OTHER", label: "Lainnya" },
];

export const SOURCE_LABELS: Record<MonitoringSource, string> = {
  MIDWIFE: "Bidan",
  SELF: "Mandiri",
  POSYANDU: "Posyandu",
  PUSKESMAS: "Puskesmas",
  HOSPITAL: "Rumah Sakit",
  CLINIC: "Klinik",
  OTHER: "Lainnya",
};

export const MOTHER_SOURCE_LABELS: Record<MonitoringSource, string> = {
  SELF: "Dicatat sendiri",
  MIDWIFE: "Dicatat oleh bidan",
  POSYANDU: "Posyandu",
  PUSKESMAS: "Puskesmas",
  HOSPITAL: "Rumah Sakit",
  CLINIC: "Klinik",
  OTHER: "Lainnya",
};

export const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export function formatIndonesianDate(isoString: string): string {
  if (!isoString) return "-";
  if (isoString.includes("T")) {
    const [datePart] = isoString.split("T");
    const parts = datePart?.split("-").map(Number);
    if (parts && parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parts[0];
      const monthIndex = parts[1] - 1;
      const day = parts[2];
      const month = INDONESIAN_MONTHS[monthIndex] ?? "";
      return `${day} ${month} ${year}`;
    }
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = d.getUTCDate();
  const month = INDONESIAN_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function formatIndonesianTime(isoString: string): string {
  if (!isoString) return "";
  if (isoString.includes("T")) {
    const parts = isoString.split("T");
    const timePart = parts[1];
    if (timePart) {
      const timeComponents = timePart.split(":");
      if (timeComponents.length >= 2) {
        const hours = timeComponents[0]?.padStart(2, "0");
        const minutes = timeComponents[1]?.slice(0, 2).padStart(2, "0");
        return `${hours}.${minutes}`;
      }
    }
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hours}.${minutes}`;
}

export function formatIndonesianDateTime(isoString: string): string {
  return `${formatIndonesianDate(isoString)} • ${formatIndonesianTime(isoString)}`;
}

export function formatWeightKg(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "-";
  const numStr = String(val).replace(".", ",");
  return `${numStr} kg`;
}

export function formatBp(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
): string {
  if (
    systolic === null ||
    systolic === undefined ||
    diastolic === null ||
    diastolic === undefined
  ) {
    return "-";
  }
  return `${systolic}/${diastolic} mmHg`;
}

export function formatWeightChange(val: number | null | undefined): string | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  const sign = val > 0 ? "+" : "";
  const numStr = Number(val.toFixed(1)).toString().replace(".", ",");
  return `${sign}${numStr} kg`;
}

export function buildMonitoringQueryForPeriod(
  filter: MonitoringPeriodFilter,
  pregnancyPublicId?: string | null,
  now: Date = new Date(),
): MonitoringQuery {
  const query: MonitoringQuery = {
    sort: "asc",
    limit: 50,
  };

  if (filter === "7_days") {
    const fromDate = new Date(now.getTime() - 7 * 86_400_000);
    query.from = fromDate.toISOString();
  } else if (filter === "30_days") {
    const fromDate = new Date(now.getTime() - 30 * 86_400_000);
    query.from = fromDate.toISOString();
  } else if (filter === "active_pregnancy" && pregnancyPublicId) {
    query.pregnancyPublicId = pregnancyPublicId;
  }

  return query;
}

export function calculatePointGestationalAge(
  recordedAt: string,
  pregnancy?: PregnancySummary | null,
): { weeks: number; days: number } | null {
  if (!pregnancy?.estimatedDueDate) return null;
  try {
    const eddDate = new Date(pregnancy.estimatedDueDate);
    if (isNaN(eddDate.getTime())) return null;
    const lmpDate = new Date(eddDate.getTime() - 280 * 86_400_000);
    const recordedDate = new Date(recordedAt);
    if (isNaN(recordedDate.getTime())) return null;
    const res = calculateGestationalAge(lmpDate, 0, 0, recordedDate);
    return { weeks: res.weeks, days: res.days };
  } catch {
    return null;
  }
}

export function formatGestationalAge(
  ga: { weeks: number; days: number } | null | undefined,
): string | null {
  if (!ga) return null;
  return `${ga.weeks} minggu ${ga.days} hari`;
}

export function mapToWeightChartPoints(
  items: MonitoringListItem[],
  pregnancy?: PregnancySummary | null,
): WeightChartPoint[] {
  return items
    .filter((item) => item.weightKg !== null && !item.isArchived)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
    .map((item) => ({
      id: item.publicId,
      recordedAt: item.recordedAt,
      weightKg: item.weightKg!,
      source: item.source,
      gestationalAge: calculatePointGestationalAge(item.recordedAt, pregnancy),
    }));
}

export function mapToBloodPressureChartPoints(
  items: MonitoringListItem[],
  pregnancy?: PregnancySummary | null,
): BloodPressureChartPoint[] {
  return items
    .filter(
      (item) =>
        item.systolicBp !== null &&
        item.diastolicBp !== null &&
        !item.isArchived,
    )
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
    .map((item) => ({
      id: item.publicId,
      recordedAt: item.recordedAt,
      systolicBp: item.systolicBp!,
      diastolicBp: item.diastolicBp!,
      source: item.source,
      gestationalAge: calculatePointGestationalAge(item.recordedAt, pregnancy),
    }));
}

export function getAdministrativeStatus(
  summary: MonitoringSummary | null | undefined,
  now: Date = new Date(),
): string {
  if (!summary || summary.totalEntries === 0) {
    return "Belum pernah mencatat";
  }

  const latestWeightTime = summary.latestWeightRecordedAt
    ? new Date(summary.latestWeightRecordedAt).getTime()
    : 0;
  const latestBpTime = summary.latestBloodPressureRecordedAt
    ? new Date(summary.latestBloodPressureRecordedAt).getTime()
    : 0;

  const latestTime = Math.max(latestWeightTime, latestBpTime);
  if (!latestTime || isNaN(latestTime)) {
    return "Ada data monitoring";
  }

  const diffDays = Math.floor((now.getTime() - latestTime) / 86_400_000);
  if (diffDays <= 0) {
    return "Terakhir mencatat hari ini";
  }
  return `Terakhir mencatat ${diffDays} hari lalu`;
}
