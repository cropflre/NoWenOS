import { useQuery } from "@tanstack/react-query";
import { fetchSystemInfo, fetchSystemStats, fetchNetworkStats, fetchProcesses, fetchStatsHistory } from "@/features/system/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, HardDrive, MemoryStick, Server, Clock, Network, List, Wifi, ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MiniChart } from "@/components/charts/MiniChart";

export default function DashboardPage() {
  const t = useTranslation();
  const systemQuery = useQuery({ queryKey: ["system-info"], queryFn: fetchSystemInfo });
  const statsQuery = useQuery({ queryKey: ["system-stats"], queryFn: fetchSystemStats, refetchInterval: 5000 });
  const networkQuery = useQuery({ queryKey: ["network-stats"], queryFn: fetchNetworkStats, refetchInterval: 5000 });
  const processesQuery = useQuery({ queryKey: ["processes"], queryFn: () => fetchProcesses(30), refetchInterval: 10000 });

  const stats = statsQuery.data?.data;
  const network = networkQuery.data?.data;
  const processes = processesQuery.data?.data ?? [];
  const [timeRange, setTimeRange] = useState(5);
  const historyQuery = useQuery({ queryKey: ["stats-history", timeRange], queryFn: () => fetchStatsHistory(timeRange), refetchInterval: 30000 });
  const historyData = historyQuery.data?.data ?? [];
  const { stats: wsStats, connected: wsConnected, cpuHistory, memoryHistory } = useWebSocket();

  // Use WS data when available, fallback to polling
  const cpuValue = wsStats?.cpu ?? stats?.cpu.usage ?? 0;
  const memValue = wsStats?.memory ?? stats?.memory.usage ?? 0;
  const diskValue = wsStats?.disk ?? stats?.disk.usage ?? 0;

  return (
    <div className="space-y-4 p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
          <div className={"h-2 w-2 rounded-full animate-pulse " + (wsConnected ? "bg-green-400" : "bg-amber-400")} />
          <span className="text-xs font-medium text-muted-foreground">
            {wsConnected ? t("dashboard.realtime") : t("dashboard.connected")}
          </span>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewCard
          icon={<Server className="h-5 w-5" />}
          label={t("dashboard.system")}
          value={systemQuery.isLoading ? "..." : systemQuery.data?.data?.name ?? "NoWenOS"}
          sub={`v${systemQuery.data?.data?.version ?? "0.1.0"}`}
          color="cyan"
        />
        <OverviewCard
          icon={<Activity className="h-5 w-5" />}
          label={t("dashboard.apiStatus")}
          value={systemQuery.isLoading ? "..." : systemQuery.isError ? t("dashboard.error") : t("dashboard.connected")}
          color={systemQuery.isError ? "red" : "green"}
        />
        <OverviewCard
          icon={<Clock className="h-5 w-5" />}
          label={t("dashboard.uptime")}
          value={statsQuery.isLoading ? "..." : stats?.uptime ?? "N/A"}
          color="purple"
        />
      </div>

      {/* Resource Gauges */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GaugeCardWithChart
          icon={<Cpu className="h-5 w-5" />}
          label={t("dashboard.cpu")}
          value={cpuValue}
          detail={`${stats?.cpu.cores ?? 0} ${t("dashboard.cores")}`}
          color="cyan"
          loading={statsQuery.isLoading}
          chartData={cpuHistory}
          chartColor="#06b6d4"
        />
        <GaugeCardWithChart
          icon={<MemoryStick className="h-5 w-5" />}
          label={t("dashboard.memory")}
          value={memValue}
          detail={`${stats?.memory.used ?? "N/A"} / ${stats?.memory.total ?? "N/A"}`}
          color="green"
          loading={statsQuery.isLoading}
          chartData={memoryHistory}
          chartColor="#22c55e"
        />
        <GaugeCard
          icon={<HardDrive className="h-5 w-5" />}
          label={t("dashboard.disk")}
          value={diskValue}
          detail={`${stats?.disk.used ?? "N/A"} / ${stats?.disk.total ?? "N/A"}`}
          color="orange"
          loading={statsQuery.isLoading}
        />
      </div>

      {/* Time Range History */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t("dashboard.history")}</CardTitle>
            <div className="flex gap-1">
              {[5, 15, 60, 360, 1440].map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeRange(m)}
                  className={"rounded-md px-2 py-0.5 text-xs font-medium transition-colors " + (timeRange === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}
                >
                  {m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : `${m / 1440}d`}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyData.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">CPU %</p>
                <MiniChart data={historyData.map((r) => r.cpu)} color="#06b6d4" height={60} />
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Memory %</p>
                <MiniChart data={historyData.map((r) => r.memory)} color="#22c55e" height={60} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("dashboard.loading")}</p>
          )}
        </CardContent>
      </Card>

      {/* Network + Processes */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Network Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10">
                <Network className="h-4 w-4 text-cyan-400" />
              </div>
              {t("dashboard.network")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {networkQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.loading")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowDown className="h-3 w-3 text-cyan-400" />
                    {t("dashboard.totalRx")}
                  </div>
                  <p className="mt-1 text-lg font-bold text-foreground">{network?.totalRx ?? "N/A"}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowUp className="h-3 w-3 text-purple-400" />
                    {t("dashboard.totalTx")}
                  </div>
                  <p className="mt-1 text-lg font-bold text-foreground">{network?.totalTx ?? "N/A"}</p>
                </div>
              </div>
            )}
            {network && network.interfaces.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("dashboard.interfaces")}</p>
                {network.interfaces.map((iface) => (
                  <div key={iface.name} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{iface.name}</span>
                    </div>
                    <div className="flex gap-4 font-mono text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-cyan-400" />{iface.rx}</span>
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-purple-400" />{iface.tx}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processes Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
                <List className="h-4 w-4 text-purple-400" />
              </div>
              {t("dashboard.topProcesses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processesQuery.isLoading && <p className="text-sm text-muted-foreground">{t("dashboard.loadingProcesses")}</p>}
            {processesQuery.isError && <p className="text-sm text-destructive">{t("dashboard.failedProcesses")}</p>}
            {processes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 pr-4">PID</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4 text-right">CPU %</th>
                      <th className="pb-2 pr-4 text-right">MEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((proc) => (
                      <tr key={proc.pid} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                        <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">{proc.pid}</td>
                        <td className="py-1.5 pr-4 font-medium text-foreground">{proc.name}</td>
                        <td className="py-1.5 pr-4 text-right">
                          {proc.cpu > 0 ? (
                            <span className={proc.cpu > 50 ? "font-mono text-xs font-medium text-warning" : "font-mono text-xs text-foreground"}>
                              {proc.cpu.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-4 text-right font-mono text-xs text-muted-foreground">
                          {proc.memory > 0 ? `${proc.memory.toFixed(1)} MB` : "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {processes.length === 0 && !processesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">{t("dashboard.noProcesses")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {systemQuery.isError && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="pt-6">
            <p className="text-sm text-danger">{t("dashboard.failedSystem")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Cyber NAS Sub-components ──

const colorMap: Record<string, { bg: string; text: string; glow: string; bar: string; barBg: string }> = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "shadow-cyan-500/20", bar: "bg-gradient-to-r from-cyan-500 to-cyan-400", barBg: "bg-cyan-500/10" },
  green: { bg: "bg-green-500/10", text: "text-green-400", glow: "shadow-green-500/20", bar: "bg-gradient-to-r from-green-500 to-green-400", barBg: "bg-green-500/10" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", glow: "shadow-orange-500/20", bar: "bg-gradient-to-r from-orange-500 to-orange-400", barBg: "bg-orange-500/10" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", glow: "shadow-purple-500/20", bar: "bg-gradient-to-r from-purple-500 to-purple-400", barBg: "bg-purple-500/10" },
  red: { bg: "bg-red-500/10", text: "text-red-400", glow: "shadow-red-500/20", bar: "bg-gradient-to-r from-red-500 to-red-400", barBg: "bg-red-500/10" },
};

function OverviewCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  const c = colorMap[color] ?? colorMap.cyan;
  return (
    <Card className="border-border bg-card transition-all duration-200 hover:border-border/80 hover:bg-card/80">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.bg} ${c.glow}`}>
            <span className={c.text}>{icon}</span>
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground truncate">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function GaugeCard({ icon, label, value, detail, color, loading }: {
  icon: React.ReactNode; label: string; value: number; detail: string; color: string; loading: boolean;
}) {
  const c = colorMap[color] ?? colorMap.cyan;
  const pct = Math.min(100, Math.max(0, value));
  const isHigh = pct > 85;

  return (
    <Card className={`border-border bg-card transition-all duration-200 hover:border-border/80 ${isHigh ? "border-danger/30" : ""}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg}`}>
              <span className={c.text}>{icon}</span>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
          <span className={`text-2xl font-bold tabular-nums ${isHigh ? "text-danger" : "text-foreground"}`}>
            {loading ? "..." : `${pct.toFixed(1)}%`}
          </span>
        </div>
        {/* Gauge bar */}
        <div className={`h-2 w-full rounded-full ${c.barBg} overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${isHigh ? "bg-gradient-to-r from-red-500 to-red-400" : c.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}