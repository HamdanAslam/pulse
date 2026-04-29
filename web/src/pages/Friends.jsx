import { useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, MessageCircle, Search, UserPlus, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/useBreakpoint";
const Friends = () => {
    const { friends, acceptFriend, declineFriend, removeFriend, sendFriendRequest, createDM, setLeftPanelOpen, getUser } = useChat();
    const [tab, setTab] = useState("online");
    const [query, setQuery] = useState("");
    const [addInput, setAddInput] = useState("");
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const enriched = friends.map(f => ({ ...f, user: getUser(f.userId) })).filter(x => x.user);
    const accepted = enriched.filter(x => x.status === "friend");
    const pending = enriched.filter(x => x.status === "pending_in" || x.status === "pending_out");
    const online = accepted.filter(x => x.user.status === "online");
    const list = tab === "online" ? online : tab === "all" ? accepted : tab === "pending" ? pending : [];
    const filtered = list.filter(x => x.user.displayName.toLowerCase().includes(query.toLowerCase()) || x.user.username.toLowerCase().includes(query.toLowerCase()));
    const handleAdd = async (e) => {
        e.preventDefault();
        const ok = await sendFriendRequest(addInput.trim());
        toast({
            title: ok ? "Friend request sent" : "Couldn't send request",
            description: ok ? `We sent a request to @${addInput}` : "User not found or already in your list.",
            variant: ok ? "default" : "destructive",
        });
        if (ok)
            setAddInput("");
    };
    return (<section className="flex h-full min-w-0 flex-1 flex-col bg-surface-1">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface-1 px-2 sm:px-4 shadow-sm">
        {isMobile && (<button onClick={() => setLeftPanelOpen(true)} aria-label="Open menu" className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
            <Menu className="h-5 w-5"/>
          </button>)}
        <div className="flex shrink-0 items-center gap-2 font-semibold text-foreground">
          <Users className="h-5 w-5 text-muted-foreground"/>
          Friends
        </div>
        <div className="hidden sm:block mx-2 h-5 w-px bg-border"/>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-thin -mx-1 px-1">
          {["online", "all", "pending"].map((t) => (<button key={t} onClick={() => setTab(t)} className={cn("shrink-0 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors", tab === t ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>
              {t}
              {t === "pending" && pending.length > 0 && (<span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{pending.length}</span>)}
            </button>))}
        </div>
        <button onClick={() => setTab("add")} aria-label="Add friend" className={cn("shrink-0 rounded-md px-2 sm:px-3 py-1.5 text-sm font-medium transition-colors", tab === "add" ? "bg-success text-background" : "bg-success/15 text-success hover:bg-success/25")}>
          <span className="hidden sm:inline">Add Friend</span>
          <UserPlus className="h-4 w-4 sm:hidden"/>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
        {tab === "add" ? (<div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold">Add Friend</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add someone by username.</p>
            <form onSubmit={handleAdd} className="mt-6 flex flex-col sm:flex-row gap-2 rounded-xl border border-border bg-surface-2 p-2 focus-within:border-primary/60">
              <Input value={addInput} onChange={e => setAddInput(e.target.value)} placeholder="Username" className="border-0 bg-transparent focus-visible:ring-0"/>
              <Button type="submit" disabled={!addInput.trim()} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                Send Request
              </Button>
            </form>
          </div>) : (<>
            <div className="relative mb-4 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" className="pl-9"/>
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {tab === "online" ? "Online" : tab === "all" ? "All Friends" : "Pending"} — {filtered.length}
            </p>
            <div className="space-y-1">
              {filtered.map(({ user, status }) => (<div key={user.id} className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 hover:border-border hover:bg-surface-2">
                  <Avatar avatar={user.avatar} name={user.displayName} size={40} status={user.status}/>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-semibold text-foreground">{user.displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {status === "pending_in" && "Incoming friend request"}
                      {status === "pending_out" && "Outgoing friend request"}
                      {status === "friend" && (user.bio || `${user.status[0].toUpperCase()}${user.status.slice(1)}`)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {status === "friend" && (<>
                        <IconAction label="Message" onClick={() => createDM([user.id])}><MessageCircle className="h-4 w-4"/></IconAction>
                        <IconAction label="Remove" onClick={() => removeFriend(user.id)}><X className="h-4 w-4"/></IconAction>
                      </>)}
                    {status === "pending_in" && (<>
                        <IconAction label="Accept" onClick={() => acceptFriend(user.id)} variant="accept"><Check className="h-4 w-4"/></IconAction>
                        <IconAction label="Decline" onClick={() => declineFriend(user.id)}><X className="h-4 w-4"/></IconAction>
                      </>)}
                    {status === "pending_out" && (<IconAction label="Cancel" onClick={() => declineFriend(user.id)}><X className="h-4 w-4"/></IconAction>)}
                  </div>
                </div>))}
              {filtered.length === 0 && (<p className="py-12 text-center text-sm text-muted-foreground">Nothing here yet.</p>)}
            </div>
          </>)}
      </div>
    </section>);
};
const IconAction = ({ children, label, onClick, variant }) => (<button onClick={onClick} aria-label={label} className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-muted-foreground transition-colors hover:text-foreground", variant === "accept" && "hover:bg-success hover:text-background")}>
    {children}
  </button>);
export default Friends;
