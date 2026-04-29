import { http } from "./http";
import { mockStore } from "./_mockStore";

export async function usersByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return [];
  const users = await http.get(`/users/by-ids?ids=${encodeURIComponent(uniqueIds.join(","))}`);
  mockStore.upsertUsers(users);
  return users;
}

export async function searchUsers(query) {
  if (!query?.trim()) return [];
  const users = await http.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
  mockStore.upsertUsers(users);
  return users;
}
