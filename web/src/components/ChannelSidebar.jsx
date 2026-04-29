import { ChevronDown, Copy, Hash, Link2, Plus, Settings, Volume2, Megaphone } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { UserPanel } from "./UserPanel";
import { ServerSettingsDialog } from "./ServerSettingsDialog";
import { useParams } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "./ui/dropdown-menu";
const iconFor = (type) => type === "voice" ? Volume2 : type === "announcement" ? Megaphone : Hash;
export const ChannelSidebar = () => {
    const { servers, activeServerId, activeChannelId, setActiveChannelId, setLeftPanelOpen, unreadCounts, selfId } = useChat();
    const { serverId: routeServerId } = useParams();
    const server = servers.find((item) => item.id === routeServerId) || servers.find((item) => item.id === activeServerId);
    const [collapsed, setCollapsed] = useState({});
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState("overview");
    if (!server)
        return null;
    const isOwner = server.ownerId === selfId || Boolean(server.permissions?.isOwner);
    const canManageServer = isOwner || Boolean(server.permissions?.canManageServer);
    const canManageChannels = isOwner || Boolean(server.permissions?.canManageChannels);
    const canManageRoles = isOwner || Boolean(server.permissions?.canManageRoles);
    const canOpenSettings = canManageServer || canManageChannels || canManageRoles;
    const copyServerLink = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/server/${server.id}`);
        toast.success("Server link copied");
    };
    return (<aside className="flex h-full w-full shrink-0 flex-col bg-sidebar sm:w-64">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4 pr-14 shadow-sm sm:pr-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-semibold text-sidebar-accent-foreground">{server.name}</h2>
          <p className="truncate text-xs text-sidebar-foreground/70">{server.memberIds.length} members</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Server menu">
              <ChevronDown className="h-4 w-4"/>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {canManageServer && (<DropdownMenuItem onClick={() => { setSettingsTab("invites"); setSettingsOpen(true); }}>
                <Link2 className="mr-2 h-4 w-4"/>
                Invite People
              </DropdownMenuItem>)}
            <DropdownMenuItem onClick={copyServerLink}>
              <Copy className="mr-2 h-4 w-4"/>
              Copy Server Link
            </DropdownMenuItem>
            {canOpenSettings && (<>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4"/>
                  Server Settings
                </DropdownMenuItem>
              </>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {server.categories.map(cat => {
            const isCollapsed = collapsed[cat.id];
            return (<div key={cat.id} className="mb-4">
              <button onClick={() => setCollapsed(s => ({ ...s, [cat.id]: !s[cat.id] }))} className="group flex w-full items-center justify-between px-1 py-1 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground hover:text-sidebar-accent-foreground">
                <span className="flex items-center gap-1">
                  <ChevronDown className={cn("h-3 w-3 transition-transform", isCollapsed && "-rotate-90")}/>
                  {cat.name}
                </span>
                <Plus className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"/>
              </button>

              <AnimatePresence initial={false}>
                {!isCollapsed && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-1 space-y-0.5 overflow-hidden">
                    {cat.channels.map(ch => {
                        const Icon = iconFor(ch.type);
                        const active = ch.id === activeChannelId;
                        const unread = unreadCounts[ch.id] || 0;
                        return (<button key={ch.id} onClick={() => {
                                if (ch.type === "voice")
                                    return;
                                setActiveChannelId(ch.id);
                                setLeftPanelOpen(false);
                            }} className={cn("group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors min-h-[40px]", active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
                          <Icon className="h-4 w-4 shrink-0 opacity-70"/>
                          <span className="truncate">{ch.name}</span>
                          {unread > 0 && (<span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                              {unread}
                            </span>)}
                        </button>);
                    })}
                  </motion.div>)}
              </AnimatePresence>
            </div>);
        })}
      </nav>

      <UserPanel />
      {canOpenSettings && (<ServerSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} server={server} initialTab={settingsTab}/>)}
    </aside>);
};
