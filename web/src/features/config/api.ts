import { api } from "@/api/http";

export interface ExportData {
  version: number;
  users?: Array<{ username: string; role: string }>;
  shares?: Array<{ name: string; path: string; protocol: string; readOnly: boolean; guest: boolean; comment: string }>;
  settings?: Record<string, string>;
  groups?: Array<{ name: string; comment: string; members: string[] }>;
  alertRules?: Array<{ name: string; metric: string; operator: string; threshold: number; enabled: boolean }>;
}

export async function exportConfig(): Promise<ExportData> {
  const token = getToken();
  const response = await fetch("/api/v1/config/export", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Export failed");
  return response.json();
}

export async function importConfig(data: ExportData) {
  return api.post("/config/import", data);
}

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("nowenos-session");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token ?? null;
    }
  } catch { return null; }
  return null;
}
