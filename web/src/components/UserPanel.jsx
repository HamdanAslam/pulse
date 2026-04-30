import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "./Avatar";
import { Headphones, Mic, MicOff, Settings as SettingsIcon, VolumeX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { SettingsDialog } from "./SettingsDialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
const statusLabel = {
    online: "Online",
    idle: "Idle",
    dnd: "Do Not Disturb",
    offline: "Invisible",
};
const statusDot = {
    online: "bg-success",
    idle: "bg-warning",
    dnd: "bg-destructive",
    offline: "bg-muted-foreground/60",
};
export const UserPanel = () => {
    const { user, updateProfile } = useAuth();
    const isMobile = useIsMobile();
    const [muted, setMuted] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const currentStatus = user?.preferredStatus || user?.status || "online";
    const [status, setStatus] = useState(currentStatus);
    const [statusSaving, setStatusSaving] = useState(false);
    const [openSettings, setOpenSettings] = useState(false);
    const [openProfileMenu, setOpenProfileMenu] = useState(false);
    useEffect(() => {
        setStatus(user?.preferredStatus || user?.status || "online");
    }, [user?.preferredStatus, user?.status]);
    if (!user)
        return null;
    const setPresence = async (nextStatus) => {
        if (nextStatus === status || statusSaving)
            return;
        setStatus(nextStatus);
        setStatusSaving(true);
        try {
            await updateProfile({ status: nextStatus });
        }
        catch {
            setStatus(user?.preferredStatus || user?.status || "online");
        }
        finally {
            setStatusSaving(false);
        }
    };
    const profileTrigger = (<button className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent/60">
      <Avatar avatar={user.avatar} name={user.displayName} size={32} status={status}/>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{user.displayName}</p>
        <p className="truncate text-xs text-sidebar-foreground/80">{statusLabel[status]}</p>
      </div>
    </button>);
    const statusItems = ["online", "idle", "dnd", "offline"];
    return (<>
      <div className="-ml-[68px] flex w-[calc(100%+68px)] items-center gap-1 border-t border-sidebar-border bg-rail/95 px-2 py-2 sm:-ml-[72px] sm:w-[calc(100%+72px)]">
        {isMobile ? (<Dialog open={openProfileMenu} onOpenChange={setOpenProfileMenu}>
            <DialogTrigger asChild>{profileTrigger}</DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle className="sr-only">User menu</DialogTitle>
                <DialogDescription className="sr-only">Set your status and open user settings.</DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar avatar={user.avatar} name={user.displayName} size={40} status={status}/>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {statusItems.map((s) => (<button key={s} onClick={() => setPresence(s)} disabled={statusSaving} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-60", status === s ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface-1 text-muted-foreground")}>
                    <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[s])}/>
                    {statusLabel[s]}
                  </button>))}
              </div>
              <button onClick={() => {
                setOpenProfileMenu(false);
                setOpenSettings(true);
            }} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-1 px-4 py-3 text-sm font-medium hover:bg-surface-2">
                <SettingsIcon className="h-4 w-4"/>
                User settings
              </button>
            </DialogContent>
          </Dialog>) : (<DropdownMenu>
            <DropdownMenuTrigger asChild>{profileTrigger}</DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Avatar avatar={user.avatar} name={user.displayName} size={28}/>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusItems.map((s) => (<DropdownMenuItem key={s} onClick={() => setPresence(s)} disabled={statusSaving} className="gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[s])}/>
                  {statusLabel[s]}
                </DropdownMenuItem>))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpenSettings(true)}>
                <SettingsIcon className="mr-2 h-4 w-4"/> User settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>)}

        <PanelBtn label={muted ? "Unmute" : "Mute"} active={muted} onClick={() => setMuted(m => !m)}>
          {muted ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
        </PanelBtn>
        <PanelBtn label={deafened ? "Undeafen" : "Deafen"} active={deafened} onClick={() => setDeafened(d => !d)}>
          {deafened ? <VolumeX className="h-4 w-4"/> : <Headphones className="h-4 w-4"/>}
        </PanelBtn>
        <PanelBtn label="Settings" onClick={() => setOpenSettings(true)}>
          <SettingsIcon className="h-4 w-4"/>
        </PanelBtn>
      </div>

      <SettingsDialog open={openSettings} onOpenChange={setOpenSettings}/>
    </>);
};
const PanelBtn = ({ children, label, onClick, active }) => (<Tooltip>
    <TooltipTrigger asChild>
      <button onClick={onClick} className={cn("rounded-md p-2 transition-colors", active
        ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")} aria-label={label}>
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>);
