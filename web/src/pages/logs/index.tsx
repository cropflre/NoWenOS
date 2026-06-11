import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs, fetchLogSources } from "@/features/logs/api";
import { fetchAuditLogs, type AuditEntry } from "@/features/audit/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Terminal, Filter, AlertCircle, Info, AlertTriangle, Bug, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function LogsPage() {
  const t = useTranslation();
  const [limit, setLimit] = useState(100);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"system" | "audit">("system");

  const logsQuery = useQuery({
    queryKey: ["logs", limit],
    queryFn: () => fetchLogs(undefined, limit),
  });

  const sourcesQuery = useQuery({
    queryKey: ["log-sources"],
    queryFn: fetchLogSources,
  });

  const auditQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchAuditLogs({ limit: 100 }),
    enabled: activeTab === "audit",
  });

  const allEntries = logsQuery.data?.data?.entries ?? [];
  const entries = levelFilter ? allEntries.filter((e) => e.level === levelFilter) : allEntries;
  const sources = sourcesQuery.data?.data ?? [];
  const auditEntries = auditQuery.data?.data ?? [];

  const levelCounts = {
    error: allEntries.filter((e) => e.level === "error").length,
    warn: allEntries.filter((e) => e.level === "warn").length,
    info: allEntries.filter((e) => e.level === "info").length,
    debug: allEntries.filter((e) => e.level === "debug").length,
  };

  return (
    <div className="space-y-4 p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("logs.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {logsQuery.isLoading ? t("logs.loading") : `${allEntries.length} ${t("logs.entryCount").replace("{count}", String(allEntries.length))}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => activeTab === "system" ? logsQuery.refetch() : auditQuery.refetch()} disabled={logsQuery.isLoading && auditQuery.isLoading} className="gap-2">
          <RefreshCw className={"h-4 w-4 " + ((logsQuery.isLoading || auditQuery.isLoading) ? "animate-spin" : "")} />
          {t("logs.refresh")}
        </Button>
      </div>

      {/* Tab Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "system" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          <Terminal className="h-4 w-4" />
          {t("logs.systemTab")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "audit" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          <ShieldCheck className="h-4 w-4" />
          {t("logs.auditTab")}
        </button>
      </div>

      {activeTab === "system" && (
        <>
          {/* Level Filter Cards */}
          <div className="grid grid-cols-5 gap-3">
            <LevelCard label="All" count={allEntries.length} active={levelFilter === null} onClick={() => setLevelFilter(null)} color="slate" />
            <LevelCard label="Error" count={levelCounts.error} active={levelFilter === "error"} onClick={() => setLevelFilter(levelFilter === "error" ? null : "error")} color="red" icon={<AlertCircle className="h-3.5 w-3.5" />} />
            <LevelCard label="Warn" count={levelCounts.warn} active={levelFilter === "warn"} onClick={() => setLevelFilter(levelFilter === "warn" ? null : "warn")} color="amber" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <LevelCard label="Info" count={levelCounts.info} active={levelFilter === "info"} onClick={() => setLevelFilter(levelFilter === "info" ? null : "info")} color="cyan" icon={<Info className="h-3.5 w-3.5" />} />
            <LevelCard label="Debug" count={levelCounts.debug} active={levelFilter === "debug"} onClick={() => setLevelFilter(levelFilter === "debug" ? null : "debug")} color="purple" icon={<Bug className="h-3.5 w-3.5" />} />
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 py-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("logs.availableSources")} {sources.join(", ")}</p>
              </CardContent>
            </Card>
          )}

          {/* Limit Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Limit:</span>
            {[50, 100, 200, 500].map((n) => (
              <Button key={n} variant={limit === n ? "default" : "outline"} size="sm" onClick={() => setLimit(n)} className={limit === n ? "bg-primary text-primary-foreground" : ""}>{n}</Button>
            ))}
          </div>

          {/* Loading / Error */}
          {logsQuery.isLoading && <p className="text-sm text-muted-foreground">{t("logs.loadingLogs")}</p>}
          {logsQuery.isError && (
            <Card className="border-danger/30 bg-danger/5"><CardContent className="pt-6"><p className="text-sm text-danger">{t("logs.failed")}</p></CardContent></Card>
          )}

          {/* Log Console */}
          {entries.length === 0 && !logsQuery.isLoading && (
            <Card className="border-border bg-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("logs.noEntries")}</p></CardContent></Card>
          )}

          {entries.length > 0 && (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10"><Terminal className="h-4 w-4 text-cyan-400" /></div>
                  <span>Log Output</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{entries.length} entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="divide-y divide-border/50 font-mono text-xs">
                    <div className="grid grid-cols-[160px_60px_1fr] bg-muted/50 px-4 py-2 font-medium uppercase tracking-wider text-muted-foreground">
                      <span>{t("logs.timestamp")}</span><span>{t("logs.level")}</span><span>{t("logs.message")}</span>
                    </div>
                    {entries.map((entry, idx) => (
                      <div key={idx} className="grid grid-cols-[160px_60px_1fr] px-4 py-1.5 transition-colors hover:bg-muted/30">
                        <span className="text-muted-foreground">{entry.timestamp}</span>
                        <span><LogLevelBadge level={entry.level} /></span>
                        <span className="break-all text-foreground">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "audit" && (
        <>
          {auditQuery.isLoading && <p className="text-sm text-muted-foreground">{t("logs.loadingLogs")}</p>}
          {auditQuery.isError && (
            <Card className="border-danger/30 bg-danger/5"><CardContent className="pt-6"><p className="text-sm text-danger">{t("logs.failed")}</p></CardContent></Card>
          )}

          {auditEntries.length === 0 && !auditQuery.isLoading && (
            <Card className="border-border bg-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("audit.noLogs")}</p></CardContent></Card>
          )}

          {auditEntries.length > 0 && (
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10"><ShieldCheck className="h-4 w-4 text-emerald-400" /></div>
                  <span>{t("audit.title")}</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{auditEntries.length} entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="divide-y divide-border/50 font-mono text-xs">
                    <div className="grid grid-cols-[160px_100px_100px_120px_80px_120px] bg-muted/50 px-4 py-2 font-medium uppercase tracking-wider text-muted-foreground">
                      <span>{t("audit.timestamp")}</span>
                      <span>{t("audit.username")}</span>
                      <span>{t("audit.action")}</span>
                      <span>{t("audit.resource")}</span>
                      <span>{t("audit.status")}</span>
                      <span>{t("audit.ip")}</span>
                    </div>
                    {auditEntries.map((entry: AuditEntry) => (
                      <div key={entry.id} className="grid grid-cols-[160px_100px_100px_120px_80px_120px] px-4 py-1.5 transition-colors hover:bg-muted/30">
                        <span className="text-muted-foreground">{entry.timestamp}</span>
                        <span className="text-foreground">{entry.username}</span>
                        <span><AuditStatusBadge status={entry.action} /></span>
                        <span className="text-foreground truncate">{entry.resource}</span>
                        <span><AuditStatusBadge status={entry.status} /></span>
                        <span className="text-muted-foreground">{entry.ip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function LevelCard({ label, count, active, onClick, color, icon }: {
  label: string; count: number; active: boolean; onClick: () => void; color: string; icon?: React.ReactNode;
}) {
  const colorStyles: Record<string, { active: string; inactive: string; text: string }> = {
    slate: { active: "border-border bg-muted", inactive: "border-border bg-card", text: "text-foreground" },
    red: { active: "border-red-500/30 bg-red-500/10", inactive: "border-border bg-card", text: "text-red-400" },
    amber: { active: "border-amber-500/30 bg-amber-500/10", inactive: "border-border bg-card", text: "text-amber-400" },
    cyan: { active: "border-cyan-500/30 bg-cyan-500/10", inactive: "border-border bg-card", text: "text-cyan-400" },
    purple: { active: "border-purple-500/30 bg-purple-500/10", inactive: "border-border bg-card", text: "text-purple-400" },
  };
  const s = colorStyles[color] ?? colorStyles.slate;

  return (
    <button type="button" onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-200 cursor-pointer ${active ? s.active : s.inactive + " hover:bg-muted/50"}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className={active ? s.text : "text-muted-foreground"}>{icon}</span>}
        <span className={`text-xs font-medium ${active ? s.text : "text-muted-foreground"}`}>{label}</span>
      </div>
      <span className={`text-lg font-bold tabular-nums ${active ? s.text : "text-foreground"}`}>{count}</span>
    </button>
  );
}

function LogLevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    error: "bg-red-500/15 text-red-400 border border-red-500/20",
    warn: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    info: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
    debug: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[level] ?? styles.info}`}>{level}</span>
  );
}

function AuditStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    failure: "bg-red-500/15 text-red-400 border border-red-500/20",
    error: "bg-red-500/15 text-red-400 border border-red-500/20",
    create: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
    delete: "bg-red-500/15 text-red-400 border border-red-500/20",
    update: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    login: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[status] ?? "bg-slate-500/15 text-muted-foreground border border-slate-500/20"}`}>{status}</span>
  );
}