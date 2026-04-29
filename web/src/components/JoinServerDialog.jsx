import { useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/layout/ResponsiveDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/ChatContext";
import { extractInviteCode } from "@/lib/invites";

export const JoinServerDialog = ({ open, onOpenChange }) => {
  const nav = useNavigate();
  const { resolveInvite, joinInvite } = useChat();
  const [input, setInput] = useState("");
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const code = useMemo(() => extractInviteCode(input), [input]);

  const handleResolve = async () => {
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const payload = await resolveInvite(code);
      setInvite(payload);
    } catch (err) {
      setInvite(null);
      setError(err?.message || "Invite not found");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    setError("");
    try {
      const server = await joinInvite(code);
      toast.success("Joined server");
      setInput("");
      setInvite(null);
      onOpenChange(false);
      nav(`/server/${server.id}`);
    } catch (err) {
      setError(err?.message || "Could not join server");
    } finally {
      setJoining(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Join a Server"
      description="Paste an invite link or just the code."
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="discord.gg/example or pulse-dev"
          />
          <Button onClick={handleResolve} disabled={!code || loading}>
            {loading ? "Checking..." : "Check"}
          </Button>
        </div>

        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        {invite && (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
            <div
              className="h-24 bg-surface-3"
              style={invite.server.banner ? { backgroundImage: `url(${invite.server.banner})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: `linear-gradient(135deg, hsl(${invite.server.color}), hsl(${invite.server.color} / 0.72))` }}
            />
            <div className="-mt-8 px-4 pb-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface-1 bg-surface-2 text-lg font-bold text-foreground">
                {invite.server.icon ? (
                  <img src={invite.server.icon} alt={`${invite.server.name} icon`} className="h-full w-full object-cover" />
                ) : (
                  invite.server.acronym
                )}
              </div>
              <p className="mt-3 font-semibold">{invite.server.name}</p>
              <p className="text-sm text-muted-foreground">{invite.server.memberCount} members</p>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invite Code</p>
                  <p className="text-sm font-medium">{invite.code}</p>
                </div>
                <Button onClick={handleJoin} disabled={joining}>
                  <Link2 data-icon="inline-start" />
                  {joining ? "Joining..." : "Join"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};
