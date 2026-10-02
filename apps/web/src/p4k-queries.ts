import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { P4kPlanInput, ReferralPlanInput } from "@pfram/shared-types";
import {
  getMotherP4k,
  getMotherReferralPlan,
  updateMotherP4k,
  updateMotherReferralPlan,
} from "./p4k-api";

export const midwifeP4kKeys = {
  all: ["midwife-p4k"] as const,
  plan: (motherPublicId: string) =>
    ["midwife-p4k", "plan", motherPublicId] as const,
  referral: (motherPublicId: string) =>
    ["midwife-p4k", "referral", motherPublicId] as const,
};

export function useMidwifeMotherP4k(motherPublicId: string) {
  return useQuery({
    queryKey: midwifeP4kKeys.plan(motherPublicId),
    queryFn: () => getMotherP4k(motherPublicId),
    enabled: Boolean(motherPublicId),
    retry: 1,
  });
}

export function useUpdateMidwifeMotherP4k(motherPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: P4kPlanInput) => updateMotherP4k(motherPublicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeP4kKeys.plan(motherPublicId),
      });
    },
  });
}

export function useMidwifeMotherReferralPlan(motherPublicId: string) {
  return useQuery({
    queryKey: midwifeP4kKeys.referral(motherPublicId),
    queryFn: () => getMotherReferralPlan(motherPublicId),
    enabled: Boolean(motherPublicId),
    retry: 1,
  });
}

export function useUpdateMidwifeMotherReferralPlan(motherPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReferralPlanInput) =>
      updateMotherReferralPlan(motherPublicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeP4kKeys.referral(motherPublicId),
      });
    },
  });
}
