import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlertRules,
  createAlertRule,
  toggleAlertRule,
  deleteAlertRule,
  fetchAlertEvents,
  markAlertsSeen,
  clearAlertEvents,
} from "@/features/alerts/api";
import type { CreateRuleRequest } from "@/features/alerts/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/stores/toast";
import {
  
  Plus,
  Trash2,
  X,
  AlertTriangle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  CheckCheck,
  BellOff,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function AlertsPage() {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateRuleRequest>({
    name: "",
    metric: "cpu",
    operator: "gt",
    threshold: 80,
  });

  const rulesQuery = useQuery({ queryKey: ["alert-rules"], queryFn: fetchAlertRules });
  const eventsQuery = useQuery({
    queryKey: ["alert-events"],
    queryFn: () => fetchAlertEvents(100),
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: createAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setShowForm(false);
      setForm({ name: "", metric: "cpu", operator: "gt", threshold: 80 });
      toast.success(t("alerts.ruleCreated"));
    },
    onError: (err: Error) => toast.error(err.message || t("alerts.createFailed")),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => toggleAlertRule(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-rules"] }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
      toast.success(t("alerts.ruleDeleted"));
    },
    onError: (err: Error) => toast.error(err.message || t("alerts.deleteFailed")),
  });

  const markSeenMutation = useMutation({
    mutationFn: markAlertsSeen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-events"] }),
  });

  const clearEventsMutation = useMutation({
    mutationFn: clearAlertEvents,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
      toast.success(t("alerts.historyCleared"));
    },
  });

  const rules = rulesQuery.data?.data ?? [];
  const events = eventsQuery.data?.data?.events ?? [];
  const unseen = eventsQuery.data?.data?.unseen ?? 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("alerts.title")}</h1>
          <p className="text-muted-foreground">{t("alerts.subtitle")}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("alerts.addRule")}
        </Button>
      </div>

      {/* Create Rule Form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>{t("alerts.newRule")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>{t("alerts.name")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("alerts.namePlaceholder")} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("alerts.metric")}</Label>
                  <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="cpu">CPU (%)</option>
                    <option value="memory">Memory (%)</option>
                    <option value="disk">Disk (%)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("alerts.operator")}</Label>
                  <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t("alerts.threshold")}</Label>
                  <Input type="number" min="0" max="100" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("alerts.creating") : t("alerts.createRule")}
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("alerts.rules")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rulesQuery.isLoading && <p className="text-sm text-muted-foreground">{t("alerts.loading")}</p>}
          {rules.length === 0 && !rulesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">{t("alerts.noRules")}</p>
          )}
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={"h-4 w-4 " + (rule.enabled ? "text-amber-500" : "text-slate-300")} />
                  <div>
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.metric} {rule.operator === "gt" ? ">" : "<"} {rule.threshold}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })} className="h-8 w-8 p-0">
                    {rule.enabled ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteRuleMutation.mutate(rule.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">
            {t("alerts.history")}
            {unseen > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{unseen}</span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unseen > 0 && (
              <Button variant="outline" size="sm" onClick={() => markSeenMutation.mutate()}>
                <CheckCheck className="mr-1 h-3 w-3" />
                {t("alerts.markRead")}
              </Button>
            )}
            {events.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => clearEventsMutation.mutate()}>
                <BellOff className="mr-1 h-3 w-3" />
                {t("alerts.clear")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {eventsQuery.isLoading && <p className="text-sm text-muted-foreground">{t("alerts.loading")}</p>}
          {events.length === 0 && !eventsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">{t("alerts.noEvents")}</p>
          )}
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className={"flex items-start gap-3 rounded-lg border px-4 py-3 " + (!event.seen ? "bg-amber-50 border-amber-200" : "")}>
                {event.level === "critical" ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.ruleName}</p>
                  <p className="text-xs text-muted-foreground">{event.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{event.createdAt}</p>
                </div>
                <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + (event.level === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                  {event.level}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
