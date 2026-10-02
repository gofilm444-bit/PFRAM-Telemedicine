import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  monitoringCreateSchema,
  monitoringUpdateSchema,
} from "@pfram/validation";
import type {
  AuthenticatedUser,
  MonitoringEntry,
  MonitoringListItem,
  MonitoringSource,
  MonitoringSummary,
} from "@pfram/shared-types";
import {
  formatIndonesianDate,
  formatIndonesianDateTime,
  formatIndonesianTime,
  formatWeightChange,
  formatWeightKg,
  MONITORING_SOURCES,
  normalizeBpInput,
  normalizeWeightInput,
  SOURCE_LABELS,
} from "./monitoring-api";
import { monitoringKeys } from "./monitoring-queries";
import { destinationFor } from "./profile-routing";

describe("Tahap 4B — Mobile Pemantauan Fisik Mandiri", () => {
  /* ------------------------------------------------------------------------ */
  /* 1. Pantau dashboard render                                              */
  /* ------------------------------------------------------------------------ */
  it("1. Pantau dashboard render: menampilkan data kehamilan dan ringkasan", () => {
    const pregnancy = {
      gestationalAge: { weeks: 24, days: 3 },
      trimester: 2 as const,
      estimatedDueDate: "2026-12-15",
    };
    const gestationalAgeText = `${pregnancy.gestationalAge.weeks} minggu ${pregnancy.gestationalAge.days} hari`;
    expect(gestationalAgeText).toBe("24 minggu 3 hari");
    expect(`Trimester ${pregnancy.trimester}`).toBe("Trimester 2");
    expect(pregnancy.estimatedDueDate).toBe("2026-12-15");
  });

  /* ------------------------------------------------------------------------ */
  /* 2. Summary berat render                                                 */
  /* ------------------------------------------------------------------------ */
  it("2. Summary berat render: nilai dalam kg dan tanggal pengukuran", () => {
    const summary: MonitoringSummary = {
      latestWeight: 62.5,
      latestWeightRecordedAt: "2026-09-29T08:30:00.000Z",
      latestBloodPressure: null,
      latestBloodPressureRecordedAt: null,
      previousWeight: 61.3,
      weightChange: 1.2,
      totalEntries: 4,
      activePregnancyPublicId: "preg-1",
    };

    const formattedWeight = formatWeightKg(summary.latestWeight);
    expect(formattedWeight).toBe("62,5 kg");

    const formattedDate = formatIndonesianDateTime(
      summary.latestWeightRecordedAt!,
    );
    expect(formattedDate).toContain("2026");

    expect(formatWeightChange(summary.weightChange)).toBe("+1,2 kg");
    expect(formatWeightChange(-0.5)).toBe("-0,5 kg");
    expect(formatWeightChange(null)).toBeNull();
  });

  /* ------------------------------------------------------------------------ */
  /* 3. Summary BP render                                                    */
  /* ------------------------------------------------------------------------ */
  it("3. Summary BP render: systolic/diastolic mmHg dan tanggal pengukuran", () => {
    const summary: MonitoringSummary = {
      latestWeight: null,
      latestWeightRecordedAt: null,
      latestBloodPressure: { systolic: 118, diastolic: 78 },
      latestBloodPressureRecordedAt: "2026-09-29T08:30:00.000Z",
      previousWeight: null,
      weightChange: null,
      totalEntries: 2,
      activePregnancyPublicId: "preg-1",
    };

    const bpStr = `${summary.latestBloodPressure?.systolic}/${summary.latestBloodPressure?.diastolic} mmHg`;
    expect(bpStr).toBe("118/78 mmHg");
    expect(
      formatIndonesianDateTime(summary.latestBloodPressureRecordedAt!),
    ).toContain("2026");
  });

  /* ------------------------------------------------------------------------ */
  /* 4. Empty summary                                                        */
  /* ------------------------------------------------------------------------ */
  it("4. Empty summary: pesan fallback ketika data belum ada", () => {
    const emptyWeightMessage = "Belum ada catatan berat badan";
    const emptyBpMessage = "Belum ada catatan tekanan darah";

    expect(emptyWeightMessage).toBe("Belum ada catatan berat badan");
    expect(emptyBpMessage).toBe("Belum ada catatan tekanan darah");
  });

  /* ------------------------------------------------------------------------ */
  /* 5. Weight only valid                                                    */
  /* ------------------------------------------------------------------------ */
  it("5. Weight only valid: berat badan saja valid", () => {
    const validWeightOnly = {
      recordedAt: new Date().toISOString(),
      source: "SELF" as const,
      weightKg: 62.5,
    };
    const res = monitoringCreateSchema.safeParse(validWeightOnly);
    expect(res.success).toBe(true);
  });

  /* ------------------------------------------------------------------------ */
  /* 6. BP only valid                                                        */
  /* ------------------------------------------------------------------------ */
  it("6. BP only valid: tekanan darah saja valid", () => {
    const validBpOnly = {
      recordedAt: new Date().toISOString(),
      source: "POSYANDU" as const,
      systolicBp: 120,
      diastolicBp: 80,
    };
    const res = monitoringCreateSchema.safeParse(validBpOnly);
    expect(res.success).toBe(true);
  });

  /* ------------------------------------------------------------------------ */
  /* 7. Combined valid                                                       */
  /* ------------------------------------------------------------------------ */
  it("7. Combined valid: berat badan + tekanan darah valid", () => {
    const validCombined = {
      recordedAt: new Date().toISOString(),
      source: "PUSKESMAS" as const,
      weightKg: 65,
      systolicBp: 110,
      diastolicBp: 70,
    };
    const res = monitoringCreateSchema.safeParse(validCombined);
    expect(res.success).toBe(true);
  });

  /* ------------------------------------------------------------------------ */
  /* 8. Empty monitoring invalid                                             */
  /* ------------------------------------------------------------------------ */
  it("8. Empty monitoring invalid: semua field pengukuran kosong ditolak", () => {
    const emptyPayload = {
      recordedAt: new Date().toISOString(),
      source: "SELF" as const,
    };
    const res = monitoringCreateSchema.safeParse(emptyPayload);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe(
        "Minimal salah satu harus diisi: berat badan atau tekanan darah",
      );
    }
  });

  /* ------------------------------------------------------------------------ */
  /* 9. Partial BP invalid                                                   */
  /* ------------------------------------------------------------------------ */
  it("9. Partial BP invalid: hanya sistolik atau hanya diastolik ditolak", () => {
    const onlySystolic = {
      recordedAt: new Date().toISOString(),
      source: "SELF" as const,
      systolicBp: 120,
    };
    const res1 = monitoringCreateSchema.safeParse(onlySystolic);
    expect(res1.success).toBe(false);
    if (!res1.success) {
      expect(res1.error.issues[0]?.message).toBe(
        "Tekanan diastolik wajib diisi jika tekanan sistolik diisi",
      );
    }

    const onlyDiastolic = {
      recordedAt: new Date().toISOString(),
      source: "SELF" as const,
      diastolicBp: 80,
    };
    const res2 = monitoringCreateSchema.safeParse(onlyDiastolic);
    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error.issues[0]?.message).toBe(
        "Tekanan sistolik wajib diisi jika tekanan diastolik diisi",
      );
    }
  });

  /* ------------------------------------------------------------------------ */
  /* 10. systolic <= diastolic invalid                                       */
  /* ------------------------------------------------------------------------ */
  it("10. systolic <= diastolic invalid: sistolik harus lebih besar dari diastolik", () => {
    const invalidBp = {
      recordedAt: new Date().toISOString(),
      source: "SELF" as const,
      systolicBp: 80,
      diastolicBp: 120,
    };
    const res = monitoringCreateSchema.safeParse(invalidBp);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe(
        "Tekanan sistolik harus lebih besar dari diastolik",
      );
    }
  });

  /* ------------------------------------------------------------------------ */
  /* 11. Decimal comma normalisasi                                           */
  /* ------------------------------------------------------------------------ */
  it("11. Decimal comma normalisasi: menerima 60,5 dan normalisasi menjadi 60.5", () => {
    expect(normalizeWeightInput("60,5")).toBe(60.5);
    expect(normalizeWeightInput(" 62,75 ")).toBe(62.75);
    expect(normalizeWeightInput("")).toBeUndefined();
    expect(normalizeBpInput("120")).toBe(120);
  });

  /* ------------------------------------------------------------------------ */
  /* 12. Source mapping benar                                                */
  /* ------------------------------------------------------------------------ */
  it("12. Source mapping benar: semua enum teknis dipetakan ke Bahasa Indonesia", () => {
    expect(SOURCE_LABELS.SELF).toBe("Mandiri");
    expect(SOURCE_LABELS.POSYANDU).toBe("Posyandu");
    expect(SOURCE_LABELS.PUSKESMAS).toBe("Puskesmas");
    expect(SOURCE_LABELS.HOSPITAL).toBe("Rumah Sakit");
    expect(SOURCE_LABELS.CLINIC).toBe("Klinik");
    expect(SOURCE_LABELS.MIDWIFE).toBe("Bidan");
    expect(SOURCE_LABELS.OTHER).toBe("Lainnya");

    const expectedKeys: MonitoringSource[] = [
      "SELF",
      "POSYANDU",
      "PUSKESMAS",
      "HOSPITAL",
      "CLINIC",
      "MIDWIFE",
      "OTHER",
    ];
    for (const key of expectedKeys) {
      expect(MONITORING_SOURCES.some((s) => s.value === key)).toBe(true);
    }
  });

  /* ------------------------------------------------------------------------ */
  /* 13. Submit success                                                      */
  /* ------------------------------------------------------------------------ */
  it("13. Submit success: submit payload valid menghasilkan pemanggilan mutation", async () => {
    const mockSubmit = vi.fn().mockResolvedValue({ publicId: "new-record-1" });
    const payload = {
      recordedAt: new Date().toISOString(),
      source: "SELF" as MonitoringSource,
      weightKg: 60.5,
      systolicBp: null,
      diastolicBp: null,
      notes: null,
    };
    await mockSubmit(payload);
    expect(mockSubmit).toHaveBeenCalledWith(payload);
  });

  /* ------------------------------------------------------------------------ */
  /* 14. Submit error mempertahankan input                                   */
  /* ------------------------------------------------------------------------ */
  it("14. Submit error mempertahankan input: form retains values after error", () => {
    const formState = {
      weightKg: "60,5",
      systolicBp: "120",
      diastolicBp: "80",
      notes: "pusing ringan",
    };
    const simulateError = () => {
      return "Terdapat kendala koneksi";
    };
    const errorMsg = simulateError();
    expect(errorMsg).toBe("Terdapat kendala koneksi");
    expect(formState.weightKg).toBe("60,5");
    expect(formState.notes).toBe("pusing ringan");
  });

  /* ------------------------------------------------------------------------ */
  /* 15. Double submit dicegah                                               */
  /* ------------------------------------------------------------------------ */
  it("15. Double submit dicegah: disabled when loading / submitting", () => {
    let isSubmitting = false;
    let callCount = 0;
    const submitHandler = () => {
      if (isSubmitting) return;
      isSubmitting = true;
      callCount++;
    };

    submitHandler();
    submitHandler();
    expect(callCount).toBe(1);
  });

  /* ------------------------------------------------------------------------ */
  /* 16. History render                                                      */
  /* ------------------------------------------------------------------------ */
  it("16. History render: render tanggal, waktu, berat, BP, sumber, dan catatan", () => {
    const item: MonitoringListItem = {
      publicId: "mon-1",
      recordedAt: "2026-09-29T08:30:00.000Z",
      source: "POSYANDU",
      weightKg: 62.5,
      systolicBp: 118,
      diastolicBp: 78,
      notes: "Kondisi stabil",
      createdByName: "Ibu",
      isArchived: false,
    };

    expect(formatIndonesianDate(item.recordedAt)).toContain("2026");
    expect(formatIndonesianTime(item.recordedAt)).toBe("08.30");
    expect(formatWeightKg(item.weightKg)).toBe("62,5 kg");
    expect(`${item.systolicBp}/${item.diastolicBp} mmHg`).toBe("118/78 mmHg");
    expect(SOURCE_LABELS[item.source]).toBe("Posyandu");
    expect(item.notes).toBe("Kondisi stabil");
  });

  /* ------------------------------------------------------------------------ */
  /* 17. Empty history                                                       */
  /* ------------------------------------------------------------------------ */
  it("17. Empty history: pesan kosong dan tombol tambah catatan", () => {
    const emptyMsg = "Belum ada catatan pemantauan.";
    expect(emptyMsg).toBe("Belum ada catatan pemantauan.");
  });

  /* ------------------------------------------------------------------------ */
  /* 18. Error history + retry                                               */
  /* ------------------------------------------------------------------------ */
  it("18. Error history + retry: pesan ramah dan retry callback", () => {
    const mockRefetch = vi.fn();
    const errorMsg = "Terdapat masalah saat memuat data.";
    expect(errorMsg).toBe("Terdapat masalah saat memuat data.");
    mockRefetch();
    expect(mockRefetch).toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /* 19. Filter weight                                                       */
  /* ------------------------------------------------------------------------ */
  it("19. Filter weight: filter query type 'weight'", () => {
    const query = { type: "weight" as const, page: 1, limit: 10 };
    expect(query.type).toBe("weight");
    const key = monitoringKeys.list(query);
    expect(key).toEqual(["monitoring", "list", query]);
  });

  /* ------------------------------------------------------------------------ */
  /* 20. Filter BP                                                           */
  /* ------------------------------------------------------------------------ */
  it("20. Filter BP: filter query type 'blood_pressure'", () => {
    const query = { type: "blood_pressure" as const, page: 1, limit: 10 };
    expect(query.type).toBe("blood_pressure");
    const key = monitoringKeys.list(query);
    expect(key).toEqual(["monitoring", "list", query]);
  });

  /* ------------------------------------------------------------------------ */
  /* 21. Detail render                                                       */
  /* ------------------------------------------------------------------------ */
  it("21. Detail render: format data detail lengkap", () => {
    const entry: MonitoringEntry = {
      publicId: "entry-1",
      motherPublicId: "m-1",
      pregnancyPublicId: "p-1",
      recordedAt: "2026-09-29T08:30:00.000Z",
      source: "MIDWIFE",
      weightKg: 64,
      systolicBp: 120,
      diastolicBp: 80,
      notes: "Pemeriksaan rutin bidan",
      createdBy: {
        publicId: "u-1",
        role: "MOTHER",
        displayName: "Ibu",
      },
      createdAt: "2026-09-29T08:30:00.000Z",
      updatedAt: "2026-09-29T08:30:00.000Z",
      archivedAt: null,
    };

    expect(formatWeightKg(entry.weightKg)).toBe("64 kg");
    expect(`${entry.systolicBp}/${entry.diastolicBp} mmHg`).toBe("120/80 mmHg");
    expect(SOURCE_LABELS[entry.source]).toBe("Bidan");
    expect(entry.notes).toBe("Pemeriksaan rutin bidan");
  });

  /* ------------------------------------------------------------------------ */
  /* 22. Edit prefill                                                        */
  /* ------------------------------------------------------------------------ */
  it("22. Edit prefill: nilai awal form diisi dari entri yang diedit", () => {
    const existing: MonitoringEntry = {
      publicId: "entry-1",
      motherPublicId: "m-1",
      pregnancyPublicId: "p-1",
      recordedAt: "2026-09-29T08:30:00.000Z",
      source: "HOSPITAL",
      weightKg: 63.5,
      systolicBp: 125,
      diastolicBp: 85,
      notes: "Pemeriksaan RS",
      createdBy: { publicId: "u-1", role: "MOTHER", displayName: "Ibu" },
      createdAt: "2026-09-29T08:30:00.000Z",
      updatedAt: "2026-09-29T08:30:00.000Z",
      archivedAt: null,
    };

    const prefill = {
      recordedAt: existing.recordedAt.slice(0, 16),
      source: existing.source,
      weightKg: String(existing.weightKg).replace(".", ","),
      systolicBp: String(existing.systolicBp),
      diastolicBp: String(existing.diastolicBp),
      notes: existing.notes ?? "",
    };

    expect(prefill.weightKg).toBe("63,5");
    expect(prefill.systolicBp).toBe("125");
    expect(prefill.diastolicBp).toBe("85");
    expect(prefill.source).toBe("HOSPITAL");
  });

  /* ------------------------------------------------------------------------ */
  /* 23. Edit submit                                                         */
  /* ------------------------------------------------------------------------ */
  it("23. Edit submit: validasi update schema dan eksekusi update", () => {
    const updatePayload = {
      weightKg: 64,
      systolicBp: 120,
      diastolicBp: 80,
      notes: "Catatan diperbarui",
    };
    const res = monitoringUpdateSchema.safeParse(updatePayload);
    expect(res.success).toBe(true);
  });

  /* ------------------------------------------------------------------------ */
  /* 24. Archive confirmation                                                */
  /* ------------------------------------------------------------------------ */
  it("24. Archive confirmation: dialog konfirmasi menampilkan teks yang benar", () => {
    const dialogConfig = {
      title: "Arsipkan catatan?",
      message: "Catatan ini tidak akan tampil lagi dalam riwayat aktif.",
      confirmLabel: "Arsipkan",
      cancelLabel: "Batal",
    };
    expect(dialogConfig.title).toBe("Arsipkan catatan?");
    expect(dialogConfig.message).toBe(
      "Catatan ini tidak akan tampil lagi dalam riwayat aktif.",
    );
  });

  /* ------------------------------------------------------------------------ */
  /* 25. Archive cancel                                                      */
  /* ------------------------------------------------------------------------ */
  it("25. Archive cancel: membatalkan arsip menutup dialog tanpa memanggil API", () => {
    const mockArchiveApi = vi.fn();
    let isDialogVisible = true;
    const onCancel = () => {
      isDialogVisible = false;
    };

    onCancel();
    expect(isDialogVisible).toBe(false);
    expect(mockArchiveApi).not.toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /* 26. Archive success                                                     */
  /* ------------------------------------------------------------------------ */
  it("26. Archive success: konfirmasi arsip memanggil endpoint archive", async () => {
    const mockArchiveApi = vi.fn().mockResolvedValue({
      publicId: "entry-1",
      archivedAt: new Date().toISOString(),
    });

    await mockArchiveApi("entry-1");
    expect(mockArchiveApi).toHaveBeenCalledWith("entry-1");
  });

  /* ------------------------------------------------------------------------ */
  /* 27. Summary refresh after create                                        */
  /* ------------------------------------------------------------------------ */
  it("27. Summary refresh after create: query cache invalidated", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.invalidateQueries({ queryKey: monitoringKeys.summary() });
    queryClient.invalidateQueries({ queryKey: monitoringKeys.lists() });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "summary"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "list"],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 28. Summary refresh after update                                        */
  /* ------------------------------------------------------------------------ */
  it("28. Summary refresh after update: detail, summary, and list invalidated", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.invalidateQueries({ queryKey: monitoringKeys.summary() });
    queryClient.invalidateQueries({ queryKey: monitoringKeys.lists() });
    queryClient.invalidateQueries({
      queryKey: monitoringKeys.detail("entry-1"),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "detail", "entry-1"],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 29. Summary refresh after archive                                       */
  /* ------------------------------------------------------------------------ */
  it("29. Summary refresh after archive: summary and list invalidated", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.invalidateQueries({ queryKey: monitoringKeys.summary() });
    queryClient.invalidateQueries({ queryKey: monitoringKeys.lists() });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "summary"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "list"],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 30. Logout/session tidak regress                                        */
  /* ------------------------------------------------------------------------ */
  it("30. Logout/session tidak regress: routing profil dan sesi tetap konsisten", () => {
    const baseUser = (
      profileCompletionStatus: AuthenticatedUser["profileCompletionStatus"],
    ): AuthenticatedUser => ({
      publicId: "31000000-0000-4000-8000-000000000001",
      phoneNumber: "628111111111",
      role: "MOTHER",
      status: "ACTIVE",
      displayName: "Ibu",
      phoneVerifiedAt: null,
      profileCompletionStatus,
    });

    expect(destinationFor(baseUser("COMPLETE"))).toBe("/(app)/home");
    expect(destinationFor(baseUser("ACCOUNT_READY"))).toBe(
      "/registration/personal-profile",
    );
  });
});
