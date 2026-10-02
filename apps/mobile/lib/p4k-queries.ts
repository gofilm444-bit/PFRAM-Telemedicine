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
  getMotherP4kChecklist,
  getMotherReferralPlan,
  patchMotherP4kChecklist,
  updateMotherP4k,
  updateMotherReferralPlan,
} from "./p4k-api";

export const p4kKeys = {
  all: ["p4k"] as const,
  plan: () => ["p4k", "plan"] as const,
  checklist: () => ["p4k", "checklist"] as const,
  referral: () => ["p4k", "referral"] as const,
};

export function useMotherP4k() {
  return useQuery({
    queryKey: p4kKeys.plan(),
    queryFn: () => getMotherP4k(),
    retry: 1,
  });
}

export function useUpdateMotherP4k() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: P4kPlanInput) => updateMotherP4k(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p4kKeys.all });
    },
  });
}

export function useMotherP4kChecklist() {
  return useQuery({
    queryKey: p4kKeys.checklist(),
    queryFn: () => getMotherP4kChecklist(),
    retry: 1,
  });
}

export function usePatchMotherP4kChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: P4kChecklistPatchInput) =>
      patchMotherP4kChecklist(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p4kKeys.checklist() });
      queryClient.invalidateQueries({ queryKey: p4kKeys.plan() });
    },
  });
}

export function useMotherReferralPlan() {
  return useQuery({
    queryKey: p4kKeys.referral(),
    queryFn: () => getMotherReferralPlan(),
    retry: 1,
  });
}

export function useUpdateMotherReferralPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReferralPlanInput) =>
      updateMotherReferralPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p4kKeys.referral() });
    },
  });
}
