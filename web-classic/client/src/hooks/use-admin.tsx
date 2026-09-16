import {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// --- TYPES ---
interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => void;
}

// --- CONTEXT ---
const UserContext = createContext<UserContextType | undefined>(undefined);

// --- PROVIDER ---
export function AdminProvider({ children }: { children: ReactNode }) {
  const {
    data,
    isLoading,
    refetch,
  } = useQuery<User>({
    queryKey: ["/api/admin/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/me");
      const response = await res.json();
      // Handle standardized API response format {success, message, data}
      if (response && response.data) {
        return response.data;
      }
      return response;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const user = data ?? null;
  const isAuthenticated = !!user;

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        refetchUser: refetch,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// --- HOOK ---
export function useAdmin() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return ctx;
}
