import { useCallback, useEffect, useMemo } from "react";
import { useMockSync } from "./useMockSync";
import { mockStore } from "@/services/_mockStore";
import * as chatService from "@/services/chat.service";
import * as dmService from "@/services/dm.service";

export const useMessages = (channelId) => {
  useEffect(() => {
    if (!channelId) return;
    const isDM = mockStore.dms.some((dm) => dm.id === channelId);
    if (isDM) dmService.listDMMessages(channelId).catch(() => {});
    else chatService.listMessages(channelId).catch(() => {});
  }, [channelId]);

  const allMessages = useMockSync(() => mockStore.messages);

  return useMemo(
    () =>
      allMessages
        .filter((message) => message.channelId === channelId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [allMessages, channelId],
  );
};

export const useSendMessage = () =>
  useCallback((channelId, content, replyTo) => {
    if (!content.trim()) return;
    const isDM = mockStore.dms.some((dm) => dm.id === channelId);
    if (isDM) return dmService.sendDMMessage(channelId, content, replyTo);
    return chatService.sendMessage(channelId, content, replyTo);
  }, []);

export const useReact = () =>
  useCallback((messageId, emoji) => chatService.addReaction(messageId, emoji), []);

export const useEditMessage = () =>
  useCallback((id, content) => chatService.editMessage(id, content), []);

export const useDeleteMessage = () =>
  useCallback((id) => chatService.deleteMessage(id), []);
