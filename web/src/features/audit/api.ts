import { api } from "@/api/http";

export interface AuditEntry {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ip: string;
  status: string;
  duration: number;
}

export interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
  recent24h: number;
}

export async function fetchAuditLogs(params?: { limit?: number; action?: string; username?: string }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.action) query.set("action", params.action);
  if (params?.username) query.set("username", params.username);
  const qs = query.toString();
  return api.get<{ data: AuditEntry[] }>(`/audit/logs${qs ? "?" + qs : ""}`);
}

export async function fetchAuditStats() {
  return api.get<{ data: AuditStats }>("/audit/stats");
}