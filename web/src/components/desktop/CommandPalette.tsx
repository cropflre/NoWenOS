import { useEffect } from "react";
import { Command } from "cmdk";
import { useDesktopStore } from "@/stores/desktop";
import { appRegistry } from "@/apps/registry";
import { useTranslation } from "@/hooks/useTranslation";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

export function CommandPalette() {
  const t = useTranslation();
  const { commandPaletteOpen, toggleCommandPalette, openWindow } = useDesktopStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); toggleCommandPalette(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommandPalette]);

  function handleSelect(appId: string, titleKey: string) {
    const reg = appRegistry.find((a) => a.id === appId);
    openWindow(appId, t(titleKey), { width: reg?.defaultWidth, height: reg?.defaultHeight });
    toggleCommandPalette();
  }

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm" onClick={toggleCommandPalette} />
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.15 }} className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[9998] w-full max-w-lg">
            <Command className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input autoFocus placeholder={t("command.placeholder") ?? "Search applications..."} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </div>
              <Command.List className="max-h-80 overflow-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">{t("command.empty") ?? "No results found."}</Command.Empty>
                <Command.Group heading={t("command.apps") ?? "Applications"}>
                  {appRegistry.map((app) => {
                    const Icon = app.icon;
                    return (
                      <Command.Item key={app.id} value={t(app.titleKey)} onSelect={() => handleSelect(app.id, app.titleKey)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent">
                        <Icon className="h-4 w-4 text-primary" /><span>{t(app.titleKey)}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}