import { z } from "zod";

export const normalizeIndonesianPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
};

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizeIndonesianPhone)
  .pipe(z.string().regex(/^628\d{8,11}$/, "Nomor HP Indonesia tidak valid"));
export const optionalPhoneSchema = z
  .union([z.literal(""), phoneSchema])
  .optional()
  .transform((value) => value || undefined);
export const passwordSchema = z
  .string()
  .min(10, "Kata sandi minimal 10 karakter")
  .max(72)
  .regex(/[A-Z]/, "Harus memiliki huruf besar")
  .regex(/[a-z]/, "Harus memiliki huruf kecil")
  .regex(/\d/, "Harus memiliki angka");
export const publicIdSchema = z.string().uuid("ID publik tidak valid");
export const nameSchema = z.string().trim().min(2, "Nama wajib diisi").max(120);

export const parseDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Tanggal tidak valid");
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error("Tanggal tidak valid");
  return date;
};
export const formatDateOnly = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
export const todayDateOnly = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
export const addUtcDays = (date: Date, days: number) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};
export const calculateAge = (
  birthDate: string | Date,
  at = todayDateOnly(),
) => {
  const birth =
    typeof birthDate === "string" ? parseDateOnly(birthDate) : birthDate;
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  if (
    at.getUTCMonth() < birth.getUTCMonth() ||
    (at.getUTCMonth() === birth.getUTCMonth() &&
      at.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
};
export const calculateEstimatedDueDate = (lmp: string | Date) =>
  addUtcDays(typeof lmp === "string" ? parseDateOnly(lmp) : lmp, 280);
export const calculateGestationalAge = (
  referenceDate: string | Date,
  initialWeeks = 0,
  initialDays = 0,
  at = todayDateOnly(),
) => {
  const reference =
    typeof referenceDate === "string"
      ? parseDateOnly(referenceDate)
      : referenceDate;
  const elapsed = Math.floor((at.getTime() - reference.getTime()) / 86_400_000);
  const totalDays = Math.max(0, initialWeeks * 7 + initialDays + elapsed);
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7, totalDays };
};
export const trimesterFromWeeks = (weeks: number): 1 | 2 | 3 =>
  weeks < 14 ? 1 : weeks < 28 ? 2 : 3;

const dateOnlySchema = z.string().refine((value) => {
  try {
    parseDateOnly(value);
    return true;
  } catch {
    return false;
  }
}, "Tanggal tidak valid");
export const loginSchema = z.object({
  phoneNumber: phoneSchema,
  password: z.string().min(1),
  clientType: z.enum(["web", "mobile"]).default("web"),
});
export const motherRegistrationSchema = z
  .object({
    phoneNumber: phoneSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
    fullName: nameSchema,
    consentDocumentIds: z.array(z.string().uuid()).min(1),
    clientType: z.enum(["web", "mobile"]).default("mobile"),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.passwordConfirmation)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordConfirmation"],
        message: "Konfirmasi kata sandi tidak cocok",
      });
  });
export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(20).optional(),
  clientType: z.enum(["web", "mobile"]).default("web"),
});
export const basicProfileSchema = z.object({
  fullName: nameSchema,
  preferredName: z.string().trim().max(80).optional(),
});
export const publicEnvSchema = z.object({ apiUrl: z.string().url() });
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["name", "code", "createdAt", "updatedAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});
export const regionLevelSchema = z.enum([
  "PROVINCE",
  "REGENCY",
  "DISTRICT",
  "VILLAGE",
]);
export const regionSchema = z.object({
  name: nameSchema,
  code: z.string().trim().max(30).optional(),
  level: regionLevelSchema,
  parentPublicId: publicIdSchema.optional(),
  active: z.boolean().optional(),
});
export const regionFilterSchema = paginationSchema.extend({
  level: regionLevelSchema.optional(),
  parentPublicId: publicIdSchema.optional(),
  code: z.string().trim().max(30).optional(),
});
export const facilityTypeSchema = z.enum([
  "PUSKESMAS",
  "HOSPITAL",
  "CLINIC",
  "INDEPENDENT_MIDWIFE",
  "REFERRAL_FACILITY",
  "OTHER",
]);
export const healthFacilitySchema = z.object({
  name: nameSchema,
  type: facilityTypeSchema,
  address: z.string().trim().min(5, "Alamat wajib diisi").max(500),
  provincePublicId: publicIdSchema,
  regencyPublicId: publicIdSchema,
  districtPublicId: publicIdSchema,
  villagePublicId: publicIdSchema.optional(),
  phoneNumber: optionalPhoneSchema,
  whatsappNumber: optionalPhoneSchema,
  emergencyPhone: optionalPhoneSchema,
  openingHours: z.record(z.unknown()).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  serviceInformation: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (v) => !/<[^>]+>/.test(v),
      "Informasi layanan tidak boleh memuat HTML",
    )
    .optional(),
  active: z.boolean().optional(),
});
export const facilityFilterSchema = paginationSchema.extend({
  type: facilityTypeSchema.optional(),
  province: publicIdSchema.optional(),
  regency: publicIdSchema.optional(),
  district: publicIdSchema.optional(),
  village: publicIdSchema.optional(),
});
export const midwifeProfileSchema = z.object({
  userPublicId: publicIdSchema.optional(),
  fullName: nameSchema,
  preferredName: z.string().trim().max(80).optional(),
  phoneNumber: phoneSchema,
  whatsappNumber: optionalPhoneSchema,
  professionalRegistrationNumber: z.string().trim().max(80).optional(),
  position: z.string().trim().max(100).optional(),
  serviceHours: z.record(z.unknown()).optional(),
  primaryFacilityPublicId: publicIdSchema.optional(),
  active: z.boolean().optional(),
});
export const midwifeSelfUpdateSchema = midwifeProfileSchema
  .pick({ preferredName: true, whatsappNumber: true, serviceHours: true })
  .partial();
export const midwifeFacilitiesSchema = z.object({ facilityPublicIds: z.array(publicIdSchema).max(50), primaryFacilityPublicId: publicIdSchema.optional() }).superRefine((value, ctx) => { if (value.primaryFacilityPublicId && !value.facilityPublicIds.includes(value.primaryFacilityPublicId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["primaryFacilityPublicId"], message: "Fasilitas utama harus ada dalam daftar fasilitas" }); });
export const midwifeRegionsSchema = z.object({ regionPublicIds: z.array(publicIdSchema).max(100) });
export const motherProfileFieldsSchema = z.object({
  fullName: nameSchema,
  preferredName: z.string().trim().max(80).optional(),
  dateOfBirth: dateOnlySchema,
  address: z.string().trim().min(5, "Alamat wajib diisi").max(500),
  provincePublicId: publicIdSchema,
  regencyPublicId: publicIdSchema,
  districtPublicId: publicIdSchema,
  villagePublicId: publicIdSchema.optional(),
  primaryFacilityPublicId: publicIdSchema,
  familyContactName: z.string().trim().max(120).optional(),
  familyContactPhone: optionalPhoneSchema,
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: optionalPhoneSchema,
  emergencyContactRelationship: z.string().trim().max(80).optional(),
});
export const motherProfileSchema = motherProfileFieldsSchema.superRefine(
  (v, ctx) => {
    const birth = parseDateOnly(v.dateOfBirth);
    const age = calculateAge(birth);
    if (birth > todayDateOnly())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: "Tanggal lahir tidak boleh di masa depan",
      });
    if (age > 120)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: "Tanggal lahir tidak masuk akal",
      });
  },
);
const pregnancyBase = z.object({
  lastMenstrualPeriod: dateOnlySchema.optional(),
  gestationalAgeSource: z.enum(["LMP", "HEALTH_WORKER_ASSESSMENT"]),
  assessmentDate: dateOnlySchema.optional(),
  initialGestationalAgeWeeks: z.coerce.number().int().min(0).max(45).optional(),
  initialGestationalAgeDays: z.coerce.number().int().min(0).max(6).optional(),
  pregnancyType: z.enum(["SINGLETON", "MULTIPLE", "UNKNOWN"]),
  previousPregnancyCount: z.coerce.number().int().min(0),
  previousDeliveryCount: z.coerce.number().int().min(0),
  miscarriageCount: z.coerce.number().int().min(0),
  previousCesarean: z.boolean(),
  hypertensionHistory: z.boolean(),
  preeclampsiaHistory: z.boolean(),
  diabetesHistory: z.boolean(),
  heartDiseaseHistory: z.boolean(),
  kidneyDiseaseHistory: z.boolean(),
  otherDiseaseHistory: z.string().trim().max(1000).optional(),
  additionalNotes: z.string().trim().max(1000).optional(),
});
export const pregnancySchema = pregnancyBase.superRefine((v, ctx) => {
  if (v.previousDeliveryCount + v.miscarriageCount > v.previousPregnancyCount)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["previousPregnancyCount"],
      message: "Riwayat kehamilan tidak konsisten",
    });
  if (v.gestationalAgeSource === "LMP") {
    if (!v.lastMenstrualPeriod)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastMenstrualPeriod"],
        message: "HPHT wajib diisi",
      });
    else if (parseDateOnly(v.lastMenstrualPeriod) > todayDateOnly())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastMenstrualPeriod"],
        message: "HPHT tidak boleh di masa depan",
      });
  } else if (
    !v.assessmentDate ||
    v.initialGestationalAgeWeeks === undefined ||
    v.initialGestationalAgeDays === undefined
  )
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["assessmentDate"],
      message: "Tanggal dan usia penilaian tenaga kesehatan wajib diisi",
    });
});
export const pregnancyUpdateSchema = pregnancyBase.partial().extend({
  estimatedDueDate: dateOnlySchema.optional(),
  correctionReason: z.string().trim().min(5).max(500).optional(),
});
export const assignmentSchema = z.object({
  motherPublicId: publicIdSchema,
  pregnancyPublicId: publicIdSchema,
  midwifePublicId: publicIdSchema,
  facilityPublicId: publicIdSchema,
  overrideReason: z.string().trim().min(5).max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});
export const replacementSchema = z.object({
  midwifePublicId: publicIdSchema,
  reason: z.string().trim().min(5, "Alasan pergantian wajib diisi").max(500),
  overrideReason: z.string().trim().min(5).max(500).optional(),
});
export const assignmentActionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const monitoringSourceSchema = z.enum([
  "SELF",
  "POSYANDU",
  "PUSKESMAS",
  "HOSPITAL",
  "CLINIC",
  "MIDWIFE",
  "OTHER",
]);

export const weightSchema = z.coerce
  .number()
  .refine((w) => w > 0, "Berat badan harus lebih besar dari 0 kg")
  .refine(
    (w) => w >= 20 && w <= 300,
    "Berat badan di luar batas wajar (20 - 300 kg)",
  );

export const systolicBpSchema = z.coerce
  .number()
  .int("Tekanan darah sistolik harus bilangan bulat")
  .min(40, "Tekanan sistolik minimal 40 mmHg")
  .max(300, "Tekanan sistolik maksimal 300 mmHg");

export const diastolicBpSchema = z.coerce
  .number()
  .int("Tekanan darah diastolik harus bilangan bulat")
  .min(30, "Tekanan diastolik minimal 30 mmHg")
  .max(200, "Tekanan diastolik maksimal 200 mmHg");

export const recordedAtSchema = z.string().refine((val) => {
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now() + 5 * 60 * 1000;
}, "Waktu pengukuran tidak boleh di masa depan");

export const monitoringBaseSchema = z.object({
  pregnancyPublicId: publicIdSchema.optional(),
  recordedAt: recordedAtSchema.optional(),
  source: monitoringSourceSchema.optional(),
  weightKg: weightSchema.optional(),
  systolicBp: systolicBpSchema.optional(),
  diastolicBp: diastolicBpSchema.optional(),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});

export const monitoringCreateSchema = monitoringBaseSchema.superRefine((v, ctx) => {
  const hasWeight = v.weightKg !== undefined && v.weightKg !== null;
  const hasSystolic = v.systolicBp !== undefined && v.systolicBp !== null;
  const hasDiastolic = v.diastolicBp !== undefined && v.diastolicBp !== null;

  if (!hasWeight && !hasSystolic && !hasDiastolic) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimal salah satu harus diisi: berat badan atau tekanan darah",
    });
    return;
  }

  if (hasSystolic && !hasDiastolic) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["diastolicBp"],
      message: "Tekanan diastolik wajib diisi jika tekanan sistolik diisi",
    });
  }

  if (!hasSystolic && hasDiastolic) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["systolicBp"],
      message: "Tekanan sistolik wajib diisi jika tekanan diastolik diisi",
    });
  }

  if (hasSystolic && hasDiastolic && v.systolicBp! <= v.diastolicBp!) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["systolicBp"],
      message: "Tekanan sistolik harus lebih besar dari diastolik",
    });
  }
});

export const monitoringUpdateSchema = z
  .object({
    recordedAt: recordedAtSchema.optional(),
    source: monitoringSourceSchema.optional(),
    weightKg: weightSchema.nullable().optional(),
    systolicBp: systolicBpSchema.nullable().optional(),
    diastolicBp: diastolicBpSchema.nullable().optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Catatan maksimal 500 karakter")
      .nullable()
      .optional(),
  })
  .superRefine((v, ctx) => {
    const hasSystolic = v.systolicBp !== undefined && v.systolicBp !== null;
    const hasDiastolic = v.diastolicBp !== undefined && v.diastolicBp !== null;

    if (hasSystolic && !hasDiastolic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diastolicBp"],
        message: "Tekanan diastolik wajib diisi jika tekanan sistolik diisi",
      });
    }

    if (!hasSystolic && hasDiastolic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["systolicBp"],
        message: "Tekanan sistolik wajib diisi jika tekanan diastolik diisi",
      });
    }

    if (hasSystolic && hasDiastolic && v.systolicBp! <= v.diastolicBp!) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["systolicBp"],
        message: "Tekanan sistolik harus lebih besar dari diastolik",
      });
    }
  });

export const monitoringQuerySchema = z.object({
  pregnancyPublicId: publicIdSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(["all", "weight", "blood_pressure", "both"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

// ==========================================
// TAHAP 5A — SMART ANC REMINDER & KEPATUHAN
// ==========================================

export const ancVisitStatusSchema = z.enum([
  "SCHEDULED",
  "COMPLETED",
  "MISSED",
  "CANCELLED",
]);

export const ancVisitTypeSchema = z.enum(["ANC", "DOCTOR_ANC"]);

export const reminderTypeSchema = z.enum(["ANC_VISIT", "IRON_TABLET"]);

export const reminderStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "SNOOZED",
  "MISSED",
  "CANCELLED",
]);

export const ancScheduleCreateSchema = z.object({
  scheduledAt: z.string().datetime({ message: "Format waktu jadwal tidak valid" }),
  visitType: ancVisitTypeSchema.optional(),
  doctorRequired: z.boolean().optional(),
  facilityPublicId: publicIdSchema.nullable().optional(),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").nullable().optional(),
});

export const ancScheduleUpdateSchema = z.object({
  scheduledAt: z.string().datetime({ message: "Format waktu jadwal tidak valid" }).optional(),
  visitType: ancVisitTypeSchema.optional(),
  doctorRequired: z.boolean().optional(),
  status: ancVisitStatusSchema.optional(),
  facilityPublicId: publicIdSchema.nullable().optional(),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").nullable().optional(),
});

export const reminderSettingsUpdateSchema = z.object({
  ironTabletEnabled: z.boolean().optional(),
  ironTabletTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:mm (contoh: 20:00)")
    .optional(),
  ancReminderEnabled: z.boolean().optional(),
  ancReminderDaysBefore: z.number().int().min(0).max(7).optional(),
  ancReminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:mm (contoh: 08:00)")
    .optional(),
});

export const reminderSnoozeSchema = z.object({
  minutes: z.union([z.literal(10), z.literal(30), z.literal(60)]),
});

// ==========================================
// TAHAP 6A — TANDA BAHAYA & SCREENING DASAR
// ==========================================

export const dangerScreeningStatusSchema = z.enum([
  "NO_DANGER_REPORTED",
  "DANGER_SIGN_REPORTED",
  "REQUIRES_IMMEDIATE_CARE",
]);

export const dangerFollowUpStatusSchema = z.enum([
  "PENDING",
  "CONTACTED",
  "REFERRED_TO_FACILITY",
  "ARRIVED_AT_FACILITY",
  "RESOLVED",
]);

export const dangerScreeningItemSchema = z.object({
  ruleCode: z.string().trim().min(1, "Kode aturan tidak boleh kosong"),
  answer: z.boolean({ required_error: "Jawaban Ya atau Tidak wajib diisi" }),
});

export const dangerScreeningCreateSchema = z.object({
  ruleSetVersion: z.string().trim().min(1, "Versi aturan wajib disertakan"),
  responses: z
    .array(dangerScreeningItemSchema)
    .min(1, "Skrining harus memuat minimal satu pertanyaan yang dijawab")
    .refine(
      (items) => {
        const codes = items.map((i) => i.ruleCode);
        return new Set(codes).size === codes.length;
      },
      { message: "Terdapat duplikasi jawaban untuk kode tanda bahaya yang sama" },
    ),
});

export const dangerFollowUpUpdateSchema = z.object({
  status: dangerFollowUpStatusSchema,
  notes: z
    .string()
    .trim()
    .max(1000, "Catatan tindak lanjut maksimal 1000 karakter")
    .nullable()
    .optional(),
});

// ==========================================
// TAHAP 7 — EDUKASI, GIZI & PERUBAHAN TUBUH
// ==========================================

export function trimesterToEducationTrimester(
  trimester?: number | null,
): "ALL" | "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3" {
  if (trimester === 1) return "TRIMESTER_1";
  if (trimester === 2) return "TRIMESTER_2";
  if (trimester === 3) return "TRIMESTER_3";
  return "ALL";
}

export const educationCategorySchema = z.enum([
  "PREGNANCY",
  "NUTRITION",
  "BODY_CHANGES",
  "IRON_TABLET",
  "NAUSEA",
  "ANEMIA_KEK",
  "PREPARATION",
  "OTHER",
]);

export const educationTrimesterSchema = z.enum([
  "ALL",
  "TRIMESTER_1",
  "TRIMESTER_2",
  "TRIMESTER_3",
]);

export const educationArticleCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Format slug harus berupa huruf kecil, angka, dan tanda hubung (-)",
    ),
  title: z.string().trim().min(3, "Judul artikel minimal 3 karakter").max(200),
  summary: z.string().trim().min(10, "Ringkasan artikel minimal 10 karakter").max(500),
  content: z.string().trim().min(20, "Konten artikel minimal 20 karakter"),
  category: educationCategorySchema,
  trimester: educationTrimesterSchema.default("ALL"),
  featured: z.boolean().default(false),
  sourceName: z.string().trim().min(2, "Nama sumber wajib diisi"),
  sourceReference: z.string().trim().nullable().optional(),
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const educationArticleUpdateSchema = educationArticleCreateSchema.partial();

export const educationQuerySchema = z.object({
  category: educationCategorySchema.optional(),
  trimester: educationTrimesterSchema.optional(),
  featured: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((val) => (typeof val === "boolean" ? val : val === "true"))
    .optional(),
  search: z.string().trim().optional(),
  page: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
  limit: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
});

// ==========================================
// TAHAP 8 — P4K DIGITAL & RENCANA RUJUKAN
// ==========================================

export const bloodDonorItemSchema = z.object({
  name: z.string().trim().min(1, "Nama donor tidak boleh kosong").max(120),
  bloodType: z.string().trim().max(10),
  phone: phoneSchema,
});

export const p4kPlanInputSchema = z.object({
  deliveryFacilityPublicId: publicIdSchema.nullable().optional(),
  customDeliveryFacilityName: z.string().trim().max(150).nullable().optional(),
  deliveryAttendant: z.string().trim().max(100).optional(),
  birthCompanionName: z.string().trim().max(120).nullable().optional(),
  birthCompanionPhone: optionalPhoneSchema.nullable().optional(),
  transportation: z.string().trim().max(100).nullable().optional(),
  fundingSource: z.string().trim().max(100).nullable().optional(),
  bpjsNumber: z.string().trim().max(50).nullable().optional(),
  bloodDonors: z.array(bloodDonorItemSchema).max(10).optional(),
  emergencyContactName: z.string().trim().max(120).nullable().optional(),
  emergencyContactPhone: optionalPhoneSchema.nullable().optional(),
  preparationNotes: z.string().trim().max(1000).nullable().optional(),
});

export const p4kChecklistPatchItemSchema = z.object({
  itemKey: z.string().trim().min(1, "Item key tidak boleh kosong"),
  checked: z.boolean(),
});

export const p4kChecklistPatchSchema = z.object({
  items: z.array(p4kChecklistPatchItemSchema).min(1, "Minimal satu item checklist"),
});

export const referralPlanInputSchema = z.object({
  sourceFacilityPublicId: publicIdSchema.nullable().optional(),
  customSourceFacilityName: z.string().trim().max(150).nullable().optional(),
  destinationFacilityPublicId: publicIdSchema.nullable().optional(),
  customDestinationFacilityName: z.string().trim().max(150).nullable().optional(),
  transportType: z.string().trim().max(100).optional(),
  transportOperatorName: z.string().trim().max(120).nullable().optional(),
  transportContactNumber: optionalPhoneSchema.nullable().optional(),
  estimatedTravelTimeMinutes: z.number().int().min(0).max(10080).nullable().optional(),
  manualDepartureSchedule: z.string().trim().max(500).nullable().optional(),
  departurePoint: z.string().trim().max(200).nullable().optional(),
  companions: z.string().trim().max(300).nullable().optional(),
  rtkName: z.string().trim().max(150).nullable().optional(),
  rtkAddress: z.string().trim().max(500).nullable().optional(),
  rtkPhone: optionalPhoneSchema.nullable().optional(),
  alternativeNotes: z.string().trim().max(1000).nullable().optional(),
});

// ==========================================
// TAHAP 9 — TELEKONSULTASI IBU & BIDAN
// ==========================================

export const consultationThreadStatusSchema = z.enum(["OPEN", "CLOSED"]);

export const consultationAttentionFlagSchema = z.enum([
  "NORMAL",
  "NEEDS_ATTENTION",
]);

export const consultationMessageTypeSchema = z.enum(["TEXT", "IMAGE", "VOICE"]);

export const consultationSenderRoleSchema = z.enum(["MOTHER", "MIDWIFE"]);

export const consultationAttachmentInputSchema = z.object({
  originalFilename: z.string().trim().min(1, "Nama file tidak boleh kosong"),
  mimeType: z.string().trim().min(1, "MIME type file tidak boleh kosong"),
  fileData: z.string().trim().min(1, "Data file tidak boleh kosong"),
  durationSeconds: z.number().int().min(0).max(600).nullable().optional(),
});

export const consultationMessageCreateSchema = z
  .object({
    messageType: consultationMessageTypeSchema,
    body: z.string().trim().nullable().optional(),
    attachment: consultationAttachmentInputSchema.optional(),
  })
  .refine(
    (val) => {
      if (val.messageType === "TEXT") {
        return typeof val.body === "string" && val.body.trim().length > 0;
      }
      if (val.messageType === "IMAGE" || val.messageType === "VOICE") {
        return Boolean(val.attachment);
      }
      return true;
    },
    {
      message:
        "Pesan teks harus memiliki isi teks, dan pesan foto/suara harus menyertakan lampiran",
    },
  );

export const consultationAttentionUpdateSchema = z.object({
  attentionFlag: consultationAttentionFlagSchema,
});

export const consultationStatusUpdateSchema = z.object({
  status: consultationThreadStatusSchema,
});

export const consultationQuerySchema = z.object({
  status: consultationThreadStatusSchema.optional(),
  attentionFlag: consultationAttentionFlagSchema.optional(),
  search: z.string().trim().optional(),
  limit: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
  offset: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
});

// ==========================================
// TAHAP 10 — VIDEO CALL
// ==========================================

export function isValidMeetingUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    if (!parsed.hostname || parsed.hostname.length < 3) return false;
    return true;
  } catch {
    return false;
  }
}

export const safeMeetingUrlSchema = z
  .string()
  .trim()
  .min(10, "URL meeting minimal 10 karakter")
  .max(2000, "URL meeting maksimal 2000 karakter")
  .refine(
    (url) => isValidMeetingUrl(url),
    "URL meeting harus merupakan tautan HTTPS yang valid (misal: Google Meet, Jitsi, dsb)",
  );

export const videoConsultationStatusSchema = z.enum([
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const videoConsultationCreateSchema = z.object({
  motherPublicId: publicIdSchema.optional(),
  threadPublicId: publicIdSchema.optional(),
  scheduledAt: z.string().datetime({ message: "Format waktu jadwal tidak valid" }),
  meetingUrl: safeMeetingUrlSchema,
  title: z
    .string()
    .trim()
    .min(3, "Judul video call minimal 3 karakter")
    .max(150, "Judul video call maksimal 150 karakter")
    .default("Konsultasi Video Ibu Hamil"),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const videoConsultationUpdateSchema = z.object({
  scheduledAt: z.string().datetime({ message: "Format waktu jadwal tidak valid" }).optional(),
  meetingUrl: safeMeetingUrlSchema.optional(),
  title: z.string().trim().min(3).max(150).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: videoConsultationStatusSchema.optional(),
});

export const videoConsultationStatusUpdateSchema = z.object({
  status: videoConsultationStatusSchema,
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const videoConsultationQuerySchema = z.object({
  motherPublicId: publicIdSchema.optional(),
  threadPublicId: publicIdSchema.optional(),
  status: videoConsultationStatusSchema.optional(),
  upcomingOnly: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true")
    .optional(),
  page: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
  limit: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
});





// ==========================================
// TAHAP 11 — DASHBOARD BIDAN LANJUTAN & KUNJUNGAN RUMAH
// ==========================================

export const homeVisitStatusSchema = z.enum([
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
]);

export const homeVisitCreateSchema = z.object({
  motherPublicId: publicIdSchema,
  scheduledAt: z
    .string()
    .datetime({ message: "Format waktu jadwal tidak valid" }),
  purpose: z
    .string()
    .trim()
    .min(3, "Tujuan kunjungan minimal 3 karakter")
    .max(200, "Tujuan kunjungan maksimal 200 karakter"),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const homeVisitUpdateSchema = z.object({
  scheduledAt: z
    .string()
    .datetime({ message: "Format waktu jadwal tidak valid" })
    .optional(),
  purpose: z.string().trim().min(3).max(200).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: homeVisitStatusSchema.optional(),
});

export const homeVisitQuerySchema = z.object({
  motherPublicId: publicIdSchema.optional(),
  status: homeVisitStatusSchema.optional(),
  upcomingOnly: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true")
    .optional(),
  page: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
  limit: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
});

export const midwifeMotherFilterSchema = z.enum([
  "ALL",
  "TRIMESTER_1",
  "TRIMESTER_2",
  "TRIMESTER_3",
  "HAS_FOLLOW_UP",
  "MISSED_ANC",
]);

export const midwifeMotherQuerySchema = z.object({
  search: z.string().trim().optional(),
  filter: midwifeMotherFilterSchema.default("ALL"),
  page: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
  limit: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
});

export const adminUserCreateSchema = z.object({
  phoneNumber: phoneSchema,
  password: passwordSchema,
  role: z.enum(["ADMIN", "MIDWIFE"]),
  fullName: nameSchema,
  primaryFacilityPublicId: publicIdSchema.optional(),
  professionalRegistrationNumber: z.string().trim().max(50).optional(),
});

export const adminUserPasswordResetSchema = z.object({
  newPassword: passwordSchema,
});

export const adminUserFilterSchema = z.object({
  page: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
  limit: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10)))
    .optional(),
  search: z.string().trim().optional(),
  role: z.enum(["ADMIN", "MIDWIFE", "MOTHER"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "PENDING", "BLOCKED", "ARCHIVED"]).optional(),
});
