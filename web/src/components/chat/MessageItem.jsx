import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { ProfilePopover } from "@/components/ProfilePopover";
import { InviteConfirmDialog } from "@/components/chat/InviteConfirmDialog";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { extractInviteCode } from "@/lib/invites";
import { cn } from "@/lib/utils";
const EMOJIS = ["👍", "🔥", "❤️", "😂", "🎉", "👀"];
const URL_RE = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
const resolveInviteCodeFromHref = (href) => {
    try {
        const url = new URL(href, window.location.origin);
        const isExplicitInvitePath = /^\/invite\/[a-z0-9-]+$/i.test(url.pathname);
        const isLocalVanityPath = url.hostname === window.location.hostname && /^\/[a-z0-9-]+$/i.test(url.pathname);
        if (!isExplicitInvitePath && !isLocalVanityPath)
            return "";
        return extractInviteCode(url.href);
    }
    catch {
        return "";
    }
};
const normalizeComparableUrl = (value) => {
    if (!value)
        return "";
    const candidate = /^(https?:\/\/)/i.test(value) ? value : `https://${value}`;
    try {
        const url = new URL(candidate);
        return url.href.replace(/\/$/, "");
    }
    catch {
        return candidate.replace(/\/$/, "");
    }
};
const renderContent = (content, embeds, onInviteClick) => {
    const embeddedUrls = new Set((embeds || []).map((embed) => normalizeComparableUrl(embed.sourceUrl)));
    const parts = content.split(URL_RE);
    let hasVisibleContent = false;
    const nodes = parts.filter(Boolean).map((part, index) => {
        const isUrl = /^(https?:\/\/|www\.)/i.test(part);
        if (!isUrl) {
            if (part.trim())
                hasVisibleContent = true;
            return <span key={`${part}-${index}`}>{part}</span>;
        }
        if (embeddedUrls.has(normalizeComparableUrl(part)))
            return null;
        const href = part.startsWith("http") ? part : `https://${part}`;
        const inviteCode = resolveInviteCodeFromHref(href);
        hasVisibleContent = true;
        return (<a key={`${href}-${index}`} href={href} target={inviteCode ? undefined : "_blank"} rel={inviteCode ? undefined : "noreferrer"} onClick={(event) => {
                if (!inviteCode)
                    return;
                event.preventDefault();
                onInviteClick(inviteCode);
            }} className="break-all text-primary underline underline-offset-2 hover:opacity-80">
        {part}
      </a>);
    });
    return { nodes, hasVisibleContent };
};
const renderEmbeds = (embeds = []) => {
    return embeds.map((embed) => {
        if (embed.type === "gif" && embed.imageUrl) {
            return (<a key={`${embed.sourceUrl}-${embed.imageUrl}`} href={embed.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-border bg-surface-2 transition-opacity hover:opacity-95">
              <img src={embed.imageUrl} alt={embed.title || "GIF embed"} className="max-h-[24rem] w-full object-cover"/>
            </a>);
        }
        return (<a key={`${embed.sourceUrl}-${embed.url}`} href={embed.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-border bg-surface-2 transition-colors hover:border-primary/40">
            {embed.imageUrl && <img src={embed.imageUrl} alt={embed.title || embed.siteName || "Link preview"} className="max-h-64 w-full object-cover"/>}
            <div className="flex flex-col gap-1 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{embed.siteName || "Preview"}</p>
              {embed.title && <p className="line-clamp-2 text-sm font-semibold text-foreground">{embed.title}</p>}
              {embed.description && <p className="line-clamp-3 text-sm text-muted-foreground">{embed.description}</p>}
            </div>
          </a>);
    });
};
const MessageItemImpl = ({ message: m, grouped, isSelf, selfId, onReact, onEdit, onDelete }) => {
    const { getUser, activeServerId, getMemberRoleColor, servers } = useChat();
    const author = getUser(m.authorId);
    const roleColor = m.contextType === "server" ? getMemberRoleColor(m.authorId, activeServerId) : null;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(m.content);
    const [inviteCode, setInviteCode] = useState("");
    const activeServer = useMemo(() => servers.find((server) => server.id === activeServerId), [servers, activeServerId]);
    const { nodes: contentNodes, hasVisibleContent } = renderContent(m.content, m.embeds, setInviteCode);
    const embedNodes = renderEmbeds(m.embeds);
    const canDelete = isSelf || (m.contextType === "server" && Boolean(activeServer?.permissions?.canDeleteMessages || activeServer?.permissions?.isOwner));
    const canEdit = isSelf;
    useEffect(() => {
        setDraft(m.content);
    }, [m.content]);
    const submitEdit = async () => {
        const next = draft.trim();
        if (!next || next === m.content) {
            setDraft(m.content);
            setEditing(false);
            return;
        }
        try {
            await onEdit(m.id, next);
            setEditing(false);
        }
        catch (error) {
            toast.error(error?.message || "Could not edit message");
        }
    };
    const cancelEdit = () => {
        setDraft(m.content);
        setEditing(false);
    };
    return (<motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={cn("group relative mx-2 rounded-lg px-2 py-1.5 hover:bg-surface-2/60 sm:mx-3", grouped ? "mt-0.5" : "mt-3")}>
      <div className="grid items-start grid-cols-[40px_minmax(0,1fr)] gap-3">
        <div className="flex justify-center self-start pt-0.5">
          {!grouped ? (<ProfilePopover userId={m.authorId} side="right" align="start">
              <button className="rounded-full transition-transform hover:scale-105">
                <Avatar avatar={author?.avatar ?? "👤"} name={author?.displayName} size={36}/>
              </button>
            </ProfilePopover>) : (<span className="sr-only">{format(new Date(m.createdAt), "p")}</span>)}
        </div>

        <div className="min-w-0">
          {!grouped && (<div className="mb-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <ProfilePopover userId={m.authorId} side="right" align="start">
                <button className={cn("max-w-full truncate text-left font-semibold hover:underline", !roleColor && (isSelf ? "text-primary" : "text-foreground"))} style={roleColor ? { color: `hsl(${roleColor})` } : undefined}>
                  {author?.displayName ?? "Unknown"}
                </button>
              </ProfilePopover>
              <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(m.createdAt), "p")}</span>
            </div>)}
          {editing ? (<div className="space-y-2">
              <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEdit();
                }
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitEdit();
                }
            }} className="min-h-[92px] resize-none border-border bg-surface-2 text-sm" autoFocus/>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={submitEdit} disabled={!draft.trim() || draft.trim() === m.content}>
                  <Check data-icon="inline-start"/>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X data-icon="inline-start"/>
                  Cancel
                </Button>
                <span className="text-xs text-muted-foreground">Enter to save, Shift+Enter for newline, Esc to cancel</span>
              </div>
            </div>) : (<>
              {hasVisibleContent && (<p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/95">
                  {contentNodes}
                  {m.edited && <span className="ml-1 text-[10px] text-muted-foreground">(edited)</span>}
                </p>)}
              {embedNodes.length > 0 && <div className="mt-2 flex max-w-xl flex-col gap-2">{embedNodes}</div>}
              {!hasVisibleContent && embedNodes.length > 0 && m.edited && <p className="mt-1 text-[10px] text-muted-foreground">(edited)</p>}
            </>)}
          {m.reactions && m.reactions.length > 0 && (<div className="mt-2 flex flex-wrap gap-1.5">
              {m.reactions.map(r => {
                const mine = r.userIds.includes(selfId);
                return (<button key={r.emoji} onClick={() => onReact(m.id, r.emoji)} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors", mine
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-surface-2 hover:bg-surface-3")}>
                    <span>{r.emoji}</span>
                    <span className="font-medium">{r.userIds.length}</span>
                  </button>);
            })}
            </div>)}
        </div>
      </div>

      {(canEdit || canDelete) && (<div className="absolute right-3 top-2 md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground" aria-label="More message actions">
                <MoreHorizontal className="h-4 w-4"/>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" sideOffset={6} collisionPadding={8} className="w-40">
              {canEdit && (<DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4"/>
                  Edit Message
                </DropdownMenuItem>)}
              {canDelete && (<DropdownMenuItem onClick={() => onDelete(m.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4"/>
                  Delete Message
                </DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>)}

      {/* hover toolbar (desktop only — would hijack taps on touch) */}
      <div className="absolute -top-3 right-4 hidden items-center gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-elevated group-hover:md:flex">
        {EMOJIS.slice(0, 4).map(e => (<button key={e} onClick={() => onReact(m.id, e)} className="rounded px-1.5 py-0.5 text-sm hover:bg-surface-3">{e}</button>))}
        {(canEdit || canDelete) && <div className="mx-1 h-4 w-px bg-border"/>}
        {canEdit && (<button onClick={() => setEditing(true)} className="rounded px-1.5 py-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground" aria-label="Edit message">
            <Pencil className="h-3.5 w-3.5"/>
          </button>)}
        {canDelete && (<button onClick={() => onDelete(m.id)} className="rounded px-1.5 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete message">
            <Trash2 className="h-3.5 w-3.5"/>
          </button>)}
      </div>

      <InviteConfirmDialog code={inviteCode} open={Boolean(inviteCode)} onOpenChange={(nextOpen) => !nextOpen && setInviteCode("")}/>
    </motion.div>);
};
export const MessageItem = memo(MessageItemImpl);
