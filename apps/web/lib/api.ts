"use client";

import { useAuthStore } from "../stores/auth";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
const MAP_URL = process.env.NEXT_PUBLIC_MAP_URL || "http://localhost:4004";

type Service = "gateway" | "map";

let refreshRequest: Promise<string | null> | null = null;

function getBaseUrl(service: Service) {
  return service === "map" ? MAP_URL : GATEWAY_URL;
}

function shouldSkipRefresh(path: string) {
  return path.startsWith("/auth/login") || path.startsWith("/auth/signup") || path.startsWith("/auth/refresh");
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshRequest) return refreshRequest;

  refreshRequest = (async () => {
    const { refreshToken, user, setAuth, clear } = useAuthStore.getState();
    if (!refreshToken) {
      clear();
      return null;
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        clear();
        return null;
      }

      const accessToken = data.token || data.accessToken;
      if (!accessToken) {
        clear();
        return null;
      }

      setAuth(accessToken, data.user || user, data.refreshToken || refreshToken);
      return accessToken;
    } catch {
      clear();
      return null;
    }
  })();

  try {
    return await refreshRequest;
  } finally {
    refreshRequest = null;
  }
}

export async function api(
  path: string,
  options: RequestInit & { service?: Service } = {},
  retryOn401 = true
) {
  const { service = "gateway", ...fetchOptions } = options;
  const base = getBaseUrl(service);
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    ...fetchOptions,
    headers
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && retryOn401 && !shouldSkipRefresh(path)) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return api(path, options, false);
    }

    useAuthStore.getState().clear();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

// Auth
export async function login(email: string, password: string) {
  return api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function signup(email: string, password: string, name: string) {
  return api("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name })
  });
}

export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" }, false);
  } finally {
    useAuthStore.getState().clear();
  }
}

export async function getMe() {
  return api("/users/me");
}

// Orgs
export async function getOrgs() {
  return api("/orgs");
}

export async function createOrg(name: string, slug: string) {
  return api("/orgs", {
    method: "POST",
    body: JSON.stringify({ name, slug })
  });
}

export async function joinOrg(slug: string) {
  return api("/orgs/join", {
    method: "POST",
    body: JSON.stringify({ slug })
  });
}

export async function getOrgMembers(orgId: string) {
  return api(`/orgs/${orgId}/members`);
}

// Maps
export async function getMaps(organizationId: string) {
  return api(`/maps?organizationId=${organizationId}`, { service: "map" });
}

export async function getMap(mapId: string) {
  return api(`/maps/${mapId}`, { service: "map" });
}

export async function getMapMessages(mapId: string, cursor?: string, limit = 50) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  return api(`/maps/${mapId}/messages?${params.toString()}`, { service: "map" });
}

export async function createMap(data: {
  organizationId: string;
  name: string;
  width: number;
  height: number;
  tiles: any[][];
  spawnPoint: { x: number; y: number };
  rooms?: any[];
}) {
  return api("/maps", {
    service: "map",
    method: "POST",
    body: JSON.stringify(data)
  });
}
