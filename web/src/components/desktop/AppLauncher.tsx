import { useDesktopStore } from "@/stores/desktop";
import { appRegistry } from "@/apps/registry";
import { useTranslation } from "@/hooks/useTranslation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function AppLauncher() {
  const t = useTranslation();
  const { appLauncherOpen, toggleAppLauncher, openWindow } = useDesktopStore();

  function handleOpen(appId: string, titleKey: string) {
    const reg = appRegistry.find((a) => a.id === appId);
    openWindow(appId, t(titleKey), { width: reg?.defaultWidth, height: reg?.defaultHeight });
    toggleAppLauncher();
  }

  return (
    <AnimatePresence>
      {appLauncherOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm" onClick={toggleAppLauncher} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-20 z-[9998] mx-auto max-w-xl rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t("launcher.title") ?? "Applications"}</h3>
            <div className="grid grid-cols-5 gap-3">
              {appRegistry.map((app) => {
                const Icon = app.icon;
                return (
                  <button key={app.id} onClick={() => handleOpen(app.id, app.titleKey)} className={cn("flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-accent")}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                    <span className="text-xs text-foreground">{t(app.titleKey)}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}