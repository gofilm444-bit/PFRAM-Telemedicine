import type { Prisma, PrismaClient } from "@prisma/client";
import {
  calculateGestationalAge,
  trimesterFromWeeks,
} from "@pfram/validation";
import type {
  DangerFollowUpListItem,
  DangerFollowUpStatus,
  DangerScreening,
  DangerScreeningResponseItem,
  DangerScreeningStatus,
  DangerSignRule,
  DangerSignRuleSet,
} from "@pfram/shared-types";

export class DangerScreeningError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "DANGER_SCREENING_ERROR",
  ) {
    super(message);
  }
}

export const screeningInclude = {
  mother: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      user: { select: { phoneNumber: true } },
      primaryFacility: { select: { publicId: true, name: true, phoneNumber: true } },
    },
  },
  pregnancy: {
    select: {
      id: true,
      publicId: true,
      status: true,
      gestationalAgeSource: true,
      lastMenstrualPeriod: true,
      assessmentDate: true,
      initialGestationalAgeWeeks: true,
      initialGestationalAgeDays: true,
    },
  },
  responses: true,
} as const;

export function calculateMotherGestation(pregnancy: {
  gestationalAgeSource: string;
  lastMenstrualPeriod: Date | null;
  assessmentDate: Date | null;
  initialGestationalAgeWeeks: number | null;
  initialGestationalAgeDays: number | null;
}) {
  if (pregnancy.gestationalAgeSource === "LMP" && pregnancy.lastMenstrualPeriod) {
    const age = calculateGestationalAge(pregnancy.lastMenstrualPeriod);
    const trimester = trimesterFromWeeks(age.weeks);
    return { gestationalAge: age, trimester };
  } else if (
    pregnancy.assessmentDate &&
    pregnancy.initialGestationalAgeWeeks !== null &&
    pregnancy.initialGestationalAgeDays !== null
  ) {
    const age = calculateGestationalAge(
      pregnancy.assessmentDate,
      pregnancy.initialGestationalAgeWeeks,
      pregnancy.initialGestationalAgeDays,
    );
    const trimester = trimesterFromWeeks(age.weeks);
    return { gestationalAge: age, trimester };
  }
  return { gestationalAge: null, trimester: 1 };
}

export async function getActiveRuleSet(
  prisma: PrismaClient | Prisma.TransactionClient,
  trimester?: number,
): Promise<{ ruleSet: DangerSignRuleSet; rules: DangerSignRule[] }> {
  const ruleSet = await prisma.dangerSignRuleSet.findFirst({
    where: { active: true },
    include: {
      rules: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!ruleSet) {
    throw new DangerScreeningError(
      "Tidak ada aturan tanda bahaya yang aktif dalam sistem",
      500,
      "NO_ACTIVE_RULESET",
    );
  }

  const filteredRules = ruleSet.rules.filter((r) => {
    if (!trimester) return true;
    const applicability = Array.isArray(r.trimesterApplicability)
      ? (r.trimesterApplicability as number[])
      : [1, 2, 3];
    return applicability.includes(trimester);
  });

  const mappedRules: DangerSignRule[] = filteredRules.map((r) => ({
    publicId: r.publicId,
    code: r.code,
    title: r.title,
    description: r.description,
    trimesterApplicability: Array.isArray(r.trimesterApplicability)
      ? (r.trimesterApplicability as number[])
      : [1, 2, 3],
    question: r.question,
    severityCategory: r.severityCategory as "URGENT" | "WARNING",
    sortOrder: r.sortOrder,
    active: r.active,
  }));

  return {
    ruleSet: {
      publicId: ruleSet.publicId,
      version: ruleSet.version,
      name: ruleSet.name,
      sourceReference: ruleSet.sourceReference,
      effectiveFrom: ruleSet.effectiveFrom.toISOString(),
      active: ruleSet.active,
    },
    rules: mappedRules,
  };
}

export function evaluateResponses(
  availableRules: Array<{
    code: string;
    title: string;
    question: string;
    severityCategory: string;
  }>,
  responses: Array<{ ruleCode: string; answer: boolean }>,
) {
  const ruleMap = new Map(availableRules.map((r) => [r.code, r]));

  let hasUrgent = false;
  let hasWarning = false;
  let reportedCount = 0;

  const evaluatedResponses: DangerScreeningResponseItem[] = [];

  for (const resp of responses) {
    const rule = ruleMap.get(resp.ruleCode);
    if (!rule) {
      throw new DangerScreeningError(
        `Kode tanda bahaya '${resp.ruleCode}' tidak valid atau tidak aktif untuk trimester ini`,
        400,
        "INVALID_RULE_CODE",
      );
    }

    evaluatedResponses.push({
      ruleCode: rule.code,
      title: rule.title,
      question: rule.question,
      answer: resp.answer,
      severityCategory: rule.severityCategory,
    });

    if (resp.answer === true) {
      reportedCount++;
      if (rule.severityCategory === "URGENT") {
        hasUrgent = true;
      } else {
        hasWarning = true;
      }
    }
  }

  let status: DangerScreeningStatus = "NO_DANGER_REPORTED";
  let summary =
    "Tidak ada tanda bahaya yang Anda laporkan pada screening ini. Jika kondisi berubah atau Anda merasa khawatir, hubungi tenaga kesehatan.";

  if (hasUrgent) {
    status = "REQUIRES_IMMEDIATE_CARE";
    summary =
      "Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.";
  } else if (hasWarning) {
    status = "DANGER_SIGN_REPORTED";
    summary =
      "Anda melaporkan tanda yang perlu diperiksa oleh tenaga kesehatan.";
  }

  return {
    status,
    reportedCount,
    summary,
    evaluatedResponses,
  };
}

export function dangerScreeningView(screening: {
  publicId: string;
  mother?: {
    publicId: string;
    fullName?: string;
    user?: { phoneNumber?: string };
    primaryFacility?: { publicId: string; name: string; phoneNumber?: string | null } | null;
  } | null;
  pregnancy?: { publicId: string } | null;
  screenedAt: Date;
  status: string;
  reportedSignsCount: number;
  summary: string | null;
  ruleSetVersion: string;
  followUpStatus: string;
  followUpNotes: string | null;
  followUpUpdatedAt: Date | null;
  responses?: Array<{
    ruleCode: string;
    title: string;
    question: string;
    answer: boolean;
    severityCategory: string;
  }>;
  createdAt: Date;
}): DangerScreening {
  return {
    publicId: screening.publicId,
    motherPublicId: screening.mother?.publicId ?? "",
    pregnancyPublicId: screening.pregnancy?.publicId ?? "",
    ...(screening.mother?.fullName
      ? { motherName: screening.mother.fullName }
      : {}),
    screenedAt: screening.screenedAt.toISOString(),
    status: screening.status as DangerScreeningStatus,
    reportedSignsCount: screening.reportedSignsCount,
    summary: screening.summary,
    ruleSetVersion: screening.ruleSetVersion,
    followUpStatus: screening.followUpStatus as DangerFollowUpStatus,
    followUpNotes: screening.followUpNotes,
    followUpUpdatedAt: screening.followUpUpdatedAt
      ? screening.followUpUpdatedAt.toISOString()
      : null,
    ...(screening.responses
      ? {
          responses: screening.responses.map((r) => ({
            ruleCode: r.ruleCode,
            title: r.title,
            question: r.question,
            answer: r.answer,
            severityCategory: r.severityCategory as "URGENT" | "WARNING",
          })),
        }
      : {}),
    facility: screening.mother?.primaryFacility
      ? {
          publicId: screening.mother.primaryFacility.publicId,
          name: screening.mother.primaryFacility.name,
        }
      : null,
    createdAt: screening.createdAt.toISOString(),
  };
}

export function dangerFollowUpListItemView(screening: {
  publicId: string;
  mother: {
    publicId: string;
    fullName: string;
    user: { phoneNumber: string };
    primaryFacility?: { publicId: string; name: string } | null;
  };
  pregnancy: {
    gestationalAgeSource: string;
    lastMenstrualPeriod: Date | null;
    assessmentDate: Date | null;
    initialGestationalAgeWeeks: number | null;
    initialGestationalAgeDays: number | null;
  };
  screenedAt: Date;
  status: string;
  reportedSignsCount: number;
  followUpStatus: string;
  followUpNotes: string | null;
  followUpUpdatedAt: Date | null;
  responses: Array<{
    title: string;
    answer: boolean;
  }>;
}): DangerFollowUpListItem {
  const { gestationalAge, trimester } = calculateMotherGestation(
    screening.pregnancy,
  );

  const reportedSigns = screening.responses
    .filter((r) => r.answer === true)
    .map((r) => r.title);

  return {
    publicId: screening.publicId,
    mother: {
      publicId: screening.mother.publicId,
      fullName: screening.mother.fullName,
      phoneNumber: screening.mother.user.phoneNumber,
    },
    facility: screening.mother.primaryFacility
      ? {
          publicId: screening.mother.primaryFacility.publicId,
          name: screening.mother.primaryFacility.name,
        }
      : null,
    gestationalAge: gestationalAge
      ? { weeks: gestationalAge.weeks, days: gestationalAge.days }
      : null,
    trimester,
    screenedAt: screening.screenedAt.toISOString(),
    status: screening.status as DangerScreeningStatus,
    reportedSignsCount: screening.reportedSignsCount,
    reportedSigns,
    followUpStatus: screening.followUpStatus as DangerFollowUpStatus,
    followUpNotes: screening.followUpNotes,
    followUpUpdatedAt: screening.followUpUpdatedAt
      ? screening.followUpUpdatedAt.toISOString()
      : null,
  };
}
