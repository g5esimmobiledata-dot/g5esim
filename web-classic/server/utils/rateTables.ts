import { and, eq, sql } from "drizzle-orm";
import { db } from "server/db";
import {
  providers,
  rateTables,
  rateTableAssignments,
  rateTablePrices,
  resellerPackagePrices,
  resellerProviderSettings,
  unifiedPackages,
} from "@shared/schema";

let rateTablesReady = false;

export async function ensureRateTables() {
  if (rateTablesReady) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rate_tables (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      default_margin_percent decimal(6, 2) NOT NULL DEFAULT '0.00',
      status text NOT NULL DEFAULT 'active',
      created_by varchar REFERENCES admins(id) ON DELETE SET NULL,
      owner_user_id varchar REFERENCES users(id) ON DELETE CASCADE,
      owner_type text NOT NULL DEFAULT 'admin',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE rate_tables
    ADD COLUMN IF NOT EXISTS owner_user_id varchar REFERENCES users(id) ON DELETE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE rate_tables
    ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'admin'
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rate_tables_status_idx
    ON rate_tables (status)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rate_tables_owner_user_idx
    ON rate_tables (owner_user_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rate_table_prices (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      rate_table_id varchar NOT NULL REFERENCES rate_tables(id) ON DELETE CASCADE,
      package_id varchar NOT NULL REFERENCES unified_packages(id) ON DELETE CASCADE,
      cost_price decimal(10, 2) NOT NULL,
      selling_price decimal(10, 2) NOT NULL,
      margin_percent decimal(6, 2),
      is_enabled boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT rate_table_prices_rate_table_package_unique UNIQUE (rate_table_id, package_id)
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rate_table_prices_rate_table_idx
    ON rate_table_prices (rate_table_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rate_table_prices_package_idx
    ON rate_table_prices (package_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rate_table_assignments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      rate_table_id varchar NOT NULL REFERENCES rate_tables(id) ON DELETE CASCADE,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by varchar REFERENCES admins(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT rate_table_assignments_user_unique UNIQUE (user_id)
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rate_table_assignments_rate_table_idx
    ON rate_table_assignments (rate_table_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS rate_table_assignments_user_idx
    ON rate_table_assignments (user_id)
  `);

  rateTablesReady = true;
}

function money(value: number) {
  return value.toFixed(2);
}

export function getPackageProviderCost(pkg: {
  wholesalePrice?: string | number | null;
  resellerPrice?: string | number | null;
  retailPrice?: string | number | null;
}) {
  const cost = Number(pkg.wholesalePrice || pkg.resellerPrice || pkg.retailPrice || 0);
  return Number.isFinite(cost) ? cost : 0;
}

export async function upsertRateTablePricesFromPackages(rateTableId: string, marginPercent: number) {
  await ensureRateTables();

  const packages = await db
    .select({
      id: unifiedPackages.id,
      wholesalePrice: unifiedPackages.wholesalePrice,
      resellerPrice: unifiedPackages.resellerPrice,
      retailPrice: unifiedPackages.retailPrice,
      isEnabled: unifiedPackages.isEnabled,
    })
    .from(unifiedPackages)
    .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .where(and(eq(providers.enabled, true), eq(unifiedPackages.isEnabled, true)));

  const now = new Date();
  const values = packages.map((pkg) => {
    const cost = getPackageProviderCost(pkg);
    const sellingPrice = cost * (1 + marginPercent / 100);

    return {
      rateTableId,
      packageId: pkg.id,
      costPrice: money(cost),
      sellingPrice: money(sellingPrice),
      marginPercent: marginPercent.toFixed(2),
      isEnabled: Boolean(pkg.isEnabled),
      updatedAt: now,
    };
  });

  const chunkSize = 500;
  for (let index = 0; index < values.length; index += chunkSize) {
    await db
      .insert(rateTablePrices)
      .values(values.slice(index, index + chunkSize))
      .onConflictDoUpdate({
        target: [rateTablePrices.rateTableId, rateTablePrices.packageId],
        set: {
          costPrice: sql`excluded.cost_price`,
          sellingPrice: sql`excluded.selling_price`,
          marginPercent: marginPercent.toFixed(2),
          isEnabled: sql`excluded.is_enabled`,
          updatedAt: now,
        },
      });
  }

  return values.length;
}

export async function upsertRateTablePricesFromResellerCost(
  rateTableId: string,
  resellerId: string,
  marginPercent: number,
) {
  await ensureRateTables();

  const rows = await db
    .select({
      id: unifiedPackages.id,
      wholesalePrice: unifiedPackages.wholesalePrice,
      resellerPrice: unifiedPackages.resellerPrice,
      retailPrice: unifiedPackages.retailPrice,
      isEnabled: unifiedPackages.isEnabled,
      customEnabled: resellerPackagePrices.isEnabled,
      assignedSellingPrice: rateTablePrices.sellingPrice,
      assignedEnabled: rateTablePrices.isEnabled,
    })
    .from(unifiedPackages)
    .leftJoin(providers, eq(unifiedPackages.providerId, providers.id))
    .leftJoin(
      resellerProviderSettings,
      and(
        eq(resellerProviderSettings.providerId, unifiedPackages.providerId),
        eq(resellerProviderSettings.resellerId, resellerId),
      ),
    )
    .leftJoin(rateTableAssignments, eq(rateTableAssignments.userId, resellerId))
    .leftJoin(
      rateTablePrices,
      sql`${rateTablePrices.rateTableId} = ${rateTableAssignments.rateTableId} AND ${rateTablePrices.packageId} = ${unifiedPackages.id}`,
    )
    .leftJoin(
      resellerPackagePrices,
      sql`${resellerPackagePrices.packageId} = ${unifiedPackages.id} AND ${resellerPackagePrices.resellerId} = ${resellerId}`,
    )
    .where(and(
      eq(providers.enabled, true),
      eq(unifiedPackages.isEnabled, true),
      sql`COALESCE(${resellerProviderSettings.isEnabled}, true) = true`,
    ));

  const now = new Date();
  const values = rows.map((row) => {
    const cost = Number(row.assignedSellingPrice || row.resellerPrice || row.retailPrice || row.wholesalePrice || 0);
    const normalizedCost = Number.isFinite(cost) ? cost : 0;
    const sellingPrice = normalizedCost * (1 + marginPercent / 100);

    return {
      rateTableId,
      packageId: row.id,
      costPrice: money(normalizedCost),
      sellingPrice: money(sellingPrice),
      marginPercent: marginPercent.toFixed(2),
      isEnabled: row.customEnabled !== false && row.assignedEnabled !== false,
      updatedAt: now,
    };
  });

  const chunkSize = 500;
  for (let index = 0; index < values.length; index += chunkSize) {
    await db
      .insert(rateTablePrices)
      .values(values.slice(index, index + chunkSize))
      .onConflictDoUpdate({
        target: [rateTablePrices.rateTableId, rateTablePrices.packageId],
        set: {
          costPrice: sql`excluded.cost_price`,
          sellingPrice: sql`excluded.selling_price`,
          marginPercent: marginPercent.toFixed(2),
          isEnabled: sql`excluded.is_enabled`,
          updatedAt: now,
        },
      });
  }

  await db.update(rateTables).set({ updatedAt: now }).where(eq(rateTables.id, rateTableId));

  return values.length;
}

export async function applyRateTableToUser(userId: string, rateTableId: string, assignedBy?: string | null) {
  await ensureRateTables();

  const rows = await db
    .select()
    .from(rateTablePrices)
    .where(eq(rateTablePrices.rateTableId, rateTableId));

  if (rows.length === 0) {
    throw new Error("This rate table has no package prices");
  }

  const [existingAssignment] = await db
    .select({ rateTableId: rateTableAssignments.rateTableId })
    .from(rateTableAssignments)
    .where(eq(rateTableAssignments.userId, userId))
    .limit(1);

  const legacyRateTableIds = Array.from(new Set(
    [existingAssignment?.rateTableId, rateTableId].filter((id): id is string => Boolean(id)),
  ));
  for (const legacyRateTableId of legacyRateTableIds) {
    await db.execute(sql`
      DELETE FROM reseller_package_prices AS rpp
      USING rate_table_prices AS rtp
      WHERE rpp.reseller_id = ${userId}
        AND rtp.rate_table_id = ${legacyRateTableId}
        AND rpp.package_id = rtp.package_id
        AND ROUND(rpp.selling_price::numeric, 2) = ROUND(rtp.selling_price::numeric, 2)
        AND (
          rpp.markup_percent IS NULL
          OR ROUND(rpp.markup_percent::numeric, 2) = ROUND(COALESCE(rtp.margin_percent, 0)::numeric, 2)
        )
    `);
  }

  const now = new Date();

  await db
    .insert(rateTableAssignments)
    .values({
      userId,
      rateTableId,
      assignedBy: assignedBy || null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: rateTableAssignments.userId,
      set: {
        rateTableId,
        assignedBy: assignedBy || null,
        updatedAt: now,
      },
    });

  return {
    userId,
    rateTableId,
    applied: rows.length,
  };
}

export async function getRateAssignmentForUser(userId: string) {
  await ensureRateTables();

  const [assignment] = await db
    .select()
    .from(rateTableAssignments)
    .where(eq(rateTableAssignments.userId, userId))
    .limit(1);

  return assignment || null;
}
