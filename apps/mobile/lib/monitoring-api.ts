import { createMotherMonitoringApi } from "@pfram/api-client";
import type {
  BloodPressureChartPoint,
  MonitoringPeriodFilter,
  PregnancySummary,
  WeightChartPoint,
  MonitoringCreateInput,
  MonitoringEntry,
  MonitoringListItem,
  MonitoringQuery,
  MonitoringSource,
  MonitoringSummary,
  MonitoringUpdateInput,
  PaginatedResponse,
} from "@pfram/shared-types";
import { calculateGestationalAge } from "@pfram/validation";
import { api } from "./auth";
export type MotherMonitoringApi = ReturnType<typeof createMotherMonitoringApi>;

export const monitoringApi: MotherMonitoringApi = createMotherMonitoringApi(api);

export const getMonitoringList = (
  query?: MonitoringQuery,
): Promise<PaginatedResponse<MonitoringListItem>> =>
  monitoringApi.getMonitoringList(query);

export const getMonitoringDetail = (
  publicId: string,
): Promise<MonitoringEntry> =>
  monitoringApi.getMonitoringDetail(publicId);

export const getMonitoringSummary = (): Promise<MonitoringSummary> =>
  monitoringApi.getMonitoringSummary();

export const createMonitoring = (
  input: MonitoringCreateInput,
): Promise<MonitoringEntry> =>
  monitoringApi.createMonitoring(input);

export const updateMonitoring = (
  publicId: string,
  input: MonitoringUpdateInput,
): Promise<MonitoringEntry> =>
  monitoringApi.updateMonitoring(publicId, input);

export const archiveMonitoring = (
  publicId: string,
): Promise<{ publicId: string; archivedAt: string }> =>
  monitoringApi.archiveMonitoring(publicId);

export const MONITORING_SOURCES: Array<{
  value: MonitoringSource;
  label: string;
}> = [
  { value: "SELF", label: "Mandiri" },
  { value: "POSYANDU", label: "Posyandu" },
  { value: "PUSKESMAS", label: "Puskesmas" },
  { value: "HOSPITAL", label: "Rumah Sakit" },
  { value: "CLINIC", label: "Klinik" },
  { value: "MIDWIFE", label: "Bidan" },
  { value: "OTHER", label: "Lainnya" },
];

export const SOURCE_LABELS: Record<MonitoringSource, string> = {
  SELF: "Mandiri",
  POSYANDU: "Posyandu",
  PUSKESMAS: "Puskesmas",
  HOSPITAL: "Rumah Sakit",
  CLINIC: "Klinik",
  MIDWIFE: "Bidan",
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

export function formatWeightChange(val: number | null | undefined): string | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  const sign = val > 0 ? "+" : "";
  const numStr = Number(val.toFixed(1)).toString().replace(".", ",");
  return `${sign}${numStr} kg`;
}

export function normalizeWeightInput(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(",", ".");
  const num = Number(normalized);
  return isNaN(num) ? undefined : num;
}

export function normalizeBpInput(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return isNaN(num) ? undefined : Math.round(num);
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
