import { useSyncExternalStore } from "react";

/**
 * Tiny theme store with localStorage persistence.
 *
 * Lives outside Zustand because it owns a side effect (toggling a class on
 * <html>) and it's simpler to keep the DOM mutation and storage adjacent.
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "httpviz.theme";

const readInitial = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* noop */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "dark";
};

let current: Theme = typeof window === "undefined" ? "dark" : readInitial();
const listeners = new Set<() => void>();

const applyToDom = (theme: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
};

// Ensure DOM matches the resolved initial value (the inline pre-hydration script
// may have set `dark` based on system prefs; if we stored "light", flip it).
if (typeof document !== "undefined") applyToDom(current);

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => current;

export const setTheme = (next: Theme) => {
  if (current === next) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* noop */
  }
  applyToDom(next);
  listeners.forEach((cb) => cb());
};

export const useTheme = (): [Theme, (next: Theme) => void] => {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [theme, setTheme];
};

export const toggleTheme = () => setTheme(current === "dark" ? "light" : "dark");
