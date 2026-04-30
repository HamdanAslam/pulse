import { http } from "./http";
import { mockStore } from "./_mockStore";

const env = import.meta.env || {};
const rawApiBase = env.VITE_API_URL || "/api";
const API_BASE = rawApiBase.endsWith("/") ? rawApiBase.slice(0, -1) : rawApiBase;

export async function getCurrentUser() {
  try {
    const user = await http.get("/auth/me");
    mockStore.selfId = user.id;
    mockStore.upsertUsers([user]);
    return user;
  } catch {
    return null;
  }
}

export async function login(email, password) {
  const user = await http.post("/auth/login", { email, password });
  mockStore.selfId = user.id;
  mockStore.upsertUsers([user]);
  return user;
}

export async function signup(email, username, password) {
  const user = await http.post("/auth/signup", { email, username, password });
  mockStore.selfId = user.id;
  mockStore.upsertUsers([user]);
  return user;
}

export function getDiscordAuthUrl(returnTo = "/login") {
  const params = new URLSearchParams({ returnTo });
  return `${API_BASE}/auth/discord?${params.toString()}`;
}

export async function completeDiscordSignup(token, username) {
  const user = await http.post("/auth/discord/complete", { token, username });
  mockStore.selfId = user.id;
  mockStore.upsertUsers([user]);
  return user;
}

export async function logout() {
  try {
    await http.post("/auth/logout");
  } finally {
    mockStore.reset();
  }
}

export async function resetPassword() {
  return undefined;
}

export async function updateProfile(patch) {
  const user = await http.patch("/auth/me", patch);
  mockStore.upsertUsers([user]);
  return user;
}
