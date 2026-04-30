import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/useBreakpoint";
/**
 * Renders a Dialog on desktop and a bottom Drawer on mobile.
 * Same surface for both, just naturally ergonomic on each form factor.
 */
export const ResponsiveDialog = ({ open, onOpenChange, title, description, children, className }) => {
    const isMobile = useIsMobile();
    const resolvedTitle = title ?? <span className="sr-only">Dialog</span>;
    const resolvedDescription = description ?? <span className="sr-only">Dialog content</span>;
    if (isMobile) {
        return (<Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={`px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ${className ?? ""}`}>
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>{resolvedTitle}</DrawerTitle>
            <DrawerDescription>{resolvedDescription}</DrawerDescription>
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>);
    }
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className ?? "sm:max-w-md max-h-[90dvh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>);
};
