import { createContext, useContext, useEffect, useState } from "react";
const Ctx = createContext(null);
const THEMES = [
    { id: "midnight", label: "Midnight", description: "Deep indigo · default", swatch: "linear-gradient(135deg,#7c5cff,#b46bff)" },
    { id: "aurora", label: "Aurora", description: "Teal & violet glow", swatch: "linear-gradient(135deg,#2bd4b0,#3ec1ff)" },
    { id: "sunset", label: "Sunset", description: "Warm amber & rose", swatch: "linear-gradient(135deg,#ff7a3d,#f0457e)" },
    { id: "paper", label: "Paper", description: "Bright daytime", swatch: "linear-gradient(135deg,#f5f1e6,#e9e3d0)" },
];
export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem("pulse-theme") : null;
        return saved && THEMES.some(t => t.id === saved) ? saved : "midnight";
    });
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.classList.toggle("dark", theme !== "paper");
        localStorage.setItem("pulse-theme", theme);
    }, [theme]);
    return (<Ctx.Provider value={{ theme, setTheme: setThemeState, themes: THEMES }}>
      {children}
    </Ctx.Provider>);
};
export const useTheme = () => {
    const v = useContext(Ctx);
    if (!v)
        throw new Error("useTheme must be inside ThemeProvider");
    return v;
};
