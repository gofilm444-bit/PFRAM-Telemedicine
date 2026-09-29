import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import {
  assignmentActionSchema,
  assignmentSchema,
  facilityFilterSchema,
  healthFacilitySchema,
  midwifeProfileSchema,
  midwifeFacilitiesSchema,
  midwifeRegionsSchema,
  midwifeSelfUpdateSchema,
  motherProfileSchema,
  paginationSchema,
  pregnancySchema,
  pregnancyUpdateSchema,
  regionFilterSchema,
  regionSchema,
  replacementSchema,
  calculateEstimatedDueDate,
  formatDateOnly,
  parseDateOnly,
} from "@pfram/validation";
import type { z } from "zod";
import { audit } from "../auth/service.js";
import {
  dueDateForAssessment,
  expectedParentLevel,
  motherListItem,
  pregnancySummary,
  profileCompletion,
  resolveRegionHierarchy,
} from "./service.js";

const invalid = (
  reply: FastifyReply,
  app: FastifyInstance,
  req: FastifyRequest,
  error: z.ZodError,
) =>
  reply
    .code(400)
    .send(
      app.fail(req, "VALIDATION_ERROR", "Data tidak valid", error.flatten()),
    );
const paging = (q: { page: number; limit: number }) => ({
  skip: (q.page - 1) * q.limit,
  take: q.limit,
});
const page = <T>(
  items: T[],
  total: number,
  q: { page: number; limit: number },
) => ({ items, total, page: q.page, pageSize: q.limit });
const actor = (req: FastifyRequest) => ({
  actorUserId: req.user.sub,
  actorRole: req.user.role,
});
const routeParams = (req: FastifyRequest) =>
  req.params as {
    publicId: string;
    motherPublicId: string;
    pregnancyPublicId: string;
  };
const asData = <T>(value: object) =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
const regionView = (r: {
  publicId: string;
  code: string | null;
  name: string;
  level: string;
  active: boolean;
  parent?: { publicId: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  publicId: r.publicId,
  code: r.code,
  name: r.name,
  level: r.level,
  active: r.active,
  parent: r.parent ?? null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
const facilityInclude = {
  province: { select: { publicId: true, name: true } },
  regency: { select: { publicId: true, name: true } },
  district: { select: { publicId: true, name: true } },
  village: { select: { publicId: true, name: true } },
} as const;
type FacilityRecord = Prisma.HealthFacilityGetPayload<{
  include: typeof facilityInclude;
}>;
const facilityView = (f: FacilityRecord) => ({
  publicId: f.publicId,
  name: f.name,
  type: f.type,
  address: f.address,
  phoneNumber: f.phoneNumber,
  whatsappNumber: f.whatsappNumber,
  emergencyPhone: f.emergencyPhone,
  openingHours: f.openingHours,
  latitude: f.latitude === null ? null : Number(f.latitude),
  longitude: f.longitude === null ? null : Number(f.longitude),
  serviceInformation: f.serviceInformation,
  active: f.active,
  province: f.province,
  regency: f.regency,
  district: f.district,
  village: f.village,
});

async function getParent(
  app: FastifyInstance,
  level: keyof typeof expectedParentLevel,
  parentPublicId?: string,
) {
  const expected = expectedParentLevel[level];
  if (!expected) {
    if (parentPublicId)
      throw Object.assign(new Error("Provinsi tidak boleh memiliki parent"), {
        statusCode: 400,
        code: "REGION_PARENT_INVALID",
      });
    return null;
  }
  if (!parentPublicId)
    throw Object.assign(new Error("Parent wilayah wajib diisi"), {
      statusCode: 400,
      code: "REGION_PARENT_REQUIRED",
    });
  const parent = await app.prisma.region.findUnique({
    where: { publicId: parentPublicId },
  });
  if (!parent || parent.level !== expected)
    throw Object.assign(new Error("Tingkat parent wilayah tidak sesuai"), {
      statusCode: 400,
      code: "REGION_PARENT_INVALID",
    });
  if (!parent.active)
    throw Object.assign(new Error("Parent wilayah tidak aktif"), {
      statusCode: 409,
      code: "REGION_INACTIVE",
    });
  return parent;
}
async function assertNoRegionCycle(app: FastifyInstance, regionId: string, parentId?: string) {
  let currentId = parentId;
  for (let depth = 0; currentId && depth < 5; depth += 1) {
    if (currentId === regionId) throw Object.assign(new Error("Relasi parent akan membentuk siklus wilayah"), { statusCode: 400, code: "REGION_CYCLE" });
    currentId = (await app.prisma.region.findUnique({ where: { id: currentId }, select: { parentId: true } }))?.parentId ?? undefined;
  }
}

export async function referenceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.get("/regions", async (req, reply) => {
    const parsed = regionFilterSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    let parentId: string | undefined;
    if (q.parentPublicId) {
      const p = await app.prisma.region.findUnique({
        where: { publicId: q.parentPublicId },
        select: { id: true },
      });
      if (!p)
        return reply
          .code(404)
          .send(app.fail(req, "REGION_NOT_FOUND", "Wilayah tidak ditemukan"));
      parentId = p.id;
    }
    const where: Prisma.RegionWhereInput = {
      active: true,
      ...(q.level ? { level: q.level } : {}),
      ...(parentId ? { parentId } : {}),
      ...(q.search
        ? { name: { contains: q.search, mode: "insensitive" } }
        : {}),
    };
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.region.findMany({
        where,
        ...paging(q),
        orderBy: { name: q.order },
        include: { parent: { select: { publicId: true, name: true } } },
      }),
      app.prisma.region.count({ where }),
    ]);
    return app.ok(req, page(rows.map(regionView), total, q));
  });
  app.get("/regions/:publicId/children", async (req, reply) => {
    const id = (req.params as { publicId: string }).publicId;
    const parent = await app.prisma.region.findUnique({
      where: { publicId: id },
    });
    if (!parent)
      return reply
        .code(404)
        .send(app.fail(req, "REGION_NOT_FOUND", "Wilayah tidak ditemukan"));
    return app.ok(
      req,
      (
        await app.prisma.region.findMany({
          where: { parentId: parent.id, active: true },
          orderBy: { name: "asc" },
          include: { parent: { select: { publicId: true, name: true } } },
        })
      ).map(regionView),
    );
  });
  app.get("/facilities", async (req, reply) => {
    const parsed = facilityFilterSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    const regionIds = await app.prisma.region.findMany({
      where: {
        publicId: {
          in: [q.province, q.regency, q.district, q.village].filter(
            Boolean,
          ) as string[],
        },
      },
      select: { id: true, publicId: true },
    });
    const ids = new Map(regionIds.map((r) => [r.publicId, r.id]));
    const where: Prisma.HealthFacilityWhereInput = {
      active: true,
      ...(q.type ? { type: q.type } : {}),
      ...(q.search
        ? { name: { contains: q.search, mode: "insensitive" } }
        : {}),
      ...(q.province
        ? {
            provinceId:
              ids.get(q.province) ?? "00000000-0000-0000-0000-000000000000",
          }
        : {}),
      ...(q.regency
        ? {
            regencyId:
              ids.get(q.regency) ?? "00000000-0000-0000-0000-000000000000",
          }
        : {}),
      ...(q.district
        ? {
            districtId:
              ids.get(q.district) ?? "00000000-0000-0000-0000-000000000000",
          }
        : {}),
      ...(q.village
        ? {
            villageId:
              ids.get(q.village) ?? "00000000-0000-0000-0000-000000000000",
          }
        : {}),
    };
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.healthFacility.findMany({
        where,
        ...paging(q),
        orderBy: { name: q.order },
        include: facilityInclude,
      }),
      app.prisma.healthFacility.count({ where }),
    ]);
    return app.ok(req, page(rows.map(facilityView), total, q));
  });
  app.get("/facilities/:publicId", async (req, reply) => {
    const row = await app.prisma.healthFacility.findUnique({
      where: { publicId: routeParams(req).publicId },
      include: facilityInclude,
    });
    return row && row.active
      ? app.ok(req, facilityView(row))
      : reply
          .code(404)
          .send(
            app.fail(req, "FACILITY_NOT_FOUND", "Fasilitas tidak ditemukan"),
          );
  });
}

export async function adminStage3Routes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["ADMIN"]));
  app.get("/regions", async (req, reply) => {
    const parsed = regionFilterSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    let parentId: string | undefined;
    if (q.parentPublicId)
      parentId = (
        await app.prisma.region.findUnique({
          where: { publicId: q.parentPublicId },
          select: { id: true },
        })
      )?.id;
    const where: Prisma.RegionWhereInput = {
      ...(q.active !== undefined ? { active: q.active } : {}),
      ...(q.level ? { level: q.level } : {}),
      ...(q.parentPublicId
        ? { parentId: parentId ?? "00000000-0000-0000-0000-000000000000" }
        : {}),
      ...(q.search
        ? { name: { contains: q.search, mode: "insensitive" } }
        : {}),
    };
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.region.findMany({
        where,
        ...paging(q),
        orderBy: { [q.sort]: q.order },
        include: { parent: { select: { publicId: true, name: true } } },
      }),
      app.prisma.region.count({ where }),
    ]);
    return app.ok(req, page(rows.map(regionView), total, q));
  });
  app.get("/regions/:publicId", async (req, reply) => {
    const row = await app.prisma.region.findUnique({
      where: { publicId: routeParams(req).publicId },
      include: { parent: { select: { publicId: true, name: true } } },
    });
    return row
      ? app.ok(req, regionView(row))
      : reply
          .code(404)
          .send(app.fail(req, "REGION_NOT_FOUND", "Wilayah tidak ditemukan"));
  });
  app.post("/regions", async (req, reply) => {
    const parsed = regionSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const v = parsed.data;
    const parent = await getParent(app, v.level, v.parentPublicId);
    const data = asData<Prisma.RegionUncheckedCreateInput>({
      name: v.name,
      code: v.code,
      level: v.level,
      parentId: parent?.id,
      active: v.active ?? true,
    });
    const row = await app.prisma.region.create({
      data,
      include: { parent: { select: { publicId: true, name: true } } },
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "REGION_CREATED",
      result: "SUCCESS",
      entityType: "Region",
      entityId: row.publicId,
    });
    return reply.code(201).send(app.ok(req, regionView(row)));
  });
  app.patch("/regions/:publicId", async (req, reply) => {
    const parsed = regionSchema.partial().safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const id = routeParams(req).publicId;
    const old = await app.prisma.region.findUnique({ where: { publicId: id } });
    if (!old)
      return reply
        .code(404)
        .send(app.fail(req, "REGION_NOT_FOUND", "Wilayah tidak ditemukan"));
    const level = parsed.data.level ?? old.level;
    const parent =
      parsed.data.parentPublicId !== undefined || parsed.data.level
        ? await getParent(app, level, parsed.data.parentPublicId)
        : undefined;
    if (parent?.id === old.id)
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "REGION_CYCLE",
            "Wilayah tidak boleh menjadi parent dirinya sendiri",
          ),
        );
    await assertNoRegionCycle(app, old.id, parent?.id);
    const data = asData<Prisma.RegionUncheckedUpdateInput>({
      name: parsed.data.name,
      code: parsed.data.code,
      level: parsed.data.level,
      ...(parent !== undefined ? { parentId: parent?.id ?? null } : {}),
    });
    const row = await app.prisma.region.update({
      where: { id: old.id },
      data,
      include: { parent: { select: { publicId: true, name: true } } },
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "REGION_UPDATED",
      result: "SUCCESS",
      entityType: "Region",
      entityId: row.publicId,
    });
    return app.ok(req, regionView(row));
  });
  for (const action of ["activate", "deactivate"] as const)
    app.post(`/regions/:publicId/${action}`, async (req, reply) => {
      const id = routeParams(req).publicId;
      const exists = await app.prisma.region.findUnique({
        where: { publicId: id },
      });
      if (!exists)
        return reply
          .code(404)
          .send(app.fail(req, "REGION_NOT_FOUND", "Wilayah tidak ditemukan"));
      const active = action === "activate";
      const row = await app.prisma.region.update({
        where: { id: exists.id },
        data: { active, archivedAt: active ? null : new Date() },
        include: { parent: { select: { publicId: true, name: true } } },
      });
      await audit(app.prisma, req, {
        ...actor(req),
        action: active ? "REGION_ACTIVATED" : "REGION_DEACTIVATED",
        result: "SUCCESS",
        entityType: "Region",
        entityId: id,
      });
      return app.ok(req, regionView(row));
    });

  app.get("/facilities", async (req, reply) => {
    const parsed = facilityFilterSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    const where: Prisma.HealthFacilityWhereInput = {
      ...(q.active !== undefined ? { active: q.active } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" } },
              { address: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.healthFacility.findMany({
        where,
        ...paging(q),
        orderBy: { name: q.order },
        include: facilityInclude,
      }),
      app.prisma.healthFacility.count({ where }),
    ]);
    return app.ok(req, page(rows.map(facilityView), total, q));
  });
  app.get("/facilities/:publicId", async (req, reply) => {
    const row = await app.prisma.healthFacility.findUnique({
      where: { publicId: routeParams(req).publicId },
      include: facilityInclude,
    });
    return row
      ? app.ok(req, facilityView(row))
      : reply
          .code(404)
          .send(
            app.fail(req, "FACILITY_NOT_FOUND", "Fasilitas tidak ditemukan"),
          );
  });
  const facilityData = async (v: z.infer<typeof healthFacilitySchema>) => {
    const r = await resolveRegionHierarchy(app.prisma, {
      provincePublicId: v.provincePublicId,
      regencyPublicId: v.regencyPublicId,
      districtPublicId: v.districtPublicId,
      ...(v.villagePublicId ? { villagePublicId: v.villagePublicId } : {}),
    });
    return asData<Prisma.HealthFacilityUncheckedCreateInput>({
      name: v.name,
      type: v.type,
      address: v.address,
      provinceId: r.province.id,
      regencyId: r.regency.id,
      districtId: r.district.id,
      villageId: r.village?.id ?? null,
      phoneNumber: v.phoneNumber,
      whatsappNumber: v.whatsappNumber,
      emergencyPhone: v.emergencyPhone,
      openingHours: v.openingHours as Prisma.InputJsonValue | undefined,
      latitude: v.latitude,
      longitude: v.longitude,
      serviceInformation: v.serviceInformation,
      active: v.active,
    });
  };
  app.post("/facilities", async (req, reply) => {
    const parsed = healthFacilitySchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const row = await app.prisma.healthFacility.create({
      data: await facilityData(parsed.data),
      include: facilityInclude,
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "FACILITY_CREATED",
      result: "SUCCESS",
      entityType: "HealthFacility",
      entityId: row.publicId,
    });
    return reply.code(201).send(app.ok(req, facilityView(row)));
  });
  app.patch("/facilities/:publicId", async (req, reply) => {
    const id = routeParams(req).publicId;
    const existing = await app.prisma.healthFacility.findUnique({
      where: { publicId: id },
      include: facilityInclude,
    });
    if (!existing)
      return reply
        .code(404)
        .send(app.fail(req, "FACILITY_NOT_FOUND", "Fasilitas tidak ditemukan"));
    const merged = {
      name: existing.name,
      type: existing.type,
      address: existing.address,
      provincePublicId: existing.province.publicId,
      regencyPublicId: existing.regency.publicId,
      districtPublicId: existing.district.publicId,
      villagePublicId: existing.village?.publicId,
      phoneNumber: existing.phoneNumber ?? undefined,
      whatsappNumber: existing.whatsappNumber ?? undefined,
      emergencyPhone: existing.emergencyPhone ?? undefined,
      openingHours: existing.openingHours as
        Record<string, unknown> | undefined,
      latitude: existing.latitude ? Number(existing.latitude) : undefined,
      longitude: existing.longitude ? Number(existing.longitude) : undefined,
      serviceInformation: existing.serviceInformation ?? undefined,
      active: existing.active,
      ...(req.body as object),
    };
    const parsed = healthFacilitySchema.safeParse(merged);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const row = await app.prisma.healthFacility.update({
      where: { id: existing.id },
      data: await facilityData(parsed.data),
      include: facilityInclude,
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "FACILITY_UPDATED",
      result: "SUCCESS",
      entityType: "HealthFacility",
      entityId: id,
    });
    return app.ok(req, facilityView(row));
  });
  for (const action of ["activate", "deactivate"] as const)
    app.post(`/facilities/:publicId/${action}`, async (req, reply) => {
      const id = routeParams(req).publicId;
      const old = await app.prisma.healthFacility.findUnique({
        where: { publicId: id },
      });
      if (!old)
        return reply
          .code(404)
          .send(
            app.fail(req, "FACILITY_NOT_FOUND", "Fasilitas tidak ditemukan"),
          );
      const active = action === "activate";
      const row = await app.prisma.healthFacility.update({
        where: { id: old.id },
        data: { active, archivedAt: active ? null : new Date() },
        include: facilityInclude,
      });
      await audit(app.prisma, req, {
        ...actor(req),
        action: active ? "FACILITY_ACTIVATED" : "FACILITY_DEACTIVATED",
        result: "SUCCESS",
        entityType: "HealthFacility",
        entityId: id,
      });
      return app.ok(req, facilityView(row));
    });

  app.get("/midwives", async (req, reply) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    const where: Prisma.MidwifeProfileWhereInput = {
      ...(q.active !== undefined ? { active: q.active } : {}),
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search, mode: "insensitive" } },
              {
                professionalRegistrationNumber: {
                  contains: q.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.midwifeProfile.findMany({
        where,
        ...paging(q),
        orderBy: { fullName: q.order },
        include: {
          user: { select: { publicId: true, status: true } },
          primaryFacility: { select: { publicId: true, name: true } },
          _count: {
            select: { motherAssignments: { where: { status: "ACTIVE" } } },
          },
        },
      }),
      app.prisma.midwifeProfile.count({ where }),
    ]);
    return app.ok(
      req,
      page(
        rows.map((m) => ({
          publicId: m.publicId,
          userPublicId: m.user.publicId,
          fullName: m.fullName,
          preferredName: m.preferredName,
          phoneNumber: m.phoneNumber,
          whatsappNumber: m.whatsappNumber,
          professionalRegistrationNumber: m.professionalRegistrationNumber,
          position: m.position,
          serviceHours: m.serviceHours,
          primaryFacility: m.primaryFacility,
          active: m.active,
          profileCompleted: m.profileCompleted,
          motherCount: m._count.motherAssignments,
        })),
        total,
        q,
      ),
    );
  });
  app.get("/midwives/:publicId", async (req, reply) => {
    const row = await app.prisma.midwifeProfile.findUnique({
      where: { publicId: routeParams(req).publicId },
      select: {
        publicId: true,
        fullName: true,
        preferredName: true,
        phoneNumber: true,
        whatsappNumber: true,
        professionalRegistrationNumber: true,
        position: true,
        serviceHours: true,
        active: true,
        profileCompleted: true,
        user: { select: { publicId: true, status: true } },
        primaryFacility: { select: { publicId: true, name: true } },
        facilityAssignments: {
          where: { active: true },
          select: { publicId: true, primary: true, startedAt: true, facility: { select: { publicId: true, name: true } } },
        },
        regionAssignments: {
          where: { active: true },
          select: {
            publicId: true,
            startedAt: true,
            region: { select: { publicId: true, name: true, level: true } },
          },
        },
      },
    });
    return row
      ? app.ok(req, row)
      : reply
          .code(404)
          .send(app.fail(req, "MIDWIFE_NOT_FOUND", "Bidan tidak ditemukan"));
  });
  app.post("/midwives", async (req, reply) => {
    const parsed = midwifeProfileSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    if (!parsed.data.userPublicId)
      return reply
        .code(400)
        .send(app.fail(req, "USER_REQUIRED", "Akun bidan wajib dipilih"));
    const user = await app.prisma.user.findUnique({
      where: { publicId: parsed.data.userPublicId },
    });
    if (!user || user.role !== "MIDWIFE")
      return reply
        .code(400)
        .send(app.fail(req, "MIDWIFE_USER_INVALID", "Akun bidan tidak valid"));
    const facility = parsed.data.primaryFacilityPublicId
      ? await app.prisma.healthFacility.findUnique({
          where: { publicId: parsed.data.primaryFacilityPublicId },
        })
      : null;
    if (parsed.data.primaryFacilityPublicId && !facility?.active)
      return reply.code(400).send(app.fail(req, "FACILITY_INVALID", "Fasilitas utama tidak valid atau tidak aktif"));
    const create = asData<Prisma.MidwifeProfileUncheckedCreateInput>({
      userId: user.id,
      fullName: parsed.data.fullName,
      preferredName: parsed.data.preferredName,
      phoneNumber: parsed.data.phoneNumber,
      whatsappNumber: parsed.data.whatsappNumber,
      professionalRegistrationNumber:
        parsed.data.professionalRegistrationNumber,
      position: parsed.data.position,
      serviceHours: parsed.data.serviceHours as Prisma.InputJsonValue,
      primaryFacilityId: facility?.id ?? null,
      active: parsed.data.active ?? true,
      profileCompleted: true,
    });
    const update = asData<Prisma.MidwifeProfileUncheckedUpdateInput>({
      fullName: parsed.data.fullName,
      preferredName: parsed.data.preferredName,
      whatsappNumber: parsed.data.whatsappNumber,
      professionalRegistrationNumber:
        parsed.data.professionalRegistrationNumber,
      position: parsed.data.position,
      serviceHours: parsed.data.serviceHours as Prisma.InputJsonValue,
      primaryFacilityId: facility?.id ?? null,
      active: parsed.data.active,
      profileCompleted: true,
    });
    const row = await app.prisma.midwifeProfile.upsert({
      where: { userId: user.id },
      create,
      update,
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MIDWIFE_PROFILE_CREATED",
      result: "SUCCESS",
      entityType: "MidwifeProfile",
      entityId: row.publicId,
    });
    return reply.code(201).send(app.ok(req, { publicId: row.publicId, fullName: row.fullName, active: row.active, profileCompleted: row.profileCompleted }));
  });
  app.patch("/midwives/:publicId", async (req, reply) => {
    const parsed = midwifeProfileSchema
      .omit({ userPublicId: true })
      .partial()
      .safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const old = await app.prisma.midwifeProfile.findUnique({
      where: { publicId: routeParams(req).publicId },
    });
    if (!old)
      return reply
        .code(404)
        .send(app.fail(req, "MIDWIFE_NOT_FOUND", "Bidan tidak ditemukan"));
    const facility = parsed.data.primaryFacilityPublicId
      ? await app.prisma.healthFacility.findUnique({
          where: { publicId: parsed.data.primaryFacilityPublicId },
        })
      : undefined;
    if (parsed.data.primaryFacilityPublicId && !facility?.active)
      return reply.code(400).send(app.fail(req, "FACILITY_INVALID", "Fasilitas utama tidak valid atau tidak aktif"));
    const data = asData<Prisma.MidwifeProfileUncheckedUpdateInput>({
      fullName: parsed.data.fullName,
      preferredName: parsed.data.preferredName,
      whatsappNumber: parsed.data.whatsappNumber,
      professionalRegistrationNumber:
        parsed.data.professionalRegistrationNumber,
      position: parsed.data.position,
      serviceHours: parsed.data.serviceHours as Prisma.InputJsonValue,
      ...(facility ? { primaryFacilityId: facility.id } : {}),
      active: parsed.data.active,
    });
    const row = await app.prisma.midwifeProfile.update({
      where: { id: old.id },
      data,
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MIDWIFE_PROFILE_UPDATED",
      result: "SUCCESS",
      entityType: "MidwifeProfile",
      entityId: row.publicId,
    });
    return app.ok(req, { publicId: row.publicId, fullName: row.fullName, active: row.active, profileCompleted: row.profileCompleted });
  });
  for (const action of ["activate", "deactivate"] as const)
    app.post(`/midwives/:publicId/${action}`, async (req, reply) => {
      const old = await app.prisma.midwifeProfile.findUnique({
        where: { publicId: routeParams(req).publicId },
      });
      if (!old)
        return reply
          .code(404)
          .send(app.fail(req, "MIDWIFE_NOT_FOUND", "Bidan tidak ditemukan"));
      const active = action === "activate";
      const row = await app.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: old.userId },
          data: { status: active ? "ACTIVE" : "DISABLED" },
        });
        return tx.midwifeProfile.update({
          where: { id: old.id },
          data: { active, archivedAt: active ? null : new Date() },
        });
      });
      return app.ok(req, { publicId: row.publicId, active: row.active });
    });
  app.put("/midwives/:publicId/facilities", async (req, reply) => {
    const parsed = midwifeFacilitiesSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const body = parsed.data;
    const midwife = await app.prisma.midwifeProfile.findUnique({
      where: { publicId: routeParams(req).publicId },
    });
    if (!midwife)
      return reply
        .code(404)
        .send(app.fail(req, "MIDWIFE_NOT_FOUND", "Bidan tidak ditemukan"));
    const facilities = await app.prisma.healthFacility.findMany({
      where: { publicId: { in: body.facilityPublicIds }, active: true },
    });
    if (facilities.length !== new Set(body.facilityPublicIds).size)
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "FACILITY_INVALID",
            "Fasilitas tidak valid atau tidak aktif",
          ),
        );
    const primary = facilities.find(
      (f) => f.publicId === body.primaryFacilityPublicId,
    );
    await app.prisma.$transaction(async (tx) => {
      await tx.midwifeFacilityAssignment.updateMany({
        where: { midwifeId: midwife.id, active: true },
        data: { active: false, endedAt: new Date() },
      });
      for (const f of facilities)
        await tx.midwifeFacilityAssignment.create({
          data: {
            midwifeId: midwife.id,
            facilityId: f.id,
            primary: f.id === primary?.id,
          },
        });
      await tx.midwifeProfile.update({
        where: { id: midwife.id },
        data: { primaryFacilityId: primary?.id ?? null },
      });
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MIDWIFE_FACILITY_ASSIGNED",
      result: "SUCCESS",
      entityType: "MidwifeProfile",
      entityId: midwife.publicId,
      metadata: { count: facilities.length },
    });
    return app.ok(req, { updated: true });
  });
  app.put("/midwives/:publicId/regions", async (req, reply) => {
    const parsed = midwifeRegionsSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const body = parsed.data;
    const midwife = await app.prisma.midwifeProfile.findUnique({
      where: { publicId: routeParams(req).publicId },
    });
    if (!midwife)
      return reply
        .code(404)
        .send(app.fail(req, "MIDWIFE_NOT_FOUND", "Bidan tidak ditemukan"));
    const regions = await app.prisma.region.findMany({
      where: { publicId: { in: body.regionPublicIds }, active: true },
    });
    if (regions.length !== new Set(body.regionPublicIds).size)
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "REGION_INVALID",
            "Wilayah tidak valid atau tidak aktif",
          ),
        );
    await app.prisma.$transaction(async (tx) => {
      await tx.midwifeRegionAssignment.updateMany({
        where: { midwifeId: midwife.id, active: true },
        data: { active: false, endedAt: new Date() },
      });
      for (const r of regions)
        await tx.midwifeRegionAssignment.create({
          data: { midwifeId: midwife.id, regionId: r.id },
        });
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MIDWIFE_REGION_ASSIGNED",
      result: "SUCCESS",
      entityType: "MidwifeProfile",
      entityId: midwife.publicId,
      metadata: { count: regions.length },
    });
    return app.ok(req, { updated: true });
  });

  app.get("/mothers", async (req, reply) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    const where: Prisma.MotherProfileWhereInput = q.search
      ? { fullName: { contains: q.search, mode: "insensitive" } }
      : {};
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.motherProfile.findMany({
        where,
        ...paging(q),
        orderBy: { fullName: q.order },
        include: {
          primaryFacility: { select: { publicId: true, name: true } },
          pregnancies: { where: { status: "ACTIVE" }, take: 1 },
        },
      }),
      app.prisma.motherProfile.count({ where }),
    ]);
    return app.ok(req, page(rows.map(motherListItem), total, q));
  });
  app.get("/mothers/:publicId", async (req, reply) => {
    const row = await app.prisma.motherProfile.findUnique({
      where: { publicId: routeParams(req).publicId },
      include: {
        primaryFacility: { select: { publicId: true, name: true } },
        pregnancies: { where: { status: "ACTIVE" }, take: 1 },
      },
    });
    return row
      ? app.ok(req, motherListItem(row))
      : reply
          .code(404)
          .send(app.fail(req, "MOTHER_NOT_FOUND", "Ibu tidak ditemukan"));
  });
  app.patch("/mothers/:publicId/status", async (req, reply) => {
    const status = (req.body as { status?: string }).status;
    if (
      !status ||
      !["ACTIVE", "DISABLED", "BLOCKED", "ARCHIVED"].includes(status)
    )
      return reply
        .code(400)
        .send(app.fail(req, "STATUS_INVALID", "Status akun tidak valid"));
    const mother = await app.prisma.motherProfile.findUnique({
      where: { publicId: routeParams(req).publicId },
    });
    if (!mother)
      return reply
        .code(404)
        .send(app.fail(req, "MOTHER_NOT_FOUND", "Ibu tidak ditemukan"));
    await app.prisma.user.update({
      where: { id: mother.userId },
      data: {
        status: status as "ACTIVE" | "DISABLED" | "BLOCKED" | "ARCHIVED",
      },
    });
    return app.ok(req, { updated: true });
  });

  app.get("/assignments", async (req, reply) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    const where: Prisma.MotherMidwifeAssignmentWhereInput = q.search
      ? { mother: { fullName: { contains: q.search, mode: "insensitive" } } }
      : {};
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.motherMidwifeAssignment.findMany({
        where,
        ...paging(q),
        orderBy: { createdAt: "desc" },
        select: {
          publicId: true,
          status: true,
          startedAt: true,
          endedAt: true,
          replacementReason: true,
          notes: true,
          createdAt: true,
          mother: { select: { publicId: true, fullName: true } },
          midwife: { select: { publicId: true, fullName: true } },
          facility: { select: { publicId: true, name: true } },
          pregnancy: { select: { publicId: true } },
        },
      }),
      app.prisma.motherMidwifeAssignment.count({ where }),
    ]);
    return app.ok(req, page(rows, total, q));
  });
  async function assignmentEntities(v: z.infer<typeof assignmentSchema>) {
    const [mother, pregnancy, midwife, facility] = await Promise.all([
      app.prisma.motherProfile.findUnique({
        where: { publicId: v.motherPublicId },
      }),
      app.prisma.pregnancy.findUnique({
        where: { publicId: v.pregnancyPublicId },
      }),
      app.prisma.midwifeProfile.findUnique({
        where: { publicId: v.midwifePublicId },
        include: { facilityAssignments: { where: { active: true } } },
      }),
      app.prisma.healthFacility.findUnique({
        where: { publicId: v.facilityPublicId },
      }),
    ]);
    if (
      !mother ||
      !pregnancy ||
      pregnancy.motherId !== mother.id ||
      pregnancy.status !== "ACTIVE"
    )
      throw Object.assign(new Error("Ibu atau kehamilan aktif tidak valid"), {
        statusCode: 400,
        code: "PREGNANCY_INVALID",
      });
    if (!midwife?.active)
      throw Object.assign(new Error("Bidan tidak aktif"), {
        statusCode: 409,
        code: "MIDWIFE_INACTIVE",
      });
    if (!facility?.active)
      throw Object.assign(new Error("Fasilitas tidak aktif"), {
        statusCode: 409,
        code: "FACILITY_INACTIVE",
      });
    if (
      !midwife.facilityAssignments.some((a) => a.facilityId === facility.id) &&
      !v.overrideReason
    )
      throw Object.assign(
        new Error(
          "Bidan tidak terhubung ke fasilitas; alasan override wajib diisi",
        ),
        { statusCode: 409, code: "MIDWIFE_FACILITY_MISMATCH" },
      );
    return { mother, pregnancy, midwife, facility };
  }
  app.post("/assignments", async (req, reply) => {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const e = await assignmentEntities(parsed.data);
    const row = await app.prisma.$transaction(async (tx) => {
      const active = await tx.motherMidwifeAssignment.findFirst({
        where: {
          motherId: e.mother.id,
          pregnancyId: e.pregnancy.id,
          status: "ACTIVE",
        },
      });
      if (active)
        throw Object.assign(new Error("Ibu sudah memiliki bidan aktif"), {
          statusCode: 409,
          code: "ACTIVE_ASSIGNMENT_EXISTS",
        });
      return tx.motherMidwifeAssignment.create({
        data: {
          motherId: e.mother.id,
          pregnancyId: e.pregnancy.id,
          midwifeId: e.midwife.id,
          facilityId: e.facility.id,
          assignedByUserId: req.user.sub,
          notes: parsed.data.notes ?? parsed.data.overrideReason ?? null,
        },
      });
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MIDWIFE_ASSIGNED_TO_MOTHER",
      result: "SUCCESS",
      entityType: "MotherMidwifeAssignment",
      entityId: row.publicId,
    });
    return reply
      .code(201)
      .send(app.ok(req, { publicId: row.publicId, status: row.status }));
  });
  app.post("/assignments/:publicId/replace", async (req, reply) => {
    const parsed = replacementSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const old = await app.prisma.motherMidwifeAssignment.findUnique({
      where: { publicId: routeParams(req).publicId },
      include: { mother: true, pregnancy: true, facility: true },
    });
    if (!old || old.status !== "ACTIVE")
      return reply
        .code(404)
        .send(
          app.fail(
            req,
            "ASSIGNMENT_NOT_FOUND",
            "Penugasan aktif tidak ditemukan",
          ),
        );
    const e = await assignmentEntities({
      motherPublicId: old.mother.publicId,
      pregnancyPublicId: old.pregnancy.publicId,
      midwifePublicId: parsed.data.midwifePublicId,
      facilityPublicId: old.facility.publicId,
      ...(parsed.data.overrideReason
        ? { overrideReason: parsed.data.overrideReason }
        : {}),
    });
    const row = await app.prisma.$transaction(async (tx) => {
      await tx.motherMidwifeAssignment.update({
        where: { id: old.id },
        data: {
          status: "REPLACED",
          endedAt: new Date(),
          replacementReason: parsed.data.reason,
        },
      });
      return tx.motherMidwifeAssignment.create({
        data: {
          motherId: old.motherId,
          pregnancyId: old.pregnancyId,
          midwifeId: e.midwife.id,
          facilityId: old.facilityId,
          assignedByUserId: req.user.sub,
          notes: parsed.data.overrideReason ?? null,
        },
      });
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MIDWIFE_REPLACED",
      result: "SUCCESS",
      entityType: "MotherMidwifeAssignment",
      entityId: row.publicId,
      metadata: {
        previousAssignmentPublicId: old.publicId,
        reasonProvided: true,
      },
    });
    return app.ok(req, { publicId: row.publicId, status: row.status });
  });
  for (const action of ["complete", "cancel"] as const)
    app.post(`/assignments/:publicId/${action}`, async (req, reply) => {
      const parsed = assignmentActionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return invalid(reply, app, req, parsed.error);
      const old = await app.prisma.motherMidwifeAssignment.findUnique({
        where: { publicId: routeParams(req).publicId },
      });
      if (!old || old.status !== "ACTIVE")
        return reply
          .code(404)
          .send(
            app.fail(
              req,
              "ASSIGNMENT_NOT_FOUND",
              "Penugasan aktif tidak ditemukan",
            ),
          );
      const data = asData<Prisma.MotherMidwifeAssignmentUncheckedUpdateInput>({
        status: action === "complete" ? "COMPLETED" : "CANCELLED",
        endedAt: new Date(),
        replacementReason: parsed.data.reason,
      });
      const row = await app.prisma.motherMidwifeAssignment.update({
        where: { id: old.id },
        data,
      });
      await audit(app.prisma, req, {
        ...actor(req),
        action:
          action === "complete"
            ? "ASSIGNMENT_COMPLETED"
            : "ASSIGNMENT_CANCELLED",
        result: "SUCCESS",
        entityType: "MotherMidwifeAssignment",
        entityId: row.publicId,
      });
      return app.ok(req, { publicId: row.publicId, status: row.status });
    });
}

export async function motherStage3Routes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MOTHER"]));
  app.get("/profile", async (req, reply) => {
    const p = await app.prisma.motherProfile.findUnique({
      where: { userId: req.user.sub },
      include: {
        province: { select: { publicId: true, name: true } },
        regency: { select: { publicId: true, name: true } },
        district: { select: { publicId: true, name: true } },
        village: { select: { publicId: true, name: true } },
        primaryFacility: { select: { publicId: true, name: true } },
      },
    });
    return p
      ? app.ok(req, {
          publicId: p.publicId,
          fullName: p.fullName,
          preferredName: p.preferredName,
          dateOfBirth: p.dateOfBirth ? formatDateOnly(p.dateOfBirth) : null,
          address: p.address,
          province: p.province,
          regency: p.regency,
          district: p.district,
          village: p.village,
          primaryFacility: p.primaryFacility,
          familyContactName: p.familyContactName,
          familyContactPhone: p.familyContactPhone,
          emergencyContactName: p.emergencyContactName,
          emergencyContactPhone: p.emergencyContactPhone,
          emergencyContactRelationship: p.emergencyContactRelationship,
          profileCompleted: p.profileCompleted,
        })
      : reply
          .code(404)
          .send(
            app.fail(req, "PROFILE_NOT_FOUND", "Profil ibu tidak ditemukan"),
          );
  });
  app.put("/profile", async (req, reply) => {
    const parsed = motherProfileSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const v = parsed.data;
    const regions = await resolveRegionHierarchy(app.prisma, {
      provincePublicId: v.provincePublicId,
      regencyPublicId: v.regencyPublicId,
      districtPublicId: v.districtPublicId,
      ...(v.villagePublicId ? { villagePublicId: v.villagePublicId } : {}),
    });
    const facility = await app.prisma.healthFacility.findUnique({
      where: { publicId: v.primaryFacilityPublicId },
    });
    if (!facility?.active || facility.districtId !== regions.district.id)
      return reply
        .code(400)
        .send(
          app.fail(
            req,
            "FACILITY_REGION_INVALID",
            "Fasilitas tidak aktif atau tidak sesuai wilayah",
          ),
        );
    const data = asData<Prisma.MotherProfileUncheckedUpdateInput>({
      fullName: v.fullName,
      preferredName: v.preferredName,
      dateOfBirth: parseDateOnly(v.dateOfBirth),
      address: v.address,
      provinceId: regions.province.id,
      regencyId: regions.regency.id,
      districtId: regions.district.id,
      villageId: regions.village?.id ?? null,
      primaryFacilityId: facility.id,
      familyContactName: v.familyContactName,
      familyContactPhone: v.familyContactPhone,
      emergencyContactName: v.emergencyContactName,
      emergencyContactPhone: v.emergencyContactPhone,
      emergencyContactRelationship: v.emergencyContactRelationship,
      profileCompleted: true,
      completedAt: new Date(),
    });
    const p = await app.prisma.motherProfile.update({
      where: { userId: req.user.sub },
      data,
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MOTHER_PROFILE_UPDATED",
      result: "SUCCESS",
      entityType: "MotherProfile",
      entityId: p.publicId,
      metadata: { profileCompleted: true },
    });
    return app.ok(req, {
      publicId: p.publicId,
      fullName: p.fullName,
      preferredName: p.preferredName,
      profileCompleted: p.profileCompleted,
    });
  });
  app.get("/profile/completion", async (req) =>
    app.ok(req, await profileCompletion(app.prisma, req.user.sub)),
  );
  app.get("/pregnancies", async (req) => {
    const mother = await app.prisma.motherProfile.findUniqueOrThrow({
      where: { userId: req.user.sub },
    });
    const rows = await app.prisma.pregnancy.findMany({
      where: { motherId: mother.id },
      orderBy: { pregnancyNumber: "desc" },
    });
    return app.ok(req, rows.map(pregnancySummary));
  });
  app.get("/pregnancies/active", async (req, reply) => {
    const mother = await app.prisma.motherProfile.findUniqueOrThrow({
      where: { userId: req.user.sub },
    });
    const row = await app.prisma.pregnancy.findFirst({
      where: { motherId: mother.id, status: "ACTIVE" },
    });
    return row
      ? app.ok(req, pregnancySummary(row))
      : reply
          .code(404)
          .send(
            app.fail(
              req,
              "ACTIVE_PREGNANCY_NOT_FOUND",
              "Kehamilan aktif belum tersedia",
            ),
          );
  });
  app.post("/pregnancies", async (req, reply) => {
    const parsed = pregnancySchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const mother = await app.prisma.motherProfile.findUniqueOrThrow({
      where: { userId: req.user.sub },
    });
    if (!mother.profileCompleted)
      return reply
        .code(409)
        .send(
          app.fail(
            req,
            "PERSONAL_PROFILE_INCOMPLETE",
            "Lengkapi profil pribadi terlebih dahulu",
          ),
        );
    const v = parsed.data;
    const reference =
      v.gestationalAgeSource === "LMP"
        ? parseDateOnly(v.lastMenstrualPeriod!)
        : parseDateOnly(v.assessmentDate!);
    const due =
      v.gestationalAgeSource === "LMP"
        ? calculateEstimatedDueDate(reference)
        : dueDateForAssessment(
            reference,
            v.initialGestationalAgeWeeks!,
            v.initialGestationalAgeDays!,
          );
    const row = await app.prisma.$transaction(async (tx) => {
      if (
        await tx.pregnancy.findFirst({
          where: { motherId: mother.id, status: "ACTIVE" },
        })
      )
        throw Object.assign(new Error("Kehamilan aktif sudah tersedia"), {
          statusCode: 409,
          code: "ACTIVE_PREGNANCY_EXISTS",
        });
      const count = await tx.pregnancy.count({
        where: { motherId: mother.id },
      });
      const data = asData<Prisma.PregnancyUncheckedCreateInput>({
        motherId: mother.id,
        pregnancyNumber: count + 1,
        lastMenstrualPeriod: v.lastMenstrualPeriod
          ? parseDateOnly(v.lastMenstrualPeriod)
          : null,
        estimatedDueDate: due,
        gestationalAgeSource: v.gestationalAgeSource,
        assessmentDate: v.assessmentDate
          ? parseDateOnly(v.assessmentDate)
          : null,
        initialGestationalAgeWeeks: v.initialGestationalAgeWeeks ?? null,
        initialGestationalAgeDays: v.initialGestationalAgeDays ?? null,
        pregnancyType: v.pregnancyType,
        previousPregnancyCount: v.previousPregnancyCount,
        previousDeliveryCount: v.previousDeliveryCount,
        miscarriageCount: v.miscarriageCount,
        previousCesarean: v.previousCesarean,
        hypertensionHistory: v.hypertensionHistory,
        preeclampsiaHistory: v.preeclampsiaHistory,
        diabetesHistory: v.diabetesHistory,
        heartDiseaseHistory: v.heartDiseaseHistory,
        kidneyDiseaseHistory: v.kidneyDiseaseHistory,
        otherDiseaseHistory: v.otherDiseaseHistory,
        additionalNotes: v.additionalNotes,
        completedProfile: true,
      });
      return tx.pregnancy.create({ data });
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "PREGNANCY_CREATED",
      result: "SUCCESS",
      entityType: "Pregnancy",
      entityId: row.publicId,
    });
    return reply.code(201).send(app.ok(req, pregnancySummary(row)));
  });
  app.put("/pregnancies/:publicId", async (req, reply) => {
    const parsed = pregnancyUpdateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const mother = await app.prisma.motherProfile.findUniqueOrThrow({
      where: { userId: req.user.sub },
    });
    const old = await app.prisma.pregnancy.findUnique({
      where: { publicId: routeParams(req).publicId },
    });
    if (!old || old.motherId !== mother.id)
      return reply
        .code(404)
        .send(
          app.fail(req, "PREGNANCY_NOT_FOUND", "Kehamilan tidak ditemukan"),
        );
    if (parsed.data.estimatedDueDate)
      return reply
        .code(403)
        .send(
          app.fail(
            req,
            "DUE_DATE_FORBIDDEN",
            "Koreksi tanggal persalinan hanya dapat dilakukan bidan pendamping",
          ),
        );
    const data = asData<Prisma.PregnancyUncheckedUpdateInput>({
      pregnancyType: parsed.data.pregnancyType,
      previousPregnancyCount: parsed.data.previousPregnancyCount,
      previousDeliveryCount: parsed.data.previousDeliveryCount,
      miscarriageCount: parsed.data.miscarriageCount,
      previousCesarean: parsed.data.previousCesarean,
      hypertensionHistory: parsed.data.hypertensionHistory,
      preeclampsiaHistory: parsed.data.preeclampsiaHistory,
      diabetesHistory: parsed.data.diabetesHistory,
      heartDiseaseHistory: parsed.data.heartDiseaseHistory,
      kidneyDiseaseHistory: parsed.data.kidneyDiseaseHistory,
      otherDiseaseHistory: parsed.data.otherDiseaseHistory,
      additionalNotes: parsed.data.additionalNotes,
    });
    const row = await app.prisma.pregnancy.update({
      where: { id: old.id },
      data,
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "PREGNANCY_UPDATED",
      result: "SUCCESS",
      entityType: "Pregnancy",
      entityId: row.publicId,
    });
    return app.ok(req, pregnancySummary(row));
  });
  app.get("/midwife-assignment", async (req) => {
    const mother = await app.prisma.motherProfile.findUniqueOrThrow({
      where: { userId: req.user.sub },
    });
    const row = await app.prisma.motherMidwifeAssignment.findFirst({
      where: { motherId: mother.id, status: "ACTIVE" },
      include: {
        midwife: {
          select: {
            publicId: true,
            fullName: true,
            preferredName: true,
            whatsappNumber: true,
            serviceHours: true,
          },
        },
        facility: {
          select: {
            publicId: true,
            name: true,
            phoneNumber: true,
            whatsappNumber: true,
          },
        },
      },
    });
    return app.ok(
      req,
      row
        ? {
            publicId: row.publicId,
            startedAt: row.startedAt.toISOString(),
            midwife: row.midwife,
            facility: row.facility,
          }
        : {
            status: "MIDWIFE_NOT_ASSIGNED",
            message: "Bidan pendamping belum ditetapkan",
          },
    );
  });
}

export async function midwifeStage3Routes(app: FastifyInstance) {
  app.addHook("preHandler", app.authorize(["MIDWIFE"]));
  const own = (userId: string) =>
    app.prisma.midwifeProfile.findUnique({ where: { userId } });
  app.get("/profile", async (req, reply) => {
    const m = await app.prisma.midwifeProfile.findUnique({
      where: { userId: req.user.sub },
      select: {
        publicId: true,
        fullName: true,
        preferredName: true,
        phoneNumber: true,
        whatsappNumber: true,
        professionalRegistrationNumber: true,
        position: true,
        serviceHours: true,
        active: true,
        profileCompleted: true,
        primaryFacility: { select: { publicId: true, name: true } },
        facilityAssignments: {
          where: { active: true },
          select: { publicId: true, primary: true, startedAt: true, facility: { select: { publicId: true, name: true } } },
        },
        regionAssignments: {
          where: { active: true },
          select: {
            publicId: true,
            startedAt: true,
            region: { select: { publicId: true, name: true, level: true } },
          },
        },
      },
    });
    return m
      ? app.ok(req, m)
      : reply
          .code(404)
          .send(
            app.fail(
              req,
              "MIDWIFE_PROFILE_NOT_FOUND",
              "Profil bidan tidak ditemukan",
            ),
          );
  });
  app.patch("/profile", async (req, reply) => {
    const parsed = midwifeSelfUpdateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const m = await own(req.user.sub);
    if (!m)
      return reply
        .code(404)
        .send(
          app.fail(
            req,
            "MIDWIFE_PROFILE_NOT_FOUND",
            "Profil bidan tidak ditemukan",
          ),
        );
    const data = asData<Prisma.MidwifeProfileUncheckedUpdateInput>({
      preferredName: parsed.data.preferredName,
      whatsappNumber: parsed.data.whatsappNumber,
      serviceHours: parsed.data.serviceHours as Prisma.InputJsonValue,
    });
    const row = await app.prisma.midwifeProfile.update({
      where: { id: m.id },
      data,
    });
    await audit(app.prisma, req, {
      ...actor(req),
      action: "MIDWIFE_PROFILE_UPDATED",
      result: "SUCCESS",
      entityType: "MidwifeProfile",
      entityId: row.publicId,
    });
    return app.ok(req, { publicId: row.publicId, preferredName: row.preferredName, whatsappNumber: row.whatsappNumber, serviceHours: row.serviceHours });
  });
  app.get("/mothers", async (req, reply) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return invalid(reply, app, req, parsed.error);
    const q = parsed.data;
    const m = await own(req.user.sub);
    if (!m)
      return reply
        .code(404)
        .send(
          app.fail(
            req,
            "MIDWIFE_PROFILE_NOT_FOUND",
            "Profil bidan tidak ditemukan",
          ),
        );
    const where: Prisma.MotherProfileWhereInput = {
      midwifeAssignments: { some: { midwifeId: m.id, status: "ACTIVE" } },
      ...(q.search
        ? { fullName: { contains: q.search, mode: "insensitive" } }
        : {}),
    };
    const [rows, total] = await app.prisma.$transaction([
      app.prisma.motherProfile.findMany({
        where,
        ...paging(q),
        orderBy: { fullName: q.order },
        include: {
          primaryFacility: { select: { publicId: true, name: true } },
          pregnancies: { where: { status: "ACTIVE" }, take: 1 },
        },
      }),
      app.prisma.motherProfile.count({ where }),
    ]);
    return app.ok(req, page(rows.map(motherListItem), total, q));
  });
  app.get("/mothers/:motherPublicId", async (req, reply) => {
    const m = await own(req.user.sub);
    const mother = m
      ? await app.prisma.motherProfile.findFirst({
          where: {
            publicId: routeParams(req).motherPublicId,
            midwifeAssignments: { some: { midwifeId: m.id, status: "ACTIVE" } },
          },
          include: {
            primaryFacility: { select: { publicId: true, name: true } },
            pregnancies: { where: { status: "ACTIVE" }, take: 1 },
          },
        })
      : null;
    return mother
      ? app.ok(req, motherListItem(mother))
      : reply
          .code(404)
          .send(
            app.fail(req, "MOTHER_NOT_ASSIGNED", "Ibu binaan tidak ditemukan"),
          );
  });
  app.get("/mothers/:motherPublicId/pregnancies", async (req, reply) => {
    const m = await own(req.user.sub);
    const mother = m
      ? await app.prisma.motherProfile.findFirst({
          where: {
            publicId: routeParams(req).motherPublicId,
            midwifeAssignments: { some: { midwifeId: m.id, status: "ACTIVE" } },
          },
        })
      : null;
    if (!mother)
      return reply
        .code(404)
        .send(
          app.fail(req, "MOTHER_NOT_ASSIGNED", "Ibu binaan tidak ditemukan"),
        );
    return app.ok(
      req,
      (
        await app.prisma.pregnancy.findMany({
          where: { motherId: mother.id },
          orderBy: { pregnancyNumber: "desc" },
        })
      ).map(pregnancySummary),
    );
  });
  app.get("/mothers/:motherPublicId/pregnancies/active", async (req, reply) => {
    const m = await own(req.user.sub);
    const row = m
      ? await app.prisma.pregnancy.findFirst({
          where: {
            status: "ACTIVE",
            mother: { publicId: routeParams(req).motherPublicId },
            assignments: { some: { midwifeId: m.id, status: "ACTIVE" } },
          },
        })
      : null;
    return row
      ? app.ok(req, pregnancySummary(row))
      : reply
          .code(404)
          .send(
            app.fail(
              req,
              "PREGNANCY_NOT_ASSIGNED",
              "Kehamilan aktif tidak ditemukan",
            ),
          );
  });
  app.patch(
    "/mothers/:motherPublicId/pregnancies/:pregnancyPublicId",
    async (req, reply) => {
      const parsed = pregnancyUpdateSchema.safeParse(req.body);
      if (!parsed.success) return invalid(reply, app, req, parsed.error);
      const m = await own(req.user.sub);
      const params = routeParams(req);
      const old = m
        ? await app.prisma.pregnancy.findFirst({
            where: {
              publicId: params.pregnancyPublicId,
              mother: { publicId: params.motherPublicId },
              assignments: { some: { midwifeId: m.id, status: "ACTIVE" } },
            },
          })
        : null;
      if (!old)
        return reply
          .code(404)
          .send(
            app.fail(
              req,
              "PREGNANCY_NOT_ASSIGNED",
              "Kehamilan aktif tidak ditemukan",
            ),
          );
      if (parsed.data.estimatedDueDate && !parsed.data.correctionReason)
        return reply
          .code(400)
          .send(
            app.fail(
              req,
              "CORRECTION_REASON_REQUIRED",
              "Alasan koreksi wajib diisi",
            ),
          );
      const corrected = Boolean(parsed.data.estimatedDueDate);
      const data = asData<Prisma.PregnancyUncheckedUpdateInput>({
        ...(parsed.data.estimatedDueDate
          ? {
              estimatedDueDate: parseDateOnly(parsed.data.estimatedDueDate),
              dueDateCorrectionReason: parsed.data.correctionReason,
            }
          : {}),
        additionalNotes: parsed.data.additionalNotes,
      });
      const row = await app.prisma.pregnancy.update({
        where: { id: old.id },
        data,
      });
      await audit(app.prisma, req, {
        ...actor(req),
        action: corrected
          ? "PREGNANCY_DUE_DATE_CORRECTED"
          : "PREGNANCY_UPDATED",
        result: "SUCCESS",
        entityType: "Pregnancy",
        entityId: row.publicId,
        ...(corrected ? { metadata: { reasonProvided: true } } : {}),
      });
      return app.ok(req, pregnancySummary(row));
    },
  );
}
