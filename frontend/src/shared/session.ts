// Client-side session + API client factory. Auth uses our public /auth endpoints (JWT in localStorage).
import { ApiClient } from "./apiClient";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://51419m3ko9.execute-api.us-east-1.amazonaws.com/prod"
).replace(/\/$/, "");

const TOKEN_KEY = "pc_idToken";
const ROLE_KEY = "pc_role";
const UID_KEY = "pc_userId";
const VIEW_AS_KEY = "pc_viewAs";

export function setSession(idToken: string, role: string, userId: string) {
  localStorage.setItem(TOKEN_KEY, idToken);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(UID_KEY, userId);
}

export function clearSession() {
  [TOKEN_KEY, ROLE_KEY, UID_KEY, VIEW_AS_KEY].forEach((k) => localStorage.removeItem(k));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  // Check expiry from JWT payload (exp is in seconds)
  try {
    const part = token.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const { exp } = JSON.parse(decodeURIComponent(escape(atob(b64 + pad))));
    if (exp && Date.now() / 1000 > exp) {
      clearSession(); // wipe expired token
      return null;
    }
  } catch { }
  return token;
}
export function getRole(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ROLE_KEY);
}
export function getUserId(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(UID_KEY);
}

export function getViewAs(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(VIEW_AS_KEY);
}

export function setViewAs(role: "INSTRUCTOR" | "STUDENT") {
  localStorage.setItem(VIEW_AS_KEY, role);
}

export function api(): ApiClient {
  return new ApiClient({ baseUrl: API_BASE, getToken });
}

// Direct fetch helpers for auth (no token yet)
export async function register(body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Registration failed");
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Login failed");
  return res.json();
}
