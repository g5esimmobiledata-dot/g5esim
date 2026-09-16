import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { normalizeRoleOptionsConfig, type RoleOptionRole, type RoleOptionsConfig } from '@shared/roleOptions';
import { useUser } from '@/hooks/use-user';

function roleKey(role?: string | null): RoleOptionRole {
  if (role === 'agent') return 'agent';
  if (role === 'reseller') return 'reseller';
  return 'user';
}

async function fetchRoleOptions(): Promise<RoleOptionsConfig> {
  const response = await fetch('/api/options', { credentials: 'include' });
  if (!response.ok) return normalizeRoleOptionsConfig(null);

  const json = await response.json();
  return normalizeRoleOptionsConfig(json?.data || json);
}

export function useRoleModuleAccess(moduleKey: string) {
  const { user, isAuthenticated } = useUser();

  const { data: options, isLoading } = useQuery({
    queryKey: ['/api/options', user?.id || 'guest'],
    queryFn: fetchRoleOptions,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30_000,
  });

  const role = roleKey(user?.role);

  const enabled = useMemo(() => {
    if (!isAuthenticated || !options) return false;
    const modules = options.roles[role]?.modules;
    if (!modules || !(moduleKey in modules)) return true;
    return Boolean(modules[moduleKey]);
  }, [isAuthenticated, moduleKey, options, role]);

  return {
    enabled,
    isLoading,
    role,
    options,
  };
}
