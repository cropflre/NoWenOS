import { getVersion, checkForUpdate, type VersionInfo } from "@/features/update/api";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";
import { fetchHardware } from "@/features/system/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, HardDrive, MemoryStick, CircuitBoard, Server, Thermometer } from "lucide-react";

export default function SystemPage() {

  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);

  React.useEffect(() => {
    getVersion().then(r => setVersionInfo(r.data)).catch(() => {});
  }, []);

  async function handleCheckUpdate() {
    setChecking(true);
    try {
      const r = await checkForUpdate();
      setVersionInfo(r.data);
    } catch {} finally {
      setChecking(false);
    }
  }
    const t = useTranslation();
    const hwQuery = useQuery({ queryKey: ["hardware"], queryFn: fetchHardware, refetchInterval: 30000 });
  const hw = hwQuery.data?.data;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("system.title")}</h1>
        <p className="text-muted-foreground">{t("system.subtitle")}</p>
      </div>

      {hwQuery.isLoading && <p className="text-sm text-muted-foreground">{t("system.loading")}</p>}
      {hwQuery.isError && (
        <Card className="border-destructive">
          <CardContent className="pt-6"><p className="text-sm text-destructive">{t("system.failed")}</p></CardContent>
        </Card>
      )}

      {hw && (
        <>
          {/* Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={<Server className="h-5 w-5" />} label={t("system.hostname")} value={hw.hostname || t("common.na")} />
            <InfoCard icon={<Cpu className="h-5 w-5" />} label={t("system.cpu")} value={hw.cpuModel} sub={`${hw.cpuCores} ${t("system.cores")}`} />
            <InfoCard icon={<MemoryStick className="h-5 w-5" />} label={t("system.memory")} value={hw.totalMemory || t("common.na")} />
            <InfoCard icon={<HardDrive className="h-5 w-5" />} label={t("system.architecture")} value={hw.arch} sub={hw.os} />
          </div>

          {/* CPU Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cpu className="h-5 w-5" /> {t("system.cpuDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label={t("system.model")} value={hw.cpuModel} />
                <DetailRow label={t("system.cores")} value={String(hw.cpuCores)} />
              </div>
            </CardContent>
          </Card>

          {/* System */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" /> {t("system.systemInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label={t("system.hostname")} value={hw.hostname} />
                <DetailRow label={t("system.os")} value={hw.os} />
                <DetailRow label={t("system.arch")} value={hw.arch} />
                <DetailRow label={t("system.kernel")} value={hw.kernel || t("common.na")} />
                <DetailRow label={t("system.goVersion")} value={hw.goVersion} />
                <DetailRow label={t("system.memory")} value={hw.totalMemory || t("common.na")} />
              </div>
            </CardContent>
          </Card>

          {/* Motherboard */}
          {(hw.boardVendor || hw.boardName) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CircuitBoard className="h-5 w-5" /> {t("system.motherboard")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label={t("system.vendor")} value={hw.boardVendor || t("common.na")} />
                  <DetailRow label={t("system.motherboard")} value={hw.boardName || t("common.na")} />
                  <DetailRow label={t("system.biosVendor")} value={hw.biosVendor || t("common.na")} />
                  <DetailRow label={t("system.biosVersion")} value={hw.biosVersion || t("common.na")} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Temperature */}
          {hw.temperature && hw.temperature.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Thermometer className="h-5 w-5" /> {t("system.temperature")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {hw.temperature.map((zone, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <span className="text-sm font-medium">{zone.type}</span>
                      <span className="text-sm font-mono">{zone.temp}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div>
        <p className="text-lg font-bold truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value}</span>

      {/* Version & Updates */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("update.current") ?? "Version"}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{t("update.current")}:</span>
          <span className="font-mono text-sm font-semibold">{versionInfo?.current ?? "..."}</span>
          <Button variant="outline" size="sm" onClick={handleCheckUpdate} disabled={checking}>
            {checking ? (t("update.checking") ?? "Checking...") : (t("update.check") ?? "Check for Updates")}
          </Button>
        </div>
        {versionInfo?.updateAvailable && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            <p className="text-sm text-green-600 dark:text-green-400">
              {t("update.available")} - {t("update.latest")}: {versionInfo.latest}
            </p>
            {versionInfo.releaseUrl && (
              <a href={versionInfo.releaseUrl} target="_blank" rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary underline">
                {t("update.viewRelease")}
              </a>
            )}
          </div>
        )}
        {versionInfo && !versionInfo.updateAvailable && (
          <p className="text-xs text-muted-foreground">{t("update.upToDate")}</p>
        )}
      </div>

    </div>
  );
}