import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
const setWidth = (w) => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: w });
    window.dispatchEvent(new Event("resize"));
};
describe("useBreakpoint", () => {
    it("reports mobile / tablet / desktop based on innerWidth", () => {
        const { result } = renderHook(() => useBreakpoint());
        act(() => setWidth(360));
        expect(result.current).toBe("mobile");
        act(() => setWidth(900));
        expect(result.current).toBe("tablet");
        act(() => setWidth(1280));
        expect(result.current).toBe("desktop");
    });
});
