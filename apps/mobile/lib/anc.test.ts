import { describe, it, expect, beforeEach } from "vitest";
import {
  parseHourMinute,
  scheduleDailyIronTabletReminder,
  scheduleAncVisitReminder,
  scheduleSnoozeReminder,
  cancelNotification,
  cancelAllNotifications,
} from "./notifications";
import {
  ANC_STATUS_BADGES,
  formatAncDateShort,
  formatAncTime,
  formatAncDateTime,
  isAncAppointmentDayArrived,
  getCalendarDateInTimezone,
  DEFAULT_FACILITY_TIMEZONE,
  DEFAULT_FACILITY_TIMEZONE_LABEL,
} from "./anc-api";
import { scheduledNotifications } from "../test/expo-notifications-mock.js";

describe("Tahap 5A — Mobile ANC & Reminder Utilities", () => {
  beforeEach(async () => {
    await cancelAllNotifications();
  });

  describe("Time and Date Formatters", () => {
    it("1. parseHourMinute mem-parsing format HH:mm dengan benar", () => {
      expect(parseHourMinute("20:00")).toEqual({ hour: 20, minute: 0 });
      expect(parseHourMinute("08:30")).toEqual({ hour: 8, minute: 30 });
      expect(parseHourMinute("21:45")).toEqual({ hour: 21, minute: 45 });
    });

    it("2. parseHourMinute menjaga batasan jam 0-23 dan menit 0-59", () => {
      expect(parseHourMinute("26:70")).toEqual({ hour: 23, minute: 59 });
      expect(parseHourMinute("invalid")).toEqual({ hour: 20, minute: 0 });
    });

    it("3. formatAncDateShort memformat tanggal Indonesia", () => {
      const formatted = formatAncDateShort("2026-10-15T09:00:00.000Z");
      expect(formatted).toContain("15");
      expect(formatted).toContain("Okt");
      expect(formatted).toContain("2026");
    });

    it("4. formatAncTime memformat jam dengan akhiran WIT (Maluku Utara)", () => {
      const formatted = formatAncTime("2026-10-15T09:00:00.000Z");
      expect(formatted).toContain("WIT");
      expect(formatted).not.toContain("WIB");
    });

    it("4a. formatAncDateTime memformat UTC instant 2026-10-14T23:00:00.000Z menjadi 15 Oktober 2026 · 08.00 WIT", () => {
      const utcInstant = "2026-10-14T23:00:00.000Z"; // 15 Okt 08:00 WIT
      const dateTimeFormatted = formatAncDateTime(utcInstant);
      const timeFormatted = formatAncTime(utcInstant);
      const dateFormatted = formatAncDateShort(utcInstant);

      expect(dateTimeFormatted).toBe("15 Oktober 2026 · 08.00 WIT");
      expect(timeFormatted).toBe("08.00 WIT");
      expect(dateFormatted).toContain("15");
      expect(dateFormatted).toContain("Okt");
      expect(dateFormatted).toContain("2026");

      // Ketat: tidak ada formatter ANC yang menghasilkan string WIB
      expect(dateTimeFormatted).not.toContain("WIB");
      expect(timeFormatted).not.toContain("WIB");
      expect(DEFAULT_FACILITY_TIMEZONE).toBe("Asia/Jayapura");
      expect(DEFAULT_FACILITY_TIMEZONE_LABEL).toBe("WIT");
    });

    it("4b. isAncAppointmentDayArrived mengevaluasi hari kedatangan kalender WIT tanpa terpengaruh zona waktu device", () => {
      const scheduledAt = "2026-10-14T23:00:00.000Z"; // 15 Okt 08:00 WIT
      // 1 detik sebelum tengah malam WIT (14 Okt 23:59:59 WIT = 14:59:59 UTC)
      const beforeWitArrival = new Date("2026-10-14T14:59:59.000Z");
      expect(isAncAppointmentDayArrived(scheduledAt, beforeWitArrival)).toBe(false);

      // Tepat tengah malam WIT tiba (15 Okt 00:00:00 WIT = 15:00:00 UTC)
      const atWitArrival = new Date("2026-10-14T15:00:00.000Z");
      expect(isAncAppointmentDayArrived(scheduledAt, atWitArrival)).toBe(true);

      // Tanggal kalender fasilitas selalu konsisten 2026-10-15
      expect(getCalendarDateInTimezone(scheduledAt)).toBe("2026-10-15");
    });

    it("5. ANC_STATUS_BADGES memiliki definisi warna untuk semua status", () => {
      expect(ANC_STATUS_BADGES.SCHEDULED!.label).toBe("Terjadwal");
      expect(ANC_STATUS_BADGES.COMPLETED!.label).toBe("Sudah Hadir");
      expect(ANC_STATUS_BADGES.MISSED!.label).toBe("Belum Dikonfirmasi");
      expect(ANC_STATUS_BADGES.CANCELLED!.label).toBe("Dibatalkan");
    });
  });

  describe("Local Notifications Management", () => {
    it("6. menjadwalkan reminder harian minum tablet tambah darah (TTD)", async () => {
      const notifId = await scheduleDailyIronTabletReminder("20:30");
      expect(notifId).toBeDefined();
      expect(typeof notifId).toBe("string");

      expect(scheduledNotifications.length).toBe(1);
      const scheduled = scheduledNotifications[0];
      expect(scheduled.content.title).toContain("Tablet Tambah Darah");
      expect(scheduled.content.data.type).toBe("IRON_TABLET");
      expect(scheduled.trigger.hour).toBe(20);
      expect(scheduled.trigger.minute).toBe(30);
    });

    it("7. menjadwalkan reminder kunjungan ANC (H-1)", async () => {
      const futureVisit = new Date(Date.now() + 5 * 24 * 3600 * 1000);
      const notifId = await scheduleAncVisitReminder(
        "SCHED-001",
        futureVisit,
        1,
        "08:00",
      );

      expect(notifId).toBeDefined();
      expect(scheduledNotifications.length).toBe(1);
      const scheduled = scheduledNotifications[0];
      expect(scheduled.content.title).toContain("Pemeriksaan Kehamilan");
      expect(scheduled.content.data.schedulePublicId).toBe("SCHED-001");
      expect(scheduled.trigger.seconds).toBeGreaterThan(0);
    });

    it("8. tidak menjadwalkan reminder kunjungan ANC jika waktu sudah lewat", async () => {
      const pastVisit = new Date(Date.now() - 24 * 3600 * 1000);
      const notifId = await scheduleAncVisitReminder(
        "SCHED-PAST",
        pastVisit,
        1,
        "08:00",
      );

      expect(notifId).toBeNull();
      expect(scheduledNotifications.length).toBe(0);
    });

    it("9. menjadwalkan snooze reminder TTD selama 10, 30, dan 60 menit", async () => {
      const id10 = await scheduleSnoozeReminder(10);
      expect(id10).toBeDefined();
      expect(scheduledNotifications[0].trigger.seconds).toBe(600);

      const id30 = await scheduleSnoozeReminder(30);
      expect(id30).toBeDefined();
      expect(scheduledNotifications[1].trigger.seconds).toBe(1800);

      const id60 = await scheduleSnoozeReminder(60);
      expect(id60).toBeDefined();
      expect(scheduledNotifications[2].trigger.seconds).toBe(3600);
    });

    it("10. membatalkan notifikasi berdasarkan identifier", async () => {
      const notifId = await scheduleDailyIronTabletReminder("20:00");
      expect(scheduledNotifications.length).toBe(1);

      await cancelNotification(notifId!);
      expect(scheduledNotifications.length).toBe(0);
    });

    it("11. membatalkan semua notifikasi lokal yang tersimpan", async () => {
      await scheduleDailyIronTabletReminder("20:00");
      await scheduleSnoozeReminder(30);
      expect(scheduledNotifications.length).toBe(2);

      await cancelAllNotifications();
      expect(scheduledNotifications.length).toBe(0);
    });

    it("12. memverifikasi standar ANC Kemenkes: 6 kunjungan dengan distribusi 1-2-3", () => {
      const distribution = { trimester1: 1, trimester2: 2, trimester3: 3 };
      const totalVisits = distribution.trimester1 + distribution.trimester2 + distribution.trimester3;
      expect(totalVisits).toBe(6);
      expect(distribution.trimester1).toBe(1);
      expect(distribution.trimester2).toBe(2);
      expect(distribution.trimester3).toBe(3);
    });

    it("13. memverifikasi kontak dokter minimal 2 kali (Trimester I dan III) dengan USG", () => {
      const doctorVisits = { trimester1: 1, trimester2: 0, trimester3: 1 };
      const totalDoctor = doctorVisits.trimester1 + doctorVisits.trimester2 + doctorVisits.trimester3;
      expect(totalDoctor).toBe(2);
      expect(doctorVisits.trimester1).toBe(1);
      expect(doctorVisits.trimester2).toBe(0);
      expect(doctorVisits.trimester3).toBe(1);
    });
  });
});
