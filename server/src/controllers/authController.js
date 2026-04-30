import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { emitToUser, syncUserPresence } from "../socket.js";
import { env } from "../config/env.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/auth.js";
import { serializeUser } from "../utils/serialize.js";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_OAUTH_SCOPES = ["identify", "email"];
const DISCORD_STATE_TTL_MS = 1000 * 60 * 10;
const stateNonceStore = new Map();

function cleanupNonceStore(store) {
  const now = Date.now();
  for (const [nonce, expiresAt] of store.entries()) {
    if (expiresAt <= now) {
      store.delete(nonce);
    }
  }
}

function registerNonce(store, ttlMs) {
  cleanupNonceStore(store);
  const nonce = crypto.randomBytes(18).toString("hex");
  store.set(nonce, Date.now() + ttlMs);
  return nonce;
}

function consumeNonce(store, nonce) {
  cleanupNonceStore(store);
  const expiresAt = store.get(nonce);
  if (!expiresAt || expiresAt <= Date.now()) {
    store.delete(nonce);
    return false;
  }
  store.delete(nonce);
  return true;
}

function signEphemeralToken(payload, expiresIn) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

function verifyEphemeralToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function requireDiscordConfig() {
  const { clientId, clientSecret, redirectUri } = env.discord;
  return Boolean(clientId && clientSecret && redirectUri);
}

function discordAvatarUrl(profile) {
  if (!profile?.avatar || !profile?.id) return "";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`;
}

function defaultAvatarForSeed(seed) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed || "Pulse")}`;
}

function sanitizeUsername(value) {
  const normalized = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "");
  return normalized.slice(0, 32);
}

function deriveDiscordIdentity(profile) {
  const displayName = String(profile.global_name || profile.username || "Pulse").trim() || "Pulse";
  const username = sanitizeUsername(profile.username || displayName);
  const avatar = discordAvatarUrl(profile);
  return {
    discordId: String(profile.id),
    discordUsername: String(profile.username || ""),
    discordAvatar: avatar,
    email: String(profile.email || "").trim().toLowerCase(),
    displayName,
    username,
  };
}

function buildClientRedirect(path, params = {}) {
  const url = new URL(path, env.clientUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function redirectWithError(res, returnPath, message) {
  return res.redirect(buildClientRedirect(returnPath || "/login", { discordError: message }));
}

async function markUserOnline(user) {
  user.status = user.preferredStatus === "offline" ? "offline" : user.preferredStatus || "online";
  await user.save();
  return user;
}

function completeAuth(res, user) {
  const token = signToken({ userId: String(user._id) });
  setAuthCookie(res, token);
  return res.redirect(buildClientRedirect("/"));
}

async function exchangeDiscordCode(code) {
  const payload = new URLSearchParams({
    client_id: env.discord.clientId,
    client_secret: env.discord.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.discord.redirectUri,
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error("Discord token exchange failed");
  }

  return response.json();
}

async function fetchDiscordProfile(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Discord profile fetch failed");
  }

  return response.json();
}

async function createDiscordUser(identity, username) {
  return User.create({
    email: identity.email,
    username,
    displayName: identity.displayName,
    passwordHash: null,
    discordId: identity.discordId,
    discordUsername: identity.discordUsername,
    discordAvatar: identity.discordAvatar,
    avatar: identity.discordAvatar || defaultAvatarForSeed(identity.displayName || username),
    preferredStatus: "online",
    status: "online",
  });
}

function issueDiscordSignupToken(identity, returnPath) {
  return signEphemeralToken(
    {
      type: "discord-signup",
      returnPath,
      identity,
    },
    "10m",
  );
}

function validateDiscordSignupToken(token) {
  const payload = verifyEphemeralToken(token);
  if (payload?.type !== "discord-signup" || !payload?.identity) {
    throw new Error("Invalid signup token");
  }
  return payload;
}

function normalizeReturnPath(rawPath) {
  if (rawPath === "/signup") return "/signup";
  return "/login";
}

export async function signup(req, res) {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: "email, username and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  const exists = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });
  if (exists) return res.status(409).json({ error: "Email or username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    username: normalizedUsername,
    displayName: username,
    passwordHash,
    avatar: defaultAvatarForSeed(username),
    preferredStatus: "online",
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
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  await markUserOnline(user);
  const token = signToken({ userId: String(user._id) });
  setAuthCookie(res, token);
  return res.json(serializeUser(user));
}

export async function startDiscordAuth(req, res) {
  if (!requireDiscordConfig()) {
    return res.status(503).json({ error: "Discord login is not configured" });
  }

  const returnPath = normalizeReturnPath(req.query.returnTo);
  const nonce = registerNonce(stateNonceStore, DISCORD_STATE_TTL_MS);
  const state = signEphemeralToken(
    {
      type: "discord-state",
      nonce,
      returnPath,
    },
    "10m",
  );

  const url = new URL(`${DISCORD_API_BASE}/oauth2/authorize`);
  url.searchParams.set("client_id", env.discord.clientId);
  url.searchParams.set("redirect_uri", env.discord.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DISCORD_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);

  return res.redirect(url.toString());
}

export async function discordCallback(req, res) {
  const code = String(req.query.code || "");
  const stateToken = String(req.query.state || "");

  if (!code || !stateToken) {
    return redirectWithError(res, "/login", "Discord login was cancelled or incomplete.");
  }

  let state;
  try {
    state = verifyEphemeralToken(stateToken);
    if (state?.type !== "discord-state" || !state?.nonce || !consumeNonce(stateNonceStore, state.nonce)) {
      throw new Error("Invalid state");
    }
  } catch {
    return redirectWithError(res, "/login", "Discord login state is invalid or expired.");
  }

  try {
    const tokenPayload = await exchangeDiscordCode(code);
    const profile = await fetchDiscordProfile(tokenPayload.access_token);
    const identity = deriveDiscordIdentity(profile);

    if (!identity.email) {
      return redirectWithError(res, state.returnPath, "Discord did not provide an email address.");
    }

    const linkedUser = await User.findOne({ discordId: identity.discordId });
    if (linkedUser) {
      linkedUser.discordUsername = identity.discordUsername;
      linkedUser.discordAvatar = identity.discordAvatar;
      if (!linkedUser.avatar && identity.discordAvatar) {
        linkedUser.avatar = identity.discordAvatar;
      }
      await markUserOnline(linkedUser);
      return completeAuth(res, linkedUser);
    }

    const emailUser = await User.findOne({ email: identity.email });
    if (emailUser) {
      emailUser.discordId = identity.discordId;
      emailUser.discordUsername = identity.discordUsername;
      emailUser.discordAvatar = identity.discordAvatar;
      await markUserOnline(emailUser);
      return completeAuth(res, emailUser);
    }

    if (!identity.username) {
      const signupToken = issueDiscordSignupToken(identity, state.returnPath);
      return res.redirect(buildClientRedirect("/auth/discord/complete", { token: signupToken }));
    }

    const usernameExists = await User.exists({ username: identity.username });
    if (usernameExists) {
      const signupToken = issueDiscordSignupToken(identity, state.returnPath);
      return res.redirect(buildClientRedirect("/auth/discord/complete", { token: signupToken }));
    }

    const newUser = await createDiscordUser(identity, identity.username);
    return completeAuth(res, newUser);
  } catch (error) {
    console.error(error);
    return redirectWithError(res, state.returnPath, "Discord login failed. Please try again.");
  }
}

export async function completeDiscordSignup(req, res) {
  const token = String(req.body?.token || "");
  const requestedUsername = sanitizeUsername(req.body?.username || "");

  if (!token || !requestedUsername) {
    return res.status(400).json({ error: "token and username are required" });
  }

  if (requestedUsername.length < 2) {
    return res.status(400).json({ error: "username must be at least 2 characters" });
  }

  let payload;
  try {
    payload = validateDiscordSignupToken(token);
  } catch {
    return res.status(400).json({ error: "Discord signup token is invalid or expired" });
  }

  const { identity } = payload;

  const existingDiscordUser = await User.findOne({ discordId: identity.discordId });
  if (existingDiscordUser) {
    await markUserOnline(existingDiscordUser);
    const authToken = signToken({ userId: String(existingDiscordUser._id) });
    setAuthCookie(res, authToken);
    return res.json(serializeUser(existingDiscordUser));
  }

  const conflict = await User.findOne({
    $or: [{ username: requestedUsername }, { email: identity.email }, { discordId: identity.discordId }],
  });

  if (conflict) {
    if (conflict.email === identity.email && !conflict.discordId) {
      conflict.discordId = identity.discordId;
      conflict.discordUsername = identity.discordUsername;
      conflict.discordAvatar = identity.discordAvatar;
      await markUserOnline(conflict);
      const authToken = signToken({ userId: String(conflict._id) });
      setAuthCookie(res, authToken);
      return res.json(serializeUser(conflict));
    }

    return res.status(409).json({ error: "Username already taken" });
  }

  try {
    const user = await createDiscordUser(identity, requestedUsername);
    const authToken = signToken({ userId: String(user._id) });
    setAuthCookie(res, authToken);
    return res.json(serializeUser(user));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    throw error;
  }
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
    const nextUsername = username.toLowerCase();
    const exists = await User.findOne({
      username: nextUsername,
      _id: { $ne: req.user._id },
    });
    if (exists) return res.status(409).json({ error: "Username already taken" });
    req.user.username = nextUsername;
  }
  if (displayName !== undefined) req.user.displayName = displayName;
  if (bio !== undefined) req.user.bio = bio;
  if (avatar !== undefined) req.user.avatar = avatar;
  if (avatarPublicId !== undefined) req.user.avatarPublicId = avatarPublicId;
  if (banner !== undefined) req.user.banner = banner;
  if (bannerPublicId !== undefined) req.user.bannerPublicId = bannerPublicId;
  if (status && ["online", "idle", "dnd", "offline"].includes(status)) {
    req.user.preferredStatus = status;
    req.user.status = status;
  }
  await req.user.save();
  await syncUserPresence(String(req.user._id));
  const payload = serializeUser(req.user);
  emitToUser(String(req.user._id), "user:update", payload);
  return res.json(payload);
}
