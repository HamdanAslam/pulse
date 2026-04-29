import { Avatar } from "./Avatar";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { Plus, Users, X } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { UserPanel } from "./UserPanel";
export const DMSidebar = () => {
    const { dms, selfId, unreadCounts, setLeftPanelOpen, getUser } = useChat();
    const loc = useLocation();
    const nav = useNavigate();
    const { dmId: activeDmId } = useParams();
    const [openCreate, setOpenCreate] = useState(false);
    const go = (path) => {
        nav(path);
        setLeftPanelOpen(false);
    };
    return (<aside className="flex h-full w-full sm:w-60 shrink-0 flex-col bg-sidebar">
      <header className="flex h-12 shrink-0 items-center border-b border-sidebar-border px-3">
        <button className="flex w-full items-center rounded-md bg-sidebar-accent/40 px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
          Find or start a conversation
        </button>
      </header>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
        <NavItem onClick={() => go("/friends")} icon={<Users className="h-5 w-5"/>} active={loc.pathname.startsWith("/friends")}>Friends</NavItem>

        <div className="mt-4 mb-1 flex items-center justify-between px-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground">Direct Messages</p>
          <button onClick={() => setOpenCreate(true)} className="rounded p-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="New group">
            <Plus className="h-4 w-4"/>
          </button>
        </div>

        {dms.map(dm => {
            const others = dm.participantIds.filter((id) => id !== selfId).map(getUser).filter(Boolean);
            const name = dm.isGroup ? (dm.name ?? others.map(o => o?.displayName).join(", ")) : others[0]?.displayName ?? "Unknown";
            const sub = dm.isGroup ? `${dm.participantIds.length} members` : others[0]?.status;
            const active = dm.id === activeDmId;
            const unread = unreadCounts[dm.id] || 0;
            return (<button key={dm.id} onClick={() => go(`/dm/${dm.id}`)} className={cn("group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors min-h-[44px]", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
              {dm.isGroup ? (<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                  {(dm.name ?? "G").slice(0, 2).toUpperCase()}
                </div>) : (<Avatar avatar={others[0]?.avatar ?? "👤"} name={others[0]?.displayName} size={32} status={others[0]?.status}/>)}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{sub}</p>
              </div>
              {unread > 0 ? (<span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {unread}
                </span>) : (<X className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60"/>)}
            </button>);
        })}
      </nav>

      <UserPanel />

      <CreateGroupDialog open={openCreate} onOpenChange={setOpenCreate}/>
    </aside>);
};
const NavItem = ({ onClick, icon, active, children }) => (<button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors min-h-[40px]", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
    {icon}
    {children}
  </button>);
