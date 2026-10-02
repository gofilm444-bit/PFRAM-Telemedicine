import { createMotherEducationApi } from "@pfram/api-client";
import type {
  EducationCategory,
  EducationQuery,
  EducationTrimester,
} from "@pfram/shared-types";
import { api } from "./auth";

export const motherEducationApi = createMotherEducationApi(api);

export const getMotherEducationArticles = (
  query: EducationQuery = {},
) => motherEducationApi.getArticles(query);

export const getMotherFeaturedArticles = () =>
  motherEducationApi.getFeaturedArticles();

export const getMotherArticleDetail = (slug: string) =>
  motherEducationApi.getArticleDetail(slug);

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

export const CATEGORY_COLORS: Record<EducationCategory, { bg: string; text: string }> = {
  PREGNANCY: { bg: "#EEF2FF", text: "#4338CA" },
  NUTRITION: { bg: "#ECFDF5", text: "#065F46" },
  BODY_CHANGES: { bg: "#FEF3C7", text: "#92400E" },
  IRON_TABLET: { bg: "#FEE2E2", text: "#991B1B" },
  NAUSEA: { bg: "#F3E8FF", text: "#6B21A8" },
  ANEMIA_KEK: { bg: "#FFEDD5", text: "#9A3412" },
  PREPARATION: { bg: "#E0F2FE", text: "#075985" },
  OTHER: { bg: "#F1F5F9", text: "#475569" },
};

export const TRIMESTER_LABELS: Record<EducationTrimester, string> = {
  ALL: "Semua Trimester",
  TRIMESTER_1: "Trimester 1",
  TRIMESTER_2: "Trimester 2",
  TRIMESTER_3: "Trimester 3",
};

export function formatReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} menit baca`;
}
