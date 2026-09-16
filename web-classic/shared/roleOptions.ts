export type RoleOptionRole = "user" | "agent" | "reseller";

export type RoleModuleDefinition = {
  key: string;
  label: string;
};

export type RoleModuleSettings = {
  // Web portal / browser UI access.
  modules: Record<string, boolean>;
  // Mobile app access. When missing in older saved settings, it is derived from modules.
  mobileModules: Record<string, boolean>;
  loginTimeoutMinutes: number;
  balanceAlertMinimum: number;
  unusedActivePackageReminderDays: number;
  specialOfferReminderDays: number;
  specialOfferSubject: string;
  specialOfferMessage: string;
};

export type RoleOptionsConfig = {
  roles: Record<RoleOptionRole, RoleModuleSettings>;
};

export type UserModuleOverrideSettings = {
  modules: Record<string, boolean>;
  mobileModules: Record<string, boolean>;
};

export const ROLE_OPTIONS_SETTING_KEY = "role_module_options";
export const USER_MODULE_OPTIONS_SETTING_PREFIX = "user_module_options:";
export const ROLE_OPTIONS_VERSION = 1;

export const ROLE_OPTION_LABELS: Record<RoleOptionRole, string> = {
  user: "User",
  agent: "Agent",
  reseller: "Reseller",
};

const RESELLER_AGENT_SERVICE_MODULES: RoleModuleDefinition[] = [
  { key: "module_premium_services", label: "Premium Services" },
  { key: "show_premium_badge", label: "Show Premium Badge" },
  { key: "module_iptv_services", label: "IPTV Services" },
  { key: "module_virtual_numbers", label: "Virtual Numbers" },
  { key: "module_vouchers", label: "Vouchers" },
  { key: "module_invoice_system", label: "Invoice System" },
  { key: "module_esim_services", label: "eSIM Services" },
  { key: "module_marketing", label: "Marketing" },
  { key: "module_push_notifications", label: "Push Notifications" },
  { key: "module_api_docs", label: "API Docs" },
  { key: "module_support_system", label: "Support System" },
  { key: "module_master_esim_packages", label: "Master eSIM Packages" },
  { key: "module_transactions", label: "Transactions" },
  { key: "module_platform_setup", label: "Platform Setup" },
  { key: "module_report", label: "Report" },
  { key: "chat_module", label: "Chat Module" },
  { key: "module_order_management", label: "Order Management" },
  { key: "module_statistics", label: "Statistics" },
  { key: "module_blog", label: "Blog" },
  { key: "module_in_app_purchases", label: "In App Purchases" },
];

const USER_SERVICE_MODULES: RoleModuleDefinition[] = [
  { key: "module_premium_services", label: "Premium Services" },
  { key: "show_premium_badge", label: "Show Premium Badge" },
  { key: "module_esim_services", label: "eSIM" },
  { key: "module_wallet_topup", label: "Top-Up Wallet" },
  { key: "module_gift_cards", label: "Gift Cards" },
  { key: "module_virtual_prepaid_cards", label: "Virtual Prepaid Card" },
  { key: "module_rewards", label: "Rewards" },
  { key: "module_virtual_numbers", label: "eRoaming's" },
  { key: "module_vouchers", label: "Vouchers" },
  { key: "chat_module", label: "Premium Chat" },
  { key: "voicemail", label: "Voicemail" },
  { key: "pbx", label: "PBX" },
  { key: "call_forward", label: "Call Forward" },
  { key: "do_not_disturb", label: "Do Not Disturb" },
  { key: "callback", label: "Callback" },
  { key: "conference_call", label: "Conference Call" },
  { key: "clear_hide_caller_id", label: "Clear / Hide Caller ID" },
  { key: "caller_id", label: "Caller ID" },
  { key: "call_recording", label: "Call Recording" },
  { key: "ring_group", label: "Ring Group" },
  { key: "trace_me", label: "Trace Me" },
  { key: "fax", label: "Fax" },
  { key: "did_allocation", label: "DID Allocation" },
  { key: "receive_international_calls", label: "Receive International Calls" },
  { key: "concierge", label: "VIP Concierge" },
  { key: "module_iptv_services", label: "IPTV" },
  { key: "module_dial_pad", label: "Show Dial Pad" },
  { key: "allow_international_calls", label: "Allow International Calls" },
  { key: "allow_internal_calls", label: "Allow Internal Calls" },
];

export const USER_PREMIUM_SERVICE_MODULE_KEYS = [
  "chat_module",
  "voicemail",
  "pbx",
  "call_forward",
  "do_not_disturb",
  "callback",
  "conference_call",
  "clear_hide_caller_id",
  "caller_id",
  "call_recording",
  "ring_group",
  "trace_me",
  "fax",
  "did_allocation",
  "receive_international_calls",
] as const;

export const ROLE_OPTION_MODULES: Record<RoleOptionRole, RoleModuleDefinition[]> = {
  reseller: [
    ...RESELLER_AGENT_SERVICE_MODULES,
    { key: "create_sub_resellers", label: "Create Sub Resellers" },
    { key: "create_agents", label: "Create Agents" },
    { key: "generate_vouchers", label: "Generate Vouchers" },
    { key: "generate_invoices", label: "Generate Invoices" },
    { key: "sub_domain", label: "Sub Domain" },
    { key: "create_users", label: "Create Users" },
    { key: "verify_kyc", label: "Verify KYC" },
    { key: "kyc_required", label: "KYC Required" },
    { key: "upload_logo", label: "Upload Logo" },
    { key: "download_invoices", label: "Download Invoices" },
    { key: "export_vouchers", label: "Export Vouchers" },
    { key: "download_vouchers", label: "Download Vouchers" },
    { key: "create_rates", label: "Create Rates" },
    { key: "edit_customer_details", label: "Edit Customer Details" },
    { key: "delete_users", label: "Delete Users" },
    { key: "add_funds_to_users", label: "Add Funds to Users" },
    { key: "add_funds_to_agents", label: "Add Funds to Agents" },
    { key: "add_funds_to_resellers", label: "Add Funds to Resellers" },
    { key: "referral_program", label: "Referral Program" },
    { key: "registration_bonus", label: "Registration Bonus" },
    { key: "payment_gateway", label: "Payment Gateway" },
    { key: "change_profile", label: "Change Profile" },
    { key: "concierge", label: "Concierge + AI Voice Agent" },
    { key: "support", label: "Support" },
    { key: "ai_agent", label: "AI Agent" },
    { key: "ai_chat", label: "AI Chat" },
    { key: "balance_alert", label: "Balance Alert" },
    { key: "unused_active_package_reminder", label: "Automatic Reminder for Unused Active Package" },
    { key: "special_offer_reminder", label: "Automatic Reminder with Special Offer" },
    { key: "buy_package", label: "Buy Package" },
    { key: "store_front", label: "Store Front" },
    { key: "switch_to_customer", label: "Switch to Customer" },
    { key: "auto_logout", label: "Set Login Time then logout automatically" },
  ],
  agent: [
    ...RESELLER_AGENT_SERVICE_MODULES,
    { key: "create_sub_agents", label: "Create Sub Agents" },
    { key: "create_user", label: "Create User" },
    { key: "generate_vouchers", label: "Generate Vouchers" },
    { key: "generate_invoices", label: "Generate Invoices" },
    { key: "sub_domain", label: "Sub Domain" },
    { key: "switch_to_reseller", label: "Switch to Reseller" },
    { key: "verify_kyc", label: "Verify KYC" },
    { key: "kyc_required", label: "KYC Required" },
    { key: "upload_logo", label: "Upload Logo" },
    { key: "download_invoices", label: "Download Invoices" },
    { key: "export_vouchers", label: "Export Vouchers" },
    { key: "download_vouchers", label: "Download Vouchers" },
    { key: "create_rates", label: "Create Rates" },
    { key: "edit_customer_details", label: "Edit Customer Details" },
    { key: "delete_users", label: "Delete Users" },
    { key: "referral_program", label: "Referral Program" },
    { key: "registration_bonus", label: "Registration Bonus" },
    { key: "change_profile", label: "Change Profile" },
    { key: "concierge", label: "Concierge + AI Voice Agent" },
    { key: "support", label: "Support" },
    { key: "ai_agent", label: "AI Agent" },
    { key: "ai_chat", label: "AI Chat" },
    { key: "balance_alert", label: "Balance Alert" },
    { key: "unused_active_package_reminder", label: "Automatic Reminder for Unused Active Package" },
    { key: "special_offer_reminder", label: "Automatic Reminder with Special Offer" },
    { key: "buy_package", label: "Buy Package" },
    { key: "store_front", label: "Store Front" },
    { key: "switch_to_customer", label: "Switch to Customer" },
    { key: "auto_logout", label: "Set Login Time then logout automatically" },
  ],
  user: [
    ...USER_SERVICE_MODULES,
    { key: "generate_vouchers", label: "Generate Vouchers" },
    { key: "verify_kyc", label: "Verify KYC" },
    { key: "kyc_required", label: "KYC Required" },
    { key: "download_invoices", label: "Download Invoices" },
    { key: "export_vouchers", label: "Export Vouchers" },
    { key: "download_vouchers", label: "Download Vouchers" },
    { key: "referral_program", label: "Referral Program" },
    { key: "registration_bonus", label: "Registration Bonus" },
    { key: "change_profile", label: "Change Profile" },
    { key: "support", label: "Support" },
    { key: "ai_agent", label: "AI Agent" },
    { key: "ai_chat", label: "AI Chat" },
    { key: "balance_alert", label: "Balance Alert" },
    { key: "unused_active_package_reminder", label: "Automatic Reminder for Unused Active Package" },
    { key: "special_offer_reminder", label: "Automatic Reminder with Special Offer" },
    { key: "buy_package", label: "Buy Package" },
    { key: "switch_to_reseller", label: "Switch to Reseller" },
    { key: "switch_to_agents", label: "Switch to Agents" },
    { key: "auto_logout", label: "Set Login Time then logout automatically" },
  ],
};

export const ROLE_OPTION_ROLES = Object.keys(ROLE_OPTION_MODULES) as RoleOptionRole[];

function defaultModuleEnabled(role: RoleOptionRole, moduleKey: string) {
  return ![
    "auto_logout",
    "balance_alert",
    "unused_active_package_reminder",
    "special_offer_reminder",
    ...(role === "user" ? USER_PREMIUM_SERVICE_MODULE_KEYS : []),
  ].includes(moduleKey);
}

function defaultBalanceAlertMinimum(role: RoleOptionRole) {
  if (role === "user") return 5;
  if (role === "agent") return 25;
  return 50;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number, round = false) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  const clamped = Math.max(min, Math.min(max, numericValue));
  return round ? Math.round(clamped) : clamped;
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

export function getDefaultRoleOptionsConfig(): RoleOptionsConfig {
  return {
    roles: ROLE_OPTION_ROLES.reduce((acc, role) => {
      const modules = ROLE_OPTION_MODULES[role].reduce<Record<string, boolean>>((moduleAcc, module) => {
        moduleAcc[module.key] = defaultModuleEnabled(role, module.key);
        return moduleAcc;
      }, {});

      acc[role] = {
        modules,
        mobileModules: { ...modules },
        loginTimeoutMinutes: 60,
        balanceAlertMinimum: defaultBalanceAlertMinimum(role),
        unusedActivePackageReminderDays: 3,
        specialOfferReminderDays: 7,
        specialOfferSubject: "Special offer for your account",
        specialOfferMessage: "A special offer is available for your account. Log in to view the latest package deals.",
      };
      return acc;
    }, {} as Record<RoleOptionRole, RoleModuleSettings>),
  };
}

export function normalizeRoleOptionsConfig(input: unknown): RoleOptionsConfig {
  const defaults = getDefaultRoleOptionsConfig();
  const source = input && typeof input === "object" ? input as Partial<RoleOptionsConfig> : {};
  const sourceRoles = source.roles && typeof source.roles === "object" ? source.roles : {};

  return {
    roles: ROLE_OPTION_ROLES.reduce((acc, role) => {
      const sourceRole = (sourceRoles as Record<string, Partial<RoleModuleSettings> | undefined>)[role] || {};
      const sourceModules = sourceRole.modules && typeof sourceRole.modules === "object" ? sourceRole.modules : {};
      const sourceMobileModules =
        sourceRole.mobileModules && typeof sourceRole.mobileModules === "object"
          ? sourceRole.mobileModules
          : sourceModules;
      const timeout = Number(sourceRole.loginTimeoutMinutes ?? defaults.roles[role].loginTimeoutMinutes);
      const roleDefaults = defaults.roles[role];

      acc[role] = {
        modules: ROLE_OPTION_MODULES[role].reduce<Record<string, boolean>>((moduleAcc, module) => {
          const value = (sourceModules as Record<string, unknown>)[module.key];
          moduleAcc[module.key] = typeof value === "boolean" ? value : defaults.roles[role].modules[module.key];
          return moduleAcc;
        }, {}),
        mobileModules: ROLE_OPTION_MODULES[role].reduce<Record<string, boolean>>((moduleAcc, module) => {
          const value = (sourceMobileModules as Record<string, unknown>)[module.key];
          moduleAcc[module.key] = typeof value === "boolean" ? value : defaults.roles[role].mobileModules[module.key];
          return moduleAcc;
        }, {}),
        loginTimeoutMinutes: Number.isFinite(timeout) && timeout > 0 ? Math.round(timeout) : roleDefaults.loginTimeoutMinutes,
        balanceAlertMinimum: clampNumber(sourceRole.balanceAlertMinimum, roleDefaults.balanceAlertMinimum, 0, 100000),
        unusedActivePackageReminderDays: clampNumber(
          sourceRole.unusedActivePackageReminderDays,
          roleDefaults.unusedActivePackageReminderDays,
          1,
          365,
          true,
        ),
        specialOfferReminderDays: clampNumber(
          sourceRole.specialOfferReminderDays,
          roleDefaults.specialOfferReminderDays,
          1,
          365,
          true,
        ),
        specialOfferSubject: normalizeText(sourceRole.specialOfferSubject, roleDefaults.specialOfferSubject, 120),
        specialOfferMessage: normalizeText(sourceRole.specialOfferMessage, roleDefaults.specialOfferMessage, 500),
      };
      return acc;
    }, {} as Record<RoleOptionRole, RoleModuleSettings>),
  };
}

export function normalizeUserModuleOverrides(role: RoleOptionRole, input: unknown): Record<string, boolean> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return ROLE_OPTION_MODULES[role].reduce<Record<string, boolean>>((acc, module) => {
    const value = source[module.key];
    if (typeof value === "boolean") acc[module.key] = value;
    return acc;
  }, {});
}

export function normalizeUserModuleOverrideSettings(
  role: RoleOptionRole,
  input: unknown,
): UserModuleOverrideSettings {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const webSource = source.modules && typeof source.modules === "object" ? source.modules : source;
  const mobileSource =
    source.mobileModules && typeof source.mobileModules === "object"
      ? source.mobileModules
      : webSource;

  return {
    modules: normalizeUserModuleOverrides(role, webSource),
    mobileModules: normalizeUserModuleOverrides(role, mobileSource),
  };
}
