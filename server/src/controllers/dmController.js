import mongoose from "mongoose";
import { DMThread } from "../models/DMThread.js";
import { Message } from "../models/Message.js";
import { serializeMessage } from "../utils/serialize.js";
import { emitNotification, emitToUsers } from "../socket.js";
import { resolveEmbeds } from "../utils/embeds.js";

function sortedParticipantIds(participants) {
  return [...new Set(participants.map(String))].sort();
}

export async function listDMs(req, res) {
  const dms = await DMThread.find({
    participantIds: { $in: [new mongoose.Types.ObjectId(req.user._id)] },
  })
    .sort({ lastMessageAt: -1 })
    .lean();
  return res.json(
    dms.map((dm) => ({
      id: String(dm._id),
      participantIds: dm.participantIds.map(String),
      isGroup: dm.isGroup,
      name: dm.name || undefined,
      lastMessageAt: new Date(dm.lastMessageAt).getTime(),
    })),
  );
}

export async function createDM(req, res) {
  const bodyIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const participants = sortedParticipantIds([req.user._id, ...bodyIds]).map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  if (participants.length < 2) return res.status(400).json({ error: "At least 2 participants required" });

  const isGroup = participants.length > 2;
  let dm = null;
  if (!isGroup) {
    dm = await DMThread.findOne({
      isGroup: false,
      participantIds: { $all: participants, $size: 2 },
    });
  }
  if (!dm) {
    dm = await DMThread.create({
      participantIds: participants,
      isGroup,
      name: isGroup ? req.body.name || "New Group" : "",
      ownerId: req.user._id,
    });
  }
  const response = {
    id: String(dm._id),
    participantIds: dm.participantIds.map(String),
    isGroup: dm.isGroup,
    name: dm.name || undefined,
    lastMessageAt: new Date(dm.lastMessageAt).getTime(),
  };
  emitToUsers(response.participantIds, "dms:update", {
    reason: "created",
    dmId: response.id,
  });
  return res.status(201).json(response);
}

export async function listDMMessages(req, res) {
  const dm = await DMThread.findById(req.params.dmId);
  if (!dm) return res.status(404).json({ error: "DM not found" });
  if (!dm.participantIds.find((id) => String(id) === String(req.user._id))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const messages = await Message.find({ dmThreadId: dm._id, contextType: "dm", deletedAt: null })
    .sort({ createdAt: 1 })
    .lean();
  return res.json(messages.map(serializeMessage));
}

export async function createDMMessage(req, res) {
  const dm = await DMThread.findById(req.params.dmId);
  if (!dm) return res.status(404).json({ error: "DM not found" });
  if (!dm.participantIds.find((id) => String(id) === String(req.user._id))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const message = await Message.create({
    contextType: "dm",
    dmThreadId: dm._id,
    authorId: req.user._id,
    content: (req.body.content || "").trim(),
    replyTo: req.body.replyTo || null,
    attachments: req.body.attachments || [],
    embeds: await resolveEmbeds(req.body.content || ""),
  });
  dm.lastMessageAt = new Date();
  await dm.save();
  const payload = serializeMessage(message);
  emitToUsers(dm.participantIds.map(String), "message:new", payload);
  emitToUsers(dm.participantIds.map(String), "dms:update", {
    reason: "message",
    dmId: String(dm._id),
  });
  emitNotification(
    dm.participantIds.map(String).filter((id) => id !== String(req.user._id)),
    {
      type: "dm_message",
      title: dm.isGroup ? (dm.name || "New group message") : "New direct message",
      description: req.user.displayName,
      dmId: String(dm._id),
      authorId: String(req.user._id),
    },
  );
  return res.status(201).json(payload);
}
