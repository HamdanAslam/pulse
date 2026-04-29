import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/ChatContext";

const InviteAccept = () => {
  const { code } = useParams();
  const { resolveInvite, joinInvite } = useChat();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    resolveInvite(code)
      .then((payload) => {
        setInvite(payload);
        setError("");
      })
      .catch((err) => setError(err?.message || "Invite not found"))
      .finally(() => setLoading(false));
  }, [code, resolveInvite]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    try {
      await joinInvite(code);
    } catch (err) {
      setError(err?.message || "Could not join server");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">Loading invite...</div>;
  }

  return (
    <div className="flex h-full flex-1 items-center justify-center bg-surface-1 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-2 p-6 shadow-elevated">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server Invite</p>
        <h1 className="mt-2 font-display text-2xl font-bold">{invite?.server?.name || "Invite"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join this server to access its channels and members.
        </p>
        {error && <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Invite Code</p>
            <p className="text-xs text-muted-foreground">{invite?.code}</p>
          </div>
          <Button onClick={handleJoin} disabled={joining || Boolean(error)}>
            {joining ? "Joining..." : "Join Server"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;
