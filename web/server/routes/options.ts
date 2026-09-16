import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { platformSettings } from '@shared/schema';
import {
  normalizeUserModuleOverrideSettings,
  USER_MODULE_OPTIONS_SETTING_PREFIX,
  type RoleModuleSettings,
  type RoleOptionRole,
  type UserModuleOverrideSettings,
} from '@shared/roleOptions';
import { db } from '../db';
import { optionalAuth } from '../lib/middleware';
import { storage } from '../storage';
import * as ApiResponse from '../utils/response';
import { getStoredRoleOptionsConfig } from '../utils/roleOptionsConfig';
import {
  getDefaultSipRegistrationProfile,
  mergeSipFeatureSettings,
} from '../services/sip-commercial-service';

const router = Router();

function roleKey(role?: string | null): RoleOptionRole {
  if (role === 'agent') return 'agent';
  if (role === 'reseller') return 'reseller';
  return 'user';
}

async function getUserModuleOverrides(
  userId: string,
  role: RoleOptionRole,
): Promise<UserModuleOverrideSettings> {
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, `${USER_MODULE_OPTIONS_SETTING_PREFIX}${userId}`));

  if (!row?.value) return { modules: {}, mobileModules: {} };

  try {
    const parsed = JSON.parse(row.value);
    return normalizeUserModuleOverrideSettings(role, parsed);
  } catch {
    return { modules: {}, mobileModules: {} };
  }
}

function applyMobileCompatibilityAliases(roleSettings: RoleModuleSettings) {
  const chatEnabled = roleSettings.mobileModules.chat_module;
  if (typeof chatEnabled === 'boolean') {
    roleSettings.mobileModules.chat = chatEnabled;
    roleSettings.mobileModules.module_chat = chatEnabled;
    roleSettings.mobileModules.premium_chat = chatEnabled;
  }
}

function applyPremiumServicesMasterSwitch(roleSettings: RoleModuleSettings) {
  const premiumKey = 'module_premium_services';
  const webEnabled = roleSettings.modules[premiumKey] === true;
  const mobileEnabled = roleSettings.mobileModules[premiumKey] === true;

  roleSettings.mobileModules[premiumKey] = webEnabled && mobileEnabled;
}

function setMobileModuleAliases(
  roleSettings: RoleModuleSettings,
  keys: string[],
  enabled: boolean,
) {
  for (const key of keys) {
    roleSettings.mobileModules[key] = enabled && roleSettings.mobileModules[key] !== false;
  }
}

function applyVoiceFeatureAliases(
  roleSettings: RoleModuleSettings,
  voiceSettings: Record<string, any>,
) {
  const conferenceEnabled = Boolean(voiceSettings.conferenceCallEnabled);
  const recordingEnabled = Boolean(voiceSettings.callRecordingEnabled);
  const recordingRequiresPayment =
    recordingEnabled &&
    String(voiceSettings.callRecordingBillingMode || 'free').toLowerCase() !== 'free';

  setMobileModuleAliases(
    roleSettings,
    ['conference_call', 'conference', 'module_conference_call', 'module_conference'],
    conferenceEnabled,
  );
  setMobileModuleAliases(
    roleSettings,
    ['call_recording', 'recording', 'module_call_recording', 'module_recording'],
    recordingEnabled,
  );
  setMobileModuleAliases(
    roleSettings,
    [
      'call_recording_requires_payment',
      'recording_requires_payment',
      'module_call_recording_requires_payment',
      'module_recording_requires_payment',
      'call_recording_paid',
    ],
    recordingRequiresPayment,
  );
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const config = await getStoredRoleOptionsConfig();
    const voiceSettings = mergeSipFeatureSettings(await getDefaultSipRegistrationProfile());
    const userId = (req as any).session?.userId || (req as any).userId || null;

    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        const role = roleKey(user.role);
        const premiumServicesAllowedByRole =
          config.roles[role].modules.module_premium_services === true &&
          config.roles[role].mobileModules.module_premium_services === true;
        const overrides = await getUserModuleOverrides(user.id, role);
        config.roles[role].modules = {
          ...config.roles[role].modules,
          ...overrides.modules,
        };
        config.roles[role].mobileModules = {
          ...config.roles[role].mobileModules,
          ...overrides.mobileModules,
        };

        if (!premiumServicesAllowedByRole) {
          config.roles[role].modules.module_premium_services = false;
          config.roles[role].mobileModules.module_premium_services = false;
        }
      }
    }

    Object.values(config.roles).forEach((roleSettings) => {
      applyPremiumServicesMasterSwitch(roleSettings);
      applyMobileCompatibilityAliases(roleSettings);
      applyVoiceFeatureAliases(roleSettings, voiceSettings);
    });

    return ApiResponse.success(res, 'Options retrieved successfully', config);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || 'Failed to load options');
  }
});

export default router;
