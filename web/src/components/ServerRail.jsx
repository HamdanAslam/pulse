import { motion } from "framer-motion";
import { Plus, Compass, Home } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { CreateServerDialog } from "./CreateServerDialog";
import { JoinServerDialog } from "./JoinServerDialog";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Avatar } from "./Avatar";
export const ServerRail = () => {
    const { servers, dms, friends, selfId, unreadCounts, getUser, setLeftPanelOpen } = useChat();
    const [openCreate, setOpenCreate] = useState(false);
    const [openJoin, setOpenJoin] = useState(false);
    const nav = useNavigate();
    const loc = useLocation();
    const params = useParams();
    const inServer = loc.pathname.startsWith("/server");
    const isHome = loc.pathname === "/" || loc.pathname.startsWith("/friends") || loc.pathname.startsWith("/dm/");
    const activeServerId = params.serverId;
    const activeDmId = params.dmId;
    const pendingFriendCount = friends.filter((friend) => friend.status === "pending_in").length;
    const unreadDMs = dms
        .filter((dm) => unreadCounts[dm.id] > 0)
        .sort((a, b) => (unreadCounts[b.id] || 0) - (unreadCounts[a.id] || 0));
    const go = (path) => {
        nav(path);
        setLeftPanelOpen(false);
    };
    return (<aside className="flex h-full w-[68px] sm:w-[72px] shrink-0 flex-col items-center gap-2 bg-rail py-3 scrollbar-thin overflow-y-auto">
      <RailButton label="Direct Messages" active={isHome} onClick={() => go("/")}>
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all", isHome ? "bg-gradient-primary text-primary-foreground rounded-xl shadow-glow" : "bg-sidebar-accent text-sidebar-foreground hover:bg-gradient-primary hover:text-primary-foreground hover:rounded-xl")}>
          <Home className="h-5 w-5"/>
          {pendingFriendCount > 0 && (<span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {pendingFriendCount > 9 ? "9+" : pendingFriendCount}
            </span>)}
        </div>
      </RailButton>

      {unreadDMs.length > 0 && (<>
          <div className="my-1 h-px w-8 bg-sidebar-border"/>
          {unreadDMs.map((dm) => {
                const others = dm.participantIds.filter((id) => id !== selfId).map(getUser).filter(Boolean);
                const active = Boolean(activeDmId && dm.id === activeDmId);
                const unread = unreadCounts[dm.id] || 0;
                const label = dm.isGroup
                    ? (dm.name || others.map((user) => user.displayName).join(", "))
                    : others[0]?.displayName || "Direct Message";
                return (<RailButton key={dm.id} label={label} active={active} onClick={() => go(`/dm/${dm.id}`)}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={cn("relative flex h-12 w-12 items-center justify-center overflow-hidden bg-sidebar-accent transition-all", active ? "rounded-xl shadow-glow ring-2 ring-primary/40" : "rounded-2xl hover:rounded-xl")}>
                  {dm.isGroup ? (<div className="flex h-full w-full items-center justify-center bg-gradient-primary text-sm font-bold text-primary-foreground">
                      {(dm.name || "DM").slice(0, 2).toUpperCase()}
                    </div>) : (<Avatar avatar={others[0]?.avatar} name={others[0]?.displayName} size={48} status={others[0]?.status}/>)}
                  <span className="absolute -bottom-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
                    {unread > 99 ? "99+" : unread}
                  </span>
                  {active && <span className="absolute -left-3 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-foreground"/>}
                </motion.div>
              </RailButton>);
            })}
        </>)}

      <div className="my-1 h-px w-8 bg-sidebar-border"/>

      {servers.map(s => {
            const active = !isHome && s.id === activeServerId;
            return (<RailButton key={s.id} label={s.name} active={active} onClick={() => go(`/server/${s.id}`)}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={cn("relative flex h-12 w-12 items-center justify-center font-display font-bold text-sm transition-all", active ? "rounded-xl shadow-glow" : "rounded-2xl hover:rounded-xl")} style={{
                    background: active
                        ? `linear-gradient(135deg, hsl(${s.color}), hsl(${s.color} / 0.7))`
                        : `hsl(${s.color} / 0.18)`,
                    color: active ? "white" : `hsl(${s.color})`,
                }}>
              {s.acronym}
              {active && <span className="absolute -left-3 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-foreground"/>}
            </motion.div>
          </RailButton>);
        })}

      <RailButton label="Add a server" onClick={() => setOpenCreate(true)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-accent text-success transition-all hover:rounded-xl hover:bg-success hover:text-background">
          <Plus className="h-5 w-5"/>
        </div>
      </RailButton>

      <RailButton label="Join a server" onClick={() => setOpenJoin(true)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-accent text-success transition-all hover:rounded-xl hover:bg-success hover:text-background">
          <Compass className="h-5 w-5"/>
        </div>
      </RailButton>

      <CreateServerDialog open={openCreate} onOpenChange={setOpenCreate}/>
      <JoinServerDialog open={openJoin} onOpenChange={setOpenJoin}/>
    </aside>);
};
const RailButton = ({ children, label, onClick, active }) => (<Tooltip delayDuration={150}>
    <TooltipTrigger asChild>
      <button onClick={onClick} aria-label={label} aria-current={active ? "page" : undefined} className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" className="font-medium hidden md:block">{label}</TooltipContent>
  </Tooltip>);
