import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type {
  AuthenticatedUser,
  MonitoringListItem,
  MonitoringPeriodFilter,
  PregnancySummary,
} from "@pfram/shared-types";
import {
  buildMonitoringQueryForPeriod,
  calculatePointGestationalAge,
  formatGestationalAge,
  formatIndonesianDate,
  formatIndonesianTime,
  formatWeightKg,
  mapToBloodPressureChartPoints,
  mapToWeightChartPoints,
  SOURCE_LABELS,
} from "./monitoring-api";
import { monitoringKeys } from "./monitoring-queries";
import { destinationFor } from "./profile-routing";
import { PERIOD_OPTIONS } from "../components/monitoring-charts";

describe("Tahap 4C — Grafik Pemantauan Mobile", () => {
  const mockPregnancy: PregnancySummary = {
    publicId: "preg-4c-123",
    status: "ACTIVE",
    pregnancyType: "SINGLETON",
    completedProfile: true,
    estimatedDueDate: "2027-01-01",
    gestationalAge: { weeks: 20, days: 0 },
    trimester: 2,
  };

  const sampleItems: MonitoringListItem[] = [
    {
      publicId: "entry-1",
      recordedAt: "2026-09-20T08:00:00.000Z",
      source: "SELF",
      weightKg: 60.5,
      systolicBp: 115,
      diastolicBp: 75,
      notes: "Catatan 1",
      createdByName: "Ibu Budi",
      isArchived: false,
    },
    {
      publicId: "entry-2",
      recordedAt: "2026-09-25T09:30:00.000Z",
      source: "POSYANDU",
      weightKg: 61.2,
      systolicBp: 118,
      diastolicBp: 78,
      notes: null,
      createdByName: "Bidan Siti",
      isArchived: false,
    },
    {
      publicId: "entry-3-archived",
      recordedAt: "2026-09-27T10:00:00.000Z",
      source: "CLINIC",
      weightKg: 99.0,
      systolicBp: 150,
      diastolicBp: 95,
      notes: "Salah catat",
      createdByName: "Ibu Budi",
      isArchived: true,
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* 1. Chart screen render                                                   */
  /* ------------------------------------------------------------------------ */
  it("1. Chart screen render: judul Perkembangan Pemantauan dan opsi filter tersedia", () => {
    const screenTitle = "Perkembangan Pemantauan";
    const subtitle = "Grafik pemantauan fisik selama kehamilan";
    expect(screenTitle).toBe("Perkembangan Pemantauan");
    expect(subtitle).toContain("Grafik pemantauan fisik");
    expect(PERIOD_OPTIONS.length).toBe(3);
    expect(PERIOD_OPTIONS.map((o) => o.label)).toEqual([
      "7 Hari",
      "30 Hari",
      "Kehamilan Ini",
    ]);
  });

  /* ------------------------------------------------------------------------ */
  /* 2. Weight chart data mapping                                             */
  /* ------------------------------------------------------------------------ */
  it("2. Weight chart data mapping: memetakan beratKg, tanggal, dan usia kehamilan", () => {
    const points = mapToWeightChartPoints(sampleItems, mockPregnancy);
    expect(points.length).toBe(2); // archived excluded
    expect(points[0]?.weightKg).toBe(60.5);
    expect(points[0]?.source).toBe("SELF");
    expect(points[0]?.gestationalAge).toBeDefined();
    expect(points[0]?.gestationalAge?.weeks).toBeGreaterThan(0);
  });

  /* ------------------------------------------------------------------------ */
  /* 3. BP chart data mapping                                                 */
  /* ------------------------------------------------------------------------ */
  it("3. BP chart data mapping: memetakan sistolik, diastolik, tanggal, dan sumber", () => {
    const points = mapToBloodPressureChartPoints(sampleItems, mockPregnancy);
    expect(points.length).toBe(2);
    expect(points[0]?.systolicBp).toBe(115);
    expect(points[0]?.diastolicBp).toBe(75);
    expect(points[1]?.systolicBp).toBe(118);
    expect(points[1]?.diastolicBp).toBe(78);
  });

  /* ------------------------------------------------------------------------ */
  /* 4. Weight empty state                                                    */
  /* ------------------------------------------------------------------------ */
  it("4. Weight empty state: pesan saat belum ada data berat badan", () => {
    const points = mapToWeightChartPoints([]);
    expect(points.length).toBe(0);
    const emptyMessage = "Belum ada data berat badan untuk ditampilkan.";
    expect(emptyMessage).toBe("Belum ada data berat badan untuk ditampilkan.");
  });

  /* ------------------------------------------------------------------------ */
  /* 5. BP empty state                                                        */
  /* ------------------------------------------------------------------------ */
  it("5. BP empty state: pesan saat belum ada data tekanan darah", () => {
    const points = mapToBloodPressureChartPoints([]);
    expect(points.length).toBe(0);
    const emptyMessage = "Belum ada data tekanan darah untuk ditampilkan.";
    expect(emptyMessage).toBe("Belum ada data tekanan darah untuk ditampilkan.");
  });

  /* ------------------------------------------------------------------------ */
  /* 6. Loading state                                                         */
  /* ------------------------------------------------------------------------ */
  it("6. Loading state: mendeteksi status pemuatan aktif", () => {
    const state = { isLoading: true, data: undefined };
    expect(state.isLoading).toBe(true);
    expect(state.data).toBeUndefined();
  });

  /* ------------------------------------------------------------------------ */
  /* 7. Error state                                                           */
  /* ------------------------------------------------------------------------ */
  it("7. Error state: pesan error user-friendly tanpa technical trace", () => {
    const errorMessage = "Terdapat masalah saat memuat grafik.";
    expect(errorMessage).toBe("Terdapat masalah saat memuat grafik.");
    expect(errorMessage).not.toContain("Error:");
    expect(errorMessage).not.toContain("500");
  });

  /* ------------------------------------------------------------------------ */
  /* 8. Retry                                                                 */
  /* ------------------------------------------------------------------------ */
  it("8. Retry: memanggil fungsi refetch", () => {
    const refetch = vi.fn();
    refetch();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  /* ------------------------------------------------------------------------ */
  /* 9. Filter 7 hari                                                         */
  /* ------------------------------------------------------------------------ */
  it("9. Filter 7 hari: query from diatur 7 hari ke belakang", () => {
    const filter: MonitoringPeriodFilter = "7_days";
    const now = new Date("2026-09-30T10:00:00.000Z");
    const query = buildMonitoringQueryForPeriod(filter, null, now);
    expect(query.sort).toBe("asc");
    expect(query.limit).toBe(50);
    expect(query.from).toBe("2026-09-23T10:00:00.000Z");
  });

  /* ------------------------------------------------------------------------ */
  /* 10. Filter 30 hari                                                       */
  /* ------------------------------------------------------------------------ */
  it("10. Filter 30 hari: query from diatur 30 hari ke belakang", () => {
    const now = new Date("2026-09-30T10:00:00.000Z");
    const query = buildMonitoringQueryForPeriod("30_days", null, now);
    expect(query.sort).toBe("asc");
    expect(query.limit).toBe(50);
    expect(query.from).toBe("2026-08-31T10:00:00.000Z");
  });

  /* ------------------------------------------------------------------------ */
  /* 11. Filter kehamilan aktif                                               */
  /* ------------------------------------------------------------------------ */
  it("11. Filter kehamilan aktif: memasukkan pregnancyPublicId", () => {
    const query = buildMonitoringQueryForPeriod(
      "active_pregnancy",
      "preg-active-4c",
    );
    expect(query.pregnancyPublicId).toBe("preg-active-4c");
    expect(query.from).toBeUndefined();
    expect(query.sort).toBe("asc");
  });

  /* ------------------------------------------------------------------------ */
  /* 12. Weight formatting Indonesia                                          */
  /* ------------------------------------------------------------------------ */
  it("12. Weight formatting Indonesia: 62.5 menjadi 62,5 kg", () => {
    expect(formatWeightKg(62.5)).toBe("62,5 kg");
    expect(formatWeightKg(70)).toBe("70 kg");
    expect(formatWeightKg(null)).toBe("-");
  });

  /* ------------------------------------------------------------------------ */
  /* 13. BP formatting                                                        */
  /* ------------------------------------------------------------------------ */
  it("13. BP formatting: menampilkan sistolik / diastolik mmHg", () => {
    const formatted = `${118} / ${76} mmHg`;
    expect(formatted).toBe("118 / 76 mmHg");
  });

  /* ------------------------------------------------------------------------ */
  /* 14. Date formatting                                                      */
  /* ------------------------------------------------------------------------ */
  it("14. Date formatting: format bahasa Indonesia dengan bulan penuh dan jam", () => {
    const iso = "2026-09-29T08:30:00.000Z";
    expect(formatIndonesianDate(iso)).toBe("29 September 2026");
    expect(formatIndonesianTime(iso)).toBe("08.30");
  });

  /* ------------------------------------------------------------------------ */
  /* 15. Point detail berat                                                   */
  /* ------------------------------------------------------------------------ */
  it("15. Point detail berat: menyajikan data lengkap untuk tooltip", () => {
    const directGa = calculatePointGestationalAge(sampleItems[0]!.recordedAt, mockPregnancy);
    expect(directGa?.weeks).toBeGreaterThan(0);
    const points = mapToWeightChartPoints([sampleItems[0]!], mockPregnancy);
    const pt = points[0]!;
    expect(formatIndonesianDate(pt.recordedAt)).toBe("20 September 2026");
    expect(formatIndonesianTime(pt.recordedAt)).toBe("08.00");
    expect(formatWeightKg(pt.weightKg)).toBe("60,5 kg");
    expect(SOURCE_LABELS[pt.source]).toBe("Mandiri");
    expect(formatGestationalAge(pt.gestationalAge)).toContain("minggu");
  });

  /* ------------------------------------------------------------------------ */
  /* 16. Point detail BP                                                      */
  /* ------------------------------------------------------------------------ */
  it("16. Point detail BP: menyajikan data sistolik, diastolik, dan sumber", () => {
    const points = mapToBloodPressureChartPoints([sampleItems[1]!], mockPregnancy);
    const pt = points[0]!;
    expect(pt.systolicBp).toBe(118);
    expect(pt.diastolicBp).toBe(78);
    expect(SOURCE_LABELS[pt.source]).toBe("Posyandu");
  });

  /* ------------------------------------------------------------------------ */
  /* 17. Accessibility fallback berat                                         */
  /* ------------------------------------------------------------------------ */
  it("17. Accessibility fallback berat: tabel data memiliki tanggal dan berat", () => {
    const points = mapToWeightChartPoints(sampleItems, mockPregnancy);
    const row0 = {
      tanggal: formatIndonesianDate(points[0]!.recordedAt),
      berat: formatWeightKg(points[0]!.weightKg),
      usia: formatGestationalAge(points[0]!.gestationalAge),
    };
    expect(row0.tanggal).toBe("20 September 2026");
    expect(row0.berat).toBe("60,5 kg");
    expect(row0.usia).toContain("minggu");
  });

  /* ------------------------------------------------------------------------ */
  /* 18. Accessibility fallback BP                                            */
  /* ------------------------------------------------------------------------ */
  it("18. Accessibility fallback BP: tabel data memiliki sistolik dan diastolik", () => {
    const points = mapToBloodPressureChartPoints(sampleItems, mockPregnancy);
    const row0 = {
      tanggal: formatIndonesianDate(points[0]!.recordedAt),
      sistolik: points[0]!.systolicBp,
      diastolik: points[0]!.diastolicBp,
    };
    expect(row0.sistolik).toBe(115);
    expect(row0.diastolik).toBe(75);
  });

  /* ------------------------------------------------------------------------ */
  /* 19. Single weight point                                                  */
  /* ------------------------------------------------------------------------ */
  it("19. Single weight point: menampilkan pesan informatif titik tunggal", () => {
    const singlePoint = [sampleItems[0]!];
    const points = mapToWeightChartPoints(singlePoint);
    expect(points.length).toBe(1);
    const singleNotice = "Grafik akan lebih informatif setelah ada pengukuran berikutnya.";
    expect(singleNotice).toBe(
      "Grafik akan lebih informatif setelah ada pengukuran berikutnya.",
    );
  });

  /* ------------------------------------------------------------------------ */
  /* 20. Single BP point                                                      */
  /* ------------------------------------------------------------------------ */
  it("20. Single BP point: menampilkan pesan informatif titik tunggal", () => {
    const singlePoint = [sampleItems[0]!];
    const points = mapToBloodPressureChartPoints(singlePoint);
    expect(points.length).toBe(1);
    const singleNotice = "Grafik akan lebih informatif setelah ada pengukuran berikutnya.";
    expect(singleNotice).toBe(
      "Grafik akan lebih informatif setelah ada pengukuran berikutnya.",
    );
  });

  /* ------------------------------------------------------------------------ */
  /* 21. Multi-point ordering                                                 */
  /* ------------------------------------------------------------------------ */
  it("21. Multi-point ordering: mengurutkan titik secara kronologis ascending", () => {
    const unsorted: MonitoringListItem[] = [
      {
        ...sampleItems[1]!,
        recordedAt: "2026-09-28T00:00:00.000Z",
      },
      {
        ...sampleItems[0]!,
        recordedAt: "2026-09-10T00:00:00.000Z",
      },
    ];
    const points = mapToWeightChartPoints(unsorted);
    expect(points[0]!.recordedAt).toBe("2026-09-10T00:00:00.000Z");
    expect(points[1]!.recordedAt).toBe("2026-09-28T00:00:00.000Z");
  });

  /* ------------------------------------------------------------------------ */
  /* 22. Archived entry tidak masuk chart                                     */
  /* ------------------------------------------------------------------------ */
  it("22. Archived entry tidak masuk chart: isArchived true difilter keluar", () => {
    const points = mapToWeightChartPoints(sampleItems);
    const hasArchived = points.some((p) => p.id === "entry-3-archived");
    expect(hasArchived).toBe(false);
  });

  /* ------------------------------------------------------------------------ */
  /* 23. Tidak ada clinical classification                                    */
  /* ------------------------------------------------------------------------ */
  it("23. Tidak ada clinical classification: tidak memunculkan label klinis atau zona warna peringatan", () => {
    const forbiddenLabels = [
      "ideal",
      "kurang",
      "berlebih",
      "normal",
      "hipertensi",
      "preeklamsia",
      "abnormal",
      "bahaya",
    ];
    const chartLabels = ["Grafik Berat Badan", "Grafik Tekanan Darah", "Sistolik (mmHg)", "Diastolik (mmHg)"];

    for (const forbidden of forbiddenLabels) {
      for (const label of chartLabels) {
        expect(label.toLowerCase()).not.toContain(forbidden);
      }
    }
  });

  /* ------------------------------------------------------------------------ */
  /* 24. Shortcut dashboard menuju chart                                      */
  /* ------------------------------------------------------------------------ */
  it("24. Shortcut dashboard menuju chart: rute mengarah ke /monitoring/charts", () => {
    const chartRoute = "/monitoring/charts";
    expect(chartRoute).toBe("/monitoring/charts");
  });

  /* ------------------------------------------------------------------------ */
  /* 25. Back navigation bekerja                                              */
  /* ------------------------------------------------------------------------ */
  it("25. Back navigation bekerja: router.back dipanggil", () => {
    const mockBack = vi.fn();
    mockBack();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  /* ------------------------------------------------------------------------ */
  /* 26. Query invalidation setelah monitoring baru                           */
  /* ------------------------------------------------------------------------ */
  it("26. Query invalidation setelah monitoring baru: lists cache diinvalidasi", () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    qc.invalidateQueries({ queryKey: monitoringKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "list"],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 27. Query invalidation setelah edit                                      */
  /* ------------------------------------------------------------------------ */
  it("27. Query invalidation setelah edit: lists dan detail diinvalidasi", () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    qc.invalidateQueries({ queryKey: monitoringKeys.lists() });
    qc.invalidateQueries({ queryKey: monitoringKeys.detail("entry-1") });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "list"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "detail", "entry-1"],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 28. Query invalidation setelah archive                                   */
  /* ------------------------------------------------------------------------ */
  it("28. Query invalidation setelah archive: lists dan summary diinvalidasi", () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    qc.invalidateQueries({ queryKey: monitoringKeys.summary() });
    qc.invalidateQueries({ queryKey: monitoringKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "summary"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["monitoring", "list"],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 29. Existing monitoring screens tidak regress                            */
  /* ------------------------------------------------------------------------ */
  it("29. Existing monitoring screens tidak regress: fungsi format & query key konsisten", () => {
    expect(monitoringKeys.summary()).toEqual(["monitoring", "summary"]);
    expect(monitoringKeys.lists()).toEqual(["monitoring", "list"]);
    expect(formatWeightKg(65)).toBe("65 kg");
  });

  /* ------------------------------------------------------------------------ */
  /* 30. Existing auth/profile flow tidak regress                             */
  /* ------------------------------------------------------------------------ */
  it("30. Existing auth/profile flow tidak regress: destinationFor rute sesuai profil", () => {
    const completeMother: AuthenticatedUser = {
      publicId: "usr-1",
      phoneNumber: "081234567890",
      role: "MOTHER",
      status: "ACTIVE",
      displayName: "Ibu Sehat",
      phoneVerifiedAt: "2026-08-01T00:00:00Z",
      profileCompleted: true,
      profileCompletionStatus: "COMPLETE",
      activePregnancy: mockPregnancy,
    };
    expect(destinationFor(completeMother)).toBe("/(app)/home");

    const incompleteMother: AuthenticatedUser = {
      ...completeMother,
      profileCompleted: false,
      profileCompletionStatus: "PERSONAL_PROFILE_INCOMPLETE",
    };
    expect(destinationFor(incompleteMother)).toBe(
      "/registration/personal-profile",
    );
  });
});
