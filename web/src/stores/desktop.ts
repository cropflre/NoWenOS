import { create } from "zustand";

export interface DesktopWindow {
  id: string;
  appId: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

interface DesktopState {
  windows: DesktopWindow[];
  activeWindowId: string | null;
  nextZIndex: number;
  dockCollapsed: boolean;

  openApp: (appId: string, title: string, icon: string, opts?: Partial<Pick<DesktopWindow, "x" | "y" | "width" | "height" | "minWidth" | "minHeight">>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
  toggleDock: () => void;
}

let windowCounter = 0;

export const useDesktopStore = create<DesktopState>()((set, get) => ({
  windows: [],
  activeWindowId: null,
  nextZIndex: 10,
  dockCollapsed: false,

  openApp: (appId, title, icon, opts) => {
    const state = get();
    // If app already open, focus it
    const existing = state.windows.find((w) => w.appId === appId && !w.minimized);
    if (existing) {
      get().focusWindow(existing.id);
      return;
    }
    // If minimized, restore
    const minimized = state.windows.find((w) => w.appId === appId && w.minimized);
    if (minimized) {
      get().restoreWindow(minimized.id);
      return;
    }

    windowCounter++;
    const id = `win-${appId}-${windowCounter}`;
    const offsetX = (windowCounter % 6) * 30;
    const offsetY = (windowCounter % 6) * 30;

    const newWindow: DesktopWindow = {
      id,
      appId,
      title,
      icon,
      x: opts?.x ?? 120 + offsetX,
      y: opts?.y ?? 60 + offsetY,
      width: opts?.width ?? 1000,
      height: opts?.height ?? 680,
      minWidth: opts?.minWidth ?? 600,
      minHeight: opts?.minHeight ?? 400,
      zIndex: state.nextZIndex,
      minimized: false,
      maximized: false,
    };

    set((s) => ({
      windows: [...s.windows, newWindow],
      activeWindowId: id,
      nextZIndex: s.nextZIndex + 1,
    }));
  },

  closeWindow: (id) =>
    set((s) => {
      const remaining = s.windows.filter((w) => w.id !== id);
      return {
        windows: remaining,
        activeWindowId: remaining.length > 0 ? remaining.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id : null,
      };
    }),

  focusWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex: s.nextZIndex } : w)),
      activeWindowId: id,
      nextZIndex: s.nextZIndex + 1,
    })),

  minimizeWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
      activeWindowId: s.activeWindowId === id
        ? s.windows.filter((w) => w.id !== id && !w.minimized).sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null
        : s.activeWindowId,
    })),

  maximizeWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)),
    })),

  restoreWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: s.nextZIndex } : w)),
      activeWindowId: id,
      nextZIndex: s.nextZIndex + 1,
    })),

  updateWindowPosition: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  updateWindowSize: (id, width, height) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    })),

  toggleDock: () => set((s) => ({ dockCollapsed: !s.dockCollapsed })),
}));