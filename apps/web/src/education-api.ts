import { createAdminEducationApi } from "@pfram/api-client";
import type {
  EducationCategory,
  EducationTrimester,
} from "@pfram/shared-types";
import { api } from "./auth";

export const adminEducationApi = createAdminEducationApi(api);

export const CATEGORY_LABELS: Record<EducationCategory, string> = {
  PREGNANCY: "Kehamilan",
  NUTRITION: "Gizi & Nutrisi",
  BODY_CHANGES: "Perubahan Tubuh",
  IRON_TABLET: "Tablet Tambah Darah",
  NAUSEA: "Mual & Muntah",
  ANEMIA_KEK: "Anemia & KEK",
  PREPARATION: "Persiapan Bersalin",
  OTHER: "Lainnya",
};

export const CATEGORY_BADGES: Record<
  EducationCategory,
  { label: string; className: string }
> = {
  PREGNANCY: { label: "Kehamilan", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  NUTRITION: { label: "Gizi & Nutrisi", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BODY_CHANGES: { label: "Perubahan Tubuh", className: "bg-amber-50 text-amber-700 border-amber-200" },
  IRON_TABLET: { label: "Tablet Tambah Darah", className: "bg-rose-50 text-rose-700 border-rose-200" },
  NAUSEA: { label: "Mual & Muntah", className: "bg-purple-50 text-purple-700 border-purple-200" },
  ANEMIA_KEK: { label: "Anemia & KEK", className: "bg-orange-50 text-orange-700 border-orange-200" },
  PREPARATION: { label: "Persiapan Bersalin", className: "bg-sky-50 text-sky-700 border-sky-200" },
  OTHER: { label: "Lainnya", className: "bg-slate-50 text-slate-700 border-slate-200" },
};

export const TRIMESTER_LABELS: Record<EducationTrimester, string> = {
  ALL: "Semua Trimester",
  TRIMESTER_1: "Trimester 1",
  TRIMESTER_2: "Trimester 2",
  TRIMESTER_3: "Trimester 3",
};

export const TRIMESTER_BADGES: Record<
  EducationTrimester,
  { label: string; className: string }
> = {
  ALL: { label: "Semua", className: "bg-slate-100 text-slate-700" },
  TRIMESTER_1: { label: "T1", className: "bg-blue-100 text-blue-700" },
  TRIMESTER_2: { label: "T2", className: "bg-teal-100 text-teal-700" },
  TRIMESTER_3: { label: "T3", className: "bg-purple-100 text-purple-700" },
};
