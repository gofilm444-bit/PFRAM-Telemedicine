import { describe, expect, it } from "vitest";
import {
  calculateAge,
  calculateEstimatedDueDate,
  calculateGestationalAge,
  formatDateOnly,
  parseDateOnly,
  pregnancySchema,
  trimesterFromWeeks,
} from "./index";

describe("perhitungan date-only", () => {
  it("menghitung HPL normal tanpa pergeseran timezone", () =>
    expect(formatDateOnly(calculateEstimatedDueDate("2026-01-01"))).toBe(
      "2026-10-08",
    ));
  it("menangani tahun kabisat", () =>
    expect(formatDateOnly(calculateEstimatedDueDate("2024-02-29"))).toBe(
      "2024-12-05",
    ));
  it("menangani pergantian tahun", () =>
    expect(formatDateOnly(calculateEstimatedDueDate("2025-12-31"))).toBe(
      "2026-10-07",
    ));
  it("menghitung HPHT hari ini sebagai nol minggu", () =>
    expect(
      calculateGestationalAge("2026-08-06", 0, 0, parseDateOnly("2026-08-06")),
    ).toEqual({ weeks: 0, days: 0, totalDays: 0 }));
  it("menolak HPHT masa depan", () =>
    expect(
      pregnancySchema.safeParse({
        gestationalAgeSource: "LMP",
        lastMenstrualPeriod: "2999-01-01",
        pregnancyType: "UNKNOWN",
        previousPregnancyCount: 0,
        previousDeliveryCount: 0,
        miscarriageCount: 0,
        previousCesarean: false,
        hypertensionHistory: false,
        preeclampsiaHistory: false,
        diabetesHistory: false,
        heartDiseaseHistory: false,
        kidneyDiseaseHistory: false,
      }).success,
    ).toBe(false));
  it("menghitung usia sebelum dan sesudah ulang tahun", () => {
    expect(calculateAge("2000-08-07", parseDateOnly("2026-08-06"))).toBe(25);
    expect(calculateAge("2000-08-07", parseDateOnly("2026-08-07"))).toBe(26);
  });
  it("menghitung batas trimester", () => {
    expect(trimesterFromWeeks(13)).toBe(1);
    expect(trimesterFromWeeks(14)).toBe(2);
    expect(trimesterFromWeeks(27)).toBe(2);
    expect(trimesterFromWeeks(28)).toBe(3);
  });
  it("menghitung usia dari penilaian tenaga kesehatan", () =>
    expect(
      calculateGestationalAge("2026-08-01", 10, 3, parseDateOnly("2026-08-06")),
    ).toEqual({ weeks: 11, days: 1, totalDays: 78 }));
});
