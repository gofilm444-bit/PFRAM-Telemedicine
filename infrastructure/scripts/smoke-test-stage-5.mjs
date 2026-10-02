import { PrismaClient } from "@prisma/client";
import { buildApp } from "../../apps/api/src/app.ts";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://pfram:pfram_dev_only@localhost:5433/pfram_db?schema=public";

const env = {
  NODE_ENV: "test",
  DATABASE_URL,
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    "development-access-secret-change-me-at-least-32-characters",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    "development-refresh-secret-change-me-at-least-32-characters",
  CORS_ORIGINS: "http://localhost:5173",
  COOKIE_SECURE: "false",
};

console.log("==================================================");
console.log("SMOKE TEST TAHAP 5A — SMART ANC REMINDER & KEPATUHAN DASAR");
console.log("==================================================");

let exitCode = 0;
let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${message}`);
  } else {
    exitCode = 1;
    console.error(`  [FAIL] ${message}`);
  }
}

const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
});

try {
  const app = buildApp({ env, prisma });
  await app.ready();

  // Find existing active assignment or create one
  let assignment = await prisma.motherMidwifeAssignment.findFirst({
    where: { status: "ACTIVE" },
    include: {
      mother: { include: { user: true, pregnancies: true } },
      midwife: { include: { user: true } },
    },
  });

  let motherUser;
  let motherProfile;
  let midwifeUser;
  let midwifeProfile;

  if (assignment && assignment.mother.pregnancies.length > 0) {
    motherUser = assignment.mother.user;
    motherProfile = assignment.mother;
    midwifeUser = assignment.midwife.user;
    midwifeProfile = assignment.midwife;
  } else {
    motherUser = await prisma.user.findFirstOrThrow({
      where: { role: "MOTHER", status: "ACTIVE" },
      include: { motherProfile: { include: { pregnancies: true } } },
    });
    motherProfile = motherUser.motherProfile;
    if (!motherProfile) throw new Error("Mother profile not found in DB");

    midwifeUser = await prisma.user.findFirstOrThrow({
      where: { role: "MIDWIFE", status: "ACTIVE" },
      include: { midwifeProfile: true },
    });
    midwifeProfile = midwifeUser.midwifeProfile;
    if (!midwifeProfile) throw new Error("Midwife profile not found in DB");

    const facility = await prisma.healthFacility.findFirstOrThrow();

    await prisma.motherMidwifeAssignment.create({
      data: {
        motherId: motherProfile.id,
        pregnancyId: motherProfile.pregnancies[0].id,
        midwifeId: midwifeProfile.id,
        facilityId: facility.id,
        status: "ACTIVE",
        assignedByUserId: midwifeUser.id,
      },
    });
  }

  const motherToken = app.jwt.sign({
    sub: motherUser.id,
    publicId: motherUser.publicId,
    role: "MOTHER",
  });

  const midwifeToken = app.jwt.sign({
    sub: midwifeUser.id,
    publicId: midwifeUser.publicId,
    role: "MIDWIFE",
  });

  console.log("\n1. PENGATURAN REMINDER & KEPATUHAN IBU HAMIL");

  // 1.1 GET Reminder Settings
  const getSettingsRes = await app.inject({
    method: "GET",
    url: "/api/mother/reminder-settings",
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(getSettingsRes.statusCode === 200, "Ibu dapat mengambil pengaturan pengingat");
  const settingsData = getSettingsRes.json().data;
  assert(typeof settingsData.ironTabletTime === "string", "Pengaturan jam minum tablet tambah darah tersedia");

  // 1.2 PATCH Reminder Settings
  const patchSettingsRes = await app.inject({
    method: "PATCH",
    url: "/api/mother/reminder-settings",
    headers: { authorization: `Bearer ${motherToken}` },
    payload: {
      ironTabletTime: "20:30",
      ancReminderDaysBefore: 2,
    },
  });
  assert(patchSettingsRes.statusCode === 200, "Ibu dapat mengubah jam minum TTD dan hari pengingat ANC");
  assert(patchSettingsRes.json().data.ironTabletTime === "20:30", "Jam minum TTD tersimpan menjadi 20:30");
  assert(patchSettingsRes.json().data.ancReminderDaysBefore === 2, "Hari H-2 tersimpan");

  // 1.3 GET Adherence Summary
  const adherenceRes = await app.inject({
    method: "GET",
    url: "/api/mother/adherence-summary",
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(adherenceRes.statusCode === 200, "Ibu dapat melihat rekap kepatuhan dasar");
  const adherenceData = adherenceRes.json().data;
  assert(typeof adherenceData.ironTabletsAdherencePercentage === "number", "Persentase kepatuhan TTD dihitung numerik");
  assert(typeof adherenceData.ancCompleted === "number", "Jumlah ANC sudah hadir dihitung");

  // 1.4 GET Standard Recommendations
  const recRes = await app.inject({
    method: "GET",
    url: "/api/mother/anc-recommendations",
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(recRes.statusCode === 200, "Ibu dapat melihat rekomendasi ANC standar Kemenkes 6 kali");
  assert(recRes.json().data.ruleSet.minimumVisits === 6, "Standar kunjungan minimal 6 kali");

  console.log("\n2. PENJADWALAN & MONITORING ANC OLEH BIDAN");

  // 2.1 Midwife creates ANC schedule
  const targetDate = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  const createScheduleRes = await app.inject({
    method: "POST",
    url: `/api/midwife/mothers/${motherProfile.publicId}/anc-schedules`,
    headers: { authorization: `Bearer ${midwifeToken}` },
    payload: {
      scheduledAt: targetDate.toISOString(),
      visitType: "ANC",
      notes: "Pemeriksaan trimester kedua di Puskesmas",
    },
  });
  assert(createScheduleRes.statusCode === 201, "Bidan dapat menjadwalkan kunjungan ANC baru untuk ibu binaan");
  const newSchedule = createScheduleRes.json().data;
  assert(newSchedule.status === "SCHEDULED", "Status awal kunjungan adalah SCHEDULED");

  // 2.2 Mother views upcoming ANC
  const upcomingRes = await app.inject({
    method: "GET",
    url: "/api/mother/anc-schedules/upcoming",
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(upcomingRes.statusCode === 200, "Ibu dapat melihat jadwal ANC mendatang terdekat");
  assert(upcomingRes.json().data !== null, "Jadwal ANC mendatang ditemukan");

  // 2.3 Mother confirms attendance
  const confirmRes = await app.inject({
    method: "POST",
    url: `/api/mother/anc-schedules/${newSchedule.publicId}/confirm-attendance`,
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(confirmRes.statusCode === 200, "Ibu dapat melakukan konfirmasi kehadiran 'Sudah Datang'");
  assert(confirmRes.json().data.status === "COMPLETED", "Status jadwal terupdate menjadi COMPLETED");

  // 2.4 Midwife views missed ANC list
  const missedRes = await app.inject({
    method: "GET",
    url: "/api/midwife/anc-missed",
    headers: { authorization: `Bearer ${midwifeToken}` },
  });
  assert(missedRes.statusCode === 200, "Bidan dapat melihat daftar jadwal ANC terlewat belum dikonfirmasi");

  // 2.5 Midwife views mother adherence summary
  const midwifeAdherenceRes = await app.inject({
    method: "GET",
    url: `/api/midwife/mothers/${motherProfile.publicId}/adherence-summary`,
    headers: { authorization: `Bearer ${midwifeToken}` },
  });
  assert(midwifeAdherenceRes.statusCode === 200, "Bidan dapat memantau kepatuhan ibu binaan di dashboard");

  console.log("\n3. SNOOZE & KONFIRMASI PENGINGAT TTD");

  // 3.1 Fetch pending reminder
  const reminderListRes = await app.inject({
    method: "GET",
    url: "/api/mother/reminders",
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(reminderListRes.statusCode === 200, "Ibu dapat mengambil daftar riwayat pengingat");

  // Create a pending iron tablet reminder for testing snooze and complete
  const testReminder = await prisma.reminder.create({
    data: {
      motherId: motherProfile.id,
      pregnancyId: motherProfile.pregnancies[0]?.id ?? null,
      type: "IRON_TABLET",
      scheduledAt: new Date(),
      reminderTime: "20:00",
      status: "PENDING",
      notes: "Tablet tambah darah malam hari",
    },
  });

  // 3.2 Snooze reminder
  const snoozeRes = await app.inject({
    method: "POST",
    url: `/api/mother/reminders/${testReminder.publicId}/snooze`,
    headers: { authorization: `Bearer ${motherToken}` },
    payload: { minutes: 30 },
  });
  assert(snoozeRes.statusCode === 200, "Ibu dapat menunda pengingat TTD (Snooze 30 menit)");
  assert(snoozeRes.json().data.status === "SNOOZED", "Status pengingat berubah menjadi SNOOZED");

  // 3.3 Complete reminder ("Sudah Minum")
  const completeRes = await app.inject({
    method: "POST",
    url: `/api/mother/reminders/${testReminder.publicId}/complete`,
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(completeRes.statusCode === 200, "Ibu dapat mengonfirmasi 'Sudah Minum' tablet tambah darah");
  assert(completeRes.json().data.status === "COMPLETED", "Status pengingat berubah menjadi COMPLETED");

  // Cleanup test reminder
  await prisma.reminder.delete({ where: { id: testReminder.id } }).catch(() => {});

  console.log("\n==================================================");
  console.log(`HASIL SMOKE TEST TAHAP 5A: ${passedCount}/${totalCount} UJI LULUS`);
  if (exitCode === 0) {
    console.log("STATUS: SUKSES PENUH — SIAP KUNCI TAHAP 5A");
  } else {
    console.error("STATUS: DITEMUKAN KEGAGALAN!");
  }
  console.log("==================================================");
} catch (error) {
  console.error("Gagal mengeksekusi smoke test:", error);
  exitCode = 1;
} finally {
  await prisma.$disconnect();
  process.exit(exitCode);
}
