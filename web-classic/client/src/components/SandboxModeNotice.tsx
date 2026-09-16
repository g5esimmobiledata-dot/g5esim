import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';

type SandboxRole = 'customer' | 'agent' | 'reseller';

type SandboxModeNoticeProps = {
  role?: SandboxRole;
  className?: string;
};

const roleLabels: Record<SandboxRole, string> = {
  customer: 'Customer',
  agent: 'Agent',
  reseller: 'Reseller',
};

function sandboxAppliesToRole(settings: Record<string, string>, role: SandboxRole) {
  if (role === 'reseller') return settings.sandbox_apply_reseller !== 'false';
  if (role === 'agent') return settings.sandbox_apply_agent !== 'false';
  return settings.sandbox_apply_customer !== 'false';
}

export function SandboxModeNotice({
  role,
  className,
}: SandboxModeNoticeProps) {
  const { user } = useUser();
  const { data: publicSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/public/settings'],
  });

  const sandboxBaseActive =
    user?.accountMode === 'sandbox' ||
    user?.accountMode === 'demo' ||
    (
      publicSettings.demo_mode_enabled === 'true' &&
      publicSettings.demo_mode_environment === 'sandbox'
    );

  if (!sandboxBaseActive) return null;

  const accountRole: SandboxRole =
    role || (user?.role === 'agent' || user?.role === 'reseller' ? user.role : 'customer');

  if (accountRole !== 'agent' && accountRole !== 'reseller') return null;

  const accountModeActive = user?.accountMode === 'sandbox' || user?.accountMode === 'demo';
  if (!accountModeActive && !sandboxAppliesToRole(publicSettings, accountRole)) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100',
        className,
      )}
      data-testid="notice-sandbox-mode"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Sandbox Mode Active</p>
          <p className="mt-1 text-sm">
            This {roleLabels[accountRole]} account is running in Sandbox mode. Wallet funds, checkout, and eSIM delivery are for developer testing only.
          </p>
        </div>
      </div>
    </div>
  );
}
