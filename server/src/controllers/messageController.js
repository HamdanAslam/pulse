import mongoose from "mongoose";
import { Channel } from "../models/Channel.js";
import { DMThread } from "../models/DMThread.js";
import { Message } from "../models/Message.js";
import { Membership } from "../models/Membership.js";
import { emitToChannel, emitToUsers } from "../socket.js";
import { PERMISSIONS, hasPermission, resolveMemberPermissions } from "../utils/permissions.js";
import { serializeMessage } from "../utils/serialize.js";

async function canReadChannel(channel, userId) {
  const member = await Membership.findOne({ serverId: channel.serverId, userId });
  if (!member) return false;
  const flags = await resolveMemberPermissions(channel.serverId, userId);
  return hasPermission(flags, PERMISSIONS.VIEW_CHANNEL);
}

export async function listChannelMessages(req, res) {
  const channel = await Channel.findById(req.params.channelId);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  const allowed = await canReadChannel(channel, req.user._id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const messages = await Message.find({
    channelId: channel._id,
    contextType: "server",
    deletedAt: null,
  })
    .sort({ createdAt: 1 })
    .lean();
  return res.json(messages.map(serializeMessage));
}

export async function createChannelMessage(req, res) {
  const channel = await Channel.findById(req.params.channelId);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  const flags = await resolveMemberPermissions(channel.serverId, req.user._id);
  if (!hasPermission(flags, PERMISSIONS.SEND_MESSAGES)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const message = await Message.create({
    contextType: "server",
    channelId: channel._id,
    authorId: req.user._id,
    content: (req.body.content || "").trim(),
    replyTo: req.body.replyTo || null,
    attachments: req.body.attachments || [],
  });
  const payload = serializeMessage(message);
  emitToChannel(String(channel._id), "message:new", payload);
  return res.status(201).json(payload);
}

export async function editMessage(req, res) {
  const message = await Message.findById(req.params.messageId);
  if (!message || message.deletedAt) return res.status(404).json({ error: "Message not found" });
  const own = String(message.authorId) === String(req.user._id);
  if (!own) {
    if (message.contextType !== "server") return res.status(403).json({ error: "Forbidden" });
    const channel = await Channel.findById(message.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const flags = await resolveMemberPermissions(channel.serverId, req.user._id);
    if (!hasPermission(flags, PERMISSIONS.MANAGE_MESSAGES)) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }
  message.content = (req.body.content || "").trim();
  message.editedAt = new Date();
  await message.save();
  const payload = { id: String(message._id), content: message.content, edited: true };
  if (message.contextType === "server") emitToChannel(String(message.channelId), "message:edit", payload);
  if (message.contextType === "dm") {
    const thread = await DMThread.findById(message.dmThreadId).lean();
    if (thread) emitToUsers(thread.participantIds.map(String), "message:edit", payload);
  }
  return res.json(payload);
}

export async function deleteMessage(req, res) {
  const message = await Message.findById(req.params.messageId);
  if (!message || message.deletedAt) return res.status(404).json({ error: "Message not found" });
  const own = String(message.authorId) === String(req.user._id);
  if (!own) {
    if (message.contextType !== "server") return res.status(403).json({ error: "Forbidden" });
    const channel = await Channel.findById(message.channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const flags = await resolveMemberPermissions(channel.serverId, req.user._id);
    if (!hasPermission(flags, PERMISSIONS.DELETE_MESSAGES)) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }
  message.deletedAt = new Date();
  await message.save();
  if (message.contextType === "server") {
    emitToChannel(String(message.channelId), "message:delete", { id: String(message._id) });
  }
  if (message.contextType === "dm") {
    const thread = await DMThread.findById(message.dmThreadId).lean();
    if (thread) emitToUsers(thread.participantIds.map(String), "message:delete", { id: String(message._id) });
  }
  return res.status(204).send();
}

export async function toggleReaction(req, res) {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: "emoji is required" });
  const message = await Message.findById(req.params.messageId);
  if (!message || message.deletedAt) return res.status(404).json({ error: "Message not found" });

  const userId = String(req.user._id);
  const reactions = [...(message.reactions || [])];
  const idx = reactions.findIndex((reaction) => reaction.emoji === emoji);
  if (idx === -1) {
    reactions.push({ emoji, userIds: [new mongoose.Types.ObjectId(userId)] });
  } else {
    const set = new Set(reactions[idx].userIds.map(String));
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    if (!set.size) reactions.splice(idx, 1);
    else reactions[idx].userIds = [...set].map((id) => new mongoose.Types.ObjectId(id));
  }
  message.reactions = reactions;
  await message.save();
  const payload = { id: String(message._id), reactions: serializeMessage(message).reactions };
  if (message.contextType === "server") emitToChannel(String(message.channelId), "message:reaction", payload);
  if (message.contextType === "dm") {
    const thread = await DMThread.findById(message.dmThreadId).lean();
    if (thread) emitToUsers(thread.participantIds.map(String), "message:reaction", payload);
  }
  return res.json(payload);
}
