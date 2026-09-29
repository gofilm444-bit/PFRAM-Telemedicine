import type { z } from "zod";
import { motherProfileFieldsSchema } from "@pfram/validation";

type PersonalDraft = Omit<
  z.input<typeof motherProfileFieldsSchema>,
  "primaryFacilityPublicId"
>;
let personalDraft: PersonalDraft | null = null;
export const registrationDraft = {
  setPersonal(value: PersonalDraft) {
    personalDraft = value;
  },
  getPersonal() {
    return personalDraft;
  },
  clear() {
    personalDraft = null;
  },
};
