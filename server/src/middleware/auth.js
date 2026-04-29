import { User } from "../models/User.js";
import { cookieName, verifyToken } from "../utils/auth.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[cookieName] || req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
