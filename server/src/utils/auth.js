import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const cookieName = "livechat_token";

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "14d" });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function setAuthCookie(res, token) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 14,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });
}
