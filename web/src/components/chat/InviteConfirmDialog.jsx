import { useEffect, useMemo, useState } from "react";
import { Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/layout/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/ChatContext";

export const InviteConfirmDialog = ({ code, open, onOpenChange }) => {
  const nav = useNavigate();
  const { resolveInvite, joinInvite, servers } = useChat();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!open || !code) {
      setInvite(null);
      setError("");
      return undefined;
    }

    setLoading(true);
    setError("");
    resolveInvite(code)
      .then((payload) => {
        if (!cancelled) setInvite(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setInvite(null);
          setError(err?.message || "Invite not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, code, resolveInvite]);

  const alreadyJoined = useMemo(
    () => Boolean(invite?.server?.id && servers.some((server) => server.id === invite.server.id)),
    [invite, servers],
  );

  const handlePrimary = async () => {
    if (!invite?.server?.id) return;

    if (alreadyJoined) {
      onOpenChange(false);
      nav(`/server/${invite.server.id}`);
      return;
    }

    setSubmitting(true);
    try {
      const server = await joinInvite(code);
      toast.success(`Joined ${server.name}`);
      onOpenChange(false);
      nav(`/server/${server.id}`);
    } catch (err) {
      setError(err?.message || "Could not join server");
      toast.error(err?.message || "Could not join server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Open Invite"
      description="Check the server details before opening the invite."
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-3">
        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        {loading && <p className="text-sm text-muted-foreground">Loading invite...</p>}

        {invite?.server && (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
            <div
              className="h-28 bg-surface-3"
              style={invite.server.banner
                ? {
                    backgroundImage: `url(${invite.server.banner})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {
                    background: `linear-gradient(135deg, hsl(${invite.server.color}), hsl(${invite.server.color} / 0.72))`,
                  }}
            />
            <div className="grid gap-4 px-4 pb-4 pt-4 sm:grid-cols-[88px_minmax(0,1fr)]">
              <div className="flex items-start justify-center sm:justify-start">
                <div className="-mt-10 flex size-[88px] items-center justify-center overflow-hidden rounded-3xl border-4 border-surface-1 bg-surface-2 text-xl font-bold text-foreground shadow-sm">
                  {invite.server.icon ? (
                    <img src={invite.server.icon} alt={`${invite.server.name} icon`} className="h-full w-full object-cover" />
                  ) : (
                    invite.server.acronym
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-foreground">{invite.server.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                    {alreadyJoined ? "Already joined" : "Invite available"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Circle className="h-2.5 w-2.5 fill-muted-foreground/70 text-muted-foreground/70" />
                    {invite.server.memberCount} members
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                <Button onClick={handlePrimary} disabled={submitting}>
                  {submitting ? "Joining..." : alreadyJoined ? "Go to Server" : "Join Server"}
                </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};
