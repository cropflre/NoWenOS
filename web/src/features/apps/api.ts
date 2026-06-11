import { api } from "@/api/http";

export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  image: string;
  ports: string[];
  volumes: string[];
  envVars: Array<{ name: string; description: string; default: string; required: boolean }>;
  installed: boolean;
}

export async function fetchAppTemplates() {
  return api.get<{ data: AppTemplate[] }>("/apps/templates");
}

export async function fetchInstalledApps() {
  return api.get<{ data: Array<{ id: string; name: string; containerId: string; status: string; installedAt: string }> }>("/apps/installed");
}

export async function installApp(templateId: string, env?: Record<string, string>) {
  return api.post("/apps/install", { templateId, env });
}

export async function uninstallApp(id: string) {
  return api.delete(`/apps/${id}`);
}
