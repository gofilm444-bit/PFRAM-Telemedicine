import { createMotherDangerScreeningApi } from "@pfram/api-client";
import type {
  DangerScreening,
  DangerScreeningCreateInput,
  DangerSignRule,
  DangerSignRuleSet,
  PaginatedResponse,
} from "@pfram/shared-types";
import { api } from "./auth";

export const dangerScreeningApi = createMotherDangerScreeningApi(api);

export const getMotherDangerSigns = (): Promise<{
  ruleSet: DangerSignRuleSet;
  rules: DangerSignRule[];
  pregnancy: {
    gestationalAge: { weeks: number; days: number } | null;
    trimester: number;
  } | null;
}> => dangerScreeningApi.getDangerSigns();

export const createMotherDangerScreening = (
  input: DangerScreeningCreateInput,
): Promise<DangerScreening> => dangerScreeningApi.createScreening(input);

export const getMotherDangerScreenings = (query?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<DangerScreening>> =>
  dangerScreeningApi.getScreenings(query);

export const getMotherDangerScreeningDetail = (
  publicId: string,
): Promise<DangerScreening> => dangerScreeningApi.getScreeningDetail(publicId);

export function formatScreeningDate(isoDate: string): string {
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
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} • ${hours}:${minutes} WIB`;
  } catch {
    return isoDate;
  }
}

export function cleanPhoneForUrl(phone?: string | null): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
}

export function getDangerDeepLinks(
  midwifePhone?: string | null,
  facilityPhone?: string | null,
) {
  const cleanMidwife = cleanPhoneForUrl(midwifePhone);
  const cleanFacility = cleanPhoneForUrl(facilityPhone);

  return {
    midwifeCallUrl: cleanMidwife ? `tel:${cleanMidwife}` : null,
    midwifeWhatsAppUrl: cleanMidwife
      ? `https://wa.me/${cleanMidwife}?text=Halo%20Bidan,%20saya%20ibu%20binaan%20ingin%20berkonsultasi%20mengenai%20tanda%20bahaya%20kehamilan.`
      : null,
    facilityCallUrl: cleanFacility ? `tel:${cleanFacility}` : null,
  };
}
