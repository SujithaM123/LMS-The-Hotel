import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearStoredAuth, getStoredAuth, onUnauthorized, setStoredAuth } from "../api/client";
import type { AuthResponse, Role } from "../api/types";

interface AuthContextValue {
  user: AuthResponse | null;
  role: Role | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(() => getStoredAuth());

  useEffect(() => {
    onUnauthorized(() => {
      clearStoredAuth();
      setUser(null);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const auth = await api.login({ email, password });
    setStoredAuth(auth);
    setUser(auth);
  };

  const register = async (name: string, email: string, password: string, role: Role) => {
    const auth = await api.register({ name, email, password, role });
    setStoredAuth(auth);
    setUser(auth);
  };

  const logout = () => {
    api.logout().catch(() => {});
    clearStoredAuth();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, role: user?.role ?? null, login, register, logout }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
