import type { LoginResponse } from "@alturia/shared";
import { createContext, useContext } from "react";
import type { Api } from "../lib/api";

export type Admin = LoginResponse["admin"];

export interface AuthValue {
  api: Api;
  admin: Admin | null;
  signedIn: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
