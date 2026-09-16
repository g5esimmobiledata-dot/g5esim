import { eq } from "drizzle-orm";
import { platformSettings } from "@shared/schema";
import {
  normalizeRoleOptionsConfig,
  ROLE_OPTIONS_SETTING_KEY,
  type RoleOptionRole,
  type RoleOptionsConfig,
} from "@shared/roleOptions";
import { db } from "../db";

export async function getStoredRoleOptionsConfig(): Promise<RoleOptionsConfig> {
  const [setting] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, ROLE_OPTIONS_SETTING_KEY))
    .limit(1);

  if (!setting?.value) {
    return normalizeRoleOptionsConfig(null);
  }

  try {
    return normalizeRoleOptionsConfig(JSON.parse(setting.value));
  } catch {
    return normalizeRoleOptionsConfig(null);
  }
}

export function getRoleOptionRole(userRole: string | null | undefined): RoleOptionRole {
  const role = String(userRole || "").toLowerCase();
  if (role.includes("reseller")) return "reseller";
  if (role.includes("agent")) return "agent";
  return "user";
}
