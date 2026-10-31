import { useEffect, useState } from "react";
import { Icon } from "./ServeBaseIcons";

export type Theme = "dark" | "light";
const themeKey = "servebase-theme";
export function useServeBaseTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem(themeKey) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.servebaseTheme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#1D1018" : "#F8FAFC");
    try {
      localStorage.setItem(themeKey, theme);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  }, [theme]);
  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === themeKey)
        setTheme(event.newValue === "light" ? "light" : "dark");
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);
  return {
    theme,
    toggleTheme: () =>
      setTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}
export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  return (
    <button
      className="sb-theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
