import { describe, it, expect } from "vitest";
import type { EducationCategory, EducationTrimester } from "@pfram/shared-types";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  formatReadingTime,
  TRIMESTER_LABELS,
} from "./education-api";
import { educationKeys } from "./education-queries";

describe("Stage 7 — Mobile Education Unit Suite", () => {
  it("1. Label dan warna kategori terdefinisi lengkap untuk seluruh kategori", () => {
    const categories: EducationCategory[] = [
      "PREGNANCY",
      "NUTRITION",
      "BODY_CHANGES",
      "IRON_TABLET",
      "NAUSEA",
      "ANEMIA_KEK",
      "PREPARATION",
      "OTHER",
    ];

    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
      expect(CATEGORY_COLORS[cat]).toBeDefined();
      expect(CATEGORY_COLORS[cat].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(CATEGORY_COLORS[cat].text).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("2. Label trimester terdefinisi lengkap", () => {
    const trimesters: EducationTrimester[] = [
      "ALL",
      "TRIMESTER_1",
      "TRIMESTER_2",
      "TRIMESTER_3",
    ];

    for (const tri of trimesters) {
      expect(TRIMESTER_LABELS[tri]).toBeDefined();
      expect(TRIMESTER_LABELS[tri].length).toBeGreaterThan(0);
    }
    expect(TRIMESTER_LABELS.ALL).toBe("Semua Trimester");
    expect(TRIMESTER_LABELS.TRIMESTER_1).toBe("Trimester 1");
  });

  it("3. Perhitungan estimasi waktu membaca (reading time) akurat", () => {
    const shortText = "Ini adalah teks pendek dengan sepuluh kata yang sangat ringkas.";
    expect(formatReadingTime(shortText)).toBe("1 menit baca");

    // 400 words text
    const words400 = Array(400).fill("kata").join(" ");
    expect(formatReadingTime(words400)).toBe("3 menit baca");
  });

  it("4. Query keys React Query konsisten", () => {
    expect(educationKeys.all).toEqual(["education"]);
    expect(educationKeys.articles()).toEqual(["education", "articles", "all"]);
    expect(educationKeys.articles({ category: "NUTRITION" })).toEqual([
      "education",
      "articles",
      { category: "NUTRITION" },
    ]);
    expect(educationKeys.featured()).toEqual(["education", "featured"]);
    expect(educationKeys.detail("mual-muntah")).toEqual([
      "education",
      "detail",
      "mual-muntah",
    ]);
  });
});
