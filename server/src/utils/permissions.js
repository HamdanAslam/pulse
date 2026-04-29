import mongoose from "mongoose";
import { Membership } from "../models/Membership.js";
import { Role } from "../models/Role.js";

export const PERMISSIONS = {
  VIEW_CHANNEL: 1 << 0,
  SEND_MESSAGES: 1 << 1,
  MANAGE_MESSAGES: 1 << 2,
  MANAGE_CHANNELS: 1 << 3,
  MANAGE_ROLES: 1 << 4,
  MANAGE_SERVER: 1 << 5,
  KICK_MEMBERS: 1 << 6,
  BAN_MEMBERS: 1 << 7,
  DELETE_MESSAGES: 1 << 8,
  ADMINISTRATOR: 1 << 30,
};

export const BASE_MEMBER_PERMISSIONS = PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES;

export function hasPermission(flags, permission) {
  return Boolean(flags & PERMISSIONS.ADMINISTRATOR) || Boolean(flags & permission);
}

export async function resolveMemberPermissions(serverId, userId) {
  const member = await Membership.findOne({ serverId, userId }).lean();
  if (!member) return 0;
  const roleIds = member.roleIds?.length ? member.roleIds : [];
  const roles = await Role.find({
    _id: { $in: roleIds.map((id) => new mongoose.Types.ObjectId(id)) },
    serverId,
  }).lean();
  return roles.reduce((sum, role) => sum | (role.permissions || 0), 0);
}

export async function applyChannelOverwrites(basePerms, channel, member) {
  let perms = basePerms;
  const overwrites = channel.permissionOverwrites || [];

  const everyone = overwrites.find(
    (o) => o.targetType === "role" && String(o.targetId) === String(member.defaultRoleId || ""),
  );
  if (everyone) {
    perms &= ~everyone.deny;
    perms |= everyone.allow;
  }

  const roleIds = (member.roleIds || []).map(String);
  const roleOverwrites = overwrites.filter(
    (o) => o.targetType === "role" && roleIds.includes(String(o.targetId)),
  );
  if (roleOverwrites.length) {
    const allow = roleOverwrites.reduce((acc, cur) => acc | cur.allow, 0);
    const deny = roleOverwrites.reduce((acc, cur) => acc | cur.deny, 0);
    perms &= ~deny;
    perms |= allow;
  }

  const memberOverwrite = overwrites.find(
    (o) => o.targetType === "member" && String(o.targetId) === String(member.userId),
  );
  if (memberOverwrite) {
    perms &= ~memberOverwrite.deny;
    perms |= memberOverwrite.allow;
  }

  return perms;
}
