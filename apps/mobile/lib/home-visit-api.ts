import { createMotherHomeVisitApi } from "@pfram/api-client";
import type { HomeVisitItem, HomeVisitQuery } from "@pfram/shared-types";
import { api } from "./auth";

export const homeVisitApi = createMotherHomeVisitApi(api);

export const getMotherHomeVisits = (
  query?: HomeVisitQuery,
): Promise<{ items: HomeVisitItem[]; total: number }> =>
  homeVisitApi.getHomeVisits(query);

export function formatHomeVisitDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const day = d.getDate();
    const months = [
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
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} WIT`;
  } catch {
    return "";
  }
}
