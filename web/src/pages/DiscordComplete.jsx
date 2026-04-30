import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { completeDiscordSignup } from "@/services/auth.service";

const DiscordComplete = () => {
  const { syncUser } = useAuth();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({
        title: "Discord signup expired",
        description: "Start the Discord signup flow again.",
        variant: "destructive",
      });
    }
  }, [token, toast]);

  const submit = async (event) => {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const user = await completeDiscordSignup(token, username);
      syncUser(user);
      nav("/");
    } catch (error) {
      toast({
        title: "Couldn't finish Discord signup",
        description: error?.message || "Please try a different username.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Finish your signup"
      subtitle="Your Discord account is ready. Pick a Pulse username to continue."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {!token ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This Discord signup link is missing or expired.
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</Label>
          <Input
            required
            minLength={2}
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value.replace(/\s/g, ""))}
            placeholder="Choose your Pulse username"
            disabled={!token}
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !token}
          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
        >
          {loading ? "Finishing…" : "Complete signup"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default DiscordComplete;
