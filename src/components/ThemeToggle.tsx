import { useEffect, useState } from "react";
import { applyTheme, readTheme, writeTheme, type Theme } from "../lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = readTheme();
    setTheme(current);
    applyTheme(current);
  }, []);

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        writeTheme(next);
        setTheme(next);
      }}
    >
      {next === "light" ? "Light" : "Dark"}
    </button>
  );
}
