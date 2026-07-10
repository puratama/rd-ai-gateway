"use client";

import { useState, useEffect, useCallback, startTransition } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      startTransition(() => {
        setTheme(stored);
      });
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  return { theme, toggleTheme, mounted };
}
