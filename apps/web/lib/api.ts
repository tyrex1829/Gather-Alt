"use client";

import { useAuthStore } from "../stores/auth";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
const MAP_URL = process.env.NEXT_PUBLIC_MAP_URL || "http://localhost:4004";

type Service = "gateway" | "map";

function getBaseUrl(service: Service) {
  return service === "map" ? MAP_URL : GATEWAY_URL;
}

export async function api(
  path: string,
  options: RequestInit & { service?: Service } = {}
) {
  const { service = "gateway", ...fetchOptions } = options;
  const base = getBaseUrl(service);
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string> || {})
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    ...fetchOptions,
    headers
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
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
