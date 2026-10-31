import { useEffect, useState } from "react";
import { Icon } from "./ServeBaseIcons";

export type VolunteerTheme = "light" | "dark";
const volunteerThemeKey = "servebase-volunteer-theme";

export function useVolunteerTheme() {
  const [volunteerTheme, setVolunteerTheme] = useState<VolunteerTheme>(() => {
    try {
      return localStorage.getItem(volunteerThemeKey) === "dark"
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(volunteerThemeKey, volunteerTheme);
    } catch {
      // The preference remains available for this visit without browser storage.
    }
  }, [volunteerTheme]);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === volunteerThemeKey || event.key === null)
        setVolunteerTheme(event.newValue === "dark" ? "dark" : "light");
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  return {
    volunteerTheme,
    toggleVolunteerTheme: () =>
      setVolunteerTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}

export function VolunteerThemeToggle({
  theme,
  onToggle,
}: {
  theme: VolunteerTheme;
  onToggle: () => void;
}) {
  return (
    <button
      className="vp-theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label="Warm dark theme"
      aria-pressed={theme === "dark"}
      title={
        theme === "dark" ? "Switch to daylight" : "Switch to warm evening colors"
      }
    >
      <Icon name={theme === "dark" ? "moon" : "sun"} size={16} />
      <span>{theme === "dark" ? "Evening" : "Daylight"}</span>
    </button>
  );
}
