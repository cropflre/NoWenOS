import { useDesktopStore } from "@/stores/desktop";
import { appRegistry } from "@/apps/registry";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const DOCK_IDS = ["dashboard", "files", "docker", "storage", "users", "settings", "recycle"];

export function Dock() {
  const t = useTranslation();
  const { windows, openWindow, focusWindow, activeWindowId } = useDesktopStore();

  function handleClick(appId: string, titleKey: string) {
    const existing = windows.find((w) => w.appId === appId);
    if (existing) {
      focusWindow(existing.id);
    } else {
      const reg = appRegistry.find((a) => a.id === appId);
      openWindow(appId, t(titleKey), { width: reg?.defaultWidth, height: reg?.defaultHeight });
    }
  }

  const dockApps = appRegistry.filter((a) => DOCK_IDS.includes(a.id));

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9998] flex items-end gap-1 rounded-2xl border border-border bg-background/80 backdrop-blur-xl px-2 py-1.5 shadow-lg">
      {dockApps.map((app) => {
        const isOpen = windows.some((w) => w.appId === app.id && !w.minimized);
        const isActive = windows.some((w) => w.appId === app.id && w.id === activeWindowId);
        const Icon = app.icon;
        return (
          <motion.button
            key={app.id}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick(app.id, app.titleKey)}
            className={cn("group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors", isActive ? "bg-primary/15 text-primary" : isOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
            title={t(app.titleKey)}
          >
            <Icon className="h-5 w-5" />
            {isOpen && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />}
          </motion.button>
        );
      })}
    </div>
  );
}
