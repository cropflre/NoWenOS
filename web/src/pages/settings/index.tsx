import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSettings, updateSettings } from "@/features/settings/api";
import type { SettingsData } from "@/features/settings/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Settings, Globe, Server, Upload, Download } from "lucide-react";
import { exportConfig, importConfig } from "@/features/config/api";
import { useState } from "react";
import { useToast } from "@/stores/toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocaleStore } from "@/stores/locale";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const toast = useToast();
  const t = useTranslation();
  const { locale, setLocale } = useLocaleStore();

  const [form, setForm] = useState<SettingsData>({
    hostname: "", httpPort: 8080, logLevel: "info", autoUpdate: false, maxUpload: 1024,
  });

  // Sync form with fetched data
  const serverSettings = settingsQuery.data?.data;
  if (serverSettings && form.hostname === "" && serverSettings.hostname !== "") {
    setForm(serverSettings);
  }

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("settings.saved"));
    },
    onError: () => {
      toast.error(t("settings.saveFailed"));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  function handleChange(field: keyof SettingsData, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleExportConfig() {
    try {
      const data = await exportConfig();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nowenos-config.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("config.exportSuccess"));
    } catch {
      toast.error(t("config.importFailed"));
    }
  }

  async function handleImportConfig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importConfig(data);
      toast.success(t("config.importSuccess"));
    } catch {
      toast.error(t("config.importFailed"));
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {settingsQuery.isLoading && <p className="text-sm text-muted-foreground">{t("settings.loading")}</p>}

      {settingsQuery.isError && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="pt-6"><p className="text-sm text-danger">{t("settings.failed")}</p></CardContent>
        </Card>
      )}

      {settingsQuery.data && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Language Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <Globe className="h-4 w-4 text-purple-400" />
                </div>
                {t("settings.language")}
              </CardTitle>
              <CardDescription>{t("settings.languageDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocale("zh")}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    locale === "zh"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/10"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  中文
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    locale === "en"
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/10"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  English
                </button>
              </div>
            </CardContent>
          </Card>

          {/* System Settings Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Settings className="h-4 w-4 text-cyan-400" />
                </div>
                {t("settings.systemSettings")}
              </CardTitle>
              <CardDescription>{t("settings.general")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hostname" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Server className="mr-1 inline h-3 w-3" />
                    {t("settings.hostname")}
                  </Label>
                  <Input
                    id="hostname"
                    value={form.hostname}
                    onChange={(e) => handleChange("hostname", e.target.value)}
                    className="bg-muted/50 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="httpPort" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("settings.httpPort")}
                  </Label>
                  <Input
                    id="httpPort"
                    type="number"
                    value={form.httpPort}
                    onChange={(e) => handleChange("httpPort", Number(e.target.value))}
                    className="bg-muted/50 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logLevel" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("settings.logLevel")}
                  </Label>
                  <select
                    id="logLevel"
                    value={form.logLevel}
                    onChange={(e) => handleChange("logLevel", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-border bg-muted/50 px-3 py-1 text-sm shadow-sm focus:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="debug">{t("settings.debug")}</option>
                    <option value="info">{t("settings.info")}</option>
                    <option value="warn">{t("settings.warn")}</option>
                    <option value="error">{t("settings.error")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUpload" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Upload className="mr-1 inline h-3 w-3" />
                    {t("settings.maxUpload")}
                  </Label>
                  <Input
                    id="maxUpload"
                    type="number"
                    value={form.maxUpload}
                    onChange={(e) => handleChange("maxUpload", Number(e.target.value))}
                    className="bg-muted/50 border-border focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <input
                  id="autoUpdate"
                  type="checkbox"
                  checked={form.autoUpdate}
                  onChange={(e) => handleChange("autoUpdate", e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-cyan-500"
                />
                <div>
                  <Label htmlFor="autoUpdate" className="text-sm font-medium">{t("settings.autoUpdate")}</Label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-cyan-500 transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? t("settings.saving") : t("settings.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}