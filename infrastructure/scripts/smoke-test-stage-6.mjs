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
console.log("SMOKE TEST TAHAP 6A — TANDA BAHAYA & SCREENING DASAR");
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

  // Find active assignment
  let assignment = await prisma.motherMidwifeAssignment.findFirst({
    where: { status: "ACTIVE" },
    include: {
      mother: { include: { user: true, pregnancies: { where: { status: "ACTIVE" } } } },
      midwife: { include: { user: true } },
    },
  });

  if (!assignment || assignment.mother.pregnancies.length === 0) {
    throw new Error("Active assignment with active pregnancy not found for smoke test");
  }

  const motherUser = assignment.mother.user;
  const midwifeUser = assignment.midwife.user;

  const adminUser = await prisma.user.findFirstOrThrow({
    where: { role: "ADMIN", status: "ACTIVE" },
  });

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

  const adminToken = app.jwt.sign({
    sub: adminUser.id,
    publicId: adminUser.publicId,
    role: "ADMIN",
  });

  console.log("\n1. Mengambil Konfigurasi Aturan Tanda Bahaya (Admin)...");
  const adminRulesRes = await app.inject({
    method: "GET",
    url: "/api/admin/danger-rules",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert(adminRulesRes.statusCode === 200, "Admin dapat mengambil daftar ruleset tanda bahaya");
  const adminRules = adminRulesRes.json().data;
  assert(
    Array.isArray(adminRules) && adminRules.some((r) => r.version === "KEMENKES-KIA-2023-V1"),
    "Ruleset versi KEMENKES-KIA-2023-V1 aktif di database",
  );

  console.log("\n2. Mengambil Butir Pertanyaan Skrining (Ibu)...");
  const motherSignsRes = await app.inject({
    method: "GET",
    url: "/api/mother/danger-signs",
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(motherSignsRes.statusCode === 200, "Ibu berhasil mengambil pertanyaan tanda bahaya");
  const signsData = motherSignsRes.json().data;
  assert(
    Array.isArray(signsData.rules) && signsData.rules.length > 0,
    `Pertanyaan tersedia (${signsData.rules.length} butir)`,
  );

  console.log("\n3. Mengirimkan Skrining Tanpa Gejala Bahaya (Semua TIDAK)...");
  const noDangerPayload = {
    ruleSetVersion: signsData.ruleSet.version,
    responses: signsData.rules.map((r) => ({
      ruleCode: r.code,
      answer: false,
    })),
  };
  const noDangerRes = await app.inject({
    method: "POST",
    url: "/api/mother/danger-screenings",
    headers: { authorization: `Bearer ${motherToken}` },
    payload: noDangerPayload,
  });
  assert(noDangerRes.statusCode === 201, "Skrining tanpa gejala berhasil disimpan");
  const noDangerData = noDangerRes.json().data;
  assert(
    noDangerData.status === "NO_DANGER_REPORTED",
    "Status evaluasi non-diagnostik: NO_DANGER_REPORTED",
  );
  assert(noDangerData.reportedSignsCount === 0, "Jumlah tanda terlapor = 0");

  console.log("\n4. Mengirimkan Skrining dengan Tanda Bahaya Darurat (Perdarahan = YA)...");
  const urgentPayload = {
    ruleSetVersion: signsData.ruleSet.version,
    responses: signsData.rules.map((r) => ({
      ruleCode: r.code,
      answer: r.code === "BLEEDING",
    })),
  };
  const urgentRes = await app.inject({
    method: "POST",
    url: "/api/mother/danger-screenings",
    headers: { authorization: `Bearer ${motherToken}` },
    payload: urgentPayload,
  });
  assert(urgentRes.statusCode === 201, "Skrining tanda darurat berhasil dikirim");
  const urgentData = urgentRes.json().data;
  assert(
    urgentData.status === "REQUIRES_IMMEDIATE_CARE",
    "Status evaluasi keselamatan: REQUIRES_IMMEDIATE_CARE",
  );
  assert(urgentData.reportedSignsCount >= 1, "Jumlah tanda bahaya terlapor terdata");
  assert(urgentData.followUpStatus === "PENDING", "Status tindak lanjut awal adalah PENDING");
  const urgentPublicId = urgentData.publicId;

  console.log("\n5. Mengambil Riwayat Skrining (Ibu)...");
  const historyRes = await app.inject({
    method: "GET",
    url: "/api/mother/danger-screenings",
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(historyRes.statusCode === 200, "Riwayat skrining berhasil diambil oleh ibu");
  const historyData = historyRes.json().data;
  assert(
    Array.isArray(historyData.items) && historyData.items.some((i) => i.publicId === urgentPublicId),
    "Skrining terbaru terdaftar dalam riwayat ibu",
  );

  console.log("\n6. Mengambil Detail Skrining (Ibu)...");
  const detailRes = await app.inject({
    method: "GET",
    url: `/api/mother/danger-screenings/${urgentPublicId}`,
    headers: { authorization: `Bearer ${motherToken}` },
  });
  assert(detailRes.statusCode === 200, "Detail skrining berhasil dibuka");
  const detailData = detailRes.json().data;
  assert(
    Array.isArray(detailData.responses) && detailData.responses.length > 0,
    "Butir jawaban tersimpan lengkap",
  );

  console.log("\n7. Memeriksa Antrean Tindak Lanjut Bidan (Midwife Attention Queue)...");
  const followUpQueueRes = await app.inject({
    method: "GET",
    url: "/api/midwife/danger-follow-ups",
    headers: { authorization: `Bearer ${midwifeToken}` },
  });
  assert(followUpQueueRes.statusCode === 200, "Bidan berhasil membuka antrean tindak lanjut");
  const queueItems = followUpQueueRes.json().data.items;
  const targetItem = queueItems.find((i) => i.publicId === urgentPublicId);
  assert(targetItem !== undefined, "Skrining ibu binaan masuk ke antrean tindak lanjut bidan");

  console.log("\n8. Bidan Memperbarui Status Tindak Lanjut Menjadi CONTACTED...");
  const updateRes = await app.inject({
    method: "PATCH",
    url: `/api/midwife/danger-screenings/${urgentPublicId}/follow-up`,
    headers: { authorization: `Bearer ${midwifeToken}` },
    payload: {
      status: "CONTACTED",
      notes: "Ibu telah dihubungi melalui telepon, diarahkan segera menuju fasilitas kesehatan.",
    },
  });
  assert(updateRes.statusCode === 200, "Status tindak lanjut berhasil diperbarui");
  const updatedData = updateRes.json().data;
  assert(
    updatedData.followUpStatus === "CONTACTED",
    "Status tindak lanjut berubah menjadi CONTACTED",
  );
  assert(
    updatedData.followUpNotes && updatedData.followUpNotes.includes("diarahkan segera"),
    "Catatan operasional bidan tersimpan",
  );

  console.log("\n9. Bidan Menyelesaikan Kasus Menjadi RESOLVED...");
  const resolveRes = await app.inject({
    method: "PATCH",
    url: `/api/midwife/danger-screenings/${urgentPublicId}/follow-up`,
    headers: { authorization: `Bearer ${midwifeToken}` },
    payload: {
      status: "RESOLVED",
      notes: "Ibu telah mendapatkan penanganan medis di Puskesmas. Kondisi terkontrol.",
    },
  });
  assert(resolveRes.statusCode === 200, "Status tindak lanjut berhasil diselesaikan");
  assert(resolveRes.json().data.followUpStatus === "RESOLVED", "Status menjadi RESOLVED");

  // Re-check queue
  const queueAfterRes = await app.inject({
    method: "GET",
    url: "/api/midwife/danger-follow-ups",
    headers: { authorization: `Bearer ${midwifeToken}` },
  });
  const remaining = queueAfterRes.json().data.items.find((i) => i.publicId === urgentPublicId);
  assert(remaining === undefined, "Kasus yang telah RESOLVED keluar dari antrean aktif");

  console.log("\n10. Memeriksa Audit Log...");
  const createLog = await prisma.auditLog.findFirst({
    where: { action: "DANGER_SCREENING_CREATED", entityId: urgentPublicId },
  });
  assert(createLog !== null, "Audit log DANGER_SCREENING_CREATED tercatat");

  const updateLog = await prisma.auditLog.findFirst({
    where: { action: "DANGER_FOLLOWUP_UPDATED", entityId: urgentPublicId },
  });
  assert(updateLog !== null, "Audit log DANGER_FOLLOWUP_UPDATED tercatat");

  await app.close();
  await prisma.$disconnect();
} catch (err) {
  console.error("\n[FATAL ERROR IN SMOKE TEST]:", err);
  exitCode = 1;
}

console.log("\n==================================================");
console.log(`HASIL SMOKE TEST: ${passedCount} / ${totalCount} PASS`);
console.log("==================================================");

process.exit(exitCode);
