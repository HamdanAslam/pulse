import { http } from "./http";
import { mockStore } from "./_mockStore";

export async function listDMs() {
  const dms = await http.get("/dms");
  mockStore.dms = dms;
  mockStore.emit();
  return dms;
}

export async function createDM(userIds, groupName) {
  const dm = await http.post("/dms", { userIds, name: groupName });
  const existing = mockStore.dms.find((item) => item.id === dm.id);
  if (!existing) {
    mockStore.dms = [dm, ...mockStore.dms];
    mockStore.emit();
  }
  return dm;
}

export async function listDMMessages(dmId) {
  const messages = await http.get(`/dms/${dmId}/messages`);
  const rest = mockStore.messages.filter((msg) => msg.channelId !== dmId);
  mockStore.messages = [...rest, ...messages].sort((a, b) => a.createdAt - b.createdAt);
  mockStore.emit();
  return messages;
}

export async function sendDMMessage(dmId, content, replyTo, attachments) {
  const message = await http.post(`/dms/${dmId}/messages`, {
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
