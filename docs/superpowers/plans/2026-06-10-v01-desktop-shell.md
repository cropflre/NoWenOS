# NoWenOS v0.1 Desktop Shell Alpha

> **Worker instructions:** Required sub-skill: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Track progress with checkboxes (`- [ ]`).
>
> **Goal:** Upgrade NoWenOS from "admin panel" to "browser-based Web Desktop OS" with a desktop shell, window manager, Dock, TopBar, and app launcher.
>
> **Architecture:** Keep all existing feature modules (Dashboard, Storage, Files, Docker, etc.) and wrap them as "system apps" that open in independent windows. Add a Desktop Shell layer (TopBar + Desktop + Dock + WindowManager + AppLauncher). Switch from page routing to app-window mode.
>
> **Tech stack:** React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Zustand + TanStack Query + framer-motion + react-rnd + cmdk

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install desktop shell dependencies**

```bash
cd web
npm install framer-motion react-rnd cmdk
```

- [ ] **Step 2: Verify build passes**

```bash
cd web
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "chore: add framer-motion, react-rnd, cmdk for desktop shell"
```

---

## Task 2: Create Desktop State Store (Zustand)

**Files:**
- Create: `web/src/stores/desktop.ts`

- [ ] **Step 1: Create desktop store**

```typescript
// web/src/stores/desktop.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

interface DesktopState {
  windows: WindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
  appLauncherOpen: boolean;
  commandPaletteOpen: boolean;

  openWindow: (appId: string, title: string, defaults?: Partial<Pick<WindowState, "x" | "y" | "width" | "height">>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
  toggleAppLauncher: () => void;
  toggleCommandPalette: () => void;
}

const DEFAULT_W = 900;
const DEFAULT_H = 600;

function defaultPos(count: number) {
  const offset = count * 30;
  return {
    x: Math.min(120 + offset, (typeof window !== "undefined" ? window.innerWidth : 1200) - DEFAULT_W),
    y: Math.min(80 + offset, (typeof window !== "undefined" ? window.innerHeight : 800) - DEFAULT_H),
  };
}

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      windows: [],
      activeWindowId: null,
      nextZIndex: 10,
      appLauncherOpen: false,
      commandPaletteOpen: false,

      openWindow: (appId, title, defaults) => {
        const existing = get().windows.find((w) => w.appId === appId && !w.minimized);
        if (existing) { get().focusWindow(existing.id); return; }
        const minimized = get().windows.find((w) => w.appId === appId && w.minimized);
        if (minimized) {
          set((s) => ({ windows: s.windows.map((w) => w.id === minimized.id ? { ...w, minimized: false } : w) }));
          get().focusWindow(minimized.id);
          return;
        }
        const pos = defaults ?? defaultPos(get().windows.length);
        const z = get().nextZIndex;
        const nw: WindowState = {
          id: `${appId}-${Date.now()}`, appId, title,
          x: pos.x ?? 120, y: pos.y ?? 80,
          width: defaults?.width ?? DEFAULT_W, height: defaults?.height ?? DEFAULT_H,
          minimized: false, maximized: false, zIndex: z,
        };
        set((s) => ({ windows: [...s.windows, nw], activeWindowId: nw.id, nextZIndex: z + 1, appLauncherOpen: false, commandPaletteOpen: false }));
      },

      closeWindow: (id) => set((s) => {
        const remaining = s.windows.filter((w) => w.id !== id);
        return { windows: remaining, activeWindowId: s.activeWindowId === id ? remaining.filter((w) => !w.minimized).sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null : s.activeWindowId };
      }),

      focusWindow: (id) => set((s) => {
        const z = s.nextZIndex;
        return { windows: s.windows.map((w) => w.id === id ? { ...w, zIndex: z, minimized: false } : w), activeWindowId: id, nextZIndex: z + 1 };
      }),

      minimizeWindow: (id) => set((s) => ({
        windows: s.windows.map((w) => w.id === id ? { ...w, minimized: true } : w),
        activeWindowId: s.activeWindowId === id ? s.windows.filter((w) => w.id !== id && !w.minimized).sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null : s.activeWindowId,
      })),

      toggleMaximizeWindow: (id) => set((s) => ({
        windows: s.windows.map((w) => w.id === id ? { ...w, maximized: !w.maximized } : w),
      })),

      updateWindowPosition: (id, x, y) => set((s) => ({
        windows: s.windows.map((w) => w.id === id ? { ...w, x, y } : w),
      })),

      updateWindowSize: (id, width, height) => set((s) => ({
        windows: s.windows.map((w) => w.id === id ? { ...w, width, height } : w),
      })),

      toggleAppLauncher: () => set((s) => ({ appLauncherOpen: !s.appLauncherOpen, commandPaletteOpen: false })),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen, appLauncherOpen: false })),
    }),
    {
      name: "nowenos-desktop",
      partialize: (state) => ({ windows: state.windows.map((w) => ({ ...w, minimized: false, maximized: false })) }),
    }
  )
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/stores/desktop.ts
git commit -m "feat(stores): add desktop window management store"
```

---

## Task 3: Create App Registry

**Files:**
- Create: `web/src/apps/registry.tsx`

- [ ] **Step 1: Create app registry**

```typescript
// web/src/apps/registry.tsx
import { lazy, type ComponentType } from "react";
import {
  LayoutDashboard, HardDrive, FolderOpen, Container, Users,
  ScrollText, Settings, Info, Share2, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AppRegistration {
  id: string;
  titleKey: string;
  icon: LucideIcon;
  component: ComponentType;
  defaultWidth?: number;
  defaultHeight?: number;
  singleton?: boolean;
}

const DashboardApp = lazy(() => import("@/pages/dashboard"));
const SystemApp = lazy(() => import("@/pages/system"));
const StorageApp = lazy(() => import("@/pages/storage"));
const SharesApp = lazy(() => import("@/pages/shares"));
const FilesApp = lazy(() => import("@/pages/files"));
const DockerApp = lazy(() => import("@/pages/docker"));
const UsersApp = lazy(() => import("@/pages/users"));
const LogsApp = lazy(() => import("@/pages/logs"));
const AlertsApp = lazy(() => import("@/pages/alerts"));
const SettingsApp = lazy(() => import("@/pages/settings"));

export const appRegistry: AppRegistration[] = [
  { id: "dashboard", titleKey: "nav.dashboard", icon: LayoutDashboard, component: DashboardApp, singleton: true },
  { id: "system", titleKey: "nav.system", icon: Info, component: SystemApp },
  { id: "storage", titleKey: "nav.storage", icon: HardDrive, component: StorageApp },
  { id: "shares", titleKey: "nav.shares", icon: Share2, component: SharesApp },
  { id: "files", titleKey: "nav.files", icon: FolderOpen, component: FilesApp, defaultWidth: 1000, defaultHeight: 650 },
  { id: "docker", titleKey: "nav.docker", icon: Container, component: DockerApp },
  { id: "users", titleKey: "nav.users", icon: Users, component: UsersApp },
  { id: "logs", titleKey: "nav.logs", icon: ScrollText, component: LogsApp },
  { id: "alerts", titleKey: "nav.alerts", icon: Bell, component: AlertsApp },
  { id: "settings", titleKey: "nav.settings", icon: Settings, component: SettingsApp },
];

export function getAppById(appId: string): AppRegistration | undefined {
  return appRegistry.find((a) => a.id === appId);
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/apps/registry.tsx
git commit -m "feat(apps): add app registry with lazy-loaded system apps"
```

---

## Task 4: Create TopBar Component (replaces AppHeader)

**Files:**
- Create: `web/src/components/desktop/TopBar.tsx`

- [ ] **Step 1: Create TopBar**

```tsx
// web/src/components/desktop/TopBar.tsx
import { useDesktopStore } from "@/stores/desktop";
import { useSessionStore } from "@/stores/session";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAlertEvents } from "@/features/alerts/api";
import { useTranslation } from "@/hooks/useTranslation";
import { useThemeStore } from "@/stores/theme";
import { Button } from "@/components/ui/button";
import { HardDrive, Search, Bell, User, LogOut, Sun, Moon, LayoutGrid } from "lucide-react";

export function TopBar() {
  const t = useTranslation();
  const navigate = useNavigate();
  const username = useSessionStore((s) => s.username);
  const clearSession = useSessionStore((s) => s.clearSession);
  const { toggleAppLauncher, toggleCommandPalette, activeWindowId, windows, openWindow } = useDesktopStore();
  const { resolved, toggleTheme } = useThemeStore();

  const eventsQuery = useQuery({
    queryKey: ["alert-events-badge"],
    queryFn: () => fetchAlertEvents(10),
    refetchInterval: 15000,
    enabled: !!username,
  });
  const unseen = eventsQuery.data?.data?.unseen ?? 0;
  const activeWindow = windows.find((w) => w.id === activeWindowId);

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] flex h-10 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur-md select-none">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleAppLauncher} className="h-7 gap-1.5 px-2 text-xs font-semibold">
          <HardDrive className="h-3.5 w-3.5 text-primary" />
          <span>NoWenOS</span>
        </Button>
        {activeWindow && (
          <span className="ml-2 text-xs text-muted-foreground truncate max-w-[200px]">{activeWindow.title}</span>
        )}
      </div>

      <div className="flex-1 flex justify-center">
        <Button variant="ghost" size="sm" onClick={toggleCommandPalette} className="h-7 gap-1.5 px-3 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("topbar.search") ?? "Search..."}</span>
          <kbd className="ml-2 hidden sm:inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[10px]">K</kbd>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-7 w-7 p-0 text-muted-foreground">
          {resolved === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openWindow("alerts", t("nav.alerts"))} className="relative h-7 w-7 p-0 text-muted-foreground">
          <Bell className="h-3.5 w-3.5" />
          {unseen > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold text-white">
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-foreground font-medium">{username ?? "User"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="h-7 w-7 p-0 text-muted-foreground hover:text-danger" title={t("header.logout")}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/desktop/TopBar.tsx
git commit -m "feat(desktop): add TopBar with app launcher, search, and system tray"
```

---

## Task 5: Create Window Component (react-rnd)

**Files:**
- Create: `web/src/components/desktop/Window.tsx`

- [ ] **Step 1: Create Window component**

```tsx
// web/src/components/desktop/Window.tsx
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
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/desktop/Window.tsx
git commit -m "feat(desktop): add Window component with drag, resize, minimize, maximize"
```

---

## Task 6: Create Dock Component

**Files:**
- Create: `web/src/components/desktop/Dock.tsx`

- [ ] **Step 1: Create Dock**

```tsx
// web/src/components/desktop/Dock.tsx
import { useDesktopStore } from "@/stores/desktop";
import { appRegistry } from "@/apps/registry";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const DOCK_IDS = ["dashboard", "files", "docker", "storage", "users", "settings"];

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
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/desktop/Dock.tsx
git commit -m "feat(desktop): add Dock with app launch indicators"
```

---

## Task 7: Create AppLauncher Overlay

**Files:**
- Create: `web/src/components/desktop/AppLauncher.tsx`

- [ ] **Step 1: Create AppLauncher**

```tsx
// web/src/components/desktop/AppLauncher.tsx
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
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/desktop/AppLauncher.tsx
git commit -m "feat(desktop): add AppLauncher overlay with app grid"
```

---

## Task 8: Create CommandPalette (cmdk)

**Files:**
- Create: `web/src/components/desktop/CommandPalette.tsx`

- [ ] **Step 1: Create CommandPalette**

```tsx
// web/src/components/desktop/CommandPalette.tsx
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
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/desktop/CommandPalette.tsx
git commit -m "feat(desktop): add CommandPalette with cmdk for global app search"
```

---

## Task 9: Create Desktop Container

**Files:**
- Create: `web/src/components/desktop/Desktop.tsx`

- [ ] **Step 1: Create Desktop container**

```tsx
// web/src/components/desktop/Desktop.tsx
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
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/desktop/Desktop.tsx
git commit -m "feat(desktop): add Desktop container assembling all shell components"
```

---

## Task 10: Rewrite Router to Desktop Mode

**Files:**
- Modify: `web/src/app/router.tsx`

- [ ] **Step 1: Replace ShellLayout with Desktop**

```tsx
// web/src/app/router.tsx
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import LoginPage from "@/pages/login";
import { useSessionStore } from "@/stores/session";
import { Desktop } from "@/components/desktop/Desktop";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/*", element: <ProtectedRoute><Desktop /></ProtectedRoute> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

Note: Old page routes (`/dashboard`, `/storage`, etc.) are no longer URL routes. Apps open via desktop windows. `LoginPage` remains a standalone route.

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/router.tsx
git commit -m "feat(router): switch from page routes to desktop shell mode"
```

---

## Task 11: Adapt Existing Pages for Window Mode

**Files:**
- Modify: pages under `web/src/pages/` that use `useNavigate` / `useLocation` for inter-page navigation

- [ ] **Step 1: Find pages with routing dependencies**

```bash
cd web
grep -rn "useNavigate\|useLocation\|useParams" src/pages/
```

- [ ] **Step 2: Refactor navigation calls to use `useDesktopStore.openWindow()`**

Pattern:
```tsx
// Before:
const navigate = useNavigate();
<Button onClick={() => navigate("/storage")}>View Storage</Button>

// After:
const { openWindow } = useDesktopStore();
const t = useTranslation();
<Button onClick={() => openWindow("storage", t("nav.storage"))}>View Storage</Button>
```

- [ ] **Step 3: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/
git commit -m "refactor(pages): adapt page components for window-based desktop mode"
```

---

## Task 12: Update i18n Translations

**Files:**
- Modify: `web/src/i18n/translations.ts`

- [ ] **Step 1: Add desktop shell translation keys**

```typescript
// Add to English section:
"topbar.search": "Search...",
"launcher.title": "Applications",
"command.placeholder": "Search applications...",
"command.empty": "No results found.",
"command.apps": "Applications",

// Add to Chinese section:
"topbar.search": "...",
"launcher.title": "...",
"command.placeholder": "......",
"command.empty": "......",
"command.apps": "...",
```

- [ ] **Step 2: Verify compilation**

```bash
cd web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/i18n/translations.ts
git commit -m "feat(i18n): add desktop shell translation keys"
```

---

## Task 13: Add Desktop CSS

**Files:**
- Modify: `web/src/styles/globals.css`

- [ ] **Step 1: Append desktop shell styles at end of `@layer utilities` block**

```css
  /* Desktop window drag handle */
  .nowenos-window-title {
    cursor: default;
    user-select: none;
  }
```

- [ ] **Step 2: Verify full build**

```bash
cd web
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/src/styles/globals.css
git commit -m "style: add desktop shell CSS for window titles"
```

---

## Task 14: Full Verification

- [ ] **Step 1: Full frontend build**

```bash
cd web
npm run build
```

Expected: Successful build with no TypeScript errors.

- [ ] **Step 2: Start dev server and manual test**

```bash
cd web
npm run dev
```

### Manual Verification Checklist

| Check | Expected |
|---|---|
| Login shows desktop | TopBar + desktop background (not Sidebar) |
| NoWenOS logo in TopBar | Visible, left side |
| Click logo / grid icon | AppLauncher shows app icons |
| Open app from launcher | New draggable/resizable window |
| Dock at bottom | Shows common app icons with open indicators |
| Click Dock open app | Window focuses |
| Minimize window | Window disappears, Dock indicator stays |
| Maximize window | Fills area below TopBar |
| Close window | Window removed |
| Ctrl+K / Cmd+K | CommandPalette opens, searchable |
| Refresh restores layout | Persistence works |
| Bell badge | Shows unseen alert count |
| Theme toggle | Sun/Moon in TopBar works |
| Logout | Returns to login page |

- [ ] **Step 3: Commit fixes if any**

---

## Self-Check

1. **Spec coverage:** Desktop shell (OK), TopBar (OK), Dock (OK), AppLauncher (OK), CommandPalette (OK), Window management (OK), Existing modules preserved (OK), Router refactor (OK), i18n (OK).
2. **Placeholder scan:** No TODOs, no "later", no incomplete code blocks.
3. **Type consistency:** `WindowState`, `useDesktopStore`, `AppRegistration` used consistently across all tasks. `openWindow`/`focusWindow`/`closeWindow` signatures match.
