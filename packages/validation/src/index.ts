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
  sort: z.enum(["name", "createdAt", "updatedAt"]).default("name"),
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

