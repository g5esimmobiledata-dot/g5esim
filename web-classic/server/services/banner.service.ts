import { banners, unifiedPackages } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';

function normalizeBannerImageUrl<T extends { imageUrl?: string | null }>(banner: T): T {
  if (!banner.imageUrl) return banner;

  const imageUrl = banner.imageUrl.startsWith('/uploads/')
    ? `/api${banner.imageUrl}`
    : banner.imageUrl.startsWith('uploads/')
      ? `/api/${banner.imageUrl}`
      : banner.imageUrl;

  return { ...banner, imageUrl };
}

export class BannerService {
  static async create(data: any) {
    const [result] = await db.insert(banners).values(data).returning();
    return normalizeBannerImageUrl(result);
  }

  static async getAll() {
    const results = await db.select().from(banners).orderBy(banners.position);

    return results.map(normalizeBannerImageUrl);
  }

  static async getAllB() {
    const results = await db
      .select({
        id: banners.id,
        title: banners.title,
        imageUrl: banners.imageUrl,
        isActive: banners.isActive,
        position: banners.position,
        packageId: banners.packageId,
        packageSlug: unifiedPackages.slug, // slug join se
        providerPackageId: unifiedPackages.providerPackageId,
      })
      .from(banners)
      .leftJoin(unifiedPackages, eq(banners.packageId, unifiedPackages.id))
      .orderBy(banners.position);

    return results.map(normalizeBannerImageUrl);
  }

  static async getById(id: string) {
    const [result] = await db.select().from(banners).where(eq(banners.id, id));

    return result ? normalizeBannerImageUrl(result) : result;
  }

  static async update(id: string, data: any) {
    const [result] = await db.update(banners).set(data).where(eq(banners.id, id)).returning();

    return result ? normalizeBannerImageUrl(result) : result;
  }

  static async delete(id: string) {
    const [result] = await db.delete(banners).where(eq(banners.id, id)).returning();

    return result;
  }
}
