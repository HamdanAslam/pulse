import { useLocation } from "react-router-dom";
import { ServerRail } from "@/components/ServerRail";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import { DMSidebar } from "@/components/DMSidebar";
import { useChat } from "@/contexts/ChatContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PanelSheet } from "./PanelSheet";
/**
 * ResponsiveShell — the chrome around the active route. Three modes:
 *
 *   desktop (≥ 1024px) : ServerRail + Sidebar + <main> + (MembersPanel inline)
 *   tablet  (768-1023) : ServerRail + Sidebar + <main>; members in Sheet
 *   mobile  (< 768px)  : <main> only; rail + sidebar in left Sheet, members in right Sheet
 *
 * MembersPanel rendering stays with ServerView (it owns the member list);
 * here we only manage the *layout* slots.
 */
export const ResponsiveShell = ({ children }) => {
    const loc = useLocation();
    const inServer = loc.pathname.startsWith("/server");
    const bp = useBreakpoint();
    const isMobile = bp === "mobile";
    const { leftPanelOpen, setLeftPanelOpen } = useChat();
    const Sidebar = inServer ? ChannelSidebar : DMSidebar;
    return (<div className="flex w-full overflow-hidden bg-background" style={{ height: "100dvh" }}>
      {/* Inline rail + sidebar on tablet/desktop */}
      {!isMobile && (<>
          <ServerRail />
          <Sidebar />
        </>)}

      {/* Mobile: combined left sheet with rail + sidebar */}
      {isMobile && (<PanelSheet side="left" open={leftPanelOpen} onOpenChange={setLeftPanelOpen} breakpoint="mobile" className="!w-[320px]">
          <div className="flex h-full">
            <ServerRail />
            <div className="flex-1 min-w-0">
              <Sidebar />
            </div>
          </div>
        </PanelSheet>)}

      <main className="flex h-full min-w-0 flex-1">{children}</main>
    </div>);
};
