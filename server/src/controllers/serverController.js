import mongoose from "mongoose";
import { Server } from "../models/Server.js";
import { Membership } from "../models/Membership.js";
import { Role } from "../models/Role.js";
import { Category } from "../models/Category.js";
import { Channel } from "../models/Channel.js";
import { Invite } from "../models/Invite.js";
import { emitNotification, emitToUsers } from "../socket.js";
import { acronymFor } from "../utils/serialize.js";
import { BASE_MEMBER_PERMISSIONS, PERMISSIONS, hasPermission, resolveMemberPermissions } from "../utils/permissions.js";
import { buildServerView } from "../utils/serverView.js";

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

function sanitizeInviteCode(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
}

async function emitServerUpdate(serverId, reason, extra = {}) {
  const memberships = await Membership.find({ serverId }).lean();
  const userIds = memberships.map((membership) => String(membership.userId));
  emitToUsers(userIds, "servers:update", { serverId: String(serverId), reason, ...extra });
}

async function ensureMember(serverId, userId) {
  return Membership.findOne({ serverId, userId });
}

async function requirePerm(serverId, userId, perm) {
  const member = await ensureMember(serverId, userId);
  if (!member) return false;
  const flags = await resolveMemberPermissions(serverId, userId);
  return hasPermission(flags, perm);
}

async function createDefaultServerResources(server, ownerId) {
  const everyone = await Role.create({
    serverId: server._id,
    name: "@everyone",
    permissions: BASE_MEMBER_PERMISSIONS,
    position: 0,
    isDefault: true,
    managed: true,
  });
  const ownerRole = await Role.create({
    serverId: server._id,
    name: "Owner",
    permissions: PERMISSIONS.ADMINISTRATOR,
    color: "0 0% 100%",
    position: 100,
    managed: true,
  });
  await Membership.create({
    serverId: server._id,
    userId: ownerId,
    roleIds: [everyone._id, ownerRole._id],
  });
  const category = await Category.create({
    serverId: server._id,
    name: "General",
    position: 0,
  });
  await Channel.create({
    serverId: server._id,
    categoryId: category._id,
    name: "general",
    type: "text",
    position: 0,
  });
}

export async function listServers(req, res) {
  const memberships = await Membership.find({ userId: req.user._id }).lean();
  const serverIds = memberships.map((membership) => membership.serverId);
  const servers = await Server.find({ _id: { $in: serverIds } }).lean();
  const hydrated = await Promise.all(servers.map((server) => buildServerView(server, req.user._id)));
  return res.json(hydrated);
}

export async function createServer(req, res) {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  const server = await Server.create({
    name: name.trim(),
    acronym: acronymFor(name),
    color: color || "250 90% 66%",
    ownerId: req.user._id,
  });
  await createDefaultServerResources(server, req.user._id);
  const view = await buildServerView(server, req.user._id);
  emitToUsers([String(req.user._id)], "servers:update", {
    serverId: view.id,
    reason: "created",
  });
  return res.status(201).json(view);
}

export async function getServer(req, res) {
  const server = await Server.findById(req.params.serverId);
  if (!server) return res.status(404).json({ error: "Server not found" });
  const member = await ensureMember(server._id, req.user._id);
  if (!member) return res.status(403).json({ error: "Forbidden" });
  const view = await buildServerView(server, req.user._id);
  return res.json(view);
}

export async function updateServer(req, res) {
  const server = await Server.findById(req.params.serverId);
  if (!server) return res.status(404).json({ error: "Server not found" });
  const allowed = await requirePerm(server._id, req.user._id, PERMISSIONS.MANAGE_SERVER);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const { name, color, banner, bannerPublicId, icon, iconPublicId } = req.body;
  if (name) {
    server.name = name.trim();
    server.acronym = acronymFor(name);
  }
  if (color) server.color = color;
  if (banner !== undefined) server.banner = banner;
  if (bannerPublicId !== undefined) server.bannerPublicId = bannerPublicId;
  if (icon !== undefined) server.icon = icon;
  if (iconPublicId !== undefined) server.iconPublicId = iconPublicId;
  await server.save();
  const view = await buildServerView(server, req.user._id);
  await emitServerUpdate(server._id, "updated");
  return res.json(view);
}

export async function deleteServer(req, res) {
  const server = await Server.findById(req.params.serverId);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (String(server.ownerId) !== String(req.user._id)) {
    return res.status(403).json({ error: "Only owner can delete server" });
  }
  await Promise.all([
    Membership.deleteMany({ serverId: server._id }),
    Role.deleteMany({ serverId: server._id }),
    Category.deleteMany({ serverId: server._id }),
    Channel.deleteMany({ serverId: server._id }),
    server.deleteOne(),
  ]);
  return res.status(204).send();
}

export async function addServerMember(req, res) {
  const { serverId } = req.params;
  const { userId } = req.body;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_SERVER);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const defaultRole = await Role.findOne({ serverId, isDefault: true });
  if (!defaultRole) return res.status(400).json({ error: "Default role missing" });

  await Membership.updateOne(
    { serverId, userId },
    { $setOnInsert: { roleIds: [defaultRole._id] } },
    { upsert: true },
  );
  await emitServerUpdate(serverId, "member_added", { userId: String(userId) });
  emitNotification([String(userId)], {
    type: "server_invite_accept",
    title: "Added to server",
    description: "You were added to a server.",
    serverId: String(serverId),
  });
  return res.status(204).send();
}

export async function removeServerMember(req, res) {
  const { serverId, userId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.KICK_MEMBERS);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  await Membership.deleteOne({ serverId, userId });
  await emitServerUpdate(serverId, "member_removed", { userId: String(userId) });
  return res.status(204).send();
}

export async function listRoles(req, res) {
  const member = await ensureMember(req.params.serverId, req.user._id);
  if (!member) return res.status(403).json({ error: "Forbidden" });
  const roles = await Role.find({ serverId: req.params.serverId }).sort({ position: -1 }).lean();
  return res.json(
    roles.map((role) => ({
      id: String(role._id),
      name: role.name,
      color: role.color,
      permissions: role.permissions,
      position: role.position,
      isDefault: role.isDefault,
      managed: role.managed,
    })),
  );
}

export async function createRole(req, res) {
  const { serverId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_ROLES);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const topRole = await Role.findOne({ serverId }).sort({ position: -1 });
  const role = await Role.create({
    serverId,
    name: req.body.name || "new-role",
    color: req.body.color || "",
    permissions: Number(req.body.permissions || 0),
    position: (topRole?.position || 0) + 1,
  });
  await emitServerUpdate(serverId, "role_created", { roleId: String(role._id) });
  return res.status(201).json({
    id: String(role._id),
    name: role.name,
    color: role.color,
    permissions: role.permissions,
    position: role.position,
    isDefault: role.isDefault,
    managed: role.managed,
  });
}

export async function updateRole(req, res) {
  const { serverId, roleId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_ROLES);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const role = await Role.findOne({ _id: roleId, serverId });
  if (!role) return res.status(404).json({ error: "Role not found" });
  if (role.managed) return res.status(400).json({ error: "Managed role cannot be edited" });
  const { name, color, permissions, position } = req.body;
  if (name !== undefined) role.name = name;
  if (color !== undefined) role.color = color;
  if (permissions !== undefined) role.permissions = Number(permissions);
  if (position !== undefined) role.position = Number(position);
  await role.save();
  await emitServerUpdate(serverId, "role_updated", { roleId: String(role._id) });
  return res.json({
    id: String(role._id),
    name: role.name,
    color: role.color,
    permissions: role.permissions,
    position: role.position,
    isDefault: role.isDefault,
    managed: role.managed,
  });
}

export async function deleteRole(req, res) {
  const { serverId, roleId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_ROLES);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const role = await Role.findOne({ _id: roleId, serverId });
  if (!role) return res.status(404).json({ error: "Role not found" });
  if (role.isDefault || role.managed) {
    return res.status(400).json({ error: "Cannot delete protected role" });
  }
  await Promise.all([
    Membership.updateMany({ serverId }, { $pull: { roleIds: role._id } }),
    Channel.updateMany(
      { serverId },
      { $pull: { permissionOverwrites: { targetType: "role", targetId: role._id } } },
    ),
    role.deleteOne(),
  ]);
  await emitServerUpdate(serverId, "role_deleted", { roleId: String(roleId) });
  return res.status(204).send();
}

export async function assignRole(req, res) {
  const { serverId, userId, roleId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_ROLES);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const [membership, role] = await Promise.all([
    Membership.findOne({ serverId, userId }),
    Role.findOne({ _id: roleId, serverId }),
  ]);
  if (!membership) return res.status(404).json({ error: "Member not found" });
  if (!role) return res.status(404).json({ error: "Role not found" });
  await Membership.updateOne(
    { serverId, userId },
    { $addToSet: { roleIds: new mongoose.Types.ObjectId(roleId) } },
  );
  await emitServerUpdate(serverId, "role_assigned", { userId: String(userId), roleId: String(roleId) });
  return res.status(204).send();
}

export async function unassignRole(req, res) {
  const { serverId, userId, roleId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_ROLES);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const [membership, role] = await Promise.all([
    Membership.findOne({ serverId, userId }),
    Role.findOne({ _id: roleId, serverId }),
  ]);
  if (!membership) return res.status(404).json({ error: "Member not found" });
  if (!role) return res.status(404).json({ error: "Role not found" });
  if (role.isDefault) return res.status(400).json({ error: "Cannot remove default role" });
  await Membership.updateOne(
    { serverId, userId },
    { $pull: { roleIds: new mongoose.Types.ObjectId(roleId) } },
  );
  await emitServerUpdate(serverId, "role_unassigned", { userId: String(userId), roleId: String(roleId) });
  return res.status(204).send();
}

export async function createCategory(req, res) {
  const { serverId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_CHANNELS);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const last = await Category.findOne({ serverId }).sort({ position: -1 });
  const category = await Category.create({
    serverId,
    name: req.body.name || "New Category",
    position: (last?.position || 0) + 1,
  });
  await emitServerUpdate(serverId, "category_created", { categoryId: String(category._id) });
  return res.status(201).json({ id: String(category._id), name: category.name, position: category.position });
}

export async function updateCategory(req, res) {
  const { serverId, categoryId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_CHANNELS);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const category = await Category.findOne({ _id: categoryId, serverId });
  if (!category) return res.status(404).json({ error: "Category not found" });
  if (req.body.name !== undefined) category.name = req.body.name;
  if (req.body.position !== undefined) category.position = Number(req.body.position);
  await category.save();
  await emitServerUpdate(serverId, "category_updated", { categoryId: String(category._id) });
  return res.json({ id: String(category._id), name: category.name, position: category.position });
}

export async function deleteCategory(req, res) {
  const { serverId, categoryId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_CHANNELS);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  await Channel.updateMany({ serverId, categoryId }, { $set: { categoryId: null } });
  await Category.deleteOne({ _id: categoryId, serverId });
  await emitServerUpdate(serverId, "category_deleted", { categoryId: String(categoryId) });
  return res.status(204).send();
}

export async function createChannel(req, res) {
  const { serverId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_CHANNELS);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const { name, type, topic, categoryId } = req.body;
  const last = await Channel.findOne({ serverId, categoryId: categoryId || null }).sort({ position: -1 });
  const channel = await Channel.create({
    serverId,
    categoryId: categoryId || null,
    name: name || "new-channel",
    type: type === "announcement" ? "announcement" : "text",
    topic: topic || "",
    position: (last?.position || 0) + 1,
  });
  await emitServerUpdate(serverId, "channel_created", { channelId: String(channel._id) });
  return res.status(201).json({
    id: String(channel._id),
    name: channel.name,
    type: channel.type,
    topic: channel.topic || "",
    categoryId: channel.categoryId ? String(channel.categoryId) : null,
    position: channel.position,
  });
}

export async function updateChannel(req, res) {
  const { serverId, channelId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_CHANNELS);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const channel = await Channel.findOne({ _id: channelId, serverId });
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  const { name, topic, type, position, categoryId, permissionOverwrites } = req.body;
  if (name !== undefined) channel.name = name;
  if (topic !== undefined) channel.topic = topic;
  if (type !== undefined) channel.type = type;
  if (position !== undefined) channel.position = Number(position);
  if (categoryId !== undefined) channel.categoryId = categoryId || null;
  if (permissionOverwrites !== undefined) channel.permissionOverwrites = permissionOverwrites;
  await channel.save();
  await emitServerUpdate(serverId, "channel_updated", { channelId: String(channel._id) });
  return res.json({
    id: String(channel._id),
    name: channel.name,
    type: channel.type,
    topic: channel.topic || "",
    categoryId: channel.categoryId ? String(channel.categoryId) : null,
    position: channel.position,
    permissionOverwrites: channel.permissionOverwrites,
  });
}

export async function deleteChannel(req, res) {
  const { serverId, channelId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_CHANNELS);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  await Channel.deleteOne({ _id: channelId, serverId });
  await emitServerUpdate(serverId, "channel_deleted", { channelId: String(channelId) });
  return res.status(204).send();
}

export async function listInvites(req, res) {
  const { serverId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_SERVER);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const invites = await Invite.find({ serverId }).sort({ createdAt: -1 }).lean();
  return res.json(
    invites.map((invite) => ({
      id: String(invite._id),
      code: invite.code,
      uses: invite.uses,
      maxUses: invite.maxUses,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    })),
  );
}

export async function createInvite(req, res) {
  const { serverId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_SERVER);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  let code = sanitizeInviteCode(req.body.code || "");
  if (code) {
    if (code.length < 4) return res.status(400).json({ error: "Vanity code must be at least 4 characters" });
    const existing = await Invite.findOne({ code }).lean();
    if (existing) return res.status(409).json({ error: "Vanity code already in use" });
  } else {
    code = generateInviteCode();
    while (await Invite.findOne({ code })) code = generateInviteCode();
  }

  const invite = await Invite.create({
    code,
    serverId,
    createdBy: req.user._id,
    maxUses: Number(req.body.maxUses || 0),
    expiresAt: req.body.expiresAt || null,
  });
  await emitServerUpdate(serverId, "invite_created", { inviteId: String(invite._id) });
  return res.status(201).json({
    id: String(invite._id),
    code: invite.code,
    uses: invite.uses,
    maxUses: invite.maxUses,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  });
}

export async function deleteInvite(req, res) {
  const { serverId, inviteId } = req.params;
  const allowed = await requirePerm(serverId, req.user._id, PERMISSIONS.MANAGE_SERVER);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  await Invite.deleteOne({ _id: inviteId, serverId });
  await emitServerUpdate(serverId, "invite_deleted", { inviteId: String(inviteId) });
  return res.status(204).send();
}

export async function resolveInvite(req, res) {
  const invite = await Invite.findOne({ code: req.params.code }).lean();
  if (!invite) return res.status(404).json({ error: "Invite not found" });
  const server = await Server.findById(invite.serverId).lean();
  if (!server) return res.status(404).json({ error: "Server not found" });
  const memberCount = await Membership.countDocuments({ serverId: server._id });
  return res.json({
    code: invite.code,
    server: {
      id: String(server._id),
      name: server.name,
      acronym: server.acronym,
      color: server.color,
      icon: server.icon || "",
      banner: server.banner || "",
      memberCount,
    },
    uses: invite.uses,
    maxUses: invite.maxUses,
    expiresAt: invite.expiresAt,
  });
}

export async function joinInvite(req, res) {
  const invite = await Invite.findOne({ code: req.params.code });
  if (!invite) return res.status(404).json({ error: "Invite not found" });
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: "Invite expired" });
  }
  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
    return res.status(410).json({ error: "Invite max uses reached" });
  }

  const server = await Server.findById(invite.serverId);
  if (!server) return res.status(404).json({ error: "Server not found" });

  const existing = await Membership.findOne({ serverId: server._id, userId: req.user._id });
  if (!existing) {
    const defaultRole = await Role.findOne({ serverId: server._id, isDefault: true });
    await Membership.create({
      serverId: server._id,
      userId: req.user._id,
      roleIds: defaultRole ? [defaultRole._id] : [],
    });
    invite.uses += 1;
    await invite.save();
  }

  const view = await buildServerView(server, req.user._id);
  await emitServerUpdate(server._id, "member_joined", { userId: String(req.user._id) });
  emitNotification([String(req.user._id)], {
    type: "server_joined",
    title: `Joined ${server.name}`,
    description: "The server is now in your sidebar.",
    serverId: String(server._id),
  });
  return res.json(view);
}
