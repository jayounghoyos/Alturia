import { useCallback, useMemo, useState, type ReactNode } from "react";
import { createApi } from "../lib/api";
import { createHttp } from "../lib/http";
import { AuthContext, type Admin, type AuthValue } from "./auth-context";

const TOKEN_KEY = "alturia-admin-token";
const ADMIN_KEY = "alturia-admin";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function tokenHolder(initial: string | null) {
  let token = initial;
  return {
    get: () => token,
    set: (next: string | null) => {
      token = next;
    },
  };
}

function readAdmin(): Admin | null {
  try {
    return JSON.parse(read(ADMIN_KEY) ?? "null") as Admin | null;
  } catch {
    return null;
  }
}

/**
 * The admin's session. An expired or revoked token (any 401) signs the admin
 * out, and RequireAuth sends them to the login screen.
 */
export function AuthProvider({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl: string;
  children: ReactNode;
}) {
  const [token, setToken] = useState<string | null>(() => read(TOKEN_KEY));
  const [admin, setAdmin] = useState<Admin | null>(readAdmin);
  // The HTTP client reads the token at request time from this holder, so it
  // is built once and never sends a stale token.
  const [session] = useState(() => tokenHolder(read(TOKEN_KEY)));

  const logout = useCallback(() => {
    session.set(null);
    setToken(null);
    setAdmin(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  }, [session]);

  const api = useMemo(
    () =>
      createApi(
        createHttp({
          baseUrl: apiBaseUrl,
          getToken: session.get,
          onUnauthorized: logout,
        }),
      ),
    [apiBaseUrl, logout, session],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      session.set(res.accessToken);
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin));
      setToken(res.accessToken);
      setAdmin(res.admin);
    },
    [api, session],
  );

  const value = useMemo<AuthValue>(
    () => ({ api, admin, signedIn: token !== null, login, logout }),
    [api, admin, token, login, logout],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
