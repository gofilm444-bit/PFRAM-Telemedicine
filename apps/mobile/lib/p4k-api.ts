import { createMotherP4kApi } from "@pfram/api-client";
import type {
  P4kChecklistItem,
  P4kChecklistPatchInput,
  P4kPlan,
  P4kPlanInput,
  ReferralPlan,
  ReferralPlanInput,
} from "@pfram/shared-types";
import { api } from "./auth";

export const p4kApi = createMotherP4kApi(api);

export const getMotherP4k = (): Promise<P4kPlan> => p4kApi.getP4k();

export const updateMotherP4k = (input: P4kPlanInput): Promise<P4kPlan> =>
  p4kApi.updateP4k(input);

export const getMotherP4kChecklist = (): Promise<{
  items: P4kChecklistItem[];
  progress: { total: number; checked: number; percentage: number };
}> => p4kApi.getChecklist();

export const patchMotherP4kChecklist = (
  input: P4kChecklistPatchInput,
): Promise<{
  items: P4kChecklistItem[];
  progress: { total: number; checked: number; percentage: number };
}> => p4kApi.patchChecklist(input);

export const getMotherReferralPlan = (): Promise<ReferralPlan> =>
  p4kApi.getReferralPlan();

export const updateMotherReferralPlan = (
  input: ReferralPlanInput,
): Promise<ReferralPlan> => p4kApi.updateReferralPlan(input);
