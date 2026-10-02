import type { Prisma, PrismaClient, EducationCategory, EducationTrimester } from "@prisma/client";
import {
  calculateGestationalAge,
  trimesterFromWeeks,
  trimesterToEducationTrimester,
} from "@pfram/validation";
import type {
  EducationArticle as SharedEducationArticle,
  EducationArticleCreateInput,
  EducationArticleUpdateInput,
  EducationQuery,
} from "@pfram/shared-types";

export class EducationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "EDUCATION_ERROR",
  ) {
    super(message);
  }
}

export function articleView(article: {
  id?: string;
  publicId: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: EducationCategory;
  trimester: EducationTrimester;
  featured: boolean;
  sourceName: string;
  sourceReference: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): SharedEducationArticle {
  return {
    publicId: article.publicId,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    content: article.content,
    category: article.category,
    trimester: article.trimester,
    featured: article.featured,
    sourceName: article.sourceName,
    sourceReference: article.sourceReference,
    published: article.published,
    sortOrder: article.sortOrder,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    archivedAt: article.archivedAt ? article.archivedAt.toISOString() : null,
  };
}

export async function getMotherPregnancyTrimester(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
): Promise<{ trimesterNumber: 1 | 2 | 3 | null; educationTrimester: "ALL" | "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3" | null }> {
  const mother = await prisma.motherProfile.findUnique({
    where: { userId: motherUserId },
    include: {
      pregnancies: {
        where: { status: "ACTIVE" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const activePregnancy = mother?.pregnancies[0];
  if (!activePregnancy) {
    return { trimesterNumber: null, educationTrimester: null };
  }

  let calculatedTrimester: 1 | 2 | 3 = 1;
  if (activePregnancy.gestationalAgeSource === "LMP" && activePregnancy.lastMenstrualPeriod) {
    const age = calculateGestationalAge(activePregnancy.lastMenstrualPeriod);
    calculatedTrimester = trimesterFromWeeks(age.weeks);
  } else if (
    activePregnancy.assessmentDate &&
    activePregnancy.initialGestationalAgeWeeks !== null &&
    activePregnancy.initialGestationalAgeDays !== null
  ) {
    const age = calculateGestationalAge(
      activePregnancy.assessmentDate,
      activePregnancy.initialGestationalAgeWeeks,
      activePregnancy.initialGestationalAgeDays,
    );
    calculatedTrimester = trimesterFromWeeks(age.weeks);
  }

  return {
    trimesterNumber: calculatedTrimester,
    educationTrimester: trimesterToEducationTrimester(calculatedTrimester),
  };
}

export async function getMotherEducationList(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
  query: EducationQuery,
) {
  const { educationTrimester } = await getMotherPregnancyTrimester(prisma, motherUserId);

  const where: Prisma.EducationArticleWhereInput = {
    published: true,
    archivedAt: null,
  };

  if (query.category) {
    where.category = query.category;
  }

  if (query.trimester) {
    where.trimester = query.trimester;
  }

  if (query.featured !== undefined) {
    where.featured = query.featured;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { summary: { contains: query.search, mode: "insensitive" } },
      { content: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  // Retrieve matching articles
  const allMatching = await prisma.educationArticle.findMany({
    where,
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  // If no explicit trimester filter was queried, prioritize articles for current mother trimester & ALL
  let sorted = allMatching;
  if (!query.trimester && educationTrimester) {
    sorted = [...allMatching].sort((a, b) => {
      // 1. Mother's trimester first
      const aIsCurrent = a.trimester === educationTrimester;
      const bIsCurrent = b.trimester === educationTrimester;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;

      // 2. ALL trimester second
      const aIsAll = a.trimester === "ALL";
      const bIsAll = b.trimester === "ALL";
      if (aIsAll && !bIsAll) return -1;
      if (!aIsAll && bIsAll) return 1;

      // 3. Featured priority
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      // 4. Sort order
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  const total = sorted.length;
  const paginated = sorted.slice((page - 1) * limit, page * limit);

  return {
    items: paginated.map(articleView),
    total,
    page,
    pageSize: limit,
    trimesterRecommendation: educationTrimester ?? undefined,
  };
}

export async function getFeaturedArticlesForMother(
  prisma: PrismaClient | Prisma.TransactionClient,
  motherUserId: string,
) {
  const { educationTrimester } = await getMotherPregnancyTrimester(prisma, motherUserId);

  const featured = await prisma.educationArticle.findMany({
    where: {
      published: true,
      archivedAt: null,
      featured: true,
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  let sorted = featured;
  if (educationTrimester) {
    sorted = [...featured].sort((a, b) => {
      const aMatch = a.trimester === educationTrimester || a.trimester === "ALL";
      const bMatch = b.trimester === educationTrimester || b.trimester === "ALL";
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return a.sortOrder - b.sortOrder;
    });
  }

  return sorted.slice(0, 5).map(articleView);
}

export async function getArticleBySlug(
  prisma: PrismaClient | Prisma.TransactionClient,
  slug: string,
  onlyPublished: boolean = true,
) {
  const where: Prisma.EducationArticleWhereInput = {
    slug,
    archivedAt: null,
  };
  if (onlyPublished) {
    where.published = true;
  }

  const article = await prisma.educationArticle.findFirst({
    where,
  });

  if (!article) {
    throw new EducationError("Artikel edukasi tidak ditemukan", 404, "ARTICLE_NOT_FOUND");
  }

  return articleView(article);
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

export async function getAdminEducationList(
  prisma: PrismaClient | Prisma.TransactionClient,
  query: EducationQuery & { includeUnpublished?: boolean | undefined },
) {
  const where: Prisma.EducationArticleWhereInput = {
    archivedAt: null,
  };

  if (!query.includeUnpublished) {
    where.published = true;
  }

  if (query.category) {
    where.category = query.category;
  }

  if (query.trimester) {
    where.trimester = query.trimester;
  }

  if (query.featured !== undefined) {
    where.featured = query.featured;
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { summary: { contains: query.search, mode: "insensitive" } },
      { content: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const [total, items] = await Promise.all([
    prisma.educationArticle.count({ where }),
    prisma.educationArticle.findMany({
      where,
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: items.map(articleView),
    page,
    pageSize: limit,
    total,
  };
}

export async function createEducationArticle(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: EducationArticleCreateInput,
) {
  const existing = await prisma.educationArticle.findUnique({
    where: { slug: input.slug },
  });

  if (existing) {
    throw new EducationError(
      "Slug artikel sudah digunakan, silakan gunakan slug lain",
      409,
      "SLUG_ALREADY_EXISTS",
    );
  }

  const created = await prisma.educationArticle.create({
    data: {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content,
      category: input.category,
      trimester: input.trimester ?? "ALL",
      featured: input.featured ?? false,
      sourceName: input.sourceName,
      sourceReference: input.sourceReference ?? null,
      published: input.published ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  return articleView(created);
}

export async function updateEducationArticle(
  prisma: PrismaClient | Prisma.TransactionClient,
  publicId: string,
  input: EducationArticleUpdateInput,
) {
  const article = await prisma.educationArticle.findUnique({
    where: { publicId },
  });

  if (!article || article.archivedAt) {
    throw new EducationError("Artikel tidak ditemukan", 404, "ARTICLE_NOT_FOUND");
  }

  const updated = await prisma.educationArticle.update({
    where: { publicId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.trimester !== undefined && { trimester: input.trimester }),
      ...(input.featured !== undefined && { featured: input.featured }),
      ...(input.sourceName !== undefined && { sourceName: input.sourceName }),
      ...(input.sourceReference !== undefined && { sourceReference: input.sourceReference }),
      ...(input.published !== undefined && { published: input.published }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
  });

  return articleView(updated);
}

export async function archiveEducationArticle(
  prisma: PrismaClient | Prisma.TransactionClient,
  publicId: string,
) {
  const article = await prisma.educationArticle.findUnique({
    where: { publicId },
  });

  if (!article || article.archivedAt) {
    throw new EducationError("Artikel tidak ditemukan", 404, "ARTICLE_NOT_FOUND");
  }

  await prisma.educationArticle.update({
    where: { publicId },
    data: {
      archivedAt: new Date(),
    },
  });

  return { success: true };
}
