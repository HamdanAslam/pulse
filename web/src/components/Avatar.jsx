import { cn } from "@/lib/utils";
const map = {
    online: "bg-success",
    idle: "bg-warning",
    dnd: "bg-destructive",
    offline: "bg-muted-foreground/60",
};
export const StatusDot = ({ status, className, ring = true }) => (<span className={cn("inline-block h-3 w-3 rounded-full", map[status], ring && "ring-2 ring-background", className)} aria-label={status}/>);
const IMAGE_SOURCE_RE = /^(https?:\/\/|data:|blob:)/i;
const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (!parts.length)
        return "?";
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};
export const Avatar = ({ emoji, avatar, name, size = 40, status, ring, }) => {
    const value = avatar ?? emoji ?? "";
    const isImage = IMAGE_SOURCE_RE.test(value);
    const fallback = value && !isImage ? value : getInitials(name);
    return (<div className="relative inline-block">
      <div className="flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-surface-3 via-surface-2 to-surface-1 text-foreground select-none ring-1 ring-border/70" style={{ width: size, height: size, fontSize: size * 0.4 }}>
        {isImage ? (<img src={value} alt={name ? `${name} avatar` : "User avatar"} className="h-full w-full object-cover"/>) : (<span aria-hidden className="font-semibold">
            {fallback}
          </span>)}
      </div>
      {status && (<StatusDot status={status} ring={ring} className="absolute -bottom-0.5 -right-0.5"/>)}
    </div>);
};
