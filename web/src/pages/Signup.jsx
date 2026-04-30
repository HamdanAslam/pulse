import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { DiscordAuthButton } from "@/components/DiscordAuthButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
    const { signup } = useAuth();
    const nav = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const discordError = searchParams.get("discordError");
    useEffect(() => {
        if (!discordError)
            return;
        toast({ title: "Discord signup failed", description: discordError, variant: "destructive" });
    }, [discordError, toast]);
    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signup(email, username, password);
            nav("/");
        }
        catch (err) {
            toast({ title: "Couldn't sign up", description: err?.message || "Sign up failed", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    };
    return (<AuthShell title="Create an account" subtitle="Pick a name. Pick a vibe. Start chatting." footer={<>Already have one? <Link to="/login" className="text-primary hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {discordError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{discordError}</p> : null}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}/>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</Label>
          <Input required minLength={2} value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}/>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
          <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}/>
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          {loading ? "Creating…" : "Continue"}
        </Button>
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border"/>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border"/>
        </div>
        <DiscordAuthButton returnTo="/signup">Sign up with Discord</DiscordAuthButton>
        <p className="text-center text-xs text-muted-foreground">
          By registering, you agree to Pulse's Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthShell>);
};
export default Signup;
