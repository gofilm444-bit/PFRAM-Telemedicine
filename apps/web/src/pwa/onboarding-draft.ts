import type { z } from "zod";
import type { motherProfileFieldsSchema } from "@pfram/validation";

export type PersonalDraft = Omit<
  z.input<typeof motherProfileFieldsSchema>,
  "primaryFacilityPublicId"
>;

let personalDraft: PersonalDraft | null = null;

export const onboardingDraft = {
  setPersonal(value: PersonalDraft) {
    personalDraft = value;
  },
  getPersonal(): PersonalDraft | null {
    return personalDraft;
  },
  clear() {
    personalDraft = null;
  },
};
