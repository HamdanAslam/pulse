import { http } from "./http";
import { mockStore } from "./_mockStore";

export async function listServers() {
  const servers = await http.get("/servers");
  mockStore.servers = servers;
  mockStore.emit();
  return servers;
}

export async function listMessages(channelId) {
  const messages = await http.get(`/channels/${channelId}/messages`);
  const rest = mockStore.messages.filter((msg) => msg.channelId !== channelId);
  mockStore.messages = [...rest, ...messages].sort((a, b) => a.createdAt - b.createdAt);
  mockStore.emit();
  return messages;
}

export async function sendMessage(channelId, content, replyTo, attachments) {
  const message = await http.post(`/channels/${channelId}/messages`, {
    content,
    replyTo,
    attachments: attachments || [],
  });
  const exists = mockStore.messages.some((item) => item.id === message.id);
  if (!exists) {
    mockStore.messages = [...mockStore.messages, message].sort((a, b) => a.createdAt - b.createdAt);
    mockStore.emit();
  }
  return message;
}

export async function editMessage(id, content) {
  const payload = await http.patch(`/messages/${id}`, { content });
  mockStore.messages = mockStore.messages.map((msg) =>
    msg.id === id ? { ...msg, content: payload.content, embeds: payload.embeds || [], edited: true } : msg,
  );
  mockStore.emit();
}

export async function deleteMessage(id) {
  await http.delete(`/messages/${id}`);
  mockStore.messages = mockStore.messages.filter((msg) => msg.id !== id);
  mockStore.emit();
}

export async function addReaction(messageId, emoji) {
  const payload = await http.post(`/messages/${messageId}/reactions`, { emoji });
  mockStore.messages = mockStore.messages.map((msg) =>
    msg.id === messageId ? { ...msg, reactions: payload.reactions } : msg,
  );
  mockStore.emit();
}

export async function createServer(name) {
  const server = await http.post("/servers", { name });
  mockStore.servers = [...mockStore.servers, server];
  mockStore.emit();
  return server;
}

export async function updateServer(serverId, payload) {
  const server = await http.patch(`/servers/${serverId}`, payload);
  mockStore.servers = mockStore.servers.map((item) => (item.id === server.id ? server : item));
  mockStore.emit();
  return server;
}

export async function listInvites(serverId) {
  return http.get(`/servers/${serverId}/invites`);
}

export async function createInvite(serverId, payload = {}) {
  return http.post(`/servers/${serverId}/invites`, payload);
}

export async function deleteInvite(serverId, inviteId) {
  return http.delete(`/servers/${serverId}/invites/${inviteId}`);
}

export async function resolveInvite(code) {
  return http.get(`/servers/invites/${code}`);
}

export async function joinInvite(code) {
  const server = await http.post(`/servers/invites/${code}/join`);
  const existing = mockStore.servers.find((item) => item.id === server.id);
  mockStore.servers = existing
    ? mockStore.servers.map((item) => (item.id === server.id ? server : item))
    : [...mockStore.servers, server];
  mockStore.emit();
  return server;
}

export async function createCategory(serverId, name) {
  await http.post(`/servers/${serverId}/categories`, { name });
  return listServers();
}

export async function createChannel(serverId, categoryId, name, type = "text") {
  await http.post(`/servers/${serverId}/channels`, { categoryId, name, type });
  return listServers();
}

export async function listRoles(serverId) {
  return http.get(`/servers/${serverId}/roles`);
}

export async function createRole(serverId, payload) {
  return http.post(`/servers/${serverId}/roles`, payload);
}

export async function updateRole(serverId, roleId, payload) {
  return http.patch(`/servers/${serverId}/roles/${roleId}`, payload);
}

export async function deleteRole(serverId, roleId) {
  return http.delete(`/servers/${serverId}/roles/${roleId}`);
}

export async function assignRole(serverId, userId, roleId) {
  return http.post(`/servers/${serverId}/members/${userId}/roles/${roleId}`);
}

export const findChannel = (servers, id) => {
  for (const server of servers) {
    for (const category of server.categories) {
      const found = category.channels.find((channel) => channel.id === id);
      if (found) return found;
    }
  }
  return undefined;
};

export const findServerByChannel = (servers, id) =>
  servers.find((server) =>
    server.categories.some((category) => category.channels.some((channel) => channel.id === id)),
  );
