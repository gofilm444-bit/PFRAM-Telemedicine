import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DangerFollowUpUpdateInput } from "@pfram/shared-types";
import { midwifeDangerScreeningApi } from "./danger-screening-api";

export const midwifeDangerScreeningKeys = {
  all: ["midwife", "danger-screening"] as const,
  screenings: (motherPublicId: string, query?: unknown) =>
    ["midwife", "mother", motherPublicId, "danger-screenings", query ?? {}] as const,
  detail: (motherPublicId: string, publicId: string) =>
    ["midwife", "mother", motherPublicId, "danger-screening", publicId] as const,
  followUps: () => ["midwife", "danger-follow-ups"] as const,
};

export function useMidwifeMotherDangerScreenings(
  motherPublicId: string,
  query?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: midwifeDangerScreeningKeys.screenings(motherPublicId, query),
    queryFn: () => midwifeDangerScreeningApi.getMotherScreenings(motherPublicId, query),
    enabled: Boolean(motherPublicId),
  });
}

export function useMidwifeMotherDangerScreeningDetail(
  motherPublicId: string,
  publicId: string,
) {
  return useQuery({
    queryKey: midwifeDangerScreeningKeys.detail(motherPublicId, publicId),
    queryFn: () =>
      midwifeDangerScreeningApi.getMotherScreeningDetail(motherPublicId, publicId),
    enabled: Boolean(motherPublicId && publicId),
  });
}

export function useMidwifeDangerFollowUps() {
  return useQuery({
    queryKey: midwifeDangerScreeningKeys.followUps(),
    queryFn: () => midwifeDangerScreeningApi.getFollowUps(),
  });
}

export function useUpdateMidwifeDangerFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      publicId,
      input,
    }: {
      publicId: string;
      motherPublicId?: string;
      input: DangerFollowUpUpdateInput;
    }) => midwifeDangerScreeningApi.updateFollowUp(publicId, input),
    onSuccess: (_data, variables) => {
      // Invalidate follow-ups queue
      queryClient.invalidateQueries({
        queryKey: midwifeDangerScreeningKeys.followUps(),
      });
      // Invalidate specific mother screening list if provided
      if (variables.motherPublicId) {
        queryClient.invalidateQueries({
          queryKey: [
            "midwife",
            "mother",
            variables.motherPublicId,
            "danger-screenings",
          ],
        });
        queryClient.invalidateQueries({
          queryKey: midwifeDangerScreeningKeys.detail(
            variables.motherPublicId,
            variables.publicId,
          ),
        });
      }
    },
  });
}
