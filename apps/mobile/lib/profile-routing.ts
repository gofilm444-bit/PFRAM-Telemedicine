import type { AuthenticatedUser } from "@pfram/shared-types";
export function destinationFor(user: AuthenticatedUser | null) {
  if (!user) return "/auth/welcome" as const;
  if (
    user.profileCompletionStatus === "ACCOUNT_READY" ||
    user.profileCompletionStatus === "PERSONAL_PROFILE_INCOMPLETE" ||
    user.profileCompletionStatus === "FACILITY_NOT_SELECTED"
  )
    return "/registration/personal-profile" as const;
  if (user.profileCompletionStatus === "PREGNANCY_PROFILE_INCOMPLETE")
    return "/registration/pregnancy-profile" as const;
  return "/(app)/home" as const;
}
