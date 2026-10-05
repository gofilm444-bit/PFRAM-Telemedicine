import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DangerFollowUpUpdateInput,
  DangerScreeningCreateInput,
} from "@pfram/shared-types";
import {
  midwifeDangerScreeningApi,
  motherDangerScreeningApi,
} from "./danger-screening-api";

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

/* -------------------------------------------------------------------------- */
/*  Mother Danger Screening Queries & Mutations                               */
/* -------------------------------------------------------------------------- */

export const motherDangerKeys = {
  all: ["mother", "danger"] as const,
  signs: () => ["mother", "danger", "signs"] as const,
  screenings: (query?: unknown) =>
    ["mother", "danger", "screenings", query ?? "all"] as const,
  detail: (publicId: string) =>
    ["mother", "danger", "screening", publicId] as const,
};

export function useMotherDangerSigns() {
  return useQuery({
    queryKey: motherDangerKeys.signs(),
    queryFn: () => motherDangerScreeningApi.getDangerSigns(),
    retry: 1,
  });
}

export function useMotherDangerScreenings(query?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: motherDangerKeys.screenings(query),
    queryFn: () => motherDangerScreeningApi.getScreenings(query),
    retry: 1,
  });
}

export function useMotherDangerScreeningDetail(publicId: string | null | undefined) {
  return useQuery({
    queryKey: motherDangerKeys.detail(publicId ?? ""),
    queryFn: () => motherDangerScreeningApi.getScreeningDetail(publicId!),
    enabled: Boolean(publicId),
    retry: 1,
  });
}

export function useCreateMotherDangerScreening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DangerScreeningCreateInput) =>
      motherDangerScreeningApi.createScreening(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motherDangerKeys.all });
    },
  });
}
