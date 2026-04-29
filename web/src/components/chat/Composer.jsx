import { useState } from "react";
import { Plus, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export const Composer = ({ channelType, title, onSend, onTyping }) => {
    const [draft, setDraft] = useState("");
    const submit = async (e) => {
        e.preventDefault();
        if (!draft.trim())
            return;
        try {
            await onSend(draft);
            setDraft("");
        }
        catch (error) {
            toast.error(error?.message || "Could not send message");
        }
    };
    return (<div className="px-3 sm:px-4 pt-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
      <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-border bg-surface-2 px-3 py-2 focus-within:border-primary/60 focus-within:shadow-glow transition-all">
        <button type="button" aria-label="Add attachment" className="rounded-full p-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground">
          <Plus className="h-5 w-5"/>
        </button>
        <textarea value={draft} onChange={e => { setDraft(e.target.value); onTyping(); }} onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e);
            }
        }} placeholder={`Message ${channelType === "text" ? "#" : ""}${title}`} rows={1} className="max-h-32 sm:max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"/>
        <button type="button" aria-label="Emoji" className="hidden sm:inline-flex rounded-full p-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground">
          <Smile className="h-5 w-5"/>
        </button>
        <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim()} className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
          <Send className="h-4 w-4"/>
        </Button>
      </form>
    </div>);
};
