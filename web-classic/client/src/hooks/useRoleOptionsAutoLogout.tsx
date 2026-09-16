import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { normalizeRoleOptionsConfig, type RoleOptionRole, type RoleOptionsConfig } from '@shared/roleOptions';

type CurrentUser = {
  id: string;
  role?: string | null;
};

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch('/api/auth/me', { credentials: 'include' });
  if (response.status === 401 || response.status === 404) return null;
  if (!response.ok) return null;

  const json = await response.json();
  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data || null;
  }

  return json || null;
}

async function fetchRoleOptions(): Promise<RoleOptionsConfig> {
  const response = await fetch('/api/options', { credentials: 'include' });
  if (!response.ok) return normalizeRoleOptionsConfig(null);

  const json = await response.json();
  return normalizeRoleOptionsConfig(json?.data || json);
}

function roleKey(role?: string | null): RoleOptionRole {
  if (role === 'agent') return 'agent';
  if (role === 'reseller') return 'reseller';
  return 'user';
}

export function useRoleOptionsAutoLogout() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me', 'role-options-auto-logout'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
  });

  const { data: options } = useQuery({
    queryKey: ['/api/options'],
    queryFn: fetchRoleOptions,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user || !options) return;

    const role = roleKey(user.role);
    const roleOptions = options.roles[role];
    const enabled = Boolean(roleOptions.modules.auto_logout);
    const minutes = Number(roleOptions.loginTimeoutMinutes || 0);
    const storageKey = `role-options-session-started-at:${user.id}`;

    if (!enabled || !Number.isFinite(minutes) || minutes <= 0) {
      sessionStorage.removeItem(storageKey);
      return;
    }

    let startedAt = Number(sessionStorage.getItem(storageKey) || 0);
    if (!startedAt || !Number.isFinite(startedAt)) {
      startedAt = Date.now();
      sessionStorage.setItem(storageKey, String(startedAt));
    }

    const timeoutMs = Math.max(1, Math.round(minutes * 60_000));
    const remainingMs = Math.max(0, startedAt + timeoutMs - Date.now());

    const timer = window.setTimeout(async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
      } finally {
        sessionStorage.removeItem(storageKey);
        queryClient.clear();
        window.location.href = '/login?reason=session-expired';
      }
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [options, user]);
}
