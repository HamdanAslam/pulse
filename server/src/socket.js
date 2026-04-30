import { Server as SocketServer } from "socket.io";
import { cookieName, verifyToken } from "./utils/auth.js";
import { User } from "./models/User.js";

let ioInstance = null;
const userSockets = new Map();

async function broadcastPresence(userId) {
  if (!ioInstance) return;
  const user = await User.findById(userId).lean();
  if (!user) return;
  ioInstance.emit("presence:update", { userId: String(userId), status: user.status || "offline" });
}

function parseCookie(rawCookie = "") {
  return rawCookie
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [key, ...rest] = item.split("=");
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

function addSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function removeSocket(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return 0;
  set.delete(socketId);
  if (!set.size) userSockets.delete(userId);
  return set.size;
}

export function initSocket(httpServer, corsOrigin) {
  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie || "");
      const token = cookies[cookieName] || socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId } = socket.data;
    if (!userId) return;
    addSocket(userId, socket.id);
    socket.join(`user:${userId}`);
    const user = await User.findById(userId);
    if (user) {
      user.status = user.preferredStatus === "offline" ? "offline" : user.preferredStatus || "online";
      await user.save();
      await broadcastPresence(userId);
    }

    socket.on("channel:join", ({ channelId }) => {
      if (!channelId) return;
      socket.join(`channel:${channelId}`);
    });

    socket.on("channel:leave", ({ channelId }) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
    });

    socket.on("typing", ({ channelId }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit("typing", {
        channelId,
        userId,
        until: Date.now() + 2500,
      });
    });

    socket.on("disconnect", async () => {
      const remaining = removeSocket(userId, socket.id);
      if (!remaining) {
        await User.findByIdAndUpdate(userId, { status: "offline" });
        await broadcastPresence(userId);
      }
    });
  });

  return io;
}

export function emitToChannel(channelId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`channel:${channelId}`).emit(event, payload);
}

export function emitToUsers(userIds, event, payload) {
  if (!ioInstance) return;
  userIds.forEach((userId) => ioInstance.to(`user:${userId}`).emit(event, payload));
}

export function emitToUser(userId, event, payload) {
  emitToUsers([userId], event, payload);
}

export function emitNotification(userIds, payload) {
  emitToUsers(userIds, "notify", payload);
}

export async function syncUserPresence(userId) {
  const socketCount = userSockets.get(String(userId))?.size || 0;
  const user = await User.findById(userId);
  if (!user) return;
  user.status = socketCount ? user.preferredStatus || "online" : "offline";
  await user.save();
  await broadcastPresence(userId);
}
