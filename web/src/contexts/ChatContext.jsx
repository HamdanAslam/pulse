import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mockStore } from "@/services/_mockStore";
import { useMockSync } from "@/hooks/useMockSync";
import { useSocket } from "@/hooks/useSocket";
import { useTypingState } from "@/hooks/useTyping";
import * as chatService from "@/services/chat.service";
import * as dmService from "@/services/dm.service";
import * as friendsService from "@/services/friends.service";
import * as userService from "@/services/user.service";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages, useSendMessage, useReact, useEditMessage, useDeleteMessage } from "@/hooks/useMessages";
import { toast } from "sonner";

const Ctx = createContext(null);
const DEFAULT_TITLE = "Pulse";

export const ChatProvider = ({ children }) => {
  const nav = useNavigate();
  const location = useLocation();
  const { user, syncUser } = useAuth();
  const socket = useSocket();
  const servers = useMockSync(() => mockStore.servers);
  const dms = useMockSync(() => mockStore.dms);
  const friends = useMockSync(() => mockStore.friends);
  const users = useMockSync(() => mockStore.users);
  const [ready, setReady] = useState(false);

  const [activeServerId, setActiveServerId] = useState("");
  const [activeChannelId, setActiveChannelId] = useState("");
  const [activeDMId, setActiveDMId] = useState(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [membersPanelOpen, setMembersPanelOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const getUser = useCallback((id) => mockStore.users.find((member) => member.id === id), []);

  const send = useSendMessage();
  const react = useReact();
  const edit = useEditMessage();
  const del = useDeleteMessage();
  const { typing, notifyTyping, clearTyping } = useTypingState(socket);

  const bootstrap = useCallback(async () => {
    if (!user) return;
    try {
      mockStore.selfId = user.id;
      mockStore.upsertUsers([user]);
      const [serversData, dmsData, friendsData] = await Promise.all([
        chatService.listServers(),
        dmService.listDMs(),
        friendsService.listFriends(),
      ]);

      const userIds = new Set([user.id]);
      friendsData.forEach((friend) => userIds.add(friend.userId));
      dmsData.forEach((dm) => dm.participantIds.forEach((id) => userIds.add(id)));
      serversData.forEach((server) => server.memberIds.forEach((id) => userIds.add(id)));
      await userService.usersByIds([...userIds]);

      const fallbackServer = serversData[0];
      const fallbackChannel = fallbackServer?.categories?.[0]?.channels?.[0];
      setActiveServerId((prev) => prev || fallbackServer?.id || "");
      setActiveChannelId((prev) => prev || fallbackChannel?.id || "");
      setReady(true);
    } catch (error) {
      console.error("Failed bootstrap", error);
      setReady(true);
    }
  }, [user]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const roomId = activeDMId || activeChannelId;
    if (!roomId) return undefined;
    socket.emit("channel:join", { channelId: roomId });
    return () => {
      socket.emit("channel:leave", { channelId: roomId });
    };
  }, [socket, activeChannelId, activeDMId]);

  const clearUnread = useCallback((channelId) => {
    if (!channelId) return;
    setUnreadCounts((current) => {
      if (!current[channelId]) return current;
      const next = { ...current };
      delete next[channelId];
      return next;
    });
  }, []);

  useEffect(() => {
    const activeRoomId = activeDMId || activeChannelId;
    if (document.visibilityState === "visible") clearUnread(activeRoomId);
  }, [activeDMId, activeChannelId, clearUnread]);

  useEffect(() => {
    const handleFocus = () => {
      clearUnread(activeDMId || activeChannelId);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") clearUnread(activeDMId || activeChannelId);
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeDMId, activeChannelId, clearUnread]);

  const routeTitle = useMemo(() => {
    if (location.pathname.startsWith("/friends")) return "Friends";
    if (location.pathname.startsWith("/dm/")) {
      const dm = dms.find((item) => item.id === activeDMId);
      if (!dm) return "Direct Messages";
      const others = dm.participantIds.filter((id) => id !== mockStore.selfId).map((id) => getUser(id)).filter(Boolean);
      const dmName = dm.isGroup ? (dm.name || others.map((item) => item.displayName).join(", ")) : others[0]?.displayName;
      return dmName || "Direct Messages";
    }
    if (location.pathname.startsWith("/server/")) {
      const server = servers.find((item) => item.id === activeServerId);
      const channel = server?.categories?.flatMap((category) => category.channels).find((item) => item.id === activeChannelId);
      if (server && channel) return `${channel.name} · ${server.name}`;
      if (server) return server.name;
    }
    return DEFAULT_TITLE;
  }, [location.pathname, dms, activeDMId, servers, activeServerId, activeChannelId, getUser]);

  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, value) => sum + value, 0);
    document.title = totalUnread > 0 ? `(${totalUnread}) ${routeTitle}` : routeTitle;
  }, [unreadCounts, routeTitle]);

  useEffect(() => {
    return socket.on("presence:update", ({ userId, status }) => {
      mockStore.users = mockStore.users.map((member) =>
        member.id === userId ? { ...member, status } : member,
      );
      mockStore.emit();
    });
  }, [socket]);

  useEffect(() => {
    return socket.on("user:update", (nextUser) => {
      mockStore.upsertUsers([nextUser]);
      if (nextUser.id === mockStore.selfId) syncUser(nextUser);
    });
  }, [socket, syncUser]);

  useEffect(() => {
    const offMessage = socket.on("message:new", (message) => {
      if (mockStore.messages.some((item) => item.id === message.id)) return;
      mockStore.messages = [...mockStore.messages, message].sort((a, b) => a.createdAt - b.createdAt);
      mockStore.emit();
      clearTyping(message.channelId, message.authorId);
      const activeRoomId = activeDMId || activeChannelId;
      const shouldCountUnread =
        message.authorId !== mockStore.selfId &&
        (document.visibilityState !== "visible" || message.channelId !== activeRoomId);
      if (shouldCountUnread) {
        setUnreadCounts((current) => ({
          ...current,
          [message.channelId]: (current[message.channelId] || 0) + 1,
        }));
      } else {
        clearUnread(message.channelId);
      }
    });
    const offEdit = socket.on("message:edit", (payload) => {
      mockStore.messages = mockStore.messages.map((message) =>
        message.id === payload.id
          ? { ...message, content: payload.content, embeds: payload.embeds || [], edited: true }
          : message,
      );
      mockStore.emit();
    });
    const offDelete = socket.on("message:delete", (payload) => {
      mockStore.messages = mockStore.messages.filter((message) => message.id !== payload.id);
      mockStore.emit();
    });
    const offReaction = socket.on("message:reaction", (payload) => {
      mockStore.messages = mockStore.messages.map((message) =>
        message.id === payload.id ? { ...message, reactions: payload.reactions } : message,
      );
      mockStore.emit();
    });
    return () => {
      offMessage();
      offEdit();
      offDelete();
      offReaction();
    };
  }, [socket, clearTyping, activeDMId, activeChannelId, clearUnread]);

  useEffect(() => {
    return socket.on("friends:update", async (payload) => {
      const nextFriends = await friendsService.listFriends();
      const ids = new Set([mockStore.selfId]);
      nextFriends.forEach((friend) => ids.add(friend.userId));
      (payload?.users || []).forEach((id) => ids.add(id));
      await userService.usersByIds([...ids]);
    });
  }, [socket]);

  useEffect(() => {
    return socket.on("servers:update", async () => {
      const nextServers = await chatService.listServers();
      const ids = new Set([mockStore.selfId]);
      nextServers.forEach((server) => server.memberIds.forEach((id) => ids.add(id)));
      await userService.usersByIds([...ids]);
    });
  }, [socket]);

  useEffect(() => {
    return socket.on("dms:update", async () => {
      const nextDms = await dmService.listDMs();
      const ids = new Set([mockStore.selfId]);
      nextDms.forEach((dm) => dm.participantIds.forEach((id) => ids.add(id)));
      await userService.usersByIds([...ids]);
    });
  }, [socket]);

  useEffect(() => {
    return socket.on("notify", (payload) => {
      if (!payload?.title) return;
      toast(payload.title, {
        description: payload.description,
      });
    });
  }, [socket]);

  const acceptFriend = useCallback(async (id) => {
    await friendsService.acceptFriend(id);
  }, []);
  const declineFriend = useCallback(async (id) => {
    await friendsService.declineFriend(id);
  }, []);
  const removeFriend = useCallback(async (id) => {
    await friendsService.removeFriend(id);
  }, []);
  const sendFriendRequest = useCallback(async (username) => {
    const response = await friendsService.sendFriendRequest(username);
    if (response) {
      await userService.searchUsers(username);
      return true;
    }
    return false;
  }, []);

  const createServer = useCallback(
    async (name) => {
      const server = await chatService.createServer(name);
      setActiveServerId(server.id);
      const firstChannel = server.categories?.[0]?.channels?.[0];
      if (firstChannel) setActiveChannelId(firstChannel.id);
      nav(`/server/${server.id}`);
      return server.id;
    },
    [nav],
  );

  const createDM = useCallback(
    async (userIds, groupName) => {
      await userService.usersByIds(userIds);
      const dm = await dmService.createDM(userIds, groupName);
      setActiveDMId(dm.id);
      nav(`/dm/${dm.id}`);
      return dm.id;
    },
    [nav],
  );

  const createCategory = useCallback(async (serverId, name) => {
    await chatService.createCategory(serverId, name);
  }, []);

  const createChannel = useCallback(async (serverId, categoryId, name, type) => {
    await chatService.createChannel(serverId, categoryId, name, type);
  }, []);

  const createRole = useCallback(async (serverId, payload) => chatService.createRole(serverId, payload), []);
  const updateRole = useCallback(async (serverId, roleId, payload) => chatService.updateRole(serverId, roleId, payload), []);
  const deleteRole = useCallback(async (serverId, roleId) => chatService.deleteRole(serverId, roleId), []);
  const assignRole = useCallback(async (serverId, userId, roleId) => chatService.assignRole(serverId, userId, roleId), []);
  const updateServer = useCallback(async (serverId, payload) => chatService.updateServer(serverId, payload), []);
  const listInvites = useCallback(async (serverId) => chatService.listInvites(serverId), []);
  const createInvite = useCallback(async (serverId, payload) => chatService.createInvite(serverId, payload), []);
  const deleteInvite = useCallback(async (serverId, inviteId) => chatService.deleteInvite(serverId, inviteId), []);
  const resolveInvite = useCallback(async (code) => chatService.resolveInvite(code), []);
  const joinInvite = useCallback(
    async (code) => {
      const server = await chatService.joinInvite(code);
      setActiveServerId(server.id);
      const firstChannel = server.categories?.[0]?.channels?.[0];
      if (firstChannel) setActiveChannelId(firstChannel.id);
      nav(`/server/${server.id}`);
      return server;
    },
    [nav],
  );

  const channelById = useCallback((id) => chatService.findChannel(servers, id), [servers]);
  const serverByChannel = useCallback((id) => chatService.findServerByChannel(servers, id), [servers]);
  const serverById = useCallback((id) => servers.find((server) => server.id === id), [servers]);
  const messagesFor = useCallback(
    (channelId) =>
      mockStore.messages.filter((item) => item.channelId === channelId).sort((a, b) => a.createdAt - b.createdAt),
    [],
  );
  const getMemberRoleColor = useCallback(
    (userId, serverId) => {
      const targetServer = (serverId && serverById(serverId)) || serverById(activeServerId);
      if (!targetServer) return null;
      const roles = targetServer.memberRoles?.[userId] || [];
      const coloredRole = roles.find((role) => !role.isDefault && role.color);
      return coloredRole?.color || null;
    },
    [activeServerId, serverById],
  );

  const value = useMemo(
    () => ({
      ready,
      activeServerId,
      setActiveServerId,
      activeChannelId,
      setActiveChannelId,
      activeDMId,
      setActiveDMId,
      leftPanelOpen,
      setLeftPanelOpen,
      membersPanelOpen,
      setMembersPanelOpen,
      unreadCounts,
      clearUnread,
      servers,
      dms,
      friends,
      users,
      selfId: mockStore.selfId,
      getUser,
      getMemberRoleColor,
      channelById,
      serverByChannel,
      messagesFor,
      sendMessage: (channelId, content, replyTo) => send(channelId, content, replyTo),
      editMessage: edit,
      deleteMessage: del,
      addReaction: react,
      typing,
      notifyTyping,
      clearTyping,
      acceptFriend,
      declineFriend,
      removeFriend,
      sendFriendRequest,
      createServer,
      createDM,
      createCategory,
      createChannel,
      createRole,
      updateRole,
      deleteRole,
      assignRole,
      updateServer,
      listInvites,
      createInvite,
      deleteInvite,
      resolveInvite,
      joinInvite,
      useMessages,
    }),
    [
      ready,
      activeServerId,
      activeChannelId,
      activeDMId,
      leftPanelOpen,
      membersPanelOpen,
      unreadCounts,
      servers,
      dms,
      friends,
      users,
      getUser,
      getMemberRoleColor,
      channelById,
      serverByChannel,
      messagesFor,
      send,
      edit,
      del,
      react,
      typing,
      notifyTyping,
      clearTyping,
      clearUnread,
      acceptFriend,
      declineFriend,
      removeFriend,
      sendFriendRequest,
      createServer,
      createDM,
      createCategory,
      createChannel,
      createRole,
      updateRole,
      deleteRole,
      assignRole,
      updateServer,
      listInvites,
      createInvite,
      deleteInvite,
      resolveInvite,
      joinInvite,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useChat = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useChat must be inside ChatProvider");
  return value;
};

export { useMessages } from "@/hooks/useMessages";
