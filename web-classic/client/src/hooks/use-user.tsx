import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  address?: string | null;
  role?: "customer" | "agent" | "reseller";
  accountMode?: "live" | "sandbox" | "demo";
  kycStatus?: string;
  kycRejectionReason?: string | null;
  kycVerificationRequired?: boolean;
  referralBalance?: string;
  walletBalance?: string;
  memberTier?: "standard" | "gold" | "platinum";
  memberRewardBalance?: string;
  memberRewardLifetime?: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{ user: user || null, isLoading, isAuthenticated, refetchUser: refetch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
