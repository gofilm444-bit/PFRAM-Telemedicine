import { useQuery } from "@tanstack/react-query";
import type { HomeVisitQuery } from "@pfram/shared-types";
import { getMotherHomeVisits } from "./home-visit-api";

export const motherHomeVisitKeys = {
  all: ["mother", "home-visits"] as const,
  list: (query?: HomeVisitQuery) =>
    ["mother", "home-visits", "list", query ?? "default"] as const,
  upcoming: () => ["mother", "home-visits", "upcoming"] as const,
};

export function useMotherHomeVisits(query?: HomeVisitQuery) {
  return useQuery({
    queryKey: motherHomeVisitKeys.list(query),
    queryFn: () => getMotherHomeVisits(query),
    retry: 1,
  });
}
