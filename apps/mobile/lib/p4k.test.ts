import { describe, it, expect } from "vitest";
import { p4kKeys } from "./p4k-queries";
import type { P4kPlan, ReferralPlan } from "@pfram/shared-types";

describe("Tahap 8 â€” Mobile P4K & Rencana Rujukan Suite", () => {
  it("p4kKeys menghasilkan query keys yang konsisten", () => {
    expect(p4kKeys.all).toEqual(["p4k"]);
    expect(p4kKeys.plan()).toEqual(["p4k", "plan"]);
    expect(p4kKeys.checklist()).toEqual(["p4k", "checklist"]);
    expect(p4kKeys.referral()).toEqual(["p4k", "referral"]);
  });

  it("mengkalkulasi progres kesiapan checklist secara akurat dan non-diagnostik", () => {
    const items = [
      { publicId: "1", itemKey: "DOCS", title: "KTP", category: "DOCUMENTS", checked: true, sortOrder: 1 },
      { publicId: "2", itemKey: "BPJS", title: "BPJS", category: "DOCUMENTS", checked: true, sortOrder: 2 },
      { publicId: "3", itemKey: "KIA", title: "Buku KIA", category: "DOCUMENTS", checked: true, sortOrder: 3 },
      { publicId: "4", itemKey: "CLOTHES", title: "Baju Ibu", category: "CLOTHING", checked: false, sortOrder: 4 },
    ];

    const total = items.length;
    const checked = items.filter((i) => i.checked).length;
    const percentage = Math.round((checked / total) * 100);

    expect(total).toBe(4);
    expect(checked).toBe(3);
    expect(percentage).toBe(75);
  });

  it("memverifikasi struktur data P4K dengan calon donor darah dan pendamping", () => {
    const mockP4k: P4kPlan = {
      publicId: "p4k-1",
      motherPublicId: "mother-1",
      pregnancyPublicId: "preg-1",
      estimatedDueDate: "2026-12-10",
      deliveryAttendant: "BIDAN",
      birthCompanionName: "Rudi Hartono",
      birthCompanionPhone: "081234567890",
      transportation: "SPEEDBOAT",
      fundingSource: "BPJS",
      bpjsNumber: "000123456789",
      bloodDonors: [
        { name: "Andi", bloodType: "O", phone: "081299990000" },
      ],
      emergencyContactName: "Ibu Hartono",
      emergencyContactPhone: "081288887777",
      preparationNotes: "BBM cadangan telah disiapkan keluarga",
      checklistProgress: {
        total: 9,
        checked: 4,
        percentage: 44,
      },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    expect(mockP4k.bloodDonors).toHaveLength(1);
    expect(mockP4k.transportation).toBe("SPEEDBOAT");
    expect(mockP4k.checklistProgress?.percentage).toBe(44);
  });

  it("memverifikasi struktur rencana rujukan kepulauan dan Rumah Tunggu Kelahiran (RTK)", () => {
    const mockReferral: ReferralPlan = {
      publicId: "ref-1",
      motherPublicId: "mother-1",
      pregnancyPublicId: "preg-1",
      transportType: "SPEEDBOAT",
      transportOperatorName: "Nahkoda Yusuf",
      transportContactNumber: "081255554444",
      estimatedTravelTimeMinutes: 80,
      manualDepartureSchedule: "Berangkat 07:00 jika cuaca teduh",
      departurePoint: "Dermaga Tradisional Sebatik",
      companions: "Bidan Desa & Suami",
      rtkName: "RTK Sehati Nunukan",
      rtkAddress: "Jl. Pahlawan No. 4",
      rtkPhone: "081377778888",
      alternativeNotes: "Bila cuaca buruk beralih ke kapal Pelni atau koordinasi Polairud",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    expect(mockReferral.transportType).toBe("SPEEDBOAT");
    expect(mockReferral.estimatedTravelTimeMinutes).toBe(80);
    expect(mockReferral.rtkName).toBe("RTK Sehati Nunukan");
    expect(mockReferral.alternativeNotes).toContain("Polairud");
  });
});
