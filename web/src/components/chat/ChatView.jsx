import { Menu, Pin, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChat } from "@/contexts/ChatContext";
import { useMessages } from "@/hooks/useMessages";
import { useIsMobile, useIsTabletOrBelow } from "@/hooks/useBreakpoint";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { channelIcon } from "./channelIcon";
import { TypingIndicator } from "./TypingIndicator";
export const ChatView = ({ channelId, title, topic, channelType = "text", onToggleMembers, showMembersToggle, }) => {
    const { sendMessage, addReaction, editMessage, deleteMessage, typing, notifyTyping, selfId, setLeftPanelOpen, setMembersPanelOpen } = useChat();
    const messages = useMessages(channelId);
    const isMobile = useIsMobile();
    const isTabletOrBelow = useIsTabletOrBelow();
    const Icon = channelIcon(channelType);
    const typers = (typing[channelId] ?? []).filter(t => t.userId !== selfId);
    // On tablet+mobile, the members toggle should open a sheet rather than
    // an inline panel. ServerView still owns the actual MembersPanel.
    const handleMembersToggle = () => {
        if (isTabletOrBelow)
            setMembersPanelOpen(true);
        else
            onToggleMembers?.();
    };
    const handleEdit = async (messageId, content) => {
        try {
            await editMessage(messageId, content);
        }
        catch (error) {
            throw error;
        }
    };
    const handleDelete = async (messageId) => {
        try {
            await deleteMessage(messageId);
        }
        catch (error) {
            toast.error(error?.message || "Could not delete message");
            throw error;
        }
    };
    return (<section className="flex h-full min-w-0 flex-1 flex-col bg-surface-1">
      {/* Header */}
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border bg-surface-1 px-2 sm:px-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {isMobile && (<button onClick={() => setLeftPanelOpen(true)} aria-label="Open menu" className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
              <Menu className="h-5 w-5"/>
            </button>)}
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground"/>
          <h1 className="truncate font-semibold text-foreground">{title}</h1>
          {topic && !isMobile && (<>
              <div className="mx-2 h-5 w-px bg-border"/>
              <p className="truncate text-sm text-muted-foreground">{topic}</p>
            </>)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isMobile && <IconBtn label="Pinned"><Pin className="h-4 w-4"/></IconBtn>}
          {showMembersToggle && (<IconBtn label="Members" onClick={handleMembersToggle}><Users className="h-4 w-4"/></IconBtn>)}
          {!isMobile && <IconBtn label="Search"><Search className="h-4 w-4"/></IconBtn>}
        </div>
      </header>

      <MessageList channelId={channelId} channelType={channelType} title={title} topic={topic} messages={messages} selfId={selfId} typers={typers} onReact={addReaction} onEdit={handleEdit} onDelete={handleDelete}/>

      <div className="shrink-0">
        <TypingIndicator typers={typers}/>
        <Composer channelType={channelType} title={title} onSend={(content) => sendMessage(channelId, content)} onTyping={() => notifyTyping(channelId)}/>
      </div>
    </section>);
};
const IconBtn = ({ children, label, onClick }) => (<Tooltip>
    <TooltipTrigger asChild>
      <button onClick={onClick} aria-label={label} className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>);
