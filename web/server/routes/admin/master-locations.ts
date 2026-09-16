"use strict";

import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { destinations, providers, regions, unifiedPackages } from "@shared/schema";
import { requireAdmin } from "../../lib/middleware";
import { regionSyncService } from "../../services/sync/region-sync";
import { destinationSyncService } from "../../services/sync/destination-sync";
import * as ApiResponse from "../../utils/response";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads", "master-locations");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${suffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"].includes(file.mimetype)) {
      return callback(new Error("Only JPG, PNG, WEBP, GIF, and SVG images are allowed"));
    }
    callback(null, true);
  },
});

router.use(requireAdmin);

type PackageCounts = {
  airalo: number;
  esimAccess: number;
  esimGo: number;
  total: number;
};

const emptyPackageCounts = (): PackageCounts => ({
  airalo: 0,
  esimAccess: 0,
  esimGo: 0,
  total: 0,
});

function providerCountKey(slug: string | null): keyof PackageCounts | null {
  if (slug === "airalo") return "airalo";
  if (slug === "esim-access") return "esimAccess";
  if (slug === "esim-go") return "esimGo";
  return null;
}

function uploadedFilePath(file: Express.Multer.File) {
  return `/uploads/master-locations/${file.filename}`;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

async function getRegionPackageCounts(regionIds: string[]) {
  const countsById = new Map<string, PackageCounts>();
  regionIds.forEach((id) => countsById.set(id, emptyPackageCounts()));

  if (regionIds.length === 0) return countsById;

  const rows = await db
    .select({
      regionId: unifiedPackages.regionId,
      providerSlug: providers.slug,
      count: sql<number>`count(${unifiedPackages.id})::int`,
    })
    .from(unifiedPackages)
    .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .where(inArray(unifiedPackages.regionId, regionIds))
    .groupBy(unifiedPackages.regionId, providers.slug);

  for (const row of rows) {
    if (!row.regionId) continue;
    const counts = countsById.get(row.regionId) || emptyPackageCounts();
    const count = Number(row.count) || 0;
    const key = providerCountKey(row.providerSlug);
    if (key) counts[key] += count;
    counts.total += count;
    countsById.set(row.regionId, counts);
  }

  return countsById;
}

async function getDestinationPackageCounts(destinationIds: string[]) {
  const countsById = new Map<string, PackageCounts>();
  destinationIds.forEach((id) => countsById.set(id, emptyPackageCounts()));

  if (destinationIds.length === 0) return countsById;

  const rows = await db
    .select({
      destinationId: unifiedPackages.destinationId,
      providerSlug: providers.slug,
      count: sql<number>`count(${unifiedPackages.id})::int`,
    })
    .from(unifiedPackages)
    .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .where(inArray(unifiedPackages.destinationId, destinationIds))
    .groupBy(unifiedPackages.destinationId, providers.slug);

  for (const row of rows) {
    if (!row.destinationId) continue;
    const counts = countsById.get(row.destinationId) || emptyPackageCounts();
    const count = Number(row.count) || 0;
    const key = providerCountKey(row.providerSlug);
    if (key) counts[key] += count;
    counts.total += count;
    countsById.set(row.destinationId, counts);
  }

  return countsById;
}

router.get("/master-regions", async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "").trim();
    const where = search
      ? or(
          ilike(regions.name, `%${search}%`),
          ilike(regions.slug, `%${search}%`),
          ilike(regions.airaloId, `%${search}%`),
        )
      : undefined;

    const rows = await db
      .select()
      .from(regions)
      .where(where)
      .orderBy(asc(regions.name));

    const countsById = await getRegionPackageCounts(rows.map((region) => region.id));
    const data = rows.map((region) => ({
      ...region,
      packageCounts: countsById.get(region.id) || emptyPackageCounts(),
    }));

    return ApiResponse.success(res, "Regions retrieved", data);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.patch("/master-regions/:id", async (req: Request, res: Response) => {
  try {
    const updateData: Partial<typeof regions.$inferSelect> = {};
    const name = textValue(req.body.name);
    const slug = textValue(req.body.slug);
    const airaloId = textValue(req.body.airaloId);
    const image = textValue(req.body.image);
    const bannerImage = textValue(req.body.bannerImage);
    const active = normalizeBoolean(req.body.active);

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (airaloId !== undefined) updateData.airaloId = airaloId || null;
    if (image !== undefined) updateData.image = image || null;
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage || null;
    if (Array.isArray(req.body.countries)) updateData.countries = req.body.countries.map(String);
    if (active !== undefined) updateData.active = active;

    const [updated] = await db
      .update(regions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(regions.id, req.params.id))
      .returning();

    if (!updated) return ApiResponse.notFound(res, "Region not found");
    return ApiResponse.success(res, "Region updated", updated);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/master-regions/sync", async (_req: Request, res: Response) => {
  try {
    const result = await regionSyncService.runFullSync();
    return ApiResponse.success(
      res,
      result.success ? "Region sync completed successfully" : "Region sync completed with errors",
      result,
    );
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/master-regions/:id/upload-image", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, "No image uploaded");
    const image = uploadedFilePath(req.file);
    const [updated] = await db
      .update(regions)
      .set({ image, updatedAt: new Date() })
      .where(eq(regions.id, req.params.id))
      .returning();

    if (!updated) return ApiResponse.notFound(res, "Region not found");
    return ApiResponse.success(res, "Region image uploaded", updated);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/master-regions/:id/upload-banner", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, "No banner image uploaded");
    const bannerImage = uploadedFilePath(req.file);
    const [updated] = await db
      .update(regions)
      .set({ bannerImage, updatedAt: new Date() })
      .where(eq(regions.id, req.params.id))
      .returning();

    if (!updated) return ApiResponse.notFound(res, "Region not found");
    return ApiResponse.success(res, "Region banner uploaded", updated);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.get("/master-countries", async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "").trim();
    const type = String(req.query.type || "all");
    const whereClauses = [];

    if (search) {
      whereClauses.push(or(
        ilike(destinations.name, `%${search}%`),
        ilike(destinations.slug, `%${search}%`),
        ilike(destinations.countryCode, `%${search}%`),
        ilike(destinations.airaloId, `%${search}%`),
      ));
    }

    if (type === "country") whereClauses.push(eq(destinations.isTerritory, false));
    if (type === "territory") whereClauses.push(eq(destinations.isTerritory, true));

    const where = whereClauses.length
      ? sql.join(whereClauses.map((clause) => sql`${clause}`), sql` and `)
      : undefined;

    const rows = await db
      .select()
      .from(destinations)
      .where(where)
      .orderBy(asc(destinations.name));

    const countsById = await getDestinationPackageCounts(rows.map((destination) => destination.id));
    const destinationRows = rows.map((destination) => ({
      ...destination,
      packageCounts: countsById.get(destination.id) || emptyPackageCounts(),
    }));

    return ApiResponse.success(res, "Countries retrieved", {
      destinations: destinationRows,
      stats: {
        total: rows.length,
        countries: rows.filter((destination) => !destination.isTerritory).length,
        territories: rows.filter((destination) => destination.isTerritory).length,
      },
    });
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.patch("/master-countries/:id", async (req: Request, res: Response) => {
  try {
    const updateData: Partial<typeof destinations.$inferSelect> = {};
    const name = textValue(req.body.name);
    const slug = textValue(req.body.slug);
    const countryCode = textValue(req.body.countryCode);
    const airaloId = textValue(req.body.airaloId);
    const flagEmoji = textValue(req.body.flagEmoji);
    const image = textValue(req.body.image);
    const bannerImage = textValue(req.body.bannerImage);
    const parentCountryCode = textValue(req.body.parentCountryCode);
    const active = normalizeBoolean(req.body.active);
    const isTerritory = normalizeBoolean(req.body.isTerritory);

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (countryCode !== undefined) updateData.countryCode = countryCode.toUpperCase();
    if (airaloId !== undefined) updateData.airaloId = airaloId || null;
    if (flagEmoji !== undefined) updateData.flagEmoji = flagEmoji || null;
    if (image !== undefined) updateData.image = image || null;
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage || null;
    if (parentCountryCode !== undefined) updateData.parentCountryCode = parentCountryCode || null;
    if (active !== undefined) updateData.active = active;
    if (isTerritory !== undefined) updateData.isTerritory = isTerritory;

    const [updated] = await db
      .update(destinations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(destinations.id, req.params.id))
      .returning();

    if (!updated) return ApiResponse.notFound(res, "Country not found");
    return ApiResponse.success(res, "Country updated", updated);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/master-countries/sync", async (_req: Request, res: Response) => {
  try {
    const result = await destinationSyncService.runFullSync();
    return ApiResponse.success(
      res,
      result.success ? "Country sync completed successfully" : "Country sync completed with errors",
      result,
    );
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post(
  "/master-countries/upload-all-media",
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const iconFile = files?.icon?.[0];
      const bannerFile = files?.banner?.[0];

      if (!iconFile && !bannerFile) {
        return ApiResponse.badRequest(res, "Upload an icon or banner image");
      }

      const updateData: Partial<typeof destinations.$inferSelect> = {};
      if (iconFile) updateData.image = uploadedFilePath(iconFile);
      if (bannerFile) updateData.bannerImage = uploadedFilePath(bannerFile);

      const includeTerritories = req.body.includeTerritories === "true";
      const payload = { ...updateData, updatedAt: new Date() };
      const updated = includeTerritories
        ? await db.update(destinations).set(payload).returning({ id: destinations.id })
        : await db
            .update(destinations)
            .set(payload)
            .where(eq(destinations.isTerritory, false))
            .returning({ id: destinations.id });

      return ApiResponse.success(res, "Country media applied", {
        updated: updated.length,
        image: updateData.image,
        bannerImage: updateData.bannerImage,
        includeTerritories,
      });
    } catch (error: any) {
      return ApiResponse.serverError(res, error.message);
    }
  },
);

router.post("/master-countries/:id/upload-image", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, "No image uploaded");
    const image = uploadedFilePath(req.file);
    const [updated] = await db
      .update(destinations)
      .set({ image, updatedAt: new Date() })
      .where(eq(destinations.id, req.params.id))
      .returning();

    if (!updated) return ApiResponse.notFound(res, "Country not found");
    return ApiResponse.success(res, "Country image uploaded", updated);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

router.post("/master-countries/:id/upload-banner", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, "No banner image uploaded");
    const bannerImage = uploadedFilePath(req.file);
    const [updated] = await db
      .update(destinations)
      .set({ bannerImage, updatedAt: new Date() })
      .where(eq(destinations.id, req.params.id))
      .returning();

    if (!updated) return ApiResponse.notFound(res, "Country not found");
    return ApiResponse.success(res, "Country banner uploaded", updated);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message);
  }
});

export default router;
