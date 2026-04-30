import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Avatar } from "./Avatar";
import { Button } from "./ui/button";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { MessageSquare, UserPlus, UserMinus, Clock, Check, Shield, AtSign, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SettingsDialog } from "./SettingsDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useIsMobile } from "@/hooks/useBreakpoint";
const statusLabel = {
    online: "Online",
    idle: "Idle",
    dnd: "Do Not Disturb",
    offline: "Offline",
};
const statusDot = {
    online: "bg-success",
    idle: "bg-warning",
    dnd: "bg-destructive",
    offline: "bg-muted-foreground/60",
};
/**
 * ProfilePopover — single source of truth for displaying a user's profile card.
 * Wraps any trigger element. Handles both self and other users, friend states,
 * and quick actions (DM, friend request, settings).
 */
export const ProfilePopover = ({ userId, children, side = "right", align = "start" }) => {
    const [open, setOpen] = useState(false);
    const [openSettings, setOpenSettings] = useState(false);
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const { selfId, friends, createDM, sendFriendRequest, removeFriend, acceptFriend, declineFriend, dms, getUser, servers, activeServerId, } = useChat();
    const isSelf = userId === selfId;
    const baseUser = getUser(userId);
    const user = isSelf && authUser
        ? {
            id: selfId,
            username: authUser.username,
            displayName: authUser.displayName,
            avatar: authUser.avatar,
            banner: authUser.banner,
            status: authUser.status ?? baseUser?.status ?? "online",
            bio: authUser.bio ?? baseUser?.bio,
            email: authUser.email,
        }
        : baseUser;
    if (!user)
        return <>{children}</>;
    const friendship = friends.find(f => f.userId === userId);
    const friendState = friendship?.status;
    const activeServer = servers.find((server) => server.id === activeServerId);
    const memberRoles = (activeServer?.memberRoles?.[userId] || []).filter((role) => !role.isDefault);
    const isOwner = activeServer?.ownerId === userId;
    const accentRole = memberRoles.find((role) => role.color);
    const openDM = () => {
        const existing = dms.find(d => !d.isGroup && d.participantIds.length === 2 && d.participantIds.includes(userId));
        const id = existing ? existing.id : createDM([userId]);
        setOpen(false);
        navigate(`/dm/${id}`);
    };
    const handleFriend = () => {
        if (friendState === "friend")
            removeFriend(userId);
        else if (friendState === "pending_in")
            acceptFriend(userId);
        else if (friendState === "pending_out")
            declineFriend(userId);
        else
            sendFriendRequest(user.username);
    };
    const friendBtnLabel = (() => {
        switch (friendState) {
            case "friend": return { label: "Remove Friend", icon: <UserMinus className="h-4 w-4"/>, variant: "outline" };
            case "pending_in": return { label: "Accept Request", icon: <Check className="h-4 w-4"/>, variant: "default" };
            case "pending_out": return { label: "Cancel Request", icon: <Clock className="h-4 w-4"/>, variant: "outline" };
            default: return { label: "Add Friend", icon: <UserPlus className="h-4 w-4"/>, variant: "default" };
        }
    })();
    const card = (<>
      <div className="h-16 bg-gradient-primary" style={user.banner ? {
            backgroundImage: `url(${user.banner})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        } : undefined}/>

      <div className="-mt-8 px-4">
        <div className="inline-block rounded-full ring-4 ring-popover">
          <Avatar avatar={user.avatar} name={user.displayName} size={64} status={user.status} ring/>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold" style={accentRole?.color ? { color: `hsl(${accentRole.color})` } : undefined}>
              {user.displayName}
            </h3>
            {isSelf && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">You</span>}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <AtSign className="h-3 w-3"/>
            {user.username}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[user.status])}/>
          <span className="text-xs font-medium text-foreground">{statusLabel[user.status]}</span>
        </div>

        {user.bio && (<div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">About Me</p>
            <p className="text-sm leading-snug text-foreground/90">{user.bio}</p>
          </div>)}

        {(isOwner || memberRoles.length > 0) && (<div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {isOwner && (<span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-[11px] font-medium text-warning">
                  <Crown className="h-3 w-3"/>
                  Owner
                </span>)}
              {memberRoles.map((role) => (<span key={role.id} className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-foreground">
                  <span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(${role.color || "220 80% 65%"})` }}/>
                  {role.name}
                </span>))}
            </div>
          </div>)}

        {isSelf ? (<Button size="sm" variant="outline" className="w-full" onClick={() => { setOpen(false); setOpenSettings(true); }}>
            <Shield className="mr-2 h-4 w-4"/>
            Edit Profile
          </Button>) : (<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button size="sm" variant="default" onClick={openDM}>
              <MessageSquare className="mr-1.5 h-4 w-4"/>
              Message
            </Button>
            <Button size="sm" variant={friendBtnLabel.variant} onClick={handleFriend}>
              {friendBtnLabel.icon}
              <span className="ml-1.5 truncate">{friendBtnLabel.label}</span>
            </Button>
          </div>)}
      </div>
    </>);
    return (<>
      {isMobile ? (<Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>{children}</DialogTrigger>
          <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-sm overflow-hidden rounded-2xl border p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{user.displayName} profile</DialogTitle>
              <DialogDescription>Profile details and quick actions.</DialogDescription>
            </DialogHeader>
            {card}
          </DialogContent>
        </Dialog>) : (<Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{children}</PopoverTrigger>
          <PopoverContent side={side} align={align} sideOffset={8} className="w-72 overflow-hidden rounded-xl border-border bg-popover p-0 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            {card}
          </PopoverContent>
        </Popover>)}

      {isSelf && <SettingsDialog open={openSettings} onOpenChange={setOpenSettings}/>}
    </>);
};
