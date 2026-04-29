import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile, useIsTabletOrBelow } from "@/hooks/useBreakpoint";
/**
 * Renders panel children inline on desktop, in a slide-in Sheet on smaller
 * viewports. The `breakpoint` controls the threshold:
 *  - "tablet"  → inline ≥ 1024px, sheet below
 *  - "mobile"  → inline ≥ 768px,  sheet below
 */
export const PanelSheet = ({ children, side, open, onOpenChange, breakpoint = "mobile", className, inlineClassName, }) => {
    const isMobile = useIsMobile();
    const isTabletOrBelow = useIsTabletOrBelow();
    const useSheet = breakpoint === "tablet" ? isTabletOrBelow : isMobile;
    if (useSheet) {
        return (<Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={side} className={`w-[280px] max-w-[85vw] p-0 border-0 ${className ?? ""}`}>
          {children}
        </SheetContent>
      </Sheet>);
    }
    return <div className={inlineClassName}>{children}</div>;
};
