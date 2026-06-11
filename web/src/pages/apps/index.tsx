import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAppTemplates, installApp, uninstallApp } from "@/features/apps/api";
import type { AppTemplate } from "@/features/apps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Globe, Container, Cloud, Shield, Film, Home, LayoutGrid,
  Download, Trash2, X, CheckCircle2,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
  container: Container,
  cloud: Cloud,
  shield: Shield,
  film: Film,
  home: Home,
};

const CATEGORIES = ["all", "web", "management", "productivity", "network", "media", "iot"] as const;

function AppIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || LayoutGrid;
  return <Icon className={className} />;
}

export default function AppsPage() {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [category, setCategory] = useState<string>("all");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});

  const templatesQuery = useQuery({
    queryKey: ["app-templates"],
    queryFn: fetchAppTemplates,
    refetchInterval: 10000,
  });

  const installMutation = useMutation({
    mutationFn: ({ templateId, env }: { templateId: string; env?: Record<string, string> }) =>
      installApp(templateId, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-templates"] });
      setInstallingId(null);
      setEnvValues({});
      toast.success(t("apps.installed"));
    },
    onError: (err: Error) => toast.error(err.message || "Install failed"),
  });

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => uninstallApp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-templates"] });
      toast.success(t("apps.uninstall") + " - OK");
    },
    onError: (err: Error) => toast.error(err.message || "Uninstall failed"),
  });

  const templates = templatesQuery.data?.data ?? [];
  const filtered = category === "all" ? templates : templates.filter((a) => a.category === category);

  function handleInstall(template: AppTemplate) {
    if (template.envVars?.length > 0 && !installingId) {
      setInstallingId(template.id);
      return;
    }
    installMutation.mutate({ templateId: template.id, env: envValues });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">{t("apps.title")}</h1>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {cat === "all" ? t("apps.all") : cat}
          </button>
        ))}
      </div>

      {/* App grid */}
      <div className="flex-1 overflow-auto p-6">
        {templatesQuery.isLoading ? (
          <p className="text-muted-foreground">{t("apps.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No apps found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((app) => (
              <Card key={app.id} className="relative flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <AppIcon name={app.icon} className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium">{app.name}</CardTitle>
                      <span className="text-xs text-muted-foreground capitalize">{app.category}</span>
                    </div>
                    {app.installed && (
                      <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("apps.installed")}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between pb-4 pt-1">
                  <p className="mb-3 text-xs text-muted-foreground">{app.description}</p>

                  {/* Env var inputs when installing */}
                  {installingId === app.id && app.envVars?.length > 0 && (
                    <div className="mb-3 space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Configuration</span>
                        <button onClick={() => { setInstallingId(null); setEnvValues({}); }}>
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                      {app.envVars.map((ev) => (
                        <div key={ev.name}>
                          <Label className="text-xs">{ev.description || ev.name}{ev.required && " *"}</Label>
                          <Input
                            type={ev.name.toLowerCase().includes("password") ? "password" : "text"}
                            placeholder={ev.default || ev.name}
                            value={envValues[ev.name] || ""}
                            onChange={(e) => setEnvValues((prev) => ({ ...prev, [ev.name]: e.target.value }))}
                            className="mt-1 h-7 text-xs"
                          />
                        </div>
                      ))}
                      <Button
                        size="sm"
                        className="mt-1 h-7 text-xs"
                        disabled={installMutation.isPending}
                        onClick={() => handleInstall(app)}
                      >
                        {installMutation.isPending ? "..." : t("apps.install")}
                      </Button>
                    </div>
                  )}

                  {/* Ports info */}
                  {app.ports.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {app.ports.map((p) => (
                        <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          :{p.split(":")[0]}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  {installingId !== app.id && (
                    <div className="flex gap-2">
                      {app.installed ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={uninstallMutation.isPending}
                          onClick={() => uninstallMutation.mutate(app.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          {t("apps.uninstall")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={installMutation.isPending}
                          onClick={() => handleInstall(app)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          {t("apps.install")}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
