import { AnimatePresence } from "framer-motion";
import { useDesktopStore } from "@/stores/desktop";
import { TopBar } from "./TopBar";
import { Window } from "./Window";
import { Dock } from "./Dock";
import { AppLauncher } from "./AppLauncher";
import { CommandPalette } from "./CommandPalette";

export function Desktop() {
  const windows = useDesktopStore((s) => s.windows);
  return (
    <div className="fixed inset-0 overflow-hidden bg-grid">
      <TopBar />
      <div className="absolute inset-0 top-10">
        <AnimatePresence>
          {windows.map((win) => <Window key={win.id} window={win} />)}
        </AnimatePresence>
      </div>
      <Dock />
      <AppLauncher />
      <CommandPalette />
    </div>
  );
}
