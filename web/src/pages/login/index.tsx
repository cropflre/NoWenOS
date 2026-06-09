import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/stores/session";
import { loginRequest } from "@/features/auth/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HardDrive, Moon, Sun, Globe } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocaleStore } from "@/stores/locale";
import { useThemeStore } from "@/stores/theme";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const t = useTranslation();
  const { locale, toggleLocale } = useLocaleStore();
  const { resolved, toggleTheme } = useThemeStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await loginRequest({ username, password });
      setSession(resp.data.token, resp.data.username, resp.data.role);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      {/* Background grid effect */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

      {/* Login card */}
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/20">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25">
              <HardDrive className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{t("login.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("login.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 px-3 py-2">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <Button type="submit" className="h-11 w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-cyan-500 transition-all" disabled={loading}>
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>

            <p className="text-center text-xs text-muted-foreground/60">
              Default: admin / admin
            </p>
          </form>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button type="button" onClick={toggleLocale} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Globe className="h-3 w-3" />
              {locale === "zh" ? "English" : "中文"}
            </button>
            <div className="h-3 w-px bg-border" />
            <button type="button" onClick={toggleTheme} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {resolved === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {resolved === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        {/* Subtle glow under card */}
        <div className="mx-auto mt-4 h-1 w-32 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </div>
  );
}
