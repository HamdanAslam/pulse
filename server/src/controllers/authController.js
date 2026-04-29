import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { emitToUser } from "../socket.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/auth.js";
import { serializeUser } from "../utils/serialize.js";

export async function signup(req, res) {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: "email, username and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  const exists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (exists) return res.status(409).json({ error: "Email or username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    displayName: username,
    passwordHash,
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
    status: "online",
  });

  const token = signToken({ userId: String(user._id) });
  setAuthCookie(res, token);
  return res.json(serializeUser(user));
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  user.status = "online";
  await user.save();
  const token = signToken({ userId: String(user._id) });
  setAuthCookie(res, token);
  return res.json(serializeUser(user));
}

export async function logout(req, res) {
  if (req.user) {
    req.user.status = "offline";
    await req.user.save();
  }
  clearAuthCookie(res);
  return res.status(204).send();
}

export async function me(req, res) {
  return res.json(serializeUser(req.user));
}

export async function updateMe(req, res) {
  const { displayName, username, bio, avatar, avatarPublicId, banner, bannerPublicId, status } = req.body;
  if (username && username !== req.user.username) {
    const exists = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: req.user._id },
    });
    if (exists) return res.status(409).json({ error: "Username already taken" });
    req.user.username = username.toLowerCase();
  }
  if (displayName !== undefined) req.user.displayName = displayName;
  if (bio !== undefined) req.user.bio = bio;
  if (avatar !== undefined) req.user.avatar = avatar;
  if (avatarPublicId !== undefined) req.user.avatarPublicId = avatarPublicId;
  if (banner !== undefined) req.user.banner = banner;
  if (bannerPublicId !== undefined) req.user.bannerPublicId = bannerPublicId;
  if (status && ["online", "idle", "dnd", "offline"].includes(status)) req.user.status = status;
  await req.user.save();
  const payload = serializeUser(req.user);
  emitToUser(String(req.user._id), "user:update", payload);
  return res.json(payload);
}
