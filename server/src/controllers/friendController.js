import mongoose from "mongoose";
import { Friendship } from "../models/Friendship.js";
import { User } from "../models/User.js";
import { emitNotification, emitToUsers } from "../socket.js";
import { DMThread } from "../models/DMThread.js";

function makePair(userA, userB) {
  const sorted = [String(userA), String(userB)].sort();
  return { users: sorted, pairKey: sorted.join(":") };
}

function toFriendStatus(friendship, selfId) {
  if (friendship.status === "accepted") return "friend";
  if (friendship.status === "blocked") return "blocked";
  return String(friendship.requestedBy) === String(selfId) ? "pending_out" : "pending_in";
}

async function ensureDirectDM(userA, userB) {
  const participants = [new mongoose.Types.ObjectId(userA), new mongoose.Types.ObjectId(userB)];
  let dm = await DMThread.findOne({
    isGroup: false,
    participantIds: { $all: participants, $size: 2 },
  });
  if (!dm) {
    dm = await DMThread.create({
      participantIds: participants,
      isGroup: false,
      name: "",
      ownerId: userA,
    });
  }
  const participantIds = dm.participantIds.map(String);
  emitToUsers(participantIds, "dms:update", {
    reason: "created",
    dmId: String(dm._id),
  });
  return dm;
}

export async function listFriends(req, res) {
  const entries = await Friendship.find({
    users: { $in: [new mongoose.Types.ObjectId(req.user._id)] },
  }).lean();

  const mapped = entries.map((entry) => {
    const otherId = entry.users.find((id) => String(id) !== String(req.user._id));
    return {
      userId: String(otherId),
      status: toFriendStatus(entry, req.user._id),
    };
  });
  return res.json(mapped);
}

export async function sendFriendRequest(req, res) {
  const username = (req.body.username || "").trim().toLowerCase();
  if (!username) return res.status(400).json({ error: "username is required" });
  const target = await User.findOne({ username });
  if (!target || String(target._id) === String(req.user._id)) {
    return res.status(404).json({ error: "User not found" });
  }
  const { pairKey, users } = makePair(req.user._id, target._id);
  const existing = await Friendship.findOne({ pairKey });
  if (existing) {
    if (existing.status === "pending" && String(existing.requestedBy) === String(target._id)) {
      existing.status = "accepted";
      await existing.save();
      await ensureDirectDM(req.user._id, target._id);
      emitToUsers([String(req.user._id), String(target._id)], "friends:update", {
        reason: "accepted",
        users: [String(req.user._id), String(target._id)],
      });
      emitNotification([String(target._id)], {
        type: "friend_accept",
        title: "Friend request accepted",
        description: `${req.user.displayName} accepted your friend request.`,
        userId: String(req.user._id),
      });
      return res.status(200).json({
        userId: String(target._id),
        status: "friend",
      });
    }
    if (existing.status === "accepted") {
      return res.status(200).json({
        userId: String(target._id),
        status: "friend",
      });
    }
    return res.status(409).json({ error: "Friendship already exists" });
  }
  const friendship = await Friendship.create({
    pairKey,
    users,
    requestedBy: req.user._id,
    status: "pending",
  });
  emitToUsers([String(req.user._id), String(target._id)], "friends:update", {
    reason: "request",
    users: [String(req.user._id), String(target._id)],
  });
  emitNotification([String(target._id)], {
    type: "friend_request",
    title: "New friend request",
    description: `${req.user.displayName} sent you a friend request.`,
    userId: String(req.user._id),
  });
  return res.status(201).json({
    userId: String(target._id),
    status: toFriendStatus(friendship, req.user._id),
  });
}

export async function acceptFriend(req, res) {
  const { userId } = req.params;
  const { pairKey } = makePair(req.user._id, userId);
  const friendship = await Friendship.findOne({ pairKey });
  if (!friendship) return res.status(404).json({ error: "Friend request not found" });
  if (String(friendship.requestedBy) === String(req.user._id)) {
    return res.status(400).json({ error: "Cannot accept your own outgoing request" });
  }
  friendship.status = "accepted";
  await friendship.save();
  await ensureDirectDM(req.user._id, userId);
  emitToUsers([String(req.user._id), String(userId)], "friends:update", {
    reason: "accepted",
    users: [String(req.user._id), String(userId)],
  });
  emitNotification([String(userId)], {
    type: "friend_accept",
    title: "Friend request accepted",
    description: `${req.user.displayName} accepted your friend request.`,
    userId: String(req.user._id),
  });
  return res.status(204).send();
}

export async function declineFriend(req, res) {
  const { userId } = req.params;
  const { pairKey } = makePair(req.user._id, userId);
  await Friendship.deleteOne({ pairKey });
  emitToUsers([String(req.user._id), String(userId)], "friends:update", {
    reason: "declined",
    users: [String(req.user._id), String(userId)],
  });
  return res.status(204).send();
}

export async function removeFriend(req, res) {
  const { userId } = req.params;
  const { pairKey } = makePair(req.user._id, userId);
  await Friendship.deleteOne({ pairKey });
  emitToUsers([String(req.user._id), String(userId)], "friends:update", {
    reason: "removed",
    users: [String(req.user._id), String(userId)],
  });
  return res.status(204).send();
}
