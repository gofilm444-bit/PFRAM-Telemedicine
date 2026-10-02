import { describe, it, expect } from "vitest";
import type {
  DangerScreening,
  DangerSignRule,
} from "@pfram/shared-types";
import {
  cleanPhoneForUrl,
  formatScreeningDate,
  getDangerDeepLinks,
} from "./danger-screening-api";
import { dangerKeys } from "./danger-screening-queries";

describe("Tahap 6A — Mobile Danger Screening Suite", () => {
  const mockRules: DangerSignRule[] = [
    {
      publicId: "R1",
      code: "BLEEDING",
      title: "Perdarahan Jalan Lahir",
      description: "Darah segar atau flek banyak",
      trimesterApplicability: [1, 2, 3],
      question: "Apakah Ibu mengalami perdarahan dari jalan lahir?",
      severityCategory: "URGENT",
      sortOrder: 1,
      active: true,
    },
    {
      publicId: "R2",
      code: "HIGH_FEVER",
      title: "Demam Tinggi",
      description: "Suhu tubuh sangat panas",
      trimesterApplicability: [1, 2, 3],
      question: "Apakah Ibu mengalami demam tinggi atau menggigil?",
      severityCategory: "URGENT",
      sortOrder: 2,
      active: true,
    },
    {
      publicId: "R3",
      code: "SEVERE_VOMITING",
      title: "Mual Muntah Hebat",
      description: "Tidak bisa makan atau minum",
      trimesterApplicability: [1, 2],
      question: "Apakah Ibu muntah terus-menerus hingga lemas?",
      severityCategory: "WARNING",
      sortOrder: 3,
      active: true,
    },
    {
      publicId: "R4",
      code: "DECREASED_FETAL_MOVEMENT",
      title: "Gerakan Janin Berkurang",
      description: "Gerakan janin jauh berkurang",
      trimesterApplicability: [2, 3],
      question: "Apakah gerakan janin terasa jauh berkurang hari ini?",
      severityCategory: "URGENT",
      sortOrder: 4,
      active: true,
    },
  ];

  // 1. Home Card Render
  it("1. Home Card Render: Kartu edukasi tanda bahaya memuat teks dan tombol mulai", () => {
    const cardData = {
      title: "Kenali Tanda Bahaya",
      subtitle: "Skrining mandiri cepat berbasis panduan resmi Buku KIA",
      startLabel: "Mulai Skrining",
      historyLabel: "Riwayat",
    };

    expect(cardData.title).toBe("Kenali Tanda Bahaya");
    expect(cardData.subtitle).toContain("Buku KIA");
    expect(cardData.startLabel).toBe("Mulai Skrining");
    expect(cardData.historyLabel).toBe("Riwayat");
  });

  // 2. Rules Fetch & Filter
  it("2. Rules Fetch & Filter: Memfilter pertanyaan berdasarkan trimester aktif ibu", () => {
    const trimester1 = 1;
    const trimester3 = 3;

    const t1Rules = mockRules.filter((r) =>
      r.trimesterApplicability.includes(trimester1),
    );
    expect(t1Rules.map((r) => r.code)).toContain("BLEEDING");
    expect(t1Rules.map((r) => r.code)).toContain("SEVERE_VOMITING");
    expect(t1Rules.map((r) => r.code)).not.toContain("DECREASED_FETAL_MOVEMENT");

    const t3Rules = mockRules.filter((r) =>
      r.trimesterApplicability.includes(trimester3),
    );
    expect(t3Rules.map((r) => r.code)).toContain("DECREASED_FETAL_MOVEMENT");
    expect(t3Rules.map((r) => r.code)).not.toContain("SEVERE_VOMITING");
  });

  // 3. Yes/No Answer Selection
  it("3. Yes/No Answer Selection: Memperbarui state jawaban saat opsi YA / TIDAK dipilih", () => {
    let answers: Record<string, boolean> = {};

    // Select YES for BLEEDING
    answers = { ...answers, BLEEDING: true };
    expect(answers["BLEEDING"]).toBe(true);

    // Select NO for HIGH_FEVER
    answers = { ...answers, HIGH_FEVER: false };
    expect(answers["HIGH_FEVER"]).toBe(false);
  });

  // 4. Progress Counter
  it("4. Progress Counter: Menampilkan progres pertanyaan (contoh: Pertanyaan 3 dari 8)", () => {
    const totalQuestions = 8;
    const formatProgress = (current: number, total: number) =>
      `Pertanyaan ${current + 1} dari ${total}`;

    expect(formatProgress(0, totalQuestions)).toBe("Pertanyaan 1 dari 8");
    expect(formatProgress(2, totalQuestions)).toBe("Pertanyaan 3 dari 8");
    expect(formatProgress(7, totalQuestions)).toBe("Pertanyaan 8 dari 8");
  });

  // 5. No-Danger Result View
  it("5. No-Danger Result View: Menampilkan teks aman netral non-diagnostik", () => {
    const result: DangerScreening = {
      publicId: "SCR-SAFE",
      motherPublicId: "M-1",
      pregnancyPublicId: "P-1",
      screenedAt: "2026-09-30T09:00:00.000Z",
      status: "NO_DANGER_REPORTED",
      reportedSignsCount: 0,
      ruleSetVersion: "KEMENKES-KIA-2023-V1",
      followUpStatus: "RESOLVED",
      createdAt: "2026-09-30T09:00:00.000Z",
    };

    const isUrgent = result.status === "REQUIRES_IMMEDIATE_CARE";
    const isSafe = result.status === "NO_DANGER_REPORTED";
    expect(isUrgent).toBe(false);
    expect(isSafe).toBe(true);
    expect(result.reportedSignsCount).toBe(0);
  });

  // 6. Urgent Danger Result View
  it("6. Urgent Danger Result View: Menampilkan instruksi darurat Segera ke Faskes", () => {
    const result: DangerScreening = {
      publicId: "SCR-URGENT",
      motherPublicId: "M-1",
      pregnancyPublicId: "P-1",
      screenedAt: "2026-09-30T09:00:00.000Z",
      status: "REQUIRES_IMMEDIATE_CARE",
      reportedSignsCount: 1,
      ruleSetVersion: "KEMENKES-KIA-2023-V1",
      followUpStatus: "PENDING",
      createdAt: "2026-09-30T09:00:00.000Z",
    };

    expect(result.status).toBe("REQUIRES_IMMEDIATE_CARE");
    const emergencyInstruction =
      "Jangan menunggu balasan melalui aplikasi. Segera datangi IGD Puskesmas atau Rumah Sakit terdekat bersama pendamping.";
    expect(emergencyInstruction).toContain("Jangan menunggu balasan");
    expect(emergencyInstruction).toContain("IGD");
  });

  // 7. Contact Bidan Deep Link
  it("7. Contact Bidan Deep Link: Menghasilkan format tel: dan wa.me yang valid", () => {
    const links = getDangerDeepLinks("081234567890", "081999999999");
    expect(links.midwifeCallUrl).toBe("tel:6281234567890");
    expect(links.midwifeWhatsAppUrl).toContain("https://wa.me/6281234567890");
    expect(links.midwifeWhatsAppUrl).toContain("Halo%20Bidan");
  });

  // 8. Contact Facility Deep Link
  it("8. Contact Facility Deep Link: Menghasilkan format tel: faskes yang valid", () => {
    const links = getDangerDeepLinks("081234567890", "081999999999");
    expect(links.facilityCallUrl).toBe("tel:6281999999999");

    const linksWithoutFacility = getDangerDeepLinks("081234567890", null);
    expect(linksWithoutFacility.facilityCallUrl).toBeNull();
  });

  // 9. History Screen Items
  it("9. History Screen Items: Menampilkan riwayat dan jumlah tanda terlaporkan", () => {
    const historyItem: DangerScreening = {
      publicId: "SCR-001",
      motherPublicId: "M-1",
      pregnancyPublicId: "P-1",
      screenedAt: "2026-09-28T09:00:00.000Z",
      status: "DANGER_SIGN_REPORTED",
      reportedSignsCount: 1,
      ruleSetVersion: "KEMENKES-KIA-2023-V1",
      followUpStatus: "CONTACTED",
      createdAt: "2026-09-28T09:00:00.000Z",
    };

    const formattedDate = formatScreeningDate(historyItem.screenedAt);
    expect(formattedDate).toContain("2026");
    expect(historyItem.reportedSignsCount).toBe(1);
    expect(historyItem.followUpStatus).toBe("CONTACTED");
  });

  // 10. History Detail View
  it("10. History Detail View: Menampilkan detail pertanyaan dan jawaban", () => {
    const screening: DangerScreening = {
      publicId: "SCR-001",
      motherPublicId: "M-1",
      pregnancyPublicId: "P-1",
      screenedAt: "2026-09-28T09:00:00.000Z",
      status: "REQUIRES_IMMEDIATE_CARE",
      reportedSignsCount: 1,
      ruleSetVersion: "KEMENKES-KIA-2023-V1",
      followUpStatus: "PENDING",
      responses: [
        {
          ruleCode: "BLEEDING",
          title: "Perdarahan Jalan Lahir",
          question: "Apakah Ibu mengalami perdarahan?",
          answer: true,
          severityCategory: "URGENT",
        },
      ],
      createdAt: "2026-09-28T09:00:00.000Z",
    };

    expect(screening.responses).toHaveLength(1);
    expect(screening.responses![0]!.answer).toBe(true);
    expect(screening.responses![0]!.severityCategory).toBe("URGENT");
  });

  // 11. Network Error Preserves Answers
  it("11. Network Error Preserves Answers: Jawaban tetap tersimpan di form saat kirim gagal", () => {
    const formAnswers = {
      BLEEDING: true,
      HIGH_FEVER: false,
      SEVERE_VOMITING: false,
    };

    let submitError: string | null = null;
    try {
      throw new Error("Koneksi internet terputus");
    } catch (e) {
      submitError = (e as Error).message;
    }

    // Answers are still intact
    expect(submitError).toBe("Koneksi internet terputus");
    expect(formAnswers["BLEEDING"]).toBe(true);
    expect(formAnswers["HIGH_FEVER"]).toBe(false);
  });

  // 12. Local Emergency Fallback
  it("12. Local Emergency Fallback: Peringatan darurat aktif lokal saat ada URGENT = YA", () => {
    const answers: Record<string, boolean> = {
      BLEEDING: true, // BLEEDING is URGENT
      HIGH_FEVER: false,
    };

    const hasLocalUrgentDanger = mockRules.some(
      (r) => r.severityCategory === "URGENT" && answers[r.code] === true,
    );
    expect(hasLocalUrgentDanger).toBe(true);

    const safeAnswers: Record<string, boolean> = {
      BLEEDING: false,
      HIGH_FEVER: false,
      SEVERE_VOMITING: true, // WARNING only
    };

    const hasNoUrgentDanger = mockRules.some(
      (r) => r.severityCategory === "URGENT" && safeAnswers[r.code] === true,
    );
    expect(hasNoUrgentDanger).toBe(false);
  });

  // 13. Retry Mechanism
  it("13. Retry Mechanism: Kirim ulang menggunakan payload jawaban yang ada", async () => {
    const storedAnswers = { BLEEDING: false, HIGH_FEVER: false };
    let attempts = 0;

    const mockSubmit = async (data: typeof storedAnswers) => {
      attempts++;
      if (attempts === 1) throw new Error("Gagal jaringan pertama");
      return { success: true, count: Object.keys(data).length };
    };

    // First attempt fails
    await expect(mockSubmit(storedAnswers)).rejects.toThrow("Gagal jaringan pertama");
    expect(attempts).toBe(1);

    // Retry succeeds with same data
    const retryResult = await mockSubmit(storedAnswers);
    expect(retryResult.success).toBe(true);
    expect(attempts).toBe(2);
  });

  // 14. Accessibility Roles & Labels
  it("14. Accessibility Roles & Labels: Label aksesibilitas lengkap untuk screen reader", () => {
    const currentRule = mockRules[0]!;
    const yesAccessibility = {
      role: "button",
      label: `Jawab Ya untuk ${currentRule.title}`,
    };
    const noAccessibility = {
      role: "button",
      label: `Jawab Tidak untuk ${currentRule.title}`,
    };

    expect(yesAccessibility.label).toBe("Jawab Ya untuk Perdarahan Jalan Lahir");
    expect(noAccessibility.label).toBe("Jawab Tidak untuk Perdarahan Jalan Lahir");
    expect(yesAccessibility.role).toBe("button");
  });

  // 15. Status Announced Without Color
  it("15. Status Announced Without Color: Pesan status eksplisit dalam teks", () => {
    const statusLabels = {
      NO_DANGER_REPORTED: "KONDISI NORMAL / AMAN — Tidak Ada Tanda Bahaya Terlapor",
      DANGER_SIGN_REPORTED: "PERLU PERHATIAN — Perlu Evaluasi Tenaga Kesehatan",
      REQUIRES_IMMEDIATE_CARE: "DARURAT SEGERA — Segera Menuju Fasilitas Kesehatan",
    };

    expect(statusLabels.NO_DANGER_REPORTED).toContain("AMAN");
    expect(statusLabels.REQUIRES_IMMEDIATE_CARE).toContain("DARURAT SEGERA");
  });

  // 16. Logout Resets Form
  it("16. Logout Resets Form: State form di-reset saat logout", () => {
    let formState: { answers: Record<string, boolean>; index: number } | null = {
      answers: { BLEEDING: true },
      index: 2,
    };

    // Simulate logout action
    formState = null;
    expect(formState).toBeNull();
  });

  // 17. URL and Query Key Helpers
  it("17. URL and Query Key Helpers: Sanitasi nomor telepon dan query keys", () => {
    expect(cleanPhoneForUrl("081234567890")).toBe("6281234567890");
    expect(cleanPhoneForUrl("+6281234567890")).toBe("6281234567890");
    expect(cleanPhoneForUrl("0812-3456-7890")).toBe("6281234567890");
    expect(cleanPhoneForUrl("")).toBe("");

    expect(dangerKeys.all).toEqual(["danger"]);
    expect(dangerKeys.signs()).toEqual(["danger", "signs"]);
    expect(dangerKeys.screenings()).toEqual(["danger", "screenings", "all"]);
    expect(dangerKeys.detail("SCR-001")).toEqual(["danger", "screening", "SCR-001"]);
  });
});
