import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/ChatContext";
import { Sparkles } from "lucide-react";
import { ResponsiveDialog } from "@/components/layout/ResponsiveDialog";
export const CreateServerDialog = ({ open, onOpenChange }) => {
    const { createServer } = useChat();
    const [name, setName] = useState("");
    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim())
            return;
        await createServer(name.trim());
        setName("");
        onOpenChange(false);
    };
    return (<ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Create your server" description="Your server is where you and your friends hang out. Make yours and start talking.">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Sparkles className="h-6 w-6 text-primary-foreground"/>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server name</label>
          <Input autoFocus placeholder="e.g. My Awesome Place" value={name} onChange={e => setName(e.target.value)} maxLength={40}/>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={!name.trim()} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            Create
          </Button>
        </div>
      </form>
    </ResponsiveDialog>);
};
