import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, RegionLevel } from "@prisma/client";

export interface RegionRawItem {
  code: string;
  name: string;
  level: RegionLevel;
  parentCode: string | null;
}

export interface RegionImportResult {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  byLevel: {
    PROVINCE: number;
    REGENCY: number;
    DISTRICT: number;
    VILLAGE: number;
  };
}

export function loadMalukuUtaraDataset(): RegionRawItem[] {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, "../../../prisma/data/maluku-utara-regions.json"),
    path.resolve(process.cwd(), "prisma/data/maluku-utara-regions.json"),
    path.resolve(process.cwd(), "apps/api/prisma/data/maluku-utara-regions.json"),
  ];
  const filePath = candidatePaths.find((p) => fs.existsSync(p));
  if (!filePath) {
    throw new Error(
      `Dataset maluku-utara-regions.json tidak ditemukan. Lokasi diperiksa: ${candidatePaths.join(", ")}`
    );
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as RegionRawItem[];
}

export function validateRegionHierarchy(items: RegionRawItem[]): void {
  const codes = new Set<string>();
  const codeToItem = new Map<string, RegionRawItem>();

  for (const item of items) {
    if (codes.has(item.code)) {
      throw new Error(`Kode wilayah duplikat ditemukan: ${item.code} (${item.name})`);
    }
    codes.add(item.code);
    codeToItem.set(item.code, item);
  }

  for (const item of items) {
    if (item.level === "PROVINCE") {
      if (item.parentCode !== null) {
        throw new Error(`Provinsi tidak boleh memiliki parent: ${item.code}`);
      }
    } else {
      if (!item.parentCode) {
        throw new Error(`Wilayah non-provinsi wajib memiliki parent: ${item.code}`);
      }
      const parent = codeToItem.get(item.parentCode);
      if (!parent) {
        throw new Error(`Parent dengan kode ${item.parentCode} tidak ditemukan untuk ${item.code}`);
      }
      if (item.level === "REGENCY" && parent.level !== "PROVINCE") {
        throw new Error(`Parent untuk REGENCY harus PROVINCE: ${item.code} -> ${parent.code}`);
      }
      if (item.level === "DISTRICT" && parent.level !== "REGENCY") {
        throw new Error(`Parent untuk DISTRICT harus REGENCY: ${item.code} -> ${parent.code}`);
      }
      if (item.level === "VILLAGE" && parent.level !== "DISTRICT") {
        throw new Error(`Parent untuk VILLAGE harus DISTRICT: ${item.code} -> ${parent.code}`);
      }
    }
  }
}

export async function importMalukuUtaraRegions(
  prisma: PrismaClient,
  customDataset?: RegionRawItem[]
): Promise<RegionImportResult> {
  const dataset = customDataset || loadMalukuUtaraDataset();
  validateRegionHierarchy(dataset);

  const existing = await prisma.region.findMany({
    select: {
      id: true,
      publicId: true,
      code: true,
      name: true,
      level: true,
      parentId: true,
      active: true,
    },
  });

  const existingByCode = new Map<string, (typeof existing)[0]>();
  const codeToId = new Map<string, string>();
  for (const r of existing) {
    if (r.code) {
      existingByCode.set(r.code, r);
      codeToId.set(r.code, r.id);
    }
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const byLevel = {
    PROVINCE: 0,
    REGENCY: 0,
    DISTRICT: 0,
    VILLAGE: 0,
  };

  const levelOrder: RegionLevel[] = ["PROVINCE", "REGENCY", "DISTRICT", "VILLAGE"];
  for (const lvl of levelOrder) {
    const items = dataset.filter((d) => d.level === lvl);
    byLevel[lvl] = items.length;

    for (const item of items) {
      const parentId = item.parentCode ? codeToId.get(item.parentCode) ?? null : null;
      if (item.parentCode && !parentId) {
        throw new Error(`Parent id tidak ditemukan di database untuk kode ${item.parentCode}`);
      }

      const exist = existingByCode.get(item.code);
      if (exist) {
        codeToId.set(item.code, exist.id);
        const needsUpdate =
          exist.name !== item.name ||
          exist.parentId !== parentId ||
          exist.level !== item.level ||
          !exist.active;

        if (needsUpdate) {
          await prisma.region.update({
            where: { id: exist.id },
            data: {
              name: item.name,
              level: item.level,
              parentId,
              active: true,
            },
          });
          updated += 1;
        } else {
          unchanged += 1;
        }
      } else {
        const row = await prisma.region.create({
          data: {
            code: item.code,
            name: item.name,
            level: item.level,
            parentId,
            active: true,
          },
        });
        codeToId.set(item.code, row.id);
        existingByCode.set(item.code, row);
        created += 1;
      }
    }
  }

  const total = await prisma.region.count();
  return {
    total,
    created,
    updated,
    unchanged,
    byLevel,
  };
}
