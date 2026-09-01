import { createContext } from "react";
import type { User } from "../services/api";

export interface AuthContextType {
  user: User | null;
  name: string | null;
  token: string | null;
  company: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  setSession: (user: User, token: string, newCompany?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearMustChangePassword: () => void;
  isMaster: boolean;
  isEnterpriseAdmin: boolean;
  isEmployee: boolean;
  isAdminOrMaster: boolean;
  isImpersonated: boolean;
  impersonatedCompanyName: string | null;
  startImpersonation: (token: string, user: User, companyName: string) => void;
  stopImpersonation: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
