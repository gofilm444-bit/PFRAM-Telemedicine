import { describe, expect, it } from "vitest";
import {
  calculateAge,
  calculateEstimatedDueDate,
  calculateGestationalAge,
  formatDateOnly,
  parseDateOnly,
  pregnancySchema,
  trimesterFromWeeks,
  monitoringCreateSchema,
  dangerScreeningCreateSchema,
  dangerFollowUpUpdateSchema,
  p4kPlanInputSchema,
  p4kChecklistPatchSchema,
  referralPlanInputSchema,
  isValidMeetingUrl,
  safeMeetingUrlSchema,
  videoConsultationCreateSchema,
  videoConsultationStatusSchema,
  videoConsultationQuerySchema,
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

describe("monitoring validation schemas", () => {
  it("menerima catatan berat badan saja", () => {
    const res = monitoringCreateSchema.safeParse({ weightKg: 58.5 });
    expect(res.success).toBe(true);
  });

  it("menerima catatan tekanan darah saja", () => {
    const res = monitoringCreateSchema.safeParse({ systolicBp: 110, diastolicBp: 70 });
    expect(res.success).toBe(true);
  });

  it("menerima kombinasi berat badan dan tekanan darah", () => {
    const res = monitoringCreateSchema.safeParse({
      weightKg: 62.0,
      systolicBp: 120,
      diastolicBp: 80,
      source: "PUSKESMAS",
    });
    expect(res.success).toBe(true);
  });

  it("menolak catatan monitoring kosong", () => {
    const res = monitoringCreateSchema.safeParse({});
    expect(res.success).toBe(false);
  });

  it("menolak berat badan non-positif atau ekstrem", () => {
    expect(monitoringCreateSchema.safeParse({ weightKg: 0 }).success).toBe(false);
    expect(monitoringCreateSchema.safeParse({ weightKg: -5 }).success).toBe(false);
    expect(monitoringCreateSchema.safeParse({ weightKg: 10 }).success).toBe(false);
    expect(monitoringCreateSchema.safeParse({ weightKg: 350 }).success).toBe(false);
  });

  it("menolak tekanan darah tidak berpasangan", () => {
    expect(monitoringCreateSchema.safeParse({ systolicBp: 120 }).success).toBe(false);
    expect(monitoringCreateSchema.safeParse({ diastolicBp: 80 }).success).toBe(false);
  });

  it("menolak sistolik lebih kecil atau sama dengan diastolik", () => {
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 80, diastolicBp: 80 }).success,
    ).toBe(false);
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 70, diastolicBp: 90 }).success,
    ).toBe(false);
  });

  it("menolak tekanan darah di luar batas teknis wajar", () => {
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 350, diastolicBp: 80 }).success,
    ).toBe(false);
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 120, diastolicBp: 20 }).success,
    ).toBe(false);
  });

  it("menolak recordedAt di masa depan", () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(
      monitoringCreateSchema.safeParse({ weightKg: 55, recordedAt: future }).success,
    ).toBe(false);
  });
});

describe("Tahap 6A — Validasi Skrining Tanda Bahaya", () => {
  it("menerima data skrining yang valid", () => {
    const valid = {
      ruleSetVersion: "KEMENKES-KIA-2023-V1",
      responses: [
        { ruleCode: "BLEEDING", answer: false },
        { ruleCode: "HIGH_FEVER", answer: true },
      ],
    };
    const res = dangerScreeningCreateSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("menolak jika responses kosong", () => {
    const invalid = {
      ruleSetVersion: "KEMENKES-KIA-2023-V1",
      responses: [],
    };
    const res = dangerScreeningCreateSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("menolak jika terdapat duplikasi ruleCode", () => {
    const invalid = {
      ruleSetVersion: "KEMENKES-KIA-2023-V1",
      responses: [
        { ruleCode: "BLEEDING", answer: false },
        { ruleCode: "BLEEDING", answer: true },
      ],
    };
    const res = dangerScreeningCreateSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("menerima update status tindak lanjut bidan yang sah", () => {
    expect(
      dangerFollowUpUpdateSchema.safeParse({ status: "CONTACTED", notes: "Sudah dihubungi via telepon" }).success,
    ).toBe(true);
    expect(
      dangerFollowUpUpdateSchema.safeParse({ status: "RESOLVED" }).success,
    ).toBe(true);
  });

  it("menolak status tindak lanjut tidak dikenal", () => {
    expect(
      dangerFollowUpUpdateSchema.safeParse({ status: "UNKNOWN_STATUS" }).success,
    ).toBe(false);
  });
});

describe("Tahap 8 — P4K & Rencana Rujukan Kepulauan Validation", () => {
  it("memvalidasi payload P4kPlanInput yang sah", () => {
    const valid = {
      deliveryFacilityPublicId: "00000000-0000-0000-0000-000000000001",
      deliveryAttendant: "BIDAN",
      birthCompanionName: "Budi Santoso",
      birthCompanionPhone: "081234567890",
      transportation: "SPEEDBOAT",
      fundingSource: "BPJS",
      bpjsNumber: "0001234567890",
      bloodDonors: [
        { name: "Doni", bloodType: "O+", phone: "081298765432" },
      ],
      emergencyContactName: "Siti Rahma",
      emergencyContactPhone: "081211112222",
      preparationNotes: "Menunggu jadwal kapal cepat pagi",
    };
    const res = p4kPlanInputSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("menerima payload P4K minimal / partial", () => {
    const minimal = {
      deliveryAttendant: "DOKTER",
      transportation: "KAPAL",
    };
    const res = p4kPlanInputSchema.safeParse(minimal);
    expect(res.success).toBe(true);
  });

  it("memvalidasi checklist patch item", () => {
    const valid = {
      items: [
        { itemKey: "BPJS_CARD", checked: true },
        { itemKey: "KIA_BOOK", checked: false },
      ],
    };
    const res = p4kChecklistPatchSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("menolak checklist patch tanpa items", () => {
    const invalid = { items: [] };
    const res = p4kChecklistPatchSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("memvalidasi payload ReferralPlanInput konteks kepulauan yang sah", () => {
    const valid = {
      sourceFacilityPublicId: "00000000-0000-0000-0000-000000000001",
      destinationFacilityPublicId: "00000000-0000-0000-0000-000000000002",
      transportType: "SPEEDBOAT",
      transportOperatorName: "Kapten Ali",
      transportContactNumber: "081234567890",
      estimatedTravelTimeMinutes: 90,
      manualDepartureSchedule: "Berangkat setiap pagi jam 07:00 jika ombak tenang",
      departurePoint: "Dermaga Pulau Selayar",
      companions: "Suami & Bidan Desa",
      rtkName: "Rumah Tunggu Kelahiran Kasih Bunda",
      rtkAddress: "Jl. Pelabuhan No. 12, Benteng",
      rtkPhone: "081399887766",
      alternativeNotes: "Bila cuaca buruk, gunakan kapal roro ASDP pukul 14:00",
    };
    const res = referralPlanInputSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });
});

describe("Tahap 10 — Validasi Video Call & External Meeting URL", () => {
  it("isValidMeetingUrl memverifikasi link HTTPS yang sah dan aman", () => {
    expect(isValidMeetingUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isValidMeetingUrl("https://meet.jit.si/polsand-room-123")).toBe(true);
    expect(isValidMeetingUrl("https://teams.microsoft.com/l/meetup-join/19%3ameeting")).toBe(true);
  });

  it("isValidMeetingUrl menolak link tidak aman (http, javascript, data, vbscript, non-URL)", () => {
    expect(isValidMeetingUrl("http://meet.google.com/abc")).toBe(false);
    expect(isValidMeetingUrl("javascript:alert('xss')")).toBe(false);
    expect(isValidMeetingUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isValidMeetingUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isValidMeetingUrl("file:///C:/passwords.txt")).toBe(false);
    expect(isValidMeetingUrl("random-text")).toBe(false);
    expect(isValidMeetingUrl("")).toBe(false);
  });

  it("safeMeetingUrlSchema menolak skema tidak valid", () => {
    expect(safeMeetingUrlSchema.safeParse("https://meet.google.com/room-1").success).toBe(true);
    expect(safeMeetingUrlSchema.safeParse("http://insecure.com/room").success).toBe(false);
    expect(safeMeetingUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("videoConsultationCreateSchema menerima payload lengkap yang valid", () => {
    const valid = {
      motherPublicId: "00000000-0000-0000-0000-000000000001",
      threadPublicId: "00000000-0000-0000-0000-000000000002",
      scheduledAt: "2026-08-20T10:00:00.000Z",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      title: "Konsultasi Video Trimester 2",
      notes: "Mohon siapkan buku KIA dan tensimeter jika ada",
    };
    const res = videoConsultationCreateSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("videoConsultationStatusSchema menerima status yang valid dan menolak yang tidak dikenal", () => {
    expect(videoConsultationStatusSchema.safeParse("SCHEDULED").success).toBe(true);
    expect(videoConsultationStatusSchema.safeParse("ACTIVE").success).toBe(true);
    expect(videoConsultationStatusSchema.safeParse("COMPLETED").success).toBe(true);
    expect(videoConsultationStatusSchema.safeParse("CANCELLED").success).toBe(true);
    expect(videoConsultationStatusSchema.safeParse("UNKNOWN").success).toBe(false);
  });

  it("videoConsultationQuerySchema memvalidasi filter query pencarian", () => {
    const parsed = videoConsultationQuerySchema.safeParse({
      status: "SCHEDULED",
      upcomingOnly: "true",
      page: "1",
      limit: "10",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.upcomingOnly).toBe(true);
      expect(parsed.data.page).toBe(1);
    }
  });
});
