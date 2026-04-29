import { User } from "../models/User.js";
import { serializeUser } from "../utils/serialize.js";

export async function searchUsers(req, res) {
  const query = (req.query.q || "").trim();
  if (!query) return res.json([]);
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { username: { $regex: query, $options: "i" } },
      { displayName: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ],
  })
    .limit(20)
    .lean();
  return res.json(users.map(serializeUser));
}

export async function usersByIds(req, res) {
  const ids = String(req.query.ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!ids.length) return res.json([]);
  const users = await User.find({ _id: { $in: ids } }).lean();
  return res.json(users.map(serializeUser));
}
