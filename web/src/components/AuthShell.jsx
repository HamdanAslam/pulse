import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
export const AuthShell = ({ title, subtitle, children, footer }) => (<div className="min-h-screen bg-background bg-aurora">
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <MessageCircle className="h-5 w-5 text-primary-foreground"/>
        </div>
        <span className="font-display text-2xl font-bold">Pulse</span>
      </Link>
      <div className="glass w-full max-w-md rounded-2xl p-8 shadow-elevated animate-fade-in-up">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      </div>
    </div>
  </div>);
