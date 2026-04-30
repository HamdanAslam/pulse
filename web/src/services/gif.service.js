import { http } from "./http";

export async function searchGifs(query = "") {
  const params = new URLSearchParams();
  if (query.trim()) params.set("query", query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const payload = await http.get(`/gifs${suffix}`);
  return payload.items || [];
}
