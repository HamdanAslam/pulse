import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Plus, Search, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { searchGifs } from "@/services/gif.service";
import { toast } from "sonner";

const EMOJI_GROUPS = [
    {
        label: "Smileys",
        emojis: ["😀", "😁", "😂", "🤣", "😊", "😍", "🥹", "😎", "🤔", "😭", "😴", "🥳"],
    },
    {
        label: "Gestures",
        emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤟", "👀", "💪", "🤌", "🫡"],
    },
    {
        label: "Hearts",
        emojis: ["❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🤍", "🤎", "💘", "💯"],
    },
    {
        label: "Fun",
        emojis: ["🔥", "✨", "⚡", "🎉", "🎮", "🎧", "🎵", "🌈", "🌙", "☕", "🍕", "🪩"],
    },
];

export const Composer = ({ channelType, title, onSend, onTyping }) => {
    const [draft, setDraft] = useState("");
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [gifOpen, setGifOpen] = useState(false);
    const [gifQuery, setGifQuery] = useState("");
    const [gifResults, setGifResults] = useState([]);
    const [gifLoading, setGifLoading] = useState(false);
    const [gifError, setGifError] = useState("");
    const [sending, setSending] = useState(false);
    const sendingRef = useRef(false);
    const textareaRef = useRef(null);
    const gifCacheRef = useRef(new Map());
    const gifRequestRef = useRef(0);
    const insertText = (value, { closeEmoji = false, closeGif = false } = {}) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setDraft((current) => `${current}${value}`);
            if (closeEmoji)
                setEmojiOpen(false);
            if (closeGif)
                setGifOpen(false);
            onTyping();
            return;
        }
        const start = textarea.selectionStart ?? draft.length;
        const end = textarea.selectionEnd ?? draft.length;
        const nextDraft = `${draft.slice(0, start)}${value}${draft.slice(end)}`;
        setDraft(nextDraft);
        if (closeEmoji)
            setEmojiOpen(false);
        if (closeGif)
            setGifOpen(false);
        onTyping();
        queueMicrotask(() => {
            const nextCaret = start + value.length;
            textarea.focus();
            textarea.setSelectionRange(nextCaret, nextCaret);
        });
    };
    const insertEmoji = (emoji) => insertText(emoji, { closeEmoji: true });
    const sendContent = async (rawContent) => {
        const content = rawContent.trim();
        if (!content || sendingRef.current)
            return;
        sendingRef.current = true;
        setSending(true);
        try {
            await onSend(content);
            setDraft("");
        }
        catch (error) {
            toast.error(error?.message || "Could not send message");
        }
        finally {
            sendingRef.current = false;
            setSending(false);
        }
    };
    const sendGif = async (gifUrl) => {
        const nextContent = draft.trim() ? `${draft.trim()} ${gifUrl}` : gifUrl;
        setGifOpen(false);
        setGifQuery("");
        await sendContent(nextContent);
    };
    useEffect(() => {
        if (!gifOpen)
            return;
        const query = gifQuery.trim();
        if (query.length === 1) {
            setGifResults([]);
            setGifError("");
            setGifLoading(false);
            return;
        }
        const cacheKey = query.toLowerCase();
        const cached = gifCacheRef.current.get(cacheKey);
        if (cached) {
            setGifResults(cached);
            setGifError("");
            setGifLoading(false);
            return;
        }
        const timer = window.setTimeout(async () => {
            const requestId = gifRequestRef.current + 1;
            gifRequestRef.current = requestId;
            setGifLoading(true);
            setGifError("");
            try {
                const results = await searchGifs(query);
                if (gifRequestRef.current !== requestId)
                    return;
                gifCacheRef.current.set(cacheKey, results);
                setGifResults(results);
            }
            catch (error) {
                if (gifRequestRef.current !== requestId)
                    return;
                setGifError(error?.message || "Could not load GIFs");
            }
            finally {
                if (gifRequestRef.current === requestId)
                    setGifLoading(false);
            }
        }, 350);
        return () => window.clearTimeout(timer);
    }, [gifOpen, gifQuery]);
    return (<div className="px-3 sm:px-4 pt-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
      <form onSubmit={(e) => {
            e.preventDefault();
            sendContent(draft);
        }} className="flex items-end gap-2 rounded-2xl border border-border bg-surface-2 px-3 py-2 focus-within:border-primary/60 focus-within:shadow-glow transition-all">
        <button type="button" aria-label="Add attachment" className="rounded-full p-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground">
          <Plus className="h-5 w-5"/>
        </button>
        <textarea ref={textareaRef} value={draft} onChange={e => { setDraft(e.target.value); onTyping(); }} onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendContent(draft);
            }
        }} placeholder={`Message ${channelType === "text" ? "#" : ""}${title}`} rows={1} disabled={sending} className="max-h-32 sm:max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:cursor-wait"/>
        <Dialog open={gifOpen} onOpenChange={setGifOpen}>
          <DialogTrigger asChild>
            <button type="button" aria-label="Choose GIF" className="inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground">
              GIF
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-3xl border-border bg-surface-1 p-0">
            <DialogHeader className="border-b border-border px-5 py-4">
              <DialogTitle>Choose a GIF</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input value={gifQuery} onChange={(event) => setGifQuery(event.target.value)} placeholder="Search GIPHY" className="h-11 rounded-2xl border-border bg-surface-2 pl-10 pr-4"/>
              </div>
              <ScrollArea className="h-[24rem] rounded-2xl border border-border bg-surface-2">
                {gifLoading ? (<div className="flex h-full min-h-56 items-center justify-center text-sm text-muted-foreground">
                    <LoaderCircle className="animate-spin" data-icon="inline-start"/>
                    Loading GIFs
                  </div>) : gifError ? (<div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-destructive">
                    {gifError}
                  </div>) : gifResults.length === 0 ? (<div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    {gifQuery.trim().length === 1 ? "Type at least 2 characters to search." : "No GIFs found."}
                  </div>) : (<div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
                    {gifResults.map((gif) => (<button key={gif.id} type="button" onClick={() => sendGif(gif.url)} className="overflow-hidden rounded-2xl border border-border bg-background text-left transition-transform hover:scale-[1.01] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        <img src={gif.previewUrl} alt={gif.title} className="aspect-[4/3] w-full object-cover"/>
                        <div className="px-3 py-2">
                          <p className="truncate text-xs font-medium text-muted-foreground">{gif.title || "GIF"}</p>
                        </div>
                      </button>))}
                  </div>)}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Choose emoji" className="inline-flex rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground">
              <Smile className="h-5 w-5"/>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[18rem] rounded-2xl border-border bg-surface-1 p-3">
            <div className="flex flex-col gap-3">
              {EMOJI_GROUPS.map((group) => (<div key={group.label} className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-6 gap-1">
                    {group.emojis.map((emoji) => (<button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={() => insertEmoji(emoji)} className={cn("flex size-10 items-center justify-center rounded-xl text-xl transition-colors", "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40")}>
                        {emoji}
                      </button>))}
                  </div>
                </div>))}
            </div>
          </PopoverContent>
        </Popover>
        <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim() || sending} className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-40">
          <Send className="h-4 w-4"/>
        </Button>
      </form>
    </div>);
};
