import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { DangerScreeningCreateInput } from "@pfram/shared-types";
import {
  createMotherDangerScreening,
  getMotherDangerScreeningDetail,
  getMotherDangerScreenings,
  getMotherDangerSigns,
} from "./danger-screening-api";

export const dangerKeys = {
  all: ["danger"] as const,
  signs: () => ["danger", "signs"] as const,
  screenings: (query?: unknown) =>
    ["danger", "screenings", query ?? "all"] as const,
  detail: (publicId: string) => ["danger", "screening", publicId] as const,
};

export function useMotherDangerSigns() {
  return useQuery({
    queryKey: dangerKeys.signs(),
    queryFn: () => getMotherDangerSigns(),
    retry: 1,
  });
}

export function useMotherDangerScreenings(query?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: dangerKeys.screenings(query),
    queryFn: () => getMotherDangerScreenings(query),
    retry: 1,
  });
}

export function useMotherDangerScreeningDetail(
  publicId: string | null | undefined,
) {
  return useQuery({
    queryKey: dangerKeys.detail(publicId ?? ""),
    queryFn: () => getMotherDangerScreeningDetail(publicId!),
    enabled: Boolean(publicId),
    retry: 1,
  });
}

export function useCreateMotherDangerScreening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DangerScreeningCreateInput) =>
      createMotherDangerScreening(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dangerKeys.screenings() });
    },
  });
}
