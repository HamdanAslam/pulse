import { searchGifs } from "../utils/embeds.js";
import { env } from "../config/env.js";

export async function listGifs(req, res) {
  if (!env.giphy.apiKey) {
    return res.status(503).json({ error: "GIF search is not configured. Missing GIPHY_API_KEY on the server." });
  }
  const gifs = await searchGifs(req.query.query || "");
  return res.json({ items: gifs });
}
