"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "smartcharge:theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" ? "light" : "dark";
  });

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, next);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-surface-1/50 px-3 py-2.5 text-text-secondary transition hover:border-accent-primary/40 hover:bg-white/5 hover:text-white"
      aria-label="Tema degistir"
      title="Tema degistir"
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-amber-400" />
      ) : (
        <Moon size={18} className="text-accent-primary" />
      )}
      <span className="hidden lg:block text-sm font-medium">
        {theme === "dark" ? "Açık Tema" : "Koyu Tema"}
      </span>
    </button>
  );
}
