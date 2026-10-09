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
  motherRegistrationSchema,
  dateOfBirthSchema,
  healthFacilitySchema,
  motherProfileFieldsSchema,
  homeVisitCreateSchema,
  assignmentSchema,
  educationArticleCreateSchema,
  pregnancyUpdateSchema,
  replacementSchema,
  phoneSchema,
  facilityPhoneSchema,
  emergencyPhoneSchema,
  loginSchema,
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
    const res = monitoringCreateSchema.safeParse({
      systolicBp: 110,
      diastolicBp: 70,
    });
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
    expect(monitoringCreateSchema.safeParse({ weightKg: 0 }).success).toBe(
      false,
    );
    expect(monitoringCreateSchema.safeParse({ weightKg: -5 }).success).toBe(
      false,
    );
    expect(monitoringCreateSchema.safeParse({ weightKg: 10 }).success).toBe(
      false,
    );
    expect(monitoringCreateSchema.safeParse({ weightKg: 350 }).success).toBe(
      false,
    );
  });

  it("menolak tekanan darah tidak berpasangan", () => {
    expect(monitoringCreateSchema.safeParse({ systolicBp: 120 }).success).toBe(
      false,
    );
    expect(monitoringCreateSchema.safeParse({ diastolicBp: 80 }).success).toBe(
      false,
    );
  });

  it("menolak sistolik lebih kecil atau sama dengan diastolik", () => {
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 80, diastolicBp: 80 })
        .success,
    ).toBe(false);
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 70, diastolicBp: 90 })
        .success,
    ).toBe(false);
  });

  it("menolak tekanan darah di luar batas teknis wajar", () => {
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 350, diastolicBp: 80 })
        .success,
    ).toBe(false);
    expect(
      monitoringCreateSchema.safeParse({ systolicBp: 120, diastolicBp: 20 })
        .success,
    ).toBe(false);
  });

  it("menolak recordedAt di masa depan", () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    expect(
      monitoringCreateSchema.safeParse({ weightKg: 55, recordedAt: future })
        .success,
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
      dangerFollowUpUpdateSchema.safeParse({
        status: "CONTACTED",
        notes: "Sudah dihubungi via telepon",
      }).success,
    ).toBe(true);
    expect(
      dangerFollowUpUpdateSchema.safeParse({ status: "RESOLVED" }).success,
    ).toBe(true);
  });

  it("menolak status tindak lanjut tidak dikenal", () => {
    expect(
      dangerFollowUpUpdateSchema.safeParse({ status: "UNKNOWN_STATUS" })
        .success,
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
      bloodDonors: [{ name: "Doni", bloodType: "O+", phone: "081298765432" }],
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
      manualDepartureSchedule:
        "Berangkat setiap pagi jam 07:00 jika ombak tenang",
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
    expect(isValidMeetingUrl("https://meet.google.com/abc-defg-hij")).toBe(
      true,
    );
    expect(isValidMeetingUrl("https://meet.jit.si/polsand-room-123")).toBe(
      true,
    );
    expect(
      isValidMeetingUrl(
        "https://teams.microsoft.com/l/meetup-join/19%3ameeting",
      ),
    ).toBe(true);
  });

  it("isValidMeetingUrl menolak link tidak aman (http, javascript, data, vbscript, non-URL)", () => {
    expect(isValidMeetingUrl("http://meet.google.com/abc")).toBe(false);
    expect(isValidMeetingUrl("javascript:alert('xss')")).toBe(false);
    expect(isValidMeetingUrl("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
    expect(isValidMeetingUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isValidMeetingUrl("file:///C:/passwords.txt")).toBe(false);
    expect(isValidMeetingUrl("random-text")).toBe(false);
    expect(isValidMeetingUrl("")).toBe(false);
  });

  it("safeMeetingUrlSchema menolak skema tidak valid", () => {
    expect(
      safeMeetingUrlSchema.safeParse("https://meet.google.com/room-1").success,
    ).toBe(true);
    expect(
      safeMeetingUrlSchema.safeParse("http://insecure.com/room").success,
    ).toBe(false);
    expect(safeMeetingUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
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
    expect(videoConsultationStatusSchema.safeParse("SCHEDULED").success).toBe(
      true,
    );
    expect(videoConsultationStatusSchema.safeParse("ACTIVE").success).toBe(
      true,
    );
    expect(videoConsultationStatusSchema.safeParse("COMPLETED").success).toBe(
      true,
    );
    expect(videoConsultationStatusSchema.safeParse("CANCELLED").success).toBe(
      true,
    );
    expect(videoConsultationStatusSchema.safeParse("UNKNOWN").success).toBe(
      false,
    );
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

  describe("motherRegistrationSchema consent validation", () => {
    const validData = {
      fullName: "Siti Rahmawati",
      phoneNumber: "081234567890",
      password: "PasswordKuat123!",
      passwordConfirmation: "PasswordKuat123!",
      consentDocumentIds: ["123e4567-e89b-12d3-a456-426614174000"],
      clientType: "web" as const,
    };

    it("menerima pendaftaran dengan consentDocumentIds yang valid", () => {
      const res = motherRegistrationSchema.safeParse(validData);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.consentDocumentIds).toHaveLength(1);
        expect(res.data.consentDocumentIds[0]).toBe(
          "123e4567-e89b-12d3-a456-426614174000",
        );
      }
    });

    it("menolak consentDocumentIds kosong dengan pesan bahasa Indonesia ramah pengguna, BUKAN pesan teknis Zod", () => {
      const res = motherRegistrationSchema.safeParse({
        ...validData,
        consentDocumentIds: [],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const error = res.error.flatten().fieldErrors.consentDocumentIds?.[0];
        expect(error).toBe(
          "Silakan setujui dokumen persetujuan layanan untuk melanjutkan pendaftaran.",
        );
        expect(error).not.toContain("Array must contain at least 1 element(s)");
      }
    });

    it("menolak format ID consent yang bukan UUID", () => {
      const res = motherRegistrationSchema.safeParse({
        ...validData,
        consentDocumentIds: ["invalid-uuid"],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const error = res.error.flatten().fieldErrors.consentDocumentIds?.[0];
        expect(error).toBe("ID dokumen persetujuan tidak valid");
      }
    });
  });

  describe("global validation hardening & error UX", () => {
    it("menerima alamat pendek yang valid seperti 'Siko' pada fasilitas kesehatan", () => {
      const res = healthFacilitySchema.safeParse({
        name: "Puskesmas Siko",
        type: "PUSKESMAS",
        address: "Siko",
        provincePublicId: "a0000000-0000-4000-8000-000000000001",
        regencyPublicId: "a0000000-0000-4000-8000-000000000002",
        districtPublicId: "a0000000-0000-4000-8000-000000000003",
      });
      expect(res.success).toBe(true);
    });

    it("menerima alamat pendek yang valid seperti 'Siko' pada profil ibu", () => {
      const res = motherProfileFieldsSchema.safeParse({
        fullName: "Ibu Rahma",
        dateOfBirth: "1998-05-15",
        address: "Siko",
        provincePublicId: "a0000000-0000-4000-8000-000000000001",
        regencyPublicId: "a0000000-0000-4000-8000-000000000002",
        districtPublicId: "a0000000-0000-4000-8000-000000000003",
        primaryFacilityPublicId: "a0000000-0000-4000-8000-000000000004",
      });
      expect(res.success).toBe(true);
    });

    it("menolak tanggal lahir di masa depan dan tanggal lahir tidak masuk akal", () => {
      const future = dateOfBirthSchema.safeParse("2099-01-01");
      expect(future.success).toBe(false);
      if (!future.success) {
        expect(future.error.issues[0]?.message).toBe(
          "Tanggal lahir tidak boleh berada di masa depan",
        );
      }

      const ancient = dateOfBirthSchema.safeParse("1800-01-01");
      expect(ancient.success).toBe(false);
      if (!ancient.success) {
        expect(ancient.error.issues[0]?.message).toBe(
          "Tanggal lahir tidak masuk akal",
        );
      }

      const valid = dateOfBirthSchema.safeParse("1995-08-20");
      expect(valid.success).toBe(true);
    });

    it("menolak tanggal lahir di masa depan pada sub-schema personalStep (omit facility)", () => {
      const personalStepSchema = motherProfileFieldsSchema.omit({
        primaryFacilityPublicId: true,
      });
      const res = personalStepSchema.safeParse({
        fullName: "Ibu Rahma",
        dateOfBirth: "2099-01-01",
        address: "Siko",
        provincePublicId: "a0000000-0000-4000-8000-000000000001",
        regencyPublicId: "a0000000-0000-4000-8000-000000000002",
        districtPublicId: "a0000000-0000-4000-8000-000000000003",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(
          "Tanggal lahir tidak boleh berada di masa depan",
        );
      }
    });

    it("menerima tujuan kunjungan rumah singkat seperti 'KB'", () => {
      const res = homeVisitCreateSchema.safeParse({
        motherPublicId: "a0000000-0000-4000-8000-000000000001",
        scheduledAt: new Date().toISOString(),
        purpose: "KB",
      });
      expect(res.success).toBe(true);
    });

    it("menerima alasan pengalihan bidan singkat seperti 'Cuti'", () => {
      const res = assignmentSchema.safeParse({
        motherPublicId: "a0000000-0000-4000-8000-000000000001",
        pregnancyPublicId: "a0000000-0000-4000-8000-000000000002",
        midwifePublicId: "a0000000-0000-4000-8000-000000000003",
        facilityPublicId: "a0000000-0000-4000-8000-000000000004",
        overrideReason: "Cuti",
      });
      expect(res.success).toBe(true);
    });

    it("menerima topik artikel edukasi singkat 'KB' namun menolak ringkasan dan konten di bawah batas kualitas", () => {
      const validArticle = educationArticleCreateSchema.safeParse({
        slug: "edukasi-kb-paska-salin",
        title: "KB",
        summary: "Ringkasan panduan keluarga berencana bagi ibu nifas.",
        content: "Konten lengkap edukasi keluarga berencana bagi kesehatan ibu dan anak.",
        category: "PREGNANCY",
        sourceName: "RS",
      });
      expect(validArticle.success).toBe(true);

      const invalidTitle = educationArticleCreateSchema.safeParse({
        slug: "edukasi-kb-paska-salin",
        title: "x",
        summary: "Ringkasan panduan keluarga berencana bagi ibu nifas.",
        content: "Konten lengkap edukasi keluarga berencana bagi kesehatan ibu dan anak.",
        category: "PREGNANCY",
        sourceName: "RS",
      });
      expect(invalidTitle.success).toBe(false);

      const invalidSummary = educationArticleCreateSchema.safeParse({
        slug: "edukasi-kb-paska-salin",
        title: "KB",
        summary: "pendek",
        content: "Konten lengkap edukasi keluarga berencana bagi kesehatan ibu dan anak.",
        category: "PREGNANCY",
        sourceName: "RS",
      });
      expect(invalidSummary.success).toBe(false);

      const invalidContent = educationArticleCreateSchema.safeParse({
        slug: "edukasi-kb-paska-salin",
        title: "KB",
        summary: "Ringkasan panduan keluarga berencana bagi ibu nifas.",
        content: "konten pendek",
        category: "PREGNANCY",
        sourceName: "RS",
      });
      expect(invalidContent.success).toBe(false);
    });

    it("menerima alasan koreksi HPHT singkat seperti 'USG' dan pergantian bidan 'Cuti'", () => {
      const resPregnancy = pregnancyUpdateSchema.safeParse({
        correctionReason: "USG",
      });
      expect(resPregnancy.success).toBe(true);

      const resReplacement = replacementSchema.safeParse({
        midwifePublicId: "a0000000-0000-4000-8000-000000000001",
        reason: "Cuti",
      });
      expect(resReplacement.success).toBe(true);

      const invalidReplacement = replacementSchema.safeParse({
        midwifePublicId: "a0000000-0000-4000-8000-000000000001",
        reason: "x",
      });
      expect(invalidReplacement.success).toBe(false);
    });
  });

  describe("Indonesian Phone UX & Normalization", () => {
    it("menerima format 08, 62, dan +62 serta melakukan normalisasi kanonikal identik ke 62...", () => {
      const parsed08 = phoneSchema.parse("0853990255171");
      const parsed62 = phoneSchema.parse("62853990255171");
      const parsedPlus62 = phoneSchema.parse("+62853990255171");
      const parsedWithFormatting = phoneSchema.parse("+62 853-9902-55171");

      expect(parsed08).toBe("62853990255171");
      expect(parsed62).toBe("62853990255171");
      expect(parsedPlus62).toBe("62853990255171");
      expect(parsedWithFormatting).toBe("62853990255171");
      expect(parsed08).toBe(parsed62);
      expect(parsed62).toBe(parsedPlus62);
    });

    it("menolak nomor pendek, sampah alfabet, atau prefix non-Indonesia dengan pesan edukatif", () => {
      const shortRes = phoneSchema.safeParse("0812");
      expect(shortRes.success).toBe(false);
      if (!shortRes.success) {
        expect(shortRes.error.issues[0]?.message).toBe(
          "Masukkan nomor handphone Indonesia yang valid, misalnya 0853xxxxxxxx.",
        );
      }

      const alphaRes = phoneSchema.safeParse("nomorhpibu");
      expect(alphaRes.success).toBe(false);
      if (!alphaRes.success) {
        expect(alphaRes.error.issues[0]?.message).toBe(
          "Masukkan nomor handphone Indonesia yang valid, misalnya 0853xxxxxxxx.",
        );
      }
    });

    it("loginSchema menormalkan nomor telepon berawalan 08 secara transparan", () => {
      const res = loginSchema.safeParse({
        phoneNumber: "081234567890",
        password: "Password123!",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phoneNumber).toBe("6281234567890");
      }
    });

    it("fasilitas kesehatan menerima nomor telepon kantor/seluler dan nomor darurat 119", () => {
      const resOffice = facilityPhoneSchema.parse("0921-3121449");
      expect(resOffice).toBe("629213121449");

      const resEmergency119 = emergencyPhoneSchema.parse("119");
      expect(resEmergency119).toBe("119");

      const resEmergencyPhone = emergencyPhoneSchema.parse("081234567890");
      expect(resEmergencyPhone).toBe("6281234567890");
    });
  });
});
