import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Menu, MessageCircle, MoreHorizontal, UserPlus, UserRoundX } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { ChatView } from "@/components/chat/ChatView";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useBreakpoint";
const Home = () => {
    const { dmId } = useParams();
    const { dms, selfId, friends, getUser, createDM, removeFriend, setActiveDMId, setLeftPanelOpen } = useChat();
    const dm = dms.find((item) => item.id === dmId);
    const isMobile = useIsMobile();
    const acceptedFriends = useMemo(() => friends
        .filter((friend) => friend.status === "friend")
        .map((friend) => ({ ...friend, user: getUser(friend.userId) }))
        .filter((friend) => friend.user)
        .sort((a, b) => {
        if (a.user.status === b.user.status)
            return a.user.displayName.localeCompare(b.user.displayName);
        return a.user.status === "online" ? -1 : 1;
    }), [friends, getUser]);
    useEffect(() => {
        setActiveDMId(dmId ?? null);
    }, [dmId, setActiveDMId]);
    if (!dm) {
        return (<FriendsHome mobile={isMobile} friends={acceptedFriends} onMenu={() => setLeftPanelOpen(true)} onOpenDM={(userId) => createDM([userId])} onRemoveFriend={removeFriend}/>);
    }
    const others = dm.participantIds.filter((id) => id !== selfId).map(getUser).filter(Boolean);
    const title = dm.isGroup ? (dm.name ?? others.map((item) => item.displayName).join(", ")) : others[0]?.displayName ?? "Unknown";
    const topic = dm.isGroup ? `${dm.participantIds.length} members` : `@${others[0]?.username}`;
    return <ChatView channelId={dm.id} title={title} topic={topic} channelType="text"/>;
};
const FriendsHome = ({ mobile, friends, onMenu, onOpenDM, onRemoveFriend }) => (<section className="flex h-full min-w-0 flex-1 flex-col bg-surface-1">
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-5">
      {mobile && (<button onClick={onMenu} aria-label="Open menu" className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <Menu className="h-5 w-5"/>
        </button>)}
      <div className="min-w-0">
        <p className="text-sm font-semibold">Friends</p>
        <p className="text-xs text-muted-foreground">
          {friends.length > 0 ? `${friends.length} people in your list` : "Your home feed is empty"}
        </p>
      </div>
    </header>

    <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
      {friends.length > 0 ? (<div className="flex flex-col gap-2">
          {friends.map(({ user }) => (<article key={user.id} className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 transition-colors hover:bg-surface-3">
              <Avatar avatar={user.avatar} name={user.displayName} size={44} status={user.status}/>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{user.displayName}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", user.status === "online"
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground")}>
                    {user.status}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                <p className="truncate text-sm text-foreground/75">{user.bio || "No status set."}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => onOpenDM(user.id)}>
                  <MessageCircle data-icon="inline-start"/>
                  Message
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label={`More actions for ${user.displayName}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onOpenDM(user.id)}>
                      <MessageCircle className="mr-2 h-4 w-4"/>
                      Open DM
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRemoveFriend(user.id)} className="text-destructive focus:text-destructive">
                      <UserRoundX className="mr-2 h-4 w-4"/>
                      Remove Friend
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </article>))}
        </div>) : (<div className="flex h-full flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-primary text-primary-foreground shadow-glow">
            <UserPlus className="h-8 w-8"/>
          </div>
          <h2 className="text-2xl font-bold">No friends yet</h2>
          <Button asChild className="mt-5 bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/friends">Open Friends</Link>
          </Button>
        </div>)}
    </div>
  </section>);
export default Home;
