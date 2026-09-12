"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    localStorage.setItem("theme", next);
    const isDark =
      next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  }

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: "light", label: "Light theme", icon: "☀" },
    { value: "system", label: "System theme", icon: "◐" },
    { value: "dark", label: "Dark theme", icon: "☾" },
  ];

  return (
    <div className="segmented" role="group" aria-label="Theme">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={theme === opt.value}
          aria-label={opt.label}
          title={opt.label}
          onClick={() => apply(opt.value)}
        >
          <span aria-hidden>{opt.icon}</span>
        </button>
      ))}
    </div>
  );
}
