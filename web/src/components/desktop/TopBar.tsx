import { useDesktopStore } from "@/stores/desktop";
import { useSessionStore } from "@/stores/session";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAlertEvents } from "@/features/alerts/api";
import { useTranslation } from "@/hooks/useTranslation";
import { useThemeStore } from "@/stores/theme";
import { Button } from "@/components/ui/button";
import { HardDrive, Search, Bell, User, LogOut, Sun, Moon } from "lucide-react";

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
