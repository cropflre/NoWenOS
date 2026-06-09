import { api } from "@/api/http";

export interface SettingsData {
  hostname: string;
  httpPort: number;
  logLevel: string;
  autoUpdate: boolean;
  maxUpload: number;
}

export interface SettingsResponse {
  data: SettingsData;
}

export async function fetchSettings() {
  return api.get<SettingsResponse>("/settings");
}

export async function updateSettings(data: Partial<SettingsData>) {
  return api.put<SettingsResponse>("/settings", data);
}
