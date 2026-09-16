import { useEffect, useRef } from "react";

import { useUser } from "@/hooks/use-user";
import { clearOneSignalUser, identifyOneSignalUser } from "@/lib/onesignal";

export function OneSignalBootstrap() {
  const { user, isLoading } = useUser();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || window.location.pathname.startsWith("/admin")) return;

    if (user?.id) {
      lastUserId.current = user.id;
      void identifyOneSignalUser(user);
      return;
    }

    if (lastUserId.current) {
      lastUserId.current = null;
      void clearOneSignalUser();
    }
  }, [isLoading, user?.id, user?.email, user?.role]);

  return null;
}
