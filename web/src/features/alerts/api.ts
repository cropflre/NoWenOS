import { api } from "@/api/http";

export interface AlertRule {
  id: number;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

export interface AlertEvent {
  id: number;
  ruleId: number;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  level: string;
  seen: boolean;
  createdAt: string;
}

export interface CreateRuleRequest {
  name: string;
  metric: string;
  operator: string;
  threshold: number;
}

export async function fetchAlertRules() {
  return api.get<{ data: AlertRule[] }>("/alerts/rules");
}

export async function createAlertRule(data: CreateRuleRequest) {
  return api.post<{ data: AlertRule }>("/alerts/rules", data);
}

export async function toggleAlertRule(id: number, enabled: boolean) {
  return api.put(`/alerts/rules/${id}/toggle`, { enabled });
}

export async function deleteAlertRule(id: number) {
  return api.delete(`/alerts/rules/${id}`);
}

export async function fetchAlertEvents(limit?: number) {
  const params = limit ? `?limit=${limit}` : "";
  return api.get<{ data: { events: AlertEvent[]; unseen: number } }>(`/alerts/events${params}`);
}

export async function markAlertsSeen() {
  return api.post("/alerts/events/seen");
}

export async function clearAlertEvents() {
  return api.delete("/alerts/events");
}
