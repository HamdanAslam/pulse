import { searchGifs } from "../utils/embeds.js";

export async function listGifs(req, res) {
  const gifs = await searchGifs(req.query.query || "");
  return res.json({ items: gifs });
}
