import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDiscordAuthUrl } from "@/services/auth.service";

const DiscordMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
    <path d="M20.317 4.369A19.791 19.791 0 0 0 15.885 3c-.191.328-.403.777-.552 1.125a18.27 18.27 0 0 0-5.342 0A11.774 11.774 0 0 0 9.44 3a19.736 19.736 0 0 0-4.433 1.369C2.203 8.552 1.444 12.63 1.824 16.65a19.92 19.92 0 0 0 5.433 2.731c.439-.6.83-1.236 1.166-1.902-.611-.231-1.193-.518-1.738-.851.146-.106.289-.217.428-.331 3.351 1.576 6.985 1.576 10.296 0 .14.114.282.225.428.331-.545.333-1.129.62-1.74.851.337.666.728 1.302 1.167 1.902a19.88 19.88 0 0 0 5.434-2.731c.446-4.658-.761-8.699-3.381-12.281ZM9.349 14.172c-1.002 0-1.824-.917-1.824-2.043s.806-2.043 1.824-2.043c1.026 0 1.841.925 1.824 2.043 0 1.126-.806 2.043-1.824 2.043Zm5.302 0c-1.002 0-1.824-.917-1.824-2.043s.806-2.043 1.824-2.043c1.026 0 1.841.925 1.824 2.043 0 1.126-.798 2.043-1.824 2.043Z" />
  </svg>
);

export const DiscordAuthButton = ({ returnTo, className, children = "Continue with Discord" }) => (
  <Button asChild type="button" variant="outline" className={cn("w-full gap-2 border-border/70", className)}>
    <a href={getDiscordAuthUrl(returnTo)}>
      <DiscordMark />
      {children}
    </a>
  </Button>
);
