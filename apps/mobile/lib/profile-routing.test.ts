import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@pfram/shared-types";
import { destinationFor } from "./profile-routing";
const user = (
  profileCompletionStatus: AuthenticatedUser["profileCompletionStatus"],
): AuthenticatedUser => ({
  publicId: "31000000-0000-4000-8000-000000000001",
  phoneNumber: "628111111111",
  role: "MOTHER",
  status: "ACTIVE",
  displayName: "Ibu",
  phoneVerifiedAt: null,
  profileCompletionStatus,
});
describe("bootstrap profil mobile", () => {
  it("mengarahkan akun baru ke profil pribadi", () =>
    expect(destinationFor(user("ACCOUNT_READY"))).toBe(
      "/registration/personal-profile",
    ));
  it("mengarahkan profil kosong ke profil pribadi", () =>
    expect(destinationFor(user("PERSONAL_PROFILE_INCOMPLETE"))).toBe(
      "/registration/personal-profile",
    ));
  it("mengarahkan fasilitas belum dipilih ke profil pribadi", () =>
    expect(destinationFor(user("FACILITY_NOT_SELECTED"))).toBe(
      "/registration/personal-profile",
    ));
  it("mengarahkan profil pribadi lengkap ke profil kehamilan", () =>
    expect(destinationFor(user("PREGNANCY_PROFILE_INCOMPLETE"))).toBe(
      "/registration/pregnancy-profile",
    ));
  it("bidan belum ditetapkan tetap masuk app shell", () =>
    expect(destinationFor(user("MIDWIFE_NOT_ASSIGNED"))).toBe("/(app)/home"));
  it("profil lengkap masuk app shell", () =>
    expect(destinationFor(user("COMPLETE"))).toBe("/(app)/home"));
});
