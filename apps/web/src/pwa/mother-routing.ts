import type { AuthenticatedUser } from "@pfram/shared-types";
import { onboardingDraft } from "./onboarding-draft";

export function getMotherDestination(user: AuthenticatedUser | null): string {
  if (!user) return "/login";
  if (user.role !== "MOTHER") return "/dashboard";

  const status = user.profileCompletionStatus;
  if (status === "ACCOUNT_READY" || status === "PERSONAL_PROFILE_INCOMPLETE") {
    return "/m/onboarding/personal";
  }
  if (status === "FACILITY_NOT_SELECTED") {
    return onboardingDraft.getPersonal()
      ? "/m/onboarding/facility"
      : "/m/onboarding/personal";
  }
  if (status === "PREGNANCY_PROFILE_INCOMPLETE") {
    return "/m/onboarding/pregnancy";
  }
  return "/m/home";
}
