/** API base for the browser. Kept in one place so no component hardcodes a host. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api";

/** Staff roles that may sign in to the console. Owners are not staff. */
export const STAFF_ROLES = ["SOCIETY_OPERATOR", "SUPPORT_AGENT", "ADMIN", "SUPER_ADMIN"] as const;

export const isStaffRole = (role: string): boolean =>
  (STAFF_ROLES as readonly string[]).includes(role);

export interface SessionUser {
  publicId: string;
  role: string;
  status: string;
  name: string | null;
  phone: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
  user: SessionUser;
  permissions: string[];
}

/** Errors are always `{ error: { code, message } }` from the API. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    // Staff sessions are token-in-memory, so nothing should be cached.
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } }).error;
    throw new ApiError(
      error?.code ?? "UNKNOWN",
      error?.message ?? `Request failed with ${response.status}`,
      response.status,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<{ data: T }>(path, { method: "GET", token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<{ data: T }>(path, { method: "POST", body: JSON.stringify(body ?? {}), token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<{ data: T }>(path, { method: "PATCH", body: JSON.stringify(body ?? {}), token }),
  delete: <T>(path: string, token?: string | null) =>
    request<{ data: T }>(path, { method: "DELETE", token }),

  /** Create an authenticated API client with a bearer token. */
  withAuth: (token: string | null | undefined) => ({
    get: <T>(path: string) => request<{ data: T }>(path, { method: "GET", token }),
    post: <T>(path: string, body?: unknown) =>
      request<{ data: T }>(path, { method: "POST", body: JSON.stringify(body ?? {}), token }),
    patch: <T>(path: string, body?: unknown) =>
      request<{ data: T }>(path, { method: "PATCH", body: JSON.stringify(body ?? {}), token }),
    delete: <T>(path: string) =>
      request<{ data: T }>(path, { method: "DELETE", token }),
  }),
};

export const unwrap = <T>(result: { data: T }): T => result.data;
