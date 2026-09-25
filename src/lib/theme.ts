export type Theme = "light" | "dark";

const KEY = "prep:theme";

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function writeTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}
