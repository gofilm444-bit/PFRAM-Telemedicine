import { createMidwifeP4kApi, createMotherP4kApi } from "@pfram/api-client";
import type {
  P4kPlan,
  P4kPlanInput,
  ReferralPlan,
  ReferralPlanInput,
} from "@pfram/shared-types";
import { api } from "./auth";

export const midwifeP4kApi = createMidwifeP4kApi(api);
export const motherP4kApi = createMotherP4kApi(api);

export const getMotherP4k = (motherPublicId: string): Promise<P4kPlan> =>
  midwifeP4kApi.getMotherP4k(motherPublicId);

export const updateMotherP4k = (
  motherPublicId: string,
  input: P4kPlanInput,
): Promise<P4kPlan> => midwifeP4kApi.updateMotherP4k(motherPublicId, input);

export const getMotherReferralPlan = (
  motherPublicId: string,
): Promise<ReferralPlan> => midwifeP4kApi.getMotherReferralPlan(motherPublicId);

export const updateMotherReferralPlan = (
  motherPublicId: string,
  input: ReferralPlanInput,
): Promise<ReferralPlan> =>
  midwifeP4kApi.updateMotherReferralPlan(motherPublicId, input);
