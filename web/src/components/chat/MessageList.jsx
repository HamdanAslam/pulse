import { useEffect, useMemo, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { MessageItem } from "./MessageItem";
import { channelIcon } from "./channelIcon";
import { TypingIndicator } from "./TypingIndicator";
const MESSAGE_GROUP_WINDOW_MS = 5 * 60000;
const formatDay = (ts) => {
    const d = new Date(ts);
    if (isToday(d))
        return "Today";
    if (isYesterday(d))
        return "Yesterday";
    return format(d, "MMMM d, yyyy");
};
export const MessageList = ({ channelId, channelType, title, topic, messages, selfId, typers, onReact, onEdit, onDelete, }) => {
    const scrollRef = useRef(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages.length, channelId, typers.length]);
    const grouped = useMemo(() => {
        const out = [];
        messages.forEach(m => {
            const day = formatDay(m.createdAt);
            const last = out[out.length - 1];
            if (last && last.day === day)
                last.items.push(m);
            else
                out.push({ day, items: [m] });
        });
        return out;
    }, [messages]);
    const Icon = channelIcon(channelType);
    return (<div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-2">
        <div className="mb-4 sm:mb-6 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground"/>
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold">Welcome to {title}</h2>
        <p className="text-sm sm:text-base text-muted-foreground">{topic || "This is the start of the conversation."}</p>
      </div>

      {grouped.map(group => (<div key={group.day} className="px-2 sm:px-4 py-2">
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border"/>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.day}</span>
            <div className="h-px flex-1 bg-border"/>
          </div>
          <div className="space-y-1">
            {group.items.map((m, i) => {
                const prev = group.items[i - 1];
                const isGrouped = !!prev && prev.authorId === m.authorId && (m.createdAt - prev.createdAt) < MESSAGE_GROUP_WINDOW_MS;
                return (<MessageItem key={m.id} message={m} grouped={isGrouped} isSelf={m.authorId === selfId} selfId={selfId} onReact={onReact} onEdit={onEdit} onDelete={onDelete}/>);
            })}
          </div>
        </div>))}

      <TypingIndicator typers={typers}/>
    </div>);
};
