import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
const Login = () => {
    const { login } = useAuth();
    const nav = useNavigate();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            nav("/");
        }
        catch (err) {
            toast({ title: "Couldn't sign in", description: err?.message || "Sign in failed", variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    };
    return (<AuthShell title="Welcome back" subtitle="We're so excited to see you again." footer={<>New around here? <Link to="/signup" className="text-primary hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
          <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/>
          <Link to="/forgot-password" className="block text-xs text-primary hover:underline">Forgot your password?</Link>
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>
    </AuthShell>);
};
export default Login;
