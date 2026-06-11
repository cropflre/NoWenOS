import { api } from "@/api/http";

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  createdAt: string;
}

export interface BackupListResponse {
  data: BackupInfo[];
}

export interface BackupCreateResponse {
  data: { path: string };
}

export interface BackupActionResponse {
  data: { status: string };
}

export async function fetchBackups() {
  return api.get<BackupListResponse>("/backups");
}

export async function createBackup() {
  return api.post<BackupCreateResponse>("/backups");
}

export async function deleteBackup(name: string) {
  return api.delete<BackupActionResponse>(`/backups/${encodeURIComponent(name)}`);
}

export async function restoreBackup(name: string) {
  return api.post<BackupActionResponse>(`/backups/${encodeURIComponent(name)}/restore`);
}
