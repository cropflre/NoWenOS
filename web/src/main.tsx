import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@/styles/globals.css";

// Apply stored theme before render to prevent flash
(function applyStoredTheme() {
  try {
    const stored = localStorage.getItem("nowenos-theme");
    if (stored) {
      const parsed = JSON.parse(stored);
      const theme = parsed?.state?.theme;
      if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.classList.add("dark");
      }
    }
  } catch {
    // ignore
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
