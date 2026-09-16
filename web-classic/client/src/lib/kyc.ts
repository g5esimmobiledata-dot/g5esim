type KycUser = {
  role?: string | null;
  kycStatus?: string | null;
  kycVerificationRequired?: boolean | null;
} | null | undefined;

type KycSettings = {
  kyc_enabled?: string;
  kyc_required_customer?: string;
  kyc_required_agent?: string;
  kyc_required_reseller?: string;
};

function enabled(value: string | undefined, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return value !== 'false';
}

export function isKycVerified(user: KycUser) {
  return user?.kycStatus === 'approved' || user?.kycStatus === 'verified';
}

export function isKycRequiredForUser(user: KycUser, settings: KycSettings) {
  if (!enabled(settings.kyc_enabled)) return false;
  if (user?.kycVerificationRequired === false) return false;

  const role = user?.role === 'agent' || user?.role === 'reseller' ? user.role : 'customer';
  const roleKey =
    role === 'agent'
      ? 'kyc_required_agent'
      : role === 'reseller'
        ? 'kyc_required_reseller'
        : 'kyc_required_customer';

  return enabled(settings[roleKey]);
}
