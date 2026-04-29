import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useChat } from "@/contexts/ChatContext";
import { ChatView } from "@/components/chat/ChatView";
import { MembersPanel } from "@/components/MembersPanel";
import { PanelSheet } from "@/components/layout/PanelSheet";
import { useIsTabletOrBelow } from "@/hooks/useBreakpoint";
const ServerView = () => {
    const { serverId, channelId } = useParams();
    const { ready, servers, setActiveServerId, setActiveChannelId, setActiveDMId, activeChannelId, membersPanelOpen, setMembersPanelOpen, } = useChat();
    const [showMembersDesktop, setShowMembersDesktop] = useState(true);
    const isTabletOrBelow = useIsTabletOrBelow();
    const server = servers.find(s => s.id === serverId);
    const allChannels = server?.categories.flatMap(c => c.channels) ?? [];
    const firstText = allChannels.find(c => c.type !== "voice");
    const channel = channelId
        ? allChannels.find(c => c.id === channelId)
        : allChannels.find(c => c.id === activeChannelId) ?? firstText;
    useEffect(() => {
        if (server)
            setActiveServerId(server.id);
    }, [server, setActiveServerId]);
    useEffect(() => {
        setActiveDMId(null);
    }, [setActiveDMId, serverId]);
    useEffect(() => {
        if (channel)
            setActiveChannelId(channel.id);
    }, [channel, setActiveChannelId]);
    if (!ready)
        return null;
    if (!server)
        return <Navigate to="/" replace/>;
    if (!channel)
        return null;
    if (channel.type === "voice") {
        return (<div className="flex h-full flex-1 items-center justify-center bg-surface-1 p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <span className="text-3xl">🎙️</span>
          </div>
          <h2 className="font-display text-2xl font-bold">{channel.name}</h2>
          <p className="mt-2 text-muted-foreground">Voice channels coming once your backend is wired up.</p>
        </div>
      </div>);
    }
    return (<>
      <ChatView channelId={channel.id} title={channel.name} topic={channel.topic} channelType={channel.type} showMembersToggle onToggleMembers={() => setShowMembersDesktop(s => !s)}/>

      {/* Desktop: render inline (lg+). On tablet/mobile: open in a sheet. */}
      {!isTabletOrBelow && showMembersDesktop && (<MembersPanel serverId={server.id} memberIds={server.memberIds} ownerId={server.ownerId}/>)}

      {isTabletOrBelow && (<PanelSheet side="right" open={membersPanelOpen} onOpenChange={setMembersPanelOpen} breakpoint="tablet">
          <MembersPanel serverId={server.id} memberIds={server.memberIds} ownerId={server.ownerId} forceVisible/>
        </PanelSheet>)}
    </>);
};
export default ServerView;
