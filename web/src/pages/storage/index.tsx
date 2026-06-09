import { useQuery } from "@tanstack/react-query";
import { fetchDisks } from "@/features/storage/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive, Database, Server } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function StoragePage() {
  const t = useTranslation();
  const disksQuery = useQuery({ queryKey: ["disks"], queryFn: fetchDisks });
  const disks = disksQuery.data?.data ?? [];
  const physicalDisks = disks.filter((d) => d.type === "disk");
  const partitions = disks.filter((d) => d.type === "part");

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("storage.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("storage.subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 pt-5 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
              <HardDrive className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{physicalDisks.length}</p>
              <p className="text-xs text-muted-foreground">Physical Disks</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 pt-5 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
              <Database className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{partitions.length}</p>
              <p className="text-xs text-muted-foreground">Partitions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 pt-5 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10">
              <Server className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{disks.filter((d) => d.mountpoint).length}</p>
              <p className="text-xs text-muted-foreground">Mounted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading / Error / Empty */}
      {disksQuery.isLoading && (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("storage.loading")}</p>
          </CardContent>
        </Card>
      )}
      {disksQuery.isError && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="pt-6">
            <p className="text-sm text-danger">{t("storage.failed")}</p>
          </CardContent>
        </Card>
      )}
      {disks.length === 0 && !disksQuery.isLoading && (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("storage.noDisks")}</p>
          </CardContent>
        </Card>
      )}

      {/* Physical Disks */}
      {physicalDisks.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Physical Disks</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {physicalDisks.map((disk) => (
              <DiskCard key={disk.name} disk={disk} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Partitions */}
      {partitions.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Partitions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {partitions.map((disk) => (
              <DiskCard key={disk.name} disk={disk} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiskCard({ disk, t }: { disk: { name: string; size: string; model: string; type: string; mountpoint: string; fstype: string }; t: (k: string) => string }) {
  const isDisk = disk.type === "disk";
  return (
    <Card className="group border-border bg-card transition-all duration-200 hover:border-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDisk ? "bg-cyan-500/10" : "bg-purple-500/10"}`}>
            {isDisk ? (
              <HardDrive className="h-4 w-4 text-cyan-400" />
            ) : (
              <Database className="h-4 w-4 text-purple-400" />
            )}
          </div>
          {disk.name}
        </CardTitle>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {disk.type}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold text-foreground">{disk.size || t("common.na")}</div>
        <p className="text-xs text-muted-foreground">
          {disk.model || t("storage.unknownModel")}
        </p>
        {disk.mountpoint && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{t("storage.mount")}:</span>
            <span className="font-mono text-xs text-foreground">{disk.mountpoint}</span>
          </div>
        )}
        {disk.fstype && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("storage.fs")}:</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{disk.fstype}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


