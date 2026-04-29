import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
const ForgotPassword = () => {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await resetPassword(email);
        setLoading(false);
        setSent(true);
    };
    return (<AuthShell title="Forgot password?" subtitle="We'll send a reset link to your email." footer={<Link to="/login" className="text-primary hover:underline">Back to login</Link>}>
      {sent ? (<div className="rounded-lg bg-success/15 p-4 text-sm text-foreground">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
        </div>) : (<form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}/>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>)}
    </AuthShell>);
};
export default ForgotPassword;
