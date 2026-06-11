import { api } from "@/api/http";

export interface VersionInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  checkedAt: string;
}

export async function getVersion() {
  return api.get<{ data: VersionInfo }>("/system/version");
}

export async function checkForUpdate() {
  return api.get<{ data: VersionInfo }>("/system/update-check");
}
