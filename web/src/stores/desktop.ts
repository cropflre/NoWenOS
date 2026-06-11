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