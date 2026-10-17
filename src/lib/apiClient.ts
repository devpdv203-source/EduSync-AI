/**
 * src/lib/apiClient.ts
 *
 * Small reusable helper so AppContext.tsx doesn't duplicate "get a fresh ID token, attach
 * it as a Bearer header, fetch, parse JSON" in every migrated function. This is the ONLY
 * place in the frontend that talks to the Express API — nothing here reads/writes Firestore
 * directly, matching the required architecture:
 *
 *   React UI → AppContext → Firebase Auth (token only) → Express API → Admin SDK → Firestore
 *
 * Every call attaches the current Firebase user's ID token. If there's no signed-in user,
 * requests are sent without a token and the backend correctly responds 401 — there is no
 * client-side fallback identity of any kind.
 */

import { firebaseAuth } from "../firebase";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Core request helper. Throws ApiError on any non-2xx response (including the API's own
 * `{ success: false, error }` shape) so callers can use a single try/catch.
 */
async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(path, { ...options, headers });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. a proxy error page) — body stays null, status still checked below.
  }

  if (!res.ok || body?.success === false) {
    const message = body?.error || `Request failed with status ${res.status}.`;
    throw new ApiError(res.status, message, body);
  }

  return body as T;
}

export const apiGet = <T = any>(path: string): Promise<T> => request<T>(path, { method: "GET" });

export const apiPost = <T = any>(path: string, data?: unknown): Promise<T> =>
  request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined });

export const apiPatch = <T = any>(path: string, data?: unknown): Promise<T> =>
  request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });

export const apiDelete = <T = any>(path: string): Promise<T> => request<T>(path, { method: "DELETE" });
