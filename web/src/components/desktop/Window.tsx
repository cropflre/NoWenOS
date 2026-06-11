import { useRef, Suspense } from "react";
import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
import { useDesktopStore, type WindowState } from "@/stores/desktop";
import { getAppById } from "@/apps/registry";
import { Button } from "@/components/ui/button";
import { Minus, Square, X, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface WindowProps { window: WindowState }

const TOP_BAR_H = 40;

export function Window({ window: win }: WindowProps) {
  const rndRef = useRef<Rnd>(null);
  const { closeWindow, focusWindow, minimizeWindow, toggleMaximizeWindow, updateWindowPosition, updateWindowSize, activeWindowId } = useDesktopStore();
  const app = getAppById(win.appId);
  if (!app || win.minimized) return null;

  const AppComp = app.component;
  const isActive = activeWindowId === win.id;

  const titleBar = (
    <div className={cn("flex h-9 items-center justify-between border-b px-3 shrink-0 select-none", isActive ? "bg-card border-border" : "bg-muted/50 border-transparent")}>
      <div className="flex items-center gap-2 pointer-events-none">
        <app.icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{win.title}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="nowenos-window-btn h-6 w-6 p-0" onClick={() => minimizeWindow(win.id)}><Minus className="h-3 w-3" /></Button>
        <Button variant="ghost" size="sm" className="nowenos-window-btn h-6 w-6 p-0" onClick={() => toggleMaximizeWindow(win.id)}>{win.maximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}</Button>
        <Button variant="ghost" size="sm" className="nowenos-window-btn h-6 w-6 p-0 hover:text-danger" onClick={() => closeWindow(win.id)}><X className="h-3 w-3" /></Button>
      </div>
    </div>
  );

  const content = (
    <div className="flex-1 overflow-auto">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>}>
        <AppComp />
      </Suspense>
    </div>
  );

  if (win.maximized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed flex flex-col bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
        style={{ top: TOP_BAR_H, left: 0, right: 0, bottom: 0, zIndex: win.zIndex }}
        onMouseDown={() => focusWindow(win.id)}
      >
        {titleBar}{content}
      </motion.div>
    );
  }

  return (
    <Rnd
      ref={rndRef}
      size={{ width: win.width, height: win.height }}
      position={{ x: win.x, y: win.y }}
      minWidth={400} minHeight={300}
      bounds="parent"
      dragHandleClassName="nowenos-window-title"
      onMouseDown={() => focusWindow(win.id)}
      onDragStop={(_e, d) => updateWindowPosition(win.id, d.x, d.y)}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        updateWindowSize(win.id, parseInt(ref.style.width), parseInt(ref.style.height));
        updateWindowPosition(win.id, pos.x, pos.y);
      }}
      style={{ zIndex: win.zIndex }}
      cancel=".nowenos-window-btn"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={cn("flex flex-col h-full bg-card border rounded-lg shadow-2xl overflow-hidden", isActive ? "border-primary/30" : "border-border")}
      >
        <div className="nowenos-window-title">{titleBar}</div>
        {content}
      </motion.div>
    </Rnd>
  );
}
