import { useChat } from "@/contexts/ChatContext";
export const TypingIndicator = ({ typers }) => {
    const { getUser } = useChat();
    const names = typers.map((item) => getUser(item.userId)?.displayName).filter(Boolean);
    if (!names.length)
        return <div className="h-6"/>;
    return (<div className="flex items-center gap-2 px-4 sm:px-6 pb-2 text-sm text-muted-foreground">
      <span className="inline-flex items-end gap-0.5">
        <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
      </span>
      <span className="truncate">
        <strong className="text-foreground">{names.slice(0, 2).join(", ")}</strong>
        {names.length > 2 ? ` and ${names.length - 2} others are typing…` : names.length > 1 ? " are typing…" : " is typing…"}
      </span>
    </div>);
};
