import { createContext, useContext, useState, ReactNode } from "react";

type AuthDialogType = "signin" | "signup" | null;

interface AuthDialogContextType {
  isOpen: boolean;
  dialogType: AuthDialogType;
  openSignIn: () => void;
  openSignUp: () => void;
  close: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextType | undefined>(undefined);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [dialogType, setDialogType] = useState<AuthDialogType>(null);

  const openSignIn = () => setDialogType("signin");
  const openSignUp = () => setDialogType("signup");
  const close = () => setDialogType(null);

  return (
    <AuthDialogContext.Provider
      value={{
        isOpen: dialogType !== null,
        dialogType,
        openSignIn,
        openSignUp,
        close,
      }}
    >
      {children}
    </AuthDialogContext.Provider>
  );
}

const noopContext: AuthDialogContextType = {
  isOpen: false,
  dialogType: null,
  openSignIn: () => {},
  openSignUp: () => {},
  close: () => {},
};

export function useAuthDialog(): AuthDialogContextType {
  const context = useContext(AuthDialogContext);
  return context ?? noopContext;
}

export function useAuthDialogContext(): AuthDialogContextType | undefined {
  return useContext(AuthDialogContext);
}
