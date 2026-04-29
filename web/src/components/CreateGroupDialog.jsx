import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/ChatContext";
import { Avatar } from "./Avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveDialog } from "@/components/layout/ResponsiveDialog";
export const CreateGroupDialog = ({ open, onOpenChange }) => {
    const { friends, createDM, getUser } = useChat();
    const friendList = friends
        .filter((friend) => friend.status === "friend")
        .map((friend) => getUser(friend.userId))
        .filter(Boolean);
    const [selected, setSelected] = useState([]);
    const [name, setName] = useState("");
    const toggle = (id) => setSelected((state) => (state.includes(id) ? state.filter((item) => item !== id) : [...state, id]));
    const submit = async () => {
        if (!selected.length)
            return;
        await createDM(selected, selected.length > 1 ? (name.trim() || "New Group") : undefined);
        setSelected([]);
        setName("");
        onOpenChange(false);
    };
    return (<ResponsiveDialog open={open} onOpenChange={onOpenChange} title={<span className="font-display">Select friends</span>} description="You can add up to 9 friends. Pick 2+ to create a group.">
      {selected.length > 1 && (<Input className="mt-2" placeholder="Group name (optional)" value={name} onChange={e => setName(e.target.value)}/>)}

      <div className="mt-3 max-h-[50vh] sm:max-h-72 overflow-y-auto scrollbar-thin -mx-2">
        {friendList.map(u => {
            const on = selected.includes(u.id);
            return (<button key={u.id} onClick={() => toggle(u.id)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2 min-h-[48px]">
              <Avatar avatar={u.avatar} name={u.displayName} size={32} status={u.status}/>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-sm font-medium">{u.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <div className={cn("flex h-5 w-5 items-center justify-center rounded border-2 shrink-0", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                {on && <Check className="h-3 w-3"/>}
              </div>
            </button>);
        })}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={!selected.length} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
          {selected.length > 1 ? "Create Group" : "Open DM"}
        </Button>
      </div>
    </ResponsiveDialog>);
};
