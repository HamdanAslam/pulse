import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
const Signup = () => {
    const { signup } = useAuth();
    const nav = useNavigate();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
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
        <p className="text-center text-xs text-muted-foreground">
          By registering, you agree to Pulse's Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthShell>);
};
export default Signup;
