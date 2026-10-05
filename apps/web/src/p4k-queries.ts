import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  P4kChecklistPatchInput,
  P4kPlanInput,
  ReferralPlanInput,
} from "@pfram/shared-types";
import {
  getMotherP4k,
  getMotherReferralPlan,
  motherP4kApi,
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

/* -------------------------------------------------------------------------- */
/*  Mother P4K Queries & Mutations                                            */
/* -------------------------------------------------------------------------- */

export const motherP4kKeys = {
  all: ["mother-p4k"] as const,
  plan: () => ["mother-p4k", "plan"] as const,
  checklist: () => ["mother-p4k", "checklist"] as const,
  referral: () => ["mother-p4k", "referral"] as const,
};

export function useMotherP4k() {
  return useQuery({
    queryKey: motherP4kKeys.plan(),
    queryFn: () => motherP4kApi.getP4k(),
    retry: 1,
  });
}

export function useUpdateMotherP4k() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: P4kPlanInput) => motherP4kApi.updateP4k(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motherP4kKeys.all });
    },
  });
}

export function useMotherP4kChecklist() {
  return useQuery({
    queryKey: motherP4kKeys.checklist(),
    queryFn: () => motherP4kApi.getChecklist(),
    retry: 1,
  });
}

export function usePatchMotherP4kChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: P4kChecklistPatchInput) =>
      motherP4kApi.patchChecklist(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motherP4kKeys.checklist() });
      queryClient.invalidateQueries({ queryKey: motherP4kKeys.plan() });
    },
  });
}

export function useMotherReferralPlan() {
  return useQuery({
    queryKey: motherP4kKeys.referral(),
    queryFn: () => motherP4kApi.getReferralPlan(),
    retry: 1,
  });
}

export function useUpdateMotherReferralPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReferralPlanInput) =>
      motherP4kApi.updateReferralPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motherP4kKeys.referral() });
    },
  });
}
