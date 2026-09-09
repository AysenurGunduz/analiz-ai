"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/** FOUC engelleyen inline script — <body> başına konur, React hydrate olmadan çalışır. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('reqtostory:theme');if(t!=='light'&&t!=='dark'){t='light'}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("reqtostory:theme", next);
    } catch {
      /* private mode */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted transition hover:border-line-strong hover:text-ink"
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
