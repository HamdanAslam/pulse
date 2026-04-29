import { Category } from "../models/Category.js";
import { Channel } from "../models/Channel.js";
import { Membership } from "../models/Membership.js";
import { Role } from "../models/Role.js";
import { PERMISSIONS, hasPermission, resolveMemberPermissions } from "./permissions.js";

export async function buildServerView(server, viewerUserId = null) {
  const [categories, channels, members, roles] = await Promise.all([
    Category.find({ serverId: server._id }).sort({ position: 1 }).lean(),
    Channel.find({ serverId: server._id }).sort({ position: 1 }).lean(),
    Membership.find({ serverId: server._id }).lean(),
    Role.find({ serverId: server._id }).sort({ position: -1 }).lean(),
  ]);
  const permissionFlags = viewerUserId ? await resolveMemberPermissions(server._id, viewerUserId) : 0;

  const channelMap = categories.map((cat) => ({
    id: String(cat._id),
    name: cat.name,
    channels: channels
      .filter((channel) => String(channel.categoryId || "") === String(cat._id))
      .map((channel) => ({
        id: String(channel._id),
        name: channel.name,
        type: channel.type,
        topic: channel.topic || "",
      })),
  }));

  const uncategorized = channels
    .filter((channel) => !channel.categoryId)
    .map((channel) => ({
      id: String(channel._id),
      name: channel.name,
      type: channel.type,
      topic: channel.topic || "",
    }));
  if (uncategorized.length) {
    channelMap.unshift({
      id: `uncategorized-${server._id}`,
      name: "Text Channels",
      channels: uncategorized,
    });
  }

  return {
    id: String(server._id),
    name: server.name,
    acronym: server.acronym,
    color: server.color,
    icon: server.icon || "",
    iconPublicId: server.iconPublicId || "",
    banner: server.banner || "",
    bannerPublicId: server.bannerPublicId || "",
    ownerId: String(server.ownerId),
    memberIds: members.map((member) => String(member.userId)),
    memberRoles: Object.fromEntries(
      members.map((member) => [
        String(member.userId),
        roles
          .filter((role) => (member.roleIds || []).some((roleId) => String(roleId) === String(role._id)))
          .map((role) => ({
            id: String(role._id),
            name: role.name,
            color: role.color,
            permissions: role.permissions,
            isDefault: role.isDefault,
            managed: role.managed,
          })),
      ]),
    ),
    permissions: {
      flags: permissionFlags,
      isOwner: viewerUserId ? String(server.ownerId) === String(viewerUserId) : false,
      isAdmin: hasPermission(permissionFlags, PERMISSIONS.ADMINISTRATOR),
      canManageServer: hasPermission(permissionFlags, PERMISSIONS.MANAGE_SERVER),
      canManageChannels: hasPermission(permissionFlags, PERMISSIONS.MANAGE_CHANNELS),
      canManageRoles: hasPermission(permissionFlags, PERMISSIONS.MANAGE_ROLES),
      canManageMessages: hasPermission(permissionFlags, PERMISSIONS.MANAGE_MESSAGES),
      canDeleteMessages: hasPermission(permissionFlags, PERMISSIONS.DELETE_MESSAGES),
      canKickMembers: hasPermission(permissionFlags, PERMISSIONS.KICK_MEMBERS),
    },
    categories: channelMap,
    roles: roles.map((role) => ({
      id: String(role._id),
      name: role.name,
      color: role.color,
      permissions: role.permissions,
      position: role.position,
      isDefault: role.isDefault,
      managed: role.managed,
    })),
  };
}
