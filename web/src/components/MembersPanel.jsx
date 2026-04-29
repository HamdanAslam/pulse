import { Avatar } from "./Avatar";
import { ProfilePopover } from "./ProfilePopover";
import { cn } from "@/lib/utils";
import { useChat } from "@/contexts/ChatContext";
import { Crown } from "lucide-react";
export const MembersPanel = ({ memberIds, serverId, ownerId, forceVisible = false, }) => {
    const { getUser, getMemberRoleColor } = useChat();
    const members = memberIds.map(getUser).filter(Boolean);
    const groups = {
        Online: members.filter(m => m.status === "online"),
        Idle: members.filter(m => m.status === "idle"),
        "Do Not Disturb": members.filter(m => m.status === "dnd"),
        Offline: members.filter(m => m.status === "offline"),
    };
    return (<aside className={cn("h-full w-full lg:w-60 flex-col bg-surface-1 lg:border-l lg:border-border", forceVisible ? "flex" : "hidden lg:flex")}>
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {Object.entries(groups).map(([label, list]) => (list.length > 0 && (<div key={label} className="mb-4">
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {label} — {list.length}
              </p>
              <div className="space-y-0.5">
                {list.map((m) => {
                const roleColor = getMemberRoleColor(m.id, serverId);
                return (<ProfilePopover key={m.id} userId={m.id} side="left" align="start">
                      <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-2">
                        <Avatar avatar={m.avatar} name={m.displayName} size={32} status={m.status}/>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium" style={roleColor ? { color: `hsl(${roleColor})` } : undefined}>
                              {m.displayName}
                            </p>
                            {m.id === ownerId && <Crown className="h-3.5 w-3.5 shrink-0 text-warning"/>}
                          </div>
                          {m.bio && m.status !== "offline" && (<p className="truncate text-xs text-muted-foreground">{m.bio}</p>)}
                        </div>
                      </button>
                    </ProfilePopover>);
            })}
              </div>
            </div>)))}
      </div>
    </aside>);
};
