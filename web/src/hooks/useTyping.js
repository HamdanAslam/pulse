import { useCallback, useEffect, useState } from "react";
import { mockStore } from "@/services/_mockStore";

export function useTypingState(socket) {
  const [typing, setTyping] = useState({});

  useEffect(() => {
    if (!socket) return undefined;
    return socket.on("typing", (payload) => {
      const { channelId, userId, until } = payload || {};
      if (!channelId || !userId || userId === mockStore.selfId) return;
      setTyping((state) => ({
        ...state,
        [channelId]: [
          ...(state[channelId] || []).filter((item) => item.userId !== userId),
          { userId, until: until || Date.now() + 2500 },
        ],
      }));
    });
  }, [socket]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTyping((current) => {
        const now = Date.now();
        const next = {};
        Object.entries(current).forEach(([channelId, users]) => {
          const active = users.filter((user) => user.until > now);
          if (active.length) next[channelId] = active;
        });
        const same =
          Object.keys(current).length === Object.keys(next).length &&
          Object.keys(current).every((key) => (current[key] || []).length === (next[key] || []).length);
        return same ? current : next;
      });
    }, 500);
    return () => window.clearInterval(interval);
  }, []);

  const notifyTyping = useCallback(
    (channelId) => {
      if (!channelId || !socket) return;
      socket.emit("typing", { channelId });
    },
    [socket],
  );

  const clearTyping = useCallback((channelId, userId) => {
    if (!channelId) return;
    setTyping((state) => {
      const current = state[channelId] || [];
      const nextUsers = userId ? current.filter((item) => item.userId !== userId) : [];
      if (!current.length) return state;
      if (!nextUsers.length) {
        const next = { ...state };
        delete next[channelId];
        return next;
      }
      return {
        ...state,
        [channelId]: nextUsers,
      };
    });
  }, []);

  return { typing, notifyTyping, clearTyping, scheduleMockReply: () => {} };
}
