import { useEffect, useState } from "react";
const MOBILE_MAX = 768;
const TABLET_MAX = 1024;
const compute = (w) => w < MOBILE_MAX ? "mobile" : w < TABLET_MAX ? "tablet" : "desktop";
export function useBreakpoint() {
    const [bp, setBp] = useState(() => typeof window === "undefined" ? "desktop" : compute(window.innerWidth));
    useEffect(() => {
        const onResize = () => setBp(compute(window.innerWidth));
        window.addEventListener("resize", onResize);
        onResize();
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return bp;
}
export const useIsMobile = () => useBreakpoint() === "mobile";
export const useIsTabletOrBelow = () => useBreakpoint() !== "desktop";
